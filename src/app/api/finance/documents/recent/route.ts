import { NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";

export async function GET(): Promise<NextResponse | Response> {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    const { data, error } = await supabase
      .from("finance_documents")
      .select("id, type, title, created_at")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Recent docs error:", error);
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }

    return NextResponse.json({ documents: data || [] });
  } catch (error) {
    console.error("Recent docs error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
