create extension if not exists "uuid-ossp";

create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  company_name text,
  bmo_config jsonb,
  onboarded boolean default false,
  created_at timestamptz default now()
);

create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles(id, email, full_name)
  values(new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure handle_new_user();

create table icp_profiles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null default 'Primary ICP',
  description text not null,
  role_targets text[] default '{}',
  industries text[] default '{}',
  company_size text,
  geography text,
  signals text[] default '{}',
  linkedin_query text,
  github_query text,
  suggested_email_hook text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table leads (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  icp_id uuid references icp_profiles(id) on delete set null,

  name text not null,
  company text,
  role text,
  email text,
  linkedin_url text,
  github_url text,
  avatar_url text,
  location text,

  source text check (source in ('linkedin','github','manual')) not null default 'manual',
  raw_data jsonb,

  icp_score integer check (icp_score between 0 and 100) default 0,
  intent_score integer check (intent_score between 0 and 100) default 0,
  signals text[] default '{}',
  score_reason text,

  status text check (status in ('new','contacted','replied','qualified','lost')) default 'new',
  notes text,
  email_draft text,
  email_sent_at timestamptz,
  sequence_step integer default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table scrape_runs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  icp_id uuid references icp_profiles(id) on delete set null,
  source text not null,
  apify_run_id text,
  status text check (status in ('running','completed','failed')) default 'running',
  leads_found integer default 0,
  leads_scored integer default 0,
  error text,
  started_at timestamptz default now(),
  completed_at timestamptz
);

alter table profiles enable row level security;
alter table icp_profiles enable row level security;
alter table leads enable row level security;
alter table scrape_runs enable row level security;

create policy "own" on profiles for all using (auth.uid() = id);
create policy "own" on icp_profiles for all using (auth.uid() = user_id);
create policy "own" on leads for all using (auth.uid() = user_id);
create policy "own" on scrape_runs for all using (auth.uid() = user_id);

create index idx_leads_user on leads(user_id);
create index idx_leads_icp on leads(icp_id);
create index idx_leads_status on leads(status);
create index idx_leads_score on leads(icp_score desc);
create index idx_scrape_runs_user on scrape_runs(user_id);

alter table leads add constraint leads_linkedin_url_user_id_key unique (linkedin_url, user_id);
alter table leads add constraint leads_github_url_user_id_key unique (github_url, user_id);

create or replace function update_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_updated_at before update on leads
  for each row execute procedure update_updated_at();
