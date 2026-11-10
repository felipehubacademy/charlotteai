-- Contas no banco para /api/admin/learning, /api/admin/users e /api/admin/notifications.
-- Antes cada tela baixava todas as linhas do período (práticas, mensagens, trilha, progresso, envios de push)
-- e somava no servidor; com 10 mil a 100 mil alunos isso estoura o tempo. Aqui o banco devolve só os totais
-- (ou uma linha por aluno, quando a tela mostra o aluno). Cada função devolve um jsonb só: uma ida ao banco,
-- sem o teto de 1.000 linhas da API e sem refazer a conta a cada página.
-- Regras copiadas do código (mantenha as duas iguais):
--   equipe: lib/admin-subscriptions.ts (isTeamAccount / TEAM_EMAIL);
--   estudo: lib/learning-stats.ts (isStudy, PRON_RE, isCorrection);
--   trilha: lib/learning-v2.ts (atividades com nota = grammar e speaking).
-- As divisões e arredondamentos ficam no código (mesma conta de antes); o banco devolve somas e contagens.

-- Conta da equipe (fora de todos os números de negócio).
create or replace function public.admin_is_team(p_email text, p_institutional boolean, p_hide boolean)
returns boolean
language sql immutable set search_path = public, pg_temp as $$
  select coalesce(p_institutional, false) or coalesce(p_hide, false)
      or coalesce(p_email ~* '@(hubacademybr\.com|queizy\.com)$' or p_email ~* '^felipe\.xavier1987\+', false)
$$;
revoke all on function public.admin_is_team(text, boolean, boolean) from public, anon, authenticated;
grant execute on function public.admin_is_team(text, boolean, boolean) to service_role;

-- Pedagógico (panorama): totais da turma no período, sem a equipe.
-- Linhas de aluno que não existe mais em charlotte_users continuam contando (como no código antigo).
-- "first" = ordem da primeira aparição (por id), para o desempate das listas sair igual ao de antes.
create or replace function public.admin_learning_overview(p_since timestamptz)
returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  with team as (
    select u.id::text as id from public.charlotte_users u
    where public.admin_is_team(u.email, u.is_institutional, u.hide_from_ranking)
  ),
  study as (
    select p.user_id::text as user_id, p.practice_type, row_number() over (order by p.id) as rn
    from public.charlotte_practices p
    where p.created_at >= p_since
      and not starts_with(p.practice_type, 'mission_reward') and not starts_with(p.practice_type, 'weekly_reward')
      and not exists (select 1 from team t where t.id = p.user_id::text)
  ),
  msgs as (
    select m.id, m.user_id, m.role, m.mode, m.content
    from public.chat_messages m
    where m.mode in ('pronunciation', 'grammar') and m.created_at >= p_since
      and not exists (select 1 from team t where t.id = m.user_id)
  ),
  pron as (
    select h[1]::numeric as score, h[2] as words, row_number() over (order by m.id) as rn
    from msgs m cross join lateral regexp_match(m.content, '\[score:(\d+)\s+mispronounced:([^]]*)\]') as h
    where m.mode = 'pronunciation' and m.role = 'user' and h[1]::numeric <> 0
  ),
  words as (
    select lower(s.w) as word, p.rn, s.o
    from pron p cross join lateral regexp_split_to_table(p.words, '[,\s]+') with ordinality as s(w, o)
    where s.w <> ''
  ),
  top_words as (
    select word, count(*) as n, min(array[rn, o]) as first from words group by word
    order by count(*) desc, min(array[rn, o]) limit 12
  ),
  v2 as (
    select r.user_id::text as user_id, r.level, r.module_id, r.unit_id, r.activity_type, r.score, r.completed,
           r.activity_type in ('grammar', 'speaking') and r.score is not null and r.score <> 'NaN'::numeric as graded,
           row_number() over (order by r.id) as rn
    from public.learn_history_v2 r
    where r.updated_at >= p_since
      and not exists (select 1 from team t where t.id = r.user_id::text)
  ),
  units as (
    select level, module_id, unit_id, sum(score) as sum, count(*) as n, count(distinct user_id) as users, min(rn) as first
    from v2 where graded group by level, module_id, unit_id
  )
  select jsonb_build_object(
    'practices', (select count(*) from study),
    'active', (select count(distinct user_id) + (case when bool_or(user_id is null) then 1 else 0 end) from study),
    'byType', (select coalesce(jsonb_agg(jsonb_build_object('type', practice_type, 'n', n) order by first), '[]'::jsonb)
               from (select practice_type, count(*) as n, min(rn) as first from study group by practice_type) s),
    'pronSum', (select coalesce(sum(score), 0) from pron),
    'pronN', (select count(*) from pron),
    'topWords', (select coalesce(jsonb_agg(jsonb_build_object('word', word, 'count', n) order by n desc, first), '[]'::jsonb) from top_words),
    'grammarAnalyzed', (select count(*) from msgs where mode = 'grammar' and role = 'assistant'),
    'grammarWithErrors', (select count(*) from msgs where mode = 'grammar' and role = 'assistant'
      and (strpos(content, chr(10060)) > 0
           or content ~ ('(^|[' || chr(10) || chr(13) || chr(8232) || chr(8233) || '])Error:'))),
    'tfTotal', (select count(*) from public.trail_feedback where created_at >= p_since),
    'tfOk', (select count(*) from public.trail_feedback where created_at >= p_since and error_free),
    'v2Sum', (select coalesce(sum(score), 0) from v2 where graded),
    'v2N', (select count(*) from v2 where graded),
    'v2ByActivity', (select coalesce(jsonb_agg(jsonb_build_object('type', activity_type, 'n', n, 'completed', completed,
                       'gradedSum', graded_sum, 'gradedN', graded_n)), '[]'::jsonb)
                     from (select activity_type, count(*) as n, count(*) filter (where completed) as completed,
                                  coalesce(sum(score) filter (where graded), 0) as graded_sum, count(*) filter (where graded) as graded_n
                           from v2 group by activity_type) a),
    'v2Units', (select coalesce(jsonb_agg(jsonb_build_object('level', level, 'module', module_id, 'unit', unit_id,
                  'sum', sum, 'n', n, 'users', users) order by first), '[]'::jsonb) from units)
  )
