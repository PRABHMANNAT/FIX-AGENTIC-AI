import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");

    if (!code) {
      return NextResponse.redirect(
        new URL("/dashboard/finance?error=slack_auth_failed", request.url)
      );
    }

    // Decode the userId from base64 state
    let userId = "";
    try {
      userId = Buffer.from(state || "", "base64").toString("utf-8");
    } catch {
      return NextResponse.redirect(
        new URL("/dashboard/finance?error=slack_auth_failed", request.url)
      );
    }

    const redirectUri =
      (process.env.NEXT_PUBLIC_APP_URL || "") +
      "/api/integrations/slack/callback";

    // Exchange code for access token (Slack requires form encoding)
    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID || "",
        client_secret: process.env.SLACK_CLIENT_SECRET || "",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(
        new URL("/dashboard/finance?error=slack_token_failed", request.url)
      );
    }

    const tokenData = await tokenRes.json();

    if (!tokenData.ok) {
      console.error("Slack token exchange failed:", tokenData.error);
      return NextResponse.redirect(
        new URL("/dashboard/finance?error=slack_token_failed", request.url)
      );
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.redirect(
        new URL("/dashboard/finance?error=slack_callback_failed", request.url)
      );
    }

    // Upsert integration record
    const { error: upsertError } = await supabase
      .from("integrations")
      .upsert(
        {
          user_id: userId,
          provider: "slack",
          access_token: tokenData.access_token,
          connected_at: new Date().toISOString(),
          last_synced_at: null,
          metadata: {
            team_name: tokenData.team?.name || "Unknown workspace",
            team_id: tokenData.team?.id || "",
            bot_user_id: tokenData.bot_user_id || "",
          },
        },
        { onConflict: "user_id,provider" }
      );

    if (upsertError) {
      console.error("Failed to save Slack integration:", upsertError);
      return NextResponse.redirect(
        new URL("/dashboard/finance?error=slack_callback_failed", request.url)
      );
    }

    // Trigger initial sync in background (fire and forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    fetch(`${appUrl}/api/integrations/slack/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    }).catch((e) => console.error("Initial Slack sync failed:", e));

    return NextResponse.redirect(
      new URL("/dashboard/finance?slack=connected", request.url)
    );
  } catch (error: any) {
    console.error("Slack callback error:", error);
    return NextResponse.redirect(
      new URL("/dashboard/finance?error=slack_callback_failed", request.url)
    );
  }
}
