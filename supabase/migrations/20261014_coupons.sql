-- Cupons de campanha da assinatura pelo site (queizy.com/assinar).
-- O campo "Tem um cupom?" também aceita o código de um afiliado (tabela affiliates).
create table if not exists public.coupons (
  code          text primary key,                 -- maiúsculas, só letras e números
  discount_pct  int  not null check (discount_pct between 1 and 90),
  plans         text[] not null default array['monthly','annual'],
  active        boolean not null default true,
  expires_at    timestamptz,
  max_uses      int,                               -- vazio = sem limite
  note          text,
  created_at    timestamptz not null default now()
);
alter table public.coupons enable row level security;  -- só o servidor lê

alter table public.asaas_checkouts add column if not exists coupon_code text;
alter table public.asaas_checkouts add column if not exists discount_pct int not null default 0;
alter table public.asaas_checkouts add column if not exists method text;  -- monthly | annual | annual_pix | annual_12x
-- Reembolso em 7 dias (Pix e 12x do site): guarda o 1º pagamento confirmado.
alter table public.asaas_checkouts add column if not exists asaas_payment_id text;
alter table public.asaas_checkouts add column if not exists asaas_installment_id text;
alter table public.asaas_checkouts add column if not exists paid_at timestamptz;
alter table public.asaas_checkouts add column if not exists refunded_at timestamptz;
