import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import { generateWithFallback, MODELS } from "@/lib/finance-ai";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId, samples } = await req.json();
    const uId = userId || auth.userId;

    if (!samples || !Array.isArray(samples) || samples.length === 0) {
      return NextResponse.json({ error: "No samples provided" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

    const systemPrompt = `You are a brand voice analyst. Analyze these social media posts and extract the writer's unique voice characteristics. Look for: sentence length patterns, vocabulary level, use of humor, emotional tone, storytelling style, use of data vs anecdotes, punctuation habits, emoji usage.

Return ONLY valid JSON:
{
  "voice_summary": "string (2-3 sentences describing the voice)",
  "characteristics": [
    {
      "trait": "string",
      "description": "string",
      "example": "string (quote from samples showing this trait)"
    }
  ],
  "do_list": ["string", "string", "string", "string", "string"],
  "dont_list": ["string", "string", "string", "string", "string"],
  "tone_words": ["string", "string", "string", "string", "string", "string"],
  "writing_prompt": "string (one paragraph instructions for AI to match this voice perfectly)"
}`;

    const userMessage = JSON.stringify(samples);

    const responseText = await generateWithFallback({
      model: MODELS.SONNET,
      system: systemPrompt,
      prompt: userMessage
    });

    let analysis;
    try {
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      analysis = JSON.parse(cleaned);
    } catch (e) {
      console.error("Parse error for brand voice analysis", e, responseText);
      return NextResponse.json({ error: "Failed to parse analysis output" }, { status: 422 });
    }

    const { error: settingsError } = await supabase
      .from('social_settings')
      .upsert(
        { user_id: uId, brand_voice: analysis.writing_prompt },
        { onConflict: 'user_id' }
      );
      
    if (settingsError) throw settingsError;

    const { error: samplesError } = await supabase
      .from('brand_voice_samples')
      .insert({
        user_id: uId,
        analysis_data: analysis,
        samples_used: samples
      });

    if (samplesError) throw samplesError;

    return NextResponse.json({ analysis });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    
    const uId = auth.userId;
    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

    const { data: sample } = await supabase
      .from("brand_voice_samples")
      .select("analysis_data")
      .eq("user_id", uId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
      
    const { data: settings } = await supabase
      .from("social_settings")
      .select("brand_voice")
      .eq("user_id", uId)
      .single();

    return NextResponse.json({ 
      analysis: sample ? sample.analysis_data : null,
      brand_voice: settings ? settings.brand_voice : null
    });
  } catch(error: any) {
    return NextResponse.json({ analysis: null, brand_voice: null });
  }
}
