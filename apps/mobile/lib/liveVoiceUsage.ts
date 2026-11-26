// lib/liveVoiceUsage.ts
// Pool mensal de Live Voice — por ASSINATURA (não mais por nível):
//   Trial / grátis:          5 min (300 s)
//   Premium / Institucional: 20 min (1 200 s)
// Quem esgota: trial -> upsell (assine); premium/inst -> comprar minutos
// avulsos (IAP, fase futura). Reset automático no 1º dia de cada mês.
//
// O uso é contado no SERVIDOR (/api/live-voice/usage): o token da ligação (/api/realtime-token ou
// /api/family-call/session) abre uma sessão de minutos e devolve usageSessionId; no fim, o app avisa
// os segundos e o servidor cobra (pool do mês, depois bônus) e faz a virada do mês. O app não grava
// mais esses campos na conta (o banco ignora).

import Constants from 'expo-constants';
import { supabase } from './supabase';
import { localMonthStartStr } from './dateUtils';

const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

// ── Constantes ──────────────────────────────────────────────────────────────

export const POOL_TRIAL_SECONDS   = 5 * 60;  //   300 s — trial / grátis
export const POOL_PREMIUM_SECONDS  = 20 * 60; // 1 200 s — premium / institucional
export const POOL_TASTE_SECONDS    = 3 * 60;  //   180 s — degustação (conta sem assinatura), uma vez só

/** Fallback legado (usado onde não dá pra saber a assinatura ainda). */
export const LIVE_VOICE_POOL_SECONDS = POOL_PREMIUM_SECONDS;

/**
 * Pool por status de assinatura.
 * Institucional e Premium (subscription ativa) = 20 min; o resto (trial/none) = 5 min.
 */
/** Conta sem assinatura (degustação): 3 min uma vez só, sem a renovação do mês. */
export const isTasteStatus = (s?: string | null) => !s || s === 'none';

export function getPoolForSubscription(subscriptionStatus?: string | null, isInstitutional?: boolean): number {
  if (isInstitutional) return POOL_PREMIUM_SECONDS;
  if (subscriptionStatus === 'active') return POOL_PREMIUM_SECONDS;
  if (isTasteStatus(subscriptionStatus)) return POOL_TASTE_SECONDS;
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
 * Lê do servidor (que faz a virada do mês). Se o servidor não responder, lê a conta
 * e calcula igual, sem gravar nada.
 * O parâmetro `level` é legado (ignorado no cálculo do pool).
 *
 * `userIdArg`: quando informado, evita o `supabase.auth.getUser()` (chamada de
 * rede que valida o token no servidor e falha em blips de conexão). Como quem
 * chama já tem o id da sessão, passá-lo aqui deixa a leitura confiável — sem
 * ele a tela caía num pool trial falso quando o getUser falhava.
 */
export async function getLiveVoiceStatus(_level?: string, userIdArg?: string): Promise<LiveVoiceStatus> {
  try {
    const r = await fetch(`${API_BASE_URL}/api/live-voice/usage`);
    if (r.ok) {
      const j = await r.json();
      if (typeof j?.secondsRemaining === 'number' && typeof j?.poolTotal === 'number') {
        return {
          secondsUsed:      Number(j.secondsUsed ?? 0),
          secondsRemaining: j.secondsRemaining,
          poolTotal:        j.poolTotal,
          bonusSeconds:     Number(j.bonusSeconds ?? 0),
          resetDate:        String(j.resetDate ?? localMonthStartStr()),
        };
      }
    }
  } catch (e) {
    console.warn('[liveVoiceUsage] server status error:', e);
  }

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

  // Virou o mês → conta como zerado (quem grava a virada é o servidor).
  // Degustação não renova: os 3 min são uma vez só.
  const taster = isTasteStatus(data.subscription_status) && !data.is_institutional;
  const needsReset = !taster && (
    !data.live_voice_reset_date ||
    data.live_voice_reset_date < thisMonth);

  if (needsReset) {
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

// Sessão de minutos da ligação em andamento (usageSessionId do token). Uma ligação por vez.
let currentUsageSession: string | null = null;

/** Guarda o usageSessionId devolvido por /api/realtime-token ou /api/family-call/session. */
export function rememberLiveVoiceSession(sessionId: string | null | undefined): void {
  currentUsageSession = typeof sessionId === 'string' && sessionId ? sessionId : null;
}

/**
 * Registra segundos consumidos na sessão atual: avisa o servidor, que cobra e fecha a sessão.
 * Com 0 segundos (ligação que não conectou), fecha a sessão para não ser cobrada depois.
 * Sem sessão guardada (já avisada ou token não saiu), não faz nada.
 */
export async function consumeLiveVoiceSeconds(seconds: number): Promise<void> {
  const sessionId = currentUsageSession;
  currentUsageSession = null; // lido antes de qualquer espera: a próxima ligação guarda a dela
  if (!sessionId) return;
  const rounded = Math.max(0, Math.round(Number(seconds) || 0));

  const r = await fetch(`${API_BASE_URL}/api/live-voice/usage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, seconds: rounded }),
  });
  if (!r.ok) console.warn('[liveVoiceUsage] consume error:', r.status);
}

/** Formata segundos em 'MM min' para exibição no badge da home. */
export function formatPoolMinutes(seconds: number): string {
  const mins = Math.ceil(seconds / 60);
  return `${mins} min`;
}
