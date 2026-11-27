// /api/cron/support-bounces — avisos de não entrega das respostas do suporte por e-mail.
// Lê os avisos da Microsoft (postmaster, "Não é possível entregar") nas caixas de envio e marca a resposta
// do atendente que voltou como "Não entregue", com alerta para a gestão (lib/support-delivery).
// Só consulta a Microsoft quando há respostas acompanhadas nos últimos 3 dias.
// GET/POST com Authorization: Bearer <CRON_SECRET> (agendamento da Vercel, vercel.json) ou x-admin-secret.
import { NextRequest, NextResponse } from 'next/server';
import { scanSupportBounces } from '@/lib/support-delivery';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const crons = [process.env.CRON_SECRET_TOKEN, process.env.CRON_SECRET].filter(Boolean);
  const admin = process.env.ADMIN_SECRET;
  return (!!bearer && crons.includes(bearer)) || (!!admin && req.headers.get('x-admin-secret') === admin);
}

export async function GET(req: NextRequest) { return POST(req); }

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await scanSupportBounces()) });
  } catch (e) {
    return NextResponse.json({ error: `Falha ao ler os avisos de não entrega: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
  }
}
