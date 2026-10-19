// lib/support-access.ts — ações de acesso que a IA do suporte resolve sozinha (sem chamado).
//
// 1. sendAccessLink(email): manda o link para criar ou redefinir a senha PARA O PRÓPRIO E-MAIL da conta.
//    É seguro: só o dono do e-mail recebe. Quem assinou pelo site e nunca entrou recebe de novo o
//    e-mail de boas-vindas (com "Criar minha senha"); os outros, o e-mail de redefinir senha.
//    A resposta ao aluno não diz se o e-mail tem conta (não revela quem usa o app).
// 2. checkStoreSubscription(userId): consulta a assinatura na App Store / Google Play (RevenueCat)
//    e, se estiver ativa, libera o acesso na hora. Precisa de REVENUECAT_SECRET_KEY (chave secreta
//    v1 do RevenueCat); sem ela, devolve 'unavailable' e o agente segue com o passo a passo.
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendWebWelcome } from '@/lib/web-welcome';
import type { WebPlan } from '@/lib/asaas';

const ENTITLEMENT = 'Premium';
const PRODUCT_MONTHLY = 'com.hubacademy.charlotte.monthly';
const PRODUCT_YEARLY = 'com.hubacademy.charlotte.yearly';

export type AccessLinkResult = 'sent_welcome' | 'sent_reset' | 'no_account' | 'invalid' | 'failed';

export async function sendAccessLink(emailRaw: string | null | undefined): Promise<AccessLinkResult> {
  const email = String(emailRaw ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return 'invalid';
  const supabase = getSupabaseAdmin();
  const { data: u } = await supabase.from('charlotte_users').select('id').ilike('email', email).maybeSingle();
  const user = u as { id: string } | null;
  if (!user) return 'no_account';

  // Assinou pelo site e nunca entrou: reenvia o e-mail de acesso (boas-vindas com "Criar minha senha").
  const [{ data: ck }, { data: auth }] = await Promise.all([
    supabase.from('asaas_checkouts').select('plan, trial_days').eq('user_id', user.id).eq('status', 'paid')
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.auth.admin.getUserById(user.id),
  ]);
  const checkout = ck as { plan: WebPlan; trial_days: number } | null;
  if (checkout && !auth?.user?.last_sign_in_at) {
    return (await sendWebWelcome(user.id, checkout.plan, checkout.trial_days)) ? 'sent_welcome' : 'failed';
  }

  // Os outros: o mesmo e-mail de redefinir senha do app (passa pelo hook de e-mail do Supabase).
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { error } = await anon.auth.resetPasswordForEmail(email, { redirectTo: 'https://queizy.com/open' });
  return error ? 'failed' : 'sent_reset';
}

export type StoreCheckResult =
  | { status: 'activated' | 'already_active'; expiresAt: string; store: string | null }
  | { status: 'not_found' | 'expired' | 'unavailable' | 'no_account' | 'web_or_institutional' };

/** Assinatura da loja (RevenueCat) e liberação do acesso se estiver ativa. */
export async function checkStoreSubscription(userId: string | null | undefined): Promise<StoreCheckResult> {
  const key = process.env.REVENUECAT_SECRET_KEY;
  if (!key) return { status: 'unavailable' };
  if (!userId) return { status: 'no_account' };
  const supabase = getSupabaseAdmin();
  const { data: u } = await supabase.from('charlotte_users')
    .select('id, is_institutional, subscription_status, subscription_expires_at, subscription_product').eq('id', userId).maybeSingle();
  const user = u as { id: string; is_institutional: boolean | null; subscription_status: string | null; subscription_expires_at: string | null; subscription_product: string | null } | null;
  if (!user) return { status: 'no_account' };
  if (user.is_institutional || (user.subscription_product ?? '').startsWith('web_')) return { status: 'web_or_institutional' };

  const r = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  });
  if (!r.ok) return { status: 'unavailable' };
  const j = await r.json() as { subscriber?: { entitlements?: Record<string, { expires_date: string | null; product_identifier?: string }>; subscriptions?: Record<string, { store?: string; unsubscribe_detected_at?: string | null; period_type?: string }> } };
  const ent = j.subscriber?.entitlements?.[ENTITLEMENT];
  if (!ent) return { status: 'not_found' };
  const expires = ent.expires_date ? new Date(ent.expires_date) : null;
  if (expires && expires.getTime() < Date.now()) return { status: 'expired' };

  const productId = ent.product_identifier ?? '';
  const sub = j.subscriber?.subscriptions?.[productId];
  const product = productId.startsWith(PRODUCT_MONTHLY) ? 'monthly' : productId.startsWith(PRODUCT_YEARLY) ? 'yearly' : null;
  const status = sub?.unsubscribe_detected_at ? 'cancelled' : sub?.period_type === 'trial' ? 'trial' : 'active';
  const expiresAt = (expires ?? new Date(Date.now() + 365 * 86400000)).toISOString();
  const already = user.subscription_status === status && !!user.subscription_expires_at
    && new Date(user.subscription_expires_at).getTime() > Date.now();
  if (!already) {
    await supabase.from('charlotte_users').update({
      subscription_status: status, is_active: true, subscription_expires_at: expiresAt,
      ...(product ? { subscription_product: product } : {}), updated_at: new Date().toISOString(),
    } as never).eq('id', userId);
  }
  return { status: already ? 'already_active' : 'activated', expiresAt, store: sub?.store ?? null };
}
