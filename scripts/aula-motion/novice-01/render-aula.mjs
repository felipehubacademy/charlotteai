#!/usr/bin/env node
// Aula inteira horizontal (1280x720) no formato sem personagem falando: quadrinho animado + tipografia + pausas.
//   node scripts/aula-motion/novice-01/render-aula.mjs            # aula.mp4, poster.jpg, legendas.vtt, timings.json, storyboard
//   node scripts/aula-motion/novice-01/render-aula.mjs --stills   # só o storyboard (rápido)
//   node scripts/aula-motion/novice-01/render-aula.mjs --audio    # refaz só o som e troca no aula.mp4 existente
// Usa as vozes guardadas (audio/*.mp3), os tempos das palavras (scripts/aula-motion/palavras.mjs)
// e as imagens das cenas em cenas/. Não chama nenhuma API.
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(new URL("../../..", import.meta.url).pathname);
const OUT = join(ROOT, "docs/content/aula-motion/novice-01");
const CACHE = join(ROOT, "scripts/aula-motion/.cache/aula-h");
const BOARD = join(OUT, "storyboard");
mkdirSync(CACHE, { recursive: true });
const FPS = 30, STILLS = process.argv.includes("--stills"), AUDIO = process.argv.includes("--audio");
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
const run = (args) => execFileSync("ffmpeg", ["-y", "-v", "error", ...args]);
const aula = JSON.parse(readFileSync(join(OUT, "aula.json"), "utf8"));
const mp3 = (id) => join(OUT, "audio", `${id}.mp3`);
const words = Object.fromEntries(aula.lines.map((l) => [l.id, JSON.parse(readFileSync(join(OUT, "audio", `${l.id}.words.json`), "utf8")).words]));

// ---------- linha do tempo ----------
const lines = {}, T = {}, cps = [];
const r3 = (x) => Number(x.toFixed(3));
const put = (id, start) => { lines[id] = { start: r3(start), end: r3(start + dur(mp3(id))) }; return lines[id].end; };
const w = (id, i) => lines[id].start + words[id][i].start;
// pausa: a pergunta aparece durante a fala ("O que você responde?"), o vídeo para em "at" e mostra a certa até "revealEnd"
const pause = (id, showWord, turnWord) => {
  const cp = aula.checkpoints.find((c) => c.id === aula.lines.find((l) => l.id === id).checkpoint);
  const at = lines[id].end + .6;
  cps.push({ ...cp, showAt: r3(w(id, showWord)), turnAt: r3(w(id, turnWord)), at: r3(at), revealEnd: r3(at + 1.6) });
  return at + 1.6;
};
let t = put("l01", 2.8);
t = put("l02", t + .6);
t = put("l03", t + .45);
t = put("l04", t + .35);
T.type1 = t + .7;
t = put("l05", T.type1 + .75);
T.street2 = t + .5;
t = put("l06", T.street2 + .9);
t = pause("l06", 8, 0);
T.sky = t + .4;
t = put("l07", T.sky + .8);
t = put("l08", t + .6);
t = put("l09", t + .6);
t = pause("l09", 9, 9);
T.igor = t + .4;
t = put("l10", T.igor + .8);
T.type2 = t + .6;
t = put("l11", T.type2 + .75);
T.bye = t + .5;
t = put("l12", T.bye + .8);
t = put("l13", t + .35);
T.type3 = t + .6;
t = put("l14", T.type3 + .75);
T.igor2 = w("l14", 8) - .35;
t = pause("l14", 17, 8);
T.review = t + .4;
t = put("l15", T.review + .75);
T.end = t + .6;
const total = r3(T.end + 3.2);
console.log(`duração ${total} s; pausas em ${cps.map((c) => c.at.toFixed(1)).join(", ")} s`);

const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(pathToFileURL(join(ROOT, "scripts/aula-motion/novice-01/aula.html")).href, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => Promise.all([...document.images].map((im) => im.decode().catch(() => {}))));
await page.evaluate((d) => window.setup(d), { lines, words, T, cps });

