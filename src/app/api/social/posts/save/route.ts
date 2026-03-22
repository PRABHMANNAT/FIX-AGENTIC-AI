import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import type { SocialPost } from "@/types/social";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { post, userId } = await req.json() as { post: SocialPost, userId: string };

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const uId = userId || auth.userId;
    const postData = {
      ...post,
      user_id: uId,
    };
    delete postData.id;

    let savedPost = null;

    if (post.id) {
      const { data, error } = await supabase
        .from("social_posts")
        .update(postData)
        .eq("id", post.id)
        .eq("user_id", uId)
        .select()
        .single();
      
      if (error) throw error;
      savedPost = data;
    } else {
      const { data, error } = await supabase
        .from("social_posts")
        .insert([postData])
        .select()
        .single();
      
      if (error) throw error;
      savedPost = data;
    }

    return NextResponse.json({ success: true, post: savedPost });
  } catch (error: any) {
    console.error('Save post error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const { data: posts, error } = await supabase
      .from("social_posts")
      .select("*")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({ posts: posts || [] });
  } catch (error: any) {
    console.error('Get posts error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
