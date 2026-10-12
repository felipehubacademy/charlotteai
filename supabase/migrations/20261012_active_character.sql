-- Família Queizy: personagem escolhido pelo aluno para conversar (Free Chat do Practice e
-- mensagem da Início). 'charlotte' (padrão) ou 'igorfina'. O resto do app segue com a Charlotte.
alter table charlotte.users add column if not exists active_character text not null default 'charlotte'
  check (active_character in ('charlotte', 'igorfina'));

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
    users.app_language,
    users.searchable,
    users.username,
    users.active_character
   FROM charlotte.users;
