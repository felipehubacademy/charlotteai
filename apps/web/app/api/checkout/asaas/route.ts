// /api/checkout/asaas — assinatura pelo site.
//   GET  ?aff=CODE                       preços (com o desconto do afiliado) e se o checkout está ligado
//   GET  ?mine=1 (Bearer do aluno)        situação da assinatura do site: teste grátis, 1ª cobrança, prazo do reembolso
//   POST { method, name, email, phone, cpf, cep, number, street?, complement?, aff?, coupon? }  cria (ou acha) a conta e devolve { url } do checkout do Asaas
//   POST { action: 'cancel' }  (Bearer do aluno)   cancela a renovação (mensal ou anual no cartão)
//   POST { action: 'refund' }  (Bearer do aluno)   reembolso em até 7 dias do 1º pagamento (Pix, 12x ou cartão)
// Conta nova: criada aqui pelo e-mail; depois do pagamento chega o e-mail para criar a senha.
import { NextRequest, NextResponse } from 'next/server';
import { cancelSiteSubscription } from '@/lib/site-subscription';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { readAll } from '@/lib/db-batch';
import { sendEmail } from '@/lib/microsoft-graph-email-service';
import { affiliateByCode, cleanAffiliateCode } from '@/lib/affiliates';
import {
  asaasConfigured, AsaasError, cancelSubscription, createCheckout, priceFor,
  WEB_TRIAL_DAYS, resolveCoupon, COUPON_ERROR_PT, type WebPlan,
  refundPayment, refundInstallment, REFUND_WINDOW_DAYS, disableCustomerNotifications, activeSubscriptionsOf,
  subscriptionPayments, PAID_STATUSES,
} from '@/lib/asaas';
import { prepareWebCheckout, checkoutRowFields } from '@/lib/web-checkout';
import { logOpsError } from '@/lib/ops-monitor';
import { overLimit, clientIp } from '@/lib/rate-hits';
import { sendRefundNotice } from '@/lib/subscription-notices';

export const dynamic = 'force-dynamic';
// Perto do banco e do processador de pagamento (São Paulo): o envio do formulário faz várias consultas
// em sequência e, rodando nos EUA, cada uma atravessava o continente.
export const preferredRegion = 'gru1';

async function discountFor(code: string | null): Promise<{ code: string; pct: number } | null> {
  if (!code) return null;
  const aff = await affiliateByCode(code);
  if (!aff || aff.status !== 'active') return null;
  return { code: aff.code, pct: Number(aff.user_discount_pct) || 0 };
}

