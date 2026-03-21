"use client";

import { BarChart2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { FinanceAnalysis } from "@/types";

export function RevenueArtifact({
  data,
  onAnalysis,
}: {
  data: {
    userId: string | null;
    analysis: FinanceAnalysis | null;
  };
  onAnalysis?: (analysis: FinanceAnalysis) => void;
}) {
  const [input, setInput] = useState("");
  const [analysis, setAnalysis] = useState<FinanceAnalysis | null>(data.analysis);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAnalysis(data.analysis);
  }, [data.analysis]);

  async function analyze() {
    setLoading(true);

    try {
      const response = await fetch("/api/finance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: input,
          userId: data.userId,
        }),
      });

      const result = (await response.json()) as FinanceAnalysis;
      setAnalysis(result);
      onAnalysis?.(result);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="artifact-header">
        <div className="artifact-header-left">
          <div className="artifact-icon" style={{ background: "var(--ember-dim)" }}>
            <BarChart2 size={18} color="var(--ember)" />
          </div>
          <div>
            <div className="artifact-title">MY REVENUE</div>
            <div className="artifact-subtitle">FINANCIAL INTELLIGENCE · REAL-TIME</div>
          </div>
        </div>
      </div>

      {!analysis ? (
        <div className="finance-input">
          <div className="section-header">DESCRIBE YOUR FINANCES</div>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="search-textarea"
            rows={3}
            placeholder="We make $4k/month, spend $2k, have 45 customers at $89/mo..."
          />
          <button type="button" className="find-btn" onClick={() => void analyze()} disabled={loading || !input.trim()}>
            {loading ? "ANALYZING..." : "ANALYZE MY FINANCES →"}
          </button>
        </div>
      ) : (
        <>
          <div className="finance-grid">
            {[
              {
                label: "Monthly Revenue",
                value: `$${analysis.mrr?.toLocaleString()}`,
                color: "var(--green)",
                change: analysis.mrr_change >= 0 ? `+${analysis.mrr_change}%` : `${analysis.mrr_change}%`,
                dir: analysis.mrr_change >= 0 ? "up" : "down",
              },
              {
                label: "Annual Run Rate",
                value: `$${analysis.arr?.toLocaleString()}`,
                color: "var(--green)",
              },
              {
                label: "Monthly Churn",
                value: `${analysis.churn_rate}%`,
                color: analysis.churn_rate > 5 ? "var(--ember)" : "var(--text-1)",
              },
              {
                label: "Customer LTV",
                value: `$${analysis.ltv?.toLocaleString()}`,
                color: "var(--text-1)",
              },
              {
                label: "Acq. Cost (CAC)",
                value: `$${analysis.cac?.toLocaleString()}`,
                color: "var(--text-1)",
              },
              {
                label: "Runway",
                value: `${analysis.runway_days} days`,
                color:
                  analysis.runway_days < 60
                    ? "var(--ember)"
                    : analysis.runway_days < 90
                      ? "var(--gold)"
                      : "var(--green)",
              },
            ].map((metric, index) => (
              <div key={metric.label} className="finance-metric" style={{ animationDelay: `${index * 0.06}s` }}>
                <div className="metric-label">{metric.label}</div>
                <div className="metric-value" style={{ color: metric.color, fontSize: 36 }}>
                  {metric.value}
                </div>
                {metric.change ? <div className={`metric-delta ${metric.dir}`}>{metric.change}</div> : null}
              </div>
            ))}
          </div>

          <div className="section-header mt-7">RUNWAY FORECAST</div>
          <div className="runway-grid">
            {[30, 60, 90].map((days) => {
              const key = `days_${days}` as const;

              return (
                <div key={days} className="runway-card">
                  <div className="runway-days">{days}D</div>
                  <div className="runway-value">
                    ${analysis.runway_forecast?.[key]?.toLocaleString() || "—"}
                  </div>
                  <div className="runway-label">{days} day projection</div>
                </div>
              );
            })}
          </div>

          {analysis.insights?.length ? (
            <>
              <div className="section-header mt-7">INSIGHTS</div>
              {analysis.insights.map((insight, index) => (
                <div key={`${insight}-${index}`} className="insight-item">
                  {insight}
                </div>
              ))}
            </>
          ) : null}

          {analysis.alerts?.length ? (
            <>
              <div className="section-header mt-5">ALERTS</div>
              {analysis.alerts.map((alert, index) => (
                <div key={`${alert}-${index}`} className="alert-item">
                  {alert}
                </div>
              ))}
            </>
          ) : null}
        </>
      )}
    </>
  );
}

export default RevenueArtifact;
