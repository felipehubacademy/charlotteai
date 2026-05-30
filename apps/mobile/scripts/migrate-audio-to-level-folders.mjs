#!/usr/bin/env node
/**
 * migrate-audio-to-level-folders.mjs (one-shot)
 *
 * Move audios existentes de ls/{hash}.flac para ls/{level}/{hash}.flac
 * no Supabase Storage e atualiza audio-manifest.json com as novas URLs.
 *
 * Como ate hoje so geramos Novice, todas as entradas vao pra ls/novice/.
 * Cross-check: para cada hash no manifest, verifica em qual level(s) o
 * texto aparece nos JSONs compilados; se aparece em multiplos, escolhe
 * o primeiro encontrado (Novice prioridade).
 *
 * Idempotente: se file ja foi movido, ignora.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../../..');
const OUT  = path.join(REPO, 'apps/mobile/data/curriculum-v2');
const MANIFEST_PATH = path.join(OUT, 'audio-manifest.json');

const BUCKET = 'curriculum-audio';
const PREFIX = 'ls';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function ttsHash(text) {
  return crypto.createHash('sha1').update(text.trim().toLowerCase()).digest('hex').slice(0, 16);
}

function buildHashToLevel() {
  const map = {};
  for (const level of ['novice', 'inter', 'advanced']) {
    const dir = path.join(OUT, level);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
      const mod = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      for (const unit of mod.units) {
        for (const phrase of unit.listening_speaking ?? []) {
          const h = ttsHash(phrase.text);
          if (!map[h]) map[h] = level;  // first wins
        }
      }
    }
  }
  return map;
}

async function move(sourceKey, destKey) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/move`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ bucketId: BUCKET, sourceKey, destinationKey: destKey }),
  });
  if (res.status === 200) return 'moved';
  const body = await res.text();
  if (body.includes('not found') || body.includes('does not exist')) return 'source_missing';
  if (body.includes('already exists') || body.includes('Duplicate')) return 'already_at_dest';
  throw new Error(`move ${sourceKey} -> ${destKey}: ${res.status} ${body}`);
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERRO: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const manifest    = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const hashToLevel = buildHashToLevel();
  const updated     = {};
  const entries     = Object.entries(manifest);

  console.log(`Migrando ${entries.length} entradas...`);
  let migrated = 0, alreadyOK = 0, missing = 0;

  for (const [hash, oldUrl] of entries) {
    const level = hashToLevel[hash];
    if (!level) {
      // orphan (phrase removida do curriculum) — mantem como esta
      updated[hash] = oldUrl;
      continue;
    }
    const newPath = `${PREFIX}/${level}/${hash}.flac`;
    const newUrl  = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${newPath}`;

    if (oldUrl === newUrl) {
      updated[hash] = newUrl;
      alreadyOK++;
      continue;
    }

    // Extrai source key da oldUrl (apos /public/curriculum-audio/)
    const m = oldUrl.match(/\/public\/curriculum-audio\/(.+)$/);
    if (!m) { console.warn(`skip malformed url: ${oldUrl}`); updated[hash] = oldUrl; continue; }
    const sourceKey = m[1];

    try {
      const status = await move(sourceKey, newPath);
      if (status === 'moved' || status === 'already_at_dest') {
        updated[hash] = newUrl;
        migrated++;
        console.log(`OK  [${migrated}] ${sourceKey} -> ${newPath}`);
      } else if (status === 'source_missing') {
        updated[hash] = oldUrl;
        missing++;
        console.warn(`MISS [${missing}] ${sourceKey} nao encontrado`);
      }
    } catch (e) {
      console.error(`ERR ${sourceKey}: ${e.message}`);
      updated[hash] = oldUrl;
    }
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(updated, null, 2) + '\n');
  console.log(`\nDone. Migrated=${migrated} already_ok=${alreadyOK} missing=${missing}`);
  console.log(`Agora rode: node apps/mobile/scripts/compile-curriculum-v2.mjs`);
}

main().catch(e => { console.error(e); process.exit(1); });
