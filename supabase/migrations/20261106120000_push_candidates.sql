-- Pushes para muitos alunos: o banco devolve só quem interessa naquela hora, com as contas já feitas.
-- Antes cada rodada de hora em hora baixava todos os alunos, todo o progresso e 4 semanas de práticas
-- (42 mil linhas com 1.700 alunos) e filtrava no servidor. Com 100 mil alunos isso não cabe nos 120 s
-- da rodada. Agora: só alunos com push, dentro da janela das 9h às 21h no fuso deles, e em fatias
-- (p_shard de p_shards, por hash do id) para o scheduler dividir a base quando ela crescer.
-- p_now: hora de referência (padrão: agora), para simular uma rodada antes de publicar.
-- Devolvem tokens de push: só a chave do servidor executa.

drop function if exists public.push_engagement_candidates(text[], int, int);
drop function if exists public.push_users_at_hour(text, int, int);

create or replace function public.push_shard_of(p_id uuid, p_shards int)
returns int language sql immutable as $$
  select case when p_shards <= 1 then 0 else mod(hashtext(p_id::text)::bigint + 2147483648, p_shards)::int end
$$;

-- Engajamento (sendEngagementPushes): por aluno, sequência viva, XP, práticas de hoje / da semana /
-- das 3 semanas antes, hora mais comum de prática (mínimo 5 práticas em 4 semanas) e se já recebeu
-- push de engajamento hoje (p_types).
create or replace function public.push_engagement_candidates(p_types text[], p_shard int default 0, p_shards int default 1, p_now timestamptz default now())
returns table (
  id uuid, name text, expo_push_token text, charlotte_level text, app_language text, timezone text,
  last_practice_at timestamptz, trial_ends_at timestamptz, subscription_status text, subscription_expires_at timestamptz,
  is_institutional boolean, reminder_hour smallint,
  streak_days int, total_xp int, practiced_today boolean, practices_this_week int, practices_prev_4weeks int,
  usual_hour int, engaged_today boolean
)
language sql stable security definer set search_path = public, pg_temp as $$
  with u as (
    select cu.*, coalesce(tz.name, 'America/Sao_Paulo') as tzn
    from public.charlotte_users cu
    left join pg_timezone_names tz on tz.name = cu.timezone
    where cu.expo_push_token like 'ExponentPushToken[%'
      and public.push_shard_of(cu.id, p_shards) = p_shard
  ),
  w as (select * from u where extract(hour from p_now at time zone u.tzn) between 9 and 20),
  p as (
    select pr.user_id, pr.created_at, w.tzn
    from public.charlotte_practices pr join w on w.id = pr.user_id
    where pr.created_at >= p_now - interval '28 days'
  ),
  agg as (
    select user_id,
      bool_or(created_at >= date_trunc('day', p_now at time zone 'UTC') at time zone 'UTC') as today,
      count(*) filter (where created_at >= p_now - interval '7 days')::int as wk,
      count(*) filter (where created_at < p_now - interval '7 days')::int as prev,
      count(*)::int as n
    from p group by user_id
  ),
  hr as (
    select distinct on (user_id) user_id, h
    from (select user_id, extract(hour from created_at at time zone tzn)::int as h, count(*) as c from p group by 1, 2) x
    order by user_id, c desc, h asc
  )
  select w.id, w.name, w.expo_push_token, w.charlotte_level, w.app_language, w.timezone,
    w.last_practice_at, w.trial_ends_at, w.subscription_status, w.subscription_expires_at,
    w.is_institutional, w.reminder_hour,
    case when g.last_practice_date >= (p_now at time zone 'UTC')::date - 2 then coalesce(g.streak_days, 0) else 0 end,
    coalesce(g.total_xp, 0),
    coalesce(a.today, false), coalesce(a.wk, 0), coalesce(a.prev, 0),
    case when coalesce(a.n, 0) >= 5 then hr.h end,
    exists (select 1 from public.notification_logs nl
            where nl.user_id = w.id and nl.status = 'sent' and nl.notification_type = any(p_types)
              and nl.created_at >= date_trunc('day', p_now at time zone 'UTC') at time zone 'UTC')
  from w
  left join public.charlotte_progress g on g.user_id = w.id
  left join agg a on a.user_id = w.id
  left join hr on hr.user_id = w.id
$$;

-- Lembrete diário e elogio do dia: alunos com push na hora certa do fuso deles.
--   'daily'  = na hora do lembrete (escolhida no Perfil ou 11h) e ainda sem prática no dia local
--   'praise' = às 18h e já praticou no dia local
create or replace function public.push_users_at_hour(p_mode text, p_shard int default 0, p_shards int default 1, p_now timestamptz default now())
returns table (
  id uuid, name text, expo_push_token text, charlotte_level text, app_language text, timezone text,
  reminder_hour smallint, streak_days int, total_xp int
)
language sql stable security definer set search_path = public, pg_temp as $$
  with u as (
    select cu.*, coalesce(tz.name, 'America/Sao_Paulo') as tzn
    from public.charlotte_users cu
    left join pg_timezone_names tz on tz.name = cu.timezone
    where cu.expo_push_token like 'ExponentPushToken[%'
      and public.push_shard_of(cu.id, p_shards) = p_shard
  )
  select u.id, u.name, u.expo_push_token, u.charlotte_level, u.app_language, u.timezone, u.reminder_hour,
    coalesce(g.streak_days, 0), coalesce(g.total_xp, 0)
  from u left join public.charlotte_progress g on g.user_id = u.id
  where case p_mode
    when 'daily' then extract(hour from p_now at time zone u.tzn) = coalesce(u.reminder_hour, 11)
      and g.last_practice_date is distinct from (p_now at time zone u.tzn)::date
    when 'praise' then extract(hour from p_now at time zone u.tzn) = 18
      and g.last_practice_date = (p_now at time zone u.tzn)::date
    else false end
$$;

-- Quem praticou desde p_since (desafio da semana e lembrete do desafio), sem baixar as práticas.
create or replace function public.push_active_users(p_since timestamptz, p_shard int default 0, p_shards int default 1)
returns table (user_id uuid)
language sql stable security definer set search_path = public, pg_temp as $$
  select distinct pr.user_id from public.charlotte_practices pr
  where pr.created_at >= p_since and public.push_shard_of(pr.user_id, p_shards) = p_shard
$$;

revoke all on function public.push_engagement_candidates(text[], int, int, timestamptz) from public, anon, authenticated;
revoke all on function public.push_users_at_hour(text, int, int, timestamptz) from public, anon, authenticated;
revoke all on function public.push_active_users(timestamptz, int, int) from public, anon, authenticated;
grant execute on function public.push_engagement_candidates(text[], int, int, timestamptz) to service_role;
grant execute on function public.push_users_at_hour(text, int, int, timestamptz) to service_role;
grant execute on function public.push_active_users(timestamptz, int, int) to service_role;

create index if not exists practices_created_user_idx on charlotte.practices (created_at, user_id);
