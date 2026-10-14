// /api/checkout/asaas — assinatura pelo site.
//   GET  ?aff=CODE                       preços (com o desconto do afiliado) e se o checkout está ligado
//   POST { plan, name, email, cpf, phone?, aff? }  cria (ou acha) a conta e devolve { url } do checkout do Asaas
//   POST { action: 'cancel' }  (Bearer do aluno)   cancela a assinatura mensal do site
// Conta nova: criada aqui pelo e-mail; depois do pagamento chega o e-mail para criar a senha.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { affiliateByCode, attributeUser, cleanAffiliateCode } from '@/lib/affiliates';
import {
  asaasConfigured, AsaasError, cancelSubscription, createCheckout, priceFor,
  validCpf, WEB_TRIAL_DAYS, type WebPlan,
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

export async function GET(req: NextRequest) {
  const d = await discountFor(cleanAffiliateCode(req.nextUrl.searchParams.get('aff')) || null);
  return NextResponse.json({
    enabled: asaasConfigured(),
    trialDays: WEB_TRIAL_DAYS,
    discountPct: d?.pct ?? 0,
    prices: { monthly: priceFor('monthly', d?.pct), annual: priceFor('annual', d?.pct) },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const supabase = getSupabaseAdmin();

  if (body.action === 'cancel') {
    const h = req.headers.get('authorization') ?? '';
    const { data: auth } = h.startsWith('Bearer ') ? await supabase.auth.getUser(h.slice(7)) : { data: null };
    const user = auth?.user;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: row } = await supabase.from('asaas_checkouts').select('asaas_subscription_id')
      .eq('user_id', user.id).eq('plan', 'monthly').not('asaas_subscription_id', 'is', null)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    const subId = (row as { asaas_subscription_id: string } | null)?.asaas_subscription_id;
    if (!subId) return NextResponse.json({ error: 'Assinatura não encontrada.' }, { status: 404 });
    try { await cancelSubscription(subId); } catch (e) {
      return NextResponse.json({ error: e instanceof AsaasError ? e.message : 'Não foi possível cancelar agora.' }, { status: 502 });
    }
    // Acesso segue até o fim do período pago (subscription_expires_at).
    await supabase.from('charlotte_users').update({ subscription_status: 'cancelled', updated_at: new Date().toISOString() } as never).eq('id', user.id);
    return NextResponse.json({ ok: true });
  }

  if (!asaasConfigured()) return NextResponse.json({ error: 'A assinatura pelo site abre em breve. Por enquanto, assine pelo app.' }, { status: 503 });

  const plan: WebPlan | null = body.plan === 'monthly' || body.plan === 'annual' ? body.plan : null;
  const name = String(body.name ?? '').trim().slice(0, 100);
  const email = String(body.email ?? '').trim().toLowerCase();
  const cpf = String(body.cpf ?? '').replace(/\D/g, '');
  const phone = String(body.phone ?? '').replace(/\D/g, '');
  if (!plan) return NextResponse.json({ error: 'Escolha um plano.' }, { status: 400 });
  if (name.split(/\s+/).length < 2) return NextResponse.json({ error: 'Informe nome e sobrenome.' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ error: 'Confira o e-mail.' }, { status: 400 });
  if (!validCpf(cpf)) return NextResponse.json({ error: 'Confira o CPF.' }, { status: 400 });

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

  // Afiliado: marca a conta (o primeiro link vale) e usa o desconto do afiliado da conta.
  const affCode = cleanAffiliateCode(body.aff) || null;
  if (affCode) await attributeUser(u.id, affCode, 'link').catch(() => null);
  const { data: attr } = await supabase.from('affiliate_attributions').select('affiliates(code, status, user_discount_pct)').eq('user_id', u.id).maybeSingle();
  const a = (attr as { affiliates: { code: string; status: string; user_discount_pct: number } | null } | null)?.affiliates;
  const discountPct = a && a.status === 'active' ? Number(a.user_discount_pct) || 0 : 0;

  // 7 dias grátis só no mensal e só para quem nunca teve teste nem assinatura.
  const { count: paidBefore } = await supabase.from('asaas_checkouts').select('id', { count: 'exact', head: true }).eq('user_id', u.id).eq('status', 'paid');
  const neverTried = (!u.subscription_status || u.subscription_status === 'none') && !u.trial_ends_at && !paidBefore;
  const trialDays = plan === 'monthly' && neverTried ? WEB_TRIAL_DAYS : 0;
  const value = priceFor(plan, discountPct);

  try {
    const checkout = await createCheckout({ plan, value, trialDays, userId: u.id, customer: { name, email, cpfCnpj: cpf, phone: phone || undefined } });
    await supabase.from('asaas_checkouts').insert({
      id: checkout.id, user_id: u.id, plan, value_brl: value, trial_days: trialDays,
      affiliate_code: a?.code ?? null, status: 'created',
    } as never);
    return NextResponse.json({ url: checkout.link, trialDays, value, isNewAccount });
  } catch (e) {
    console.error('[checkout/asaas] create failed:', e instanceof AsaasError ? e.body : e);
    return NextResponse.json({ error: e instanceof AsaasError ? e.message : 'Não foi possível abrir o pagamento agora.' }, { status: 502 });
  }
}
