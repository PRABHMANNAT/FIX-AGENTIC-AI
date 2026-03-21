import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import { generateWithFallback, MODELS } from "@/lib/finance-ai";

const INVESTOR_REPORT_SYSTEM_PROMPT = `You are a CFO assistant. Generate a structured investor update report. Return a JSON object with these exact keys:
- executive_summary (string): 3 sentences in a confident founder tone
- mrr (number): monthly recurring revenue
- arr (number): annual recurring revenue
- mrr_growth_percent (number): MRR growth percentage
- burn_rate (number): monthly burn rate
- runway_months (number): months of runway remaining
- gross_margin_percent (number): gross margin percentage
- key_wins (array of 3 strings): top wins this period
- risks (array of 2 strings): key risks to flag
- asks (array of strings): what the company needs from investors
- next_month_targets (array of strings): key targets for next month

Use ONLY the real numbers provided in the user message. Do NOT invent numbers. Write executive_summary in 3 sentences, confident founder tone. Return ONLY valid JSON, no markdown code fences.`;

export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  console.log('[investor-report/generate] called')
  try {
const auth = await getAuthenticatedUserContext();
if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
const body = await req.json() as {
    month?: string;
    year?: number;
    companyData?: Record<string, unknown>;
  };
const { month = "Current", year = new Date().getFullYear(), companyData = {} } = body;
const supabase = createAdminClient();
if (!supabase) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
let cacheRow: Record<string, any> | null = null;
try {
  const { data } = await supabase
    .from("finance_data_cache")
    .select("*")
    .eq("user_id", auth.userId)
    .maybeSingle();
  cacheRow = data;
} catch (e) {
  console.log('finance_data_cache not available yet, using defaults')
}
const financialContext = {
    period: `${month} ${year}`,
    mrr: cacheRow?.mrr ?? companyData.mrr ?? 0,
    arr: cacheRow?.arr ?? companyData.arr ?? 0,
    churn_rate: cacheRow?.churn_rate ?? companyData.churn_rate ?? 0,
    burn_rate: cacheRow?.burn_rate ?? companyData.burn_rate ?? 0,
    runway_months: cacheRow?.runway_months ?? companyData.runway_months ?? 0,
    cash_balance: cacheRow?.cash_balance ?? companyData.cash_balance ?? 0,
    new_mrr: cacheRow?.new_mrr ?? companyData.new_mrr ?? 0,
    expansion_mrr: cacheRow?.expansion_mrr ?? companyData.expansion_mrr ?? 0,
    contraction_mrr: cacheRow?.contraction_mrr ?? companyData.contraction_mrr ?? 0,
    churned_mrr: cacheRow?.churned_mrr ?? companyData.churned_mrr ?? 0,
    net_new_mrr: cacheRow?.net_new_mrr ?? companyData.net_new_mrr ?? 0,
    mrr_history: cacheRow?.mrr_history ?? companyData.mrr_history ?? [],
    ...companyData,
  };
let fullContent = "";
try {
    fullContent = await generateWithFallback({
      model: MODELS.OPUS,
      maxTokens: 2048,
      system: INVESTOR_REPORT_SYSTEM_PROMPT,
      prompt: `Generate an investor update for ${month} ${year}.\n\nFinancial data:\n${JSON.stringify(financialContext, null, 2)}`
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI fallback generation failed." },
      { status: 502 },
    );
  }
let report: Record<string, unknown>;
try {
    const clean = fullContent.replace(/```json|```/gi, "").trim();
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    report = JSON.parse(clean.slice(firstBrace, lastBrace + 1));
  } catch {
    return NextResponse.json(
      { error: "Failed to parse report JSON from Claude response.", raw: fullContent },
      { status: 500 },
    );
  }
const { data: doc, error: saveError } = await supabase
    .from("finance_documents")
    .insert({
      user_id: auth.userId,
      type: "investor_report",
      title: `Investor Update — ${month} ${year}`,
      content_json: {
        period: { month, year },
        financial_context: financialContext,
        report,
      },
      status: "draft",
    })
    .select("id")
    .single();
if (saveError) {
    return NextResponse.json(
      { error: "Report generated but failed to save to database.", report },
      { status: 207 },
    );
  }
return NextResponse.json({ documentId: doc.id, report });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
