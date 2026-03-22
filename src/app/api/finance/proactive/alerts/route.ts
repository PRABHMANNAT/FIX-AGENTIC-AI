import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";

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
      .from("proactive_alerts")
      .select("*")
      .eq("user_id", auth.userId)
      .eq("status", "unread")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Failed to fetch proactive alerts:", error);
      return NextResponse.json({ alerts: [], unread_count: 0 });
    }

    return NextResponse.json({
      alerts: data || [],
      unread_count: data?.length || 0,
    });
  } catch (error: any) {
    console.error("GET proactive alerts error:", error.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { id, status, userId } = body as {
      id: string;
      status: string;
      userId: string;
    };

    if (!id || !status) {
      return NextResponse.json(
        { error: "id and status are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const { error } = await supabase
      .from("proactive_alerts")
      .update({ status })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to update proactive alert:", error);
      return NextResponse.json(
        { error: "Failed to update alert" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST proactive alerts error:", error.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
