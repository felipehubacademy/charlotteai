create table if not exists public.email_outbox (
  id bigserial primary key,
  kind text not null,
  to_email text,
  subject text,
  html text,
  payload jsonb,
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
create index if not exists email_outbox_pending_idx on public.email_outbox (next_attempt_at) where sent_at is null;
alter table public.email_outbox enable row level security;

create table if not exists public.checkout_attempts (
  id bigserial primary key,
  ip text,
  email text,
  created_at timestamptz not null default now()
);
create index if not exists checkout_attempts_ip_idx on public.checkout_attempts (ip, created_at desc);
alter table public.checkout_attempts enable row level security;
