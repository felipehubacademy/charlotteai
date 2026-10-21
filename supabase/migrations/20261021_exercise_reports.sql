-- Reportes do aluno direto no exercício (bandeira no topo de cada tela de exercício do app).
-- O aluno só insere os próprios; leitura e status só pelo servidor (/admin Pedagógico e alerta diário).
create table if not exists public.exercise_reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null,
  created_at   timestamptz not null default now(),
  screen       text not null,          -- learn-session | roleplay | guided-chat | practice-grammar | practice-pronunciation | placement | vocab-review
  reason       text not null,          -- answer_right | speech | audio | confusing | other
  comment      text,
  level        text,
  module_id    text,
  unit_id      text,
  activity     text,
  step_idx     int,
  exercise     jsonb,                  -- o que estava na tela (frase, gabarito, tipo...)
  user_answer  text,
  transcript   text,                   -- o que o reconhecimento de voz entendeu
  app_version  text,
  platform     text,
  status       text not null default 'open' check (status in ('open', 'fixed', 'dismissed')),
  resolved_at  timestamptz,
  resolved_by  text
);
create index if not exists exercise_reports_created_idx on public.exercise_reports (created_at desc);
alter table public.exercise_reports enable row level security;
drop policy if exists exercise_reports_insert_own on public.exercise_reports;
create policy exercise_reports_insert_own on public.exercise_reports for insert to authenticated with check (auth.uid() = user_id);
grant insert on public.exercise_reports to authenticated;
