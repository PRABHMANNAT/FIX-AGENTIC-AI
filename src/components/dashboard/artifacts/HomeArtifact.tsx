"use client";

import { useEffect, useState } from "react";
import { BarChart2, LayoutGrid, Mail, Target, Zap } from "lucide-react";
import type { DashboardSnapshot } from "@/types";

const subroutineIcons = {
  customers: Target,
  sequences: Mail,
  revenue: BarChart2,
  assistant: Zap,
} as const;

export function HomeArtifact({
  data,
  userId,
}: {
  data: DashboardSnapshot | null;
  userId?: string | null;
}) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(data);

  useEffect(() => {
    setSnapshot(data);
  }, [data]);

  useEffect(() => {
    if (data || !userId) {
      return;
    }

    let active = true;

    const load = async () => {
      try {
        const response = await fetch(`/api/dashboard/snapshot?user_id=${userId}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const nextSnapshot = (await response.json()) as DashboardSnapshot;

        if (active) {
          setSnapshot(nextSnapshot);
        }
      } catch {
        if (active) {
          setSnapshot(null);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [data, userId]);

  const metrics = snapshot?.metrics ?? {
    monthly_revenue: 0,
    customers_found: 0,
    sales_health: 0,
    ai_actions: 0,
    revenue_delta: 0,
    customers_delta: 0,
    health_delta: 0,
    actions_today: 0,
  };

  const activity = snapshot?.activity ?? [];
  const subroutines = snapshot?.subroutines ?? [];

  return (
    <>
      <div className="artifact-header">
        <div className="artifact-header-left">
          <div
            className="artifact-icon"
            style={{
              background: "var(--green-dim)",
              border: "1px solid rgba(0,255,136,0.2)",
            }}
          >
            <LayoutGrid size={18} color="var(--green)" />
          </div>
          <div>
            <div className="artifact-title">COMMAND CENTER</div>
            <div className="artifact-subtitle">SYSTEM OVERVIEW · ALL SYSTEMS NOMINAL</div>
          </div>
        </div>
        <div className="artifact-badge badge-active">● LIVE NOW</div>
      </div>

      <div className="metrics-grid">
        {[
          {
            label: "Monthly Revenue",
            value: `$${metrics.monthly_revenue.toLocaleString()}`,
            delta: `+${metrics.revenue_delta}%`,
            dir: "up",
            color: "var(--green)",
          },
          {
            label: "Customers Found",
            value: `${metrics.customers_found}`,
            delta: `+${metrics.customers_delta} today`,
            dir: "up",
            color: "var(--green)",
          },
          {
            label: "Sales Health",
            value: `${metrics.sales_health}`,
            delta: `${metrics.health_delta > 0 ? "+" : "−"}${Math.abs(metrics.health_delta)} pts`,
            dir: "down",
            color: "var(--ember)",
          },
          {
            label: "AI Actions Today",
            value: `${metrics.ai_actions}`,
            delta: `${metrics.actions_today} running`,
            dir: "neutral",
            color: "var(--text-1)",
          },
        ].map((metric, index) => (
          <div key={metric.label} className="metric-card" style={{ animationDelay: `${index * 0.08}s` }}>
            <div className="metric-label">{metric.label}</div>
            <div className="metric-value" style={{ color: metric.color }}>
              {metric.value}
            </div>
            <div className={`metric-delta ${metric.dir}`}>{metric.delta}</div>
          </div>
        ))}
      </div>

      <div className="section-header">ACTIVE SUBROUTINES</div>
      <div className="subroutines-grid">
        {subroutines.map((subroutine) => {
          const Icon = subroutineIcons[subroutine.id as keyof typeof subroutineIcons] ?? Zap;
          const colorVar =
            subroutine.color === "green"
              ? "var(--green)"
              : subroutine.color === "ember"
                ? "var(--ember)"
                : subroutine.color === "gold"
                  ? "var(--gold)"
                  : "var(--violet)";

          return (
            <div key={subroutine.id} className="subroutine-card">
              <div className="subroutine-top">
                <div
                  className="sub-icon"
                  style={{
                    background:
                      subroutine.color === "green"
                        ? "var(--green-dim)"
                        : subroutine.color === "ember"
                          ? "var(--ember-dim)"
                          : subroutine.color === "gold"
                            ? "var(--gold-dim)"
                            : "var(--violet-dim)",
                    border: `1px solid ${colorVar}33`,
                  }}
                >
                  <Icon size={16} color={colorVar} strokeWidth={2} />
                </div>
                <span className={`artifact-badge badge-${subroutine.status}`}>
                  {subroutine.status.toUpperCase()}
                </span>
              </div>
              <div className="sub-name">{subroutine.label}</div>
              <div className="sub-stat">{subroutine.stat}</div>
            </div>
          );
        })}
      </div>

      <div className="section-header mt-8">GLOBAL EVENT FEED</div>
      <div className="event-feed">
        {activity.map((item, index) => (
          <div key={`${item.text}-${index}`} className={`event-item ${item.type}`}>
            <span className="event-tag">[{item.type.toUpperCase()}]</span>
            <span className="event-text">{item.text}</span>
            <span className="event-time">{item.time}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export default HomeArtifact;
