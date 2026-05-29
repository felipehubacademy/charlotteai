// lib/missions.tsx
// Mission pool, types, and buildMissions — shared between HomeScreen (banner)
// and GoalsScreen (full render). No reward logic here — rewards live in HomeScreen.

import React from 'react';
import {
  ChatTeardropText, Lightning, Fire, Microphone, TextT, CheckCircle,
} from 'phosphor-react-native';
import { LEVEL_CONFIG, UserLevel, ChatMode } from '@/lib/levelConfig';
import { localTodayStr } from '@/lib/dateUtils';

// Static color tokens — matches module-level C in index.tsx (not theme-aware by design)
const greenDark = '#3D8800';
const greenBg   = '#F0FFD9';
const gold      = '#F59E0B';
const orange    = '#FF6B35';
const blue      = '#60A5FA';
const blueBg    = '#EFF6FF';
const pink      = '#F472B6';
const pinkBg    = '#FDF2F8';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HomeData {
  streakDays: number;
  totalXP: number;
  todayXP: number;
  rank: number | null;
  todayMessages: number;
  todayAudios: number;
}

export interface Mission {
  id: string;
  label: string;
  sub: string;
  xpReward: number;
  completed: boolean;
  progress: number;
  progressLabel: string;
  accentColor: string;
  accentBg: string;
  icon: React.ReactNode;
  doneIcon: React.ReactNode;
  destination: string;
}

interface MissionTemplate {
  id: string;
  label:  (isPt: boolean) => string;
  sub:    (isPt: boolean) => string;
  xpReward: number;
  accentColor: string;
  accentBg:   string;
  icon:    React.ReactElement;
  levels: 'all' | 'pronunciation';
  getDestination: (tabs: ChatMode[]) => string;
  eligible?:        (d: HomeData) => boolean;
  getCompleted:     (d: HomeData) => boolean;
  getProgress:      (d: HomeData) => number;
  getProgressLabel: (d: HomeData, isPt: boolean) => string;
}

// ── Mission pool ───────────────────────────────────────────────────────────────

