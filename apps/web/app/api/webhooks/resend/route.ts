// /api/webhooks/resend — devoluções dos e-mails que saíram pelo serviço reserva (Resend).
// Hoje só acompanha as respostas do suporte: se a resposta saiu pelo reserva e voltou (email.bounced)
// ou o reserva desistiu de entregar (email.failed), a mensagem vira "Não entregue" no /admin e a
// gestão recebe um alerta (lib/support-delivery). Outros e-mails e eventos são ignorados.
//
// Configurar no Resend: Webhooks > Add endpoint, URL https://queizy.com/api/webhooks/resend,
// eventos email.bounced e email.failed; copiar o "Signing secret" (whsec_...) para a env
// RESEND_WEBHOOK_SECRET na Vercel. Sem a env, a rota recusa tudo (503) e não mexe em nada.
//
// Assinatura no padrão Svix: HMAC-SHA256 de "<svix-id>.<svix-timestamp>.<corpo>" com a chave em
// base64 depois de "whsec_", comparada com cada "v1,<assinatura>" do cabeçalho svix-signature.
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { markSupportReplyBounced } from '@/lib/support-delivery';

export const dynamic = 'force-dynamic';

const TOLERANCE_S = 5 * 60;

function verify(secret: string, id: string, ts: string, body: string, header: string): boolean {
  const t = Number(ts);
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > TOLERANCE_S) return false;
  const key = Buffer.from(secret.startsWith('whsec_') ? secret.slice(6) : secret, 'base64');
  const expected = crypto.createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest();
  return header.split(' ').some(part => {
    const [version, sig] = part.split(',');
    if (version !== 'v1' || !sig) return false;
    const got = Buffer.from(sig, 'base64');
    return got.length === expected.length && crypto.timingSafeEqual(got, expected);
  });
}

type ResendEvent = {
  type?: string;
  created_at?: string;
  data?: { email_id?: string; to?: string[]; subject?: string; bounce?: { message?: string; type?: string; subType?: string }; failed?: { reason?: string } };
};

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Webhook não configurado' }, { status: 503 });

  const raw = await req.text();
  const id = req.headers.get('svix-id') ?? '';
  const ts = req.headers.get('svix-timestamp') ?? '';
  const sig = req.headers.get('svix-signature') ?? '';
  if (!id || !ts || !sig || !verify(secret, id, ts, raw, sig)) return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 });

  let ev: ResendEvent;
  try { ev = JSON.parse(raw) as ResendEvent; } catch { return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 }); }
  if (ev.type !== 'email.bounced' && ev.type !== 'email.failed') return NextResponse.json({ ok: true, ignored: ev.type ?? null });
  const emailId = ev.data?.email_id;
  if (!emailId) return NextResponse.json({ ok: true, ignored: 'sem email_id' });

  // Só respostas do suporte (as únicas que guardam o id do reserva).
  const { data } = await getSupabaseAdmin().from('support_messages').select('id')
    .eq('delivery_provider', 'resend').eq('delivery_provider_id', emailId).limit(1);
  const msg = (data ?? [])[0] as { id: string } | undefined;
  if (!msg) return NextResponse.json({ ok: true, matched: false });

  const b = ev.data?.bounce;
  const reason = ev.type === 'email.bounced'
    ? `Devolvido${b?.type ? ` (${[b.type, b.subType].filter(Boolean).join(', ')})` : ''}: ${b?.message ?? 'o servidor do destinatário recusou o e-mail'}`
    : `O serviço reserva não conseguiu entregar: ${ev.data?.failed?.reason ?? 'motivo não informado'}`;
  const marked = await markSupportReplyBounced(msg.id, reason, ev.created_at ?? new Date().toISOString());
  return NextResponse.json({ ok: true, matched: true, marked });
}
