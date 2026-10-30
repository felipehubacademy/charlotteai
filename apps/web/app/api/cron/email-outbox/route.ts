// /api/cron/email-outbox — reenvia os e-mails que falharam (lib/email-outbox) e manda o "conta criada"
// de quem acabou de se cadastrar (lib/signup-welcome).
// POST  header Authorization: Bearer <CRON_SECRET_TOKEN> ou x-admin-secret.
// Agendado a cada 5 minutos pelo cron da Vercel (vercel.json, GET com CRON_SECRET); o do GitHub Actions atrasava horas.
import { NextRequest, NextResponse } from 'next/server';
import { processOutbox } from '@/lib/email-outbox';
import { sendSignupWelcomes } from '@/lib/signup-welcome';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const preferredRegion = 'gru1';

function authorized(req: NextRequest): boolean {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const crons = [process.env.CRON_SECRET_TOKEN, process.env.CRON_SECRET].filter(Boolean);
  const admin = process.env.ADMIN_SECRET;
  return (!!bearer && crons.includes(bearer)) || (!!admin && req.headers.get('x-admin-secret') === admin);
}

export async function GET(req: NextRequest) { return POST(req); }

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const outbox = await processOutbox();
  const signupWelcome = await sendSignupWelcomes().catch(e => ({ error: String(e) }));
  return NextResponse.json({ ...outbox, signupWelcome });
}
