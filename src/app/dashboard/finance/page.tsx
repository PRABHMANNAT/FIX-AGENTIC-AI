"use client";

import { BarChart2, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DEMO_USER_ID, demoBusinessMetrics, demoFinanceAnalysis } from "@/lib/demo-data";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { formatCurrency, formatNumber, formatSignedPercent } from "@/lib/utils";
import type { BusinessMetric, FinanceAnalysis } from "@/types";

function latestMetric(metrics: BusinessMetric[], type: BusinessMetric["metric_type"]) {
  return metrics.find((metric) => metric.metric_type === type);
}

function metricChangeText(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  return formatSignedPercent(value);
}

export default function FinancePage() {
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [metrics, setMetrics] = useState<BusinessMetric[]>(demoBusinessMetrics);
  const [result, setResult] = useState<FinanceAnalysis | null>(demoFinanceAnalysis);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [form, setForm] = useState({
    narrative: "",
    mrr: "4280",
    monthlyExpenses: "8200",
    customerCount: "23",
    avgPlanPrice: "186",
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoadingMetrics(true);

      if (!supabase) {
        setLoadingMetrics(false);
        return;
      }

      const { data } = await supabase
        .from("business_metrics")
        .select("*")
        .order("recorded_at", { ascending: false });

      if (!active) {
        return;
      }

      setMetrics(data?.length ? data : demoBusinessMetrics);
      setLoadingMetrics(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [supabase]);

  const activeResult = result ?? demoFinanceAnalysis;

  const metricStrip = useMemo(() => {
    if (!activeResult && metrics.length) {
      return [
        {
          label: "Monthly Revenue",
          value: `$${formatNumber(latestMetric(metrics, "mrr")?.value ?? 0)}`,
          change: metricChangeText(latestMetric(metrics, "mrr")?.change_percent ?? 0),
          tone: "var(--green)",
        },
      ];
    }

    return [
      {
        label: "Monthly Revenue",
        value: `$${formatNumber(activeResult.mrr)}`,
        change: metricChangeText(activeResult.mrr_change),
        tone: "var(--green)",
      },
      {
        label: "ARR",
        value: `$${formatNumber(activeResult.arr)}`,
        change: metricChangeText(activeResult.mrr_change),
        tone: "var(--text-1)",
      },
      {
        label: "Monthly Churn",
        value: `${activeResult.churn_rate}%`,
        change: "-0.4%",
        tone: "var(--ember)",
      },
      {
        label: "LTV",
        value: `$${formatNumber(activeResult.ltv)}`,
        change: "—",
        tone: "var(--text-1)",
      },
      {
        label: "CAC",
        value: `$${formatNumber(activeResult.cac)}`,
        change: "—",
        tone: "var(--text-1)",
      },
      {
        label: "Days Of Runway",
        value: `${activeResult.runway_days}`,
        change: "cash left",
        tone: activeResult.runway_days < 60 ? "var(--ember)" : "var(--green)",
      },
    ];
  }, [activeResult, metrics]);

  const analyze = async () => {
    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/finance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          narrative: form.narrative,
          mrr: Number(form.mrr),
          monthlyExpenses: Number(form.monthlyExpenses),
          customerCount: Number(form.customerCount),
          avgPlanPrice: Number(form.avgPlanPrice),
          userId: DEMO_USER_ID,
        }),
      });

      if (!response.ok) {
        throw new Error("Finance analysis failed.");
      }

      const nextResult = (await response.json()) as FinanceAnalysis;
      setResult(nextResult);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-topbar anim-fade-up">
        <div>
          <div className="page-kicker">Financial Overview</div>
          <h1 className="page-title">My Revenue</h1>
        </div>
        <div className="font-comfortaa text-[13px] text-[var(--text-2)]">
          Describe the business, enter your numbers, and let your office translate them into clear decisions.
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {metricStrip.map((metric, index) => (
          <article
            key={metric.label}
            className="metric-card"
            style={{ animationDelay: `${index * 0.08}s` }}
          >
            <div className="metric-label">{metric.label}</div>
            <div className="metric-value">
              {loadingMetrics ? <div className="shimmer-block h-[52px] w-[120px]" /> : metric.value}
            </div>
            <div className="metric-change" style={{ color: metric.tone }}>
              {metric.change}
            </div>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="card anim-fade-up delay-2 p-6">
          <div className="page-kicker">Money Input</div>
          <div className="mt-3 font-comfortaa text-[14px] leading-[1.8] text-[var(--text-2)]">
            Describe your current financial situation, or enter your numbers below.
          </div>

          <textarea
            value={form.narrative}
            onChange={(event) => setForm((current) => ({ ...current, narrative: event.target.value }))}
            className="input-shell mt-5 min-h-[150px] resize-none"
            placeholder="We make $4k/month, spend $2k, and have 45 customers paying $89 per month."
          />

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="field-stack !gap-2">
              <label className="field-label">Monthly revenue</label>
              <input
                value={form.mrr}
                onChange={(event) => setForm((current) => ({ ...current, mrr: event.target.value }))}
                className="input-shell"
              />
            </div>
            <div className="field-stack !gap-2">
              <label className="field-label">Monthly expenses</label>
              <input
                value={form.monthlyExpenses}
                onChange={(event) =>
                  setForm((current) => ({ ...current, monthlyExpenses: event.target.value }))
                }
                className="input-shell"
              />
            </div>
            <div className="field-stack !gap-2">
              <label className="field-label">Customers</label>
              <input
                value={form.customerCount}
                onChange={(event) =>
                  setForm((current) => ({ ...current, customerCount: event.target.value }))
                }
                className="input-shell"
              />
            </div>
            <div className="field-stack !gap-2">
              <label className="field-label">Average price</label>
              <input
                value={form.avgPlanPrice}
                onChange={(event) =>
                  setForm((current) => ({ ...current, avgPlanPrice: event.target.value }))
                }
                className="input-shell"
              />
            </div>
          </div>

          <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-3)]">
            Example: We make $4k/month, spend $2k, and have 45 customers at $89/month.
          </div>

          <button type="button" onClick={() => void analyze()} className="build-cta-button mt-6 !w-auto px-6">
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            ) : (
              <BarChart2 className="h-4 w-4" strokeWidth={2} />
            )}
            ANALYZE MY FINANCES →
          </button>
        </div>

        <div className="space-y-6">
          <section className="card forecast-grid anim-fade-up delay-3 p-6">
            {[
              {
                label: "30 days",
                value: activeResult.runway_forecast.days_30,
                tone: activeResult.runway_forecast.days_30 > 90 ? "healthy" : "tight",
              },
              {
                label: "60 days",
                value: activeResult.runway_forecast.days_60,
                tone: activeResult.runway_forecast.days_60 > 90 ? "healthy" : "tight",
              },
              {
                label: "90 days",
                value: activeResult.runway_forecast.days_90,
                tone: activeResult.runway_forecast.days_90 > 90 ? "healthy" : "tight",
              },
            ].map((forecast) => (
              <div
                key={forecast.label}
                className={`forecast-card ${forecast.tone === "healthy" ? "healthy" : "tight"}`}
              >
                <div className="metric-label">{forecast.label}</div>
                <div className="mt-3 font-[var(--font-bebas)] text-[40px] uppercase leading-none text-[var(--text-1)]">
                  {forecast.value}
                </div>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-2)]">
                  days remaining
                </div>
              </div>
            ))}
          </section>

          <section className="card anim-fade-up delay-4 p-6">
            <div className="font-[var(--font-bebas)] text-[20px] uppercase tracking-[0.08em] text-[var(--text-1)]">
              What This Means
            </div>
            <div className="mt-4 space-y-4">
              {activeResult.insights.map((insight, index) => (
                <div key={insight} className="flex gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--green)]">
                    0{index + 1}
                  </span>
                  <p className="font-comfortaa text-[14px] leading-[1.8] text-[var(--text-2)]">
                    {insight}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="card anim-fade-up delay-5 p-6">
            <div className="font-[var(--font-bebas)] text-[20px] uppercase tracking-[0.08em] text-[var(--text-1)]">
              Alerts
            </div>
            <div className="mt-4 space-y-3">
              {activeResult.alerts.length ? (
                activeResult.alerts.map((alert) => (
                  <div key={alert} className="alert-card">
                    {alert}
                  </div>
                ))
              ) : (
                <div className="font-comfortaa text-[13px] leading-[1.7] text-[var(--text-2)]">
                  No critical finance alerts right now.
                </div>
              )}
            </div>

            <div className="mt-5 rounded-[6px] border border-[var(--border)] bg-[var(--surface-hi)] p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-3)]">
                Burn rate
              </div>
              <div className="mt-2 font-[var(--font-bebas)] text-[32px] uppercase tracking-[0.05em] text-[var(--text-1)]">
                {formatCurrency(activeResult.runway_forecast.burn_rate)}
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
