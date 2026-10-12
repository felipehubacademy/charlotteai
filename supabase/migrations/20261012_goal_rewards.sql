-- Prêmio das metas (diárias e semanais): no máximo 1 crédito por meta e período.
-- practice_type = mission_reward_<id>_<AAAA-MM-DD> | weekly_reward_<id>_<AAAA-MM-DD da segunda>.
-- Só vale a partir de hoje: o app antigo deixou créditos duplicados no histórico.
create unique index if not exists practices_goal_reward_once
  on charlotte.practices (user_id, practice_type)
  where created_at >= '2026-10-12 00:00:00+00'
    and practice_type ~ '^(mission|weekly)_reward_.*_[0-9]{4}-[0-9]{2}-[0-9]{2}$';
