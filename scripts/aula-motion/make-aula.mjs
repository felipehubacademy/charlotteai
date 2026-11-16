#!/usr/bin/env node
// Monta uma aula em motion graphics a partir das falas e das vozes já gravadas.
//
//   node scripts/aula-motion/make-aula.mjs novice-01            # vídeo + storyboard + tempos
//   node scripts/aula-motion/make-aula.mjs novice-01 --stills   # só o storyboard (rápido)
//
// Entradas:
//   docs/content/aula-motion/<id>/aula.json        falas, expressões e pausas (fonte única)
//   docs/content/aula-motion/<id>/audio/*.mp3      vozes (scripts/aula-motion/voices.mjs, gera uma vez)
//   scripts/aula-motion/<id>/scene.html            cena em HTML/SVG com window.setup(data) e window.seek(t)
//   scripts/aula-motion/<id>/cena.json             textos da tela, cena de cada fala, poses e quadros
// Saídas (em docs/content/aula-motion/<id>/):
//   aula.mp4 (720x1280, H.264 + AAC), poster.jpg, legendas.vtt, timings.json, storyboard/*.png
//
// Requisitos: ffmpeg, python3 com Pillow (quadros das poses animadas .webp) e
// `npm install` em scripts/aula-motion (playwright-core; o Chromium vem do cache do Playwright).
// Não chama nenhuma API: vozes só saem do voices.mjs.

import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const ID = process.argv[2];
if (!ID) throw new Error("uso: node scripts/aula-motion/make-aula.mjs <id da aula>");
const STILLS = process.argv.includes("--stills");
// --range=10:25 grava só esse trecho (com som) em <aula>/trecho-10-25.mp4, para aprovar estilo antes dos 90 s.
const RANGE = process.argv.find((a) => a.startsWith("--range="))?.slice(8).split(":").map(Number);
const FPS = 30;
const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const OUT = join(ROOT, "docs/content/aula-motion", ID);
const SCENE = join(ROOT, "scripts/aula-motion", ID);
const CACHE = join(ROOT, "scripts/aula-motion/.cache", ID);
const BOARD = join(OUT, "storyboard");
for (const d of [CACHE, BOARD]) mkdirSync(d, { recursive: true });

const aula = JSON.parse(readFileSync(join(OUT, "aula.json"), "utf8"));
const cena = JSON.parse(readFileSync(join(SCENE, "cena.json"), "utf8"));
const run = (cmd, args) => execFileSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 });
const duration = (f) => Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
const url = (f) => pathToFileURL(f).href;

// ---------- poses animadas: quadros PNG das .webp do app ----------
function frames(rel) {
  const name = rel.replace(/[^a-z0-9]+/gi, "_");
  const dir = join(CACHE, "sprites", name);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    run("python3", ["-c", `
import sys
from PIL import Image
im = Image.open(sys.argv[1])
for i in range(getattr(im, "n_frames", 1)):
    im.seek(i); im.convert("RGBA").save(f"{sys.argv[2]}/{i:03d}.png")
`, join(ROOT, rel), dir]);
  }
  return readdirSync(dir).filter((f) => f.endsWith(".png")).sort().map((f) => url(join(dir, f)));
}
const sprites = Object.fromEntries(Object.entries(cena.sprites).map(([k, rel]) => [k, frames(rel)]));
const stills = Object.fromEntries(
  Object.entries(cena.stills).map(([k, rel]) => {
    const [file, frame] = rel.split("#");
    return [k, frame !== undefined ? frames(file)[Number(frame)] : url(join(ROOT, file))];
  }),
);

// ---------- volume por quadro (pulo de quem fala e barras do balão) ----------
function envelope(mp3) {
  const pcm = run("ffmpeg", ["-v", "error", "-i", mp3, "-f", "f32le", "-ac", "1", "-ar", "24000", "-"]);
  const s = new Float32Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 4));
  const step = 24000 / FPS, rms = [];
  for (let i = 0; i < s.length; i += step) {
    let acc = 0;
    const end = Math.min(s.length, i + step);
    for (let j = i; j < end; j++) acc += s[j] * s[j];
    rms.push(Math.sqrt(acc / Math.max(1, end - i)));
  }
  const p90 = [...rms].sort((a, b) => a - b)[Math.floor(rms.length * 0.9)] || 1;
  let prev = 0;
  return rms.map((v) => (prev = prev * 0.35 + Math.min(1, Math.max(0, (v / p90 - 0.12) / 0.88)) * 0.65)).map((x) => Number(x.toFixed(3)));
}

