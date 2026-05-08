-- Salva feedback (thumbs) do recurso "Explain my error" na trilha de exercícios.
-- Não é cache — serve apenas para analytics de qualidade das explicações geradas.

CREATE TABLE charlotte.explain_feedback (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL,
  exercise_type  TEXT        NOT NULL,   -- word_bank | multiple_choice | short_write
  level          TEXT        NOT NULL,   -- Novice | Inter | Advanced
  sentence       TEXT,                  -- enunciado do exercício
  user_answer    TEXT,                  -- o que o aluno respondeu (errado)
  correct_answer TEXT,                  -- resposta correta
  explanation    TEXT,                  -- texto gerado pelo modelo
  rating         SMALLINT    CHECK (rating IN (-1, 1)),  -- -1 down / 1 up (null = sem voto)
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_explain_feedback_user
  ON charlotte.explain_feedback (user_id, created_at DESC);

CREATE INDEX idx_explain_feedback_rating
  ON charlotte.explain_feedback (exercise_type, rating)
  WHERE rating IS NOT NULL;

-- View pública para o REST API
CREATE OR REPLACE VIEW public.explain_feedback AS
  SELECT * FROM charlotte.explain_feedback;

-- RLS: usuário só grava/lê o próprio registro
ALTER TABLE charlotte.explain_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "explain_feedback_insert" ON charlotte.explain_feedback
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "explain_feedback_select" ON charlotte.explain_feedback
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "explain_feedback_update" ON charlotte.explain_feedback
  FOR UPDATE USING (user_id = auth.uid());
