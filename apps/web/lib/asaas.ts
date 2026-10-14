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
export type WebPlan = keyof typeof ASAAS_PRICES;

const SITE = 'https://queizy.com';

export type CouponResult =
  | { ok: true; code: string; pct: number; kind: 'coupon' | 'affiliate'; plans: WebPlan[]; affiliateCode?: string }
  | { ok: false; error: 'not_found' | 'expired' | 'used_up' | 'inactive' };

/** Confere o cupom: primeiro cupom de campanha (tabela coupons), depois código de afiliado. */
export async function resolveCoupon(raw: unknown): Promise<CouponResult> {
  const code = String(raw ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!code) return { ok: false, error: 'not_found' };
  const { getSupabaseAdmin } = await import('@/lib/supabase-admin');
  const supabase = getSupabaseAdmin();
  const { data: c } = await supabase.from('coupons').select('*').eq('code', code).maybeSingle();
  const row = c as { code: string; discount_pct: number; plans: string[]; active: boolean; expires_at: string | null; max_uses: number | null } | null;
  if (row) {
    if (!row.active) return { ok: false, error: 'inactive' };
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return { ok: false, error: 'expired' };
    if (row.max_uses != null) {
      const { count } = await supabase.from('asaas_checkouts').select('id', { count: 'exact', head: true }).eq('coupon_code', code).eq('status', 'paid');
      if ((count ?? 0) >= row.max_uses) return { ok: false, error: 'used_up' };
    }
    return { ok: true, code, pct: row.discount_pct, kind: 'coupon', plans: (row.plans ?? ['monthly', 'annual']) as WebPlan[] };
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

export interface CheckoutInput {
  plan: WebPlan;
  value: number;
  trialDays: number;       // só no mensal
  userId: string;
  customer: { name: string; email: string; cpfCnpj: string; phone?: string };
}

export interface AsaasCheckout { id: string; link: string | null; status: string }

export async function createCheckout(input: CheckoutInput): Promise<AsaasCheckout> {
  const image = await itemImage();
  const isMonthly = input.plan === 'monthly';
  const now = new Date();
  const firstCharge = new Date(now.getTime() + input.trialDays * 86400000);
  const body: Record<string, unknown> = {
    billingTypes: isMonthly ? ['CREDIT_CARD'] : ['CREDIT_CARD', 'PIX'],
    chargeTypes: isMonthly ? ['RECURRENT'] : ['DETACHED', 'INSTALLMENT'],
    minutesToExpire: 120,
    externalReference: input.userId,
    callback: {
      successUrl: `${SITE}/assinar/sucesso`,
      cancelUrl: `${SITE}/assinar?cancelado=1`,
      expiredUrl: `${SITE}/assinar?expirado=1`,
    },
    items: [{
      name: isMonthly ? 'Queizy Mensal' : 'Queizy Anual',
      description: isMonthly
        ? (input.trialDays > 0 ? `${input.trialDays} dias grátis, depois cobrança mensal no cartão` : 'Assinatura mensal no cartão')
        : 'Acesso completo por 12 meses',
      quantity: 1,
      value: input.value,
      imageBase64: image,
    }],
    customerData: {
      name: input.customer.name,
      email: input.customer.email,
      cpfCnpj: input.customer.cpfCnpj,
      ...(input.customer.phone ? { phone: input.customer.phone } : {}),
    },
  };
  if (isMonthly) {
    body.subscription = { cycle: 'MONTHLY', nextDueDate: ymd(firstCharge) };
  } else {
    body.installment = { maxInstallmentCount: ANNUAL_MAX_INSTALLMENTS };
  }
  const r = await asaas<AsaasCheckout>('/checkouts', { method: 'POST', body });
  return { id: r.id, link: r.link ?? `https://www.asaas.com/checkoutSession/show?id=${r.id}`, status: r.status };
}

export interface AsaasCustomer { id: string; email: string | null; name: string; cpfCnpj: string | null }
export const getCustomer = (id: string) => asaas<AsaasCustomer>(`/customers/${id}`);

export interface AsaasSubscription { id: string; customer: string; status: string; nextDueDate: string; value: number; cycle: string; externalReference?: string | null; checkoutSession?: string | null }
export const getSubscription = (id: string) => asaas<AsaasSubscription>(`/subscriptions/${id}`);
export const cancelSubscription = (id: string) => asaas<{ deleted: boolean }>(`/subscriptions/${id}`, { method: 'DELETE' });

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
