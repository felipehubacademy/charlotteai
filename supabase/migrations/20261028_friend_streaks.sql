-- Sequência com amigo: dias seguidos (calendário de Brasília) em que os dois praticaram (ou tiveram o dia
-- protegido pela proteção da semana). Vale a sequência que termina hoje ou ontem. Lida pelo /api/referral.
create or replace function public.friend_streaks(p_user uuid, p_ids uuid[])
returns table (friend_id uuid, streak int, me_today boolean, friend_today boolean)
language sql stable security definer set search_path = public as $$
  with t as (select (now() at time zone 'America/Sao_Paulo')::date as today),
  days as (
    select p.user_id, (p.created_at at time zone 'America/Sao_Paulo')::date as d
      from charlotte.practices p
     where p.user_id = any(p_ids || p_user) and p.created_at >= now() - interval '400 days'
    union
    select f.user_id, f.day from public.streak_freezes f where f.user_id = any(p_ids || p_user)
  ),
  mine as (select distinct d from days where user_id = p_user),
  pair as (select distinct d.user_id as fid, d.d from days d join mine m on m.d = d.d where d.user_id <> p_user),
  isl as (select fid, d, d - (row_number() over (partition by fid order by d))::int as g from pair),
  agg as (select fid, g, max(d) as mx, count(*)::int as n from isl group by fid, g)
  select f.id,
         coalesce((select a.n from agg a, t where a.fid = f.id and a.mx >= t.today - 1 order by a.mx desc limit 1), 0),
         exists (select 1 from mine, t where mine.d = t.today),
         exists (select 1 from days, t where days.user_id = f.id and days.d = t.today)
    from unnest(p_ids) as f(id);
$$;
revoke all on function public.friend_streaks(uuid, uuid[]) from public, anon, authenticated;
