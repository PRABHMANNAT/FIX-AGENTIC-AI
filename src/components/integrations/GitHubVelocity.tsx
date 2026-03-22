"use client";

import { useState } from "react";
import { Loader2, Github, RefreshCw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Metrics {
  total_commits_30_days: number;
  commits_by_author: Record<string, number>;
  bus_factor_percent: number;
  open_prs: number;
  stale_prs: number;
  stale_pr_titles: string[];
  avg_pr_merge_hours: number;
  days_since_last_commit: number;
  repos_analyzed: string[];
}

interface Insight {
  insight_text: string;
  category: string;
  severity: string;
}

interface GitHubVelocityProps {
  metrics: Metrics | null;
  insights: Insight[];
  velocityScore?: number;
  isConnected: boolean;
  isLoading: boolean;
  lastSynced: string | null;
  onConnect: () => void;
  onSync: () => void;
  isSyncing?: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function VelocityLabel({ score }: { score: number }) {
  if (score >= 80)
    return <span style={{ color: "var(--green)" }}>Shipping fast</span>;
  if (score >= 60)
    return <span style={{ color: "var(--cyan)" }}>Steady pace</span>;
  if (score >= 40)
    return <span style={{ color: "var(--amber)" }}>Slowing down</span>;
  return <span style={{ color: "var(--ember)" }}>Velocity issue</span>;
}

function scoreColor(score: number): string {
  if (score >= 80) return "var(--green)";
  if (score >= 60) return "var(--cyan)";
  if (score >= 40) return "var(--amber)";
  return "var(--ember)";
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    high: "text-[var(--ember)] bg-[rgba(255,107,53,0.1)] border-[rgba(255,107,53,0.25)]",
    medium: "text-[var(--amber)] bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.25)]",
    low: "text-[var(--cyan)] bg-[rgba(6,182,212,0.1)] border-[rgba(6,182,212,0.25)]",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest border",
        styles[severity] || styles.low
      )}
    >
      {severity}
    </span>
  );
}

