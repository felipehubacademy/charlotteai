-- Admin como ferramenta de gestão: equipe com papéis, log de auditoria e
-- lançamentos financeiros (entradas e saídas). Acesso só pelo servidor
-- (service role): RLS ligada e nenhuma policy para anon/authenticated.

create table if not exists public.admin_members (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  email       text not null,
  name        text,
  role        text not null check (role in ('owner','partner','finance','support','viewer')),
  active      boolean not null default true,
  invited_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.admin_members enable row level security;

create table if not exists public.admin_audit_log (
  id         bigserial primary key,
  actor_id   uuid,
  actor_email text,
  action     text not null,
  entity     text not null,
  entity_id  text,
  details    jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

create table if not exists public.finance_entries (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null check (kind in ('expense','income')),
  description     text not null,
  category        text not null,
  vendor          text,
  amount          numeric(14,2) not null check (amount >= 0),
  currency        text not null default 'BRL',
  fx_rate         numeric(12,6) not null default 1,
  amount_brl      numeric(14,2) not null,
  due_date        date not null,
  paid_at         date,
  status          text not null default 'pending' check (status in ('pending','paid','canceled')),
  recurrence      text not null default 'none' check (recurrence in ('none','monthly','yearly')),
  recurrence_of   uuid references public.finance_entries(id) on delete set null,
  scope           text not null default 'queizy',
  notes           text,
  attachment_url  text,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.finance_entries enable row level security;
create index if not exists finance_entries_due_idx on public.finance_entries (due_date);
create index if not exists finance_entries_kind_idx on public.finance_entries (kind, status);