//   GET ?aff=CODE&coupon=CODE  preços com o melhor desconto (afiliado do link ou cupom); não acumula
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('mine') === '1') return mine(req);
  const d = await discountFor(cleanAffiliateCode(req.nextUrl.searchParams.get('aff')) || null);
  const couponRaw = req.nextUrl.searchParams.get('coupon');
  // Consulta de cupom: no máximo 30 a cada 10 min por IP (impede testar códigos em massa).
  const ip = couponRaw ? clientIp(req.headers) : null;
  const tooMany = !!ip && await overLimit('coupon_check', ip, 30, 10 * 60000);
  const c = couponRaw && !tooMany ? await resolveCoupon(couponRaw) : null;
  const pctFor = (plan: WebPlan) => Math.max(d?.pct ?? 0, c?.ok && c.plans.includes(plan) ? c.pct : 0);
  const limitedWins = (plan: WebPlan) => !!(c?.ok && c.kind === 'coupon' && c.cycles && c.plans.includes(plan) && c.pct > 0 && c.pct >= (d?.pct ?? 0));
  const noTrialWins = (plan: WebPlan) => !!(c?.ok && c.kind === 'coupon' && c.noTrial && c.plans.includes(plan) && c.pct > 0 && c.pct >= (d?.pct ?? 0));
  return NextResponse.json({
    enabled: asaasConfigured(),
    // Checkout próprio (cartão e Pix no queizy.com) ligado para todos. Enquanto não, só por ?checkout=novo.
    direct: process.env.CHECKOUT_DIRECT === '1',
    trialDays: WEB_TRIAL_DAYS,
    // Por plano: o cupom "cobra na hora" tira os 7 dias grátis só dos planos em que ele vale.
    // Mesma precedência do checkout (web-checkout): só tira o teste se o cupom vence o desconto do afiliado.
    trialDaysByPlan: {
      monthly: noTrialWins('monthly') ? 0 : WEB_TRIAL_DAYS,
      annual: noTrialWins('annual') ? 0 : WEB_TRIAL_DAYS,
    },
    discountPct: Math.max(pctFor('monthly'), pctFor('annual')),
    coupon: tooMany ? { ok: false, error: 'Muitas tentativas de cupom. Espere alguns minutos e tente de novo.' }
      : c ? (c.ok ? { ok: true, code: c.code, pct: c.pct, plans: c.plans } : { ok: false, error: COUPON_ERROR_PT[c.error] }) : null,
    prices: {
      monthly: priceFor('monthly', pctFor('monthly')), annual: priceFor('annual', pctFor('annual')),
    },
    // Preço da renovação quando o cupom que vence vale só por algumas cobranças (ex.: Black Friday, só o 1º ano):
    // depois dele volta ao preço com o desconto do afiliado, se houver (igual ao webhook). null = renova pelo mesmo preço.
    renewPrices: {
      monthly: limitedWins('monthly') ? priceFor('monthly', d?.pct ?? 0) : null,
      annual: limitedWins('annual') ? priceFor('annual', d?.pct ?? 0) : null,
    },
    renewCycles: c?.ok && c.kind === 'coupon' ? c.cycles ?? null : null, // quantas cobranças levam o desconto
  });
}

