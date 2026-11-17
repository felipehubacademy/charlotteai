#!/usr/bin/env node
// Trecho de teste dos bonecos (Charlotte e Igor) na rua, com as vozes já gravadas da aula novice-01.
//   node scripts/aula-motion/personagens/render-rua.mjs [--stills]
// Saída: docs/content/aula-motion/personagens/bonecos-teste.mp4 (e quadros PNG com --stills)
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(new URL("../../..", import.meta.url).pathname);
const AULA = join(ROOT, "docs/content/aula-motion/novice-01");
const OUT = join(ROOT, "docs/content/aula-motion/personagens");
mkdirSync(OUT, { recursive: true });
const FPS = 30;
const STILLS = process.argv.includes("--stills");
const aula = JSON.parse(readFileSync(join(AULA, "aula.json"), "utf8"));
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());

function envelope(file) {
  const pcm = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], { maxBuffer: 1 << 26 });
  const s = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2);
  const per = 16000 / FPS, raw = [];
  for (let f = 0; f * per < s.length; f++) { const i = Math.round(f * per), n = Math.min(Math.round(per), s.length - i); let a = 0; for (let j = 0; j < n; j++) a += s[i + j] ** 2; raw.push(Math.sqrt(a / Math.max(1, n))); }
  const peak = [...raw].sort((a, b) => a - b)[Math.floor(raw.length * 0.9)] || 1;
  return raw.map((r) => +Math.min(1, Math.max(0, (r / peak - 0.15) / 0.75)).toFixed(3));
}

// linha do tempo: a Charlotte fala com o aluno, o Igor chega, os dois conversam
const ids = ["l01", "l02", "l03", "l04"];
let t = 0.6; const lines = [], amp = {}; let igorIn = 0;
for (const id of ids) {
  const l = aula.lines.find((x) => x.id === id);
  const file = join(AULA, "audio", id + ".mp3");
  if (id === "l02") { igorIn = t + 0.2; t += 1.4; }
  const d = dur(file);
  lines.push({ id, speaker: l.speaker, text: l.text, pt: l.pt, lang: l.lang, start: +t.toFixed(3), end: +(t + d).toFixed(3), file });
  amp[id] = envelope(file);
  t += d + (id === "l01" ? 0 : 0.35);
}
const total = t + 1.0;

const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
await page.goto(pathToFileURL(join(ROOT, "scripts/aula-motion/personagens/rua.html")).href);
await page.evaluate(() => document.fonts.ready);
await page.evaluate((d) => window.setup(d), { lines, amp, fps: FPS, igorIn });

if (STILLS) {
  for (const s of [1.2, 2.6, igorIn + 0.6, lines[1].start + 0.6, lines[2].start + 0.6, lines[3].start + 0.3]) {
    await page.evaluate((x) => window.seek(x), s);
    await page.screenshot({ path: join(OUT, `bonecos-${s.toFixed(1)}.png`) });
    if (process.env.DBG) console.log(s, await page.evaluate(() => [...document.querySelectorAll(".head")].map((e) => e.getAttribute("transform"))));
  }
  await browser.close();
  process.exit(0);
}

const mix = join(ROOT, "scripts/aula-motion/.cache/bonecos-mix.wav");
mkdirSync(join(ROOT, "scripts/aula-motion/.cache"), { recursive: true });
const inputs = lines.flatMap((l) => ["-i", l.file]);
const filt = lines.map((l, i) => `[${i}:a]adelay=${Math.round(l.start * 1000)}|${Math.round(l.start * 1000)}[a${i}]`).join(";") +
  ";" + lines.map((_, i) => `[a${i}]`).join("") + `amix=inputs=${lines.length}:normalize=0,apad,atrim=0:${total.toFixed(2)}[out]`;
execFileSync("ffmpeg", ["-y", "-v", "error", ...inputs, "-filter_complex", filt, "-map", "[out]", "-ac", "1", "-ar", "44100", mix]);

const mp4 = join(OUT, "bonecos-teste.mp4");
const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-i", mix,
  "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "21", "-c:a", "aac", "-b:a", "96k", "-shortest", mp4],
  { stdio: ["pipe", "inherit", "inherit"] });
for (let f = 0; f < Math.round(total * FPS); f++) {
  await page.evaluate((x) => window.seek(x), f / FPS);
  const buf = await page.screenshot({ type: "jpeg", quality: 92 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close();
console.log(mp4, total.toFixed(2) + " s");
