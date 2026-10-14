// /api/checkout/asaas — assinatura pelo site.
//   GET  ?aff=CODE                       preços (com o desconto do afiliado) e se o checkout está ligado
//   POST { method, name, email, phone?, aff?, coupon? }  cria (ou acha) a conta e devolve { url } do checkout do Asaas
//   POST { action: 'cancel' }  (Bearer do aluno)   cancela a renovação (mensal ou anual no cartão)
//   POST { action: 'refund' }  (Bearer do aluno)   reembolso em até 7 dias do 1º pagamento (Pix, 12x ou cartão)
// Conta nova: criada aqui pelo e-mail; depois do pagamento chega o e-mail para criar a senha.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { affiliateByCode, attributeUser, cleanAffiliateCode } from '@/lib/affiliates';
import {
  asaasConfigured, AsaasError, cancelSubscription, createCheckout, priceFor,
  WEB_TRIAL_DAYS, resolveCoupon, COUPON_ERROR_PT, type WebPlan,
  priceForMethod, planOfMethod, methodHasTrial, type PayMethod,
  refundPayment, refundInstallment, REFUND_WINDOW_DAYS,
} from '@/lib/asaas';

export const dynamic = 'force-dynamic';

type UserRow = {
  id: string; email: string; subscription_status: string | null; trial_ends_at: string | null;
  subscription_product: string | null; subscription_expires_at: string | null; is_institutional: boolean | null;
};
const USER_COLS = 'id, email, subscription_status, trial_ends_at, subscription_product, subscription_expires_at, is_institutional';

async function discountFor(code: string | null): Promise<{ code: string; pct: number } | null> {
  if (!code) return null;
  const aff = await affiliateByCode(code);
  if (!aff || aff.status !== 'active') return null;
  return { code: aff.code, pct: Number(aff.user_discount_pct) || 0 };
}

