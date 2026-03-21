import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";

export async function GET(): Promise<NextResponse | Response> {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    const { data: anomalies, error } = await supabase
      .from("finance_anomalies")
      .select("*")
      .eq("user_id", auth.userId)
      .order("detected_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Anomalies fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch anomalies" }, { status: 500 });
    }

    return NextResponse.json({ anomalies: anomalies || [] });
  } catch (error) {
    console.error("Anomalies list error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id, status } = await req.json();
    if (!id || !status) {
      return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    const { error } = await supabase
      .from("finance_anomalies")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", auth.userId);

    if (error) {
      console.error("Anomaly update error:", error);
      return NextResponse.json({ error: "Failed to update anomaly" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Anomaly update error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
