// E2E — API smoke suite. Hits REAL prod endpoints and checks status + shape.
//
// Cobre as rotas publicas de conteudo/IA com casos VALIDOS (espera 200 + shape)
// e casos EDGE/erro (espera degradacao graciosa — NUNCA 500). guided-chat/turn
// e roleplay/turn tem cobertura propria em run-guided-chats.mjs (nao duplicar).
//
// Uso:
//   node apps/web/scripts/e2e/api-smoke.mjs
//   node apps/web/scripts/e2e/api-smoke.mjs --api=https://charlotte.hubacademybr.com
//   node apps/web/scripts/e2e/api-smoke.mjs --quick   (menos casos, sem TTS)
//
// Saida: console + apps/web/scripts/e2e/output/api-smoke-<ts>.md

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true];
}));
const API = args.api ?? 'https://charlotte.hubacademybr.com';
const QUICK = !!args.quick;
const LEVELS = ['Novice', 'Inter', 'Advanced'];

// ── Test cases ────────────────────────────────────────────────────
// kind: 'valid' → espera 200 + assert; 'edge' → espera !==500 (gracioso)
const CASES = [];

// health
CASES.push({ group: 'health', name: 'GET /health', method: 'GET', path: '/api/health', kind: 'valid',
  assert: (s) => s < 500 });

// greeting — { firstName, level }
for (const level of LEVELS) {
  CASES.push({ group: 'greeting', name: `POST /greeting ${level}`, method: 'POST', path: '/api/greeting',
    body: { firstName: 'Felipe', level }, kind: 'valid',
    assert: (s, j) => s === 200 && typeof (j.greeting ?? j.message ?? j.text) === 'string' });
}
CASES.push({ group: 'greeting', name: 'POST /greeting (body vazio)', method: 'POST', path: '/api/greeting',
  body: {}, kind: 'edge' });

// learn-grammar — { type, level, userId }
const GRAMMAR_TYPES = QUICK ? ['fill_gap'] : ['fill_gap', 'fix_error', 'read_answer'];
for (const level of LEVELS) {
  for (const type of GRAMMAR_TYPES) {
    CASES.push({ group: 'learn-grammar', name: `POST /learn-grammar ${level}/${type}`, method: 'POST',
      path: '/api/learn-grammar', body: { type, level, userId: null }, kind: 'valid',
      assert: (s, j) => s === 200 && (j.question || j.sentence || j.prompt || j.exercise) != null });
  }
}
CASES.push({ group: 'learn-grammar', name: 'POST /learn-grammar (type invalido)', method: 'POST',
  path: '/api/learn-grammar', body: { type: 'garbage', level: 'Novice' }, kind: 'edge' });

// translate — { text, userLevel }
CASES.push({ group: 'translate', name: 'POST /translate', method: 'POST', path: '/api/translate',
  body: { text: 'I have been working here for two years.', userLevel: 'Novice' }, kind: 'valid',
  assert: (s, j) => s === 200 && typeof (j.translatedText ?? j.translation ?? j.text) === 'string' });
CASES.push({ group: 'translate', name: 'POST /translate (text vazio)', method: 'POST', path: '/api/translate',
  body: { text: '', userLevel: 'Inter' }, kind: 'edge' });

// demo-sentence — { words: string[] }
CASES.push({ group: 'demo-sentence', name: 'POST /demo-sentence', method: 'POST', path: '/api/demo-sentence',
  body: { words: ['resilient', 'overcome'] }, kind: 'valid',
  assert: (s, j) => s === 200 && (j.sentence || j.sentences || j.text) != null });

// pronunciation-semantic — { text }
CASES.push({ group: 'pronunciation-semantic', name: 'POST /pronunciation-semantic', method: 'POST',
  path: '/api/pronunciation-semantic', body: { text: 'The weather is lovely today.' }, kind: 'valid',
  assert: (s) => s === 200 });

// vocabulary — { term, level }
CASES.push({ group: 'vocabulary', name: 'POST /vocabulary', method: 'POST', path: '/api/vocabulary',
  body: { term: 'breakthrough', level: 'Advanced' }, kind: 'valid',
  assert: (s, j) => s === 200 && ((j.data?.definition ?? j.definition ?? j.meaning) != null || j.success === true) });

// enrich-term — GET ?term=&level=
CASES.push({ group: 'enrich-term', name: 'GET /enrich-term', method: 'GET',
  path: `/api/enrich-term?term=${encodeURIComponent('resilience')}&level=Inter`, kind: 'valid',
  assert: (s) => s === 200 });
