import { NextResponse } from "next/server";
import { isOpenAIConfigured, runFinanceAgent } from "@/lib/openai";
import { DEMO_USER_ID, generateMockFinanceAnalysis } from "@/lib/demo-data";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { FinanceAnalysis } from "@/types";

function currentPeriod() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .replace("/", "-");
}

export async function POST(request: Request): Promise<NextResponse | Response> {
  try {
const startTime = Date.now();
const body = (await request.json()) as Record<string, unknown> & { userId?: string };
const supabase = await createServerSupabaseClient();
let userId = body.userId ?? DEMO_USER_ID;
let runId: string | null = null;
if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "You'll need to sign in again." }, { status: 401 });
    }

    userId = user.id;

    const { data } = await supabase
      .from("agent_runs")
      .insert({
        user_id: userId,
        agent_type: "finance",
        status: "running",
        input: body,
      })
      .select("id")
      .single();

    runId = data?.id ?? null;
  }
try {
    const analysis: FinanceAnalysis = isOpenAIConfigured
      ? await runFinanceAgent(body)
      : generateMockFinanceAnalysis(body);

    if (supabase) {
      await supabase.from("business_metrics").insert([
        {
          user_id: userId,
          metric_type: "mrr",
          value: analysis.mrr,
          change_percent: analysis.mrr_change,
          period: currentPeriod(),
        },
        {
          user_id: userId,
          metric_type: "arr",
          value: analysis.arr,
          change_percent: analysis.mrr_change,
          period: currentPeriod(),
        },
        {
          user_id: userId,
          metric_type: "churn",
          value: analysis.churn_rate,
          change_percent: null,
          period: currentPeriod(),
        },
        {
          user_id: userId,
          metric_type: "ltv",
          value: analysis.ltv,
          change_percent: null,
          period: currentPeriod(),
        },
        {
          user_id: userId,
          metric_type: "cac",
          value: analysis.cac,
          change_percent: null,
          period: currentPeriod(),
        },
        {
          user_id: userId,
          metric_type: "runway",
          value: analysis.runway_days,
          change_percent: null,
          period: currentPeriod(),
        },
      ]);

      if (runId) {
        await supabase
          .from("agent_runs")
          .update({
            status: "completed",
            output: analysis,
            duration_ms: Date.now() - startTime,
            completed_at: new Date().toISOString(),
          })
          .eq("id", runId);
      }
    }

    return NextResponse.json(analysis);
  } catch (error) {
    if (supabase && runId) {
      await supabase
        .from("agent_runs")
        .update({
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown finance error",
          duration_ms: Date.now() - startTime,
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "We couldn't check your numbers right now. Try again." },
      { status: 500 },
    );
  }
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