// ---------- linha do tempo ----------
const TITLE = 2.7;      // abertura com o título
const ENTER = 0.75;      // da cortina até a 1ª fala da cena
const T = {};
const scenes = [{ name: "title", at: 0 }];
const wipes = [];
const lines = [];
const checkpoints = [];
let t = TITLE - 0.45;
let prevScene = "title";
aula.lines.forEach((l, i) => {
  const scene = cena.sceneByLine[l.id];
  if (!scene) throw new Error(`cena.json sem cena para ${l.id}`);
  const mp3 = join(OUT, "audio", `${l.id}.mp3`);
  if (!existsSync(mp3)) throw new Error(`falta a voz ${mp3}: rode scripts/aula-motion/voices.mjs`);
  if (scene !== prevScene) {
    const w = t + 0.45;
    wipes.push(w);
    scenes.push({ name: scene, at: w, first: l.id });
    t = w + ENTER;
    prevScene = scene;
  }
  const dur = duration(mp3);
  const start = Number(t.toFixed(3));
  const end = Number((t + dur).toFixed(3));
  const next = aula.lines[i + 1];
  let gap = l.lang === "en" ? 0.35 : 0.45;
  if (l.key && l.lang === "en") gap = 0.6;
  const line = { id: l.id, speaker: l.speaker, lang: l.lang, text: l.text, pt: l.pt, key: l.key, start, end, mp3, amp: envelope(mp3) };
  if (l.checkpoint) {
    const cp = aula.checkpoints.find((c) => c.id === l.checkpoint);
    const showAt = end + 0.15;
    const at = end + 0.6;          // ponto da pausa: pergunta inteira na tela
    const revealEnd = at + 1.4;     // depois da pausa, o vídeo mostra a resposta certa
    checkpoints.push({ ...cp, showAt: Number(showAt.toFixed(3)), at: Number(at.toFixed(3)), revealEnd: Number(revealEnd.toFixed(3)) });
    line.holdEnd = Number((end + 0.12).toFixed(3));
    t = revealEnd + 0.35;
  } else {
    line.holdEnd = Number((end + (next && cena.sceneByLine[next.id] === scene ? Math.min(gap, 0.3) : 0.5)).toFixed(3));
    t = end + gap;
  }
  lines.push(line);
});
for (let i = 1; i < scenes.length; i++) scenes[i - 1].until = scenes[i].at;
T.endCard = Number((lines.at(-1).end + 0.8).toFixed(3));
wipes.push(T.endCard);
scenes.at(-1).until = T.endCard;
scenes.push({ name: "end", at: T.endCard, until: Infinity });
const DURATION = Number((T.endCard + 3.0).toFixed(2));
console.log(`duração: ${DURATION}s, ${checkpoints.length} pausas em ${checkpoints.map((c) => c.at.toFixed(1)).join(", ")}s`);

const data = {
  fps: FPS,
  t: T,
  meta: cena.meta,
  keys: aula.keys,
  speakers: aula.speakers,
  scenes,
  wipes,
  checkpoints,
  sprites,
  stills,
  lines: lines.map(({ mp3, amp, ...rest }) => rest),
  amp: Object.fromEntries(lines.map((l) => [l.id, l.amp])),
};

// ---------- cena ----------
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
await page.goto(url(join(SCENE, "scene.html")), { waitUntil: "load" });
await page.evaluate((d) => window.setup(d), data);
// Pré-carrega todos os quadros das poses (a captura não pode pegar imagem pela metade).
await page.evaluate(async (urls) => {
  await Promise.all(urls.map((u) => new Promise((r) => { const im = new Image(); im.onload = im.onerror = r; im.src = u; })));
}, [...Object.values(sprites).flat(), ...Object.values(stills)]);

const byId = Object.fromEntries(lines.map((l) => [l.id, l]));
const when = (spec) => {
  if (spec.startsWith("t:")) return Number(spec.slice(2));
  if (spec.startsWith("end:")) return T.endCard + Number(spec.slice(4));
  const cp = checkpoints.find((c) => c.id === spec);
  if (cp) return cp.at;
  const [id, frac] = spec.split(":");
  const l = byId[id];
  return l.start + (l.end - l.start) * Number(frac);
};
for (const [name, spec] of cena.storyboard) {
  await page.evaluate((x) => window.seek(x), when(spec));
  await page.waitForTimeout(30);
  const png = join(BOARD, `${name}.png`);
  await page.screenshot({ path: png });
  run("ffmpeg", ["-v", "error", "-y", "-i", png, "-vf", "scale=360:-1:flags=lanczos", "-compression_level", "9", `${png}.tmp.png`]);
  run("mv", [`${png}.tmp.png`, png]);
}
console.log("storyboard ok");