CASES.push({ group: 'enrich-term', name: 'GET /enrich-term (sem term)', method: 'GET',
  path: '/api/enrich-term?level=Inter', kind: 'edge' });

// exercise-help — { question, correct_answer, level }
CASES.push({ group: 'exercise-help', name: 'POST /exercise-help', method: 'POST', path: '/api/exercise-help',
  body: { question: 'She ___ to school every day.', correct_answer: 'goes', level: 'Novice' }, kind: 'valid',
  assert: (s, j) => s === 200 && (j.help || j.explanation || j.text || j.message) != null });
CASES.push({ group: 'exercise-help', name: 'POST /exercise-help (faltando campos)', method: 'POST',
  path: '/api/exercise-help', body: { question: 'x' }, kind: 'edge' });

// summarize-chat — { sessionId, userId, userLevel } — sessionId falso → deve degradar
CASES.push({ group: 'summarize-chat', name: 'POST /summarize-chat (sessao inexistente)', method: 'POST',
  path: '/api/summarize-chat', body: { sessionId: '00000000-0000-0000-0000-000000000000', userId: null, userLevel: 'Inter' },
  kind: 'edge' });

// tts — { text } (pesado; pulado no --quick)
if (!QUICK) {
  CASES.push({ group: 'tts', name: 'POST /tts', method: 'POST', path: '/api/tts',
    body: { text: 'Hello, this is a test.', source: 'e2e-smoke' }, kind: 'valid',
    assert: (s) => s === 200 });
}

// ── Runner ────────────────────────────────────────────────────────
const out = [];
const log = (l = '') => { out.push(l); console.log(l); };

async function hit(c) {
  const url = API + c.path;
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: c.method,
      headers: c.body ? { 'Content-Type': 'application/json' } : {},
      body: c.body ? JSON.stringify(c.body) : undefined,
    });
    const ms = Date.now() - t0;
    const ct = res.headers.get('content-type') ?? '';
    let json = null, text = null;
    if (ct.includes('application/json')) { try { json = await res.json(); } catch {} }
    else { text = (await res.text()).slice(0, 120); }

    let verdict, note = '';
    if (res.status >= 500) { verdict = 'FAIL'; note = `HTTP ${res.status} (5xx)`; }
    else if (c.kind === 'edge') { verdict = 'PASS'; note = `gracioso (HTTP ${res.status})`; }
    else if (c.assert) {
      const ok = c.assert(res.status, json ?? {});
      verdict = ok ? 'PASS' : 'FAIL';
      note = ok ? `HTTP ${res.status}` : `assert falhou (HTTP ${res.status})`;
    } else { verdict = res.status === 200 ? 'PASS' : 'WARN'; note = `HTTP ${res.status}`; }

    return { ...c, verdict, note, ms, status: res.status,
      sample: json ? JSON.stringify(json).slice(0, 140) : (text ?? '') };
  } catch (e) {
    return { ...c, verdict: 'FAIL', note: `erro de rede: ${e.message}`, ms: Date.now() - t0, status: 0, sample: '' };
  }
}

const results = [];
log(`# API Smoke — ${new Date().toISOString()}`);
log(`- API: ${API}${QUICK ? '  (quick)' : ''}`);
log(`- Casos: ${CASES.length}\n`);

for (const c of CASES) {
  const r = await hit(c);
  results.push(r);
  const icon = r.verdict === 'PASS' ? 'PASS' : r.verdict === 'WARN' ? 'WARN' : 'FAIL';
  log(`[${icon}] ${r.name}  · ${r.ms}ms · ${r.note}`);
  if (r.verdict === 'FAIL' && r.sample) log(`        └ ${r.sample}`);
}

const pass = results.filter(r => r.verdict === 'PASS').length;
const warn = results.filter(r => r.verdict === 'WARN').length;
const fail = results.filter(r => r.verdict === 'FAIL').length;
log(`\n## Resumo: ${pass} PASS · ${warn} WARN · ${fail} FAIL  (de ${results.length})`);
if (fail) {
  log(`\n### Falhas`);
  for (const r of results.filter(r => r.verdict === 'FAIL'))
    log(`- **${r.name}** — ${r.note}${r.sample ? `\n  \`${r.sample}\`` : ''}`);
}

const outDir = path.join(__dirname, 'output');
fs.mkdirSync(outDir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
fs.writeFileSync(path.join(outDir, `api-smoke-${ts}.md`), out.join('\n'));
log(`\nRelatorio: apps/web/scripts/e2e/output/api-smoke-${ts}.md`);
process.exit(fail > 0 ? 1 : 0);
