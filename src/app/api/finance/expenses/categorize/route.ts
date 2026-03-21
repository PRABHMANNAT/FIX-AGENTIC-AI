import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import { generateWithFallback, MODELS } from "@/lib/finance-ai";
import type { CategorizedExpense, ExpenseReport, ExpenseCategoryName } from "@/types/finance";

export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  console.log('[expenses/categorize] called')
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { expenses } = body as {
      expenses: Array<{ description: string; amount: number; date: string }>;
    };

    if (!expenses || expenses.length === 0) {
      return NextResponse.json({ error: "No expenses provided" }, { status: 400 });
    }

    // Removed Anthropic check

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    // 2. Categorize with AI
    let catContent = "[]";
    try {
      catContent = await generateWithFallback({
        model: MODELS.HAIKU,
        maxTokens: 4096,
        system: `You are an expense categorization assistant for an Indian startup.
Categorize each expense into exactly one of these categories:
Infrastructure, SaaS Tools, Marketing, People, Office, Legal, Finance, Miscellaneous.

For each expense also determine:
- is_recurring: true if this looks like a subscription or recurring charge (monthly/annual SaaS, hosting, salary, retainer etc), false otherwise
- tool_name: if is_recurring is true and it is a software tool or service, extract the tool name (e.g. 'Vercel', 'Supabase', 'Slack', 'Notion'). Set to null if not a named tool or not recurring.

Return a JSON array where each item matches the input order and has:
{ description, amount, date, category, is_recurring, tool_name }

Return ONLY valid JSON array. No explanation, no markdown, no code blocks.`,
        prompt: JSON.stringify(expenses)
      });
    } catch (e) {
      return NextResponse.json({ error: "AI Generation failed" }, { status: 502 });
    }
    const cleanCat = catContent.replace(/```json\n|\n```|```/g, "").trim();

    let categorized: CategorizedExpense[];
    try {
      categorized = JSON.parse(cleanCat);
      if (!Array.isArray(categorized)) throw new Error("Not an array");
    } catch {
      return NextResponse.json({ error: "Failed to categorize expenses" }, { status: 422 });
    }

    // 4. Upsert into DB
    const now = new Date().toISOString();
    for (const exp of categorized) {
      const { data: existing } = await supabase
        .from("expenses")
        .select("id")
        .eq("user_id", auth.userId)
        .eq("description", exp.description)
        .eq("amount", exp.amount)
        .eq("date", exp.date)
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase
          .from("expenses")
          .update({
            category: exp.category,
            is_recurring: exp.is_recurring,
            tool_name: exp.tool_name,
            last_seen_at: now,
            updated_at: now,
          })
          .eq("id", existing[0].id);
      } else {
        await supabase.from("expenses").insert({
          user_id: auth.userId,
          description: exp.description,
          amount: exp.amount,
          date: exp.date,
          category: exp.category,
          is_recurring: exp.is_recurring,
          tool_name: exp.tool_name,
          last_seen_at: now,
        });
      }
    }

    // 5. Build summary
    const total_monthly = categorized.reduce((s, e) => s + e.amount, 0);

    const categoryMap = new Map<ExpenseCategoryName, number>();
    for (const e of categorized) {
      categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + e.amount);
    }
    const by_category = Array.from(categoryMap.entries())
      .map(([category, total]) => ({
        category,
        total,
        percent: total_monthly > 0 ? Math.round((total / total_monthly) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const recurringItems = categorized.filter((e) => e.is_recurring);
    const subscriptionMap = new Map<string, { category: ExpenseCategoryName; amount: number; date: string }>();
    for (const e of recurringItems) {
      const key = e.tool_name || e.description;
      const existing = subscriptionMap.get(key);
      if (!existing || new Date(e.date) > new Date(existing.date)) {
        subscriptionMap.set(key, { category: e.category, amount: e.amount, date: e.date });
      }
    }
    const subscriptions = Array.from(subscriptionMap.entries()).map(([tool_name, data]) => ({
      tool_name,
      category: data.category,
      monthly_cost: data.amount,
      yearly_cost: data.amount * 12,
      last_charged: data.date,
      potentially_unused: false,
    }));
    const subscription_monthly_total = subscriptions.reduce((s, sub) => s + sub.monthly_cost, 0);

    // 6. Cost reduction opportunities
    let cost_reduction_opportunities: string[] = [];
    try {
      let costContent = "[]";
      try {
        costContent = await generateWithFallback({
          model: MODELS.HAIKU,
          maxTokens: 1024,
          system: `You are a CFO. Given this expense breakdown, identify 3 specific cost reduction opportunities. Be specific with tool names and amounts. Return a JSON array of 3 strings. Return ONLY the JSON array.`,
          prompt: JSON.stringify({ by_category, subscriptions })
        });
      } catch (e) {
        console.warn("Cost reduction fallback failed", e);
      }
      const cleanCost = costContent.replace(/```json\n|\n```|```/g, "").trim();
      const parsed = JSON.parse(cleanCost);
      if (Array.isArray(parsed)) cost_reduction_opportunities = parsed;
    } catch {
      cost_reduction_opportunities = ["Review recurring subscriptions for unused tools"];
    }

    const report: ExpenseReport = {
      expenses: categorized,
      subscriptions,
      total_monthly,
      total_yearly: total_monthly * 12,
      by_category,
      subscription_monthly_total,
      cost_reduction_opportunities,
      generated_at: now,
    };

    return NextResponse.json({ categorized, summary: report });
  } catch (error) {
    console.error("Expense categorize error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