// storyboard: um quadro por momento importante (360 px de largura)
const board = [
  ["01-abertura", 1.2], ["02-charlotte-se-apresenta", w("l01", 11)], ["03-hi-igor", lines.l02.end - .2], ["04-im-good-thanks", lines.l03.end - .1],
  ["05-how-are-you", lines.l05.end - .2], ["06-pausa-1", cps[0].at + .5], ["07-hora-do-dia", w("l07", 18) + .6], ["08-good-night", lines.l08.end - .2],
  ["09-pausa-2", cps[1].at + .5], ["10-igor-se-apresenta", lines.l10.end + .2], ["11-nice-to-meet-you", lines.l11.end - .2], ["12-see-you-later", lines.l12.end],
  ["13-ate-mais", w("l14", 7) + .5], ["14-pausa-3", cps[2].at + .5], ["15-revisao", lines.l15.end - .3], ["16-final", total - .3],
];
if (!AUDIO) { rmSync(BOARD, { recursive: true, force: true }); mkdirSync(BOARD);
for (const [name, s] of board) {
  await page.evaluate((x) => window.seek(x), s);
  const png = join(CACHE, `${name}.png`);
  await page.screenshot({ path: png });
  run(["-i", png, "-vf", "scale=480:-1:flags=lanczos", join(BOARD, `${name}.png`)]);
}
console.log("storyboard ok:", BOARD); }
if (STILLS) { await browser.close(); process.exit(0); }

// ---------- som ----------
const parts = [];
const sfx = (name, args) => { const f = join(CACHE, name + ".wav"); run([...args, "-ar", "44100", "-ac", "1", f]); return f; };
const whoosh = sfx("whoosh", ["-f", "lavfi", "-i", "anoisesrc=color=pink:duration=0.7:seed=7", "-af", "bandpass=f=1100:w=900,afade=t=in:d=0.3:curve=exp,afade=t=out:st=0.3:d=0.4,volume=0.18"]);
const tick = sfx("tick", ["-f", "lavfi", "-i", "sine=frequency=1320:duration=0.06", "-af", "afade=t=out:st=0.005:d=0.055,volume=0.10"]);
const pop = sfx("pop", ["-f", "lavfi", "-i", "sine=frequency=520:duration=0.09", "-af", "afade=t=out:st=0.01:d=0.08,volume=0.16"]);
const chime = sfx("chime", ["-f", "lavfi", "-i", "aevalsrc=0.08*sin(2*PI*880*t)*exp(-7*t)*lt(t\\,0.12)+0.08*sin(2*PI*1320*(t-0.12))*exp(-6*(t-0.12))*gte(t\\,0.12):s=44100:d=0.6"]);
parts.push([whoosh, 1.8]);
for (const k of ["type1", "street2", "sky", "igor", "type2", "bye", "type3", "igor2", "review", "end"]) parts.push([whoosh, T[k] - .1]);
// toque a cada palavra destacada da tipografia e "pop" quando entra um cartão
const ticks = { l05: [0, 1, 2, 6, 7, 14, 15, 16], l11: [0, 1, 2, 3, 5, 6, 7, 8], l14: [0, 1, 2, 6, 7] };
for (const [id, idx] of Object.entries(ticks)) for (const i of idx) parts.push([tick, w(id, i)]);
for (const i of [10, 14, 18]) parts.push([pop, w("l07", i)]);
for (const i of [1, 4, 7, 9, 14]) parts.push([pop, w("l15", i)]);
parts.push([pop, w("l08", 7)], [pop, w("l09", 0)]);
for (const c of cps) parts.push([pop, c.showAt], [chime, c.at + .15]);
for (const id of Object.keys(lines)) parts.push([mp3(id), lines[id].start]);
const mixf = join(CACHE, "mix.wav");
const bus = (out, list, extra = "") => run([...list.flatMap(([f]) => ["-i", f]), "-filter_complex",
  list.map(([, s], i) => `[${i}:a]aresample=44100,pan=mono|c0=c0,adelay=${Math.round(s * 1000)}:all=1[a${i}]`).join(";") + ";" +
  list.map((_, i) => `[a${i}]`).join("") + `amix=inputs=${list.length}:normalize=0:duration=longest,apad${extra}[o]`,
  "-map", "[o]", "-ac", "1", "-ar", "44100", "-t", String(total), out]);
