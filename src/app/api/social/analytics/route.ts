import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import { generateWithFallback, MODELS } from "@/lib/finance-ai";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const uId = auth.userId;

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString();

    const { data: analytics } = await supabase
      .from("social_analytics")
      .select("*")
      .eq("user_id", uId)
      .gte("created_at", dateStr);

    let total_impressions = 0, total_likes = 0, total_comments = 0, total_shares = 0, follower_growth_total = 0;
    let platformStats: Record<string, { impressions: number, eng: number }> = {};

    if (analytics) {
      analytics.forEach(row => {
        total_impressions += row.impressions || 0;
        total_likes += row.likes || 0;
        total_comments += row.comments || 0;
        total_shares += row.shares || 0;
        follower_growth_total += row.followers_gained || 0;
        
        const plat = row.platform;
        if (!platformStats[plat]) platformStats[plat] = { impressions: 0, eng: 0 };
        platformStats[plat].impressions += row.impressions || 0;
        platformStats[plat].eng += (row.likes || 0) + (row.comments || 0) + (row.shares || 0);
      });
    }

    const { count: posts_published } = await supabase
      .from("social_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", uId)
      .eq("status", "published");

    const total_engagement = total_likes + total_comments + total_shares;
    const avg_engagement_rate = total_impressions > 0 ? (total_engagement / total_impressions) * 100 : 0;

    let best_performing_platform = "None";
    let maxRate = -1;
    for (const [p, stats] of Object.entries(platformStats)) {
      if (stats.impressions > 0) {
        const rate = (stats.eng / stats.impressions) * 100;
        if (rate > maxRate) {
          maxRate = rate;
          best_performing_platform = p;
        }
      }
    }

    const metrics = {
      total_impressions,
      total_likes,
      total_shares,
      avg_engagement_rate,
      best_performing_platform,
      follower_growth_total,
      posts_published: posts_published || 0
    };

    if (total_impressions === 0 && (posts_published || 0) === 0) {
      return NextResponse.json({ metrics: null, brief: null });
    }

    const systemPrompt = `You are a social media analyst. Given these metrics, write a 3-point weekly social brief for a startup founder. Be specific with numbers. Identify the top win, the top opportunity, and the one thing to change this week.
Return ONLY JSON:
{
  "top_win": "string",
  "top_opportunity": "string",
  "change_this_week": "string",
  "one_line_summary": "string"
}`;

    const userMessage = JSON.stringify(metrics);

    const responseText = await generateWithFallback({
      model: MODELS.HAIKU,
      system: systemPrompt,
      prompt: userMessage
    });

    let brief = null;
    try {
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      brief = JSON.parse(cleaned);
    } catch (e) {
      console.error("Parse error parsing brief", e, responseText);
    }

    return NextResponse.json({ metrics, brief });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    
    const { userId, platform, impressions, likes, comments, shares, followers_gained } = await req.json();
    const uId = userId || auth.userId;

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

    const { error } = await supabase.from("social_analytics").insert([{
      user_id: uId,
      platform,
      impressions,
      likes,
      comments,
      shares,
      followers_gained
    }]);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch(error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
