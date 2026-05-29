-- Curriculum v2 progress tracking
-- One row per (user, level, module_id, unit_id, activity_type). Upsert on retry.
-- `completed` latches true once threshold is met; never reverts on a lower retry score.
-- See: docs/curriculum/v2 + memory: curriculum_v2_progress_schema.md

create table if not exists learn_history_v2 (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,  -- FK to auth user (validated via RLS; charlotte_users is a view)
  level       text not null,
  module_id   text not null,
  unit_id     text not null,
  activity_type text not null,
  score       numeric,
  completed   boolean not null default false,
  attempts    int not null default 1,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, level, module_id, unit_id, activity_type)
);

create index if not exists learn_history_v2_user_level_idx
  on learn_history_v2 (user_id, level);

create index if not exists learn_history_v2_unit_idx
  on learn_history_v2 (user_id, level, module_id, unit_id);

-- RLS: users can only see/modify their own rows
alter table learn_history_v2 enable row level security;

create policy "learn_history_v2_select_own"
  on learn_history_v2 for select
  using (auth.uid() = user_id);

create policy "learn_history_v2_insert_own"
  on learn_history_v2 for insert
  with check (auth.uid() = user_id);

create policy "learn_history_v2_update_own"
  on learn_history_v2 for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
