// lib/social.ts — "estudando agora", conquistas recentes do ranking e parabéns.
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { systemIsPt } from './systemLang';

const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

export interface FeedItem { id: string; userId: string; name: string | null; code: string; title: string; rarity: string; category: string; earnedAt: string; cheered: boolean }
export interface SocialInfo { studyingNow: number; buddiesNow: string[]; feed: FeedItem[] }

async function authed(path: string, init?: RequestInit): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers ?? {}) },
  });
}

export async function fetchSocial(): Promise<SocialInfo | null> {
  try {
    const r = await authed(`/api/social?lang=${systemIsPt ? 'pt' : 'en'}`);
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

export async function cheerAchievement(id: string): Promise<boolean> {
  try {
    const r = await authed('/api/social', { method: 'POST', body: JSON.stringify({ action: 'cheer', id }) });
    return r.ok;
  } catch { return false; }
}
