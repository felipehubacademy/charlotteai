// lib/asaas.ts — assinatura pelo site (queizy.com/assinar) com o Asaas.
//
// Modelo (decidido em 2026-10-14):
//   - Mensal: cartão de crédito com recorrência, 7 dias grátis para quem nunca assinou
//     (o Asaas valida o cartão no checkout e faz a 1ª cobrança no 8º dia).
//   - Anual: Pix à vista ou cartão em até 12x, pago na hora (sem teste: Pix não tem cobrança
//     automática). Vale o direito de arrependimento de 7 dias.
//   - Desconto do afiliado (user_discount_pct) aplicado direto no preço.
// O cartão é digitado na página do próprio Asaas (checkout hospedado): nada de dado de cartão aqui.
//
// Env: ASAAS_API_KEY (obrigatória), ASAAS_WEBHOOK_TOKEN (token do webhook configurado no Asaas),
//      ASAAS_ENV = 'sandbox' para testar (padrão: produção).

export const ASAAS_PRICES = { monthly: 29.99, annual: 199.99 } as const;
export const WEB_TRIAL_DAYS = 7;
export const ANNUAL_MAX_INSTALLMENTS = 12;
export const WEB_PRODUCT = { monthly: 'web_monthly', annual: 'web_annual' } as const;
/** Produto gravado na conta: o anual no Pix fica separado (não renova, não tem o que cancelar). */
export const WEB_ANNUAL_PIX = 'web_annual_pix';
export type WebPlan = keyof typeof ASAAS_PRICES;

const SITE = 'https://queizy.com';

export type CouponResult =
  | { ok: true; code: string; pct: number; kind: 'coupon' | 'affiliate'; plans: WebPlan[]; affiliateCode?: string; cycles?: number | null }
  | { ok: false; error: 'not_found' | 'expired' | 'used_up' | 'inactive' | 'not_started' };

/** Confere o cupom: primeiro cupom de campanha (tabela coupons), depois código de afiliado. */
export async function resolveCoupon(raw: unknown): Promise<CouponResult> {
  const code = String(raw ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!code) return { ok: false, error: 'not_found' };
  const { getSupabaseAdmin } = await import('@/lib/supabase-admin');
  const supabase = getSupabaseAdmin();
  const { data: c } = await supabase.from('coupons').select('*').eq('code', code).maybeSingle();
  const row = c as { code: string; discount_pct: number; plans: string[]; active: boolean; starts_at: string | null; expires_at: string | null; max_uses: number | null; duration_cycles: number | null } | null;
  if (row) {
    if (!row.active) return { ok: false, error: 'inactive' };
    if (row.starts_at && new Date(row.starts_at).getTime() > Date.now()) return { ok: false, error: 'not_started' };
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return { ok: false, error: 'expired' };
    if (row.max_uses != null) {
      const { count } = await supabase.from('asaas_checkouts').select('id', { count: 'exact', head: true }).eq('coupon_code', code).eq('status', 'paid');
      if ((count ?? 0) >= row.max_uses) return { ok: false, error: 'used_up' };
    }
    // duration_cycles: quantas cobranças levam o desconto (null = todas). Depois o webhook volta ao preço cheio.
    return { ok: true, code, pct: row.discount_pct, kind: 'coupon', plans: (row.plans ?? ['monthly', 'annual']) as WebPlan[], cycles: row.duration_cycles ?? null };
  }
  const { data: a } = await supabase.from('affiliates').select('code, status, user_discount_pct').eq('code', code).maybeSingle();
  const aff = a as { code: string; status: string; user_discount_pct: number } | null;
  if (aff) {
    if (aff.status !== 'active') return { ok: false, error: 'inactive' };
    return { ok: true, code, pct: Number(aff.user_discount_pct) || 0, kind: 'affiliate', plans: ['monthly', 'annual'], affiliateCode: aff.code };
  }
  return { ok: false, error: 'not_found' };
}

export const COUPON_ERROR_PT: Record<string, string> = {
  not_found: 'Cupom não encontrado.',
  expired:   'Esse cupom expirou.',
  used_up:   'Esse cupom já foi usado o máximo de vezes.',
  inactive:  'Esse cupom não está ativo.',
  not_started: 'Esse cupom ainda não está valendo.',
};

export function asaasConfigured(): boolean {
  return !!process.env.ASAAS_API_KEY;
}

function baseUrl(): string {
  return process.env.ASAAS_ENV === 'sandbox' ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3';
}

export class AsaasError extends Error {
  constructor(message: string, public status: number, public body: unknown) { super(message); }
}

