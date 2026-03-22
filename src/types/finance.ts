// ─── Invoice types ────────────────────────────────────────────────────────────

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  from_company: string;
  from_address: string;
  from_gstin: string;
  to_company: string;
  to_address: string;
  to_gstin: string;
  date: string;
  due_date: string;
  line_items: InvoiceLineItem[];
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  taxable_amount: number;
  cgst_percent: number;
  sgst_percent: number;
  igst_percent: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total: number;
  notes: string;
  payment_terms: string;
  bank_details: string;
  status: "draft" | "final" | "sent" | "paid";
}

export interface ExpenseCategory {
  category: string;
  amount: number;
}

export interface BurnData {
  cash_balance: number;
  monthly_revenue: number;
  monthly_expenses: ExpenseCategory[];
  gross_burn: number;
  net_burn: number;
  runway_months: number;
  runway_date: string;
  alert_level: 'healthy' | 'warning' | 'critical';
}

export type ArtifactType =
  | 'invoice'
  | 'investor_report'
  | 'pitch_deck'
  | 'cash_flow'
  | 'briefing'
  | 'expenses'
  | 'fundraising'
  | 'revenue_dashboard'
  | 'burn_runway'
  | 'anomalies'
  | 'slack_insights'
  | 'time_audit'
  | 'goal_setter'
  | 'workflow_hub'
  | 'github_velocity'
  | 'decision_queue';


export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  artifactType?: ArtifactType;
  artifactData?: unknown;
  fallback?: boolean;
}

export interface FinanceContext {
  mrr: number;
  arr: number;
  churn_rate: number;
  burn_rate: number;
  runway_months: number;
  cash_balance: number;
  last_synced_at: string;
  company_name: string;
  currency: string;
}

export interface CashFlowMonth {
  month: string;
  revenue: number;
  expenses: number;
  net_cash_flow: number;
  cash_balance: number;
}

export interface CashFlowScenario {
  months: CashFlowMonth[];
  break_even_month: string | null;
  runway_end_month: string | null;
}

export interface CashFlowProjection {
  best: CashFlowScenario;
  base: CashFlowScenario;
  worst: CashFlowScenario;
  analysis_text: string;
  key_milestones: string[];
  recommendations: string[];
  assumptions: {
    starting_mrr: number;
    starting_cash: number;
    base_revenue_growth_rate: number;
    base_expense_growth_rate: number;
  };
  generated_at: string;
}

// ─── Anomaly Detection types ────────────────────────────────────────────────

export type AnomalySeverity = 'low' | 'medium' | 'high';
export type AnomalyStatus = 'new' | 'seen' | 'dismissed';

export interface Anomaly {
  id: string;
  user_id: string;
  metric: string;
  current_value: number;
  expected_value: number;
  deviation_percent: number;
  severity: AnomalySeverity;
  explanation: string;
  recommended_action: string;
  status: AnomalyStatus;
  detected_at: string;
  created_at: string;
}

// ─── Weekly Briefing types ──────────────────────────────────────────────────

export type BriefingAction = {
  action: string;
  urgency: 'now' | 'this-week' | 'monitor';
};

export interface WeeklyBriefing {
  id: string;
  user_id: string;
  week_of: string;
  week_summary: string;
  revenue_update: {
    change_percent: number;
    insight: string;
    direction: 'up' | 'down' | 'flat';
  };
  burn_update: {
    change_percent: number;
    insight: string;
    direction: 'up' | 'down' | 'flat';
  };
  top_3_actions: BriefingAction[];
  wins: string[];
  watch_out: string[];
  one_line_forecast: string;
  sent_to_slack: boolean;
  created_at: string;
}

// ─── Expense & Subscription types ───────────────────────────────────────────

export interface Expense {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  date: string;
  category: ExpenseCategoryName;
  is_recurring: boolean;
  tool_name: string | null;
  last_seen_at: string;
  created_at: string;
}

export type ExpenseCategoryName =
  | 'Infrastructure'
  | 'SaaS Tools'
  | 'Marketing'
  | 'People'
  | 'Office'
  | 'Legal'
  | 'Finance'
  | 'Miscellaneous';

export interface CategorizedExpense {
  description: string;
  amount: number;
  date: string;
  category: ExpenseCategoryName;
  is_recurring: boolean;
  tool_name: string | null;
}

export interface SubscriptionSummary {
  tool_name: string;
  category: ExpenseCategoryName;
  monthly_cost: number;
  yearly_cost: number;
  last_charged: string;
  potentially_unused: boolean;
}

export interface ExpenseReport {
  expenses: CategorizedExpense[];
  subscriptions: SubscriptionSummary[];
  total_monthly: number;
  total_yearly: number;
  by_category: Array<{ category: ExpenseCategoryName; total: number; percent: number }>;
  subscription_monthly_total: number;
  cost_reduction_opportunities: string[];
  generated_at: string;
}

// ─── Fundraising Readiness types ────────────────────────────────────────────

export interface FundraisingMetric {
  name: string;
  current_value: number;
  benchmark_value: number;
  unit: string;
  score: number;
  status: 'strong' | 'meets' | 'gap' | 'critical';
  advice: string;
}

export type FundraisingStage = 'pre-seed' | 'seed' | 'series-a' | 'series-b';
export type FundraisingGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type ReadinessStatus = 'ready' | 'close' | 'not-ready';

export interface FundraisingScore {
  overall_score: number;
  grade: FundraisingGrade;
  stage_readiness: ReadinessStatus;
  stage: FundraisingStage;
  metrics: FundraisingMetric[];
  top_strengths: string[];
  critical_gaps: string[];
  timeline_to_ready: string;
  investor_talking_points: string[];
  generated_at: string;
}

// ─── Pitch Deck & Revenue Dashboard types ─────────────────────────────────────

export interface PitchSlides {
  title: Record<string, unknown>;
  problem: Record<string, unknown>;
  solution: Record<string, unknown>;
  traction: Record<string, unknown>;
  market: Record<string, unknown>;
  financials: Record<string, unknown>;
  ask: Record<string, unknown>;
  [key: string]: unknown;
}

export interface RevenueData {
  mrr: number;
  arr: number;
  churn_rate: number;
  runway_months: number;
  cash_balance: number;
  burn_rate: number;
  new_mrr: number;
  expansion_mrr: number;
  contraction_mrr: number;
  churned_mrr: number;
  net_new_mrr: number;
  mrr_history: Array<{ month: string; mrr: number }>;
  last_synced_at: string;
}

