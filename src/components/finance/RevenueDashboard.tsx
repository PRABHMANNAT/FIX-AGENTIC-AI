"use client";

import { useMemo } from "react";
import { Loader2, RefreshCcw, ExternalLink } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import LoadingShimmer from "@/components/ui/LoadingShimmer";

interface RevenueData {
  mrr: number;
  arr: number;
  churn_rate: number;
  runway_months: number;
  cash_balance: number;
  burn_rate: number;
  new_mrr: number;
  expansion_mrr: number;
  contraction_mrr: number;
  churned_mrr: number;
  net_new_mrr: number;
  mrr_history: Array<{ month: string; mrr: number }>;
  last_synced_at: string;
}

interface RevenueDashboardProps {
  data: RevenueData | null;
  isConnected: boolean;
  isLoading: boolean;
  isSyncing?: boolean;
  onSyncNow: () => void;
  onConnectStripe: () => void;
}

function fmtINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function RevenueDashboard({
  data,
  isConnected,
  isLoading,
  isSyncing,
  onSyncNow,
  onConnectStripe,
}: RevenueDashboardProps) {
  // ── SVF Line Chart Logic ──
  const chartProps = useMemo(() => {
    if (!data?.mrr_history || data.mrr_history.length === 0) return null;
    const history = data.mrr_history;
    const minMrr = Math.min(...history.map((h) => h.mrr), 0);
    const maxMrr = Math.max(...history.map((h) => h.mrr), 100); // at least 100 to avoid /0

    // viewBox setup
    const w = 800;
    const h = 250;
    const padTop = 30;
    const padBottom = 40;
    const padLeft = 20;
    const padRight = 50;

    const graphW = w - padLeft - padRight;
    const graphH = h - padTop - padBottom;

    const points = history.map((item, i) => {
      const x = padLeft + (i / (history.length - 1)) * graphW;
      const y = padTop + graphH - ((item.mrr - minMrr) / (maxMrr - minMrr)) * graphH;
      return { x, y, item };
    });

    const pathData = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;
    const lastPoint = points[points.length - 1];

    return { w, h, points, pathData, lastPoint, padBottom };
  }, [data]);

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {/* Metric Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="panel p-5 flex flex-col gap-3">
              <LoadingShimmer className="h-2.5 w-16" />
              <LoadingShimmer className="h-8 w-28" />
            </div>
          ))}
        </div>
        {/* Chart Skeleton */}
        <div className="panel p-6 h-[320px] flex items-center justify-center">
          <Loader2 className="animate-spin text-[var(--border-hi)]" size={24} />
        </div>
      </div>
    );
  }

  // ── Not connected state ──
  if (!isConnected || !data) {
    return (
      <div className="panel flex flex-col items-center justify-center py-20 px-5 text-center anim-fade-in">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-hi)] border border-[var(--border-hi)] text-[var(--text-3)]">
          <ExternalLink size={24} />
        </div>
        <h3 className="font-comfortaa text-xl font-bold text-[var(--text-1)] mb-2">
          Connect Stripe to see your revenue
        </h3>
        <p className="text-[var(--text-2)] max-w-sm mb-8 font-mono text-[13px] leading-relaxed">
          Read-only access. We process your billing data to instantly calculate MRR, Churn, and Expansion. We never touch your payouts.
        </p>
        <button
          type="button"
          onClick={onConnectStripe}
          className="button flex items-center gap-2"
        >
          Connect Stripe
        </button>
      </div>
    );
  }

  // ── Connected state ──
  const netNewColor = data.net_new_mrr >= 0 ? "var(--green)" : "var(--ember)";
  const netNewPrefix = data.net_new_mrr >= 0 ? "+" : "−";

  return (
    <div className="flex flex-col gap-5 anim-fade-in">
      {/* ── Section 1: Top Metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="MRR"
          value={fmtINR(data.mrr)}
          tone="green"
        />
        <MetricCard
          label="ARR"
          value={fmtINR(data.arr)}
          tone="green"
        />
        <MetricCard
          label="Churn Rate"
          value={`${data.churn_rate}%`}
          tone="amber"
          changeLabel="last 30d"
        />
        <MetricCard
          label="Runway"
          value={data.runway_months > 0 ? `${data.runway_months} mo` : "—"}
          tone="cyan"
        />
      </div>

      {/* ── Section 2: MRR Growth Chart ── */}
      <div className="panel overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-4 flex items-center justify-between">
          <h4 className="system-label">MRR Growth</h4>
        </div>
        <div className="p-5 font-mono text-[10px] uppercase tracking-wider overflow-x-auto">
          {chartProps ? (
            <svg
              viewBox={`0 0 ${chartProps.w} ${chartProps.h}`}
              className="w-full text-[var(--text-3)]"
              style={{ minWidth: 600, height: 250, display: "block" }}
            >
              {/* Reference Grid */}
              <line x1={0} y1={chartProps.h - chartProps.padBottom} x2={chartProps.w} y2={chartProps.h - chartProps.padBottom} stroke="var(--border)" strokeWidth={1} />
              
              {/* Path */}
              <path
                d={chartProps.pathData}
                fill="none"
                stroke="var(--green)"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />

              {/* Data points and labels */}
              {chartProps.points.map((p, i) => (
                <g key={i}>
                  {/* Point */}
                  <circle cx={p.x} cy={p.y} r={i === chartProps.points.length - 1 ? 4 : 2} fill={i === chartProps.points.length - 1 ? "var(--green)" : "var(--surface)"} stroke="var(--green)" strokeWidth={1.5} />
                  
                  {/* X Axis Label - Show every other one to prevent crowding if there are 12 */}
                  {(i % 2 === 0 || i === chartProps.points.length - 1) && (
                    <text
                      x={p.x}
                      y={chartProps.h - chartProps.padBottom + 20}
                      textAnchor="middle"
                      fill="currentColor"
                    >
                      {p.item.month.split(" ")[0]} {/* Just show short month */}
                    </text>
                  )}
                </g>
              ))}

              {/* Tooltip on last point */}
              <text
                x={chartProps.lastPoint.x}
                y={chartProps.lastPoint.y - 15}
                textAnchor="middle"
                fill="var(--text-1)"
                fontSize="12"
                fontWeight="bold"
              >
                {fmtINR(chartProps.lastPoint.item.mrr)}
              </text>
            </svg>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-[var(--text-3)]">
              Not enough data for chart
            </div>
          )}
        </div>
      </div>

      {/* ── Section 3: MRR Movement (This Month) ── */}
      <div className="panel overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h4 className="system-label">MRR Movements (Last 30 Days)</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--border)]">
          <div className="bg-[var(--surface)] p-5 flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase text-[var(--text-3)] tracking-widest">New</span>
            <span className="font-display text-[16px] text-[var(--green)]">+{fmtINR(data.new_mrr)}</span>
          </div>
          <div className="bg-[var(--surface)] p-5 flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase text-[var(--text-3)] tracking-widest">Expansion</span>
            <span className="font-display text-[16px] text-[var(--green)]">+{fmtINR(data.expansion_mrr)}</span>
          </div>
          <div className="bg-[var(--surface)] p-5 flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase text-[var(--text-3)] tracking-widest">Contraction</span>
            <span className="font-display text-[16px] text-[var(--amber)]">−{fmtINR(data.contraction_mrr)}</span>
          </div>
          <div className="bg-[var(--surface)] p-5 flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase text-[var(--text-3)] tracking-widest">Churned</span>
            <span className="font-display text-[16px] text-[var(--ember)]">−{fmtINR(data.churned_mrr)}</span>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-[var(--border)] bg-[var(--surface-hi)]">
          <div className="flex items-center gap-2">
            <span className="system-label">Net New MRR:</span>
            <span className="font-display text-[16px]" style={{ color: netNewColor }}>
              {netNewPrefix} {fmtINR(Math.abs(data.net_new_mrr))}
            </span>
          </div>
        </div>
      </div>

      {/* ── Section 4: Footer Bar ── */}
      <div className="flex items-center justify-between text-[var(--text-3)] font-mono text-[11px]">
        <div>
          Last synced: {data.last_synced_at ? new Date(data.last_synced_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : "Never"}
        </div>
        <button
          type="button"
          onClick={onSyncNow}
          disabled={isSyncing}
          className="flex items-center gap-2 hover:text-[var(--text-1)] transition-colors"
        >
          {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
          {isSyncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>

    </div>
  );
}
