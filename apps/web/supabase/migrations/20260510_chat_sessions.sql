-- Sessões de Free Chat — agrupa mensagens em conversas com começo/fim.
-- Permite drawer de histórico no Practice tab (Free Chat mode).
-- chat_messages ganha session_id pra associação. Mensagens antigas ficam null
-- (compatibilidade — comportamento atual mantido até cleanup trigger expirar).

CREATE TABLE IF NOT EXISTS charlotte_chat_sessions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT        NOT NULL,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  summary       TEXT,
  message_count INTEGER     NOT NULL DEFAULT 0 CHECK (message_count >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_charlotte_chat_sessions_user_started
  ON charlotte_chat_sessions (user_id, started_at DESC);

ALTER TABLE charlotte_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_chat_sessions"
  ON charlotte_chat_sessions FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "users_insert_own_chat_sessions"
  ON charlotte_chat_sessions FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "users_update_own_chat_sessions"
  ON charlotte_chat_sessions FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "users_delete_own_chat_sessions"
  ON charlotte_chat_sessions FOR DELETE
  USING (auth.uid()::text = user_id);

-- Adiciona session_id em charlotte.chat_messages (tabela real)
ALTER TABLE charlotte.chat_messages ADD COLUMN IF NOT EXISTS session_id UUID;

CREATE INDEX IF NOT EXISTS idx_chat_messages_session
  ON charlotte.chat_messages (session_id);

-- Recreate view pública pra incluir nova coluna
DROP VIEW IF EXISTS public.chat_messages;
CREATE VIEW public.chat_messages AS SELECT * FROM charlotte.chat_messages;

-- Update INSTEAD OF trigger pra propagar session_id em INSERT via view
CREATE OR REPLACE FUNCTION compat_chat_messages_ins()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO charlotte.chat_messages (id, user_id, role, content, mode, session_id, created_at)
  VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.user_id,
    NEW.role,
    NEW.content,
    COALESCE(NEW.mode, 'chat'),
    NEW.session_id,
    COALESCE(NEW.created_at, NOW())
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_compat_chat_messages_ins ON public.chat_messages;
CREATE TRIGGER trg_compat_chat_messages_ins
  INSTEAD OF INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION compat_chat_messages_ins();
