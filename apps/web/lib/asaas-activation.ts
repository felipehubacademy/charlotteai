// lib/asaas-activation.ts — o que acontece quando uma assinatura do site começa ou é paga. Usado pelo
// webhook do Asaas e pelo checkout próprio (que confirma na hora, sem esperar o webhook).
//
//   activateTrial      cartão validado e assinatura com teste grátis: acesso até o fim do teste,
//                      e-mail de boas-vindas e conversão StartTrial
//   handlePaymentPaid  cobrança confirmada: acesso pelo período, receita no Financeiro, comissão do
//                      afiliado, conversão Purchase (1ª cobrança) e boas-vindas (compra sem teste)
//
// Compra de teste (sandbox) libera o acesso e manda o e-mail, mas não vira receita, comissão nem conversão.
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { recordRevenueEvent } from '@/lib/revenue';
import { paidPaymentsOf, updateSubscriptionValue, WEB_PRODUCT, WEB_ANNUAL_PIX, type WebPlan, type AsaasPayment } from '@/lib/asaas';
import { sendWebWelcome } from '@/lib/web-welcome';
import { sendCapiEvent, type MetaTracking } from '@/lib/meta-capi';

const DAY = 86400000;
const GRACE_DAYS = 3; // tolerância para a cobrança do cartão ser aprovada no dia

export type CheckoutRow = {
  id: string; user_id: string; plan: WebPlan; method: string | null; trial_days: number; asaas_payment_id?: string | null;
  status: string; asaas_customer_id: string | null; asaas_subscription_id: string | null; sandbox?: boolean | null;
};

function addMonths(d: Date, n: number): Date {
  const r = new Date(d); r.setMonth(r.getMonth() + n); return r;
}

export async function grantAccess(userId: string, plan: WebPlan, until: Date, method?: string | null): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: cur } = await supabase.from('charlotte_users').select('subscription_expires_at').eq('id', userId).maybeSingle();
  const prev = (cur as { subscription_expires_at: string | null } | null)?.subscription_expires_at;
  const expires = prev && new Date(prev).getTime() > until.getTime() ? new Date(prev) : until; // nunca encurta
  const { error } = await supabase.from('charlotte_users').update({
    subscription_status: 'active', is_active: true, subscription_product: method === 'annual_pix' ? WEB_ANNUAL_PIX : WEB_PRODUCT[plan],
    subscription_expires_at: expires.toISOString(), updated_at: new Date().toISOString(),
  } as never).eq('id', userId);
  // Falha aqui é grave (pagou e não ganhou acesso): lança para o Asaas reenviar o evento.
  if (error) throw new Error(`grantAccess falhou: ${error.message}`);
}

// Conversão para a Meta pelo servidor (só com aceite de cookies no checkout). Mesmo event_id do
// pixel da tela de sucesso: ck_<checkout>_start (teste grátis) e ck_<checkout>_purchase (1ª cobrança).
async function metaConversion(row: CheckoutRow, event: 'StartTrial' | 'Purchase', value?: number): Promise<void> {
  if (row.sandbox) return;
  const supabase = getSupabaseAdmin();
  const [{ data: ck }, { data: u }] = await Promise.all([
    supabase.from('asaas_checkouts').select('meta_tracking').eq('id', row.id).maybeSingle(),
    supabase.from('charlotte_users').select('email').eq('id', row.user_id).maybeSingle(),
  ]);
  await sendCapiEvent({
    event, eventId: `ck_${row.id}_${event === 'StartTrial' ? 'start' : 'purchase'}`,
    email: (u as { email: string | null } | null)?.email ?? null, userId: row.user_id,
    value, currency: 'BRL', tracking: (ck as { meta_tracking: MetaTracking | null } | null)?.meta_tracking ?? null,
  }).catch(() => false);
}

export async function recordAsaasRevenue(type: 'INITIAL_PURCHASE' | 'RENEWAL' | 'REFUND', row: CheckoutRow, p: AsaasPayment): Promise<void> {
  const value = Math.abs(Number(p.value) || 0);
  if (!value) return;
  const net = p.netValue != null ? Math.abs(Number(p.netValue)) : value;
  const at = new Date(p.confirmedDate || p.paymentDate || Date.now());
  // Mesmo formato do evento do RevenueCat: reaproveita Financeiro + comissão de afiliado.
  await recordRevenueEvent({
    type, id: `asaas_${type}_${p.id}`, app_user_id: row.user_id, store: 'ASAAS',
    // product_id com a forma de pagamento (web_monthly, web_annual, web_annual_pix, web_annual_12x): o Financeiro separa por ela.
    product_id: row.method && row.method !== row.plan ? `web_${row.method}` : WEB_PRODUCT[row.plan], currency: 'BRL', price_in_purchased_currency: value,
    tax_percentage: 0, commission_percentage: value > 0 ? Math.max(0, (value - net) / value) : 0,
    purchased_at_ms: at.getTime(), transaction_id: p.id,
    environment: row.sandbox || process.env.ASAAS_ENV === 'sandbox' ? 'SANDBOX' : 'PRODUCTION',
  });
}

