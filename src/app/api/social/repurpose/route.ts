import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import { generateWithFallback, MODELS } from "@/lib/finance-ai";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId, source_content, source_type, target_formats } = await req.json();
    const uId = userId || auth.userId;

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

    let brandVoice = 'Not set — use confident, authentic founder tone';
    try {
      const { data: settings } = await supabase
        .from("social_settings")
        .select("brand_voice")
        .eq("user_id", uId)
        .single();
      if (settings?.brand_voice) brandVoice = settings.brand_voice;
    } catch(e) {}

    const systemPrompt = `You are an expert content repurposing strategist.
Take source content and transform it into multiple social media formats. Each format should feel native to its platform.
Do not just summarize — extract the most interesting insight, story, or data point and build each post around that angle.

Brand voice instructions: ${brandVoice}

Return ONLY valid JSON:
{
  "repurposed": [
    {
      "platform": "linkedin",
      "post_type": "string",
      "content": "string",
      "angle": "string (what angle was used for this format)",
      "char_count": 100
    }
  ],
  "key_insights": ["string", "string", "string"],
  "unused_angles": ["string", "string", "string"]
}`;

    const userMessage = `Source type: ${source_type}\nContent:\n${source_content}\n\nTarget formats: ${JSON.stringify(target_formats)}`;

    const responseText = await generateWithFallback({
      model: MODELS.OPUS,
      system: systemPrompt,
      prompt: userMessage,
      maxTokens: 8000
    });

    let parsedData;
    try {
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    } catch (e) {
      console.error("Parse error for repurpose output", e, responseText);
      return NextResponse.json({ error: "Failed to parse API output" }, { status: 422 });
    }

    const savedIds = [];
    if (parsedData.repurposed && Array.isArray(parsedData.repurposed)) {
      for (const item of parsedData.repurposed) {
        const postData: any = {
           user_id: uId,
           platform: item.platform,
           post_type: item.post_type,
           original_prompt: userMessage,
           status: 'draft',
           tags: []
        };
        const plat = String(item.platform).toLowerCase();
        postData[`content_${plat}`] = item.content;

        const { data: savedPost } = await supabase.from("social_posts").insert([postData]).select('id').single();
        if (savedPost) {
           savedIds.push(savedPost.id);
        }
      }
    }

    return NextResponse.json({
      repurposed: parsedData.repurposed || [],
      key_insights: parsedData.key_insights || [],
      unused_angles: parsedData.unused_angles || [],
      post_ids: savedIds
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
