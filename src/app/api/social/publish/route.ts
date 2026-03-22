import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import { TwitterApi } from "twitter-api-v2";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    
    const { userId, post_id, platform, content } = await req.json();
    const uId = userId || auth.userId;

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "DB not ok" }, { status: 503 });

    // 1. Fetch social_posts row
    const { data: post, error: postErr } = await supabase
      .from("social_posts")
      .select("*")
      .eq("id", post_id)
      .eq("user_id", uId)
      .single();

    if (postErr || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // 2. Fetch social_settings
    const { data: settings } = await supabase
      .from("social_settings")
      .select("*")
      .eq("user_id", uId)
      .single();

    if (!settings) return NextResponse.json({ error: "Settings not found" }, { status: 404 });

    // 3. Get content
    const finalContent = content || post[`content_${platform}`];
    if (!finalContent) {
      return NextResponse.json({ error: "No content available to publish" }, { status: 400 });
    }

    let publishedUrn = "";

    // 4. Publish logic
    if (platform === "linkedin") {
      if (!settings.linkedin_connected || !settings.linkedin_access_token) {
        return NextResponse.json({ error: "LinkedIn not connected" }, { status: 400 });
      }

      let profileUrn = settings.linkedin_person_urn;
      if (!profileUrn) {
        const meRes = await fetch("https://api.linkedin.com/v2/me", {
          headers: { Authorization: `Bearer ${settings.linkedin_access_token}` }
        });
        if (!meRes.ok) {
           return NextResponse.json({ error: "LinkedIn profile fetch failed. Token may be expired." }, { status: 500 });
        }
        const meData = await meRes.json();
        profileUrn = `urn:li:person:${meData.id}`;
      }

      const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.linkedin_access_token}`,
          "X-Restli-Protocol-Version": "2.0.0",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          author: profileUrn,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: finalContent },
              shareMediaCategory: "NONE"
            }
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
          }
        })
      });

      if (!postRes.ok) {
        const errTxt = await postRes.text();
        console.error("LinkedIn publish failed", errTxt);
        return NextResponse.json({ error: "Failed to publish to LinkedIn: " + errTxt }, { status: 500 });
      }
    } 
    else if (platform === "twitter") {
      if (!settings.twitter_connected || !settings.twitter_access_token || !settings.twitter_access_secret) {
        return NextResponse.json({ error: "Twitter not connected" }, { status: 400 });
      }

      const client = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY!,
        appSecret: process.env.TWITTER_API_SECRET!,
        accessToken: settings.twitter_access_token,
        accessSecret: settings.twitter_access_secret,
      });

      try {
        const tweet = await client.v2.tweet(finalContent);
        publishedUrn = tweet.data.id;
      } catch (tweetErr: any) {
        console.error("Twitter publish failed", tweetErr);
        return NextResponse.json({ error: "Failed to publish to Twitter: " + tweetErr.message }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: `Publish to ${platform} not supported yet.` }, { status: 400 });
    }

    // 5. Update social_posts
    const now = new Date().toISOString();
    await supabase.from("social_posts").update({ 
      status: "published", 
      published_at: now 
    }).eq("id", post_id);

    // Update scheduled if exists
    await supabase.from("social_scheduled").update({ 
      status: "published" 
    }).eq("post_id", post_id);

    // 6. Return
    return NextResponse.json({ success: true, platform, published_at: now });
  } catch(error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
