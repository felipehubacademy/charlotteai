// /api/cron/checkout-watch — vigia do checkout a cada 5 minutos (agendamento da Vercel, vercel.json).
// Alertas por e-mail (administradores) e WhatsApp (ALERT_WHATSAPP). Detalhes em lib/ops-monitor.
import { NextRequest, NextResponse } from 'next/server';
import { runCheckoutWatch } from '@/lib/ops-monitor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const cron = process.env.CRON_SECRET;
  const admin = process.env.ADMIN_SECRET;
  const ok = (cron && req.headers.get('authorization') === `Bearer ${cron}`) || (admin && req.headers.get('x-admin-secret') === admin);
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await runCheckoutWatch());
}
