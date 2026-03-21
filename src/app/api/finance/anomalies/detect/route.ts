import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import { generateWithFallback, MODELS } from "@/lib/finance-ai";

export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  console.log('[anomalies/detect] called')
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    // 1. Fetch current cache
    let cache: Record<string, any> | null = null
    try {
      const { data } = await supabase
        .from("finance_data_cache")
        .select("*")
        .eq("user_id", auth.userId)
        .single();
      cache = data;
    } catch (e) {
      console.log('finance_data_cache not available yet')
    }

    if (!cache) {
      return NextResponse.json({ anomalies_found: 0, anomalies: [] });
    }

    // Build metrics comparison — use 15% thresholds as absolute baseline
    // since we may not have historical snapshots
    const metricsComparison = {
      mrr: {
        current: cache.mrr || 0,
        expected: cache.mrr || 0,
        threshold_percent: 15,
        metric_name: "Monthly Recurring Revenue",
      },
      churn_rate: {
        current: cache.churn_rate || 0,
        expected: cache.churn_rate || 0,
        threshold_percent: 2,
        threshold_type: "percentage_points",
        metric_name: "Churn Rate",
      },
      burn_rate: {
        current: cache.burn_rate || 0,
        expected: cache.burn_rate || 0,
        threshold_percent: 20,
        metric_name: "Burn Rate",
      },
      runway_months: {
        current: cache.runway_months || 0,
        expected: cache.runway_months || 0,
        threshold_change: 1,
        threshold_type: "absolute_drop",
        metric_name: "Runway (months)",
      },
      cash_balance: {
        current: cache.cash_balance || 0,
        expected: cache.cash_balance || 0,
        threshold_percent: 10,
        metric_name: "Cash Balance",
      },
    };

    // Try to fetch the most recent previous snapshot for comparison
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: previousCache } = await supabase
      .from("finance_data_cache")
      .select("mrr, churn_rate, burn_rate, runway_months, cash_balance")
      .eq("user_id", auth.userId)
      .lt("updated_at", oneWeekAgo)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (previousCache) {
      metricsComparison.mrr.expected = previousCache.mrr || metricsComparison.mrr.current;
      metricsComparison.churn_rate.expected = previousCache.churn_rate || metricsComparison.churn_rate.current;
      metricsComparison.burn_rate.expected = previousCache.burn_rate || metricsComparison.burn_rate.current;
      metricsComparison.runway_months.expected = previousCache.runway_months || metricsComparison.runway_months.current;
      metricsComparison.cash_balance.expected = previousCache.cash_balance || metricsComparison.cash_balance.current;
    }

    const systemPrompt = `You are a financial anomaly detector. Analyze the metrics provided and identify genuine anomalies that a founder should know about. Only flag real issues — do not flag normal business fluctuations.

For each anomaly found return a JSON array where each item has:
{ metric, current_value, expected_value, deviation_percent, severity ('low'/'medium'/'high'), explanation (one sentence, plain English, specific numbers), recommended_action (one sentence, specific and actionable) }

Severity rules:
- high: deviation > 30% or runway dropped below 3 months
- medium: deviation 15-30% or runway dropped below 6 months
- low: deviation 10-15%, worth noting but not urgent

Return empty array [] if no genuine anomalies found.
Return ONLY valid JSON array. No explanation, no markdown.`;

    // 3. Call AI
    let content = "[]";
    try {
      content = await generateWithFallback({
        model: MODELS.HAIKU,
        maxTokens: 2048,
        system: systemPrompt,
        prompt: JSON.stringify(metricsComparison)
      });
    } catch (e) {
      console.warn("Anomaly fallback failed", e);
    }
    const cleanContent = content.replace(/```json\n|\n```|```/g, "").trim();

    let anomaliesArray: Array<{
      metric: string;
      current_value: number;
      expected_value: number;
      deviation_percent: number;
      severity: string;
      explanation: string;
      recommended_action: string;
    }>;

    try {
      anomaliesArray = JSON.parse(cleanContent);
      if (!Array.isArray(anomaliesArray)) {
        return NextResponse.json({ anomalies_found: 0, anomalies: [] });
      }
    } catch {
      return NextResponse.json({ anomalies_found: 0, anomalies: [] });
    }

    // 6. Insert anomalies, skipping duplicates
    const insertedAnomalies: Array<Record<string, unknown>> = [];
    const now = new Date().toISOString();

    for (const a of anomaliesArray) {
      // Check for existing duplicate (same metric, status='new')
      const { data: existing } = await supabase
        .from("finance_anomalies")
        .select("id")
        .eq("user_id", auth.userId)
        .eq("metric", a.metric)
        .eq("status", "new")
        .limit(1);

      if (existing && existing.length > 0) continue;

      const { data: inserted, error: insertErr } = await supabase
        .from("finance_anomalies")
        .insert({
          user_id: auth.userId,
          metric: a.metric,
          current_value: a.current_value,
          expected_value: a.expected_value,
          deviation_percent: a.deviation_percent,
          severity: a.severity,
          explanation: a.explanation,
          recommended_action: a.recommended_action,
          status: "new",
          detected_at: now,
        })
        .select()
        .single();

      if (!insertErr && inserted) {
        insertedAnomalies.push(inserted);
      }
    }

    // 7. Slack notification for HIGH severity
    const highAnomalies = insertedAnomalies.filter((a) => a.severity === "high");
    if (highAnomalies.length > 0) {
      const { data: settings } = await supabase
        .from("finance_settings")
        .select("slack_webhook_url")
        .eq("user_id", auth.userId)
        .single();

      if (settings?.slack_webhook_url) {
        for (const a of highAnomalies) {
          try {
            await fetch(settings.slack_webhook_url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: "🚨 *Finance Alert — AssembleOne*",
                blocks: [
                  {
                    type: "section",
                    text: {
                      type: "mrkdwn",
                      text: `*High severity anomaly detected*\nMetric: ${a.metric}\n${a.explanation}\nAction: ${a.recommended_action}`,
                    },
                  },
                ],
              }),
            });
          } catch (slackErr) {
            console.error("Slack notification failed:", slackErr);
          }
        }
      }
    }

    return NextResponse.json({
      anomalies_found: insertedAnomalies.length,
      anomalies: insertedAnomalies,
    });
  } catch (error) {
    console.error("Anomaly detection error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
