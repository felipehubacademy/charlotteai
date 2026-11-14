-- Semana da sequência: dias antes do cadastro voltam como 'before_start' (não como falta), para a
-- semana na tela inicial (WeekStrip) não mostrar como falta os dias em que a conta ainda não existia.
-- Versões antigas do app tratam o estado novo como dia vazio. Resto da função igual à de 20261028.
CREATE OR REPLACE FUNCTION public.streak_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  tz text; v_today date; v_last date; v_streak int;
  v_freeze_avail boolean; v_pending boolean; v_protected_day date; v_alive boolean;
  v_monday date; v_start date; v_days date[]; v_frozen date[]; v_week jsonb := '[]'::jsonb; d date; st text;
  c public.streak_challenges%rowtype; v_ch jsonb := null; v_ch_status text; v_ch_day int;
begin
  if uid is null then return null; end if;
  select coalesce(nullif(timezone, ''), 'America/Sao_Paulo') into tz from charlotte.users where id = uid;
  tz := coalesce(tz, 'America/Sao_Paulo');
  v_today := (now() at time zone tz)::date;
  select last_practice_date, streak_days into v_last, v_streak from charlotte.progress where user_id = uid;

  v_freeze_avail := not exists (select 1 from public.streak_freezes where user_id = uid and day >= v_today - 7);
  v_pending := v_last = v_today - 2 and coalesce(v_streak, 0) >= 1 and v_freeze_avail;
  select max(day) into v_protected_day from public.streak_freezes where user_id = uid and day >= v_today - 1;
  if v_pending then v_protected_day := v_today - 1; end if;
  v_alive := coalesce(v_last >= v_today - 1, false) or v_pending;

  v_monday := v_today - (extract(isodow from v_today)::int - 1);
  -- Dia em que a conta começou (fuso do aluno): os dias antes disso não são falta.
  select (created_at at time zone tz)::date into v_start from charlotte.users where id = uid;
  select coalesce(array_agg(distinct (p.created_at at time zone tz)::date), '{}') into v_days
    from charlotte.practices p
    where p.user_id = uid and p.created_at >= ((v_monday::timestamp) at time zone tz);
  select coalesce(array_agg(day), '{}') into v_frozen from public.streak_freezes where user_id = uid and day >= v_monday;
  if v_pending then v_frozen := v_frozen || (v_today - 1); end if;
  for i in 0..6 loop
    d := v_monday + i;
    st := case
      when d = any(v_days) then 'done'
      when d = any(v_frozen) then 'frozen'
      when d = v_today then 'today'
      when d > v_today then 'future'
      when v_start is not null and d < v_start then 'before_start'
      else 'missed' end;
    v_week := v_week || jsonb_build_object('date', d, 'state', st);
  end loop;

  select * into c from public.streak_challenges where user_id = uid;
  if found then
    v_ch_status := case
      when c.completed_at is not null then 'completed'
      when c.failed_at is not null or not v_alive then 'failed'
      else 'active' end;
    v_ch_day := least(c.target, greatest(0, (v_today - c.start_date) + case when v_last = v_today then 1 else 0 end));
    v_ch := jsonb_build_object('status', v_ch_status, 'start_date', c.start_date, 'target', c.target,
      'day', v_ch_day, 'reward_minutes', c.reward_seconds / 60, 'completed_at', c.completed_at);
  end if;

  return jsonb_build_object(
    'today', v_today,
    'streak', case when v_alive then coalesce(v_streak, 0) else 0 end,
    'practiced_today', coalesce(v_last = v_today, false),
    'protected_day', v_protected_day,
    'freeze_available', v_freeze_avail,
    'week', v_week,
    'challenge', v_ch
  );
end $function$;