//   GET ?aff=CODE&coupon=CODE  preços com o melhor desconto (afiliado do link ou cupom); não acumula
export async function GET(req: NextRequest) {
  const d = await discountFor(cleanAffiliateCode(req.nextUrl.searchParams.get('aff')) || null);
  const couponRaw = req.nextUrl.searchParams.get('coupon');
  const c = couponRaw ? await resolveCoupon(couponRaw) : null;
  const pctFor = (plan: WebPlan) => Math.max(d?.pct ?? 0, c?.ok && c.plans.includes(plan) ? c.pct : 0);
  return NextResponse.json({
    enabled: asaasConfigured(),
    trialDays: WEB_TRIAL_DAYS,
    discountPct: Math.max(pctFor('monthly'), pctFor('annual')),
    coupon: c ? (c.ok ? { ok: true, code: c.code, pct: c.pct, plans: c.plans } : { ok: false, error: COUPON_ERROR_PT[c.error] }) : null,
    prices: {
      monthly: priceFor('monthly', pctFor('monthly')), annual: priceFor('annual', pctFor('annual')),
      annual_12x: priceForMethod('annual_12x', pctFor('annual')),
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const supabase = getSupabaseAdmin();

  if (body.action === 'refund') {
    const h = req.headers.get('authorization') ?? '';
    const { data: auth } = h.startsWith('Bearer ') ? await supabase.auth.getUser(h.slice(7)) : { data: null };
    const user = auth?.user;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: row } = await supabase.from('asaas_checkouts')
      .select('id, asaas_payment_id, asaas_installment_id, asaas_subscription_id, paid_at, refunded_at')
      .eq('user_id', user.id).not('paid_at', 'is', null).order('paid_at', { ascending: false }).limit(1).maybeSingle();
    const r = row as { id: string; asaas_payment_id: string | null; asaas_installment_id: string | null; asaas_subscription_id: string | null; paid_at: string; refunded_at: string | null } | null;
    if (!r?.asaas_payment_id) return NextResponse.json({ error: 'not_found', message: 'Ainda não houve cobrança nesta conta. Se você está no teste grátis, é só cancelar a renovação: nada será cobrado.' }, { status: 404 });
    if (r.refunded_at) return NextResponse.json({ error: 'already', message: 'Esse pagamento já foi reembolsado.' }, { status: 409 });
    const days = (Date.now() - new Date(r.paid_at).getTime()) / 86400000;
    if (days > REFUND_WINDOW_DAYS) {
      return NextResponse.json({ error: 'expired', message: `O prazo de ${REFUND_WINDOW_DAYS} dias para o reembolso terminou. Se precisar, escreva para suporte@queizy.com.` }, { status: 400 });
    }
    try {
      if (r.asaas_installment_id) await refundInstallment(r.asaas_installment_id);
      else await refundPayment(r.asaas_payment_id);
      if (r.asaas_subscription_id) await cancelSubscription(r.asaas_subscription_id).catch(() => {});
    } catch (e) {
      console.error('[checkout/asaas] refund failed:', e instanceof AsaasError ? e.body : e);
      return NextResponse.json({ error: 'failed', message: 'Não foi possível reembolsar agora. Escreva para suporte@queizy.com que resolvemos.' }, { status: 502 });
    }
    // O webhook PAYMENT_REFUNDED encerra o acesso e estorna receita e comissão.
    await supabase.from('asaas_checkouts').update({ refunded_at: new Date().toISOString() } as never).eq('id', r.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'cancel') {
    const h = req.headers.get('authorization') ?? '';
    const { data: auth } = h.startsWith('Bearer ') ? await supabase.auth.getUser(h.slice(7)) : { data: null };
    const user = auth?.user;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: row } = await supabase.from('asaas_checkouts').select('asaas_subscription_id')
      .eq('user_id', user.id).eq('status', 'paid').not('asaas_subscription_id', 'is', null)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    const subId = (row as { asaas_subscription_id: string } | null)?.asaas_subscription_id;
    // Pix e parcelado não renovam sozinhos: não há o que cancelar.
    if (!subId) return NextResponse.json({ ok: true, noRenewal: true });
    try { await cancelSubscription(subId); } catch (e) {
      return NextResponse.json({ error: e instanceof AsaasError ? e.message : 'Não foi possível cancelar agora.' }, { status: 502 });
    }
    // Acesso segue até o fim do período pago (subscription_expires_at).
    await supabase.from('charlotte_users').update({ subscription_status: 'cancelled', updated_at: new Date().toISOString() } as never).eq('id', user.id);
    return NextResponse.json({ ok: true });
  }

  if (!asaasConfigured()) return NextResponse.json({ error: 'A assinatura pelo site abre em breve. Por enquanto, assine pelo app.' }, { status: 503 });

  const METHODS: PayMethod[] = ['monthly', 'annual', 'annual_pix', 'annual_12x'];
  const method: PayMethod | null = METHODS.includes(body.method) ? body.method : METHODS.includes(body.plan) ? body.plan : null;
  const plan: WebPlan | null = method ? planOfMethod(method) : null;
  const name = String(body.name ?? '').trim().slice(0, 100);
  const email = String(body.email ?? '').trim().toLowerCase();
  const phone = String(body.phone ?? '').replace(/\D/g, '');
  if (!plan) return NextResponse.json({ error: 'Escolha um plano.' }, { status: 400 });
  if (name.split(/\s+/).length < 2) return NextResponse.json({ error: 'Informe nome e sobrenome.' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ error: 'Confira o e-mail.' }, { status: 400 });

  // Conta: acha pelo e-mail ou cria (sem senha; ela é criada pelo link que chega no e-mail).
  let { data: user } = await supabase.from('charlotte_users').select(USER_COLS).ilike('email', email).maybeSingle();
  let isNewAccount = false;
  if (!user) {
    const { data: created, error } = await supabase.auth.admin.createUser({ email, email_confirm: true, user_metadata: { name } });
    if (error || !created?.user) {
      return NextResponse.json({ error: 'Não foi possível criar a conta com esse e-mail.' }, { status: 400 });
    }
    isNewAccount = true;
    ({ data: user } = await supabase.from('charlotte_users').select(USER_COLS).eq('id', created.user.id).maybeSingle());
    if (!user) return NextResponse.json({ error: 'Conta criada, mas ainda indisponível. Tente de novo em instantes.' }, { status: 503 });
  }
  const u = user as unknown as UserRow;

  if (u.is_institutional) return NextResponse.json({ error: 'Essa conta já tem acesso pela instituição.' }, { status: 400 });
  const stillValid = !!u.subscription_expires_at && new Date(u.subscription_expires_at).getTime() > Date.now();
  if ((u.subscription_status === 'active' || u.subscription_status === 'cancelled') && stillValid) {
    return NextResponse.json({ error: 'Essa conta já tem uma assinatura ativa. É só entrar no app.' }, { status: 409 });
  }

  // Cupom: de campanha ou código de afiliado (que também marca a conta para a comissão).
  const coupon = body.coupon ? await resolveCoupon(body.coupon) : null;
  if (coupon && !coupon.ok) return NextResponse.json({ error: COUPON_ERROR_PT[coupon.error] }, { status: 400 });

  // Afiliado: marca a conta (o primeiro link vale) e usa o desconto do afiliado da conta.
  const affCode = cleanAffiliateCode(body.aff) || (coupon?.ok && coupon.kind === 'affiliate' ? coupon.affiliateCode! : null);
  if (affCode) await attributeUser(u.id, affCode, 'link').catch(() => null);
  const { data: attr } = await supabase.from('affiliate_attributions').select('affiliates(code, status, user_discount_pct)').eq('user_id', u.id).maybeSingle();
  const a = (attr as { affiliates: { code: string; status: string; user_discount_pct: number } | null } | null)?.affiliates;
  const affPct = a && a.status === 'active' ? Number(a.user_discount_pct) || 0 : 0;
  const couponPct = coupon?.ok && coupon.kind === 'coupon' && coupon.plans.includes(plan) ? coupon.pct : 0;
  const discountPct = Math.max(affPct, couponPct); // não acumula: vale o maior

  // 7 dias grátis no cartão (mensal ou anual) e só para quem nunca teve teste nem assinatura.
  const { count: paidBefore } = await supabase.from('asaas_checkouts').select('id', { count: 'exact', head: true }).eq('user_id', u.id).eq('status', 'paid');
  const neverTried = (!u.subscription_status || u.subscription_status === 'none') && !u.trial_ends_at && !paidBefore;
  const trialDays = methodHasTrial(method!) && neverTried ? WEB_TRIAL_DAYS : 0;
  const value = priceForMethod(method!, discountPct);

  try {
    // CPF, endereço e cartão ficam na página do Asaas (o checkout dele exige os dados completos
    // do pagador). Aqui só nome e e-mail, para a conta do app; o pagamento é ligado à conta pelo
    // id do checkout e pelo externalReference. Se a conta já tem cliente no Asaas, reaproveita.
    const { data: prevC } = await supabase.from('asaas_checkouts').select('asaas_customer_id')
      .eq('user_id', u.id).eq('status', 'paid').not('asaas_customer_id', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle();
    const customerId = (prevC as { asaas_customer_id: string } | null)?.asaas_customer_id ?? null;
    const checkout = await createCheckout({ method: method!, value, trialDays, userId: u.id, customerId });
    await supabase.from('asaas_checkouts').insert({
      id: checkout.id, user_id: u.id, plan, method, value_brl: value, trial_days: trialDays, asaas_customer_id: customerId,
      affiliate_code: a?.code ?? null, status: 'created',
      coupon_code: couponPct > 0 && couponPct >= affPct && coupon?.ok ? coupon.code : null, discount_pct: discountPct,
    } as never);
    return NextResponse.json({ url: checkout.link, trialDays, value, isNewAccount });
  } catch (e) {
    console.error('[checkout/asaas] create failed:', e instanceof AsaasError ? e.body : e);
    return NextResponse.json({ error: e instanceof AsaasError ? e.message : 'Não foi possível abrir o pagamento agora.' }, { status: 502 });
  }
}
