#!/usr/bin/env node
// Gera audio das linhas NPC scripted das units do curriculum v2 via ElevenLabs
// e faz upload pro Supabase Storage bucket `curriculum-audio`.
//
// Uso:
//   ELEVENLABS_API_KEY=xxx \
//   NEXT_PUBLIC_SUPABASE_URL=https://... \
//   SUPABASE_SERVICE_ROLE_KEY=xxx \
//     node scripts/generate-scripted-audio.mjs docs/curriculum/v2/novice/M01-ola-mundo.md
//
// Idempotente: se o objeto ja existe no bucket, skipa (--force pra recriar).

import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
const { createClient } = require('@supabase/supabase-js');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET        = 'curriculum-audio';
const FORCE         = process.argv.includes('--force');

// Mesmo mapping do LLM-mode role-play (apps/web/app/api/roleplay/turn/route.ts):
// charlotte → coral (feminina, calorosa) | charlie → onyx (masculina, quente)
const VOICES = {
  charlotte: { id: 'coral', name: 'coral' },
  charlie:   { id: 'onyx',  name: 'onyx'  },
};

if (!OPENAI_API_KEY)   { console.error('Falta OPENAI_API_KEY'); process.exit(1); }
if (!SUPABASE_URL)     { console.error('Falta NEXT_PUBLIC_SUPABASE_URL'); process.exit(1); }
if (!SERVICE_ROLE_KEY) { console.error('Falta SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some(b => b.name === BUCKET)) return;
  console.log(`Criando bucket "${BUCKET}" (public)...`);
  const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
  if (error) throw error;
}

const MD_PATH = process.argv[2];
if (!MD_PATH) { console.error('Uso: node generate-scripted-audio.mjs <md>'); process.exit(1); }

async function ttsOpenAI(text, voice) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice,
      input: text,
      response_format: 'mp3',
    }),
  });
  if (!res.ok) throw new Error(`OpenAI TTS ${res.status}: ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

async function uploadToStorage(audioPath, buffer) {
  // Tenta upload; se ja existe e !FORCE, pula.
  const { error: existsErr } = await supabase.storage.from(BUCKET).download(audioPath);
  if (!existsErr && !FORCE) return { skipped: true };

  const { error } = await supabase.storage.from(BUCKET).upload(audioPath, buffer, {
    contentType: 'audio/mpeg',
    upsert: true,
  });
  if (error) throw error;
  return { skipped: false };
}

function publicUrl(audioPath) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(audioPath);
  return data.publicUrl;
}

function extractScriptedBlocks(md) {
  // Acha cada ```yaml ... scripted: true ... ``` no markdown.
  const re = /```yaml\s*\n([\s\S]*?)\n```/g;
  const blocks = [];
  let m;
  while ((m = re.exec(md)) !== null) {
    const txt = m[1];
    if (!/scripted:\s*true/.test(txt)) continue;
    try {
      const parsed = yaml.load(txt);
      if (parsed?.scripted === true) blocks.push(parsed);
    } catch (e) {
      console.warn('YAML invalido em um bloco scripted — pulando');
    }
  }
  return blocks;
}

function inferVoiceFromAudioPath(audioPath, mdContext) {
  // Conv: m{X}/n{Y}/{roleplay|chat}/...
  // Roleplay+Chat alternam voice por unit. Pra POC, inferimos do contexto:
  // - se path tem "/roleplay/" → olha o "Voiced by" mais proximo no markdown
  // - mesmo pra "/chat/"
  // Simplificacao: dado o template, role-play de N01 = charlotte (Ana),
  // chat de N01 = charlie (Tom). Mas qualquer unit pode variar.
  // Estrategia: o bloco scripted pode declarar `voice: charlotte | charlie`.
  // Se nao declarar, inferimos do path/contexto. Por seguranca, exigimos no schema.
  return null;
}

async function main() {
  await ensureBucket();
  const md = await fs.readFile(MD_PATH, 'utf8');
  const blocks = extractScriptedBlocks(md);
  console.log(`Encontrei ${blocks.length} blocos scripted em ${MD_PATH}`);

  let totalUploaded = 0, totalSkipped = 0;

  for (const block of blocks) {
    const lines = block.npc_lines ?? {};
    // Voice: o schema do bloco aceita `voice:`; senao tentamos inferir pelo path.
    const blockVoice = block.voice;

    for (const [lineId, line] of Object.entries(lines)) {
      if (!line.text || !line.audio) {
        console.warn(`  ⏭  line ${lineId} sem text/audio, pulando`);
        continue;
      }
      // Voice OBRIGATORIA no bloco scripted. Sem isso, falha ruidosamente
      // — heuristica por path era erro-prone (poderia gravar voz errada
      // se a unit mudar de personagem na role-play vs chat).
      const voiceKey = blockVoice;
      if (!voiceKey || !VOICES[voiceKey]) {
        console.error(`  ❌ line ${lineId}: declare "voice: charlotte" ou "voice: charlie" no bloco scripted`);
        continue;
      }
      const voice = VOICES[voiceKey];

      process.stdout.write(`  [${voice.name}] ${lineId}: "${line.text.slice(0, 60)}..." → `);
      try {
        const audio = await ttsOpenAI(line.text, voice.id);
        const { skipped } = await uploadToStorage(line.audio, audio);
        if (skipped) {
          console.log('skip (ja existe)');
          totalSkipped++;
        } else {
          console.log(`ok (${(audio.length/1024).toFixed(1)}KB) → ${publicUrl(line.audio)}`);
          totalUploaded++;
        }
      } catch (e) {
        console.log(`FAIL: ${e.message}`);
      }
    }
  }

  console.log(`\nResumo: ${totalUploaded} uploaded, ${totalSkipped} skipped.`);
  console.log(`Use --force pra regenerar tudo.`);
}

main().catch(e => { console.error(e); process.exit(1); });
