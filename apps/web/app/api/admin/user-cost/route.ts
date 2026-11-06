export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/user-cost?userId=X&from=ISO&to=ISO
 * Retorna breakdown de custo por endpoint/serviço para um usuário específico.
 * Protegido pelo ADMIN_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, can } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';


// Login próprio (Bearer) com papel que acessa 'metrics', ou a senha mestra antiga.
async function checkAuth(req: NextRequest) {
  const admin = await getAdmin(req);
  return !!admin && can(admin.role, 'metrics');
}

const round6 = (n: number) => Math.round(n * 1_000_000) / 1_000_000;

export async function GET(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });

  const toParam   = searchParams.get('to');
  const fromParam = searchParams.get('from');
  const days      = searchParams.get('days') ? Math.max(1, parseInt(searchParams.get('days')!, 10)) : 30;

  const now       = new Date();
  const toDate    = toParam   ? new Date(toParam)   : now;
  const fromDate  = fromParam ? new Date(fromParam) : new Date(now.getTime() - days * 86400000);

  const supabase = getSupabaseAdmin();

  // Somado no banco: uma linha por endpoint, por modelo e o total (antes vinham todas as chamadas do período).
  // O custo chega como texto (mesma soma em ponto flutuante, na ordem das chamadas): Number() devolve o mesmo valor.
  const { data, error } = await supabase.rpc('user_cost_breakdown', {
    p_user: userId, p_from: fromDate.toISOString(), p_to: toDate.toISOString(),
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const groups = (data ?? []) as Array<{ grp: 'endpoint' | 'model' | 'total'; key: string | null; cost: string | null; calls: number; tokens: number }>;

  // Breakdown por endpoint (na ordem da primeira chamada, como antes)
  const byEndpoint: Record<string, { cost: number; calls: number; tokens: number }> = {};
  for (const g of groups) if (g.grp === 'endpoint') byEndpoint[g.key!] = { cost: Number(g.cost ?? 0), calls: g.calls, tokens: Number(g.tokens) };
  const breakdown = Object.entries(byEndpoint)
    .map(([endpoint, v]) => ({ endpoint, cost: round6(v.cost), calls: v.calls, tokens: v.tokens }))
    .sort((a, b) => b.cost - a.cost);

  // Breakdown por modelo
  const byModel: Record<string, { cost: number; calls: number }> = {};
  for (const g of groups) if (g.grp === 'model') byModel[g.key!] = { cost: Number(g.cost ?? 0), calls: g.calls };
  const byModelArr = Object.entries(byModel)
    .map(([model, v]) => ({ model, cost: round6(v.cost), calls: v.calls }))
    .sort((a, b) => b.cost - a.cost);

  const total = groups.find(g => g.grp === 'total');
  const totalCost  = round6(Number(total?.cost ?? 0));
  const totalCalls = total?.calls ?? 0;

  // Debug: mostra o range exato usado e amostra dos user_ids encontrados (todos são o próprio aluno)
  const sampleUserIds = totalCalls ? [userId] : [];

  return NextResponse.json({
    userId, totalCost, totalCalls, breakdown, byModel: byModelArr,
    _debug: {
      from: fromDate.toISOString(),
      to:   toDate.toISOString(),
      rowCount: totalCalls,
      sampleUserIds,
    },
  });
}
