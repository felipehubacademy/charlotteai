// lib/speechMatch.ts — normaliza fala reconhecida e frase esperada antes de comparar (Listening &
// Speaking). O reconhecimento de voz do celular escreve do jeito dele ("my phone number is 555",
// "floor 12 please", "going to" no lugar de "gonna", "color" no lugar de "colour") e as frases da
// trilha estão escritas de outro: sem isso o aluno falava certo e reprovava. Aqui os dois lados viram
// o mesmo formato:
//   número por extenso → algarismos ("five five five" → "555", "twelve" → "12", "twenty one" → "21",
//   "a hundred" → "100", "first" → "1"); "7:30", "555-1234", "1,000", "$100" e "50%" → algarismos
//   (e "dollars" / "percent" por extenso);
//   contrações → forma cheia ("I'm" = "I am"; "she's" testa "she is" e "she has");
//   fala informal → forma cheia ("gonna" = "going to", "wanna" = "want to");
//   grafia britânica → americana ("colour" = "color", "realise" = "realize");
//   abreviações → por extenso ("Mr." = "mister", "OK" = "okay");
//   travessão, reticências, barra e lacunas do tipo [X] não contam como palavra.
// A comparação é palavra a palavra (cada palavra falada vale uma vez), com tolerância de uma letra
// em palavras longas e palavra composta junta ou separada ("email" = "e mail").
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
const ORDINALS: Record<string, string> = {
  first: '1', second: '2', third: '3', fourth: '4', fifth: '5', sixth: '6', seventh: '7', eighth: '8',
  ninth: '9', tenth: '10', eleventh: '11', twelfth: '12', thirteenth: '13', fourteenth: '14',
  fifteenth: '15', sixteenth: '16', seventeenth: '17', eighteenth: '18', nineteenth: '19',
  twentieth: '20', thirtieth: '30',
};
const isNumWord = (w: string) => w in UNITS || w in TEENS || w in TENS || w === 'hundred' || w === 'thousand';

// Fala informal e abreviações → forma que os dois lados usam.
const INFORMAL: Record<string, string> = {
  gonna: 'going to', wanna: 'want to', gotta: 'got to', kinda: 'kind of', sorta: 'sort of',
  gimme: 'give me', lemme: 'let me', dunno: 'do not know', outta: 'out of', lotta: 'lot of',
  cuz: 'because', till: 'until', til: 'until',
  ok: 'okay', mr: 'mister', mrs: 'missus', dr: 'doctor', vs: 'versus',
  tv: 'tv', 'a.m.': 'am', 'p.m.': 'pm',
  alright: 'all right', everyday: 'every day', anymore: 'any more',
};

// Grafia britânica → americana (o reconhecimento é americano).
const BRIT: Record<string, string> = {
  colour: 'color', colours: 'colors', favourite: 'favorite', favourites: 'favorites', flavour: 'flavor',
  honour: 'honor', humour: 'humor', labour: 'labor', neighbour: 'neighbor', neighbours: 'neighbors',
  behaviour: 'behavior', harbour: 'harbor', rumour: 'rumor', centre: 'center', centres: 'centers',
  theatre: 'theater', metre: 'meter', metres: 'meters', litre: 'liter', litres: 'liters', fibre: 'fiber',
  grey: 'gray', defence: 'defense', offence: 'offense', licence: 'license', practise: 'practice',
  programme: 'program', catalogue: 'catalog', cheque: 'check', tyre: 'tire', tyres: 'tires',
  jewellery: 'jewelry', aluminium: 'aluminum', pyjamas: 'pajamas', mum: 'mom', mummy: 'mommy',
  travelling: 'traveling', travelled: 'traveled', traveller: 'traveler', cancelled: 'canceled',
  cancelling: 'canceling', modelling: 'modeling', labelled: 'labeled', fuelled: 'fueled',
  enrol: 'enroll', fulfil: 'fulfill', analyse: 'analyze', analysed: 'analyzed', paralyse: 'paralyze',
  ageing: 'aging', judgement: 'judgment', plough: 'plow', towards: 'toward', afterwards: 'afterward',
};
// -ise/-isation → -ize/-ization (realise, organised, apologising...), só em palavras longas.
const ISE_KEEP = new Set(['rise', 'arise', 'wise', 'otherwise', 'likewise', 'advise', 'advised', 'advising',
  'surprise', 'surprised', 'surprising', 'exercise', 'exercised', 'exercising', 'promise', 'promised',
  'promising', 'premise', 'precise', 'concise', 'expertise', 'franchise', 'merchandise', 'compromise',
  'compromised', 'enterprise', 'revise', 'revised', 'supervise', 'supervised', 'televise', 'devise',
  'despise', 'disguise', 'noise', 'noises', 'raise', 'raised', 'praise', 'praised', 'cruise', 'paradise',
  'treatise', 'demise', 'excise', 'incise', 'chastise', 'improvise', 'improvised', 'comprise', 'comprised']);
