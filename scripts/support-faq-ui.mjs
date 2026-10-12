#!/usr/bin/env node
// scripts/support-faq-ui.mjs — mantém a FAQ do suporte alinhada com as telas do app.
//
//   node scripts/support-faq-ui.mjs glossary   regenera apps/web/lib/app-ui-glossary.json
//                                              (pares PT → EN dos rótulos do app, usados
//                                              para traduzir a FAQ com os nomes reais)
//   node scripts/support-faq-ui.mjs check      confere se os rótulos citados na FAQ
//                                              ("Seu progresso", Perfil > Conta > ...) ainda
//                                              existem no código do app; sai com erro se não.
//
// O check lê a FAQ viva em FAQ_URL (padrão https://queizy.com/api/support/faq?scope=all).
// Roda no GitHub Actions a cada push que mexe em apps/mobile (workflow support-faq-check).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MOBILE_DIRS = ['app', 'components', 'lib', 'hooks'].map(d => path.join(ROOT, 'apps/mobile', d));
const GLOSSARY = path.join(ROOT, 'apps/web/lib/app-ui-glossary.json');
// Caminhos "A > B > C" só são conferidos quando começam numa tela do app (o resto é da loja ou do sistema).
const APP_ROOTS = new Set(['Perfil', 'Início']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && !e.name.startsWith('.')) walk(p, out); }
    else if (/\.(tsx?|jsx?)$/.test(e.name)) out.push(p);
  }
  return out;
}
const decode = s => s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
const source = () => MOBILE_DIRS.flatMap(d => walk(d)).map(f => decode(fs.readFileSync(f, 'utf8'))).join('\n');

function glossary() {
  const src = source();
  const pairs = new Map();
  // isPt ? 'Texto' : 'Text'  (também isPortuguese / aspas duplas)
  const re = /is(?:Pt|Portuguese)\s*\?\s*(['"])((?:(?!\1).){2,80})\1\s*:\s*(['"])((?:(?!\3).){2,80})\3/g;
  for (const m of src.matchAll(re)) {
    const pt = m[2].trim(), en = m[4].trim();
    if (pt === en || /[{}$]/.test(pt)) continue;
    if (!pairs.has(pt)) pairs.set(pt, en);
  }
  const obj = Object.fromEntries([...pairs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt')));
  fs.writeFileSync(GLOSSARY, JSON.stringify(obj, null, 1) + '\n');
  console.log(`glossário: ${pairs.size} pares → ${path.relative(ROOT, GLOSSARY)}`);
}

/** Rótulos do app citados num texto da FAQ. */
export function labelsIn(text) {
  const out = new Set();
  for (const m of text.matchAll(/"([^"\n]{2,60})"/g)) out.add(m[1]);
  // Cada trecho começa e termina sem espaço, para o próximo " > " casar.
  const seg = '[^\\s.>\\n:;,()"](?:[^.>\\n:;,()"]{0,38}[^\\s.>\\n:;,()"])?';
  for (const m of text.matchAll(new RegExp(`(${seg}(?:\\s>\\s${seg})+)`, 'g'))) {
    const segs = m[1].split(/\s>\s/).map(s => s.trim());
    if (APP_ROOTS.has(segs[0])) segs.forEach(s => out.add(s));
  }
  // Partes variáveis ("+X hoje", "Xd grátis", "precisa 70%") viram só o texto fixo.
  return [...out].map(l => l.split(/\s+/).filter(w => !/\d|^\+?X[a-z]?$/.test(w)).join(' ').trim()).filter(l => l.length >= 3);
}

/** O rótulo existe no app? O fim de um caminho pode trazer o resto da frase
 * ("Gerenciar assinatura abre a tela"), então vale o começo com 2 palavras ou mais. */
export function foundInApp(label, srcLower) {
  const words = label.toLowerCase().split(/\s+/);
  for (let n = words.length; n >= Math.min(2, words.length); n--) {
    if (srcLower.includes(words.slice(0, n).join(' '))) return true;
  }
  return false;
}

async function check() {
  const url = process.env.FAQ_URL || 'https://queizy.com/api/support/faq?scope=all';
  // O push que dispara o check também publica o site: espera o deploy por até ~6 min.
  let r;
  for (let i = 0; i < 12; i++) {
    r = await fetch(url).catch(() => null);
    if (r?.ok) break;
    await new Promise(res => setTimeout(res, 30000));
  }
  if (!r?.ok) { console.error(`Não consegui ler a FAQ (${r?.status ?? 'sem resposta'}) em ${url}`); process.exit(2); }
  const { entries } = await r.json();
  const src = source().toLowerCase();
  const missing = [];
  for (const e of entries) for (const label of labelsIn(`${e.question}\n${e.answer}`)) {
    if (!foundInApp(label, src)) missing.push({ question: e.question, label });
  }
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (!missing.length) {
    console.log(`FAQ alinhada com o app (${entries.length} perguntas conferidas).`);
    if (summary) fs.appendFileSync(summary, `FAQ do suporte alinhada com o app (${entries.length} perguntas).\n`);
    return;
  }
  const lines = missing.map(m => `- "${m.label}" (pergunta: ${m.question})`);
  console.error(`Rótulos citados na FAQ que não existem mais no app:\n${lines.join('\n')}\n\nAtualize a FAQ em /admin/suporte → FAQ da IA.`);
  for (const m of missing) console.log(`::warning title=FAQ do suporte desatualizada::"${m.label}" não existe mais no app (pergunta: ${m.question})`);
  if (summary) fs.appendFileSync(summary, `## FAQ do suporte desatualizada\nAtualize em /admin/suporte → FAQ da IA.\n\n${lines.join('\n')}\n`);
  process.exit(1);
}

// Só roda como comando (não quando importado).
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
const cmd = isMain ? process.argv[2] : null;
if (cmd === 'glossary') glossary();
else if (cmd === 'check') await check();
else if (cmd) { console.error('uso: support-faq-ui.mjs glossary | check'); process.exit(2); }
