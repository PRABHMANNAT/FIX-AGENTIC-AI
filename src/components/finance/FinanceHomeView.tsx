"use client";

import { useState, useEffect } from "react";
import { FileText, TrendingUp, Flame, Newspaper, Target, BarChart3, AlertTriangle, MessageSquare, Clock, Activity, CheckCircle } from "lucide-react";
import type { Anomaly } from "@/types/finance";
import { cn } from "@/lib/utils";

interface RecentDocument {
  id: string;
  type: string;
  title: string;
  created_at: string;
}

interface FinanceHomeViewProps {
  onQuickAction: (message: string) => void;
  recentDocuments: RecentDocument[];
  anomalies: Anomaly[];
  stripeData: Record<string, unknown> | null;
  isConnected: boolean;
}

function fmtINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
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

function docPrompt(type: string, title: string): string {
  switch (type) {
    case "invoice": return `Show me invoice ${title}`;
    case "investor_report": return `Show me my investor report ${title}`;
    case "pitch_deck": return `Show me my pitch deck ${title}`;
    default: return `Open my ${type.replace(/_/g, " ")} report ${title}`;
  }
}

const QUICK_ACTIONS = [
  { label: "New Invoice", sub: "Create a GST invoice", prompt: "Generate a new invoice", icon: FileText, color: "var(--violet)" },
  { label: "Investor Report", sub: "Monthly update with metrics", prompt: "Generate my investor update for this month", icon: TrendingUp, color: "var(--green)" },
  { label: "Runway Check", sub: "Burn rate and cash runway", prompt: "What is my current burn rate and runway?", icon: Flame, color: "var(--amber)" },
  { label: "Weekly Brief", sub: "This week's finance summary", prompt: "Generate my weekly finance briefing", icon: Newspaper, color: "var(--cyan)" },
  { label: "Raise Ready?", sub: "Score vs investor benchmarks", prompt: "Calculate my fundraising readiness score for seed stage", icon: Target, color: "var(--pink)" },
  { label: "Cash Flow", sub: "6-month projection", prompt: "Generate a 6-month cash flow projection", icon: BarChart3, color: "var(--text-1)" },
  { label: "Team Pulse", sub: "Slack patterns and blockers", prompt: "Show me my team communication insights from Slack", icon: MessageSquare, color: "var(--violet)" },
  { label: "Time Audit", sub: "Where your hours really went", prompt: "Show me my time audit for this week", icon: Clock, color: "var(--cyan)" },
  { label: "Set Priorities", sub: "Align your quarter", prompt: "Help me set my Q2 priorities and goals", icon: Target, color: "var(--amber)" },
  { label: "Business Health", sub: "Cross-signal intelligence analysis", prompt: "Run a full business intelligence analysis across all my data sources", icon: Activity, color: "var(--violet)" },
  { label: "GitHub Velocity", sub: "Shipping pace and PR health", prompt: "Show me my GitHub engineering velocity", icon: BarChart3, color: "var(--cyan)" },
  { label: "Decision Queue", sub: "Unresolved items needing your attention", prompt: "What decisions are waiting for my input?", icon: CheckCircle, color: "var(--green)" },
];

const TYPE_COLORS: Record<string, string> = {
  invoice: "var(--violet)",
  investor_report: "var(--green)",
  pitch_deck: "var(--cyan)",
  fundraising_score: "var(--pink)",
  cash_flow: "var(--amber)",
};

