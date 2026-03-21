"use client";

import { RefreshCw, ShieldCheck, AlertTriangle, ArrowUpRight, X } from "lucide-react";
import type { Anomaly, AnomalyStatus, AnomalySeverity } from "@/types/finance";
import LoadingShimmer from "@/components/ui/LoadingShimmer";
import { cn } from "@/lib/utils";

interface AnomalyFeedProps {
  anomalies: Anomaly[];
  isLoading: boolean;
  onStatusChange: (id: string, status: AnomalyStatus) => void;
  onRefresh: () => void;
}

function fmtINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const SEVERITY_STYLES: Record<AnomalySeverity, { border: string; badge: string; badgeBg: string }> = {
  high: {
    border: "border-l-[var(--ember)]",
    badge: "text-[var(--ember)]",
    badgeBg: "bg-[rgba(255,107,53,0.1)] border-[rgba(255,107,53,0.2)]",
  },
  medium: {
    border: "border-l-[var(--amber)]",
    badge: "text-[var(--amber)]",
    badgeBg: "bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.2)]",
  },
  low: {
    border: "border-l-[var(--cyan)]",
    badge: "text-[var(--cyan)]",
    badgeBg: "bg-[rgba(6,182,212,0.1)] border-[rgba(6,182,212,0.2)]",
  },
};

export function AnomalyFeed({ anomalies, isLoading, onStatusChange, onRefresh }: AnomalyFeedProps) {
  const newCount = anomalies.filter((a) => a.status === "new").length;

  if (isLoading) {
    return (
      <div className="panel p-6 flex flex-col gap-4 anim-fade-in">
        <LoadingShimmer className="h-8 w-1/3 rounded" />
        <LoadingShimmer className="h-28 w-full rounded" />
        <LoadingShimmer className="h-28 w-full rounded" />
        <LoadingShimmer className="h-28 w-full rounded" />
      </div>
    );
  }

  return (
    <div className="panel flex flex-col overflow-hidden anim-fade-in bg-[var(--surface)]">
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 bg-[var(--surface-hi)]">
        <div className="flex items-center gap-3">
          <h2 className="font-display font-medium text-[16px] text-[var(--text-1)]">Anomaly Alerts</h2>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest border",
              newCount > 0
                ? "bg-[rgba(255,107,53,0.1)] border-[rgba(255,107,53,0.2)] text-[var(--ember)]"
                : "bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.2)] text-emerald-500"
            )}
          >
            {newCount > 0 ? `${newCount} new` : "0 new"}
          </span>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="button-ghost px-3 py-1.5 text-[12px] flex items-center gap-2"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 overflow-y-auto p-6">
        {anomalies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] text-emerald-500">
              <ShieldCheck size={24} />
            </div>
            <h3 className="font-comfortaa text-lg font-bold text-[var(--text-1)] mb-1">All clear</h3>
            <p className="font-mono text-[12px] text-[var(--text-3)]">
              No anomalies detected in your financial data
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {anomalies.map((a) => {
              const style = SEVERITY_STYLES[a.severity];
              const isDismissed = a.status === "dismissed";
              const direction = a.deviation_percent > 0 ? "above" : "below";

              return (
                <div
                  key={a.id}
                  className={cn(
                    "rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] border-l-[3px] transition-opacity",
                    style.border,
                    isDismissed && "opacity-50"
                  )}
                >
                  <div className="p-5 space-y-3">
                    {/* TOP ROW */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-display text-[14px] font-medium text-[var(--text-1)] capitalize">
                          {a.metric.replace(/_/g, " ")}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--text-3)]">
                          {timeAgo(a.detected_at)}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest border",
                          style.badgeBg,
                          style.badge
                        )}
                      >
                        {a.severity}
                      </span>
                    </div>

                    {/* DEVIATION */}
                    <div className="font-mono text-[13px] text-[var(--text-1)]">
                      <span className="capitalize">{a.metric.replace(/_/g, " ")}</span> is{" "}
                      <span className={style.badge}>{Math.abs(a.deviation_percent).toFixed(1)}%</span>{" "}
                      {direction} expected
                    </div>
                    <div className="font-mono text-[11px] text-[var(--text-3)]">
                      Current: {fmtINR(a.current_value)} &nbsp;|&nbsp; Expected: {fmtINR(a.expected_value)}
                    </div>

                    {/* EXPLANATION */}
                    <p className="text-[13px] text-[var(--text-2)] leading-relaxed">{a.explanation}</p>

                    {/* RECOMMENDED ACTION */}
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-1">
                        Suggested action
                      </div>
                      <p className="text-[13px] text-[var(--text-1)]">{a.recommended_action}</p>
                    </div>

                    {/* FOOTER */}
                    {isDismissed ? (
                      <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] pt-1">
                        Dismissed
                      </div>
                    ) : a.status === "new" ? (
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => onStatusChange(a.id, "dismissed")}
                          className="button-ghost px-3 py-1.5 text-[11px] flex items-center gap-1.5"
                        >
                          <X size={12} /> Dismiss
                        </button>
                        <button
                          type="button"
                          onClick={() => onStatusChange(a.id, "seen")}
                          className="flex items-center gap-1.5 rounded bg-[var(--violet)] px-3 py-1.5 text-[11px] font-mono text-white hover:brightness-110 transition-all"
                        >
                          Investigate <ArrowUpRight size={12} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
