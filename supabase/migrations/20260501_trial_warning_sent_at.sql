-- Adiciona trial_warning_sent_at em charlotte.users para deduplicar
-- o email de aviso de trial expirando. O cron verifica IS NULL antes
-- de enviar e grava o timestamp apos envio bem-sucedido, permitindo
-- execucoes frequentes (ex: a cada hora) sem reenvios.
-- A view charlotte_users e recriada para expor o novo campo.

ALTER TABLE charlotte.users
  ADD COLUMN IF NOT EXISTS trial_warning_sent_at timestamptz;

CREATE OR REPLACE VIEW charlotte_users AS
 SELECT users.id,
    users.email,
    users.name,
    users.charlotte_level,
    users.placement_test_done,
    users.first_welcome_done,
    users.is_institutional,
    users.is_active,
    users.subscription_status,
    users.trial_ends_at,
    users.must_change_password,
    users.expo_push_token,
    users.created_at,
    users.updated_at,
    users.live_voice_seconds_used,
    users.live_voice_reset_date,
    users.avatar_url,
    users.timezone,
    users.subscription_product,
    users.subscription_expires_at,
    users.last_practice_at,
    users.beta_features,
    users.is_admin,
    users.last_seen_at,
    users.trial_warning_sent_at
   FROM charlotte.users;
