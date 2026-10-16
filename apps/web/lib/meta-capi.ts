// lib/meta-capi.ts — API de Conversões da Meta (servidor): a conversão chega mesmo quando o
// navegador bloqueia o pixel. Só para checkouts com aceite de cookies (meta_tracking.consent).
// Mesmo event_id do pixel no navegador: a Meta junta os dois e não conta em dobro.
// Precisa de META_CAPI_TOKEN (Gestor de Eventos > Pixel Queizy > Definições > API de Conversões);
// sem ele, não envia nada.
import { createHash } from 'crypto';
import { META_PIXEL_ID } from '@/lib/meta-pixel';

export type MetaTracking = { consent?: boolean; fbp?: string | null; fbc?: string | null; ip?: string | null; ua?: string | null; url?: string | null };

const sha = (v: string) => createHash('sha256').update(v.trim().toLowerCase()).digest('hex');

export async function sendCapiEvent(input: {
  event: 'StartTrial' | 'Purchase' | 'InitiateCheckout';
  eventId: string; email?: string | null; userId?: string | null;
  value?: number; currency?: string; tracking?: MetaTracking | null;
}): Promise<boolean> {
  const token = process.env.META_CAPI_TOKEN;
  if (!token || !input.tracking?.consent) return false;
  const t = input.tracking;
  const body = {
    data: [{
      event_name: input.event,
      event_time: Math.floor(Date.now() / 1000),
      event_id: input.eventId,
      action_source: 'website',
      event_source_url: t.url ?? 'https://queizy.com/assinar',
      user_data: {
        ...(input.email ? { em: [sha(input.email)] } : {}),
        ...(input.userId ? { external_id: [sha(input.userId)] } : {}),
        ...(t.fbp ? { fbp: t.fbp } : {}), ...(t.fbc ? { fbc: t.fbc } : {}),
        ...(t.ip ? { client_ip_address: t.ip } : {}), ...(t.ua ? { client_user_agent: t.ua } : {}),
      },
      custom_data: input.value != null ? { value: input.value, currency: input.currency ?? 'BRL' } : undefined,
    }],
  };
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!r.ok) console.warn('[meta-capi]', input.event, r.status, (await r.text()).slice(0, 300));
    return r.ok;
  } catch (e) {
    console.warn('[meta-capi] falhou:', e);
    return false;
  }
}