async function restorePriceIfCouponEnded(checkoutId: string, subscriptionId: string) {
  const supabase = getSupabaseAdmin();
  try {
    const { data } = await supabase.from('asaas_checkouts').select('coupon_cycles, full_value_brl, price_restored_at').eq('id', checkoutId).maybeSingle();
    const ck = data as { coupon_cycles: number | null; full_value_brl: number | null; price_restored_at: string | null } | null;
    if (!ck?.coupon_cycles || !ck.full_value_brl || ck.price_restored_at) return;
    const paid = await paidPaymentsOf(subscriptionId);
    if (paid < ck.coupon_cycles) return;
    await updateSubscriptionValue(subscriptionId, Number(ck.full_value_brl));
    await supabase.from('asaas_checkouts').update({ price_restored_at: new Date().toISOString() } as never).eq('id', checkoutId);
  } catch (e) {
    console.error('[asaas] restore price failed:', e);
  }
}

/** Cartão validado e assinatura criada com teste grátis (mensal ou anual): acesso durante o teste (+1 dia para a 1ª cobrança). */
export async function activateTrial(row: CheckoutRow): Promise<void> {
  await grantAccess(row.user_id, row.plan, new Date(Date.now() + (row.trial_days + 1) * DAY), row.method);
  await sendWebWelcome(row.user_id, row.plan, row.trial_days);
  await metaConversion(row, 'StartTrial', 0);
}

/**
 * Cobrança confirmada. Pode ser chamada pelo webhook e pela tela de pagamento ao mesmo tempo: a trava
 * em asaas_events (paid_<cobrança>) garante que roda uma vez por cobrança.
 */
export async function handlePaymentPaid(row: CheckoutRow, p: AsaasPayment): Promise<void> {
  const supabase = getSupabaseAdmin();
  const lockId = `paid_${p.id}`;
  const { error: locked } = await supabase.from('asaas_events').insert({ id: lockId, event: 'PAYMENT_PAID_LOCK', payload: { checkout: row.id } } as never);
  if (locked) return;
  try {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (p.subscription && !row.asaas_subscription_id) patch.asaas_subscription_id = p.subscription;
    if (!row.asaas_customer_id) patch.asaas_customer_id = p.customer;
    if (row.status !== 'paid') patch.status = 'paid';
    // 1º pagamento confirmado: base do reembolso em 7 dias.
    if (!row.asaas_payment_id) {
      patch.asaas_payment_id = p.id;
      if (p.installment) patch.asaas_installment_id = p.installment;
      patch.paid_at = new Date().toISOString(); // agora: as datas do Asaas vêm sem hora e encurtariam o prazo do reembolso
    }
    await supabase.from('asaas_checkouts').update(patch as never).eq('id', row.id);

    const base = new Date(p.dueDate ? `${p.dueDate}T12:00:00Z` : Date.now());
    const start = base.getTime() < Date.now() - 40 * DAY ? new Date() : base;
    const firstInstallment = !p.installmentNumber || p.installmentNumber === 1;
    if (row.plan === 'monthly') {
      await grantAccess(row.user_id, 'monthly', new Date(addMonths(start, 1).getTime() + GRACE_DAYS * DAY));
    } else if (firstInstallment) {
      await grantAccess(row.user_id, 'annual', new Date(addMonths(new Date(), 12).getTime() + GRACE_DAYS * DAY), row.method);
    }
    const { count } = await supabase.from('revenue_events').select('id', { count: 'exact', head: true })
      .eq('app_user_id', row.user_id).eq('store', 'ASAAS').like('event_id', 'asaas_%').not('event_id', 'like', `%${p.id}`);
    const { count: same } = await supabase.from('revenue_events').select('id', { count: 'exact', head: true }).like('event_id', `asaas_%_${p.id}`);
    if (!same && !row.sandbox) await recordAsaasRevenue(count ? 'RENEWAL' : 'INITIAL_PURCHASE', row, p);
    // 1ª cobrança paga do aluno: venda para a Meta (renovações não entram).
    if (!same && !count) await metaConversion(row, 'Purchase', Math.abs(Number(p.value) || 0));
    // Boas-vindas na 1ª cobrança sem teste (anual ou mensal sem teste).
    if (!count && !same && !(row.trial_days > 0)) await sendWebWelcome(row.user_id, row.plan, 0);
    // Cupom com duração: depois da última cobrança com desconto, as próximas voltam ao preço cheio.
    if (p.subscription && !row.sandbox) await restorePriceIfCouponEnded(row.id, p.subscription);
  } catch (e) {
    await supabase.from('asaas_events').delete().eq('id', lockId); // libera para tentar de novo
    throw e;
  }
}
