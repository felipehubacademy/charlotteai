-- Fix: streak_days e last_practice_date estavam usando current_date (UTC do
-- servidor) em vez do fuso do usuário. Resultado: usuários nas Américas
-- praticando à noite (após meia-noite UTC mas antes da local) tinham
-- last_practice_date gravado como o dia seguinte → comparação no front
-- (lastPracticeDate === todayStr) falhava → streak aparecia zerado.
--
-- A migration 20260429_streak_user_timezone.sql tinha esse fix mas nao
-- foi aplicada ou foi sobrescrita. Re-aplicando aqui.

-- ── 1. Patch rn_on_practice_insert ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rn_on_practice_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_user_tz      text;
  v_old_xp       int;
  v_new_xp       int;
  v_today        date;
  v_milestones   int[] := ARRAY[100, 250, 500, 1000, 2500, 5000, 10000];
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
BEGIN
  -- Fuso do usuário (fallback America/Sao_Paulo). "Hoje" é a data local
  -- do usuário, NÃO o current_date do servidor (que está em UTC).
  SELECT COALESCE(NULLIF(timezone, ''), 'America/Sao_Paulo')
    INTO v_user_tz
    FROM charlotte.users WHERE id = NEW.user_id;

  v_today := (current_timestamp AT TIME ZONE v_user_tz)::date;

  -- Update XP + streak
  INSERT INTO charlotte.progress (user_id, total_xp, streak_days, last_practice_date, updated_at)
    VALUES (NEW.user_id, NEW.xp_earned, 1, v_today, now())
  ON CONFLICT (user_id) DO UPDATE
    SET total_xp           = progress.total_xp + NEW.xp_earned,
        streak_days        = CASE
                               WHEN progress.last_practice_date = v_today - 1 THEN progress.streak_days + 1
                               WHEN progress.last_practice_date = v_today     THEN progress.streak_days
                               ELSE 1
                             END,
        last_practice_date = v_today,
        updated_at         = now();

  -- Get user level and display name from charlotte.users (canonical for RN)
  SELECT COALESCE(u.charlotte_level, 'Novice'),
         COALESCE(
           CASE
             WHEN u.name IS NOT NULL AND u.name <> '' THEN
               CASE
                 WHEN position(' ' IN trim(u.name)) > 0 THEN
                   split_part(trim(u.name), ' ', 1) || ' ' ||
                   upper(left(trim(split_part(trim(u.name), ' ', 2)), 1)) || '.'
                 ELSE trim(u.name)
               END
             ELSE split_part(u.email, '@', 1)
           END, 'Anonymous')
    INTO v_user_level, v_display_name
    FROM charlotte.users u WHERE u.id = NEW.user_id;

  v_en := (v_user_level = 'Advanced');

  -- XP milestones (real practice types only)
  IF NEW.practice_type NOT LIKE 'mission_reward_%'
     AND NEW.practice_type NOT LIKE 'achievement_reward_%' THEN

    SELECT total_xp - NEW.xp_earned INTO v_old_xp
      FROM charlotte.progress WHERE user_id = NEW.user_id;
    v_new_xp := v_old_xp + NEW.xp_earned;

    FOREACH v_milestone IN ARRAY v_milestones LOOP
      IF v_old_xp < v_milestone AND v_new_xp >= v_milestone THEN

        v_ach_name   := CASE WHEN v_en THEN
          CASE v_milestone WHEN 100 THEN 'First Steps' WHEN 250 THEN 'In Progress' WHEN 500 THEN 'Halfway There' WHEN 1000 THEN 'Dedicated' WHEN 2500 THEN 'Advancing' WHEN 5000 THEN 'Expert' WHEN 10000 THEN 'Master' END
        ELSE
          CASE v_milestone WHEN 100 THEN 'Primeiros Passos' WHEN 250 THEN 'Em Progresso' WHEN 500 THEN 'Meio Caminho' WHEN 1000 THEN 'Dedicado' WHEN 2500 THEN 'Avançando' WHEN 5000 THEN 'Expert' WHEN 10000 THEN 'Mestre' END
        END;
        v_ach_desc   := CASE WHEN v_en THEN
          CASE v_milestone WHEN 100 THEN 'You earned your first 100 XP!' WHEN 250 THEN 'Reached 250 XP — keep it up!' WHEN 500 THEN '500 XP earned!' WHEN 1000 THEN '1,000 XP — you are dedicated!' WHEN 2500 THEN '2,500 XP — impressive!' WHEN 5000 THEN '5,000 XP — expert level!' WHEN 10000 THEN '10,000 XP — you are a master!' END
        ELSE
          CASE v_milestone WHEN 100 THEN 'Você ganhou seus primeiros 100 XP!' WHEN 250 THEN 'Chegou a 250 XP — continue assim!' WHEN 500 THEN '500 XP conquistados!' WHEN 1000 THEN '1.000 XP — você é dedicado!' WHEN 2500 THEN '2.500 XP — impressionante!' WHEN 5000 THEN '5.000 XP — nível expert!' WHEN 10000 THEN '10.000 XP — você é um mestre!' END
        END;
        v_ach_rarity := CASE v_milestone WHEN 100 THEN 'common' WHEN 250 THEN 'common' WHEN 500 THEN 'rare' WHEN 1000 THEN 'rare' WHEN 2500 THEN 'epic' WHEN 5000 THEN 'epic' WHEN 10000 THEN 'legendary' END;
        v_ach_icon   := CASE v_milestone WHEN 100 THEN 'xp_100' WHEN 250 THEN 'xp_250' WHEN 500 THEN 'xp_500' WHEN 1000 THEN 'xp_1000' WHEN 2500 THEN 'xp_2500' WHEN 5000 THEN 'xp_5000' WHEN 10000 THEN 'xp_10000' END;
        v_ach_bonus  := CASE v_milestone WHEN 100 THEN 20 WHEN 250 THEN 30 WHEN 500 THEN 60 WHEN 1000 THEN 100 WHEN 2500 THEN 200 WHEN 5000 THEN 350 WHEN 10000 THEN 600 END;

        IF NOT EXISTS (
          SELECT 1 FROM charlotte.user_achievements
          WHERE user_id = NEW.user_id::text
            AND achievement_type = 'xp_milestone'
            AND achievement_name = v_ach_name
        ) THEN
          INSERT INTO charlotte.user_achievements (
            user_id, achievement_type, achievement_name, achievement_description,
            xp_bonus, rarity, badge_icon, badge_color, category
          ) VALUES (
            NEW.user_id::text, 'xp_milestone', v_ach_name, v_ach_desc,
            v_ach_bonus, v_ach_rarity, v_ach_icon, '#A3FF3C', 'xp_milestone'
          );
          UPDATE charlotte.progress
            SET total_xp = total_xp + v_ach_bonus, updated_at = now()
            WHERE user_id = NEW.user_id;
          UPDATE charlotte.leaderboard_cache
            SET total_xp = total_xp + v_ach_bonus, updated_at = now()
            WHERE user_id = NEW.user_id;
        END IF;
      END IF;
    END LOOP;

    PERFORM public.rn_award_achievements(NEW.user_id);

  END IF;

  -- Upsert leaderboard cache
  INSERT INTO charlotte.leaderboard_cache (user_id, user_level, display_name, total_xp, updated_at)
    VALUES (NEW.user_id, COALESCE(v_user_level, 'Novice'), COALESCE(v_display_name, 'Anonymous'), NEW.xp_earned, now())
  ON CONFLICT (user_id) DO UPDATE
    SET total_xp     = leaderboard_cache.total_xp + EXCLUDED.total_xp,
        user_level   = COALESCE(v_user_level, leaderboard_cache.user_level),
        display_name = COALESCE(v_display_name, leaderboard_cache.display_name),
        updated_at   = now();

  RETURN NEW;
