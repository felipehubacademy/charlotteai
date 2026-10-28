// lib/revenue.ts
// Receita automática: cada evento de dinheiro do RevenueCat (compra,
// renovação, pacote avulso, reembolso) vira um lançamento no Financeiro.
//
// Valores: o RevenueCat manda o preço na moeda da compra e as porcentagens de
// imposto e comissão da loja. Lançamos o valor LÍQUIDO estimado (o que a loja
// repassa): preço × (1 − imposto) × (1 − comissão). O bruto fica no evento.
// Idempotente por event.id (o webhook pode reenviar).

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { fxToBrl } from '@/lib/fx';
import { recordAffiliateCommission } from '@/lib/affiliates';

const MONEY_EVENTS = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'NON_RENEWING_PURCHASE', 'PRODUCT_CHANGE', 'TRIAL_CONVERTED']);
const REFUND_EVENTS = new Set(['REFUND']);

function storeLabel(store?: string): string {
  if (store === 'APP_STORE' || store === 'MAC_APP_STORE') return 'Assinaturas App Store';
  if (store === 'PLAY_STORE') return 'Assinaturas Google Play';
  if (store === 'ASAAS') return 'Assinaturas pelo site (Asaas)';
  return 'Outros';
}

function productLabel(productId?: string): string {
  const p = (productId ?? '').toLowerCase();
  if (p.includes('minutes10')) return 'Pacote 10 min Live Voice';
  if (p.includes('minutes30')) return 'Pacote 30 min Live Voice';
  if (p === 'web_annual_pix') return 'Plano anual (site, Pix)';
  if (p === 'web_annual_12x') return 'Plano anual (site, 12x)';
  if (p === 'web_annual') return 'Plano anual (site, cartão)';
  if (p === 'web_monthly') return 'Plano mensal (site, cartão)';
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
    const isSandbox = event?.environment === 'SANDBOX'; // compras de teste não entram no caixa

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
    // A Apple cobra a renovação (e a 1ª mensalidade depois do teste) horas antes do novo período e o
    // RevenueCat manda o início do período como purchased_at. Data no futuro = vale a hora em que o
    // evento chegou, que é quando o dinheiro foi cobrado.
    const eventAt = Number(event?.event_timestamp_ms ?? Date.now());
    const purchasedMs = Number(event?.purchased_at_ms ?? 0);
    const purchasedAt = new Date(purchasedMs && purchasedMs <= eventAt ? purchasedMs : eventAt);
    const day = purchasedAt.toISOString().slice(0, 10);

    // Teste (TestFlight / sandbox da Play): fora do caixa, mas a comissão de afiliado sai marcada
    // como teste (não entra no saldo) para dar para testar o fluxo de ponta a ponta.
    if (isSandbox) { await recordAffiliateCommission(event, netBrl, purchasedAt, true); return; }

    const supabase = getSupabaseAdmin();
    // Compra feita com conta interna da equipe (testes em produção): também fica fora do caixa.
    if (event?.app_user_id) {
      const { data: u } = await supabase.from('charlotte_users').select('email').eq('id', String(event.app_user_id)).maybeSingle();
      const email = String((u as { email?: string } | null)?.email ?? '').toLowerCase();
      if (/^felipe\.xavier1987\+/.test(email) || email.endsWith('@hubacademybr.com')) {
        await recordAffiliateCommission(event, netBrl, purchasedAt, true);
        return;
      }
    }

    const { data: existing } = await supabase.from('revenue_events').select('id').eq('event_id', eventId).maybeSingle();
    if (existing) return;

    const store = String(event?.store ?? '');
    const product = productLabel(event?.product_id);

    // Estorno de compra já lançada: a própria entrada fica "Estornado" (sai do caixa, mas segue
    // visível), em vez de uma saída separada que inflava entradas e saídas com o mesmo valor.
    if (isRefund && event?.transaction_id) {
      const { data: orig } = await supabase.from('revenue_events').select('finance_entry_id')
        .eq('raw->>transaction_id', String(event.transaction_id)).neq('event_type', 'REFUND')
        .not('finance_entry_id', 'is', null).limit(1).maybeSingle();
      const origId = (orig as { finance_entry_id: string } | null)?.finance_entry_id;
      const { data: origEntry } = origId
        ? await supabase.from('finance_entries').select('id, notes').eq('id', origId).eq('kind', 'income').maybeSingle()
        : { data: null };
      if (origEntry) {
        const e = origEntry as { id: string; notes: string | null };
        const when = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        await supabase.from('finance_entries').update({
          status: 'refunded', notes: `${e.notes ? `${e.notes} | ` : ''}Estornado em ${when}.`,
        } as never).eq('id', e.id);
        await supabase.from('revenue_events').insert({
          event_id: eventId, event_type: type, app_user_id: event?.app_user_id ?? null,
          product_id: event?.product_id ?? null, store, currency,
          price_purchased: pricePurchased, price_usd: Number(event?.price ?? 0) || null,
          tax_pct: tax, commission_pct: commission, gross_brl: grossBrl, net_brl: netBrl,
          purchased_at: purchasedAt.toISOString(), finance_entry_id: e.id, raw: event,
        } as never);
        // Estorno de Pix: devolvemos o valor cheio ao aluno, mas a taxa do Asaas cobrada no recebimento
        // não volta. Essa diferença (bruto − líquido) vira uma saída nossa.
        const pixFee = Math.round((grossBrl - netBrl) * 100) / 100;
        if (store === 'ASAAS' && String(event?.product_id ?? '').includes('pix') && pixFee > 0) {
          await supabase.from('finance_entries').insert({
            kind: 'expense', description: `Taxa do Pix não devolvida no estorno: ${product}`,
            category: 'Lojas e pagamentos', vendor: 'Asaas', amount: pixFee, currency: 'BRL', fx_rate: 1, amount_brl: pixFee,
            due_date: new Date().toISOString().slice(0, 10), paid_at: new Date().toISOString().slice(0, 10), status: 'paid', recurrence: 'none',
            notes: `Automático (Asaas). Estorno do Pix no valor cheio (${grossBrl.toFixed(2)} BRL); a taxa de recebimento não é devolvida.`,
          } as never);
        }
        await recordAffiliateCommission(event, netBrl, purchasedAt);
        return;
      }
    }

    const { data: entry } = await supabase.from('finance_entries').insert({
      kind: isRefund ? 'expense' : 'income',
      description: isRefund ? `Reembolso: ${product}` : `${product} (${type === 'RENEWAL' ? 'renovação' : 'nova compra'})`,
      category: isRefund ? 'Reembolsos e estornos' : storeLabel(store),
      vendor: store === 'PLAY_STORE' ? 'Google Play' : store === 'ASAAS' ? 'Asaas' : store ? 'App Store' : null,
      amount: Math.round(pricePurchased * (1 - tax) * (1 - commission) * 100) / 100,
      currency, fx_rate: fx, amount_brl: netBrl,
      due_date: day, paid_at: day, status: 'paid', recurrence: 'none',
      notes: `Automático (${store === 'ASAAS' ? 'Asaas' : 'RevenueCat'}). Bruto ${grossBrl.toFixed(2)} BRL; líquido estimado após imposto ${(tax * 100).toFixed(0)}% e ${store === 'ASAAS' ? 'taxa do Asaas' : 'comissão'} ${(commission * 100).toFixed(0)}%.`,
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

    // Afiliados: comissão (ou estorno) sobre o líquido desta compra.
    await recordAffiliateCommission(event, netBrl, purchasedAt);
  } catch (e) {
    console.warn('[revenue] failed to record event:', e);
  }
}
