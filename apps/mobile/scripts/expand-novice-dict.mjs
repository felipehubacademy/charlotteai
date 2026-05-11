#!/usr/bin/env node
// scripts/expand-novice-dict.mjs
// Extrai todas as palavras EN do conteúdo hardcoded do trail Novice
// (curriculum.ts + moduleIntros.ts) e adiciona ao WORD_DICT as que
// estão faltando, traduzidas via OpenAI.
//
// Uso:
//   OPENAI_API_KEY=sk-... node scripts/expand-novice-dict.mjs
//   OPENAI_API_KEY=sk-... node scripts/expand-novice-dict.mjs --dry-run
//
// Re-run safe — só adiciona palavras que NÃO estão no WORD_DICT atual.

import fs from 'node:fs';
import path from 'node:path';

const ROOT      = path.resolve(new URL('.', import.meta.url).pathname, '..');
const DICT_PATH = path.join(ROOT, 'lib/noviceDictionary.ts');
const CUR_PATH  = path.join(ROOT, 'data/curriculum.ts');
const INTRO_PATH= path.join(ROOT, 'data/moduleIntros.ts');

const DRY_RUN = process.argv.includes('--dry-run');

// ── 1. Dicionário existente ──────────────────────────────────────────────
const dictSrc = fs.readFileSync(DICT_PATH, 'utf8');
const existing = new Set();
{
  // Captura "word": "..." dentro de PHRASE_DICT e WORD_DICT
  const rx = /^\s*['"]([A-Za-z'-]+)['"]\s*:\s*['"]/gm;
  let m;
  while ((m = rx.exec(dictSrc)) !== null) existing.add(m[1].toLowerCase());
}
console.log(`Dictionary entries: ${existing.size}`);

// ── 2. Extrai strings de campos EN do Novice trail + intros ──────────────
function extractBalancedBlock(src, startPattern) {
  // startPattern é um regex que captura ATÉ (e incluindo) o "[" ou "{" de abertura
  const start = startPattern.exec(src);
  if (!start) return '';
  const openIdx = start.index + start[0].length - 1;
  const open  = src[openIdx];
  const close = open === '[' ? ']' : '}';
  let depth = 1, i = openIdx + 1;
  let inStr = null, escape = false, inLineComment = false, inBlockComment = false;
  while (i < src.length && depth > 0) {
    const ch = src[i];
    const next = src[i + 1];
    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
    } else if (inBlockComment) {
      if (ch === '*' && next === '/') { inBlockComment = false; i++; }
    } else if (inStr) {
      if (escape) { escape = false; }
      else if (ch === '\\') { escape = true; }
      else if (ch === inStr) { inStr = null; }
    } else {
      if (ch === '/' && next === '/') { inLineComment = true; i++; }
      else if (ch === '/' && next === '*') { inBlockComment = true; i++; }
      else if (ch === '"' || ch === "'" || ch === '`') inStr = ch;
      else if (ch === open)  depth++;
      else if (ch === close) depth--;
    }
    i++;
  }
  return src.slice(openIdx, i);
}

