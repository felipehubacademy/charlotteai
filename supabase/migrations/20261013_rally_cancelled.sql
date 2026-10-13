-- Competições: sair da disputa. Se sobrar uma pessoa só (ou ninguém), a competição é encerrada sem vencedor
-- e sem prêmio (cancelled = true), para não virar atalho de prêmio.
alter table public.rallies add column if not exists cancelled boolean not null default false;
