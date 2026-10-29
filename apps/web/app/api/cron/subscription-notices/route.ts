// /api/cron/subscription-notices — aviso de fim do teste grátis da assinatura pelo site (e-mail + push),
// 2 dias antes da 1ª cobrança. Agendamento da Vercel (vercel.json), todo dia às 10h de Brasília.
import { NextRequest, NextResponse } from 'next/server';
import { sendTrialEndingNotices } from '@/lib/subscription-notices';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const cron = process.env.CRON_SECRET;
  const admin = process.env.ADMIN_SECRET;
  const ok = (cron && req.headers.get('authorization') === `Bearer ${cron}`) || (admin && req.headers.get('x-admin-secret') === admin);
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await sendTrialEndingNotices());
}
