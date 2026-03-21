import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest): Promise<NextResponse | Response> {
  try {
const auth = await getAuthenticatedUserContext();
if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
const supabase = createAdminClient();
if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
const { data: settings } = await supabase
    .from("finance_settings")
    .select("stripe_connected")
    .eq("user_id", auth.userId)
    .single();
if (!settings || !settings.stripe_connected) {
    return NextResponse.json({ connected: false });
  }
const { data: cache } = await supabase
    .from("finance_data_cache")
    .select("*")
    .eq("user_id", auth.userId)
    .single();
if (!cache) {
    // Is connected but has no cache yet. Call sync and return a basic shell to let UI load.
    triggerBackgroundSync(req, auth.userId);
    return NextResponse.json({
      connected: true,
      data: {
        mrr: 0, arr: 0, churn_rate: 0, runway_months: 0, cash_balance: 0, burn_rate: 0,
        new_mrr: 0, expansion_mrr: 0, contraction_mrr: 0, churned_mrr: 0, net_new_mrr: 0,
        mrr_history: [], last_synced_at: new Date().toISOString()
      }
    });
  }
if (cache.last_synced_at) {
    const lastSync = new Date(cache.last_synced_at).getTime();
    const now = Date.now();
    const thirtyMins = 30 * 60 * 1000;
    if (now - lastSync > thirtyMins) {
      triggerBackgroundSync(req, auth.userId);
    }
  }
return NextResponse.json({
    connected: true,
    data: cache,
  });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

function triggerBackgroundSync(req: NextRequest, userId: string) {
  const targetUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  fetch(`${targetUrl}/api/finance/stripe/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  }).catch(console.error); // Fire and forget
}
