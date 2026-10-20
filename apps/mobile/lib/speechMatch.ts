// lib/speechMatch.ts — normaliza fala reconhecida e frase esperada antes de comparar (Listening &
// Speaking). O reconhecimento de voz do celular escreve números em algarismos ("my phone number is 555",
// "floor 12 please") e as frases da trilha estão por extenso ("five five five", "twelve"): sem isso o
// aluno falava certo e reprovava. Aqui os dois lados viram o mesmo formato:
//   número por extenso → algarismos ("five five five" → "555", "twelve" → "12", "twenty one" → "21",
//   "seven thirty" → "730"); "7:30", "555-1234" e "1,000" → só algarismos.
// Contrações também viram a forma cheia nos dois lados ("I'm" = "I am"), como no corretor da Gramática.
import { expandContractions } from './grammarAnswer';

const UNITS: Record<string, number> = {
  zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
};
const TEENS: Record<string, number> = {
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const isNumWord = (w: string) => w in UNITS || w in TEENS || w in TENS || w === 'hundred' || w === 'thousand';

/** Sequência de palavras-número → algarismos concatenados (ex.: five five five → 555, twenty one → 21). */
function runToDigits(words: string[]): string {
  const groups: number[] = [];
  let cur: number | null = null;
  let lastKind: 'unit' | 'teen' | 'tens' | 'mult' | null = null;
  const push = () => { if (cur !== null) groups.push(cur); cur = null; };
  for (const w of words) {
    if (w in UNITS) {
      // "twenty one" e "one hundred five" somam; "five five" são dígitos separados.
      if (cur !== null && (lastKind === 'tens' || lastKind === 'mult')) cur += UNITS[w];
      else { push(); cur = UNITS[w]; }
      lastKind = 'unit';
    } else if (w in TEENS) {
      if (cur !== null && lastKind === 'mult') cur += TEENS[w]; else { push(); cur = TEENS[w]; }
      lastKind = 'teen';
    } else if (w in TENS) {
      if (cur !== null && lastKind === 'mult') cur += TENS[w]; else { push(); cur = TENS[w]; }
      lastKind = 'tens';
    } else if (w === 'hundred') {
      cur = (cur ?? 1) * 100; lastKind = 'mult';
    } else if (w === 'thousand') {
      cur = (cur ?? 1) * 1000; lastKind = 'mult';
    }
  }
  push();
  return groups.map(String).join('');
}

/** Minúsculas, sem pontuação e com números no mesmo formato (algarismos). */
export function normalizeSpeech(text: string): string {
  let t = expandContractions(text.toLowerCase().replace(/[‘’`]/g, "'"))
    .replace(/(\d)[:.,\-\s](?=\d)/g, '$1')       // 7:30, 1,000, 555-1234, "5 5 5" → algarismos juntos
    .replace(/(\d)(st|nd|rd|th)\b/g, '$1')        // 12th → 12
    .replace(/-/g, ' ')                           // twenty-one → twenty one
    .replace(/[.,!?;:"()]/g, ' ');
  const words = t.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < words.length; ) {
    if (isNumWord(words[i]) && !(words[i] === 'oh' && !(i + 1 < words.length && isNumWord(words[i + 1])))) {
      let j = i;
      while (j < words.length && (isNumWord(words[j]) || (words[j] === 'and' && j + 1 < words.length && isNumWord(words[j + 1]) && j > i))) j++;
      out.push(runToDigits(words.slice(i, j).filter(w => w !== 'and')));
      i = j;
    } else { out.push(words[i]); i++; }
  }
  // Algarismos vizinhos viram um só (ex.: "5 5 5" depois da conversão → "555").
  t = out.join(' ').replace(/(\d)\s+(?=\d)/g, '$1');
  return t.trim();
}

/** % das palavras da frase esperada que aparecem no que foi entendido (depois da normalização). */
export function wordMatchPercent(spoken: string, reference: string): number {
  const ref = normalizeSpeech(reference).split(' ').filter(Boolean);
  const sp = normalizeSpeech(spoken);
  if (ref.length === 0) return 0;
  const spWords = new Set(sp.split(' '));
  const matched = ref.filter(w => spWords.has(w) || sp.includes(w)).length;
  return (matched / ref.length) * 100;
}
