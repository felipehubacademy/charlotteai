// lib/rally.ts — Rallies: disputas de 24 horas ou 7 dias entre amigos.
// O placar é calculado no servidor (/api/rally); aqui ficam os tipos, as
// chamadas e o código de rally pendente (vindo de link ou da instalação).
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';
import { systemIsPt } from './systemLang';

const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';
const PENDING_KEY = 'queizy_pending_rally';

export type RallyMetric = 'xp' | 'practices' | 'accuracy';
export interface RallyStanding { userId: string; name: string | null; avatarUrl: string | null; score: number | null; rank: number; isMe: boolean }
export interface Rally {
  code: string; metric: RallyMetric; hours: number; title: string;
  startsAt: string; endsAt: string; finished: boolean;
  creator: string | null; isCreator: boolean; winnerId: string | null; link: string;
  standings: RallyStanding[];
}
export interface RallyList { active: Rally[]; finished: Rally[]; invites: Rally[] }

async function authed(path: string, init?: RequestInit): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers ?? {}) },
  });
}

export async function fetchRallies(): Promise<RallyList | null> {
  try {
    const r = await authed(`/api/rally?lang=${systemIsPt ? 'pt' : 'en'}`);
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

type Result = { ok: true; code?: string; link?: string; already?: boolean } | { ok: false; error: string };
async function post(body: Record<string, unknown>): Promise<Result> {
  try {
    const r = await authed('/api/rally', { method: 'POST', body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, code: j.code, link: j.link, already: !!j.already } : { ok: false, error: j.error ?? 'error' };
  } catch { return { ok: false, error: 'network' }; }
}

export const createRally = (metric: RallyMetric, hours: 24 | 168, invite: string[]) => post({ action: 'create', metric, hours, invite });
export const joinRally = (code: string) => post({ action: 'join', code });
export const declineRally = (code: string) => post({ action: 'decline', code });
export const rematchRally = (code: string) => post({ action: 'rematch', code });

const clean = (c: string) => c.replace(/^RALLY:/i, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export async function savePendingRally(code: string): Promise<void> {
  const c = clean(code);
  if (c) await SecureStore.setItemAsync(PENDING_KEY, c);
}

export async function takePendingRally(): Promise<string | null> {
  const c = await SecureStore.getItemAsync(PENDING_KEY);
  if (c) await SecureStore.deleteItemAsync(PENDING_KEY);
  return c;
}

/** Placar formatado, igual ao do servidor. */
export function formatRallyScore(metric: RallyMetric, score: number | null, pt: boolean): string {
  if (score == null) return '—';
  if (metric === 'xp') return `${score} XP`;
  if (metric === 'practices') return pt ? `${score} ${score === 1 ? 'prática' : 'práticas'}` : `${score} ${score === 1 ? 'practice' : 'practices'}`;
  return `${score}%`;
}

/** "Termina em 5h", "Termina em 2 dias", "Terminou". */
export function rallyTimeLeft(endsAt: string, pt: boolean): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return pt ? 'Terminou' : 'Ended';
  const h = Math.floor(ms / 3600000);
  if (h < 1) return pt ? 'Termina em menos de 1h' : 'Ends in under 1h';
  if (h < 48) return pt ? `Termina em ${h}h` : `Ends in ${h}h`;
  const d = Math.floor(h / 24);
  return pt ? `Termina em ${d} dias` : `Ends in ${d} days`;
}
