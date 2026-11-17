#!/usr/bin/env node
// Demo horizontal sem personagem falando: quadrinho animado na rua + tipografia em movimento + pergunta.
//   node scripts/aula-motion/novice-01/render-demo.mjs [--stills]
// Vozes guardadas (l02 a l06) e tempos das palavras (scripts/aula-motion/palavras.mjs). Não gera nada pago.
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(new URL("../../..", import.meta.url).pathname);
const AULA = join(ROOT, "docs/content/aula-motion/novice-01");
const OUT = join(ROOT, "docs/content/aula-motion/ia-teste");
const CACHE = join(ROOT, "scripts/aula-motion/.cache/demo");
mkdirSync(CACHE, { recursive: true });
const FPS = 30, STILLS = process.argv.includes("--stills");
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
const run = (args) => execFileSync("ffmpeg", ["-y", "-v", "error", ...args]);
const ids = ["l02", "l03", "l04", "l05", "l06"];
const words = Object.fromEntries(ids.map((id) => [id, JSON.parse(readFileSync(join(AULA, "audio", `${id}.words.json`), "utf8")).words]));
const lines = {}; const T = {};
const put = (id, start) => { const d = dur(join(AULA, "audio", `${id}.mp3`)); lines[id] = { start, end: start + d }; return start + d; };
let t = put("l02", 2.7);
t = put("l03", t + 0.45);
t = put("l04", t + 0.35);
T.toType = t + 0.7;
t = put("l05", T.toType + 0.75);
T.toStreet = t + 0.5;
t = put("l06", T.toStreet + 0.9);
const total = t + 2.6;

const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(pathToFileURL(join(ROOT, "scripts/aula-motion/novice-01/demo.html")).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
await page.evaluate((d) => window.setup(d), { lines, words, T });

if (STILLS) {
  const shots = [1.2, lines.l02.start + 1.2, lines.l03.start + 1.0, lines.l04.start + .6, T.toType + .35, lines.l05.start + 1.4, lines.l05.start + 5.6, T.toStreet + .35, lines.l06.start + 3.0, total - .3];
  for (const s of shots) { await page.evaluate((x) => window.seek(x), s); await page.screenshot({ path: join(CACHE, `q-${s.toFixed(2)}.png`) }); }
  await browser.close(); console.log(CACHE); process.exit(0);
}

// som: passagem nas máscaras e no título, toque suave a cada palavra da tipografia, ambiente leve de rua
const parts = [];
const sfx = (name, args) => { const f = join(CACHE, name + ".wav"); run([...args, "-ar", "44100", "-ac", "1", f]); return f; };
const whoosh = sfx("whoosh", ["-f", "lavfi", "-i", "anoisesrc=color=pink:duration=0.7:seed=7", "-af", "bandpass=f=900:w=1400,afade=t=in:d=0.35:curve=exp,afade=t=out:st=0.35:d=0.35,volume=0.5"]);
const tick = sfx("tick", ["-f", "lavfi", "-i", "sine=frequency=1320:duration=0.06", "-af", "afade=t=out:st=0.005:d=0.055,volume=0.10"]);
const amb = sfx("amb", ["-f", "lavfi", "-i", `anoisesrc=color=brown:duration=${total.toFixed(2)}:seed=3`, "-af", "lowpass=f=500,volume=0.05"]);
parts.push([whoosh, 1.8], [whoosh, T.toType - .1], [whoosh, T.toStreet - .1]);
words.l05.forEach((w) => parts.push([tick, lines.l05.start + w.start]));
for (const id of ids) parts.push([join(AULA, "audio", `${id}.mp3`), lines[id].start]);
const mix = join(CACHE, "mix.wav");
run(["-i", amb, ...parts.flatMap(([f]) => ["-i", f]), "-filter_complex",
  `[0:a]volume=1[b];` + parts.map(([, s], i) => `[${i + 1}:a]aresample=44100,adelay=${Math.round(s * 1000)}|${Math.round(s * 1000)}[a${i}]`).join(";") + ";" +
  `[b]` + parts.map((_, i) => `[a${i}]`).join("") + `amix=inputs=${parts.length + 1}:normalize=0:duration=longest,apad[o]`, "-map", "[o]", "-ac", "1", "-t", total.toFixed(2), mix]);

const mp4 = join(OUT, "demo-sem-boneco.mp4");
const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-i", mix, "-map", "0:v", "-map", "1:a",
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-c:a", "aac", "-b:a", "128k", "-shortest", mp4], { stdio: ["pipe", "inherit", "inherit"] });
for (let f = 0; f < Math.round(total * FPS); f++) {
  await page.evaluate((x) => window.seek(x), f / FPS);
  const buf = await page.screenshot({ type: "jpeg", quality: 92 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
}
ff.stdin.end(); await new Promise((r) => ff.on("close", r)); await browser.close();
console.log(mp4, total.toFixed(2) + " s");
