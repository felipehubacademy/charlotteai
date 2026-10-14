// /api/webhooks/asaas — eventos do Asaas (assinatura pelo site).
// Configurar no Asaas: Integrações > Webhooks, URL https://queizy.com/api/webhooks/asaas,
// token = ASAAS_WEBHOOK_TOKEN, eventos de Checkout, Cobranças e Assinaturas.
//
//   CHECKOUT_PAID              guarda o cliente; mensal com teste → acesso liberado até o fim do teste
//   PAYMENT_CONFIRMED/RECEIVED acesso até o fim do período, receita no Financeiro, comissão do afiliado
//   PAYMENT_REFUNDED/CHARGEBACK estorno: acesso encerrado, receita e comissão estornadas
//   SUBSCRIPTION_DELETED/INACTIVATED  'cancelled' (acesso segue até o fim do período pago; mensal ou anual no cartão)
//   CHECKOUT_EXPIRED/CANCELED  só marca o checkout
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { recordRevenueEvent } from '@/lib/revenue';
import { getCustomer, WEB_PRODUCT, type WebPlan } from '@/lib/asaas';
import { sendEmail } from '@/lib/microsoft-graph-email-service';

export const dynamic = 'force-dynamic';
const DAY = 86400000;
const GRACE_DAYS = 3; // tolerância para a cobrança do cartão ser aprovada no dia

type Row = { id: string; user_id: string; plan: WebPlan; trial_days: number; status: string; asaas_customer_id: string | null; asaas_subscription_id: string | null };
type Payment = {
  id: string; customer: string; subscription?: string | null; installment?: string | null; installmentNumber?: number | null;
  value: number; netValue?: number | null; billingType?: string; dueDate?: string; paymentDate?: string | null;
  confirmedDate?: string | null; externalReference?: string | null; checkoutSession?: string | null;
};

function addMonths(d: Date, n: number): Date {
  const r = new Date(d); r.setMonth(r.getMonth() + n); return r;
}

async function findRow(p: { checkoutId?: string | null; externalReference?: string | null; subscription?: string | null; customer?: string | null }): Promise<Row | null> {
  const supabase = getSupabaseAdmin();
  const one = async (col: string, val: string) => {
    const { data } = await supabase.from('asaas_checkouts').select('*').eq(col, val).order('created_at', { ascending: false }).limit(1).maybeSingle();
    return (data as Row | null) ?? null;
  };
  if (p.checkoutId) { const r = await one('id', p.checkoutId); if (r) return r; }
  if (p.subscription) { const r = await one('asaas_subscription_id', p.subscription); if (r) return r; }
  if (p.externalReference) { const r = await one('user_id', p.externalReference); if (r) return r; }
  if (p.customer) {
    const r = await one('asaas_customer_id', p.customer); if (r) return r;
    // Último recurso: e-mail do cliente no Asaas → conta → checkout mais recente dela.
    const c = await getCustomer(p.customer).catch(() => null);
    if (c?.email) {
      const { data: u } = await supabase.from('charlotte_users').select('id').ilike('email', c.email).maybeSingle();
      if (u) return one('user_id', (u as { id: string }).id);
    }
  }
  return null;
}

async function grantAccess(userId: string, plan: WebPlan, until: Date): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: cur } = await supabase.from('charlotte_users').select('subscription_expires_at').eq('id', userId).maybeSingle();
  const prev = (cur as { subscription_expires_at: string | null } | null)?.subscription_expires_at;
  const expires = prev && new Date(prev).getTime() > until.getTime() ? new Date(prev) : until; // nunca encurta
  await supabase.from('charlotte_users').update({
    subscription_status: 'active', is_active: true, subscription_product: WEB_PRODUCT[plan],
    subscription_expires_at: expires.toISOString(), updated_at: new Date().toISOString(),
  } as never).eq('id', userId);
}

