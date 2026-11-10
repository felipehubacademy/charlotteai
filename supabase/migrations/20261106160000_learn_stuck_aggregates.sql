-- "Onde os alunos travam" (lib/learn-stuck.ts) com as contas feitas no banco.
-- Antes o servidor baixava todas as tentativas da janela (learn_attempts, teto de 50.000 linhas) e agrupava
-- em JS: com mais alunos o teto cortava calado e a função ficava lenta. Agora o banco devolve só o resultado
-- (até 40 itens de fala, 40 de gramática, 30 saídas, as falhas agrupadas e os totais) num único jsonb.
-- Mesmas regras do servidor:
--   - ordem de leitura = created_at desc, id desc; empates nas listas seguem a primeira aparição nessa ordem
--     (o sort estável do JS mantinha a ordem de inserção no Map);
--   - exemplos = as 4 primeiras respostas reprovadas distintas e não vazias, sem espaços nas pontas (o mesmo
--     conjunto de espaços do String.prototype.trim);
--   - média da nota: soma em float8 na ordem de leitura, devolvida como texto com extra_float_digits = 1
--     (representação exata, o servidor converte com Number() e arredonda como antes);
--   - "stop_rejected" recuperado: acerto do mesmo passo pelo mesmo aluno até 3 minutos depois, comparando
--     em milissegundos (o JS lia o horário com new Date(), que descarta os microssegundos).
-- Só a chave do servidor executa.

create or replace function public.learn_stuck_report(p_since timestamptz)
returns jsonb
language sql stable security definer set search_path = public, pg_temp set extra_float_digits = 1 as $$
  with r as (
    select a.id, a.user_id, a.level, a.module_id, a.unit_id, a.activity_type, a.step_idx, a.event,
      a.expected, a.answer, a.score, a.passed, a.error_code, a.platform, a.app_version, a.created_at,
      row_number() over (order by a.created_at desc, a.id desc) as rn
    from public.learn_attempts a
    where a.created_at >= p_since
  ),
  -- Linhas que entram em "onde travam" (fala e gramática, tentativa ou pulo, com gabarito).
  st as (
    select r.*,
      (r.event = 'attempt' and r.passed = false) as failed,
      btrim(coalesce(r.answer, ''), E' \t\n\r\u000b\f                 　﻿') as ans
    from r
    where r.activity_type in ('speaking', 'grammar') and r.expected is not null and r.expected <> ''
      and r.event in ('attempt', 'skip')
  ),
  sw as (
    select st.*,
      count(*) filter (where failed) over (partition by activity_type, level, module_id, unit_id, expected, user_id) as user_fails,
      min(rn) over (partition by activity_type, level, module_id, unit_id, expected, failed, ans) as ans_first
    from st
  ),
  sg as (
    select activity_type, level, module_id, unit_id, expected, min(rn) as first_rn,
      count(*) filter (where event = 'attempt')::int as attempts,
      count(*) filter (where failed)::int as fails,
      count(*) filter (where event = 'skip')::int as skips,
      count(distinct user_id)::int as students,
      count(distinct user_id) filter (where user_fails >= 2)::int as stuck,
      (sum(score::float8 order by rn) filter (where event = 'attempt' and score is not null))::text as score_sum,
      count(*) filter (where event = 'attempt' and score is not null)::int as score_n,
      (array_agg(ans order by rn) filter (where failed and ans <> '' and rn = ans_first))[1:4] as samples
    from sw
    group by activity_type, level, module_id, unit_id, expected
  ),
  sr as (
    select sg.*, row_number() over (partition by activity_type order by stuck desc, fails + skips desc, first_rn) as pos
    from sg
    where fails > 0 or skips > 0
  ),
  ex as (
    select level, module_id, unit_id, activity_type, step_idx, min(rn) as first_rn,
      count(*)::int as n, count(distinct user_id)::int as students
    from r where event = 'exit'
    group by level, module_id, unit_id, activity_type, step_idx
    order by students desc, n desc, first_rn
    limit 30
  ),
  fl as (
    select event, error_code, platform, app_version, min(rn) as first_rn,
      count(*)::int as n, count(distinct user_id)::int as students
    from r f
    where f.event in ('asr_error', 'mic_blocked')
      and not (f.error_code is not distinct from 'stop_rejected' and exists (
        select 1 from public.learn_attempts a
        where a.user_id = f.user_id
          and a.created_at >= date_trunc('milliseconds', f.created_at) + interval '1 millisecond'
          and a.created_at < date_trunc('milliseconds', f.created_at) + interval '3 minutes 1 millisecond'
          and a.event = 'attempt' and a.passed = true
          and a.module_id is not distinct from f.module_id and a.unit_id is not distinct from f.unit_id
          and a.step_idx is not distinct from f.step_idx))
    group by event, error_code, platform, app_version
  ),
  tot as (
    select
      count(*) filter (where event = 'attempt')::int as attempts,
      count(distinct user_id)::int as students,
      count(*) filter (where event = 'attempt' and passed = false)::int as fails,
      count(*) filter (where event = 'skip')::int as skips,
      count(*) filter (where event = 'exit')::int as exits,
      count(*) filter (where event = 'asr_error')::int as asr_errors,
      count(*) filter (where event = 'mic_blocked')::int as mic_blocked
    from r
  )
  select jsonb_build_object(
    'totals', (select jsonb_build_object('attempts', attempts, 'students', students, 'fails', fails, 'skips', skips,
      'exits', exits, 'asrErrors', asr_errors, 'micBlocked', mic_blocked) from tot),
    'stuck', coalesce((select jsonb_agg(jsonb_build_object('activity', activity_type, 'level', level, 'module', module_id,
      'unit', unit_id, 'expected', expected, 'attempts', attempts, 'fails', fails, 'skips', skips, 'students', students,
      'stuckStudents', stuck, 'scoreSum', score_sum, 'scoreN', score_n, 'samples', coalesce(to_jsonb(samples), '[]'::jsonb))
      order by activity_type, pos) from sr where pos <= 40), '[]'::jsonb),
    'exits', coalesce((select jsonb_agg(jsonb_build_object('level', level, 'module', module_id, 'unit', unit_id,
      'activity', activity_type, 'step', step_idx, 'count', n, 'students', students)
      order by students desc, n desc, first_rn) from ex), '[]'::jsonb),
    'failures', coalesce((select jsonb_agg(jsonb_build_object('kind', event, 'code', coalesce(error_code, '—'),
      'platform', coalesce(platform, '—'), 'version', coalesce(app_version, '—'), 'count', n, 'students', students)
      order by students desc, n desc, first_rn) from fl), '[]'::jsonb)
  )
$$;

revoke all on function public.learn_stuck_report(timestamptz) from public, anon, authenticated;
grant execute on function public.learn_stuck_report(timestamptz) to service_role;
