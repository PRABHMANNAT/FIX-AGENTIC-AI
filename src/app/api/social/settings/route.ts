import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const uId = auth.userId;
    
    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "DB not ok" }, { status: 503 });

    const { data: settings } = await supabase.from("social_settings").select("*").eq("user_id", uId).single();
    return NextResponse.json({ settings: settings || {} });
  } catch (error: any) {
    return NextResponse.json({ settings: {} });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    
    const { settings } = await req.json();
    const uId = auth.userId;

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "DB not ok" }, { status: 503 });

    const { data: updated, error } = await supabase
      .from("social_settings")
      .upsert({ user_id: uId, ...settings }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ settings: updated });
  } catch(error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
