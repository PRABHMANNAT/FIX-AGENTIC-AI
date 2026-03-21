import OpenAI from "openai";
import type {
  AgentMessage,
  BMOProfile,
  BMOProfileUpdate,
  DashboardChatResponse,
  DashboardArtifactView,
  EmailDraft,
  FinanceAnalysis,
  IntelligenceAnalysis,
  LeadSearchResult,
  LeadSource,
  OnboardChatMessage,
  OnboardChatResponse,
  OnboardMode,
  OnboardAnalysis,
  ScoredLead,
} from "@/types";

type OpenAIInputMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
export const isOpenAIConfigured = Boolean(process.env.OPENAI_API_KEY);

let openAIClient: OpenAI | null = null;

function getOpenAIClient() {
  if (!isOpenAIConfigured) {
    return null;
  }

  if (!openAIClient) {
    openAIClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openAIClient;
}

function extractText(response: Awaited<ReturnType<OpenAI["responses"]["create"]>>) {
  if ("output_text" in response && typeof response.output_text === "string") {
    return response.output_text.trim();
  }

  return "";
}

export function parseJson<T>(raw: string): T {
  const clean = raw.replace(/```json|```/gi, "").trim();

  try {
    return JSON.parse(clean) as T;
  } catch {
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1) {
      return JSON.parse(clean.slice(firstBrace, lastBrace + 1)) as T;
    }

    throw new Error("Our AI sent something we couldn't read.");
  }
}

function withContext(systemPrompt: string, context?: Record<string, unknown>) {
  if (!context || !Object.keys(context).length) {
    return systemPrompt;
  }

  return `${systemPrompt}\n\nCurrent structured context:\n${JSON.stringify(context, null, 2)}`;
}

function normalizeMessages(messages: AgentMessage[]) {
  return messages
    .filter((message) => message.content.trim().length > 0)
    .map(
      (message) =>
        ({
          role: message.role,
          content: message.content,
        }) satisfies OpenAIInputMessage,
    );
}

async function createTextResponse(params: {
  messages: OpenAIInputMessage[];
  temperature: number;
  maxOutputTokens: number;
}) {
  const client = getOpenAIClient();

  if (!client) {
    return null;
  }

  const response = await client.responses.create({
    model: OPENAI_MODEL,
    input: params.messages,
    temperature: params.temperature,
    max_output_tokens: params.maxOutputTokens,
    store: false,
  });

  return extractText(response);
}

export const COWORKER_SYSTEM_PROMPT = `You are the AI assistant for AssembleOne.

You help small business owners understand what is happening, what to do next, and what result to expect.

Rules:
- Use plain English
- Never use jargon without explaining it
- Be direct and practical
- Give the answer first, then the next steps
- If you mention a number, say what it means`;

export const INTELLIGENCE_SYSTEM_PROMPT = `You explain why sales or usage may be dropping.

Output ONLY valid JSON:
{
  "product_name": string,
  "health_score": number,
  "root_causes": [{"description": string, "likelihood": number, "evidence": string[]}],
  "fix_paths": [{"title": string, "effort": "low"|"medium"|"high", "confidence": number, "expected_impact": string, "time_to_results": string, "steps": string[]}],
  "summary": string
}`;

export const FINANCE_SYSTEM_PROMPT = `You are a finance helper for small businesses.

Output ONLY valid JSON:
{
  "mrr": number,
  "arr": number,
  "mrr_change": number,
  "churn_rate": number,
  "ltv": number,
  "cac": number,
  "runway_days": number,
  "runway_forecast": {"days_30": number, "days_60": number, "days_90": number, "burn_rate": number},
  "insights": string[],
  "alerts": string[]
}`;

