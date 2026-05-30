-- Placement skips: tracks niveis pulados pelo placement test.
-- Efeito: cascade unlock daquele nivel fica desativado (todas units liberadas
-- de cara), MAS nenhuma activity vem marcada como done. Aluno ainda ganha XP
-- ao completar de verdade. Ver: implementation plan 2026-05-30.

create table if not exists placement_skips (
  user_id    uuid not null,
  level      text not null check (level in ('Novice','Inter')),
  skipped_at timestamptz not null default now(),
  primary key (user_id, level)
);

create index if not exists placement_skips_user_idx on placement_skips (user_id);

alter table placement_skips enable row level security;

create policy "placement_skips_select_own"
  on placement_skips for select
  using (auth.uid() = user_id);

create policy "placement_skips_insert_own"
  on placement_skips for insert
  with check (auth.uid() = user_id);

create policy "placement_skips_delete_own"
  on placement_skips for delete
  using (auth.uid() = user_id);
