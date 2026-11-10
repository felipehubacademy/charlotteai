export const dynamic = 'force-dynamic';

/**
 * app/api/admin/metrics/route.ts
 * Aba "Métricas" do /admin: receita, degustação e teste, engajamento, retenção, origem e custo de IA.
 * Acesso: login do /admin com papel que pode ver 'metrics'.
 *
 * Regras gerais:
 *  - Contas da equipe ficam fora de tudo (e-mail felipe.xavier1987+, @hubacademybr.com, @queizy.com,
 *    hide_from_ranking ou is_institutional).
 *  - Dias e semanas seguem o calendário de Brasília (UTC-3); o período começa às 00h de Brasília.
 *  - Pagante = já houve cobrança (revenue_events sem REFUND, ou compra do site já cobrada).
 *
 * Query params:
 *   ?days=7|30|90     — atalho (padrão 30): os últimos N dias do calendário, contando hoje
 *   ?from=YYYY-MM-DD  — período personalizado (sobrescreve days)
 *   ?to=YYYY-MM-DD
 *   ?level=Novice|Inter|Advanced
 *   ?plan=taste|trial|monthly|annual|paid
 *
 * As contas ficam no banco (lib/admin-metrics.ts e as funções admin_metrics_*): a rota não baixa mais
 * as tabelas inteiras, só os números já agrupados.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, can } from '@/lib/admin-auth';
import { DAY, brtDay, brtDayStart } from '@/lib/admin-subscriptions';
import { computeMetrics } from '@/lib/admin-metrics';

// Login próprio (Bearer) com papel que acessa 'metrics'.
async function checkAuth(req: NextRequest) {
  const admin = await getAdmin(req);
  return !!admin && can(admin.role, 'metrics');
}

function parseRange(req: NextRequest): { from: Date; to: Date; days: number } {
  const now = Date.now();
  const sp = req.nextUrl.searchParams;
  const fromP = sp.get('from')?.slice(0, 10);
  const toP = sp.get('to')?.slice(0, 10);
  const ymd = /^\d{4}-\d{2}-\d{2}$/;

  if (fromP && toP && ymd.test(fromP) && ymd.test(toP)) {
    const fIdx = Math.floor(Date.parse(`${fromP}T00:00:00Z`) / DAY);
    const tIdx = Math.max(fIdx, Math.floor(Date.parse(`${toP}T00:00:00Z`) / DAY));
    return {
      from: new Date(brtDayStart(fIdx)),
      to: new Date(Math.min(brtDayStart(tIdx + 1) - 1, now)),
      days: tIdx - fIdx + 1,
    };
  }

  const n = parseInt(sp.get('days') ?? '30', 10);
  const days = Number.isFinite(n) ? Math.min(365, Math.max(1, n)) : 30;
  return { from: new Date(brtDayStart(brtDay(now) - days + 1)), to: new Date(now), days };
}

// Filtros (?level=Novice&plan=paid).
function parseFilters(req: NextRequest) {
  const level = req.nextUrl.searchParams.get('level') || null; // Novice | Inter | Advanced
  const plan  = req.nextUrl.searchParams.get('plan')  || null; // taste | trial | monthly | annual | paid
  return { level, plan };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/metrics
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(await computeMetrics(parseRange(req), parseFilters(req)));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
