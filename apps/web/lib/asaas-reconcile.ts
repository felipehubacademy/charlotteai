// lib/asaas-reconcile.ts — cobrança do site que não passou: a conta fica sem acesso até pagar, e o aluno é avisado.
// Usado pelo webhook (PAYMENT_CREDIT_CARD_CAPTURE_REFUSED, PAYMENT_CREDIT_CARD_INVALID, PAYMENT_OVERDUE) e pela
// conferência a cada 6 h (/api/cron/rc-reconcile), que pega o que o aviso não trouxe. Quando o pagamento passa,
// handlePaymentPaid devolve o acesso. Se a pessoa tem assinatura válida na loja, vale a da loja e não sai o aviso.
import { readAll } from '@/lib/db-batch';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { subscriptionPayments, cancelSubscription, deletePayment, paymentsByStatus, getPayment, retryCardPayment, PAID_STATUSES, type AsaasPayment } from '@/lib/asaas';
import { sendPaymentFailed } from '@/lib/subscription-notices';
import { reconcileStoreSubscription, logRcEvent } from '@/lib/rc-subscription';

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
  if (rc && rc.action !== 'skipped' && rc.state.hasPremium) {
    await closeSiteAfterStore(ck.user_id).catch(e => console.warn('[asaas-reconcile] encerrar site:', e instanceof Error ? e.message : e));
    return 'store';
  }
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

/** Assinou na loja com cobrança do site que não passou: encerra a assinatura do site e apaga as cobranças em aberto,
 *  para o aluno não pagar nos dois lugares. Quem tem o site em dia não entra aqui. */
export async function closeSiteAfterStore(userId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('asaas_checkouts').select('asaas_subscription_id')
    .eq('user_id', userId).eq('status', 'paid').eq('sandbox', false).is('refunded_at', null).not('asaas_subscription_id', 'is', null);
  let closed = 0;
  for (const sub of new Set(((data ?? []) as { asaas_subscription_id: string }[]).map(r => r.asaas_subscription_id))) {
    const { data: gone } = await supabase.from('asaas_events').select('id').eq('event', 'SUBSCRIPTION_DELETED')
      .filter('payload->subscription->>id', 'eq', sub).limit(1).maybeSingle();
    if (gone || !(await hasUnpaidCharge(sub))) continue;
    // Uma vez só por assinatura; se o processador falhar, libera para a próxima tentativa.
    const lockId = `site_closed_${sub}`;
    const { error: locked } = await supabase.from('asaas_events').insert({ id: lockId, event: 'SITE_CLOSED_LOCK', payload: { subscription: sub, user: userId } } as never);
    if (locked) continue;
    try {
      await cancelSubscription(sub);
      for (const p of await subscriptionPayments(sub)) {
        if (p.status === 'PENDING' || p.status === 'OVERDUE') await deletePayment(p.id);
      }
      await logRcEvent({ event_id: lockId, event_type: 'SITE_CLOSED', app_user_id: userId, result: { subscription: sub } });
      closed++;
    } catch (e) {
      await supabase.from('asaas_events').delete().eq('id', lockId);
      console.warn('[asaas-reconcile] encerrar site', sub, e instanceof Error ? e.message : e);
    }
  }
  return closed;
}

