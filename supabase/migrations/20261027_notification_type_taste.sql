-- Fluxo de push da degustação (lib/taste-push.ts) e o aviso do site (web_sub_notice), que faltava na lista.
alter table notifications.notification_logs drop constraint notification_logs_notification_type_check;
alter table notifications.notification_logs add constraint notification_logs_notification_type_check
  check (notification_type = any (array[
    'streak_reminder','daily_reminder','charlotte_message','xp_milestone','goal_reminder','weekly_challenge',
    'streak_saver','streak_milestone_ahead','level_imminent','micro_checkin','cadence_drop','weekly_recap','charlotte_checkin',
    'trial_ending_72h','trial_ending_24h','sub_expired_1d','streak_broken',
    'reengagement_3d','reengagement_7d','reengagement_14d','reengagement_30d',
    'practice_reminder','achievement','marketing','scheduler_lock','buddy_rivalry',
    'rally_update','rally_reminder','rally_result',
    'web_sub_notice','taste_daily','taste_nudge','taste_ended','taste_offer'
  ]));
