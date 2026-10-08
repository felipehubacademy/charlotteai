-- Idioma do aparelho do aluno ('pt' ou 'en'), gravado pelo app junto com o
-- token de push. Os pushes usam este idioma; sem ele, caem na regra antiga
-- (Novice em português).
alter table charlotte.users add column if not exists app_language text check (app_language in ('pt','en'));

create or replace view public.charlotte_users as
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
    users.marketing_opt_out,
    users.email_bounced,
    users.live_voice_bonus_seconds,
    users.app_language
   FROM charlotte.users;
