"use client";

import { useMemo, useState } from "react";
import { Download, AlertTriangle, RefreshCcw, Loader2, PlayCircle, BarChart3, TrendingUp, Presentation, ChevronDown, ChevronUp } from "lucide-react";
import { useFinanceExport } from "@/hooks/useFinanceExport";
import type { CashFlowProjection, CashFlowScenario } from "@/types/finance";
import { MetricCard } from "@/components/ui/MetricCard";
import LoadingShimmer from "@/components/ui/LoadingShimmer";
import { cn } from "@/lib/utils";

interface CashFlowArtifactProps {
  projection: CashFlowProjection | null;
  documentId: string;
  isLoading: boolean;
  onRecalculate: (assumptions: { revenue_growth_rate: number; expense_growth_rate: number }) => void;
}

type ScenarioTab = "base" | "best" | "worst";

function fmtINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function fmtLakhs(amount: number): string {
  if (Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  return fmtINR(amount);
}

export function CashFlowArtifact({ projection, documentId, isLoading, onRecalculate }: CashFlowArtifactProps) {
  const [activeTab, setActiveTab] = useState<ScenarioTab>("base");
  const [isAssumptionsOpen, setIsAssumptionsOpen] = useState(false);
  const [revGrowth, setRevGrowth] = useState<number>(5);
  const [expGrowth, setExpGrowth] = useState<number>(2);

  const { triggerDownload, isLoading: isExporting, error: exportError } = useFinanceExport({ documentId, fileBaseName: "Cash_Flow_Projection" });

  // Update slider local state if new projection loads
  useMemo(() => {
    if (projection) {
      setRevGrowth(projection.assumptions.base_revenue_growth_rate);
      setExpGrowth(projection.assumptions.base_expense_growth_rate);
    }
  }, [projection]);

  if (isLoading) {
    return (
      <div className="panel p-6 flex flex-col gap-6 anim-fade-in">
        <LoadingShimmer className="h-8 w-1/3 rounded" />
        <div className="flex gap-2 border-b border-[var(--border)] pb-2">
          <LoadingShimmer className="h-6 w-20 rounded" />
          <LoadingShimmer className="h-6 w-20 rounded" />
          <LoadingShimmer className="h-6 w-20 rounded" />
        </div>
        <LoadingShimmer className="h-64 w-full rounded" />
        <LoadingShimmer className="h-40 w-full rounded" />
      </div>
    );
  }

  if (!projection) {
    return (
      <div className="panel flex flex-col items-center justify-center py-20 px-5 text-center anim-fade-in">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-hi)] border border-[var(--border-hi)] text-[var(--text-3)]">
          <BarChart3 size={24} />
        </div>
        <h3 className="font-comfortaa text-xl font-bold text-[var(--text-1)] mb-2">
          Ask the Finance Agent to generate a cash flow projection
        </h3>
        <p className="text-[var(--text-2)] max-w-sm mb-6 font-mono text-[13px] leading-relaxed">
          Type the prompt below into the chat to get started.
        </p>
        <div className="rounded border border-[var(--border)] bg-[var(--surface-hi)] px-4 py-2 text-[13px] font-mono text-[var(--text-1)]">
          "Generate a 6-month cash flow projection"
        </div>
      </div>
    );
  }

  const scenarioData = projection[activeTab];

  // ── SVG Chart Data Calculation ──
  const chartProps = (() => {
    const months = scenarioData.months;
    if (!months || months.length === 0) return null;

    let minVal = 0;
    let maxVal = 0;

    months.forEach((m) => {
      minVal = Math.min(minVal, m.revenue, m.expenses, m.cash_balance);
      maxVal = Math.max(maxVal, m.revenue, m.expenses, m.cash_balance);
    });

    // Add padding to range
    const range = maxVal - minVal;
    maxVal += range * 0.1 || 100;
    minVal -= range * 0.1 || 100;

    const w = 800;
    const h = 260;
    const pt = 20, pb = 40, pl = 60, pr = 30; // padding
    const gw = w - pl - pr;
    const gh = h - pt - pb;

    const mapY = (val: number) => pt + gh - ((val - minVal) / (maxVal - minVal)) * gh;
    const mapX = (idx: number) => pl + (idx / (months.length - 1)) * gw;

    const revPoints = months.map((m, i) => `${mapX(i)},${mapY(m.revenue)}`).join(" L ");
    const expPoints = months.map((m, i) => `${mapX(i)},${mapY(m.expenses)}`).join(" L ");
    const cashPoints = months.map((m, i) => `${mapX(i)},${mapY(m.cash_balance)}`).join(" L ");

    return { w, h, pt, pb, pl, pr, gw, gh, mapX, mapY, revPoints, expPoints, cashPoints, months, minVal, maxVal };
  })();

  const handleRecalculateClick = () => {
    onRecalculate({ revenue_growth_rate: revGrowth, expense_growth_rate: expGrowth });
  };

  const finalCashBalance = scenarioData.months.length > 0 ? scenarioData.months[scenarioData.months.length - 1].cash_balance : 0;

  return (
    <div className="panel flex flex-col overflow-hidden anim-fade-in bg-[var(--surface)]">
      
      {/* ── TOOLBAR ── */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 bg-[var(--surface-hi)]">
        <div>
          <h2 className="font-display font-medium text-[16px] text-[var(--text-1)]">Cash Flow Projection</h2>
          <div className="font-mono text-[10px] text-[var(--text-3)] mt-1 tracking-widest uppercase">
            Generated {new Date(projection.generated_at).toLocaleDateString()}
          </div>
        </div>
        <div className="flex gap-2">
          {exportError("xlsx") && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[rgba(255,107,53,0.1)] border border-[rgba(255,107,53,0.2)] text-[var(--ember)] font-mono text-[11px]">
              <AlertTriangle size={12} />
              <span>{exportError("xlsx")}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsAssumptionsOpen(!isAssumptionsOpen)}
            className="button-ghost px-3 py-1.5 text-[12px] flex flex-row gap-2"
          >
            {isAssumptionsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Assumptions
          </button>
          <button
            type="button"
            onClick={() => triggerDownload("xlsx")}
            disabled={isExporting("xlsx")}
            className="button-ghost px-3 py-1.5 text-[12px] flex items-center gap-2"
          >
            {isExporting("xlsx") ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            Download XLSX
          </button>
        </div>
      </div>

      {/* ── ASSUMPTIONS PANEL ── */}
      {isAssumptionsOpen && (
        <div className="border-b border-[var(--border)] bg-[rgba(123,97,255,0.03)] p-5 grid grid-cols-1 md:grid-cols-2 gap-8 anim-slide-down">
          <div className="flex flex-col gap-4">
            <h4 className="system-label text-[11px] uppercase tracking-widest text-[var(--text-3)]">
              Base Scenario Assumptions
            </h4>
            
            <div className="flex flex-col gap-2">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-[var(--text-2)]">Monthly revenue growth</span>
                <span className="text-[var(--green)]">+{revGrowth}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={revGrowth}
                onChange={(e) => setRevGrowth(Number(e.target.value))}
                className="w-full h-1 bg-[var(--border-hi)] rounded-lg appearance-none cursor-pointer accent-[var(--green)]"
                style={{ background: `linear-gradient(to right, var(--green) ${(revGrowth/30)*100}%, var(--border-hi) ${(revGrowth/30)*100}%)` }}
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-[var(--text-2)]">Monthly expense growth</span>
                <span className="text-[var(--amber)]">+{expGrowth}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={expGrowth}
                onChange={(e) => setExpGrowth(Number(e.target.value))}
                className="w-full h-1 bg-[var(--border-hi)] rounded-lg appearance-none cursor-pointer accent-[var(--amber)]"
                style={{ background: `linear-gradient(to right, var(--amber) ${(expGrowth/20)*100}%, var(--border-hi) ${(expGrowth/20)*100}%)` }}
              />
            </div>
          </div>
          
          <div className="flex flex-col justify-end gap-3">
            <button
              type="button"
              onClick={handleRecalculateClick}
              className="button bg-[var(--violet)] text-white hover:brightness-110 flex items-center justify-center gap-2 self-start w-full sm:w-auto"
            >
              <RefreshCcw size={14} />
              Recalculate
            </button>
            <span className="font-mono text-[10px] text-[var(--text-3)]">
              Recalculating calls the Finance Agent model — takes ~10 seconds.
            </span>
          </div>
        </div>
      )}

      {/* ── TABS ── */}
      <div className="flex border-b border-[var(--border)] px-4 pt-2">
        {(["base", "best", "worst"] as ScenarioTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-5 py-3 font-mono text-[12px] uppercase tracking-widest relative transition-colors",
              activeTab === tab ? "text-[var(--text-1)]" : "text-[var(--text-3)] hover:text-[var(--text-2)]"
            )}
          >
            {tab} Case
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--violet)]" />
            )}
          </button>
        ))}
      </div>

      <div className="p-6 flex flex-col gap-8">
        {/* ── CHART ── */}
        <div className="border border-[var(--border)] rounded-lg p-5 bg-[var(--surface-hi)]">
          <div className="flex gap-4 mb-4 font-mono text-[11px] text-[var(--text-2)] justify-center uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--green)]" /> Revenue</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--amber)]" /> Expenses</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--cyan)]" /> Cash Balance</span>
          </div>
          <div className="overflow-x-auto">
            {chartProps ? (
              <svg viewBox={`0 0 ${chartProps.w} ${chartProps.h}`} className="w-full text-[var(--text-3)]" style={{ minWidth: 600, height: 260 }}>
                {/* Y Axis Ref Lines */}
                <line x1={chartProps.pl} y1={chartProps.pt} x2={chartProps.w - chartProps.pr} y2={chartProps.pt} stroke="var(--border)" strokeDasharray="4 4" />
                <line x1={chartProps.pl} y1={chartProps.pt + chartProps.gh/2} x2={chartProps.w - chartProps.pr} y2={chartProps.pt + chartProps.gh/2} stroke="var(--border)" strokeDasharray="4 4" />
                <line x1={chartProps.pl} y1={chartProps.h - chartProps.pb} x2={chartProps.w - chartProps.pr} y2={chartProps.h - chartProps.pb} stroke="var(--border)" />
                
                {/* Y Axis Labels */}
                <text x={chartProps.pl - 10} y={chartProps.pt + 4} textAnchor="end" fill="currentColor" fontSize="10">{fmtLakhs(chartProps.maxVal)}</text>
                <text x={chartProps.pl - 10} y={chartProps.pt + chartProps.gh/2 + 4} textAnchor="end" fill="currentColor" fontSize="10">{fmtLakhs((chartProps.maxVal + chartProps.minVal) / 2)}</text>
                <text x={chartProps.pl - 10} y={chartProps.h - chartProps.pb + 4} textAnchor="end" fill="currentColor" fontSize="10">{fmtLakhs(chartProps.minVal)}</text>

                {/* X Axis vertical line for today (assumes first projected month is index 3 if we have 3 hist months) */}
                {chartProps.months.length > 3 && (
                  <line x1={chartProps.mapX(2.5)} y1={chartProps.pt} x2={chartProps.mapX(2.5)} y2={chartProps.h - chartProps.pb} stroke="currentColor" strokeDasharray="2 2" opacity="0.5" />
                )}

                {/* Lines */}
                <path d={`M ${chartProps.cashPoints}`} fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinejoin="round" />
                <path d={`M ${chartProps.revPoints}`} fill="none" stroke="var(--green)" strokeWidth="2" strokeLinejoin="round" />
                <path d={`M ${chartProps.expPoints}`} fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinejoin="round" />

                {/* X Axis Labels */}
                {chartProps.months.map((m, i) => (
                  <g key={i}>
                    {/* Dots for cash balance */}
                    <circle cx={chartProps.mapX(i)} cy={chartProps.mapY(m.cash_balance)} r="3" fill="var(--surface)" stroke="var(--cyan)" strokeWidth="1.5" />
                    
                    {/* Text labels every other month if dense */}
                    {(chartProps.months.length <= 8 || i % 2 === 0 || i === chartProps.months.length - 1) && (
                      <text x={chartProps.mapX(i)} y={chartProps.h - chartProps.pb + 20} textAnchor="middle" fill="currentColor" fontSize="10">
                        {m.month.split(" ")[0]}
                      </text>
                    )}

                    {/* Annotations */}
                    {scenarioData.break_even_month === m.month && (
                      <g transform={`translate(${chartProps.mapX(i)}, ${chartProps.mapY(m.net_cash_flow) - 15})`}>
                        <circle cx="0" cy="0" r="4" fill="var(--green)" />
                        <text x="0" y="-10" textAnchor="middle" fill="var(--green)" fontSize="10" fontWeight="bold">BE</text>
                      </g>
                    )}
                    {scenarioData.runway_end_month === m.month && (
                      <g transform={`translate(${chartProps.mapX(i)}, ${chartProps.mapY(m.cash_balance) + 20})`}>
                        <circle cx="0" cy="0" r="4" fill="var(--ember)" />
                        <text x="0" y="15" textAnchor="middle" fill="var(--ember)" fontSize="10" fontWeight="bold">Out of cash</text>
                      </g>
                    )}
                  </g>
                ))}
              </svg>
            ) : (
              <div className="flex h-[260px] items-center justify-center text-[var(--text-3)] font-mono text-sm">Insufficient data points</div>
            )}
          </div>
        </div>

        {/* ── TABLE ── */}
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-left font-mono text-[12px] whitespace-nowrap">
            <thead className="bg-[var(--background)] border-b border-[var(--border)] text-[var(--text-3)] text-[10px] uppercase tracking-widest">
              <tr>
                <th className="px-4 py-3 font-medium">Month</th>
                <th className="px-4 py-3 font-medium text-right">Revenue</th>
                <th className="px-4 py-3 font-medium text-right">Expenses</th>
                <th className="px-4 py-3 font-medium text-right">Net Cash Flow</th>
                <th className="px-4 py-3 font-medium text-right">Cash Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--surface-hi)]">
              {scenarioData.months.map((m, i) => {
                const isHistorical = i < 3; // Given the prompt assumes 3 hist months
                return (
                  <tr key={m.month} className={cn("transition-colors hover:bg-[var(--surface)]", isHistorical && "opacity-60")}>
                    <td className="px-4 py-3 text-[var(--text-1)]">{m.month}{isHistorical && " (Hist)"}</td>
                    <td className="px-4 py-3 text-[var(--green)] text-right">{fmtINR(m.revenue)}</td>
                    <td className="px-4 py-3 text-[var(--amber)] text-right">{fmtINR(m.expenses)}</td>
                    <td className={cn("px-4 py-3 text-right font-medium", m.net_cash_flow > 0 ? "text-[var(--green)]" : m.net_cash_flow < 0 ? "text-[var(--ember)]" : "text-[var(--text-2)]")}>
                      {m.net_cash_flow > 0 ? "+" : ""}{fmtINR(m.net_cash_flow)}
                    </td>
                    <td className={cn("px-4 py-3 text-right font-bold", m.cash_balance <= 0 ? "text-[var(--ember)]" : "text-[var(--text-1)]")}>
                      {fmtINR(m.cash_balance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── METRICS & INSIGHTS ── */}
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              label="Break-even"
              value={scenarioData.break_even_month || (finalCashBalance > 0 && scenarioData.months.every(m => m.net_cash_flow > 0) ? "Already Profitable" : "No Break-even")}
              tone={scenarioData.break_even_month ? "green" : "amber"}
            />
            <MetricCard
              label="Runway End"
              value={scenarioData.runway_end_month || "Beyond Projection"}
              tone={scenarioData.runway_end_month ? "amber" : "green"}
            />
            <MetricCard
              label="Final Cash Balance"
              value={fmtINR(finalCashBalance)}
              tone={finalCashBalance > 0 ? "cyan" : "amber"}
            />
          </div>

          <div className="rounded-lg bg-[rgba(123,97,255,0.05)] border border-[rgba(123,97,255,0.1)] p-5 space-y-4">
            <div className="font-comfortaa text-[14px] leading-relaxed text-[var(--text-1)]">
              {projection.analysis_text}
            </div>
            
            <div className="pt-2">
              <h4 className="system-label text-[11px] uppercase tracking-widest text-[var(--violet)] mb-3">
                Key Recommendations
              </h4>
              <ul className="space-y-2">
                {projection.recommendations.map((rec, i) => (
                  <li key={i} className="flex gap-3 text-[13px] font-syne text-[var(--text-2)] leading-relaxed">
                    <span className="text-[var(--violet)] mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
