-- Sequência (ofensiva), inspirada no que o Duolingo publicou sobre retenção:
--   1. Congelamento automático: faltou 1 dia, a sequência não zera (1 vez a cada 7 dias).
--      Aplicado na próxima prática (o dia perdido fica em streak_freezes).
--   2. Desafio dos 7 dias: o aluno aceita; 7 dias seguidos desde o aceite = 10 min de ligação (uma vez).
--   3. streak_status(): uma consulta só para o app (sequência viva, semana, proteção, desafio).
--   4. Marcos longos: 50, 100, 200, 365, 500, 730 e 1000 dias.

create table if not exists public.streak_freezes (
  user_id    uuid not null,
  day        date not null,            -- o dia que faltou e foi protegido
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.streak_freezes enable row level security;

create table if not exists public.streak_challenges (
  user_id        uuid primary key,
  accepted_at    timestamptz not null default now(),
  start_date     date not null,          -- dia do aceite (conta como dia 1)
  target         int  not null default 7,
  reward_seconds int  not null default 600,
  completed_at   timestamptz,
  failed_at      timestamptz
);
alter table public.streak_challenges enable row level security;

-- A semana da sequência lê as práticas do aluno por data: sem este índice cada leitura varre a tabela.
create index if not exists practices_user_created_idx on charlotte.practices (user_id, created_at);

-- Faltou exatamente 1 dia (última prática anteontem) e não usou congelamento nos últimos 7 dias:
-- protege o dia que faltou. Chamado pelo trigger antes de atualizar a sequência.
create or replace function public.rn_streak_try_freeze(p_user uuid, p_today date)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_last date; v_streak int;
begin
  select last_practice_date, streak_days into v_last, v_streak from charlotte.progress where user_id = p_user;
  if v_last is null or v_last <> p_today - 2 or coalesce(v_streak, 0) < 1 then return false; end if;
  if exists (select 1 from public.streak_freezes where user_id = p_user and day >= p_today - 7) then return false; end if;
  insert into public.streak_freezes (user_id, day) values (p_user, p_today - 1) on conflict do nothing;
  return true;
end $$;

-- Desafio dos 7 dias depois de cada prática: zerou a sequência depois do aceite = falhou;
-- chegou ao 7º dia desde o aceite = concluído e credita os minutos (só uma vez).
create or replace function public.rn_streak_challenge_tick(p_user uuid, p_today date, p_reset boolean)
returns void language plpgsql security definer set search_path = public as $$
declare c public.streak_challenges%rowtype;
begin
  select * into c from public.streak_challenges where user_id = p_user and completed_at is null and failed_at is null;
  if not found then return; end if;
  if p_reset and c.start_date < p_today then
    update public.streak_challenges set failed_at = now() where user_id = p_user;
    return;
  end if;
  if p_today - c.start_date + 1 >= c.target then
    update public.streak_challenges set completed_at = now() where user_id = p_user and completed_at is null;
    if found then
      update charlotte.users set live_voice_bonus_seconds = coalesce(live_voice_bonus_seconds, 0) + c.reward_seconds where id = p_user;
    end if;
  end if;
end $$;

-- Trigger de prática: igual ao anterior, com o congelamento na conta da sequência e o desafio no fim.
create or replace function public.rn_on_practice_insert()
 returns trigger
 language plpgsql
as $function$
declare
  v_user_tz      text;
  v_old_xp       int;
  v_new_xp       int;
  v_today        date;
  v_last         date;
  v_freeze       boolean := false;
  v_milestones   int[] := array[100, 250, 500, 1000, 2500, 5000, 10000];
  v_milestone    int;
  v_user_level   text;
  v_display_name text;
  v_en           boolean := false;
  v_ach_id       uuid;
  v_ach_name     text;
  v_ach_desc     text;
  v_ach_rarity   text;
  v_ach_icon     text;
  v_ach_bonus    int;
begin
  -- Fuso do usuário (fallback America/Sao_Paulo). "Hoje" é a data local
  -- do usuário, NÃO o current_date do servidor (que está em UTC).
  select coalesce(nullif(timezone, ''), 'America/Sao_Paulo')
    into v_user_tz
    from charlotte.users where id = new.user_id;

  v_today := (current_timestamp at time zone v_user_tz)::date;

  select last_practice_date into v_last from charlotte.progress where user_id = new.user_id;
  -- A prática nunca pode falhar por causa da proteção ou do desafio: qualquer erro aqui é ignorado.
  begin
    v_freeze := public.rn_streak_try_freeze(new.user_id, v_today);
  exception when others then
    v_freeze := false;
  end;

  -- Update XP + streak (congelamento: faltou só ontem e tinha proteção → continua)
  insert into charlotte.progress (user_id, total_xp, streak_days, last_practice_date, updated_at)
    values (new.user_id, new.xp_earned, 1, v_today, now())
  on conflict (user_id) do update
    set total_xp           = progress.total_xp + new.xp_earned,
        streak_days        = case
                               when progress.last_practice_date = v_today     then progress.streak_days
                               when progress.last_practice_date = v_today - 1 then progress.streak_days + 1
                               when v_freeze and progress.last_practice_date = v_today - 2 then progress.streak_days + 1
                               else 1
                             end,
        last_practice_date = v_today,
        updated_at         = now();

  begin
    perform public.rn_streak_challenge_tick(new.user_id, v_today, v_last is not null and v_last < v_today - 1 and not v_freeze);
  exception when others then
    null;
  end;

  -- Get user level and display name from charlotte.users (canonical for RN)
  select coalesce(u.charlotte_level, 'Novice'),
         coalesce(
           case
             when u.name is not null and u.name <> '' then
               case
                 when position(' ' in trim(u.name)) > 0 then
                   split_part(trim(u.name), ' ', 1) || ' ' ||
                   upper(left(trim(split_part(trim(u.name), ' ', 2)), 1)) || '.'
                 else trim(u.name)
               end
             else split_part(u.email, '@', 1)
           end, 'Anonymous')
    into v_user_level, v_display_name
    from charlotte.users u where u.id = new.user_id;

  v_en := (v_user_level = 'Advanced');

  -- XP milestones (real practice types only)
  if new.practice_type not like 'mission_reward_%'
     and new.practice_type not like 'achievement_reward_%' then

    select total_xp - new.xp_earned into v_old_xp
      from charlotte.progress where user_id = new.user_id;
    v_new_xp := v_old_xp + new.xp_earned;

    foreach v_milestone in array v_milestones loop
      if v_old_xp < v_milestone and v_new_xp >= v_milestone then

        v_ach_name   := case when v_en then
          case v_milestone when 100 then 'First Steps' when 250 then 'In Progress' when 500 then 'Halfway There' when 1000 then 'Dedicated' when 2500 then 'Advancing' when 5000 then 'Expert' when 10000 then 'Master' end
        else
          case v_milestone when 100 then 'Primeiros Passos' when 250 then 'Em Progresso' when 500 then 'Meio Caminho' when 1000 then 'Dedicado' when 2500 then 'Avançando' when 5000 then 'Expert' when 10000 then 'Mestre' end
        end;
        v_ach_desc   := case when v_en then
          case v_milestone when 100 then 'You earned your first 100 XP!' when 250 then 'Reached 250 XP — keep it up!' when 500 then '500 XP earned!' when 1000 then '1,000 XP — you are dedicated!' when 2500 then '2,500 XP — impressive!' when 5000 then '5,000 XP — expert level!' when 10000 then '10,000 XP — you are a master!' end
        else
          case v_milestone when 100 then 'Você ganhou seus primeiros 100 XP!' when 250 then 'Chegou a 250 XP — continue assim!' when 500 then '500 XP conquistados!' when 1000 then '1.000 XP — você é dedicado!' when 2500 then '2.500 XP — impressionante!' when 5000 then '5.000 XP — nível expert!' when 10000 then '10.000 XP — você é um mestre!' end
        end;
        v_ach_rarity := case v_milestone when 100 then 'common' when 250 then 'common' when 500 then 'rare' when 1000 then 'rare' when 2500 then 'epic' when 5000 then 'epic' when 10000 then 'legendary' end;
        v_ach_icon   := case v_milestone when 100 then 'xp_100' when 250 then 'xp_250' when 500 then 'xp_500' when 1000 then 'xp_1000' when 2500 then 'xp_2500' when 5000 then 'xp_5000' when 10000 then 'xp_10000' end;
        v_ach_bonus  := case v_milestone when 100 then 20 when 250 then 30 when 500 then 60 when 1000 then 100 when 2500 then 200 when 5000 then 350 when 10000 then 600 end;

        if not exists (
          select 1 from charlotte.user_achievements
          where user_id = new.user_id::text
            and achievement_type = 'xp_milestone'
            and achievement_name = v_ach_name
        ) then
          insert into charlotte.user_achievements (
            user_id, achievement_type, achievement_name, achievement_description,
            xp_bonus, rarity, badge_icon, badge_color, category
          ) values (
            new.user_id::text, 'xp_milestone', v_ach_name, v_ach_desc,
            v_ach_bonus, v_ach_rarity, v_ach_icon, '#A3FF3C', 'xp_milestone'
          );
          update charlotte.progress
            set total_xp = total_xp + v_ach_bonus, updated_at = now()
            where user_id = new.user_id;
          update charlotte.leaderboard_cache
            set total_xp = total_xp + v_ach_bonus, updated_at = now()
            where user_id = new.user_id;
        end if;
      end if;
    end loop;

    perform public.rn_award_achievements(new.user_id);

  end if;

  -- Upsert leaderboard cache
  insert into charlotte.leaderboard_cache (user_id, user_level, display_name, total_xp, updated_at)
    values (new.user_id, coalesce(v_user_level, 'Novice'), coalesce(v_display_name, 'Anonymous'), new.xp_earned, now())
  on conflict (user_id) do update
    set total_xp     = leaderboard_cache.total_xp + excluded.total_xp,
        user_level   = coalesce(v_user_level, leaderboard_cache.user_level),
        display_name = coalesce(v_display_name, leaderboard_cache.display_name),
        updated_at   = now();

  return new;
end;
$function$;

-- Estado da sequência para o app (fuso do aluno):
--   streak (0 se já quebrou), practiced_today, protected (faltou ontem e a proteção segura / já segurou),
--   freeze_available, week (seg a dom: done | frozen | today | missed | future), challenge.
create or replace function public.streak_status()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  tz text; v_today date; v_last date; v_streak int;
  v_freeze_avail boolean; v_pending boolean; v_protected_day date; v_alive boolean;
  v_monday date; v_days date[]; v_frozen date[]; v_week jsonb := '[]'::jsonb; d date; st text;
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
end $$;

-- Aceitar o desafio (hoje é o dia 1). Quem já concluiu não aceita de novo; quem falhou recomeça.
create or replace function public.accept_streak_challenge()
returns boolean language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); tz text; v_today date;
begin
  if uid is null then return false; end if;
  if exists (select 1 from public.streak_challenges where user_id = uid and completed_at is not null) then return false; end if;
  select coalesce(nullif(timezone, ''), 'America/Sao_Paulo') into tz from charlotte.users where id = uid;
  v_today := (now() at time zone coalesce(tz, 'America/Sao_Paulo'))::date;
  insert into public.streak_challenges (user_id, start_date) values (uid, v_today)
  on conflict (user_id) do update set accepted_at = now(), start_date = excluded.start_date, failed_at = null;
  return true;
