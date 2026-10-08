-- Conquistas sociais (padrinho e rallies) e trilha nova nas conquistas de tópicos.
-- rn_award_achievements: trail_topics também conta unidades concluídas na trilha nova;
-- novos critérios 'referrals' (amigos trazidos) e 'rally_wins' (rallies vencidos).
CREATE OR REPLACE FUNCTION public.rn_award_achievements(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_user_level      text;
  v_total_xp        int     := 0;
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
  v_current_hour    int     := EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Sao_Paulo');
  v_awarded         jsonb   := '[]'::jsonb;
  v_qualifies       boolean := false;
  ach               RECORD;
BEGIN
  -- User level: charlotte.users is canonical for RN users
  SELECT COALESCE(charlotte_level, 'Novice') INTO v_user_level
    FROM charlotte.users WHERE id = p_user_id;

  v_user_level := COALESCE(v_user_level, 'Novice');

  -- Stats
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

  -- Trilha nova: unidade concluída = as 4 atividades (grammar, speaking, roleplay, chat).
  SELECT COUNT(*) INTO v_trail_v2 FROM (
    SELECT module_id, unit_id FROM public.learn_history_v2
    WHERE user_id = p_user_id AND level = v_user_level AND completed = true
    GROUP BY module_id, unit_id
    HAVING COUNT(DISTINCT activity_type) >= 4
  ) u;
  v_trail_topics := GREATEST(v_trail_topics, v_trail_v2);

  -- Estudar junto: amigos trazidos e rallies vencidos.
  SELECT COUNT(*) INTO v_referrals FROM public.referrals WHERE inviter_id = p_user_id;
  SELECT COUNT(*) INTO v_rally_wins FROM public.rallies WHERE winner_id = p_user_id;

  FOR ach IN
    SELECT a.*
    FROM charlotte.achievements a
    WHERE a.user_level = v_user_level
      AND a.is_active = true
    ORDER BY a.sort_order, a.code
  LOOP
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM charlotte.user_achievements
      WHERE user_id = p_user_id::text
        AND achievement_id = ach.id
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
      WHEN 'total_xp_earned'   THEN v_total_xp         >= ach.requirement_value
      ELSE false
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

insert into charlotte.achievements (code, name, description, xp_reward, requirement_type, requirement_value, user_level, category, badge_color, badge_icon, rarity, is_active, sort_order)
select v.code, case when l.lvl = 'Advanced' then v.name_en else v.name_pt end,
       case when l.lvl = 'Advanced' then v.desc_en else v.desc_pt end,
       v.xp, v.rtype, v.rval, l.lvl, 'social', v.color, v.code, v.rarity, true, v.sort
from (values
  ('sponsor_1',  'Trouxe um Amigo',   'Bring a Friend',   'Um amigo entrou pelo seu convite. Estudar junto é melhor!', 'A friend joined with your invite. Studying together is better!', 30,  'referrals',  1,  '#DCFF4A', 'common',    900),
  ('sponsor_5',  'Turma Formada',     'Study Crew',       'Cinco amigos entraram pelo seu convite.',                  'Five friends joined with your invite.',                         120, 'referrals',  5,  '#FF4F8B', 'epic',      901),
  ('sponsor_20', 'Lenda dos Convites','Invite Legend',    'Vinte amigos entraram pelo seu convite. Que turma!',       'Twenty friends joined with your invite. What a crew!',          400, 'referrals',  20, '#6B4BFF', 'legendary', 902),
  ('rally_win_1','Primeira Vitória',  'First Rally Win',  'Você venceu seu primeiro rally.',                          'You won your first rally.',                                     40,  'rally_wins', 1,  '#2BD97C', 'rare',      910),
  ('rally_win_5','Fera dos Rallies',  'Rally Ace',        'Cinco rallies vencidos. Ninguém te segura!',                'Five rallies won. Nobody can stop you!',                        150, 'rally_wins', 5,  '#F59E0B', 'epic',      911)
) as v(code, name_pt, name_en, desc_pt, desc_en, xp, rtype, rval, color, rarity, sort)
cross join (values ('Novice'), ('Inter'), ('Advanced')) as l(lvl)
where not exists (select 1 from charlotte.achievements a where a.code = v.code and a.user_level = l.lvl);

update charlotte.achievements set category = 'rally' where code like 'rally_win_%';
