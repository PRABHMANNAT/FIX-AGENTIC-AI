import type {
  AgentMessage,
  AgentRun,
  BusinessMetric,
  Conversation,
  FinanceAnalysis,
  ICPProfile,
  IntelligenceAnalysis,
  Lead,
  LeadSearchResult,
  Product,
  Profile,
} from "@/types";

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";

const now = new Date();
const offsetHours = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

export const demoProfile: Profile = {
  id: DEMO_USER_ID,
  email: "founder@assembleone.ai",
  full_name: "Operator Zero",
  company_name: "Assemble Labs",
  avatar_url: null,
  onboarded: true,
  created_at: offsetHours(240),
  updated_at: offsetHours(1),
};

export const demoProducts: Product[] = [
  {
    id: "prod-command-core",
    user_id: DEMO_USER_ID,
    name: "Command Core",
    description: "Main workspace for checking what is working, what is blocked, and what to do next.",
    health_score: 78,
    metrics: {
      activation_rate: 34,
      weekly_retention: 58,
      onboarding_dropoff: 46,
      support_volume: 12,
    },
    created_at: offsetHours(180),
    updated_at: offsetHours(5),
  },
  {
    id: "prod-revenue-grid",
    user_id: DEMO_USER_ID,
    name: "Revenue Grid",
    description: "Money dashboard for monthly revenue, cash left, and customers leaving.",
    health_score: 69,
    metrics: {
      expansion_rate: 11,
      churn_rate: 3.2,
      trial_to_paid: 19,
      payback_months: 4.1,
    },
    created_at: offsetHours(160),
    updated_at: offsetHours(11),
  },
  {
    id: "prod-signal-radar",
    user_id: DEMO_USER_ID,
    name: "Signal Radar",
    description: "Customer finder that ranks people based on how well they match and how ready they are.",
    health_score: 72,
    metrics: {
      searches_run: 42,
      positive_replies: 9,
      icp_match_avg: 83,
      time_to_first_reply_days: 2.8,
    },
    created_at: offsetHours(140),
    updated_at: offsetHours(22),
  },
];

export const demoBusinessMetrics: BusinessMetric[] = [
  {
    id: "metric-mrr",
    user_id: DEMO_USER_ID,
    metric_type: "mrr",
    value: 4280,
    change_percent: 12,
    period: "2026-03",
    recorded_at: offsetHours(8),
  },
  {
    id: "metric-arr",
    user_id: DEMO_USER_ID,
    metric_type: "arr",
    value: 51360,
    change_percent: 12,
    period: "2026-03",
    recorded_at: offsetHours(8),
  },
  {
    id: "metric-churn",
    user_id: DEMO_USER_ID,
    metric_type: "churn",
    value: 2.3,
    change_percent: -0.4,
    period: "2026-03",
    recorded_at: offsetHours(8),
  },
  {
    id: "metric-ltv",
    user_id: DEMO_USER_ID,
    metric_type: "ltv",
    value: 1840,
    change_percent: null,
    period: "2026-03",
    recorded_at: offsetHours(8),
  },
  {
    id: "metric-cac",
    user_id: DEMO_USER_ID,
    metric_type: "cac",
    value: 420,
    change_percent: null,
    period: "2026-03",
    recorded_at: offsetHours(8),
  },
  {
    id: "metric-runway",
    user_id: DEMO_USER_ID,
    metric_type: "runway",
    value: 94,
    change_percent: null,
    period: "2026-03",
    recorded_at: offsetHours(8),
  },
];

export const demoAgentRuns: AgentRun[] = [
  {
    id: "run-01",
    user_id: DEMO_USER_ID,
    agent_type: "coworker",
    status: "completed",
    input: { task: "triage onboarding slip" },
    output: { summary: "Onboarding leak isolated to day-2 activation drop inside the import flow." },
    error: null,
    duration_ms: 5320,
    created_at: offsetHours(1),
    completed_at: offsetHours(1),
  },
  {
    id: "run-02",
    user_id: DEMO_USER_ID,
    agent_type: "finance",
    status: "completed",
    input: { task: "forecast runway" },
    output: { summary: "Runway compressed to 94 days if burn stays flat for the next 6 weeks." },
    error: null,
    duration_ms: 3180,
    created_at: offsetHours(3),
    completed_at: offsetHours(3),
  },
  {
    id: "run-03",
    user_id: DEMO_USER_ID,
    agent_type: "intelligence",
    status: "completed",
    input: { task: "health scan" },
    output: { summary: "Activation drag is concentrated in users who skip team invites in the first session." },
    error: null,
    duration_ms: 4620,
    created_at: offsetHours(6),
    completed_at: offsetHours(6),
  },
  {
    id: "run-04",
    user_id: DEMO_USER_ID,
    agent_type: "leads",
    status: "running",
    input: { task: "prospect search" },
    output: null,
    error: null,
    duration_ms: null,
    created_at: offsetHours(0.5),
    completed_at: null,
  },
];

