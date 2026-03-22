import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import Groq from "groq-sdk";

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

    // STEP 1 — Fetch all data sources in parallel
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekOf = weekStart.toISOString().split("T")[0];

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    const currentQuarter = `Q${q} ${now.getFullYear()}`;

    const [
      financeResult,
      slackResult,
      githubResult,
      calendarResult,
      alertsResult,
      goalsResult,
      anomaliesResult,
      snapshotResult,
      settingsResult,
    ] = await Promise.allSettled([
      supabase
        .from("finance_data_cache")
        .select("*")
        .eq("user_id", userId)
        .single(),
      supabase
        .from("slack_insights")
        .select("*")
        .eq("user_id", userId)
        .gte("generated_at", sevenDaysAgo)
        .order("generated_at", { ascending: false })
        .limit(10),
      supabase
        .from("github_activity")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", userId)
        .eq("week_of", weekOf),
      supabase
        .from("proactive_alerts")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "unread")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("user_goals")
        .select("*")
        .eq("user_id", userId)
        .eq("quarter", currentQuarter),
      supabase
        .from("finance_anomalies")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "new")
        .order("detected_at", { ascending: false })
        .limit(3),
      supabase
        .from("intelligence_hub_snapshots")
        .select("*")
        .eq("user_id", userId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from("finance_settings")
        .select("company_name")
        .eq("user_id", userId)
        .single(),
    ]);

    // Extract values with safe defaults
    const cache =
      financeResult.status === "fulfilled" && financeResult.value.data
        ? financeResult.value.data
        : { mrr: 0, arr: 0, churn_rate: 0, burn_rate: 0, runway_months: 0, cash_balance: 0, net_new_mrr: 0 };

    const slackInsights =
      slackResult.status === "fulfilled" && slackResult.value.data
        ? slackResult.value.data
        : [];

    const githubActivity =
      githubResult.status === "fulfilled" && githubResult.value.data
        ? githubResult.value.data
        : [];

    const calendarEvents =
      calendarResult.status === "fulfilled" && calendarResult.value.data
        ? calendarResult.value.data
        : [];

    const unreadAlerts =
      alertsResult.status === "fulfilled" && alertsResult.value.data
        ? alertsResult.value.data
        : [];

    const goals =
      goalsResult.status === "fulfilled" && goalsResult.value.data
        ? goalsResult.value.data
        : [];

    const anomalies =
      anomaliesResult.status === "fulfilled" && anomaliesResult.value.data
        ? anomaliesResult.value.data
        : [];

    const previousSnapshot =
      snapshotResult.status === "fulfilled" && snapshotResult.value.data
        ? snapshotResult.value.data
        : null;

    const settings =
      settingsResult.status === "fulfilled" && settingsResult.value.data
        ? settingsResult.value.data
        : { company_name: "Your Company" };

    // Build calendar data summary
    const timeByCategory: Record<string, number> = {};
    for (const event of calendarEvents) {
      timeByCategory[event.category] =
        (timeByCategory[event.category] || 0) + event.duration_minutes;
    }
    const deepWorkMinutes = timeByCategory["Deep Work"] || 0;
    const meetingMinutes =
      (timeByCategory["Team Meeting"] || 0) + (timeByCategory["People"] || 0);

    const calendarData = {
      time_by_category: Object.fromEntries(
        Object.entries(timeByCategory).map(([k, v]) => [k, Math.round(v / 60 * 10) / 10])
      ),
      deep_work_hours: Math.round(deepWorkMinutes / 60 * 10) / 10,
      meeting_hours: Math.round(meetingMinutes / 60 * 10) / 10,
    };

    // STEP 2 — Build unified context object
    const context = {
      company: settings.company_name,
      timestamp: now.toISOString(),

      financial_signals: {
        mrr: cache.mrr,
        arr: cache.arr,
        churn_rate: cache.churn_rate,
        burn_rate: cache.burn_rate,
        runway_months: cache.runway_months,
        cash_balance: cache.cash_balance,
        net_new_mrr: cache.net_new_mrr,
        recent_anomalies: anomalies.map((a: any) => ({
          metric: a.metric,
          deviation: a.deviation_percent,
          explanation: a.explanation,
        })),
      },

      communication_signals: {
        slack_connected: slackInsights.length > 0,
        recent_insights: slackInsights.slice(0, 5).map((i: any) => ({
          insight: i.insight_text,
          severity: i.severity,
          category: i.category,
        })),
      },

      engineering_signals: {
        github_connected: githubActivity.length > 0,
        recent_activity: githubActivity.slice(0, 5),
      },

      time_signals: {
        calendar_connected: Object.keys(calendarData.time_by_category).length > 0,
        deep_work_hours_this_week: calendarData.deep_work_hours,
        meeting_hours_this_week: calendarData.meeting_hours,
        time_by_category: calendarData.time_by_category,
      },

      strategic_signals: {
        goals: goals.map((g: any) => ({
          goal: g.goal_text,
          category: g.category,
          time_target_percent: g.time_allocation_target_percent,
        })),
        unread_alerts: unreadAlerts.map((a: any) => ({
          message: a.message,
          category: a.category,
          urgency: a.urgency,
        })),
      },

      previous_analysis: previousSnapshot
        ? {
            score: previousSnapshot.overall_health_score,
            top_priority: previousSnapshot.one_priority,
            analyzed_at: previousSnapshot.generated_at,
          }
        : null,
    };

    // STEP 3 — Call Groq for cross-signal analysis
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1500,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `You are a senior business intelligence analyst for a startup.
You have access to multiple data streams from the same company:
financial metrics, team communication patterns, engineering velocity,
and founder time allocation.

Your job: find cross-signal patterns that reveal what is ACTUALLY
blocking this business right now. Look for correlations across signals
that a human analyst might miss — for example:
- Revenue is flat AND shipping slowed AND team is quiet on Slack →
  possible morale or focus issue
- Burn increased AND founder spending more time in meetings AND
  GitHub activity dropped → founder is in wrong meetings
- Churn increased AND support keywords spiking AND no engineering
  tickets for the issue → problem being ignored

RULES:
- Only surface genuine cross-signal patterns with evidence
- Use specific numbers from the data provided
- If a data source is not connected (slack_connected: false etc)
  note what signal is missing
- overall_health_score: honest 0-100 based on all available signals
  100 = thriving across all dimensions
  70-99 = healthy with minor issues
  50-69 = meaningful problems that need attention
  30-49 = significant issues across multiple areas
  0-29 = critical situation

Return ONLY valid JSON in this exact format:
{
  "overall_health_score": 0-100 integer,
  "score_rationale": "one sentence explaining the score",
  "top_3_blockers": [
    {
      "title": "short title 5 words max",
      "description": "2 sentences with specific numbers from the data",
      "signals": ["which data sources support this finding"],
      "recommended_action": "one specific actionable sentence",
      "estimated_weekly_cost_hours": estimated hours lost per week as number
    }
  ],
  "positive_signals": [
    "specific positive thing with number",
    "second specific positive thing with number"
  ],
  "one_priority": "single most important thing for the founder to do TODAY",
  "missing_signals": ["list of data sources not yet connected"],
  "cross_signal_pattern": "one sentence describing the most interesting correlation found across multiple data sources"
}`,
        },
        {
          role: "user",
          content: `All available business signals:\n${JSON.stringify(context, null, 2)}`,
        },
      ],
    });

    // STEP 4 — Parse response
    const responseText = completion.choices[0]?.message?.content || "{}";
    let analysis: {
      overall_health_score: number;
      score_rationale: string;
      top_3_blockers: any[];
      positive_signals: string[];
      one_priority: string;
      missing_signals: string[];
      cross_signal_pattern: string;
    } = {
      overall_health_score: 50,
      score_rationale: "Analysis unavailable",
      top_3_blockers: [],
      positive_signals: [],
      one_priority: "Run the analysis again",
      missing_signals: [],
      cross_signal_pattern: "",
    };

    try {
      const cleaned = responseText.replace(/```json|```/g, "").trim();
      analysis = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse hub analysis:", e);
    }

    // STEP 5 — Save snapshot to Supabase
    let snapshotId: string | undefined;
    try {
      const { data: snapshot } = await supabase
        .from("intelligence_hub_snapshots")
        .insert({
          user_id: userId,
          overall_health_score: analysis.overall_health_score,
          top_3_blockers: analysis.top_3_blockers,
          positive_signals: analysis.positive_signals,
          one_priority: analysis.one_priority,
          generated_at: now.toISOString(),
        })
        .select()
        .single();
      snapshotId = snapshot?.id;
    } catch (e) {
      console.error("Failed to save hub snapshot:", e);
    }

    // STEP 6 — Create proactive alerts for high-cost blockers
    for (const blocker of analysis.top_3_blockers || []) {
      if ((blocker.estimated_weekly_cost_hours || 0) >= 5) {
        try {
          await supabase.from("proactive_alerts").insert({
            user_id: userId,
            message: `${blocker.title}: ${blocker.description}`,
            urgency:
              (blocker.estimated_weekly_cost_hours || 0) >= 10 ? "high" : "medium",
            category: "workflow",
            suggested_action: blocker.recommended_action,
            status: "unread",
          });
        } catch (e) {
          console.error("Failed to create alert from hub blocker:", e);
        }
      }
    }

    // STEP 7 — Return
    return NextResponse.json({
      analysis,
      snapshot_id: snapshotId,
      data_sources_used: {
        finance: true,
        slack: slackInsights.length > 0,
        github: githubActivity.length > 0,
        calendar: Object.keys(calendarData.time_by_category).length > 0,
      },
      generated_at: now.toISOString(),
    });
  } catch (error: any) {
    console.error("Hub analysis error:", error.message);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
