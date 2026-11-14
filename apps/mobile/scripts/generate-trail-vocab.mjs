#!/usr/bin/env node
// scripts/generate-trail-vocab.mjs — palavras e expressões de cada tópico da trilha, para a coleção do
// Vocabulário se encher sozinha quando o aluno conclui uma atividade (lib/trailVocab.ts).
// Lê data/curriculum-v2/<nível>/M*.json e grava data/curriculum-v2/<nível>/vocab.json = { 'M01/N01': [itens] } (o id do tópico se repete entre módulos).
// Retomável: tópicos já gerados ficam como estão (use --force para refazer, --unit=M01/N01 para um só).
// Novice e Igorfina: significado em português + tradução do exemplo. Inter e Advanced: significado em inglês.
// Uso: node scripts/generate-trail-vocab.mjs --level=novice [--force] [--unit=M01/N01] [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const LEVEL = String(args.level || '');
if (!['novice', 'inter', 'advanced', 'igorfina'].includes(LEVEL)) { console.error('--level=novice|inter|advanced|igorfina'); process.exit(1); }
const PT = LEVEL === 'novice' || LEVEL === 'igorfina';

function loadKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  for (const f of ['../../.env.local', '../web/.env.local', '.env']) {
    const p = path.resolve(ROOT, f);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, 'utf8').match(/^OPENAI_API_KEY=["']?([^"'\n]+)/m);
    if (m) return m[1].trim();
  }
  return null;
}
const KEY = loadKey();
if (!KEY && !args.dry) { console.error('OPENAI_API_KEY não encontrada'); process.exit(1); }

const dir = path.join(ROOT, 'data/curriculum-v2', LEVEL);
const outFile = path.join(dir, 'vocab.json');
const out = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
const modules = fs.readdirSync(dir).filter(f => /^M\d+\.json$/.test(f)).sort()
  .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));

const SYSTEM = `You build a short vocabulary list for one lesson of an English course for Brazilian learners (level: ${LEVEL}).
Pick ${PT ? '4 to 6' : '4 to 6'} items the student actually meets in THIS lesson's content and will reuse in real life:
useful words, fixed expressions, collocations or phrasal verbs. Skip trivial items (I, the, is, yes), proper names and grammar labels.
Prefer the lesson's key expressions and the content words of its situation (e.g. a lesson about a hairdresser: "haircut", "trim").
No near-duplicates (not "have something done" and "need to have something done"). Never use placeholders or formulas
("+ object +", "something", "sb", "sth"): write a concrete chunk the student can say ("get my car fixed").
Terms are short and reusable outside this lesson: max 4 words, and at least 2 items are single words or 2-word collocations
(nouns, verbs, adjectives the situation needs). Do not turn whole sentences of the lesson into terms.
At most ONE item may illustrate the lesson's grammar point, as a concrete chunk with category "grammar". Each item:
- term: as it appears or in dictionary form (lowercase unless a proper expression starts a sentence). Max 40 chars.
- category: "word" | "idiom" (fixed expression/chunk/collocation) | "phrasal_verb" | "grammar".
- definition: ${PT ? 'short meaning in Brazilian Portuguese with correct accents (ex.: "prazer em conhecer"), max 80 chars' : 'short learner-friendly meaning in English, max 90 chars'}.
- example: one natural English sentence using the term, preferably taken from the lesson content, max 110 chars.
${PT ? '- example_pt: the example translated into natural Brazilian Portuguese with correct accents.\n' : ''}Return JSON: {"items":[...]}. No emojis.`;

function unitPrompt(mod, u) {
  const g = (u.grammar || []).slice(0, 10).map(e => [e.sentence, e.question, e.answer, e.example_answer].filter(Boolean).join(' | '));
  const ls = (u.listening_speaking || []).map(s => s.text).filter(Boolean);
  return [
    `Module: ${mod.title} — ${mod.theme ?? ''}`,
    `Module key chunks: ${(mod.module_chunks || []).join('; ')}`,
    `Lesson ${u.id}: ${u.title} (${u.grammar_focus ?? ''}). Context: ${u.real_life_context ?? ''}`,
    `Grammar exercises:\n- ${g.join('\n- ')}`,
    `Listening & speaking sentences:\n- ${ls.join('\n- ')}`,
    u.roleplay?.opening_line ? `Role-play opening: ${u.roleplay.opening_line}` : '',
    u.guided_chat?.opening_message ? `Chat opening: ${u.guided_chat.opening_message}` : '',
  ].filter(Boolean).join('\n');
}

