import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.redirect(
        new URL("/dashboard/finance?error=missing_user", request.url)
      );
    }

    const state = Buffer.from(userId).toString("base64");
    const redirectUri =
      (process.env.NEXT_PUBLIC_APP_URL || "") +
      "/api/integrations/github/callback";

    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID || "",
      redirect_uri: redirectUri,
      scope: "repo read:user",
      state,
    });

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("GitHub connect error:", error);
    return NextResponse.redirect(
      new URL("/dashboard/finance?error=github_connect_failed", request.url)
    );
  }
}
