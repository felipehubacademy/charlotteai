// lib/admin-subscriptions.ts — regras únicas de assinatura do /admin (Métricas, Usuários e Visão geral).
//
//  - Equipe fora: e-mail felipe.xavier1987+, @hubacademybr.com, @queizy.com, hide_from_ranking ou is_institutional.
//  - Pagante = já houve cobrança (revenue_events sem REFUND e não reembolsada por inteiro, ou compra do site
//    já cobrada) e ainda tem acesso.
//  - Situação de cada conta com acesso: pagante da loja ou do site, teste da loja ou do site, teste antigo.
//  - Dias e semanas no calendário de Brasília (UTC-3, sem horário de verão).
//
// Sem dependências de servidor.
import { revenueAtMs } from '@/lib/revenue-day';

export const DAY = 86400000;
export const BRT = 3 * 3600000;
/** Índice do dia no calendário de Brasília. */
export const brtDay = (t: number) => Math.floor((t - BRT) / DAY);
/** 00h de Brasília do dia de índice idx, em ms UTC. */
export const brtDayStart = (idx: number) => idx * DAY + BRT;
/** YYYY-MM-DD do dia de índice idx. */
export const dayKey = (idx: number) => new Date(idx * DAY).toISOString().slice(0, 10);
export const ms = (s: string | null | undefined) => (s ? new Date(s).getTime() : NaN);

// Preços atuais (R$) da loja; no site vale o valor de cada compra (com cupom).
export const MONTHLY_PRICE_BRL = 29.99;
export const YEARLY_PRICE_BRL  = 199.99;

/** E-mail da equipe (mesmo padrão de release-broadcast). */
export const TEAM_EMAIL = (e: string | null | undefined) =>
  !!e && (/@(hubacademybr\.com|queizy\.com)$/i.test(e) || /^felipe\.xavier1987\+/i.test(e));
/** Conta da equipe: fica fora de todos os números de negócio. */
export const isTeamAccount = (u: { email?: string | null; is_institutional?: boolean | null; hide_from_ranking?: boolean | null }) =>
  !!(u.is_institutional || u.hide_from_ranking || TEAM_EMAIL(u.email));

export const isStoreProduct  = (p: string | null | undefined) => p === 'monthly' || p === 'yearly';
export const isSiteProduct   = (p: string | null | undefined) => !!p && p.startsWith('web_');
/** web_annual, web_annual_pix, web_annual_12x e o anual da loja. */
export const isAnnualProduct = (p: string | null | undefined) => p === 'yearly' || !!p?.startsWith('web_annual');

export type ChargeRevRow = { app_user_id: string; event_type: string; store?: string | null; price_purchased: number | null; purchased_at: string | null };
export type ChargeCkRow = {
  user_id: string; value_brl: number; trial_days: number | null; status: string;
  asaas_payment_id: string | null; paid_at: string | null; refunded_at: string | null; created_at: string;
};

/**
 * 1ª cobrança de cada conta (ms) e a última compra concluída do site (sem reembolso).
 * revenue_events: loja e site (cobrança do site só com data vale para o próprio dia);
 * asaas_checkouts (só os de produção): compras do site já cobradas.
 */
export function chargeIndex<C extends ChargeCkRow>(rev: ChargeRevRow[], checkouts: C[]) {
  // Compra reembolsada por inteiro não conta como cobrança.
  const purchases = new Map<string, number>();
  const refunds = new Map<string, number>();
  for (const r of rev) {
    const uid = String(r.app_user_id);
    if (r.event_type === 'REFUND') refunds.set(uid, (refunds.get(uid) ?? 0) + 1);
    else if (Number(r.price_purchased) > 0) purchases.set(uid, (purchases.get(uid) ?? 0) + 1);
  }
  const fullyRefunded = (uid: string) => (refunds.get(uid) ?? 0) > 0 && (refunds.get(uid) ?? 0) >= (purchases.get(uid) ?? 0);

  const firstChargeAt = new Map<string, number>();
  const noteCharge = (uid: string, t: number) => {
    if (!Number.isFinite(t)) return;
    const cur = firstChargeAt.get(uid);
    if (cur == null || t < cur) firstChargeAt.set(uid, t);
  };
  for (const r of rev) {
    const uid = String(r.app_user_id);
    if (r.event_type === 'REFUND' || !(Number(r.price_purchased) > 0) || fullyRefunded(uid)) continue;
    noteCharge(uid, revenueAtMs(r));
  }
  const siteCk = new Map<string, C>(); // última compra concluída no site (sem reembolso)
  for (const c of checkouts) {
    if (c.status !== 'paid' || c.refunded_at) continue;
    const uid = String(c.user_id);
    siteCk.set(uid, c);
    if (c.paid_at) noteCharge(uid, ms(c.paid_at));
    else if (!((c.trial_days ?? 0) > 0)) noteCharge(uid, ms(c.created_at)); // Pix/cartão sem teste: cobrado na hora
    else if (c.asaas_payment_id) noteCharge(uid, ms(c.created_at) + (c.trial_days ?? 0) * DAY);
  }
  return { firstChargeAt, siteCk, fullyRefunded };
}

