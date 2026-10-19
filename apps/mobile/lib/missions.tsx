// lib/missions.tsx
// Missões do dia e desafio da semana. Quem decide as missões, mede o progresso e credita o XP é o
// servidor (apps/web/lib/missions.ts, GET /api/goals); aqui só buscamos e damos a cara (ícone/cor).
// Cada chamada credita o que foi concluído; o que entrou agora vai para a comemoração (goalsEvents).

import React from 'react';
import Constants from 'expo-constants';
import {
  BookOpen, ChatTeardropText, Lightning, Fire, Microphone, Cards, CheckCircle,
} from 'phosphor-react-native';
import { supabase } from './supabase';
import { systemIsPt } from './systemLang';
import { emitGoalsGranted } from './goalsEvents';

const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

// Cores das famílias de missão — paleta Queizy.
const FAMILY_STYLE: Record<string, { color: string; bg: string; Icon: typeof Fire }> = {
  trail:    { color: '#6B4BFF', bg: '#EFECFF', Icon: BookOpen },
  practice: { color: '#08804A', bg: '#E3F6EC', Icon: ChatTeardropText },
  audio:    { color: '#08804A', bg: '#E3F6EC', Icon: Microphone },
  vocab:    { color: '#16131F', bg: '#F1FFB8', Icon: Cards },
  xp:       { color: '#16131F', bg: '#F1FFB8', Icon: Lightning },
  streak:   { color: '#FF4F8B', bg: '#FFEEF4', Icon: Fire },
};

type Bi = { pt: string; en: string };

/** Como o servidor devolve cada missão. */
export interface MissionOut {
  id: string; kind: 'mission' | 'weekly'; family: string;
  title: Bi; where: Bi; unit: Bi;
  target: number; current: number; completed: boolean; xp: number; dest: string;
}
export interface GoalsResponse {
  today: string; weekStart: string;
  daily: MissionOut[]; weekly: MissionOut;
  todayXP: number;
  granted: { kind: 'mission' | 'weekly'; id: string; xp: number; title: Bi }[];
  dailyAllDoneNow: boolean;
}

/** Missão pronta para a tela. */
export interface Mission {
  id: string;
  label: string;
  /** Onde fazer, com os nomes do app. */
  sub: string;
  xpReward: number;
  completed: boolean;
  progress: number;
  progressLabel: string;
  current: number;
  target: number;
  accentColor: string;
  accentBg: string;
  icon: React.ReactNode;
  doneIcon: React.ReactNode;
  destination: string;
}

export function toMission(m: MissionOut, isPt = systemIsPt): Mission {
  const st = FAMILY_STYLE[m.family] ?? FAMILY_STYLE.xp;
  const unit = isPt ? m.unit.pt : m.unit.en;
  return {
    id: m.id,
    label: isPt ? m.title.pt : m.title.en,
    sub: isPt ? m.where.pt : m.where.en,
    xpReward: m.xp,
    completed: m.completed,
    progress: m.target ? Math.min(m.current / m.target, 1) : 0,
    progressLabel: `${m.current} / ${m.target} ${unit}`,
    current: m.current,
    target: m.target,
    accentColor: st.color,
    accentBg: st.bg,
    icon: <st.Icon size={22} color={st.color} weight="fill" />,
    doneIcon: <CheckCircle size={26} color={st.color} weight="fill" />,
    destination: m.dest,
  };
}

/** Busca as metas (e credita o que foi concluído). Avisa a comemoração do que entrou agora. */
export async function fetchGoals(): Promise<GoalsResponse | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;
    const r = await fetch(`${API_BASE_URL}/api/goals`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    const g = (await r.json()) as GoalsResponse;
    if (g.granted?.length) emitGoalsGranted(g);
    return g;
  } catch { return null; }
}
