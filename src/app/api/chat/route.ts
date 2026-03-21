import { NextResponse } from "next/server";
import { createAdminClient, getAuthenticatedUserContext } from "@/lib/supabase";
import { runLeadDiscovery } from "@/lib/dashboard";
import { generateEmailDraft, runCentralDashboardChat, runFinanceAgent } from "@/lib/openai";
import type { AgentMessage, BMOProfile, DashboardChatResponse, ICPProfile, Lead } from "@/types";

async function draftTopLeadEmail(params: {
  supabase: ReturnType<typeof createAdminClient>;
  userId: string;
  leadId?: string | null;
  bmoContext: BMOProfile | null;
}) {
  if (!params.supabase) {
    return null;
  }

  const leadQuery = params.supabase
    .from("leads")
    .select("*")
    .eq("user_id", params.userId)
    .order("icp_score", { ascending: false })
    .limit(1);

  const { data: lead } = params.leadId
    ? await params.supabase
        .from("leads")
        .select("*")
        .eq("user_id", params.userId)
        .eq("id", params.leadId)
        .maybeSingle()
    : await leadQuery.maybeSingle();

  if (!lead || !lead.email) {
    return null;
  }

  const draft = await generateEmailDraft({
    leadName: lead.name,
    leadRole: lead.role,
    leadCompany: lead.company,
    leadSignals: lead.signals ?? [],
    leadReason: lead.score_reason,
    rawData: lead.raw_data,
    senderName: params.bmoContext?.business_name ?? "AssembleOne",
    senderCompany: params.bmoContext?.business_name ?? "AssembleOne",
    valueProp:
      params.bmoContext?.suggested_email_hook ??
      "A simple way to find the right customers and send personal emails faster.",
  });

  await params.supabase
    .from("leads")
    .update({
      email_draft: `${draft.subject}\n\n${draft.body}`,
    })
    .eq("id", lead.id)
    .eq("user_id", params.userId);

  return {
    lead,
    draft,
  };
}

function buildFinancePayload(bmoContext: BMOProfile | null, metrics: Record<string, unknown>[]) {
  const metricMap = new Map(metrics.map((metric) => [metric.metric_type as string, metric.value]));

  return {
    narrative:
      bmoContext?.what_they_do ??
      "Analyze the current health of this business using the latest available numbers.",
    mrr: Number(metricMap.get("mrr") ?? 4280),
    monthlyExpenses: Number(metricMap.get("runway") ?? 8200),
    customerCount: Number(metricMap.get("revenue") ?? 25),
    avgPlanPrice: 89,
  };
}

export async function POST(request: Request) {
  let body = {} as {
    messages?: AgentMessage[];
    user_id?: string;
    bmo_context?: BMOProfile | null;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

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

  const [profileResult, icpResult, metricsResult] = await Promise.all([
    supabase.from("profiles").select("bmo_config").eq("id", auth.userId).maybeSingle(),
    supabase
      .from("icp_profiles")
      .select("*")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("business_metrics").select("*").eq("user_id", auth.userId).order("recorded_at", { ascending: false }),
  ]);

  const bmoContext =
    body.bmo_context ??
    ((profileResult.data?.bmo_config as BMOProfile | null | undefined) ?? null);
  const icp = (icpResult.data as ICPProfile | null | undefined) ?? null;
  const messages = body.messages ?? [];

  const response = await runCentralDashboardChat({
    messages,
    bmoContext,
  });

  let executedData: DashboardChatResponse["executed_data"] = null;

  if (response.execute?.type === "scrape_leads") {
    const leadResults = await runLeadDiscovery({
      supabase,
      userId: auth.userId,
      icpId: icp?.id ?? null,
      icpDescription:
        (response.execute.params.icp_description as string | undefined) ??
        icp?.description ??
        bmoContext?.icp_description ??
        "People who are a strong fit for this business.",
      searchQuery:
        (response.execute.params.search_query as string | undefined) ??
        icp?.linkedin_query ??
        bmoContext?.linkedin_search_query ??
        "local business owner",
      githubQuery:
        (response.execute.params.github_query as string | undefined) ??
        icp?.github_query ??
        bmoContext?.github_search_query ??
        null,
      count:
        typeof response.execute.params.count === "number"
          ? response.execute.params.count
          : 25,
      sources: ["linkedin", "github"],
    });

    executedData = {
      leads: leadResults.leads,
      sources: leadResults.sources,
      icp_description: icp?.description ?? bmoContext?.icp_description ?? null,
      default_query: icp?.linkedin_query ?? bmoContext?.linkedin_search_query ?? null,
    };
  }

  if (response.execute?.type === "analyze_finance") {
    const analysis = await runFinanceAgent(
      Object.keys(response.execute.params).length
        ? response.execute.params
        : buildFinancePayload(bmoContext, metricsResult.data ?? []),
    );

    executedData = {
      analysis,
    };
  }

  if (response.execute?.type === "draft_email") {
    const draftResult = await draftTopLeadEmail({
      supabase,
      userId: auth.userId,
      leadId:
        typeof response.execute.params.lead_id === "string"
          ? response.execute.params.lead_id
          : null,
      bmoContext,
    });

    if (draftResult) {
      executedData = {
        lead: draftResult.lead as Lead,
        draft: draftResult.draft,
      };
    }
  }

  await supabase.from("agent_runs").insert({
    user_id: auth.userId,
    agent_type: "coworker",
    status: "completed",
    input: {
      messages,
      bmo_context: bmoContext,
    },
    output: {
      message: response.message,
      artifact_switch: response.artifact_switch,
      executed_data: executedData,
    },
    completed_at: new Date().toISOString(),
  });

  return NextResponse.json({
    message: response.message,
    artifact_switch: response.artifact_switch ?? null,
    terminal_lines: response.terminal_lines ?? [],
    action_button: response.action_button ?? null,
    execute: response.execute ?? null,
    data_refresh: Boolean(response.data_refresh),
    executed_data: executedData ?? null,
  });
}
