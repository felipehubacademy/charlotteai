// useGoalsData — dados das metas (XP de hoje, missões do dia, desafio da
// semana). Fonte única para a prévia na tela de Progresso e para a tela
// completa de Metas. Recarrega toda vez que a tela volta ao foco.

import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { HomeData, Mission, buildMissions } from '@/lib/missions';
import { getWeeklyChallenge, fetchWeeklyData, WeeklyChallengeState } from '@/lib/weeklyChallenge';
import { UserLevel } from '@/lib/levelConfig';
import { localMidnightUTC } from '@/lib/dateUtils';

export interface GoalsData {
  missions: Mission[];
  weekly: WeeklyChallengeState | null;
  todayXP: number;
  loading: boolean;
}

export function useGoalsData(userId: string, level: UserLevel): GoalsData {
  const [data, setData] = useState<GoalsData>({ missions: [], weekly: null, todayXP: 0, loading: true });

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const todayISO = localMidnightUTC().toISOString();
      const [prog, prac, weeklyRaw] = await Promise.all([
        supabase.from('charlotte_progress').select('streak_days,total_xp').eq('user_id', userId).maybeSingle(),
        supabase.from('charlotte_practices').select('practice_type,xp_earned').eq('user_id', userId).gte('created_at', todayISO),
        fetchWeeklyData(userId),
      ]);

      const practices = prac.data ?? [];
      const todayXP = practices.reduce((s, p) => s + (p.xp_earned ?? 0), 0);
      const homeData: HomeData = {
        streakDays:    prog.data?.streak_days ?? 0,
        totalXP:       prog.data?.total_xp   ?? 0,
        todayXP,
        rank:          null,
        todayMessages: practices.filter(p => ['text_message', 'audio_message'].includes(p.practice_type)).length,
        todayAudios:   practices.filter(p => p.practice_type === 'audio_message').length,
      };

      setData({
        missions: buildMissions(homeData, level),
        weekly: getWeeklyChallenge(
          weeklyRaw.weeklyMessages,
          weeklyRaw.weeklyXP,
          homeData.streakDays,
          weeklyRaw.weeklyLessons,
          weeklyRaw.weeklyAudios,
          weeklyRaw.weeklyGrammarMessages,
          level,
          weeklyRaw.weeklyActiveDays,
        ),
        todayXP,
        loading: false,
      });
    } catch (e) {
      console.warn('[useGoalsData] fetch error:', e);
      setData(prev => ({ ...prev, loading: false }));
    }
  }, [userId, level]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return data;
}

/** Dias que faltam até o fim da semana (domingo incluso). */
export function daysLeftInWeek(): number {
  const day = new Date().getDay(); // 0=dom
  return day === 0 ? 1 : 8 - day;
}
