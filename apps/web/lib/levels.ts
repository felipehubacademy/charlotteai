// lib/levels.ts — nível pedagógico de uma requisição.
// Trilhas extras da Família Queizy (ex.: 'Igorfina', o Manual do F#did@) são para o mesmo público
// do Novice: explicação em PT, regras de simplicidade do iniciante. O app manda o id da trilha
// como nível; toda rota que decide idioma ou dificuldade pelo nível passa por aqui.
export type PedagogicalLevel = 'Novice' | 'Inter' | 'Advanced';

const EXTRA_TRACKS = new Set(['Igorfina']);

export function pedagogicalLevel(level: unknown): PedagogicalLevel {
  const l = String(level ?? '');
  if (l === 'Inter' || l === 'Advanced' || l === 'Novice') return l;
  if (EXTRA_TRACKS.has(l)) return 'Novice';
  return 'Novice';
}
