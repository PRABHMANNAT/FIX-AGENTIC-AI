import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import { generateWithFallback, MODELS } from "@/lib/finance-ai";
import type { Invoice } from "@/types/finance";

export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  console.log('[invoice/update] called')
  try {
const auth = await getAuthenticatedUserContext();
if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
const body = (await req.json()) as {
    userMessage?: string;
    existingInvoice?: Invoice;
    documentId?: string;
    userId?: string;
  };
const { userMessage, existingInvoice, documentId } = body;
if (!userMessage || !existingInvoice || !documentId) {
    return NextResponse.json(
      { error: "userMessage, existingInvoice, and documentId are required." },
      { status: 400 },
    );
  }
const supabase = createAdminClient();
if (!supabase) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
const { data: docCheck } = await supabase
    .from("finance_documents")
    .select("id")
    .eq("id", documentId)
    .eq("user_id", auth.userId)
    .single();
if (!docCheck) {
    return NextResponse.json(
      { error: "Document not found or access denied." },
      { status: 404 },
    );
  }
// Removed Anthropic Config Check
const systemPrompt = `You are an invoice assistant. The user wants to edit an existing invoice.
Current invoice JSON:
${JSON.stringify(existingInvoice, null, 2)}

Apply only the changes the user describes. Recalculate all affected amounts so every number is mathematically correct. Keep all other fields unchanged.

Return a JSON object with exactly two keys:
- invoice: the complete updated Invoice object (all fields, not just changed ones)
- changedFields: array of field name strings that were modified

Return ONLY raw JSON. No explanation, no markdown, no code blocks.`;
let rawText = "";
try {
    rawText = await generateWithFallback({
      model: MODELS.SONNET,
      maxTokens: 2048,
      system: systemPrompt,
      prompt: userMessage
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI Generation failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
let invoice: Invoice;
let changedFields: string[];
try {
    const cleaned = rawText.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as { invoice: Invoice; changedFields: string[] };
    invoice = parsed.invoice;
    changedFields = Array.isArray(parsed.changedFields) ? parsed.changedFields : [];
  } catch {
    return NextResponse.json(
      { error: "Failed to parse updated invoice", raw: rawText },
      { status: 422 },
    );
  }
invoice.id = documentId;
const { error: updateErr } = await supabase
    .from("finance_documents")
    .update({
      content_json: invoice,
      status: invoice.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);
if (updateErr) {
    return NextResponse.json(
      { error: "Failed to update invoice." },
      { status: 500 },
    );
  }
const summary =
    changedFields.length > 0
      ? changedFields
          .slice(0, 3)
          .map((f) => f.replace(/_/g, " "))
          .join(", ") + (changedFields.length > 3 ? ` +${changedFields.length - 3} more` : "")
      : "invoice updated";
return NextResponse.json({
    documentId,
    invoice,
    changedFields,
    message: `Updated: ${summary}`,
  });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
