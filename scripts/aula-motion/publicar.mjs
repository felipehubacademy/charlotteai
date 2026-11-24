#!/usr/bin/env node
// Publica os arquivos de uma aula no Storage (bucket público "lesson-videos") para o app tocar.
//   node scripts/aula-motion/publicar.mjs novice-01 v1
// Sobe <id>/<versão>/aula.mp4, poster.jpg e audio/f*.mp3. A versão entra no caminho para o CDN
// nunca servir arquivo velho: refez a aula, publique com v2 e troque a versão no app.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const [ID, VER] = process.argv.slice(2);
if (!ID || !VER) throw new Error("uso: node scripts/aula-motion/publicar.mjs <id da aula> <versão, ex. v1>");
const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const DIR = join(ROOT, "docs/content/aula-motion", ID);
const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"]).toString().trim();
const env = readFileSync(resolve(common, "../.env.local"), "utf8");
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim().replace(/^["']|["']$/g, "");
const URL_ = get("NEXT_PUBLIC_SUPABASE_URL"), KEY = get("SUPABASE_SERVICE_ROLE_KEY");
const H = { Authorization: `Bearer ${KEY}`, apikey: KEY };
const BUCKET = "lesson-videos";

const b = await fetch(`${URL_}/storage/v1/bucket/${BUCKET}`, { headers: H });
if (b.status !== 200) {
  const r = await fetch(`${URL_}/storage/v1/bucket`, { method: "POST", headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true, file_size_limit: 50 * 1024 * 1024, allowed_mime_types: ["video/mp4", "image/jpeg", "audio/mpeg"] }) });
  if (!r.ok) throw new Error(`bucket: ${r.status} ${await r.text()}`);
  console.log("bucket criado:", BUCKET);
}
const files = [["aula.mp4", "video/mp4"], ["poster.jpg", "image/jpeg"],
  ...readdirSync(join(DIR, "audio")).filter((f) => /^f\d(ok|no)\.mp3$/.test(f)).map((f) => [`audio/${f}`, "audio/mpeg"])];
for (const [rel, type] of files) {
  const path = `${ID}/${VER}/${rel}`;
  const r = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${path}`, { method: "POST",
    headers: { ...H, "Content-Type": type, "x-upsert": "true", "cache-control": "max-age=31536000" }, body: readFileSync(join(DIR, rel)) });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  console.log("ok", `${URL_}/storage/v1/object/public/${BUCKET}/${path}`);
}
