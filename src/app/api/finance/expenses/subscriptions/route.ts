import { NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import type { SubscriptionSummary, ExpenseCategoryName } from "@/types/finance";

export async function GET(): Promise<NextResponse | Response> {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    // Fetch all recurring expenses
    const { data: rows, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", auth.userId)
      .eq("is_recurring", true)
      .order("amount", { ascending: false });

    if (error) {
      console.error("Subscriptions fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        subscriptions: [],
        total_monthly: 0,
        total_yearly: 0,
        potential_annual_savings: 0,
        unused_count: 0,
      });
    }

    // Group by tool_name or description
    const groupMap = new Map<string, { category: ExpenseCategoryName; amounts: number[]; dates: string[]; last_seen: string }>();
    const fortyFiveDaysAgo = Date.now() - 45 * 24 * 60 * 60 * 1000;

    for (const row of rows) {
      const key = row.tool_name || row.description;
      const existing = groupMap.get(key);
      if (existing) {
        existing.amounts.push(row.amount);
        existing.dates.push(row.date);
        if (new Date(row.last_seen_at) > new Date(existing.last_seen)) {
          existing.last_seen = row.last_seen_at;
        }
      } else {
        groupMap.set(key, {
          category: row.category as ExpenseCategoryName,
          amounts: [row.amount],
          dates: [row.date],
          last_seen: row.last_seen_at,
        });
      }
    }

    const subscriptions: SubscriptionSummary[] = Array.from(groupMap.entries()).map(([tool_name, data]) => {
      const monthly_cost = Math.max(...data.amounts);
      const lastDate = data.dates.sort().pop() || "";
      const potentially_unused = new Date(data.last_seen).getTime() < fortyFiveDaysAgo;

      return {
        tool_name,
        category: data.category,
        monthly_cost,
        yearly_cost: monthly_cost * 12,
        last_charged: lastDate,
        potentially_unused,
      };
    });

    const total_monthly = subscriptions.reduce((s, sub) => s + sub.monthly_cost, 0);
    const total_yearly = subscriptions.reduce((s, sub) => s + sub.yearly_cost, 0);
    const unusedSubs = subscriptions.filter((s) => s.potentially_unused);
    const potential_annual_savings = unusedSubs.reduce((s, sub) => s + sub.yearly_cost, 0);

    return NextResponse.json({
      subscriptions,
      total_monthly,
      total_yearly,
      potential_annual_savings,
      unused_count: unusedSubs.length,
    });
  } catch (error) {
    console.error("Subscriptions error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
