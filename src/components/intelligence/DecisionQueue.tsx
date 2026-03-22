"use client";

import { Loader2, CheckCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Decision {
  source: string;
  source_id: string;
  summary: string;
  days_open: number;
  people_waiting: number;
  impact: string;
  draft_recommendation: string;
}

interface DecisionQueueProps {
  decisions: Decision[];
  total: number;
  isLoading: boolean;
  isScanning: boolean;
  onScan: () => void;
  onResolve: (sourceId: string) => void;
  onDraftRecommendation: (decision: Decision) => void;
}

function ImpactBadge({ impact }: { impact: string }) {
  const styles: Record<string, string> = {
    high: "text-[var(--ember)] bg-[rgba(255,107,53,0.1)] border-[rgba(255,107,53,0.25)]",
    medium:
      "text-[var(--amber)] bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.25)]",
    low: "text-[var(--cyan)] bg-[rgba(6,182,212,0.1)] border-[rgba(6,182,212,0.25)]",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest border",
        styles[impact] || styles.low
      )}
    >
      {impact}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const isSlack = source === "Slack";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest border",
        isSlack
          ? "text-[var(--violet)] bg-[rgba(139,92,246,0.08)] border-[rgba(139,92,246,0.2)]"
          : "text-[var(--text-2)] bg-[var(--surface)] border-[var(--border)]"
      )}
    >
      {source}
    </span>
  );
}

function impactOrder(impact: string): number {
  return impact === "high" ? 0 : impact === "medium" ? 1 : 2;
}

function borderColor(impact: string): string {
  return impact === "high"
    ? "var(--ember)"
    : impact === "medium"
    ? "var(--amber)"
    : "var(--cyan)";
}

export function DecisionQueue({
  decisions,
  total,
  isLoading,
  isScanning,
  onScan,
  onResolve,
  onDraftRecommendation,
}: DecisionQueueProps) {
  // LOADING STATE
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-5 space-y-3 animate-pulse"
          >
            <div className="h-4 w-32 rounded bg-[var(--border)]" />
            <div className="h-3 w-full rounded bg-[var(--border)]" />
            <div className="h-3 w-2/3 rounded bg-[var(--border)]" />
          </div>
        ))}
      </div>
    );
  }

  // Sort: high impact first, then oldest first
  const sorted = [...decisions].sort((a, b) => {
    const impactDiff = impactOrder(a.impact) - impactOrder(b.impact);
    if (impactDiff !== 0) return impactDiff;
    return b.days_open - a.days_open;
  });

  return (
    <div className="flex flex-col gap-4 p-6 overflow-y-auto h-full">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)]">
            Pending decisions
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-mono text-[10px] font-bold border",
              total > 0
                ? "text-[var(--amber)] bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.25)]"
                : "text-[var(--green)] bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.2)]"
            )}
          >
            {total}
          </span>
        </div>
        <button
          type="button"
          onClick={onScan}
          disabled={isScanning}
          className="flex items-center gap-1.5 button-ghost px-3 py-1.5 text-[11px]"
        >
          {isScanning ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <RefreshCw size={11} />
          )}
          Scan now
        </button>
      </div>

      {/* SCANNING STATE */}
      {isScanning && (
        <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-4">
          <Loader2 size={14} className="animate-spin text-[var(--violet)] shrink-0" />
          <span className="font-mono text-[11px] text-[var(--text-2)]">
            Scanning Slack and GitHub for unresolved decisions...
          </span>
        </div>
      )}

      {/* EMPTY STATE */}
      {!isScanning && sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-hi)]">
            <CheckCircle size={18} className="text-[var(--green)]" />
          </div>
          <div className="text-center">
            <div className="font-display text-[14px] text-[var(--text-1)]">
              No pending decisions
            </div>
            <div className="font-mono text-[11px] text-[var(--text-3)] mt-1">
              Your decision queue is clear
            </div>
          </div>
        </div>
      )}

      {/* DECISION LIST */}
      {!isScanning && sorted.length > 0 && (
        <div className="space-y-3">
          {sorted.map((d, i) => (
            <div
              key={`${d.source_id}-${i}`}
              className="relative rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-4 pl-5 space-y-3 overflow-hidden"
            >
              {/* Left border accent */}
              <div
                className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l"
                style={{ background: borderColor(d.impact) }}
              />

              {/* Top row */}
              <div className="flex items-center justify-between gap-2">
                <SourceBadge source={d.source} />
                <ImpactBadge impact={d.impact} />
              </div>

              {/* Summary */}
              <p className="text-[13px] text-[var(--text-1)] leading-relaxed">
                {d.summary}
              </p>

              {/* Meta */}
              <div className="font-mono text-[10px] text-[var(--text-3)]">
                {d.days_open} day{d.days_open !== 1 ? "s" : ""} open ·{" "}
                {d.people_waiting} people waiting
              </div>

              {/* Recommendation */}
              {d.draft_recommendation && (
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-3)] font-bold">
                    Suggested:{" "}
                  </span>
                  <span className="text-[11px] text-[var(--text-2)]">
                    {d.draft_recommendation}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onResolve(d.source_id)}
                  className="button-ghost px-3 py-1.5 text-[11px]"
                >
                  Mark resolved
                </button>
                <button
                  type="button"
                  onClick={() => onDraftRecommendation(d)}
                  className="flex items-center gap-1.5 rounded bg-[var(--violet)] px-3 py-1.5 text-[11px] font-mono text-white hover:brightness-110 transition-all"
                >
                  Draft response ↗
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
