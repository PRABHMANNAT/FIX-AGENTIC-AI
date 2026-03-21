"use client";

import { useEffect, useMemo, useState } from "react";
import type { HealthScoreProps } from "@/types";
import { getHealthTone } from "@/lib/utils";

export function HealthScore({ value, size = 84, label = "HEALTH" }: HealthScoreProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const stroke = 5;
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const tone = useMemo(() => getHealthTone(value), [value]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimatedValue(value));
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const dashOffset = circumference - (animatedValue / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#151515"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={tone}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 800ms ease, stroke 300ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-2xl uppercase leading-none text-white">{value}</span>
        </div>
      </div>
      <span className="system-label text-[9px] text-text-muted">{label}</span>
    </div>
  );
}

export default HealthScore;
