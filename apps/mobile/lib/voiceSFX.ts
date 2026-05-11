// lib/voiceSFX.ts
// Interjeicoes vocais da Charlotte (Tier 4 do mapa sonoro).
// Curtas, expressivas, com COOLDOWN agressivo para nao virar chato.
//
// Diferente do soundEngine (SFX musicais), este modulo:
//   - Toca MP3s da voz da Rachel via ElevenLabs (gerados por generate-sfx-tts.ts)
//   - Aplica cooldown global e por-id para evitar repeticao
//   - Respeita preferencia 'voice' do usuario
//
// Uso:
//   import { voiceSFX } from '@/lib/voiceSFX';
//   await voiceSFX.play('streak_3');     // "Nice!"
//   await voiceSFX.play('streak_5');     // "You're on fire!"
//   await voiceSFX.play('welcome_back'); // "Welcome back!"

import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import { getAudioPreferences } from './audioPreferences';

export type VoiceSfxId =
  | 'streak_3'         // 3 acertos seguidos     — "Nice!"
  | 'streak_5'         // 5 acertos seguidos     — "You're on fire!"
  | 'streak_10'        // 10 acertos seguidos    — "Incredible!"
  | 'welcome_back'     // retorno apos X dias    — "Welcome back!"
  | 'daily_goal'       // meta diaria concluida  — "Yes!"
  | 'achievement_epic' // epic                   — "Wow!"
  | 'achievement_legendary' // legendary         — "Legendary!"
  | 'streak_7_days'    // marco 7 dias           — "Seven days strong!"
  | 'streak_30_days'   // marco 30 dias          — "Thirty days!"
  | 'topic_complete'   // topico finalizado      — "Topic done!"
  | 'module_complete'; // modulo finalizado      — "Module complete!"

const API_BASE = (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined)
  ?? 'https://charlotte.hubacademybr.com';

// Cooldowns (ms)
const GLOBAL_COOLDOWN_MS = 90_000; // nenhuma voz toca antes de 90s da ultima
const PER_ID_COOLDOWN_MS = 30 * 60_000; // mesma frase nao repete por 30min

class VoiceSFXEngine {
  private uriCache = new Map<VoiceSfxId, string>();
  private muted = false;
  private lastPlayedAt = 0;
  private lastPlayedAtById = new Map<VoiceSfxId, number>();

  setMuted(m: boolean) { this.muted = m; }

  /** Toca uma interjeicao. Retorna false se foi bloqueado por cooldown/prefs. */
  async play(id: VoiceSfxId): Promise<boolean> {
    if (this.muted) return false;
    if (!getAudioPreferences().voice) return false;

    const now = Date.now();
    if (now - this.lastPlayedAt < GLOBAL_COOLDOWN_MS) return false;
    const lastForId = this.lastPlayedAtById.get(id) ?? 0;
    if (now - lastForId < PER_ID_COOLDOWN_MS) return false;

    try {
      const uri = await this.getUri(id);
      if (!uri) return false;

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true, // app de aprendizado — toggle "Voz" em Preferencias se nao quiser
        interruptionMode: 'mixWithOthers',
      }).catch(() => {});

      const player = createAudioPlayer({ uri });
      player.play();
      this.lastPlayedAt = now;
      this.lastPlayedAtById.set(id, now);

      setTimeout(() => {
        try { player.pause(); player.remove(); } catch {}
      }, 3000);
      return true;
    } catch (e) {
      console.warn('[VoiceSFX] play error:', e);
      return false;
    }
  }

  private async getUri(id: VoiceSfxId): Promise<string | null> {
    const cached = this.uriCache.get(id);
    if (cached) return cached;

    const localUri = `${FileSystem.cacheDirectory}voicesfx_${id}.mp3`;
    const info = await FileSystem.getInfoAsync(localUri).catch(() => ({ exists: false }));
    if (info.exists) {
      this.uriCache.set(id, localUri);
      return localUri;
    }

    try {
      const result = await FileSystem.downloadAsync(
        `${API_BASE}/tts/sfx_voice/${id}.mp3`,
        localUri,
      );
      if (result.status === 200) {
        this.uriCache.set(id, localUri);
        return localUri;
      }
      await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
      return null;
    } catch {
      return null;
    }
  }

  /** Pre-baixa todas as interjeicoes (chamar no boot, opcional). */
  async preload(): Promise<void> {
    const ids: VoiceSfxId[] = [
      'streak_3', 'streak_5', 'streak_10',
      'welcome_back', 'daily_goal',
      'achievement_epic', 'achievement_legendary',
      'streak_7_days', 'streak_30_days',
      'topic_complete', 'module_complete',
    ];
    await Promise.all(ids.map(id => this.getUri(id).catch(() => {})));
  }
}

export const voiceSFX = new VoiceSFXEngine();
