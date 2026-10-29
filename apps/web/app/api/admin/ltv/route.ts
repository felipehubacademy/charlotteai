// /api/admin/ltv — LTV (valor líquido que cada assinante deixa) por turma, no método que o Duolingo
// descreveu na abertura de capital (S-1, 2021): turmas pelo mês da 1ª cobrança, receita realizada de cada
// uma e projeção pela taxa de renovação de cada plano.
//   Realizado: soma do líquido (já sem loja, imposto e Asaas) menos estornos, por assinante pagante.
//   Projetado: líquido médio da cobrança × cobranças esperadas = 1 / (1 − renovação).
//   Renovação: a nossa quando a amostra é suficiente; antes disso, a referência publicada pelo Duolingo
//   (anual 40% renova depois de 12 meses; mensal 9% ainda paga depois de 12 meses ≈ 81,8% ao mês).
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/admin-auth';
import { revenueAtMs } from '@/lib/revenue-day';

export const dynamic = 'force-dynamic';

const DAY = 86400000;
const REF = { monthly: Math.pow(0.09, 1 / 12), annual: 0.40 };
const MIN_SAMPLE = 20; // assinantes que já passaram da data de renovar, para trocar a referência pelo dado próprio

type Row = { app_user_id: string; event_type: string; store: string; product_id: string | null; net_brl: number | null; gross_brl: number | null; purchased_at: string };
type Plan = 'monthly' | 'annual';
const planOf = (p: string | null): Plan => (/annual|anual|year/i.test(p ?? '') ? 'annual' : 'monthly');
const round2 = (n: number) => Math.round(n * 100) / 100;

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, 'finance');
  if (admin instanceof NextResponse) return admin;
  const supabase = getSupabaseAdmin();
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('revenue_events')
      .select('app_user_id, event_type, store, product_id, net_brl, gross_brl, purchased_at').order('purchased_at').range(from, from + 999);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < 1000) break;
  }

  // Um registro por assinante: 1ª cobrança, plano, cobranças, líquido e estornos.
  const subs = new Map<string, { first: number; plan: Plan; store: string; charges: number; net: number; gross: number; refunded: number; last: number }>();
  // Cobranças primeiro, estornos depois (cobrança e estorno podem ter o mesmo horário).
  for (const r of rows) {
    if (r.event_type === 'REFUND') continue;
    const t = revenueAtMs(r); // cobrança do site só com data vale para o próprio dia (Brasília)
    const s = subs.get(r.app_user_id);
    if (!s) subs.set(r.app_user_id, { first: t, plan: planOf(r.product_id), store: r.store, charges: 1, net: Number(r.net_brl ?? 0), gross: Number(r.gross_brl ?? 0), refunded: 0, last: t });
    else { s.charges++; s.net += Number(r.net_brl ?? 0); s.gross += Number(r.gross_brl ?? 0); s.last = Math.max(s.last, t); }
  }
  for (const r of rows) {
    if (r.event_type !== 'REFUND') continue;
    const s = subs.get(r.app_user_id);
    if (s) s.refunded += Number(r.net_brl ?? 0);
  }
  const now = Date.now();
  // Base do LTV: quem pagou e não foi estornado por inteiro (os estornados aparecem só na coluna da turma).
  const everyone = [...subs.values()];
  const all = everyone.filter(s => s.net - s.refunded > 0.01);

  // Renovação própria: quem já passou da data da 2ª cobrança (mensal 35 dias; anual 380) e se pagou de novo.
  const renewal = (plan: Plan) => {
    const wait = plan === 'monthly' ? 35 : 380;
    const eligible = all.filter(s => s.plan === plan && now - s.first >= wait * DAY);
    const renewed = eligible.filter(s => s.charges >= 2).length;
    const own = eligible.length >= MIN_SAMPLE;
    return { rate: own ? renewed / eligible.length : REF[plan], source: own ? 'own' as const : 'reference' as const, eligible: eligible.length, renewed };
  };
  const ltvOf = (plan: Plan) => {
    const list = all.filter(s => s.plan === plan);
    const charges = list.reduce((a, s) => a + s.charges, 0);
    const avgCharge = charges ? list.reduce((a, s) => a + s.net, 0) / charges : 0;
    const r = renewal(plan);
    const expected = 1 / (1 - Math.min(r.rate, 0.98));
    return {
      plan, subscribers: list.length, avgChargeNet: round2(avgCharge),
      renewalRate: Math.round(r.rate * 1000) / 10, renewalSource: r.source, renewalEligible: r.eligible, renewalRenewed: r.renewed,
      expectedCharges: round2(expected), projectedLtvNet: round2(avgCharge * expected),
      realizedPerSubNet: round2(list.length ? list.reduce((a, s) => a + s.net - s.refunded, 0) / list.length : 0),
    };
  };
  const monthly = ltvOf('monthly'), annual = ltvOf('annual');
  const n = monthly.subscribers + annual.subscribers;
  const blended = n ? round2((monthly.projectedLtvNet * monthly.subscribers + annual.projectedLtvNet * annual.subscribers) / n) : 0;

  // Turmas pelo mês da 1ª cobrança (calendário de Brasília).
  const monthKey = (t: number) => new Date(t - 3 * 3600000).toISOString().slice(0, 7);
  const cohorts = new Map<string, typeof all>();
  for (const s of everyone) { const k = monthKey(s.first); cohorts.set(k, [...(cohorts.get(k) ?? []), s]); }
  const cohortRows = [...cohorts.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([month, list]) => ({
    month,
    subscribers: list.filter(s => s.net - s.refunded > 0.01).length,
    monthly: list.filter(s => s.plan === 'monthly' && s.net - s.refunded > 0.01).length,
    annual: list.filter(s => s.plan === 'annual' && s.net - s.refunded > 0.01).length,
    renewed: list.filter(s => s.charges >= 2).length,
    refunded: list.filter(s => s.refunded > 0).length,
    netRealized: round2(list.reduce((a, s) => a + s.net - s.refunded, 0)),
    netPerSub: round2(list.reduce((a, s) => a + s.net - s.refunded, 0) / Math.max(1, list.filter(s => s.net - s.refunded > 0.01).length)),
  }));

  return NextResponse.json({
    payingSubscribers: n,
    realizedPerSubNet: round2(n ? all.reduce((a, s) => a + s.net - s.refunded, 0) / n : 0),
    blendedProjectedLtvNet: blended,
    plans: [monthly, annual],
    cohorts: cohortRows,
    reference: { monthly12m: 9, annual12m: 40, minSample: MIN_SAMPLE },
  });
}
