// /api/cron/rc-reconcile — conferência diária das assinaturas da loja com a RevenueCat (fonte da verdade).
// Mesma regra do webhook e da sincronização do app (lib/rc-subscription). Corrige o que estiver diferente
// (aviso perdido, atrasado ou fora de ordem) e registra cada correção em rc_webhook_events (tipo RECONCILE).
// Candidatos: quem tem plano da loja gravado ou mexeu em assinar/comprou no app nos últimos 60 dias.
// GET (cron da Vercel, CRON_SECRET) ou POST com Bearer CRON_SECRET_TOKEN.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { reconcileStoreSubscription, logRcEvent } from '@/lib/rc-subscription';
import { reconcileLapsedSiteSubscriptions, closeSiteAfterStore } from '@/lib/asaas-reconcile';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function authorized(req: NextRequest): boolean {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const secrets = [process.env.CRON_SECRET_TOKEN, process.env.CRON_SECRET].filter(Boolean);
  return !!bearer && secrets.includes(bearer);
}

export async function GET(req: NextRequest) { return POST(req); }

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!process.env.REVENUECAT_SECRET_KEY) return NextResponse.json({ error: 'no_key' }, { status: 503 });
  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - 60 * 86400000).toISOString();
  const [{ data: withPlan }, { data: tapped }] = await Promise.all([
    supabase.from('charlotte_users').select('id').in('subscription_product', ['monthly', 'yearly']),
    supabase.from('charlotte_analytics_events').select('user_id')
      .in('event_name', ['paywall_purchase_tap', 'subscription_purchased', 'subscription_restored'])
      .gte('created_at', since),
  ]);
  const ids = [...new Set([
    ...((withPlan ?? []) as { id: string }[]).map(r => String(r.id)),
    ...((tapped ?? []) as { user_id: string | null }[]).map(r => r.user_id).filter((x): x is string => !!x),
  ])].slice(0, 800);

  const day = new Date().toISOString().slice(0, 10);
  const counts: Record<string, number> = {};
  const changes: unknown[] = [];
  for (let i = 0; i < ids.length; i += 8) {
    await Promise.all(ids.slice(i, i + 8).map(async id => {
      try {
        const r = await reconcileStoreSubscription(id);
        const k = r.action === 'skipped' ? `skipped_${r.reason}` : r.action;
        counts[k] = (counts[k] ?? 0) + 1;
        if (r.action === 'updated') {
          changes.push({ id, before: r.before, after: r.after });
          await logRcEvent({ event_id: `reconcile:${day}:${id}`, event_type: 'RECONCILE', app_user_id: id, result: r });
          if (r.state.hasPremium) await closeSiteAfterStore(id);
        }
      } catch (e) {
        counts.error = (counts.error ?? 0) + 1;
        console.error('[rc-reconcile]', id, e);
      }
    }));
  }
  console.log(`[rc-reconcile] ${ids.length} conferidos`, counts);
  // Mesma conferência para o site: assinatura com prazo vencido, perguntando ao processador.
  const site = await reconcileLapsedSiteSubscriptions().catch(e => ({ error: e instanceof Error ? e.message : 'erro' }));
  console.log('[rc-reconcile] site', site);
  return NextResponse.json({ checked: ids.length, counts, changes, site });
}
