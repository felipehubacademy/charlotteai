// lib/subscription-notices.ts — avisos da assinatura pelo site, todos com a marca Queizy (e-mail + push).
// O processador de pagamento não manda nada ao aluno (avisos do cliente desligados lá).
//
//   sendTrialEndingNotices  2 dias antes da 1ª cobrança do teste grátis (cron /api/cron/subscription-notices)
//   sendPaymentReceipt      cobrança aprovada (1ª depois do teste e renovações)
//   sendPaymentFailed       cobrança do cartão recusada
//   sendCancelledNotice     assinatura cancelada (pelo app ou pelo suporte; não no reembolso)
//   sendRefundNotice        reembolso feito (ou pedido registrado, quando o processador não devolveu na hora)
//
// Cada aviso sai uma vez só: trava em asaas_events (notice_<tipo>_<chave>).
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendOrQueue } from '@/lib/email-outbox';
import { sendSubscriptionPush } from '@/lib/expo-notification-service';
import {
  webTrialEndingTemplate, webPaymentReceiptTemplate, webPaymentFailedTemplate, webCancelledTemplate, webRefundTemplate,
} from '@/lib/email-templates';
import type { AsaasPayment, WebPlan } from '@/lib/asaas';

const DAY = 86400000;
const TZ = 'America/Sao_Paulo';
const date = (d: Date | string) => new Date(d).toLocaleDateString('pt-BR', { timeZone: TZ });
const brl = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type Ck = {
  id: string; user_id: string; plan: WebPlan; method: string | null; trial_days: number; value_brl: number; created_at: string;
  asaas_payment_id: string | null; paid_at: string | null; refunded_at: string | null; refund_requested_at: string | null; sandbox: boolean | null;
};
const CK_COLS = 'id, user_id, plan, method, trial_days, value_brl, created_at, asaas_payment_id, paid_at, refunded_at, refund_requested_at, sandbox';

async function once(key: string): Promise<boolean> {
  const { error } = await getSupabaseAdmin().from('asaas_events').insert({ id: `notice_${key}`, event: 'NOTICE', payload: { key } } as never);
  return !error;
}

async function userOf(id: string) {
  const { data } = await getSupabaseAdmin().from('charlotte_users').select('email, name, subscription_status, subscription_expires_at').eq('id', id).maybeSingle();
  return data as { email: string | null; name: string | null; subscription_status: string | null; subscription_expires_at: string | null } | null;
}

async function loadCk(id: string): Promise<Ck | null> {
  const { data } = await getSupabaseAdmin().from('asaas_checkouts').select(CK_COLS).eq('id', id).maybeSingle();
  return (data as Ck | null) ?? null;
}

/** Cron diário: quem tem a 1ª cobrança do teste grátis nas próximas 24 a 48 horas. */
export async function sendTrialEndingNotices(): Promise<{ sent: number; checked: number }> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('asaas_checkouts').select(CK_COLS)
    .eq('status', 'paid').gt('trial_days', 0).is('asaas_payment_id', null)
    .gte('created_at', new Date(Date.now() - 30 * DAY).toISOString());
  const rows = (data ?? []) as Ck[];
  let sent = 0;
  for (const r of rows) {
    const firstCharge = new Date(new Date(r.created_at).getTime() + r.trial_days * DAY);
    const left = firstCharge.getTime() - Date.now();
    if (left <= DAY || left > 2 * DAY) continue;
    const u = await userOf(r.user_id);
    // Cancelou no teste: não vai ser cobrado, não precisa do aviso.
    if (!u?.email || u.subscription_status !== 'active') continue;
    if (!(await once(`trial_${r.id}`))) continue;
    const trialEnd = date(new Date(firstCharge.getTime() - DAY));
    const chargeDate = date(firstCharge);
    const { subject, html } = webTrialEndingTemplate({ name: u.name, plan: r.plan, chargeDate, trialEnd, value: brl(r.value_brl) });
    await sendOrQueue({ kind: 'web_notice', to: u.email, subject, html });
    await sendSubscriptionPush(supabase, r.user_id, {
      pt: { title: 'Seu teste grátis termina em breve', body: `Em ${chargeDate} começa a assinatura (${brl(r.value_brl)}). Para não ser cobrado, cancele até ${trialEnd} em Perfil > Assinatura.` },
      en: { title: 'Your free trial ends soon', body: `Your subscription starts on ${chargeDate} (${brl(r.value_brl)}). To avoid the charge, cancel by ${trialEnd} in Profile > Subscription.` },
    }, 'trial_ending');
    sent++;
  }
  return { sent, checked: rows.length };
}

