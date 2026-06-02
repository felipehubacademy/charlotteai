// lib/soundEngine.ts
// Sistema de SFX musicais com assets BUNDLED no app (zero CDN, zero latencia).
//
// Arquitetura:
//   - Todos os MP3s estao em apps/mobile/assets/audio/sfx/ e sao incluidos
//     no bundle pelo Metro via require() estatico.
//   - Sem download, sem cache de FileSystem, sem PCM synth fallback.
//     OTA via EAS Update leva novos assets junto do JS bundle.
//   - Variantes (answer_correct tem 3, answer_wrong tem 2) rotacionam
//     aleatoriamente sem repetir consecutivo (anti-fadiga).
//
// Uso:
//   import { soundEngine } from '@/lib/soundEngine';
//   await soundEngine.play('answer_correct');

import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { getAudioPreferences } from './audioPreferences';
import { voiceSFX } from './voiceSFX';

export type SoundName =
  | 'xp_gained'
  | 'achievement_common'
  | 'achievement_rare'
  | 'achievement_epic'
  | 'achievement_legendary'
  | 'streak_alive'
  | 'daily_goal'
  | 'answer_correct'
  | 'answer_wrong'
  | 'topic_complete'
  | 'module_complete'
  | 'level_promotion'
  | 'intro_app';

// ── Catalogo de assets bundled ───────────────────────────────────────────────
// Cada SoundName mapeia para 1+ variantes (number = id de modulo Metro).
// xp_gained NAO esta aqui — eh no-op puramente haptico (vide play()).

const BUNDLED: Partial<Record<SoundName, number[]>> = {
  answer_correct: [
    require('../assets/audio/sfx/answer_correct_v1.mp3'),
    require('../assets/audio/sfx/answer_correct_v3.mp3'),
    // v2 removido 2026-06-01 (soava mais como erro que acerto).
  ],
  answer_wrong: [
    require('../assets/audio/sfx/answer_wrong_v1.mp3'),
    require('../assets/audio/sfx/answer_wrong_v2.mp3'),
  ],
  achievement_common:    [require('../assets/audio/sfx/achievement_common.mp3')],
  achievement_rare:      [require('../assets/audio/sfx/achievement_rare.mp3')],
  achievement_epic:      [require('../assets/audio/sfx/achievement_epic.mp3')],
  achievement_legendary: [require('../assets/audio/sfx/achievement_legendary.mp3')],
  streak_alive:          [require('../assets/audio/sfx/streak_alive.mp3')],
  // Decisao do user 2026-06-01:
  // - level_promotion (subir de nivel Novice→Inter etc) usa daily_goal.mp3,
  //   que tem a vibe mais epica do catalogo.
  // - daily_goal e module_complete agora usam topic_complete.mp3 — celebram
  //   sem cansar (eventos recorrentes).
  daily_goal:            [require('../assets/audio/sfx/topic_complete.mp3')],
  topic_complete:        [require('../assets/audio/sfx/topic_complete.mp3')],
  module_complete:       [require('../assets/audio/sfx/topic_complete.mp3')],
  level_promotion:       [require('../assets/audio/sfx/daily_goal.mp3')],
  intro_app:             [require('../assets/audio/sfx/intro_app.mp3')],
};

// ── Engine ───────────────────────────────────────────────────────────────────

class SoundEngine {
  private muted = false;
  private consecCorrect = 0;
  private lastVariantIdx = new Map<SoundName, number>();

  /** Silencia todos os sons (ex: durante Live Voice). */
  setMuted(m: boolean) { this.muted = m; }

  /** Reseta o contador de acertos consecutivos. Chamar ao iniciar uma sessao. */
  resetStreak() { this.consecCorrect = 0; }

