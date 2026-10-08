// lib/revenue.ts
// Receita automática: cada evento de dinheiro do RevenueCat (compra,
// renovação, pacote avulso, reembolso) vira um lançamento no Financeiro.
//
// Valores: o RevenueCat manda o preço na moeda da compra e as porcentagens de
// imposto e comissão da loja. Lançamos o valor LÍQUIDO estimado (o que a loja
// repassa): preço × (1 − imposto) × (1 − comissão). O bruto fica no evento.
// Idempotente por event.id (o webhook pode reenviar).

import { getSupabaseAdmin } from '@/lib/supabase-admin';

const MONEY_EVENTS = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'NON_RENEWING_PURCHASE', 'PRODUCT_CHANGE', 'TRIAL_CONVERTED']);
const REFUND_EVENTS = new Set(['REFUND']);

async function fxToBrl(currency: string): Promise<number> {
  if (!currency || currency === 'BRL') return 1;
  try {
    const r = await fetch(`https://economia.awesomeapi.com.br/json/last/${currency}-BRL`, { cache: 'no-store' });
    const j = await r.json();
    const rate = Number(j?.[`${currency}BRL`]?.bid);
    return Number.isFinite(rate) && rate > 0 ? rate : 0;
  } catch {
    return 0;
  }
}

function storeLabel(store?: string): string {
  if (store === 'APP_STORE' || store === 'MAC_APP_STORE') return 'Assinaturas App Store';
  if (store === 'PLAY_STORE') return 'Assinaturas Google Play';
  return 'Outros';
}

function productLabel(productId?: string): string {
  const p = (productId ?? '').toLowerCase();
  if (p.includes('minutes10')) return 'Pacote 10 min Live Voice';
  if (p.includes('minutes30')) return 'Pacote 30 min Live Voice';
  if (p.includes('year') || p.includes('annual')) return 'Plano anual';
  if (p.includes('month')) return 'Plano mensal';
  return productId || 'Assinatura';
}

/** Registra o evento e cria o lançamento. Nunca lança exceção. */
export async function recordRevenueEvent(event: Record<string, any>): Promise<void> {
  try {
    const type = String(event?.type ?? '');
    const isRefund = REFUND_EVENTS.has(type);
    if (!MONEY_EVENTS.has(type) && !isRefund) return;
    if (event?.environment === 'SANDBOX') return; // compras de teste não entram no caixa

    const eventId = String(event?.id ?? '');
    if (!eventId) return;

    const currency = String(event?.currency ?? 'BRL').toUpperCase();
    const pricePurchased = Math.abs(Number(event?.price_in_purchased_currency ?? 0));
    if (!pricePurchased) return;

    const tax = Number(event?.tax_percentage ?? 0) || 0;
    const commission = Number(event?.commission_percentage ?? (event?.takehome_percentage != null ? 1 - Number(event.takehome_percentage) : 0)) || 0;
    const fx = await fxToBrl(currency);
    if (!fx) return;

    const grossBrl = Math.round(pricePurchased * fx * 100) / 100;
    const netBrl = Math.round(pricePurchased * (1 - tax) * (1 - commission) * fx * 100) / 100;
    const purchasedAt = event?.purchased_at_ms ? new Date(Number(event.purchased_at_ms)) : new Date(Number(event?.event_timestamp_ms ?? Date.now()));
    const day = purchasedAt.toISOString().slice(0, 10);

    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase.from('revenue_events').select('id').eq('event_id', eventId).maybeSingle();
    if (existing) return;

    const store = String(event?.store ?? '');
    const product = productLabel(event?.product_id);
    const { data: entry } = await supabase.from('finance_entries').insert({
      kind: isRefund ? 'expense' : 'income',
      description: isRefund ? `Reembolso: ${product}` : `${product} (${type === 'RENEWAL' ? 'renovação' : 'nova compra'})`,
      category: isRefund ? 'Reembolsos e estornos' : storeLabel(store),
      vendor: store === 'PLAY_STORE' ? 'Google Play' : store ? 'App Store' : null,
      amount: Math.round(pricePurchased * (1 - tax) * (1 - commission) * 100) / 100,
      currency, fx_rate: fx, amount_brl: netBrl,
      due_date: day, paid_at: day, status: 'paid', recurrence: 'none',
      notes: `Automático (RevenueCat). Bruto ${grossBrl.toFixed(2)} BRL; líquido estimado após imposto ${(tax * 100).toFixed(0)}% e comissão ${(commission * 100).toFixed(0)}%.`,
    } as never).select('id').single();

    await supabase.from('revenue_events').insert({
      event_id: eventId, event_type: type, app_user_id: event?.app_user_id ?? null,
      product_id: event?.product_id ?? null, store, currency,
      price_purchased: pricePurchased, price_usd: Number(event?.price ?? 0) || null,
      tax_pct: tax, commission_pct: commission, gross_brl: grossBrl, net_brl: netBrl,
      purchased_at: purchasedAt.toISOString(),
      finance_entry_id: (entry as { id: string } | null)?.id ?? null,
      raw: event,
    } as never);
  } catch (e) {
    console.warn('[revenue] failed to record event:', e);
  }
}
