export const dynamic = 'force-dynamic';

/**
 * app/api/admin/metrics/route.ts
 * Admin metrics dashboard — Camada 1 (receita/retencao) + Camada 2 (custo OpenAI).
 * Protegido pelo ADMIN_SECRET (mesmo de /admin).
 *
 * Query params:
 *   ?days=7|30|90     — atalho (default 30)
 *   ?from=YYYY-MM-DD  — range custom (sobrescreve days)
 *   ?to=YYYY-MM-DD    — range custom
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? '';

// Preco da assinatura (em USD para padronizar com custo OpenAI)
// 39.90 BRL/mes * 0.19 (cambio aprox) = ~7.58 USD/mes
const MONTHLY_PRICE_USD = 7.58;
const YEARLY_PRICE_USD  = 72.00;  // 379 BRL/ano

function checkAuth(req: NextRequest) {
  const auth = req.headers.get('x-admin-secret') ?? req.nextUrl.searchParams.get('secret') ?? '';
  return ADMIN_SECRET && auth === ADMIN_SECRET;
}

function parseRange(req: NextRequest): { from: Date; to: Date; days: number } {
  const now = new Date();
  const to = req.nextUrl.searchParams.get('to');
  const from = req.nextUrl.searchParams.get('from');
  const daysParam = req.nextUrl.searchParams.get('days');

  if (from && to) {
    const f = new Date(from);
    const t = new Date(to);
    t.setHours(23, 59, 59, 999);
    const days = Math.max(1, Math.round((t.getTime() - f.getTime()) / 86400000));
    return { from: f, to: t, days };
  }

  const days = daysParam ? Math.max(1, parseInt(daysParam, 10)) : 30;
  const f = new Date(now);
  f.setDate(f.getDate() - days);
  return { from: f, to: now, days };
}

// Segmentation filters (?level=Novice&plan=monthly&institutional=no).
function parseFilters(req: NextRequest) {
  const level  = req.nextUrl.searchParams.get('level') || null;         // Novice | Inter | Advanced
  const plan   = req.nextUrl.searchParams.get('plan')  || null;         // trial | monthly | yearly | institutional
  return { level, plan };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/metrics
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { from, to, days } = parseRange(req);
  const filters = parseFilters(req);
  // Previous period of the SAME length, ending where current starts.
  const prevTo   = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - days * 86400000);
  const supabase = getSupabaseAdmin();

  // Types locais (Supabase retorna `unknown` sem tipagem global)
  type UserRow = {
    id: string;
    email?: string;
    name?: string | null;
    created_at: string;
    charlotte_level: string | null;
    is_institutional: boolean;
    subscription_status: string;
    subscription_product: string | null;
    subscription_expires_at: string | null;
    trial_ends_at: string | null;
    placement_test_done: boolean;
    expo_push_token: string | null;
  };
  type PracticeRow = { user_id: string; created_at: string; xp_earned: number | null };
  type PracticeWideRow = { user_id: string; created_at: string };
  type ProgressRow = { user_id: string; streak_days: number | null; total_xp: number | null };
  type NotifRow = { user_id: string; notification_type: string; status: string; created_at: string };
  type UsageRow = {
    user_id: string | null;
    endpoint: string;
    model: string;
    cost_usd: number | string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    audio_seconds: number | null;
    audio_input_min: number | null;
    audio_output_min: number | null;
    created_at: string;
  };

  // Fetch bases in parallel.
  // practicesAll (last 90d) powers DAU/WAU/MAU charts and retention cohorts;
  // practicesRange (in selected range) powers funnel + period-specific sums.
  const d90 = new Date();
  d90.setDate(d90.getDate() - 90);

  // openai_usage: pagina em blocos de 1000 (max-rows do PostgREST) para garantir
  // que todos os rows do periodo sejam contabilizados na agregacao por usuario.
  async function fetchAllUsage(): Promise<{ data: UsageRow[] | null; error: { message: string } | null }> {
    const PAGE = 1000;
    const fromIso = from.toISOString();
    const toIso   = to.toISOString();
    const baseQ   = () => supabase
      .from('openai_usage')
      .select('user_id, endpoint, model, total_tokens, cost_usd, created_at')
      .gte('created_at', fromIso)
      .lte('created_at', toIso);

    // Primeira pagina + count total
    const firstQ = () => supabase
      .from('openai_usage')
      .select('user_id, endpoint, model, total_tokens, cost_usd, created_at', { count: 'exact' })
      .gte('created_at', fromIso)
      .lte('created_at', toIso);
    const first = await firstQ().range(0, PAGE - 1) as unknown as { data: UsageRow[] | null; count: number | null; error: { message: string } | null };
    if (first.error) return { data: null, error: first.error };

    const rows = [...(first.data ?? [])];
    const total = first.count ?? rows.length;

    if (total > PAGE) {
      const extraPages = Math.ceil((total - PAGE) / PAGE);
      const extras = await Promise.all(
        Array.from({ length: extraPages }, (_, i) =>
          baseQ().range((i + 1) * PAGE, (i + 2) * PAGE - 1) as unknown as Promise<{ data: UsageRow[] | null }>
        )
      );
      for (const p of extras) rows.push(...(p.data ?? []));
    }

    return { data: rows, error: null };
  }

  const [usersRes, practicesRangeRes, practicesWideRes, progressRes, usageRes, notifRes, placementRes] = await Promise.all([
    supabase.from('charlotte_users').select('id, email, name, created_at, charlotte_level, is_institutional, subscription_status, subscription_product, subscription_expires_at, trial_ends_at, placement_test_done, expo_push_token'),
    supabase.from('charlotte_practices').select('user_id, created_at, xp_earned').gte('created_at', from.toISOString()).lte('created_at', to.toISOString()),
    supabase.from('charlotte_practices').select('user_id, created_at').gte('created_at', d90.toISOString()),
    supabase.from('charlotte_progress').select('user_id, streak_days, total_xp'),
    // openai_usage: paginado para superar o limite de 1000 rows do PostgREST
    fetchAllUsage(),
    // notification_logs tambem pode nao existir
    supabase.from('notification_logs').select('user_id, notification_type, status, created_at').gte('created_at', from.toISOString()).lte('created_at', to.toISOString()),
    // users.placement_test_done ja veio no users select acima; placementRes fica vazio por ora
    Promise.resolve({ data: null, error: null }),
  ]);

  if (usersRes.error)          return NextResponse.json({ error: usersRes.error.message },          { status: 500 });
  if (practicesRangeRes.error) return NextResponse.json({ error: practicesRangeRes.error.message }, { status: 500 });

  const usersAll       = (usersRes.data          ?? []) as unknown as UserRow[];
  let   practices      = (practicesRangeRes.data ?? []) as unknown as PracticeRow[];
  let   practicesWide  = (practicesWideRes.data  ?? []) as unknown as PracticeWideRow[];
  let   progress       = (progressRes.data       ?? []) as unknown as ProgressRow[];
  const usage          = (usageRes.data          ?? []) as unknown as UsageRow[];
  let   notifs         = (notifRes.data          ?? []) as unknown as NotifRow[];

  // Apply segmentation filters early so every downstream metric respects them.
  let users = usersAll;
  if (filters.level) {
    users = users.filter(u => u.charlotte_level === filters.level);
  }
  if (filters.plan) {
    // 'trial' filters by status; 'monthly' / 'yearly' filters by product.
    if (filters.plan === 'trial') users = users.filter(u => u.subscription_status === 'trial');
    else if (filters.plan === 'institutional') users = users.filter(u => u.is_institutional);
    else if (filters.plan === 'monthly' || filters.plan === 'yearly') {
      users = users.filter(u => u.subscription_product === filters.plan);
    }
  }
  const filteredIds = new Set(users.map(u => String(u.id)));
  if (filters.level || filters.plan) {
    practices     = practices.filter(p => filteredIds.has(String(p.user_id)));
    practicesWide = practicesWide.filter(p => filteredIds.has(String(p.user_id)));
    progress      = progress.filter(p => filteredIds.has(String(p.user_id)));
    notifs        = notifs.filter(n => filteredIds.has(String(n.user_id)));
  }

  // Tabela pode nao existir em algum ambiente (migration pendente).
  const usageTableMissing = Boolean(usageRes.error);
  const notifTableMissing = Boolean(notifRes.error);

  // ─────────────────────────────────────────────────────────────────────────
  // CAMADA 1 — RECEITA & RETENCAO
  // ─────────────────────────────────────────────────────────────────────────

  const nonInstitutional = users.filter(u => !u.is_institutional);

  // ── Receita ──────────────────────────────────────────────────────────────
  const activeSubs = nonInstitutional.filter(u => u.subscription_status === 'active');
  const monthlySubs = activeSubs.filter(u => u.subscription_product === 'monthly').length;
  const yearlySubs  = activeSubs.filter(u => u.subscription_product === 'yearly').length;
  // MRR considera yearly como /12
  const mrr = (monthlySubs * MONTHLY_PRICE_USD) + (yearlySubs * YEARLY_PRICE_USD / 12);
  const arr = mrr * 12;

  // ── Trial ────────────────────────────────────────────────────────────────
  const onTrial = nonInstitutional.filter(u => u.subscription_status === 'trial').length;

  // Trial -> paid: quem ja esteve em trial (hoje active/cancelled/expired)
  // Aproximacao: users com subscription_status != 'trial' e != 'none' que tiveram trial_ends_at
  const hadTrial = nonInstitutional.filter(u => u.trial_ends_at !== null).length;
  const convertedFromTrial = nonInstitutional.filter(u =>
    u.trial_ends_at !== null &&
    (u.subscription_status === 'active' || u.subscription_status === 'cancelled' || u.subscription_status === 'expired')
  ).length;
  const trialConversionPct = hadTrial === 0 ? null : Math.round((convertedFromTrial / hadTrial) * 100);

  // ── Churn ────────────────────────────────────────────────────────────────
  // Proxy: cancelled + expired entre non-institutional
  const churned = nonInstitutional.filter(u =>
    u.subscription_status === 'cancelled' || u.subscription_status === 'expired'
  ).length;
  const churnDenominator = churned + activeSubs.length;
  const churnPct = churnDenominator === 0 ? null : Math.round((churned / churnDenominator) * 100);

  // ── Renovacoes proximas (7 dias) ────────────────────────────────────────
  const in7d = new Date(); in7d.setDate(in7d.getDate() + 7);
  const renewals7d = activeSubs.filter(u => {
    if (!u.subscription_expires_at) return false;
    const exp = new Date(u.subscription_expires_at);
    return exp > new Date() && exp <= in7d;
  }).length;

  // ── Retention D1/D7/D30 ──────────────────────────────────────────────────
  // Proxy simples: entre users criados nos ultimos 60d, quantos praticaram apos X dias
  const d60 = new Date(); d60.setDate(d60.getDate() - 60);
  const cohortUsers = users.filter(u => new Date(u.created_at) >= d60);

  // Mapa user -> [timestamps de practices]
  const practicesByUser = new Map<string, Date[]>();
  for (const p of practices) {
    const uid = String(p.user_id);
    if (!practicesByUser.has(uid)) practicesByUser.set(uid, []);
    practicesByUser.get(uid)!.push(new Date(p.created_at));
  }

  const retentionAt = (targetDay: number) => {
    // entre cohort users com mais de X dias de idade, quantos praticaram apos dia X
    const eligibles = cohortUsers.filter(u => {
      const age = (Date.now() - new Date(u.created_at).getTime()) / 86400000;
      return age >= targetDay;
    });
    if (eligibles.length === 0) return null;
    const retained = eligibles.filter(u => {
      const acts = practicesByUser.get(String(u.id)) ?? [];
      const ageCreated = new Date(u.created_at).getTime();
      return acts.some(t => (t.getTime() - ageCreated) >= targetDay * 86400000);
    }).length;
    return Math.round((retained / eligibles.length) * 100);
  };

  const retention = {
    d1:  retentionAt(1),
    d7:  retentionAt(7),
    d30: retentionAt(30),
  };

  // ── Inativos com sub ativa (14 dias sem pratica) ────────────────────────
  const d14 = new Date(); d14.setDate(d14.getDate() - 14);
  const inactivePayingIds = activeSubs.filter(u => {
    const acts = practicesByUser.get(String(u.id)) ?? [];
    const lastAct = acts.length ? Math.max(...acts.map(t => t.getTime())) : 0;
    return lastAct < d14.getTime();
  }).map(u => u.id);
  const inactivePaying = inactivePayingIds.length;

  // ── Novos usuarios no periodo ────────────────────────────────────────────
  const newUsers = users.filter(u => new Date(u.created_at) >= from && new Date(u.created_at) <= to).length;

  // ─────────────────────────────────────────────────────────────────────────
  // CAMADA 2 — CUSTO OPENAI (no periodo)
  // ─────────────────────────────────────────────────────────────────────────

  const usageRows = usage;

  const totalCost = usageRows.reduce((s, r) => s + Number(r.cost_usd || 0), 0);
  const callCount = usageRows.length;

  // Por endpoint
  const costByEndpoint: Record<string, { cost: number; calls: number; tokens: number }> = {};
  for (const r of usageRows) {
    if (!costByEndpoint[r.endpoint]) costByEndpoint[r.endpoint] = { cost: 0, calls: 0, tokens: 0 };
    costByEndpoint[r.endpoint].cost  += Number(r.cost_usd || 0);
    costByEndpoint[r.endpoint].calls += 1;
    costByEndpoint[r.endpoint].tokens += (r.total_tokens || 0);
  }
  const byEndpoint = Object.entries(costByEndpoint)
    .map(([endpoint, v]) => ({ endpoint, ...v, cost: round6(v.cost) }))
    .sort((a, b) => b.cost - a.cost);

  // Por model
  const costByModel: Record<string, { cost: number; calls: number; tokens: number }> = {};
  for (const r of usageRows) {
    if (!costByModel[r.model]) costByModel[r.model] = { cost: 0, calls: 0, tokens: 0 };
    costByModel[r.model].cost  += Number(r.cost_usd || 0);
    costByModel[r.model].calls += 1;
    costByModel[r.model].tokens += (r.total_tokens || 0);
  }
  const byModel = Object.entries(costByModel)
    .map(([model, v]) => ({ model, ...v, cost: round6(v.cost) }))
    .sort((a, b) => b.cost - a.cost);

  // Top 10 users por custo — separa custos do sistema de custos de usuarios reais
  const SYSTEM_IDS = new Set(['system:scheduler', 'system:tts-cache', 'anonymous']);
  const SYSTEM_LABELS: Record<string, string> = {
    'system:scheduler': 'Notificacoes (scheduler)',
    'system:tts-cache': 'TTS Cache (vocabulario)',
    'anonymous':        'Sem usuario (bug)',
  };

  const costByUser: Record<string, number>   = {};
  const costBySystem: Record<string, number> = {};
  for (const r of usageRows) {
    const uid = r.user_id ?? 'anonymous';
    if (SYSTEM_IDS.has(uid) || uid.startsWith('system:')) {
      costBySystem[uid] = (costBySystem[uid] ?? 0) + Number(r.cost_usd || 0);
    } else {
      costByUser[uid] = (costByUser[uid] ?? 0) + Number(r.cost_usd || 0);
    }
  }

  const userMap = new Map(users.map(u => [String(u.id), u]));
  const topUsers = Object.entries(costByUser)
    .map(([userId, cost]) => {
      const u = userMap.get(userId);
      return {
        userId,
        email: u?.email ?? null,
        name:  u?.name  ?? null,
        cost:  round6(cost),
      };
    })
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10);

  const systemCosts = Object.entries(costBySystem)
    .map(([uid, cost]) => ({
      label: SYSTEM_LABELS[uid] ?? uid,
      cost:  round6(cost),
    }))
    .sort((a, b) => b.cost - a.cost);

  // Custo medio por assinante ativo (aproximacao — no periodo inteiro)
  const costPerActiveSub = activeSubs.length === 0 ? 0 : totalCost / activeSubs.length;

  // Custo por dia (serie temporal — ultimos 30 buckets do range)
  const costPerDay: Record<string, number> = {};
  for (const r of usageRows) {
    const day = (r.created_at as string).slice(0, 10);
    costPerDay[day] = (costPerDay[day] ?? 0) + Number(r.cost_usd || 0);
  }
  const timeseries = Object.entries(costPerDay)
    .map(([date, cost]) => ({ date, cost: round6(cost) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // ─────────────────────────────────────────────────────────────────────────
  // CAMADA 3 — MRR TREND / QUICK RATIO (item 1)
  // ─────────────────────────────────────────────────────────────────────────

  // New MRR no periodo — assinaturas ativas criadas dentro do range, × rate.
  const newInRange = activeSubs.filter(u => {
    const c = new Date(u.created_at);
    return c >= from && c <= to;
  });
  const newMonthly = newInRange.filter(u => u.subscription_product === 'monthly').length;
  const newYearly  = newInRange.filter(u => u.subscription_product === 'yearly').length;
  const newMrr = (newMonthly * MONTHLY_PRICE_USD) + (newYearly * YEARLY_PRICE_USD / 12);

  // Churned MRR no periodo — assinaturas expiradas/canceladas com
  // subscription_expires_at dentro do range.
  const churnedInRange = nonInstitutional.filter(u => {
    if (u.subscription_status !== 'cancelled' && u.subscription_status !== 'expired') return false;
    if (!u.subscription_expires_at) return false;
    const exp = new Date(u.subscription_expires_at);
    return exp >= from && exp <= to;
  });
  const churnedMonthly = churnedInRange.filter(u => u.subscription_product === 'monthly').length;
  const churnedYearly  = churnedInRange.filter(u => u.subscription_product === 'yearly').length;
  const churnedMrr = (churnedMonthly * MONTHLY_PRICE_USD) + (churnedYearly * YEARLY_PRICE_USD / 12);

  const quickRatio = churnedMrr <= 0.001
    ? (newMrr > 0 ? 99 : 0)
    : round2(newMrr / churnedMrr);

  // Novos assinantes por semana (12 semanas) — usado em MRR trend chart.
  const mrrWeekly: Record<string, number> = {};
  const d84 = new Date(); d84.setDate(d84.getDate() - 84);
  for (const u of nonInstitutional) {
    if (u.subscription_status !== 'active' && u.subscription_status !== 'cancelled' && u.subscription_status !== 'expired') continue;
    const c = new Date(u.created_at);
    if (c < d84) continue;
    const weekStart = new Date(c);
    weekStart.setUTCHours(0, 0, 0, 0);
    weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
    const key = weekStart.toISOString().slice(0, 10);
    const rate = u.subscription_product === 'yearly' ? YEARLY_PRICE_USD / 12 : MONTHLY_PRICE_USD;
    mrrWeekly[key] = (mrrWeekly[key] ?? 0) + rate;
  }
  const mrrTrend = Object.entries(mrrWeekly)
    .map(([week, amount]) => ({ week, amount: round2(amount) }))
    .sort((a, b) => a.week.localeCompare(b.week));

  // ─────────────────────────────────────────────────────────────────────────
  // CAMADA 4 — ENGAGEMENT / DAU-WAU-MAU (item 2)
  // ─────────────────────────────────────────────────────────────────────────

  const nowTs = Date.now();
  const practicesWideByUser = new Map<string, number[]>();
  for (const p of practicesWide) {
    const uid = String(p.user_id);
    const ts  = new Date(p.created_at).getTime();
    if (!practicesWideByUser.has(uid)) practicesWideByUser.set(uid, []);
    practicesWideByUser.get(uid)!.push(ts);
  }

  const oneDay = 86400000;
  const dauUsers = new Set<string>();
  const wauUsers = new Set<string>();
  const mauUsers = new Set<string>();
  for (const [uid, tsArr] of practicesWideByUser) {
    for (const t of tsArr) {
      const age = nowTs - t;
      if (age <= oneDay)     dauUsers.add(uid);
      if (age <= 7 * oneDay) wauUsers.add(uid);
      if (age <= 30 * oneDay) mauUsers.add(uid);
    }
  }
  const dau = dauUsers.size;
  const wau = wauUsers.size;
  const mau = mauUsers.size;
  const stickinessPct = mau === 0 ? null : Math.round((dau / mau) * 100);

  // DAU por dia — ultimos 90 dias.
  const dauByDay: Record<string, Set<string>> = {};
  for (let i = 0; i < 90; i++) {
    const d = new Date(nowTs - i * oneDay);
    dauByDay[d.toISOString().slice(0, 10)] = new Set();
  }
  for (const p of practicesWide) {
    const day = (p.created_at as string).slice(0, 10);
    if (dauByDay[day]) dauByDay[day].add(String(p.user_id));
  }
  const dauTimeseries = Object.entries(dauByDay)
    .map(([date, s]) => ({ date, dau: s.size }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // ─────────────────────────────────────────────────────────────────────────
  // CAMADA 5 — FUNIL DE ATIVACAO (item 3)
  // ─────────────────────────────────────────────────────────────────────────

  // Cohort: nao-institucionais criados no range.
  const funnelCohort = nonInstitutional.filter(u => {
    const c = new Date(u.created_at);
    return c >= from && c <= to;
  });

  // Mapa de pratica (agora usa practicesWide por ser cohort potencialmente maior
  // que o range selecionado — ex: range 7d mas funil fica em 90d).
  const funnelPracticeCount = new Map<string, number>();
  for (const p of practicesWide) {
    const uid = String(p.user_id);
    funnelPracticeCount.set(uid, (funnelPracticeCount.get(uid) ?? 0) + 1);
  }

  const signups       = funnelCohort.length;
  const didPlacement  = funnelCohort.filter(u => u.placement_test_done === true).length;
  const firstPractice = funnelCohort.filter(u => (funnelPracticeCount.get(String(u.id)) ?? 0) >= 1).length;
  const threePractices = funnelCohort.filter(u => (funnelPracticeCount.get(String(u.id)) ?? 0) >= 3).length;
  const trialToPaid   = funnelCohort.filter(u =>
    u.trial_ends_at != null &&
    (u.subscription_status === 'active' || u.subscription_status === 'cancelled' || u.subscription_status === 'expired')
  ).length;

  // Retained 30d entre cohort users com idade ≥ 30 dias.
  const retained30Base = funnelCohort.filter(u => {
    const age = (nowTs - new Date(u.created_at).getTime()) / oneDay;
    return age >= 30;
  });
  const retained30 = retained30Base.filter(u => {
    const created = new Date(u.created_at).getTime();
    const tsArr = practicesWideByUser.get(String(u.id)) ?? [];
    return tsArr.some(t => (t - created) >= 30 * oneDay);
  }).length;

  const funnelStages = [
    { stage: 'signup',          label: 'Signup',                 count: signups },
    { stage: 'placement',       label: 'Placement test done',    count: didPlacement },
    { stage: 'first_practice',  label: '1a pratica',             count: firstPractice },
    { stage: 'three_practices', label: '3+ praticas',            count: threePractices },
    { stage: 'trial_to_paid',   label: 'Trial → pago',           count: trialToPaid },
    { stage: 'retained_30d',    label: 'Retidos 30d',
      count: retained30, eligibleDenominator: retained30Base.length },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // CAMADA 6 — STREAK DISTRIBUTION (item 4)
  // ─────────────────────────────────────────────────────────────────────────

  const nonInstIds = new Set(nonInstitutional.map(u => String(u.id)));
  const streakBuckets = { '0': 0, '1-3': 0, '4-7': 0, '8-14': 0, '15-30': 0, '30+': 0 };
  let usersWithProgress = 0;
  for (const p of progress) {
    if (!nonInstIds.has(String(p.user_id))) continue;
    const s = p.streak_days ?? 0;
    usersWithProgress += 1;
    if (s === 0) streakBuckets['0']  += 1;
    else if (s <= 3)  streakBuckets['1-3']  += 1;
    else if (s <= 7)  streakBuckets['4-7']  += 1;
    else if (s <= 14) streakBuckets['8-14'] += 1;
    else if (s <= 30) streakBuckets['15-30'] += 1;
    else              streakBuckets['30+']  += 1;
  }
  const streakDistribution = Object.entries(streakBuckets).map(([bucket, count]) => ({ bucket, count }));

  // ─────────────────────────────────────────────────────────────────────────
  // CAMADA 7 — PUSH NOTIFICATIONS (item 5)
  // ─────────────────────────────────────────────────────────────────────────

  const activeTokens = users.filter(u => u.expo_push_token && u.expo_push_token.startsWith('ExponentPushToken[')).length;

  const sentNotifs   = notifs.filter(n => n.status === 'sent' && n.notification_type !== 'scheduler_lock');
  const failedNotifs = notifs.filter(n => n.status === 'failed');
  const totalAttempts = sentNotifs.length + failedNotifs.length;
  const deliveryRatePct = totalAttempts === 0 ? null : Math.round((sentNotifs.length / totalAttempts) * 100);

  // Por tipo
  const byNotifType: Record<string, { sent: number; users: Set<string> }> = {};
  for (const n of sentNotifs) {
    const key = n.notification_type;
    if (!byNotifType[key]) byNotifType[key] = { sent: 0, users: new Set() };
    byNotifType[key].sent += 1;
    byNotifType[key].users.add(String(n.user_id));
  }
  const notificationsByType = Object.entries(byNotifType)
    .map(([type, v]) => ({ type, sent: v.sent, uniqueUsers: v.users.size }))
    .sort((a, b) => b.sent - a.sent);

  // Por categoria (engagement atual ja define os 15 tipos de re-engagement).
  const CORE_TYPES = new Set(['streak_reminder', 'daily_reminder', 'charlotte_message', 'xp_milestone', 'goal_reminder', 'weekly_challenge']);
  const PREVENTION_TYPES = new Set(['streak_saver', 'streak_milestone_ahead', 'level_imminent', 'micro_checkin', 'cadence_drop', 'weekly_recap', 'charlotte_checkin']);
  const REVENUE_TYPES = new Set(['trial_ending_72h', 'trial_ending_24h', 'sub_expired_1d']);
  const WINBACK_TYPES = new Set(['streak_broken', 'reengagement_3d', 'reengagement_7d', 'reengagement_14d', 'reengagement_30d']);

  const notifsByCategory = { core: 0, prevention: 0, revenue: 0, winback: 0 };
  for (const n of sentNotifs) {
    if      (CORE_TYPES.has(n.notification_type))       notifsByCategory.core       += 1;
    else if (PREVENTION_TYPES.has(n.notification_type)) notifsByCategory.prevention += 1;
    else if (REVENUE_TYPES.has(n.notification_type))    notifsByCategory.revenue    += 1;
    else if (WINBACK_TYPES.has(n.notification_type))    notifsByCategory.winback    += 1;
  }

  // Timeline por dia
  const notifsByDay: Record<string, number> = {};
  for (const n of sentNotifs) {
    const day = (n.created_at as string).slice(0, 10);
    notifsByDay[day] = (notifsByDay[day] ?? 0) + 1;
  }
  const notifsTimeseries = Object.entries(notifsByDay)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // ─────────────────────────────────────────────────────────────────────────
  // CAMADA 8 — RETENTION CURVES por cohort semanal (item 6)
  // ─────────────────────────────────────────────────────────────────────────

  // Ultimas 8 cohorts semanais + survival rate a cada semana ate 8 semanas.
  const weeksAgo = (n: number) => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // Mon start
    d.setUTCDate(d.getUTCDate() - n * 7);
    return d;
  };
  const cohortWeeks: { start: Date; end: Date }[] = [];
  for (let w = 7; w >= 0; w--) {
    const start = weeksAgo(w);
    const end   = new Date(start.getTime() + 7 * oneDay - 1);
    cohortWeeks.push({ start, end });
  }

  const retentionCohorts = cohortWeeks.map(({ start, end }) => {
    const cohort = users.filter(u => {
      const c = new Date(u.created_at);
      return c >= start && c <= end;
    });
    const size = cohort.length;
    const survivalAt = (weeksOffset: number) => {
      if (size === 0) return null;
      const threshold = weeksOffset * 7 * oneDay;
      const retainedCount = cohort.filter(u => {
        const age = nowTs - new Date(u.created_at).getTime();
        if (age < threshold) return null;
        const tsArr = practicesWideByUser.get(String(u.id)) ?? [];
        const created = new Date(u.created_at).getTime();
        return tsArr.some(t => (t - created) >= threshold);
      }).filter(Boolean).length;
      // Eligible = cohort size (they've all aged at least weeksOffset weeks
      // only if the cohort's end >= weeksOffset weeks ago).
      const cohortOldestAge = nowTs - start.getTime();
      if (cohortOldestAge < threshold) return null;
      return Math.round((retainedCount / size) * 100);
    };
    return {
      cohort: start.toISOString().slice(0, 10),
      size,
      survival: {
        w1: survivalAt(1), w2: survivalAt(2), w3: survivalAt(3),
        w4: survivalAt(4), w6: survivalAt(6), w8: survivalAt(8),
      },
    };
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CAMADA 9 — TIME TO FIRST VALUE (item 7)
  // ─────────────────────────────────────────────────────────────────────────

  const ttfvHours: number[] = [];
  for (const u of users) {
    const arr = practicesWideByUser.get(String(u.id)) ?? [];
    if (!arr.length) continue;
    const first = Math.min(...arr);
    const createdAt = new Date(u.created_at).getTime();
    const hours = (first - createdAt) / 3600000;
    if (hours < 0) continue; // impossible, defensive
    ttfvHours.push(hours);
  }
  ttfvHours.sort((a, b) => a - b);
  const percentile = (arr: number[], p: number) =>
    arr.length === 0 ? null : arr[Math.min(arr.length - 1, Math.floor(arr.length * p))];
  const ttfvBuckets = [
    { bucket: '<1h',     min: 0,      max: 1 },
    { bucket: '1-24h',   min: 1,      max: 24 },
    { bucket: '1-3d',    min: 24,     max: 72 },
    { bucket: '3-7d',    min: 72,     max: 168 },
    { bucket: '7-30d',   min: 168,    max: 720 },
    { bucket: '>30d',    min: 720,    max: Infinity },
  ];
  const ttfvDistribution = ttfvBuckets.map(b => ({
    bucket: b.bucket,
    count:  ttfvHours.filter(h => h >= b.min && h < b.max).length,
  }));
  const timeToFirstValue = {
    sampleSize: ttfvHours.length,
    medianHours: percentile(ttfvHours, 0.5),
    p90Hours:    percentile(ttfvHours, 0.9),
    distribution: ttfvDistribution,
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CAMADA 10 — PRACTICE HEATMAP hora local × dia da semana (item 11)
  // ─────────────────────────────────────────────────────────────────────────

  // Assume BRT (UTC-3) por enquanto — maioria dos users. Poderia virar
  // per-user timezone depois quando a base diversificar.
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const p of practicesWide) {
    const d = new Date(p.created_at);
    const brt = new Date(d.getTime() - 3 * 3600000);
    const dow = brt.getUTCDay(); // 0 = Sunday
    const h   = brt.getUTCHours();
    heatmap[dow][h] += 1;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CAMADA 11 — PREVIOUS PERIOD comparison (itens 9 e 10)
  // ─────────────────────────────────────────────────────────────────────────

  // Key metrics recomputed for prevFrom..prevTo so the UI pode mostrar
  // trend arrows e detectar anomalias.
  const prevPracticesByUser = new Map<string, number[]>();
  for (const p of practicesWide) {
    const t = new Date(p.created_at).getTime();
    if (t < prevFrom.getTime() || t > prevTo.getTime()) continue;
    const uid = String(p.user_id);
    if (!prevPracticesByUser.has(uid)) prevPracticesByUser.set(uid, []);
    prevPracticesByUser.get(uid)!.push(t);
  }
  const prevDauUsers = new Set<string>();
  for (const [uid, arr] of prevPracticesByUser) {
    const mostRecent = Math.max(...arr);
    if ((prevTo.getTime() - mostRecent) <= oneDay) prevDauUsers.add(uid);
  }
  const prevMau = prevPracticesByUser.size;
  const prevNewUsers = users.filter(u => {
    const c = new Date(u.created_at);
    return c >= prevFrom && c <= prevTo;
  }).length;
  const prevSent = notifs.filter(n =>
    n.status === 'sent' &&
    n.notification_type !== 'scheduler_lock' &&
    new Date(n.created_at) >= prevFrom && new Date(n.created_at) <= prevTo,
  ).length;
  const prevCost = usage
    .filter(r => new Date(r.created_at) >= prevFrom && new Date(r.created_at) <= prevTo)
    .reduce((s, r) => s + Number(r.cost_usd || 0), 0);

  const previousPeriod = {
    range: { from: prevFrom.toISOString(), to: prevTo.toISOString() },
    newUsers: prevNewUsers,
    dau:      prevDauUsers.size,
    mau:      prevMau,
    notificationsSent: prevSent,
    totalCost: round6(prevCost),
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CAMADA 12 — ALERTAS / ANOMALIAS (item 10)
  // ─────────────────────────────────────────────────────────────────────────

  type Alert = { severity: 'warn' | 'critical'; message: string };
  const alerts: Alert[] = [];

  // Churn alert
  if (churnPct != null && churnPct >= 10) {
    alerts.push({
      severity: churnPct >= 20 ? 'critical' : 'warn',
      message: `Churn em ${churnPct}% — acima do saudavel (<10%).`,
    });
  }

  // Stickiness
  if (stickinessPct != null && stickinessPct < 20 && mau > 0) {
    alerts.push({
      severity: 'warn',
      message: `Stickiness (DAU/MAU) em ${stickinessPct}% — abaixo do benchmark de 20%.`,
    });
  }

  // Delivery rate
  if (deliveryRatePct != null && deliveryRatePct < 95 && totalAttempts >= 10) {
    alerts.push({
      severity: deliveryRatePct < 85 ? 'critical' : 'warn',
      message: `Taxa de entrega de push em ${deliveryRatePct}%. Verifique tokens/FCM.`,
    });
  }

  // Cost per active sub up > 30%
  const prevCostPerActive = activeSubs.length > 0 ? prevCost / activeSubs.length : 0;
  if (prevCostPerActive > 0 && costPerActiveSub > prevCostPerActive * 1.3) {
    const pctUp = Math.round(((costPerActiveSub - prevCostPerActive) / prevCostPerActive) * 100);
    alerts.push({
      severity: 'warn',
      message: `Custo por assinante subiu ${pctUp}% vs periodo anterior.`,
    });
  }

  // DAU dropping vs prev
  if (prevDauUsers.size >= 5 && dau < prevDauUsers.size * 0.7) {
    const pctDown = Math.round(((prevDauUsers.size - dau) / prevDauUsers.size) * 100);
    alerts.push({
      severity: 'warn',
      message: `DAU caiu ${pctDown}% vs periodo anterior.`,
    });
  }

  // Trial conversion tanking
  if (trialConversionPct != null && trialConversionPct < 15 && hadTrial >= 10) {
    alerts.push({
      severity: 'warn',
      message: `Conversao trial → pago em ${trialConversionPct}%. Benchmark SaaS: 25-40%.`,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  return NextResponse.json({
    range: { from: from.toISOString(), to: to.toISOString(), days },
    revenue: {
      mrr: round2(mrr),
      arr: round2(arr),
      activeSubs: activeSubs.length,
      monthlySubs,
      yearlySubs,
      onTrial,
      trialConversionPct,
      churnPct,
      renewals7d,
      inactivePaying,
      newUsers,
      totalUsers: (users ?? []).length,
      totalNonInstitutional: nonInstitutional.length,
    },
    retention,
    openai: {
      tableMissing: usageTableMissing,
      totalCost: round6(totalCost),
      callCount,
      costPerActiveSub: round6(costPerActiveSub),
      byEndpoint,
      byModel,
      topUsers,
      systemCosts,
      timeseries,
    },
    // ── New sections (high-priority pack) ───────────────────────────────
    mrrHealth: {
      newMrr:      round2(newMrr),
      churnedMrr:  round2(churnedMrr),
      quickRatio,
      newInRange:     { monthly: newMonthly,     yearly: newYearly,     count: newInRange.length },
      churnedInRange: { monthly: churnedMonthly, yearly: churnedYearly, count: churnedInRange.length },
      mrrTrend,
    },
    engagement: {
      dau, wau, mau,
      stickinessPct,
      dauTimeseries,
    },
    activationFunnel: funnelStages,
    streakDistribution,
    notifications: {
      tableMissing: notifTableMissing,
      activeTokens,
      totalUsers: users.length,
      sent: sentNotifs.length,
      failed: failedNotifs.length,
      deliveryRatePct,
      byType: notificationsByType,
      byCategory: notifsByCategory,
      timeseries: notifsTimeseries,
    },
    // ── Medium priority + polish (items 6–11) ──────────────────────────
    retentionCohorts,
    timeToFirstValue,
    practiceHeatmap: heatmap,
    previousPeriod,
    alerts,
    filters,
  });
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }
function round6(n: number): number { return Math.round(n * 1000000) / 1000000; }
