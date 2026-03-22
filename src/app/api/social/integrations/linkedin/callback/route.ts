import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/social?error=missing_params", req.url));
  }

  try {
    const userId = Buffer.from(state, 'base64').toString('utf8');
    const clientId = process.env.LINKEDIN_CLIENT_ID!;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/social/integrations/linkedin/callback`;

    // 2. Exchange code
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("LinkedIn Token Error", err);
      return NextResponse.redirect(new URL("/social?error=token_exchange_failed", req.url));
    }

    const { access_token } = await tokenRes.json();

    // 3. Fetch LinkedIn profile
    let personUrn = "";
    try {
      const meRes = await fetch("https://api.linkedin.com/v2/me", {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      if (meRes.ok) {
         const meData = await meRes.json();
         personUrn = `urn:li:person:${meData.id}`;
      }
    } catch(e) {
      console.error("Failed to fetch LinkedIn profile", e);
    }

    // 4. Save to social_settings
    const supabase = createAdminClient();
    if (!supabase) throw new Error("Database not configured");

    const settingsUpdate = {
      linkedin_connected: true,
      linkedin_access_token: access_token,
      ...(personUrn ? { linkedin_person_urn: personUrn } : {})
    };

    await supabase
      .from("social_settings")
      .upsert({ user_id: userId, ...settingsUpdate }, { onConflict: 'user_id' });

    // 5. Redirect
    return NextResponse.redirect(new URL("/social?linkedin=connected", req.url));
  } catch (error: any) {
    console.error("LinkedIn Callback Error", error);
    return NextResponse.redirect(new URL("/social?error=server_error", req.url));
  }
}
