// /api/cron/cart-recovery — lembretes de carrinho abandonado (lib/cart-recovery).
// POST { dryRun?: true, onlyEmail?: 'x@y' }  (onlyEmail: teste só com essa conta)   header Authorization: Bearer <CRON_SECRET_TOKEN> ou x-admin-secret.
// Agendado de hora em hora pelo GitHub Actions (.github/workflows/cart-recovery.yml).
import { NextRequest, NextResponse } from 'next/server';
import { runCartRecovery } from '@/lib/cart-recovery';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function authorized(req: NextRequest): boolean {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  // O GitHub manda secrets.CRON_SECRET_TOKEN (mesmo nome dos outros crons); CRON_SECRET fica como alternativa.
  const crons = [process.env.CRON_SECRET_TOKEN, process.env.CRON_SECRET].filter(Boolean);
  const admin = process.env.ADMIN_SECRET;
  return (!!bearer && crons.includes(bearer)) || (!!admin && req.headers.get('x-admin-secret') === admin);
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  return NextResponse.json(await runCartRecovery({ dryRun: body?.dryRun === true, onlyEmail: typeof body?.onlyEmail === 'string' ? body.onlyEmail : null }));
}
