-- Ranking com foto: weekly_ranking passa a devolver avatar_url, e alltime_ranking faz o mesmo para a aba Geral
-- (o cache não tem foto e charlotte_users só deixa cada aluno ler a própria linha).
drop function if exists public.weekly_ranking(text);
create function public.weekly_ranking(p_level text)
returns table (user_id uuid, name text, avatar_url text, week_xp bigint, pos bigint)
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
  select u.id, u.name, u.avatar_url, t.week_xp, rank() over (order by t.week_xp desc)::bigint
    from tot t join charlotte_users u on u.id = t.user_id
   where u.charlotte_level = p_level and not coalesce(u.hide_from_ranking, false) and t.week_xp > 0
   order by t.week_xp desc
$$;
grant execute on function public.weekly_ranking(text) to authenticated, anon;

create or replace function public.alltime_ranking(p_level text, p_limit int default 20)
returns table (user_id uuid, name text, avatar_url text, total_xp bigint, pos bigint)
language sql stable security definer set search_path = public as $$
  select l.user_id::uuid, u.name, u.avatar_url, l.total_xp::bigint, rank() over (order by l.total_xp desc)::bigint
    from charlotte_leaderboard_cache l join charlotte_users u on u.id::text = l.user_id::text
   where l.user_level = p_level
   order by l.total_xp desc
   limit p_limit
$$;
grant execute on function public.alltime_ranking(text, int) to authenticated, anon;
