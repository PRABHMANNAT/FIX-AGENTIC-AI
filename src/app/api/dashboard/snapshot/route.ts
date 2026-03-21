import { NextResponse } from "next/server";
import { createAdminClient, getAuthenticatedUserContext } from "@/lib/supabase";
import {
  averageProductHealth,
  buildActivityItem,
  buildDashboardSubroutines,
  computeDashboardMetrics,
} from "@/lib/dashboard";
import { summarizeRun } from "@/lib/utils";
import type { BMOProfile, DashboardSnapshot, Lead, Product } from "@/types";

function formatFeedTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedUserId = url.searchParams.get("user_id") ?? undefined;
  const auth = await getAuthenticatedUserContext(requestedUserId);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Something went wrong loading your dashboard. Try again." },
      { status: 500 },
    );
  }

  const [metricsResult, leadsResult, productsResult, runsResult, profileResult] = await Promise.all([
    supabase.from("business_metrics").select("*").eq("user_id", auth.userId).order("recorded_at", { ascending: false }),
    supabase.from("leads").select("*").eq("user_id", auth.userId).order("created_at", { ascending: false }),
    supabase.from("products").select("*").eq("user_id", auth.userId).order("updated_at", { ascending: false }),
    supabase.from("agent_runs").select("*").eq("user_id", auth.userId).order("created_at", { ascending: false }).limit(10),
    supabase.from("profiles").select("bmo_config").eq("id", auth.userId).maybeSingle(),
  ]);

  const metrics = metricsResult.data ?? [];
  const leads = (leadsResult.data ?? []) as Lead[];
  const products = (productsResult.data ?? []) as Product[];
  const runs = runsResult.data ?? [];
  const bmoContext = (profileResult.data?.bmo_config as BMOProfile | null | undefined) ?? null;

  const mrr = metrics.find((metric) => metric.metric_type === "mrr");
  const today = new Date().toDateString();
  const customersToday = leads.filter(
    (lead) => new Date(lead.created_at).toDateString() === today,
  ).length;
  const actionsToday = runs.filter((run) => new Date(run.created_at).toDateString() === today).length;
  const salesHealth = averageProductHealth(products);
  const healthDelta = salesHealth >= 75 ? 3 : -4;

  const snapshot: DashboardSnapshot = {
    user_id: auth.userId,
    bmo_context: bmoContext,
    metrics: computeDashboardMetrics({
      monthlyRevenue: Math.round(Number(mrr?.value ?? 4280)),
      customersFound: leads.length,
      salesHealth,
      aiActions: runs.length,
      revenueDelta: Math.round(Number(mrr?.change_percent ?? 12)),
      customersDelta: customersToday,
      healthDelta,
      actionsToday,
    }),
    activity: runs.map((run) =>
      buildActivityItem({
        type: run.status === "failed" ? "error" : run.status === "running" ? "warning" : "success",
        text: summarizeRun(run),
        time: formatFeedTime(run.created_at),
        agentType: run.agent_type,
      }),
    ),
    subroutines: buildDashboardSubroutines({
      leads,
      financeTracked: metrics.some((metric) => metric.metric_type === "runway"),
      hasAssistant: true,
    }),
    leads,
  };

  return NextResponse.json(snapshot);
}
