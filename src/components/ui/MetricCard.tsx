import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { MetricCardProps } from "@/types";
import { cn, formatSignedPercent } from "@/lib/utils";
import LoadingShimmer from "@/components/ui/LoadingShimmer";

export function MetricCard({
  label,
  value,
  change,
  changeLabel,
  unit,
  loading,
  tone = "green",
  className,
}: MetricCardProps) {
  const resolvedValue = unit ? `${unit}${value}` : value;
  const positive = typeof change === "number" ? change >= 0 : null;
  const toneClasses = {
    green: "panel-tint-green",
    cyan: "panel-tint-cyan",
    pink: "panel-tint-pink",
    amber: "panel-tint-amber",
  } as const;

  return (
    <div className={cn("panel panel-hover metric-sheen relative overflow-hidden p-5", toneClasses[tone], className)}>
      <div className="relative flex h-full flex-col gap-4">
        <div className="system-label text-text-muted">{label}</div>
        {loading ? (
          <>
            <LoadingShimmer className="h-10 w-28" />
            <LoadingShimmer className="h-4 w-16" />
          </>
        ) : (
          <>
            <div className="font-display text-4xl uppercase leading-none tracking-[0.02em] text-white">
              {resolvedValue}
            </div>
            {changeLabel ? (
              <div
                className={cn(
                  "inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em]",
                  typeof change === "number"
                    ? positive
                      ? "text-accent"
                      : "text-danger"
                    : "text-text-secondary",
                )}
              >
                {typeof change === "number" ? (
                  positive ? (
                    <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" strokeWidth={2} />
                  )
                ) : null}
                <span>{changeLabel}</span>
              </div>
            ) : typeof change === "number" ? (
              <div
                className={cn(
                  "inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em]",
                  positive ? "text-accent" : "text-danger",
                )}
              >
                {positive ? (
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" strokeWidth={2} />
                )}
                <span>{formatSignedPercent(change)}</span>
              </div>
            ) : (
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-micro">Stable</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MetricCard;
