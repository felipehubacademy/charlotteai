// /api/admin/crm — ficha do aluno (CRM e CS).
//   GET  ?userId=     perfil, atividade, conversas, suporte, pagamentos,
//                     anotações, etiquetas e risco de cancelamento
//   POST { userId, action: 'note', body }   nova anotação (exige users:write)
//   POST { userId, action: 'tags', tags }   substitui as etiquetas
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin, audit } from '@/lib/admin-auth';
import { computeRisk } from '@/lib/crm-risk';

export const dynamic = 'force-dynamic';

const DAY = 86400000;

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, 'users');
  if (admin instanceof NextResponse) return admin;
  const userId = req.nextUrl.searchParams.get('userId') ?? '';
  if (!userId) return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - 60 * DAY).toISOString();
  const [userR, progR, pracR, sessR, supR, revR, notesR, tagsR] = await Promise.all([
    supabase.from('charlotte_users').select('id, email, name, username, charlotte_level, is_institutional, is_active, subscription_status, subscription_product, subscription_expires_at, trial_ends_at, created_at, last_seen_at, last_practice_at, app_version, app_platform, avatar_url, marketing_opt_out').eq('id', userId).maybeSingle(),
    supabase.from('charlotte_progress').select('total_xp, streak_days, last_practice_date').eq('user_id', userId).maybeSingle(),
    supabase.from('charlotte_practices').select('practice_type, xp_earned, created_at').eq('user_id', userId).gte('created_at', since).order('created_at', { ascending: false }).limit(2000),
    supabase.from('charlotte_chat_sessions').select('id, title, summary, started_at, message_count').eq('user_id', userId).order('started_at', { ascending: false }).limit(10),
    supabase.from('support_conversations').select('id, channel, subject, status, created_at, last_message_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    supabase.from('revenue_events').select('event_type, product_id, store, net_brl, gross_brl, purchased_at').eq('app_user_id', userId).order('purchased_at', { ascending: false }).limit(20),
    supabase.from('crm_notes').select('id, body, author_name, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
    supabase.from('crm_tags').select('tags').eq('user_id', userId).maybeSingle(),
  ]);

  const user = userR.data as Record<string, any> | null;
  if (!user) return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
  const practices = (pracR.data ?? []) as { practice_type: string; xp_earned: number | null; created_at: string }[];
  const progress = progR.data as { total_xp: number; streak_days: number; last_practice_date: string | null } | null;

  // Atividade por dia (últimos 60) e por tipo
  const byDay: Record<string, number> = {};
  const byType: Record<string, number> = {};
  practices.forEach(p => {
    const d = p.created_at.slice(0, 10);
    byDay[d] = (byDay[d] ?? 0) + 1;
    byType[p.practice_type] = (byType[p.practice_type] ?? 0) + 1;
  });
  const practices7d = practices.filter(p => Date.now() - new Date(p.created_at).getTime() < 7 * DAY).length;
  const support = (supR.data ?? []) as { status: string }[];

  const risk = computeRisk({
    status: user.subscription_status, institutional: !!user.is_institutional,
    trialEndsAt: user.trial_ends_at, expiresAt: user.subscription_expires_at,
    lastActive: practices[0]?.created_at ?? user.last_practice_at ?? null,
    streak: progress?.streak_days ?? 0, practices7d,
    openTickets: support.filter(s => s.status !== 'closed' && s.status !== 'resolved').length,
  });

  return NextResponse.json({
    social: await socialOf(userId),
    user, progress, risk,
    activity: { byDay, byType, total60d: practices.length, practices7d, xp60d: practices.reduce((s, p) => s + (p.xp_earned ?? 0), 0) },
    sessions: sessR.data ?? [], support: supR.data ?? [], payments: revR.data ?? [],
    notes: notesR.data ?? [], tags: (tagsR.data as { tags: string[] } | null)?.tags ?? [],
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, 'users:write');
  if (admin instanceof NextResponse) return admin;
  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId ?? '');
  if (!userId) return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 });
  const supabase = getSupabaseAdmin();

  if (body.action === 'note') {
    const text = String(body.body ?? '').trim();
    if (!text) return NextResponse.json({ error: 'Anotação vazia' }, { status: 400 });
    const { data, error } = await supabase.from('crm_notes').insert({
      user_id: userId, author_id: admin.userId, author_name: admin.name ?? admin.email, body: text.slice(0, 4000),
    } as never).select('id, body, author_name, created_at').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await audit(admin, 'crm.note', 'user', userId);
    return NextResponse.json({ note: data });
  }

  if (body.action === 'tags') {
    const tags = (Array.isArray(body.tags) ? body.tags : [])
      .map((t: unknown) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 20);
    const { error } = await supabase.from('crm_tags').upsert({ user_id: userId, tags: [...new Set(tags)], updated_at: new Date().toISOString() } as never);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await audit(admin, 'crm.tags', 'user', userId, { tags });
    return NextResponse.json({ tags });
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}

