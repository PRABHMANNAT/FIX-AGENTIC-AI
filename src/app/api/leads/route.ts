import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, getAuthenticatedUserContext } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const requestedUserId = new URL(req.url).searchParams.get("user_id") ?? undefined;
  const auth = await getAuthenticatedUserContext(requestedUserId);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const source = searchParams.get("source");
  const minIcpScore = Number.parseInt(searchParams.get("min_icp_score") || "0", 10);
  const sortBy = searchParams.get("sort_by") || "icp_score";
  const limit = Number.parseInt(searchParams.get("limit") || "100", 10);

  let query = supabase
    .from("leads")
    .select("*")
    .eq("user_id", auth.userId)
    .gte("icp_score", Number.isNaN(minIcpScore) ? 0 : minIcpScore)
    .order(
      sortBy === "intent_score" ? "intent_score" : sortBy === "created_at" ? "created_at" : "icp_score",
      {
        ascending: false,
      },
    )
    .limit(Number.isNaN(limit) ? 100 : limit);

  if (status) {
    query = query.eq("status", status);
  }

  if (source) {
    query = query.eq("source", source);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leads: data ?? [], count: data?.length ?? 0 });
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

  const allowedUpdates = ["status", "notes", "email_draft", "sequence_step"] as const;
  const safeUpdates = Object.fromEntries(
    Object.entries(body).filter(([key]) => allowedUpdates.includes(key as (typeof allowedUpdates)[number])),
  );

  const { data, error } = await supabase
    .from("leads")
    .update(safeUpdates)
    .eq("id", body.id)
    .eq("user_id", auth.userId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead: data });
}
