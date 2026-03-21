"use client";

import Link from "next/link";
import { ChevronRight, Mail } from "lucide-react";
import ScoreBar from "@/components/ui/ScoreBar";
import { getStatusLabel, StatusPill } from "@/components/ui/StatusPill";
import type { Lead, LeadStatus } from "@/types";

interface CustomerCardProps {
  customer: Lead;
  onStatusChange?: (leadId: string, status: LeadStatus) => void;
}

const statusOptions: LeadStatus[] = ["new", "contacted", "replied", "qualified", "lost"];

export function CustomerCard({ customer, onStatusChange }: CustomerCardProps) {
  return (
    <article className="panel panel-hover grid-surface flex h-full flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-syne text-base font-medium text-white">
            {customer.name}
            {customer.role ? ` / ${customer.role}` : ""}
          </h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary">
            {[customer.company, customer.location].filter(Boolean).join(" / ") || "Details coming in"}
          </p>
        </div>
        <StatusPill status={customer.status} />
      </div>

      <div className="space-y-3">
        <ScoreBar label="Customer Match" value={customer.icp_score} />
        <ScoreBar label="Ready To Buy" value={customer.intent_score} />
      </div>

      <div className="flex flex-wrap gap-2">
        {customer.signals.map((signal) => (
          <span
            key={signal}
            className="rounded-md border border-border bg-[#111111] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.18em] text-text-secondary"
          >
            {signal}
          </span>
        ))}
      </div>

      {customer.score_reason ? (
        <p className="comfort-copy text-sm leading-relaxed text-text-secondary">{customer.score_reason}</p>
      ) : null}

      <div className="mt-auto space-y-3">
        <label className="block space-y-2">
          <span className="system-label text-text-muted">Status</span>
          <select
            value={customer.status}
            onChange={(event) => onStatusChange?.(customer.id, event.target.value as LeadStatus)}
            className="input-shell w-full"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/email?customer=${customer.id}`}
            aria-disabled={!customer.email}
            className={`button-ghost px-3 py-2 text-[9px] ${!customer.email ? "pointer-events-none opacity-40" : ""}`}
            title={customer.email ? "Write email" : "No email found for this person - try LinkedIn instead."}
          >
            <Mail className="h-3.5 w-3.5" strokeWidth={2} />
            Write Email
          </Link>
          <button
            type="button"
            onClick={() => onStatusChange?.(customer.id, "contacted")}
            className="button-ghost px-3 py-2 text-[9px]"
          >
            Mark As Reached Out
          </button>
          <Link href={`/dashboard/email?customer=${customer.id}`} className="button-ghost px-3 py-2 text-[9px]">
            Details
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default CustomerCard;
