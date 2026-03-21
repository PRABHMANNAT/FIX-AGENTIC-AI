"use client";

interface ScoreBarProps {
  label: string;
  value: number;
}

export function ScoreBar({ label, value }: ScoreBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="system-label text-[8px] text-text-micro">{label}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary">
          {value}%
        </span>
      </div>
      <div className="h-[4px] overflow-hidden rounded-full bg-[#111111]">
        <div className="h-full bg-accent transition-all duration-300" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default ScoreBar;
