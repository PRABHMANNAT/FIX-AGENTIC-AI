import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import { generateWithFallback, MODELS } from "@/lib/finance-ai";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    
    const { userId } = await req.json();
    const uId = userId || auth.userId;

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "DB not ok" }, { status: 503 });

    const { data: competitors } = await supabase.from("social_competitors").select("*").eq("user_id", uId);
    if (!competitors || competitors.length === 0) {
      return NextResponse.json({ analyses: [] });
    }

    const analyses = [];

    const systemPrompt = `You are a competitive intelligence analyst. Based on the competitor information provided, generate content strategy insights and recommendations.
Return ONLY valid JSON:
{
  "content_gaps": ["string", "string"],
  "differentiation_opportunities": ["string", "string"],
  "posting_frequency_estimate": "string",
  "tone_estimate": "string",
  "recommended_response_strategy": "string"
}`;

    for (const comp of competitors) {
       const userMsg = `Competitor: ${comp.name}\nLinkedIn: ${comp.linkedin_url}\nTwitter: ${comp.twitter_handle}\nNotes: ${comp.notes}`;
       try {
         const resp = await generateWithFallback({
           model: MODELS.SONNET,
           system: systemPrompt,
           prompt: userMsg
         });
         const cleaned = resp.replace(/```json/g, '').replace(/```/g, '').trim();
         const analysis = JSON.parse(cleaned);
         analyses.push({ competitor_id: comp.id, analysis });
       } catch(e) {
         console.error("Failed competitor analysis", comp.name, e);
       }
    }

    return NextResponse.json({ analyses });
  } catch(error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
