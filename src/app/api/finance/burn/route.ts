import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, getAuthenticatedUserContext } from "@/lib/supabase";
import type { ExpenseCategory, BurnData } from "@/types/finance";

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
const { data: cache } = await supabase
    .from("finance_data_cache")
    .select("cash_balance, burn_rate, runway_months, monthly_expenses, monthly_revenue, last_synced_at")
    .eq("user_id", auth.userId)
    .single();
if (!cache || cache.cash_balance === null || cache.burn_rate === null) {
    return NextResponse.json({ burn_data: null });
  }
let alert_level: BurnData["alert_level"] = "healthy";
if (cache.runway_months < 3) alert_level = "critical";
  else if (cache.runway_months < 6) alert_level = "warning";
return NextResponse.json({
    burn_data: {
      cash_balance: cache.cash_balance,
      burn_rate: cache.burn_rate,
      runway_months: cache.runway_months,
      monthly_expenses: cache.monthly_expenses || [],
      monthly_revenue: cache.monthly_revenue || 0,
      alert_level,
      last_synced_at: cache.last_synced_at,
    },
  });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  try {
const auth = await getAuthenticatedUserContext();
if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
const body = (await req.json()) as {
    userId: string;
    cash_balance: number;
    monthly_revenue: number;
    monthly_expenses: ExpenseCategory[];
  };
const { cash_balance, monthly_revenue, monthly_expenses } = body;
if (typeof cash_balance !== "number" || typeof monthly_revenue !== "number" || !Array.isArray(monthly_expenses)) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
const gross_burn = monthly_expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
const net_burn = gross_burn - monthly_revenue;
let runway_months = 999;
if (net_burn > 0) {
    runway_months = Math.round((cash_balance / net_burn) * 10) / 10;
  }
const now = new Date();
let runway_date = "Runway effectively infinite";
if (runway_months < 999) {
    const futureDate = new Date(now.getFullYear(), now.getMonth() + Math.floor(runway_months), now.getDate());
    runway_date = futureDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
let alert_level: BurnData["alert_level"] = "healthy";
if (runway_months < 3) alert_level = "critical";
  else if (runway_months < 6) alert_level = "warning";
const supabase = createAdminClient();
if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
const cacheData = {
    user_id: auth.userId,
    cash_balance,
    monthly_revenue,
    monthly_expenses,
    burn_rate: net_burn,
    runway_months,
    updated_at: new Date().toISOString(),
  };
const { error: upsertErr } = await supabase
    .from("finance_data_cache")
    .upsert(cacheData, { onConflict: "user_id" });
if (upsertErr) {
    console.error("Burn Upsert Error:", upsertErr);
    return NextResponse.json({ error: "Failed to update burn data." }, { status: 500 });
  }
const burn_data: BurnData = {
    cash_balance,
    monthly_revenue,
    monthly_expenses,
    gross_burn,
    net_burn,
    runway_months,
    runway_date,
    alert_level,
  };
return NextResponse.json({ success: true, burn_data });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