export const demoConversations: Conversation[] = [
  {
    id: "conv-01",
    user_id: DEMO_USER_ID,
    agent_type: "coworker",
    title: "Investigate conversion drop",
    created_at: offsetHours(6),
    updated_at: offsetHours(1),
  },
  {
    id: "conv-02",
    user_id: DEMO_USER_ID,
    agent_type: "coworker",
    title: "Choose who to contact first",
    created_at: offsetHours(28),
    updated_at: offsetHours(25),
  },
  {
    id: "conv-03",
    user_id: DEMO_USER_ID,
    agent_type: "coworker",
    title: "Runway pressure test",
    created_at: offsetHours(76),
    updated_at: offsetHours(72),
  },
];

export const demoMessagesByConversation: Record<string, AgentMessage[]> = {
  "conv-01": [
    {
      id: "msg-01",
      role: "assistant",
      content:
        "Conversion is slipping because activation is bottlenecked in the import step. 41% of new users exit before they connect a source.",
      created_at: offsetHours(6),
    },
    {
      id: "msg-02",
      role: "user",
      content: "What should we fix first if we only have one engineer this week?",
      created_at: offsetHours(5.8),
    },
    {
      id: "msg-03",
      role: "assistant",
      content:
        "Start with the import dead-end.\n\n- Add sample data injection after 90 seconds idle.\n- Replace the blank-state error with a guided checklist.\n- Trigger a founder follow-up for accounts that stall before invite step.\n\nThat is the fastest path to reclaim 8-11 activation points.",
      created_at: offsetHours(5.7),
    },
  ],
  "conv-02": [
    {
      id: "msg-04",
      role: "user",
      content: "Who should I contact first next week?",
      created_at: offsetHours(28),
    },
    {
      id: "msg-05",
      role: "assistant",
      content:
        "Start with small software companies that are hiring their first salesperson. They usually need help now and are easier to reach with a personal message.",
      created_at: offsetHours(27.9),
    },
  ],
  "conv-03": [
    {
      id: "msg-06",
      role: "user",
      content: "Pressure test runway if we miss March growth.",
      created_at: offsetHours(76),
    },
    {
      id: "msg-07",
      role: "assistant",
      content:
        "Flat growth puts runway at 81 days. Protect cash by freezing contractor spend and pulling forward annual prepay offers this week.",
      created_at: offsetHours(75.8),
    },
  ],
};

