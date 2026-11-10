export const dynamic = 'force-dynamic';

/**
 * app/api/admin/ops-alerts/route.ts
 * PATCH: botão "Resolvido" da Visão geral. Dá como resolvidos os alertas do checkout em aberto
 * (os do Instagram ficam de fora: somem sozinhos quando os posts são aprovados).
 * Acesso: papel que pode ver 'metrics'.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, audit } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { computeOverview } from '@/lib/admin-overview';
import { refreshCached } from '@/lib/swr-cache';

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req, 'metrics');
  if (admin instanceof NextResponse) return admin;
  const { data, error } = await getSupabaseAdmin().from('ops_alerts')
    .update({ resolved_at: new Date().toISOString(), resolved_by: admin.email ?? admin.name ?? 'admin', resolved_how: 'manual' } as never)
    .is('resolved_at', null).not('kind', 'like', 'instagram_%').select('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const n = (data ?? []).length;
  await audit(admin, 'ops_alerts_resolved', 'ops_alerts', null, { count: n });
  // A Visão geral vem de um cálculo guardado: recalcula por trás para o alerta não voltar na próxima atualização.
  refreshCached('admin:overview', () => computeOverview());
  return NextResponse.json({ ok: true, resolved: n });
}
