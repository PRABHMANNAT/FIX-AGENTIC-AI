import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest): Promise<NextResponse | Response> {
  try {
const { searchParams } = new URL(req.url);
const code = searchParams.get("code");
const state = searchParams.get("state");
const error = searchParams.get("error");
const error_description = searchParams.get("error_description");
const targetUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
if (error) {
    console.error("Stripe OAuth Error:", error, error_description);
    return NextResponse.redirect(`${targetUrl}/finance?error=stripe_connect_failed`);
  }
if (!code || !state) {
    return NextResponse.redirect(`${targetUrl}/finance?error=invalid_stripe_callback`);
  }
const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
    return NextResponse.redirect(`${targetUrl}/finance?error=stripe_config_missing`);
  }
try {
    // 1. Exchange authorization code for access token
    const tokenRes = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_secret: secretKey,
        code,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error("Stripe Token Exchange Failed:", tokenData);
      return NextResponse.redirect(`${targetUrl}/finance?error=stripe_token_exchange_failed`);
    }

    const { access_token, stripe_user_id } = tokenData;

    // 2. Save token to finance_settings
    const supabase = createAdminClient();
    if (!supabase) {
      throw new Error("Supabase client not configured");
    }

    const { error: dbError } = await supabase
      .from("finance_settings")
      .update({
        stripe_access_token: access_token,
        stripe_user_id: stripe_user_id,
        stripe_connected: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", state);

    if (dbError) {
      // If no row existed, we should probably insert it, but assuming it exists
      const { error: insertError } = await supabase.from("finance_settings").insert({
        user_id: state,
        stripe_access_token: access_token,
        stripe_user_id: stripe_user_id,
        stripe_connected: true,
      });
      if (insertError) {
        console.error("DB Save Error:", insertError);
        return NextResponse.redirect(`${targetUrl}/finance?error=db_save_failed`);
      }
    }

    // 3. Trigger initial sync internally
    // We do a fire-and-forget call to the sync endpoint.
    // Need to pass the user ID so it knows who to sync.
    fetch(`${targetUrl}/api/finance/stripe/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: state }),
    }).catch(console.error);

    // 4. Redirect to dashboard
    return NextResponse.redirect(`${targetUrl}/finance?stripe=connected`);
  } catch (err) {
    console.error("Stripe Callback Exception:", err);
    return NextResponse.redirect(`${targetUrl}/finance?error=stripe_callback_exception`);
  }
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
