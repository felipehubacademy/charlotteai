export const dynamic = 'force-dynamic';

/**
 * app/api/admin/overview/route.ts
 * "Visão geral" do /admin (tela inicial): alertas, usuários, hoje x ontem, funil, dinheiro, engajamento e suporte.
 * Acesso: papel que pode ver 'metrics'. Números calculados na hora (lib/admin-overview.ts).
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { computeOverview } from '@/lib/admin-overview';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, 'metrics');
  if (admin instanceof NextResponse) return admin;
  try {
    return NextResponse.json(await computeOverview());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
