-- ============================================================
-- Migration 003: Finance Tables
-- Creates: finance_documents, finance_settings, finance_data_cache,
--          finance_anomalies, finance_briefings
-- Does NOT modify any existing tables.
-- ============================================================

-- -----------------------------------------------
-- Table 1: finance_documents
-- Every document the agent generates.
-- -----------------------------------------------
create table finance_documents (
  id           uuid default uuid_generate_v4() primary key,
  user_id      uuid references profiles(id) on delete cascade not null,
  type         text check (type in (
                 'invoice',
                 'investor_report',
                 'pitch_deck',
                 'pl_statement',
                 'proposal',
                 'briefing',
                 'fundraising_score'
               )) not null,
  title        text not null,
  content_json jsonb,
  status       text check (status in ('draft', 'final', 'sent', 'paid')) not null default 'draft',
  file_url     text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- -----------------------------------------------
-- Table 2: finance_settings
-- One row per user — company info & integrations.
-- -----------------------------------------------
create table finance_settings (
  id                   uuid default uuid_generate_v4() primary key,
  user_id              uuid references profiles(id) on delete cascade not null unique,
  company_name         text,
  company_address      text,
  gstin                text,
  logo_url             text,
  stripe_connected     boolean not null default false,
  stripe_access_token  text,
  slack_webhook_url    text,
  currency             text not null default 'INR',
  bank_details         text,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- -----------------------------------------------
-- Table 3: finance_data_cache
-- Cached Stripe metrics, refreshed every 30 min.
-- -----------------------------------------------
create table finance_data_cache (
  id                uuid default uuid_generate_v4() primary key,
  user_id           uuid references profiles(id) on delete cascade not null unique,
  mrr               decimal(18, 4),
  arr               decimal(18, 4),
  churn_rate        decimal(10, 6),
  burn_rate         decimal(18, 4),
  runway_months     decimal(10, 2),
  cash_balance      decimal(18, 4),
  new_mrr           decimal(18, 4),
  expansion_mrr     decimal(18, 4),
  contraction_mrr   decimal(18, 4),
  churned_mrr       decimal(18, 4),
  net_new_mrr       decimal(18, 4),
  mrr_history       jsonb,
  last_synced_at    timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- -----------------------------------------------
-- Table 4: finance_anomalies
-- Anomalies detected by the background job.
-- -----------------------------------------------
create table finance_anomalies (
  id                  uuid default uuid_generate_v4() primary key,
  user_id             uuid references profiles(id) on delete cascade not null,
  metric              text not null,
  current_value       decimal(18, 6),
  expected_value      decimal(18, 6),
  deviation_percent   decimal(10, 4),
  severity            text check (severity in ('low', 'medium', 'high')) not null,
  explanation         text,
  recommended_action  text,
  status              text check (status in ('new', 'seen', 'dismissed')) not null default 'new',
  detected_at         timestamptz default now(),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- -----------------------------------------------
-- Table 5: finance_briefings
-- Weekly Monday briefings.
-- -----------------------------------------------
create table finance_briefings (
  id               uuid default uuid_generate_v4() primary key,
  user_id          uuid references profiles(id) on delete cascade not null,
  week_of          date not null,
  content_json     jsonb,
  sent_to_slack    boolean not null default false,
  slack_message_ts text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (user_id, week_of)
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table finance_documents   enable row level security;
alter table finance_settings    enable row level security;
alter table finance_data_cache  enable row level security;
alter table finance_anomalies   enable row level security;
alter table finance_briefings   enable row level security;

create policy "own" on finance_documents   for all using (auth.uid() = user_id);
create policy "own" on finance_settings    for all using (auth.uid() = user_id);
create policy "own" on finance_data_cache  for all using (auth.uid() = user_id);
create policy "own" on finance_anomalies   for all using (auth.uid() = user_id);
create policy "own" on finance_briefings   for all using (auth.uid() = user_id);

-- ============================================================
-- Indexes
-- ============================================================
create index idx_fin_docs_user       on finance_documents(user_id);
create index idx_fin_docs_type       on finance_documents(type);
create index idx_fin_docs_status     on finance_documents(status);
create index idx_fin_anomalies_user  on finance_anomalies(user_id);
create index idx_fin_anomalies_status on finance_anomalies(status);
create index idx_fin_anomalies_sev   on finance_anomalies(severity);
create index idx_fin_briefings_user  on finance_briefings(user_id);
create index idx_fin_briefings_week  on finance_briefings(week_of desc);

-- ============================================================
-- updated_at triggers (reuses the function from migration 001)
-- ============================================================
create trigger finance_documents_updated_at
  before update on finance_documents
  for each row execute procedure update_updated_at();

create trigger finance_settings_updated_at
  before update on finance_settings
  for each row execute procedure update_updated_at();

create trigger finance_data_cache_updated_at
  before update on finance_data_cache
  for each row execute procedure update_updated_at();

create trigger finance_anomalies_updated_at
  before update on finance_anomalies
  for each row execute procedure update_updated_at();

create trigger finance_briefings_updated_at
  before update on finance_briefings
  for each row execute procedure update_updated_at();
