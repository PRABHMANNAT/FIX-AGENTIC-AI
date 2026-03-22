"use client";

import { Loader2, MessageSquare, AlertTriangle, Clock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Insight {
  id: string;
  insight_text: string;
  category: string;
  severity: string;
  generated_at: string;
}

interface SlackInsightsProps {
  insights: Insight[];
  unansweredCount: number;
  isConnected: boolean;
  isLoading: boolean;
  lastSynced: string | null;
  onConnect: () => void;
  onSync: () => void;
  isSyncing?: boolean;
  userId?: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    high: "bg-[rgba(255,107,53,0.12)] border border-[rgba(255,107,53,0.25)] text-[var(--ember)]",
    medium: "bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.25)] text-[var(--amber)]",
    low: "bg-[rgba(6,182,212,0.12)] border border-[rgba(6,182,212,0.25)] text-[var(--cyan)]",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest",
        styles[severity] || styles.low
      )}
    >
      {severity}
    </span>
  );
}

function BorderAccent({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    high: "var(--ember)",
    medium: "var(--amber)",
    low: "var(--cyan)",
  };
  return (
    <div
      className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l"
      style={{ background: colors[severity] || "var(--border)" }}
    />
  );
}

export function SlackInsights({
  insights,
  unansweredCount,
  isConnected,
  isLoading,
  lastSynced,
  onConnect,
  onSync,
  isSyncing = false,
}: SlackInsightsProps) {
  // LOADING STATE
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-2">
          Slack Insights
        </div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-4 space-y-3 animate-pulse"
          >
            <div className="flex justify-between">
              <div className="h-3 w-24 rounded bg-[var(--border)]" />
              <div className="h-3 w-12 rounded bg-[var(--border)]" />
            </div>
            <div className="h-4 w-full rounded bg-[var(--border)]" />
            <div className="h-4 w-3/4 rounded bg-[var(--border)]" />
            <div className="h-3 w-16 rounded bg-[var(--border)]" />
          </div>
        ))}
      </div>
    );
  }

  // NOT CONNECTED STATE
  if (!isConnected) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8">
        <div className="panel flex flex-col items-center p-8 max-w-sm text-center space-y-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-hi)]">
            <MessageSquare size={22} className="text-[var(--text-3)]" />
          </div>
          <div>
            <h3 className="font-display text-[17px] text-[var(--text-1)] mb-2">
              Connect Slack to watch your team
            </h3>
            <p className="font-mono text-[11px] text-[var(--text-3)] leading-relaxed">
              See unanswered questions, keyword spikes, and workload patterns.
              Read-only — we never post or modify anything.
            </p>
          </div>
          <button
            type="button"
            onClick={onConnect}
            className="rounded bg-[var(--violet)] px-5 py-2.5 text-[13px] font-mono text-white hover:brightness-110 transition-all"
          >
            Connect Slack
          </button>
          <p className="font-mono text-[10px] text-[var(--text-3)]">
            Read-only access · No posting
          </p>
        </div>
      </div>
    );
  }

  // CONNECTED STATE
  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto h-full">
      {/* SECTION 1 — Unanswered threads alert */}
      {unansweredCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border-l-2 border-[var(--amber)] bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.15)] p-4">
          <Clock size={15} className="text-[var(--amber)] shrink-0 mt-0.5" />
          <div>
            <div className="text-[13px] text-[var(--text-1)] font-display">
              {unansweredCount} question{unansweredCount !== 1 ? "s" : ""} unanswered in the last 24 hours
            </div>
            <div className="font-mono text-[10px] text-[var(--text-3)] mt-0.5">
              These may be blocking your team
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2 — Insight cards */}
      <div>
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-3">
          Workflow insights
        </h3>

        {insights.length === 0 ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-6 text-center">
            <p className="font-mono text-[12px] text-[var(--text-3)]">
              No insights yet — sync to analyze your Slack activity
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="relative rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-4 pl-5 space-y-2 overflow-hidden"
              >
                <BorderAccent severity={insight.severity} />

                {/* Top row */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)]">
                    {capitalize(insight.category)}
                  </span>
                  <SeverityBadge severity={insight.severity} />
                </div>

                {/* Body */}
                <p className="text-[13px] text-[var(--text-1)] leading-relaxed">
                  {insight.insight_text}
                </p>

                {/* Footer */}
                <div className="font-mono text-[10px] text-[var(--text-3)]">
                  {timeAgo(insight.generated_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3 — Footer bar */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
        <span className="font-mono text-[10px] text-[var(--text-3)]">
          {lastSynced ? `Last synced ${timeAgo(lastSynced)}` : "Never synced"}
        </span>
        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing}
          className="flex items-center gap-1.5 button-ghost px-3 py-1.5 text-[11px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSyncing ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <RefreshCw size={11} />
          )}
          Sync now
        </button>
      </div>
    </div>
  );
}