/** Cobrança aprovada. Não manda na compra sem teste (o e-mail de boas-vindas já faz esse papel). */
export async function sendPaymentReceipt(checkoutId: string, p: AsaasPayment, isFirstPaid: boolean): Promise<void> {
  const r = await loadCk(checkoutId);
  if (!r) return;
  if (isFirstPaid && !(r.trial_days > 0)) return;
  if (!(await once(`receipt_${p.id}`))) return;
  const u = await userOf(r.user_id);
  if (!u?.email) return;
  const due = new Date(p.dueDate ? `${p.dueDate}T12:00:00Z` : Date.now());
  const isPix = r.method === 'annual_pix';
  const next = isPix ? null : new Date(due);
  if (next) { if (r.plan === 'monthly') next.setMonth(next.getMonth() + 1); else next.setFullYear(next.getFullYear() + 1); }
  // Reembolso só vale para o 1º pagamento, em até 7 dias.
  const refundUntil = r.asaas_payment_id === p.id && r.paid_at ? date(new Date(new Date(r.paid_at).getTime() + 7 * DAY)) : null;
  const { subject, html } = webPaymentReceiptTemplate({
    name: u.name, plan: r.plan, method: r.method, value: brl(p.value), paidAt: date(p.confirmedDate || p.paymentDate || new Date()),
    nextCharge: next ? date(next) : null, accessUntil: u.subscription_expires_at ? date(u.subscription_expires_at) : null, refundUntil,
  });
  await sendOrQueue({ kind: 'web_notice', to: u.email, subject, html });
}

/** Cartão recusado na cobrança (só assinaturas no cartão; Pix vencido sem pagar não é falha de cobrança). */
export async function sendPaymentFailed(checkoutId: string, p: AsaasPayment): Promise<void> {
  const r = await loadCk(checkoutId);
  if (!r || r.method === 'annual_pix' || p.billingType === 'PIX') return;
  if (!(await once(`failed_${p.id}`))) return;
  const u = await userOf(r.user_id);
  if (!u?.email) return;
  const accessUntil = u.subscription_expires_at && new Date(u.subscription_expires_at).getTime() > Date.now() ? date(u.subscription_expires_at) : null;
  const { subject, html } = webPaymentFailedTemplate({ name: u.name, plan: r.plan, value: brl(p.value), accessUntil });
  await sendOrQueue({ kind: 'web_notice', to: u.email, subject, html });
  await sendSubscriptionPush(getSupabaseAdmin(), r.user_id, {
    pt: { title: 'A cobrança da assinatura não passou', body: 'O cartão recusou a cobrança do Queizy. Confira com o seu banco ou responda o e-mail que mandamos.' },
    en: { title: 'Your subscription payment failed', body: 'Your card declined the Queizy charge. Check with your bank or reply to the email we sent.' },
  }, 'payment_failed');
}

/** Assinatura cancelada. No reembolso não manda (o acesso já terminou e a tela do app explica). */
export async function sendCancelledNotice(checkoutId: string, subscriptionId: string): Promise<void> {
  const r = await loadCk(checkoutId);
  if (!r || r.refunded_at || r.refund_requested_at) return;
  if (!(await once(`cancel_${subscriptionId}`))) return;
  const u = await userOf(r.user_id);
  if (!u?.email) return;
  const inTrial = r.trial_days > 0 && !r.asaas_payment_id;
  const accessUntil = inTrial
    ? date(new Date(new Date(r.created_at).getTime() + (r.trial_days - 1) * DAY))
    : u.subscription_expires_at ? date(u.subscription_expires_at) : null;
  const { subject, html } = webCancelledTemplate({ name: u.name, plan: r.plan, inTrial, accessUntil });
  await sendOrQueue({ kind: 'web_notice', to: u.email, subject, html });
}

/** Reembolso: feito na hora (app, painel ou webhook) ou pedido registrado para o suporte fazer. */
export async function sendRefundNotice(checkoutId: string, paymentId: string, queued: boolean, value?: number): Promise<void> {
  const r = await loadCk(checkoutId);
  if (!r) return;
  if (!(await once(`refund_${paymentId}${queued ? '_pedido' : ''}`))) return;
  const u = await userOf(r.user_id);
  if (!u?.email) return;
  const { subject, html } = webRefundTemplate({ name: u.name, plan: r.plan, method: r.method, value: brl(value ?? r.value_brl), queued });
  await sendOrQueue({ kind: 'web_notice', to: u.email, subject, html });
}