END;
$function$;


-- ── 2. Patch update_user_progress_on_learn ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_user_progress_on_learn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_tz text;
  v_today   date;
BEGIN
  SELECT COALESCE(NULLIF(timezone, ''), 'America/Sao_Paulo')
    INTO v_user_tz
    FROM charlotte.users WHERE id = NEW.user_id;

  v_today := (current_timestamp AT TIME ZONE v_user_tz)::date;

  INSERT INTO charlotte.progress (
    user_id, total_xp, streak_days, last_practice_date, updated_at
  )
  VALUES (
    NEW.user_id,
    COALESCE(NEW.xp_earned, 0),
    1,
    v_today,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_xp           = charlotte.progress.total_xp + COALESCE(NEW.xp_earned, 0),
    last_practice_date = v_today,
    streak_days = CASE
      WHEN charlotte.progress.last_practice_date = v_today - 1
        THEN charlotte.progress.streak_days + 1
      WHEN charlotte.progress.last_practice_date = v_today
        THEN charlotte.progress.streak_days
      ELSE 1
    END,
    updated_at = NOW();

  RETURN NEW;
END;
$function$;


-- ── 3. Backfill: corrige usuários cujo last_practice_date está no futuro ──
-- relativo ao "hoje" no fuso deles. Isso só pode acontecer por causa do bug
-- antigo (current_date UTC à frente do fuso local). Reset pra hoje local.
UPDATE charlotte.progress p
SET last_practice_date = (current_timestamp AT TIME ZONE
                            COALESCE(NULLIF(u.timezone, ''), 'America/Sao_Paulo')
                          )::date,
    updated_at = now()
FROM charlotte.users u
WHERE u.id = p.user_id
  AND p.last_practice_date > (current_timestamp AT TIME ZONE
                                COALESCE(NULLIF(u.timezone, ''), 'America/Sao_Paulo')
                              )::date;