// 1) vozes + efeitos, levados a -16 LUFS por ganho fixo (medido), sem compressão nos silêncios
const pre = join(CACHE, "pre.wav"), key = join(CACHE, "key.wav");
bus(pre, parts);
bus(key, parts.filter(([f]) => f.endsWith(".mp3")));
const loud = (() => { const r = spawnSync("ffmpeg", ["-hide_banner", "-i", pre, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" }); return Number(r.stderr.match(/I:\s+(-?[\d.]+) LUFS\s*\n\s*Threshold/)[1]); })();
const gain = (-16 - loud).toFixed(2);
// 2) som de rua (loop de 30 s, gerado uma vez em docs/content/aula-motion/sons/): inteiro nas cenas de rua,
//    bem baixo na tipografia e no céu, some no cartão final; abaixa sozinho quando alguém fala.
const AMB = join(ROOT, "docs/content/aula-motion/sons/rua-dia.flac");
const BED = 0.6, LOW = 0.14, RAMP = 0.7;
const ruas = [[0, T.type1], [T.street2, T.sky], [T.igor, T.type2], [T.bye, T.type3], [T.igor2, T.review]];
const win = ([a, b]) => `min(clip((t-${a.toFixed(2)})/${RAMP},0,1),clip((${(b + RAMP).toFixed(2)}-t)/${RAMP},0,1))`;
const env = `${BED}*(${LOW}+(1-${LOW})*${ruas.map(win).reduce((x, y) => `max(${x},${y})`)})*clip((${(T.end + 1.2).toFixed(2)}-t)/1.2,0,1)*clip(t/1.2,0,1)`;
run(["-stream_loop", "-1", "-i", AMB, "-i", pre, "-i", key, "-filter_complex",
  `[0:a]aresample=44100,atrim=0:${total},asetpts=N/SR/TB,volume='${env}':eval=frame[amb];` +
  `[2:a]volume=${gain}dB,pan=stereo|c0=c0|c1=c0[k];` +
  `[amb][k]sidechaincompress=threshold=0.03:ratio=5:attack=60:release=600[duck];` +
  `[1:a]volume=${gain}dB,pan=stereo|c0=0.7071*c0|c1=0.7071*c0[v];` +
  `[v][duck]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.84:level=false[o]`,
  "-map", "[o]", "-ac", "2", "-ar", "44100", "-t", String(total), mixf]);
console.log("som ok");
if (AUDIO) {
  const cur = join(OUT, "aula.mp4"), tmp = join(CACHE, "aula-novo-som.mp4");
  run(["-i", cur, "-i", mixf, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-shortest", tmp]);
  execFileSync("mv", [tmp, cur]); await browser.close(); console.log("ok (só som):", cur); process.exit(0);
}

// ---------- vídeo ----------
const out = join(OUT, "aula.mp4");
const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", "-i", mixf, "-map", "0:v", "-map", "1:a",
  "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-pix_fmt", "yuv420p", "-profile:v", "high", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-shortest", out],
  { stdio: ["pipe", "inherit", "inherit"] });
const N = Math.round(total * FPS);
for (let f = 0; f < N; f++) {
  await page.evaluate((x) => window.seek(x), f / FPS);
  const buf = await page.screenshot({ type: "jpeg", quality: 92 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (f % 300 === 0) console.log(`  ${f}/${N}`);
}
ff.stdin.end();
await new Promise((r, j) => ff.on("close", (c) => (c === 0 ? r() : j(new Error(`ffmpeg ${c}`)))));

await page.evaluate((x) => window.seek(x), lines.l03.end - .1);
await page.screenshot({ path: join(OUT, "poster.jpg"), type: "jpeg", quality: 82 });
await browser.close();

// legenda e tempos para o player interativo
const ts = (s) => new Date(Math.round(s * 1000)).toISOString().slice(11, 23);
const ids = Object.keys(lines);
const hold = (id, i) => r3(Math.min(lines[id].end + .6, i + 1 < ids.length ? lines[ids[i + 1]].start - .05 : lines[id].end + .6));
writeFileSync(join(OUT, "legendas.vtt"), `WEBVTT\n\n${ids.map((id, i) => {
  const l = aula.lines.find((x) => x.id === id);
  return `${i + 1}\n${ts(lines[id].start)} --> ${ts(hold(id, i))}\n<v ${aula.speakers[l.speaker].name}>${l.text.replace(/[{}]/g, "")}${l.pt ? `\n(${l.pt})` : ""}`;
}).join("\n\n")}\n`);
writeFileSync(join(OUT, "timings.json"), `${JSON.stringify({
  id: aula.id, format: "1280x720", duration: total,
  checkpoints: cps.map(({ id, showAt, at, revealEnd }) => ({ id, showAt, at, revealEnd })),
  cues: ids.map((id, i) => ({ id, start: lines[id].start, end: hold(id, i) })),
}, null, 2)}\n`);
console.log(`ok: ${out} ${total} s ${(Number(execFileSync("stat", ["-f", "%z", out]).toString()) / 1e6).toFixed(2)} MB`);
