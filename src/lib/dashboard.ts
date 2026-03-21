import type { SupabaseClient } from "@supabase/supabase-js";
import { scrapeGitHub, scrapeLinkedIn } from "@/lib/apify";
import { scoreBatchWithOpenAI } from "@/lib/openai";
import type {
  DashboardSnapshotActivityItem,
  DashboardSnapshotMetricSet,
  DashboardSnapshotSubroutine,
  Lead,
  LeadInsert,
  LeadSource,
  Product,
} from "@/types";

type ScrapeSource = Exclude<LeadSource, "manual">;

function mapLeadForInsert(params: {
  userId: string;
  icpId: string | null;
  source: ScrapeSource;
  scoredLead: Awaited<ReturnType<typeof scoreBatchWithOpenAI>>[number];
  rawProfile: Record<string, unknown>;
}): LeadInsert {
  const { userId, icpId, source, scoredLead, rawProfile } = params;

  return {
    user_id: userId,
    icp_id: icpId,
    name: scoredLead.name,
    company: scoredLead.company,
    role: scoredLead.role,
    email: scoredLead.email,
    linkedin_url: source === "linkedin" ? ((rawProfile.profileUrl as string | undefined) ?? null) : null,
    github_url: source === "github" ? ((rawProfile.profileUrl as string | undefined) ?? null) : null,
    avatar_url:
      ((rawProfile.avatarUrl as string | undefined) ?? null) ||
      ((rawProfile.avatar_url as string | undefined) ?? null),
    location: (rawProfile.location as string | undefined) ?? null,
    source,
    raw_data: rawProfile,
    icp_score: scoredLead.icp_score,
    intent_score: scoredLead.intent_score,
    signals: scoredLead.signals,
    score_reason: scoredLead.score_reason,
  };
}

async function saveLeadsForSource(
  supabase: SupabaseClient,
  source: ScrapeSource,
  leads: LeadInsert[],
) {
  if (!leads.length) {
    return [];
  }

  const onConflict = source === "linkedin" ? "linkedin_url,user_id" : "github_url,user_id";
  const { data, error } = await supabase
    .from("leads")
    .upsert(leads, {
      onConflict,
      ignoreDuplicates: false,
    })
    .select("*");

  if (!error && data) {
    return data as Lead[];
  }

  const saved: Lead[] = [];

  for (const lead of leads) {
    const single = await supabase
      .from("leads")
      .upsert(lead, {
        onConflict,
        ignoreDuplicates: false,
      })
      .select("*")
      .single();

    if (!single.error && single.data) {
      saved.push(single.data as Lead);
    }
  }

  return saved;
}

export async function runLeadDiscovery(params: {
  supabase: SupabaseClient;
  userId: string;
  icpId: string | null;
  icpDescription: string;
  searchQuery: string;
  githubQuery?: string | null;
  count?: number;
  sources?: ScrapeSource[];
}) {
  const sources = params.sources?.length ? params.sources : ["linkedin", "github"];
  const enabledSources = sources.filter((source) => source !== "github" || Boolean(params.githubQuery));
  const count = params.count && params.count > 0 ? params.count : 25;

  const results = await Promise.allSettled(
    enabledSources.map(async (source) => {
      const scrapeResult =
        source === "linkedin"
          ? await scrapeLinkedIn(params.searchQuery, count)
          : await scrapeGitHub(params.githubQuery as string, count);

      const rawProfiles = scrapeResult.items;

      if (!rawProfiles.length) {
        return {
          source,
          leads: [] as LeadInsert[],
        };
      }

      const scoredLeads = await scoreBatchWithOpenAI(rawProfiles, params.icpDescription, source);
      const mappedLeads = scoredLeads.map((scoredLead) =>
        mapLeadForInsert({
          userId: params.userId,
          icpId: params.icpId,
          source,
          scoredLead,
          rawProfile: rawProfiles[scoredLead.profile_index] as Record<string, unknown>,
        }),
      );

      return {
        source,
        leads: mappedLeads,
      };
    }),
  );

  const savedLeads: Lead[] = [];
  const errors: Record<string, string> = {};

  for (const result of results) {
    if (result.status !== "fulfilled") {
      continue;
    }

    try {
      const persisted = await saveLeadsForSource(params.supabase, result.value.source, result.value.leads);
      savedLeads.push(...persisted);
    } catch (error) {
      errors[result.value.source] =
        error instanceof Error ? error.message : "We couldn't save those customers just now.";
    }
  }

  return {
    leads: savedLeads,
    sources: enabledSources,
    errors: Object.keys(errors).length ? errors : null,
  };
}

export function computeDashboardMetrics(params: {
  monthlyRevenue: number;
  customersFound: number;
  salesHealth: number;
  aiActions: number;
  revenueDelta: number;
  customersDelta: number;
  healthDelta: number;
  actionsToday: number;
}): DashboardSnapshotMetricSet {
  return {
    monthly_revenue: params.monthlyRevenue,
    customers_found: params.customersFound,
    sales_health: params.salesHealth,
    ai_actions: params.aiActions,
    revenue_delta: params.revenueDelta,
    customers_delta: params.customersDelta,
    health_delta: params.healthDelta,
    actions_today: params.actionsToday,
  };
}

export function buildDashboardSubroutines(params: {
  leads: Lead[];
  financeTracked: boolean;
  hasAssistant: boolean;
}): DashboardSnapshotSubroutine[] {
  return [
    {
      id: "customers",
      label: "Customer Search",
      stat: `${params.leads.filter((lead) => lead.status === "new").length} leads active`,
      status: params.leads.length ? "active" : "ready",
      color: "green",
    },
    {
      id: "sequences",
      label: "Email Sequences",
      stat: `${params.leads.filter((lead) => lead.status === "contacted").length} prospects`,
      status: params.leads.some((lead) => lead.status === "contacted") ? "active" : "ready",
      color: "green",
    },
    {
      id: "revenue",
      label: "Revenue Monitor",
      stat: params.financeTracked ? "tracking" : "waiting",
      status: params.financeTracked ? "active" : "ready",
      color: "ember",
    },
    {
      id: "assistant",
      label: "AI Assistant",
      stat: params.hasAssistant ? "online" : "starting",
      status: params.hasAssistant ? "live" : "ready",
      color: "violet",
    },
  ];
}

export function buildActivityItem(params: {
  type: DashboardSnapshotActivityItem["type"];
  text: string;
  time: string;
  agentType?: DashboardSnapshotActivityItem["agent_type"];
}): DashboardSnapshotActivityItem {
  return {
    type: params.type,
    text: params.text,
    time: params.time,
    agent_type: params.agentType,
  };
}

export function averageProductHealth(products: Product[]) {
  if (!products.length) {
    return 73;
  }

  return Math.round(
    products.reduce((total, product) => total + product.health_score, 0) / products.length,
  );
}
