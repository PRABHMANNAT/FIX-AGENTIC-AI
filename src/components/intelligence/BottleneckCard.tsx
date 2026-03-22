"use client";

import { cn } from "@/lib/utils";

interface Blocker {
  title: string;
  description: string;
  signals: string[];
  recommended_action: string;
  estimated_weekly_cost_hours: number;
}

interface BottleneckCardProps {
  blocker: Blocker;
  rank: number;
}

function CostBadge({ hours }: { hours: number }) {
  const style =
    hours >= 10
      ? "text-[var(--ember)] bg-[rgba(255,107,53,0.1)] border-[rgba(255,107,53,0.25)]"
      : hours >= 5
      ? "text-[var(--amber)] bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.25)]"
      : "text-[var(--cyan)] bg-[rgba(6,182,212,0.1)] border-[rgba(6,182,212,0.25)]";

  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest border",
        style
      )}
    >
      {hours}h/week
    </span>
  );
}

export function BottleneckCard({ blocker, rank }: BottleneckCardProps) {
  return (
    <div className="relative rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-4 pl-5 space-y-3 overflow-hidden">
      {/* Left danger accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l bg-[var(--ember)]" />

      {/* Top row */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[18px] font-bold text-[var(--text-3)]">
          #{rank}
        </span>
        <CostBadge hours={blocker.estimated_weekly_cost_hours} />
      </div>

      {/* Title */}
      <div className="font-display text-[14px] font-bold text-[var(--text-1)]">
        {blocker.title}
      </div>

      {/* Description */}
      <p className="text-[12px] text-[var(--text-2)] leading-relaxed">
        {blocker.description}
      </p>

      {/* Signals row */}
      {blocker.signals && blocker.signals.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-3)]">
            Evidence:
          </span>
          {blocker.signals.map((signal, i) => (
            <span
              key={i}
              className="rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--text-2)]"
            >
              {signal}
            </span>
          ))}
        </div>
      )}

      {/* Recommended action */}
      <div className="rounded-lg bg-[var(--surface)] border border-[var(--border)] p-3 space-y-1">
        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-3)] font-bold">
          Action
        </span>
        <p className="text-[12px] text-[var(--text-1)] leading-relaxed">
          {blocker.recommended_action}
        </p>
      </div>
    </div>
  );
}
