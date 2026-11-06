// /api/admin/learning — visão pedagógica (nível Professor e acima).
// Só dados de estudo: sem e-mail, assinatura, pagamentos ou custos.
//   GET  ?days=30               panorama da turma inteira + lista de alunos
//   GET  ?userId=&days=30       ficha pedagógica de um aluno
//   POST { userId, body }       anotação pedagógica (exige learning:notes)
import { swrCached } from '@/lib/swr-cache';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { readAll } from '@/lib/db-batch';
import { requireAdmin, audit } from '@/lib/admin-auth';
import {
  DAY, isStudy, pronunciation, grammarWithTrail, currentStreak, type TrailFeedbackRow,
  type MsgRow,
} from '@/lib/learning-stats';
import { V2_SELECT, v2Accuracy, v2ByActivity, v2HardestUnits, v2Position, type V2Row } from '@/lib/learning-v2';
import { learningSummary } from '@/lib/admin-learning';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, 'learning');
  if (admin instanceof NextResponse) return admin;
  const days = Math.min(365, Math.max(7, Number(req.nextUrl.searchParams.get('days')) || 30));
  const since = new Date(Date.now() - days * DAY).toISOString();
  const userId = req.nextUrl.searchParams.get('userId');
  const supabase = getSupabaseAdmin();

  if (userId) return studentSheet(userId, since, days);
  // O cálculo levava ~20 s (hoje as contas são no banco): a tela recebe o último guardado na hora e ele se renova por trás a cada 2 minutos.
  return NextResponse.json(await swrCached(`admin:learning:${days}`, 2 * 60_000, 60 * 60_000, () => learningSummary(days, since)));
}

async function studentSheet(userId: string, since: string, days: number) {
  const supabase = getSupabaseAdmin();
  const [userR, progR, msgR, pracR, vocabR, srR, sessR, notesR, v2R, tfR] = await Promise.all([
    supabase.from('charlotte_users').select('id, name, username, charlotte_level, placement_test_done, created_at, timezone').eq('id', userId).maybeSingle(),
    supabase.from('charlotte_progress').select('total_xp, streak_days, last_practice_date').eq('user_id', userId).maybeSingle(),
    // Os .limit(2000/5000) não valiam (máximo de 1.000 linhas por leitura): em páginas, a ficha de um aluno ativo sai inteira.
    readAll('mensagens do aluno', () => supabase.from('chat_messages').select('user_id, role, mode, content, created_at').eq('user_id', userId).in('mode', ['pronunciation', 'grammar']).gte('created_at', since)
      .order('created_at', { ascending: false }).order('id', { ascending: false })).then(data => ({ data })),
    readAll('práticas do aluno', () => supabase.from('charlotte_practices').select('practice_type, created_at').eq('user_id', userId).gte('created_at', since).order('id')).then(data => ({ data })),
    supabase.from('user_vocabulary').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('sr_items').select('id', { count: 'exact', head: true }).eq('user_id', userId).lte('next_review_at', new Date().toISOString()),
    supabase.from('charlotte_chat_sessions').select('id, title, summary, started_at, message_count').eq('user_id', userId).order('started_at', { ascending: false }).limit(8),
    supabase.from('crm_notes').select('id, body, author_name, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
    readAll('trilha do aluno', () => supabase.from('learn_history_v2').select(V2_SELECT).eq('user_id', userId).order('id')).then(data => ({ data })),
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
