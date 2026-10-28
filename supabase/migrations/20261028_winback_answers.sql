-- Campanha de volta (28/10): "O que te fez parar?" respondida com 1 toque no e-mail. Uma linha por aluno
-- (a primeira resposta vale); rewarded_at marca os 5 minutos de ligação creditados. Só a chave de serviço lê e grava.
create table if not exists public.winback_answers (
  user_id     uuid primary key,
  answer      text not null check (answer in ('hard', 'easy', 'no_time', 'expected_other', 'app_problem')),
  campaign    text not null default 'winback_2026_10',
  created_at  timestamptz not null default now(),
  rewarded_at timestamptz
);
alter table public.winback_answers enable row level security;
