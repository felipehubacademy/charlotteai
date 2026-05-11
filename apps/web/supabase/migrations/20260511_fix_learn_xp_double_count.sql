-- ─────────────────────────────────────────────────────────────────────────────
-- 20260511_fix_learn_xp_double_count.sql
--
-- Bug: cada exercício da trilha estava somando XP duas vezes em
-- charlotte.progress.total_xp e charlotte.leaderboard_cache.total_xp.
--
-- Origem:
--   useLearnProgress.saveExercise() faz dois INSERTs por exercício:
--     1. INSERT INTO learn_history          → dispara trigger_update_user_progress_on_learn
--     2. INSERT INTO charlotte_practices    → dispara trg_rn_practice_insert (rn_on_practice_insert)
--
--   Antes da migração 20260510_leaderboard_cache_sync, update_user_progress_on_learn
--   atualizava apenas charlotte.user_progress (legacy). Aquela migração reescreveu
--   a função pra atualizar charlotte.progress + charlotte.leaderboard_cache —
--   exatamente o que rn_on_practice_insert já faz pelo segundo INSERT. Resultado:
--   xp_earned somado 2× em ambas as tabelas.
--
-- Fix:
--   1. Dropa o trigger em charlotte.learn_history. O caminho canônico continua
--      sendo charlotte_practices, que aciona milestones, achievements, leaderboard
--      e streak via rn_on_practice_insert.
--   2. Recomputa charlotte.progress.total_xp e charlotte.leaderboard_cache.total_xp
--      a partir das fontes da verdade (charlotte.practices + charlotte.user_achievements)
--      pra corrigir o XP acumulado de usuários afetados.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1) Drop trigger redundante
DROP TRIGGER IF EXISTS trigger_update_user_progress_on_learn ON charlotte.learn_history;

-- 2) Recompute total_xp pra todos os usuários
WITH practices_xp AS (
  SELECT user_id, COALESCE(SUM(xp_earned), 0)::int AS xp
  FROM charlotte.practices
  GROUP BY user_id
),
achievements_xp AS (
  SELECT user_id::uuid AS user_id, COALESCE(SUM(xp_bonus), 0)::int AS xp
  FROM charlotte.user_achievements
  GROUP BY user_id
),
real_xp AS (
  SELECT
    p.user_id,
    COALESCE(px.xp, 0) + COALESCE(ax.xp, 0) AS total_xp
  FROM charlotte.progress p
  LEFT JOIN practices_xp     px ON px.user_id = p.user_id
  LEFT JOIN achievements_xp  ax ON ax.user_id = p.user_id
)
UPDATE charlotte.progress p
SET total_xp   = r.total_xp,
    updated_at = NOW()
FROM real_xp r
WHERE p.user_id = r.user_id
  AND p.total_xp <> r.total_xp;

-- 3) Recompute leaderboard_cache pra refletir os totais corrigidos
UPDATE charlotte.leaderboard_cache lc
SET total_xp   = p.total_xp,
    updated_at = NOW()
FROM charlotte.progress p
WHERE lc.user_id = p.user_id
  AND lc.total_xp <> p.total_xp;

COMMIT;

DO $$ BEGIN RAISE NOTICE 'OK 20260511: learn XP double-count fixed and totals recomputed'; END $$;
