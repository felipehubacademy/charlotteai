// lib/aulas.ts — aulas em vídeo (motion) dos tópicos da trilha. Fase de teste: só para quem tem a
// chave beta `aula_motion` (ligada no /admin > Usuários). No Novice, a aula não trava a progressão, não dá XP
// e não conta para o tópico concluído. Nos Primeiros passos (Pré-Novice), ela é a 1ª atividade da unidade:
// conta para concluir e dá XP (tipo `aula` no guard do banco, 10 por pausa acertada; nada ao rever).
//
// Os dados (falas, pausas, correções) vêm no app em data/aulas/<id>.json. O vídeo, o pôster e os
// áudios das correções ficam no Storage, no bucket público `lesson-videos/<id>/<versão>/`
// (publicados por scripts/aula-motion/publicar.mjs). A versão no caminho evita arquivo velho no CDN.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const novice01 = require('@/data/aulas/novice-01.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const preNovice01 = require('@/data/aulas/pre-novice-01.json');

export const AULA_BETA_KEY = 'aula_motion';

export interface AulaCue {
  id: string;
  speaker: string;
  lang: string;           // 'en' nas falas em inglês; 'pt' nas explicações
  text: string;           // {assim} = inglês destacado
  pt: string | null;      // tradução das falas em inglês
  start: number;
  end: number;
  words?: number[];       // segundo em que cada palavra do texto (separada por espaço) começa
}

export interface AulaCheckpoint {
  id: string;
  at: number;             // segundo em que o vídeo para
  mode: 'tap' | 'speak';
  question: string;
  options: string[];
  answer: string;
  speak: string[];        // respostas faladas aceitas (minúsculas)
  feedback: { ok: { id: string; text: string }; no: { id: string; text: string } };
}

export interface Aula {
  id: string;
  version: string;
  title: string;
  level: string;
  moduleId: string;
  unitId: string;
  duration: number;
  speakers: Record<string, string>;
  cues: AulaCue[];
  checkpoints: AulaCheckpoint[];
}

const AULAS: Record<string, Aula> = {
  'novice-01': novice01 as Aula,
  'pre-novice-01': preNovice01 as Aula,
};

/** XP por pausa acertada (teto do tipo `aula` no guard charlotte.guard_practice_insert). */
export const AULA_XP_PER_CHECKPOINT = 10;

/** Aula que conta como atividade da unidade (e dá XP): só nos Primeiros passos. */
export function aulaCounts(aula: Aula | null | undefined): boolean {
  return aula?.level === 'PreNovice';
}

const BASE = 'https://fnvjibzreepubageztoi.supabase.co/storage/v1/object/public/lesson-videos';

export function getAula(id: string | undefined | null): Aula | null {
  return (id && AULAS[id]) || null;
}

/** Aula do tópico (nível + módulo + unidade), se houver e se o aluno tem a chave beta. */
export function aulaForUnit(
  betaFeatures: string[] | null | undefined, level: string, moduleId: string, unitId: string,
): Aula | null {
  if (!(betaFeatures ?? []).includes(AULA_BETA_KEY)) return null;
  return Object.values(AULAS).find(a => a.level === level && a.moduleId === moduleId && a.unitId === unitId) ?? null;
}

export function aulaUrl(aula: Aula, file: string): string {
  return `${BASE}/${aula.id}/${aula.version}/${file}`;
}

/** "1:31" */
export function aulaLength(aula: Aula): string {
  const s = Math.round(aula.duration);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
