import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import { generateWithFallback, MODELS } from "@/lib/finance-ai";

export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  console.log('[cashflow] called')
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { userId, months_ahead = 6, assumptions = {} } = body;

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "Missing DB" }, { status: 503 });

    let cache: Record<string, any> | null = null
    try {
      const { data } = await supabase
        .from("finance_data_cache")
        .select("mrr, burn_rate, cash_balance, mrr_history")
        .eq("user_id", auth.userId)
        .single();
      cache = data;
    } catch (e) {
      console.log('finance_data_cache not available yet')
    }

    let settings: Record<string, any> | null = null
    try {
      const { data } = await supabase
        .from("finance_settings")
        .select("company_name, currency")
        .eq("user_id", auth.userId)
        .single();
      settings = data;
    } catch (e) {
      console.log('finance_settings not available yet')
    }

    if (!cache) {
      return NextResponse.json(
        { error: "No financial data found. Please sync Stripe or enter burn figures first." },
        { status: 400 }
      );
    }

    // 2. Build assumptions
    const starting_mrr = cache.mrr || 0;
    const starting_cash = cache.cash_balance || 0;
    const base_monthly_expense = cache.burn_rate || 0; // assuming gross burn or net burn depending on how standard user uses it. Usually burn_rate is net burn but the prompt says: "base_monthly_expense = cache.burn_rate (gross burn)"
    const base_revenue_growth_rate = assumptions.revenue_growth_rate || 5; // Default 5%
    const base_expense_growth_rate = assumptions.expense_growth_rate || 2; // Default 2%
    const current_month = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

    // 3. System Prompt
    const systemPrompt = `You are a CFO financial modelling assistant. Generate 3 cash flow scenarios for a startup based on the financial data provided. Return a JSON object with exactly these keys: best, base, worst, analysis_text, key_milestones, recommendations.

Each scenario (best/base/worst) must have:
- months: array of CashFlowMonth objects for each projected month
  Each month: { month (format 'MMM YYYY'), revenue, expenses, net_cash_flow (revenue - expenses), cash_balance (previous balance + net_cash_flow) }
- break_even_month: the first month where net_cash_flow > 0, or null
- runway_end_month: the first month where cash_balance <= 0, or null

Scenario growth rates to apply monthly:
- base: use the provided base_revenue_growth_rate and base_expense_growth_rate
- best: revenue grows 20% faster than base, expenses 5% lower than base
- worst: revenue grows 20% slower than base, expenses 10% higher than base

Also include 3 months of historical data before the projections using mrr_history if provided.

analysis_text: 2-3 sentence plain English summary of the base case outlook
key_milestones: array of 3 strings describing notable events in the projection
recommendations: array of 3 actionable strings based on the projections

Return ONLY valid JSON. No explanation, no markdown, no code blocks.`;

    const userMessage = `Starting MRR: ₹${starting_mrr}
Starting cash balance: ₹${starting_cash}
Monthly expenses (burn): ₹${base_monthly_expense}
Months to project: ${months_ahead}
Base revenue growth rate per month: ${base_revenue_growth_rate}%
Base expense growth rate per month: ${base_expense_growth_rate}%
Historical MRR data: ${JSON.stringify(cache.mrr_history || [])}
Additional assumptions: ${JSON.stringify(assumptions)}`;

    // 4. API Call
    let content = "";
    try {
      content = await generateWithFallback({
        model: MODELS.SONNET,
        maxTokens: 8192,
        system: systemPrompt,
        prompt: userMessage
      });
    } catch (e) {
      return NextResponse.json({ error: "AI Generation failed" }, { status: 502 });
    }
    const cleanContent = content.replace(/```json\n|\n```|```/g, "").trim();

    try {
      // 5. Parse JSON
      const projection = JSON.parse(cleanContent);
      
      // 6. Add assumptions and generated_at
      projection.assumptions = {
        starting_mrr,
        starting_cash,
        base_revenue_growth_rate,
        base_expense_growth_rate,
      };
      projection.generated_at = new Date().toISOString();

      // 8. Save to DB
      const { data: docInfo, error: dbErr } = await supabase
        .from("finance_documents")
        .insert({
          user_id: auth.userId,
          type: "cash_flow",
          title: `Cash Flow Projection - ${current_month}`,
          content_json: projection,
          status: "final",
        })
        .select("id")
        .single();

      if (dbErr) {
        console.error("DB Insert Error:", dbErr);
        return NextResponse.json({ error: "Failed to save projection." }, { status: 500 });
      }

      // 9. Return
      return NextResponse.json({ documentId: docInfo.id, projection });
    } catch (parseErr) {
      console.error("Claude JSON parsing error:", parseErr, "\nRaw output:", content);
      return NextResponse.json({ error: "Failed to parse model output" }, { status: 422 });
    }

  } catch (error) {
    console.error("Cashflow generate error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
