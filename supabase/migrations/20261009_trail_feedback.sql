-- Correção no fim do Role-play e do Guided Chat: uma linha por conversa, com até 3 correções.
create table if not exists trail_feedback (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  level       text not null,
  module_id   text not null,
  unit_id     text not null,
  activity    text not null check (activity in ('roleplay', 'chat')),
  lines       int  not null default 0,
  error_free  boolean not null default true,
  corrections jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists trail_feedback_user_idx on trail_feedback(user_id, created_at desc);
alter table trail_feedback enable row level security;
