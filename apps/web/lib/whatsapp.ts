// lib/whatsapp.ts — WhatsApp Cloud API (Meta) do suporte. Server-only.
// Variáveis (Vercel): WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN (permanente, de usuário do sistema),
// WHATSAPP_APP_SECRET (assina o webhook) e WHATSAPP_VERIFY_TOKEN (texto livre, o mesmo cadastrado na Meta).
import crypto from 'crypto';

const GRAPH = 'https://graph.facebook.com/v21.0';

export const whatsappConfigured = () =>
  !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_APP_SECRET);

/** Confere a assinatura X-Hub-Signature-256 do webhook (HMAC-SHA256 do corpo cru com o app secret). */
export function validWhatsAppSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const got = header.slice(7);
  return got.length === expected.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

/** Envia texto livre. Só funciona até 24 h depois da última mensagem do aluno (regra da Meta). */
export async function sendWhatsAppText(to: string, text: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!id || !token) return { ok: false, error: 'WhatsApp não configurado' };
  try {
    const r = await fetch(`${GRAPH}/${id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text.slice(0, 4000), preview_url: false } }),
    });
    const j = await r.json().catch(() => ({})) as { messages?: { id: string }[]; error?: { message?: string; code?: number } };
    if (!r.ok) return { ok: false, error: j.error?.code === 131047 ? 'Passou de 24 h desde a última mensagem do aluno' : (j.error?.message ?? `HTTP ${r.status}`) };
    return { ok: true, id: j.messages?.[0]?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'falha de rede' };
  }
}

/** Marca a mensagem recebida como lida (os dois tiques azuis). */
export async function markWhatsAppRead(messageId: string): Promise<void> {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!id || !token) return;
  await fetch(`${GRAPH}/${id}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId }),
  }).catch(() => {});
}

export interface IncomingWhatsApp { id: string; from: string; name: string | null; text: string | null; type: string; timestamp: number }

/** Extrai as mensagens do payload do webhook (ignora status de entrega). */
export function parseWhatsAppWebhook(body: unknown): IncomingWhatsApp[] {
  const out: IncomingWhatsApp[] = [];
  const entries = (body as { entry?: { changes?: { value?: Record<string, unknown> }[] }[] })?.entry ?? [];
  for (const e of entries) for (const c of e.changes ?? []) {
    const v = c.value as { messages?: Record<string, unknown>[]; contacts?: { wa_id?: string; profile?: { name?: string } }[] } | undefined;
    const names = new Map((v?.contacts ?? []).map(k => [k.wa_id ?? '', k.profile?.name ?? null]));
    for (const m of v?.messages ?? []) {
      const type = String(m.type ?? '');
      const text = type === 'text' ? String((m.text as { body?: string })?.body ?? '')
        : type === 'button' ? String((m.button as { text?: string })?.text ?? '')
        : type === 'interactive' ? String(((m.interactive as { button_reply?: { title?: string }; list_reply?: { title?: string } })?.button_reply?.title)
            ?? ((m.interactive as { list_reply?: { title?: string } })?.list_reply?.title) ?? '')
        : null;
      out.push({ id: String(m.id), from: String(m.from), name: names.get(String(m.from)) ?? null, text: text || null, type, timestamp: Number(m.timestamp ?? 0) * 1000 });
    }
  }
  return out;
}
