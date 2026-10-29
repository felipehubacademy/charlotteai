-- Situação "Estornado": a entrada fica visível, mas fora do caixa.
alter table public.finance_entries drop constraint if exists finance_entries_status_check;
alter table public.finance_entries add constraint finance_entries_status_check check (status in ('pending','paid','canceled','refunded'));
