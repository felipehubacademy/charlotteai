// lib/admin-learning.ts — panorama do Pedagógico (/api/admin/learning sem userId).
// As contas são feitas no banco (admin_learning_overview e admin_learning_students); aqui ficam só as
// divisões e arredondamentos, com as mesmas regras de lib/learning-stats e lib/learning-v2.
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { DAY, currentStreak, grammarWithTrailCounts } from '@/lib/learning-stats';
import { v2Title } from '@/lib/learning-v2';

// Somas e contagens do banco (supabase/migrations/20261106151000_admin_learning_users_aggregates.sql).
type OverviewAgg = {
  practices: number; active: number; byType: { type: string; n: number }[];
  pronSum: number; pronN: number; topWords: { word: string; count: number }[];
  grammarAnalyzed: number; grammarWithErrors: number; tfTotal: number; tfOk: number;
  v2Sum: number; v2N: number;
  v2ByActivity: { type: string; n: number; completed: number; gradedSum: number; gradedN: number }[];
  v2Units: { level: string; module: string; unit: string; sum: number; n: number; users: number }[];
};
type StudentAgg = {
  id: string; name: string | null; level: string | null;
  xp: number | null; streak: number | null; lastDate: string | null; hasProgress: boolean;
  practices: number; last: string | null; v2Sum: number; v2N: number; pronSum: number | null; pronN: number;
};
const V2_ORDER = ['grammar', 'speaking', 'roleplay', 'chat'];
const V2_GRADED = new Set(['grammar', 'speaking']);

async function rpcJson<T>(label: string, fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabaseAdmin().rpc(fn as never, args as never);
  if (error) throw new Error(`[${label}] ${error.message}`); // leitura que falha não vira "sem dados"
  return data as T;
}

export async function learningSummary(days: number, since: string) {
  // Antes vinham todas as linhas do período (práticas, mensagens, trilha) e a conta era feita aqui; agora o banco
  // devolve os totais da turma e uma entrada por aluno (a lista mostra todos). Equipe fora, como nas outras telas.
  const [o, studentsAgg] = await Promise.all([
    rpcJson<OverviewAgg>('panorama', 'admin_learning_overview', { p_since: since }),
    rpcJson<StudentAgg[]>('alunos', 'admin_learning_students', { p_since: since }),
  ]);

  const byLevel: Record<string, number> = {};
  studentsAgg.forEach(u => { const l = u.level ?? 'Sem nível'; byLevel[l] = (byLevel[l] ?? 0) + 1; });

  // Prática por tipo (estudo), na ordem da primeira prática de cada tipo.
  const byType: Record<string, number> = {};
  o.byType.forEach(t => { byType[t.type] = Number(t.n); });

  const students = studentsAgg.map(u => {
    const v2N = Number(u.v2N), pronN = Number(u.pronN);
    const last = u.last ?? (u.lastDate ? `${u.lastDate}T12:00:00Z` : null);
    return {
      id: u.id, name: u.name, level: u.level,
      xp: u.xp ?? 0, streak: currentStreak(u.streak, u.lastDate),
      lastPractice: last,
      practices: Number(u.practices),
      trailAccuracy: v2N ? Math.round(Number(u.v2Sum) / v2N) : null, trailAnswers: v2N,
      pronunciation: pronN ? Math.round(Number(u.pronSum) / pronN) : null,
    };
  }).sort((a, b) => (b.lastPractice ?? '').localeCompare(a.lastPractice ?? ''));

  const now = Date.now();
  const idle = students
    .filter(s => s.lastPractice && now - new Date(s.lastPractice).getTime() > 7 * DAY && s.xp > 0)
    .map(s => ({ id: s.id, name: s.name, level: s.level, days: Math.floor((now - new Date(s.lastPractice!).getTime()) / DAY) }))
    .sort((a, b) => a.days - b.days).slice(0, 15);

  const g = grammarWithTrailCounts(Number(o.grammarAnalyzed), Number(o.grammarWithErrors), Number(o.tfTotal), Number(o.tfOk));
  const v2N = Number(o.v2N), pronN = Number(o.pronN);

  // Mesma conta de v2ByActivity e v2HardestUnits (lib/learning-v2), sobre as somas do banco.
  const actBy = new Map(o.v2ByActivity.map(a => [a.type, a]));
  const byExercise = V2_ORDER.map(a => {
    const r = actBy.get(a);
    if (!r || !Number(r.n)) return null;
    const accuracy = V2_GRADED.has(a)
      ? Math.round(Number(r.gradedSum) / Math.max(1, Number(r.gradedN)))
      : Math.round((Number(r.completed) / Number(r.n)) * 100);
    return { type: `v2:${a}`, answers: Number(r.n), accuracy };
  }).filter(Boolean) as { type: string; answers: number; accuracy: number }[];
  const hardestTopics = o.v2Units.filter(c => Number(c.users) >= 3)
    .map(c => ({ level: c.level, ...v2Title(c.level, c.module, c.unit), answers: Number(c.n), students: Number(c.users), accuracy: Math.round(Number(c.sum) / Number(c.n)) }))
    .sort((a, b) => a.accuracy - b.accuracy).slice(0, 8);

  return {
    days,
    summary: {
      students: studentsAgg.length,
      active: Number(o.active),
      practices: Number(o.practices),
      trailAccuracy: v2N ? Math.round(Number(o.v2Sum) / v2N) : null, trailAnswers: v2N,
      pronunciationAvg: pronN ? Math.round(Number(o.pronSum) / pronN) : null, pronunciationAttempts: pronN,
      grammarAnalyzed: g.analyzed, grammarErrorFree: g.errorFree,
    },
    byLevel, byType,
    byExercise,
    hardestTopics,
    mispronounced: o.topWords.map(w => ({ word: w.word, count: Number(w.count) })),
    idle,
    students,
  };
}
