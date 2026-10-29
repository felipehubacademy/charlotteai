// /api/subscription/sync — o app pede, o servidor confere a assinatura direto na loja (RevenueCat) e grava.
// Antes o próprio app gravava a situação da assinatura na conta (e dava para se marcar como assinante).
// POST (Bearer) → { status, hasPremium, verified }. Sem a chave da RevenueCat, não mexe (o webhook segue valendo).
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const ENTITLEMENT = 'Premium';
const PRODUCT_MONTHLY = 'com.hubacademy.charlotte.monthly';
const PRODUCT_YEARLY = 'com.hubacademy.charlotte.yearly';

type RcSubscriber = {
  subscriber?: {
    entitlements?: Record<string, { expires_date: string | null; product_identifier?: string }>;
    subscriptions?: Record<string, { unsubscribe_detected_at?: string | null; billing_issues_detected_at?: string | null }>;
  };
};

export async function POST(req: NextRequest) {
  const h = req.headers.get('authorization') ?? '';
  if (!h.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const { data: auth } = await supabase.auth.getUser(h.slice(7));
  const userId = auth?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: u } = await supabase.from('charlotte_users')
    .select('is_institutional, subscription_status, subscription_product').eq('id', userId).maybeSingle();
  const user = u as { is_institutional: boolean | null; subscription_status: string | null; subscription_product: string | null } | null;
  if (!user) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  // Institucional e assinatura pelo site: quem manda é a equipe e o webhook do site.
  if (user.is_institutional || (user.subscription_product ?? '').startsWith('web_')) {
    return NextResponse.json({ status: user.subscription_status, hasPremium: null, verified: false });
  }

  const key = process.env.REVENUECAT_SECRET_KEY;
  if (!key) return NextResponse.json({ status: user.subscription_status, hasPremium: null, verified: false, reason: 'no_key' });
  const r = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
  }).catch(() => null);
  if (!r?.ok) return NextResponse.json({ status: user.subscription_status, hasPremium: null, verified: false, reason: 'store_unavailable' });
  const j = await r.json() as RcSubscriber;

  // Mesma regra de antes no app (lib/purchases syncSubscriptionToSupabase): ativo, cancelado (com acesso) ou vencido.
  const ent = j.subscriber?.entitlements?.[ENTITLEMENT];
  const expiresAt = ent?.expires_date ?? null;
  const hasPremium = !!ent && (!expiresAt || new Date(expiresAt).getTime() > Date.now());
  const productId = ent?.product_identifier ?? '';
  const subInfo = j.subscriber?.subscriptions?.[productId];
  // Cobrança recusada (carência da loja) também não renova, como cancelamento.
  const willRenew = !subInfo?.unsubscribe_detected_at && !subInfo?.billing_issues_detected_at;
  const product = productId.startsWith(PRODUCT_MONTHLY) ? 'monthly' : productId.startsWith(PRODUCT_YEARLY) ? 'yearly' : null;

  const hadPaid = ['active', 'cancelled', 'expired'].includes(user.subscription_status ?? '');
  if (!hasPremium && !hadPaid) return NextResponse.json({ status: user.subscription_status, hasPremium: false, verified: true });

  const status = hasPremium ? (willRenew ? 'active' : 'cancelled') : 'expired';
  await supabase.from('charlotte_users').update({
    subscription_status: status,
    is_active: hasPremium,
    subscription_product: hasPremium ? product : null,
    subscription_expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  } as never).eq('id', userId);
  return NextResponse.json({ status, hasPremium, verified: true });
}
