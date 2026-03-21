import { clsx, type ClassValue } from "clsx";
import type {
  AgentRun,
  AgentType,
  Conversation,
  ConversationGroup,
  Product,
} from "@/types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatSignedPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

export function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function getHealthTone(value: number) {
  if (value <= 40) {
    return "#ff4444";
  }

  if (value <= 70) {
    return "#ffaa00";
  }

  return "#00ff88";
}

export function averageHealth(products: Product[]) {
  if (!products.length) {
    return 0;
  }

  return Math.round(
    products.reduce((total, product) => total + product.health_score, 0) / products.length,
  );
}

export function groupConversationsByDay(conversations: Conversation[]): ConversationGroup[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const groups: ConversationGroup[] = [
    { label: "Today", conversations: [] },
    { label: "Yesterday", conversations: [] },
    { label: "Older", conversations: [] },
  ];

  conversations.forEach((conversation) => {
    const createdAt = new Date(conversation.updated_at || conversation.created_at);
    createdAt.setHours(0, 0, 0, 0);

    if (createdAt.getTime() === today.getTime()) {
      groups[0].conversations.push(conversation);
      return;
    }

    if (createdAt.getTime() === yesterday.getTime()) {
      groups[1].conversations.push(conversation);
      return;
    }

    groups[2].conversations.push(conversation);
  });

  return groups.filter((group) => group.conversations.length > 0);
}

export function createId() {
  return crypto.randomUUID();
}

export function getAgentMeta(agentType: AgentType) {
  const lookup = {
    coworker: {
      label: "Your AI Assistant",
      slug: "coworker.ai",
      short: "CW",
    },
    intelligence: {
      label: "Why Sales Are Dropping",
      slug: "p_intelligence",
      short: "PI",
    },
    finance: {
      label: "My Revenue",
      slug: "finance.cfg",
      short: "FA",
    },
    leads: {
      label: "Find Customers",
      slug: "leads.run",
      short: "CF",
    },
  } as const;

  return lookup[agentType];
}

export function summarizeRun(run: AgentRun) {
  if (run.output && typeof run.output === "object" && !Array.isArray(run.output)) {
    const summary = (run.output as Record<string, unknown>).summary;
    if (typeof summary === "string" && summary.trim()) {
      return summary;
    }

    const message = (run.output as Record<string, unknown>).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (run.error) {
    return run.error;
  }

  return `${getAgentMeta(run.agent_type).label} update saved.`;
}
