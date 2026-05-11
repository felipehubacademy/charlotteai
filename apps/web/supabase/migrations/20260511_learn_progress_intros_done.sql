-- ─────────────────────────────────────────────────────────────────────────────
-- 20260511_learn_progress_intros_done.sql
-- Adiciona coluna intros_done para persistir mini-aulas completadas no banco.
-- Substitui o storage local (SecureStore) — sobrevive a reinstall e sincroniza
-- entre devices.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1) Adiciona coluna na tabela base
ALTER TABLE charlotte.learn_progress
  ADD COLUMN IF NOT EXISTS intros_done JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2) Recria view pública (SELECT * é expandido na criação — precisa drop+create
--    para incluir a nova coluna). CASCADE descarta os triggers INSTEAD OF.
DROP VIEW IF EXISTS public.learn_progress CASCADE;
CREATE VIEW public.learn_progress AS SELECT * FROM charlotte.learn_progress;

GRANT SELECT, INSERT, UPDATE ON public.learn_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.learn_progress TO service_role;

-- 3) Recria funções de compatibilidade incluindo intros_done
CREATE OR REPLACE FUNCTION public.compat_learn_progress_ins()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO charlotte.learn_progress
    (id, user_id, level, module_index, topic_index, completed, intros_done, updated_at)
  VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.user_id,
    NEW.level,
    COALESCE(NEW.module_index, 0),
    COALESCE(NEW.topic_index, 0),
    COALESCE(NEW.completed,   '[]'::jsonb),
    COALESCE(NEW.intros_done, '[]'::jsonb),
    COALESCE(NEW.updated_at,  NOW())
  );
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.compat_learn_progress_upd()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE charlotte.learn_progress
  SET module_index = NEW.module_index,
      topic_index  = NEW.topic_index,
      completed    = NEW.completed,
      intros_done  = COALESCE(NEW.intros_done, intros_done),
      updated_at   = NEW.updated_at
  WHERE id = OLD.id;
  RETURN NEW;
END; $$;

-- 4) Recria triggers INSTEAD OF (foram dropados pelo CASCADE)
CREATE TRIGGER compat_ins
  INSTEAD OF INSERT ON public.learn_progress
  FOR EACH ROW EXECUTE FUNCTION public.compat_learn_progress_ins();

CREATE TRIGGER compat_upd
  INSTEAD OF UPDATE ON public.learn_progress
  FOR EACH ROW EXECUTE FUNCTION public.compat_learn_progress_upd();

COMMIT;

DO $$ BEGIN RAISE NOTICE 'OK 20260511: learn_progress.intros_done added'; END $$;
