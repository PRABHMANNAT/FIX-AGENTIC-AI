import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import { streamWithFallback, MODELS } from "@/lib/finance-ai";
import type { SocialChatMessage, SocialArtifactType } from "@/types/social";

export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  console.log('Social agent route called')

  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { messages, currentArtifactType, currentArtifactData } = body as {
      messages: SocialChatMessage[];
      userId: string;
      currentArtifactType?: SocialArtifactType;
      currentArtifactData?: unknown;
    };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const userId = auth.userId;

    let socialSettings = {
      brand_voice: '',
      target_audience: '',
      industry: '',
      company_name: 'Your Company',
      linkedin_connected: false,
      twitter_connected: false
    };

    try {
      const { data: settings } = await supabase
        .from("social_settings")
        .select("*")
        .eq("user_id", userId)
        .single();
      
      if (settings) {
        socialSettings = { ...socialSettings, ...settings };
      }
    } catch (e) {
      console.log('social_settings not available yet, using defaults')
    }

    let financeContext = { mrr: 0, anomalies: "None" };
    try {
      const { data: cache } = await supabase
        .from("finance_data_cache")
        .select("mrr")
        .eq("user_id", userId)
        .single();
      if (cache) financeContext.mrr = cache.mrr || 0;

      const { count } = await supabase
        .from("finance_anomalies")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", userId)
        .eq("status", "new");
      if (count && count > 0) financeContext.anomalies = `${count} new anomalies`;
    } catch (e) {
      console.log('finance context not available')
    }

    let recentPostsStr = 'No recent posts found.';
    try {
      const { data: recentPosts } = await supabase
        .from("social_posts")
        .select("id, post_type, content_linkedin, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);
      
      if (recentPosts && recentPosts.length > 0) {
        recentPostsStr = JSON.stringify(recentPosts, null, 2);
      }
    } catch (e) {
      console.log('Error fetching recent social_posts')
    }

    const connectedPlatforms = [
      socialSettings.linkedin_connected ? 'LinkedIn' : null,
      socialSettings.twitter_connected ? 'Twitter' : null
    ].filter(Boolean).join(', ') || 'None connected';

    let systemPrompt = `You are AssembleOne's Social Media Agent — an expert content strategist and copywriter for startup founders.

Company: ${socialSettings.company_name}
Industry: ${socialSettings.industry}
Target audience: ${socialSettings.target_audience}
Brand voice: ${socialSettings.brand_voice || 'Not set — use confident, authentic founder tone'}
Connected platforms: ${connectedPlatforms}

Recent Posts Context:
${recentPostsStr}

You help founders:
- Write posts for LinkedIn, Twitter, Instagram, WhatsApp
- Create thread series
- Repurpose content across platforms
- Plan content calendars
- Analyze what content works

When generating a post return your chat response first,
then output the post using artifact tags:
<artifact type='post'>
JSON_HERE
</artifact>

The JSON must match the SocialPost interface:
{
  "content_linkedin": "string (max 3000 chars, professional tone)",
  "content_twitter": "string (max 280 chars, punchy)",
  "content_instagram": "string (max 2200 chars, visual storytelling)",
  "content_whatsapp": "string (max 500 chars, conversational)",
  "original_prompt": "string",
  "post_type": "string",
  "tags": ["string"]
}

When creating a thread return:
<artifact type='thread'>
{
  "platform": "linkedin or twitter",
  "posts": [{ "order": 1, "content": "..." }]
}
</artifact>

When user asks for content ideas return:
<artifact type='content_ideas'>
{
  "ideas": [{
    "title": "string",
    "description": "string",
    "post_type": "string",
    "hook": "string"
  }]
}
</artifact>

Rules for great posts:
- LinkedIn: Start with a hook. Use line breaks. End with question or CTA.
- Twitter: One idea per tweet. Short sentences. Strong opening word.
- Instagram: Storytelling first. Hashtags at end. Use emojis naturally.
- Always write in first person as the founder.
- Never use corporate buzzwords like 'synergy' or 'leverage'.
- Always include 3-5 relevant hashtags per platform.

Keep chat responses short and direct.
Ask only ONE clarifying question if needed.

You also have access to the founder's business data:
MRR: ₹${financeContext.mrr}, Recent anomalies: ${financeContext.anomalies}.
Use this to suggest timely, data-backed content ideas.
Example: if MRR grew 20% suggest a milestone post.
If a GitHub feature shipped suggest a product update post.`;

    if (currentArtifactType && currentArtifactData) {
      systemPrompt += `\n\nThe user currently has a ${currentArtifactType} open on the right panel.
Current document data: ${JSON.stringify(currentArtifactData)}
If the user asks to edit or update it, modify that document and return the updated version in artifact tags.`;
    }

    const formattedMessages = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await streamWithFallback({
            model: MODELS.SONNET,
            system: systemPrompt,
            messages: formattedMessages,
            maxTokens: 8192,
            onFallback: () => {
              controller.enqueue(encoder.encode(`data: {"type":"fallback","provider":"openai"}\n\n`));
            },
            onToken: (text) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", content: text })}\n\n`));
            },
            onComplete: (fullResponse) => {
              const artifactMatch = fullResponse.match(/<artifact\s+type=['"]([^'"]+)['"]>([\s\S]*?)<\/artifact>/);
              if (artifactMatch) {
                const [, extractedType, jsonString] = artifactMatch;
                try {
                  const parsedJSON = JSON.parse(jsonString.trim());
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: "artifact",
                        artifactType: extractedType,
                        data: parsedJSON,
                      })}\n\n`
                    )
                  );
                } catch (err) {
                  console.error("Failed to parse JSON inside <artifact> tags:", err);
                }
              }
            }
          });
        } catch (error: any) {
          console.error("Stream error:", error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`));
        } finally {
          controller.enqueue(encoder.encode(`data: {"type":"done"}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error: any) {
    console.error('Social agent error:', error.message)
    return new Response(
      `data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`,
      { headers: { 'Content-Type': 'text/event-stream' } }
    )
  }
}
