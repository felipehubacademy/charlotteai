#!/usr/bin/env node
/**
 * compile-curriculum-v2.mjs
 *
 * Reads markdown modules from docs/curriculum/v2/<level>/M<NN>-<slug>.md
 * and emits typed JSON to apps/mobile/data/curriculum-v2/<level>/M<NN>.json,
 * plus a manifest at apps/mobile/data/curriculum-v2/manifest.json.
 *
 * Usage:
 *   node apps/mobile/scripts/compile-curriculum-v2.mjs
 *   node apps/mobile/scripts/compile-curriculum-v2.mjs --only=novice/M01
 *   node apps/mobile/scripts/compile-curriculum-v2.mjs --verbose
 *
 * The schema matches apps/mobile/lib/curriculum-v2/types.ts.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../../..');
const SRC  = path.join(REPO, 'docs/curriculum/v2');
const OUT  = path.join(REPO, 'apps/mobile/data/curriculum-v2');

const args     = process.argv.slice(2);
const ONLY     = (args.find(a => a.startsWith('--only=')) || '').slice(7);
const VERBOSE  = args.includes('--verbose');

main();

// ─── Top-level driver ─────────────────────────────────────────────

function main() {
  const files = collectFiles();
  const manifest = { level: {}, generated_at: new Date().toISOString() };
  let okCount = 0;

  for (const f of files) {
    if (ONLY && !f.relPath.includes(ONLY)) continue;
    try {
      const mod = parseModule(f.absPath);
      validate(mod, f.relPath);
      write(f, mod);
      manifest.level[f.level] ??= [];
      manifest.level[f.level].push({ id: mod.id, title: mod.title, file: `${f.level}/M${mod.id.slice(1)}.json` });
      console.log(
        `OK  ${f.relPath} -> ${mod.units.length} units, ` +
        `${countGrammar(mod)} grammar, ${countLS(mod)} LS phrases, ` +
        `${countObjectives(mod, 'roleplay')} role-play objs, ` +
        `${countObjectives(mod, 'guided_chat')} guided-chat objs`
      );
      okCount++;
    } catch (err) {
      console.error(`ERR ${f.relPath}: ${err.message}`);
      if (VERBOSE) console.error(err.stack);
      process.exit(1);
    }
  }

  if (okCount > 0 && !ONLY) {
    fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  }
  console.log(`\nDone: ${okCount} module(s) compiled.`);
}

function collectFiles() {
  const out = [];
  for (const level of ['novice', 'inter', 'advanced']) {
    const dir = path.join(SRC, level);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir).sort()) {
      if (!name.endsWith('.md')) continue;
      out.push({ level, name, absPath: path.join(dir, name), relPath: `${level}/${name}` });
    }
  }
  return out;
}

function write(f, mod) {
  const dir = path.join(OUT, f.level);
  fs.mkdirSync(dir, { recursive: true });
  const m = f.name.match(/^M(\d+)/);
  if (!m) throw new Error(`Cannot extract module number from ${f.name}`);
  const outFile = path.join(dir, `M${m[1]}.json`);
  fs.writeFileSync(outFile, JSON.stringify(mod, null, 2) + '\n');
}

function countGrammar(mod)    { return mod.units.reduce((a, u) => a + (u.grammar?.length || 0), 0); }
function countLS(mod)         { return mod.units.reduce((a, u) => a + (u.listening_speaking?.length || 0), 0); }
function countObjectives(mod, kind) {
  return mod.units.reduce((a, u) => a + (u[kind]?.objectives?.length || 0), 0);
}

function validate(mod, relPath) {
  if (!mod.id)               throw new Error(`Missing module id`);
  if (!mod.units?.length)    throw new Error(`No units found`);
  for (const u of mod.units) {
    if (!u.grammar?.length)             throw new Error(`Unit ${u.id}: no grammar exercises`);
    if (!u.listening_speaking?.length)  throw new Error(`Unit ${u.id}: no L/S phrases`);
    if (!u.roleplay)                    throw new Error(`Unit ${u.id}: missing role-play`);
    if (!u.guided_chat)                 throw new Error(`Unit ${u.id}: missing guided-chat`);
    if (!u.roleplay.objectives?.length) throw new Error(`Unit ${u.id} role-play: 0 objectives`);
    if (!u.guided_chat.objectives?.length) throw new Error(`Unit ${u.id} guided-chat: 0 objectives`);
    for (const ex of u.grammar) {
      if (ex.type !== 'short_write' && !ex.answer) {
        throw new Error(`Unit ${u.id}: grammar exercise missing answer (type=${ex.type})`);
      }
    }
  }
}

// ─── Module-level parsing ─────────────────────────────────────────

function parseModule(absPath) {
  const text = fs.readFileSync(absPath, 'utf8');

  const h2 = splitByHeader(text, 2);
  const prelude = h2[0].body;
  const mod = parseModulePrelude(prelude);
  mod.module_chunks = [];
  mod.units = [];
  mod.cross_unit_consolidation = [];

  for (let i = 1; i < h2.length; i++) {
    const sec = h2[i];
    if (/^Module chunks introduced/i.test(sec.title)) {
      mod.module_chunks = parseBulletList(sec.body);
    } else if (/^Unit /i.test(sec.title)) {
      mod.units.push(parseUnit(sec.title, sec.body));
    } else if (/^Cross-unit consolidation/i.test(sec.title)) {
      mod.cross_unit_consolidation = parseBulletList(sec.body);
    }
  }
  return mod;
}

function parseModulePrelude(text) {
  const h1 = text.match(/^#\s+Module\s+(M\d+)\s*[—–-]\s*(.+)$/m);
  if (!h1) throw new Error('Module h1 header not found');
  const id    = h1[1];
  const title = h1[2].trim();

  return {
    id,
    title,
    level: extractLevel(parseBlockquoteField(text, 'Level')),
    block: extractBlock(parseBlockquoteField(text, 'Block')),
    units_range: extractUnitRange(parseBlockquoteField(text, 'Units')),
    theme: parseBlockquoteField(text, 'Theme'),
    goal:  parseBlockquoteField(text, 'Module goal'),
    connects_to: parseBlockquoteField(text, 'Connects to') || undefined,
  };
}

// ─── Unit parsing ─────────────────────────────────────────────────

function parseUnit(headerTitle, body) {
  const m = headerTitle.match(/^Unit\s+(\w+)\s*[—–-]\s*(.+)$/);
  if (!m) throw new Error(`Bad unit header: ${headerTitle}`);
  const id    = m[1];
  const title = m[2].trim();

  const sub_cefr          = extractBlock(parseBlockquoteField(body, 'Sub-CEFR'));
  const grammar_focus     = parseBlockquoteField(body, 'Grammar focus');
  const markers           = parseMarkers(parseBlockquoteField(body, 'Markers'));
  const real_life_context = parseBlockquoteField(body, 'Real-life context');

  const h3 = splitByHeader(body, 3);
  let grammar = [], listening_speaking = [], roleplay = null, guided_chat = null;
  for (const s of h3) {
    if (!s.title) continue;
    if      (/^\s*\d+\.\s*Grammar/i.test(s.title))           grammar = parseGrammar(s.body);
    else if (/^\s*\d+\.\s*Listening|Speaking/i.test(s.title)) listening_speaking = parseLS(s.body);
    else if (/^\s*\d+\.\s*Role-?play/i.test(s.title))         roleplay = parseRolePlay(s.body);
    else if (/^\s*\d+\.\s*Guided\s+Chat/i.test(s.title))      guided_chat = parseGuidedChat(s.body);
  }

  return { id, title, sub_cefr, grammar_focus, markers, real_life_context, grammar, listening_speaking, roleplay, guided_chat };
}

// ─── Grammar parsing ──────────────────────────────────────────────

function parseGrammar(body) {
  const items = splitNumberedList(body);
  return items.map(parseGrammarExercise);
}

function parseGrammarExercise(raw) {
  const firstLine = raw.split('\n')[0];
  const typeMatch = firstLine.match(/\*\*([a-z_]+)\*\*/);
  if (!typeMatch) throw new Error(`Cannot find exercise type in: ${firstLine.slice(0, 80)}`);
  const type = typeMatch[1];

  const sentenceMatch = firstLine.match(/[—–-]\s*"([^"]+)"/);
  const ex = { type };
  if (sentenceMatch) ex.sentence = sentenceMatch[1];

  const passage        = field(raw, 'Passage');
  const question       = field(raw, 'Question');
  const options        = field(raw, 'Options');
  const choices        = field(raw, 'Choices');
  const hint           = field(raw, 'Hint');
  const answer         = field(raw, 'Answer');
  const explanation    = field(raw, 'Explanation');
  const contextPt      = field(raw, 'Context PT') || field(raw, 'context_pt');
  const wordsField     = field(raw, 'Words');
  const prompt         = field(raw, 'Prompt');
  const example_answer = field(raw, 'Example answer') || field(raw, 'Example');

  if (passage)        ex.passage = stripQuotes(passage);
  if (question)       ex.question = question;
  if (options)        ex.options = splitSlash(options);
  if (choices)        ex.choices = splitSlash(choices);
  if (hint)           ex.hint = hint;
  if (answer)         ex.answer = answer;
  if (explanation)    ex.explanation = explanation;
  if (contextPt)      ex.context_pt = contextPt;
  if (wordsField)     ex.words = splitSlash(wordsField);
  if (prompt)         ex.prompt = prompt;
  if (example_answer) ex.example_answer = example_answer;

  return ex;
}

