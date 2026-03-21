import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, getAuthenticatedUserContext } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get("user_id") ?? undefined;
  const auth = await getAuthenticatedUserContext(userId);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("icp_profiles")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ icps: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Record<string, unknown> & { user_id?: string };
  const auth = await getAuthenticatedUserContext(body.user_id);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  const payload = {
    ...body,
    user_id: auth.userId,
  };

  const { data, error } = await supabase
    .from("icp_profiles")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ icp: data });
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as Record<string, unknown> & {
    id?: string;
    user_id?: string;
  };
  const auth = await getAuthenticatedUserContext(body.user_id);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  const updates = { ...body };
  delete updates.id;
  delete updates.user_id;
  const { data, error } = await supabase
    .from("icp_profiles")
    .update(updates)
    .eq("id", body.id)
    .eq("user_id", auth.userId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ icp: data });
}