async function asaas<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new AsaasError('ASAAS_API_KEY ausente', 503, null);
  const res = await fetch(`${baseUrl()}${path}`, {
    method: init.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Queizy', access_token: key },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
  const text = await res.text();
  const json = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!res.ok) {
    const msg = (json as { errors?: { description?: string }[] })?.errors?.[0]?.description ?? `Asaas ${res.status}`;
    throw new AsaasError(msg, res.status, json);
  }
  return json as T;
}

// O checkout do Asaas exige uma imagem por item: usa o ícone do app (cacheado no módulo).
let iconB64: string | null = null;
async function itemImage(): Promise<string> {
  if (iconB64) return iconB64;
  const res = await fetch(`${SITE}/icon.png`);
  iconB64 = Buffer.from(await res.arrayBuffer()).toString('base64');
  return iconB64;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const round2 = (n: number) => Math.round(n * 100) / 100;

export function priceFor(plan: WebPlan, discountPct = 0): number {
  return round2(ASAAS_PRICES[plan] * (1 - Math.max(0, Math.min(50, discountPct)) / 100));
}

// Formas de pagamento no site.
//   monthly      cartão, recorrente mensal, 7 dias grátis (quem nunca assinou)
//   annual       cartão, recorrente anual, 7 dias grátis (quem nunca assinou), cobrança em 1x
//   annual_pix   Pix à vista (sem teste: Pix não tem cobrança automática), garantia de 7 dias
//   annual_12x   cartão parcelado em até 12x, pago na hora; a taxa do parcelamento vai no preço
export type PayMethod = 'monthly' | 'annual' | 'annual_pix' | 'annual_12x';
export const planOfMethod = (m: PayMethod): WebPlan => (m === 'monthly' ? 'monthly' : 'annual');
export const methodHasTrial = (m: PayMethod) => m === 'monthly' || m === 'annual';

// Taxa do Asaas no cartão de 7 a 12 parcelas (contrato da conta: 3,99% + R$ 0,49).
// Só o parcelado repassa a taxa; à vista, Pix e recorrente a Hub absorve.
export const INSTALLMENT_FEE_PCT = 3.99;
export const INSTALLMENT_FEE_FIXED = 0.49;
export function withInstallmentFee(value: number): number {
  return round2((value + INSTALLMENT_FEE_FIXED) / (1 - INSTALLMENT_FEE_PCT / 100));
}
export function priceForMethod(m: PayMethod, discountPct = 0): number {
  const base = priceFor(planOfMethod(m), discountPct);
  return m === 'annual_12x' ? withInstallmentFee(base) : base;
}

export interface CheckoutInput {
  method: PayMethod;
  value: number;
  trialDays: number;       // só monthly / annual
  userId: string;
  customerId: string | null; // cliente já criado no Asaas (evita o Asaas pedir endereço)
}

export interface AsaasCheckout { id: string; link: string | null; status: string }

export async function createCheckout(input: CheckoutInput): Promise<AsaasCheckout> {
  const image = await itemImage();
  const m = input.method;
  const firstCharge = new Date(Date.now() + input.trialDays * 86400000);
  const trialTxt = input.trialDays > 0 ? `${input.trialDays} dias grátis, depois ` : '';
  const desc: Record<PayMethod, string> = {
    monthly:    `${trialTxt}cobrança mensal no cartão`,
    annual:     `${trialTxt}cobrança anual no cartão, em 1x`,
    annual_pix: 'Acesso completo por 12 meses, pagamento único no Pix',
    annual_12x: 'Acesso completo por 12 meses, em até 12x no cartão',
  };
  const body: Record<string, unknown> = {
    billingTypes: m === 'annual_pix' ? ['PIX'] : ['CREDIT_CARD'],
    chargeTypes: m === 'monthly' || m === 'annual' ? ['RECURRENT'] : m === 'annual_12x' ? ['INSTALLMENT'] : ['DETACHED'],
    minutesToExpire: 120,
    externalReference: input.userId,
    callback: {
      successUrl: `${SITE}/assinar/sucesso`,
      cancelUrl: `${SITE}/assinar?cancelado=1`,
      expiredUrl: `${SITE}/assinar?expirado=1`,
    },
    items: [{
      name: m === 'monthly' ? 'Queizy Mensal' : 'Queizy Anual',
      description: desc[m],
      quantity: 1,
      value: input.value,
      imageBase64: image,
    }],
  };
  if (m === 'monthly' || m === 'annual') body.subscription = { cycle: m === 'monthly' ? 'MONTHLY' : 'YEARLY', nextDueDate: ymd(firstCharge) };
  if (m === 'annual_12x') body.installment = { maxInstallmentCount: ANNUAL_MAX_INSTALLMENTS };
  // Com o cliente já criado, o checkout não pede endereço. Se o Asaas recusar o campo,
  // cria sem cliente e a própria página do Asaas pede os dados.
  let r: AsaasCheckout;
  try {
    r = await asaas<AsaasCheckout>('/checkouts', { method: 'POST', body: input.customerId ? { ...body, customer: input.customerId } : body });
  } catch (e) {
    if (!input.customerId) throw e;
    console.warn('[asaas] checkout com cliente recusado, tentando sem:', e instanceof AsaasError ? e.body : e);
    // Guarda o motivo para diagnóstico (asaas_events, evento CHECKOUT_FALLBACK).
    try {
      const { getSupabaseAdmin } = await import('@/lib/supabase-admin');
      await getSupabaseAdmin().from('asaas_events').insert({ id: `fallback_${Date.now()}`, event: 'CHECKOUT_FALLBACK', payload: { error: e instanceof AsaasError ? e.body : String(e), method: m } } as never);
    } catch { /* só diagnóstico */ }
    r = await asaas<AsaasCheckout>('/checkouts', { method: 'POST', body });
  }
  return { id: r.id, link: r.link ?? `https://www.asaas.com/checkoutSession/show?id=${r.id}`, status: r.status };
}

/** Cria (ou reaproveita) o cliente no Asaas. Endereço não é obrigatório aqui. */
export async function ensureCustomer(c: { name: string; email: string; cpfCnpj: string; phone?: string; userId: string }): Promise<string> {
  const found = await asaas<{ data: { id: string }[] }>(`/customers?cpfCnpj=${encodeURIComponent(c.cpfCnpj)}&limit=1`).catch(() => ({ data: [] }));
  if (found.data?.[0]?.id) return found.data[0].id;
  const r = await asaas<{ id: string }>('/customers', {
    method: 'POST',
    body: { name: c.name, email: c.email, cpfCnpj: c.cpfCnpj, ...(c.phone ? { mobilePhone: c.phone } : {}), externalReference: c.userId },
  });
  return r.id;
}

export interface AsaasCustomer { id: string; email: string | null; name: string; cpfCnpj: string | null }
export const getCustomer = (id: string) => asaas<AsaasCustomer>(`/customers/${id}`);

export interface AsaasSubscription { id: string; customer: string; status: string; nextDueDate: string; value: number; cycle: string; externalReference?: string | null; checkoutSession?: string | null }
export const getSubscription = (id: string) => asaas<AsaasSubscription>(`/subscriptions/${id}`);
export const cancelSubscription = (id: string) => asaas<{ deleted: boolean }>(`/subscriptions/${id}`, { method: 'DELETE' });
/** 4 últimos dígitos do cartão de uma cobrança (null no Pix). Usado para conferir quem pagou. */
export async function getPaymentCard(paymentId: string): Promise<{ last4: string | null; billingType: string }> {
  const p = await asaas<{ billingType: string; creditCard?: { creditCardNumber?: string | null } | null }>(`/payments/${encodeURIComponent(paymentId)}`);
  const n = String(p.creditCard?.creditCardNumber ?? '').replace(/\D/g, '');
  return { last4: n ? n.slice(-4) : null, billingType: p.billingType };
}
/** Troca o e-mail do cliente no Asaas (recibos e avisos de cobrança vão para o e-mail certo). */
export const updateCustomerEmail = (customerId: string, email: string) =>
  asaas<AsaasCustomer>(`/customers/${encodeURIComponent(customerId)}`, { method: 'PUT', body: { email } });
/** Quantas cobranças da assinatura já foram pagas (confirmadas ou recebidas). */
export async function paidPaymentsOf(subscriptionId: string): Promise<number> {
  const r = await asaas<{ data: { status: string }[] }>(`/payments?subscription=${encodeURIComponent(subscriptionId)}&limit=100`);
  return (r.data ?? []).filter(p => ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes(p.status)).length;
}
/** Muda o valor das próximas cobranças da assinatura (fim do desconto do cupom). */
export const updateSubscriptionValue = (id: string, value: number) =>
  asaas<AsaasSubscription>(`/subscriptions/${id}`, { method: 'POST', body: { value, updatePendingPayments: true } });
export const refundPayment = (id: string) => asaas<{ id: string; status: string }>(`/payments/${id}/refund`, { method: 'POST', body: {} });
export const refundInstallment = (id: string) => asaas<{ id: string }>(`/installments/${id}/refund`, { method: 'POST', body: {} });
export const REFUND_WINDOW_DAYS = 7;

/** Valida CPF (dígitos verificadores). Aceita só números. */
export function validCpf(raw: string): boolean {
  const c = raw.replace(/\D/g, '');
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dv = (len: number) => {
    let s = 0;
    for (let i = 0; i < len; i++) s += Number(c[i]) * (len + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
}
