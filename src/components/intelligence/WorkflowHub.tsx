"use client";

import { Loader2, Activity, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { BottleneckCard } from "./BottleneckCard";
import { CrossSignalInsight } from "./CrossSignalInsight";

interface Analysis {
  overall_health_score: number;
  score_rationale: string;
  top_3_blockers: Array<{
    title: string;
    description: string;
    signals: string[];
    recommended_action: string;
    estimated_weekly_cost_hours: number;
  }>;
  positive_signals: string[];
  one_priority: string;
  missing_signals: string[];
  cross_signal_pattern: string;
}

interface DataSourcesUsed {
  finance: boolean;
  slack: boolean;
  github: boolean;
  calendar: boolean;
}

interface WorkflowHubProps {
  analysis: Analysis | null;
  dataSourcesUsed: DataSourcesUsed;
  isLoading: boolean;
  isAnalyzing: boolean;
  lastAnalyzed: string | null;
  onRunAnalysis: () => void;
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

function ScoreStatus({ score }: { score: number }) {
  if (score >= 85)
    return (
      <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--green)]">
        Business is thriving
      </span>
    );
  if (score >= 70)
    return (
      <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--cyan)]">
        Healthy with minor issues
      </span>
    );
  if (score >= 50)
    return (
      <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--amber)]">
        Meaningful problems detected
      </span>
    );
  if (score >= 30)
    return (
      <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--ember)]">
        Significant issues across areas
      </span>
    );
  return (
    <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--ember)]">
      Critical — needs immediate attention
    </span>
  );
}

function ScoreColor(score: number): string {
  if (score >= 85) return "var(--green)";
  if (score >= 70) return "var(--cyan)";
  if (score >= 50) return "var(--amber)";
  return "var(--ember)";
}

function DataSourceDot({ connected, label }: { connected: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={cn(
          "w-2 h-2 rounded-full",
          connected ? "bg-[var(--green)]" : "bg-[var(--border)]"
        )}
      />
      <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-3)]">
        {label}
      </span>
    </div>
  );
}

export function WorkflowHub({
  analysis,
  dataSourcesUsed,
  isLoading,
  isAnalyzing,
  lastAnalyzed,
  onRunAnalysis,
}: WorkflowHubProps) {
  // LOADING STATE
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-6 space-y-3 animate-pulse"
          >
            <div className="h-8 w-24 rounded bg-[var(--border)] mx-auto" />
            <div className="h-3 w-full rounded bg-[var(--border)]" />
            <div className="h-3 w-3/4 rounded bg-[var(--border)] mx-auto" />
          </div>
        ))}
      </div>
    );
  }

  // ANALYZING STATE
  if (isAnalyzing) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 gap-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-hi)]">
          <Loader2 size={24} className="animate-spin text-[var(--violet)]" />
        </div>
        <div className="text-center">
          <div className="font-display text-[16px] text-[var(--text-1)] mb-1">
            Analyzing all your business signals...
          </div>
          <div className="font-mono text-[11px] text-[var(--text-3)]">
            Checking finance, team, and time data
          </div>
        </div>
      </div>
    );
  }

  // NULL STATE — no analysis yet
  if (!analysis) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8">
        <div className="panel flex flex-col items-center p-8 max-w-sm text-center space-y-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-hi)]">
            <Activity size={22} className="text-[var(--violet)]" />
          </div>
          <div>
            <h3 className="font-display text-[17px] text-[var(--text-1)] mb-2">
              Run your first business intelligence analysis
            </h3>
            <p className="font-mono text-[11px] text-[var(--text-3)] leading-relaxed">
              We'll analyze all connected data sources — finance, team
              communication, shipping velocity, and time allocation — to surface
              what's actually blocking your growth.
            </p>
          </div>

          {/* Data sources status */}
          <div className="flex items-start gap-6 py-3 border-t border-b border-[var(--border)] w-full justify-center">
            <DataSourceDot connected={true} label="Finance" />
            <DataSourceDot connected={dataSourcesUsed.slack} label="Slack" />
            <DataSourceDot connected={dataSourcesUsed.calendar} label="Calendar" />
            <DataSourceDot connected={dataSourcesUsed.github} label="GitHub" />
          </div>

          <button
            type="button"
            onClick={onRunAnalysis}
            className="w-full rounded bg-[var(--violet)] px-5 py-3 text-[14px] font-mono text-white hover:brightness-110 transition-all"
          >
            Run analysis
          </button>
          <p className="font-mono text-[10px] text-[var(--text-3)]">
            Takes about 10 seconds
          </p>
        </div>
      </div>
    );
  }

  // MAIN ANALYSIS VIEW
  const scoreColor = ScoreColor(analysis.overall_health_score);

  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto h-full">
      {/* SECTION 1 — Health Score Hero */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-6 text-center space-y-2">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)]">
          Business health score
        </div>
        <div
          className="font-display text-[72px] font-bold leading-none"
          style={{ color: scoreColor }}
        >
          {analysis.overall_health_score}
        </div>
        <ScoreStatus score={analysis.overall_health_score} />
        {analysis.score_rationale && (
          <p className="font-mono text-[10px] text-[var(--text-3)] max-w-xs mx-auto leading-relaxed">
            {analysis.score_rationale}
          </p>
        )}
      </div>

      {/* SECTION 2 — One Priority */}
      {analysis.one_priority && (
        <div className="rounded-lg border-l-2 border-[var(--violet)] bg-[rgba(139,92,246,0.06)] border border-[rgba(139,92,246,0.15)] p-5 space-y-1.5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--violet)]">
            Do this today
          </div>
          <p className="text-[15px] text-[var(--text-1)] leading-relaxed font-display">
            {analysis.one_priority}
          </p>
        </div>
      )}

      {/* SECTION 3 — Top blockers */}
      {analysis.top_3_blockers && analysis.top_3_blockers.length > 0 && (
        <div>
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-3">
            What's blocking you
          </h3>
          <div className="space-y-3">
            {analysis.top_3_blockers.map((blocker, i) => (
              <BottleneckCard key={i} blocker={blocker} rank={i + 1} />
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4 — Cross signal insight */}
      <CrossSignalInsight
        pattern={analysis.cross_signal_pattern || ""}
        missingSignals={analysis.missing_signals || []}
        positiveSignals={analysis.positive_signals || []}
      />

      {/* SECTION 5 — Data sources */}
      <div>
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-3">
          Analysis based on
        </h3>
        <div className="flex items-start gap-6 rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-4 justify-around">
          <DataSourceDot connected={true} label="Finance" />
          <DataSourceDot connected={dataSourcesUsed.slack} label="Slack" />
          <DataSourceDot connected={dataSourcesUsed.calendar} label="Calendar" />
          <DataSourceDot connected={dataSourcesUsed.github} label="GitHub" />
        </div>
      </div>

      {/* SECTION 6 — Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
        <span className="font-mono text-[10px] text-[var(--text-3)]">
          {lastAnalyzed ? `Analyzed ${timeAgo(lastAnalyzed)}` : "Not yet analyzed"}
        </span>
        <button
          type="button"
          onClick={onRunAnalysis}
          className="flex items-center gap-1.5 button-ghost px-3 py-1.5 text-[11px]"
        >
          <RefreshCw size={11} />
          Re-analyze
        </button>
      </div>
    </div>
  );
}
