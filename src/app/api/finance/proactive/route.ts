import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import Groq from "groq-sdk";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { userId } = body as { userId: string };

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    // STEP 1 — Fetch all available data in parallel using Promise.allSettled
    const [
      cacheResult,
      recentAlertsResult,
      settingsResult,
      anomaliesResult,
      slackInsightsResult,
      githubActivityResult,
    ] = await Promise.allSettled([
      // a) finance_data_cache
      supabase
        .from("finance_data_cache")
        .select("*")
        .eq("user_id", userId)
        .single(),
      // b) Last 3 proactive_alerts
      supabase
        .from("proactive_alerts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3),
      // c) finance_settings
      supabase
        .from("finance_settings")
        .select("*")
        .eq("user_id", userId)
        .single(),
      // d) Last 5 finance_anomalies with status='new'
      supabase
        .from("finance_anomalies")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "new")
        .order("created_at", { ascending: false })
        .limit(5),
      // e) Last 5 slack_insights
      supabase
        .from("slack_insights")
        .select("*")
        .eq("user_id", userId)
        .order("generated_at", { ascending: false })
        .limit(5),
      // f) Last 5 github_activity rows
      supabase
        .from("github_activity")
        .select("*")
        .eq("user_id", userId)
        .limit(5),
    ]);

    // Extract data with safe defaults
    const cache =
      cacheResult.status === "fulfilled" && cacheResult.value.data
        ? cacheResult.value.data
        : { mrr: 0, arr: 0, churn_rate: 0, burn_rate: 0, runway_months: 0, cash_balance: 0 };

    const recentAlerts =
      recentAlertsResult.status === "fulfilled" && recentAlertsResult.value.data
        ? recentAlertsResult.value.data
        : [];

    const settings =
      settingsResult.status === "fulfilled" && settingsResult.value.data
        ? settingsResult.value.data
        : { company_name: "Your Company", slack_webhook_url: null };

    const anomalies =
      anomaliesResult.status === "fulfilled" && anomaliesResult.value.data
        ? anomaliesResult.value.data
        : [];

    const slackInsights =
      slackInsightsResult.status === "fulfilled" && slackInsightsResult.value.data
        ? slackInsightsResult.value.data
        : [];

    const githubActivity =
      githubActivityResult.status === "fulfilled" && githubActivityResult.value.data
        ? githubActivityResult.value.data
        : [];

    // STEP 2 — Build context object
    const context = {
      company: settings.company_name,
      financial: {
        mrr: cache.mrr,
        arr: cache.arr,
        churn_rate: cache.churn_rate,
        burn_rate: cache.burn_rate,
        runway_months: cache.runway_months,
        cash_balance: cache.cash_balance,
      },
      recent_anomalies: anomalies.map((a: any) => ({
        metric: a.metric,
        deviation_percent: a.deviation_percent,
        severity: a.severity,
        explanation: a.explanation,
      })),
      slack_signals: slackInsights.map((s: any) => ({
        insight: s.insight_text,
        severity: s.severity,
      })),
      github_signals: githubActivity.slice(0, 3),
      recent_alerts_sent: recentAlerts.map((a: any) => a.message),
    };

    // STEP 3 — Call Groq
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1000,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: `You are a proactive business co-worker AI for a startup founder.
You monitor their business data and surface things they need to know NOW.

RULES — follow strictly:
- Only surface genuine issues with specific numbers
- Never repeat an alert similar to one in recent_alerts_sent
- Never surface noise or minor normal fluctuations
- Each alert must feel like a smart co-worker tapping you on the shoulder
- If nothing genuinely needs attention return empty alerts array
- Maximum 3 alerts per scan — only the most important ones

Return ONLY valid JSON in this exact format:
{
  "alerts": [
    {
      "message": "one to two sentences with specific numbers",
      "urgency": "high or medium or low",
      "category": "finance or workflow or product or people or opportunity",
      "suggested_action": "one specific actionable sentence"
    }
  ]
}

Return { "alerts": [] } if nothing genuinely needs attention right now.`,
        },
        {
          role: "user",
          content: `Business data to analyze:\n${JSON.stringify(context, null, 2)}`,
        },
      ],
    });

    // STEP 4 — Parse response
    const responseText = completion.choices[0]?.message?.content || "{}";
    let parsed: { alerts: any[] } = { alerts: [] };

    try {
      const cleaned = responseText.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse Groq proactive response:", e);
      return NextResponse.json({ alerts_created: 0 });
    }

    if (!Array.isArray(parsed.alerts)) {
      return NextResponse.json({ alerts_created: 0 });
    }

    // STEP 5 — Deduplicate and insert alerts
    const insertedAlerts: any[] = [];

    for (const alert of parsed.alerts) {
      if (!alert.message || !alert.urgency) continue;

      const isDuplicate = recentAlerts.some(
        (existing: any) =>
          existing.category === alert.category &&
          existing.urgency === alert.urgency &&
          existing.created_at >
            new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      );

      if (isDuplicate) continue;

      try {
        const { data, error } = await supabase
          .from("proactive_alerts")
          .insert({
            user_id: userId,
            message: alert.message,
            urgency: alert.urgency,
            category: alert.category,
            suggested_action: alert.suggested_action,
            status: "unread",
          })
          .select()
          .single();

        if (!error && data) {
          insertedAlerts.push(data);
        }
      } catch (e) {
        console.error("Failed to insert alert:", e);
      }
    }

    // STEP 6 — Send high urgency alerts to Slack
    for (const alert of insertedAlerts) {
      if (alert.urgency !== "high") continue;
      if (!settings.slack_webhook_url) continue;

      try {
        await fetch(settings.slack_webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blocks: [
              {
                type: "header",
                text: { type: "plain_text", text: "🚨 AssembleOne Alert" },
              },
              {
                type: "section",
                text: { type: "mrkdwn", text: alert.message },
              },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*Suggested action:* ${alert.suggested_action}`,
                },
              },
            ],
          }),
        });
      } catch (e) {
        console.error("Slack notification failed:", e);
      }
    }

    // STEP 7 — Return
    return NextResponse.json({
      alerts_created: insertedAlerts.length,
      alerts: insertedAlerts,
    });
  } catch (error: any) {
    console.error("Proactive monitoring error:", error.message);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
