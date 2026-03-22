import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import { generateWithFallback, MODELS } from "@/lib/finance-ai";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    
    const body = await req.json();
    const userId = body.userId || auth.userId;

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    // 1. Fetch social analytics for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: analytics } = await supabase
      .from("social_analytics")
      .select("*")
      .eq("user_id", userId)
      .gte("recorded_at", sevenDaysAgo.toISOString());

    // 2. Fetch social_posts published this week
    const { data: recentPosts } = await supabase
      .from("social_posts")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "published")
      .gte("published_at", sevenDaysAgo.toISOString());

    // 3. Fetch finance_data_cache for business context
    const { data: financeData } = await supabase
      .from("finance_data_cache")
      .select("*")
      .eq("user_id", userId)
      .single();

    // 4. Call Groq
    let dataContext = `Analytics (7d): ${JSON.stringify(analytics || [])}\n`;
    dataContext += `Recent posts: ${JSON.stringify(recentPosts || [])}\n`;
    dataContext += `Finance Context: ${JSON.stringify(financeData || {})}\n`;

    const systemPrompt = `You are a social media strategist writing a Monday brief for a startup founder. Be direct and specific.
Return valid JSON only without any markdown formatting or backticks:
{
  "week_summary": "string",
  "top_performing_post": "string",
  "follower_growth": 0,
  "best_time_to_post": "string",
  "this_week_focus": "string",
  "suggested_post_1": { "platform": "string", "hook": "string", "why": "string" },
  "suggested_post_2": { "platform": "string", "hook": "string", "why": "string" },
  "suggested_post_3": { "platform": "string", "hook": "string", "why": "string" }
}`;

    const resultText = await generateWithFallback({
      model: MODELS.SONNET,
      system: systemPrompt,
      prompt: dataContext,
      maxTokens: 2000
    });

    try {
      const cleanJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      return NextResponse.json(JSON.parse(cleanJson));
    } catch (parseErr) {
      console.error("Failed to parse brief JSON", resultText);
      return NextResponse.json({ error: "Invalid JSON response from model" }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