const ANALYZE_SYSTEM = `You are an onboarding agent for AssembleOne - a platform that helps ANY business find customers automatically.

A business owner just described their business in plain English. Your job is to understand their context and decide if you need one follow-up question, or if you have enough to configure their workspace.

RULES:
- Never use jargon: no "ICP", "MRR", "churn", "pipeline", "outbound", "north star metric"
- The followup_question must be in plain English, conversational, max 8 words
- If the description mentions location + target customer + what they sell, set ready_to_build: true
- If geography is unclear for a local business, ask about it
- options array: 2-3 short answer pills the user can tap (or null for free text)

Output ONLY valid JSON, no markdown:
{
  "ready_to_build": boolean,
  "followup_question": string | null,
  "followup_options": string[] | null,
  "partial_profile": {
    "business_name": string,
    "industry": string,
    "geography": string | null,
    "who_they_serve": string | null
  }
}`;

const BUILD_SYSTEM = `You are an onboarding agent for AssembleOne. Based on a business description (and optional follow-up answer), infer the complete business profile and configure their workspace.

Output ONLY valid JSON, no markdown:
{
  "business_name": string,
  "industry": string,
  "what_they_do": string,
  "who_they_serve": string,
  "primary_goal": string,
  "geography": string,
  "market_type": "local" | "national" | "global",
  "agents_needed": array of strings from ["find_customers", "email_outreach", "finance", "social_media"],
  "icp_description": string,
  "linkedin_search_query": string,
  "github_search_query": string | null,
  "suggested_email_hook": string,
  "synthesis_lines": {
    "line1": string,
    "line2": string,
    "line3": string,
    "line4": string
  }
}

AGENT SELECTION RULES:
- ALWAYS include "find_customers"
- Include "email_outreach" if they want to reach out to customers
- Include "finance" only if they mention revenue, pricing, money tracking
- Include "social_media" only if they mention content, posts, marketing
- Max 3 agents for simple local businesses
- Max 4 agents for tech startups`;

const SCORER_SYSTEM = `You are a customer matching agent for AssembleOne. You receive scraped profiles and a description of who the business wants to reach. Score each profile on how well they match.

OUTPUT: Return ONLY valid JSON, no markdown.

{
  "scored_leads": [{
    "profile_index": number,
    "name": string,
    "company": string | null,
    "role": string | null,
    "email": string | null,
    "source": "linkedin" | "github",
    "match_score": number,
    "buying_readiness": number,
    "signals": string[],
    "why_good_fit": string
  }]
}

SCORING RULES:
- match_score: How well they match the customer description
- buying_readiness: How likely they are to be interested right now
- signals: Write like a human, not a CRM
- why_good_fit: One sentence a non-technical person would understand
- ONLY include profiles with match_score >= 50
- Sort by match_score descending`;

const EMAIL_SYSTEM = `You write short, friendly cold emails for business owners reaching out to potential customers.

RULES:
- Max 4 sentences total
- Sound like a real person, not a salesperson
- First sentence: mention something specific about them
- Second sentence: the problem you solve for people like them
- Third sentence: what you offer, simply explained
- Last sentence: one easy ask
- Never say "I hope this finds you well", "synergy", "leverage", "reach out"
- Write like a local business owner texting a neighbour

Output ONLY valid JSON:
{
  "subject": string,
  "body": string,
  "what_we_personalised": string
}`;

const CENTRAL_CHAT_SYSTEM = `You are the Central AI Agent for AssembleOne - a unified business operating system. You have full context on the user's business from their onboarding profile.

PERSONALITY:
- Direct
- Fast
- No fluff
- You speak like a senior operator who knows the business inside out
- You do not explain obvious things

RESPONSE FORMAT - return JSON:
{
  "message": "your response (conversational, max 3 sentences)",
  "artifact_switch": null | "home" | "leads" | "sequences" | "revenue" | "warroom" | "integrations",
  "terminal_lines": null | string[],
  "action_button": null | { "label": string, "action": string, "type": "primary"|"default"|"halt" },
  "execute": null | { "type": "scrape_leads"|"draft_email"|"analyze_finance", "params": {} },
  "data_refresh": boolean
}

TRIGGER RULES:
- User mentions "find", "customers", "leads", "search" -> artifact_switch: "leads"
- User mentions "email", "outreach", "sequence", "follow up" -> artifact_switch: "sequences"
- User mentions "revenue", "money", "finance", "runway", "burn" -> artifact_switch: "revenue"
- User mentions "war room", "mission", "parallel", "all agents" -> artifact_switch: "warroom"
- User asks "how am I doing", "overview", "home" -> artifact_switch: "home"

For any execution action, include terminal_lines that feel like real system operations.
Never just describe what you could do - say what you are doing and do it.`;

