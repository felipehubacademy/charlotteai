#!/usr/bin/env npx tsx
// scripts/generate-voice-sfx.ts
// Gera interjeicoes vocais da Charlotte (Tier 4 do mapa sonoro).
// Curtas, expressivas, com cooldown agressivo no client (vide voiceSFX.ts).
//
// Uso: ELEVENLABS_API_KEY=xxx npx tsx scripts/generate-voice-sfx.ts
//
// Saida: public/tts/sfx_voice/{id}.mp3 (servido como CDN estatico)

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY ?? '';
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel
const OUT_DIR = path.join(__dirname, '..', 'public', 'tts', 'sfx_voice');

// IDs precisam casar com VoiceSfxId em apps/mobile/lib/voiceSFX.ts
const SFX: { id: string; text: string }[] = [
  { id: 'streak_3',              text: 'Nice!'              },
  { id: 'streak_5',              text: "You're on fire!"    },
  { id: 'streak_10',             text: 'Incredible!'        },
  { id: 'welcome_back',          text: 'Welcome back!'      },
  { id: 'daily_goal',            text: 'Yes!'               },
  { id: 'achievement_epic',      text: 'Wow!'               },
  { id: 'achievement_legendary', text: 'Legendary!'         },
  { id: 'streak_7_days',         text: 'Seven days strong!' },
  { id: 'streak_30_days',        text: 'Thirty days!'       },
  { id: 'topic_complete',        text: 'Topic done!'        },
  { id: 'module_complete',       text: 'Module complete!'   },
];

async function gen(id: string, text: string): Promise<void> {
  const outPath = path.join(OUT_DIR, `${id}.mp3`);
  if (fs.existsSync(outPath) && !process.env.FORCE) {
    console.log(`  skip  ${id} (use FORCE=1 to regenerate)`);
    return;
  }
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
        stability:         0.30,  // mais variacao = mais entusiasmo
        similarity_boost:  0.85,
        style:             0.70,  // entrega emocional alta
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const e = await res.text();
    console.error(`  ERROR ${id}: ${res.status} — ${e}`);
    return;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
  console.log(`  ok    ${id}.mp3 (${Math.round(buf.length / 1024)}KB)`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('── Voice interjections (Tier 4 — Charlotte) ───────');
  console.log(`Output: ${OUT_DIR}`);
  console.log('Set FORCE=1 to overwrite existing files.\n');
  for (const s of SFX) {
    await gen(s.id, s.text);
    await new Promise(r => setTimeout(r, 400));
  }
  console.log('\nDone.');
}

main().catch(console.error);
