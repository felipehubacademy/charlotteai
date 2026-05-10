-- Adiciona policy de DELETE em charlotte_live_calls.
-- Esquecida na migration original — sem ela, RLS nega delete silencioso.

CREATE POLICY "users_delete_own_live_calls"
  ON charlotte_live_calls FOR DELETE
  USING (user_id = auth.uid());
