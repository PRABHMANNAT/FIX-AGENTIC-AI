import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import { generateWithFallback, MODELS } from "@/lib/finance-ai";
import type { PostGenerationRequest } from "@/types/social";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { prompt, post_type, platforms, tone, brand_voice, include_hashtags, include_emojis, userId } = await req.json() as PostGenerationRequest & { userId: string };

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    let socialSettings = {
      brand_voice: brand_voice || '',
      company_name: 'Your Company',
      industry: '',
      target_audience: ''
    };

    try {
      const { data: settings } = await supabase
        .from("social_settings")
        .select("*")
        .eq("user_id", userId || auth.userId)
        .single();
      
      if (settings) {
        socialSettings = { ...socialSettings, ...settings };
        if (brand_voice) socialSettings.brand_voice = brand_voice;
      }
    } catch (e) {
      console.log('social_settings not available yet, using defaults')
    }

    const systemPrompt = `You are an expert social media copywriter for startup founders.
Generate posts for multiple platforms based on the request.
Return ONLY valid JSON matching SocialPost interface.
No markdown, no explanation, just JSON.`;

    const requestContext = {
      prompt,
      post_type,
      platforms,
      tone,
      include_hashtags,
      include_emojis,
      company_context: socialSettings
    };

    const responseText = await generateWithFallback({
      model: MODELS.SONNET,
      system: systemPrompt,
      prompt: JSON.stringify(requestContext)
    });

    let parsedPost;
    try {
      const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedPost = JSON.parse(cleanedText);
    } catch (e) {
      console.error("Failed to parse JSON", e, responseText);
      return NextResponse.json({ error: "Failed to parse generation output" }, { status: 422 });
    }

    return NextResponse.json({ post: parsedPost });
  } catch (error: any) {
    console.error('Post generation error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
