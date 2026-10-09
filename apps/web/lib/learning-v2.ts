// lib/learning-v2.ts — leitura pedagógica da trilha nova (learn_history_v2).
// Uma linha por (aluno, nível, módulo, unidade, atividade). Gramática e
// Listening & Speaking têm nota (0–100); Role-play e Guided Chat contam como concluído.
// Títulos: lib/curriculum-v2-titles.json, gerado a partir de apps/mobile/data/curriculum-v2
// (regerar quando o conteúdo da trilha mudar).
import TITLES from '@/lib/curriculum-v2-titles.json';

export type V2Row = {
  user_id: string; level: string; module_id: string; unit_id: string; activity_type: string;
  score: number | string | null; completed: boolean | null; updated_at: string;
};

const T = TITLES as Record<string, Record<string, { n: number; t: string; u: Record<string, string> }>>;
const GRADED = new Set(['grammar', 'speaking']);
const ORDER = ['grammar', 'speaking', 'roleplay', 'chat'];

export const V2_SELECT = 'user_id, level, module_id, unit_id, activity_type, score, completed, updated_at';

export function v2Title(level: string, moduleId: string, unitId: string) {
  const m = T[level]?.[moduleId];
  return { module: m?.t ?? moduleId, topic: m?.u[unitId] ?? unitId, moduleNumber: m?.n ?? Number(moduleId.slice(1)) };
}

export const v2Graded = (rows: V2Row[]) => rows.filter(r => GRADED.has(r.activity_type) && r.score != null && !Number.isNaN(Number(r.score)));

/** Nota média da trilha (Gramática + Listening & Speaking) e quantas atividades com nota. */
export function v2Accuracy(rows: V2Row[]): { accuracy: number | null; answers: number } {
  const g = v2Graded(rows);
  if (!g.length) return { accuracy: null, answers: 0 };
  return { accuracy: Math.round(g.reduce((s, r) => s + Number(r.score), 0) / g.length), answers: g.length };
}

/** Por atividade: nota média (Gramática, L&S) ou % concluída (Role-play, Chat). */
export function v2ByActivity(rows: V2Row[]) {
  return ORDER.map(a => {
    const rs = rows.filter(r => r.activity_type === a);
    if (!rs.length) return null;
    const accuracy = GRADED.has(a)
      ? Math.round(v2Graded(rs).reduce((s, r) => s + Number(r.score), 0) / Math.max(1, v2Graded(rs).length))
      : Math.round((rs.filter(r => r.completed).length / rs.length) * 100);
    return { type: `v2:${a}`, answers: rs.length, accuracy };
  }).filter(Boolean) as { type: string; answers: number; accuracy: number }[];
}

/** Unidades com menor nota (Gramática + L&S), para achar onde a turma trava. */
export function v2HardestUnits(rows: V2Row[], minStudents: number) {
  const m = new Map<string, { level: string; mod: string; unit: string; sum: number; n: number; users: Set<string> }>();
  for (const r of v2Graded(rows)) {
    const k = `${r.level}|${r.module_id}|${r.unit_id}`;
    const c = m.get(k) ?? { level: r.level, mod: r.module_id, unit: r.unit_id, sum: 0, n: 0, users: new Set() };
    c.sum += Number(r.score); c.n++; c.users.add(r.user_id); m.set(k, c);
  }
  return [...m.values()].filter(c => c.users.size >= minStudents)
    .map(c => ({ level: c.level, ...v2Title(c.level, c.mod, c.unit), answers: c.n, students: c.users.size, accuracy: Math.round(c.sum / c.n) }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

/** Unidades concluídas (as 4 atividades) e a próxima unidade do aluno num nível. */
export function v2Position(rows: V2Row[], level: string) {
  const done = new Map<string, Set<string>>();
  for (const r of rows) if (r.level === level && r.completed) {
    const k = `${r.module_id}|${r.unit_id}`;
    done.set(k, (done.get(k) ?? new Set()).add(r.activity_type));
  }
  const mods = Object.entries(T[level] ?? {}).sort((a, b) => a[1].n - b[1].n);
  const all = mods.flatMap(([mid, m]) => Object.keys(m.u).map(uid => ({ mid, uid })));
  const complete = all.filter(x => (done.get(`${x.mid}|${x.uid}`)?.size ?? 0) >= ORDER.length).length;
  const next = all.find(x => (done.get(`${x.mid}|${x.uid}`)?.size ?? 0) < ORDER.length);
  return {
    unitsDone: complete, unitsTotal: all.length,
    next: next ? { level, ...v2Title(level, next.mid, next.uid) } : null,
  };
}
