-- Carrinho abandonado: em que lembrete a pessoa está (0 nenhum, 1 a 3) e quando foi o último.
alter table public.asaas_checkouts add column if not exists recovery_stage integer not null default 0;
alter table public.asaas_checkouts add column if not exists recovery_last_at timestamptz;
