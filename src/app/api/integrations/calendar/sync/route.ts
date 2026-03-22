import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import Groq from "groq-sdk";

function categorizeEvent(title: string, attendeeCount: number): string {
  const t = title.toLowerCase();
  if (
    t.includes("standup") ||
    t.includes("stand-up") ||
    t.includes("scrum") ||
    t.includes("daily")
  )
    return "Team Meeting";
  if (
    t.includes("interview") ||
    t.includes("recruit") ||
    t.includes("hiring")
  )
    return "Recruiting";
  if (
    t.includes("demo") ||
    t.includes("sales") ||
    t.includes("prospect") ||
    t.includes("pitch") ||
    t.includes("client call")
  )
    return "Sales";
  if (
    t.includes("1:1") ||
    t.includes("one on one") ||
    t.includes("1-1") ||
    t.includes("check in")
  )
    return "People";
  if (
    t.includes("investor") ||
    t.includes("board") ||
    t.includes("fundrais")
  )
    return "Finance";
  if (
    t.includes("review") ||
    t.includes("planning") ||
    t.includes("retrospect") ||
    t.includes("sprint")
  )
    return "Product";
  if (attendeeCount <= 1) return "Deep Work";
  if (attendeeCount >= 5) return "Team Meeting";
  return "Admin";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { userId } = body as { userId: string };

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    // STEP 1 — Fetch credentials
    const { data: integration } = await supabase
      .from("integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", "google_calendar")
      .single();

    if (!integration) {
      return NextResponse.json(
        { error: "Calendar not connected" },
        { status: 400 }
      );
    }

    let accessToken = integration.access_token;

    // STEP 2 — Refresh token if needed
    const tokenExpiry = integration.metadata?.token_expiry;
    if (
      tokenExpiry &&
      new Date(tokenExpiry) <= new Date() &&
      integration.refresh_token
    ) {
      try {
        const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: integration.refresh_token,
            grant_type: "refresh_token",
          }),
        });
        const refreshData = await refreshRes.json();

        if (refreshData.access_token) {
          accessToken = refreshData.access_token;
          await supabase
            .from("integrations")
            .update({
              access_token: refreshData.access_token,
              metadata: {
                ...integration.metadata,
                token_expiry: refreshData.expires_in
                  ? new Date(
                      Date.now() + refreshData.expires_in * 1000
                    ).toISOString()
                  : null,
              },
            })
            .eq("user_id", userId)
            .eq("provider", "google_calendar");
        }
      } catch (e) {
        console.error("Token refresh failed:", e);
      }
    }

    // STEP 3 — Fetch calendar events
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const eventsRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        new URLSearchParams({
          timeMin: sevenDaysAgo.toISOString(),
          timeMax: now.toISOString(),
          maxResults: "200",
          singleEvents: "true",
          orderBy: "startTime",
        }),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const eventsData = await eventsRes.json();

    if (eventsData.error) {
      console.error("Google Calendar API error:", eventsData.error);
      return NextResponse.json(
        { error: "Failed to fetch calendar events" },
        { status: 500 }
      );
    }

    const events = eventsData.items || [];

    // STEP 4 & 5 — Categorize and process events
    const currentWeekStart = new Date();
    currentWeekStart.setDate(
      currentWeekStart.getDate() - currentWeekStart.getDay()
    );
    currentWeekStart.setHours(0, 0, 0, 0);

    const processedEvents: any[] = [];

    for (const event of events) {
      if (!event.start) continue;

      const startTime = new Date(event.start.dateTime || event.start.date);
      const endTime = new Date(
        event.end?.dateTime || event.end?.date || startTime
      );
      const durationMinutes = Math.round(
        (endTime.getTime() - startTime.getTime()) / 60000
      );
      const attendeeCount = (event.attendees || []).length + 1;
      const category = categorizeEvent(event.summary || "", attendeeCount);

      processedEvents.push({
        user_id: userId,
        title: (event.summary || "Untitled").substring(0, 200),
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: Math.max(durationMinutes, 0),
        attendee_count: attendeeCount,
        category,
        week_of: currentWeekStart.toISOString().split("T")[0],
      });
    }

    // Upsert processed events
    if (processedEvents.length > 0) {
      try {
        await supabase
          .from("calendar_events")
          .upsert(processedEvents, { onConflict: "user_id,start_time,title" });
      } catch (e) {
        console.error("Failed to upsert calendar events:", e);
      }
    }

    // STEP 6 — Calculate time audit metrics
    const thisWeekEvents = processedEvents.filter(
      (e) => new Date(e.start_time) >= currentWeekStart
    );

    const timeByCategory: Record<string, number> = {};
    for (const event of thisWeekEvents) {
      timeByCategory[event.category] =
        (timeByCategory[event.category] || 0) + event.duration_minutes;
    }

    const totalMinutes = Object.values(timeByCategory).reduce(
      (a, b) => a + b,
      0
    );
    const deepWorkMinutes = timeByCategory["Deep Work"] || 0;
    const meetingMinutes =
      (timeByCategory["Team Meeting"] || 0) + (timeByCategory["People"] || 0);

    const meetingsOnly = thisWeekEvents.filter(
      (e) => e.category === "Team Meeting" || e.category === "People"
    );
    const avgMeetingLength =
      meetingsOnly.length > 0
        ? Math.round(
            meetingsOnly.reduce((a, e) => a + e.duration_minutes, 0) /
              meetingsOnly.length
          )
        : 0;
    const avgAttendees =
      meetingsOnly.length > 0
        ? Math.round(
            meetingsOnly.reduce((a, e) => a + e.attendee_count, 0) /
              meetingsOnly.length
          )
        : 0;

    const deepWorkPercent =
      totalMinutes > 0
        ? Math.round((deepWorkMinutes / totalMinutes) * 100)
        : 0;

    const metrics = {
      total_hours: Math.round((totalMinutes / 60) * 10) / 10,
      time_by_category: Object.fromEntries(
        Object.entries(timeByCategory).map(([k, v]) => [
          k,
          Math.round((v / 60) * 10) / 10,
        ])
      ),
      deep_work_hours: Math.round((deepWorkMinutes / 60) * 10) / 10,
      deep_work_percent: deepWorkPercent,
      meeting_hours: Math.round((meetingMinutes / 60) * 10) / 10,
      meeting_to_deepwork_ratio:
        deepWorkMinutes > 0
          ? Math.round((meetingMinutes / deepWorkMinutes) * 10) / 10
          : 99,
      avg_meeting_length_minutes: avgMeetingLength,
      avg_meeting_attendees: avgAttendees,
      total_events_this_week: thisWeekEvents.length,
      days_without_deep_work:
        5 -
        new Set(
          thisWeekEvents
            .filter((e) => e.category === "Deep Work")
            .map((e) => new Date(e.start_time).getDay())
        ).size,
    };

    // STEP 7 — Call Groq for time audit insights
    let insightsParsed: { insights: any[]; one_line_summary?: string } = {
      insights: [],
      one_line_summary: "",
    };

    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 600,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: `You are an executive coach analyzing a startup founder's
calendar and time allocation. Provide 2 to 3 specific, honest insights
about how they are spending their time. Reference actual numbers.
Focus on: deep work vs meetings ratio, meeting quality signals,
time allocation vs typical startup priorities.
Return ONLY valid JSON:
{
  "insights": [
    {
      "insight_text": "specific observation with numbers",
      "category": "focus or meetings or balance or recommendation",
      "severity": "high or medium or low"
    }
  ],
  "one_line_summary": "one sentence about this week's time allocation"
}`,
          },
          {
            role: "user",
            content: `Time audit metrics:\n${JSON.stringify(metrics, null, 2)}`,
          },
        ],
      });

      const insightText =
        completion.choices[0]?.message?.content || "{}";
      try {
        const cleaned = insightText.replace(/```json|```/g, "").trim();
        insightsParsed = JSON.parse(cleaned);
      } catch (e) {
        console.error("Failed to parse Groq time audit response:", e);
      }
    } catch (e) {
      console.error("Groq time audit call failed:", e);
    }

    // STEP 8 — Save insights and update integrations
    if (
      Array.isArray(insightsParsed.insights) &&
      insightsParsed.insights.length > 0
    ) {
      try {
        await supabase.from("slack_insights").insert(
          insightsParsed.insights.map((i: any) => ({
            user_id: userId,
            insight_text: i.insight_text,
            category: `time_audit:${i.category}`,
            severity: i.severity,
            raw_data: metrics,
            generated_at: new Date().toISOString(),
          }))
        );
      } catch (e) {
        console.error("Failed to save time audit insights:", e);
      }

      for (const insight of insightsParsed.insights) {
        if (insight.severity !== "high") continue;
        try {
          await supabase.from("proactive_alerts").insert({
            user_id: userId,
            message: insight.insight_text,
            urgency: "high",
            category: "workflow",
            suggested_action:
              "Review your calendar and consider blocking deep work time",
            status: "unread",
          });
        } catch (e) {
          console.error("Failed to insert proactive alert from time audit:", e);
        }
      }
    }

    // Update last_synced_at
    try {
      await supabase
        .from("integrations")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("provider", "google_calendar");
    } catch (e) {
      console.error("Failed to update last_synced_at:", e);
    }

    // STEP 9 — Return
    return NextResponse.json({
      events_synced: processedEvents.length,
      metrics,
      insights: insightsParsed.insights || [],
      one_line_summary: insightsParsed.one_line_summary || "",
    });
  } catch (error: any) {
    console.error("Calendar sync error:", error.message);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
