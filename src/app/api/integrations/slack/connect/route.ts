import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.redirect(
        new URL("/dashboard/finance?error=missing_user", request.url)
      );
    }

    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri =
      (process.env.NEXT_PUBLIC_APP_URL || "") +
      "/api/integrations/slack/callback";

    // Encode userId as base64 so it survives the redirect
    const state = Buffer.from(userId).toString("base64");

    const params = new URLSearchParams({
      client_id: clientId || "",
      scope: "channels:history,channels:read,users:read",
      redirect_uri: redirectUri,
      state,
    });

    const authUrl = `https://slack.com/oauth/v2/authorize?${params.toString()}`;

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("Slack connect error:", error);
    return NextResponse.redirect(
      new URL("/dashboard/finance?error=slack_connect_failed", request.url)
    );
  }
}
