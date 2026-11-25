#!/usr/bin/env node
// Gera os dados da aula para o app (apps/mobile/data/aulas/<id>.json) a partir de
// docs/content/aula-motion/<id>/ (aula.json + timings.json + audio/<fala>.words.json).
//   node scripts/aula-motion/app-json.mjs pre-novice-01 v1 --level=PreNovice --module=M01 --unit=PN01
// A versão é a mesma usada em publicar.mjs (pasta do vídeo no Storage).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const [ID, VER] = args.filter((a) => !a.startsWith("--"));
const opt = (k) => (args.find((a) => a.startsWith(`--${k}=`)) || "").split("=")[1];
if (!ID || !VER) throw new Error("uso: node scripts/aula-motion/app-json.mjs <id> <versão> [--level= --module= --unit=]");

const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const DIR = join(ROOT, "docs/content/aula-motion", ID);
const aula = JSON.parse(readFileSync(join(DIR, "aula.json"), "utf8"));
const timings = JSON.parse(readFileSync(join(DIR, "timings.json"), "utf8"));
const r2 = (n) => Math.round(n * 100) / 100;

const cues = aula.lines.map((l) => {
  const t = timings.cues.find((c) => c.id === l.id);
  if (!t) throw new Error(`fala sem tempo em timings.json: ${l.id}`);
  const wf = join(DIR, "audio", `${l.id}.words.json`);
  const words = existsSync(wf) ? JSON.parse(readFileSync(wf, "utf8")).words.map((w) => r2(t.start + w.start)) : undefined;
  return {
    id: l.id, speaker: l.speaker, lang: l.lang ?? "pt", text: l.text, pt: l.pt ?? null,
    start: t.start, end: t.end, ...(words ? { words } : {}),
  };
});

const checkpoints = aula.checkpoints.map((c) => {
  const t = timings.checkpoints.find((x) => x.id === c.id);
  if (!t) throw new Error(`pausa sem tempo em timings.json: ${c.id}`);
  return { id: c.id, at: t.at, mode: c.mode, question: c.question, options: c.options, answer: c.answer, speak: c.speak, feedback: c.feedback };
});

const out = {
  _fonte: `Gerado de docs/content/aula-motion/${ID} (aula.json + timings.json) por scripts/aula-motion/app-json.mjs. Refez a aula? Gere de novo e publique os arquivos com nova versão (scripts/aula-motion/publicar.mjs).`,
  id: ID,
  version: VER,
  title: aula.title,
  level: opt("level") || aula.level,
  moduleId: opt("module") || aula.module,
  unitId: opt("unit") || aula.unit,
  duration: timings.duration,
  speakers: Object.fromEntries(Object.entries(aula.speakers).map(([k, v]) => [k, typeof v === "string" ? v : v.name])),
  cues,
  checkpoints,
};
const dest = join(ROOT, "apps/mobile/data/aulas", `${ID}.json`);
writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
console.log("ok", dest, `${cues.length} falas, ${checkpoints.length} pausas, ${timings.duration} s`);
