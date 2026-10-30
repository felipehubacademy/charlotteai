create or replace function public.admin_user_engagement()
returns table (user_id text, total_xp bigint, last_active timestamptz, lesson_count bigint, message_count bigint, session_days bigint)
language sql stable security definer set search_path = charlotte, public as $$
  select lower(p.user_id::text), coalesce(sum(p.xp_earned), 0)::bigint, max(p.created_at),
         count(*) filter (where p.practice_type = 'learn_exercise'),
         count(*) filter (where p.practice_type in ('text_message', 'audio_message', 'grammar_message')),
         count(distinct (p.created_at at time zone 'UTC')::date)
  from charlotte.practices p
  group by 1
$$;
revoke execute on function public.admin_user_engagement() from public, anon, authenticated;
grant execute on function public.admin_user_engagement() to service_role;
