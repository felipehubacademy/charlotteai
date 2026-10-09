-- Moderação no /admin: resolver denúncias e suspender aluno do social.
alter table user_reports add column if not exists resolved_at timestamptz;
alter table user_reports add column if not exists resolved_by text;
alter table user_reports add column if not exists resolution text;

-- Suspenso: some da busca e não interage com ninguém (pedidos, amigos, cutucadas, parabéns, competições).
create table if not exists social_suspensions (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  reason     text,
  created_by text,
  created_at timestamptz not null default now()
);
alter table social_suspensions enable row level security;
