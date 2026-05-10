-- Tabela de chamadas Live Voice — 1 row por chamada terminada.
-- summary é gerado por LLM via /api/summarize-call após desconexão.
-- transcript completo guardado pra acesso pedagógico futuro (fase 2 do plano).

CREATE TABLE IF NOT EXISTS charlotte_live_calls (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INTEGER     NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  summary          TEXT,
  transcript       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_charlotte_live_calls_user_started
  ON charlotte_live_calls (user_id, started_at DESC);

ALTER TABLE charlotte_live_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_live_calls"
  ON charlotte_live_calls FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_live_calls"
  ON charlotte_live_calls FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_update_own_live_calls"
  ON charlotte_live_calls FOR UPDATE
  USING (user_id = auth.uid());
