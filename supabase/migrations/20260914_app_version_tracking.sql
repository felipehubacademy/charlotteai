-- Rastreamento de versao do app por usuario (Nivel 1: via OTA, sem modulo nativo).
-- Escrito no app open junto do last_seen_at, a partir de expo-constants/expo-updates.
--   app_version     -> Constants.expoConfig?.version (linha do binario, ex. "1.1.0")
--   runtime_version -> Updates.runtimeVersion (ex. "2.0.0"; discrimina binario novo vs antigo)
--   ota_update_id   -> Updates.updateId (qual bundle OTA; null = bundle embarcado da loja)
--   app_platform    -> Platform.OS ('ios' | 'android')
-- Observacao: este codigo so roda em quem ja esta no runtime 2.0.0 (binario novo).
-- Usuarios no binario antigo (1.0.0) nao reportam -> inferir "binario antigo" via
-- last_seen_at recente + campos de versao nulos.

ALTER TABLE charlotte.users
  ADD COLUMN IF NOT EXISTS app_version     text,
  ADD COLUMN IF NOT EXISTS runtime_version text,
  ADD COLUMN IF NOT EXISTS ota_update_id   text,
  ADD COLUMN IF NOT EXISTS app_platform    text;

CREATE INDEX IF NOT EXISTS idx_charlotte_users_runtime_version
  ON charlotte.users (runtime_version);

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
    users.trial_warning_sent_at,
    users.app_version,
    users.runtime_version,
    users.ota_update_id,
    users.app_platform
   FROM charlotte.users;
