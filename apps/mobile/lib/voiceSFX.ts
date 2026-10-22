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
import * as SecureStore from 'expo-secure-store';

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

// Trilha do Igorfina: os bordões dele no lugar das falas da Charlotte. Gravados pelo Igor (22/10/2026),
// exceto crazy / thats_crazy / cuaaaeezy (voz dele no ElevenLabs). Lista = alterna a cada vez que toca.
// O que não tem versão dele fica em silêncio.
export type VoiceCharacter = 'charlotte' | 'igorfina';
const IG = {
  crazy:       require('../assets/audio/voice/igorfina/crazy.mp3'),        // "CRAZY!"
  sliced:      require('../assets/audio/voice/igorfina/sliced.mp3'),       // "Sliced!" (gravado)
  thatsCrazy:  require('../assets/audio/voice/igorfina/thats_crazy.mp3'),  // "That is CRAZY, my friend!"
  cuaaaeezy:   require('../assets/audio/voice/igorfina/cuaaaeezy.mp3'),    // "Cuaaaeezy..."
  queizy1:     require('../assets/audio/voice/igorfina/queizy_1.mp3'),     // "Queizy!" (gravado)
  queizy2:     require('../assets/audio/voice/igorfina/queizy_2.mp3'),     // "Queizy!" mais longo (gravado)
  ohMan:       require('../assets/audio/voice/igorfina/oh_man.mp3'),       // "Oh man!" (gravado)
  uncrumble:   require('../assets/audio/voice/igorfina/uncrumble.mp3'),    // "Uncrumble" = o "Incredible!" dele (gravado)
};
const IGORFINA: Partial<Record<VoiceSfxId, number | number[]>> = {
  streak_3:        [IG.crazy, IG.queizy1],
  streak_5:        IG.sliced,
  streak_10:       IG.uncrumble,
  topic_complete:  IG.sliced,
  module_complete: IG.thatsCrazy,
  miss:            [IG.cuaaaeezy, IG.ohMan],
};
// Abertura do app com o Igorfina escolhido na Família: uma fala por abertura, em rodízio
// (os dois "Queizy" separados para não repetir em aberturas seguidas).
const IGOR_OPENING: number[] = [IG.queizy1, IG.ohMan, IG.queizy2, IG.sliced, IG.uncrumble];
const IGOR_OPENING_KEY = 'igor_opening_idx';
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
  private turnById = new Map<VoiceSfxId, number>();

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
      const entry = this.character === 'igorfina' ? IGORFINA[id] : BUNDLED[id];
      if (!entry) return false;
      // Lista: alterna a cada vez que toca.
      let source: number;
      if (Array.isArray(entry)) {
        const n = this.turnById.get(id) ?? 0;
        source = entry[n % entry.length];
        this.turnById.set(id, n + 1);
      } else source = entry;

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

  /** Fala do Igor na abertura do app (Igorfina escolhido na Família), em rodízio entre aberturas.
   *  Respeita o mudo e a preferência de voz, mas não entra no cooldown das outras falas. */
  async playIgorOpening(): Promise<number> {
    if (this.muted || !getAudioPreferences().voice) return 0;
    try {
      const raw = await SecureStore.getItemAsync(IGOR_OPENING_KEY).catch(() => null);
      const idx = (Number(raw) || 0) % IGOR_OPENING.length;
      await SecureStore.setItemAsync(IGOR_OPENING_KEY, String((idx + 1) % IGOR_OPENING.length)).catch(() => {});
      const player = createAudioPlayer(IGOR_OPENING[idx]);
      player.play();
      setTimeout(() => { try { player.pause(); player.remove(); } catch {} }, 4000);
      return IGOR_OPENING[idx] === IG.ohMan ? 3400 : 1400; // duração aproximada, para empurrar as falas seguintes
    } catch (e) {
      console.warn('[VoiceSFX] opening error:', e);
      return 0;
    }
  }

  /** No-op — assets ja bundled. Mantido para compat com chamada no _layout. */
  async preload(): Promise<void> { /* assets bundled at build time */ }
}

export const voiceSFX = new VoiceSFXEngine();