export type SubUser = {
  id: string; subscription_status: string | null; subscription_product: string | null;
  subscription_expires_at: string | null; trial_ends_at: string | null;
};
export type SubKind = 'paid_store' | 'paid_site' | 'trial_store' | 'trial_site' | 'trial_legacy' | null;

/** Situação atual da conta com acesso (null = sem acesso ou degustação). */
export function subscriptionKind(u: SubUser, paidEver: boolean, nowMs: number): SubKind {
  if (u.subscription_status === 'trial') return u.trial_ends_at && ms(u.trial_ends_at) > nowMs ? 'trial_legacy' : null;
  if (u.subscription_status !== 'active' && u.subscription_status !== 'cancelled') return null;
  if (!u.subscription_expires_at || ms(u.subscription_expires_at) <= nowMs) return null;
  if (isStoreProduct(u.subscription_product)) return paidEver ? 'paid_store' : 'trial_store';
  if (isSiteProduct(u.subscription_product)) return paidEver ? 'paid_site' : 'trial_site';
  return null;
}
export const isPaidKind  = (k: SubKind) => k === 'paid_store' || k === 'paid_site';
export const isTrialKind = (k: SubKind) => k === 'trial_store' || k === 'trial_site' || k === 'trial_legacy';

/** Fase usada na lista de Usuários: pagante | teste_loja | teste_site | teste_antigo | null. */
export function phaseOfKind(k: SubKind): 'pagante' | 'teste_loja' | 'teste_site' | 'teste_antigo' | null {
  if (isPaidKind(k)) return 'pagante';
  if (k === 'trial_store') return 'teste_loja';
  if (k === 'trial_site') return 'teste_site';
  if (k === 'trial_legacy') return 'teste_antigo';
  return null;
}

/** Valor mensal (R$) da assinatura: compra do site (com cupom) ou preço da loja; anual ÷ 12. */
export function monthlyValueOf(u: { id: string; subscription_product: string | null }, siteCk: Map<string, { value_brl: number }>): number {
  const ck = isSiteProduct(u.subscription_product) ? siteCk.get(String(u.id)) : null;
  if (ck) return isAnnualProduct(u.subscription_product) ? Number(ck.value_brl) / 12 : Number(ck.value_brl);
  return isAnnualProduct(u.subscription_product) ? YEARLY_PRICE_BRL / 12 : MONTHLY_PRICE_BRL;
}

/**
 * Dia da 1ª cobrança de quem está no teste (YYYY-MM-DD, mesma regra da lista de Usuários).
 * Site: o processador cobra no fim do teste (início + dias grátis, em data UTC, como em lib/asaas.ts);
 * loja: o vencimento do teste, no calendário de Brasília.
 */
export function firstChargeDay(u: { id: string; subscription_product: string | null; subscription_expires_at: string | null }, siteCk: Map<string, ChargeCkRow>): string {
  const ck = isSiteProduct(u.subscription_product) ? siteCk.get(String(u.id)) : null;
  if (ck && (ck.trial_days ?? 0) > 0) return new Date(ms(ck.created_at) + (ck.trial_days ?? 0) * DAY).toISOString().slice(0, 10);
  const e = ms(u.subscription_expires_at);
  return Number.isFinite(e) ? new Date(e - BRT).toISOString().slice(0, 10) : '';
}