const CHAT_SYSTEM = `You are an onboarding assistant for AssembleOne - a platform that helps any business find customers automatically. You're having a natural conversation to understand someone's business so you can configure their workspace.

CONVERSATION RULES:
- Ask ONE question per message, never multiple
- Keep your messages SHORT: 1 sentence of acknowledgment + 1 question. Max 40 words total.
- Sound like a smart friend, not a chatbot. Casual, direct, no fluff.
- Never use jargon: no "ICP", "MRR", "outbound", "pipeline", "north star metric", "conversion"
- After 4-6 exchanges, if you have enough context, set ready_to_build: true in your metadata

WHAT YOU NEED TO LEARN:
1. What they do + who they serve
2. Their primary goal right now
3. How they currently get customers
4. What's not working / what they wish they had
5. Specific details about their ideal customer
6. Anything else important if needed

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "message": "your conversational response here",
  "profile_update": {
    "business_name": string | null,
    "industry": string | null,
    "what_they_do": string | null,
    "who_they_serve": string | null,
    "primary_goal": string | null,
    "geography": string | null,
    "market_type": "local" | "national" | "global" | null,
    "agents_needed": string[] | null,
    "linkedin_search_query": string | null,
    "github_search_query": string | null,
    "suggested_email_hook": string | null,
    "icp_description": string | null
  },
  "ready_to_build": false,
  "next_topic": "goal" | "acquisition" | "pain_point" | "details" | "done"
}

Only populate profile_update fields you've actually learned. Null means unknown.
When ready_to_build is true, populate ALL profile_update fields with your best inference.`;

const FINALIZE_SYSTEM = `Based on this business conversation, fill in any missing fields in the business profile and return ONLY valid JSON.

Rules:
- Use plain English
- Keep descriptions specific and practical
- "what_they_do" should sound like the owner's own words
- "who_they_serve" should be concrete
- "primary_goal" should describe the single main outcome they want right now
- "market_type" must be "local", "national", or "global"
- "agents_needed" must include "find_customers" and may include "email_outreach", "finance", "social_media"
- "linkedin_search_query" should be specific enough to find real customers
- "github_search_query" should only be used when GitHub is relevant

Return this exact shape:
{
  "business_name": string,
  "industry": string,
  "what_they_do": string,
  "who_they_serve": string,
  "primary_goal": string,
  "geography": string,
  "market_type": "local" | "national" | "global",
  "agents_needed": array of strings from ["find_customers", "email_outreach", "finance", "social_media"],
  "icp_description": string,
  "linkedin_search_query": string,
  "github_search_query": string | null,
  "suggested_email_hook": string,
  "synthesis_lines": {
    "line1": string,
    "line2": string,
    "line3": string,
    "line4": string
  }
}`;

const VALID_AGENT_IDS = ["find_customers", "email_outreach", "finance", "social_media"] as const;

function emptyProfileUpdate(): BMOProfileUpdate {
  return {
    business_name: null,
    industry: null,
    what_they_do: null,
    who_they_serve: null,
    primary_goal: null,
    geography: null,
    market_type: null,
    agents_needed: null,
    linkedin_search_query: null,
    github_search_query: null,
    suggested_email_hook: null,
    icp_description: null,
  };
}

function normalizeAgentIds(value: unknown): BMOProfile["agents_needed"] {
  if (!Array.isArray(value)) {
    return ["find_customers"];
  }

  const valid = value.filter(
    (agent): agent is BMOProfile["agents_needed"][number] =>
      typeof agent === "string" &&
      (VALID_AGENT_IDS as readonly string[]).includes(agent),
  );

  return valid.length ? valid : ["find_customers"];
}

