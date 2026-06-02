// Synthetic Student — roda o aluno absolute-zero ponta a ponta na trilha Novice
// (ou level especificado), valida exercicios, conversa com role-play e chat
// via APIs reais, gera relatorio markdown.
//
// Uso:
//   node apps/web/scripts/synthetic-student/run.mjs --level=Novice --module=M01
//   node apps/web/scripts/synthetic-student/run.mjs --level=Novice           # M01..M24
//   node apps/web/scripts/synthetic-student/run.mjs --module=M01 --unit=N01  # so 1 unit
//
// Output: apps/web/scripts/synthetic-student/output/<level>-<timestamp>.md

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkGrammar } from './check-grammar.mjs';
import { answerGrammarExercise } from './persona.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

// ── Args ──────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const LEVEL = args.level ?? 'Novice';
const MODULE_FILTER = args.module ?? null;
const UNIT_FILTER = args.unit ?? null;
const MAX_ATTEMPTS = parseInt(args['max-attempts'] ?? '3', 10);
const API_BASE = args['api'] ?? 'https://charlotte.hubacademybr.com';

// ── Env ───────────────────────────────────────────────────────────
const envPath = path.join(ROOT, '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_KEY) throw new Error('OPENAI_API_KEY missing in .env.local');

// ── Load curriculum ───────────────────────────────────────────────
const levelDir = path.join(ROOT, 'apps', 'mobile', 'data', 'curriculum-v2', LEVEL.toLowerCase());
const moduleFiles = fs.readdirSync(levelDir).filter(f => f.endsWith('.json')).sort();
const modules = moduleFiles
  .map(f => JSON.parse(fs.readFileSync(path.join(levelDir, f), 'utf8')))
  .filter(m => !MODULE_FILTER || m.id === MODULE_FILTER);

// ── State ─────────────────────────────────────────────────────────
const learnedChunks = new Set(['ok', 'yes', 'no', 'hi', 'bye']);
const report = [];

function log(msg) {
  console.log(msg);
  report.push(msg);
}

function summary(o) {
  const parts = [];
  for (const [k, v] of Object.entries(o)) parts.push(`${k}=${v}`);
  return parts.join(' ');
}

// ── Run grammar ───────────────────────────────────────────────────
async function runGrammarUnit(modId, unit) {
  const exercises = unit.grammar ?? [];
  if (exercises.length === 0) return null;

  log(`\n### ${modId}/${unit.id} — Grammar (${exercises.length} ex)\n`);
  const results = [];

  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    let passed = false;
    let attempts = 0;
    let lastAnswer = '';
    let lastThought = '';

    while (!passed && attempts < MAX_ATTEMPTS) {
      attempts++;
      const { answer, thought } = await answerGrammarExercise(OPENAI_KEY, ex, learnedChunks, attempts);
      lastAnswer = answer;
      lastThought = thought;
      passed = checkGrammar(ex, answer);
    }

    results.push({ idx: i, type: ex.type, passed, attempts, answer: lastAnswer, expected: ex.answer, thought: lastThought });

    const status = passed ? '✓' : '✗';
    log(`  [${status}] ex${i} (${ex.type}) tries=${attempts} → "${lastAnswer}" (expected: "${ex.answer}")`);
    if (!passed) log(`      thought: ${lastThought}`);
  }

  const passed = results.filter(r => r.passed).length;
  const score = Math.round((passed / results.length) * 100);
  log(`\n  ✦ Grammar score: ${score}% (${passed}/${results.length}), avg attempts: ${(results.reduce((s, r) => s + r.attempts, 0) / results.length).toFixed(2)}`);
  return { results, score, passed, total: results.length };
}

