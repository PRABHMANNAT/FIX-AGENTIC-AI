import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import { generateWithFallback, MODELS } from "@/lib/finance-ai";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId, topic, platform, thread_length = 5, source_content } = await req.json();

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const uId = userId || auth.userId;
    let brandVoice = 'Not set — use confident, authentic founder tone';
    
    try {
      const { data: settings } = await supabase
        .from("social_settings")
        .select("brand_voice")
        .eq("user_id", uId)
        .single();
      
      if (settings?.brand_voice) {
        brandVoice = settings.brand_voice;
      }
    } catch (e) {
      console.log('social_settings not available yet, using defaults')
    }

    const systemPrompt = `You are an expert at writing viral thread content for founders.
Create a ${platform} thread that teaches, inspires, or tells a story.

Brand Voice: ${brandVoice}

Rules for great threads:
- Post 1: Strong hook. Make them NEED to read on. Start with a bold claim, surprising stat, or provocative question.
- Posts 2 to N-1: Each delivers ONE insight. Short paragraphs. End each with a teaser to the next.
- Last post: Summary + strong CTA (follow, share, reply, DM).
- LinkedIn: 150-300 chars per post. Professional but human.
- Twitter: Max 270 chars per tweet. Ultra punchy.
- Number each post: 1/ 2/ 3/ etc for Twitter.

Return ONLY valid JSON:
{
  "platform": "${platform}",
  "topic": "${topic}",
  "posts": [
    {
      "order": 1,
      "content": "...",
      "char_count": 150
    }
  ],
  "hook_score": 8
}`;

    const userMessage = JSON.stringify({
      topic,
      platform,
      thread_length: Math.min(thread_length, 10),
      source_content
    });

    const responseText = await generateWithFallback({
      model: MODELS.SONNET,
      system: systemPrompt,
      prompt: userMessage
    });

    let parsedThread;
    try {
      const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedThread = JSON.parse(cleanedText);
    } catch (e) {
      console.error("Failed to parse JSON", e, responseText);
      return NextResponse.json({ error: "Failed to parse generation output" }, { status: 422 });
    }

    const postData: any = {
      user_id: uId,
      platform,
      post_type: 'thread',
      status: 'draft',
      original_prompt: userMessage,
      tags: []
    };

    if (platform === 'linkedin') {
      postData.content_linkedin = JSON.stringify(parsedThread);
    } else {
      postData.content_twitter = JSON.stringify(parsedThread);
    }

    let savedId = null;
    const { data: savedPost, error } = await supabase
      .from("social_posts")
      .insert([postData])
      .select('id')
      .single();
    
    if (!error && savedPost) {
      savedId = savedPost.id;
    }

    return NextResponse.json({ thread: parsedThread, post_id: savedId });
  } catch (error: any) {
    console.error('Thread generation error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