const curSrc   = fs.readFileSync(CUR_PATH,   'utf8');
const introSrc = fs.readFileSync(INTRO_PATH, 'utf8');
// Estrutura real: NOVICE_MODULES: Module[] = [...]; e Novice: {...} em moduleIntros
const noviceCur   = extractBalancedBlock(curSrc,   /NOVICE_MODULES\s*:\s*Module\[\]\s*=\s*\[/);
const noviceIntro = extractBalancedBlock(introSrc, /Novice\s*:\s*\{/);
console.log(`Novice curriculum block: ${noviceCur.length} chars`);
console.log(`Novice intros block:     ${noviceIntro.length} chars`);

// Campos com texto EN que precisa de pontilhado pro Novice.
// 'question' e 'hint' costumam estar em PT (instruções da Charlotte) — pular.
const EN_FIELDS = ['sentence','passage','answer','prompt','title','options','choices','words','correct','tokens','demo'];

// String literal com escape support: 'x\'y' funciona
const STR_PART = `(?:\`(?:[^\`\\\\]|\\\\.)*\`)|(?:'(?:[^'\\\\]|\\\\.)*')|(?:"(?:[^"\\\\]|\\\\.)*")`;
// Array de strings (single-line; o curriculum tem todas as arrays em 1 linha)
const ARR_PART = `\\[[^\\]]*\\]`;

const enTexts = [];
function extractFieldStrings(src) {
  const rx = new RegExp(`\\b(${EN_FIELDS.join('|')})\\s*:\\s*((${STR_PART})|(${ARR_PART}))`, 'g');
  let m;
  while ((m = rx.exec(src)) !== null) {
    let val = m[2];
    if (val.startsWith('[')) {
      // Pega strings literais dentro do array, lidando com escapes
      const innerRx = new RegExp(STR_PART, 'g');
      const items = val.match(innerRx) ?? [];
      for (const it of items) {
        // Strip aspas externas + des-escapa \'
        enTexts.push(it.slice(1, -1).replace(/\\(['"`])/g, '$1'));
      }
    } else {
      enTexts.push(val.slice(1, -1).replace(/\\(['"`])/g, '$1'));
    }
  }
}
extractFieldStrings(noviceCur);
extractFieldStrings(noviceIntro);
console.log(`EN field strings extracted: ${enTexts.length}`);

// ── 3. Tokeniza + filtra ─────────────────────────────────────────────────
// Lista de stopwords PT comuns que aparecem como falso-positivo
const PT_STOPWORDS = new Set([
  'agora','alguns','algumas','antes','ao','aos','ali','assim','até','com','como','das','das','de','do','dos','em','foi','foram','ja','já','la','lá','mas','mais','não','nao','no','nos','na','nas','ou','para','pelo','pela','pelos','pelas','por','que','sao','são','seu','sua','seus','suas','um','uma','uns','umas','tambem','também','sobre','isso','isto','este','esta','estes','estas','esse','essa','esses','essas','aquele','aquela','aqui','adjetivo','adjetivos','adverbio','adverbios','afirmativo','afirmativa','afirmativas','negativo','negativas','positiva','positivo','exemplo','exemplos','frase','frases','traducao','traduzir','adicionamos','frequencia','frequência','contracao','contrações','adicionar','agora','simples','presente','passado','futuro','perfeito','continuo','contínuo','quando','quanto','qual','quais','onde','porque','aprender','aprendizado','licao','lição','licoes','lições','licao','licoes','exercicio','exercicios','exercício','exercícios','responder','perguntar','dialogo','diálogo','feminino','masculino','singular','plural','pronome','pronomes','verbo','verbos','sujeito','sujeitos','objeto','objetos','substantivo','substantivos','artigo','artigos','preposicao','preposição','preposições','interrogativa','interrogativo','interrogativas','interrogativos','negacao','negação','negativa','contraida','contraída',
]);

const words = new Set();
for (const text of enTexts) {
  const cleaned = text.replace(/_{2,}/g, ' ').replace(/\\n/g, ' ');
  const tokens = cleaned.match(/[A-Za-z][A-Za-z'-]+/g) ?? [];
  for (const t of tokens) {
    const w = t.toLowerCase();
    if (w.length < 3) continue;          // skip "i", "a", curtas (já cobertas)
    if (existing.has(w)) continue;       // já tem
    if (PT_STOPWORDS.has(w)) continue;   // PT óbvio
    if (/^[bcdfghjklmnpqrstvwxz']+$/.test(w)) continue; // só consoantes, lixo
    words.add(w);
  }
}
const missing = [...words].sort();
console.log(`Missing (após filtro PT stopwords): ${missing.length}`);

if (DRY_RUN) {
  console.log('--- Dry run: primeiras 80 palavras faltantes ---');
  console.log(missing.slice(0, 80).join(', '));
  console.log(`\nUse 'OPENAI_API_KEY=sk-... node ${process.argv[1]}' pra traduzir.`);
  process.exit(0);
}

// ── 4. Traduz via OpenAI (gpt-4.1-mini) em chunks ────────────────────────
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('OPENAI_API_KEY não definido. Use: OPENAI_API_KEY=sk-... node ...');
  process.exit(1);
}

const CHUNK = 40;
const translations = {};
const sysPrompt = `Você traduz palavras de inglês para português brasileiro para um app de aprendizado de inglês para iniciantes brasileiros (Novice).
- Retorne SOMENTE JSON object {"palavra_en": "tradução_pt", ...}
- Traduções CURTAS (1-4 palavras max). Verbos no infinitivo. Substantivos no singular.
- Múltiplos sentidos: use " / " (ex: "back": "atrás / costas")
- Se a palavra já for portuguesa OU não fizer sentido traduzir (sigla, nome próprio comum tipo "John"), use string vazia ""
- Não inclua chaves que não estão na lista de entrada.`;

async function translateBatch(batch) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user',   content: 'Traduza estas palavras: ' + JSON.stringify(batch) },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err}`);
  }
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

console.log(`\nTraduzindo ${missing.length} palavras em chunks de ${CHUNK}...`);
for (let i = 0; i < missing.length; i += CHUNK) {
  const batch = missing.slice(i, i + CHUNK);
  process.stdout.write(`  ${i + 1}-${i + batch.length}/${missing.length}... `);
  try {
    const obj = await translateBatch(batch);
    let added = 0;
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v !== 'string') continue;
      const t = v.trim();
      if (!t) continue;                          // skip empty (PT ou sem sentido)
      if (t.toLowerCase() === k.toLowerCase()) continue; // não traduziu
      if (t.length > 80) continue;               // resposta desviou
      translations[k.toLowerCase()] = t;
      added++;
    }
    console.log(`+${added}`);
  } catch (e) {
    console.log(`erro: ${e.message}`);
  }
}

console.log(`\nTraduções obtidas: ${Object.keys(translations).length}`);

// ── 5. Insere novas entradas no WORD_DICT ───────────────────────────────
const newEntries = Object.entries(translations)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
  .join('\n');

// Encontra o final do WORD_DICT (linha "};") e insere antes
const updated = dictSrc.replace(
  /(const WORD_DICT[\s\S]+?)(\n\};\n\n\/\/ Normalize)/,
  `$1\n  // --- Auto-expanded from Novice trail content (curriculum + intros) ---\n${newEntries}$2`,
);

if (updated === dictSrc) {
  console.error('Não consegui localizar o ponto de inserção no WORD_DICT. Aborting.');
  process.exit(1);
}

fs.writeFileSync(DICT_PATH, updated);
console.log(`\nAtualizado ${path.relative(process.cwd(), DICT_PATH)} com ${Object.keys(translations).length} novas entradas.`);
