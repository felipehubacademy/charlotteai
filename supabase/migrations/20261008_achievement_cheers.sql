-- Parabéns nas conquistas de quem está no ranking (um por conquista, por pessoa).
create table if not exists achievement_cheers (
  id                  bigserial primary key,
  from_id             uuid not null references auth.users(id) on delete cascade,
  to_id               uuid not null references auth.users(id) on delete cascade,
  user_achievement_id uuid not null,
  created_at          timestamptz not null default now(),
  unique (from_id, user_achievement_id)
);
create index if not exists achievement_cheers_to_idx on achievement_cheers(to_id, created_at desc);
alter table achievement_cheers enable row level security;
