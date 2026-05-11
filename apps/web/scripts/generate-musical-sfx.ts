#!/usr/bin/env npx tsx
// scripts/generate-musical-sfx.ts
// Baixa SFX musicais profissionais do Mixkit (CC0, sem atribuicao) e
// normaliza loudness via ffmpeg-static.
//
// Decisao de design: ElevenLabs Sound Effects (AI generativa) NAO entrega
// qualidade UI consistente — picos erraticos (-0 a -35 dB), timbres anos 80,
// inconsistencia entre runs. Mixkit entrega samples de estudio reais usados
// em apps comerciais. ElevenLabs fica APENAS para a voz da Charlotte (Tier 4).
//
// Uso: npx tsx scripts/generate-musical-sfx.ts
//      npx tsx scripts/generate-musical-sfx.ts --normalize-only

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import https from 'https';

const SFX_DIR = path.join(__dirname, '..', 'public', 'tts', 'sfx');

// ── Catalogo curado do Mixkit ────────────────────────────────────────────────
// Cada entrada: nome final do arquivo + ID Mixkit + titulo + variantes.
// URL pattern: https://assets.mixkit.co/active_storage/sfx/{ID}/{ID}-preview.mp3

interface Entry {
  id: string;            // nome do arquivo de saida (sem .mp3)
  mixkitId: number;      // ID numerico do Mixkit
  title: string;         // titulo descritivo (Mixkit)
  targetDb: number;      // pico-alvo apos normalizacao
}

const CATALOG: Entry[] = [
  // ── Quiz feedback (alta repeticao — 3 variantes correct + 2 wrong) ─────────
  { id: 'answer_correct_v1', mixkitId: 2870, title: 'Correct answer tone',           targetDb: -3 },
  { id: 'answer_correct_v2', mixkitId:  957, title: 'Correct positive notification', targetDb: -3 },
  { id: 'answer_correct_v3', mixkitId: 2015, title: 'Winning chimes',                targetDb: -3 },
  { id: 'answer_wrong_v1',   mixkitId: 2569, title: 'Negative tone interface tap',   targetDb: -7 },
  { id: 'answer_wrong_v2',   mixkitId:  946, title: 'Wrong answer fail notification', targetDb: -7 },

  // ── Achievements (escalada de intensidade) ─────────────────────────────────
  { id: 'achievement_common',    mixkitId:  600, title: 'Achievement bell',          targetDb: -3 },
  { id: 'achievement_rare',      mixkitId: 2820, title: 'Magic marimba',             targetDb: -3 },
  { id: 'achievement_epic',      mixkitId: 2344, title: 'Magic notification ring',   targetDb: -3 },
  { id: 'achievement_legendary', mixkitId:  658, title: 'Choir magic shine',         targetDb: -3 },

  // ── Marcos da trilha + eventos diarios ─────────────────────────────────────
  { id: 'streak_alive',     mixkitId: 1107, title: 'Page forward single chime',          targetDb: -3 },
  { id: 'daily_goal',       mixkitId: 2059, title: 'Game level completed',               targetDb: -3 },
  { id: 'topic_complete',   mixkitId: 2992, title: 'Jubilant fanfare music tones',       targetDb: -3 },
  { id: 'module_complete',  mixkitId: 2633, title: 'Sweeping sparkle presentation intro', targetDb: -3 },
];

// ── ffmpeg ───────────────────────────────────────────────────────────────────

function getFfmpegPath(): string {
  const root = path.resolve(__dirname, '../../..');
  const bin  = path.join(root, 'node_modules', 'ffmpeg-static', 'ffmpeg');
  if (!fs.existsSync(bin)) throw new Error(`ffmpeg-static not found at ${bin}`);
  return bin;
}

function detectPeakDb(file: string, ffmpeg: string): number | null {
  try {
    execSync(`"${ffmpeg}" -i "${file}" -af volumedetect -vn -sn -dn -f null /dev/null 2>&1`, { stdio: 'pipe' });
    return null;
  } catch (e: any) {
    const stderr = (e.stdout?.toString() ?? '') + (e.stderr?.toString() ?? '');
    const m = stderr.match(/max_volume:\s*(-?\d+\.?\d*)\s*dB/);
    return m ? parseFloat(m[1]) : null;
  }
}

function normalizeToPeak(file: string, targetDb: number, ffmpeg: string): void {
  const peak = detectPeakDb(file, ffmpeg);
  if (peak === null) { console.warn(`  norm  ${path.basename(file)}: could not detect peak`); return; }
  const gain = targetDb - peak;
  if (Math.abs(gain) < 0.5) { console.log(`  norm  ${path.basename(file)}: ${peak}dB (skip, ja proximo de ${targetDb})`); return; }
  const tmp = `${file}.tmp.mp3`;
  execSync(
    `"${ffmpeg}" -y -i "${file}" -af "volume=${gain}dB" -codec:a libmp3lame -b:a 96k "${tmp}"`,
    { stdio: 'ignore' },
  );
  fs.renameSync(tmp, file);
  console.log(`  norm  ${path.basename(file)}: ${peak}dB -> ${targetDb}dB (+${gain.toFixed(1)}dB)`);
}

// ── Download ─────────────────────────────────────────────────────────────────

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode} for ${url}`)); return; }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    }).on('error', err => { fs.unlink(dest, () => reject(err)); });
  });
}

async function fetchAndNormalize(entry: Entry, outDir: string, ffmpeg: string): Promise<void> {
  const outPath = path.join(outDir, `${entry.id}.mp3`);
  if (fs.existsSync(outPath) && !process.env.FORCE) {
    console.log(`  skip  ${entry.id} (use FORCE=1 to re-download)`);
    return;
  }
  const url = `https://assets.mixkit.co/active_storage/sfx/${entry.mixkitId}/${entry.mixkitId}-preview.mp3`;
  console.log(`  get   ${entry.id} <- mixkit#${entry.mixkitId} "${entry.title}"`);
  await download(url, outPath);
  const size = fs.statSync(outPath).size;
  console.log(`  ok    ${entry.id}.mp3 (${Math.round(size / 1024)}KB)`);
  normalizeToPeak(outPath, entry.targetDb, ffmpeg);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(SFX_DIR, { recursive: true });
  const ffmpeg = getFfmpegPath();

  if (process.argv.includes('--normalize-only')) {
    console.log('── Normalize-only mode (no downloads) ─────────────');
    for (const entry of CATALOG) {
      const file = path.join(SFX_DIR, `${entry.id}.mp3`);
      if (fs.existsSync(file)) normalizeToPeak(file, entry.targetDb, ffmpeg);
    }
    console.log('\nDone.');
    return;
  }

  console.log('── Musical SFX (Mixkit, CC0) ──────────────────────');
  console.log(`Output: ${SFX_DIR}`);
  console.log('Set FORCE=1 to re-download existing files.\n');

  for (const entry of CATALOG) {
    try {
      await fetchAndNormalize(entry, SFX_DIR, ffmpeg);
    } catch (e: any) {
      console.error(`  ERROR ${entry.id}: ${e.message}`);
    }
  }

  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
