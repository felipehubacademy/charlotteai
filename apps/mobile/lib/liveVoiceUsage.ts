// lib/liveVoiceUsage.ts
// Pool mensal de Live Voice — por ASSINATURA (não mais por nível):
//   Trial / grátis:          5 min (300 s)
//   Premium / Institucional: 20 min (1 200 s)
// Quem esgota: trial -> upsell (assine); premium/inst -> comprar minutos
// avulsos (IAP, fase futura). Reset automático no 1º dia de cada mês.

import { supabase } from './supabase';
import { localMonthStartStr } from './dateUtils';

// ── Constantes ──────────────────────────────────────────────────────────────

export const POOL_TRIAL_SECONDS   = 5 * 60;  //   300 s — trial / grátis
export const POOL_PREMIUM_SECONDS  = 20 * 60; // 1 200 s — premium / institucional

/** Fallback legado (usado onde não dá pra saber a assinatura ainda). */
export const LIVE_VOICE_POOL_SECONDS = POOL_PREMIUM_SECONDS;

/**
 * Pool por status de assinatura.
 * Institucional e Premium (subscription ativa) = 20 min; o resto (trial/none) = 5 min.
 */
export function getPoolForSubscription(subscriptionStatus?: string | null, isInstitutional?: boolean): number {
  if (isInstitutional) return POOL_PREMIUM_SECONDS;
  if (subscriptionStatus === 'active') return POOL_PREMIUM_SECONDS;
  return POOL_TRIAL_SECONDS;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Usa localMonthStartStr() de dateUtils — respeita o fuso do device

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface LiveVoiceStatus {
  secondsUsed:      number;
  secondsRemaining: number;    // mensal restante + bônus comprado
  poolTotal:        number;    // pool MENSAL (não inclui bônus)
  bonusSeconds:     number;    // saldo de minutos avulsos comprados (não zera no mês)
  resetDate:        string;    // 'YYYY-MM-01'
  isUnlimited?:     boolean;   // legado (ninguém é ilimitado hoje)
}

// ── Funções públicas ─────────────────────────────────────────────────────────

/**
 * Obtém o status atual do pool. O tamanho do pool agora vem da ASSINATURA
 * (trial 5 min · premium/institucional 20 min), não do nível.
 * Se o mês mudou desde o último uso, zera o contador automaticamente.
 * O parâmetro `level` é legado (ignorado no cálculo do pool).
 *
 * `userIdArg`: quando informado, evita o `supabase.auth.getUser()` (chamada de
 * rede que valida o token no servidor e falha em blips de conexão). Como quem
 * chama já tem o id da sessão, passá-lo aqui deixa a leitura confiável — sem
 * ele a tela caía num pool trial falso quando o getUser falhava.
 */
export async function getLiveVoiceStatus(_level?: string, userIdArg?: string): Promise<LiveVoiceStatus> {
  let userId = userIdArg;
  if (!userId) {
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (!user || authErr) throw new Error('Not authenticated');
    userId = user.id;
  }

  const thisMonth = localMonthStartStr();

  const { data, error } = await supabase
    .from('charlotte_users')
    .select('live_voice_seconds_used, live_voice_reset_date, is_institutional, subscription_status, live_voice_bonus_seconds')
    .eq('id', userId)
    .single();

  if (error) throw error;

  const poolTotal = getPoolForSubscription(data.subscription_status, data.is_institutional);
  const bonus     = data.live_voice_bonus_seconds ?? 0;

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
      .eq('id', userId);

    if (updErr) console.warn('[liveVoiceUsage] reset error:', updErr.message);

    return {
      secondsUsed:      0,
      secondsRemaining: poolTotal + bonus, // mensal cheio + bônus (bônus não zera)
      poolTotal,
      bonusSeconds:     bonus,
      resetDate:        thisMonth,
    };
  }

  const secondsUsed = data.live_voice_seconds_used ?? 0;
  return {
    secondsUsed,
    secondsRemaining: Math.max(0, poolTotal - secondsUsed) + bonus,
    poolTotal,
    bonusSeconds:     bonus,
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
    .select('live_voice_seconds_used, live_voice_bonus_seconds, is_institutional, subscription_status')
    .eq('id', user.id)
    .single();

  if (fetchErr || !data) {
    console.warn('[liveVoiceUsage] fetch error:', fetchErr?.message);
    return;
  }

  // Consome do pool MENSAL primeiro; o que passar sai do saldo BÔNUS comprado.
  const poolTotal = getPoolForSubscription(data.subscription_status, data.is_institutional);
  const current   = data.live_voice_seconds_used ?? 0;
  const bonus     = data.live_voice_bonus_seconds ?? 0;
  const monthlyAvail = Math.max(0, poolTotal - current);
  const fromMonthly  = Math.min(rounded, monthlyAvail);
  const fromBonus    = rounded - fromMonthly;

  const { error: updErr } = await supabase
    .from('charlotte_users')
    .update({
      live_voice_seconds_used:  current + fromMonthly,
      live_voice_bonus_seconds: Math.max(0, bonus - fromBonus),
    })
    .eq('id', user.id);

  if (updErr) console.warn('[liveVoiceUsage] consume error:', updErr.message);
}

/** Formata segundos em 'MM min' para exibição no badge da home. */
export function formatPoolMinutes(seconds: number): string {
  const mins = Math.ceil(seconds / 60);
  return `${mins} min`;
}
