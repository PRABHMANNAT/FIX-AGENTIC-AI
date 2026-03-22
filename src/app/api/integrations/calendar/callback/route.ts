import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const oauthError = request.nextUrl.searchParams.get("error");

    if (oauthError || !code) {
      return NextResponse.redirect(
        new URL("/dashboard/finance?error=calendar_auth_failed", request.url)
      );
    }

    // Decode userId from base64 state
    let userId = "";
    try {
      userId = Buffer.from(state || "", "base64").toString("utf-8");
    } catch {
      return NextResponse.redirect(
        new URL("/dashboard/finance?error=calendar_auth_failed", request.url)
      );
    }

    const redirectUri =
      (process.env.NEXT_PUBLIC_APP_URL || "") +
      "/api/integrations/calendar/callback";

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();

    if (tokens.error) {
      console.error("Google token exchange failed:", tokens.error);
      return NextResponse.redirect(
        new URL("/dashboard/finance?error=calendar_token_failed", request.url)
      );
    }

    // Fetch Google user profile
    let profile: { email?: string } = {};
    try {
      const profileRes = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      );
      profile = await profileRes.json();
    } catch (e) {
      console.error("Failed to fetch Google profile:", e);
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.redirect(
        new URL("/dashboard/finance?error=calendar_callback_failed", request.url)
      );
    }

    // Upsert integration record
    const { error: upsertError } = await supabase
      .from("integrations")
      .upsert(
        {
          user_id: userId,
          provider: "google_calendar",
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          connected_at: new Date().toISOString(),
          metadata: {
            google_email: profile.email || "",
            token_expiry: tokens.expires_in
              ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
              : null,
          },
        },
        { onConflict: "user_id,provider" }
      );

    if (upsertError) {
      console.error("Failed to save calendar integration:", upsertError);
      return NextResponse.redirect(
        new URL("/dashboard/finance?error=calendar_callback_failed", request.url)
      );
    }

    // Fire and forget initial sync
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    fetch(`${appUrl}/api/integrations/calendar/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    }).catch((e) => console.error("Initial calendar sync failed:", e));

    return NextResponse.redirect(
      new URL("/dashboard/finance?calendar=connected", request.url)
    );
  } catch (error: any) {
    console.error("Calendar callback error:", error);
    return NextResponse.redirect(
      new URL("/dashboard/finance?error=calendar_callback_failed", request.url)
    );
  }
}
