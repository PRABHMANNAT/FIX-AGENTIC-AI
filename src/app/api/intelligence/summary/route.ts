import { NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const userId = auth.userId;
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    const currentQuarter = `Q${q} ${now.getFullYear()}`;

    const [alertsResult, snapshotResult, integrationsResult, goalsResult, highInsightsResult] =
      await Promise.allSettled([
        supabase
          .from("proactive_alerts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "unread"),
        supabase
          .from("intelligence_hub_snapshots")
          .select("overall_health_score, one_priority, generated_at")
          .eq("user_id", userId)
          .order("generated_at", { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from("integrations")
          .select("provider")
          .eq("user_id", userId),
        supabase
          .from("user_goals")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("quarter", currentQuarter),
        supabase
          .from("slack_insights")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("severity", "high"),
      ]);

    const unreadCount =
      alertsResult.status === "fulfilled"
        ? (alertsResult.value.count || 0)
        : 0;

    const snapshot =
      snapshotResult.status === "fulfilled" && snapshotResult.value.data
        ? snapshotResult.value.data
        : null;

    const integrations =
      integrationsResult.status === "fulfilled" && integrationsResult.value.data
        ? integrationsResult.value.data
        : [];

    const goalsCount =
      goalsResult.status === "fulfilled"
        ? (goalsResult.value.count || 0)
        : 0;

    const highSeverityCount =
      highInsightsResult.status === "fulfilled"
        ? (highInsightsResult.value.count || 0)
        : 0;

    // Build connected status
    const connected = {
      slack: integrations.some((i: any) => i.provider === "slack"),
      calendar: integrations.some((i: any) => i.provider === "google_calendar"),
      github: integrations.some((i: any) => i.provider === "github"),
      stripe: false, // Checked via finance_settings if needed; default false
    };

    return NextResponse.json({
      proactive_alerts_count: unreadCount,
      latest_health_score: snapshot?.overall_health_score ?? null,
      latest_one_priority: snapshot?.one_priority ?? null,
      last_analysis: snapshot?.generated_at ?? null,
      connected,
      goals_set: goalsCount,
      high_severity_insights: highSeverityCount,
    });
  } catch (error: any) {
    console.error("Intelligence summary error:", error.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
