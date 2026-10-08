// lib/referral.ts
// Convites "Estudar junto": código do aluno, dupla de estudo, cutucadas e a
// detecção do convite depois de instalar o app.
//
// Como o código chega até um aluno novo:
//  - link com o app instalado: queizy://invite/CÓDIGO (rota app/invite/[code]);
//  - Android: referrer da Play Store (queizy_invite=CÓDIGO), lido na 1ª abertura;
//  - iPhone: a página do convite copia "QUEIZY:CÓDIGO"; o app oferece colar;
//  - manual: campo "Tenho um código" na tela Estudar junto.

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Clipboard, Application } from './nativeOptional';
import { supabase } from './supabase';
import { savePendingRally } from './rally';

const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';
const PENDING_KEY = 'queizy_pending_invite';
const DETECTED_KEY = 'queizy_invite_detection_done';

export interface Buddy {
  id: string; name: string | null; avatarUrl: string | null; level: string | null;
  relation: 'sponsor' | 'invited' | 'friend';
  weekXp: number; weekExercises: number; streak: number; lastPractice: string | null; nudgedToday: boolean;
}
export interface ReferralInfo {
  code: string; link: string; invitedCount: number; canClaim: boolean;
  me: { weekXp: number; weekExercises: number };
  buddies: Buddy[]; rewardMinutes: number;
}

export const NUDGE_KEYS = ['study', 'cheer', 'chasing', 'miss'] as const;
export type NudgeKey = typeof NUDGE_KEYS[number];

/** Níveis do badge Padrinho/Madrinha: quantas pessoas a pessoa trouxe. */
export const SPONSOR_TIERS = [1, 5, 20] as const;

async function authed(path: string, init?: RequestInit): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers ?? {}) },
  });
}

export async function fetchReferral(): Promise<ReferralInfo | null> {
  try {
    const r = await authed('/api/referral');
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

export type ClaimResult = { ok: true; inviter: string | null; rewardMinutes: number } | { ok: false; error: string };

export async function claimInvite(code: string): Promise<ClaimResult> {
  try {
    const r = await authed('/api/referral', { method: 'POST', body: JSON.stringify({ action: 'claim', code }) });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, inviter: j.inviter ?? null, rewardMinutes: j.rewardMinutes ?? 5 } : { ok: false, error: j.error ?? 'error' };
  } catch { return { ok: false, error: 'network' }; }
}

export async function nudgeBuddy(to: string, key: NudgeKey): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await authed('/api/referral', { method: 'POST', body: JSON.stringify({ action: 'nudge', to, key }) });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { ok: true } : { ok: false, error: j.error };
  } catch { return { ok: false, error: 'network' }; }
}

export function normalizeCode(raw: string): string {
  return raw.replace(/^QUEIZY:/i, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export async function savePendingInvite(code: string): Promise<void> {
  const c = normalizeCode(code);
  if (c) await SecureStore.setItemAsync(PENDING_KEY, c);
}

export async function takePendingInvite(): Promise<string | null> {
  const c = await SecureStore.getItemAsync(PENDING_KEY);
  if (c) await SecureStore.deleteItemAsync(PENDING_KEY);
  return c;
}

/**
 * Procura um convite deixado pela instalação (uma vez por aparelho).
 * Android: referrer da Play Store. iPhone: área de transferência com "QUEIZY:".
 * No iPhone, ler a área de transferência mostra o aviso de colar do sistema,
 * por isso só acontece uma vez e só para contas novas.
 */
export async function detectInstallInvite(): Promise<string | null> {
  if (await SecureStore.getItemAsync(DETECTED_KEY)) return null;
  await SecureStore.setItemAsync(DETECTED_KEY, '1');
  try {
    if (Platform.OS === 'android') {
      if (!Application) return null;
      const ref = decodeURIComponent(await Application.getInstallReferrerAsync() ?? '');
      const rally = /queizy_rally=([A-Z0-9]+)/i.exec(ref);
      if (rally) await savePendingRally(rally[1]);
      const m = /queizy_invite=([A-Z0-9]+)/i.exec(ref);
      return m ? normalizeCode(m[1]) : null;
    }
    if (Clipboard && await Clipboard.hasStringAsync()) {
      const text = await Clipboard.getStringAsync();
      const rally = /RALLY:([A-Z0-9]{4,})/i.exec(text ?? '');
      if (rally) await savePendingRally(rally[1]);
      const m = /QUEIZY:([A-Z0-9]{4,})/i.exec(text ?? '');
      return m ? normalizeCode(m[1]) : null;
    }
  } catch { /* sem convite */ }
  return null;
}
