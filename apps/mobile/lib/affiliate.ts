// lib/affiliate.ts — link de afiliado (influenciador): queizy.com/a/CODIGO.
// O código chega pelo deep link (queizy://aff/CODIGO), pela instalação (referrer da Play Store
// ou área de transferência no iPhone, lidos em lib/referral.ts) ou digitado em "Recebeu um convite?".
// Fica guardado até haver login e então marca a conta no servidor (/api/affiliate).
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';

const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';
const PENDING_KEY = 'queizy_pending_affiliate';

const clean = (c: string) => c.replace(/^AFF:/i, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export async function savePendingAffiliate(code: string, source: 'install' | 'link'): Promise<void> {
  const c = clean(code);
  if (c) await SecureStore.setItemAsync(PENDING_KEY, `${source}:${c}`);
}

/** Marca a conta com o afiliado guardado (uma vez). Sem internet, guarda para tentar depois. */
export async function attachPendingAffiliate(): Promise<void> {
  const raw = await SecureStore.getItemAsync(PENDING_KEY);
  if (!raw) return;
  const [source, code] = raw.includes(':') ? raw.split(':') : ['link', raw];
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return; // sem login ainda: tenta depois
    await fetch(`${API_BASE_URL}/api/affiliate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'attach', code, source }),
    });
    await SecureStore.deleteItemAsync(PENDING_KEY); // aceito ou recusado (já tem, expirou), não insiste
  } catch { /* sem internet: fica guardado */ }
}