// Tela "Gerenciar assinatura" do app: no teste grátis não há o que reembolsar (só cancelar antes da
// 1ª cobrança); depois de pago, o reembolso vale até 7 dias.
async function mine(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const h = req.headers.get('authorization') ?? '';
  const { data: auth } = h.startsWith('Bearer ') ? await supabase.auth.getUser(h.slice(7)) : { data: null };
  const user = auth?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data } = await supabase.from('asaas_checkouts')
    .select('created_at, trial_days, value_brl, paid_at, refunded_at, refund_requested_at, asaas_payment_id, asaas_subscription_id, sandbox')
    .eq('user_id', user.id).eq('status', 'paid').order('created_at', { ascending: false }).limit(1).maybeSingle();
  const r = data as { created_at: string; trial_days: number; value_brl: number; paid_at: string | null; refunded_at: string | null; refund_requested_at: string | null; asaas_payment_id: string | null; asaas_subscription_id: string | null; sandbox: boolean | null } | null;
  if (!r) return NextResponse.json({ found: false });
  const DAY = 86400000;
  // Cobrança do cartão recusada e ainda não paga: o app mostra "Pagar agora" (página do Asaas: outro cartão ou Pix).
  let pending: { value: number; dueDate: string | null; payUrl: string } | null = null;
  if (r.asaas_subscription_id && !r.sandbox) {
    try {
      const payments = await subscriptionPayments(r.asaas_subscription_id);
      // Recusa pode ficar como PENDING até virar OVERDUE: com a conta já pausada (expired), a cobrança do dia ou
      // anterior também conta.
      const { data: me } = await supabase.from('charlotte_users').select('subscription_status').eq('id', user.id).maybeSingle();
      const paused = (me as { subscription_status?: string } | null)?.subscription_status === 'expired';
      const today = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);
      const overdue = payments.find(p => p.invoiceUrl && (p.status === 'OVERDUE' || (paused && p.status === 'PENDING' && (p.dueDate ?? '9999') <= today)));
      const paidLater = overdue && payments.some(p => PAID_STATUSES.includes(p.status) && (p.dueDate ?? '') >= (overdue.dueDate ?? ''));
      if (overdue && !paidLater) pending = { value: Number(overdue.value), dueDate: overdue.dueDate ?? null, payUrl: String(overdue.invoiceUrl) };
    } catch { /* sem o processador agora: a tela segue sem o botão */ }
  }
  const inTrial = r.trial_days > 0 && !r.asaas_payment_id && !pending;
  const firstChargeAt = r.trial_days > 0 ? new Date(new Date(r.created_at).getTime() + r.trial_days * DAY).toISOString() : null;
  const refundableUntil = r.paid_at && !r.refunded_at && !r.refund_requested_at
    ? new Date(new Date(r.paid_at).getTime() + REFUND_WINDOW_DAYS * DAY).toISOString() : null;
  return NextResponse.json({
    found: true, inTrial, firstChargeAt, value: Number(r.value_brl),
    refundableUntil: refundableUntil && new Date(refundableUntil).getTime() > Date.now() ? refundableUntil : null,
    refundPending: !!r.refund_requested_at && !r.refunded_at,
    pending,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const supabase = getSupabaseAdmin();

  // Admin: guarda o id da assinatura das compras pela página do processador (backfill-subs) e cancela as
  // assinaturas das contas de teste da equipe (cancel-test). Exige x-admin-secret.
  if (body.action === 'backfill-subs' || body.action === 'cancel-test') {
    if (!process.env.ADMIN_SECRET || req.headers.get('x-admin-secret') !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Em páginas: a leitura para em 1.000 linhas e as compras depois disso ficavam de fora.
    const data = await readAll('compras pagas', () => supabase.from('asaas_checkouts').select('id, user_id, method, asaas_subscription_id, asaas_customer_id, charlotte_users!inner(email)')
      .eq('status', 'paid').eq('sandbox', false).neq('method', 'annual_pix').order('id'));
    const rows = data as unknown as { id: string; user_id: string; method: string; asaas_subscription_id: string | null; asaas_customer_id: string | null; charlotte_users: { email: string } }[];
    const isTest = (e: string) => /^felipe\.xavier1987\+.*@gmail\.com$/i.test(e) || /@hubacademybr\.com$/i.test(e);
    const out: Record<string, unknown>[] = [];
    for (const r of rows) {
      const email = r.charlotte_users?.email ?? '';
      if (body.action === 'cancel-test' && !isTest(email)) continue;
      try {
        const subs = await activeSubscriptionsOf(r.user_id, false, r.asaas_customer_id, r.charlotte_users?.email);
        if (!r.asaas_subscription_id && subs[0]) await supabase.from('asaas_checkouts').update({ asaas_subscription_id: subs[0].id } as never).eq('id', r.id);
        if (body.action === 'cancel-test') {
          for (const s of subs) await cancelSubscription(s.id);
          if (subs.length) await supabase.from('charlotte_users').update({ subscription_status: 'cancelled', updated_at: new Date().toISOString() } as never).eq('id', r.user_id);
        }
        out.push({ email, ativas: subs.map(s => ({ id: s.id, valor: s.value, proxima: s.nextDueDate })), cancelado: body.action === 'cancel-test' && subs.length > 0 });
      } catch (e) {
        out.push({ email, erro: e instanceof Error ? e.message : String(e) });
      }
    }
    return NextResponse.json({ total: out.length, out });
  }

  // Uma vez (admin): desliga os avisos do Asaas para os alunos que já assinaram pelo site.
  if (body.action === 'mute-customers') {
    if (!process.env.ADMIN_SECRET || req.headers.get('x-admin-secret') !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const data = await readAll<{ asaas_customer_id: string }>('clientes do site', () => supabase.from('asaas_checkouts').select('id, asaas_customer_id').eq('sandbox', false).not('asaas_customer_id', 'is', null).order('id'));
    const ids = [...new Set(data.map(r => r.asaas_customer_id))];
    let ok = 0; const failed: string[] = [];
    for (const id of ids) { try { await disableCustomerNotifications(id); ok++; } catch { failed.push(id); } }
    return NextResponse.json({ total: ids.length, ok, failed });
  }

  if (body.action === 'refund') {
    const h = req.headers.get('authorization') ?? '';
    const { data: auth } = h.startsWith('Bearer ') ? await supabase.auth.getUser(h.slice(7)) : { data: null };
    const user = auth?.user;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: row } = await supabase.from('asaas_checkouts')
      .select('id, asaas_payment_id, asaas_installment_id, asaas_subscription_id, paid_at, refunded_at, refund_requested_at, value_brl, method')
      .eq('user_id', user.id).not('paid_at', 'is', null).order('paid_at', { ascending: false }).limit(1).maybeSingle();
    const r = row as { id: string; asaas_payment_id: string | null; asaas_installment_id: string | null; asaas_subscription_id: string | null; paid_at: string; refunded_at: string | null; refund_requested_at: string | null; value_brl: number; method: string | null } | null;
    if (!r?.asaas_payment_id) return NextResponse.json({ error: 'not_found', message: 'Ainda não houve cobrança nesta conta. Se você está no teste grátis, é só cancelar a renovação: nada será cobrado.' }, { status: 404 });
    if (r.refunded_at) return NextResponse.json({ error: 'already', message: 'Esse pagamento já foi reembolsado.' }, { status: 409 });
    if (r.refund_requested_at) return NextResponse.json({ ok: true, queued: true, message: 'Seu pedido de reembolso já está registrado. Devolvemos em até 2 dias úteis.' });
    const days = (Date.now() - new Date(r.paid_at).getTime()) / 86400000;
    if (days > REFUND_WINDOW_DAYS) {
      return NextResponse.json({ error: 'expired', message: `O prazo de ${REFUND_WINDOW_DAYS} dias para o reembolso terminou. Se precisar, escreva para suporte@queizy.com.` }, { status: 400 });
    }
    try {
      if (r.asaas_installment_id) await refundInstallment(r.asaas_installment_id);
      else await refundPayment(r.asaas_payment_id);
      if (r.asaas_subscription_id) {
        // No reembolso o acesso termina na hora: sem o e-mail de "assinatura cancelada" (trava antes do webhook).
        await supabase.from('asaas_events').insert({ id: `notice_cancel_${r.asaas_subscription_id}`, event: 'NOTICE', payload: { key: 'refund' } } as never);
        await cancelSubscription(r.asaas_subscription_id).catch(() => {});
      }
    } catch (e) {
      // O Asaas recusou (ex.: saldo insuficiente, porque a taxa já saiu do valor recebido).
      // O pedido fica registrado e o suporte faz o reembolso; o acesso termina quando ele sair
      // (o webhook PAYMENT_REFUNDED encerra). O aluno nunca fica sem resposta.
      const why = e instanceof AsaasError ? e.message : String(e);
      console.error('[checkout/asaas] refund failed, queued:', e instanceof AsaasError ? e.body : e);
      await supabase.from('asaas_events').insert({ id: `refund_fail_${Date.now()}`, event: 'REFUND_FAILED', payload: { checkout: r.id, payment: r.asaas_payment_id, error: e instanceof AsaasError ? e.body : String(e) } } as never);
      await supabase.from('asaas_checkouts').update({ refund_requested_at: new Date().toISOString() } as never).eq('id', r.id);
      await sendRefundNotice(r.id, r.asaas_payment_id, true, Number(r.value_brl)).catch(() => null);
      await sendEmail({
        to: 'suporte@queizy.com',
        subject: `Reembolso pendente (site): ${user.email ?? user.id}`,
        html: `<p><b>Reembolso pedido pelo app e recusado pelo Asaas. Fazer em até 2 dias úteis.</b></p>
          <p>Aluno: ${user.email ?? ''} (${user.id})<br/>Forma: ${r.method ?? ''} · Valor: R$ ${Number(r.value_brl).toFixed(2)}<br/>
          Pagamento no Asaas: ${r.asaas_payment_id}${r.asaas_installment_id ? ` · parcelamento ${r.asaas_installment_id}` : ''}<br/>
          Pago em: ${r.paid_at}<br/>Motivo da recusa: ${why}</p>
          <p>No Asaas: Cobranças &gt; abrir o pagamento &gt; Estornar. O acesso termina sozinho quando o estorno sair.</p>`,
      }).catch(() => false);
      return NextResponse.json({ ok: true, queued: true, message: 'Seu pedido de reembolso foi registrado. Devolvemos em até 2 dias úteis e avisamos por e-mail.' });
    }
    // Encerra o acesso já (o app relê na hora); o webhook PAYMENT_REFUNDED estorna receita e comissão.
    const nowIso = new Date().toISOString();
    await supabase.from('asaas_checkouts').update({ refunded_at: nowIso } as never).eq('id', r.id);
    await sendRefundNotice(r.id, r.asaas_payment_id, false, Number(r.value_brl)).catch(() => null);
    await supabase.from('charlotte_users').update({ subscription_status: 'expired', is_active: false, subscription_expires_at: nowIso, updated_at: nowIso } as never).eq('id', user.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'cancel') {
    const h = req.headers.get('authorization') ?? '';
    const { data: auth } = h.startsWith('Bearer ') ? await supabase.auth.getUser(h.slice(7)) : { data: null };
    const user = auth?.user;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // Regra única em lib/site-subscription (também usada pela IA do suporte e pelo /admin).
    const r = await cancelSiteSubscription(user.id, { email: user.email, source: 'app' });
    if (r.status === 'not_site' || r.status === 'no_renewal') return NextResponse.json({ ok: true, noRenewal: true });
    if (r.status === 'not_found') return NextResponse.json({ error: 'Não encontramos a assinatura para cancelar. Escreva para suporte@queizy.com que cancelamos para você.' }, { status: 404 });
    if (r.status === 'error') return NextResponse.json({ error: r.message }, { status: 502 });
    return NextResponse.json({ ok: true });
  }

  if (!asaasConfigured()) return NextResponse.json({ error: 'A assinatura pelo site abre em breve. Por enquanto, assine pelo app.' }, { status: 503 });

  const prep = await prepareWebCheckout(req, body);
  if (!prep.ok) return NextResponse.json({ error: prep.error }, { status: prep.status });
  const { ctx } = prep;
  const { method, u, isNewAccount, customerData, trialDays, value } = ctx;

  try {
    // Nome, e-mail, CPF, celular e endereço vêm do nosso formulário e vão já preenchidos para a
    // página do Asaas (customerData): lá o aluno só digita o cartão. Se a conta já tem cliente no
    // Asaas, reaproveita ele. O pagamento é ligado à conta pelo id do checkout e pelo externalReference.
    const { data: prevC } = await supabase.from('asaas_checkouts').select('asaas_customer_id')
      .eq('user_id', u.id).eq('status', 'paid').not('asaas_customer_id', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle();
    const customerId = (prevC as { asaas_customer_id: string } | null)?.asaas_customer_id ?? null;
    const checkout = await createCheckout({ method: method!, value, trialDays, userId: u.id, customerId, customerData });
    await supabase.from('asaas_checkouts').insert({
      id: checkout.id, ...checkoutRowFields(ctx, req), asaas_customer_id: customerId, status: 'created', channel: 'hosted',
    } as never);
    const res = NextResponse.json({ url: checkout.link, trialDays, value, isNewAccount, checkoutId: checkout.id });
    // A tela de sucesso usa este cookie para mostrar o e-mail e oferecer "Não é esse? Corrigir".
    res.cookies.set('qz_checkout', checkout.id, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 2 * 86400 });
    return res;
  } catch (e) {
    console.error('[checkout/asaas] create failed:', e instanceof AsaasError ? e.body : e);
    await logOpsError(e instanceof AsaasError && (e.status >= 500 || e.status === 429) ? 'asaas' : 'checkout', '/api/checkout/asaas (criar)', e);
    return NextResponse.json({ error: e instanceof AsaasError ? e.message : 'Não foi possível abrir o pagamento agora.' }, { status: 502 });
  }
}
