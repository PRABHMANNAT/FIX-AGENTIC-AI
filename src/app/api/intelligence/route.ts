import { NextResponse } from "next/server";
import { isOpenAIConfigured, runIntelligenceAgent } from "@/lib/openai";
import { DEMO_USER_ID, generateMockIntelligenceAnalysis } from "@/lib/demo-data";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { Product } from "@/types";

export async function POST(request: Request) {
  const startTime = Date.now();
  const body = (await request.json()) as {
    productId?: string;
    productData?: Partial<Product>;
    userId?: string;
  };

  if (!body.productData) {
    return NextResponse.json(
      { error: "Tell us what you want checked before we look into it." },
      { status: 400 },
    );
  }

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
        agent_type: "intelligence",
        status: "running",
        input: body.productData,
      })
      .select("id")
      .single();

    runId = data?.id ?? null;
  }

  try {
    const analysis = isOpenAIConfigured
      ? await runIntelligenceAgent({
          product_id: body.productId,
          product_data: body.productData,
          user_id: userId,
        })
      : generateMockIntelligenceAnalysis(body.productData);

    if (supabase && body.productId) {
      await supabase
        .from("products")
        .update({
          health_score: analysis.health_score,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.productId);

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
          error: error instanceof Error ? error.message : "Unknown intelligence error",
          duration_ms: Date.now() - startTime,
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "We couldn't check that right now. Try again." },
      { status: 500 },
    );
  }
}
