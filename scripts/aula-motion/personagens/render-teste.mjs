#!/usr/bin/env node
// Trecho de teste do boneco: a Charlotte falando a abertura da aula (voz já gravada, nada é gerado).
//   node scripts/aula-motion/personagens/render-teste.mjs  ->  docs/content/aula-motion/personagens/charlotte-teste.mp4
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(new URL("../../..", import.meta.url).pathname);
const AULA = join(ROOT, "docs/content/aula-motion/novice-01");
const OUT = join(ROOT, "docs/content/aula-motion/personagens");
mkdirSync(OUT, { recursive: true });
const FPS = 30, VOICE_AT = 0.5;
const audio = join(AULA, "audio/l01.mp3");
const text = JSON.parse(readFileSync(join(AULA, "aula.json"), "utf8")).lines.find((l) => l.id === "l01").text;

// envelope da voz por quadro (RMS), normalizado e com ataque rápido e soltura mais lenta
const pcm = execFileSync("ffmpeg", ["-v", "error", "-i", audio, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], { maxBuffer: 1 << 26 });
const s = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2);
const per = 16000 / FPS, raw = [];
for (let i = 0; i < s.length; i += per) { let a = 0; const n = Math.min(per, s.length - i); for (let j = 0; j < n; j++) a += s[i + j] ** 2; raw.push(Math.sqrt(a / n)); }
const peak = [...raw].sort((a, b) => a - b)[Math.floor(raw.length * 0.95)];
const env = []; let v = 0;
for (const r of raw) { const x = Math.min(1, Math.max(0, (r / peak - 0.12) / 0.88)); v = x > v ? v + (x - v) * 0.7 : v + (x - v) * 0.35; env.push(+v.toFixed(3)); }
const dur = raw.length / FPS + VOICE_AT + 1.0;

const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
await page.goto(pathToFileURL(join(ROOT, "scripts/aula-motion/personagens/teste.html")).href);
await page.evaluate(() => document.fonts.ready);
await page.evaluate((d) => window.setup(d), { env, fps: FPS, voiceAt: VOICE_AT, text });

const mp4 = join(OUT, "charlotte-teste.mp4");
const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
  "-itsoffset", String(VOICE_AT), "-i", audio, "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-pix_fmt", "yuv420p",
  "-crf", "22", "-c:a", "aac", "-b:a", "96k", "-t", dur.toFixed(2), mp4], { stdio: ["pipe", "inherit", "inherit"] });
const N = Math.round(dur * FPS);
for (let f = 0; f < N; f++) {
  await page.evaluate((t) => window.seek(t), f / FPS);
  const buf = await page.screenshot({ type: "jpeg", quality: 92 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (process.env.QUADROS && [15, 40, 100, 175].includes(f)) await page.screenshot({ path: join(OUT, `charlotte-quadro-${f}.png`) });
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close();
console.log(mp4, dur.toFixed(2) + " s");
