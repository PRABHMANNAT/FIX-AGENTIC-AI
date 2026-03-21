import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import { generateWithFallback, MODELS } from "@/lib/finance-ai";

const PITCH_DECK_SYSTEM_PROMPT = `You are an expert pitch deck writer. Given an investor report, generate a structured 10-slide pitch deck.
Return ONLY valid JSON (no markdown) with this exact shape:
{
  "title": { "company": string, "tagline": string, "presenter": string, "date": string },
  "problem": { "headline": string, "points": string[], "market_pain": string },
  "solution": { "headline": string, "description": string, "differentiators": string[] },
  "traction": { "headline": string, "metrics": [{ "label": string, "value": string }], "highlights": string[] },
  "market": { "headline": string, "tam": string, "sam": string, "som": string, "growth_rate": string },
  "product": { "headline": string, "features": string[], "tech_stack": string },
  "business_model": { "headline": string, "revenue_streams": string[], "unit_economics": string },
  "team": { "headline": string, "note": string },
  "financials": { "headline": string, "mrr": string, "arr": string, "growth": string, "burn": string, "runway": string, "ask": string },
  "ask": { "headline": string, "amount": string, "use_of_funds": string[], "milestones": string[] }
}
Derive all financial figures from the report data provided. Write in a confident, investor-ready tone.`;

export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  try {
const auth = await getAuthenticatedUserContext();
if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
const body = await req.json() as { documentId?: string; companyName?: string };
const { documentId, companyName = "Your Company" } = body;
if (!documentId) {
    return NextResponse.json(
      { error: "documentId is required. Generate an investor report first." },
      { status: 400 },
    );
  }
// Removed Anthropic check
const supabase = createAdminClient();
if (!supabase) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
const { data: sourceDoc, error: fetchError } = await supabase
    .from("finance_documents")
    .select("content_json, title")
    .eq("id", documentId)
    .eq("user_id", auth.userId)
    .single();
if (fetchError || !sourceDoc) {
    return NextResponse.json(
      { error: "Investor report not found or access denied." },
      { status: 404 },
    );
  }
let fullContent = "";
try {
    fullContent = await generateWithFallback({
      model: MODELS.OPUS,
      maxTokens: 3000,
      system: PITCH_DECK_SYSTEM_PROMPT,
      prompt: `Company: ${companyName}\n\nInvestor report data:\n${JSON.stringify(sourceDoc.content_json, null, 2)}`
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI generation failed." },
      { status: 502 },
    );
  }
let slides: Record<string, unknown>;
try {
    const clean = fullContent.replace(/```json|```/gi, "").trim();
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    slides = JSON.parse(clean.slice(firstBrace, lastBrace + 1));
  } catch {
    return NextResponse.json(
      { error: "Failed to parse pitch deck JSON from Claude.", raw: fullContent },
      { status: 500 },
    );
  }
const { data: doc, error: saveError } = await supabase
    .from("finance_documents")
    .insert({
      user_id: auth.userId,
      type: "pitch_deck",
      title: `Pitch Deck — ${companyName} — ${sourceDoc.title}`,
      content_json: {
        source_report_id: documentId,
        company_name: companyName,
        slides,
      },
      status: "draft",
    })
    .select("id")
    .single();
if (saveError) {
    return NextResponse.json(
      { error: "Pitch deck generated but failed to save.", slides },
      { status: 207 },
    );
  }
return NextResponse.json({ documentId: doc.id, slides });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
