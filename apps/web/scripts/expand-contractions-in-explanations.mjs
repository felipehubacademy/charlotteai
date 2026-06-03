// Atualiza linhas **Explanation**: nos MDs Novice. Pra cada frase entre
// aspas que contem contracao, mostra tambem a forma separada.
// Ex: "He wasn't at school" -> "He wasn't / was not at school"
//
// Foco: ajudar o aluno a ver as duas formas equivalentes (norma culta
// vs forma falada).

import fs from 'node:fs';
import path from 'node:path';

const DIRS = [
  '/Users/felipexavier/charlotteai/docs/curriculum/v2/novice',
  '/Users/felipexavier/charlotteai/docs/curriculum/v2/inter',
  '/Users/felipexavier/charlotteai/docs/curriculum/v2/advanced',
];

// Mapeamento de contracoes pras suas formas expandidas
const CONTRACTIONS = [
  ["won't", "will not"],
  ["can't", "cannot"],
  // -n't
  ["wasn't", "was not"],
  ["weren't", "were not"],
  ["isn't", "is not"],
  ["aren't", "are not"],
  ["doesn't", "does not"],
  ["didn't", "did not"],
  ["don't", "do not"],
  ["hasn't", "has not"],
  ["haven't", "have not"],
  ["hadn't", "had not"],
  ["shouldn't", "should not"],
  ["wouldn't", "would not"],
  ["couldn't", "could not"],
  ["mightn't", "might not"],
  ["mustn't", "must not"],
  // 'll
  ["I'll", "I will"],
  ["you'll", "you will"],
  ["he'll", "he will"],
  ["she'll", "she will"],
  ["it'll", "it will"],
  ["we'll", "we will"],
  ["they'll", "they will"],
  // 've
  ["I've", "I have"],
  ["you've", "you have"],
  ["we've", "we have"],
  ["they've", "they have"],
  // 'm
  ["I'm", "I am"],
  // 're
  ["you're", "you are"],
  ["we're", "we are"],
  ["they're", "they are"],
  // 's (= is)
  ["he's", "he is"],
  ["she's", "she is"],
  ["it's", "it is"],
  ["that's", "that is"],
  ["there's", "there is"],
  ["what's", "what is"],
  ["where's", "where is"],
  // 'd (= would)
  ["I'd", "I would"],
  ["you'd", "you would"],
  ["he'd", "he would"],
  ["she'd", "she would"],
  ["we'd", "we would"],
  ["they'd", "they would"],
];

// Pra cada frase entre aspas duplas, expande a primeira contracao encontrada.
// Nao mexe se a frase ja tem "/" (sinal de que ja foi expandida).
function expandQuotedPhrases(text) {
  return text.replace(/"([^"]+)"/g, (full, phrase) => {
    if (phrase.includes('/')) return full; // ja expandida
    for (const [contr, expanded] of CONTRACTIONS) {
      // case-insensitive match em uma palavra inteira (com apostrofe)
      const re = new RegExp(`(^|[^a-zA-Z])(${contr.replace(/'/g, "'")})(?=[^a-zA-Z]|$)`, 'i');
      const m = phrase.match(re);
      if (m) {
        const matched = m[2];
        // Substitui mantendo capitalizacao similar
        const expandedMatched = matched[0] === matched[0].toUpperCase()
          ? expanded[0].toUpperCase() + expanded.slice(1)
          : expanded;
        const newPhrase = phrase.replace(matched, `${matched} / ${expandedMatched}`);
        return `"${newPhrase}"`;
      }
    }
    return full;
  });
}

let totalLines = 0;
let totalFiles = 0;
for (const dir of DIRS) {
  if (!fs.existsSync(dir)) continue;
  let levelLines = 0, levelFiles = 0;
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.md')).sort()) {
    const fp = path.join(dir, f);
    const lines = fs.readFileSync(fp, 'utf8').split('\n');
    let changed = false;
    for (let i = 0; i < lines.length; i++) {
      if (!/^\s*\*\*Explanation\*\*:/i.test(lines[i])) continue;
      const before = lines[i];
      lines[i] = expandQuotedPhrases(lines[i]);
      if (lines[i] !== before) { changed = true; levelLines++; }
    }
    if (changed) { fs.writeFileSync(fp, lines.join('\n')); levelFiles++; }
  }
  console.log(`  ${path.basename(dir)}: ${levelLines} lines, ${levelFiles} files`);
  totalLines += levelLines;
  totalFiles += levelFiles;
}

console.log(`\nTOTAL: ${totalLines} lines across ${totalFiles} files`);