export function FinanceHomeView({ onQuickAction, recentDocuments, anomalies, stripeData, isConnected }: FinanceHomeViewProps) {
  const newAnomalies = anomalies.filter((a) => a.status === "new");
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetch('/api/intelligence/summary')
      .then(r => r.json())
      .then(setSummary)
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-8 p-6 overflow-y-auto h-full">
      {/* Section 1 — Quick Actions */}
      <div>
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-4">Quick actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => onQuickAction(action.prompt)}
              className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-4 hover:border-[var(--border-hi)] hover:bg-[var(--surface)] transition-all text-left group"
            >
              <action.icon size={18} style={{ color: action.color }} className="group-hover:scale-110 transition-transform" />
              <div className="font-display text-[13px] text-[var(--text-1)]">{action.label}</div>
              <div className="font-mono text-[10px] text-[var(--text-3)]">{action.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Section 2 — Metrics snapshot */}
      <div>
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-4">At a glance</h3>
        {isConnected && stripeData ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "MRR", value: fmtINR(Number(stripeData.mrr || 0)), color: "var(--green)" },
              { label: "Runway", value: `${stripeData.runway_months || 0} mo`, color: "var(--cyan)" },
              { label: "Burn", value: fmtINR(Number(stripeData.burn_rate || 0)), color: "var(--amber)" },
              { label: "Churn", value: `${stripeData.churn_rate || 0}%`, color: "var(--ember)" },
            ].map((m) => (
              <div key={m.label} className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-4">
                <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-3)]">{m.label}</div>
                <div className="font-display text-[20px] font-bold mt-1" style={{ color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-4 text-center">
            <p className="font-mono text-[12px] text-[var(--text-3)]">Connect Stripe to see live metrics</p>
          </div>
        )}

        {/* Intelligence summary */}
        {summary && (
          <div className="space-y-2 mt-3">
            {summary.latest_health_score !== null && summary.latest_health_score !== undefined && (
              <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] px-4 py-2.5">
                <span className="font-mono text-[10px] text-[var(--text-3)]">Business health</span>
                <span
                  className="font-mono text-[13px] font-bold"
                  style={{ color: summary.latest_health_score >= 70 ? 'var(--green)' : summary.latest_health_score >= 50 ? 'var(--amber)' : 'var(--ember)' }}
                >
                  {summary.latest_health_score}/100
                </span>
              </div>
            )}
            {(summary.proactive_alerts_count || 0) > 0 && (
              <div className="flex items-center gap-2 px-1">
                <AlertTriangle size={11} className="text-[var(--ember)]" />
                <span className="font-mono text-[10px] text-[var(--ember)]">
                  {summary.proactive_alerts_count} alert{summary.proactive_alerts_count !== 1 ? 's' : ''} need attention
                </span>
              </div>
            )}
            {summary.latest_one_priority && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] px-4 py-2.5">
                <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-3)] mb-1">Today&#39;s priority</div>
                <div className="text-[11px] text-[var(--text-2)] line-clamp-2">
                  {summary.latest_one_priority.length > 80 ? summary.latest_one_priority.substring(0, 80) + '…' : summary.latest_one_priority}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 3 — Recent documents */}
      {recentDocuments.length > 0 && (
        <div>
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-4">Recent</h3>
          <div className="space-y-2">
            {recentDocuments.slice(0, 5).map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => onQuickAction(docPrompt(doc.type, doc.title))}
                className="flex items-center justify-between w-full rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-3 hover:border-[var(--border-hi)] hover:bg-[var(--surface)] transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest border border-[var(--border)]"
                    style={{ color: TYPE_COLORS[doc.type] || "var(--text-2)" }}
                  >
                    {doc.type.replace(/_/g, " ")}
                  </span>
                  <span className="text-[13px] text-[var(--text-1)] truncate max-w-[200px]">{doc.title}</span>
                </div>
                <span className="font-mono text-[10px] text-[var(--text-3)] shrink-0">{timeAgo(doc.created_at)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Section 4 — Active anomalies */}
      {newAnomalies.length > 0 && (
        <div>
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-[var(--ember)] mb-4 flex items-center gap-2">
            <AlertTriangle size={12} /> Needs attention
          </h3>
          <div className="space-y-2">
            {newAnomalies.slice(0, 3).map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onQuickAction(`Tell me about the ${a.metric.replace(/_/g, " ")} anomaly`)}
                className="flex items-center justify-between w-full rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-3 hover:border-[var(--border-hi)] transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="capitalize text-[13px] text-[var(--text-1)]">{a.metric.replace(/_/g, " ")}</span>
                  <span className="font-mono text-[11px] text-[var(--ember)]">{Math.abs(a.deviation_percent).toFixed(1)}%</span>
                </div>
                <span className={cn(
                  "rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest border",
                  a.severity === "high" ? "text-[var(--ember)] bg-[rgba(255,107,53,0.1)] border-[rgba(255,107,53,0.2)]" :
                  a.severity === "medium" ? "text-[var(--amber)] bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.2)]" :
                  "text-[var(--cyan)] bg-[rgba(6,182,212,0.1)] border-[rgba(6,182,212,0.2)]"
                )}>
                  {a.severity}
                </span>
              </button>
            ))}
            {newAnomalies.length > 3 && (
              <button type="button" onClick={() => onQuickAction("Show me all anomalies")} className="font-mono text-[11px] text-[var(--violet)] hover:underline">
                View all {newAnomalies.length} anomalies →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
