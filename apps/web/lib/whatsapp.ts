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

// ── Ativação do número (usada pelo /admin → Suporte → WhatsApp) ─────────────
// Conta do WhatsApp (WABA) do Queizy: "Charllot - Hub Academy".
export const WHATSAPP_WABA_ID = process.env.WHATSAPP_WABA_ID || '275286372330713';

async function graph(path: string, init?: { method?: string; body?: unknown }) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) return { ok: false, status: 0, json: { error: { message: 'WHATSAPP_ACCESS_TOKEN ausente' } } as Record<string, any> };
  const r = await fetch(`${GRAPH}/${path}`, {
    method: init?.method ?? 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const json = await r.json().catch(() => ({})) as Record<string, any>;
  return { ok: r.ok, status: r.status, json };
}

/** Situação do número na Meta (nome, verificação, status, qualidade) e se o app recebe os webhooks da conta. */
export async function whatsappStatus() {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!id) return { configured: false as const };
  const [phone, apps] = await Promise.all([
    graph(`${id}?fields=display_phone_number,verified_name,name_status,code_verification_status,status,quality_rating,platform_type,messaging_limit_tier`),
    graph(`${WHATSAPP_WABA_ID}/subscribed_apps`),
  ]);
  return {
    configured: true as const,
    phone: phone.ok ? phone.json : null,
    phoneError: phone.ok ? null : phone.json?.error?.message ?? `HTTP ${phone.status}`,
    subscribedApps: apps.ok ? ((apps.json.data ?? []) as { whatsapp_business_api_data?: { name?: string } }[]).map(a => a.whatsapp_business_api_data?.name ?? '?') : null,
    appsError: apps.ok ? null : apps.json?.error?.message ?? `HTTP ${apps.status}`,
  };
}

/** Registra o número na Cloud API com o PIN de verificação em duas etapas (6 dígitos). */
export async function registerWhatsAppNumber(pin: string) {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!id) return { ok: false, error: 'WHATSAPP_PHONE_NUMBER_ID ausente' };
  const r = await graph(`${id}/register`, { method: 'POST', body: { messaging_product: 'whatsapp', pin } });
  return r.ok ? { ok: true } : { ok: false, error: r.json?.error?.error_user_msg ?? r.json?.error?.message ?? `HTTP ${r.status}` };
}

/** Liga o app à conta do WhatsApp para os webhooks de mensagens chegarem. */
export async function subscribeAppToWaba() {
  const r = await graph(`${WHATSAPP_WABA_ID}/subscribed_apps`, { method: 'POST' });
  return r.ok ? { ok: true } : { ok: false, error: r.json?.error?.message ?? `HTTP ${r.status}` };
}

// ── Alertas internos (vigia do checkout) ─────────────────────────────────────────
// Fora da janela de 24 h, a Meta só deixa mandar modelo aprovado. Modelo "alerta_checkout" (Utilidade, pt_BR):
// "Alerta do checkout do Queizy: {{1}}".
export const ALERT_TEMPLATE = 'alerta_checkout';

export async function createAlertTemplate() {
  const r = await graph(`${WHATSAPP_WABA_ID}/message_templates`, {
    method: 'POST',
    body: {
      name: ALERT_TEMPLATE, language: 'pt_BR', category: 'UTILITY',
      components: [{ type: 'BODY', text: 'Alerta do checkout do Queizy: {{1}}. Detalhes no e-mail e no /admin, aba Saúde do checkout.', example: { body_text: [['3 erros no checkout nos últimos 10 min']] } }],
    },
  });
  return r.ok ? { ok: true, id: r.json.id, status: r.json.status } : { ok: false, error: r.json?.error?.error_user_msg ?? r.json?.error?.message ?? `HTTP ${r.status}` };
}

export async function alertTemplateStatus() {
  const r = await graph(`${WHATSAPP_WABA_ID}/message_templates?name=${ALERT_TEMPLATE}&fields=name,status,language`);
  return r.ok ? (r.json.data ?? []) : { error: r.json?.error?.message ?? `HTTP ${r.status}` };
}

/** Manda o modelo de alerta (vale fora da janela de 24 h, depois de aprovado). */
export async function sendAlertTemplate(to: string, summary: string): Promise<{ ok: boolean; error?: string }> {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!id) return { ok: false, error: 'WhatsApp não configurado' };
  const r = await graph(`${id}/messages`, {
    method: 'POST',
    body: {
      messaging_product: 'whatsapp', to, type: 'template',
      template: { name: ALERT_TEMPLATE, language: { code: 'pt_BR' }, components: [{ type: 'body', parameters: [{ type: 'text', text: summary.replace(/\s+/g, ' ').slice(0, 900) }] }] },
    },
  });
  return r.ok ? { ok: true } : { ok: false, error: r.json?.error?.message ?? `HTTP ${r.status}` };
}
