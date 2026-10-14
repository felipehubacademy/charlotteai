-- Assinatura pelo site (Asaas): cada checkout criado no queizy.com/assinar.
-- O webhook do Asaas liga o pagamento ao aluno por este registro (checkout → user_id),
-- pelo cliente do Asaas (asaas_customer_id) ou pelo e-mail.
create table if not exists public.asaas_checkouts (
  id                     text primary key,               -- id do checkout no Asaas
  user_id                uuid not null references charlotte.users(id) on delete cascade,
  plan                   text not null check (plan in ('monthly', 'annual')),
  value_brl              numeric(10,2) not null,
  trial_days             int not null default 0,
  affiliate_code         text,
  status                 text not null default 'created',  -- created | paid | canceled | expired
  asaas_customer_id      text,
  asaas_subscription_id  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists asaas_checkouts_user_idx on public.asaas_checkouts(user_id);
create index if not exists asaas_checkouts_customer_idx on public.asaas_checkouts(asaas_customer_id);
create index if not exists asaas_checkouts_sub_idx on public.asaas_checkouts(asaas_subscription_id);
alter table public.asaas_checkouts enable row level security;  -- só o servidor (service role) lê e escreve

-- Eventos já processados (o Asaas reenvia): idempotência do webhook.
create table if not exists public.asaas_events (
  id          text primary key,
  event       text not null,
  payload     jsonb,
  created_at  timestamptz not null default now()
);
alter table public.asaas_events enable row level security;
