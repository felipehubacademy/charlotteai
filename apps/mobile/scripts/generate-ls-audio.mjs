#!/usr/bin/env node
/**
 * generate-ls-audio.mjs
 *
 * Pre-gera audio (OpenAI TTS coral/flac) para todas as LSPhrase do
 * Curriculum v2 que ainda nao tem entrada em audio-manifest.json e
 * sobe pro bucket curriculum-audio no Supabase Storage.
 *
 * Workflow:
 *   1. Rode compile-curriculum-v2.mjs antes (gera JSONs)
 *   2. Rode este script
 *   3. Rode compile-curriculum-v2.mjs DE NOVO (vai stampar audio_url no JSON)
 *   4. Commit dos JSONs + audio-manifest.json atualizados
 *
 * Envs necessarias (carregue do .env.local do apps/web):
 *   OPENAI_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node apps/mobile/scripts/generate-ls-audio.mjs
 *   node apps/mobile/scripts/generate-ls-audio.mjs --only=novice/M01
 *   node apps/mobile/scripts/generate-ls-audio.mjs --dry-run
 *   node apps/mobile/scripts/generate-ls-audio.mjs --force      (regera tudo)
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../../..');
const OUT  = path.join(REPO, 'apps/mobile/data/curriculum-v2');
const MANIFEST_PATH = path.join(OUT, 'audio-manifest.json');

const args    = process.argv.slice(2);
const ONLY    = (args.find(a => a.startsWith('--only=')) || '').slice(7);
const DRY     = args.includes('--dry-run');
const FORCE   = args.includes('--force');

const BUCKET  = 'curriculum-audio';
const PREFIX  = 'ls';           // bucket path prefix
const VOICE   = 'coral';
const FORMAT  = 'flac';
const MODEL   = 'gpt-4o-mini-tts';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;

function ttsHash(text) {
  return crypto.createHash('sha1').update(text.trim().toLowerCase()).digest('hex').slice(0, 16);
}

function collectPhrases() {
  const out = [];
  const levels = ['novice', 'inter', 'advanced'];
  for (const level of levels) {
    const dir = path.join(OUT, level);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
      if (ONLY && !`${level}/${file.replace('.json', '')}`.includes(ONLY)) continue;
      const mod = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      for (const unit of mod.units) {
        for (const phrase of unit.listening_speaking ?? []) {
          out.push({
            level, moduleId: mod.id, unitId: unit.id,
            text: phrase.text, hash: ttsHash(phrase.text),
          });
        }
      }
    }
  }
  return out;
}

async function ttsOpenAI(text) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ model: MODEL, input: text, voice: VOICE, response_format: FORMAT }),
  });
  if (!res.ok) throw new Error(`OpenAI TTS ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadSupabase(filename, buffer) {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${PREFIX}/${filename}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  `audio/${FORMAT}`,
      'x-upsert':      'true',
    },
    body: buffer,
  });
  if (!res.ok) throw new Error(`Supabase upload ${res.status}: ${await res.text()}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${PREFIX}/${filename}`;
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return {};
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function saveManifest(m) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(m, null, 2) + '\n');
}

async function main() {
  if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERRO: defina OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const phrases  = collectPhrases();
  const manifest = loadManifest();
  const seen     = new Set();
  const missing  = phrases.filter(p => {
    if (seen.has(p.hash)) return false;   // dedup
    seen.add(p.hash);
    return FORCE || !manifest[p.hash];
  });

  console.log(`Total LS phrases: ${phrases.length} (deduped: ${seen.size})`);
  console.log(`Missing audio: ${missing.length}`);
  if (DRY) {
    missing.slice(0, 20).forEach(p => console.log(`  ${p.level}/${p.moduleId}/${p.unitId} :: "${p.text}"`));
    if (missing.length > 20) console.log(`  ... +${missing.length - 20} mais`);
    return;
  }
  if (missing.length === 0) {
    console.log('Nada a gerar.');
    return;
  }

  // Custo aproximado pra ciencia
  const totalChars = missing.reduce((s, p) => s + p.text.length, 0);
  console.log(`Custo estimado OpenAI TTS: ~$${((totalChars / 1000) * 0.015).toFixed(3)} (${totalChars} chars)`);

  let i = 0;
  for (const p of missing) {
    i++;
    try {
      const buf      = await ttsOpenAI(p.text);
      const filename = `${p.hash}.${FORMAT}`;
      const url      = await uploadSupabase(filename, buf);
      manifest[p.hash] = url;
      saveManifest(manifest);  // salva incremental — seguro pra crash mid-run
      console.log(`OK  [${i}/${missing.length}] ${p.level}/${p.moduleId}/${p.unitId} "${p.text.slice(0, 40)}" -> ${filename}`);
    } catch (e) {
      console.error(`ERR [${i}/${missing.length}] "${p.text.slice(0, 40)}": ${e.message}`);
    }
  }

  console.log(`\nFeito. Agora rode: node apps/mobile/scripts/compile-curriculum-v2.mjs`);
}

main().catch(e => { console.error(e); process.exit(1); });
