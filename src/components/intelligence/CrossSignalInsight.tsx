"use client";

import { Check, Minus, Settings } from "lucide-react";

interface CrossSignalInsightProps {
  pattern: string;
  missingSignals: string[];
  positiveSignals: string[];
}

export function CrossSignalInsight({
  pattern,
  missingSignals,
  positiveSignals,
}: CrossSignalInsightProps) {
  return (
    <div className="space-y-5">
      {/* Cross-signal pattern */}
      {pattern && pattern.length > 20 && (
        <div>
          <h4 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-2">
            Cross-signal pattern
          </h4>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-hi)] p-4">
            <p className="text-[13px] text-[var(--text-1)] leading-relaxed italic">
              "{pattern}"
            </p>
          </div>
        </div>
      )}

      {/* Positive signals */}
      {positiveSignals && positiveSignals.length > 0 && (
        <div>
          <h4 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-2">
            What's working
          </h4>
          <div className="space-y-2">
            {positiveSignals.map((signal, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full bg-[rgba(16,185,129,0.15)] border border-[rgba(16,185,129,0.25)] flex items-center justify-center">
                  <Check size={9} className="text-[var(--green)]" strokeWidth={3} />
                </div>
                <p className="text-[12px] text-[var(--text-2)] leading-relaxed">
                  {signal}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing signals */}
      {missingSignals && missingSignals.length > 0 && (
        <div>
          <h4 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-2">
            Connect more sources for deeper analysis
          </h4>
          <div className="space-y-2">
            {missingSignals.map((signal, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex-shrink-0 w-4 h-4 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center">
                    <Minus size={8} className="text-[var(--text-3)]" strokeWidth={3} />
                  </div>
                  <span className="text-[12px] text-[var(--text-3)]">
                    {signal} not connected
                  </span>
                </div>
                <a
                  href="/dashboard/finance?settings=open"
                  className="font-mono text-[10px] text-[var(--violet)] hover:underline shrink-0"
                >
                  Connect →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
