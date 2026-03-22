import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import Groq from "groq-sdk";

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const { data, error } = await supabase
      .from("weekly_reflections")
      .select("*")
      .eq("user_id", auth.userId)
      .order("week_of", { ascending: false })
      .limit(8);

    if (error) {
      console.error("Failed to fetch reflections:", error);
      return NextResponse.json({ reflections: [] });
    }

    return NextResponse.json({ reflections: data || [] });
  } catch (error: any) {
    console.error("GET reflections error:", error.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { intended, actual, userId } = body as {
      intended: string;
      actual: string;
      userId: string;
    };

    if (!intended || !actual || !userId) {
      return NextResponse.json(
        { error: "intended, actual, and userId are required" },
        { status: 400 }
      );
    }

    // Calculate this week's Monday date
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    const weekOf = monday.toISOString().split("T")[0];

    // Call Groq for an agent insight on the reflection
    let agentInsight = "";
    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const completion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        max_tokens: 150,
        temperature: 0.4,
        messages: [
          {
            role: "user",
            content: `A startup founder wrote their weekly reflection.
Intended: ${intended}
Actual: ${actual}
Write one honest, specific observation about the gap between intention and reality. Be direct. Max 2 sentences.`,
          },
        ],
      });
      agentInsight =
        completion.choices[0]?.message?.content?.trim() || "";
    } catch (e) {
      console.error("Groq reflection insight failed:", e);
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    // Upsert into weekly_reflections
    const { error: upsertError } = await supabase
      .from("weekly_reflections")
      .upsert(
        { user_id: userId, week_of: weekOf, intended, actual, agent_insight: agentInsight },
        { onConflict: "user_id,week_of" }
      );

    if (upsertError) {
      console.error("Failed to save reflection:", upsertError);
      return NextResponse.json(
        { error: "Failed to save reflection" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, agent_insight: agentInsight });
  } catch (error: any) {
    console.error("POST reflections error:", error.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
