import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest): Promise<NextResponse | Response> {
  try {
const { searchParams } = new URL(req.url);
const userId = searchParams.get("userId");
if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }
const clientId = process.env.STRIPE_CLIENT_ID;
const targetUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
if (!clientId) {
    return NextResponse.json(
      { error: "Stripe configuration missing trên server." },
      { status: 500 },
    );
  }
const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "read_only",
    state: userId,
    redirect_uri: `${targetUrl}/api/finance/stripe/callback`,
  });
const stripeAuthUrl = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
return NextResponse.redirect(stripeAuthUrl);
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
