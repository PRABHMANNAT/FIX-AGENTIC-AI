import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, getAuthenticatedUserContext } from "@/lib/supabase";
import Stripe from "stripe";

export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  try {
const supabase = createAdminClient();
if (!supabase) return NextResponse.json({ error: "Missing DB config" }, { status: 503 });
let userIdToSync: string | null = null;
try {
    const body = await req.json();
    if (body.userId) userIdToSync = body.userId;
  } catch {
    // ignore
  }
if (!userIdToSync) {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    userIdToSync = auth.userId;
  }
const { data: settings } = await supabase
    .from("finance_settings")
    .select("stripe_access_token, stripe_connected")
    .eq("user_id", userIdToSync)
    .single();
if (!settings || !settings.stripe_connected || !settings.stripe_access_token) {
    return NextResponse.json({ error: "Stripe not connected" }, { status: 400 });
  }
const stripe = new Stripe(settings.stripe_access_token);
try {
    // 3. Fetch all active and past_due subscriptions (for MRR)
    let hasMore = true;
    let startingAfter: string | undefined = undefined;
    const allSubs: Stripe.Subscription[] = [];

    while (hasMore) {
      const page = (await stripe.subscriptions.list({
        status: "all",
        limit: 100,
        starting_after: startingAfter,
        expand: ["data.default_payment_method"],
      })) as any;

      allSubs.push(...page.data);
      hasMore = page.has_more;
      if (page.data.length > 0) startingAfter = page.data[page.data.length - 1].id;
    }

    // 4. Calculate core metrics
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let mrr = 0;
    let new_mrr = 0;
    let churned_mrr = 0;
    let expansion_mrr = 0; // Simplified
    let contraction_mrr = 0; // Simplified
    let activeSubs30DaysAgoCount = 0;
    let cancelledInLast30DaysCount = 0;

    const mrrHistoryMap = new Map<string, number>();

    // Helper to add to MRR history
    const addToHistory = (date: Date, amount: number) => {
      const key = `${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`;
      mrrHistoryMap.set(key, (mrrHistoryMap.get(key) || 0) + amount);
    };

    allSubs.forEach((sub) => {
      // Calculate monthly value of this subscription
      let subMonthlyValue = 0;
      sub.items.data.forEach((item) => {
        if (item.price.unit_amount) {
          const amt = (item.price.unit_amount * (item.quantity ?? 1)) / 100; // to rupees/dollars
          if (item.price.recurring?.interval === "year") subMonthlyValue += amt / 12;
          else if (item.price.recurring?.interval === "month") subMonthlyValue += amt;
          else if (item.price.recurring?.interval === "week") subMonthlyValue += amt * 4.33;
          else if (item.price.recurring?.interval === "day") subMonthlyValue += amt * 30;
        }
      });

      const createdDate = new Date(sub.created * 1000);
      const isNewLast30Days = createdDate >= thirtyDaysAgo;
      const isCancelled = sub.status === "canceled";
      const cancelledDate = sub.canceled_at ? new Date(sub.canceled_at * 1000) : null;
      const cancelledLast30Days = isCancelled && cancelledDate && cancelledDate >= thirtyDaysAgo;

      const isActiveNow = sub.status === "active" || sub.status === "past_due";
      const wasActive30DaysAgo = createdDate < thirtyDaysAgo && (!cancelledDate || cancelledDate >= thirtyDaysAgo);

      if (isActiveNow) mrr += subMonthlyValue;
      if (isNewLast30Days && isActiveNow) new_mrr += subMonthlyValue;
      if (cancelledLast30Days) churned_mrr += subMonthlyValue;

      if (wasActive30DaysAgo) activeSubs30DaysAgoCount++;
      if (cancelledLast30Days) cancelledInLast30DaysCount++;

      // We don't have historical upgrade/downgrade data from just this endpoint easily,
      // so expansion/contraction will be 0 for this basic sync unless we parse invoices. Keep it simple.

      // Populate history (last 12 months)
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 15); // midpoint of month
        // Was this sub active during month d?
        if (createdDate <= d && (!cancelledDate || cancelledDate > d)) {
          addToHistory(d, subMonthlyValue);
        }
      }
    });

    const arr = mrr * 12;
    const churn_rate = activeSubs30DaysAgoCount > 0 ? Number(((cancelledInLast30DaysCount / activeSubs30DaysAgoCount) * 100).toFixed(2)) : 0;
    const net_new_mrr = new_mrr + expansion_mrr - contraction_mrr - churned_mrr;

    // Format history array
    const mrr_history: Array<{ month: string; mrr: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 15);
      const key = `${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
      mrr_history.push({ month: key, mrr: Math.round(mrrHistoryMap.get(key) || 0) });
    }

    // 5. Save to finance_data_cache
    const cacheData = {
      user_id: userIdToSync,
      mrr,
      arr,
      churn_rate,
      new_mrr,
      expansion_mrr,
      contraction_mrr,
      churned_mrr,
      net_new_mrr,
      mrr_history,
      last_synced_at: now.toISOString(),
      // We keep runway_months, burn_rate, cash_balance untouched if they exist, or set defaults.
      // But we can just use upsert to update only the fields we calculated.
    };

    const { error: upsertErr } = await supabase
      .from("finance_data_cache")
      .upsert(cacheData, { onConflict: "user_id" });

    if (upsertErr) {
      console.error("Cache Upsert Error:", upsertErr);
      return NextResponse.json({ error: "Failed to save cache data." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      mrr,
      arr,
      churn_rate,
      net_new_mrr,
      last_synced_at: now.toISOString(),
    });
  } catch (err) {
    console.error("Stripe Sync Error:", err);
    return NextResponse.json({ error: "Failed to sync with Stripe" }, { status: 500 });
  }
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
