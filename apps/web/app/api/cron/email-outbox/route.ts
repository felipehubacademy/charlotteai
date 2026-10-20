// /api/cron/email-outbox — reenvia os e-mails que falharam (lib/email-outbox).
// POST  header Authorization: Bearer <CRON_SECRET_TOKEN> ou x-admin-secret.
// Agendado a cada 5 minutos pelo GitHub Actions (.github/workflows/email-outbox.yml).
import { NextRequest, NextResponse } from 'next/server';
import { processOutbox } from '@/lib/email-outbox';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const preferredRegion = 'gru1';

function authorized(req: NextRequest): boolean {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const crons = [process.env.CRON_SECRET_TOKEN, process.env.CRON_SECRET].filter(Boolean);
  const admin = process.env.ADMIN_SECRET;
  return (!!bearer && crons.includes(bearer)) || (!!admin && req.headers.get('x-admin-secret') === admin);
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await processOutbox());
}
