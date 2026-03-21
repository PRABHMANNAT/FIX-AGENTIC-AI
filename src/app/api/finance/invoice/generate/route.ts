import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import { generateWithFallback, MODELS } from "@/lib/finance-ai";
import type { Invoice } from "@/types/finance";

export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  console.log('[invoice/generate] called')
  try {
const auth = await getAuthenticatedUserContext();
if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
const body = (await req.json()) as { userMessage?: string; userId?: string };
const { userMessage } = body;
if (!userMessage) {
    return NextResponse.json({ error: "userMessage is required." }, { status: 400 });
  }
const supabase = createAdminClient();
if (!supabase) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
let settings: { company_name?: string; company_address?: string; gstin?: string; bank_details?: string } | null = null;
try {
  const { data } = await supabase
    .from("finance_settings")
    .select("company_name, company_address, gstin, bank_details")
    .eq("user_id", auth.userId)
    .single();
  settings = data;
} catch (e) {
  console.log('finance_settings not available yet, using defaults')
}
const fromCompany = settings?.company_name ?? "";
const fromAddress = settings?.company_address ?? "";
const fromGstin = settings?.gstin ?? "";
const bankDetails = settings?.bank_details ?? "";
// Removed legacy Anthropic client grab
const systemPrompt = `You are an invoice assistant for an Indian business. Extract invoice details from the user message and return a complete Invoice JSON object. Rules:
- Auto-generate invoice_number in format INV-YYYY-NNN using current year
- Set date to today, due_date to 30 days from today
- Calculate every amount field: line item amounts, subtotal, discount, taxable_amount, all tax amounts, total — all must be mathematically correct
- Default to CGST 9% + SGST 9% unless user says interstate, then IGST 18%
- Set igst_percent to 0 when using CGST/SGST, set cgst_percent/sgst_percent to 0 when using IGST
- Pre-fill these from_* fields: from_company="${fromCompany}", from_address="${fromAddress}", from_gstin="${fromGstin}", bank_details="${bankDetails}"
- Return ONLY raw JSON. No explanation, no markdown, no code blocks.

The JSON must match this shape exactly:
{
  "id": "",
  "invoice_number": "INV-YYYY-NNN",
  "from_company": "${fromCompany}",
  "from_address": "${fromAddress}",
  "from_gstin": "${fromGstin}",
  "to_company": "",
  "to_address": "",
  "to_gstin": "",
  "date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "line_items": [{ "description": "", "quantity": 0, "rate": 0, "amount": 0 }],
  "subtotal": 0,
  "discount_percent": 0,
  "discount_amount": 0,
  "taxable_amount": 0,
  "cgst_percent": 9,
  "sgst_percent": 9,
  "igst_percent": 0,
  "cgst_amount": 0,
  "sgst_amount": 0,
  "igst_amount": 0,
  "total": 0,
  "notes": "",
  "payment_terms": "Net 30",
  "bank_details": "${bankDetails}",
  "status": "draft"
}`;
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
try {
    // Strip any accidental markdown fences
    const cleaned = rawText.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
    invoice = JSON.parse(cleaned) as Invoice;
  } catch {
    return NextResponse.json(
      { error: "Failed to parse invoice", raw: rawText },
      { status: 422 },
    );
  }
const { data: saved, error: dbErr } = await supabase
    .from("finance_documents")
    .insert({
      user_id: auth.userId,
      type: "invoice",
      title: invoice.invoice_number,
      content_json: invoice,
      status: "draft",
    })
    .select("id")
    .single();
if (dbErr || !saved) {
    return NextResponse.json(
      { error: "Failed to save invoice." },
      { status: 500 },
    );
  }
invoice.id = saved.id as string;
return NextResponse.json({
    documentId: saved.id,
    invoice,
    message: `Invoice ${invoice.invoice_number} created for ${invoice.to_company}`,
  });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
