-- Resumo semanal da evolução do aluno, escrito pela IA (um por semana e idioma).
create table if not exists evolution_summaries (
  user_id    uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  lang       text not null check (lang in ('pt','en')),
  text       text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, week_start, lang)
);
alter table evolution_summaries enable row level security;
