import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import { generateWithFallback, MODELS } from "@/lib/finance-ai";

function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  console.log('[briefing/generate] called')
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { force = false } = body;

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    const mondayDate = getMonday(new Date());

    // 1. Check for existing briefing this week
    if (!force) {
      const { data: existing } = await supabase
        .from("finance_briefings")
        .select("*")
        .eq("user_id", auth.userId)
        .eq("week_of", mondayDate)
        .single();

      if (existing) {
        const briefing = {
          id: existing.id,
          user_id: existing.user_id,
          week_of: existing.week_of,
          sent_to_slack: existing.sent_to_slack,
          created_at: existing.created_at,
          ...(existing.content_json as object),
        };
        return NextResponse.json({ briefing, cached: true });
      }
    }

    // 2. Fetch data
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

    let settings: Record<string, any> | null = null
    try {
      const { data } = await supabase
        .from("finance_settings")
        .select("company_name, slack_webhook_url")
        .eq("user_id", auth.userId)
        .single();
      settings = data;
    } catch (e) {
      console.log('finance_settings not available yet')
    }

    // Fetch recent anomalies
    const { data: anomalies } = await supabase
      .from("finance_anomalies")
      .select("metric, severity, explanation, recommended_action")
      .eq("user_id", auth.userId)
      .eq("status", "new")
      .order("detected_at", { ascending: false })
      .limit(3);

    const mrr = cache?.mrr || 0;
    const arr = cache?.arr || 0;
    const churn_rate = cache?.churn_rate || 0;
    const burn_rate = cache?.burn_rate || 0;
    const runway_months = cache?.runway_months || 0;
    const cash_balance = cache?.cash_balance || 0;
    const company_name = settings?.company_name || "Your Company";

    // 3. WoW changes
    // Try fetching last week's snapshot
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: prevCache } = await supabase
      .from("finance_data_cache")
      .select("mrr, burn_rate")
      .eq("user_id", auth.userId)
      .lt("updated_at", lastWeek)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    const lastMrr = prevCache?.mrr || mrr;
    const lastBurn = prevCache?.burn_rate || burn_rate;
    const revenue_change_percent = lastMrr > 0 ? ((mrr - lastMrr) / lastMrr) * 100 : 0;
    const burn_change_percent = lastBurn > 0 ? ((burn_rate - lastBurn) / lastBurn) * 100 : 0;

    const systemPrompt = `You are a CFO writing a Monday morning finance briefing for a startup founder. Be direct and specific — like a senior operator who respects the founder's time. Use real numbers. No fluff.

Return a JSON object with exactly these keys:
- week_summary: string, 2 sentences max, what happened financially this week
- revenue_update: { change_percent: number, insight: string (1 sentence), direction: 'up'|'down'|'flat' }
- burn_update: { change_percent: number, insight: string (1 sentence), direction: 'up'|'down'|'flat' }
- top_3_actions: array of exactly 3 objects { action: string, urgency: 'now'|'this-week'|'monitor' }
  Order by urgency: now items first
- wins: array of exactly 2 strings, specific positive things
- watch_out: array of exactly 2 strings, specific things to monitor
- one_line_forecast: string, one sentence outlook for next week

Return ONLY valid JSON. No explanation, no markdown, no code blocks.`;

    const userMessage = `Company: ${company_name}
This week — MRR: ₹${mrr}, ARR: ₹${arr}, Churn: ${churn_rate}%, Burn: ₹${burn_rate}/month, Runway: ${runway_months} months, Cash: ₹${cash_balance}
MRR change this week: ${revenue_change_percent.toFixed(1)}%
Burn change this week: ${burn_change_percent.toFixed(1)}%
Active anomalies: ${JSON.stringify(anomalies || [])}
Week of: ${mondayDate}`;

    // 4. AI Call
    let content = "{}";
    try {
      content = await generateWithFallback({
        model: MODELS.SONNET,
        maxTokens: 4096,
        system: systemPrompt,
        prompt: userMessage
      });
    } catch (e) {
      return NextResponse.json({ error: "AI generation failed" }, { status: 502 });
    }
    const cleanContent = content.replace(/```json\n|\n```|```/g, "").trim();

    let briefingContent: Record<string, unknown>;
    try {
      briefingContent = JSON.parse(cleanContent);
    } catch {
      return NextResponse.json({ error: "Failed to parse briefing" }, { status: 422 });
    }

    // 6. Save
    const { data: savedBriefing, error: dbErr } = await supabase
      .from("finance_briefings")
      .upsert(
        {
          user_id: auth.userId,
          week_of: mondayDate,
          content_json: briefingContent,
          sent_to_slack: false,
        },
        { onConflict: "user_id,week_of" }
      )
      .select()
      .single();

    if (dbErr) {
      console.error("Briefing save error:", dbErr);
      return NextResponse.json({ error: "Failed to save briefing" }, { status: 500 });
    }

    let sentToSlack = false;

    // 7. Slack
    if (settings?.slack_webhook_url) {
      try {
        const bc = briefingContent as {
          week_summary?: string;
          top_3_actions?: Array<{ urgency: string; action: string }>;
          wins?: string[];
          watch_out?: string[];
          one_line_forecast?: string;
        };
        const formatted_date = new Date(mondayDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

        await fetch(settings.slack_webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blocks: [
              { type: "header", text: { type: "plain_text", text: `📊 Weekly Finance Brief — ${formatted_date}` } },
              { type: "section", text: { type: "mrkdwn", text: bc.week_summary || "" } },
              { type: "divider" },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text:
                    "*Top Actions This Week:*\n" +
                    (bc.top_3_actions || [])
                      .map((a) => `${a.urgency === "now" ? "🔴" : a.urgency === "this-week" ? "🟡" : "🟢"} ${a.action}`)
                      .join("\n"),
                },
              },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text:
                    "*Wins:*\n" +
                    (bc.wins || []).map((w) => `✅ ${w}`).join("\n") +
                    "\n\n*Watch out:*\n" +
                    (bc.watch_out || []).map((w) => `⚠️ ${w}`).join("\n"),
                },
              },
              { type: "context", elements: [{ type: "mrkdwn", text: bc.one_line_forecast || "" }] },
            ],
          }),
        });

        sentToSlack = true;

        await supabase
          .from("finance_briefings")
          .update({ sent_to_slack: true })
          .eq("id", savedBriefing.id);
      } catch (slackErr) {
        console.error("Slack briefing send failed:", slackErr);
      }
    }

    const briefing = {
      id: savedBriefing.id,
      user_id: savedBriefing.user_id,
      week_of: savedBriefing.week_of,
      sent_to_slack: sentToSlack,
      created_at: savedBriefing.created_at,
      ...briefingContent,
    };

    return NextResponse.json({ briefing, sent_to_slack: sentToSlack });
  } catch (error) {
    console.error("Briefing generate error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
