// lib/learning-stats.ts
// Análise de estudo do aluno (trilha, pronúncia, gramática). Fonte única para o
// Pedagógico do admin e para a tela "Minha evolução" do app.
import TITLES from '@/lib/curriculum-titles.json';

export const DAY = 86400000;

type Titles = Record<string, { title: string; topics: string[] }[]>;

export function topicName(level: string, mod: number, topic: number) {
  const m = (TITLES as Titles)[level]?.[mod];
  return { module: m?.title ?? `Módulo ${mod + 1}`, topic: m?.topics[topic] ?? `Tópico ${topic + 1}` };
}

// Recompensas de missão e desafio entram em charlotte_practices, mas não são estudo.
export const isStudy = (t: string) => !t.startsWith('mission_reward') && !t.startsWith('weekly_reward');

export const PRON_RE = /\[score:(\d+)\s+mispronounced:([^\]]*)\]/;
export const GRAMMAR_FIX_RE = /❌\s*"([^"]+)"\s*→\s*✅\s*"([^"]+)"/g;
export const isCorrection = (s: string) => s.includes('❌') || /^Error:/m.test(s);

export interface HistRow { user_id: string; level: string; module_index: number; topic_index: number; exercise_type: string; is_correct: boolean; answered_at: string }
export interface MsgRow { user_id: string; role: string; mode: string; content: string; created_at: string }

export async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: unknown }>, max = 20000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += 1000) {
    const { data } = await build(from, from + 999);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

// charlotte_progress guarda a última sequência e não zera quando ela quebra:
// sem prática hoje ou ontem (horário de Brasília), a sequência atual é 0.
export function currentStreak(streak: number | null | undefined, lastDate: string | null | undefined): number {
  if (!streak || !lastDate) return 0;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const diff = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${lastDate.slice(0, 10)}T12:00:00Z`)) / DAY);
  return diff <= 1 ? streak : 0;
}

export function pct(n: number, d: number) { return d ? Math.round((n / d) * 100) : null; }

export function pronunciation(msgs: MsgRow[]) {
  const items = msgs.filter(m => m.mode === 'pronunciation' && m.role === 'user').map(m => {
    const hit = m.content.match(PRON_RE);
    if (!hit) return null;
    const score = Number(hit[1]);
    if (!score) return null;
    const words = hit[2].split(/[,\s]+/).map(w => w.trim().toLowerCase()).filter(Boolean);
    return { phrase: m.content.replace(PRON_RE, '').trim(), score, words, at: m.created_at, user: m.user_id };
  }).filter(Boolean) as { phrase: string; score: number; words: string[]; at: string; user: string }[];
  const wordCount = new Map<string, number>();
  items.forEach(i => i.words.forEach(w => wordCount.set(w, (wordCount.get(w) ?? 0) + 1)));
  return {
    items,
    avg: items.length ? Math.round(items.reduce((s, i) => s + i.score, 0) / items.length) : null,
    topWords: [...wordCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([word, count]) => ({ word, count })),
  };
}

export function grammar(msgs: MsgRow[]) {
  const feedback = msgs.filter(m => m.mode === 'grammar' && m.role === 'assistant');
  const corrections: { wrong: string; right: string; at: string }[] = [];
  feedback.forEach(m => { for (const g of m.content.matchAll(GRAMMAR_FIX_RE)) corrections.push({ wrong: g[1], right: g[2], at: m.created_at }); });
  const withErrors = feedback.filter(m => isCorrection(m.content)).length;
  return { analyzed: feedback.length, errorFree: pct(feedback.length - withErrors, feedback.length), corrections };
}

export function byExercise(rows: HistRow[]) {
  const m = new Map<string, { n: number; ok: number }>();
  rows.forEach(r => { const c = m.get(r.exercise_type) ?? { n: 0, ok: 0 }; c.n++; if (r.is_correct) c.ok++; m.set(r.exercise_type, c); });
  return [...m.entries()].map(([type, c]) => ({ type, answers: c.n, accuracy: pct(c.ok, c.n) })).sort((a, b) => b.answers - a.answers);
}

export function byTopic(rows: HistRow[], minAnswers: number) {
  const m = new Map<string, { level: string; mod: number; topic: number; n: number; ok: number; users: Set<string> }>();
  rows.forEach(r => {
    const k = `${r.level}|${r.module_index}|${r.topic_index}`;
    const c = m.get(k) ?? { level: r.level, mod: r.module_index, topic: r.topic_index, n: 0, ok: 0, users: new Set() };
    c.n++; if (r.is_correct) c.ok++; c.users.add(r.user_id); m.set(k, c);
  });
  return [...m.values()].filter(c => c.n >= minAnswers)
    .map(c => ({ level: c.level, moduleIndex: c.mod, topicIndex: c.topic, ...topicName(c.level, c.mod, c.topic), answers: c.n, students: c.users.size, accuracy: pct(c.ok, c.n) ?? 0 }))
    .sort((a, b) => a.accuracy - b.accuracy);
}


/** Correções do fim do Role-play e do Guided Chat (tabela trail_feedback). */
export type TrailFeedbackRow = { error_free: boolean; corrections: { said: string; correct: string }[] | null; created_at: string };

/** Gramática do Practice + conversas da trilha: % sem erro, quantas analisadas e as correções. */
export function grammarWithTrail(msgs: MsgRow[], tf: TrailFeedbackRow[]) {
  const g = grammar(msgs);
  const okChat = Math.round(((g.errorFree ?? 0) * g.analyzed) / 100);
  const analyzed = g.analyzed + tf.length;
  const ok = okChat + tf.filter(r => r.error_free).length;
  const corrections = [
    ...g.corrections,
    ...tf.flatMap(r => (r.corrections ?? []).map(c => ({ wrong: c.said, right: c.correct, at: r.created_at }))),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return { analyzed, errorFree: pct(ok, analyzed), corrections };
}
