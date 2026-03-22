"use client";

import { useState, useMemo } from "react";
import {
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Send,
  Check,
  Newspaper,
} from "lucide-react";
import type { WeeklyBriefing, BriefingAction } from "@/types/finance";
import LoadingShimmer from "@/components/ui/LoadingShimmer";
import { cn } from "@/lib/utils";

interface BriefingArtifactProps {
  briefing: WeeklyBriefing | null;
  allBriefings: WeeklyBriefing[];
  isLoading: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
  onSendToSlack: () => void;
}

const URGENCY_CONFIG: Record<BriefingAction["urgency"], { color: string; bg: string; label: string }> = {
  now: {
    color: "text-[var(--ember)]",
    bg: "bg-[rgba(255,107,53,0.1)] border-[rgba(255,107,53,0.2)]",
    label: "Now",
  },
  "this-week": {
    color: "text-[var(--amber)]",
    bg: "bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.2)]",
    label: "This week",
  },
  monitor: {
    color: "text-[var(--cyan)]",
    bg: "bg-[rgba(6,182,212,0.1)] border-[rgba(6,182,212,0.2)]",
    label: "Monitor",
  },
};

function formatWeekOf(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getWeekNumber(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const weekNum = Math.ceil(diff / oneWeek);
  return `Week ${weekNum} of ${date.getFullYear()}`;
}

export function BriefingArtifact({
  briefing,
  allBriefings,
  isLoading,
  isGenerating,
  onGenerate,
  onSendToSlack,
}: BriefingArtifactProps) {
  const [viewIndex, setViewIndex] = useState(0);

  const activeBriefing = useMemo(() => {
    if (allBriefings.length > 0 && viewIndex < allBriefings.length) {
      return allBriefings[viewIndex];
    }
    return briefing;
  }, [allBriefings, viewIndex, briefing]);

  if (isLoading) {
    return (
      <div className="panel p-6 flex flex-col gap-6 anim-fade-in">
        <LoadingShimmer className="h-8 w-1/3 rounded" />
        <LoadingShimmer className="h-20 w-full rounded" />
        <div className="grid grid-cols-2 gap-4">
          <LoadingShimmer className="h-28 rounded" />
          <LoadingShimmer className="h-28 rounded" />
        </div>
        <LoadingShimmer className="h-40 w-full rounded" />
      </div>
    );
  }

  if (!activeBriefing) {
    return (
      <div className="panel flex flex-col items-center justify-center py-20 px-5 text-center anim-fade-in">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-hi)] border border-[var(--border-hi)] text-[var(--text-3)]">
          <Newspaper size={24} />
        </div>
        <h3 className="font-comfortaa text-xl font-bold text-[var(--text-1)] mb-2">
          No briefing for this week yet
        </h3>
        <p className="text-[var(--text-3)] font-mono text-[12px] mb-6">Takes about 10 seconds</p>
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 rounded bg-[var(--violet)] px-5 py-2.5 text-[13px] font-mono text-white hover:brightness-110 transition-all disabled:opacity-40"
        >
          {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Generate briefing
        </button>
      </div>
    );
  }

  const DirectionIcon = ({ direction, invert }: { direction: string; invert?: boolean }) => {
    if (direction === "up") {
      return invert ? (
        <TrendingUp size={20} className="text-[var(--ember)]" />
      ) : (
        <TrendingUp size={20} className="text-[var(--green)]" />
      );
    }
    if (direction === "down") {
      return invert ? (
        <TrendingDown size={20} className="text-[var(--green)]" />
      ) : (
        <TrendingDown size={20} className="text-[var(--ember)]" />
      );
    }
    return <Minus size={20} className="text-[var(--text-3)]" />;
  };

  return (
    <div className="panel flex flex-col overflow-hidden anim-fade-in bg-[var(--surface)] relative">
      {/* ── GENERATING OVERLAY ── */}
      {isGenerating && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--background)]/80 backdrop-blur-sm">
          <Loader2 size={32} className="animate-spin text-[var(--violet)] mb-4" />
          <h3 className="font-display text-[16px] text-[var(--text-1)] mb-1">Generating your briefing...</h3>
          <p className="font-mono text-[12px] text-[var(--text-3)]">Analysing your financial data</p>
        </div>
      )}

      {/* ── TOOLBAR ── */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 bg-[var(--surface-hi)]">
        <div className="font-display text-[15px] text-[var(--text-1)]">
          Week of {formatWeekOf(activeBriefing.week_of)}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className="button-ghost px-3 py-1.5 text-[12px] flex items-center gap-2"
          >
            <RefreshCw size={12} />
            Regenerate
          </button>
          <button
            type="button"
            onClick={onSendToSlack}
            disabled={!!activeBriefing.sent_to_slack}
            className={cn(
              "px-3 py-1.5 text-[12px] font-mono rounded flex items-center gap-2 transition-all",
              activeBriefing.sent_to_slack
                ? "bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] text-emerald-500 cursor-default"
                : "bg-[var(--violet)] text-white hover:brightness-110"
            )}
          >
            {activeBriefing.sent_to_slack ? (
              <>
                <Check size={12} /> Sent to Slack
              </>
            ) : (
              <>
                <Send size={12} /> Send to Slack
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── WEEK NAVIGATION ── */}
      {allBriefings.length > 1 && (
        <div className="flex items-center justify-center gap-4 border-b border-[var(--border)] py-2 px-6 bg-[var(--background)]">
          <button
            type="button"
            onClick={() => setViewIndex((i) => Math.min(i + 1, allBriefings.length - 1))}
            disabled={viewIndex >= allBriefings.length - 1}
            className="p-1 text-[var(--text-3)] hover:text-[var(--text-1)] disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-2)]">
            {getWeekNumber(activeBriefing.week_of)}
          </span>
          <button
            type="button"
            onClick={() => setViewIndex((i) => Math.max(i - 1, 0))}
            disabled={viewIndex <= 0}
            className="p-1 text-[var(--text-3)] hover:text-[var(--text-1)] disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── BODY ── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Section 1 — Week Summary */}
        <div className="text-[15px] leading-relaxed text-[var(--text-1)] font-comfortaa">
          {activeBriefing.week_summary}
        </div>

        {/* Section 2 — Revenue & Burn */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Revenue */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-3">Revenue</div>
            <div className="flex items-center gap-3 mb-2">
              <DirectionIcon direction={activeBriefing.revenue_update.direction} />
              <span
                className={cn(
                  "font-display text-[22px] font-bold",
                  activeBriefing.revenue_update.direction === "up"
                    ? "text-[var(--green)]"
                    : activeBriefing.revenue_update.direction === "down"
                    ? "text-[var(--ember)]"
                    : "text-[var(--text-1)]"
                )}
              >
                {(activeBriefing.revenue_update.change_percent ?? 0) > 0 ? "+" : ""}
                {(activeBriefing.revenue_update.change_percent ?? 0).toFixed(1)}%
              </span>
            </div>
            <p className="text-[12px] text-[var(--text-2)] leading-relaxed">{activeBriefing.revenue_update.insight}</p>
          </div>

          {/* Burn */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-3">Burn Rate</div>
            <div className="flex items-center gap-3 mb-2">
              <DirectionIcon direction={activeBriefing.burn_update.direction} invert />
              <span
                className={cn(
                  "font-display text-[22px] font-bold",
                  activeBriefing.burn_update.direction === "down"
                    ? "text-[var(--green)]"
                    : activeBriefing.burn_update.direction === "up"
                    ? "text-[var(--ember)]"
                    : "text-[var(--text-1)]"
                )}
              >
                {(activeBriefing.burn_update.change_percent ?? 0) > 0 ? "+" : ""}
                {(activeBriefing.burn_update.change_percent ?? 0).toFixed(1)}%
              </span>
            </div>
            <p className="text-[12px] text-[var(--text-2)] leading-relaxed">{activeBriefing.burn_update.insight}</p>
          </div>
        </div>

        {/* Section 3 — Top 3 Actions */}
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-4">
            This week&apos;s actions
          </div>
          <div className="space-y-3">
            {(activeBriefing.top_3_actions || [])
              .sort((a, b) => {
                const order = { now: 0, "this-week": 1, monitor: 2 };
                return order[a.urgency] - order[b.urgency];
              })
              .map((item, i) => {
                const config = URGENCY_CONFIG[item.urgency];
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-4"
                  >
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest border",
                        config.bg,
                        config.color
                      )}
                    >
                      {config.label}
                    </span>
                    <span className="text-[13px] text-[var(--text-1)] leading-relaxed">{item.action}</span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Section 4 — Wins & Watch Out */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Wins */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--green)] mb-3">Wins</div>
            <ul className="space-y-2">
              {(activeBriefing.wins || []).map((w, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-[var(--text-2)] leading-relaxed">
                  <span className="text-[var(--green)] mt-0.5">✓</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Watch Out */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber)] mb-3">Watch out</div>
            <ul className="space-y-2">
              {(activeBriefing.watch_out || []).map((w, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-[var(--text-2)] leading-relaxed">
                  <span className="text-[var(--amber)] mt-0.5">⚠</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Section 5 — Forecast */}
        <div className="border-t border-[var(--border)] pt-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-3">Outlook</div>
          <div className="rounded-lg bg-[rgba(123,97,255,0.05)] border border-[rgba(123,97,255,0.1)] px-5 py-4">
            <p className="text-[14px] italic text-[var(--text-1)] leading-relaxed">
              {activeBriefing.one_line_forecast}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
