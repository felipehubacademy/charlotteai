// lib/weeklyChallenge.ts
// Desafios semanais rotativos — um desafio ativo por semana.
// Progresso rastreado client-side via dados da home (sem tabela extra).

import { supabase } from './supabase';
import { localWeekStartISO, localWeekStartStr } from './dateUtils';

// ── Tipos ────────────────────────────────────────────────────────────────────

export type UserLevel = 'Novice' | 'Inter' | 'Advanced';

export interface WeeklyChallenge {
  id: string;
  title: { pt: string; en: string };
  sub:   { pt: string; en: string };
  target: number;
  unit: { pt: string; en: string };
  xpReward: number;
  color: string;
  bgColor: string;
  /** Levels that can receive this challenge. Omit = all levels. */
  allowedLevels?: UserLevel[];
}

export interface WeeklyChallengeState {
  challenge: WeeklyChallenge;
  current: number;
  completed: boolean;
  weekStart: string; // ISO date da segunda-feira
}

// ── Pool de desafios ────────────────────────────────────────────────────────

const CHALLENGE_POOL: WeeklyChallenge[] = [
  {
    id: 'messages_50',
    title: { pt: 'Maratonista', en: 'Marathon Runner' },
    sub:   { pt: 'Envie 50 mensagens esta semana', en: 'Send 50 messages this week' },
    target: 50, unit: { pt: 'mensagens', en: 'messages' },
    xpReward: 100, color: '#08804A', bgColor: '#E3F6EC',
    // Novice only sends text — lower target so the challenge is achievable
  },
  {
    id: 'xp_500',
    title: { pt: 'Cac\u0327ador de XP', en: 'XP Hunter' },
    sub:   { pt: 'Ganhe 500 XP esta semana', en: 'Earn 500 XP this week' },
    target: 500, unit: { pt: 'XP', en: 'XP' },
    xpReward: 120, color: '#6B4BFF', bgColor: '#EFECFF',
  },
  {
    id: 'streak_5',
    title: { pt: 'Consist\u00eancia', en: 'Consistency' },
    sub:   { pt: 'Mantenha 5 dias de streak', en: 'Keep a 5-day streak' },
    target: 5, unit: { pt: 'dias', en: 'days' },
    xpReward: 80, color: '#FF4F8B', bgColor: '#FFEEF4',
  },
  {
    id: 'lessons_5',
    title: { pt: 'Estudioso', en: 'Bookworm' },
    sub:   { pt: 'Complete 5 li\u00e7\u00f5es esta semana', en: 'Complete 5 lessons this week' },
    target: 5, unit: { pt: 'li\u00e7\u00f5es', en: 'lessons' },
    xpReward: 100, color: '#16131F', bgColor: '#F1FFB8',
  },
  {
    id: 'audio_10',
    title: { pt: 'Falante', en: 'Speaker' },
    sub:   { pt: 'Envie 10 mensagens de \u00e1udio', en: 'Send 10 audio messages' },
    target: 10, unit: { pt: '\u00e1udios', en: 'audios' },
    xpReward: 90, color: '#08804A', bgColor: '#E3F6EC',
    // Audio messages are only available from Inter onwards
    allowedLevels: ['Inter', 'Advanced'],
  },
  {
    id: 'grammar_20',
    title: { pt: 'Gram\u00e1tica', en: 'Grammar Star' },
    sub:   { pt: 'Envie 20 frases no modo Gram\u00e1tica', en: 'Send 20 sentences in Grammar mode' },
    target: 20, unit: { pt: 'frases', en: 'sentences' },
    xpReward: 90, color: '#6B4BFF', bgColor: '#EFECFF',
    // Replaces audio_10 for Novice (Grammar is unlocked for all)
    allowedLevels: ['Novice'],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Seleciona o desafio da semana baseado num seed determinístico. */
function getWeekSeed(): number {
  const ws = localWeekStartStr();
  let hash = 0;
  for (let i = 0; i < ws.length; i++) {
    hash = ws.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

// ── Função pública ──────────────────────────────────────────────────────────

/**
 * Retorna o desafio da semana e o progresso atual.
 * Filtra o pool pelo nível do usuário antes de selecionar.
 * Usa dados da home screen (sem query extra).
 */
export function getWeeklyChallenge(
  weeklyMessages: number,
  weeklyXP: number,
  _streakDays: number,
  weeklyLessons: number,
  weeklyAudios: number,
  weeklyGrammarMessages: number = 0,
  userLevel: UserLevel = 'Inter',
  weeklyActiveDays: number = 0,
): WeeklyChallengeState {
  const seed = getWeekSeed();
  // Filter pool to only challenges available for this level
  const availablePool = CHALLENGE_POOL.filter(
    c => !c.allowedLevels || c.allowedLevels.includes(userLevel)
  );
  const challenge = availablePool[seed % availablePool.length];
  const weekStart = localWeekStartStr();

  let current = 0;
  switch (challenge.id) {
    case 'messages_50':  current = weeklyMessages; break;
    case 'xp_500':       current = weeklyXP; break;
    case 'streak_5':     current = weeklyActiveDays; break;
    case 'lessons_5':    current = weeklyLessons; break;
    case 'audio_10':     current = weeklyAudios; break;
    case 'grammar_20':   current = weeklyGrammarMessages; break;
  }

  return {
    challenge,
    current: Math.min(current, challenge.target),
    completed: current >= challenge.target,
    weekStart,
  };
}

/**
 * Busca dados da semana para o weekly challenge.
 * Retorna contadores de mensagens, XP, lições e áudios da semana.
 */
export async function fetchWeeklyData(userId: string): Promise<{
  weeklyMessages: number;
  weeklyXP: number;
  weeklyLessons: number;
  weeklyAudios: number;
  weeklyGrammarMessages: number;
  weeklyActiveDays: number;
}> {
  const weekStart = localWeekStartISO();

  // Práticas de chat + XP + dias ativos
  const [{ data, error }, { data: historyData }] = await Promise.all([
    supabase
      .from('charlotte_practices')
      .select('practice_type, xp_earned, created_at')
      .eq('user_id', userId)
      .gte('created_at', weekStart),
    // Atividades da trilha concluídas nesta semana — 1 por (módulo, unidade, atividade)
    supabase
      .from('learn_history_v2')
      .select('level, module_id, unit_id, activity_type')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('updated_at', weekStart),
  ]);

  if (error || !data) return { weeklyMessages: 0, weeklyXP: 0, weeklyLessons: 0, weeklyAudios: 0, weeklyGrammarMessages: 0, weeklyActiveDays: 0 };

  const weeklyMessages        = data.filter(p => ['text_message', 'audio_message'].includes(p.practice_type)).length;
  const weeklyXP              = data.reduce((s, p) => s + (p.xp_earned ?? 0), 0);
  const weeklyAudios          = data.filter(p => p.practice_type === 'audio_message').length;
  const weeklyGrammarMessages = data.filter(p => p.practice_type === 'grammar_message').length;
  // Dias distintos com pelo menos uma prática nesta semana (sempre cresce, nunca regride)
  const weeklyActiveDays      = new Set(data.map(p => (p.created_at as string).slice(0, 10))).size;
  // Atividades únicas da trilha — cada (nível, módulo, unidade, atividade) conta 1x por semana
  const weeklyLessons         = new Set(
    (historyData ?? []).map(h => `${h.level}_${h.module_id}_${h.unit_id}_${h.activity_type}`)
  ).size;

  return { weeklyMessages, weeklyXP, weeklyLessons, weeklyAudios, weeklyGrammarMessages, weeklyActiveDays };
}