$$;
revoke all on function public.admin_learning_overview(timestamptz) from public, anon, authenticated;
grant execute on function public.admin_learning_overview(timestamptz) to service_role;

-- Pedagógico (lista de alunos): uma entrada por aluno (sem a equipe), na ordem de cadastro mais recente,
-- com o progresso e o que ele fez no período (práticas de estudo, última prática, trilha e pronúncia).
create or replace function public.admin_learning_students(p_since timestamptz)
returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  with users as (
    select u.id, u.name, u.charlotte_level, u.created_at from public.charlotte_users u
    where not public.admin_is_team(u.email, u.is_institutional, u.hide_from_ranking)
  ),
  study as (
    select p.user_id, count(*) as n, max(p.created_at) as last
    from public.charlotte_practices p
    where p.created_at >= p_since
      and not starts_with(p.practice_type, 'mission_reward') and not starts_with(p.practice_type, 'weekly_reward')
    group by p.user_id
  ),
  v2 as (
    select r.user_id, sum(r.score) as sum, count(*) as n
    from public.learn_history_v2 r
    where r.updated_at >= p_since and r.activity_type in ('grammar', 'speaking') and r.score is not null and r.score <> 'NaN'::numeric
    group by r.user_id
  ),
  pron as (
    select m.user_id, sum(h[1]::numeric) as sum, count(*) as n
    from public.chat_messages m cross join lateral regexp_match(m.content, '\[score:(\d+)\s+mispronounced:([^]]*)\]') as h
    where m.mode = 'pronunciation' and m.role = 'user' and m.created_at >= p_since and h[1]::numeric <> 0
    group by m.user_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', u.id, 'name', u.name, 'level', u.charlotte_level,
    'xp', g.total_xp, 'streak', g.streak_days, 'lastDate', g.last_practice_date, 'hasProgress', g.user_id is not null,
    'practices', coalesce(s.n, 0), 'last', s.last,
    'v2Sum', coalesce(v.sum, 0), 'v2N', coalesce(v.n, 0),
    'pronSum', p.sum, 'pronN', coalesce(p.n, 0)
  ) order by u.created_at desc, u.id), '[]'::jsonb)
  from users u
  left join public.charlotte_progress g on g.user_id = u.id
  left join study s on s.user_id = u.id
  left join v2 v on v.user_id = u.id
  left join pron p on p.user_id = u.id::text
$$;
revoke all on function public.admin_learning_students(timestamptz) from public, anon, authenticated;
grant execute on function public.admin_learning_students(timestamptz) to service_role;

