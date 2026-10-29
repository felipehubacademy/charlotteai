// lib/web-checkout.ts — preparação da assinatura pelo site, igual para o checkout do Asaas (página
// deles) e para o checkout próprio (cartão e Pix no queizy.com): valida o formulário, limita robôs,
// acha ou cria a conta e calcula cupom, desconto do afiliado e teste grátis.
import type { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { attributeUser, cleanAffiliateCode } from '@/lib/affiliates';
import {
  WEB_TRIAL_DAYS, resolveCoupon, COUPON_ERROR_PT, type WebPlan, priceForMethod, planOfMethod, methodHasTrial,
  type PayMethod, validCpf, type CheckoutCustomerData, type PayerData, type CouponResult,
} from '@/lib/asaas';
import { lookupCep } from '@/lib/cep';

// Proteção contra robôs: cada envio cria uma conta. Até 10 envios por endereço a cada 10 minutos
// (folga para família ou empresa no mesmo Wi-Fi; robô passa disso em segundos).
const ATTEMPTS_PER_IP = 10;
const ATTEMPTS_WINDOW_MS = 10 * 60000;

type UserRow = {
  id: string; email: string; subscription_status: string | null; trial_ends_at: string | null;
  subscription_product: string | null; subscription_expires_at: string | null; is_institutional: boolean | null;
};
const USER_COLS = 'id, email, subscription_status, trial_ends_at, subscription_product, subscription_expires_at, is_institutional';

export interface CheckoutContext {
  method: PayMethod; plan: WebPlan; name: string; email: string; phone: string; cpf: string; ip: string | null;
  customerData: CheckoutCustomerData | null; // dados do pagador para a página do Asaas (null se o CEP falhou)
  payer: PayerData | null;                   // os mesmos dados para a cobrança pela API
  u: UserRow; isNewAccount: boolean; affiliate: { code: string; status: string; user_discount_pct: number } | null | undefined;
  coupon: CouponResult | null; affPct: number; couponPct: number; discountPct: number; couponWins: boolean;
  trialDays: number; value: number; recurring: boolean;
}
type Fail = { ok: false; error: string; status: number };
const fail = (body: { error: string }, status: number): Fail => ({ ok: false, error: body.error, status });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function prepareWebCheckout(req: NextRequest, body: any): Promise<Fail | { ok: true; ctx: CheckoutContext }> {
  const supabase = getSupabaseAdmin();
  const METHODS: PayMethod[] = ['monthly', 'annual', 'annual_pix']; // 12x saiu em 2026-10-14: quer parcelar, vai no Mensal
  const method: PayMethod | null = METHODS.includes(body.method) ? body.method : METHODS.includes(body.plan) ? body.plan : null;
  const plan: WebPlan | null = method ? planOfMethod(method) : null;
  const name = String(body.name ?? '').trim().slice(0, 100);
  const email = String(body.email ?? '').trim().toLowerCase();
  const phone = String(body.phone ?? '').replace(/\D/g, '');
  if (!plan) return fail({ error: 'Escolha um plano.' }, 400);
  if (name.split(/\s+/).length < 2) return fail({ error: 'Informe nome e sobrenome.' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail({ error: 'Confira o e-mail.' }, 400);
  const cpf = String(body.cpf ?? '').replace(/\D/g, '');
  if (!validCpf(cpf)) return fail({ error: 'Confira o CPF.' }, 400);
  if (phone.length < 10 || phone.length > 11) return fail({ error: 'Confira o celular, com DDD.' }, 400);
  const addrNumber = String(body.number ?? '').trim().slice(0, 10);
  if (!addrNumber) return fail({ error: 'Informe o número do endereço (ou S/N).' }, 400);
  // Endereço pelo CEP. Se a consulta falhar, segue sem os dados: a página de pagamento pede o que faltar.
  const cepInfo = await lookupCep(String(body.cep ?? ''));
  if (!cepInfo && String(body.cep ?? '').replace(/\D/g, '').length !== 8) return fail({ error: 'Confira o CEP.' }, 400);
  const street = (cepInfo?.street || String(body.street ?? '').trim()).slice(0, 120);
  const customerData: CheckoutCustomerData | null = cepInfo && street ? {
    name, cpfCnpj: cpf, email, phone, postalCode: cepInfo.cep, address: street, addressNumber: addrNumber,
    complement: String(body.complement ?? '').trim().slice(0, 60) || undefined,
    province: cepInfo.district || 'Centro', city: cepInfo.ibge,
  } : null;

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null;
  if (ip) {
    const { count } = await supabase.from('checkout_attempts').select('id', { count: 'exact', head: true })
      .eq('ip', ip).gte('created_at', new Date(Date.now() - ATTEMPTS_WINDOW_MS).toISOString());
    if ((count ?? 0) >= ATTEMPTS_PER_IP) {
      return fail({ error: 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.' }, 429);
    }
    await supabase.from('checkout_attempts').insert({ ip, email } as never);
  }

  // Conta: acha pelo e-mail ou cria (sem senha; ela é criada pelo link que chega no e-mail).
  let { data: user } = await supabase.from('charlotte_users').select(USER_COLS).ilike('email', email).maybeSingle();
  let isNewAccount = false;
  if (!user) {
    const { data: created, error } = await supabase.auth.admin.createUser({ email, email_confirm: true, user_metadata: { name } });
    if (error || !created?.user) {
      return fail({ error: 'Não foi possível criar a conta com esse e-mail.' }, 400);
    }
    isNewAccount = true;
    ({ data: user } = await supabase.from('charlotte_users').select(USER_COLS).eq('id', created.user.id).maybeSingle());
    if (!user) return fail({ error: 'Conta criada, mas ainda indisponível. Tente de novo em instantes.' }, 503);
  }
  const u = user as unknown as UserRow;

  if (u.is_institutional) return fail({ error: 'Essa conta já tem acesso pela instituição.' }, 400);
  const stillValid = !!u.subscription_expires_at && new Date(u.subscription_expires_at).getTime() > Date.now();
  if ((u.subscription_status === 'active' || u.subscription_status === 'cancelled') && stillValid) {
    return fail({ error: 'Essa conta já tem uma assinatura ativa. É só entrar no app.' }, 409);
  }

  // Cupom: de campanha ou código de afiliado (que também marca a conta para a comissão).
  const coupon = body.coupon ? await resolveCoupon(body.coupon) : null;
  if (coupon && !coupon.ok) return fail({ error: COUPON_ERROR_PT[coupon.error] }, 400);

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
  const couponWins = couponPct > 0 && couponPct >= affPct && !!coupon?.ok;
  const recurring = method === 'monthly' || method === 'annual';
  const payer: PayerData | null = customerData ? {
    name, cpfCnpj: cpf, email, phone, postalCode: customerData.postalCode, address: customerData.address,
    addressNumber: customerData.addressNumber, complement: customerData.complement, province: customerData.province,
  } : null;
  return { ok: true, ctx: {
    method: method!, plan, name, email, phone, cpf, ip, customerData, payer, u, isNewAccount, affiliate: a,
    coupon, affPct, couponPct, discountPct, couponWins, trialDays, value, recurring,
  } };
}

/** Campos comuns da linha em asaas_checkouts (afiliado, cupom, aceite de cookies para a conversão). */
export function checkoutRowFields(ctx: CheckoutContext, req: NextRequest) {
  const { coupon, couponWins, recurring, method, affPct } = ctx;
  return {
    user_id: ctx.u.id, plan: ctx.plan, method, value_brl: ctx.value, trial_days: ctx.trialDays,
    affiliate_code: ctx.affiliate?.code ?? null, created_account: ctx.isNewAccount,
    // Aceite de cookies + identificadores do navegador: base da conversão enviada pelo servidor.
    meta_tracking: {
      consent: req.cookies.get('qz_consent')?.value === 'all',
      fbp: req.cookies.get('_fbp')?.value ?? null, fbc: req.cookies.get('_fbc')?.value ?? null,
      ip: ctx.ip, ua: req.headers.get('user-agent'), url: req.headers.get('referer'),
      // Campanha do anúncio que trouxe a visita (cookie qz_utm, components/AdAttribution): teste A/B site x lojas.
      utm: (() => { try { return JSON.parse(decodeURIComponent(req.cookies.get('qz_utm')?.value ?? '')); } catch { return null; } })(),
    },
    coupon_code: couponWins && coupon?.ok ? coupon.code : null, discount_pct: ctx.discountPct,
    // Cupom com duração (ex.: só a 1ª cobrança): o webhook volta a assinatura para este valor
    // depois de N cobranças. Volta ao preço com o desconto do afiliado, se houver (esse é permanente).
    ...(couponWins && recurring && coupon?.ok && coupon.cycles ? { coupon_cycles: coupon.cycles, full_value_brl: priceForMethod(method, affPct) } : {}),
  };
}
