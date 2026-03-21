import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import { streamWithFallback, MODELS } from "@/lib/finance-ai";
import type { ChatMessage, ArtifactType } from "@/types/finance";

export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  console.log('Finance agent route called')
  console.log('GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY)
  console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY)

  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { messages, currentArtifactType, currentArtifactData } = body as {
      messages: ChatMessage[];
      userId: string;
      currentArtifactType?: ArtifactType;
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

    // 1. Fetch financial context with safe defaults
    let financeContext = {
      mrr: 0,
      arr: 0,
      churn_rate: 0,
      burn_rate: 0,
      runway_months: 0,
      cash_balance: 0,
      last_synced_at: 'Not synced yet',
      company_name: 'Your Company',
      currency: 'INR',
    }

    try {
      const { data: cache } = await supabase
        .from("finance_data_cache")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (cache) {
        financeContext.mrr = cache.mrr || 0
        financeContext.arr = cache.arr || 0
        financeContext.churn_rate = cache.churn_rate || 0
        financeContext.burn_rate = cache.burn_rate || 0
        financeContext.runway_months = cache.runway_months || 0
        financeContext.cash_balance = cache.cash_balance || 0
        financeContext.last_synced_at = cache.last_synced_at
          ? new Date(cache.last_synced_at).toLocaleString()
          : 'Not synced'
      }
    } catch (e) {
      console.log('finance_data_cache not available yet, using defaults')
    }

    try {
      const { data: settings } = await supabase
        .from("finance_settings")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (settings) {
        financeContext.company_name = settings.company_name || 'Your Company'
        financeContext.currency = settings.currency || 'INR'
      }
    } catch (e) {
      console.log('finance_settings not available yet, using defaults')
    }

    // 2. Build system prompt
    let systemPrompt = `You are AssembleOne's Finance Agent — a senior CFO assistant for solo founders and lean startups. You are embedded inside AssembleOne, an AI co-worker platform.

You have access to the user's live financial data:
MRR: ₹${financeContext.mrr} | ARR: ₹${financeContext.arr} | Churn: ${financeContext.churn_rate}% | Burn: ₹${financeContext.burn_rate}/month
Runway: ${financeContext.runway_months} months | Cash: ₹${financeContext.cash_balance}
Company: ${financeContext.company_name} | Last synced: ${financeContext.last_synced_at}

You can generate and edit these document types:
- invoice: Indian GST tax invoice
- investor_report: Monthly investor update with metrics
- pitch_deck: 10-slide investor pitch deck
- cash_flow: 30/60/90 day cash flow projection
- briefing: Weekly finance briefing
- expenses: Expense categorization report
- fundraising: Fundraising readiness score report
- revenue_dashboard: Revenue metrics dashboard
- burn_runway: Burn rate and runway analysis

When generating or editing any document:
Return your chat response first as plain text.
Then on a new line output the artifact using exactly this format:
<artifact type='TYPE'>
DOCUMENT_JSON_HERE
</artifact>

The DOCUMENT_JSON_HERE must be valid JSON matching the document type.
For invoice type use the Invoice interface structure.
For investor_report return: { executive_summary, mrr, arr, mrr_growth_percent, burn_rate, runway_months, gross_margin_percent, key_wins, risks, asks, next_month_targets, company_name, month, year }
For pitch_deck return: { slides: Array<{ id, title, subtitle, content_type, content, speaker_notes }>, company_name, stage, period }
For cash_flow return: { scenarios: { best, base, worst }, each being Array<{ month, revenue, expenses, net_cash_flow, cash_balance }>, analysis_text, key_milestones, recommendations }
For briefing return: { week_of, week_summary, revenue_update, burn_update, top_3_actions, wins, watch_out, one_line_forecast }
For fundraising return: { overall_score, grade, stage_readiness, metrics, top_strengths, critical_gaps, timeline_to_ready, investor_talking_points }

When the user asks analysis questions answer conversationally using the real numbers from the financial context above.
When editing an existing document always return the complete updated document JSON — never partial updates.
Be direct and concise. Think like a senior CFO. Use ₹ for amounts.`;

    // 3. Add current artifact context
    if (currentArtifactType && currentArtifactData) {
      systemPrompt += `\n\nThe user currently has a ${currentArtifactType} open on the right panel.
Current document data: ${JSON.stringify(currentArtifactData)}
If the user asks to edit or update it, modify that document and return the updated version in artifact tags.`;
    }

    // 4. Format messages
    const formattedMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 5. Call Groq & stream (with OpenAI fallback)
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
              // Parse fullResponse for artifact tags
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
    console.error('Finance agent error:', error.message)
    return new Response(
      `data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`,
      { headers: { 'Content-Type': 'text/event-stream' } }
    )
  }
}
