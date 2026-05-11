-- Fix: leaderboard_cache estava desincronizado de charlotte.progress.
--
-- Bug: update_user_progress_on_learn (trigger de mini-aula/Learning Trail)
-- atualizava charlotte.progress mas NUNCA tocava em charlotte.leaderboard_cache.
-- Resultado: usuarios que fazem Learning Trail acumulam XP em progress
-- mas o cache fica pra tras, e o rank no HeaderPills (que conta cache)
-- diverge do rank em stats (que conta progress).
--
-- Auditoria: 26 usuarios divergentes, 12540 XP faltando no cache total.

-- ── 1. Patch update_user_progress_on_learn pra sincronizar cache ───────────
CREATE OR REPLACE FUNCTION public.update_user_progress_on_learn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_tz      text;
  v_today        date;
  v_user_level   text;
  v_display_name text;
BEGIN
  SELECT COALESCE(NULLIF(timezone, ''), 'America/Sao_Paulo')
    INTO v_user_tz
    FROM charlotte.users WHERE id = NEW.user_id;

  v_today := (current_timestamp AT TIME ZONE v_user_tz)::date;

  -- Get user level + display name pra manter cache consistente
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

  -- Sincroniza leaderboard_cache (mesmo padrao do rn_on_practice_insert)
  INSERT INTO charlotte.leaderboard_cache (user_id, user_level, display_name, total_xp, updated_at)
    VALUES (NEW.user_id, v_user_level, v_display_name, COALESCE(NEW.xp_earned, 0), now())
  ON CONFLICT (user_id) DO UPDATE
    SET total_xp     = leaderboard_cache.total_xp + EXCLUDED.total_xp,
        user_level   = COALESCE(v_user_level, leaderboard_cache.user_level),
        display_name = COALESCE(v_display_name, leaderboard_cache.display_name),
        updated_at   = now();

  RETURN NEW;
END;
$function$;


-- ── 2. Backfill: sincroniza cache com progress + users (canonical) ─────────
UPDATE charlotte.leaderboard_cache lc
SET total_xp     = p.total_xp,
    user_level   = COALESCE(u.charlotte_level, lc.user_level, 'Novice'),
    display_name = COALESCE(
      CASE
        WHEN u.name IS NOT NULL AND u.name <> '' THEN
          CASE
            WHEN position(' ' IN trim(u.name)) > 0 THEN
              split_part(trim(u.name), ' ', 1) || ' ' ||
              upper(left(trim(split_part(trim(u.name), ' ', 2)), 1)) || '.'
            ELSE trim(u.name)
          END
        ELSE split_part(u.email, '@', 1)
      END, lc.display_name),
    updated_at   = now()
FROM charlotte.progress p
JOIN charlotte.users u ON u.id = p.user_id
WHERE lc.user_id = p.user_id
  AND (
    lc.total_xp     IS DISTINCT FROM p.total_xp OR
    lc.user_level   IS DISTINCT FROM u.charlotte_level
  );

-- ── 3. Insert missing cache entries (apenas para usuarios ja classificados)
INSERT INTO charlotte.leaderboard_cache (user_id, user_level, display_name, total_xp, updated_at)
SELECT
  p.user_id,
  u.charlotte_level,
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
    END, 'Anonymous'),
  p.total_xp,
  now()
FROM charlotte.progress p
JOIN charlotte.users u ON u.id = p.user_id
LEFT JOIN charlotte.leaderboard_cache lc ON lc.user_id = p.user_id
WHERE lc.user_id IS NULL
  AND u.charlotte_level IS NOT NULL;

-- ── 4. Remove cache entries de usuarios sem nivel classificado (fantasmas)
-- Esses usuarios nao deveriam aparecer em nenhum ranking ate completarem o
-- teste/onboarding. Se forem classificados depois, proxima pratica recria
-- o entry via trigger.
DELETE FROM charlotte.leaderboard_cache lc
USING charlotte.users u
WHERE u.id = lc.user_id AND u.charlotte_level IS NULL;
