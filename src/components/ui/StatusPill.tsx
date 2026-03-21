"use client";

import type { LeadStatus } from "@/types";

const labels: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Reached out",
  replied: "Replied",
  qualified: "Interested",
  lost: "Not a fit",
};

export function getStatusLabel(status: LeadStatus) {
  return labels[status];
}

export function StatusPill({ status }: { status: LeadStatus }) {
  return (
    <span className="rounded-md border border-border bg-[#0b0b0b] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-text-secondary">
      {labels[status]}
    </span>
  );
}

export default StatusPill;
