#!/usr/bin/env npx tsx
// scripts/generate-musical-sfx.ts
// Gera SFX musicais (NAO-vocais) para o app via ElevenLabs Sound Effects API.
// Identidade sonora: marimba/xilofone + sinos suaves, paleta em DO MAIOR (C major).
//
// Uso: ELEVENLABS_API_KEY=xxx npx tsx scripts/generate-musical-sfx.ts
//
// Saida: public/tts/sfx/{name}.mp3
// Endpoint: POST https://api.elevenlabs.io/v1/sound-generation

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY ?? '';
const SFX_DIR = path.join(__dirname, '..', 'public', 'tts', 'sfx');

// ── Prompt design ────────────────────────────────────────────────────────────
// Cada SFX e descrito em ingles tecnico-musical: instrumento + duracao + tom.
// Mantemos a paleta coesa: marimba/glockenspiel + soft chime + warm pad reverb.

interface SfxPrompt {
  id: string;
  durationSeconds: number; // 0.5 .. 22 (limite da API)
  promptInfluence: number; // 0..1 — quanto seguir o prompt vs criatividade
  text: string;
}

const SFX: SfxPrompt[] = [
  // ── Tier 2 — feedback de quiz (50×/sessao) ───────────────────────────────
  // VARIANTES com rotacao em runtime + pitch/volume jitter para evitar fadiga.
  // Engenharia baseada em: Duolingo F#5->A#5 (terca maior), Mario B5->E6,
  // iOS Tri-tone (P5+oitava). Attack <10ms, decay <300ms, sem reverb longo.

  // CORRECT — 3 variantes (mallet, bell, synth pluck)
  {
    id: 'answer_correct_v1',
    durationSeconds: 0.6,
    promptInfluence: 0.75,
    text:
      'Short, bright, two-note ascending marimba chime struck with a hard mallet, ' +
      'pitched high around 800Hz to 1200Hz, very fast sharp transient, ' +
      'short controlled decay, dry, no reverb tail, punchy and prominent, ' +
      'mobile app UI confirmation success sound effect, foreground, professional, ' +
      'rewarding satisfying micro-feedback. NO voice, NO speech, NO drums.',
  },
  {
    id: 'answer_correct_v2',
    durationSeconds: 0.7,
    promptInfluence: 0.75,
    text:
      'Crisp three-note ascending kalimba arpeggio in a major key, ' +
      'bell-like metallic timbre with bright sparkle in upper harmonics around 4kHz, ' +
      'fast attack, short controlled decay, subtle natural resonance, no reverb, ' +
      'under one second total, mobile app notification chime, clean, ' +
      'high-end UI success sound effect. NO voice, NO speech.',
  },
  {
    id: 'answer_correct_v3',
    durationSeconds: 0.6,
    promptInfluence: 0.75,
    text:
      'Quick two-note ascending plucked synth bell, glassy bright timbre with ' +
      'shimmering high overtones around 4 to 6kHz, very fast attack, short percussive decay, ' +
      'no reverb tail, energetic and rewarding, retro arcade coin-pickup feel ' +
      'but modern, clean and dry, mobile game UI success sound effect, punchy.',
  },

  // WRONG — 2 variantes (thunk + dismissive pop)
  {
    id: 'answer_wrong_v1',
    durationSeconds: 0.5,
    promptInfluence: 0.8,
    text:
      'Short soft muted low thunk, dampened wooden bonk in the low-mid frequency ' +
      'range around 200Hz to 300Hz, fast attack, very short decay, no pitch movement, ' +
      'no reverb, clearly audible but gentle and non-alarming, mobile app ' +
      'incorrect-answer feedback sound, neutral and dismissive, NOT harsh, NOT buzzy, ' +
      'NOT a beep. NO voice, NO speech, NO distortion.',
  },
  {
    id: 'answer_wrong_v2',
    durationSeconds: 0.5,
    promptInfluence: 0.8,
    text:
      'Short soft low pop like a finger flicking a closed cardboard box, ' +
      'very brief muffled thud, fast attack and fast decay, low-mid frequency content ' +
      'around 250Hz, no high sparkle, no reverb, clearly audible but unobtrusive, ' +
      'mobile UI feedback sound for a minor negative event, neutral and gentle. ' +
      'NO voice, NO speech, NO buzzer.',
  },

  // Tier 3 — eventos macro (cinematograficos, ate ~1.5s)
  {
    id: 'streak_alive',
    durationSeconds: 1.2,
    promptInfluence: 0.75,
    text:
      'Warm glockenspiel chime: three ascending notes in C major (F4-A4-C5), ' +
      'soft attack, mellow reverb, cozy morning bell feel. ' +
      'NO voice, NO speech. Inviting "welcome back" app UI sound.',
  },
  {
    id: 'daily_goal',
    durationSeconds: 1.5,
    promptInfluence: 0.75,
    text:
      'Celebratory marimba and bell fanfare in C major: ascending arpeggio ' +
      'C5-E5-G5-C6, ending with a sparkling chime, warm reverb, joyful but not loud. ' +
      'NO voice, NO speech. Mobile app reward sound.',
  },
  {
    id: 'achievement_common',
    durationSeconds: 1.0,
    promptInfluence: 0.75,
    text:
      'Gentle achievement chime: marimba C5-E5-G5 in C major, soft sparkle, ' +
      'short reverb tail. NO voice, NO speech. Modest reward sound for a learning app.',
  },
  {
    id: 'achievement_rare',
    durationSeconds: 1.3,
    promptInfluence: 0.75,
    text:
      'Bright achievement: marimba and glockenspiel ascending in C major ' +
      '(G4-C5-E5-C6), with a soft shimmer at the end, warm reverb. ' +
      'NO voice, NO speech. Pleasant reward sound.',
  },
  {
    id: 'achievement_epic',
    durationSeconds: 1.8,
    promptInfluence: 0.75,
    text:
      'Epic but warm achievement fanfare in C major: ascending marimba arpeggio ' +
      'C5-E5-G5-C6 with crescendo and sparkle bells, soft orchestral pad underneath, ' +
      'lush reverb. NO voice, NO speech, NO trumpets. Premium app reward.',
  },
  {
    id: 'achievement_legendary',
    durationSeconds: 2.2,
    promptInfluence: 0.8,
    text:
      'Cinematic legendary reward in C major: ascending bells and marimba ' +
      '(C5-E5-G5-C6-E6) with shimmer, soft choir pad and warm strings underneath, ' +
      'long lush reverb tail. NO voice, NO speech. Mobile game ultimate reward sound.',
  },

  // Marcos da trilha de aprendizado
  {
    id: 'topic_complete',
    durationSeconds: 1.4,
    promptInfluence: 0.75,
    text:
      'Bright topic-complete fanfare in C major: marimba and glockenspiel ' +
      'ascending C5-E5-G5-C6 with a final sparkle, short warm reverb. ' +
      'NO voice, NO speech. Pleasant lesson-finished sound for a learning app.',
  },
  {
    id: 'module_complete',
    durationSeconds: 2.0,
    promptInfluence: 0.8,
    text:
      'Triumphant module-complete celebration in C major: ascending marimba ' +
      'and bell arpeggio C5-E5-G5-C6-E6 with crescendo, soft choir pad and ' +
      'warm strings underneath, sparkling shimmer at the end, lush reverb tail. ' +
      'NO voice, NO speech. Bigger than a single topic but warm, not cinematic.',
  },

  // xp_gained NAO esta aqui — decidido em product: vira somente haptico.
];