  /** Atualiza contador e dispara interjeicoes Tier 4 nos marcos.
   *  Voz cai com delay APOS o SFX terminar (~1s) para nao colidir audio. */
  private trackStreak(name: SoundName) {
    if (name === 'answer_correct') {
      this.consecCorrect += 1;
      const id =
        this.consecCorrect === 3  ? 'streak_3'  :
        this.consecCorrect === 5  ? 'streak_5'  :
        this.consecCorrect === 10 ? 'streak_10' : null;
      if (id) setTimeout(() => voiceSFX.play(id).catch(() => {}), 1100);
    } else if (name === 'answer_wrong') {
      this.consecCorrect = 0;
    }
  }

  /** Sorteia variante evitando repetir a anterior (anti-fadiga auditiva). */
  private pickVariantIdx(name: SoundName, count: number): number {
    if (count < 2) return 0;
    const last = this.lastVariantIdx.get(name) ?? -1;
    let idx: number;
    do { idx = Math.floor(Math.random() * count); } while (idx === last);
    this.lastVariantIdx.set(name, idx);
    return idx;
  }

  /** Toca um som. Fire-and-forget. */
  async play(name: SoundName): Promise<void> {
    if (this.muted) return;

    // xp_gained agora e SOMENTE haptico (decisao de design: toca dezenas de
    // vezes por sessao, som vira ruido. Os call sites ja disparam Haptics.Success).
    if (name === 'xp_gained') return;

    // Tier 4 — voz da Charlotte com delays calibrados (nao colidir com SFX).
    // Roda ANTES do gate de prefs.sfx porque tem sua propria preferencia (prefs.voice).
    this.trackStreak(name);
    if (name === 'daily_goal') {
      setTimeout(() => voiceSFX.play('daily_goal').catch(() => {}), 1600);
    } else if (name === 'topic_complete') {
      setTimeout(() => voiceSFX.play('topic_complete').catch(() => {}), 1500);
    } else if (name === 'module_complete') {
      setTimeout(() => voiceSFX.play('module_complete').catch(() => {}), 2100);
    }

    if (!getAudioPreferences().sfx) return;

    const variants = BUNDLED[name];
    if (!variants || variants.length === 0) return;

    try {
      const source = variants[this.pickVariantIdx(name, variants.length)];

      // NAO mudamos o interruptionMode aqui. Antes setavamos mixWithOthers
      // pra SFX mixar com musica externa, mas isso quebrava o doNotMix das
      // licoes (Spotify voltava a tocar entre audio da Charlotte e SFX de
      // resposta). Agora o SFX herda o modo atual do screen — licoes em
      // doNotMix, home/rank/etc em mixWithOthers (default ambient).
      const player = createAudioPlayer(source);
      player.play();

      // Cleanup do player apos a duracao maxima esperada (intro_app ~3s e o mais longo)
      setTimeout(() => {
        try { player.pause(); player.remove(); } catch {}
      }, 3500);
    } catch (e) {
      console.warn('[SoundEngine] play error:', e);
    }
  }

  /** No-op — assets ja bundled, nada pra preload. Mantido para compat. */
  async preload(): Promise<void> { /* assets bundled at build time */ }

  /**
   * Limpa caches de SFX da era pre-bundle (FileSystem.cacheDirectory).
   * Roda no boot uma unica vez para devices que vem de versoes antigas.
   * Quando o usuario atualiza, esses arquivos viram lixo no cache.
   */
  async cleanLegacyCache(): Promise<void> {
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) return;
    try {
      const files = await FileSystem.readDirectoryAsync(cacheDir).catch(() => [] as string[]);
      const legacy = files.filter(f =>
        (f.startsWith('sfx_') || f.startsWith('voicesfx_')) &&
        (f.endsWith('.mp3') || f.endsWith('.wav'))
      );
      await Promise.all(legacy.map(f =>
        FileSystem.deleteAsync(`${cacheDir}${f}`, { idempotent: true }).catch(() => {})
      ));
    } catch {}
  }
}

export const soundEngine = new SoundEngine();
