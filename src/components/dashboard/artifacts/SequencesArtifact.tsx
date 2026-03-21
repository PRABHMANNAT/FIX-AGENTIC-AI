"use client";

import { Mail } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { BMOProfile, Lead } from "@/types";

function parseDraft(value: string | null) {
  if (!value) {
    return { subject: "", body: "" };
  }

  const [subject, ...rest] = value.split("\n\n");

  return {
    subject: subject.replace(/^Subject:\s*/i, "").trim(),
    body: rest.join("\n\n").trim(),
  };
}

export function SequencesArtifact({
  data,
  onLeadMutate,
}: {
  data: {
    userId: string | null;
    leads: Lead[];
    selectedLead?: Lead | null;
    bmoContext: BMOProfile | null;
  };
  onLeadMutate?: (leadId: string, updates: Partial<Lead>) => void;
}) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(data.selectedLead?.id ?? data.leads[0]?.id ?? null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const selectedLead = useMemo(
    () => data.leads.find((lead) => lead.id === selectedLeadId) ?? null,
    [data.leads, selectedLeadId],
  );

  useEffect(() => {
    setSelectedLeadId(data.selectedLead?.id ?? data.leads[0]?.id ?? null);
  }, [data.leads, data.selectedLead?.id]);

  useEffect(() => {
    if (!selectedLead) {
      setSubject("");
      setBody("");
      return;
    }

    const parsed = parseDraft(selectedLead.email_draft);
    setSubject(parsed.subject);
    setBody(parsed.body);
  }, [selectedLead]);

  const replyRate = useMemo(() => {
    const contacted = data.leads.filter((lead) => lead.status === "contacted" || lead.status === "replied" || lead.status === "qualified").length;
    const replied = data.leads.filter((lead) => lead.status === "replied" || lead.status === "qualified").length;

    if (!contacted) {
      return "0%";
    }

    return `${Math.round((replied / contacted) * 100)}%`;
  }, [data.leads]);

  const meetings = data.leads.filter((lead) => lead.status === "qualified").length;

  async function generateDraft() {
    if (!selectedLead || !data.userId) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/email/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lead_id: selectedLead.id,
          user_id: data.userId,
          sender_name: data.bmoContext?.business_name ?? "AssembleOne",
          sender_company: data.bmoContext?.business_name ?? "AssembleOne",
          value_prop:
            data.bmoContext?.suggested_email_hook ??
            "A simple way to find the right customers and send personal emails faster.",
        }),
      });

      const result = (await response.json()) as { subject?: string; body?: string };
      setSubject(result.subject ?? "");
      setBody(result.body ?? "");
      onLeadMutate?.(selectedLead.id, {
        email_draft: `${result.subject ?? ""}\n\n${result.body ?? ""}`.trim(),
      });
    } finally {
      setLoading(false);
    }
  }

  async function sendDraft() {
    if (!selectedLead || !data.userId || !selectedLead.email) {
      return;
    }

    setSending(true);

    try {
      await fetch("/api/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lead_id: selectedLead.id,
          user_id: data.userId,
          to_email: selectedLead.email,
          subject,
          email_body: body,
          sender_name: data.bmoContext?.business_name ?? "AssembleOne",
        }),
      });

      onLeadMutate?.(selectedLead.id, {
        status: "contacted",
        email_sent_at: new Date().toISOString(),
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="artifact-header">
        <div className="artifact-header-left">
          <div className="artifact-icon" style={{ background: "var(--green-dim)" }}>
            <Mail size={18} color="var(--green)" />
          </div>
          <div>
            <div className="artifact-title">EMAIL SEQUENCES</div>
            <div className="artifact-subtitle">DRIP SEQUENCES · OUTREACH ENGINE</div>
          </div>
        </div>
        <div className="artifact-badge badge-active">● ACTIVE</div>
      </div>

      <div className="seq-stats">
        <div className="seq-stat">
          <Mail size={16} color="var(--text-3)" />
          <div className="seq-stat-value">{data.leads.length}</div>
          <div className="seq-stat-label">Live Campaigns</div>
        </div>
        <div className="seq-stat accent-ember">
          <div className="seq-stat-value">{replyRate}</div>
          <div className="seq-stat-label">Avg Reply Rate</div>
        </div>
        <div className="seq-stat accent-green">
          <div className="seq-stat-value">{meetings}</div>
          <div className="seq-stat-label">Meetings Booked</div>
        </div>
      </div>

      {selectedLead ? (
        <div className="search-config">
          <div className="search-label">Selected prospect</div>
          <div className="seq-name">{selectedLead.name}</div>
          <div className="seq-meta">
            {[selectedLead.role, selectedLead.company, selectedLead.email].filter(Boolean).join(" · ")}
          </div>

          <div className="section-header mt-5">COMPOSER</div>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="search-textarea"
            placeholder="Subject"
          />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="search-textarea"
            rows={6}
            placeholder="Write your email..."
          />
          <div className="search-controls">
            <button type="button" className="count-btn" onClick={() => void generateDraft()}>
              {loading ? "DRAFTING..." : "DRAFT EMAIL"}
            </button>
            <button type="button" className="find-btn" onClick={() => void sendDraft()} disabled={sending || !body.trim()}>
              {sending ? "SENDING..." : "SEND NOW →"}
            </button>
          </div>
        </div>
      ) : null}

      {data.leads.length ? (
        <>
          <div className="section-header mt-6">LIVE ACTIVITY THREAD</div>
          <div className="activity-thread">
            {data.leads.slice(0, 8).map((lead) => (
              <button
                key={lead.id}
                type="button"
                className="prospect-row"
                onClick={() => setSelectedLeadId(lead.id)}
              >
                <div className="prospect-avatar">{lead.name[0]}</div>
                <div className="prospect-info">
                  <div className="prospect-name">{lead.name}</div>
                  <div className="prospect-meta">
                    {[lead.role, lead.company].filter(Boolean).join(" · ")}
                  </div>
                  <div className="prospect-touch">
                    {lead.email_sent_at ? "Email sent" : lead.email_draft ? "Draft ready" : "Needs first touch"}
                  </div>
                </div>
                <div className="prospect-right">
                  <span
                    className={`temperature-badge temp-${
                      lead.status === "qualified"
                        ? "hot"
                        : lead.status === "replied"
                          ? "warming"
                          : "neutral"
                    }`}
                  >
                    {lead.status === "qualified"
                      ? "HOT"
                      : lead.status === "replied"
                        ? "WARMING"
                        : "NEUTRAL"}
                  </span>
                  <span className="prospect-time">{lead.email_sent_at ? "sent" : "queued"}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}

export default SequencesArtifact;
