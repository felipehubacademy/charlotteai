#!/usr/bin/env node
// Trecho da lousa (explicação em narração) do piloto novice-01, horizontal 1280x720.
//   node scripts/aula-motion/novice-01/render-lousa.mjs [--stills]
// Usa as vozes guardadas (l05, l06) e os tempos das palavras (scripts/aula-motion/palavras.mjs).
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(new URL("../../..", import.meta.url).pathname);
const AULA = join(ROOT, "docs/content/aula-motion/novice-01");
const OUT = join(ROOT, "docs/content/aula-motion/ia-teste");
const CACHE = join(ROOT, "scripts/aula-motion/.cache/lousa");
mkdirSync(CACHE, { recursive: true });
const FPS = 30, STILLS = process.argv.includes("--stills");
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
const run = (args) => execFileSync("ffmpeg", ["-y", "-v", "error", ...args]);

const ids = ["l05", "l06"];
const words = Object.fromEntries(ids.map((id) => [id, JSON.parse(readFileSync(join(AULA, "audio", `${id}.words.json`), "utf8")).words]));
const at = {}; let t = 0.6;
for (const id of ids) { at[id] = t; t += dur(join(AULA, "audio", `${id}.mp3`)) + 0.6; }
const total = t + 0.8;

const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(pathToFileURL(join(ROOT, "scripts/aula-motion/novice-01/lousa.html")).href);
await page.evaluate(() => document.fonts.ready);
const chalk = await page.evaluate((d) => window.setup(d), { at, words, total });
const note = at.l06 + words.l06[0].start - 0.1;

if (STILLS) {
  for (const s of [2.2, 4.0, 6.4, at.l06 + 1.0, at.l06 + 3.4, total - 0.5]) {
    await page.evaluate((x) => window.seek(x), s);
    await page.screenshot({ path: join(CACHE, `lousa-${s.toFixed(1)}.png`) });
  }
  await browser.close(); console.log(CACHE); process.exit(0);
}

// som: giz (ruído filtrado com tremor) em cada trecho escrito, um "toc" no bilhete, vozes por cima
const parts = [];
chalk.forEach(([a, b], i) => {
  const f = join(CACHE, `giz${i}.wav`), d = Math.max(0.2, b - a);
  run(["-f", "lavfi", "-i", `anoisesrc=color=pink:duration=${d.toFixed(2)}:seed=${i + 3}`, "-af",
    `highpass=f=1800,lowpass=f=7500,tremolo=f=${9 + (i % 4)}:d=0.85,afade=t=in:d=0.05,afade=t=out:st=${(d - 0.08).toFixed(2)}:d=0.08,volume=0.16`, "-ar", "44100", f]);
  parts.push([f, a]);
});
const toc = join(CACHE, "toc.wav");
run(["-f", "lavfi", "-i", "anoisesrc=color=brown:duration=0.12", "-af", "lowpass=f=900,afade=t=out:st=0.02:d=0.1,volume=0.9", "-ar", "44100", toc]);
parts.push([toc, note + 0.3]);
for (const id of ids) parts.push([join(AULA, "audio", `${id}.mp3`), at[id]]);
const mix = join(CACHE, "mix.wav");
run([...parts.flatMap(([f]) => ["-i", f]), "-filter_complex",
  parts.map(([, s], i) => `[${i}:a]aresample=44100,adelay=${Math.round(s * 1000)}|${Math.round(s * 1000)}[a${i}]`).join(";") + ";" +
  parts.map((_, i) => `[a${i}]`).join("") + `amix=inputs=${parts.length}:normalize=0:duration=longest,apad[o]`, "-map", "[o]", "-ac", "1", "-t", total.toFixed(2), mix]);

const mp4 = join(OUT, "lousa.mp4");
const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-i", mix, "-map", "0:v", "-map", "1:a",
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-c:a", "aac", "-b:a", "128k", "-shortest", mp4], { stdio: ["pipe", "inherit", "inherit"] });
for (let f = 0; f < Math.round(total * FPS); f++) {
  await page.evaluate((x) => window.seek(x), f / FPS);
  const buf = await page.screenshot({ type: "jpeg", quality: 92 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
}
ff.stdin.end(); await new Promise((r) => ff.on("close", r)); await browser.close();
console.log(mp4, total.toFixed(2) + " s");
