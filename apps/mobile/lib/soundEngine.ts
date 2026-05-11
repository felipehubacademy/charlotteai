// lib/soundEngine.ts
// Sistema de sons para feedbacks de XP, conquistas, streak e evolução.
//
// Design goals (inspirado no Duolingo):
//   • Sons curtos (< 800ms), ascendentes = reforço positivo imediato
//   • Síntese PCM pura — sem arquivos de áudio, sem dependências extras
//   • Overtones (harmônicos) para timbre rico tipo "xilofone/vibraphone"
//   • Envelope ADSR realista: ataque rápido, decay suave, release longo
//   • Singleton — pode ser chamado de hooks e código não-React
//
// Uso:
//   import { soundEngine } from '@/lib/soundEngine';
//   await soundEngine.play('xp_gained');

import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import { getAudioPreferences } from './audioPreferences';

// ── Constantes ────────────────────────────────────────────────────────────────

const SR = 24000; // sample rate (Hz)

export type SoundName =
  | 'xp_gained'
  | 'achievement_common'
  | 'achievement_rare'
  | 'achievement_epic'
  | 'achievement_legendary'
  | 'streak_alive'
  | 'daily_goal'
  | 'answer_correct'
  | 'answer_wrong';

// ── Síntese: nota com harmônicos + ADSR ──────────────────────────────────────

interface NoteSpec {
  freq: number;     // Hz — frequência fundamental
  durMs: number;    // duração total da nota (ms)
  amp: number;      // amplitude 0..1
  harmonics?: number; // quantos harmônicos (default 3)
  attackMs?: number;  // rampa de subida (default 6ms)
  releaseMs?: number; // fade-out ao final (default 40ms)
}

function synthesizeNote(note: NoteSpec): Float32Array {
  const {
    freq,
    durMs,
    amp,
    harmonics = 3,
    attackMs  = 6,
    releaseMs = 45,
  } = note;

  const totalSamples = Math.floor((durMs / 1000) * SR);
  const attackSamps  = Math.floor((attackMs  / 1000) * SR);
  const releaseSamps = Math.floor((releaseMs / 1000) * SR);
  const buf = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SR;

    // Oscilador multi-harmônico (fundamental + overtones)
    // Overtone k: amplitude = amp * (1 / (k+1)), freqência = freq * (k+1)
    let sample = 0;
    for (let k = 0; k < harmonics; k++) {
      const partial = (1 / (k + 1));
      sample += partial * Math.sin(2 * Math.PI * freq * (k + 1) * t);
    }
    // Normalizar soma dos parciais
    const normFactor = harmonics > 1
      ? harmonics / (harmonics * (harmonics + 1) / 2) // inverso da soma 1/k
      : 1;
    sample *= amp * normFactor * 1.4; // boost compensatório

    // Envelope ADSR simplificado (attack → decay → release)
    let envelope = 1;
    if (i < attackSamps) {
      envelope = i / attackSamps; // ramp up
    } else if (i >= totalSamples - releaseSamps) {
      envelope = (totalSamples - i) / releaseSamps; // fade out
    } else {
      // Decay leve: de 1.0 até 0.7 ao longo do sustain
      const sustainStart  = attackSamps;
      const sustainEnd    = totalSamples - releaseSamps;
      const pos = (i - sustainStart) / (sustainEnd - sustainStart);
      envelope = 1 - pos * 0.3;
    }

    buf[i] = Math.max(-1, Math.min(1, sample * envelope));
  }

  return buf;
}

// ── Melodias ──────────────────────────────────────────────────────────────────
// Notas standard: C4=261, E4=329, G4=392, A4=440, C5=523, E5=659, G5=784,
//                 A5=880, C6=1047, E6=1319

const NOTES: Record<string, number> = {
  C4: 261.63, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00,
  B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46,
  G5: 784.00, A5: 880.00, B5: 987.77, C6: 1046.50, E6: 1318.51,
};

type Melody = NoteSpec[];

