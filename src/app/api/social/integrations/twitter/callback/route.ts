import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { TwitterApi } from "twitter-api-v2";

export async function GET(req: NextRequest) {
  const oauth_token = req.nextUrl.searchParams.get("oauth_token");
  const oauth_verifier = req.nextUrl.searchParams.get("oauth_verifier");

  if (!oauth_token || !oauth_verifier) {
    return NextResponse.redirect(new URL("/social?error=missing_params", req.url));
  }

  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error("Database not configured");

    const { data: settings } = await supabase
      .from("social_settings")
      .select("user_id, twitter_temp_oauth_token, twitter_temp_oauth_secret")
      .eq("twitter_temp_oauth_token", oauth_token)
      .single();

    if (!settings) {
      return NextResponse.redirect(new URL("/social?error=invalid_token", req.url));
    }

    const userId = settings.user_id;

    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: oauth_token,
      accessSecret: settings.twitter_temp_oauth_secret,
    });

    const { client: loggedClient, accessToken, accessSecret } = await client.login(oauth_verifier);
    
    // 4. Fetch user profile
    await loggedClient.v2.me();

    // 5. Save to social_settings
    await supabase
      .from("social_settings")
      .update({
        twitter_connected: true,
        twitter_access_token: accessToken,
        twitter_access_secret: accessSecret,
        twitter_temp_oauth_token: null,
        twitter_temp_oauth_secret: null
      })
      .eq("user_id", userId);

    // 6. Redirect
    return NextResponse.redirect(new URL("/social?twitter=connected", req.url));
  } catch (error: any) {
    console.error("Twitter Callback Error", error);
    return NextResponse.redirect(new URL("/social?error=server_error", req.url));
  }
}
