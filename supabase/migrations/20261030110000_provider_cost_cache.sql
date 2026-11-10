create table if not exists public.provider_cost_cache (
  key text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.provider_cost_cache enable row level security;
revoke all on public.provider_cost_cache from anon, authenticated;
