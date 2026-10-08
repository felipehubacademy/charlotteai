// lib/friends.ts — busca de alunos (nome, sobrenome ou @) e amigos de estudo
// pela busca: pedido + aceite. O servidor guarda tudo (/api/friends).
import Constants from 'expo-constants';
import { supabase } from './supabase';

const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

export type FriendRelation = 'friend' | 'pending_in' | 'pending_out' | null;
export interface Person { id: string; name: string; username: string | null; level: string | null; avatarUrl: string | null; relation?: FriendRelation }

async function authed(path: string, init?: RequestInit): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers ?? {}) },
  });
}

export async function searchPeople(q: string): Promise<Person[]> {
  try {
    const r = await authed(`/api/friends?q=${encodeURIComponent(q)}`);
    return r.ok ? ((await r.json()).results ?? []) : [];
  } catch { return []; }
}

export async function fetchIncomingRequests(): Promise<Person[]> {
  try {
    const r = await authed('/api/friends');
    return r.ok ? ((await r.json()).incoming ?? []) : [];
  } catch { return []; }
}

export async function fetchMyHandle(): Promise<{ username: string | null; searchable: boolean } | null> {
  try {
    const r = await authed('/api/friends?me=1');
    if (!r.ok) return null;
    const j = await r.json();
    return { username: j.username ?? null, searchable: j.searchable !== false };
  } catch { return null; }
}

async function post(body: Record<string, unknown>): Promise<{ ok: boolean; error?: string; relation?: FriendRelation; username?: string }> {
  try {
    const r = await authed('/api/friends', { method: 'POST', body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, relation: j.relation ?? null, username: j.username } : { ok: false, error: j.error ?? 'error' };
  } catch { return { ok: false, error: 'network' }; }
}

export const requestFriend = (to: string) => post({ action: 'request', to });
export const acceptFriend = (from: string) => post({ action: 'accept', from });
export const declineFriend = (from: string) => post({ action: 'decline', from });
export const setSearchable = (value: boolean) => post({ action: 'searchable', value });
export const setUsername = (value: string) => post({ action: 'username', value });
