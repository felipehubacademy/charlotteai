create table if not exists public.rc_webhook_events (
  id bigserial primary key,
  event_id text not null unique,
  event_type text not null,
  app_user_id text,
  environment text,
  event_at timestamptz,
  payload jsonb,
  result jsonb,
  received_at timestamptz not null default now()
);
create index if not exists rc_webhook_events_user_idx on public.rc_webhook_events (app_user_id, received_at desc);
alter table public.rc_webhook_events enable row level security;
revoke all on public.rc_webhook_events from anon, authenticated;
