import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";

function getCurrentQuarter(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${q} ${now.getFullYear()}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const quarter =
      request.nextUrl.searchParams.get("quarter") || getCurrentQuarter();

    const { data, error } = await supabase
      .from("user_goals")
      .select("*")
      .eq("user_id", auth.userId)
      .eq("quarter", quarter);

    if (error) {
      console.error("Failed to fetch goals:", error);
      return NextResponse.json({ goals: [], quarter });
    }

    return NextResponse.json({ goals: data || [], quarter });
  } catch (error: any) {
    console.error("GET goals error:", error.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { goals, userId } = body as {
      goals: Array<{
        goal_text: string;
        category: string;
        priority: number;
        time_allocation_target_percent: number;
        quarter: string;
      }>;
      userId: string;
    };

    if (!Array.isArray(goals)) {
      return NextResponse.json(
        { error: "goals must be an array" },
        { status: 400 }
      );
    }

    if (goals.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 goals allowed" },
        { status: 400 }
      );
    }

    const totalPercent = goals.reduce(
      (sum, g) => sum + (g.time_allocation_target_percent || 0),
      0
    );
    if (totalPercent > 100) {
      return NextResponse.json(
        { error: "Time allocations exceed 100%" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    // Determine quarter from the first goal, or fall back to current
    const quarter =
      goals[0]?.quarter || getCurrentQuarter();

    // Delete existing goals for this quarter
    await supabase
      .from("user_goals")
      .delete()
      .eq("user_id", userId)
      .eq("quarter", quarter);

    // Insert new goals
    const { data: insertedData, error: insertError } = await supabase
      .from("user_goals")
      .insert(goals.map((g) => ({ ...g, user_id: userId })))
      .select();

    if (insertError) {
      console.error("Failed to insert goals:", insertError);
      return NextResponse.json(
        { error: "Failed to save goals" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, goals: insertedData || [] });
  } catch (error: any) {
    console.error("POST goals error:", error.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
