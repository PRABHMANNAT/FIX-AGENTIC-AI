import { NextRequest, NextResponse } from "next/server";
import { sendOutboundEmail } from "@/lib/resend";
import { createAdminClient, getAuthenticatedUserContext } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    lead_id?: string;
    user_id?: string;
    to_email?: string;
    subject?: string;
    email_body?: string;
    sender_name?: string;
    reply_to?: string;
  };

  const auth = await getAuthenticatedUserContext(body.user_id);

  if ("error" in auth) {
    return NextResponse.json({ error: "You'll need to sign in again." }, { status: auth.status });
  }

  if (!body.lead_id || !body.to_email || !body.subject || !body.email_body) {
    return NextResponse.json(
      { error: "We need an email address, subject, and message before we can send this." },
      { status: 400 },
    );
  }

  if (!body.to_email) {
    return NextResponse.json(
      { error: "No email found for this person - try reaching out on LinkedIn instead." },
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

  const result = await sendOutboundEmail({
    to: body.to_email,
    subject: body.subject,
    body: body.email_body,
    fromName: body.sender_name || "AssembleOne",
    replyTo: body.reply_to,
  });

  await supabase
    .from("leads")
    .update({
      status: "contacted",
      email_sent_at: new Date().toISOString(),
      sequence_step: 1,
    })
    .eq("id", body.lead_id)
    .eq("user_id", auth.userId);

  return NextResponse.json({ sent: true, resend_id: result.id });
}