function americanize(w: string): string {
  if (BRIT[w]) return BRIT[w];
  if (w.length >= 7 && !ISE_KEEP.has(w)) {
    const m = w.match(/^(.+[^aeiouw])is(e|es|ed|ing|ation|ations|er|ers)$/);
    if (m) return `${m[1]}iz${m[2]}`;
  }
  return w;
}

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

// Contrações que o corretor da Gramática não cobre (could've, there're, it'll...).
function expandMore(t: string): string {
  return t
    .replace(/\b(\w+)'ve\b/g, '$1 have')
    .replace(/\b(\w+)'re\b/g, '$1 are')
    .replace(/\b(\w+)'ll\b/g, '$1 will')
    .replace(/\by'all\b/g, 'you all')
    .replace(/\bo'clock\b/g, 'oclock');
}

const HOMOPHONES: Record<string, string> = { where: 'were', wear: 'were' };

function normalizeWith(text: string, sTo: 'is' | 'has', dTo: 'would' | 'had'): string {
  let t = text.toLowerCase().replace(/[‘’`´]/g, "'").replace(/[“”„]/g, '"');
  // Lacunas do tipo [X] / [role] não são faladas pelo aluno: saem da frase esperada.
  t = t.replace(/\[[^\]]*\]/g, ' ');
  t = expandMore(expandContractions(t, sTo, dTo))
    .replace(/\$\s?(\d[\d,.]*)/g, '$1 dollars')    // $100 → 100 dollars
    .replace(/(\d)\s?%/g, '$1 percent')           // 50% → 50 percent
    .replace(/&/g, ' and ')
    .replace(/\b(\d{1,2}):00\b/g, '$1')               // hora cheia: "8:00 p.m." = "8 pm"
    .replace(/(\d)[:.,\-](?=\d)/g, '$1')          // 7:30, 1,000, 555-1234 → algarismos juntos
    .replace(/(\d)(st|nd|rd|th)\b/g, '$1')        // 12th → 12
    .replace(/\b(a|p)\.m\.?/g, '$1m')             // a.m. → am
    .replace(/\b(mr|mrs|ms|dr|st|vs)\./g, '$1')   // Mr. → mr
    .replace(/[—–…/\\|]/g, ' ')                    // travessão, reticências, barra
    .replace(/-/g, ' ')                           // twenty-one → twenty one
    .replace(/[.,!?;:"()*]/g, ' ')
    .replace(/'s\b/g, 's')                        // possessivo: father's = fathers
    .replace(/'/g, '');
  // Homófonos que o reconhecimento troca: "Were you working?" vira "Where you working?".
  const words = t.split(/\s+/).filter(Boolean).flatMap(w => (INFORMAL[w] ?? HOMOPHONES[w] ?? w).split(' '));
  const raw: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    // Ordinal composto: "twenty first" = "21" (senão virava "20" + "1" = "201").
    const nextOrd = ORDINALS[words[i + 1] ?? ''];
    if (w in TENS && nextOrd && +nextOrd < 10) { raw.push(String(TENS[w] + +nextOrd)); i++; continue; }
    raw.push(ORDINALS[w] ?? americanize(w));
  }
  // Sigla soletrada: "C.E.O." / "c e o" = "ceo" (letras soltas seguidas viram uma palavra; "a" e "i" sozinhos são palavras).
  for (let i = 0; i < raw.length; i++) {
    let j = i;
    while (j < raw.length && /^[a-z]$/.test(raw[j])) j++;
    if (j - i >= 2 && raw.slice(i, j).some(x => x !== 'a' && x !== 'i')) { raw.splice(i, j - i, raw.slice(i, j).join('')); }
  }
  const out: string[] = [];
  for (let i = 0; i < raw.length; ) {
    const w = raw[i];
    // "a hundred" / "a thousand" = 100 / 1000.
    if (w === 'a' && (raw[i + 1] === 'hundred' || raw[i + 1] === 'thousand')) { i++; continue; }
    if (isNumWord(w) && !(w === 'oh' && !(i + 1 < raw.length && isNumWord(raw[i + 1])))) {
      let j = i;
      while (j < raw.length && (isNumWord(raw[j]) || (raw[j] === 'and' && j + 1 < raw.length && isNumWord(raw[j + 1]) && j > i))) j++;
      out.push(runToDigits(raw.slice(i, j).filter(x => x !== 'and')));
      i = j;
    } else { out.push(w); i++; }
  }
  // Algarismos vizinhos viram um só (ex.: "5 5 5" depois da conversão → "555").
  return out.join(' ').replace(/(\d)\s+(?=\d)/g, '$1').trim();
}

/** Minúsculas, sem pontuação e no mesmo formato dos dois lados (números, contrações, grafia). */
export function normalizeSpeech(text: string): string {
  return normalizeWith(text, 'is', 'would');
}

// Distância de edição limitada (para "colour"/"color" que escaparam da lista, plural falado etc.).
function within(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]; prev[0] = i; let best = prev[0];
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp; best = Math.min(best, prev[j]);
    }
    if (best > max) return false;
  }
  return prev[b.length] <= max;
}
const tolerance = (w: string) => (/\d/.test(w) ? 0 : w.length >= 9 ? 2 : w.length >= 5 ? 1 : 0);

/** Palavras da frase esperada encontradas no que foi falado (cada palavra falada vale uma vez). */
function matchWords(ref: string[], sp: string[]): { matched: number; missing: string[] } {
  const used = new Array(sp.length).fill(false);
  const missing: string[] = [];
  let matched = 0;
  const take = (k: number) => { used[k] = true; return true; };
  for (const w of ref) {
    let ok = false;
    // 1) igual
    for (let k = 0; k < sp.length && !ok; k++) if (!used[k] && sp[k] === w) ok = take(k);
    // 2) composta: "email" = "e mail", "everyday" = "every day"
    for (let k = 0; k + 1 < sp.length && !ok; k++) {
      if (!used[k] && !used[k + 1] && sp[k] + sp[k + 1] === w) { used[k + 1] = true; ok = take(k); }
    }
    // 3) tolerância de letra em palavra longa
    const tol = tolerance(w);
    for (let k = 0; k < sp.length && !ok && tol > 0; k++) if (!used[k] && within(sp[k], w, tol)) ok = take(k);
    if (ok) matched++; else missing.push(w);
  }
  // Palavra esperada separada e falada junta ("every day" esperado, "everyday" falado).
  if (missing.length >= 2) {
    for (let k = 0; k < sp.length; k++) {
      if (used[k]) continue;
      for (let m = 0; m + 1 < missing.length; m++) {
        if (missing[m] + missing[m + 1] === sp[k]) { used[k] = true; missing.splice(m, 2); matched += 2; break; }
      }
    }
  }
  return { matched, missing };
}

const LEADING_SHORT = new Set(['i', 'a', 'an', 'the', 'it', 'he', 'she', 'we', 'you', 'they', 'my', 'and', 'so']);

export interface SpeechMatch {
  /** % das palavras da frase esperada que foram ditas (0–100). */
  percent: number;
  /** Palavras esperadas que não apareceram (já normalizadas, para mostrar ao aluno). */
  missing: string[];
  /** A leitura do reconhecimento que mais bateu (quando há várias). */
  transcript: string;
}

/** Melhor resultado entre as leituras do reconhecimento e as leituras das contrações ambíguas. */
export function bestSpeechMatch(spoken: string | string[], reference: string): SpeechMatch {
  const alts = (Array.isArray(spoken) ? spoken : [spoken]).filter(s => s && s.trim());
  let best: SpeechMatch = { percent: 0, missing: [], transcript: alts[0] ?? '' };
  const variants: ['is' | 'has', 'would' | 'had'][] = [['is', 'would'], ['has', 'had']];
  for (const [sTo, dTo] of variants) {
    const ref0 = normalizeWith(reference, sTo, dTo).split(' ').filter(Boolean);
    if (ref0.length === 0) continue;
    if (alts.length === 0) { if (best.missing.length === 0) best = { percent: 0, missing: ref0, transcript: "" }; continue; }
    for (const alt of alts) {
      for (const [sp1, dp1] of variants) {
        const sp = normalizeWith(alt, sp1, dp1).split(' ').filter(Boolean);
        // Palavra com hífen falada junta ("push-ups" esperado, "pushups" falado): junta o par na frase esperada.
        const spSet = new Set(sp);
        const ref: string[] = [];
        for (let k = 0; k < ref0.length; k++) {
          if (k + 1 < ref0.length && spSet.has(ref0[k] + ref0[k + 1])) { ref.push(ref0[k] + ref0[k + 1]); k++; }
          else ref.push(ref0[k]);
        }
        let { matched, missing } = matchWords(ref, sp);
        // O microfone costuma cortar o começo quando o aluno fala junto com o toque no botão:
        // faltar só a 1ª palavra curta (I, a, the...) da frase não desconta.
        if (missing.length > 0 && ref.length >= 3 && LEADING_SHORT.has(ref[0]) && missing[0] === ref[0] && !sp.includes(ref[0])) {
          matched += 1; missing = missing.slice(1);
        }
        const percent = (matched / ref.length) * 100;
        if (percent > best.percent || (percent === best.percent && best.transcript === '')) best = { percent, missing, transcript: alt };
      }
    }
  }
  return best;
}

/** % das palavras da frase esperada que aparecem no que foi entendido (depois da normalização). */
export function wordMatchPercent(spoken: string | string[], reference: string): number {
  return bestSpeechMatch(spoken, reference).percent;
}
