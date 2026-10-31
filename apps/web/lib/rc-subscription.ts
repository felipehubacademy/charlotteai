// lib/rc-subscription.ts — assinatura da loja (Apple/Google): a RevenueCat é a fonte da verdade.
// Uma regra só para gravar a assinatura da loja no banco, usada pelo webhook da RevenueCat, pela
// sincronização do app (/api/subscription/sync), pelo suporte e pela conferência diária (/api/cron/rc-reconcile).
// Em vez de interpretar cada aviso (que pode chegar atrasado, fora de ordem ou de um tipo novo), pergunta à
// RevenueCat como está a assinatura AGORA e grava isso.
//
// Regra (a mesma do /admin, lib/admin-subscriptions):
//   com acesso e renovando            → 'active'    (o teste grátis da loja também: o /admin separa pela 1ª cobrança)
//   com acesso e sem renovar          → 'cancelled' (desligou a renovação ou a cobrança falhou e está na carência)
//   sem acesso                        → 'expired'
// Carência da loja (cobrança recusada): o acesso vale até o fim da carência, como na loja.
// Não mexe em conta institucional nem em assinatura do site (web_*), que têm regras próprias.
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const RC_ENTITLEMENT = 'Premium';
const PRODUCT_MONTHLY = 'com.hubacademy.charlotte.monthly';
const PRODUCT_YEARLY = 'com.hubacademy.charlotte.yearly';

type RcSub = {
  store?: string;
  period_type?: string;
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
  unsubscribe_detected_at?: string | null;
  billing_issues_detected_at?: string | null;
};
export type RcSubscriber = {
  subscriber?: {
    entitlements?: Record<string, { expires_date: string | null; product_identifier?: string }>;
    subscriptions?: Record<string, RcSub>;
  };
};

export interface RcState {
  hasPremium: boolean;
  status: 'active' | 'cancelled' | 'expired';
  product: 'monthly' | 'yearly' | null;
  expiresAt: string | null;
  periodType: string | null;
  store: string | null;
  billingIssue: boolean;
}

const ms = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : NaN);

/** Assinante na RevenueCat (null = sem chave ou RevenueCat fora do ar). */
export async function fetchRcSubscriber(userId: string): Promise<RcSubscriber | null> {
  const key = process.env.REVENUECAT_SECRET_KEY;
  if (!key) return null;
  const r = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
  }).catch(() => null);
  if (!r?.ok) return null;
  return (await r.json().catch(() => null)) as RcSubscriber | null;
}

/** Situação da assinatura a partir da resposta da RevenueCat. */
export function rcStateOf(j: RcSubscriber, nowMs = Date.now()): RcState {
  const ent = j.subscriber?.entitlements?.[RC_ENTITLEMENT];
  const productId = ent?.product_identifier ?? '';
  const sub = productId ? j.subscriber?.subscriptions?.[productId] : undefined;
  // Fim do acesso: o do direito Premium ou o fim da carência da loja, o que for mais tarde.
  const ends = [ms(ent?.expires_date), ms(sub?.grace_period_expires_date)].filter(n => !Number.isNaN(n));
  const endMs = ends.length ? Math.max(...ends) : NaN;
  const lifetime = !!ent && !ent.expires_date;
  const hasPremium = !!ent && (lifetime || (!Number.isNaN(endMs) && endMs > nowMs));
  const billingIssue = !!sub?.billing_issues_detected_at;
  const willRenew = !sub?.unsubscribe_detected_at && !billingIssue;
  return {
    hasPremium,
    status: hasPremium ? (willRenew ? 'active' : 'cancelled') : 'expired',
    product: productId.startsWith(PRODUCT_MONTHLY) ? 'monthly' : productId.startsWith(PRODUCT_YEARLY) ? 'yearly' : null,
    expiresAt: Number.isNaN(endMs) ? null : new Date(endMs).toISOString(),
    periodType: sub?.period_type ?? null,
    store: sub?.store ?? null,
    billingIssue,
  };
}

type UserRow = {
  id: string;
  is_institutional: boolean | null;
  subscription_status: string | null;
  subscription_product: string | null;
  subscription_expires_at: string | null;
  is_active: boolean | null;
};

export type ReconcileResult =
  | { action: 'updated'; before: Partial<UserRow>; after: Record<string, unknown>; state: RcState }
  | { action: 'unchanged'; state: RcState }
  | { action: 'skipped'; reason: 'no_account' | 'institutional' | 'site' | 'store_unavailable' | 'never_subscribed'; state?: RcState };

/** Confere a assinatura da loja de um aluno na RevenueCat e grava no banco se estiver diferente. */
export async function reconcileStoreSubscription(userId: string): Promise<ReconcileResult> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('charlotte_users')
    .select('id, is_institutional, subscription_status, subscription_product, subscription_expires_at, is_active')
    .eq('id', userId).maybeSingle();
  const user = data as UserRow | null;
  if (!user) return { action: 'skipped', reason: 'no_account' };
  if (user.is_institutional) return { action: 'skipped', reason: 'institutional' };
  if ((user.subscription_product ?? '').startsWith('web_')) return { action: 'skipped', reason: 'site' };

  const j = await fetchRcSubscriber(userId);
  if (!j) return { action: 'skipped', reason: 'store_unavailable' };
  const state = rcStateOf(j);

  // Nunca assinou pela loja (degustação, teste antigo do app): sem acesso na loja, não mexe.
  const storeHistory = ['active', 'cancelled', 'expired'].includes(user.subscription_status ?? '')
    && (user.subscription_product === 'monthly' || user.subscription_product === 'yearly' || user.subscription_status !== 'active');
  if (!state.hasPremium && !storeHistory) return { action: 'skipped', reason: 'never_subscribed', state };

  const after: Record<string, unknown> = {
    subscription_status: state.status,
    is_active: state.hasPremium,
    // Sem acesso, o plano antigo fica gravado (histórico); com acesso, o plano atual da loja.
    ...(state.hasPremium && state.product ? { subscription_product: state.product } : {}),
    ...(state.expiresAt ? { subscription_expires_at: state.expiresAt } : {}),
  };
  const sameExpiry = !state.expiresAt
    || Math.abs(ms(user.subscription_expires_at) - ms(state.expiresAt)) < 60_000;
  const same = user.subscription_status === state.status
    && !!user.is_active === state.hasPremium
    && (!('subscription_product' in after) || user.subscription_product === after.subscription_product)
    && sameExpiry;
  if (same) return { action: 'unchanged', state };

  const { error } = await supabase.from('charlotte_users')
    .update({ ...after, updated_at: new Date().toISOString() } as never).eq('id', userId);
  if (error) throw new Error(`reconcile ${userId}: ${error.message}`);
  return {
    action: 'updated',
    before: {
      subscription_status: user.subscription_status, subscription_product: user.subscription_product,
      subscription_expires_at: user.subscription_expires_at, is_active: user.is_active,
    },
    after,
    state,
  };
}

/** Registro de cada aviso da RevenueCat e de cada correção da conferência (tabela rc_webhook_events). */
export async function logRcEvent(row: {
  event_id: string; event_type: string; app_user_id: string | null;
  environment?: string | null; event_at?: string | null; payload?: unknown; result?: unknown;
}): Promise<void> {
  const { error } = await getSupabaseAdmin().from('rc_webhook_events')
    .upsert({ ...row, received_at: new Date().toISOString() } as never, { onConflict: 'event_id' });
  if (error) console.warn('[rc-subscription] log falhou:', error.message);
}
