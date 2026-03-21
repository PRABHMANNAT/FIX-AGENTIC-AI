"use client";

import { useEffect, useState } from "react";

interface SynthesisProps {
  lines: string[];
  pending?: boolean;
  onComplete?: () => void;
}

export function Synthesis({ lines, pending = false, onComplete }: SynthesisProps) {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    setVisibleLines(0);
  }, [lines]);

  useEffect(() => {
    if (!lines.length) {
      return;
    }

    if (visibleLines < lines.length) {
      const timer = window.setTimeout(() => {
        setVisibleLines((current) => current + 1);
      }, 400);

      return () => window.clearTimeout(timer);
    }

    const completeTimer = window.setTimeout(() => {
      onComplete?.();
    }, 1400);

    return () => window.clearTimeout(completeTimer);
  }, [lines, onComplete, visibleLines]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black px-6">
      <div className="w-full max-w-3xl text-center">
        <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-accent">
          Assembling Your Office
        </div>

        {pending && !lines.length ? (
          <div className="mt-6 font-mono text-[12px] uppercase tracking-[0.16em] text-text-secondary">
            Saving your setup...
          </div>
        ) : null}

        <div className="mt-10 space-y-4 text-left">
          {lines.slice(0, visibleLines).map((line) => (
            <div
              key={line}
              className="animate-slide-up flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.12em] text-white"
            >
              <span className="text-accent">✓</span>
              <span>{line}</span>
            </div>
          ))}
        </div>

        {visibleLines >= lines.length && lines.length > 0 ? (
          <div className="mt-12 animate-fade-in font-display text-[48px] uppercase leading-none tracking-[0.1em] text-white md:text-[56px]">
            Your Office Is Ready.
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default Synthesis;
