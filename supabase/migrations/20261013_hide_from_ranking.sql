-- Contas que não aparecem no ranking (contas de revisão da Apple e do Google).
-- O ranking do cabeçalho (#N) e o /api/social leem charlotte_leaderboard_cache, que passa a filtrar aqui;
-- a tela de Ranking e "Seu progresso" filtram pelo campo em charlotte_users (app).
alter table charlotte.users add column if not exists hide_from_ranking boolean not null default false;

update charlotte.users set hide_from_ranking = true
where email in ('reviewer@hubacademybr.com', 'reviewergoogle@hubacademybr.com');

create or replace view public.charlotte_users as
 SELECT users.id, users.email, users.name, users.charlotte_level, users.placement_test_done, users.first_welcome_done,
    users.is_institutional, users.is_active, users.subscription_status, users.trial_ends_at, users.must_change_password,
    users.expo_push_token, users.created_at, users.updated_at, users.live_voice_seconds_used, users.live_voice_reset_date,
    users.avatar_url, users.timezone, users.subscription_product, users.subscription_expires_at, users.last_practice_at,
    users.beta_features, users.is_admin, users.last_seen_at, users.trial_warning_sent_at, users.app_version,
    users.runtime_version, users.ota_update_id, users.app_platform, users.marketing_opt_out, users.email_bounced,
    users.live_voice_bonus_seconds, users.app_language, users.searchable, users.username, users.active_character,
    users.hide_from_ranking
   FROM charlotte.users;

create or replace view public.charlotte_leaderboard_cache as
 SELECT leaderboard_cache.user_id, leaderboard_cache.user_level, leaderboard_cache.display_name,
    leaderboard_cache.total_xp, leaderboard_cache.updated_at
   FROM charlotte.leaderboard_cache
  WHERE NOT EXISTS (SELECT 1 FROM charlotte.users u WHERE u.id::text = leaderboard_cache.user_id::text AND u.hide_from_ranking);