export const demoLeads: Lead[] = [
  {
    id: "lead-01",
    user_id: DEMO_USER_ID,
    icp_id: "icp-01",
    name: "Aria Kent",
    company: "SignalForge",
    role: "Founder",
    email: "aria@signalforge.io",
    linkedin_url: "https://linkedin.com/in/ariakent",
    github_url: null,
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80",
    location: "San Francisco, CA",
    source: "linkedin",
    raw_data: {
      fullName: "Aria Kent",
      headline: "Founder at SignalForge",
      location: "San Francisco, CA",
      profileUrl: "https://linkedin.com/in/ariakent",
      company: "SignalForge",
      currentRole: "Founder",
      about: "Building simple tools that help small software teams stay on top of sales.",
    },
    icp_score: 91,
    intent_score: 88,
    signals: ["Raised $1.2M recently", "Hiring first salesperson", "Talking about lost customers"],
    score_reason: "Small software company with visible hiring and clear pressure to grow customers fast.",
    status: "new",
    notes: "Looks like a strong match for the current customer search.",
    email_draft: null,
    email_sent_at: null,
    sequence_step: 0,
    created_at: offsetHours(7),
    updated_at: offsetHours(7),
  },
  {
    id: "lead-02",
    user_id: DEMO_USER_ID,
    icp_id: "icp-01",
    name: "Miles Soto",
    company: "OpsHarbor",
    role: "Sales Operations Lead",
    email: "miles@opsharbor.com",
    linkedin_url: null,
    github_url: "https://github.com/milessoto",
    avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80",
    location: "Austin, TX",
    source: "github",
    raw_data: {
      login: "milessoto",
      name: "Miles Soto",
      bio: "Building tools that help small sales teams stay organised.",
      company: "OpsHarbor",
      location: "Austin, TX",
      profileUrl: "https://github.com/milessoto",
      topLanguages: ["TypeScript", "Go"],
    },
    icp_score: 84,
    intent_score: 81,
    signals: ["Said their sales system is messy", "Starting a new sales team"],
    score_reason: "Runs sales operations at a growing company and looks like they need a simpler workflow soon.",
    status: "contacted",
    notes: null,
    email_draft:
      "Subject: Quick idea for OpsHarbor\n\nSaw that you are building tools for a new sales team in Austin. We help small teams find the right customers and keep follow-up from slipping through the cracks. AssembleOne keeps customer finding, emails, and revenue tracking in one place. Want to take a quick look this week?",
    email_sent_at: offsetHours(9.5),
    sequence_step: 1,
    created_at: offsetHours(14),
    updated_at: offsetHours(10),
  },
  {
    id: "lead-03",
    user_id: DEMO_USER_ID,
    icp_id: "icp-01",
    name: "Nina Park",
    company: "SprintLayer",
    role: "CEO",
    email: "nina@sprintlayer.ai",
    linkedin_url: "https://linkedin.com/in/ninapark",
    github_url: null,
    avatar_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=240&q=80",
    location: "New York, NY",
    source: "manual",
    raw_data: {
      source: "manual",
      notes: "Imported from a manual customer research list.",
      profileUrl: "https://linkedin.com/in/ninapark",
    },
    icp_score: 79,
    intent_score: 74,
    signals: ["Just launched v2", "Users asking for analytics", "Hiring growth generalist"],
    score_reason: "Founder is actively shipping, hiring, and hearing analytics pain from early users.",
    status: "qualified",
    notes: null,
    email_draft: null,
    email_sent_at: null,
    sequence_step: 0,
    created_at: offsetHours(20),
    updated_at: offsetHours(18),
  },
];

export const demoICPProfile: ICPProfile = {
  id: "icp-01",
  user_id: DEMO_USER_ID,
  name: "Main Customer Group",
  description: "Small software company owners in the US and Europe who are actively trying to win more customers and need a simpler way to stay on top of sales.",
  industries: ["B2B SaaS"],
  industry: "B2B SaaS",
  company_size: "5-50",
  role_targets: ["Founder", "CEO", "Sales Operations"],
  signals: ["Hiring salesperson", "Raised money recently", "Talking about lost customers"],
  geography: "US / Europe",
  is_active: true,
  created_at: offsetHours(50),
};

