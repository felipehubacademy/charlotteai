#!/usr/bin/env node
// Quadros de aprovação da PN01 (sem custo: só reaproveita imagens do piloto).
//   node scripts/aula-motion/pre-novice-01/quadros.mjs
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
const ROOT = resolve(new URL("../../..", import.meta.url).pathname);
const OUT = join(ROOT, "docs/content/aula-motion/pre-novice-01/quadros");
const names = ["1-voce-ja-sabe-ingles", "2-hi-hello-sopro", "3-pausa-1"];
const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
for (let i = 0; i < names.length; i++) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(pathToFileURL(join(ROOT, "scripts/aula-motion/pre-novice-01/quadros.html")).href + "#" + (i + 1), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(OUT, names[i] + ".png") });
  await page.close();
}
await browser.close();
console.log("ok:", OUT);
