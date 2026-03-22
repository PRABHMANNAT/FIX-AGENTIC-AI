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

    // 1. Fetch insights
    let insightsData: any[] = [];
    try {
      const { data } = await supabase
        .from("slack_insights")
        .select("*")
        .eq("user_id", userId)
        .order("generated_at", { ascending: false })
        .limit(20);
      insightsData = data || [];
    } catch (e) {
      console.error("Failed to fetch slack insights:", e);
    }

    // 2. Fetch unanswered thread count
    let unansweredCount = 0;
    try {
      const { count } = await supabase
        .from("slack_messages")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("thread_replied", false)
        .like("message_text", "%?%");
      unansweredCount = count || 0;
    } catch (e) {
      console.error("Failed to fetch unanswered count:", e);
    }

    // 3. Fetch last_synced_at from integrations
    let integration: any = null;
    try {
      const { data } = await supabase
        .from("integrations")
        .select("last_synced_at, metadata")
        .eq("user_id", userId)
        .eq("provider", "slack")
        .single();
      integration = data;
    } catch (e) {
      // Not connected
    }

    return NextResponse.json({
      insights: insightsData,
      unanswered_count: unansweredCount,
      last_synced: integration?.last_synced_at || null,
      connected: !!integration,
      workspace_name: integration?.metadata?.team_name || null,
    });
  } catch (error: any) {
    console.error("GET slack insights error:", error.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
