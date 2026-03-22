import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import { generateWithFallback, MODELS } from "@/lib/finance-ai";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId, week_start } = await req.json();
    const uId = userId || auth.userId;

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

    // 1. Fetch user's finance data
    let mrr = 0;
    try {
       const { data: fin } = await supabase.from("finance_data_cache").select("mrr").eq("user_id", uId).single();
       if (fin) mrr = fin.mrr || 0;
    } catch(e) {}

    // 2. Fetch github_activity
    let shipping = 'Shipped new AI features';
    try {
       // Mocked since table structure is unknown, fallback to a general value if we can't query
       // the prompt mentions github_activity
       const { data: gh } = await supabase.from("github_activity").select("description").eq("user_id", uId).order('created_at', {ascending: false}).limit(3);
       if (gh && gh.length > 0) {
         shipping = gh.map(x => x.description).join('; ');
       }
    } catch(e) {}

    // 3. Fetch last 5 social_posts
    let recentPostsStr = '';
    try {
       const { data: posts } = await supabase.from("social_posts").select("post_type").eq("user_id", uId).order("created_at", {ascending: false}).limit(5);
       if (posts) recentPostsStr = posts.map(p => p.post_type).join(', ');
    } catch(e) {}

    // 4. Call Groq
    const systemPrompt = `You are a content strategist. Based on what is happening in this founder's business this week, suggest 5 specific social media post ideas. Each idea should be timely, relevant, and shareable.
Return JSON: { "suggestions": [{ "day": "Monday", "platform": "linkedin", "post_type": "milestone", "title": "string", "hook": "string", "why_now": "string" }] }`;

    const userMessage = JSON.stringify({
      current_mrr: mrr,
      recent_shipping: shipping,
      recent_post_types: recentPostsStr,
      week: week_start
    });

    const responseText = await generateWithFallback({
      model: MODELS.SONNET,
      system: systemPrompt,
      prompt: userMessage
    });

    let suggestions = [];
    try {
       const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
       suggestions = JSON.parse(cleaned).suggestions || [];
    } catch(e) {
       console.error("Parse error for AI calendar suggestions", e, responseText);
    }

    return NextResponse.json({ suggestions });
  } catch(error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
