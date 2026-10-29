/**
 * Chave usada para armazenar o consentimento de IA no SecureStore.
 * Arquivo separado para evitar dependência circular entre app/_layout.tsx
 * e app/(app)/ai-consent.tsx.
 */
export const AI_CONSENT_KEY = 'ai_consent_v1';

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { Application } from './nativeOptional';

/** Aceite das tecnologias de IA é POR CONTA (antes era por aparelho: uma conta nova no mesmo celular
 *  entrava sem aceitar). Conta criada antes da mudança vale pelo aceite antigo do aparelho. */
const PER_ACCOUNT_SINCE = '2026-10-22T15:30:00Z';
const keyFor = (userId: string) => `${AI_CONSENT_KEY}_${userId}`;

/** Registro no banco (public.ai_consents): prova do aceite e vale em qualquer aparelho. Nunca lança. */
const recorded = new Set<string>(); // uma vez por abertura do app (o guard lê o aceite a cada troca de tela)
async function recordInDb(userId: string): Promise<void> {
  if (recorded.has(userId)) return;
  recorded.add(userId);
  try {
    await supabase.from('ai_consents').upsert(
      { user_id: userId, platform: Platform.OS, app_version: Application?.nativeApplicationVersion ?? null },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );
  } catch {}
}

export async function hasAiConsent(userId: string, createdAt?: string | null): Promise<boolean> {
  const own = await SecureStore.getItemAsync(keyFor(userId)).catch(() => null);
  const legacy = !own && createdAt && createdAt < PER_ACCOUNT_SINCE
    ? (await SecureStore.getItemAsync(AI_CONSENT_KEY).catch(() => null)) === '1' : false;
  if (own === '1' || legacy) {
    void recordInDb(userId); // aceite dado antes do registro no banco: sobe agora (uma vez, sem sobrescrever a data)
    return true;
  }
  // Celular novo / app reinstalado: o aceite pode estar só no banco.
  try {
    const { data } = await supabase.from('ai_consents').select('user_id').eq('user_id', userId).maybeSingle();
    if (data) { await SecureStore.setItemAsync(keyFor(userId), '1').catch(() => {}); return true; }
  } catch {}
  return false;
}

export async function saveAiConsent(userId: string): Promise<void> {
  await SecureStore.setItemAsync(keyFor(userId), '1').catch(() => {});
  await recordInDb(userId);
}
