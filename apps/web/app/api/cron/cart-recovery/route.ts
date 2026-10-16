// /api/cron/cart-recovery — lembretes de carrinho abandonado (lib/cart-recovery).
// POST { dryRun?: true }   header Authorization: Bearer <CRON_SECRET> ou x-admin-secret.
// Agendado de hora em hora pelo GitHub Actions (.github/workflows/cart-recovery.yml).
import { NextRequest, NextResponse } from 'next/server';
import { runCartRecovery } from '@/lib/cart-recovery';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function authorized(req: NextRequest): boolean {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const cron = process.env.CRON_SECRET, admin = process.env.ADMIN_SECRET;
  return (!!cron && bearer === cron) || (!!admin && req.headers.get('x-admin-secret') === admin);
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  return NextResponse.json(await runCartRecovery({ dryRun: body?.dryRun === true }));
}
