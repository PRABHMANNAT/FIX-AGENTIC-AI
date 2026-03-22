import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userId = searchParams.get("userId") || auth.userId;

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

    let query = supabase
      .from("social_scheduled")
      .select(`
        id, scheduled_at, platform, post_id,
        social_posts!inner(post_type, content_linkedin, content_twitter, content_instagram, content_whatsapp, status)
      `)
      .eq("social_posts.user_id", userId)
      .order("scheduled_at", { ascending: true });

    if (startDate) query = query.gte("scheduled_at", startDate);
    if (endDate) query = query.lte("scheduled_at", endDate);

    const { data, error } = await query;

    if (error) throw error;

    const scheduled = data.map((row: any) => {
      const p = row.social_posts;
      let preview = '';
      if (row.platform === 'linkedin') preview = p.content_linkedin;
      if (row.platform === 'twitter') preview = p.content_twitter;
      if (row.platform === 'instagram') preview = p.content_instagram;
      if (row.platform === 'whatsapp') preview = p.content_whatsapp;
      
      try {
        if (p.post_type === 'thread' && preview.trim().startsWith('{')) {
           const t = JSON.parse(preview);
           preview = t.posts?.[0]?.content || preview;
        }
      } catch(e) {}

      return {
        id: row.id,
        post_id: row.post_id,
        platform: row.platform,
        scheduled_at: row.scheduled_at,
        status: p.status,
        content_preview: (preview || '').substring(0, 60) + ((preview || '').length > 60 ? '...' : '')
      };
    });

    return NextResponse.json({ scheduled });
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

    const { post_id, platform, scheduled_at, userId } = await req.json();
    const uId = userId || auth.userId;

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

    const { data: scheduled, error: schedError } = await supabase
      .from("social_scheduled")
      .insert([{ post_id, platform, scheduled_at }])
      .select()
      .single();

    if (schedError) throw schedError;

    const { error: postError } = await supabase
      .from("social_posts")
      .update({ status: 'scheduled' })
      .eq("id", post_id)
      .eq("user_id", uId);

    if (postError) throw postError;

    return NextResponse.json({ success: true, scheduled });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { scheduled_id, userId } = await req.json();
    const uId = userId || auth.userId;

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

    const { data: sched, error: fetchError } = await supabase
      .from("social_scheduled")
      .select("post_id")
      .eq("id", scheduled_id)
      .single();
    
    if (fetchError) throw fetchError;

    const { error: delError } = await supabase
      .from("social_scheduled")
      .delete()
      .eq("id", scheduled_id);

    if (delError) throw delError;

    const { count, error: countError } = await supabase
      .from("social_scheduled")
      .select('*', { count: 'exact', head: true })
      .eq("post_id", sched.post_id);

    if (count === 0) {
       await supabase
         .from("social_posts")
         .update({ status: 'draft' })
         .eq("id", sched.post_id)
         .eq("user_id", uId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
