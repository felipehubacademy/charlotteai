// lib/affiliates.ts — programa de afiliados (influenciadores).
//
// Fluxo: o afiliado divulga queizy.com/a/CODIGO. A conta nova do aluno fica marcada com o
// afiliado (o primeiro link vale; só contas com até 30 dias). Cada pagamento de assinatura
// que chega pelo webhook do RevenueCat gera a comissão: % sobre o líquido (depois do imposto
// e da taxa da loja) ou valor fixo por plano, nos N primeiros meses do aluno (padrão 12).
// A comissão fica "a liberar" durante a carência (padrão 30 dias) e depois "disponível".
// Reembolso da loja estorna a comissão daquela compra.
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const ATTRIBUTION_WINDOW_DAYS = 30;
const DAY = 86400000;
const MONTH = 30.44 * DAY;

export interface Affiliate {
  id: string; code: string; name: string; email: string | null; status: 'active' | 'paused';
  user_discount_pct: number; commission_type: 'percent' | 'fixed'; commission_pct: number;
  fixed_monthly_brl: number; fixed_annual_brl: number; months_limit: number; hold_days: number;
  min_payout_brl: number; owner_user_id: string | null; notes: string | null; created_at: string;
}

export const cleanAffiliateCode = (raw: unknown) =>
  String(raw ?? '').trim().replace(/^AFF:/i, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export async function affiliateByCode(code: string): Promise<Affiliate | null> {
  const c = cleanAffiliateCode(code);
  if (!c) return null;
  const { data } = await getSupabaseAdmin().from('affiliates').select('*').eq('code', c).maybeSingle();
  return (data as Affiliate | null) ?? null;
}

export type AttributeResult =
  | { ok: true; affiliate: string; already?: boolean }
  | { ok: false; error: 'invalid_code' | 'paused' | 'own_code' | 'too_late' | 'already_attributed' | 'not_found' };

/** Marca a conta com o afiliado do código. Não troca uma atribuição que já existe. */
export async function attributeUser(userId: string, code: string, source: 'install' | 'link' | 'manual' | 'admin'): Promise<AttributeResult> {
  const supabase = getSupabaseAdmin();
  const aff = await affiliateByCode(code);
  if (!aff) return { ok: false, error: 'invalid_code' };
  if (aff.status !== 'active' && source !== 'admin') return { ok: false, error: 'paused' };
  if (aff.owner_user_id === userId) return { ok: false, error: 'own_code' };

  const { data: existing } = await supabase.from('affiliate_attributions').select('affiliate_id').eq('user_id', userId).maybeSingle();
  if (existing) {
    const same = (existing as { affiliate_id: string }).affiliate_id === aff.id;
    return same ? { ok: true, affiliate: aff.name, already: true } : { ok: false, error: 'already_attributed' };
  }
  if (source !== 'admin') {
    const { data: me } = await supabase.from('charlotte_users').select('created_at').eq('id', userId).maybeSingle();
    const createdAt = (me as { created_at: string } | null)?.created_at;
    if (!createdAt) return { ok: false, error: 'not_found' };
    if (Date.now() - new Date(createdAt).getTime() > ATTRIBUTION_WINDOW_DAYS * DAY) return { ok: false, error: 'too_late' };
  }
  const { error } = await supabase.from('affiliate_attributions').insert({ user_id: userId, affiliate_id: aff.id, source } as never);
  if (error) return { ok: false, error: 'already_attributed' };
  return { ok: true, affiliate: aff.name };
}

const planOf = (productId?: string | null): 'monthly' | 'annual' => {
  const p = (productId ?? '').toLowerCase();
  return p.includes('year') || p.includes('annual') ? 'annual' : 'monthly';
};
const isSubscriptionProduct = (productId?: string | null) => !/minutes\d+/i.test(productId ?? '');
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Lança a comissão (ou o estorno) de um evento de dinheiro do RevenueCat.
 * Chamado por lib/revenue.ts depois de registrar a receita. Idempotente por event_id. Nunca lança exceção.
 */
export async function recordAffiliateCommission(event: Record<string, any>, netBrl: number, purchasedAt: Date, isTest = false): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const type = String(event?.type ?? '');
    const userId = String(event?.app_user_id ?? '');
    const eventId = String(event?.id ?? '');
    const productId = (event?.product_id as string | undefined) ?? null;
    const transactionId = (event?.transaction_id as string | undefined) ?? (event?.original_transaction_id as string | undefined) ?? null;
    if (!userId || !eventId || !isSubscriptionProduct(productId)) return;

    const { data: attr } = await supabase.from('affiliate_attributions').select('affiliate_id, attributed_at').eq('user_id', userId).maybeSingle();
    if (!attr) return;
    const { affiliate_id: affiliateId, attributed_at: attributedAt } = attr as { affiliate_id: string; attributed_at: string };

    // Reembolso: estorna a comissão da compra (antes do pagamento só marca; depois, lança negativo).
    if (type === 'REFUND') {
      if (!transactionId) return;
      const { data: orig } = await supabase.from('affiliate_commissions').select('id, amount_brl, status, plan')
        .eq('user_id', userId).eq('transaction_id', transactionId).eq('kind', 'commission').maybeSingle();
      const o = orig as { id: string; amount_brl: number; status: string; plan: string | null } | null;
      if (!o || o.status === 'reversed') return;
      if (o.status === 'pending') {
        await supabase.from('affiliate_commissions').update({ status: 'reversed' } as never).eq('id', o.id);
      } else {
        await supabase.from('affiliate_commissions').insert({
          affiliate_id: affiliateId, user_id: userId, event_id: eventId, transaction_id: transactionId, kind: 'reversal',
          plan: o.plan, product_id: productId, net_brl: -Math.abs(netBrl), amount_brl: -Math.abs(Number(o.amount_brl)),
          status: 'pending', available_at: new Date().toISOString(), is_test: isTest,
        } as never);
      }
      return;
    }

    if (purchasedAt.getTime() < new Date(attributedAt).getTime() - DAY) return; // compra de antes do link

    const { data: affRow } = await supabase.from('affiliates').select('*').eq('id', affiliateId).maybeSingle();
    const aff = affRow as Affiliate | null;
    if (!aff) return;

    // Janela: N primeiros meses contados do primeiro pagamento comissionado deste aluno.
    const { data: prev } = await supabase.from('affiliate_commissions').select('created_at')
      .eq('user_id', userId).eq('affiliate_id', affiliateId).eq('kind', 'commission').neq('status', 'reversed')
      .order('created_at', { ascending: true });
    const prevRows = (prev ?? []) as { created_at: string }[];
    if (prevRows.length > 0) {
      const first = new Date(prevRows[0].created_at).getTime();
      if (purchasedAt.getTime() - first >= aff.months_limit * MONTH) return;
    }
    const plan = planOf(productId);
    if (plan === 'monthly' && prevRows.length >= aff.months_limit) return;

    // A mesma compra pode chegar em dois eventos (ex.: conversão do teste): comissão uma vez só.
    if (transactionId) {
      const { data: dup } = await supabase.from('affiliate_commissions').select('id')
        .eq('user_id', userId).eq('transaction_id', transactionId).eq('kind', 'commission').maybeSingle();
      if (dup) return;
    }

    const amount = aff.commission_type === 'fixed'
      ? (plan === 'annual' ? Number(aff.fixed_annual_brl) : Number(aff.fixed_monthly_brl))
      : netBrl * (Number(aff.commission_pct) / 100);
    if (!(amount > 0)) return;

    await supabase.from('affiliate_commissions').insert({
      affiliate_id: affiliateId, user_id: userId, event_id: eventId, transaction_id: transactionId, kind: 'commission',
      plan, product_id: productId, net_brl: round2(netBrl), amount_brl: round2(amount), status: 'pending',
      available_at: new Date(purchasedAt.getTime() + aff.hold_days * DAY).toISOString(), is_test: isTest,
    } as never);
  } catch (e) {
    console.warn('[affiliates] failed to record commission:', e);
  }
}

export interface AffiliateBalance { pending: number; available: number; paid: number }

/** Saldo: "a liberar" (na carência), "disponível" (pode sacar) e "pago". */
export function balanceOf(rows: { amount_brl: number; status: string; available_at: string; is_test?: boolean }[], now = Date.now()): AffiliateBalance {
  const b = { pending: 0, available: 0, paid: 0 };
  for (const r of rows) {
    const v = Number(r.amount_brl);
    if (r.status === 'reversed' || r.is_test) continue; // compras de teste não contam
    if (r.status === 'paid') b.paid += v;
    else if (new Date(r.available_at).getTime() <= now) b.available += v;
    else b.pending += v;
  }
  return { pending: round2(b.pending), available: round2(b.available), paid: round2(b.paid) };
}
