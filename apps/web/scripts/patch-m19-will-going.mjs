// Adiciona Accepts em M19 Novice cobrindo equivalencias contraidas e
// going-to variants. Mantem 'will'/'won't' como answer canonico (foco
// pedagogico do modulo), mas aceita formas equivalentes que o aluno
// pode produzir vindo de M18 (going to).

import fs from 'node:fs';
import path from 'node:path';

const MD = '/Users/felipexavier/charlotteai/docs/curriculum/v2/novice/M19-o-futuro.md';
const lines = fs.readFileSync(MD, 'utf8').split('\n');
const out = [];

// Patterns:
//   Answer: will        -> + Accepts: 'll, is going to, are going to (situational)
//   Answer: won't       -> + Accepts: will not
//   Answer: 'll         -> + Accepts: will
const PATCH = {
  'will': ["'ll", "is going to", "are going to"],
  "won't": ['will not', "isn't going to", "aren't going to"],
  "'ll": ['will', 'is going to'],
};

let patched = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  out.push(line);

  const m = line.match(/^(\s+)\*\*Answer\*\*:\s*(.+?)\s*$/);
  if (!m) continue;
  const [, indent, raw] = m;
  const ans = raw.replace(/^["']|["']$/g, '').trim();
  const accepts = PATCH[ans];
  if (!accepts) continue;

  // ja tem Accepts? merge
  let j = i + 1;
  while (j < lines.length && lines[j].trim() === '') j++;
  if (j < lines.length && /^\s*\*\*Accepts\*\*:/.test(lines[j])) {
    const existing = lines[j].replace(/^\s*\*\*Accepts\*\*:\s*/, '').trim();
    const existingArr = existing.split('/').map(s => s.trim()).filter(Boolean);
    const merged = [...new Set([...existingArr, ...accepts])];
    lines[j] = `${indent}**Accepts**: ${merged.join(' / ')}`;
  } else {
    // insere logo apos
    out.push(`${indent}**Accepts**: ${accepts.join(' / ')}`);
  }
  patched++;
}

fs.writeFileSync(MD, out.join('\n'));
console.log(`patched ${patched} Answer lines in M19`);
