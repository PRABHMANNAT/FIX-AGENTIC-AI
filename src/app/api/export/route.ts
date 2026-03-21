import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, getAuthenticatedUserContext } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id") ?? undefined;
  const status = searchParams.get("status");
  const auth = await getAuthenticatedUserContext(userId);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Something went wrong saving your data. Try again." },
      { status: 500 },
    );
  }

  let query = supabase
    .from("leads")
    .select("*")
    .eq("user_id", auth.userId)
    .order("icp_score", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data: leads, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "We couldn't build your download right now. Try again." },
      { status: 500 },
    );
  }

  const headers = [
    "Name",
    "Company",
    "Role",
    "Email",
    "LinkedIn URL",
    "GitHub URL",
    "Source",
    "Match %",
    "Ready To Buy",
    "Signals",
    "Status",
    "Location",
    "Found At",
  ];

  const rows = (leads || []).map((lead) => [
    lead.name,
    lead.company || "",
    lead.role || "",
    lead.email || "",
    lead.linkedin_url || "",
    lead.github_url || "",
    lead.source,
    lead.icp_score,
    lead.intent_score,
    (lead.signals || []).join(" | "),
    lead.status,
    lead.location || "",
    lead.created_at,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="assembleone-leads-${date}.csv"`,
    },
  });
}
