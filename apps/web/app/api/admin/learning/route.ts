// /api/admin/learning — visão pedagógica (nível Professor e acima).
// Só dados de estudo: sem e-mail, assinatura, pagamentos ou custos.
//   GET  ?days=30               panorama da turma inteira + lista de alunos
//   GET  ?userId=&days=30       ficha pedagógica de um aluno
//   POST { userId, body }       anotação pedagógica (exige learning:notes)
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin, audit } from '@/lib/admin-auth';
import TITLES from '@/lib/curriculum-titles.json';

export const dynamic = 'force-dynamic';

const DAY = 86400000;
type Titles = Record<string, { title: string; topics: string[] }[]>;

function topicName(level: string, mod: number, topic: number) {
  const m = (TITLES as Titles)[level]?.[mod];
  return { module: m?.title ?? `Módulo ${mod + 1}`, topic: m?.topics[topic] ?? `Tópico ${topic + 1}` };
}

// Recompensas de missão e desafio entram em charlotte_practices, mas não são estudo.
const isStudy = (t: string) => !t.startsWith('mission_reward') && !t.startsWith('weekly_reward');

const PRON_RE = /\[score:(\d+)\s+mispronounced:([^\]]*)\]/;
const GRAMMAR_FIX_RE = /❌\s*"([^"]+)"\s*→\s*✅\s*"([^"]+)"/g;
const isCorrection = (s: string) => s.includes('❌') || /^Error:/m.test(s);

interface HistRow { user_id: string; level: string; module_index: number; topic_index: number; exercise_type: string; is_correct: boolean; answered_at: string }
interface MsgRow { user_id: string; role: string; mode: string; content: string; created_at: string }

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: unknown }>, max = 20000): Promise<T[]> {
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
function currentStreak(streak: number | null | undefined, lastDate: string | null | undefined): number {
  if (!streak || !lastDate) return 0;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const diff = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${lastDate.slice(0, 10)}T12:00:00Z`)) / DAY);
  return diff <= 1 ? streak : 0;
}

function pct(n: number, d: number) { return d ? Math.round((n / d) * 100) : null; }

function pronunciation(msgs: MsgRow[]) {
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

function grammar(msgs: MsgRow[]) {
  const feedback = msgs.filter(m => m.mode === 'grammar' && m.role === 'assistant');
  const corrections: { wrong: string; right: string; at: string }[] = [];
  feedback.forEach(m => { for (const g of m.content.matchAll(GRAMMAR_FIX_RE)) corrections.push({ wrong: g[1], right: g[2], at: m.created_at }); });
  const withErrors = feedback.filter(m => isCorrection(m.content)).length;
  return { analyzed: feedback.length, errorFree: pct(feedback.length - withErrors, feedback.length), corrections };
}

function byExercise(rows: HistRow[]) {
  const m = new Map<string, { n: number; ok: number }>();
  rows.forEach(r => { const c = m.get(r.exercise_type) ?? { n: 0, ok: 0 }; c.n++; if (r.is_correct) c.ok++; m.set(r.exercise_type, c); });
  return [...m.entries()].map(([type, c]) => ({ type, answers: c.n, accuracy: pct(c.ok, c.n) })).sort((a, b) => b.answers - a.answers);
}

function byTopic(rows: HistRow[], minAnswers: number) {
  const m = new Map<string, { level: string; mod: number; topic: number; n: number; ok: number; users: Set<string> }>();
  rows.forEach(r => {
    const k = `${r.level}|${r.module_index}|${r.topic_index}`;
    const c = m.get(k) ?? { level: r.level, mod: r.module_index, topic: r.topic_index, n: 0, ok: 0, users: new Set() };
    c.n++; if (r.is_correct) c.ok++; c.users.add(r.user_id); m.set(k, c);
  });
  return [...m.values()].filter(c => c.n >= minAnswers)
    .map(c => ({ level: c.level, ...topicName(c.level, c.mod, c.topic), answers: c.n, students: c.users.size, accuracy: pct(c.ok, c.n) ?? 0 }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, 'learning');
  if (admin instanceof NextResponse) return admin;
  const days = Math.min(365, Math.max(7, Number(req.nextUrl.searchParams.get('days')) || 30));
  const since = new Date(Date.now() - days * DAY).toISOString();
  const userId = req.nextUrl.searchParams.get('userId');
  const supabase = getSupabaseAdmin();

  if (userId) return studentSheet(userId, since, days);

  const [users, progress, practices, hist, msgs] = await Promise.all([
    fetchAll<{ id: string; name: string | null; charlotte_level: string | null; is_active: boolean | null; created_at: string }>((a, b) =>
      supabase.from('charlotte_users').select('id, name, charlotte_level, is_active, created_at').order('created_at', { ascending: false }).range(a, b)),
    fetchAll<{ user_id: string; total_xp: number; streak_days: number; last_practice_date: string | null }>((a, b) =>
      supabase.from('charlotte_progress').select('user_id, total_xp, streak_days, last_practice_date').range(a, b)),
    fetchAll<{ user_id: string; practice_type: string; created_at: string }>((a, b) =>
      supabase.from('charlotte_practices').select('user_id, practice_type, created_at').gte('created_at', since).range(a, b), 100000),
    fetchAll<HistRow>((a, b) =>
      supabase.from('learn_history').select('user_id, level, module_index, topic_index, exercise_type, is_correct, answered_at').gte('answered_at', since).range(a, b), 100000),
    fetchAll<MsgRow>((a, b) =>
      supabase.from('chat_messages').select('user_id, role, mode, content, created_at').in('mode', ['pronunciation', 'grammar']).gte('created_at', since).range(a, b), 50000),
  ]);

  const study = practices.filter(p => isStudy(p.practice_type));
  const progressBy = new Map(progress.map(p => [p.user_id, p]));
  const practicesBy = new Map<string, number>();
  const lastBy = new Map<string, string>();
  study.forEach(p => {
    practicesBy.set(p.user_id, (practicesBy.get(p.user_id) ?? 0) + 1);
    if (!lastBy.has(p.user_id) || p.created_at > lastBy.get(p.user_id)!) lastBy.set(p.user_id, p.created_at);
  });
  const histBy = new Map<string, { n: number; ok: number }>();
  hist.forEach(h => { const c = histBy.get(h.user_id) ?? { n: 0, ok: 0 }; c.n++; if (h.is_correct) c.ok++; histBy.set(h.user_id, c); });
  const pron = pronunciation(msgs);
  const pronBy = new Map<string, number[]>();
  pron.items.forEach(i => pronBy.set(i.user, [...(pronBy.get(i.user) ?? []), i.score]));

  const byLevel: Record<string, number> = {};
  users.forEach(u => { const l = u.charlotte_level ?? 'Sem nível'; byLevel[l] = (byLevel[l] ?? 0) + 1; });

  // Prática por tipo (estudo)
  const byType: Record<string, number> = {};
  study.forEach(p => { byType[p.practice_type] = (byType[p.practice_type] ?? 0) + 1; });

  const students = users.map(u => {
    const pr = progressBy.get(u.id);
    const h = histBy.get(u.id);
    const ps = pronBy.get(u.id);
    const last = lastBy.get(u.id) ?? (pr?.last_practice_date ? `${pr.last_practice_date}T12:00:00Z` : null);
    return {
      id: u.id, name: u.name, level: u.charlotte_level,
      xp: pr?.total_xp ?? 0, streak: currentStreak(pr?.streak_days, pr?.last_practice_date),
      lastPractice: last,
      practices: practicesBy.get(u.id) ?? 0,
      trailAccuracy: h ? pct(h.ok, h.n) : null, trailAnswers: h?.n ?? 0,
      pronunciation: ps ? Math.round(ps.reduce((s, x) => s + x, 0) / ps.length) : null,
    };
  }).sort((a, b) => (b.lastPractice ?? '').localeCompare(a.lastPractice ?? ''));

  const now = Date.now();
  const idle = students
    .filter(s => s.lastPractice && now - new Date(s.lastPractice).getTime() > 7 * DAY && (progressBy.get(s.id)?.total_xp ?? 0) > 0)
    .map(s => ({ id: s.id, name: s.name, level: s.level, days: Math.floor((now - new Date(s.lastPractice!).getTime()) / DAY) }))
    .sort((a, b) => a.days - b.days).slice(0, 15);

  const g = grammar(msgs);
  const okAll = hist.filter(h => h.is_correct).length;

  return NextResponse.json({
    days,
    summary: {
      students: users.length,
      active: new Set(study.map(p => p.user_id)).size,
      practices: study.length,
      trailAccuracy: pct(okAll, hist.length), trailAnswers: hist.length,
      pronunciationAvg: pron.avg, pronunciationAttempts: pron.items.length,
      grammarAnalyzed: g.analyzed, grammarErrorFree: g.errorFree,
    },
    byLevel, byType,
    byExercise: byExercise(hist),
    hardestTopics: byTopic(hist, 15).slice(0, 8),
    mispronounced: pron.topWords,
    idle,
    students,
  });
}

async function studentSheet(userId: string, since: string, days: number) {
  const supabase = getSupabaseAdmin();
  const [userR, progR, trailR, histR, msgR, pracR, vocabR, srR, sessR, notesR] = await Promise.all([
    supabase.from('charlotte_users').select('id, name, charlotte_level, placement_test_done, created_at, timezone').eq('id', userId).maybeSingle(),
    supabase.from('charlotte_progress').select('total_xp, streak_days, last_practice_date').eq('user_id', userId).maybeSingle(),
    supabase.from('learn_progress').select('level, module_index, topic_index, updated_at').eq('user_id', userId),
    supabase.from('learn_history').select('user_id, level, module_index, topic_index, exercise_type, is_correct, answered_at').eq('user_id', userId).gte('answered_at', since).limit(5000),
    supabase.from('chat_messages').select('user_id, role, mode, content, created_at').eq('user_id', userId).in('mode', ['pronunciation', 'grammar']).gte('created_at', since).order('created_at', { ascending: false }).limit(2000),
    supabase.from('charlotte_practices').select('practice_type, created_at').eq('user_id', userId).gte('created_at', since).limit(5000),
    supabase.from('user_vocabulary').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('sr_items').select('id', { count: 'exact', head: true }).eq('user_id', userId).lte('next_review_at', new Date().toISOString()),
    supabase.from('charlotte_chat_sessions').select('id, title, summary, started_at, message_count').eq('user_id', userId).order('started_at', { ascending: false }).limit(8),
    supabase.from('crm_notes').select('id, body, author_name, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
  ]);
  const u = userR.data as { id: string; name: string | null; charlotte_level: string | null; placement_test_done: boolean | null; created_at: string } | null;
  if (!u) return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });

  const hist = (histR.data ?? []) as HistRow[];
  const msgs = (msgR.data ?? []) as MsgRow[];
  const study = ((pracR.data ?? []) as { practice_type: string; created_at: string }[]).filter(p => isStudy(p.practice_type));
  const byDay: Record<string, number> = {};
  const byType: Record<string, number> = {};
  study.forEach(p => {
    const d = p.created_at.slice(0, 10);
    byDay[d] = (byDay[d] ?? 0) + 1;
    byType[p.practice_type] = (byType[p.practice_type] ?? 0) + 1;
  });
  const pron = pronunciation(msgs);
  const g = grammar(msgs);
  const trail = ((trailR.data ?? []) as { level: string; module_index: number; topic_index: number; updated_at: string }[])
    .map(t => ({ level: t.level, ...topicName(t.level, t.module_index, t.topic_index), moduleNumber: t.module_index + 1, updatedAt: t.updated_at }));

  return NextResponse.json({
    days,
    student: { id: u.id, name: u.name, level: u.charlotte_level, placementDone: !!u.placement_test_done, since: u.created_at },
    progress: progR.data ? { ...(progR.data as { total_xp: number; streak_days: number; last_practice_date: string | null }), streak_days: currentStreak((progR.data as { streak_days: number }).streak_days, (progR.data as { last_practice_date: string | null }).last_practice_date) } : null,
    trail,
    trailAccuracy: pct(hist.filter(h => h.is_correct).length, hist.length), trailAnswers: hist.length,
    byExercise: byExercise(hist),
    topics: byTopic(hist, 3),
    activity: { byDay, byType, total: study.length },
    pronunciation: { avg: pron.avg, attempts: pron.items.length, recent: pron.items.slice(0, 15).map(({ user: _u, ...i }) => i), topWords: pron.topWords },
    grammar: { analyzed: g.analyzed, errorFree: g.errorFree, corrections: g.corrections.slice(0, 15) },
    vocabulary: { saved: vocabR.count ?? 0, dueReviews: srR.count ?? 0 },
    sessions: sessR.data ?? [],
    notes: notesR.data ?? [],
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, 'learning:notes');
  if (admin instanceof NextResponse) return admin;
  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId ?? '');
  const text = String(body.body ?? '').trim();
  if (!userId || !text) return NextResponse.json({ error: 'Aluno e anotação são obrigatórios.' }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().from('crm_notes').insert({
    user_id: userId, author_id: admin.userId, author_name: admin.name ?? admin.email, body: text.slice(0, 4000),
  } as never).select('id, body, author_name, created_at').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await audit(admin, 'learning.note', 'user', userId);
  return NextResponse.json({ note: data });
}
