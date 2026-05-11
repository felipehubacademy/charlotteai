#!/usr/bin/env npx tsx
// scripts/generate-sfx-tts.ts
// Gera SFX vocais curtos da Charlotte (Yes!, Nice!, Well done!, etc.)
// via ElevenLabs e salva em public/tts/sfx/.
//
// Uso: ELEVENLABS_API_KEY=xxx npx tsx scripts/generate-sfx-tts.ts

import fs from 'fs';
import path from 'path';

const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY ?? '';
const VOICE_ID       = '21m00Tcm4TlvDq8ikWAM'; // Rachel
const SFX_DIR        = path.join(__dirname, '..', 'public', 'tts', 'sfx');

// ── SFX — feedback curto com a voz da Charlotte ───────────────────────────────

const SFX: { id: string; text: string }[] = [
  { id: 'xp_gained',             text: 'Yes!'         },
  { id: 'answer_correct',        text: 'Nice!'        },
  { id: 'answer_wrong',          text: 'Close!'       },
  { id: 'achievement_common',    text: 'Well done!'   },
  { id: 'achievement_rare',      text: 'Impressive!'  },
  { id: 'achievement_epic',      text: 'Amazing!'     },
  { id: 'achievement_legendary', text: 'Outstanding!' },
  { id: 'streak_alive',          text: 'Keep going!'  },
  { id: 'daily_goal',            text: 'You did it!'  },
];

// ── Core ──────────────────────────────────────────────────────────────────────

// SFX: direto no ElevenLabs com stability 0.30 + style 0.65 — entrega emocional alta
async function generateSfxDirect(id: string, text: string, outputDir: string): Promise<void> {
  const outPath = path.join(outputDir, `${id}.mp3`);
  if (fs.existsSync(outPath)) { console.log(`  skip  ${id}`); return; }
  console.log(`  gen   ${id} — "${text}"`);

  if (!ELEVENLABS_KEY) { console.error('  ERROR: ELEVENLABS_API_KEY not set'); return; }

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability:         0.30,  // mais variação = mais expressivo
        similarity_boost:  0.85,  // mantém a voz da Rachel
        style:             0.65,  // entrega emocional alta — chave para entusiasmo
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) { const e = await res.text(); console.error(`  ERROR ${id}: ${res.status} — ${e}`); return; }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buffer);
  console.log(`  ok    ${id}.mp3 (${Math.round(buffer.length / 1024)}KB)`);
}

async function main() {
  fs.mkdirSync(SFX_DIR, { recursive: true });

  console.log('── SFX (entusiasmado) ───────────────────────');
  for (const s of SFX) {
    await generateSfxDirect(s.id, s.text, SFX_DIR);
    await new Promise(r => setTimeout(r, 400));
  }

  console.log('\nDone.');
}

main().catch(console.error);
