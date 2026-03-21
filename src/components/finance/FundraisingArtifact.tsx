"use client";

import { useState, useCallback } from "react";
import { Loader2, RefreshCw, Copy, Check, Download, ArrowRight } from "lucide-react";
import type { FundraisingScore, FundraisingStage, FundraisingMetric } from "@/types/finance";
import { useFinanceExport } from "@/hooks/useFinanceExport";
import LoadingShimmer from "@/components/ui/LoadingShimmer";
import { cn } from "@/lib/utils";

interface FundraisingArtifactProps {
  score: FundraisingScore | null;
  documentId: string | null;
  isLoading: boolean;
  isScoring: boolean;
  selectedStage: FundraisingStage;
  onStageChange: (stage: FundraisingStage) => void;
  onRecalculate: () => void;
}

const STAGES: { key: FundraisingStage; label: string }[] = [
  { key: "pre-seed", label: "Pre-Seed" },
  { key: "seed", label: "Seed" },
  { key: "series-a", label: "Series A" },
  { key: "series-b", label: "Series B" },
];

const STATUS_STYLES: Record<FundraisingMetric["status"], { color: string; bg: string; barColor: string }> = {
  strong: {
    color: "text-[var(--green)]",
    bg: "bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.2)]",
    barColor: "var(--green)",
  },
  meets: {
    color: "text-[var(--cyan)]",
    bg: "bg-[rgba(6,182,212,0.1)] border-[rgba(6,182,212,0.2)]",
    barColor: "var(--cyan)",
  },
  gap: {
    color: "text-[var(--amber)]",
    bg: "bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.2)]",
    barColor: "var(--amber)",
  },
  critical: {
    color: "text-[var(--ember)]",
    bg: "bg-[rgba(255,107,53,0.1)] border-[rgba(255,107,53,0.2)]",
    barColor: "var(--ember)",
  },
};

