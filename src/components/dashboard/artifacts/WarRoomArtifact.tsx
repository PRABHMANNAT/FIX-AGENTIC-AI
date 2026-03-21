"use client";

import { BarChart2, Crosshair, Mail, Target, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import type { WarRoomResponse } from "@/types";

const iconMap = {
  target: Target,
  mail: Mail,
  "bar-chart": BarChart2,
  zap: Zap,
} as const;

export function WarRoomArtifact({
  data,
  userId,
  onResult,
}: {
  data: WarRoomResponse | null;
  userId: string | null;
  onResult?: (result: WarRoomResponse) => void;
}) {
  const [halted, setHalted] = useState(false);
  const [objective, setObjective] = useState("");
  const [response, setResponse] = useState<WarRoomResponse | null>(data);
  const [loading, setLoading] = useState(false);
  const [subroutines, setSubroutines] = useState<
    Array<
      WarRoomResponse["subroutines"][number] & {
        status: WarRoomResponse["subroutines"][number]["status"] | "halted";
      }
    >
  >([]);

  const statusStyles: Record<
    "running" | "deployed" | "halted" | "ready",
    { color: string; background: string; border: string }
  > = {
    running: {
      color: "#FBBF24",
      background: "rgba(251,191,36,0.12)",
      border: "rgba(251,191,36,0.3)",
    },
    deployed: {
      color: "#00FF88",
      background: "rgba(0,255,136,0.12)",
      border: "rgba(0,255,136,0.3)",
    },
    halted: {
      color: "#FF6B35",
      background: "rgba(255,107,53,0.12)",
      border: "rgba(255,107,53,0.3)",
    },
    ready: {
      color: "rgba(255,255,255,0.3)",
      background: "transparent",
      border: "rgba(255,255,255,0.1)",
    },
  };

  useEffect(() => {
    setResponse(data);
    setHalted(false);
    setSubroutines(data?.subroutines ?? []);
  }, [data]);

  function handleHalt() {
    setHalted(true);
    setSubroutines((current) =>
      current.map((subroutine) => ({ ...subroutine, status: "halted" })),
    );
  }

  async function launch() {
    setLoading(true);

    try {
      const res = await fetch("/api/warroom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          objective,
          user_id: userId,
        }),
      });

      const result = (await res.json()) as WarRoomResponse;
      setHalted(false);
      setResponse(result);
      setSubroutines(result.subroutines);
      onResult?.(result);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="artifact-header">
        <div className="artifact-header-left">
          <div
            className="artifact-icon"
            style={{
              background: "var(--gold-dim)",
              border: "1px solid rgba(255,184,0,0.2)",
            }}
          >
            <Crosshair size={18} color="var(--gold)" />
          </div>
          <div>
            <div className="artifact-title">WAR ROOM</div>
            <div className="artifact-subtitle">CHAIN COMMAND · PARALLEL EXECUTION</div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleHalt}
          disabled={halted || !response}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "10px 18px",
            border: `1px solid ${
              halted ? "rgba(255,107,53,0.2)" : "rgba(255,107,53,0.4)"
            }`,
            borderRadius: 6,
            background: halted ? "rgba(255,107,53,0.15)" : "rgba(255,107,53,0.08)",
            color: "#FF6B35",
            cursor: halted || !response ? "not-allowed" : "pointer",
            transition: "all 0.15s",
            opacity: halted || !response ? 0.6 : 1,
          }}
        >
          ⬛ {halted ? "OPERATIONS HALTED" : "HALT ALL OPERATIONS"}
        </button>
      </div>

      {!response ? (
        <div className="finance-input">
          <div className="section-header">MISSION OBJECTIVE</div>
          <textarea
            value={objective}
            onChange={(event) => setObjective(event.target.value)}
            className="search-textarea"
            rows={3}
            placeholder="Example: Find 10 new local customers, draft first emails, and pressure-test runway."
          />
          <button type="button" className="find-btn" onClick={() => void launch()} disabled={loading}>
            {loading ? "DEPLOYING..." : "LAUNCH WAR ROOM →"}
          </button>
        </div>
      ) : (
        <>
          <div className="objective-block">
            <div className="obj-label">PRIMARY OBJECTIVE</div>
            <div className="obj-title">{response.objective}</div>
            <div className="obj-meta">
              <span className="obj-status">
                STATUS: <strong>{halted ? "HALTED" : "ACTIVE"}</strong>
              </span>
              <span className="obj-timer">T-PLUS: {response.elapsed}</span>
            </div>
          </div>

          <div className="section-header">ACTIVE SUBROUTINES (PARALLEL EXECUTION)</div>
          <div className="subroutines-grid">
            {subroutines.map((subroutine) => {
              const Icon = iconMap[subroutine.icon] ?? Zap;
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
                    <span
                      className="artifact-badge"
                      style={{
                        color:
                          statusStyles[
                            subroutine.status === "active" || subroutine.status === "live"
                              ? "deployed"
                              : subroutine.status === "halted"
                                ? "halted"
                                : subroutine.status
                          ].color,
                        background:
                          statusStyles[
                            subroutine.status === "active" || subroutine.status === "live"
                              ? "deployed"
                              : subroutine.status === "halted"
                                ? "halted"
                                : subroutine.status
                          ].background,
                        borderColor:
                          statusStyles[
                            subroutine.status === "active" || subroutine.status === "live"
                              ? "deployed"
                              : subroutine.status === "halted"
                                ? "halted"
                                : subroutine.status
                          ].border,
                      }}
                    >
                      {subroutine.status === "active" || subroutine.status === "live"
                        ? "DEPLOYED"
                        : subroutine.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="sub-name">{subroutine.name}</div>
                  <div className="sub-stat">{subroutine.stat}</div>
                </div>
              );
            })}
          </div>

          <div className="section-header mt-7">GLOBAL EVENT FEED</div>
          <div className="event-feed">
            {response.events.map((event, index) => (
              <div key={`${event.text}-${index}`} className={`event-item ${event.type}`}>
                <span className="event-tag">[{event.type.toUpperCase()}]</span>
                <span className="event-text">{event.text}</span>
                <span className="event-time">{event.time}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export default WarRoomArtifact;