function buildSynthesisLines(profile: Pick<
  BMOProfile,
  | "business_name"
  | "industry"
  | "geography"
  | "who_they_serve"
  | "agents_needed"
  | "primary_goal"
>) {
  const teamLabels: Record<BMOProfile["agents_needed"][number], string> = {
    find_customers: "Find Customers",
    email_outreach: "Email Outreach",
    finance: "My Revenue",
    social_media: "Social Media",
  };

  return {
    line1: `${profile.business_name} · ${profile.industry} · ${profile.geography}`,
    line2: `Customer finder: ${profile.who_they_serve}`,
    line3: `AI team: ${profile.agents_needed.map((agent) => teamLabels[agent]).join(" · ")}`,
    line4: `Goal: ${profile.primary_goal}`,
  };
}

function normalizeProfileUpdate(value: Partial<BMOProfileUpdate> | null | undefined): BMOProfileUpdate {
  const base = emptyProfileUpdate();

  if (!value) {
    return base;
  }

  return {
    business_name: typeof value.business_name === "string" ? value.business_name : null,
    industry: typeof value.industry === "string" ? value.industry : null,
    what_they_do: typeof value.what_they_do === "string" ? value.what_they_do : null,
    who_they_serve: typeof value.who_they_serve === "string" ? value.who_they_serve : null,
    primary_goal: typeof value.primary_goal === "string" ? value.primary_goal : null,
    geography: typeof value.geography === "string" ? value.geography : null,
    market_type:
      value.market_type === "local" || value.market_type === "national" || value.market_type === "global"
        ? value.market_type
        : null,
    agents_needed: Array.isArray(value.agents_needed)
      ? normalizeAgentIds(value.agents_needed)
      : null,
    linkedin_search_query:
      typeof value.linkedin_search_query === "string" ? value.linkedin_search_query : null,
    github_search_query: typeof value.github_search_query === "string" ? value.github_search_query : null,
    suggested_email_hook:
      typeof value.suggested_email_hook === "string" ? value.suggested_email_hook : null,
    icp_description: typeof value.icp_description === "string" ? value.icp_description : null,
  };
}

function normalizeBMOProfile(value: Partial<BMOProfile> | null | undefined): BMOProfile {
  const business_name =
    typeof value?.business_name === "string" && value.business_name.trim()
      ? value.business_name.trim()
      : "Your Business";
  const industry =
    typeof value?.industry === "string" && value.industry.trim()
      ? value.industry.trim()
      : "local business";
  const geography =
    typeof value?.geography === "string" && value.geography.trim()
      ? value.geography.trim()
      : "your area";
  const what_they_do =
    typeof value?.what_they_do === "string" && value.what_they_do.trim()
      ? value.what_they_do.trim()
      : "This business helps people solve a real local problem.";
  const who_they_serve =
    typeof value?.who_they_serve === "string" && value.who_they_serve.trim()
      ? value.who_they_serve.trim()
      : "people who are most likely to need this business";
  const primary_goal =
    typeof value?.primary_goal === "string" && value.primary_goal.trim()
      ? value.primary_goal.trim()
      : "get more customers";
  const market_type =
    value?.market_type === "local" || value?.market_type === "national" || value?.market_type === "global"
      ? value.market_type
      : "local";
  const agents_needed = normalizeAgentIds(value?.agents_needed);
  const icp_description =
    typeof value?.icp_description === "string" && value.icp_description.trim()
      ? value.icp_description.trim()
      : `${who_they_serve} in ${geography} who are likely to benefit from ${business_name}.`;
  const linkedin_search_query =
    typeof value?.linkedin_search_query === "string" && value.linkedin_search_query.trim()
      ? value.linkedin_search_query.trim()
      : `${who_they_serve} ${geography}`.trim();
  const github_search_query =
    typeof value?.github_search_query === "string" && value.github_search_query.trim()
      ? value.github_search_query.trim()
      : null;
  const suggested_email_hook =
    typeof value?.suggested_email_hook === "string" && value.suggested_email_hook.trim()
      ? value.suggested_email_hook.trim()
      : `Mention the problem ${who_they_serve} are dealing with right now and offer a simple next step.`;
  const synthesis_lines =
    value?.synthesis_lines?.line1 &&
    value?.synthesis_lines?.line2 &&
    value?.synthesis_lines?.line3 &&
    value?.synthesis_lines?.line4
      ? value.synthesis_lines
      : buildSynthesisLines({
          business_name,
          industry,
          geography,
          who_they_serve,
          agents_needed,
          primary_goal,
        });

  return {
    business_name,
    industry,
    what_they_do,
    who_they_serve,
    primary_goal,
    geography,
    market_type,
    agents_needed,
    icp_description,
    linkedin_search_query,
    github_search_query,
    suggested_email_hook,
    synthesis_lines,
  };
}