const GRADE_STYLES: Record<string, string> = {
  A: "text-[var(--green)] bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.3)]",
  B: "text-[var(--cyan)] bg-[rgba(6,182,212,0.1)] border-[rgba(6,182,212,0.3)]",
  C: "text-[var(--amber)] bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.3)]",
  D: "text-[var(--ember)] bg-[rgba(255,107,53,0.1)] border-[rgba(255,107,53,0.3)]",
  F: "text-[var(--ember)] bg-[rgba(255,107,53,0.15)] border-[rgba(255,107,53,0.4)]",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const LOWER_IS_BETTER = ["Burn Multiple", "Monthly Churn Rate"];

export function FundraisingArtifact({
  score,
  documentId,
  isLoading,
  isScoring,
  selectedStage,
  onStageChange,
  onRecalculate,
}: FundraisingArtifactProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const exportHook = useFinanceExport({ documentId: documentId || "", fileBaseName: "Fundraising_Report" });

  const copyToClipboard = useCallback((text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }, []);

  if (isLoading) {
    return (
      <div className="panel p-6 flex flex-col gap-6 anim-fade-in">
        <LoadingShimmer className="h-10 w-1/3 rounded" />
        <LoadingShimmer className="h-32 w-full rounded" />
        <LoadingShimmer className="h-40 w-full rounded" />
      </div>
    );
  }

  // ── Scoring Overlay ──
  if (isScoring) {
    return (
      <div className="panel flex flex-col items-center justify-center py-32 text-center anim-fade-in">
        <Loader2 size={36} className="animate-spin text-[var(--violet)] mb-5" />
        <h3 className="font-display text-[18px] text-[var(--text-1)] mb-2">Analysing your metrics...</h3>
        <p className="font-mono text-[12px] text-[var(--text-3)]">
          Comparing against {selectedStage} benchmarks
        </p>
      </div>
    );
  }

  // ── Null State ──
  if (!score) {
    return (
      <div className="panel flex flex-col items-center justify-center py-20 px-5 text-center anim-fade-in">
        <h3 className="font-comfortaa text-xl font-bold text-[var(--text-1)] mb-2">
          Get your fundraising readiness score
        </h3>
        <p className="text-[var(--text-3)] font-mono text-[12px] mb-6 max-w-sm">
          We&apos;ll compare your metrics against {selectedStage} benchmarks using Claude Opus
        </p>
        {/* Stage selector */}
        <div className="flex gap-1 p-1 rounded-lg bg-[var(--background)] border border-[var(--border)] mb-6">
          {STAGES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => onStageChange(s.key)}
              className={cn(
                "px-4 py-2 rounded font-mono text-[11px] uppercase tracking-widest transition-all",
                selectedStage === s.key
                  ? "bg-[var(--violet)] text-white"
                  : "text-[var(--text-3)] hover:text-[var(--text-1)]"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onRecalculate}
          className="flex items-center gap-2 rounded bg-[var(--violet)] px-5 py-2.5 text-[13px] font-mono text-white hover:brightness-110 transition-all"
        >
          Calculate score
        </button>
      </div>
    );
  }

  const readinessLabel = score.stage_readiness === "ready"
    ? `Ready for ${score.stage}`
    : score.stage_readiness === "close"
    ? "Getting close"
    : "Not ready yet";

  const readinessColor = score.stage_readiness === "ready"
    ? "text-[var(--green)]"
    : score.stage_readiness === "close"
    ? "text-[var(--amber)]"
    : "text-[var(--ember)]";

  return (
    <div className="panel flex flex-col overflow-hidden anim-fade-in bg-[var(--surface)]">
      {/* ── Stage Selector (always visible) ── */}
      <div className="flex items-center justify-center gap-1 p-3 border-b border-[var(--border)] bg-[var(--background)]">
        {STAGES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => { onStageChange(s.key); }}
            className={cn(
              "px-4 py-2 rounded font-mono text-[11px] uppercase tracking-widest transition-all",
              selectedStage === s.key
                ? "bg-[var(--violet)] text-white"
                : "text-[var(--text-3)] hover:text-[var(--text-1)]"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="p-6 flex-1 overflow-y-auto space-y-8">
        {/* If stage changed from score.stage, show prompt */}
        {selectedStage !== score.stage && (
          <div className="rounded-lg bg-[rgba(123,97,255,0.05)] border border-[rgba(123,97,255,0.1)] p-4 flex items-center justify-between">
            <span className="text-[13px] text-[var(--text-2)]">Stage changed to {selectedStage}</span>
            <button type="button" onClick={onRecalculate} className="flex items-center gap-2 rounded bg-[var(--violet)] px-3 py-1.5 text-[12px] font-mono text-white hover:brightness-110">
              Recalculate for {selectedStage} <ArrowRight size={12} />
            </button>
          </div>
        )}

        {/* ── Section 1: Hero Score ── */}
        <div className="flex flex-col items-center text-center py-4">
          <div className="font-display text-[64px] font-bold text-[var(--text-1)] leading-none">{score.overall_score}</div>
          <div className="font-mono text-[11px] text-[var(--text-3)] mt-1 mb-3">out of 100</div>
          <span className={cn("rounded-full px-4 py-1.5 font-display text-[20px] font-bold border", GRADE_STYLES[score.grade] || GRADE_STYLES.C)}>
            {score.grade}
          </span>
          <div className={cn("font-mono text-[12px] uppercase tracking-widest mt-3", readinessColor)}>
            {readinessLabel}
          </div>
        </div>

        {/* ── Section 2: Metric Breakdown ── */}
        <div>
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-4">How you compare</h3>
          <div className="space-y-1">
            {score.metrics.map((m, i) => {
              const style = STATUS_STYLES[m.status];
              const isLowerBetter = LOWER_IS_BETTER.includes(m.name);
              return (
                <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-[13px] text-[var(--text-1)]">{m.name}</span>
                      {isLowerBetter && <span className="font-mono text-[9px] text-[var(--text-3)]">(lower is better)</span>}
                    </div>
                    <span className={cn("rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest border", style.bg, style.color)}>
                      {m.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-2 rounded-full bg-[var(--border)]">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(m.score, 100)}%`, backgroundColor: style.barColor }} />
                    </div>
                    <span className="font-mono text-[11px] text-[var(--text-2)] shrink-0">
                      {m.current_value}{m.unit} vs {m.benchmark_value}{m.unit}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-3)] leading-relaxed">{m.advice}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Section 3: Strengths & Gaps ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-5">
            <h4 className="font-mono text-[10px] uppercase tracking-widest text-[var(--green)] mb-3">What&apos;s working</h4>
            <ul className="space-y-2">
              {score.top_strengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-[var(--text-2)] leading-relaxed">
                  <span className="text-[var(--green)] mt-0.5 shrink-0">✓</span><span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-5">
            <h4 className="font-mono text-[10px] uppercase tracking-widest text-[var(--ember)] mb-3">Critical gaps</h4>
            <ul className="space-y-2">
              {score.critical_gaps.map((g, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-[var(--text-2)] leading-relaxed">
                  <span className="text-[var(--ember)] mt-0.5 shrink-0">✗</span><span>{g}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Section 4: Timeline ── */}
        <div className="rounded-lg bg-[rgba(123,97,255,0.05)] border border-[rgba(123,97,255,0.1)] p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-2">Timeline to ready</div>
          <p className="font-comfortaa text-[16px] text-[var(--text-1)]">{score.timeline_to_ready}</p>
        </div>

        {/* ── Section 5: Investor Talking Points ── */}
        <div>
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-4">Lead with these in investor meetings</h3>
          <div className="space-y-3">
            {score.investor_talking_points.map((point, i) => (
              <div key={i} className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-4">
                <p className="text-[13px] text-[var(--text-1)] leading-relaxed flex-1">{point}</p>
                <button
                  type="button"
                  onClick={() => copyToClipboard(point, i)}
                  className="shrink-0 p-2 text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
                  title="Copy"
                >
                  {copiedIdx === i ? <Check size={14} className="text-[var(--green)]" /> : <Copy size={14} />}
                </button>
              </div>
            ))}
          </div>
          {documentId && (
            <button
              type="button"
              onClick={() => exportHook.triggerDownload("pdf")}
              disabled={exportHook.isLoading("pdf")}
              className="mt-4 flex items-center gap-2 rounded bg-[var(--violet)] px-5 py-2.5 text-[13px] font-mono text-white hover:brightness-110 transition-all disabled:opacity-40"
            >
              {exportHook.isLoading("pdf") ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Download full report
            </button>
          )}
        </div>

        {/* ── Section 6: Footer ── */}
        <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
          <span className="font-mono text-[10px] text-[var(--text-3)]">Generated {timeAgo(score.generated_at)}</span>
          <button type="button" onClick={onRecalculate} className="button-ghost px-3 py-1.5 text-[12px] flex items-center gap-2">
            <RefreshCw size={12} /> Recalculate
          </button>
        </div>
      </div>
    </div>
  );
}
