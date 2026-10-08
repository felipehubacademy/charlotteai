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
    supabase.from('charlotte_users').select('id, email, name, charlotte_level, is_institutional, is_active, subscription_status, subscription_product, subscription_expires_at, trial_ends_at, created_at, last_seen_at, last_practice_at, app_version, app_platform, avatar_url, marketing_opt_out').eq('id', userId).maybeSingle(),
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
