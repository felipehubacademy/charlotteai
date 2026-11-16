#!/usr/bin/env node
// Monta o protótipo navegável de uma aula (página única, publicada como Artifact para teste no celular).
//
//   node scripts/aula-motion/build-prototipo.mjs novice-01
//
// Lê aula.json + timings.json e grava docs/content/aula-motion/<id>/prototipo.html (ao lado de aula.mp4, para os caminhos relativos valerem no teste local e no Artifact).
// O vídeo, o pôster e os áudios das correções vão junto na publicação (files):
//   aula.mp4, poster.jpg, audio/f*.mp3 (mesmos caminhos relativos da pasta da aula).
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ID = process.argv[2];
if (!ID) throw new Error("uso: node scripts/aula-motion/build-prototipo.mjs <id da aula>");
const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const DIR = join(ROOT, "docs/content/aula-motion", ID);
const aula = readFileSync(join(DIR, "aula.json"), "utf8");
const times = readFileSync(join(DIR, "timings.json"), "utf8");
const tpl = readFileSync(join(ROOT, "scripts/aula-motion/prototipo.template.html"), "utf8");
const title = JSON.parse(aula).title;
const html = tpl
  .replace("<title>Aula Oi! Tudo bem?</title>", `<title>Aula ${title}</title>`)
  .replace("/*AULA*/null", aula.trim().replace(/<\//g, "<\\/"))
  .replace("/*TIMES*/null", times.trim());
writeFileSync(join(DIR, "prototipo.html"), html);
console.log(`ok: ${join(DIR, "prototipo.html")}`);
