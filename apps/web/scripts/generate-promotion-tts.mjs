// Gera 2 audios de promocao com voz coral (Charlotte) + instructions emocional.
// Output: scripts/output/promotion-novice-to-inter.mp3
//         scripts/output/promotion-inter-to-advanced.mp3
//
// Uso: node apps/web/scripts/generate-promotion-tts.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carrega .env.local da raiz
const envLocal = path.join(__dirname, '..', '..', '..', '.env.local');
if (fs.existsSync(envLocal)) {
  for (const line of fs.readFileSync(envLocal, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing');

// Instructions ricas: emocao ceremonial + warmth da Charlotte como professora orgulhosa.
const EMOTIONAL_INSTRUCTIONS = `
Voice: A proud teacher cheering for a student. Warm, bright, energetic.
Tone: BRISK and triumphant. Sound like you are smiling and slightly bouncing on
your feet with excitement. This is a cheer, NOT a slow ceremonial speech.
Delivery: Each phrase should land quick and confident. Hit "proud" / "incredibly
proud" with emphasis, but keep moving. The "welcome to <Level>" must be SNAPPY —
like throwing open a door, not gently opening it. Final word lands triumphant
and clean — no stretching, no lingering vowels.
Pace: FAST conversational rhythm. Do NOT stretch any word. Do NOT add long
pauses. Slight breath between sentences only. Total feel: under 5 seconds.
Emotion: Joy, pride, genuine excitement. Light and lifted, not heavy or solemn.
`.trim();

const SCRIPTS = [
  {
    file: 'promotion-novice-to-inter.mp3',
    text: "Congratulations! I'm so proud of you — welcome to Intermediate.",
    label: 'Novice → Intermediate',
  },
  {
    file: 'promotion-inter-to-advanced.mp3',
    text: "You did it! I'm incredibly proud. Welcome to Advanced!",
    label: 'Intermediate → Advanced',
  },
];

async function generate({ file, text, label }) {
  console.log(`\n[${label}]`);
  console.log(`  Text: "${text}"`);

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: 'coral',
      input: text,
      instructions: EMOTIONAL_INSTRUCTIONS,
      response_format: 'mp3',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI ${res.status}: ${err}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const outDir = path.join(__dirname, 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, file);
  fs.writeFileSync(outPath, buf);
  console.log(`  ✓ ${outPath} (${(buf.length / 1024).toFixed(1)}KB)`);
}

for (const s of SCRIPTS) {
  await generate(s);
}

console.log('\nDone. Abra a pasta de output e ouca:');
console.log(`  open ${path.join(__dirname, 'output')}`);
