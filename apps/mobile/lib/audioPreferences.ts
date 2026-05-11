// lib/audioPreferences.ts
// Preferencias de audio do usuario: SFX, Haptico, Voz da Charlotte (interjeicoes Tier 4).
//
// Storage: expo-secure-store (mesma camada usada por aiConsent.ts).
// Cache em memoria para evitar await em hot paths (soundEngine.play / Haptics).
// Listeners para a UI reagir a toggles sem rerender forcado.

import * as SecureStore from 'expo-secure-store';

const KEY_SFX     = 'audio_pref_sfx_v1';
const KEY_HAPTIC  = 'audio_pref_haptic_v1';
const KEY_VOICE   = 'audio_pref_voice_v1';

export interface AudioPreferences {
  sfx: boolean;     // SFX musicais (acerto/erro/achievement)
  haptic: boolean;  // vibracoes hapticas
  voice: boolean;   // interjeicoes da Charlotte ("Nice!", "Wow!")
}

const DEFAULTS: AudioPreferences = {
  sfx: true,
  haptic: true,
  voice: true,
};

// Cache sincrono — preenchido por loadAudioPreferences() no boot.
let cache: AudioPreferences = { ...DEFAULTS };
let loaded = false;

type Listener = (prefs: AudioPreferences) => void;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) { try { l(cache); } catch {} }
}

/** Le do SecureStore e popula o cache. Chamar no boot (app/_layout.tsx). */
export async function loadAudioPreferences(): Promise<AudioPreferences> {
  if (loaded) return cache;
  try {
    const [sfx, haptic, voice] = await Promise.all([
      SecureStore.getItemAsync(KEY_SFX),
      SecureStore.getItemAsync(KEY_HAPTIC),
      SecureStore.getItemAsync(KEY_VOICE),
    ]);
    cache = {
      sfx:    sfx    === null ? DEFAULTS.sfx    : sfx    === 'true',
      haptic: haptic === null ? DEFAULTS.haptic : haptic === 'true',
      voice:  voice  === null ? DEFAULTS.voice  : voice  === 'true',
    };
  } catch {
    cache = { ...DEFAULTS };
  }
  loaded = true;
  emit();
  return cache;
}

/** Leitura sincrona (do cache). Seguro em hot paths apos boot. */
export function getAudioPreferences(): AudioPreferences {
  return cache;
}

export async function setAudioPreference<K extends keyof AudioPreferences>(
  key: K,
  value: AudioPreferences[K],
): Promise<void> {
  cache = { ...cache, [key]: value };
  emit();
  const storeKey = key === 'sfx' ? KEY_SFX : key === 'haptic' ? KEY_HAPTIC : KEY_VOICE;
  try { await SecureStore.setItemAsync(storeKey, String(value)); } catch {}
}

export function subscribeAudioPreferences(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