/** Assinaturas do site marcadas com acesso e com o prazo já vencido: confere a cobrança vencida no processador. */
export async function reconcileLapsedSiteSubscriptions(): Promise<{ checked: number; blocked: number; store: number; leftAlone: number; errors: number }> {
  const supabase = getSupabaseAdmin();
  // Todos os vencidos, 100 por rodada a partir de um ponto que muda a cada dia: antes era .limit(100) sem
  // ordem, e quem fica "em dia" continua na lista, então passando de 100 os mesmos voltavam sempre.
  const all = (await readAll<{ id: string }>('site vencido', () => supabase.from('charlotte_users').select('id')
    .like('subscription_product', 'web_%').in('subscription_status', ['active', 'cancelled'])
    .lt('subscription_expires_at', new Date(Date.now() - 2 * 3600000).toISOString()).not('is_institutional', 'is', true)
    .order('id'))).map(u => String(u.id));
  const start = all.length > 100 ? Math.floor(Date.now() / 86400000) * 100 % all.length : 0;
  const ids = [...all.slice(start), ...all.slice(0, start)].slice(0, 100);
  const out = { checked: ids.length, blocked: 0, store: 0, leftAlone: 0, errors: 0 };
  const started = Date.now();
  for (const id of ids) {
    if (Date.now() - started > 40_000) break; // o resto entra na próxima rodada
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

// ── Cobrança recusada: lembretes, nova tentativa e limpeza do Pix abandonado ──
// Roda com a conferência a cada 6 h (/api/cron/rc-reconcile), sobre as cobranças VENCIDAS no Asaas:
//  - cartão: lembrete 2 dias depois da recusa e o último 5 dias depois (e-mail + push, uma vez cada, com o botão
//    "Pagar agora"); no 3º dia, uma única nova tentativa com o cartão salvo (token), quando o Asaas devolve o token.
//    Se passar, o webhook de pagamento devolve o acesso (handlePaymentPaid). Só cobranças de até 7 dias: as mais
//    antigas não recebem nada (evita uma leva de avisos atrasados).
//  - Pix: QR code do Anual que a pessoa gerou no nosso checkout e não pagou (asaas_checkouts.pending_payment_id, sem
//    pagamento). Vencido há mais de 3 dias, é removido no Asaas (desistência, não é dívida). A conta do processador é
//    da empresa e pode ter outras cobranças: só sai o Pix que o checkout do Queizy criou.
//  - Lê só as vencidas das últimas 2 semanas e para em 40 s; as travas (asaas_events) fazem a próxima rodada seguir
//    de onde parou, mais antigas primeiro.
const DAY_MS = 86400000;
const brtDay = (t: number) => new Date(t - 3 * 3600000).toISOString().slice(0, 10);
const daysSince = (day: string, nowMs: number) => Math.round((Date.parse(`${brtDay(nowMs)}T12:00:00Z`) - Date.parse(`${day.slice(0, 10)}T12:00:00Z`)) / DAY_MS);

async function onceKey(key: string): Promise<boolean> {
  const { error } = await getSupabaseAdmin().from('asaas_events').insert({ id: `notice_${key}`, event: 'NOTICE', payload: { key } } as never);
  return !error;
}

export async function followUpFailedCharges(nowMs = Date.now()): Promise<{ overdue: number; reminders: number; retried: number; retryOk: number; noToken: number; pixRemoved: number; errors: number }> {
  const out = { overdue: 0, reminders: 0, retried: 0, retryOk: 0, noToken: 0, pixRemoved: 0, errors: 0 };
  const supabase = getSupabaseAdmin();
  const dueFrom = brtDay(nowMs - 14 * DAY_MS);
  const overdue = (await paymentsByStatus('OVERDUE', { dueFrom })).sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
  out.overdue = overdue.length;
  const started = Date.now();
  for (const p of overdue) {
    if (Date.now() - started > 40_000) break; // o resto entra na próxima rodada
    try {
      const age = daysSince(p.dueDate ?? brtDay(nowMs), nowMs);
      if (p.billingType === 'PIX') {
        if (p.subscription || age <= 3) continue;
        const { data: pix } = await supabase.from('asaas_checkouts').select('id, status')
          .eq('pending_payment_id', p.id).eq('sandbox', false).limit(1).maybeSingle();
        if (!pix || (pix as { status: string }).status === 'paid') continue;
        await deletePayment(p.id); out.pixRemoved++;
        continue;
      }
      if (p.billingType !== 'CREDIT_CARD' || !p.subscription || age < 2 || age > 7) continue;
      const { data } = await supabase.from('asaas_checkouts').select('id, user_id, method, asaas_subscription_id')
        .eq('asaas_subscription_id', p.subscription).eq('sandbox', false).order('created_at', { ascending: false }).limit(1).maybeSingle();
      const ck = data as CheckoutLite | null;
      if (!ck) continue;
      // Quem já tem a assinatura da loja não recebe cobrança do site.
      const { data: u } = await supabase.from('charlotte_users').select('subscription_product').eq('id', ck.user_id).maybeSingle();
      if (!String((u as { subscription_product?: string } | null)?.subscription_product ?? '').startsWith('web_')) continue;

      // 3º dia: uma nova tentativa com o cartão salvo.
      if (age >= 3 && await onceKey(`retry_${p.id}`)) {
        const full = await getPayment(p.id);
        const token = full.creditCard?.creditCardToken;
        if (!token) out.noToken++;
        else {
          out.retried++;
          try {
            const r = await retryCardPayment(p.id, token);
            if (PAID_STATUSES.includes(r.status)) { out.retryOk++; continue; }
          } catch (e) {
            console.warn('[asaas-reconcile] nova tentativa recusada', p.id, e instanceof Error ? e.message : e);
          }
        }
      }
      const stage = age >= 5 ? 'last' : 'reminder';
      if (await sendPaymentFailed(ck.id, p, stage)) out.reminders++;
    } catch (e) {
      out.errors++;
      console.warn('[asaas-reconcile] cobrança vencida', p.id, e instanceof Error ? e.message : e);
    }
  }
  return out;
}
