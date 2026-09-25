// lib/grammarAnswer.ts
// Corretor compartilhado de respostas de gramática (fill_gap / fix_error /
// read_answer). Fonte ÚNICA — usado por learn-session, review-session e
// learn-grammar pra não divergir.
//
// Ponto-chave: aceita CONTRAÇÃO <-> forma cheia, inclusive contração "solta"
// (no fill_gap o sujeito fica FORA da lacuna, então o aluno digita só
// "'ve lived" = "have lived"), e trata a ambiguidade de present perfect
// ('s = is/has, 'd = would/had) testando as duas leituras.

export function normaliseAnswer(s: string): string {
  return s.trim().toLowerCase()
    .replace(/[‘’‚‛]/g, "'")   // smart quotes (iOS) -> apóstrofo ASCII
    .replace(/[“”„‟]/g, '"')
    .replace(/\s+/g, ' ');
}

export function expandContractions(s: string, sTo: 'is' | 'has' = 'is', dTo: 'would' | 'had' = 'would'): string {
  return s
    // Negativas
    .replace(/won't/g, 'will not')
    .replace(/can't/g, 'cannot')
    .replace(/shan't/g, 'shall not')
    .replace(/ain't/g, 'is not')
    .replace(/n't/g, ' not')
    // Sujeito + contração
    .replace(/\b(i|you|we|they|who)'ve\b/g, '$1 have')
    .replace(/\bi'm\b/g, 'i am')
    .replace(/\b(you|we|they|who)'re\b/g, '$1 are')
    .replace(/\blet's\b/g, 'let us')
    .replace(/\b(he|she|it|that|there|here|what|who|where|how)'s\b/g, `$1 ${sTo}`)
    .replace(/\b(i|you|he|she|it|we|they|that)'ll\b/g, '$1 will')
    .replace(/\b(i|you|he|she|it|we|they)'d\b/g, `$1 ${dTo}`)
    // Contrações SOLTAS (sujeito fora da lacuna)
    .replace(/(^|\s)'ve\b/g, '$1have')
    .replace(/(^|\s)'re\b/g, '$1are')
    .replace(/(^|\s)'m\b/g, '$1am')
    .replace(/(^|\s)'ll\b/g, '$1will')
    .replace(/(^|\s)'s\b/g, `$1${sTo}`)
    .replace(/(^|\s)'d\b/g, `$1${dTo}`);
}

// Todas as interpretações das contrações ambíguas ('s=is/has, 'd=would/had).
function auxVariants(s: string): string[] {
  return [
    expandContractions(s, 'is', 'would'),
    expandContractions(s, 'has', 'had'),
  ];
}

// Aceita se qualquer interpretação de contração do aluno bate com o gabarito
// (contraída OU forma cheia, com ou sem sujeito). `bothWays` também aceita o
// gabarito CONTIDO na resposta (fix_error compara frase inteira).
export function contractionMatch(u: string, c: string, bothWays: boolean): boolean {
  for (const uu of auxVariants(u)) {
    for (const cc of auxVariants(c)) {
      if (uu === cc || uu.includes(cc) || (bothWays && cc.includes(uu))) return true;
    }
  }
  return false;
}

/**
 * Corretor genérico por tipo de exercício de gramática.
 * `type`: fill_gap | fix_error | read_answer | multiple_choice | word_bank | word_order | short_write | ...
 */
export function checkGrammarAnswer(
  type: string,
  answer: string,
  correct: string,
  accepts?: string[],
): boolean {
  const u = normaliseAnswer(answer);
  const c = normaliseAnswer(correct);
  if (u === c) return true;

  if (accepts && accepts.length) {
    const lenient = type === 'read_answer' || type === 'fix_error' || type === 'fill_gap';
    for (const a of accepts) {
      const na = normaliseAnswer(a);
      if (na === u) return true;
      if (lenient && (u.includes(na) || na.includes(u))) return true;
    }
  }

  if (type === 'multiple_choice' || type === 'word_bank' || type === 'word_order') return false;

  if (type === 'fill_gap') {
    if (u.includes(c)) return true;               // aceita frase inteira
    if (contractionMatch(u, c, false)) return true;
    return false;
  }
  if (type === 'fix_error') {
    if (u.includes(c) || c.includes(u)) return true;
    if (contractionMatch(u, c, true)) return true;
    return false;
  }
  if (type === 'read_answer') {
    const cExp = expandContractions(c);
    const uExp = expandContractions(u);
    const words = cExp.split(' ').filter(w => w.length > 2);
    return words.length > 0 && words.filter(w => uExp.includes(w)).length >= Math.ceil(words.length * 0.6);
  }
  return false;
}
