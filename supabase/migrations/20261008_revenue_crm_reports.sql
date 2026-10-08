-- Receita automática (eventos do RevenueCat), CRM do aluno e relatórios
-- mensais. Acesso só pelo servidor (RLS ligada, sem policies).

create table if not exists public.revenue_events (
  id               uuid primary key default gen_random_uuid(),
  event_id         text not null unique,
  event_type       text not null,
  app_user_id      text,
  product_id       text,
  store            text,
  currency         text,
  price_purchased  numeric(14,2),
  price_usd        numeric(14,4),
  tax_pct          numeric(8,6),
  commission_pct   numeric(8,6),
  gross_brl        numeric(14,2),
  net_brl          numeric(14,2),
  purchased_at     timestamptz,
  finance_entry_id uuid references public.finance_entries(id) on delete set null,
  raw              jsonb,
  created_at       timestamptz not null default now()
);
alter table public.revenue_events enable row level security;
create index if not exists revenue_events_purchased_idx on public.revenue_events (purchased_at desc);

create table if not exists public.crm_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  author_id   uuid,
  author_name text,
  body        text not null,
  created_at  timestamptz not null default now()
);
alter table public.crm_notes enable row level security;
create index if not exists crm_notes_user_idx on public.crm_notes (user_id, created_at desc);

create table if not exists public.crm_tags (
  user_id    uuid primary key,
  tags       text[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.crm_tags enable row level security;

create table if not exists public.partner_reports (
  id          uuid primary key default gen_random_uuid(),
  period      text not null unique,            -- 'YYYY-MM'
  data        jsonb not null,
  sent_to     text[],
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);
alter table public.partner_reports enable row level security;
