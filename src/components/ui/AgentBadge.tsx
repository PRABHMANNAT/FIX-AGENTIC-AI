import { Activity, BarChart2, Sprout, Target, Zap } from "lucide-react";
import type { AgentType } from "@/types";
import { cn, getAgentMeta } from "@/lib/utils";

const iconMap = {
  coworker: Zap,
  intelligence: Sprout,
  finance: BarChart2,
  leads: Target,
} satisfies Record<AgentType, typeof Activity>;

interface AgentBadgeProps {
  agentType: AgentType;
  className?: string;
}

export function AgentBadge({ agentType, className }: AgentBadgeProps) {
  const Icon = iconMap[agentType];
  const meta = getAgentMeta(agentType);
  const toneClasses = {
    coworker: "tone-pill-green",
    intelligence: "tone-pill-cyan",
    finance: "tone-pill-amber",
    leads: "tone-pill-pink",
  } as const;
  const iconClasses = {
    coworker: "text-accent",
    intelligence: "text-[var(--cyan)]",
    finance: "text-[var(--amber)]",
    leads: "text-[var(--pink)]",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md border bg-[#080808] px-2.5 py-1.5 text-[9px] uppercase tracking-[0.24em] text-text-secondary",
        toneClasses[agentType],
        className,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", iconClasses[agentType])} strokeWidth={2} />
      <span className="font-mono">{meta.short}</span>
    </span>
  );
}

export default AgentBadge;
