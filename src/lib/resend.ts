import { Resend } from "resend";

const resendClient = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

export async function sendOutboundEmail(params: {
  to: string;
  subject: string;
  body: string;
  fromName: string;
  replyTo?: string;
}): Promise<{ id: string }> {
  if (!resendClient || !process.env.RESEND_FROM_EMAIL) {
    throw new Error("Resend is not configured.");
  }

  const { data, error } = await resendClient.emails.send({
    from: `${params.fromName} <${process.env.RESEND_FROM_EMAIL}>`,
    to: params.to,
    replyTo: params.replyTo,
    subject: params.subject,
    text: params.body,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error("Resend returned no email ID.");
  }

  return { id: data.id };
}
