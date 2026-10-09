// /api/admin/learning — visão pedagógica (nível Professor e acima).
// Só dados de estudo: sem e-mail, assinatura, pagamentos ou custos.
//   GET  ?days=30               panorama da turma inteira + lista de alunos
//   GET  ?userId=&days=30       ficha pedagógica de um aluno
//   POST { userId, body }       anotação pedagógica (exige learning:notes)
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin, audit } from '@/lib/admin-auth';
import {
  DAY, isStudy, pronunciation, grammarWithTrail, currentStreak, fetchAll, type TrailFeedbackRow,
  type MsgRow,
} from '@/lib/learning-stats';
import { V2_SELECT, v2Accuracy, v2ByActivity, v2HardestUnits, v2Position, type V2Row } from '@/lib/learning-v2';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, 'learning');
  if (admin instanceof NextResponse) return admin;
  const days = Math.min(365, Math.max(7, Number(req.nextUrl.searchParams.get('days')) || 30));
  const since = new Date(Date.now() - days * DAY).toISOString();
  const userId = req.nextUrl.searchParams.get('userId');
  const supabase = getSupabaseAdmin();

  if (userId) return studentSheet(userId, since, days);

  const [users, progress, practices, msgs, v2, tfAll] = await Promise.all([
    fetchAll<{ id: string; name: string | null; charlotte_level: string | null; is_active: boolean | null; created_at: string }>((a, b) =>
      supabase.from('charlotte_users').select('id, name, charlotte_level, is_active, created_at').order('created_at', { ascending: false }).range(a, b)),
    fetchAll<{ user_id: string; total_xp: number; streak_days: number; last_practice_date: string | null }>((a, b) =>
      supabase.from('charlotte_progress').select('user_id, total_xp, streak_days, last_practice_date').range(a, b)),
    fetchAll<{ user_id: string; practice_type: string; created_at: string }>((a, b) =>
      supabase.from('charlotte_practices').select('user_id, practice_type, created_at').gte('created_at', since).range(a, b), 100000),
    fetchAll<MsgRow>((a, b) =>
      supabase.from('chat_messages').select('user_id, role, mode, content, created_at').in('mode', ['pronunciation', 'grammar']).gte('created_at', since).range(a, b), 50000),
    fetchAll<V2Row>((a, b) =>
      supabase.from('learn_history_v2').select(V2_SELECT).gte('updated_at', since).range(a, b), 100000),
    fetchAll<TrailFeedbackRow>((a, b) =>
      supabase.from('trail_feedback').select('error_free, corrections, created_at').gte('created_at', since).range(a, b), 50000),
  ]);

  const v2By = new Map<string, V2Row[]>();
  v2.forEach(r => v2By.set(r.user_id, [...(v2By.get(r.user_id) ?? []), r]));
  const study = practices.filter(p => isStudy(p.practice_type));
  const progressBy = new Map(progress.map(p => [p.user_id, p]));
  const practicesBy = new Map<string, number>();
  const lastBy = new Map<string, string>();
  study.forEach(p => {
    practicesBy.set(p.user_id, (practicesBy.get(p.user_id) ?? 0) + 1);
    if (!lastBy.has(p.user_id) || p.created_at > lastBy.get(p.user_id)!) lastBy.set(p.user_id, p.created_at);
  });
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
    const acc = v2Accuracy(v2By.get(u.id) ?? []);
    const ps = pronBy.get(u.id);
    const last = lastBy.get(u.id) ?? (pr?.last_practice_date ? `${pr.last_practice_date}T12:00:00Z` : null);
    return {
      id: u.id, name: u.name, level: u.charlotte_level,
      xp: pr?.total_xp ?? 0, streak: currentStreak(pr?.streak_days, pr?.last_practice_date),
      lastPractice: last,
      practices: practicesBy.get(u.id) ?? 0,
      trailAccuracy: acc.accuracy, trailAnswers: acc.answers,
      pronunciation: ps ? Math.round(ps.reduce((s, x) => s + x, 0) / ps.length) : null,
    };
  }).sort((a, b) => (b.lastPractice ?? '').localeCompare(a.lastPractice ?? ''));

  const now = Date.now();
  const idle = students
    .filter(s => s.lastPractice && now - new Date(s.lastPractice).getTime() > 7 * DAY && (progressBy.get(s.id)?.total_xp ?? 0) > 0)
    .map(s => ({ id: s.id, name: s.name, level: s.level, days: Math.floor((now - new Date(s.lastPractice!).getTime()) / DAY) }))
    .sort((a, b) => a.days - b.days).slice(0, 15);

  const g = grammarWithTrail(msgs, tfAll);
  const accAll = v2Accuracy(v2);

  return NextResponse.json({
    days,
    summary: {
      students: users.length,
      active: new Set(study.map(p => p.user_id)).size,
      practices: study.length,
      trailAccuracy: accAll.accuracy, trailAnswers: accAll.answers,
      pronunciationAvg: pron.avg, pronunciationAttempts: pron.items.length,
      grammarAnalyzed: g.analyzed, grammarErrorFree: g.errorFree,
    },
    byLevel, byType,
    byExercise: v2ByActivity(v2),
    hardestTopics: v2HardestUnits(v2, 3).slice(0, 8),
    mispronounced: pron.topWords,
    idle,
    students,
  });
}