async function sendWelcome(userId: string, plan: WebPlan, trialDays: number): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: u } = await supabase.from('charlotte_users').select('email, name').eq('id', userId).maybeSingle();
  const user = u as { email: string; name: string | null } | null;
  if (!user?.email) return;
  const { data: link } = await supabase.auth.admin.generateLink({ type: 'recovery', email: user.email, options: { redirectTo: 'https://queizy.com/open' } });
  const passwordUrl = link?.properties?.action_link ?? 'https://queizy.com/open';
  const first = (user.name ?? '').split(' ')[0] || 'Olá';
  const planName = plan === 'monthly' ? 'Plano Mensal' : 'Plano Anual';
  const what = trialDays > 0
    ? `Seus ${trialDays} dias grátis do ${planName} começaram. A primeira cobrança no cartão é no ${trialDays + 1}º dia; se cancelar antes, não paga nada.`
    : plan === 'monthly' ? 'Seu Plano Mensal está ativo.' : 'Seu Plano Anual está ativo: são 12 meses de acesso completo.';
  const btn = (href: string, label: string) =>
    `<a href="${href}" style="display:inline-block;background:#DDFF4A;color:#14121A;font-weight:700;text-decoration:none;padding:14px 22px;border-radius:12px;margin:6px 0">${label}</a>`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#14121A;max-width:520px;margin:0 auto;padding:24px">
    <h2 style="margin:0 0 12px">${first}, sua assinatura do Queizy está ativa</h2>
    <p style="line-height:1.5">${what}</p>
    <p style="line-height:1.5"><strong>1.</strong> Baixe o app Queizy na App Store ou no Google Play.</p>
    <p style="line-height:1.5"><strong>2.</strong> Entre com este e-mail: <strong>${user.email}</strong>. Se ainda não tem senha, crie agora:</p>
    <p>${btn(passwordUrl, 'Criar minha senha')}</p>
    <p>${btn('https://queizy.com/open', 'Baixar o app')}</p>
    <p style="font-size:13px;color:#6B6577;line-height:1.5">Dúvidas? É só responder este e-mail.</p>
  </div>`;
  await sendEmail({ to: user.email, subject: 'Sua assinatura do Queizy está ativa', html }).catch(() => false);
}

async function revenue(type: 'INITIAL_PURCHASE' | 'RENEWAL' | 'REFUND', row: Row, p: Payment): Promise<void> {
  const value = Math.abs(Number(p.value) || 0);
  if (!value) return;
  const net = p.netValue != null ? Math.abs(Number(p.netValue)) : value;
  const at = new Date(p.confirmedDate || p.paymentDate || Date.now());
  // Mesmo formato do evento do RevenueCat: reaproveita Financeiro + comissão de afiliado.
  await recordRevenueEvent({
    type, id: `asaas_${type}_${p.id}`, app_user_id: row.user_id, store: 'ASAAS',
    product_id: WEB_PRODUCT[row.plan], currency: 'BRL', price_in_purchased_currency: value,
    tax_percentage: 0, commission_percentage: value > 0 ? Math.max(0, (value - net) / value) : 0,
    purchased_at_ms: at.getTime(), transaction_id: p.id, environment: process.env.ASAAS_ENV === 'sandbox' ? 'SANDBOX' : 'PRODUCTION',
  });
}

export async function POST(req: NextRequest) {
  const token = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!token || req.headers.get('asaas-access-token') !== token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => null) as Record<string, any> | null;
  const event = String(body?.event ?? '');
  const eventId = String(body?.id ?? '');
  if (!body || !event || !eventId) return NextResponse.json({ ok: true });

  const supabase = getSupabaseAdmin();
  const { error: dup } = await supabase.from('asaas_events').insert({ id: eventId, event, payload: body } as never);
  if (dup) return NextResponse.json({ ok: true, duplicate: true }); // o Asaas reenvia: processa uma vez

  try {
    if (event.startsWith('CHECKOUT_')) {
      const c = body.checkout as { id: string; customer?: string | null } | undefined;
      if (!c?.id) return NextResponse.json({ ok: true });
      const row = await findRow({ checkoutId: c.id });
      if (!row) return NextResponse.json({ ok: true, unmatched: true });
      const status = event === 'CHECKOUT_PAID' ? 'paid' : event === 'CHECKOUT_EXPIRED' ? 'expired' : event === 'CHECKOUT_CANCELED' ? 'canceled' : row.status;
      await supabase.from('asaas_checkouts').update({ status, asaas_customer_id: c.customer ?? row.asaas_customer_id, updated_at: new Date().toISOString() } as never).eq('id', row.id);
      if (event === 'CHECKOUT_PAID' && row.trial_days > 0) {
        // Cartão validado e assinatura criada (mensal ou anual): acesso durante o teste (+1 dia para a 1ª cobrança).
        await grantAccess(row.user_id, row.plan, new Date(Date.now() + (row.trial_days + 1) * DAY));
        await sendWelcome(row.user_id, row.plan, row.trial_days);
      }
      return NextResponse.json({ ok: true });
    }

    if (event.startsWith('PAYMENT_')) {
      const p = body.payment as Payment | undefined;
      if (!p?.id) return NextResponse.json({ ok: true });
      const row = await findRow({ checkoutId: p.checkoutSession, subscription: p.subscription, externalReference: p.externalReference, customer: p.customer });
      if (!row) return NextResponse.json({ ok: true, unmatched: true });
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (p.subscription && !row.asaas_subscription_id) patch.asaas_subscription_id = p.subscription;
      if (!row.asaas_customer_id) patch.asaas_customer_id = p.customer;
      if (row.status !== 'paid' && (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED')) patch.status = 'paid';
      await supabase.from('asaas_checkouts').update(patch as never).eq('id', row.id);

      if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
        // CONFIRMED (cartão) e RECEIVED (Pix / dinheiro na conta) podem chegar os dois: a receita é idempotente
        // pelo id da cobrança; o acesso usa o maior prazo.
        const base = new Date(p.dueDate ? `${p.dueDate}T12:00:00Z` : Date.now());
        const start = base.getTime() < Date.now() - 40 * DAY ? new Date() : base;
        const firstInstallment = !p.installmentNumber || p.installmentNumber === 1;
        if (row.plan === 'monthly') {
          await grantAccess(row.user_id, 'monthly', new Date(addMonths(start, 1).getTime() + GRACE_DAYS * DAY));
        } else if (firstInstallment) {
          await grantAccess(row.user_id, 'annual', new Date(addMonths(new Date(), 12).getTime() + GRACE_DAYS * DAY));
        }
        const { count } = await supabase.from('revenue_events').select('id', { count: 'exact', head: true })
          .eq('app_user_id', row.user_id).eq('store', 'ASAAS').like('event_id', 'asaas_%').not('event_id', 'like', `%${p.id}`);
        const { count: same } = await supabase.from('revenue_events').select('id', { count: 'exact', head: true }).like('event_id', `asaas_%_${p.id}`);
        if (!same) await revenue(count ? 'RENEWAL' : 'INITIAL_PURCHASE', row, p);
        // Boas-vindas na 1ª cobrança sem teste (anual ou mensal sem teste).
        if (!count && !same && !(row.trial_days > 0)) await sendWelcome(row.user_id, row.plan, 0);
      } else if (event === 'PAYMENT_REFUNDED' || event === 'PAYMENT_CHARGEBACK_REQUESTED' || event === 'PAYMENT_CHARGEBACK_DISPUTE') {
        await revenue('REFUND', row, p);
        await supabase.from('charlotte_users').update({
          subscription_status: 'expired', is_active: false, subscription_expires_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        } as never).eq('id', row.user_id);
      }
      return NextResponse.json({ ok: true });
    }

    if (event === 'SUBSCRIPTION_DELETED' || event === 'SUBSCRIPTION_INACTIVATED') {
      const s = body.subscription as { id: string; customer?: string } | undefined;
      if (!s?.id) return NextResponse.json({ ok: true });
      const row = await findRow({ subscription: s.id, customer: s.customer });
      if (row) {
        await supabase.from('charlotte_users').update({ subscription_status: 'cancelled', updated_at: new Date().toISOString() } as never)
          .eq('id', row.user_id).in('subscription_product', [WEB_PRODUCT.monthly, WEB_PRODUCT.annual]);
      }
      return NextResponse.json({ ok: true });
    }
  } catch (e) {
    console.error('[webhooks/asaas]', event, e);
    // Libera o evento para o Asaas reenviar.
    await supabase.from('asaas_events').delete().eq('id', eventId);
    return NextResponse.json({ error: 'processing_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
