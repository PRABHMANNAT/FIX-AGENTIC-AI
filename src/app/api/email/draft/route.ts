import { NextRequest, NextResponse } from "next/server";
import { generateEmailDraft } from "@/lib/openai";
import { createAdminClient, getAuthenticatedUserContext } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    lead_id?: string;
    user_id?: string;
    sender_name?: string;
    sender_company?: string;
    value_prop?: string;
  };

  const auth = await getAuthenticatedUserContext(body.user_id);

  if ("error" in auth) {
    return NextResponse.json({ error: "You'll need to sign in again." }, { status: auth.status });
  }

  if (!body.lead_id || !body.sender_name) {
    return NextResponse.json(
      { error: "Pick a customer before asking us to write an email." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Something went wrong saving your data. Try again." },
      { status: 500 },
    );
  }

  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", body.lead_id)
    .eq("user_id", auth.userId)
    .single();

  if (fetchError || !lead) {
    return NextResponse.json({ error: "We couldn't find that customer. Try refreshing the page." }, { status: 404 });
  }

  if (!lead.email) {
    return NextResponse.json(
      { error: "No email found for this person - try reaching out on LinkedIn instead." },
      { status: 400 },
    );
  }

  const draft = await generateEmailDraft({
    leadName: lead.name,
    leadRole: lead.role,
    leadCompany: lead.company,
    leadSignals: lead.signals || [],
    leadReason: lead.score_reason,
    rawData: lead.raw_data,
    senderName: body.sender_name,
    senderCompany: body.sender_company || "AssembleOne",
    valueProp:
      body.value_prop ||
      "A simple way to find the right customers and send personal emails faster.",
  });

  await supabase
    .from("leads")
    .update({
      email_draft: `${draft.subject}\n\n${draft.body}`,
    })
    .eq("id", body.lead_id)
    .eq("user_id", auth.userId);

  return NextResponse.json(draft);
}