// ─── L/S parsing ──────────────────────────────────────────────────

function parseLS(body) {
  const items = splitNumberedList(body);
  return items.map(raw => {
    const m = raw.match(/\*\*"([^"]+)"\*\*\s*[—–-]\s*(.+?)(?:\n|$)/);
    if (!m) throw new Error(`Bad L/S phrase: ${raw.slice(0, 80)}`);
    return { text: m[1].trim(), context: m[2].trim() };
  });
}

// ─── Role-play parsing ────────────────────────────────────────────

function parseRolePlay(body) {
  const idx = body.search(/\*\*Sub-objectives\*\*/);
  if (idx < 0) throw new Error('Role-play: missing **Sub-objectives** section');

  const head = body.slice(0, idx);
  const rest = body.slice(idx);

  const scenario        = field(head, 'Cenário');
  const voiced_by       = stripBackticks(field(head, 'Voiced by'));
  const persona         = field(head, 'Persona');
  const persona_outfit  = stripBackticks(field(head, 'Persona outfit'));
  const time_budget_sec = parseTimeBudget(field(head, 'Time budget'));
  const opening_line    = stripQuotes(field(head, 'Opening line'));

  const objectives = parseObjectives(rest);

  const closeMatch = rest.match(/\*\*Closing cue\*\*:\s*([^\n]+)/i);
  const closing_cue = closeMatch ? stripQuotes(closeMatch[1].trim()) : '';

  const flowMatch = rest.match(/\*\*Suggested flow\*\*[\s\S]*?(?=\n\*\*Evaluation focus\*\*|$)/i);
  const suggested_flow = flowMatch ? flowMatch[0].trim() : undefined;

  const evalMatch = rest.match(/\*\*Evaluation focus\*\*:?\s*([\s\S]*)$/i);
  const evaluation_focus = evalMatch ? parseBulletList(evalMatch[1]) : [];

  return { scenario, voiced_by, persona, persona_outfit, time_budget_sec, opening_line, objectives, closing_cue, suggested_flow, evaluation_focus };
}

