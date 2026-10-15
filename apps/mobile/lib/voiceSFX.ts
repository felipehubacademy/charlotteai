// lib/voiceSFX.ts
// Interjeicoes vocais da Charlotte (Tier 4 do mapa sonoro).
// Assets BUNDLED via Metro require() — zero CDN, zero latencia.
// Cooldown agressivo no client para nao virar chato.
//
// Uso:
//   import { voiceSFX } from '@/lib/voiceSFX';
//   await voiceSFX.play('streak_3');     // "Nice!"
//   await voiceSFX.play('welcome_back'); // "Welcome back!"

import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { getAudioPreferences } from './audioPreferences';

export type VoiceSfxId =
  | 'streak_3'              // 3 acertos seguidos     — "Nice!"
  | 'streak_5'              // 5 acertos seguidos     — "You're on fire!"
  | 'streak_10'             // 10 acertos seguidos    — "Incredible!"
  | 'welcome_back'          // retorno apos X dias    — "Welcome back!"
  | 'daily_goal'            // meta diaria concluida  — "Yes!"
  | 'achievement_epic'      // epic                   — "Wow!"
  | 'achievement_legendary' // legendary              — "Legendary!"
  | 'streak_7_days'         // marco 7 dias           — "Seven days strong!"
  | 'streak_30_days'        // marco 30 dias          — "Thirty days!"
  | 'topic_complete'        // topico finalizado      — "Topic done!"
  | 'module_complete'       // modulo finalizado      — "Module complete!"
  | 'miss';                 // erro (só o Igorfina)   — "Cuaaaeezy..."

// ── Catalogo de assets bundled ───────────────────────────────────────────────

const BUNDLED: Partial<Record<VoiceSfxId, number>> = {
  streak_3:              require('../assets/audio/voice/streak_3.mp3'),
  streak_5:              require('../assets/audio/voice/streak_5.mp3'),
  streak_10:             require('../assets/audio/voice/streak_10.mp3'),
  welcome_back:          require('../assets/audio/voice/welcome_back.mp3'),
  daily_goal:            require('../assets/audio/voice/daily_goal.mp3'),
  achievement_epic:      require('../assets/audio/voice/achievement_epic.mp3'),
  achievement_legendary: require('../assets/audio/voice/achievement_legendary.mp3'),
  streak_7_days:         require('../assets/audio/voice/streak_7_days.mp3'),
  streak_30_days:        require('../assets/audio/voice/streak_30_days.mp3'),
  topic_complete:        require('../assets/audio/voice/topic_complete.mp3'),
  module_complete:       require('../assets/audio/voice/module_complete.mp3'),
};

// Trilha do Igorfina: os bordões dele no lugar das falas da Charlotte. Por enquanto gerados
// no ElevenLabs (voz do Igor); para trocar pela gravação dele, substitua os arquivos em
// assets/audio/voice/igorfina/ mantendo os nomes. O que não tem versão dele fica em silêncio.
export type VoiceCharacter = 'charlotte' | 'igorfina';
const IGORFINA: Partial<Record<VoiceSfxId, number>> = {
  streak_3:        require('../assets/audio/voice/igorfina/crazy.mp3'),        // "CRAZY!"
  streak_5:        require('../assets/audio/voice/igorfina/sliced.mp3'),       // "SLICED!"
  streak_10:       require('../assets/audio/voice/igorfina/thats_crazy.mp3'),  // "That is CRAZY, my friend!"
  topic_complete:  require('../assets/audio/voice/igorfina/sliced.mp3'),
  module_complete: require('../assets/audio/voice/igorfina/thats_crazy.mp3'),
  miss:            require('../assets/audio/voice/igorfina/cuaaaeezy.mp3'),    // "Cuaaaeezy..."
};
// O erro pode voltar mais cedo que as outras falas, mas nunca em todo exercício.
const MISS_COOLDOWN_MS = 5 * 60_000;

// Cooldowns (ms)
const GLOBAL_COOLDOWN_MS = 90_000;       // nenhuma voz toca antes de 90s da ultima
const PER_ID_COOLDOWN_MS = 30 * 60_000;  // mesma frase nao repete por 30min

class VoiceSFXEngine {
  private muted = false;
  private lastPlayedAt = 0;
  private lastPlayedAtById = new Map<VoiceSfxId, number>();
  private character: VoiceCharacter = 'charlotte';

  setMuted(m: boolean) { this.muted = m; }

  /** Quem fala: a trilha do Igorfina usa os bordões dele (ver IGORFINA). */
  setCharacter(c: VoiceCharacter) { this.character = c; }
  getCharacter(): VoiceCharacter { return this.character; }

  /** Toca uma interjeicao. Retorna false se foi bloqueado por cooldown/prefs. */
  async play(id: VoiceSfxId): Promise<boolean> {
    if (this.muted) return false;
    if (!getAudioPreferences().voice) return false;

    const now = Date.now();
    if (now - this.lastPlayedAt < GLOBAL_COOLDOWN_MS) return false;
    const lastForId = this.lastPlayedAtById.get(id) ?? 0;
    if (now - lastForId < (id === 'miss' ? MISS_COOLDOWN_MS : PER_ID_COOLDOWN_MS)) return false;

    try {
      const source = this.character === 'igorfina' ? IGORFINA[id] : BUNDLED[id];
      if (!source) return false;

      // NAO mudamos interruptionMode aqui (mesma razao do soundEngine):
      // o SFX deve herdar o modo do screen, nao forcar mixWithOthers global.
      const player = createAudioPlayer(source);
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

  /** No-op — assets ja bundled. Mantido para compat com chamada no _layout. */
  async preload(): Promise<void> { /* assets bundled at build time */ }
}

export const voiceSFX = new VoiceSFXEngine();