export function GitHubVelocity({
  metrics,
  insights,
  velocityScore = 50,
  isConnected,
  isLoading,
  lastSynced,
  onConnect,
  onSync,
  isSyncing = false,
}: GitHubVelocityProps) {
  // LOADING STATE
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-5 space-y-3 animate-pulse"
          >
            <div className="h-6 w-28 rounded bg-[var(--border)]" />
            <div className="h-3 w-full rounded bg-[var(--border)]" />
            <div className="h-3 w-3/4 rounded bg-[var(--border)]" />
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
            <Github size={22} className="text-[var(--text-3)]" />
          </div>
          <div>
            <h3 className="font-display text-[17px] text-[var(--text-1)] mb-2">
              Connect GitHub to track shipping velocity
            </h3>
            <p className="font-mono text-[11px] text-[var(--text-3)] leading-relaxed">
              See commit pace, PR review times, and bus factor risk.
              Read-only access.
            </p>
          </div>
          <button
            type="button"
            onClick={onConnect}
            className="flex items-center gap-2 rounded bg-[var(--violet)] px-5 py-2.5 text-[13px] font-mono text-white hover:brightness-110 transition-all"
          >
            <Github size={14} /> Connect GitHub
          </button>
          <p className="font-mono text-[10px] text-[var(--text-3)]">
            Read-only · No code access
          </p>
        </div>
      </div>
    );
  }

  const m = metrics;
  if (!m) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-mono text-[12px] text-[var(--text-3)]">
          Sync in progress...
        </p>
      </div>
    );
  }

  // Sort authors by commit count
  const sortedAuthors = Object.entries(m.commits_by_author).sort(
    ([, a], [, b]) => b - a
  );

  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto h-full">
      {/* SECTION 1 — Velocity score hero */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-5 text-center space-y-1.5">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)]">
          Engineering velocity
        </div>
        <div
          className="font-display text-[56px] font-bold leading-none"
          style={{ color: scoreColor(velocityScore) }}
        >
          {velocityScore}
        </div>
        <div className="font-mono text-[11px] uppercase tracking-widest">
          <VelocityLabel score={velocityScore} />
        </div>
      </div>

      {/* SECTION 2 — 4 key metric cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-4">
          <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-3)] mb-1">
            Commits (30d)
          </div>
          <div className="font-display text-[22px] font-bold text-[var(--cyan)]">
            {m.total_commits_30_days}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-4">
          <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-3)] mb-1">
            Open PRs
          </div>
          <div className="font-display text-[22px] font-bold text-[var(--text-1)]">
            {m.open_prs}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-4">
          <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-3)] mb-1">
            Stale PRs
          </div>
          <div
            className="font-display text-[22px] font-bold"
            style={{ color: m.stale_prs > 0 ? "var(--amber)" : "var(--green)" }}
          >
            {m.stale_prs}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-4">
          <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-3)] mb-1">
            Days since commit
          </div>
          <div
            className="font-display text-[22px] font-bold"
            style={{
              color:
                m.days_since_last_commit > 7
                  ? "var(--ember)"
                  : m.days_since_last_commit > 3
                  ? "var(--amber)"
                  : "var(--green)",
            }}
          >
            {m.days_since_last_commit === 999 ? "—" : m.days_since_last_commit}
          </div>
        </div>
      </div>

      {/* SECTION 3 — Stale PRs list */}
      {m.stale_prs > 0 && m.stale_pr_titles.length > 0 && (
        <div>
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-2">
            PRs needing attention
          </h3>
          <div className="space-y-2">
            {m.stale_pr_titles.map((title, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] px-3 py-2"
              >
                <span className="text-[12px] text-[var(--text-1)] truncate">
                  {title.length > 80 ? title.substring(0, 80) + "…" : title}
                </span>
                <span className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest border text-[var(--amber)] bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.25)] shrink-0">
                  Stale
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4 — Contributor breakdown */}
      {sortedAuthors.length > 0 && (
        <div>
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-2">
            Contribution distribution
          </h3>
          <div className="space-y-2">
            {sortedAuthors.map(([author, count]) => {
              const pct =
                m.total_commits_30_days > 0
                  ? (count / m.total_commits_30_days) * 100
                  : 0;
              return (
                <div key={author} className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-[var(--text-2)] w-24 truncate shrink-0">
                    {author}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--violet)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-[var(--text-3)] w-8 text-right shrink-0">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          {m.bus_factor_percent > 70 && (
            <div className="mt-3 rounded-lg border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.06)] p-3 flex items-start gap-2">
              <AlertTriangle
                size={13}
                className="text-[var(--amber)] shrink-0 mt-0.5"
              />
              <span className="font-mono text-[11px] text-[var(--amber)]">
                Bus factor risk: {m.bus_factor_percent}% of commits from one
                person
              </span>
            </div>
          )}
        </div>
      )}

      {/* SECTION 5 — Repos analyzed */}
      {m.repos_analyzed && m.repos_analyzed.length > 0 && (
        <div className="font-mono text-[10px] text-[var(--text-3)]">
          Analyzing:{" "}
          <span className="text-[var(--text-2)]">
            {m.repos_analyzed.join(", ")}
          </span>
        </div>
      )}

      {/* SECTION 6 — Insight cards */}
      {insights && insights.length > 0 && (
        <div>
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-2">
            Engineering insights
          </h3>
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <div
                key={i}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-3)]">
                    {(insight.category || "").replace("github:", "")}
                  </span>
                  <SeverityBadge severity={insight.severity} />
                </div>
                <p className="text-[12px] text-[var(--text-1)] leading-relaxed">
                  {insight.insight_text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 7 — Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
        <span className="font-mono text-[10px] text-[var(--text-3)]">
          {lastSynced ? `Last synced ${timeAgo(lastSynced)}` : "Never synced"}
        </span>
        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing}
          className={cn(
            "flex items-center gap-1.5 button-ghost px-3 py-1.5 text-[11px]",
            isSyncing && "opacity-50 cursor-not-allowed"
          )}
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
