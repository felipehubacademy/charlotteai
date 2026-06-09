// Synthetic Student — Guided Chats only, hitting REAL prod endpoint.
// Tests the actually deployed prompt + guard + judge logic.
//
// Uso:
//   node apps/web/scripts/synthetic-student/run-guided-chats.mjs --level=Novice
//   node apps/web/scripts/synthetic-student/run-guided-chats.mjs --level=Novice --module=M14
//
// Output: apps/web/scripts/synthetic-student/output/guided-chats-<timestamp>.md

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
const MAX_TURNS = parseInt(args['max-turns'] ?? '8', 10);
const API_BASE = args['api'] ?? 'https://charlotte.hubacademybr.com';
const STUDENT_PROFILE = args['student'] ?? 'good'; // good | sloppy | bare

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

// ── Output ────────────────────────────────────────────────────────
const outDir = path.join(__dirname, 'output');
fs.mkdirSync(outDir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outPath = path.join(outDir, `guided-chats-${LEVEL}-${ts}.md`);
const out = [];
function log(line = '') {
  out.push(line);
  console.log(line);
}

// ── Student persona ───────────────────────────────────────────────
// "good" = follows the suggested hint reasonably (via LLM)
// "sloppy" = sometimes uses bare words or fragments
// "bare" = always answers with minimal bare nouns (to test STRUCTURE rule)
// "literal_scaffold" = sends EXACTLY hint_en of next pending obj.
//   Worst-case test: aluno trava e copia o scaffold literal, sem improviso.
//   NAO chama LLM — deterministico. Revela teto real do sistema.
async function generateStudentTurn(history, gc, nextObj, profile = STUDENT_PROFILE) {
  if (profile === 'literal_scaffold') {
    return (nextObj?.hint_en ?? nextObj?.hint_pt ?? '').trim();
  }
  const hintLine = nextObj?.hint_en
    ? `The next objective hint suggests: "${nextObj.hint_en}".`
    : '';
  const passLine = nextObj?.examples_pass?.length
    ? `Examples that satisfy the obj: ${nextObj.examples_pass.map(e => `"${e}"`).join(', ')}.`
    : '';
  // Persona scale por level — aluno tipicamente APRENDENDO o nivel,
  // nao dominando ele. Novice = A1-A2 learner. Inter = B1-B2 learner.
  // Advanced = B2-C1 learner (transitioning to mastery).
  const levelPersona = LEVEL === 'Advanced'
    ? "Brazilian upper-intermediate learner transitioning to advanced English (CEFR B2-C1). You CAN use complex structures (reported speech, conditionals, inversions, hedging, idioms) but sometimes still hesitate or simplify."
    : LEVEL === 'Inter'
      ? "Brazilian intermediate learner (CEFR B1-B2). Comfortable with present perfect, past continuous, basic conditionals; still building modals and phrasal verbs fluency."
      : "Brazilian absolute beginner (CEFR A1-A2). Very limited vocabulary, simple present mostly, short sentences.";
  const profileDesc = profile === 'bare'
    ? "Always reply with just ONE BARE word/noun (no subject, no verb structure). E.g. if asked about food, just say 'pasta' alone. This tests if the system requires structure."
    : profile === 'sloppy'
      ? "Sometimes reply with the full hint, sometimes with bare words/fragments. Mix it up."
      : "Reply with the suggested hint structure, naturally matching the persona's level.";
  const persona = `You are a ${levelPersona}\n${profileDesc}\n${hintLine}\n${passLine}`;
  const histText = history.map(h => `${h.role === 'assistant' ? 'Charlotte' : 'You'}: ${h.content}`).join('\n');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: persona },
        { role: 'user', content: `Conversation so far:\n${histText}\n\nWrite your next short reply (1 line). Output ONLY the reply text.` },
      ],
      temperature: 0.5,
      max_tokens: 60,
    }),
  });
  const data = await res.json();
  return (data.choices?.[0]?.message?.content?.trim() ?? '').replace(/^["']|["']$/g, '');
}

// ── Hit real prod endpoint ────────────────────────────────────────
async function callProdGuidedChat(history, gc, userMessage, unitTitle, stuckTurns, nextObjectiveId) {
  const res = await fetch(`${API_BASE}/api/guided-chat/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      history,
      guided_chat: gc,
      level: LEVEL,
      user_message: userMessage,
      unit_title: unitTitle,
      stuck_turns: stuckTurns,
      next_objective_id: nextObjectiveId,
      user_name: 'SyntheticFelipe',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text.slice(0, 200)}`);
  }
  return await res.json();
}

