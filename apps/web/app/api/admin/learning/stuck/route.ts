// /api/admin/learning/stuck?days=7 — "Onde os alunos travam" (lib/learn-stuck). Nível Professor e acima.
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { stuckReport } from '@/lib/learn-stuck';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, 'learning');
  if (admin instanceof NextResponse) return admin;
  const days = Math.min(90, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 7));
  try {
    return NextResponse.json(await stuckReport(days));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'erro' }, { status: 500 });
  }
}
