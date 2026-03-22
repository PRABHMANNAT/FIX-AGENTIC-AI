import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const oauthError = request.nextUrl.searchParams.get("error");

    if (oauthError || !code) {
      return NextResponse.redirect(
        new URL("/dashboard/finance?error=github_auth_failed", request.url)
      );
    }

    // Decode userId from base64 state
    let userId = "";
    try {
      userId = Buffer.from(state || "", "base64").toString("utf-8");
    } catch {
      return NextResponse.redirect(
        new URL("/dashboard/finance?error=github_auth_failed", request.url)
      );
    }

    const redirectUri =
      (process.env.NEXT_PUBLIC_APP_URL || "") +
      "/api/integrations/github/callback";

    // Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID || "",
        client_secret: process.env.GITHUB_CLIENT_SECRET || "",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("GitHub token exchange failed:", tokenData.error);
      return NextResponse.redirect(
        new URL("/dashboard/finance?error=github_token_failed", request.url)
      );
    }

    const accessToken = tokenData.access_token;

    // Fetch GitHub user profile
    let profile: any = {};
    try {
      const profileRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      profile = await profileRes.json();
    } catch (e) {
      console.error("Failed to fetch GitHub profile:", e);
    }

    // Fetch user's repos
    let repos: any[] = [];
    try {
      const reposRes = await fetch(
        "https://api.github.com/user/repos?per_page=100&sort=updated",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );
      repos = await reposRes.json();
      if (!Array.isArray(repos)) repos = [];
    } catch (e) {
      console.error("Failed to fetch GitHub repos:", e);
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.redirect(
        new URL("/dashboard/finance?error=github_callback_failed", request.url)
      );
    }

    // Upsert integration
    const { error: upsertError } = await supabase
      .from("integrations")
      .upsert(
        {
          user_id: userId,
          provider: "github",
          access_token: accessToken,
          connected_at: new Date().toISOString(),
          metadata: {
            github_username: profile.login || "",
            github_name: profile.name || "",
            public_repos: profile.public_repos || 0,
            repo_names: repos.slice(0, 20).map((r: any) => r.full_name),
          },
        },
        { onConflict: "user_id,provider" }
      );

    if (upsertError) {
      console.error("Failed to save GitHub integration:", upsertError);
      return NextResponse.redirect(
        new URL("/dashboard/finance?error=github_callback_failed", request.url)
      );
    }

    // Fire and forget initial sync
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    fetch(`${appUrl}/api/integrations/github/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    }).catch((e) => console.error("Initial GitHub sync failed:", e));

    return NextResponse.redirect(
      new URL("/dashboard/finance?github=connected", request.url)
    );
  } catch (error: any) {
    console.error("GitHub callback error:", error);
    return NextResponse.redirect(
      new URL("/dashboard/finance?error=github_callback_failed", request.url)
    );
  }
}
