/**
 * Chave usada para armazenar o consentimento de IA no SecureStore.
 * Arquivo separado para evitar dependência circular entre app/_layout.tsx
 * e app/(app)/ai-consent.tsx.
 */
export const AI_CONSENT_KEY = 'ai_consent_v1';

import * as SecureStore from 'expo-secure-store';

/** Aceite das tecnologias de IA é POR CONTA (antes era por aparelho: uma conta nova no mesmo celular
 *  entrava sem aceitar). Conta criada antes da mudança vale pelo aceite antigo do aparelho. */
const PER_ACCOUNT_SINCE = '2026-10-22T15:30:00Z';
const keyFor = (userId: string) => `${AI_CONSENT_KEY}_${userId}`;

export async function hasAiConsent(userId: string, createdAt?: string | null): Promise<boolean> {
  const own = await SecureStore.getItemAsync(keyFor(userId)).catch(() => null);
  if (own === '1') return true;
  if (createdAt && createdAt < PER_ACCOUNT_SINCE) {
    return (await SecureStore.getItemAsync(AI_CONSENT_KEY).catch(() => null)) === '1';
  }
  return false;
}

export async function saveAiConsent(userId: string): Promise<void> {
  await SecureStore.setItemAsync(keyFor(userId), '1');
}