// ─── Guided Chat parsing ──────────────────────────────────────────

function parseGuidedChat(body) {
  const idx = body.search(/\*\*Sub-objectives\*\*/);
  if (idx < 0) throw new Error('Guided chat: missing **Sub-objectives** section');

  const head = body.slice(0, idx);
  const rest = body.slice(idx);

  const scenario        = field(head, 'Cenário');
  const voiced_by       = stripBackticks(field(head, 'Voiced by'));
  const persona         = field(head, 'Persona');
  const persona_outfit  = stripBackticks(field(head, 'Persona outfit'));
  const opening_message = stripQuotes(field(head, 'Opening message'));

  const { intro_pt, intro_en } = parseLangField(head, 'Intro');

  const objectives = parseObjectives(rest);

  const closeMatch = rest.match(/\*\*Closing cue\*\*:\s*([^\n]+)/i);
  const closing_cue = closeMatch ? stripQuotes(closeMatch[1].trim()) : '';

  const { intro_pt: recap_pt, intro_en: recap_en } = parseLangField(rest, 'Recap');

  const scriptMatch = rest.match(/\*\*Script\*\*[\s\S]*$/i);
  const suggested_script = scriptMatch ? scriptMatch[0].trim() : undefined;

  return { scenario, voiced_by, persona, persona_outfit, intro_pt, intro_en, opening_message, objectives, closing_cue, recap_pt, recap_en, suggested_script };
}

// ─── Objectives parsing (shared) ──────────────────────────────────

