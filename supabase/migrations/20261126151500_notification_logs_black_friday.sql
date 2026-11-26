-- Black Friday 2026 (/api/admin/release-broadcast): bf_teaser, bf_offer, bf_sat, bf_last e bf_hours,
-- com o registro de cada e-mail (<tipo>_email). Sem isto o registro falha e o envio de e-mail para no primeiro.
alter table notifications.notification_logs drop constraint if exists notification_logs_notification_type_check;
alter table notifications.notification_logs add constraint notification_logs_notification_type_check check (notification_type = any (array[
  'streak_reminder','daily_reminder','charlotte_message','xp_milestone','goal_reminder','weekly_challenge','streak_saver',
  'streak_milestone_ahead','level_imminent','micro_checkin','cadence_drop','weekly_recap','charlotte_checkin',
  'trial_ending_72h','trial_ending_24h','sub_expired_1d','streak_broken','reengagement_3d','reengagement_7d',
  'reengagement_14d','reengagement_30d','practice_reminder','achievement','marketing','scheduler_lock',
  'buddy_rivalry','rally_update','rally_reminder','rally_result','web_sub_notice','taste_daily','taste_nudge',
  'taste_ended','taste_offer','rank_up','rank_lost','rank_threat','rank_week_won','legacy_trial_ended',
  'release_update','family_grows','app_update','app_update_ios','app_update_android','winback',
  'release_update_email','family_grows_email','app_update_email','app_update_ios_email','app_update_android_email','winback_email',
  'bf_teaser','bf_offer','bf_sat','bf_last','bf_hours',
  'bf_teaser_email','bf_offer_email','bf_sat_email','bf_last_email','bf_hours_email'
]::text[]));
