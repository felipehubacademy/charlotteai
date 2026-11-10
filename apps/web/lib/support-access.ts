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
import { reconcileStoreSubscription } from '@/lib/rc-subscription';
import { sendWebWelcome } from '@/lib/web-welcome';
import type { WebPlan } from '@/lib/asaas';


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

  // Mesma regra do webhook e da sincronização do app (lib/rc-subscription): o estado atual na RevenueCat.
  const before = user.subscription_status;
  const rc = await reconcileStoreSubscription(userId);
  if (rc.action === 'skipped') {
    if (rc.reason === 'store_unavailable') return { status: 'unavailable' };
    if (rc.reason === 'never_subscribed') return { status: 'not_found' };
    if (rc.reason === 'no_account') return { status: 'no_account' };
    return { status: 'web_or_institutional' };
  }
  if (!rc.state.hasPremium) return { status: rc.state.expiresAt ? 'expired' : 'not_found' };
  const expiresAt = rc.state.expiresAt ?? new Date(Date.now() + 365 * 86400000).toISOString();
  const already = rc.action === 'unchanged' && ['active', 'cancelled'].includes(before ?? '');
  return { status: already ? 'already_active' : 'activated', expiresAt, store: rc.state.store };
}
