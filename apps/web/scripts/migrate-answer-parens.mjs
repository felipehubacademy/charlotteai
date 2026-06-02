// Migra Answers com paren-syntax pra usar campo Accepts.
//
// Patterns reconhecidos:
//   **Answer**: X (or Y)              -> Answer: X / Accepts: Y
//   **Answer**: X (or: Y)             -> Answer: X / Accepts: Y
//   **Answer**: X (or "Y")            -> Answer: X / Accepts: Y
//   **Answer**: X (or "Y" or "Z")     -> Answer: X / Accepts: Y, Z
//   **Answer**: X (also Y)            -> Answer: X / Accepts: Y
//
// NAO toca paren-clarifications tipo (when ...), (verbo X), etc.
// Se ja existe linha **Accepts**: anexa em vez de criar nova.
//
// Uso: node apps/web/scripts/migrate-answer-parens.mjs [--dry]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..', '..');
const DRY = process.argv.includes('--dry');

const dirs = [
  path.join(ROOT, 'docs', 'curriculum', 'v2', 'novice'),
  path.join(ROOT, 'docs', 'curriculum', 'v2', 'inter'),
  path.join(ROOT, 'docs', 'curriculum', 'v2', 'advanced'),
];

// Regex pra capturar Answer com (or/also X) no fim.
// Match: prefixo + base + (or|also TEXT) + sufixo opcional
const ANSWER_PAREN_RE = /^(\s*\*\*Answer\*\*:\s*)(.+?)\s*\((or|also)[:\s]+([^)]+)\)\s*$/i;

// Extrai alternativas de conteudo paren. Lida com:
//   - X or Y or Z
//   - "X" or "Y"
//   - "X" / "Y"   (slash sep)
//   - X — clarification (skip — eh comentario, nao alternativa)
function extractAlternatives(content) {
  // Se contem em-dash, eh provavelmente clarificacao
  if (/—|--/.test(content)) return [];
  // Split por "or" ou " / " (slash COM espacos pra nao quebrar her/his)
  const raw = content.split(/\s+or\s+|\s+\/\s+/i);
  const cleaned = raw
    .map(t => t.trim().replace(/^["']|["']$/g, '').trim())
    .filter(Boolean)
    .filter(t => !/implied$|comment\)$/i.test(t)); // skip clarification leftovers
  return cleaned;
}

let totalFiles = 0;
let totalLines = 0;
const samples = [];

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.md')).sort()) {
    const fp = path.join(dir, f);
    const lines = fs.readFileSync(fp, 'utf8').split('\n');
    let changed = false;
    const out = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m = line.match(ANSWER_PAREN_RE);
      if (!m) { out.push(line); continue; }

      const [, prefix, base, , altContent] = m;
      const alternatives = extractAlternatives(altContent);
      if (alternatives.length === 0) { out.push(line); continue; }

      const newAnswer = `${prefix}${base.trim()}`;
      out.push(newAnswer);

      // Procura linha Accepts existente nas proximas 3 linhas
      let acceptsLineIdx = -1;
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        if (/^\s*\*\*Accepts\*\*:/.test(lines[j])) { acceptsLineIdx = j; break; }
        if (/^\s*\*\*Explanation\*\*:/.test(lines[j])) break;
        if (/^\s*\d+\.\s+\*\*/.test(lines[j])) break;
      }

      const indent = (prefix.match(/^\s*/) || [''])[0];
      if (acceptsLineIdx >= 0) {
        const existing = lines[acceptsLineIdx].replace(/^\s*\*\*Accepts\*\*:\s*/, '').trim();
        const existingArr = existing.split('/').map(s => s.trim()).filter(Boolean);
        const merged = [...new Set([...existingArr, ...alternatives])];
        lines[acceptsLineIdx] = `${indent}**Accepts**: ${merged.join(' / ')}`;
      } else {
        // Insere Accepts logo apos
        out.push(`${indent}**Accepts**: ${alternatives.join(' / ')}`);
      }

      changed = true;
      totalLines++;
      if (samples.length < 12) {
        samples.push(`${f}:${i + 1}  "${m[2]} (${m[3]} ${altContent})"  →  Answer="${base.trim()}"  Accepts=[${alternatives.join('|')}]`);
      }
    }

    if (changed) {
      totalFiles++;
      if (!DRY) fs.writeFileSync(fp, out.join('\n'));
    }
  }
}

console.log(`${DRY ? '[DRY] ' : ''}migrated: ${totalLines} answer lines across ${totalFiles} files\n`);
console.log('samples:');
for (const s of samples) console.log('  ' + s);