const MELODIES: Record<SoundName, Melody> = {
  // ── XP gained: dois tons rápidos e ascendentes (tipo "coin" Duolingo) ──────
  xp_gained: [
    { freq: NOTES.E5, durMs:  70, amp: 0.28, harmonics: 2, attackMs: 4, releaseMs: 30 },
    { freq: NOTES.A5, durMs: 110, amp: 0.30, harmonics: 2, attackMs: 4, releaseMs: 55 },
  ],

  // ── Achievement common: fanfara simples 3 notas ───────────────────────────
  achievement_common: [
    { freq: NOTES.C5, durMs:  95, amp: 0.30, harmonics: 3, attackMs: 5, releaseMs: 35 },
    { freq: NOTES.E5, durMs:  95, amp: 0.30, harmonics: 3, attackMs: 5, releaseMs: 35 },
    { freq: NOTES.G5, durMs: 160, amp: 0.32, harmonics: 3, attackMs: 5, releaseMs: 70 },
  ],

  // ── Achievement rare: 4 notas, harmônicos ricos ───────────────────────────
  achievement_rare: [
    { freq: NOTES.G4, durMs: 100, amp: 0.28, harmonics: 4, attackMs: 6, releaseMs: 40 },
    { freq: NOTES.C5, durMs: 100, amp: 0.30, harmonics: 4, attackMs: 6, releaseMs: 40 },
    { freq: NOTES.E5, durMs: 100, amp: 0.30, harmonics: 4, attackMs: 6, releaseMs: 40 },
    { freq: NOTES.C6, durMs: 200, amp: 0.33, harmonics: 4, attackMs: 8, releaseMs: 90 },
  ],

  // ── Achievement epic: fanfara ascendente com crescendo ────────────────────
  achievement_epic: [
    { freq: NOTES.C5, durMs: 110, amp: 0.28, harmonics: 4, attackMs: 7, releaseMs: 40 },
    { freq: NOTES.E5, durMs: 110, amp: 0.30, harmonics: 4, attackMs: 7, releaseMs: 40 },
    { freq: NOTES.G5, durMs: 110, amp: 0.33, harmonics: 4, attackMs: 7, releaseMs: 40 },
    { freq: NOTES.C6, durMs: 240, amp: 0.38, harmonics: 5, attackMs: 9, releaseMs:110 },
  ],

  // ── Achievement legendary: fanfara épica 5 notas (máximo impacto) ─────────
  achievement_legendary: [
    { freq: NOTES.C5, durMs: 120, amp: 0.30, harmonics: 5, attackMs: 8,  releaseMs:  45 },
    { freq: NOTES.E5, durMs: 120, amp: 0.32, harmonics: 5, attackMs: 8,  releaseMs:  45 },
    { freq: NOTES.G5, durMs: 120, amp: 0.35, harmonics: 5, attackMs: 8,  releaseMs:  45 },
    { freq: NOTES.C6, durMs: 150, amp: 0.38, harmonics: 5, attackMs: 8,  releaseMs:  60 },
    { freq: NOTES.E6, durMs: 300, amp: 0.42, harmonics: 5, attackMs: 10, releaseMs: 140 },
  ],

  // ── Streak alive: três notas quentes e staccato ───────────────────────────
  streak_alive: [
    { freq: NOTES.F4, durMs:  80, amp: 0.28, harmonics: 3, attackMs: 4, releaseMs: 30 },
    { freq: NOTES.A4, durMs:  80, amp: 0.30, harmonics: 3, attackMs: 4, releaseMs: 30 },
    { freq: NOTES.C5, durMs: 130, amp: 0.32, harmonics: 3, attackMs: 5, releaseMs: 60 },
  ],

  // ── Daily goal: melodia celebratória ascendente ───────────────────────────
  daily_goal: [
    { freq: NOTES.C5, durMs:  95, amp: 0.30, harmonics: 4, attackMs: 6, releaseMs: 35 },
    { freq: NOTES.G5, durMs:  95, amp: 0.32, harmonics: 4, attackMs: 6, releaseMs: 35 },
    { freq: NOTES.E5, durMs:  95, amp: 0.32, harmonics: 4, attackMs: 6, releaseMs: 35 },
    { freq: NOTES.G5, durMs:  95, amp: 0.35, harmonics: 4, attackMs: 6, releaseMs: 35 },
    { freq: NOTES.C6, durMs: 240, amp: 0.40, harmonics: 4, attackMs: 8, releaseMs:110 },
  ],

  // ── Answer correct: "ding-ding" rápido e ascendente ──────────────────────
  // Mais curto e discreto que xp_gained — não compete com o feedback visual
  answer_correct: [
    { freq: NOTES.G5, durMs:  45, amp: 0.24, harmonics: 2, attackMs: 3, releaseMs: 22 },
    { freq: NOTES.C6, durMs:  80, amp: 0.26, harmonics: 2, attackMs: 3, releaseMs: 45 },
  ],

  // ── Answer wrong: "bwomp" descendente, grave e curto ─────────────────────
  // Deve comunicar "errado" sem ser punitivo — baixo, macio, breve
  answer_wrong: [
    { freq: NOTES.E4, durMs:  55, amp: 0.22, harmonics: 1, attackMs: 3, releaseMs: 28 },
    { freq: NOTES.C4, durMs: 100, amp: 0.20, harmonics: 1, attackMs: 3, releaseMs: 60 },
  ],
};

