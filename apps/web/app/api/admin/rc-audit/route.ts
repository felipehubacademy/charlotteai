// /api/admin/rc-audit — confere, conta por conta, a assinatura das lojas na RevenueCat contra o nosso banco.
// Candidatos: quem tem plano da loja gravado ou já tocou em assinar/comprou no app. Só leitura (não grava nada).
// GET (gestão logada, área finance) → { checked, mismatches: [...] }
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Sub = { expires_date: string | null; period_type?: string; unsubscribe_detected_at?: string | null; store?: string };

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, 'finance');
  if (admin instanceof NextResponse) return admin;
  const key = process.env.REVENUECAT_SECRET_KEY;
  if (!key) return NextResponse.json({ error: 'no_key' }, { status: 503 });
  const supabase = getSupabaseAdmin();

  const [{ data: withPlan }, { data: tapped }] = await Promise.all([
    supabase.from('charlotte_users').select('id').in('subscription_product', ['monthly', 'yearly']),
    supabase.from('charlotte_analytics_events').select('user_id').in('event_name', ['paywall_purchase_tap', 'subscription_purchased', 'subscription_restored']),
  ]);
  const ids = [...new Set([...(withPlan ?? []), ...(tapped ?? [])].map(r => String((r as { id?: string; user_id?: string }).id ?? (r as { user_id?: string }).user_id)))].slice(0, 400);
  const { data: rows } = await supabase.from('charlotte_users')
    .select('id, name, email, subscription_status, subscription_product, subscription_expires_at').in('id', ids);
  const db = new Map(((rows ?? []) as { id: string; name: string | null; email: string; subscription_status: string; subscription_product: string | null; subscription_expires_at: string | null }[]).map(r => [r.id, r]));

  const now = Date.now();
  const mismatches: unknown[] = [];
  let rcTrials = 0, rcPaid = 0;
  for (let i = 0; i < ids.length; i += 10) {
    await Promise.all(ids.slice(i, i + 10).map(async id => {
      const r = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store' }).catch(() => null);
      if (!r?.ok) return;
      const j = await r.json() as { subscriber?: { entitlements?: Record<string, { expires_date: string | null; product_identifier?: string }>; subscriptions?: Record<string, Sub> } };
      const ent = j.subscriber?.entitlements?.Premium;
      const active = !!ent && (!ent.expires_date || new Date(ent.expires_date).getTime() > now);
      const sub = ent?.product_identifier ? j.subscriber?.subscriptions?.[ent.product_identifier] : undefined;
      const rcState = !active ? 'sem_acesso' : sub?.period_type === 'trial' ? 'teste' : 'pago';
      if (rcState === 'teste') rcTrials++; else if (rcState === 'pago') rcPaid++;
      const u = db.get(id);
      const dbActive = !!u && ['active', 'cancelled'].includes(u.subscription_status) && !!u.subscription_expires_at && new Date(u.subscription_expires_at).getTime() > now;
      const dbCancelled = u?.subscription_status === 'cancelled';
      const rcCancelled = !!sub?.unsubscribe_detected_at;
      if (active !== dbActive || (active && rcCancelled !== dbCancelled)) {
        mismatches.push({
          id, email: u?.email ?? null, name: u?.name ?? null,
          rc: { state: rcState, cancelled: rcCancelled, expires: ent?.expires_date ?? null, store: sub?.store ?? null },
          db: u ? { status: u.subscription_status, product: u.subscription_product, expires: u.subscription_expires_at } : null,
        });
      }
    }));
  }
  return NextResponse.json({ checked: ids.length, rcTrials, rcPaid, mismatches });
}
