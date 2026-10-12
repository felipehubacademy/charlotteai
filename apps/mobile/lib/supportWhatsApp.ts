// lib/supportWhatsApp.ts — abre o WhatsApp do suporte já com um código da conta logada
// na mensagem, para o atendimento reconhecer o aluno sem pedir e-mail
// (o servidor troca o código pelo aluno; ver /api/support/whatsapp-code).
import Constants from 'expo-constants';
import { Linking } from 'react-native';
import { supabase } from './supabase';

const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

async function fetchCode(): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;
    const r = await fetch(`${API_BASE_URL}/api/support/whatsapp-code`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal,
    });
    return r.ok ? ((await r.json()).code ?? null) : null;
  } catch { return null; } finally { clearTimeout(t); }
}

/** Abre a conversa com o suporte. Sem código (offline, sem login), abre com a mensagem simples. */
export async function openSupportWhatsApp(phone: string, isPt: boolean): Promise<void> {
  const code = await fetchCode();
  const text = isPt
    ? `Olá! Preciso de ajuda com o Queizy.${code ? ` (código ${code})` : ''}`
    : `Hi! I need help with Queizy.${code ? ` (code ${code})` : ''}`;
  await Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`).catch(() => {});
}
