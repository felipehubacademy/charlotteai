// /api/subscription/sync — o app pede, o servidor confere a assinatura direto na loja (RevenueCat) e grava.
// Antes o próprio app gravava a situação da assinatura na conta (e dava para se marcar como assinante).
// POST (Bearer) → { status, hasPremium, verified }. Sem a chave da RevenueCat, não mexe (o webhook segue valendo).
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { reconcileStoreSubscription } from '@/lib/rc-subscription';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const h = req.headers.get('authorization') ?? '';
  if (!h.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const { data: auth } = await supabase.auth.getUser(h.slice(7));
  const userId = auth?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Mesma regra do webhook e da conferência diária (lib/rc-subscription): o estado atual na RevenueCat.
  const rc = await reconcileStoreSubscription(userId);
  const { data: u } = await supabase.from('charlotte_users').select('subscription_status').eq('id', userId).maybeSingle();
  const status = (u as { subscription_status: string | null } | null)?.subscription_status ?? null;
  if (rc.action === 'skipped') {
    const verified = rc.reason === 'never_subscribed';
    return NextResponse.json({ status, hasPremium: verified ? false : null, verified, ...(verified ? {} : { reason: rc.reason }) });
  }
  return NextResponse.json({ status, hasPremium: rc.state.hasPremium, verified: true });
}
