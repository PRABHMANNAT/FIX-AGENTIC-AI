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

    const { data: competitors } = await supabase.from("social_competitors").select("*").eq("user_id", uId);
    return NextResponse.json({ competitors: competitors || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    
    const { userId, name, linkedin_url, twitter_handle, notes } = await req.json();
    const uId = userId || auth.userId;

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "DB not ok" }, { status: 503 });

    const { data: competitor, error } = await supabase
      .from("social_competitors")
      .insert([{ user_id: uId, name, linkedin_url, twitter_handle, notes }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, competitor });
  } catch(error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    
    const { id, userId } = await req.json();
    const uId = userId || auth.userId;

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "DB not ok" }, { status: 503 });

    const { error } = await supabase.from("social_competitors").delete().eq("id", id).eq("user_id", uId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch(error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