if (!STILLS) {
  // Áudio: falas na linha do tempo + efeitos gerados no ffmpeg (sem trilha de terceiros).
  const mix = join(CACHE, "mix.wav");
  const inputs = [], filters = [];
  lines.forEach((l, i) => {
    inputs.push("-i", l.mp3);
    filters.push(`[${i}:a]aresample=48000,adelay=${Math.round(l.start * 1000)}:all=1[a${i}]`);
  });
  let n = lines.length;
  const sfx = [];
  for (const w of wipes)
    sfx.push({ at: w - 0.4, src: "anoisesrc=color=pink:amplitude=0.08:sample_rate=48000:d=0.8,highpass=f=600,lowpass=f=5000,afade=t=in:d=0.4,afade=t=out:st=0.4:d=0.4" });
  // Resposta revelada: dois tons ascendentes.
  for (const c of checkpoints)
    sfx.push({ at: c.at + 0.15, src: "aevalsrc=0.22*sin(2*PI*880*t)*exp(-7*t)*lt(t\\,0.12)+0.22*sin(2*PI*1320*(t-0.12))*exp(-6*(t-0.12))*gte(t\\,0.12):s=48000:d=0.6" });
  for (const s of sfx) {
    inputs.push("-f", "lavfi", "-i", s.src);
    filters.push(`[${n}:a]adelay=${Math.round(s.at * 1000)}:all=1[a${n}]`);
    n++;
  }
  filters.push(`${Array.from({ length: n }, (_, i) => `[a${i}]`).join("")}amix=inputs=${n}:normalize=0:duration=longest,apad,atrim=0:${DURATION},loudnorm=I=-16:TP=-1.5:LRA=11[out]`);
  run("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", filters.join(";"), "-map", "[out]", "-ar", "48000", "-ac", "1", mix]);

  console.log("quadros…");
  const mp4 = RANGE ? join(OUT, `trecho-${RANGE[0]}-${RANGE[1]}.mp4`) : join(OUT, "aula.mp4");
  const [r0, r1] = RANGE || [0, DURATION];
  const ff = spawn("ffmpeg", [
    "-v", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", "-ss", String(r0), "-i", mix,
    "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p", "-profile:v", "high",
    "-c:a", "aac", "-b:a", "80k", "-movflags", "+faststart", "-shortest", mp4,
  ], { stdio: ["pipe", "ignore", "inherit"] });
  const total = Math.round(r1 * FPS);
  for (let f = Math.round(r0 * FPS); f < total; f++) {
    await page.evaluate((x) => window.seek(x), f / FPS);
    const jpg = await page.screenshot({ type: "jpeg", quality: 92 });
    if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % 300 === 0) console.log(`  ${f}/${total}`);
  }
  ff.stdin.end();
  await new Promise((r, j) => ff.on("close", (c) => (c === 0 ? r() : j(new Error(`ffmpeg ${c}`)))));
  if (RANGE) { console.log(`ok: ${mp4}`); await browser.close(); process.exit(0); }

  await page.evaluate((x) => window.seek(x), when("l03:0.8"));
  await page.screenshot({ path: join(OUT, "poster.jpg"), type: "jpeg", quality: 80 });

  // Legenda (vtt): o texto da fala, sem as chaves; nas falas em inglês, a tradução embaixo.
  const ts = (s) => new Date(Math.round(s * 1000)).toISOString().slice(11, 23);
  const cues = lines.map((l, i) => `${i + 1}\n${ts(l.start)} --> ${ts(l.holdEnd)}\n<v ${aula.speakers[l.speaker].name}>${l.text.replace(/[{}]/g, "")}${l.pt ? `\n(${l.pt})` : ""}`);
  writeFileSync(join(OUT, "legendas.vtt"), `WEBVTT\n\n${cues.join("\n\n")}\n`);

  // Tempos para o player interativo (pausas e falas).
  const timings = {
    id: ID,
    duration: DURATION,
    checkpoints: checkpoints.map(({ id, at, showAt, revealEnd }) => ({ id, at, showAt, revealEnd })),
    cues: lines.map((l) => ({ id: l.id, start: l.start, end: l.holdEnd })),
  };
  writeFileSync(join(OUT, "timings.json"), `${JSON.stringify(timings, null, 2)}\n`);
  const mb = (Number(run("stat", ["-f", "%z", mp4]).toString()) / 1e6).toFixed(2);
  console.log(`ok: ${mp4} ${DURATION}s ${mb} MB`);
}
if (process.env.DEBUG_EVAL) console.log(await page.evaluate(process.env.DEBUG_EVAL));
await browser.close();
