// lib/speechGrade.ts — corretor da fala da trilha (Listening & Speaking, "repita a frase").
// Os relatórios diários de "onde os alunos travam" (6 a 25/11) mostraram que a maior parte das
// reprovações era o app entendendo errado um aluno que falou certo: sotaque e gíria ("No worries, bro"
// virava "Novosibirsk"), comparação rígida demais ("Whatsup, bro?", "God morning", Felipe entendido
// como Philip) e gravação cortada no meio. Este corretor:
//   1. normaliza os dois lados igual (lib/speechMatch: caixa, acento, pontuação, números, "8 p.m." = "8 pm",
//      contrações e fala informal: whatsup, what's, I'm, gonna);
//   2. alinha as palavras NA ORDEM, aceitando como igual: a mesma palavra, uma variante conhecida
//      (felipe = philip, bro = bruh) ou uma palavra parecida (75% ou mais de letras iguais, só em palavras
//      com mais de 2 letras e sem números);
//   3. separa "não ouvimos" e "a frase parou no meio" (vazio ou cortado) de "falou outra coisa": os dois
//      primeiros pedem para repetir em vez de reprovar (decideTake).
// Negação conta sempre: "They were playing" não passa por "They weren't playing" (e o contrário). Só
// "not" e "never": o "no" de expressões ("No worries", "Long time no see") e o "can't", que o
// reconhecimento costuma ouvir como "can", seguem a regra das outras palavras.
import { normalizeSpeechVariants } from './speechMatch';

/** Variantes que o reconhecimento escreve para palavras da trilha (nomes, gíria). Tudo já normalizado. */
const VARIANTS: Record<string, string[]> = {
  felipe: ['philip', 'phillip', 'philippe', 'filipe', 'felip', 'phillipe', 'felippe', 'philipe'],
  bro: ['bruh', 'brah', 'bra', 'brow', 'brother'],
  hi: ['hey', 'hai', 'high'],
  okay: ['k', 'kay'],
};
const VARIANT_OF = new Map<string, Set<string>>();
for (const [k, vs] of Object.entries(VARIANTS)) {
  const all = [k, ...vs];
  for (const w of all) {
    const set = VARIANT_OF.get(w) ?? new Set<string>();
    all.forEach(x => set.add(x));
    VARIANT_OF.set(w, set);
  }
}

const NEGATIONS = new Set(['not', 'never']);
// Primeira palavra curta que o microfone costuma cortar quando o aluno fala junto com o sinal.
const LEADING_SHORT = new Set(['i', 'a', 'an', 'the', 'it', 'he', 'she', 'we', 'you', 'they', 'my', 'and', 'so']);

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]; prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Semelhança de 0 a 1 entre duas palavras (1 = iguais). */
export function wordSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const max = Math.max(a.length, b.length);
  return max ? 1 - levenshtein(a, b) / max : 1;
}

/** Palavra falada vale pela esperada? Igual, variante conhecida ou parecida (75%+, mais de 2 letras, sem números). */
export function wordsMatch(target: string, spoken: string): boolean {
  if (target === spoken) return true;
  if (VARIANT_OF.get(target)?.has(spoken)) return true;
  if (target.length <= 2 || spoken.length <= 2 || /\d/.test(target) || /\d/.test(spoken)) return false;
  // Negação nunca vira outra palavra por semelhança ("not" x "now", "no" x "know").
  if (NEGATIONS.has(target) || NEGATIONS.has(spoken)) return false;
  return wordSimilarity(target, spoken) >= 0.75;
}

interface Alignment {
  matched: number;
  /** Índices da frase esperada que foram ditos. */
  targetHit: boolean[];
  /** Índices da fala que valeram por alguma palavra esperada. */
  spokenHit: boolean[];
}

/** Alinhamento em ordem (como um diff): maximiza as palavras esperadas ditas. Aceita palavra junta ou separada. */
function align(t: string[], s: string[]): Alignment {
  const n = t.length, m = s.length;
  // best[i][j] = máximo de palavras esperadas casadas usando t[i..] e s[j..].
  const best: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  const move: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  // 1 = pula esperada, 2 = pula falada, 3 = casa 1-1, 4 = esperada = 2 faladas juntas, 5 = 2 esperadas = 1 falada,
  // 6 = duas vizinhas trocadas ("what time is it" para "what time it is").
  for (let i = n; i >= 0; i--) {
    for (let j = m; j >= 0; j--) {
      if (i === n || j === m) { best[i][j] = 0; move[i][j] = i === n ? 2 : 1; continue; }
      let b = best[i + 1][j], mv = 1;
      if (best[i][j + 1] > b) { b = best[i][j + 1]; mv = 2; }
      if (wordsMatch(t[i], s[j]) && 1 + best[i + 1][j + 1] > b) { b = 1 + best[i + 1][j + 1]; mv = 3; }
      if (j + 1 < m && t[i] === s[j] + s[j + 1] && 1 + best[i + 1][j + 2] > b) { b = 1 + best[i + 1][j + 2]; mv = 4; }
      if (i + 1 < n && t[i] + t[i + 1] === s[j] && 2 + best[i + 2][j + 1] > b) { b = 2 + best[i + 2][j + 1]; mv = 5; }
      if (i + 1 < n && j + 1 < m && t[i] !== t[i + 1] && t[i] === s[j + 1] && t[i + 1] === s[j] && 2 + best[i + 2][j + 2] > b) {
        b = 2 + best[i + 2][j + 2]; mv = 6;
      }
      best[i][j] = b; move[i][j] = mv;
    }
  }
  const targetHit = new Array(n).fill(false);
  const spokenHit = new Array(m).fill(false);
  let i = 0, j = 0;
  while (i < n && j < m) {
    const mv = move[i][j];
    if (mv === 1) i++;
    else if (mv === 2) j++;
    else if (mv === 3) { targetHit[i] = spokenHit[j] = true; i++; j++; }
    else if (mv === 4) { targetHit[i] = spokenHit[j] = spokenHit[j + 1] = true; i++; j += 2; }
    else if (mv === 6) { targetHit[i] = targetHit[i + 1] = spokenHit[j] = spokenHit[j + 1] = true; i += 2; j += 2; }
    else { targetHit[i] = targetHit[i + 1] = spokenHit[j] = true; i += 2; j++; }
  }
  return { matched: best[0][0], targetHit, spokenHit };
}

