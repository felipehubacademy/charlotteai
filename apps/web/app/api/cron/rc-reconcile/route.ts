// /api/cron/rc-reconcile — conferência diária das assinaturas da loja com a RevenueCat (fonte da verdade).
// Mesma regra do webhook e da sincronização do app (lib/rc-subscription). Corrige o que estiver diferente
// (aviso perdido, atrasado ou fora de ordem) e registra cada correção em rc_webhook_events (tipo RECONCILE).
// Candidatos: quem tem plano da loja gravado ou mexeu em assinar/comprou no app nos últimos 60 dias.
// GET (cron da Vercel, CRON_SECRET) ou POST com Bearer CRON_SECRET_TOKEN.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { readAll } from '@/lib/db-batch';
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
  // Leituras em páginas e com erro explícito: antes, com mais de 1.000 eventos a lista de candidatos vinha cortada
  // e, se a leitura falhava, a conferência rodava com zero contas sem avisar.
  const [withPlan, tapped] = await Promise.all([
    readAll<{ id: string }>('assinantes da loja', () => supabase.from('charlotte_users').select('id').in('subscription_product', ['monthly', 'yearly']).order('id')),
    readAll<{ user_id: string | null }>('toques em assinar', () => supabase.from('charlotte_analytics_events').select('id, user_id')
      .in('event_name', ['paywall_purchase_tap', 'subscription_purchased', 'subscription_restored'])
      .gte('created_at', since).order('id')),
  ]);
  const all = [...new Set([
    ...withPlan.map(r => String(r.id)),
    ...tapped.map(r => r.user_id).filter((x): x is string => !!x),
  ])];
  // Limite de 800 por rodada (tempo da função). Quando há mais candidatos, cada dia começa num ponto diferente da
  // lista, para que ninguém fique de fora para sempre; até 800 candidatos, a conferência é a mesma de antes.
  const MAX = 800;
  const start = all.length > MAX ? (Math.floor(Date.now() / 86400000) * MAX) % all.length : 0;
  const ids = all.length > MAX ? [...all.slice(start), ...all.slice(0, start)].slice(0, MAX) : all;

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
  return NextResponse.json({ checked: ids.length, candidates: all.length, counts, changes, site });
}
