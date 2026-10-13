-- Programa de afiliados (fase 1: rastreio + comissão + /admin).
-- Só o servidor (service role) lê e grava: RLS ligado e sem políticas.

create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                       -- vai no link queizy.com/a/CODIGO
  name text not null,
  email text,
  status text not null default 'active' check (status in ('active','paused')),
  user_discount_pct int not null default 0 check (user_discount_pct between 0 and 50), -- desconto ao aluno (fase 3)
  commission_type text not null default 'percent' check (commission_type in ('percent','fixed')),
  commission_pct numeric not null default 10,       -- % sobre o líquido (depois de imposto e taxa da loja)
  fixed_monthly_brl numeric not null default 0,     -- valor fixo por pagamento do plano mensal
  fixed_annual_brl numeric not null default 0,      -- valor fixo pela anuidade
  months_limit int not null default 12,             -- comissão nos N primeiros meses do aluno
  hold_days int not null default 30,                -- carência: "a liberar" vira "disponível"
  min_payout_brl numeric not null default 50,
  owner_user_id uuid,                               -- conta do afiliado no app (bloqueia autoindicação)
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_clicks (
  id bigint generated always as identity primary key,
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  platform text,                                    -- ios | android | desktop
  created_at timestamptz not null default now()
);
create index if not exists affiliate_clicks_aff_idx on public.affiliate_clicks (affiliate_id, created_at);

-- Uma atribuição por aluno: o primeiro link vale.
create table if not exists public.affiliate_attributions (
  user_id uuid primary key,
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  source text not null default 'link' check (source in ('install','link','manual','admin')),
  attributed_at timestamptz not null default now()
);
create index if not exists affiliate_attr_aff_idx on public.affiliate_attributions (affiliate_id);

create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  user_id uuid not null,
  event_id text not null unique,                    -- evento do RevenueCat (idempotência)
  transaction_id text,                              -- para casar o reembolso com a compra
  kind text not null default 'commission' check (kind in ('commission','reversal')),
  plan text check (plan in ('monthly','annual')),
  product_id text,
  net_brl numeric not null default 0,               -- líquido da compra
  amount_brl numeric not null,                      -- comissão (negativa no estorno)
  status text not null default 'pending' check (status in ('pending','reversed','paid')),
  available_at timestamptz not null,                -- fim da carência
  payout_id uuid,                                   -- fase 2 (saques)
  created_at timestamptz not null default now()
);
create index if not exists affiliate_comm_aff_idx on public.affiliate_commissions (affiliate_id, created_at);
create index if not exists affiliate_comm_user_idx on public.affiliate_commissions (user_id);

alter table public.affiliates enable row level security;
alter table public.affiliate_clicks enable row level security;
alter table public.affiliate_attributions enable row level security;
alter table public.affiliate_commissions enable row level security;

-- Compras de teste (TestFlight / sandbox da Play) geram comissão marcada, fora do saldo.
alter table public.affiliate_commissions add column if not exists is_test boolean not null default false;
