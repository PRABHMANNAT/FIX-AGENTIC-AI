import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import { TwitterApi } from "twitter-api-v2";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const userId = auth.userId;

    if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET) {
      return NextResponse.json({ error: "Twitter API Keys missing" }, { status: 500 });
    }

    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
    });

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/social/integrations/twitter/callback`;
    const { url, oauth_token, oauth_token_secret } = await client.generateAuthLink(redirectUri);

    const supabase = createAdminClient();
    if (supabase) {
      await supabase
        .from("social_settings")
        .upsert({ 
          user_id: userId, 
          twitter_temp_oauth_token: oauth_token,
          twitter_temp_oauth_secret: oauth_token_secret
        }, { onConflict: 'user_id' });
    }

    return NextResponse.redirect(url);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