export async function runCoworkerAgent(
  messages: AgentMessage[],
  context?: Record<string, unknown>,
) {
  return createTextResponse({
    messages: [
      {
        role: "system",
        content: withContext(COWORKER_SYSTEM_PROMPT, context),
      },
      ...normalizeMessages(messages),
    ],
    temperature: 0.35,
    maxOutputTokens: 1200,
  });
}

export async function runIntelligenceAgent(
  payload: Record<string, unknown>,
): Promise<IntelligenceAnalysis> {
  const rawText = await createTextResponse({
    messages: [
      {
        role: "system",
        content: INTELLIGENCE_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: JSON.stringify(payload),
      },
    ],
    temperature: 0.2,
    maxOutputTokens: 1400,
  });

  if (!rawText) {
    throw new Error("Our AI is taking a moment. Try again in a few seconds.");
  }

  return parseJson<IntelligenceAnalysis>(rawText);
}

export async function runFinanceAgent(payload: Record<string, unknown>): Promise<FinanceAnalysis> {
  const rawText = await createTextResponse({
    messages: [
      {
        role: "system",
        content: FINANCE_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: JSON.stringify(payload),
      },
    ],
    temperature: 0.2,
    maxOutputTokens: 1200,
  });

  if (!rawText) {
    throw new Error("Our AI is taking a moment. Try again in a few seconds.");
  }

  return parseJson<FinanceAnalysis>(rawText);
}

export async function analyzeBusinessDescription(description: string): Promise<OnboardAnalysis> {
  const rawText = await createTextResponse({
    messages: [
      {
        role: "system",
        content: ANALYZE_SYSTEM,
      },
      {
        role: "user",
        content: description,
      },
    ],
    temperature: 0.3,
    maxOutputTokens: 700,
  });

  if (!rawText) {
    throw new Error("Our AI is taking a moment. Try again in a few seconds.");
  }

  return parseJson<OnboardAnalysis>(rawText);
}

