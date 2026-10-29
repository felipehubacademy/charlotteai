-- "Como você conheceu o Queizy?": pergunta única no fim da 1ª atividade, só para quem criou a conta pela loja
-- (quem veio pelo site já tem a origem pelo link, em asaas_checkouts.meta_tracking). Uma linha por aluno;
-- quem toca em "Pular" também ganha linha (source = 'skipped') para a pergunta não voltar.
create table if not exists public.acquisition_answers (
  user_id    uuid primary key,
  source     text not null check (source in ('influencer', 'meta_ads', 'store_search', 'friend', 'other', 'skipped')),
  created_at timestamptz not null default now()
);
alter table public.acquisition_answers enable row level security;

-- Deve perguntar? Sem resposta ainda e sem checkout no site.
create or replace function public.acquisition_should_ask()
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
     and not exists (select 1 from acquisition_answers where user_id = auth.uid())
     and not exists (select 1 from asaas_checkouts where user_id = auth.uid())
$$;

create or replace function public.answer_acquisition(p_source text)
returns void language sql security definer set search_path = public as $$
  insert into acquisition_answers (user_id, source) values (auth.uid(), p_source)
  on conflict (user_id) do nothing
$$;

revoke all on function public.acquisition_should_ask() from public, anon;
revoke all on function public.answer_acquisition(text) from public, anon;
grant execute on function public.acquisition_should_ask() to authenticated;
grant execute on function public.answer_acquisition(text) to authenticated;
