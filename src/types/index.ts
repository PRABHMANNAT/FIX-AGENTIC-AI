export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type LeadSource = "linkedin" | "github" | "manual";
export type LeadStatus = "new" | "contacted" | "replied" | "qualified" | "lost";
export type ScrapeRunStatus = "running" | "completed" | "failed";
export type AgentType = "coworker" | "intelligence" | "finance" | "leads";
export type MessageRole = "user" | "assistant";
export type AgentRunStatus = "running" | "completed" | "failed";
export type BMOAgentId =
  | "find_customers"
  | "email_outreach"
  | "finance"
  | "social_media";
export type MarketType = "local" | "national" | "global";
export type OnboardMode = "build" | "enhance";
export type OnboardNextTopic = "goal" | "acquisition" | "pain_point" | "details" | "done";
export type BusinessMetricType =
  | "mrr"
  | "arr"
  | "churn"
  | "ltv"
  | "cac"
  | "runway"
  | "revenue";

export interface OnboardAnalysis {
  ready_to_build: boolean;
  followup_question: string | null;
  followup_options: string[] | null;
  partial_profile: {
    business_name: string;
    industry: string;
    geography: string | null;
    who_they_serve: string | null;
  };
}

export interface BMOProfile {
  business_name: string;
  industry: string;
  what_they_do: string;
  who_they_serve: string;
  primary_goal: string;
  geography: string;
  market_type: MarketType;
  agents_needed: BMOAgentId[];
  icp_description: string;
  linkedin_search_query: string;
  github_search_query: string | null;
  suggested_email_hook: string;
  synthesis_lines: {
    line1: string;
    line2: string;
    line3: string;
    line4: string;
  };
}

export interface BMOProfileUpdate {
  business_name: string | null;
  industry: string | null;
  what_they_do: string | null;
  who_they_serve: string | null;
  primary_goal: string | null;
  geography: string | null;
  market_type: MarketType | null;
  agents_needed: BMOAgentId[] | null;
  linkedin_search_query: string | null;
  github_search_query: string | null;
  suggested_email_hook: string | null;
  icp_description: string | null;
}

export interface OnboardChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface OnboardChatResponse {
  message: string;
  profile_update: BMOProfileUpdate;
  ready_to_build: boolean;
  next_topic: OnboardNextTopic;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  created_at: string;
  avatar_url?: string | null;
  onboarded?: boolean;
  updated_at?: string;
  bmo_config?: BMOProfile | null;
}

export interface ProfileInsert {
  id: string;
  email: string;
  full_name?: string | null;
  company_name?: string | null;
  created_at?: string;
  avatar_url?: string | null;
  onboarded?: boolean;
  updated_at?: string;
  bmo_config?: BMOProfile | null;
}

