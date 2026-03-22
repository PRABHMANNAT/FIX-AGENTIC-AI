import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import Groq from "groq-sdk";

async function fetchAndAnalyzeDecisions(userId: string): Promise<NextResponse> {
  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

  // STEP 1 — Gather potential decisions from all sources
  const pendingDecisions: any[] = [];

  // a) Slack unanswered questions
  try {
    const { data: slackMessages } = await supabase
      .from("slack_messages")
      .select("*")
      .eq("user_id", userId)
      .eq("thread_replied", false)
      .like("message_text", "%?%")
      .lt("created_at", twelveHoursAgo)
      .order("created_at", { ascending: true })
      .limit(20);

    for (const msg of slackMessages || []) {
      pendingDecisions.push({
        source: "Slack",
        source_id: msg.message_ts || msg.id,
        summary: (msg.message_text || "").substring(0, 200),
        channel: msg.channel_name || "",
        days_open: Math.round(
          (Date.now() - new Date(msg.created_at).getTime()) /
            (1000 * 60 * 60 * 24)
        ),
        people_waiting: 1,
      });
    }
  } catch (e) {
    console.error("Failed to fetch Slack decisions:", e);
  }

  // b) Stale PRs from GitHub
  try {
    const { data: stalePRs } = await supabase
      .from("github_activity")
      .select("*")
      .eq("user_id", userId)
      .eq("event_type", "pr_open")
      .gt("pr_open_hours", 48);

    for (const activity of stalePRs || []) {
      pendingDecisions.push({
        source: "GitHub",
        source_id: String(activity.id || ""),
        summary: `PR needs review: ${activity.pr_title || "Untitled PR"}`,
        channel: activity.repo_name || "",
        days_open: Math.round((activity.pr_open_hours || 0) / 24),
        people_waiting: 2,
      });
    }
  } catch (e) {
    console.error("Failed to fetch GitHub stale PRs:", e);
  }

  // Short circuit if nothing found
  if (pendingDecisions.length === 0) {
    return NextResponse.json({
      decisions: [],
      total: 0,
      generated_at: new Date().toISOString(),
    });
  }

  // STEP 2 — Call Groq to classify and prioritize
  let parsed: { decisions: any[] } = { decisions: pendingDecisions };

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 800,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `You are a decision triage assistant. Given a list of
potentially unresolved items, identify which ones represent genuine
decisions that need a founder's attention. Rank by: days open,
number of people blocked, business impact.

Return ONLY valid JSON:
{
  "decisions": [
    {
      "source": "Slack or GitHub",
      "source_id": "original id",
      "summary": "clear one sentence description of the decision needed",
      "days_open": number,
      "people_waiting": number,
      "impact": "high or medium or low",
      "draft_recommendation": "one sentence recommended action"
    }
  ]
}`,
        },
        {
          role: "user",
          content: `Pending items to triage:\n${JSON.stringify(pendingDecisions, null, 2)}`,
        },
      ],
    });

    const responseText = completion.choices[0]?.message?.content || "{}";
    try {
      const cleaned = responseText.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse Groq decisions response:", e);
    }
  } catch (e) {
    console.error("Groq decisions call failed:", e);
  }

  // STEP 3 — Return
  return NextResponse.json({
    decisions: parsed.decisions || [],
    total: parsed.decisions?.length || 0,
    generated_at: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { userId } = body as { userId: string };

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    return await fetchAndAnalyzeDecisions(userId);
  } catch (error: any) {
    console.error("POST decisions error:", error.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    return await fetchAndAnalyzeDecisions(auth.userId);
  } catch (error: any) {
    console.error("GET decisions error:", error.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