// ── Run roleplay ──────────────────────────────────────────────────
async function runRoleplayUnit(modId, unit) {
  const rp = unit.roleplay;
  if (!rp || !rp.objectives) return null;

  log(`\n### ${modId}/${unit.id} — Role-play (${rp.objectives.length} obj)\n`);

  const history = [{ role: 'assistant', content: rp.opening_line }];
  const objectivesMet = new Set();
  const transcript = [`Charlotte: ${rp.opening_line}`];
  let stuckTurns = 0;
  let turns = 0;
  const maxTurns = 10;

  while (objectivesMet.size < rp.objectives.length && turns < maxTurns) {
    turns++;
    const nextObj = rp.objectives.find(o => !objectivesMet.has(o.id));
    // Pick a beginner-natural reply: use hint_en chunks (which simulate what
    // someone who learned the unit would try). With small mutations.
    const studentReply = await generateStudentTurn(history, rp, nextObj);
    transcript.push(`Student: ${studentReply}`);
    history.push({ role: 'user', content: studentReply });

    // Call roleplay/turn API — but it requires audio (Whisper). Skip audio for
    // synthetic student: hit a TEXT-mode fallback. For now we'll call the
    // chat-based judge logic directly via a parallel guided-chat call format.
    // (Synthetic v1: simplified — judge inline via gpt-4o-mini call.)
    const judgement = await judgeTurn(rp, history, studentReply);
    history.push({ role: 'assistant', content: judgement.reply });
    transcript.push(`Charlotte: ${judgement.reply}`);

    if (judgement.objectives_met?.length > 0) {
      for (const id of judgement.objectives_met) objectivesMet.add(id);
      stuckTurns = 0;
    } else {
      stuckTurns++;
    }
    if (stuckTurns >= 3) break;
  }

  const score = Math.round((objectivesMet.size / rp.objectives.length) * 100);
  log(`  Transcript:`);
  for (const line of transcript) log(`    ${line}`);
  log(`  ✦ Role-play score: ${score}% (${objectivesMet.size}/${rp.objectives.length}), turns: ${turns}`);
  return { transcript, objectivesMet: Array.from(objectivesMet), score, turns };
}

// ── Run guided chat ──────────────────────────────────────────────
async function runChatUnit(modId, unit) {
  const gc = unit.guided_chat;
  if (!gc || !gc.objectives) return null;

  log(`\n### ${modId}/${unit.id} — Guided Chat (${gc.objectives.length} obj)\n`);

  const history = [{ role: 'assistant', content: gc.opening_message }];
  const objectivesMet = new Set();
  const transcript = [`Charlotte: ${gc.opening_message}`];
  let stuckTurns = 0;
  let turns = 0;
  const maxTurns = 10;

  while (objectivesMet.size < gc.objectives.length && turns < maxTurns) {
    turns++;
    const nextObj = gc.objectives.find(o => !objectivesMet.has(o.id));
    const studentReply = await generateStudentTurn(history, gc, nextObj);
    transcript.push(`Student: ${studentReply}`);
    history.push({ role: 'user', content: studentReply });

    const judgement = await judgeTurn(gc, history, studentReply);
    history.push({ role: 'assistant', content: judgement.reply });
    transcript.push(`Charlotte: ${judgement.reply}`);

    if (judgement.objectives_met?.length > 0) {
      for (const id of judgement.objectives_met) objectivesMet.add(id);
      stuckTurns = 0;
    } else {
      stuckTurns++;
    }
    if (stuckTurns >= 3) break;
  }

  const score = Math.round((objectivesMet.size / gc.objectives.length) * 100);
  log(`  Transcript:`);
  for (const line of transcript) log(`    ${line}`);
  log(`  ✦ Chat score: ${score}% (${objectivesMet.size}/${gc.objectives.length}), turns: ${turns}`);
  return { transcript, objectivesMet: Array.from(objectivesMet), score, turns };
}

async function generateStudentTurn(history, rp, nextObj) {
  const persona = `You are Felipe (beginner Brazilian). You are in a role-play. Generate ONE short reply (English or PT-BR mix) that attempts the next objective. Use only chunks you've learned. The next sub-objective hint suggests: "${nextObj.hint_en ?? nextObj.hint_pt}".`;
  const histText = history.map(h => `${h.role === 'assistant' ? 'Charlotte' : 'You'}: ${h.content}`).join('\n');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: persona },
        { role: 'user', content: `Conversation so far:\n${histText}\n\nGenerate your next short reply. Output ONLY the reply text, nothing else.` },
      ],
      temperature: 0.7,
      max_tokens: 60,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, '') ?? '';
}

async function judgeTurn(rp, history, lastUserMsg) {
  // Mirror the real /api/roleplay/turn judge logic via gpt-4o-mini
  const objectivesBlock = rp.objectives.map(o => {
    const hint = o.hint_en ? `\n    Canonical: "${o.hint_en}"` : '';
    return `  - Objective ${o.id}: ${o.hidden_prompt}${hint}`;
  }).join('\n');

  const sys = `You are playing ${rp.persona} in an English role-play. Stay in character. Reply short (1-2 sentences).
HIDDEN OBJECTIVES (don't reveal):
${objectivesBlock}

Mark objectives in objectives_met if the student's last message satisfies any (use canonical example as anchor; chunk match is sufficient).

Output JSON: { "reply": "<your reply>", "objectives_met": [<ids>] }`;

  const msgs = [{ role: 'system', content: sys }, ...history];
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: msgs,
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 200,
    }),
  });
  const data = await res.json();
  try {
    return JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
  } catch {
    return { reply: '...', objectives_met: [] };
  }
}

