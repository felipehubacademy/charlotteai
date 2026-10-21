// /api/admin/learning/reports — reportes dos alunos pela bandeira dos exercícios. Nível Professor e acima.
//   GET  ?days=30&status=open      lista (mais novos primeiro)
//   POST { id, status: 'open' | 'fixed' | 'dismissed' }   marca como resolvido / descartado / reabre
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { listReports } from '@/lib/exercise-reports';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, 'learning');
  if (admin instanceof NextResponse) return admin;
  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 30));
  const status = req.nextUrl.searchParams.get('status') || undefined;
  return NextResponse.json({ reports: await listReports({ days, status }) });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, 'learning');
  if (admin instanceof NextResponse) return admin;
  const body = await req.json().catch(() => ({}));
  const status = body?.status as string;
  if (!body?.id || !['open', 'fixed', 'dismissed'].includes(status)) return NextResponse.json({ error: 'dados inválidos' }, { status: 400 });
  const { error } = await getSupabaseAdmin().from('exercise_reports').update({
    status, resolved_at: status === 'open' ? null : new Date().toISOString(),
    resolved_by: status === 'open' ? null : ((admin as { email?: string }).email ?? null),
  } as never).eq('id', body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