const MISSION_POOL: MissionTemplate[] = [

  // ── Família: Mensagens ──────────────────────────────────────────────────────
  {
    id: 'messages_3',
    label: isPt => isPt ? 'Envie 3 mensagens' : 'Send 3 messages',
    sub:   isPt => isPt ? 'Qualquer modo de prática vale' : 'Any practice mode counts',
    xpReward: 12, accentColor: greenDark, accentBg: greenBg, levels: 'all',
    icon: <ChatTeardropText size={22} color={greenDark} weight="fill" />,
    getDestination: () => '/(app)/(tabs)/practice',
    getCompleted:     d => d.todayMessages >= 3,
    getProgress:      d => Math.min(d.todayMessages / 3, 1),
    getProgressLabel: d => `${Math.min(d.todayMessages, 3)} / 3`,
  },
  {
    id: 'messages_5',
    label: isPt => isPt ? 'Envie 5 mensagens' : 'Send 5 messages',
    sub:   isPt => isPt ? 'Mantenha o ritmo hoje' : 'Keep the rhythm going today',
    xpReward: 20, accentColor: greenDark, accentBg: greenBg, levels: 'all',
    icon: <ChatTeardropText size={22} color={greenDark} weight="fill" />,
    getDestination: () => '/(app)/(tabs)/practice',
    getCompleted:     d => d.todayMessages >= 5,
    getProgress:      d => Math.min(d.todayMessages / 5, 1),
    getProgressLabel: d => `${Math.min(d.todayMessages, 5)} / 5`,
  },
  {
    id: 'messages_10',
    label: isPt => isPt ? 'Envie 10 mensagens' : 'Send 10 messages',
    sub:   isPt => isPt ? 'Uma sessão completa de prática' : 'A full practice session',
    xpReward: 35, accentColor: greenDark, accentBg: greenBg, levels: 'all',
    icon: <ChatTeardropText size={22} color={greenDark} weight="fill" />,
    getDestination: () => '/(app)/(tabs)/practice',
    getCompleted:     d => d.todayMessages >= 10,
    getProgress:      d => Math.min(d.todayMessages / 10, 1),
    getProgressLabel: d => `${Math.min(d.todayMessages, 10)} / 10`,
  },
  {
    id: 'messages_20',
    label: isPt => isPt ? 'Envie 20 mensagens' : 'Send 20 messages',
    sub:   isPt => isPt ? 'Dia de praticar muito!' : 'Make today count!',
    xpReward: 60, accentColor: greenDark, accentBg: greenBg, levels: 'all',
    icon: <ChatTeardropText size={22} color={greenDark} weight="fill" />,
    getDestination: () => '/(app)/(tabs)/practice',
    getCompleted:     d => d.todayMessages >= 20,
    getProgress:      d => Math.min(d.todayMessages / 20, 1),
    getProgressLabel: d => `${Math.min(d.todayMessages, 20)} / 20`,
  },

  // ── Família: XP ─────────────────────────────────────────────────────────────
  {
    id: 'xp_20',
    label: isPt => isPt ? 'Ganhe 20 XP' : 'Earn 20 XP',
    sub:   isPt => isPt ? 'Um começo rápido!' : 'A quick start!',
    xpReward: 8, accentColor: gold, accentBg: '#FFFBEB', levels: 'all',
    icon: <Lightning size={22} color={gold} weight="fill" />,
    getDestination: () => '/(app)/(tabs)/practice',
    getCompleted:     d => d.todayXP >= 20,
    getProgress:      d => Math.min(d.todayXP / 20, 1),
    getProgressLabel: d => `${Math.min(d.todayXP, 20)} / 20 XP`,
  },
  {
    id: 'xp_50',
    label: isPt => isPt ? 'Ganhe 50 XP hoje' : 'Earn 50 XP today',
    sub:   isPt => isPt ? 'Mantenha a conversa fluindo' : 'Keep the conversation going',
    xpReward: 15, accentColor: gold, accentBg: '#FFFBEB', levels: 'all',
    icon: <Lightning size={22} color={gold} weight="fill" />,
    getDestination: () => '/(app)/(tabs)/practice',
    getCompleted:     d => d.todayXP >= 50,
    getProgress:      d => Math.min(d.todayXP / 50, 1),
    getProgressLabel: d => `${Math.min(d.todayXP, 50)} / 50 XP`,
  },
  {
    id: 'xp_100',
    label: isPt => isPt ? 'Ganhe 100 XP hoje' : 'Earn 100 XP today',
    sub:   isPt => isPt ? 'Vá além do básico hoje!' : 'Push beyond the basics!',
    xpReward: 25, accentColor: gold, accentBg: '#FFFBEB', levels: 'all',
    icon: <Lightning size={22} color={gold} weight="fill" />,
    getDestination: () => '/(app)/(tabs)/practice',
    getCompleted:     d => d.todayXP >= 100,
    getProgress:      d => Math.min(d.todayXP / 100, 1),
    getProgressLabel: d => `${Math.min(d.todayXP, 100)} / 100 XP`,
  },

  // ── Família: Streak ─────────────────────────────────────────────────────────
  {
    id: 'streak_2',
    label: isPt => isPt ? 'Sequência de 2 dias' : '2-day streak',
    sub:   isPt => isPt ? 'Pratique hoje e mantenha a sequência!' : 'Practice today and keep it going!',
    xpReward: 20, accentColor: orange, accentBg: '#FFF3ED', levels: 'all',
    icon: <Fire size={22} color={orange} weight="fill" />,
    getDestination: () => '/(app)/(tabs)/practice',
    eligible:         d => d.streakDays >= 1,
    getCompleted:     d => d.streakDays >= 2 && d.todayXP > 0,
    getProgress:      d => d.todayXP > 0 ? Math.min(d.streakDays / 2, 1) : Math.min(d.streakDays / 2, 0.9),
    getProgressLabel: (d, isPt) => `${Math.min(d.streakDays, 2)} / 2 ${isPt ? 'dias' : 'days'}`,
  },
  {
    id: 'streak_10',
    label: isPt => isPt ? 'Sequência de 10 dias' : '10-day streak',
    sub:   isPt => isPt ? 'Você está no caminho certo!' : 'You\'re on a roll!',
    xpReward: 80, accentColor: orange, accentBg: '#FFF3ED', levels: 'all',
    icon: <Fire size={22} color={orange} weight="fill" />,
    getDestination: () => '/(app)/(tabs)/practice',
    eligible:         d => d.streakDays >= 9,
    getCompleted:     d => d.streakDays >= 10 && d.todayXP > 0,
    getProgress:      d => d.todayXP > 0 ? Math.min(d.streakDays / 10, 1) : Math.min(d.streakDays / 10, 0.9),
    getProgressLabel: (d, isPt) => `${Math.min(d.streakDays, 10)} / 10 ${isPt ? 'dias' : 'days'}`,
  },

  // ── Família: Texto ──────────────────────────────────────────────────────────
  {
    id: 'text_3',
    label: isPt => isPt ? 'Escreva 3 mensagens' : 'Write 3 text messages',
    sub:   isPt => isPt ? 'Pratique no Grammar ou Chat' : 'Practice in Grammar or Chat mode',
    xpReward: 15, accentColor: pink, accentBg: pinkBg, levels: 'all',
    icon: <TextT size={22} color={pink} weight="fill" />,
    getDestination: () => '/(app)/(tabs)/practice',
    getCompleted:     d => (d.todayMessages - d.todayAudios) >= 3,
    getProgress:      d => Math.min((d.todayMessages - d.todayAudios) / 3, 1),
    getProgressLabel: d => `${Math.min(d.todayMessages - d.todayAudios, 3)} / 3`,
  },
  {
    id: 'text_7',
    label: isPt => isPt ? 'Escreva 7 mensagens' : 'Write 7 text messages',
    sub:   isPt => isPt ? 'Treine sua escrita em inglês' : 'Train your written English',
    xpReward: 28, accentColor: pink, accentBg: pinkBg, levels: 'all',
    icon: <TextT size={22} color={pink} weight="fill" />,
    getDestination: () => '/(app)/(tabs)/practice',
    getCompleted:     d => (d.todayMessages - d.todayAudios) >= 7,
    getProgress:      d => Math.min((d.todayMessages - d.todayAudios) / 7, 1),
    getProgressLabel: d => `${Math.min(d.todayMessages - d.todayAudios, 7)} / 7`,
  },

  // ── Família: Áudio (Inter/Advanced) ────────────────────────────────────────
  {
    id: 'audio_1',
    label: isPt => isPt ? 'Grave sua voz' : 'Record your voice',
    sub:   isPt => isPt ? 'Segure o microfone e fale algo' : 'Hold the mic and say something',
    xpReward: 15, accentColor: blue, accentBg: blueBg, levels: 'pronunciation',
    icon: <Microphone size={22} color={blue} weight="fill" />,
    getDestination: () => '/(app)/(tabs)/practice',
    getCompleted:     d => d.todayAudios >= 1,
    getProgress:      d => d.todayAudios >= 1 ? 1 : 0,
    getProgressLabel: (d, isPt) => d.todayAudios >= 1 ? (isPt ? 'Feito' : 'Done') : '0 / 1',
  },
  {
    id: 'audio_3',
    label: isPt => isPt ? 'Grave 3 áudios' : 'Record 3 voice messages',
    sub:   isPt => isPt ? 'Pratique a pronúncia com áudios' : 'Work on your pronunciation',
    xpReward: 30, accentColor: blue, accentBg: blueBg, levels: 'pronunciation',
    icon: <Microphone size={22} color={blue} weight="fill" />,
    getDestination: () => '/(app)/(tabs)/practice',
    getCompleted:     d => d.todayAudios >= 3,
    getProgress:      d => Math.min(d.todayAudios / 3, 1),
    getProgressLabel: d => `${Math.min(d.todayAudios, 3)} / 3`,
  },
  {
    id: 'audio_5',
    label: isPt => isPt ? 'Grave 5 áudios' : 'Record 5 voice messages',
    sub:   isPt => isPt ? 'Foco total na pronúncia hoje' : 'Full pronunciation focus today',
    xpReward: 45, accentColor: blue, accentBg: blueBg, levels: 'pronunciation',
    icon: <Microphone size={22} color={blue} weight="fill" />,
    getDestination: () => '/(app)/(tabs)/practice',
    getCompleted:     d => d.todayAudios >= 5,
    getProgress:      d => Math.min(d.todayAudios / 5, 1),
    getProgressLabel: d => `${Math.min(d.todayAudios, 5)} / 5`,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed | 1;
  const rand = () => {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 0x100000000;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const MISSION_FAMILIES: Record<string, string[]> = {
  messages: ['messages_3', 'messages_5', 'messages_10', 'messages_20'],
  xp:       ['xp_20', 'xp_50', 'xp_100'],
  streak:   ['streak_2', 'streak_10'],
  text:     ['text_3', 'text_7'],
  audio:    ['audio_1', 'audio_3', 'audio_5'],
};

// ── Public API ────────────────────────────────────────────────────────────────

export function buildMissions(data: HomeData, level: UserLevel): Mission[] {
  const tabs = LEVEL_CONFIG[level].tabs;
  const hasPronunciation = tabs.includes('pronunciation');
  const isPt = level === 'Novice';

  const todayStr = localTodayStr(); // YYYY-MM-DD no fuso local do device
  const dayNum = todayStr.split('-').reduce((acc, part) => acc * 100 + parseInt(part, 10), 0);
  const lvlOff = level === 'Novice' ? 0 : level === 'Inter' ? 137 : 271;

  const familyKeys = Object.keys(MISSION_FAMILIES);
  const shuffledFamilies = seededShuffle(familyKeys, dayNum + lvlOff);

  const eligibleFamilies = shuffledFamilies.filter(f =>
    f !== 'audio' || hasPronunciation
  );

  const selected: MissionTemplate[] = [];
  for (const family of eligibleFamilies) {
    if (selected.length === 3) break;
    const candidates = MISSION_POOL.filter(t =>
      MISSION_FAMILIES[family].includes(t.id) &&
      (!t.eligible || t.eligible(data))
    );
    if (candidates.length === 0) continue;
    const shuffledCandidates = seededShuffle(candidates, dayNum + lvlOff + family.length);
    if (shuffledCandidates[0]) selected.push(shuffledCandidates[0]);
  }

  return selected.map(t => ({
    id:            t.id,
    label:         t.label(isPt),
    sub:           t.sub(isPt),
    xpReward:      t.xpReward,
    completed:     t.getCompleted(data),
    progress:      t.getProgress(data),
    progressLabel: t.getProgressLabel(data, isPt),
    accentColor:   t.accentColor,
    accentBg:      t.accentBg,
    icon:          t.icon,
    doneIcon:      <CheckCircle size={26} color={t.accentColor} weight="fill" />,
    destination:   t.getDestination(tabs),
  }));
}
