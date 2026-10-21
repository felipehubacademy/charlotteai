// /api/cron/checkout-watch — vigia do checkout a cada 5 minutos (agendamento da Vercel, vercel.json).
// Alertas por e-mail (administradores) e WhatsApp (ALERT_WHATSAPP). Detalhes em lib/ops-monitor.
import { NextRequest, NextResponse } from 'next/server';
import { runCheckoutWatch } from '@/lib/ops-monitor';
import { whatsappStatus, createAlertTemplate, alertTemplateStatus, sendWhatsAppText, sendAlertTemplate } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const cron = process.env.CRON_SECRET;
  const admin = process.env.ADMIN_SECRET;
  const ok = (cron && req.headers.get('authorization') === `Bearer ${cron}`) || (admin && req.headers.get('x-admin-secret') === admin);
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Admin: situação do WhatsApp e do modelo de alerta.
  if (req.nextUrl.searchParams.get('wa') === 'status') {
    return NextResponse.json({ whatsapp: await whatsappStatus(), template: await alertTemplateStatus(), to: process.env.ALERT_WHATSAPP ?? null });
  }
  return NextResponse.json(await runCheckoutWatch());
}

// Admin (x-admin-secret): { action: 'create-template' } cria o modelo na Meta; { action: 'test' } manda um alerta de teste.
export async function POST(req: NextRequest) {
  const admin = process.env.ADMIN_SECRET;
  if (!admin || req.headers.get('x-admin-secret') !== admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.action === 'create-template') return NextResponse.json(await createAlertTemplate());
  if (body.action === 'test') {
    const to = process.env.ALERT_WHATSAPP;
    if (!to) return NextResponse.json({ error: 'ALERT_WHATSAPP ausente' }, { status: 400 });
    const text = await sendWhatsAppText(to, 'Queizy: teste do alerta do checkout. Se chegou, o WhatsApp do vigia está funcionando.');
    const tpl = text.ok ? null : await sendAlertTemplate(to, 'teste do vigia, está tudo certo');
    return NextResponse.json({ text, template: tpl });
  }
  return NextResponse.json({ error: 'ação desconhecida' }, { status: 400 });
}