export interface Conversation {
  id: string;
  user_id: string;
  agent_type: AgentType;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationInsert {
  id?: string;
  user_id: string;
  agent_type: AgentType;
  title: string;
  created_at?: string;
  updated_at?: string;
}

export interface MessageRecord {
  id: string;
  conversation_id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  metadata: Json | null;
  created_at: string;
}

export interface MessageInsert {
  id?: string;
  conversation_id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  metadata?: Json | null;
  created_at?: string;
}

export interface AgentRun {
  id: string;
  user_id: string;
  agent_type: AgentType;
  status: AgentRunStatus;
  input: Json;
  output: Json | null;
  error: string | null;
  duration_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface AgentRunInsert {
  id?: string;
  user_id: string;
  agent_type: AgentType;
  status?: AgentRunStatus;
  input: Json;
  output?: Json | null;
  error?: string | null;
  duration_ms?: number | null;
  created_at?: string;
  completed_at?: string | null;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  health_score: number;
  metrics: Json;
  created_at: string;
  updated_at: string;
}

export interface ProductInsert {
  id?: string;
  user_id: string;
  name: string;
  description?: string | null;
  health_score?: number;
  metrics?: Json;
  created_at?: string;
  updated_at?: string;
}

export interface ICPProfile {
  id: string;
  user_id: string;
  name: string;
  description: string;
  role_targets: string[];
  industries: string[];
  company_size: string | null;
  geography: string | null;
  signals: string[];
  is_active: boolean;
  created_at: string;
  industry?: string | null;
  linkedin_query?: string | null;
  github_query?: string | null;
  suggested_email_hook?: string | null;
}

export interface ICPProfileInsert {
  id?: string;
  user_id: string;
  name?: string;
  description: string;
  role_targets?: string[];
  industries?: string[];
  company_size?: string | null;
  geography?: string | null;
  signals?: string[];
  is_active?: boolean;
  created_at?: string;
  linkedin_query?: string | null;
  github_query?: string | null;
  suggested_email_hook?: string | null;
}

export interface Lead {
  id: string;
  user_id: string;
  icp_id: string | null;
  name: string;
  company: string | null;
  role: string | null;
  email: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  avatar_url: string | null;
  location: string | null;
  source: LeadSource;
  raw_data: Record<string, unknown> | null;
  icp_score: number;
  intent_score: number;
  signals: string[];
  score_reason: string | null;
  status: LeadStatus;
  notes: string | null;
  email_draft: string | null;
  email_sent_at: string | null;
  sequence_step: number;
  created_at: string;
  updated_at: string;
}

export interface LeadInsert {
  id?: string;
  user_id: string;
  icp_id?: string | null;
  name: string;
  company?: string | null;
  role?: string | null;
  email?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  avatar_url?: string | null;
  location?: string | null;
  source?: LeadSource;
  raw_data?: Record<string, unknown> | null;
  icp_score?: number;
  intent_score?: number;
  signals?: string[];
  score_reason?: string | null;
  status?: LeadStatus;
  notes?: string | null;
  email_draft?: string | null;
  email_sent_at?: string | null;
  sequence_step?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ScrapeRun {
  id: string;
  user_id: string;
  icp_id: string | null;
  source: string;
  apify_run_id: string | null;
  status: ScrapeRunStatus;
  leads_found: number;
  leads_scored: number;
  error: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface ScrapeRunInsert {
  id?: string;
  user_id: string;
  icp_id?: string | null;
  source: string;
  apify_run_id?: string | null;
  status?: ScrapeRunStatus;
  leads_found?: number;
  leads_scored?: number;
  error?: string | null;
  started_at?: string;
  completed_at?: string | null;
}

export interface BusinessMetric {
  id: string;
  user_id: string;
  metric_type: BusinessMetricType;
  value: number;
  change_percent: number | null;
  period: string;
  recorded_at: string;
}

export interface BusinessMetricInsert {
  id?: string;
  user_id: string;
  metric_type: BusinessMetricType;
  value: number;
  change_percent?: number | null;
  period: string;
  recorded_at?: string;
}

export interface Automation {
  id: string;
  user_id: string;
  name: string;
  trigger_config: Json;
  conditions: Json;
  actions: Json;
  is_active: boolean;
  run_count: number;
  last_run_at: string | null;
  created_at: string;
}

export interface AutomationInsert {
  id?: string;
  user_id: string;
  name: string;
  trigger_config: Json;
  conditions?: Json;
  actions: Json;
  is_active?: boolean;
  run_count?: number;
  last_run_at?: string | null;
  created_at?: string;
}

export interface AgentMessage {
  id: string;
  role: MessageRole;
  content: string;
  created_at: string;
  pending?: boolean;
  metadata?: Record<string, Json> | null;
}

export interface RootCause {
  description: string;
  likelihood: number;
  evidence: string[];
}

export interface FixPath {
  title: string;
  effort: "low" | "medium" | "high";
  confidence: number;
  expected_impact: string;
  time_to_results: string;
  steps: string[];
}

export interface IntelligenceAnalysis {
  product_name: string;
  health_score: number;
  root_causes: RootCause[];
  fix_paths: FixPath[];
  summary: string;
}

export interface FinanceRunwayForecast {
  days_30: number;
  days_60: number;
  days_90: number;
  burn_rate: number;
}

export interface FinanceAnalysis {
  mrr: number;
  arr: number;
  mrr_change: number;
  churn_rate: number;
  ltv: number;
  cac: number;
  runway_days: number;
  runway_forecast: FinanceRunwayForecast;
  insights: string[];
  alerts: string[];
}

export interface ScoredLead {
  profile_index: number;
  name: string;
  company: string | null;
  role: string | null;
  email: string | null;
  source: LeadSource;
  icp_score: number;
  intent_score: number;
  signals: string[];
  score_reason: string;
  match_score?: number;
  buying_readiness?: number;
  why_good_fit?: string;
}

export interface EmailDraft {
  subject: string;
  body: string;
  personalization_hook?: string;
  what_we_personalised?: string;
}

export interface RawLinkedInProfile {
  fullName: string;
  headline: string;
  location: string;
  profileUrl: string;
  company: string;
  currentRole: string;
  connections: number;
  about: string;
  experience: Array<{ title: string; company: string; duration: string }>;
}

export interface RawGitHubProfile {
  login: string;
  name: string;
  bio: string;
  company: string;
  location: string;
  publicRepos: number;
  followers: number;
  profileUrl: string;
  topLanguages: string[];
  stargazerCount: number;
}

export interface LeadResult {
  name: string;
  company: string;
  role: string;
  source: LeadSource;
  icp_score: number;
  intent_score: number;
  signals: string[];
  reason: string;
}

export interface LeadSearchResult {
  leads: LeadResult[];
  total_found: number;
  sources_searched: string[];
  icp_profile: string;
}

export interface MetricCardProps {
  label: string;
  value: string;
  change?: number;
  changeLabel?: string;
  unit?: string;
  loading?: boolean;
  tone?: "green" | "cyan" | "pink" | "amber";
  className?: string;
}

export interface HealthScoreProps {
  value: number;
  size?: number;
  label?: string;
}

export interface ChatInterfaceProps {
  agentType: AgentType;
  apiEndpoint: string;
  systemContext?: Record<string, unknown>;
  placeholder?: string;
  initialMessages?: AgentMessage[];
  conversationId?: string | null;
  onConversationIdChange?: (conversationId: string) => void;
  onMessagesChange?: (messages: AgentMessage[]) => void;
}

export interface DashboardMetric {
  label: string;
  value: string;
  change?: number;
  note?: string;
}

export interface ConversationGroup {
  label: string;
  conversations: Conversation[];
}

export type DashboardArtifactView =
  | "home"
  | "agent"
  | "leads"
  | "sequences"
  | "revenue"
  | "warroom"
  | "integrations";

export interface DashboardChatActionButton {
  label: string;
  action: string;
  type: "primary" | "default" | "halt";
}

export interface DashboardChatExecute {
  type: "scrape_leads" | "draft_email" | "analyze_finance";
  params: Record<string, unknown>;
}

export interface DashboardChatResponse {
  message: string;
  artifact_switch: DashboardArtifactView | null;
  terminal_lines: string[] | null;
  action_button: DashboardChatActionButton | null;
  execute: DashboardChatExecute | null;
  data_refresh: boolean;
  executed_data?: Record<string, unknown> | null;
}

export interface DashboardSnapshotMetricSet {
  monthly_revenue: number;
  customers_found: number;
  sales_health: number;
  ai_actions: number;
  revenue_delta: number;
  customers_delta: number;
  health_delta: number;
  actions_today: number;
}

export interface DashboardSnapshotActivityItem {
  type: "success" | "warning" | "error";
  text: string;
  time: string;
  agent_type?: AgentType;
}

export interface DashboardSnapshotSubroutine {
  id: string;
  label: string;
  stat: string;
  status: "ready" | "active" | "live" | "running";
  color: "green" | "violet" | "ember" | "gold";
}

export interface DashboardSnapshot {
  user_id: string;
  bmo_context: BMOProfile | null;
  metrics: DashboardSnapshotMetricSet;
  activity: DashboardSnapshotActivityItem[];
  subroutines: DashboardSnapshotSubroutine[];
  leads: Lead[];
}

export interface WarRoomSubroutine {
  id: string;
  name: string;
  stat: string;
  status: "ready" | "active" | "live" | "running";
  color: "green" | "violet" | "ember" | "gold";
  icon: "target" | "mail" | "bar-chart" | "zap";
}

export interface WarRoomEvent {
  type: "success" | "warning" | "error";
  text: string;
  time: string;
}

export interface WarRoomResponse {
  objective: string;
  elapsed: string;
  subroutines: WarRoomSubroutine[];
  events: WarRoomEvent[];
  leads?: Lead[];
  drafts?: EmailDraft[];
  finance?: FinanceAnalysis | null;
}

interface SupabaseTable<Row, Insert, Update = Partial<Insert>> {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
}

export interface AppDatabase {
  public: {
    Tables: {
      profiles: SupabaseTable<Profile, ProfileInsert>;
      conversations: SupabaseTable<Conversation, ConversationInsert>;
      messages: SupabaseTable<MessageRecord, MessageInsert>;
      agent_runs: SupabaseTable<AgentRun, AgentRunInsert>;
      products: SupabaseTable<Product, ProductInsert>;
      leads: SupabaseTable<Lead, LeadInsert>;
      business_metrics: SupabaseTable<BusinessMetric, BusinessMetricInsert>;
      icp_profiles: SupabaseTable<ICPProfile, ICPProfileInsert>;
      automations: SupabaseTable<Automation, AutomationInsert>;
      scrape_runs: SupabaseTable<ScrapeRun, ScrapeRunInsert>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
