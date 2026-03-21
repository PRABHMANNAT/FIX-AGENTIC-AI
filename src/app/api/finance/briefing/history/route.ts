import { NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";

export async function GET(): Promise<NextResponse | Response> {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    const { data: rows, error } = await supabase
      .from("finance_briefings")
      .select("*")
      .eq("user_id", auth.userId)
      .order("week_of", { ascending: false })
      .limit(8);

    if (error) {
      console.error("Briefing history error:", error);
      return NextResponse.json({ error: "Failed to fetch briefings" }, { status: 500 });
    }

    const briefings = (rows || []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      week_of: row.week_of,
      sent_to_slack: row.sent_to_slack,
      created_at: row.created_at,
      ...(row.content_json as object),
    }));

    return NextResponse.json({ briefings });
  } catch (error) {
    console.error("Briefing history error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
