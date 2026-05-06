// lib/liveVoiceUsage.ts
// Pool mensal de Live Voice — tiered por nível:
//   Advanced: 30 min (1 800 s)
//   Inter:     5 min (300 s)
//   Novice:    3 min (180 s) — "taste" desbloqueável após módulo 3
// Reset automático no 1º dia de cada mês.

import { supabase } from './supabase';
import { localMonthStartStr } from './dateUtils';

// ── Constantes ──────────────────────────────────────────────────────────────

export const POOL_BY_LEVEL: Record<string, number> = {
  Advanced: 30 * 60, // 1 800 s
  Inter:     5 * 60, // 300 s
  Novice:    3 * 60, // 180 s (taste)
};

/** Fallback — se nível desconhecido, usa o menor. */
export const LIVE_VOICE_POOL_SECONDS = 30 * 60; // legado: usado pelo LiveVoiceModal

/** Sentinel para usuários institucionais — Live Voice ilimitado. */
export const UNLIMITED_POOL_SECONDS = 999_999;

export function getPoolForLevel(level: string): number {
  return POOL_BY_LEVEL[level] ?? POOL_BY_LEVEL.Novice;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Usa localMonthStartStr() de dateUtils — respeita o fuso do device

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface LiveVoiceStatus {
  secondsUsed:      number;
  secondsRemaining: number;
  poolTotal:        number;    // pool total para o nível
  resetDate:        string;    // 'YYYY-MM-01'
  isUnlimited?:     boolean;   // true para usuários institucionais
}

// ── Funções públicas ─────────────────────────────────────────────────────────

/**
 * Obtém o status atual do pool para o nível informado.
 * Se o mês mudou desde o último uso, zera o contador automaticamente.
 */
export async function getLiveVoiceStatus(level?: string): Promise<LiveVoiceStatus> {
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (!user || authErr) throw new Error('Not authenticated');

  const thisMonth = localMonthStartStr();

  const { data, error } = await supabase
    .from('charlotte_users')
    .select('live_voice_seconds_used, live_voice_reset_date, charlotte_level, is_institutional')
    .eq('id', user.id)
    .single();

  if (error) throw error;

  if (data.is_institutional) {
    return {
      secondsUsed:      0,
      secondsRemaining: UNLIMITED_POOL_SECONDS,
      poolTotal:        UNLIMITED_POOL_SECONDS,
      resetDate:        localMonthStartStr(),
      isUnlimited:      true,
    };
  }

  const userLevel = level ?? data.charlotte_level ?? 'Novice';
  const poolTotal = getPoolForLevel(userLevel);

  // Virou o mês → reset
  const needsReset =
    !data.live_voice_reset_date ||
    data.live_voice_reset_date < thisMonth;

  if (needsReset) {
    const { error: updErr } = await supabase
      .from('charlotte_users')
      .update({
        live_voice_seconds_used: 0,
        live_voice_reset_date:   thisMonth,
      })
      .eq('id', user.id);

    if (updErr) console.warn('[liveVoiceUsage] reset error:', updErr.message);

    return {
      secondsUsed:      0,
      secondsRemaining: poolTotal,
      poolTotal,
      resetDate:        thisMonth,
    };
  }

  const secondsUsed = data.live_voice_seconds_used ?? 0;
  return {
    secondsUsed,
    secondsRemaining: Math.max(0, poolTotal - secondsUsed),
    poolTotal,
    resetDate:        data.live_voice_reset_date,
  };
}

/**
 * Registra segundos consumidos na sessão atual.
 */
export async function consumeLiveVoiceSeconds(seconds: number): Promise<void> {
  if (seconds <= 0) return;
  const rounded = Math.round(seconds);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error: fetchErr } = await supabase
    .from('charlotte_users')
    .select('live_voice_seconds_used')
    .eq('id', user.id)
    .single();

  if (fetchErr || !data) {
    console.warn('[liveVoiceUsage] fetch error:', fetchErr?.message);
    return;
  }

  const current = data.live_voice_seconds_used ?? 0;
  const { error: updErr } = await supabase
    .from('charlotte_users')
    .update({ live_voice_seconds_used: current + rounded })
    .eq('id', user.id);

  if (updErr) console.warn('[liveVoiceUsage] consume error:', updErr.message);
}

/** Formata segundos em 'MM min' para exibição no badge da home. */
export function formatPoolMinutes(seconds: number): string {
  const mins = Math.ceil(seconds / 60);
  return `${mins} min`;
}
