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
import * as SecureStore from 'expo-secure-store';
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
  await flushPendingLiveVoiceCloses(); // fim de ligação que não chegou ao servidor: avisa antes de ler o saldo
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

// Fim de ligação ainda não confirmado pelo servidor (sem rede, 503...). Fica guardado no aparelho até o
// servidor responder; sem isso, a próxima ligação cobraria a sessão pelo tempo corrido até o teto.
// O servidor ignora fim repetido (sessão já fechada), então reenviar é seguro.
type PendingClose = { sessionId: string; seconds: number };
const PENDING_KEY = 'live_voice_pending_close';
const PENDING_MAX = 10;

let storageQueue: Promise<unknown> = Promise.resolve();
/** Leitura e gravação da lista em fila (fim de ligação e reenvio podem rodar juntos). */
function updatePending(fn: (list: PendingClose[]) => PendingClose[]): Promise<PendingClose[]> {
  const run = storageQueue.then(async () => {
    let list: PendingClose[] = [];
    try {
      const raw = await SecureStore.getItemAsync(PENDING_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) list = parsed.filter(p => typeof p?.sessionId === 'string' && typeof p?.seconds === 'number');
    } catch {}
    const next = fn(list).slice(-PENDING_MAX);
    if (JSON.stringify(next) === JSON.stringify(list)) return next; // só leitura
    try {
      if (next.length) await SecureStore.setItemAsync(PENDING_KEY, JSON.stringify(next));
      else await SecureStore.deleteItemAsync(PENDING_KEY);
    } catch {}
    return next;
  });
  storageQueue = run.catch(() => {});
  return run;
}

/** Avisa o fim ao servidor. true = resolvido (fechou, já estava fechada ou o id não vale); false = tentar de novo. */
async function postClose(p: PendingClose): Promise<boolean> {
  try {
    const r = await fetch(`${API_BASE_URL}/api/live-voice/usage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: p.sessionId, seconds: p.seconds }),
    });
    if (r.ok || r.status === 400) return true;
    console.warn('[liveVoiceUsage] consume error:', r.status);
  } catch (e) {
    console.warn('[liveVoiceUsage] consume error:', e);
  }
  return false;
}

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

let flushing: Promise<void> | null = null;

/**
 * Reenvia os fins de ligação guardados (antes de ler o saldo e antes de pedir uma ligação nova).
 * Espera no máximo timeoutMs: sem rede, segue sem travar a tela (a lista continua guardada).
 */
export async function flushPendingLiveVoiceCloses(timeoutMs = 5000): Promise<void> {
  if (!flushing) {
    flushing = (async () => {
      const list = await updatePending(l => l);
      for (const p of list) {
        if (await postClose(p)) await updatePending(l => l.filter(x => x.sessionId !== p.sessionId));
      }
    })().catch(() => {}).finally(() => { flushing = null; });
  }
  await Promise.race([flushing, sleep(timeoutMs)]);
}

/**
 * Registra segundos consumidos na sessão atual: avisa o servidor, que cobra e fecha a sessão.
 * Com 0 segundos (ligação que não conectou), fecha a sessão para não ser cobrada depois.
 * Sem sessão guardada (já avisada ou token não saiu), não faz nada.
 * O aviso fica guardado até o servidor confirmar: tenta de novo logo (rede que caiu por instantes) e, se ainda
 * falhar, na próxima leitura do saldo ou antes da próxima ligação (flushPendingLiveVoiceCloses).
 */
export async function consumeLiveVoiceSeconds(seconds: number): Promise<void> {
  const sessionId = currentUsageSession;
  currentUsageSession = null; // lido antes de qualquer espera: a próxima ligação guarda a dela
  if (!sessionId) return;
  const pending: PendingClose = { sessionId, seconds: Math.max(0, Math.round(Number(seconds) || 0)) };
  await updatePending(l => [...l.filter(x => x.sessionId !== sessionId), pending]);

  // O servidor cobra pelo tempo corrido até o aviso (o valor do app só baixa até 20 s): reenviar logo custa menos.
  for (const wait of [0, 2000, 5000]) {
    if (wait) await sleep(wait);
    if (await postClose(pending)) {
      await updatePending(l => l.filter(x => x.sessionId !== sessionId));
      return;
    }
  }
}

/** Formata segundos em 'MM min' para exibição no badge da home. */
export function formatPoolMinutes(seconds: number): string {
  const mins = Math.ceil(seconds / 60);
  return `${mins} min`;
}