// ── Run one guided chat ───────────────────────────────────────────
async function runGuidedChat(modId, unit) {
  const gc = unit.guided_chat;
  if (!gc || !gc.objectives) return null;

  const history = [{ role: 'assistant', content: gc.opening_message }];
  const objectivesMet = new Set();
  const transcript = [`Charlotte: ${gc.opening_message}`];
  let stuckTurns = 0;
  let turns = 0;

  while (objectivesMet.size < gc.objectives.length && turns < MAX_TURNS) {
    turns++;
    const nextObj = gc.objectives.find(o => !objectivesMet.has(o.id));
    let studentReply;
    try {
      studentReply = await generateStudentTurn(history, gc, nextObj);
      // Persona LLM as vezes retorna vazio com prompts complexos (Advanced).
      // Retry uma vez, fallback pra hint_en se vier vazio de novo.
      if (!studentReply || studentReply.length < 2) {
        studentReply = await generateStudentTurn(history, gc, nextObj);
        if (!studentReply || studentReply.length < 2) {
          studentReply = (nextObj?.hint_en ?? 'Sorry, can you rephrase?').trim();
          transcript.push(`  [persona-fallback] empty -> hint_en`);
        }
      }
    } catch (e) {
      transcript.push(`[STUDENT-ERR] ${e.message}`);
      break;
    }
    transcript.push(`Student: ${studentReply}`);
    history.push({ role: 'user', content: studentReply });

    let response;
    try {
      response = await callProdGuidedChat(history, gc, studentReply, unit.title, stuckTurns, nextObj?.id);
    } catch (e) {
      transcript.push(`[API-ERR] ${e.message}`);
      break;
    }
    const charlotteReply = response.reply ?? '';
    history.push({ role: 'assistant', content: charlotteReply });
    transcript.push(`Charlotte: ${charlotteReply}`);

    const newlyMet = (response.objectives_met ?? []).filter(id => !objectivesMet.has(id));
    for (const id of (response.objectives_met ?? [])) objectivesMet.add(id);
    if (newlyMet.length > 0) {
      stuckTurns = 0;
      transcript.push(`  → marked obj(s): ${newlyMet.join(', ')}`);
    } else {
      stuckTurns++;
    }
    if (response.status === 'complete') break;
    if (stuckTurns >= 3) {
      transcript.push(`  → stuck 3 turns, aborting`);
      break;
    }
  }

  const score = Math.round((objectivesMet.size / gc.objectives.length) * 100);
  return {
    modId,
    unitId: unit.id,
    unitTitle: unit.title,
    score,
    metCount: objectivesMet.size,
    totalCount: gc.objectives.length,
    turns,
    transcript,
  };
}

// ── Main ──────────────────────────────────────────────────────────
log(`# Synthetic Student — Guided Chats Report\n`);
log(`- Level: **${LEVEL}**`);
log(`- API: ${API_BASE}`);
log(`- Student profile: ${STUDENT_PROFILE}`);
log(`- Generated: ${new Date().toISOString()}`);
log(`- Max turns/chat: ${MAX_TURNS}`);
log('');

const allResults = [];
for (const mod of modules) {
  const units = mod.units.filter(u => !UNIT_FILTER || u.id === UNIT_FILTER);
  log(`## ${mod.id} — ${mod.theme ?? ''}\n`);
  for (const unit of units) {
    process.stdout.write(`  ${mod.id}/${unit.id}... `);
    const res = await runGuidedChat(mod.id, unit);
    if (!res) { log(`  ${unit.id}: (no guided_chat)`); continue; }
    allResults.push(res);
    const emoji = res.score === 100 ? '✓' : res.score >= 67 ? '~' : '✗';
    log(`### ${emoji} ${unit.id} — ${unit.title} — **${res.score}%** (${res.metCount}/${res.totalCount}, ${res.turns} turns)\n`);
    log('```');
    for (const line of res.transcript) log(line);
    log('```\n');
  }
}

// ── Summary ───────────────────────────────────────────────────────
log('---\n');
log('## Summary\n');
const passed = allResults.filter(r => r.score === 100);
const partial = allResults.filter(r => r.score >= 67 && r.score < 100);
const failed = allResults.filter(r => r.score < 67);
log(`- ✓ 100%: **${passed.length}** units`);
log(`- ~ 67-99%: **${partial.length}** units`);
log(`- ✗ <67%: **${failed.length}** units`);
log(`- Total: ${allResults.length} units\n`);
const avg = allResults.length > 0
  ? Math.round(allResults.reduce((s, r) => s + r.score, 0) / allResults.length)
  : 0;
log(`Average score: **${avg}%**\n`);

if (failed.length > 0) {
  log(`### Failed units (sorted by score)\n`);
  failed.sort((a, b) => a.score - b.score);
  for (const r of failed) {
    log(`- **${r.modId}/${r.unitId}** (${r.score}%) — ${r.unitTitle}`);
  }
  log('');
}

if (partial.length > 0) {
  log(`### Partial units\n`);
  partial.sort((a, b) => a.score - b.score);
  for (const r of partial) {
    log(`- **${r.modId}/${r.unitId}** (${r.score}%) — ${r.unitTitle}`);
  }
}

fs.writeFileSync(outPath, out.join('\n'));
console.log(`\n\nReport saved: ${outPath}`);