// ── Normalizacao (ffmpeg-static) ──────────────────────────────────────────────
// ElevenLabs Sound Effects entrega arquivos com peak variavel (-0 a -35 dB).
// Normalizamos para target consistente sempre apos gerar.
// Targets baseados em UX research (correct vs wrong tem delta de 4 dB).

function getFfmpegPath(): string {
  // ffmpeg-static esta no node_modules na raiz do monorepo
  const root = path.resolve(__dirname, '../../..');
  const bin  = path.join(root, 'node_modules', 'ffmpeg-static', 'ffmpeg');
  if (!fs.existsSync(bin)) throw new Error(`ffmpeg-static not found at ${bin}`);
  return bin;
}

function detectPeakDb(file: string, ffmpeg: string): number | null {
  try {
    const out = execSync(
      `"${ffmpeg}" -i "${file}" -af volumedetect -vn -sn -dn -f null /dev/null`,
      { stdio: ['ignore', 'pipe', 'pipe'] },
    ).toString() + execSync(
      `"${ffmpeg}" -i "${file}" -af volumedetect -vn -sn -dn -f null /dev/null 2>&1 || true`,
      { stdio: ['ignore', 'pipe', 'pipe'] },
    ).toString();
    const m = out.match(/max_volume:\s*(-?\d+\.?\d*)\s*dB/);
    return m ? parseFloat(m[1]) : null;
  } catch {
    // ffmpeg writes to stderr; capture differently
    try {
      const stderr = execSync(
        `"${ffmpeg}" -i "${file}" -af volumedetect -vn -sn -dn -f null /dev/null 2>&1`,
        { stdio: 'pipe' },
      ).toString();
      const m = stderr.match(/max_volume:\s*(-?\d+\.?\d*)\s*dB/);
      return m ? parseFloat(m[1]) : null;
    } catch (e: any) {
      const stderr = (e.stdout?.toString() ?? '') + (e.stderr?.toString() ?? '');
      const m = stderr.match(/max_volume:\s*(-?\d+\.?\d*)\s*dB/);
      return m ? parseFloat(m[1]) : null;
    }
  }
}

