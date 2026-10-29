// lib/streak.ts — estado da sequência vindo do servidor (RPC streak_status), a mesma regra para a
// tela inicial, as estatísticas e a tela da sequência: congelamento automático (faltou 1 dia a cada 7,
// a sequência não zera), semana marcada e desafio dos 7 dias (supabase/migrations/20261028_streak_freeze_challenge.sql).
import { supabase } from '@/lib/supabase';

export type StreakDayState = 'done' | 'frozen' | 'today' | 'missed' | 'future';

export interface StreakChallenge {
  status: 'active' | 'completed' | 'failed';
  start_date: string;
  target: number;
  day: number;
  reward_minutes: number;
  completed_at: string | null;
}

export interface StreakStatus {
  today: string;                       // AAAA-MM-DD no fuso do aluno
  streak: number;                      // 0 se já quebrou
  practiced_today: boolean;
  protected_day: string | null;        // dia que faltou e foi (ou será) protegido
  freeze_available: boolean;
  week: { date: string; state: StreakDayState }[];
  challenge: StreakChallenge | null;
}

/** Marcos que ganham comemoração especial (os mesmos das conquistas de sequência). */
export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365, 500, 730, 1000];

export async function fetchStreakStatus(): Promise<StreakStatus | null> {
  try {
    const { data, error } = await supabase.rpc('streak_status');
    if (error || !data) return null;
    return data as StreakStatus;
  } catch { return null; }
}

export async function acceptStreakChallenge(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('accept_streak_challenge');
    return !error && data === true;
  } catch { return false; }
}

/** Dia anterior a `day` (AAAA-MM-DD), sem depender do fuso do aparelho. */
export function dayBefore(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Ontem faltou e a proteção segurou (ou vai segurar se praticar hoje). */
export function protectedYesterday(s: StreakStatus | null): boolean {
  return !!s && s.streak > 0 && s.protected_day === dayBefore(s.today);
}
