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
  // Tier 2 — feedback de quiz (curtissimo, < 400ms apos trim)
  {
    id: 'answer_correct',
    durationSeconds: 0.6,
    promptInfluence: 0.75,
    text:
      'Soft warm marimba: two quick ascending notes in C major (G5 to C6), ' +
      'gentle attack, light reverb tail, NO voice, NO speech, NO drums. ' +
      'Pleasant satisfying feedback chime, app UI sound.',
  },
  {
    id: 'answer_wrong',
    durationSeconds: 0.6,
    promptInfluence: 0.8,
    text:
      'Soft muted wooden thunk: short low note in C major (around E4 to C4), ' +
      'gentle non-punitive feel, very brief, dry, NO voice, NO speech, NO buzzer, NO harsh beep. ' +
      'Subtle error feedback for a friendly learning app.',
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
}

async function main() {
  fs.mkdirSync(SFX_DIR, { recursive: true });

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
