-- Cupons sazonais: data de início e duração do desconto (cobranças).
alter table public.coupons add column if not exists starts_at timestamptz;
alter table public.coupons add column if not exists duration_cycles integer;
-- Checkout: quantas cobranças levam o desconto do cupom e o valor para onde a assinatura volta.
alter table public.asaas_checkouts add column if not exists coupon_cycles integer;
alter table public.asaas_checkouts add column if not exists full_value_brl numeric;
alter table public.asaas_checkouts add column if not exists price_restored_at timestamptz;
