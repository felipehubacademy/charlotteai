-- Ranking da semana (zera segunda 0h, horário de Brasília) por nível, e a foto diária dos rankings
-- (semana e geral) que os gatilhos de push comparam com o dia anterior.

create or replace function public.week_start_brt(p_at timestamptz default now())
returns timestamptz language sql immutable as $$
  select (date_trunc('week', p_at at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo')
$$;

-- XP da semana = XP das atividades + bônus de conquistas desde segunda. Fora: contas escondidas do ranking.
create or replace function public.weekly_ranking(p_level text)
returns table (user_id uuid, name text, week_xp bigint, pos bigint)
language sql stable security definer set search_path = public as $$
  with w as (select public.week_start_brt() as s),
  xp as (
    select p.user_id, sum(coalesce(p.xp_earned, 0))::bigint as x
      from charlotte_practices p, w where p.created_at >= w.s group by 1
    union all
    select a.user_id::uuid, sum(coalesce(a.xp_bonus, 0))::bigint
      from user_achievements a, w where a.earned_at >= w.s and a.user_id ~ '^[0-9a-f-]{36}$' group by 1
  ),
  tot as (select xp.user_id, sum(xp.x)::bigint as week_xp from xp group by 1)
  select u.id, u.name, t.week_xp, rank() over (order by t.week_xp desc)::bigint
    from tot t join charlotte_users u on u.id = t.user_id
   where u.charlotte_level = p_level and not coalesce(u.hide_from_ranking, false) and t.week_xp > 0
   order by t.week_xp desc
$$;
grant execute on function public.weekly_ranking(text) to authenticated, anon;

create table if not exists public.ranking_snapshots (
  day       date not null,
  scope     text not null check (scope in ('week', 'all')),
  level     text not null,
  user_id   uuid not null,
  pos       int  not null,
  xp        bigint not null,
  primary key (day, scope, level, user_id)
);
alter table public.ranking_snapshots enable row level security;

-- Avisos de ranking (sendRankingPushes).
alter table notifications.notification_logs drop constraint notification_logs_notification_type_check;
alter table notifications.notification_logs add constraint notification_logs_notification_type_check
  check (notification_type = any (array[
    'streak_reminder','daily_reminder','charlotte_message','xp_milestone','goal_reminder','weekly_challenge',
    'streak_saver','streak_milestone_ahead','level_imminent','micro_checkin','cadence_drop','weekly_recap','charlotte_checkin',
    'trial_ending_72h','trial_ending_24h','sub_expired_1d','streak_broken',
    'reengagement_3d','reengagement_7d','reengagement_14d','reengagement_30d',
    'practice_reminder','achievement','marketing','scheduler_lock','buddy_rivalry',
    'rally_update','rally_reminder','rally_result',
    'web_sub_notice','taste_daily','taste_nudge','taste_ended','taste_offer',
    'rank_up','rank_lost','rank_threat','rank_week_won','legacy_trial_ended'
  ]));
