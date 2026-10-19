// useGoalsData — dados das metas (XP de hoje, missões do dia, desafio da semana), vindos do servidor
// (GET /api/goals, que também credita o XP do que foi concluído). Fonte única para a prévia na tela
// de Progresso e para a tela completa de Metas. Recarrega toda vez que a tela volta ao foco.

import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Mission, MissionOut, fetchGoals, toMission } from '@/lib/missions';

export interface WeeklyState {
  mission: Mission;
  raw: MissionOut;
  weekStart: string;
}

export interface GoalsData {
  missions: Mission[];
  weekly: WeeklyState | null;
  todayXP: number;
  loading: boolean;
}

export function useGoalsData(userId: string): GoalsData {
  const [data, setData] = useState<GoalsData>({ missions: [], weekly: null, todayXP: 0, loading: true });

  const load = useCallback(async () => {
    if (!userId) return;
    const g = await fetchGoals();
    if (!g) { setData(prev => ({ ...prev, loading: false })); return; }
    setData({
      missions: g.daily.map(m => toMission(m)),
      weekly: { mission: toMission(g.weekly), raw: g.weekly, weekStart: g.weekStart },
      todayXP: g.todayXP,
      loading: false,
    });
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return data;
}

/** Dias que faltam até o fim da semana (domingo incluso). */
export function daysLeftInWeek(): number {
  const day = new Date().getDay(); // 0=dom
  return day === 0 ? 1 : 8 - day;
}