// ── WAV builder (44-byte header + PCM16 data) ─────────────────────────────────

function buildMelodyWav(melody: Melody): string {
  // 1. Síntese de cada nota com crossfade de 8ms entre elas
  const CROSSFADE_MS = 8;
  const crossfadeSamps = Math.floor((CROSSFADE_MS / 1000) * SR);

  const noteBuffers = melody.map(synthesizeNote);

  // Calcular comprimento total com overlap
  let totalSamples = 0;
  for (let i = 0; i < noteBuffers.length; i++) {
    totalSamples += noteBuffers[i].length;
    if (i < noteBuffers.length - 1) totalSamples -= crossfadeSamps; // overlap
  }
  totalSamples = Math.max(0, totalSamples);

  const mixed = new Float32Array(totalSamples);
  let offset = 0;

  for (let i = 0; i < noteBuffers.length; i++) {
    const buf = noteBuffers[i];
    for (let j = 0; j < buf.length; j++) {
      const pos = offset + j;
      if (pos < totalSamples) {
        mixed[pos] += buf[j];
      }
    }
    offset += buf.length - crossfadeSamps;
  }

  // 2. Limitar a -1..1
  for (let i = 0; i < mixed.length; i++) {
    mixed[i] = Math.max(-1, Math.min(1, mixed[i]));
  }

  // 3. Converter Float32 → PCM16 little-endian
  const pcm16 = new Uint8Array(mixed.length * 2);
  for (let i = 0; i < mixed.length; i++) {
    const s = Math.max(-32768, Math.min(32767, Math.round(mixed[i] * 32767)));
    pcm16[i * 2]     =  s & 0xFF;
    pcm16[i * 2 + 1] = (s >> 8) & 0xFF;
  }

  // 4. WAV header
  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  const ch = 1, bps = 16;
  [0x52,0x49,0x46,0x46].forEach((b,i) => v.setUint8(i, b));
  v.setUint32(4, 36 + pcm16.length, true);
  [0x57,0x41,0x56,0x45].forEach((b,i) => v.setUint8(8+i, b));
  [0x66,0x6D,0x74,0x20].forEach((b,i) => v.setUint8(12+i, b));
  v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, ch, true); v.setUint32(24, SR, true);
  v.setUint32(28, SR * ch * (bps/8), true);
  v.setUint16(32, ch * (bps/8), true); v.setUint16(34, bps, true);
  [0x64,0x61,0x74,0x61].forEach((b,i) => v.setUint8(36+i, b));
  v.setUint32(40, pcm16.length, true);

  // 5. Montar WAV completo
  const wav = new Uint8Array(44 + pcm16.length);
  wav.set(new Uint8Array(header));
  wav.set(pcm16, 44);

  // 6. base64
  const CHUNK = 0x8000;
  let bin = '';
  for (let i = 0; i < wav.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, wav.subarray(i, i + CHUNK) as any);
  }
  return btoa(bin);
}

// ── SoundEngine class ─────────────────────────────────────────────────────────

class SoundEngine {
  private uriCache = new Map<SoundName, string>(); // soundName → file URI
  private muted    = false;

