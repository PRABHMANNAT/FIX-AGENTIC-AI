"use client";

import { Loader2, Mail, Send } from "lucide-react";
import type { EmailDraft, Lead } from "@/types";

interface EmailPanelProps {
  customer: Lead | null;
  draft: EmailDraft | null;
  loadingDraft: boolean;
  sendingEmail: boolean;
  error: string | null;
  onWrite: () => void;
  onSend: () => void;
}

export function EmailPanel({
  customer,
  draft,
  loadingDraft,
  sendingEmail,
  error,
  onWrite,
  onSend,
}: EmailPanelProps) {
  return (
    <div className="panel panel-tint-green grid-surface p-5">
      <div className="system-label text-text-muted">Email Outreach</div>

      {customer ? (
        <div className="mt-4 space-y-4">
          <div>
            <div className="font-display text-3xl uppercase text-white">{customer.name}</div>
            <p className="comfort-copy mt-2 text-sm text-text-secondary">
              {customer.company || "Unknown company"}
              {customer.email ? ` / ${customer.email}` : " / No email found yet"}
            </p>
          </div>

          {error ? (
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-danger">{error}</div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onWrite}
              disabled={loadingDraft || !customer.email}
              className="button-primary min-w-[170px] justify-center disabled:cursor-not-allowed disabled:opacity-40"
              title={customer.email ? "Write email" : "No email found for this person - try LinkedIn instead."}
            >
              {loadingDraft ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              ) : (
                <Mail className="h-4 w-4" strokeWidth={2} />
              )}
              Write Email
            </button>
            <button
              type="button"
              onClick={onSend}
              disabled={sendingEmail || !draft || !customer.email}
              className="button-ghost min-w-[170px] justify-center disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sendingEmail ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              ) : (
                <Send className="h-4 w-4" strokeWidth={2} />
              )}
              Send Email
            </button>
          </div>

          {draft ? (
            <div className="rounded-md border border-border bg-[#090909] p-4">
              <div className="system-label text-text-micro">Subject</div>
              <div className="mt-2 font-syne text-sm text-white">{draft.subject}</div>
              <div className="mt-4 system-label text-text-micro">Message</div>
              <div className="mt-2 whitespace-pre-wrap font-syne text-sm leading-relaxed text-text-secondary">
                {draft.body}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="comfort-copy mt-4 text-sm text-text-secondary">
          Pick a customer to write a short, friendly email.
        </p>
      )}
    </div>
  );
}

export default EmailPanel;