export interface SpeechGrade {
  /** % das palavras da frase esperada que foram ditas, na ordem (0–100). */
  percent: number;
  /** Palavras esperadas que faltaram (normalizadas). */
  missing: string[];
  /** A leitura do reconhecimento que mais bateu. */
  transcript: string;
  /** Nada foi entendido. */
  empty: boolean;
  /** O que foi dito bate com o começo da frase e o fim faltou (soltou cedo, gravação cortada). */
  cutOff: boolean;
  /** Negação a mais ou a menos ("were" x "weren't"): não pode passar. */
  negationMismatch: boolean;
}

function gradeOne(t: string[], s: string[], transcript: string): SpeechGrade {
  const { matched: raw, targetHit, spokenHit } = align(t, s);
  let matched = raw;
  // O microfone corta o começo: faltar só a 1ª palavra curta (I, a, the...) não desconta.
  if (!targetHit[0] && t.length >= 3 && LEADING_SHORT.has(t[0]) && !s.includes(t[0])) { targetHit[0] = true; matched++; }
  const missing = t.filter((_, k) => !targetHit[k]);
  const negationMismatch = t.some((w, k) => NEGATIONS.has(w) && !targetHit[k])
    || s.some((w, k) => NEGATIONS.has(w) && !spokenHit[k] && !t.includes(w));
  let cutOff = false;
  if (s.length > 0 && matched > 0 && matched < t.length) {
    let last = -1;
    targetHit.forEach((h, k) => { if (h) last = k; });
    const tail = t.length - 1 - last;                         // palavras esperadas que faltaram no fim
    const holes = targetHit.slice(0, last + 1).filter(h => !h).length; // faltas antes do fim
    // Palavra falada que não é da frase só vale se for a última e parecer o começo da próxima esperada
    // (palavra cortada no meio: "Excuse me, can you he" para "...can you help me?").
    const next = t[last + 1] ?? '';
    const extras = s.filter((_, k) => !spokenHit[k]);
    const lastSpoken = s[s.length - 1];
    const truncated = extras.length === 1 && !spokenHit[s.length - 1] && !/\d/.test(lastSpoken)
      && lastSpoken.length < next.length
      && (next.startsWith(lastSpoken) || wordSimilarity(next.slice(0, lastSpoken.length), lastSpoken) >= 0.75);
    cutOff = tail >= 1 && holes <= 1 && (extras.length === 0 || truncated);
  }
  return { percent: (matched / t.length) * 100, missing, transcript, empty: s.length === 0, cutOff, negationMismatch };
}

/** Nota da fala contra a frase: melhor resultado entre as leituras do reconhecimento e das contrações ambíguas. */
export function gradeSpeech(spoken: string | string[], target: string): SpeechGrade {
  const alts = (Array.isArray(spoken) ? spoken : [spoken]).filter(x => x && x.trim());
  const targets = normalizeSpeechVariants(target).map(x => x.split(' ').filter(Boolean)).filter(x => x.length);
  const empty: SpeechGrade = { percent: 0, missing: targets[0] ?? [], transcript: '', empty: true, cutOff: false, negationMismatch: false };
  if (!targets.length) return empty;
  let best: SpeechGrade | null = null;
  const better = (a: SpeechGrade, b: SpeechGrade | null) => !b
    || (!a.negationMismatch && b.negationMismatch)
    || (a.negationMismatch === b.negationMismatch && a.percent > b.percent);
  for (const alt of alts) {
    for (const sp of normalizeSpeechVariants(alt)) {
      const s = sp.split(' ').filter(Boolean);
      for (const t of targets) {
        const g = gradeOne(t, s, alt);
        if (better(g, best)) best = g;
      }
    }
  }
  if (!best || best.empty) return { ...empty, transcript: best?.transcript ?? '' };
  return best;
}

export type TakeOutcome = 'pass' | 'close' | 'fail' | 'retry';

/** Pedidos de "fale de novo" (fala vazia ou cortada) antes de contar como erro. */
export const MAX_SPEECH_RETRIES = 2;

/**
 * Resultado da tentativa. Vazio ou cortado pede para repetir (não reprova) até MAX_SPEECH_RETRIES vezes na
 * mesma frase; depois disso conta como erro. passPct = nota para passar; closePct = "quase" (null = só
 * passa ou erra, como no Novice).
 */
export function decideTake(g: SpeechGrade, opts: { passPct: number; closePct: number | null; retriesSoFar: number }): TakeOutcome {
  const passed = g.percent >= opts.passPct && !g.negationMismatch && !g.empty;
  if (passed) return 'pass';
  if ((g.empty || g.cutOff) && opts.retriesSoFar < MAX_SPEECH_RETRIES) return 'retry';
  if (opts.closePct != null && g.percent >= opts.closePct) return 'close';
  return 'fail';
}

/** Nota para passar na fala da trilha: cerca de 80% das palavras (Novice mantém os 70% de antes). */
export const SPEECH_PASS_PCT = 80;
