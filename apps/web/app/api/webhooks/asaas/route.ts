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
import { getCustomer, disableCustomerNotifications, WEB_PRODUCT, type AsaasPayment } from '@/lib/asaas';
import { activateTrial, handlePaymentPaid, recordAsaasRevenue, type CheckoutRow } from '@/lib/asaas-activation';
import { sendPaymentFailed, sendCancelledNotice } from '@/lib/subscription-notices';
import { logOpsError } from '@/lib/ops-monitor';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'gru1'; // perto do banco (São Paulo): várias consultas por evento

type Row = CheckoutRow;
type Payment = AsaasPayment;

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
      // Cliente criado pela página do Asaas nasce com os avisos dele ligados: desliga (o aluno fica só com os nossos).
      if (event === 'CHECKOUT_PAID' && c.customer) {
        await disableCustomerNotifications(c.customer).catch(e => console.warn('[webhooks/asaas] avisos do cliente:', e instanceof Error ? e.message : e));
      }
      if (event === 'CHECKOUT_PAID' && row.trial_days > 0) {
        await activateTrial(row);
      }
      return NextResponse.json({ ok: true });
    }

    if (event.startsWith('PAYMENT_')) {
      const p = body.payment as Payment | undefined;
      if (!p?.id) return NextResponse.json({ ok: true });
      // Só pagamentos do nosso checkout ou da assinatura dele. Depósito na conta, cobrança avulsa
      // feita no painel etc. chegam com o mesmo cliente e não podem virar receita/comissão.
      const known = p.checkoutSession || p.subscription || p.installment || p.externalReference;
      if (!known) return NextResponse.json({ ok: true, ignored: 'not_from_checkout' });
      const row = await findRow({ checkoutId: p.checkoutSession, subscription: p.subscription, externalReference: p.externalReference });
      if (!row) return NextResponse.json({ ok: true, unmatched: true });
      if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
        // CONFIRMED (cartão) e RECEIVED (Pix / dinheiro na conta) podem chegar os dois: roda uma vez por cobrança.
        await handlePaymentPaid(row, p);
        return NextResponse.json({ ok: true });
      }
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (p.subscription && !row.asaas_subscription_id) patch.asaas_subscription_id = p.subscription;
      if (!row.asaas_customer_id) patch.asaas_customer_id = p.customer;
      if (event === 'PAYMENT_REFUNDED') patch.refunded_at = new Date().toISOString();
      await supabase.from('asaas_checkouts').update(patch as never).eq('id', row.id);

      // Cartão recusado (renovação ou 1ª cobrança depois do teste): aviso com a nossa marca.
      if (event === 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED' || event === 'PAYMENT_OVERDUE') {
        await sendPaymentFailed(row.id, p).catch(e => console.warn('[webhooks/asaas] aviso de cobrança recusada:', e instanceof Error ? e.message : e));
      }
      if (event === 'PAYMENT_REFUNDED' || event === 'PAYMENT_CHARGEBACK_REQUESTED' || event === 'PAYMENT_CHARGEBACK_DISPUTE') {
        if (!row.sandbox) await recordAsaasRevenue('REFUND', row, p);
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
        await sendCancelledNotice(row.id, s.id).catch(e => console.warn('[webhooks/asaas] aviso de cancelamento:', e instanceof Error ? e.message : e));
      }
      return NextResponse.json({ ok: true });
    }
  } catch (e) {
    console.error('[webhooks/asaas]', event, e);
    await logOpsError('webhook', `/api/webhooks/asaas (${event})`, e, { eventId });
    // Libera o evento para o Asaas reenviar.
    await supabase.from('asaas_events').delete().eq('id', eventId);
    return NextResponse.json({ error: 'processing_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