  /** Silencia todos os sons (ex: durante Live Voice). */
  setMuted(m: boolean) { this.muted = m; }

  /** Toca um som. Fire-and-forget. */
  async play(name: SoundName): Promise<void> {
    if (this.muted) return;

    // xp_gained agora e SOMENTE haptico (decisao de design: toca dezenas de vezes
    // por sessao, som vira ruido. Os call sites ja disparam Haptics.Success).
    if (name === 'xp_gained') return;

    // Respeita preferencia do usuario.
    if (!getAudioPreferences().sfx) return;

    try {
      const uri = await this.getUri(name);

      // Respeita o modo silencioso do device para SFX (diferente do TTS da
      // Charlotte, que continua tocando no silent mode via useMessageAudioPlayer).
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: false,
        interruptionMode: 'mixWithOthers',
      }).catch(() => {});

      const player = createAudioPlayer({ uri });

      // Pitch variation para evitar fadiga auditiva em sons de alta frequencia.
      // answer_correct/wrong tocam dezenas de vezes — variar ±2 semitons (rate
      // 0.89..1.12) faz cada play soar levemente diferente.
      if (name === 'answer_correct' || name === 'answer_wrong') {
        try {
          const semitones = (Math.random() * 4 - 2); // -2..+2
          const rate = Math.pow(2, semitones / 12);   // 0.891..1.122
          // expo-audio: setPlaybackRate(rate, pitchCorrection?)
          (player as any).setPlaybackRate?.(rate, false);
        } catch {}
      }

      player.play();
      // Para voz da Charlotte: máx 2s. Para PCM sintetizado: duração estimada + folga.
      const maxDur = uri.includes('sfx_voice_') ? 2000 : this.estimatePcmDurMs(name) + 600;
      setTimeout(() => {
        try { player.pause(); player.remove(); } catch {}
      }, maxDur);
    } catch (e) {
      console.warn('[SoundEngine] play error:', e);
    }
  }

  private estimatePcmDurMs(name: SoundName): number {
    const melody = MELODIES[name];
    return melody.reduce((sum, n) => sum + n.durMs, 0);
  }

  // Tenta baixar o MP3 da voz da Charlotte do CDN.
  // Retorna o URI local em cache, ou null se indisponível (404 / offline).
  private async tryVoiceUri(name: SoundName): Promise<string | null> {
    const localUri = `${FileSystem.cacheDirectory}sfx_voice_${name}.mp3`;

    const info = await FileSystem.getInfoAsync(localUri).catch(() => ({ exists: false }));
    if (info.exists) return localUri;

    try {
      const API_BASE = (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined)
        ?? 'https://charlotte.hubacademybr.com';
      const result = await FileSystem.downloadAsync(
        `${API_BASE}/tts/sfx/${name}.mp3`,
        localUri,
      );
      if (result.status === 200) return localUri;
      // Arquivo não existe no servidor — limpa e cai no fallback PCM
      await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
      return null;
    } catch {
      return null;
    }
  }

  private async getUri(name: SoundName): Promise<string> {
    const cached = this.uriCache.get(name);
    if (cached) return cached;

    // Prefere voz da Charlotte; fallback para síntese PCM
    const voiceUri = await this.tryVoiceUri(name);
    const uri = voiceUri ?? await this.synthUri(name);

    this.uriCache.set(name, uri);
    return uri;
  }

  private async synthUri(name: SoundName): Promise<string> {
    const base64 = buildMelodyWav(MELODIES[name]);
    const uri    = `${FileSystem.cacheDirectory}sfx_${name}.wav`;
    await FileSystem.writeAsStringAsync(uri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return uri;
  }

  /** Pré-gera e faz cache de todos os sons (chamar no splash/boot). */
  async preload(): Promise<void> {
    const names: SoundName[] = [
      'xp_gained',
      'achievement_common',
      'achievement_rare',
      'achievement_epic',
      'achievement_legendary',
      'streak_alive',
      'daily_goal',
      'answer_correct',
      'answer_wrong',
    ];
    await Promise.all(names.map(n => this.getUri(n).catch(() => {})));
  }
}

export const soundEngine = new SoundEngine();
