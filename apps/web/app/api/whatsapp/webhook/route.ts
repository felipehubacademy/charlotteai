// /api/whatsapp/webhook — suporte pelo WhatsApp (Meta Cloud API).
//   GET  verificação do webhook (hub.mode / hub.verify_token / hub.challenge)
//   POST mensagens recebidas: responde 200 na hora e processa logo depois.
// Fluxo: IA responde o que está na FAQ; o resto vira ticket no /admin (sem e-mail na hora).
// Ticket com atendente não volta para a IA até ser encerrado.
import { NextRequest, NextResponse, after } from 'next/server';
import { parseWhatsAppWebhook, validWhatsAppSignature } from '@/lib/whatsapp';
import { handleWhatsAppMessage } from '@/lib/support-whatsapp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (p.get('hub.mode') === 'subscribe' && p.get('hub.verify_token') && p.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(p.get('hub.challenge') ?? '', { status: 200 });
  }
  return NextResponse.json({ error: 'forbidden' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!validWhatsAppSignature(raw, req.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }
  let body: unknown = null;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }
  const msgs = parseWhatsAppWebhook(body);
  if (msgs.length) after(async () => { for (const m of msgs) await handleWhatsAppMessage(m).catch(e => console.error('[whatsapp] handle', e)); });
  return NextResponse.json({ ok: true });
}