const clip = (s, n) => String(s ?? '').trim().slice(0, n);
function clean(items) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).map(i => ({
    term: clip(i.term, 60),
    category: ['word', 'idiom', 'phrasal_verb', 'grammar'].includes(i.category) ? i.category : 'word',
    definition: clip(i.definition, 120),
    example: clip(i.example, 160),
    ...(PT ? { example_pt: clip(i.example_pt, 180) } : {}),
  })).filter(i => i.term && !/[+]|\bsth\b|\bsb\b/.test(i.term) && i.term.split(/\s+/).length <= 5 && i.definition && i.example && !seen.has(i.term.toLowerCase()) && seen.add(i.term.toLowerCase())).slice(0, 6);
}

async function gen(mod, u) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4.1', temperature: 0.2, response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: unitPrompt(mod, u) }],
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const items = clean(JSON.parse(j.choices[0].message.content).items);
      if (items.length >= 3) return items;
      throw new Error('poucos itens');
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise(res => setTimeout(res, 1500 * attempt));
    }
  }
}

const keyOf = (m, u) => `${m.id}/${u.id}`;
// --refine: passa o filtro do "dia a dia" nos tópicos já gerados (não gera nada novo). Fica só o que se usa em
// conversa comum; termo técnico, raro, pedaço de pergunta/frase ou rótulo de gramática sai. Quem quiser algo
// mais específico adiciona à mão.
if (args.refine) {
  const REFINE = `You review a vocabulary list from one English lesson for Brazilian learners (level: ${LEVEL}).
KEEP only items a typical adult would really use in everyday conversation: common words, frequent collocations,
common phrasal verbs and well-known idioms. DROP: technical or academic jargon (e.g. "mean-reverting"), rare words,
sentence or question fragments (e.g. "Did you use to", "Does your brother live here?"), grammar labels or patterns,
and near-duplicates of another kept item. Return JSON {"keep":[indexes]} using the 0-based indexes given.`;
  const keys = Object.keys(out).filter(k => (args.unit ? k === args.unit : true));
  let removed = 0, i = 0;
  const q = [...keys];
  async function rw() {
    while (q.length) {
      const k = q.shift();
      const items = out[k];
      try {
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4.1', temperature: 0, response_format: { type: 'json_object' },
            messages: [{ role: 'system', content: REFINE }, { role: 'user', content: items.map((it, n) => `${n}. ${it.term} — ${it.definition}`).join('\n') }] }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const keep = new Set((JSON.parse((await r.json()).choices[0].message.content).keep || []).map(Number));
        const next = items.filter((_, n) => keep.has(n));
        if (next.length) { removed += items.length - next.length; out[k] = next; }
      } catch (e) { console.error(`${k}: ${e.message}`); }
      if (++i % 25 === 0) console.log(`  ${i}/${keys.length}`);
    }
  }
  await Promise.all(Array.from({ length: 6 }, rw));
  fs.writeFileSync(outFile, JSON.stringify(sortKeys(out)));
  console.log(`${LEVEL}: filtro do dia a dia em ${keys.length} tópicos, ${removed} itens removidos`);
  process.exit(0);
}

const units = modules.flatMap(m => m.units.map(u => ({ m, u, k: keyOf(m, u) })))
  .filter(({ k }) => (args.unit ? k === args.unit : true))
  .filter(({ k }) => args.force || !out[k]);
console.log(`${LEVEL}: ${units.length} tópico(s) para gerar`);
if (args.dry) { if (units[0]) console.log(unitPrompt(units[0].m, units[0].u)); process.exit(0); }

let done = 0, failed = 0;
const queue = [...units];
async function worker() {
  while (queue.length) {
    const { m, u, k } = queue.shift();
    try { out[k] = await gen(m, u); done++; }
    catch (e) { failed++; console.error(`${k}: ${e.message}`); }
    if ((done + failed) % 10 === 0) { fs.writeFileSync(outFile, JSON.stringify(sortKeys(out))); console.log(`  ${done + failed}/${units.length}`); }
  }
}
function sortKeys(o) { return Object.fromEntries(Object.keys(o).sort().map(k => [k, o[k]])); }
await Promise.all(Array.from({ length: 6 }, worker));
fs.writeFileSync(outFile, JSON.stringify(sortKeys(out)));
console.log(`${LEVEL}: ${done} gerados, ${failed} falharam → ${path.relative(ROOT, outFile)} (${(fs.statSync(outFile).size / 1024).toFixed(0)} KB)`);
