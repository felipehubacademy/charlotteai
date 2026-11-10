export const dynamic = 'force-dynamic';

/**
 * app/api/admin/overview/route.ts
 * "Visão geral" do /admin (tela inicial): alertas, usuários, hoje x ontem, funil, dinheiro, engajamento e suporte.
 * Acesso: papel que pode ver 'metrics'. Números calculados na hora (lib/admin-overview.ts).
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { computeOverview, computeUsersBlock } from '@/lib/admin-overview';
import { swrCached } from '@/lib/swr-cache';

// O cálculo completo leva ~15 s: a tela recebe o último guardado na hora e ele se renova por trás a cada minuto.
const overview = () => swrCached('admin:overview', 60_000, 30 * 60_000, () => computeOverview());

export async function GET(req: NextRequest) {
  const part = req.nextUrl.searchParams.get('part');
  // ?part=pnl: resultado mês a mês e ponto de equilíbrio, para o Financeiro (acesso da área financeira).
  const admin = await requireAdmin(req, part === 'pnl' ? 'finance' : 'metrics');
  if (admin instanceof NextResponse) return admin;
  try {
    if (part === 'pnl') { const m = (await overview()).money; return NextResponse.json({ ...m.pnl, unitCost: m.unitCost }); }
    // ?part=users: só o bloco de usuários (leve), para a tela atualizar a cada 5 s.
    if (part === 'users') return NextResponse.json(await computeUsersBlock());
    return NextResponse.json(await overview());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