function normalizeToPeak(file: string, targetDb: number, ffmpeg: string): void {
  const peak = detectPeakDb(file, ffmpeg);
  if (peak === null) { console.warn(`  norm  ${path.basename(file)}: could not detect peak`); return; }
  const gain = targetDb - peak;
  if (Math.abs(gain) < 0.5) { console.log(`  norm  ${path.basename(file)}: already at ${peak}dB (skip)`); return; }
  const tmp = `${file}.tmp.mp3`;
  execSync(
    `"${ffmpeg}" -y -i "${file}" -af "volume=${gain}dB" -codec:a libmp3lame -b:a 96k "${tmp}"`,
    { stdio: 'ignore' },
  );
  fs.renameSync(tmp, file);
  console.log(`  norm  ${path.basename(file)}: ${peak}dB -> ${targetDb}dB (+${gain.toFixed(1)}dB)`);
}

// Target por categoria de som
function targetDbFor(id: string): number {
  if (id.startsWith('answer_wrong')) return -7; // 4 dB abaixo do correct (UX consensus)
  return -3;                                     // alto, punchy — sweet spot para UI
}

// ── Core ──────────────────────────────────────────────────────────────────────

async function generateSfx(spec: SfxPrompt, outputDir: string): Promise<void> {
  const outPath = path.join(outputDir, `${spec.id}.mp3`);
  if (fs.existsSync(outPath) && !process.env.FORCE) {
    console.log(`  skip  ${spec.id} (use FORCE=1 to regenerate)`);
    return;
  }
  console.log(`  gen   ${spec.id} (${spec.durationSeconds}s) — "${spec.text.slice(0, 70)}..."`);

  if (!ELEVENLABS_KEY) {
    console.error('  ERROR: ELEVENLABS_API_KEY not set');
    return;
  }

  const res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text: spec.text,
      duration_seconds: spec.durationSeconds,
      prompt_influence: spec.promptInfluence,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  ERROR ${spec.id}: ${res.status} — ${err}`);
    return;
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buffer);
  console.log(`  ok    ${spec.id}.mp3 (${Math.round(buffer.length / 1024)}KB)`);

  // Auto-normalizacao (ElevenLabs Sound Effects entrega peaks erraticos)
  try {
    const ffmpeg = getFfmpegPath();
    normalizeToPeak(outPath, targetDbFor(spec.id), ffmpeg);
  } catch (e: any) {
    console.warn(`  WARN: skipping normalization for ${spec.id}: ${e.message}`);
  }
}

async function main() {
  fs.mkdirSync(SFX_DIR, { recursive: true });

  // Modo "normalize only" — re-aplica normalizacao em todos os MP3s existentes
  // sem chamar a API. Util quando algum arquivo ficou baixo demais.
  // Uso: npx tsx scripts/generate-musical-sfx.ts --normalize-only
  if (process.argv.includes('--normalize-only')) {
    console.log('── Normalize-only mode (no API calls) ─────────────');
    const ffmpeg = getFfmpegPath();
    const files = fs.readdirSync(SFX_DIR).filter(f => f.endsWith('.mp3'));
    for (const f of files) {
      // Deriva o ID do nome do arquivo para escolher o target
      const id = f.replace('.mp3', '');
      normalizeToPeak(path.join(SFX_DIR, f), targetDbFor(id), ffmpeg);
    }
    console.log('\nDone.');
    return;
  }

  console.log('── Musical SFX (ElevenLabs Sound Effects) ─────────');
  console.log(`Output: ${SFX_DIR}`);
  console.log('Set FORCE=1 to overwrite existing files.\n');

  for (const spec of SFX) {
    await generateSfx(spec, SFX_DIR);
    await new Promise(r => setTimeout(r, 600));
  }

  console.log('\nDone.');
}

main().catch(console.error);