export async function buildBMOProfile(params: {
  description: string;
  followupAnswer?: string;
}): Promise<BMOProfile> {
  const prompt = [
    `Business description: ${params.description}`,
    params.followupAnswer ? `Follow-up answer: ${params.followupAnswer}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const rawText = await createTextResponse({
    messages: [
      {
        role: "system",
        content: BUILD_SYSTEM,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.35,
    maxOutputTokens: 1600,
  });

  if (!rawText) {
    throw new Error("Our AI is taking a moment. Try again in a few seconds.");
  }

  return parseJson<BMOProfile>(rawText);
}

export async function runOnboardChat(params: {
  messages: OnboardChatMessage[];
  currentProfile?: Partial<BMOProfile> | null;
  mode?: OnboardMode;
}): Promise<OnboardChatResponse> {
  const rawText = await createTextResponse({
    messages: [
      {
        role: "system",
        content: CHAT_SYSTEM,
      },
      {
        role: "user",
        content: JSON.stringify({
          mode: params.mode ?? "build",
          current_profile: params.currentProfile ?? null,
          conversation: params.messages,
        }),
      },
    ],
    temperature: 0.45,
    maxOutputTokens: 1100,
  });

  if (!rawText) {
    throw new Error("Our AI is taking a moment. Try again in a few seconds.");
  }

  const parsed = parseJson<Partial<OnboardChatResponse>>(rawText);

  return {
    message:
      typeof parsed.message === "string" && parsed.message.trim()
        ? parsed.message.trim()
        : "Tell me a bit more about the kind of customer you want to reach.",
    profile_update: normalizeProfileUpdate(parsed.profile_update),
    ready_to_build: Boolean(parsed.ready_to_build),
    next_topic:
      parsed.next_topic === "goal" ||
      parsed.next_topic === "acquisition" ||
      parsed.next_topic === "pain_point" ||
      parsed.next_topic === "details" ||
      parsed.next_topic === "done"
        ? parsed.next_topic
        : "details",
  };
}

export async function finalizeBMOProfile(params: {
  profile?: Partial<BMOProfile> | Partial<BMOProfileUpdate> | null;
  conversation: OnboardChatMessage[];
  mode?: OnboardMode;
}): Promise<BMOProfile> {
  const partial = params.profile ?? {};
  const needsInference =
    !partial ||
    typeof partial.business_name !== "string" ||
    typeof partial.industry !== "string" ||
    typeof partial.what_they_do !== "string" ||
    typeof partial.who_they_serve !== "string" ||
    typeof partial.primary_goal !== "string" ||
    typeof partial.geography !== "string" ||
    !Array.isArray(partial.agents_needed) ||
    typeof partial.icp_description !== "string" ||
    typeof partial.linkedin_search_query !== "string" ||
    typeof partial.suggested_email_hook !== "string" ||
    !partial.synthesis_lines;

  if (!needsInference) {
    return normalizeBMOProfile(partial as Partial<BMOProfile>);
  }

  const rawText = await createTextResponse({
    messages: [
      {
        role: "system",
        content: FINALIZE_SYSTEM,
      },
      {
        role: "user",
        content: JSON.stringify({
          mode: params.mode ?? "build",
          partial_profile: partial,
          conversation: params.conversation,
        }),
      },
    ],
    temperature: 0.3,
    maxOutputTokens: 1800,
  });

  if (!rawText) {
    return normalizeBMOProfile(partial as Partial<BMOProfile>);
  }

  return normalizeBMOProfile(parseJson<Partial<BMOProfile>>(rawText));
}

export async function runLeadsAgent(payload: Record<string, unknown>): Promise<LeadSearchResult> {
  const rawText = await createTextResponse({
    messages: [
      {
        role: "user",
        content: JSON.stringify(payload),
      },
    ],
    temperature: 0.3,
    maxOutputTokens: 1600,
  });

  if (!rawText) {
    throw new Error("Our AI is taking a moment. Try again in a few seconds.");
  }

  return parseJson<LeadSearchResult>(rawText);
}

export async function scoreBatchWithOpenAI(
  rawProfiles: unknown[],
  icpDescription: string,
  source: LeadSource,
): Promise<ScoredLead[]> {
  const rawText = await createTextResponse({
    messages: [
      {
        role: "system",
        content: SCORER_SYSTEM,
      },
      {
        role: "user",
        content: `Customer description:\n${icpDescription}\n\nProfiles to score (source: ${source}):\n${JSON.stringify(rawProfiles, null, 2)}`,
      },
    ],
    temperature: 0.2,
    maxOutputTokens: 4096,
  });

  if (!rawText) {
    throw new Error("Our AI is taking a moment. Try again in a few seconds.");
  }

  try {
    const parsed = parseJson<{
      scored_leads?: Array<{
        profile_index: number;
        name: string;
        company: string | null;
        role: string | null;
        email: string | null;
        source: LeadSource;
        match_score: number;
        buying_readiness: number;
        signals: string[];
        why_good_fit: string;
      }>;
    }>(rawText);

    return (parsed.scored_leads ?? []).map((lead) => ({
      profile_index: lead.profile_index,
      name: lead.name,
      company: lead.company,
      role: lead.role,
      email: lead.email,
      source: lead.source,
      icp_score: lead.match_score,
      intent_score: lead.buying_readiness,
      signals: lead.signals,
      score_reason: lead.why_good_fit,
      match_score: lead.match_score,
      buying_readiness: lead.buying_readiness,
      why_good_fit: lead.why_good_fit,
    }));
  } catch {
    console.error("OpenAI scorer parse error. Raw response:", rawText);
    return [];
  }
}

export async function generateEmailDraft(params: {
  leadName: string;
  leadRole: string | null;
  leadCompany: string | null;
  leadSignals: string[];
  leadReason: string | null;
  rawData: Record<string, unknown> | null;
  senderName: string;
  senderCompany: string;
  valueProp: string;
}): Promise<EmailDraft> {
  const rawText = await createTextResponse({
    messages: [
      {
        role: "system",
        content: EMAIL_SYSTEM,
      },
      {
        role: "user",
        content: `
Customer:
- Name: ${params.leadName}
- Role: ${params.leadRole || "Unknown"}
- Company: ${params.leadCompany || "Unknown"}
- Signals: ${params.leadSignals.join(", ") || "None noted"}
- Why they might be a good fit: ${params.leadReason || "Strong fit"}
- Raw profile: ${JSON.stringify(params.rawData || {}, null, 2)}

Business owner:
- Name: ${params.senderName}
- Business: ${params.senderCompany}
- Offer: ${params.valueProp}

Write the email.`,
      },
    ],
    temperature: 0.4,
    maxOutputTokens: 900,
  });

  if (!rawText) {
    throw new Error("Our AI is taking a moment. Try again in a few seconds.");
  }

  try {
    const parsed = parseJson<{
      subject: string;
      body: string;
      what_we_personalised: string;
    }>(rawText);

    return {
      subject: parsed.subject,
      body: parsed.body,
      personalization_hook: parsed.what_we_personalised,
      what_we_personalised: parsed.what_we_personalised,
    };
  } catch {
    console.error("OpenAI email draft parse error. Raw response:", rawText);
    throw new Error("We couldn't write that email just now. Try again.");
  }
}

function normalizeArtifactSwitch(value: unknown): DashboardArtifactView | null {
  return value === "home" ||
    value === "agent" ||
    value === "leads" ||
    value === "sequences" ||
    value === "revenue" ||
    value === "warroom" ||
    value === "integrations"
    ? value
    : null;
}

export async function runCentralDashboardChat(params: {
  messages: AgentMessage[];
  bmoContext?: BMOProfile | null;
}): Promise<DashboardChatResponse> {
  const rawText = await createTextResponse({
    messages: [
      {
        role: "system",
        content: withContext(CENTRAL_CHAT_SYSTEM, {
          bmo_context: params.bmoContext ?? null,
        }),
      },
      ...normalizeMessages(params.messages),
    ],
    temperature: 0.35,
    maxOutputTokens: 1600,
  });

  if (!rawText) {
    throw new Error("Our AI is taking a moment. Try again in a few seconds.");
  }

  const parsed = parseJson<Partial<DashboardChatResponse>>(rawText);

  return {
    message:
      typeof parsed.message === "string" && parsed.message.trim()
        ? parsed.message.trim()
        : "I’m on it. I’ll show the result on the right as soon as it’s ready.",
    artifact_switch: normalizeArtifactSwitch(parsed.artifact_switch),
    terminal_lines: Array.isArray(parsed.terminal_lines)
      ? parsed.terminal_lines.filter((line): line is string => typeof line === "string" && line.trim().length > 0)
      : null,
    action_button:
      parsed.action_button &&
      typeof parsed.action_button === "object" &&
      typeof parsed.action_button.label === "string" &&
      typeof parsed.action_button.action === "string" &&
      (parsed.action_button.type === "primary" ||
        parsed.action_button.type === "default" ||
        parsed.action_button.type === "halt")
        ? parsed.action_button
        : null,
    execute:
      parsed.execute &&
      typeof parsed.execute === "object" &&
      (parsed.execute.type === "scrape_leads" ||
        parsed.execute.type === "draft_email" ||
        parsed.execute.type === "analyze_finance")
        ? {
            type: parsed.execute.type,
            params:
              parsed.execute.params && typeof parsed.execute.params === "object"
                ? parsed.execute.params
                : {},
          }
        : null,
    data_refresh: Boolean(parsed.data_refresh),
    executed_data:
      parsed.executed_data && typeof parsed.executed_data === "object" ? parsed.executed_data : null,
  };
}
