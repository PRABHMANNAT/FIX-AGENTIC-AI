alter table profiles
  add column if not exists bmo_config jsonb,
  add column if not exists onboarded boolean default false;

alter table icp_profiles
  add column if not exists linkedin_query text,
  add column if not exists github_query text,
  add column if not exists suggested_email_hook text;

create table if not exists scrape_runs (
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

alter table scrape_runs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'scrape_runs'
      and policyname = 'own'
  ) then
    create policy "own" on scrape_runs for all using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_scrape_runs_user on scrape_runs(user_id);

notify pgrst, 'reload schema';