async function studentSheet(userId: string, since: string, days: number) {
  const supabase = getSupabaseAdmin();
  const [userR, progR, msgR, pracR, vocabR, srR, sessR, notesR, v2R, tfR] = await Promise.all([
    supabase.from('charlotte_users').select('id, name, username, charlotte_level, placement_test_done, created_at, timezone').eq('id', userId).maybeSingle(),
    supabase.from('charlotte_progress').select('total_xp, streak_days, last_practice_date').eq('user_id', userId).maybeSingle(),
    supabase.from('chat_messages').select('user_id, role, mode, content, created_at').eq('user_id', userId).in('mode', ['pronunciation', 'grammar']).gte('created_at', since).order('created_at', { ascending: false }).limit(2000),
    supabase.from('charlotte_practices').select('practice_type, created_at').eq('user_id', userId).gte('created_at', since).limit(5000),
    supabase.from('user_vocabulary').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('sr_items').select('id', { count: 'exact', head: true }).eq('user_id', userId).lte('next_review_at', new Date().toISOString()),
    supabase.from('charlotte_chat_sessions').select('id, title, summary, started_at, message_count').eq('user_id', userId).order('started_at', { ascending: false }).limit(8),
    supabase.from('crm_notes').select('id, body, author_name, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
    supabase.from('learn_history_v2').select(V2_SELECT).eq('user_id', userId).limit(5000),
    supabase.from('trail_feedback').select('error_free, corrections, created_at').eq('user_id', userId).gte('created_at', since).limit(500),
  ]);
  const u = userR.data as { id: string; name: string | null; username: string | null; charlotte_level: string | null; placement_test_done: boolean | null; created_at: string } | null;
  if (!u) return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });

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
  const g = grammarWithTrail(msgs, (tfR.data ?? []) as TrailFeedbackRow[]);
  const v2All = (v2R.data ?? []) as V2Row[];
  const v2 = v2All.filter(r => r.updated_at >= since);
  const pos = u.charlotte_level ? v2Position(v2All, u.charlotte_level) : null;
  const acc = v2Accuracy(v2);

  return NextResponse.json({
    days,
    student: { id: u.id, name: u.name, username: u.username, level: u.charlotte_level, placementDone: !!u.placement_test_done, since: u.created_at },
    progress: progR.data ? { ...(progR.data as { total_xp: number; streak_days: number; last_practice_date: string | null }), streak_days: currentStreak((progR.data as { streak_days: number }).streak_days, (progR.data as { last_practice_date: string | null }).last_practice_date) } : null,
    // Posição: a próxima unidade da trilha.
    trail: pos?.next ? [{ ...pos.next, updatedAt: v2All.map(r => r.updated_at).sort().at(-1) ?? '' }] : [],
    trailUnits: pos ? { done: pos.unitsDone, total: pos.unitsTotal } : null,
    trailAccuracy: acc.accuracy, trailAnswers: acc.answers,
    byExercise: v2ByActivity(v2),
    topics: v2HardestUnits(v2, 1),
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
