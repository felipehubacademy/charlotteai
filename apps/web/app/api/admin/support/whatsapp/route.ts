export const dynamic = 'force-dynamic';

/**
 * app/api/admin/support/whatsapp/route.ts
 * Ativação do número de suporte no WhatsApp (Cloud API), usando o token que fica só na Vercel.
 * GET                                  situação do número e dos webhooks
 * POST { action: 'register', pin }     registra o número com o PIN de duas etapas (6 dígitos)
 *                                      e liga o app à conta para receber as mensagens
 * POST { action: 'subscribe' }         só liga o app à conta (webhooks)
 * Só administradores.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, audit } from '@/lib/admin-auth';
import { whatsappStatus, registerWhatsAppNumber, subscribeAppToWaba } from '@/lib/whatsapp';

export async function GET(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await whatsappStatus());
}

export async function POST(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  if (body.action === 'register') {
    const pin = String(body.pin ?? '');
    if (!/^\d{6}$/.test(pin)) return NextResponse.json({ error: 'O PIN precisa ter 6 números.' }, { status: 400 });
    const reg = await registerWhatsAppNumber(pin);
    if (!reg.ok) return NextResponse.json({ error: `A Meta recusou o registro: ${reg.error}` }, { status: 502 });
    const sub = await subscribeAppToWaba();
    await audit(admin, 'whatsapp_register', 'whatsapp', process.env.WHATSAPP_PHONE_NUMBER_ID ?? null, { subscribed: sub.ok });
    return NextResponse.json({ ok: true, subscribed: sub.ok, subscribeError: sub.ok ? null : sub.error, status: await whatsappStatus() });
  }

  if (body.action === 'subscribe') {
    const sub = await subscribeAppToWaba();
    if (!sub.ok) return NextResponse.json({ error: sub.error }, { status: 502 });
    await audit(admin, 'whatsapp_subscribe', 'whatsapp', null);
    return NextResponse.json({ ok: true, status: await whatsappStatus() });
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}
