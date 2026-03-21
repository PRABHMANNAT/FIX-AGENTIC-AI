import { cn } from "@/lib/utils";

interface StatusDotProps {
  label?: string;
  className?: string;
}

export function StatusDot({ label, className }: StatusDotProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent shadow-live" />
      {label ? (
        <span className="system-label text-[9px] text-[#7d7d7d]">{label}</span>
      ) : null}
    </span>
  );
}

export default StatusDot;
