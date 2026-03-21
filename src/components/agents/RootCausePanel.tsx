"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { IntelligenceAnalysis } from "@/types";
import { cn, getHealthTone } from "@/lib/utils";

interface RootCausePanelProps {
  analysis: IntelligenceAnalysis;
}

export function RootCausePanel({ analysis }: RootCausePanelProps) {
  const [openPath, setOpenPath] = useState(0);
  const rootCauses = Array.isArray(analysis.root_causes) ? analysis.root_causes : [];
  const fixPaths = Array.isArray(analysis.fix_paths) ? analysis.fix_paths : [];

  return (
    <div className="space-y-6">
      <section className="panel grid-surface p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <div className="system-label text-text-muted">Root Causes</div>
            <p className="comfort-copy mt-2 text-sm text-text-secondary">{analysis.summary}</p>
          </div>
          <div
            className="rounded-md border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em]"
            style={{
              borderColor: `${getHealthTone(analysis.health_score)}33`,
              color: getHealthTone(analysis.health_score),
            }}
          >
            {analysis.health_score}/100
          </div>
        </div>

        <div className="space-y-4">
          {rootCauses.map((cause) => (
            <div key={cause.description} className="rounded-md border border-border bg-[#090909] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-syne text-sm font-medium text-white">{cause.description}</h3>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary">
                  {cause.likelihood}%
                </span>
              </div>
              <div className="mb-3 h-[4px] overflow-hidden rounded-full bg-[#111111]">
                <div className="h-full bg-accent" style={{ width: `${cause.likelihood}%` }} />
              </div>
              <ul className="space-y-2">
                {cause.evidence.map((item) => (
                  <li
                    key={item}
                    className="comfort-copy text-sm leading-relaxed text-text-secondary"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="panel grid-surface p-5">
        <div className="mb-4">
          <div className="system-label text-text-muted">Fix Paths</div>
        </div>
        <div className="space-y-4">
          {fixPaths.map((path, index) => {
            const open = openPath === index;
            return (
              <div
                key={path.title}
                className={cn(
                  "rounded-md border bg-[#090909] p-4",
                  index === 0 ? "border-[rgba(0,255,136,0.24)]" : "border-border",
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenPath(open ? -1 : index)}
                  className="flex w-full items-start justify-between gap-4 text-left"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-2xl uppercase leading-none text-white">
                        {path.title}
                      </span>
                      {index === 0 ? (
                        <span className="rounded-md border border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.08)] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.2em] text-accent">
                          Recommended
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary">
                      <span>Effort / {path.effort}</span>
                      <span>Confidence / {path.confidence}%</span>
                      <span>{path.time_to_results}</span>
                    </div>
                    <p className="comfort-copy text-sm text-text-secondary">{path.expected_impact}</p>
                  </div>
                  {open ? (
                    <ChevronUp className="mt-1 h-4 w-4 text-text-secondary" strokeWidth={2} />
                  ) : (
                    <ChevronDown className="mt-1 h-4 w-4 text-text-secondary" strokeWidth={2} />
                  )}
                </button>

                {open ? (
                  <div className="mt-4 space-y-2 border-t border-border pt-4">
                    {path.steps.map((step, stepIndex) => (
                      <div key={step} className="flex gap-3">
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                          0{stepIndex + 1}
                        </span>
                        <p className="comfort-copy text-sm text-text-secondary">{step}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default RootCausePanel;
