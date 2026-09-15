-- Opt-out de emails de marketing (descadastrar) — conformidade LGPD.
-- Emails transacionais (reset de senha, welcome) NÃO respeitam este flag;
-- apenas comunicações de marketing/anúncio (ex.: "nova versão disponível").

ALTER TABLE charlotte.users
  ADD COLUMN IF NOT EXISTS marketing_opt_out boolean NOT NULL DEFAULT false;

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
    users.app_platform,
    users.marketing_opt_out
   FROM charlotte.users;
