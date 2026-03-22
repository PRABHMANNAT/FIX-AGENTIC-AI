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

    // STEP 1 — Fetch Slack credentials
    const { data: integration } = await supabase
      .from("integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", "slack")
      .single();

    if (!integration) {
      return NextResponse.json({ error: "Slack not connected" }, { status: 400 });
    }

    const accessToken = integration.access_token;

    // STEP 2 — Fetch channel list from Slack
    let channels: any[] = [];
    try {
      const channelsRes = await fetch(
        "https://slack.com/api/conversations.list?limit=20&exclude_archived=true",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const channelsData = await channelsRes.json();

      if (!channelsData.ok) {
        console.error("Slack channels fetch failed:", channelsData.error);
        return NextResponse.json(
          { error: "Failed to fetch Slack channels" },
          { status: 500 }
        );
      }

      channels = channelsData.channels || [];
    } catch (e) {
      console.error("Failed to fetch Slack channels:", e);
      return NextResponse.json(
        { error: "Failed to fetch Slack channels" },
        { status: 500 }
      );
    }

    // Take first 10 channels maximum to avoid rate limits
    const selectedChannels = channels.slice(0, 10);

    // STEP 3 — Fetch messages from each channel
    const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
    const allMessages: any[] = [];

    for (const channel of selectedChannels) {
      try {
        const msgsRes = await fetch(
          `https://slack.com/api/conversations.history?channel=${channel.id}&oldest=${sevenDaysAgo}&limit=50`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const msgsData = await msgsRes.json();

        if (!msgsData.ok) continue;

        for (const msg of msgsData.messages || []) {
          if (!msg.text || msg.subtype) continue;

          const isQuestion = msg.text.includes("?");
          const isOlderThan24h =
            Date.now() / 1000 - parseFloat(msg.ts) > 86400;
          const hasNoReplies = !msg.reply_count || msg.reply_count === 0;

          allMessages.push({
            channel_name: channel.name,
            message_text: msg.text.substring(0, 500),
            sender_name: msg.username || msg.user || "unknown",
            thread_replied: !(isQuestion && isOlderThan24h && hasNoReplies),
            message_ts: msg.ts,
          });
        }

        // Respect Slack rate limits
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (e) {
        console.error(`Failed to fetch messages for channel ${channel.name}:`, e);
      }
    }

    // STEP 4 — Save messages to Supabase
    if (allMessages.length > 0) {
      try {
        await supabase.from("slack_messages").upsert(
          allMessages.map((m) => ({ ...m, user_id: userId })),
          { onConflict: "message_ts,user_id" }
        );
      } catch (e) {
        console.error("Failed to save Slack messages:", e);
      }
    }

    // STEP 5 — Calculate aggregated metrics
    const unansweredThreads = allMessages.filter(
      (m) => m.message_text.includes("?") && !m.thread_replied
    );

    const keywordsToTrack = [
      "blocked",
      "urgent",
      "waiting",
      "broken",
      "slow",
      "bug",
      "help",
      "confused",
      "stuck",
      "issue",
    ];

    const keywordCounts: Record<string, number> = {};
    for (const keyword of keywordsToTrack) {
      keywordCounts[keyword] = allMessages.filter((m) =>
        m.message_text.toLowerCase().includes(keyword)
      ).length;
    }

    const messagesByChannel: Record<string, number> = {};
    for (const msg of allMessages) {
      messagesByChannel[msg.channel_name] =
        (messagesByChannel[msg.channel_name] || 0) + 1;
    }

    const metrics = {
      total_messages_analyzed: allMessages.length,
      unanswered_thread_count: unansweredThreads.length,
      unanswered_examples: unansweredThreads.slice(0, 3).map((m) => ({
        channel: m.channel_name,
        preview: m.message_text.substring(0, 100),
      })),
      keyword_counts: keywordCounts,
      messages_by_channel: messagesByChannel,
      channels_analyzed: selectedChannels.map((c) => c.name),
    };

    // STEP 6 — Call Groq for workflow insights
    let insightsParsed: { insights: any[] } = { insights: [] };

    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 800,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: `You are a team workflow analyst for a startup.
Analyze this Slack activity data and surface 3 to 5 genuine workflow insights.
Only flag real patterns with actual numbers — not noise.
Focus on: communication bottlenecks, keyword spikes, unanswered questions,
workload imbalance, or team health signals.

Return ONLY valid JSON:
{
  "insights": [
    {
      "insight_text": "specific observation with real numbers from the data",
      "category": "bottleneck or communication or workload or health or opportunity",
      "severity": "high or medium or low"
    }
  ]
}`,
          },
          {
            role: "user",
            content: `Slack metrics from last 7 days:\n${JSON.stringify(metrics, null, 2)}`,
          },
        ],
      });

      const insightText =
        completion.choices[0]?.message?.content || "{}";

      try {
        const cleaned = insightText.replace(/```json|```/g, "").trim();
        insightsParsed = JSON.parse(cleaned);
      } catch (e) {
        console.error("Failed to parse Groq insights:", e);
      }
    } catch (e) {
      console.error("Groq insights call failed:", e);
    }

    // STEP 7 — Save insights to Supabase
    if (Array.isArray(insightsParsed.insights) && insightsParsed.insights.length > 0) {
      try {
        await supabase.from("slack_insights").insert(
          insightsParsed.insights.map((i: any) => ({
            user_id: userId,
            insight_text: i.insight_text,
            category: i.category,
            severity: i.severity,
            raw_data: metrics,
            generated_at: new Date().toISOString(),
          }))
        );
      } catch (e) {
        console.error("Failed to save slack insights:", e);
      }

      // Push high severity insights to proactive alerts
      for (const insight of insightsParsed.insights) {
        if (insight.severity !== "high") continue;
        try {
          await supabase.from("proactive_alerts").insert({
            user_id: userId,
            message: insight.insight_text,
            urgency: "high",
            category: "workflow",
            suggested_action:
              "Review your Slack channels for this pattern",
            status: "unread",
          });
        } catch (e) {
          console.error("Failed to insert proactive alert from Slack:", e);
        }
      }
    }

    // STEP 8 — Update last_synced_at in integrations table
    try {
      await supabase
        .from("integrations")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("provider", "slack");
    } catch (e) {
      console.error("Failed to update last_synced_at:", e);
    }

    // STEP 9 — Return
    return NextResponse.json({
      messages_synced: allMessages.length,
      insights_generated: insightsParsed.insights?.length || 0,
      unanswered_threads: unansweredThreads.length,
      channels_scanned: selectedChannels.length,
    });
  } catch (error: any) {
    console.error("Slack sync error:", error.message);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
