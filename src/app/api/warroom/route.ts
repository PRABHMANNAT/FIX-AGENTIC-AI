import { NextResponse } from "next/server";
import { createAdminClient, getAuthenticatedUserContext } from "@/lib/supabase";
import { runLeadDiscovery } from "@/lib/dashboard";
import { generateEmailDraft, runFinanceAgent } from "@/lib/openai";
import type { BMOProfile, EmailDraft, ICPProfile, Lead, WarRoomResponse } from "@/types";

function nowLabel() {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

function financePayloadFromProfile(bmoContext: BMOProfile | null) {
  return {
    narrative:
      bmoContext?.what_they_do ??
      "Analyze the current financial state of this business and surface the main pressure points.",
    mrr: 4280,
    monthlyExpenses: 8200,
    customerCount: 25,
    avgPlanPrice: 89,
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    objective?: string;
    user_id?: string;
  };

  const auth = await getAuthenticatedUserContext(body.user_id);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Something went wrong saving your data. Try again." },
      { status: 500 },
    );
  }

  const [profileResult, icpResult] = await Promise.all([
    supabase.from("profiles").select("bmo_config").eq("id", auth.userId).maybeSingle(),
    supabase
      .from("icp_profiles")
      .select("*")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const bmoContext = (profileResult.data?.bmo_config as BMOProfile | null | undefined) ?? null;
  const icp = (icpResult.data as ICPProfile | null | undefined) ?? null;
  const objective =
    body.objective?.trim() ||
    bmoContext?.primary_goal ||
    "Find new customers and surface the fastest next move.";

  const [leadResult, finance] = await Promise.allSettled([
    runLeadDiscovery({
      supabase,
      userId: auth.userId,
      icpId: icp?.id ?? null,
      icpDescription: icp?.description ?? bmoContext?.icp_description ?? "Strong local customer matches.",
      searchQuery:
        icp?.linkedin_query ??
        bmoContext?.linkedin_search_query ??
        objective,
      githubQuery: icp?.github_query ?? bmoContext?.github_search_query ?? null,
      count: 10,
      sources: ["linkedin", "github"],
    }),
    runFinanceAgent(financePayloadFromProfile(bmoContext)),
  ]);

  const leads =
    leadResult.status === "fulfilled"
      ? leadResult.value.leads
      : ([] as Lead[]);

  const financeAnalysis = finance.status === "fulfilled" ? finance.value : null;

  const topLeads = leads.slice(0, 3);
  const drafts: EmailDraft[] = [];

  for (const lead of topLeads) {
    if (!lead.email) {
      continue;
    }

    try {
      const draft = await generateEmailDraft({
        leadName: lead.name,
        leadRole: lead.role,
        leadCompany: lead.company,
        leadSignals: lead.signals,
        leadReason: lead.score_reason,
        rawData: lead.raw_data,
        senderName: bmoContext?.business_name ?? "AssembleOne",
        senderCompany: bmoContext?.business_name ?? "AssembleOne",
        valueProp:
          bmoContext?.suggested_email_hook ??
          "A simple way to find the right customers and send personal emails faster.",
      });

      drafts.push(draft);
    } catch {
      // Keep the rest of the war room response intact.
    }
  }

  const response: WarRoomResponse = {
    objective,
    elapsed: "00:00:12",
    subroutines: [
      {
        id: "lead-search",
        name: "Customer Search",
        stat: `${leads.length} matches scanned`,
        status: leads.length ? "active" : "running",
        color: "green",
        icon: "target",
      },
      {
        id: "email-drafts",
        name: "Email Drafting",
        stat: `${drafts.length} drafts ready`,
        status: drafts.length ? "active" : "running",
        color: "violet",
        icon: "mail",
      },
      {
        id: "finance-scan",
        name: "Revenue Monitor",
        stat: financeAnalysis ? `${financeAnalysis.runway_days} day runway` : "analyzing",
        status: financeAnalysis ? "active" : "running",
        color: "ember",
        icon: "bar-chart",
      },
      {
        id: "central-agent",
        name: "Central Agent",
        stat: "command online",
        status: "live",
        color: "gold",
        icon: "zap",
      },
    ],
    events: [
      {
        type: leads.length ? "success" : "warning",
        text: leads.length
          ? `Found ${leads.length} customer matches from the latest search pass.`
          : "Lead search returned fewer matches than expected.",
        time: nowLabel(),
      },
      {
        type: financeAnalysis ? "warning" : "error",
        text: financeAnalysis
          ? `Revenue scan shows ${financeAnalysis.runway_days} days of runway at current burn.`
          : "Finance scan could not complete.",
        time: nowLabel(),
      },
      {
        type: drafts.length ? "success" : "warning",
        text: drafts.length
          ? `${drafts.length} personalised email drafts are ready for review.`
          : "No email drafts could be created yet.",
        time: nowLabel(),
      },
    ],
    leads,
    drafts,
    finance: financeAnalysis,
  };

  return NextResponse.json(response);
}
