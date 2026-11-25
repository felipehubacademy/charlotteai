-- Cupom que cobra na hora (Black Friday, 27 a 29/11/2026): com no_trial, quem usa o cupom não ganha os
-- 7 dias grátis do cartão e a 1ª cobrança sai no ato. Sem isso, a venda da campanha só seria cobrada (e só
-- contaria como pagante) uma semana depois.
alter table public.coupons add column if not exists no_trial boolean not null default false;
