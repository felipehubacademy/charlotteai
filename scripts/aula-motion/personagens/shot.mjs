#!/usr/bin/env node
// Captura uma página local em PNG (folha de modelo dos personagens).
//   node scripts/aula-motion/personagens/shot.mjs <html> <png>
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const [src, out] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 800 } });
await page.goto(pathToFileURL(resolve(src)).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(200);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
