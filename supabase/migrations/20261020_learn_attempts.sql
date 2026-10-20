create table if not exists public.learn_attempts (
  id bigserial primary key,
  user_id uuid not null default auth.uid(),
  level text not null,
  module_id text,
  unit_id text,
  activity_type text not null,
  step_idx integer,
  event text not null default 'attempt',
  expected text,
  answer text,
  alternatives jsonb,
  score numeric,
  passed boolean,
  source text,
  error_code text,
  platform text,
  app_version text,
  created_at timestamptz not null default now()
);
create index if not exists learn_attempts_created_idx on public.learn_attempts (created_at desc);
create index if not exists learn_attempts_expected_idx on public.learn_attempts (expected, created_at desc);
create index if not exists learn_attempts_user_idx on public.learn_attempts (user_id, created_at desc);
alter table public.learn_attempts enable row level security;
drop policy if exists learn_attempts_insert_own on public.learn_attempts;
create policy learn_attempts_insert_own on public.learn_attempts for insert to authenticated with check (user_id = auth.uid());