end $$;

revoke all on function public.streak_status() from public, anon;
revoke all on function public.accept_streak_challenge() from public, anon;
revoke all on function public.rn_streak_try_freeze(uuid, date) from public, anon;
revoke all on function public.rn_streak_challenge_tick(uuid, date, boolean) from public, anon;
-- O trigger de prática roda como o aluno: sem estas duas, toda prática gravada pelo app falha.
grant execute on function public.rn_streak_try_freeze(uuid, date) to authenticated;
grant execute on function public.rn_streak_challenge_tick(uuid, date, boolean) to authenticated;
grant execute on function public.streak_status() to authenticated;
grant execute on function public.accept_streak_challenge() to authenticated;

-- Marcos longos de sequência (os mesmos nos três níveis; Advanced em inglês).
insert into charlotte.achievements (code, name, description, xp_reward, requirement_type, requirement_value, user_level, category, badge_color, badge_icon, rarity, is_active, sort_order)
select m.code,
       case when l.lvl = 'Advanced' then m.name_en else m.name_pt end,
       case when l.lvl = 'Advanced' then m.desc_en else m.desc_pt end,
       m.xp, 'streak_days', m.days, l.lvl, 'streak', m.color, m.code, 'legendary', true, m.sort
from (values
  ('streak_50',   50, 'Cinquentão',        '50 dias seguidos — isso já é hábito!',             'Fifty Strong',    '50 days in a row — that is a habit now!',          500, '#F97316', 34),
  ('streak_100', 100, 'Centenário',        '100 dias seguidos — poucos chegam aqui!',          'Centurion',       '100 days in a row — few people get here!',         800, '#EF4444', 35),
  ('streak_200', 200, 'Duzentos',          '200 dias seguidos — disciplina de atleta!',        'Two Hundred',     '200 days in a row — athlete discipline!',         1200, '#EC4899', 36),
  ('streak_365', 365, 'Um Ano Inteiro',    '365 dias seguidos — um ano sem parar!',            'One Full Year',   '365 days in a row — a whole year!',               2000, '#8B5CF6', 37),
  ('streak_500', 500, 'Quinhentos',        '500 dias seguidos — lenda viva!',                  'Five Hundred',    '500 days in a row — a living legend!',            2500, '#6366F1', 38),
  ('streak_730', 730, 'Dois Anos',         '730 dias seguidos — dois anos sem parar!',         'Two Years',       '730 days in a row — two years straight!',         3500, '#0EA5E9', 39),
  ('streak_1000',1000,'Mil Dias',          '1.000 dias seguidos — inacreditável!',             'A Thousand Days', '1,000 days in a row — unbelievable!',             5000, '#EAB308', 40)
) as m(code, days, name_pt, desc_pt, name_en, desc_en, xp, color, sort)
cross join (values ('Novice'), ('Inter'), ('Advanced')) as l(lvl)
on conflict (code, user_level) do nothing;
