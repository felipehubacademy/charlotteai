#!/usr/bin/env node
// Tempo de cada palavra das falas já gravadas (para escrever na lousa no ritmo da voz).
//   node scripts/aula-motion/palavras.mjs <pasta da aula> l05 l06 ...
// Guarda <aula>/audio/<id>.words.json e não chama de novo se já existir. Custo: ~US$ 0,006 por minuto.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const [dir, ...ids] = process.argv.slice(2);
// chave no .env.local do repositório principal (o worktree não tem cópia)
const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"]).toString().trim();
const env = readFileSync(resolve(common, "../.env.local"), "utf8");
const KEY = (env.match(/^OPENAI_API_KEY=(.*)$/m) || [])[1]?.trim().replace(/^"|"$/g, "");
if (!KEY) throw new Error("OPENAI_API_KEY não encontrada no .env.local do repositório principal");

for (const id of ids) {
  const out = join(dir, "audio", `${id}.words.json`);
  if (existsSync(out)) { console.log(id, "já existe"); continue; }
  const fd = new FormData();
  fd.append("file", new Blob([readFileSync(join(dir, "audio", `${id}.mp3`))], { type: "audio/mpeg" }), `${id}.mp3`);
  fd.append("model", "whisper-1");
  fd.append("response_format", "verbose_json");
  fd.append("timestamp_granularities[]", "word");
  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${KEY}` }, body: fd });
  if (!r.ok) throw new Error(`${id}: ${r.status} ${await r.text()}`);
  const j = await r.json();
  writeFileSync(out, JSON.stringify({ text: j.text, words: j.words }, null, 1));
  console.log(id, j.text);
}