// ── Absorve chunks do modulo ──────────────────────────────────────
function absorbModuleChunks(mod) {
  // chunks_introduced no MD — vamos extrair via campo do JSON se existir,
  // ou inferir das hints. Por agora, marca chunks por hint_en de cada objetivo
  // + answer dos exercicios de chunks (multiple_choice/fill_gap com answer text).
  let added = 0;
  for (const u of mod.units ?? []) {
    for (const ex of u.grammar ?? []) {
      if (typeof ex.answer === 'string' && ex.answer.length > 1 && ex.answer.length < 40) {
        learnedChunks.add(ex.answer.toLowerCase());
        added++;
      }
    }
    for (const obj of u.roleplay?.objectives ?? []) {
      if (obj.hint_en) { learnedChunks.add(obj.hint_en.toLowerCase()); added++; }
    }
    for (const obj of u.guided_chat?.objectives ?? []) {
      if (obj.hint_en) { learnedChunks.add(obj.hint_en.toLowerCase()); added++; }
    }
  }
  return added;
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  log(`# Synthetic Student Run — ${LEVEL} — ${new Date().toISOString()}\n`);
  log(`Persona: absolute-zero Brazilian Felipe, 35yo, never studied English.\n`);
  log(`Modules to run: ${modules.map(m => m.id).join(', ')}\n`);

  const moduleResults = [];
  for (const mod of modules) {
    log(`\n## ${mod.id} — ${mod.title ?? ''}\n`);
    log(`Vocab before module: ${learnedChunks.size} chunks`);
    const unitResults = [];

    for (const unit of mod.units ?? []) {
      if (UNIT_FILTER && unit.id !== UNIT_FILTER) continue;
      log(`\n#### Unit ${unit.id} — ${unit.title ?? ''}`);

      const grammarRes = await runGrammarUnit(mod.id, unit);
      // L&S nao tem como testar com IA (precisa voz humana pra Azure Speech)
      // — mock-pass com nota 100 pra cascade desbloquear o resto.
      log(`### ${mod.id}/${unit.id} — Listening & Speaking → SKIPPED (mock 100)`);
      const rpRes = await runRoleplayUnit(mod.id, unit);
      const chatRes = await runChatUnit(mod.id, unit);

      unitResults.push({ id: unit.id, title: unit.title, grammar: grammarRes, roleplay: rpRes, chat: chatRes });
    }

    const added = absorbModuleChunks(mod);
    log(`\n→ Absorbed ${added} new chunks. Vocab now: ${learnedChunks.size}`);
    moduleResults.push({ id: mod.id, title: mod.title, units: unitResults, chunksAfter: learnedChunks.size });
  }

  // ── Summary ────────────────────────────────────────────────────
  log(`\n\n# ───── FINAL SUMMARY ─────\n`);
  for (const m of moduleResults) {
    const gScores = m.units.map(u => u.grammar?.score).filter(s => s != null);
    const rScores = m.units.map(u => u.roleplay?.score).filter(s => s != null);
    const cScores = m.units.map(u => u.chat?.score).filter(s => s != null);
    const gAvg = gScores.length ? Math.round(gScores.reduce((a, b) => a + b, 0) / gScores.length) : null;
    const rAvg = rScores.length ? Math.round(rScores.reduce((a, b) => a + b, 0) / rScores.length) : null;
    const cAvg = cScores.length ? Math.round(cScores.reduce((a, b) => a + b, 0) / cScores.length) : null;
    log(`- ${m.id}: grammar=${gAvg ?? '-'}% rp=${rAvg ?? '-'}% chat=${cAvg ?? '-'}% (vocab=${m.chunksAfter})`);
  }

  // Write to file
  const outDir = path.join(__dirname, 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = path.join(outDir, `${LEVEL}-${MODULE_FILTER ?? 'all'}-${ts}.md`);
  fs.writeFileSync(outFile, report.join('\n'));
  console.log(`\n→ Report saved: ${outFile}`);
}

main().catch(e => { console.error(e); process.exit(1); });
