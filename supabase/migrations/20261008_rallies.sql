-- Rallies: disputas de 24 horas ou 7 dias entre amigos (Estudar junto).
-- Placar calculado ao vivo a partir de charlotte_practices / learn_history(_v2).
-- Acesso só pelo servidor (service role).
create table if not exists rallies (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  creator_id     uuid not null references auth.users(id) on delete cascade,
  metric         text not null check (metric in ('xp', 'practices', 'accuracy')),
  duration_hours int  not null check (duration_hours in (24, 168)),
  starts_at      timestamptz not null default now(),
  ends_at        timestamptz not null,
  leader_id      uuid,
  reminder_sent  boolean not null default false,
  finalized      boolean not null default false,
  winner_id      uuid,
  created_at     timestamptz not null default now()
);
create index if not exists rallies_active_idx on rallies(finalized, ends_at);

create table if not exists rally_participants (
  rally_id  uuid not null references rallies(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (rally_id, user_id)
);
create index if not exists rally_participants_user_idx on rally_participants(user_id);

create table if not exists rally_invites (
  rally_id   uuid not null references rallies(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (rally_id, user_id)
);
create index if not exists rally_invites_user_idx on rally_invites(user_id);

alter table rallies enable row level security;
alter table rally_participants enable row level security;
alter table rally_invites enable row level security;

-- Novos tipos de push nos registros.
alter table notifications.notification_logs drop constraint notification_logs_notification_type_check;
alter table notifications.notification_logs add constraint notification_logs_notification_type_check
  check (notification_type = any (array[
    'streak_reminder','daily_reminder','charlotte_message','xp_milestone','goal_reminder','weekly_challenge',
    'streak_saver','streak_milestone_ahead','level_imminent','micro_checkin','cadence_drop','weekly_recap',
    'charlotte_checkin','trial_ending_72h','trial_ending_24h','sub_expired_1d','streak_broken',
    'reengagement_3d','reengagement_7d','reengagement_14d','reengagement_30d',
    'practice_reminder','achievement','marketing','scheduler_lock',
    'buddy_rivalry','rally_update','rally_reminder','rally_result'
  ]::text[]));
