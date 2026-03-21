"use client";

import { useState, useMemo, useRef } from "react";
import { Upload, RefreshCw, ChevronUp, ChevronDown, ArrowDown, ArrowUp } from "lucide-react";
import type { ExpenseReport, CategorizedExpense, ExpenseCategoryName } from "@/types/finance";
import { MetricCard } from "@/components/ui/MetricCard";
import LoadingShimmer from "@/components/ui/LoadingShimmer";
import { cn } from "@/lib/utils";

interface ExpenseArtifactProps {
  report: ExpenseReport | null;
  isLoading: boolean;
  onUploadCSV: (file: File) => void;
  onRefresh: () => void;
}

type TabKey = "all" | "subscriptions" | "category";
type SortField = "date" | "description" | "category" | "amount";
type SortDir = "asc" | "desc";

function fmtINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

const CATEGORY_COLORS: Record<ExpenseCategoryName, string> = {
  Infrastructure: "var(--cyan)",
  "SaaS Tools": "var(--violet)",
  Marketing: "var(--green)",
  People: "var(--amber)",
  Office: "var(--text-2)",
  Legal: "var(--pink)",
  Finance: "var(--green)",
  Miscellaneous: "var(--text-3)",
};

export function ExpenseArtifact({ report, isLoading, onUploadCSV, onRefresh }: ExpenseArtifactProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const PAGE_SIZE = 20;

  const sortedExpenses = useMemo(() => {
    if (!report) return [];
    const arr = [...report.expenses];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      else if (sortField === "description") cmp = a.description.localeCompare(b.description);
      else if (sortField === "category") cmp = a.category.localeCompare(b.category);
      else cmp = a.amount - b.amount;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [report, sortField, sortDir]);

  const pagedExpenses = useMemo(
    () => sortedExpenses.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [sortedExpenses, page]
  );
  const totalPages = Math.ceil(sortedExpenses.length / PAGE_SIZE);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(0);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />;
  };

  if (isLoading) {
    return (
      <div className="panel p-6 flex flex-col gap-6 anim-fade-in">
        <LoadingShimmer className="h-8 w-1/3 rounded" />
        <LoadingShimmer className="h-40 w-full rounded" />
        <LoadingShimmer className="h-40 w-full rounded" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="panel flex flex-col items-center justify-center py-20 px-5 text-center anim-fade-in">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-hi)] border border-[var(--border-hi)] text-[var(--text-3)]">
          <Upload size={24} />
        </div>
        <h3 className="font-comfortaa text-xl font-bold text-[var(--text-1)] mb-2">No expenses categorized yet</h3>
        <div className="flex flex-col items-center gap-4 mt-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded bg-[var(--violet)] px-5 py-2.5 text-[13px] font-mono text-white hover:brightness-110 transition-all"
          >
            <Upload size={14} /> Upload bank statement CSV
          </button>
          <p className="font-mono text-[12px] text-[var(--text-3)]">
            Or ask the Finance Agent: &quot;Categorize my expenses&quot;
          </p>
        </div>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && onUploadCSV(e.target.files[0])} />
      </div>
    );
  }

  return (
    <div className="panel flex flex-col overflow-hidden anim-fade-in bg-[var(--surface)]">
      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && onUploadCSV(e.target.files[0])} />

      {/* ── TOOLBAR ── */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 bg-[var(--surface-hi)]">
        <div className="flex items-center gap-3">
          <h2 className="font-display font-medium text-[16px] text-[var(--text-1)]">Expenses</h2>
          <span className="font-mono text-[11px] text-[var(--text-3)]">{report.expenses.length} items</span>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} className="button-ghost px-3 py-1.5 text-[12px] flex items-center gap-2">
            <Upload size={12} /> Upload CSV
          </button>
          <button type="button" onClick={onRefresh} className="button-ghost px-3 py-1.5 text-[12px] flex items-center gap-2">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex border-b border-[var(--border)] px-4 pt-2">
        {([["all", "All Expenses"], ["subscriptions", "Subscriptions"], ["category", "By Category"]] as [TabKey, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={cn(
              "px-5 py-3 font-mono text-[12px] uppercase tracking-widest relative transition-colors",
              activeTab === key ? "text-[var(--text-1)]" : "text-[var(--text-3)] hover:text-[var(--text-2)]"
            )}
          >
            {label}
            {activeTab === key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--violet)]" />}
          </button>
        ))}
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        {/* ════════ TAB 1: All Expenses ════════ */}
        {activeTab === "all" && (
          <>
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
              <table className="w-full text-left font-mono text-[12px] whitespace-nowrap">
                <thead className="bg-[var(--background)] border-b border-[var(--border)] text-[var(--text-3)] text-[10px] uppercase tracking-widest">
                  <tr>
                    {([["date", "Date"], ["description", "Description"], ["category", "Category"], ["amount", "Amount"]] as [SortField, string][]).map(([f, l]) => (
                      <th key={f} className="px-4 py-3 font-medium cursor-pointer hover:text-[var(--text-1)] transition-colors" onClick={() => toggleSort(f)}>
                        <span className="flex items-center gap-1">{l} <SortIcon field={f} /></span>
                      </th>
                    ))}
                    <th className="px-4 py-3 font-medium">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] bg-[var(--surface-hi)]">
                  {pagedExpenses.map((e, i) => (
                    <tr key={`${e.description}-${i}`} className="hover:bg-[var(--surface)] transition-colors">
                      <td className="px-4 py-3 text-[var(--text-2)]">{new Date(e.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                      <td className="px-4 py-3 text-[var(--text-1)] max-w-[200px] truncate">{e.description}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest border border-[var(--border)]" style={{ color: CATEGORY_COLORS[e.category] }}>
                          {e.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-1)] font-medium text-right">{fmtINR(e.amount)}</td>
                      <td className="px-4 py-3">
                        {e.is_recurring && (
                          <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest bg-[rgba(123,97,255,0.1)] border border-[rgba(123,97,255,0.2)] text-[var(--violet)]">
                            Recurring
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="font-mono text-[11px] text-[var(--text-3)]">Total: {fmtINR(report.total_monthly)}</span>
              {totalPages > 1 && (
                <div className="flex gap-2">
                  <button type="button" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="button-ghost px-3 py-1 text-[11px] disabled:opacity-30">Prev</button>
                  <span className="font-mono text-[11px] text-[var(--text-3)] py-1">{page + 1}/{totalPages}</span>
                  <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="button-ghost px-3 py-1 text-[11px] disabled:opacity-30">Next</button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ════════ TAB 2: Subscriptions ════════ */}
        {activeTab === "subscriptions" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <MetricCard label="Monthly Subscriptions" value={fmtINR(report.subscription_monthly_total)} tone="cyan" />
              <MetricCard label="Annual Cost" value={fmtINR(report.subscription_monthly_total * 12)} tone="pink" />
              <MetricCard
                label="Potential Savings"
                value={fmtINR(report.subscriptions.filter(s => s.potentially_unused).reduce((sum, s) => sum + s.yearly_cost, 0))}
                tone="amber"
              />
            </div>
            <div className="space-y-3">
              {report.subscriptions.map((sub, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-4">
                  <div>
                    <div className="font-display text-[14px] font-medium text-[var(--text-1)]">{sub.tool_name}</div>
                    <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest border border-[var(--border)] mt-1 inline-block" style={{ color: CATEGORY_COLORS[sub.category] }}>
                      {sub.category}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[13px] text-[var(--text-1)]">{fmtINR(sub.monthly_cost)}<span className="text-[var(--text-3)]"> / mo</span></div>
                    <div className="font-mono text-[11px] text-[var(--text-3)]">{fmtINR(sub.yearly_cost)} / yr</div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="font-mono text-[10px] text-[var(--text-3)]">Last charged {new Date(sub.last_charged).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</div>
                    {sub.potentially_unused && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-[var(--amber)] mt-1 inline-block">
                        Review — 45+ days
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {report.cost_reduction_opportunities.length > 0 && (
              <div className="mt-6 rounded-lg bg-[rgba(123,97,255,0.05)] border border-[rgba(123,97,255,0.1)] p-5">
                <h4 className="font-mono text-[10px] uppercase tracking-widest text-[var(--violet)] mb-3">Opportunities to reduce costs</h4>
                <ul className="space-y-2">
                  {report.cost_reduction_opportunities.map((opp, i) => (
                    <li key={i} className="flex gap-2 text-[13px] text-[var(--text-2)] leading-relaxed">
                      <span className="text-[var(--violet)] mt-0.5">•</span><span>{opp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* ════════ TAB 3: By Category ════════ */}
        {activeTab === "category" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Category Breakdown */}
            <div className="space-y-4">
              {report.by_category.map((cat) => (
                <div key={cat.category}>
                  <div className="flex justify-between mb-1">
                    <span className="font-mono text-[12px] text-[var(--text-1)]">{cat.category}</span>
                    <span className="font-mono text-[12px] text-[var(--text-2)]">{fmtINR(cat.total)} ({cat.percent}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--border)]">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${cat.percent}%`,
                        backgroundColor: CATEGORY_COLORS[cat.category] || "var(--violet)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* SVG Donut Chart */}
            <div className="flex items-center justify-center">
              <svg viewBox="0 0 200 200" width="220" height="220">
                {(() => {
                  const cx = 100, cy = 100, r = 70;
                  let cumAngle = -90; // start at top
                  return report.by_category.map((cat, i) => {
                    const angle = (cat.percent / 100) * 360;
                    const startAngle = cumAngle;
                    cumAngle += angle;
                    const endAngle = cumAngle;

                    const startRad = (startAngle * Math.PI) / 180;
                    const endRad = (endAngle * Math.PI) / 180;
                    const x1 = cx + r * Math.cos(startRad);
                    const y1 = cy + r * Math.sin(startRad);
                    const x2 = cx + r * Math.cos(endRad);
                    const y2 = cy + r * Math.sin(endRad);
                    const largeArc = angle > 180 ? 1 : 0;

                    const pathD = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

                    return (
                      <path key={i} d={pathD} fill={CATEGORY_COLORS[cat.category] || "var(--text-3)"} opacity={0.85} stroke="var(--surface)" strokeWidth="1.5" />
                    );
                  });
                })()}
                {/* Center hole */}
                <circle cx="100" cy="100" r="40" fill="var(--surface)" />
                <text x="100" y="96" textAnchor="middle" fill="var(--text-1)" fontSize="14" fontWeight="bold">
                  {fmtINR(report.total_monthly)}
                </text>
                <text x="100" y="112" textAnchor="middle" fill="var(--text-3)" fontSize="9">
                  / month
                </text>
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
