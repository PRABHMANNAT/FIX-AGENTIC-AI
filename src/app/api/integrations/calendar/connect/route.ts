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
      "/api/integrations/calendar/callback";

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar.readonly",
      access_type: "offline",
      prompt: "consent",
      state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("Calendar connect error:", error);
    return NextResponse.redirect(
      new URL("/dashboard/finance?error=calendar_connect_failed", request.url)
    );
  }
}
