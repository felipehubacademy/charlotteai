CREATE OR REPLACE FUNCTION public.rn_award_achievements(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_user_level      text;
  v_total_xp        int     := 0;
  v_rows            int     := 0;
  v_streak          int     := 0;
  v_total_practices int     := 0;
  v_text_count      int     := 0;
  v_audio_count     int     := 0;
  v_grammar_count   int     := 0;
  v_learn_count     int     := 0;
  v_today_xp        int     := 0;
  v_trail_topics    int     := 0;
  v_trail_v2        int     := 0;
  v_referrals       int     := 0;
  v_rally_wins      int     := 0;
  v_has_photo       boolean := false;
  v_current_hour    int     := EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Sao_Paulo');
  v_awarded         jsonb   := '[]'::jsonb;
  v_qualifies       boolean := false;
  ach               RECORD;
BEGIN
  SELECT COALESCE(charlotte_level, 'Novice') INTO v_user_level
    FROM charlotte.users WHERE id = p_user_id;

  v_user_level := COALESCE(v_user_level, 'Novice');

  SELECT COALESCE(total_xp, 0), COALESCE(streak_days, 0)
    INTO v_total_xp, v_streak
    FROM charlotte.progress WHERE user_id = p_user_id;

  SELECT COUNT(*) INTO v_total_practices
    FROM charlotte.practices
    WHERE user_id = p_user_id
      AND practice_type NOT LIKE 'achievement_reward_%'
      AND practice_type NOT LIKE 'mission_reward_%';

  SELECT COUNT(*) INTO v_text_count
    FROM charlotte.practices WHERE user_id = p_user_id
      AND practice_type = 'text_message';

  SELECT COUNT(*) INTO v_audio_count
    FROM charlotte.practices WHERE user_id = p_user_id
      AND practice_type IN ('audio_message', 'live_voice', 'pronunciation');

  SELECT COUNT(*) INTO v_grammar_count
    FROM charlotte.practices WHERE user_id = p_user_id
      AND practice_type IN ('grammar', 'grammar_message');

  SELECT COUNT(*) INTO v_learn_count
    FROM charlotte.practices WHERE user_id = p_user_id
      AND practice_type = 'learn_exercise';

  SELECT COALESCE(SUM(xp_earned), 0) INTO v_today_xp
    FROM charlotte.practices WHERE user_id = p_user_id
      AND created_at >= current_date
      AND practice_type NOT LIKE 'achievement_reward_%'
      AND practice_type NOT LIKE 'mission_reward_%';

  SELECT COALESCE(jsonb_array_length(completed), 0) INTO v_trail_topics
    FROM charlotte.learn_progress
    WHERE user_id = p_user_id AND level = v_user_level;

  SELECT COUNT(*) INTO v_trail_v2 FROM (
    SELECT module_id, unit_id FROM public.learn_history_v2
    WHERE user_id = p_user_id AND level = v_user_level AND completed = true
    GROUP BY module_id, unit_id
    HAVING COUNT(DISTINCT activity_type) >= 4
  ) u;
  v_trail_topics := GREATEST(v_trail_topics, v_trail_v2);

  SELECT COUNT(*) INTO v_referrals FROM public.referrals WHERE inviter_id = p_user_id;
  SELECT COUNT(*) INTO v_rally_wins FROM public.rallies WHERE winner_id = p_user_id;
  SELECT (avatar_url IS NOT NULL AND avatar_url <> '') INTO v_has_photo FROM charlotte.users WHERE id = p_user_id;
  v_has_photo := COALESCE(v_has_photo, false);

  FOR ach IN
    SELECT a.*
    FROM charlotte.achievements a
    WHERE (a.user_level = v_user_level
           OR a.requirement_type = 'trail_complete_xp')
      AND a.is_active = true
    ORDER BY a.sort_order, a.code
  LOOP
    -- Já tem esta conquista (mesmo id, ou a mesma conquista de outro nível, com o mesmo nome): pula.
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM charlotte.user_achievements
      WHERE user_id = p_user_id::text
        AND (achievement_id = ach.id OR achievement_name = ach.name)
    );

    v_qualifies := CASE ach.requirement_type
      WHEN 'total_practices'   THEN v_total_practices >= ach.requirement_value
      WHEN 'text_messages'     THEN v_text_count       >= ach.requirement_value
      WHEN 'audio_messages'    THEN v_audio_count      >= ach.requirement_value
      WHEN 'grammar_exercises' THEN v_grammar_count    >= ach.requirement_value
      WHEN 'learn_exercises'   THEN v_learn_count      >= ach.requirement_value
      WHEN 'streak_days'       THEN v_streak           >= ach.requirement_value
      WHEN 'today_xp'          THEN v_today_xp         >= ach.requirement_value
      WHEN 'early_bird'        THEN v_current_hour < 8 AND v_today_xp > 0
      WHEN 'night_owl'         THEN v_current_hour >= 22 AND v_today_xp > 0
      WHEN 'trail_topics'      THEN v_trail_topics     >= ach.requirement_value
      WHEN 'referrals'         THEN v_referrals        >= ach.requirement_value
      WHEN 'rally_wins'        THEN v_rally_wins       >= ach.requirement_value
      WHEN 'has_photo'         THEN v_has_photo
      WHEN 'total_xp_earned'   THEN v_total_xp         >= ach.requirement_value
      WHEN 'trail_complete_xp' THEN v_total_xp >= ach.requirement_value AND (
        SELECT COUNT(*) FROM (
          SELECT module_id, unit_id FROM public.learn_history_v2
          WHERE user_id = p_user_id AND level = ach.user_level AND completed = true
          GROUP BY module_id, unit_id
          HAVING COUNT(DISTINCT activity_type) >= 4
        ) u
      ) >= COALESCE((ach.requirements->>'trail_units')::int, 2147483647)
    END;

    IF ach.requirement_type IN ('today_xp', 'early_bird', 'night_owl') THEN
      CONTINUE WHEN EXISTS (
        SELECT 1 FROM charlotte.user_achievements
        WHERE user_id = p_user_id::text
          AND achievement_id = ach.id
          AND earned_at >= current_date
      );
    END IF;

    IF v_qualifies THEN
      INSERT INTO charlotte.user_achievements (
        user_id, achievement_id, achievement_code, achievement_type,
        achievement_name, achievement_description,
        xp_bonus, rarity, badge_icon, badge_color, category
      ) VALUES (
        p_user_id::text, ach.id, ach.code, ach.code,
        ach.name, ach.description,
        ach.xp_reward, ach.rarity, ach.badge_icon, ach.badge_color, ach.category
      ) ON CONFLICT DO NOTHING;

      -- Bônus só quando a conquista foi de fato registrada (antes somava mesmo com o insert ignorado).
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      CONTINUE WHEN v_rows = 0;

      UPDATE charlotte.progress
        SET total_xp = total_xp + ach.xp_reward, updated_at = now()
        WHERE user_id = p_user_id;
      UPDATE charlotte.leaderboard_cache
        SET total_xp = total_xp + ach.xp_reward, updated_at = now()
        WHERE user_id = p_user_id;

      v_awarded := v_awarded || jsonb_build_object(
        'name', ach.name, 'bonus', ach.xp_reward, 'code', ach.code
      );
    END IF;
  END LOOP;

  RETURN v_awarded;
END;
$function$
;