export const demoIntelligenceAnalyses: Record<string, IntelligenceAnalysis> = {
  "Command Core": {
    product_name: "Command Core",
    health_score: 78,
    root_causes: [
      {
        description: "Day-2 activation collapses when users hit an empty import state.",
        likelihood: 86,
        evidence: ["46% onboarding dropoff in product metrics", "Support volume spikes after first login"],
      },
      {
        description: "Team invite step is buried too late in the flow, delaying collaborative value.",
        likelihood: 74,
        evidence: ["Weekly retention stalls at 58%", "Accounts with 2+ seats retain 19 points higher"],
      },
    ],
    fix_paths: [
      {
        title: "Patch import friction before expansion work",
        effort: "low",
        confidence: 88,
        expected_impact: "Recover 8-11 activation points in 14 days.",
        time_to_results: "10-14 days",
        steps: [
          "Inject demo data after 90 seconds of inactivity.",
          "Rewrite import blank state with explicit next actions.",
          "Fire a founder follow-up automation for stalled accounts.",
        ],
      },
      {
        title: "Pull collaborative value earlier",
        effort: "medium",
        confidence: 71,
        expected_impact: "Lift week-2 retention by 6-8 points.",
        time_to_results: "3-4 weeks",
        steps: [
          "Move invite teammates into the first-run checklist.",
          "Gate the insight wall behind at least one teammate action.",
          "Track invite completion as a primary activation event.",
        ],
      },
    ],
    summary: "The product is viable, but activation is leaking before the user reaches the multi-player moment.",
  },
  "Revenue Grid": {
    product_name: "Revenue Grid",
    health_score: 69,
    root_causes: [
      {
        description: "Pricing power is muted because expansion triggers are not tied to usage thresholds.",
        likelihood: 79,
        evidence: ["Expansion rate is 11%", "Trial-to-paid conversion is 19%"],
      },
      {
        description: "CAC payback is extending due to broad acquisition channels.",
        likelihood: 68,
        evidence: ["Payback time is 4.1 months", "Cost to win a customer is high for current monthly revenue"],
      },
    ],
    fix_paths: [
      {
        title: "Resegment pricing around operator seats and data volume",
        effort: "medium",
        confidence: 77,
        expected_impact: "Improve expansion revenue within 30-45 days.",
        time_to_results: "4-6 weeks",
        steps: [
          "Define one usage threshold tied to reporting depth.",
          "Introduce annual prepay discount with implementation credit.",
          "Message the plan change inside the finance report view.",
        ],
      },
    ],
    summary: "The money side is working, but pricing and marketing focus are still leaving growth on the table.",
  },
};

export const demoFinanceAnalysis: FinanceAnalysis = {
  mrr: 4280,
  arr: 51360,
  mrr_change: 12,
  churn_rate: 2.3,
  ltv: 1840,
  cac: 420,
  runway_days: 94,
  runway_forecast: {
    days_30: 91,
    days_60: 84,
    days_90: 72,
    burn_rate: 3800,
  },
  insights: [
    "Monthly revenue is growing, but current spending leaves less than 14 weeks of cushion.",
    "Customer value is about 4.4 times the cost to win a customer, which is healthy enough to keep growing carefully.",
    "A 15% expense trim extends runway by roughly 18 days at the current pace.",
  ],
  alerts: ["Cash left drops below 75 days in the 90-day view if upsells slow down."],
};

export const demoLeadSearchResult: LeadSearchResult = {
  leads: demoLeads.map((lead) => ({
    name: lead.name,
    company: lead.company ?? "Unknown",
    role: lead.role ?? "Unknown",
    source: (lead.source as LeadSearchResult["leads"][number]["source"]) ?? "linkedin",
    icp_score: lead.icp_score,
    intent_score: lead.intent_score,
    signals: lead.signals,
    reason: "This person matches the customer description and looks active right now.",
  })),
  total_found: demoLeads.length,
  sources_searched: ["linkedin", "github"],
  icp_profile: demoICPProfile.description,
};

export function generateMockCoworkerReply(prompt: string) {
  const normalized = prompt.toLowerCase();

  if (normalized.includes("lead") || normalized.includes("pipeline")) {
    return [
      "The issue is who you are targeting, not how many people you are contacting.",
      "",
      "- Narrow your customer list to companies hiring sales or operations help right now.",
      "- Rewrite any email that does not mention the real pain in the first line.",
      "- Follow up within 24 hours when someone posts about hiring or growth.",
      "",
      "Fastest win: tighten the list before you send more emails.",
    ].join("\n");
  }

  if (normalized.includes("revenue") || normalized.includes("runway")) {
    return [
      "The pressure point is cash timing, not demand.",
      "",
      "- Offer annual prepay deals to your 5 healthiest accounts this week.",
      "- Freeze any spend that does not help people buy or stay.",
      "- Rework pricing before adding more places to advertise.",
      "",
      "That buys time without slowing the core engine.",
    ].join("\n");
  }

  return [
    "The main issue is a weak handoff between interest and first action.",
    "",
    "- Fix the first broken moment in the customer journey.",
    "- Give one person clear ownership for the next 7 days.",
    "- Run one quick test and one longer fix at the same time.",
    "",
    "Approve the path you want and I will structure the next move.",
  ].join("\n");
}

