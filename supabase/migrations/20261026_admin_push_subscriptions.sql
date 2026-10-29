-- Push do /admin (PWA): uma linha por aparelho/navegador de quem é da gestão.
-- Só o servidor lê e grava (service role); RLS ligado sem políticas.
create table if not exists public.admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz
);
create index if not exists admin_push_subscriptions_user_idx on public.admin_push_subscriptions(user_id);
alter table public.admin_push_subscriptions enable row level security;
