// /api/admin/moderation — denúncias entre alunos e suspensão do social (Guideline 1.2).
//   GET                                          denúncias (abertas primeiro) e suspensos
//   POST { action: 'resolve', id, resolution }   marca a denúncia como resolvida
//   POST { action: 'reopen', id }                volta a denúncia para aberta
//   POST { action: 'suspend', userId, reason }   tira o aluno do social (busca, amigos, competições)
//   POST { action: 'unsuspend', userId }         devolve o aluno ao social
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin, audit } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

type Report = { id: number; reporter_id: string; reported_id: string; reason: string; context: string | null; handled: boolean; created_at: string; resolved_at: string | null; resolved_by: string | null; resolution: string | null };
type Person = { id: string; name: string | null; username: string | null; email: string; avatar_url: string | null };

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, 'support');
  if (admin instanceof NextResponse) return admin;
  const supabase = getSupabaseAdmin();

  const [repR, susR] = await Promise.all([
    supabase.from('user_reports').select('*').order('handled').order('created_at', { ascending: false }).limit(300),
    supabase.from('social_suspensions').select('user_id, reason, created_by, created_at').order('created_at', { ascending: false }),
  ]);
  const reports = (repR.data ?? []) as Report[];
  const suspensions = (susR.data ?? []) as { user_id: string; reason: string | null; created_by: string | null; created_at: string }[];

  const ids = [...new Set([...reports.flatMap(r => [r.reporter_id, r.reported_id]), ...suspensions.map(s => s.user_id)])];
  const [peopleR, blocksR] = await Promise.all([
    ids.length ? supabase.from('charlotte_users').select('id, name, username, email, avatar_url').in('id', ids) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from('user_blocks').select('blocked_id').in('blocked_id', ids) : Promise.resolve({ data: [] }),
  ]);
  const people = new Map(((peopleR.data ?? []) as Person[]).map(p => [p.id, p]));
  const blockedCount = new Map<string, number>();
  for (const b of (blocksR.data ?? []) as { blocked_id: string }[]) blockedCount.set(b.blocked_id, (blockedCount.get(b.blocked_id) ?? 0) + 1);
  const reportCount = new Map<string, number>();
  for (const r of reports) reportCount.set(r.reported_id, (reportCount.get(r.reported_id) ?? 0) + 1);
  const suspended = new Set(suspensions.map(s => s.user_id));
  const who = (id: string) => {
    const p = people.get(id);
    return { id, name: p?.name ?? null, username: p?.username ?? null, email: p?.email ?? null, avatarUrl: p?.avatar_url ?? null };
  };

  return NextResponse.json({
    reports: reports.map(r => ({
      id: r.id, reason: r.reason, context: r.context, createdAt: r.created_at,
      handled: r.handled, resolvedAt: r.resolved_at, resolvedBy: r.resolved_by, resolution: r.resolution,
      reporter: who(r.reporter_id),
      reported: { ...who(r.reported_id), reports: reportCount.get(r.reported_id) ?? 0, blockedBy: blockedCount.get(r.reported_id) ?? 0, suspended: suspended.has(r.reported_id) },
    })),
    suspensions: suspensions.map(s => ({ ...who(s.user_id), reason: s.reason, by: s.created_by, at: s.created_at })),
    open: reports.filter(r => !r.handled).length,
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, 'support');
  if (admin instanceof NextResponse) return admin;
  const supabase = getSupabaseAdmin();
  const body = await req.json().catch(() => ({}));
  const by = admin.email ?? admin.name ?? 'admin';

  if (body.action === 'resolve' || body.action === 'reopen') {
    const id = Number(body.id);
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
    const patch = body.action === 'resolve'
      ? { handled: true, resolved_at: new Date().toISOString(), resolved_by: by, resolution: String(body.resolution ?? '').slice(0, 500) || null }
      : { handled: false, resolved_at: null, resolved_by: null, resolution: null };
    const { error } = await supabase.from('user_reports').update(patch as never).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await audit(admin, `moderation.${body.action}`, 'user_report', String(id), body.action === 'resolve' ? { resolution: patch.resolution } : undefined);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'suspend' || body.action === 'unsuspend') {
    const userId = String(body.userId ?? '');
    if (!userId) return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 });
    const { error } = body.action === 'suspend'
      ? await supabase.from('social_suspensions').upsert({ user_id: userId, reason: String(body.reason ?? '').slice(0, 300) || null, created_by: by } as never)
      : await supabase.from('social_suspensions').delete().eq('user_id', userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await audit(admin, `moderation.${body.action}`, 'user', userId, body.action === 'suspend' ? { reason: body.reason ?? null } : undefined);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'ação inválida' }, { status: 400 });
}
