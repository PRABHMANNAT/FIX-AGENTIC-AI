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

    // 1. Get current week start (Monday)
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekOf = weekStart.toISOString().split("T")[0];

    // 2. Fetch this week's calendar events
    let weekEvents: any[] = [];
    try {
      const { data } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", userId)
        .eq("week_of", weekOf);
      weekEvents = data || [];
    } catch (e) {
      console.error("Failed to fetch calendar events:", e);
    }

    // 3. Calculate time_by_category
    const timeByCategory: Record<string, number> = {};
    for (const event of weekEvents) {
      timeByCategory[event.category] =
        (timeByCategory[event.category] || 0) + event.duration_minutes;
    }

    const totalMinutes = Object.values(timeByCategory).reduce((a, b) => a + b, 0);
    const deepWorkMinutes = timeByCategory["Deep Work"] || 0;
    const meetingMinutes =
      (timeByCategory["Team Meeting"] || 0) + (timeByCategory["People"] || 0);

    const meetingsOnly = weekEvents.filter(
      (e) => e.category === "Team Meeting" || e.category === "People"
    );
    const avgMeetingLength =
      meetingsOnly.length > 0
        ? Math.round(
            meetingsOnly.reduce((a: number, e: any) => a + e.duration_minutes, 0) /
              meetingsOnly.length
          )
        : 0;
    const avgAttendees =
      meetingsOnly.length > 0
        ? Math.round(
            meetingsOnly.reduce((a: number, e: any) => a + e.attendee_count, 0) /
              meetingsOnly.length
          )
        : 0;

    const deepWorkPercent =
      totalMinutes > 0 ? Math.round((deepWorkMinutes / totalMinutes) * 100) : 0;

    const timeByCategoryHours = Object.fromEntries(
      Object.entries(timeByCategory).map(([k, v]) => [
        k,
        Math.round((v / 60) * 10) / 10,
      ])
    );

    // 4. Fetch goals for current quarter
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    const currentQuarter = `Q${q} ${now.getFullYear()}`;

    let goals: any[] = [];
    try {
      const { data } = await supabase
        .from("user_goals")
        .select("*")
        .eq("user_id", userId)
        .eq("quarter", currentQuarter);
      goals = data || [];
    } catch (e) {
      console.error("Failed to fetch goals:", e);
    }

    // 5. Fetch last 4 weekly reflections
    let reflections: any[] = [];
    try {
      const { data } = await supabase
        .from("weekly_reflections")
        .select("*")
        .eq("user_id", userId)
        .order("week_of", { ascending: false })
        .limit(4);
      reflections = data || [];
    } catch (e) {
      console.error("Failed to fetch reflections:", e);
    }

    // 6. Fetch integration row
    let integration: any = null;
    try {
      const { data } = await supabase
        .from("integrations")
        .select("last_synced_at, metadata")
        .eq("user_id", userId)
        .eq("provider", "google_calendar")
        .single();
      integration = data;
    } catch (e) {
      // Not connected
    }

    return NextResponse.json({
      connected: !!integration,
      last_synced: integration?.last_synced_at || null,
      time_by_category: timeByCategoryHours,
      total_hours: Math.round((totalMinutes / 60) * 10) / 10,
      deep_work_hours: Math.round((deepWorkMinutes / 60) * 10) / 10,
      deep_work_percent: deepWorkPercent,
      meeting_hours: Math.round((meetingMinutes / 60) * 10) / 10,
      avg_meeting_length: avgMeetingLength,
      avg_attendees: avgAttendees,
      days_without_deep_work:
        5 -
        new Set(
          weekEvents
            .filter((e) => e.category === "Deep Work")
            .map((e) => new Date(e.start_time).getDay())
        ).size,
      goals,
      reflections,
    });
  } catch (error: any) {
    console.error("Calendar insights error:", error.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
