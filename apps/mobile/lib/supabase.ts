import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// process.env.EXPO_PUBLIC_* is statically replaced by Metro at bundle time — works for OTA updates.
// Constants.expoConfig?.extra is read from the OTA manifest and does NOT include extra values,
// so it cannot be used for OTA-delivered bundles.
const supabaseUrl: string =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  Constants.expoConfig?.extra?.supabaseUrl ?? '';
const supabaseAnonKey: string =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  Constants.expoConfig?.extra?.supabaseAnonKey ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] EXPO_PUBLIC_SUPABASE_URL ou EXPO_PUBLIC_SUPABASE_ANON_KEY não definidas.');
}

// ─── Chunked SecureStore adapter ─────────────────────────────────────────────
//
// SecureStore has a 2048-byte limit per value. Supabase JWTs exceed this,
// so large values are split into 1800-byte chunks.
//
// iOS 26 write-contention fix: setItem and removeItem are serialised through
// a single promise queue (_enqueue). Without this, concurrent setItem calls
// (session write + token-refresh write) interleave chunk writes and produce
// a corrupted/partial session that reads back as null on next cold boot.
//
// getItem runs directly (outside the queue) — reads don't cause contention,
// and queueing reads caused a deadlock: Supabase's _handleInitialSession must
// resolve its getItem before signInWithPassword can proceed.

const CHUNK_SIZE = 1800;

// Acessibilidade do Keychain p/ o token de auth. O default (WHEN_UNLOCKED)
// RECUSA a escrita com o device bloqueado — o auto-refresh do Supabase que cai
// com a tela travada dava errSecInteractionNotAllowed ("User interaction is not
// allowed", visto no Sentry). AFTER_FIRST_UNLOCK deixa o token gravavel/legivel
// apos o 1o unlock pos-boot (mesmo bloqueando depois) — modo recomendado p/
// tokens que renovam em background. Sem migracao: o proximo write faz upgrade.
const KEYCHAIN_OPTS = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

let _keychainQueue: Promise<unknown> = Promise.resolve();
function _enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = (_keychainQueue = _keychainQueue.then(fn, fn)) as Promise<T>;
  return result;
}

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const countStr = await SecureStore.getItemAsync(`${key}.__chunks`);
      if (countStr) {
        const count = parseInt(countStr, 10);
        const parts: string[] = [];
        for (let i = 0; i < count; i++) {
          const chunk = await SecureStore.getItemAsync(`${key}.__chunk${i}`);
          if (chunk === null) return null; // partial write — treat as missing
          parts.push(chunk);
        }
        return parts.join('');
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  setItem: (key: string, value: string): Promise<void> =>
    _enqueue(async () => {
      if (value.length > CHUNK_SIZE) {
        const chunks: string[] = [];
        for (let i = 0; i < value.length; i += CHUNK_SIZE) {
          chunks.push(value.slice(i, i + CHUNK_SIZE));
        }
        // 1. Remove stale chunks if new session is smaller than previous
        const oldCountStr = await SecureStore.getItemAsync(`${key}.__chunks`).catch(() => null);
        if (oldCountStr) {
          const oldCount = parseInt(oldCountStr, 10);
          for (let i = chunks.length; i < oldCount; i++) {
            await SecureStore.deleteItemAsync(`${key}.__chunk${i}`).catch(() => {});
          }
        }
        // 2. Write chunks sequentially
        for (let i = 0; i < chunks.length; i++) {
          await SecureStore.deleteItemAsync(`${key}.__chunk${i}`).catch(() => {});
          await SecureStore.setItemAsync(`${key}.__chunk${i}`, chunks[i], KEYCHAIN_OPTS);
        }
        // 3. Write count last — a missing count means getItem returns null
        //    rather than assembling from partial chunks
        await SecureStore.deleteItemAsync(`${key}.__chunks`).catch(() => {});
        await SecureStore.setItemAsync(`${key}.__chunks`, String(chunks.length), KEYCHAIN_OPTS);
      } else {
        await SecureStore.deleteItemAsync(key).catch(() => {});
        await SecureStore.setItemAsync(key, value, KEYCHAIN_OPTS);
      }
    }),

  removeItem: (key: string): Promise<void> =>
    _enqueue(async () => {
      try {
        const countStr = await SecureStore.getItemAsync(`${key}.__chunks`);
        if (countStr) {
          const count = parseInt(countStr, 10);
          for (let i = 0; i < count; i++) {
            await SecureStore.deleteItemAsync(`${key}.__chunk${i}`).catch(() => {});
          }
          await SecureStore.deleteItemAsync(`${key}.__chunks`).catch(() => {});
        }
        await SecureStore.deleteItemAsync(key).catch(() => {});
      } catch {}
    }),
};

// In Expo Go, SecureStore Keychain calls can hang indefinitely because Expo Go
// runs in a shared sandbox where the Keychain behaves differently from a
// standalone build. Disabling persistence in Expo Go means the user must log
// in each time the app reloads, but avoids the infinite "Entrando..." hang.
// In production EAS builds, full persistence is enabled.
//
// Constants.appOwnership was deprecated in SDK 52 — it may return null in newer
// Expo Go versions. Use executionEnvironment === 'storeClient' (the canonical
// way to detect Expo Go since SDK 52) with appOwnership as a fallback.
const isExpoGo =
  (Constants as any).executionEnvironment === 'storeClient' ||
  Constants.appOwnership === 'expo';

if (__DEV__) {
  console.log('[Supabase] executionEnvironment:', (Constants as any).executionEnvironment,
    '| appOwnership:', Constants.appOwnership, '| isExpoGo:', isExpoGo);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isExpoGo ? undefined : ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: !isExpoGo,
    detectSessionInUrl: false,
  },
});

/**
 * Perfil do usuário Charlotte — espelha as colunas de `charlotte_users`.
 * Sem dependência de campos LMS (sem lms_role, sem user_level da tabela users).
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  charlotte_level: 'Novice' | 'Inter' | 'Advanced';
  placement_test_done: boolean;
  is_institutional: boolean;      // admin-managed; bypasses paywall
  is_active: boolean;
  subscription_status: 'none' | 'trial' | 'active' | 'expired' | 'cancelled';
  trial_ends_at: string | null;   // ISO timestamp
  must_change_password: boolean;
  first_welcome_done: boolean;          // true after first-access welcome shown
  live_voice_seconds_used: number;      // segundos usados no mês corrente
  live_voice_reset_date:   string | null; // 'YYYY-MM-01'
  avatar_url?: string | null;
  subscription_product: 'monthly' | 'yearly' | null; // preenchido quando status='active'
  subscription_expires_at: string | null;            // ISO timestamp do latest expiration
  beta_features: string[];
  is_admin: boolean;
}