function parseObjectives(text) {
  const start = text.search(/\*\*Sub-objectives\*\*/);
  if (start < 0) return [];
  const after = text.slice(start);
  const endIdx = after.search(/\n\*\*Closing cue\*\*/i);
  const listText = endIdx > 0 ? after.slice(0, endIdx) : after;

  const items = splitNumberedList(listText);
  return items.map((raw, idx) => {
    const id            = parseInt(field(raw, 'id') || String(idx + 1), 10);
    const label_pt      = stripQuotes(field(raw, 'label_pt'));
    const label_en      = stripQuotes(field(raw, 'label_en'));
    const hidden_prompt = stripQuotes(field(raw, 'hidden_prompt'));
    const hint_pt       = stripQuotes(field(raw, 'hint_pt'));
    const hint_en       = stripQuotes(field(raw, 'hint_en'));
    return {
      id,
      label_pt,
      label_en,
      hidden_prompt,
      ...(hint_pt ? { hint_pt } : {}),
      ...(hint_en ? { hint_en } : {}),
    };
  });
}

// ─── Generic parsing helpers ──────────────────────────────────────

function splitByHeader(text, level) {
  const hashes = '#'.repeat(level);
  const lines = text.split('\n');
  const out = [];
  let current = { title: '', body: [] };
  const rx = new RegExp(`^${hashes}\\s+(.+)`);
  const deeper = hashes + '#';
  for (const line of lines) {
    if (line.startsWith(deeper)) {
      current.body.push(line);
      continue;
    }
    const m = line.match(rx);
    if (m) {
      out.push({ title: current.title, body: current.body.join('\n') });
      current = { title: m[1].trim(), body: [] };
    } else {
      current.body.push(line);
    }
  }
  out.push({ title: current.title, body: current.body.join('\n') });
  return out;
}

function splitNumberedList(text) {
  const lines = text.split('\n');
  const items = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(/^(\d+)\.\s+(.*)$/);
    if (m) {
      if (current !== null) items.push(current.join('\n'));
      current = [m[2]];
    } else if (current !== null) {
      current.push(line);
    }
  }
  if (current !== null) items.push(current.join('\n'));
  return items;
}

function parseBulletList(text) {
  return text
    .split('\n')
    .map(l => l.match(/^\s*[-*]\s+(.+)/))
    .filter(Boolean)
    .map(m => m[1].trim());
}

function parseBlockquoteField(text, name) {
  // Matches "**Name**: value" stopping at | or end of line
  const escName = escapeRegex(name);
  const rx = new RegExp(`\\*\\*${escName}\\*\\*:\\s*([^\\n|]+?)(?=\\s*\\||\\n|$)`, 'i');
  const m = text.match(rx);
  return m ? m[1].trim() : '';
}

function field(text, name) {
  // Matches "**name**: value" up to end of line (used for nested fields inside list items)
  const escName = escapeRegex(name);
  const rx = new RegExp(`\\*\\*${escName}\\*\\*:\\s*([^\\n]+)`, 'i');
  const m = text.match(rx);
  return m ? m[1].trim() : '';
}

function parseLangField(text, name) {
  // Match "**Name (em PT)**: ..." or "**Name (PT)**: ..." or "**Name (em EN)**: ..."
  const escName = escapeRegex(name);
  const rx = new RegExp(`\\*\\*${escName}\\s*\\(([^)]+)\\)\\*\\*:\\s*([^\\n]+)`, 'i');
  const m = text.match(rx);
  if (!m) return { intro_pt: undefined, intro_en: undefined };
  const langTag = m[1].toLowerCase();
  const value   = stripQuotes(m[2].trim());
  if (langTag.includes('pt')) return { intro_pt: value, intro_en: undefined };
  return { intro_pt: undefined, intro_en: value };
}

function splitSlash(s) {
  return s.split('/').map(x => x.trim()).filter(Boolean);
}

function stripQuotes(s) {
  if (!s) return s;
  return s.trim().replace(/^[“"']\s*/, '').replace(/\s*[”"']$/, '');
}

function stripBackticks(s) {
  if (!s) return s;
  return s.trim().replace(/`/g, '');
}

function parseTimeBudget(s) {
  const m = (s || '').match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 180;
}

function parseMarkers(s) {
  if (!s || s.trim() === '—' || s.trim() === '-' || s.trim() === '') return [];
  return [...s.matchAll(/\[(\w+)\]/g)].map(m => m[1]);
}

function extractLevel(s) {
  if (/Novice/i.test(s))   return 'Novice';
  if (/Inter/i.test(s))    return 'Inter';
  if (/Advanced/i.test(s)) return 'Advanced';
  return s || 'Novice';
}

function extractBlock(s) {
  const m = (s || '').match(/(A1|A2|B1|B2|C1|C2)/);
  return m ? m[1] : 'A1';
}

function extractUnitRange(s) {
  const m = (s || '').match(/\(([^)]+)\)/);
  return m ? m[1] : (s || '').trim();
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
