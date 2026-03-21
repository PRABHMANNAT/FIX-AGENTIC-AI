import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import { generateWithFallback, MODELS } from "@/lib/finance-ai";
import type { FundraisingStage } from "@/types/finance";

const STAGE_BENCHMARKS: Record<FundraisingStage, Record<string, number>> = {
  "pre-seed": { mrr_growth_rate: 15, runway: 6, churn: 10, burn_multiple: 5 },
  seed: { mrr_growth_rate: 20, runway: 12, churn: 5, burn_multiple: 3 },
  "series-a": { mrr_growth_rate: 15, runway: 18, churn: 3, burn_multiple: 2, gross_margin: 60 },
  "series-b": { mrr_growth_rate: 10, runway: 18, churn: 2, burn_multiple: 1.5, gross_margin: 65, arr: 1000000 },
};

export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  console.log('[fundraising/score] called')
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { target_stage = "seed" } = body as { target_stage?: FundraisingStage };

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    // 1. Fetch data
    let cache: Record<string, any> | null = null
    try {
      const { data } = await supabase
        .from("finance_data_cache")
        .select("*")
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
        .select("company_name")
        .eq("user_id", auth.userId)
        .single();
      settings = data;
    } catch (e) {
      console.log('finance_settings not available yet')
    }

    let anomalies: Array<Record<string, any>> | null = null
    try {
      const { data } = await supabase
        .from("finance_anomalies")
        .select("metric, severity, explanation")
        .eq("user_id", auth.userId)
        .eq("status", "new")
        .order("detected_at", { ascending: false })
        .limit(5);
      anomalies = data;
    } catch (e) {
      console.log('finance_anomalies not available yet')
    }

    const mrr = cache?.mrr || 0;
    const arr = cache?.arr || 0;
    const churn_rate = cache?.churn_rate || 0;
    const burn_rate = cache?.burn_rate || 0;
    const runway_months = cache?.runway_months || 0;
    const cash_balance = cache?.cash_balance || 0;
    const company_name = settings?.company_name || "Your Company";
    const mrr_history: Array<{ month: string; mrr: number }> = cache?.mrr_history || [];

    // 2. Derived metrics
    let mrr_growth_rate = 0;
    if (mrr_history.length >= 3) {
      const recent = mrr_history.slice(-3);
      const first = recent[0].mrr;
      const last = recent[recent.length - 1].mrr;
      if (first > 0) {
        mrr_growth_rate = (Math.pow(last / first, 1 / 2) - 1) * 100;
      }
    }

    const net_new_mrr = mrr_history.length >= 2
      ? mrr_history[mrr_history.length - 1].mrr - mrr_history[mrr_history.length - 2].mrr
      : 0;
    const burn_multiple = net_new_mrr > 0 ? burn_rate / net_new_mrr : 99;
    const gross_margin_percent = cache?.gross_margin_percent || 70;

    // 4. Call Claude Opus
    // Removed Anthropic check

    const systemPrompt = `You are a top-tier VC analyst at a leading venture fund. You have reviewed hundreds of Series A and B investment memos. Analyze this startup's financial metrics against typical benchmarks for their target funding stage and provide an honest, specific assessment.

Return a JSON object with exactly these keys:

overall_score: integer 0-100
grade: one of 'A'|'B'|'C'|'D'|'F'
  A = 85-100, B = 70-84, C = 55-69, D = 40-54, F = below 40
stage_readiness: one of 'ready'|'close'|'not-ready'
  ready = overall_score >= 75, close = overall_score 55-74, not-ready = overall_score < 55

metrics: array of exactly 6 objects, one per metric below:
  { name, current_value, benchmark_value, unit, score (0-100), status ('strong'|'meets'|'gap'|'critical'), advice (1 specific actionable sentence) }
  
  Metrics to evaluate:
  1. MRR Growth Rate (unit: '% MoM')
  2. Gross Margin (unit: '%')
  3. Burn Multiple (unit: 'x', lower is better — invert scoring)
  4. Runway (unit: 'months')
  5. Monthly Churn Rate (unit: '%', lower is better — invert scoring)
  6. Revenue Quality (unit: '% recurring', estimate from context, score how predictable the revenue is)

top_strengths: array of exactly 2 strings — specific strengths with real numbers
critical_gaps: array of exactly 3 strings — each gap must include: what the gap is, the specific number, the benchmark, and one concrete action to close it
timeline_to_ready: string — realistic estimate
investor_talking_points: array of exactly 3 strings — specific, data-backed points a founder should lead with in investor meetings

Be honest — if the metrics are weak, say so with specific gaps. Return ONLY valid JSON.`;

    const userMessage = `Target stage: ${target_stage}
Company: ${company_name}

Current metrics:
MRR: ₹${mrr} | MRR Growth (3mo avg): ${mrr_growth_rate.toFixed(1)}% MoM
ARR: ₹${arr} | Gross Margin: ${gross_margin_percent}%
Burn Rate: ₹${burn_rate}/month | Burn Multiple: ${burn_multiple.toFixed(1)}x
Runway: ${runway_months} months | Cash Balance: ₹${cash_balance}
Monthly Churn: ${churn_rate}%
Net New MRR: ₹${net_new_mrr}

Stage benchmarks for ${target_stage}:
${JSON.stringify(STAGE_BENCHMARKS[target_stage])}

Recent anomalies: ${JSON.stringify(anomalies || [])}

Historical MRR (last 3 months): ${JSON.stringify(mrr_history.slice(-3))}`;

    let content = "{}";
    try {
      content = await generateWithFallback({
        model: MODELS.OPUS,
        maxTokens: 4096,
        system: systemPrompt,
        prompt: userMessage
      });
    } catch(e) {
      return NextResponse.json({ error: "AI Generation failed" }, { status: 502 });
    }
    const cleanContent = content.replace(/```json\n|\n```|```/g, "").trim();

    let scoreData: Record<string, unknown>;
    try {
      scoreData = JSON.parse(cleanContent);
    } catch {
      return NextResponse.json({ error: "Failed to parse fundraising score" }, { status: 422 });
    }

    scoreData.stage = target_stage;
    scoreData.generated_at = new Date().toISOString();

    // 7. Save to finance_documents
    const currentDate = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const { data: doc, error: dbErr } = await supabase
      .from("finance_documents")
      .insert({
        user_id: auth.userId,
        type: "fundraising_score",
        title: `Fundraising Readiness — ${target_stage} — ${currentDate}`,
        content_json: scoreData,
        status: "final",
      })
      .select("id")
      .single();

    if (dbErr) {
      console.error("DB save error:", dbErr);
      return NextResponse.json({ error: "Failed to save score" }, { status: 500 });
    }

    return NextResponse.json({ documentId: doc.id, score: scoreData });
  } catch (error) {
    console.error("Fundraising score error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
