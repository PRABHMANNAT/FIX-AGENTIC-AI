"use client";

import { AlertTriangle } from "lucide-react";

export default function IntelligenceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen px-6 py-8 lg:px-8">
      <div className="panel panel-tint-cyan grid-surface max-w-3xl p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-md border border-[rgba(66,200,255,0.2)] bg-[rgba(66,200,255,0.08)]">
            <AlertTriangle className="h-5 w-5 text-[var(--cyan)]" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="font-display text-4xl uppercase leading-none text-white">
              Intelligence Fault
            </div>
            <p className="comfort-copy mt-3 text-sm leading-relaxed text-text-secondary">
              The intelligence view hit a render fault. Reset the route and the page will rehydrate
              from the local fallback model.
            </p>
            <div className="mt-4 rounded-md border border-border bg-[#090909] p-3 font-mono text-[10px] uppercase tracking-[0.18em] text-text-micro">
              {error.message || "Unknown dashboard error"}
            </div>
            <button type="button" onClick={reset} className="button-primary mt-5">
              Reload Intelligence
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
