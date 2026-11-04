// lib/asaas-reconcile.ts — cobrança do site que não passou: a conta fica sem acesso até pagar, e o aluno é avisado.
// Usado pelo webhook (PAYMENT_CREDIT_CARD_CAPTURE_REFUSED, PAYMENT_CREDIT_CARD_INVALID, PAYMENT_OVERDUE) e pela
// conferência a cada 6 h (/api/cron/rc-reconcile), que pega o que o aviso não trouxe. Quando o pagamento passa,
// handlePaymentPaid devolve o acesso. Se a pessoa tem assinatura válida na loja, vale a da loja e não sai o aviso.
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { subscriptionPayments, PAID_STATUSES, type AsaasPayment } from '@/lib/asaas';
import { sendPaymentFailed } from '@/lib/subscription-notices';
import { reconcileStoreSubscription } from '@/lib/rc-subscription';

type CheckoutLite = { id: string; user_id: string; method: string | null; asaas_subscription_id: string | null };

/** Tira o acesso de quem está no site e avisa (uma vez por cobrança). Pix fica de fora: vencido não é falha de cobrança. */
export async function blockForFailedCharge(checkoutId: string, p: AsaasPayment): Promise<'blocked' | 'store' | 'ignored'> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('asaas_checkouts').select('id, user_id, method').eq('id', checkoutId).maybeSingle();
  const ck = data as CheckoutLite | null;
  if (!ck?.user_id || ck.method === 'annual_pix' || p.billingType === 'PIX') return 'ignored';
  const { data: updated } = await supabase.from('charlotte_users')
    .update({ subscription_status: 'expired', is_active: false, subscription_expires_at: new Date().toISOString(), updated_at: new Date().toISOString() } as never)
    .eq('id', ck.user_id).like('subscription_product', 'web_%').not('is_institutional', 'is', true).select('id');
  if (!(updated ?? []).length) return 'ignored';
  const rc = await reconcileStoreSubscription(ck.user_id).catch(() => null);
  if (rc && rc.action !== 'skipped' && rc.state.hasPremium) return 'store';
  await sendPaymentFailed(ck.id, p);
  return 'blocked';
}

const FAILED_EVENTS = ['PAYMENT_CREDIT_CARD_CAPTURE_REFUSED', 'PAYMENT_CREDIT_CARD_INVALID', 'PAYMENT_OVERDUE', 'PAYMENT_REPROVED_BY_RISK_ANALYSIS', 'PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_CHARGEBACK_DISPUTE'];
const PAID_EVENTS = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'];

/** Cobrança recusada, vencida ou em disputa e não paga depois: quem está nessa situação fica sem acesso até pagar. */
export async function hasUnpaidCharge(subscriptionId: string): Promise<boolean> {
  // Recusa de cartão continua PENDING no processador: só o último aviso recebido mostra que falhou.
  const { data } = await getSupabaseAdmin().from('asaas_events').select('event')
    .filter('payload->payment->>subscription', 'eq', subscriptionId).in('event', [...FAILED_EVENTS, ...PAID_EVENTS])
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (FAILED_EVENTS.includes((data as { event: string } | null)?.event ?? '')) return true;
  const payments = await subscriptionPayments(subscriptionId);
  const overdue = payments.find(p => p.status === 'OVERDUE');
  // Cobrança paga depois da vencida: a assinatura está em dia.
  return !!overdue && !payments.some(p => PAID_STATUSES.includes(p.status) && p.dueDate >= overdue.dueDate);
}

/** Assinaturas do site marcadas com acesso e com o prazo já vencido: confere a cobrança vencida no processador. */
export async function reconcileLapsedSiteSubscriptions(): Promise<{ checked: number; blocked: number; store: number; leftAlone: number; errors: number }> {
  const supabase = getSupabaseAdmin();
  const { data: users } = await supabase.from('charlotte_users').select('id')
    .like('subscription_product', 'web_%').in('subscription_status', ['active', 'cancelled'])
    .lt('subscription_expires_at', new Date(Date.now() - 2 * 3600000).toISOString()).not('is_institutional', 'is', true).limit(100);
  const ids = ((users ?? []) as { id: string }[]).map(u => String(u.id));
  const out = { checked: ids.length, blocked: 0, store: 0, leftAlone: 0, errors: 0 };
  for (const id of ids) {
    try {
      const { data } = await supabase.from('asaas_checkouts').select('id, user_id, method, asaas_subscription_id')
        .eq('user_id', id).eq('status', 'paid').eq('sandbox', false).not('asaas_subscription_id', 'is', null)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      const ck = data as CheckoutLite | null;
      if (!ck?.asaas_subscription_id) { out.leftAlone++; continue; }
      const payments = await subscriptionPayments(ck.asaas_subscription_id);
      const overdue = payments.find(p => p.status === 'OVERDUE');
      // Cobrança paga depois da vencida: a assinatura está em dia.
      const paidLater = overdue && payments.some(p => PAID_STATUSES.includes(p.status) && p.dueDate >= overdue.dueDate);
      if (!overdue || paidLater) { out.leftAlone++; continue; }
      const r = await blockForFailedCharge(ck.id, overdue as unknown as AsaasPayment);
      if (r === 'blocked') out.blocked++; else if (r === 'store') out.store++; else out.leftAlone++;
    } catch (e) {
      out.errors++;
      console.warn('[asaas-reconcile]', id, e instanceof Error ? e.message : e);
    }
  }
  return out;
}