-- Usuários: por aluno (id em minúsculas), o engajamento de admin_user_engagement, o progresso e as unidades da
-- trilha concluídas (as 4 atividades) por nível. Antes vinham todas as linhas concluídas da trilha.
create or replace function public.admin_users_aggregates()
returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'engagement', (select coalesce(jsonb_agg(to_jsonb(e)), '[]'::jsonb) from (
      select lower(p.user_id::text) as user_id, coalesce(sum(p.xp_earned), 0)::bigint as total_xp, max(p.created_at) as last_active,
             count(*) filter (where p.practice_type = 'learn_exercise') as lesson_count,
             count(*) filter (where p.practice_type in ('text_message', 'audio_message', 'grammar_message')) as message_count,
             count(distinct (p.created_at at time zone 'UTC')::date) as session_days
      from public.charlotte_practices p group by 1) e),
    'progress', (select coalesce(jsonb_agg(jsonb_build_object('user_id', g.user_id, 'streak_days', g.streak_days,
                   'total_xp', g.total_xp, 'last_practice_date', g.last_practice_date)), '[]'::jsonb)
                 from public.charlotte_progress g),
    'trail', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from (
      select uid as user_id, count(*) filter (where level = 'Novice') as novice,
             count(*) filter (where level = 'Inter') as inter, count(*) filter (where level = 'Advanced') as advanced
      from (select lower(r.user_id::text) as uid, r.level
            from public.learn_history_v2 r where r.completed
            group by 1, r.level, r.module_id, r.unit_id
            having count(distinct r.activity_type) >= 4) u
      group by uid
      having count(*) filter (where level in ('Novice', 'Inter', 'Advanced')) > 0) t)
  )
$$;
revoke all on function public.admin_users_aggregates() from public, anon, authenticated;
grant execute on function public.admin_users_aggregates() to service_role;

-- Notificações: alunos com push, envios 24 h / 7 dias, por tipo (7 dias) e volume diário dos enviados (30 dias).
-- O dia do volume diário sai no fuso da sessão (o mesmo do texto de data que a API devolvia e o código cortava).
create or replace function public.admin_notification_stats(p_ago24h timestamptz, p_ago7d timestamptz, p_ago30d timestamptz)
returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  with week as (
    select l.user_id, l.notification_type, l.status, row_number() over (order by l.id) as rn
    from public.notification_logs l
    where l.created_at >= p_ago7d and l.status is distinct from 'scheduler_lock'
  )
  select jsonb_build_object(
    'tokenTotal', (select count(*) from public.charlotte_users u where not public.admin_is_team(u.email, u.is_institutional, u.hide_from_ranking)),
    'tokenWith', (select count(*) from public.charlotte_users u where not public.admin_is_team(u.email, u.is_institutional, u.hide_from_ranking)
                   and starts_with(u.expo_push_token, 'ExponentPushToken[')),
    'sent24h', (select count(*) from public.notification_logs where created_at >= p_ago24h and status = 'sent'),
    'failed24h', (select count(*) from public.notification_logs where created_at >= p_ago24h and status = 'failed'),
    'sent7d', (select count(*) from week where status = 'sent'),
    'failed7d', (select count(*) from week where status = 'failed'),
    'byType', (select coalesce(jsonb_agg(jsonb_build_object('type', type, 'sent', sent, 'failed', failed, 'uniqueUsers', users) order by first), '[]'::jsonb)
               from (select coalesce(notification_type, 'null') as type,
                            count(*) filter (where status = 'sent') as sent, count(*) filter (where status = 'failed') as failed,
                            count(distinct user_id) + (case when bool_or(user_id is null) then 1 else 0 end) as users,
                            min(rn) as first
                     from week group by 1) t),
    'timeseries', (select coalesce(jsonb_agg(jsonb_build_object('date', day, 'count', n) order by day), '[]'::jsonb)
                   from (select to_char(created_at, 'YYYY-MM-DD') as day, count(*) as n
                         from public.notification_logs where created_at >= p_ago30d and status = 'sent' group by 1) d)
  )
$$;
revoke all on function public.admin_notification_stats(timestamptz, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_notification_stats(timestamptz, timestamptz, timestamptz) to service_role;

-- Índices para os filtros por período que não tinham índice (as outras tabelas já têm por created_at).
create index if not exists chat_messages_study_created_idx on charlotte.chat_messages (created_at) where mode in ('pronunciation', 'grammar');
create index if not exists learn_history_v2_updated_idx on public.learn_history_v2 (updated_at);
