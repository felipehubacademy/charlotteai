// lib/supportChat.ts — chat de suporte dentro do app ("Fale com a Charlotte").
// O servidor (/api/support/chat) usa o mesmo cérebro do WhatsApp: a IA responde pela FAQ
// e o que ela não resolve vai para a equipe, que responde por aqui (com push).
import Constants from 'expo-constants';
import { supabase } from './supabase';

const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

export interface SupportChatMessage { id: string; author: 'user' | 'agent' | 'human'; body: string; created_at: string }
export interface SupportChat { status: string | null; messages: SupportChatMessage[] }

async function call(method: 'GET' | 'POST', body?: unknown): Promise<SupportChat | { error: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: 'auth' };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 45000);
  try {
    const r = await fetch(`${API_BASE_URL}/api/support/chat`, {
      method, signal: ctrl.signal,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 429) return { error: 'rate_limited' };
    if (!r.ok) return { error: `http_${r.status}` };
    return await r.json() as SupportChat;
  } catch {
    return { error: 'network' };
  } finally {
    clearTimeout(t);
  }
}

export const loadSupportChat = () => call('GET');
export const sendSupportChat = (text: string, isPt: boolean) => call('POST', { text, lang: isPt ? 'pt' : 'en' });
