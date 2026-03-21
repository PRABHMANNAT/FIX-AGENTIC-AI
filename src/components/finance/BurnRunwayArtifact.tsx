"use client";

import { useState } from "react";
import { Loader2, Plus, Edit2, TrendingDown } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import LoadingShimmer from "@/components/ui/LoadingShimmer";
import type { BurnData } from "@/types/finance";

interface BurnRunwayArtifactProps {
  burnData: BurnData | null;
  isLoading: boolean;
  onOpenInputModal: () => void;
  onUpdate: (data: Partial<BurnData>) => void; // Provided by parent to optimistically UI-update
}

function fmtINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function BurnRunwayArtifact({
  burnData,
  isLoading,
  onOpenInputModal,
  onUpdate,
}: BurnRunwayArtifactProps) {
  const [scenarioSlider, setScenarioSlider] = useState<number>(0);

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="panel p-6 flex flex-col gap-6 anim-fade-in">
        <div className="flex flex-col items-center justify-center gap-2 py-8">
          <LoadingShimmer className="h-12 w-48 rounded" />
          <LoadingShimmer className="h-4 w-32 rounded mt-2" />
          <LoadingShimmer className="h-6 w-20 rounded-full mt-4" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <LoadingShimmer className="h-24 w-full rounded" />
          <LoadingShimmer className="h-24 w-full rounded" />
        </div>
        <div className="flex flex-col gap-3 mt-4">
          <LoadingShimmer className="h-4 w-full rounded" />
          <LoadingShimmer className="h-4 w-full rounded" />
        </div>
      </div>
    );
  }

  // ── Empty state (null) ──
  if (!burnData) {
    return (
      <div className="panel flex flex-col items-center justify-center py-20 px-5 text-center anim-fade-in">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-hi)] border border-[var(--border-hi)] text-[var(--text-3)]">
          <TrendingDown size={24} />
        </div>
        <h3 className="font-comfortaa text-xl font-bold text-[var(--text-1)] mb-2">
          Calculate your runway
        </h3>
        <p className="text-[var(--text-2)] max-w-sm mb-8 font-mono text-[13px] leading-relaxed">
          Add your cash balance and monthly expenses to calculate how many months of runway you have left.
        </p>
        <button
          type="button"
          onClick={onOpenInputModal}
          className="button flex items-center gap-2"
        >
          <Plus size={14} />
          Enter figures
        </button>
      </div>
    );
  }

  // ── Connected state processing ──
  const alertColors = {
    healthy: "var(--green)",
    warning: "var(--amber)",
    critical: "var(--ember)",
  };
  const alertLabels = {
    healthy: "Healthy",
    warning: "Running low",
    critical: "Critical",
  };
  const alertColor = alertColors[burnData.alert_level];
  const alertLabel = alertLabels[burnData.alert_level];

  // Scenario Math
  const scenarioReductionMultiplier = 1 - scenarioSlider / 100;
  const scenarioNetBurn = burnData.gross_burn * scenarioReductionMultiplier - burnData.monthly_revenue;
  const scenarioRunway = scenarioNetBurn > 0 ? (burnData.cash_balance / scenarioNetBurn) : 999;
  const displayedScenarioRunway = scenarioRunway === 999 ? "∞" : scenarioRunway.toFixed(1);

  return (
    <div className="panel flex flex-col overflow-hidden anim-fade-in">
      {/* ── Section 1: Hero Runway ── */}
      <div className="flex flex-col items-center justify-center border-b border-[var(--border)] py-12 px-5 text-center bg-[var(--surface)]">
        <h1 className="font-display text-[56px] leading-none tracking-tight mb-2" style={{ color: "var(--text-1)" }}>
          {burnData.runway_months === 999 ? "∞" : burnData.runway_months.toFixed(1)}
          <span className="text-[24px] ml-2 font-comfortaa font-medium text-[var(--text-3)] tracking-normal">months</span>
        </h1>
        <p className="font-mono text-[13px] text-[var(--text-3)] mb-6 tracking-wide">
          {burnData.runway_months === 999 ? "Runway is effectively infinite" : `Runway ends ${burnData.runway_date}`}
        </p>
        
        {/* Status Pill */}
        <span
          className="inline-flex items-center rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-widest"
          style={{
            border: `1px solid ${alertColor}40`,
            color: alertColor,
            background: `${alertColor}15`,
          }}
        >
          {alertLabel}
        </span>
      </div>

      {/* ── Section 2: Metric Cards ── */}
      <div className="grid grid-cols-2 divide-x divide-y-0 divide-[var(--border)] border-b border-[var(--border)] bg-[var(--surface-hi)]">
        <MetricCard
          label="Gross Burn"
          value={fmtINR(burnData.gross_burn)}
          changeLabel="/ month"
          tone="amber"
          className="border-0 rounded-none bg-transparent"
        />
        <MetricCard
          label="Net Burn"
          value={burnData.net_burn <= 0 ? "Profitable" : fmtINR(burnData.net_burn)}
          changeLabel={burnData.net_burn <= 0 ? "" : "/ month"}
          tone={burnData.net_burn <= 0 ? "green" : "amber"}
          className="border-0 rounded-none bg-transparent"
        />
      </div>

      <div className="p-6 flex flex-col gap-8">
        
        {/* ── Section 3: Expense Breakdown ── */}
        <div className="flex flex-col gap-4">
          <h4 className="system-label text-[11px] uppercase tracking-widest text-[var(--text-3)]">
            Monthly Expenses
          </h4>
          <div className="flex flex-col gap-4">
            {burnData.monthly_expenses.length === 0 ? (
              <p className="font-mono text-[12px] text-[var(--text-3)]">No expenses inputted.</p>
            ) : (
              burnData.monthly_expenses.map((exp, i) => {
                const pct = burnData.gross_burn > 0 ? (exp.amount / burnData.gross_burn) * 100 : 0;
                return (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-[var(--text-2)]">{exp.category}</span>
                      <span className="text-[var(--text-1)]">{fmtINR(exp.amount)}</span>
                    </div>
                    {/* Progress Bar Container */}
                    <div className="h-1.5 w-full rounded-full bg-[var(--border-hi)] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: "var(--violet)" }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Section 4: Scenario Calculator ── */}
        {burnData.net_burn > 0 && (
          <div className="flex flex-col gap-4 p-5 rounded-lg border border-[var(--border-hi)] bg-[rgba(255,255,255,0.02)]">
            <h4 className="system-label text-[11px] uppercase tracking-widest text-[var(--text-3)]">
              What if I reduce expenses?
            </h4>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <span className="font-mono text-[11px] text-[var(--text-2)]">0%</span>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={scenarioSlider}
                  onChange={(e) => setScenarioSlider(Number(e.target.value))}
                  className="w-full h-1 bg-[var(--border-hi)] rounded-lg appearance-none cursor-pointer accent-[var(--green)]"
                  style={{
                    background: `linear-gradient(to right, var(--green) ${scenarioSlider * 2}%, var(--border-hi) ${scenarioSlider * 2}%)`
                  }}
                />
                <span className="font-mono text-[11px] text-[var(--green)]">{scenarioSlider}%</span>
              </div>
              <p className="font-mono text-[12px] text-[var(--text-2)]">
                Reducing expenses by <strong className="text-[var(--text-1)] font-medium">{scenarioSlider}%</strong> extends runway to <strong className="text-[var(--green)] font-medium">{displayedScenarioRunway} months</strong>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Section 5: Footer Action ── */}
      <div className="border-t border-[var(--border)] p-4 flex justify-end bg-[var(--surface-hi)]">
        <button
          type="button"
          onClick={onOpenInputModal}
          className="button-ghost flex items-center gap-2 text-[11px] px-4 py-2"
          style={{ borderColor: "rgba(255,255,255,0.15)" }}
        >
          <Edit2 size={12} />
          Update figures
        </button>
      </div>
    </div>
  );
}