export function generateMockIntelligenceAnalysis(product: Partial<Product>): IntelligenceAnalysis {
  const score = Math.max(38, Math.min(92, product.health_score ?? 71));
  const productName = product.name ?? "Selected Product";

  return {
    product_name: productName,
    health_score: score,
    root_causes: [
      {
        description: "Activation is leaking before users reach the first high-value outcome.",
        likelihood: 84,
        evidence: ["Users hesitate during setup", "Healthy accounts invite teammates earlier"],
      },
      {
        description: "Retention depends too heavily on founder-driven follow-up.",
        likelihood: 67,
        evidence: ["Support requests spike after onboarding", "Return usage weakens after week one"],
      },
    ],
    fix_paths: [
      {
        title: "Shorten the path to first signal",
        effort: "low",
        confidence: 86,
        expected_impact: "Lift activation and reduce support load.",
        time_to_results: "7-14 days",
        steps: [
          "Collapse setup into one guided checklist.",
          "Inject demo insights before integrations finish.",
          "Instrument dropoff between each onboarding step.",
        ],
      },
      {
        title: "Automate the founder handoff",
        effort: "medium",
        confidence: 72,
        expected_impact: "Improve week-2 retention and cut manual rescue work.",
        time_to_results: "3-4 weeks",
        steps: [
          "Trigger lifecycle nudges off incomplete jobs.",
          "Score accounts by setup depth and invite velocity.",
          "Escalate only high-risk accounts to manual outreach.",
        ],
      },
    ],
    summary: `${productName} is not broken, but the product still relies on manual rescue where the system should carry the load.`,
  };
}

export function generateMockFinanceAnalysis(input: Record<string, unknown>): FinanceAnalysis {
  const mrr = Number(input.mrr ?? 4280);
  const monthlyExpenses = Number(input.monthlyExpenses ?? 8200);
  const customerCount = Number(input.customerCount ?? 23);
  const avgPlanPrice = Number(input.avgPlanPrice ?? Math.max(1, Math.round(mrr / Math.max(customerCount, 1))));
  const churnRate = Number(input.churnRate ?? 2.3);
  const arr = mrr * 12;
  const burnRate = Math.max(monthlyExpenses - mrr, 1800);
  const runway = Math.max(28, Math.round((42000 / burnRate) * 30));

  return {
    mrr,
    arr,
    mrr_change: 11.6,
    churn_rate: churnRate,
    ltv: Math.round(avgPlanPrice * (100 / Math.max(churnRate, 1))),
    cac: 420,
    runway_days: runway,
    runway_forecast: {
      days_30: Math.max(runway - 3, 21),
      days_60: Math.max(runway - 10, 18),
      days_90: Math.max(runway - 22, 12),
      burn_rate: burnRate,
    },
    insights: [
      "Revenue is moving in the right direction, but burn is still ahead of predictable cash generation.",
      "You can keep paying to grow if the cost to win a customer stays around the current level.",
      "The fastest way to extend cash is pricing and payment timing, not spending more to get attention.",
    ],
    alerts: runway < 90 ? ["Cash left is getting tight. Cut spending now."] : [],
  };
}

export function generateMockLeadSearch(input: Record<string, unknown>): LeadSearchResult {
  const roleTargets = String(input.roleTargets ?? "Owner")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const industry = String(input.industry ?? "small business");
  const geography = String(input.geography ?? "your area");
  const count = Math.min(Number(input.leadCount ?? 10), 10);
  const roles = roleTargets.length ? roleTargets : ["Owner"];
  const leads = Array.from({ length: count }).map((_, index) => ({
    name: ["Maya Brooks", "Leo Hart", "Nora Flynn", "Theo Shaw", "Rina Cole"][index % 5],
    company: ["AxisRelay", "SignalNorth", "OrbitLane", "ForgeMetric", "GridPatch"][index % 5],
    role: roles[index % roles.length],
    source: ["linkedin", "github"][index % 2] as LeadSearchResult["leads"][number]["source"],
    icp_score: 92 - index * 3,
    intent_score: 89 - index * 4,
    signals: [
      "Hiring first salesperson",
      "Raised money recently",
      "Talking publicly about sales problems",
    ].slice(0, 2 + (index % 2)),
    reason: `Strong fit because this business works in ${industry} and seems likely to need help soon in ${geography}.`,
  }));

  return {
    leads,
    total_found: leads.length,
    sources_searched: Array.from(new Set(leads.map((lead) => lead.source))),
    icp_profile: `${industry} businesses in ${geography} targeting ${roles.join(", ")} who look ready for help soon.`,
  };
}
