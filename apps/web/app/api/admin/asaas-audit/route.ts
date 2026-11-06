// /api/admin/asaas-audit — confere, assinatura por assinatura, o site contra o processador. Só leitura (não grava nada).
// Compara as cobranças que o processador tem com a receita (revenue_events) e a situação gravada na conta.
// GET (gestão logada, área finance) → { checked, rows: [...] }
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getSubscription, subscriptionPayments } from '@/lib/asaas';
import { readIn } from '@/lib/db-batch';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Row = { user_id: string; asaas_subscription_id: string; plan: string; value_brl: number; created_at: string };

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, 'finance');
  if (admin instanceof NextResponse) return admin;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('asaas_checkouts').select('user_id, asaas_subscription_id, plan, value_brl, created_at')
    .eq('status', 'paid').eq('sandbox', false).not('asaas_subscription_id', 'is', null).order('created_at', { ascending: false }).limit(200);
  const checkouts = (data ?? []) as Row[];
  const ids = [...new Set(checkouts.map(c => c.user_id).filter(Boolean))];
  // Em lotes e páginas (as cobranças de 200 assinantes passam de 1.000 linhas) e com erro explícito:
  // leitura que falha não pode virar "sem receita" na conferência.
  const [users, revenue] = await Promise.all([
    readIn('contas do site', ids, chunk => supabase.from('charlotte_users').select('id, email, subscription_status, subscription_product, subscription_expires_at').in('id', chunk).order('id')),
    readIn('receita do site', ids, chunk => supabase.from('revenue_events').select('id, app_user_id, event_type, gross_brl, purchased_at').eq('store', 'ASAAS').in('app_user_id', chunk).order('id')),
  ]);
  const userOf = new Map(((users ?? []) as { id: string; email: string; subscription_status: string | null; subscription_product: string | null; subscription_expires_at: string | null }[]).map(u => [String(u.id), u]));
  const revOf = new Map<string, number>();
  for (const r of (revenue ?? []) as { app_user_id: string; event_type: string }[]) {
    if (r.event_type !== 'REFUND') revOf.set(String(r.app_user_id), (revOf.get(String(r.app_user_id)) ?? 0) + 1);
  }

  const rows: unknown[] = [];
  for (let i = 0; i < checkouts.length; i += 6) {
    await Promise.all(checkouts.slice(i, i + 6).map(async c => {
      const u = userOf.get(String(c.user_id));
      try {
        const [sub, payments] = await Promise.all([getSubscription(c.asaas_subscription_id), subscriptionPayments(c.asaas_subscription_id)]);
        const paid = payments.filter(p => ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes(p.status));
        rows.push({
          email: u?.email ?? null, created: c.created_at.slice(0, 10), plan: c.plan, value: c.value_brl,
          db: { status: u?.subscription_status ?? null, product: u?.subscription_product ?? null, expires: u?.subscription_expires_at?.slice(0, 16) ?? null, revenueEvents: revOf.get(String(c.user_id)) ?? 0 },
          asaas: { status: sub.status, nextDue: sub.nextDueDate, paid: paid.length, payments: payments.map(p => `${p.dueDate} ${p.status} R$${p.value}`) },
          paidWithoutRevenue: paid.length > (revOf.get(String(c.user_id)) ?? 0),
        });
      } catch (e) {
        rows.push({ email: u?.email ?? null, created: c.created_at.slice(0, 10), error: e instanceof Error ? e.message : 'erro' });
      }
    }));
  }
  return NextResponse.json({ checked: checkouts.length, rows });
}