/** Social do aluno: amigos de estudo, competições, bloqueios, denúncias e suspensão. */
async function socialOf(userId: string) {
  const supabase = getSupabaseAdmin();
  const [inv, by, fa, fb, bOut, bIn, rOut, rIn, sus, parts] = await Promise.all([
    supabase.from('referrals').select('invitee_id').eq('inviter_id', userId),
    supabase.from('referrals').select('inviter_id').eq('invitee_id', userId),
    supabase.from('study_friends').select('user_b').eq('user_a', userId),
    supabase.from('study_friends').select('user_a').eq('user_b', userId),
    supabase.from('user_blocks').select('blocked_id, created_at').eq('blocker_id', userId),
    supabase.from('user_blocks').select('blocker_id, created_at').eq('blocked_id', userId),
    supabase.from('user_reports').select('id, reported_id, reason, handled, created_at').eq('reporter_id', userId).order('created_at', { ascending: false }).limit(20),
    supabase.from('user_reports').select('id, reporter_id, reason, handled, created_at').eq('reported_id', userId).order('created_at', { ascending: false }).limit(20),
    supabase.from('social_suspensions').select('reason, created_by, created_at').eq('user_id', userId).maybeSingle(),
    supabase.from('rally_participants').select('rally_id').eq('user_id', userId).limit(50),
  ]);
  const { data: tok } = await supabase.from('charlotte_users').select('expo_push_token').eq('id', userId).maybeSingle();
  const token = (tok as { expo_push_token: string | null } | null)?.expo_push_token ?? null;
  const { data: pushes } = token
    ? await supabase.from('push_log').select('type, title, ok, error, created_at').eq('token', token).order('created_at', { ascending: false }).limit(10)
    : { data: [] };
  const rel = new Map<string, string>();
  ((fa.data ?? []) as { user_b: string }[]).forEach(r => rel.set(r.user_b, 'Amigo (busca)'));
  ((fb.data ?? []) as { user_a: string }[]).forEach(r => rel.set(r.user_a, 'Amigo (busca)'));
  ((inv.data ?? []) as { invitee_id: string }[]).forEach(r => rel.set(r.invitee_id, 'Convidado por ele'));
  ((by.data ?? []) as { inviter_id: string }[]).forEach(r => rel.set(r.inviter_id, 'Padrinho'));
  const rallyIds = ((parts.data ?? []) as { rally_id: string }[]).map(p => p.rally_id);
  const { data: rallies } = rallyIds.length
    ? await supabase.from('rallies').select('id, code, metric, duration_hours, starts_at, ends_at, finalized, winner_id').in('id', rallyIds).order('starts_at', { ascending: false }).limit(10)
    : { data: [] };
  const ids = [...new Set([
    ...rel.keys(),
    ...((bOut.data ?? []) as { blocked_id: string }[]).map(r => r.blocked_id),
    ...((bIn.data ?? []) as { blocker_id: string }[]).map(r => r.blocker_id),
    ...((rOut.data ?? []) as { reported_id: string }[]).map(r => r.reported_id),
    ...((rIn.data ?? []) as { reporter_id: string }[]).map(r => r.reporter_id),
  ])];
  const { data: people } = ids.length ? await supabase.from('charlotte_users').select('id, name, username').in('id', ids) : { data: [] };
  const p = new Map(((people ?? []) as { id: string; name: string | null; username: string | null }[]).map(x => [x.id, x]));
  const who = (id: string) => ({ id, name: p.get(id)?.name ?? null, username: p.get(id)?.username ?? null });
  return {
    hasPushToken: !!token,
    pushes: (pushes ?? []) as { type: string | null; title: string | null; ok: boolean; error: string | null; created_at: string }[],
    suspended: sus.data ? sus.data as { reason: string | null; created_by: string | null; created_at: string } : null,
    friends: [...rel.entries()].map(([id, relation]) => ({ ...who(id), relation })),
    rallies: ((rallies ?? []) as { id: string; code: string; metric: string; duration_hours: number; starts_at: string; ends_at: string; finalized: boolean; winner_id: string | null }[])
      .map(r => ({ code: r.code, metric: r.metric, hours: r.duration_hours, startsAt: r.starts_at, endsAt: r.ends_at, finished: r.finalized, won: r.winner_id === userId })),
    blocked: ((bOut.data ?? []) as { blocked_id: string; created_at: string }[]).map(r => ({ ...who(r.blocked_id), at: r.created_at })),
    blockedBy: ((bIn.data ?? []) as { blocker_id: string; created_at: string }[]).map(r => ({ ...who(r.blocker_id), at: r.created_at })),
    reportsMade: ((rOut.data ?? []) as { id: number; reported_id: string; reason: string; handled: boolean; created_at: string }[]).map(r => ({ ...who(r.reported_id), reportId: r.id, reason: r.reason, handled: r.handled, at: r.created_at })),
    reportsReceived: ((rIn.data ?? []) as { id: number; reporter_id: string; reason: string; handled: boolean; created_at: string }[]).map(r => ({ ...who(r.reporter_id), reportId: r.id, reason: r.reason, handled: r.handled, at: r.created_at })),
  };
}
