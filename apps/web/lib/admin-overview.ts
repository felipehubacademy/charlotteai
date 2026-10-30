// lib/admin-overview.ts — números da "Visão geral" do /admin (tela inicial da gestão).
//
// Tudo é calculado na hora, numa única leitura do banco, com as mesmas regras de Métricas, Usuários,
// Financeiro e Suporte (lib/admin-subscriptions, lib/revenue-day, lib/ops-monitor, lib/signup-welcome):
//  - Equipe fora de tudo (is_institutional, hide_from_ranking, @hubacademybr.com, @queizy.com, felipe.xavier1987+).
//  - Dias no calendário de Brasília; hoje está pela metade.
//  - Os quatro grupos de usuários (degustação, teste grátis, pagantes, sem acesso) somam exatamente o total.
// Sem números pedagógicos (lições, onde travaram): isso fica no Pedagógico.
import { countsInUnitCost } from '@/lib/unit-cost';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { revenueAtMs } from '@/lib/revenue-day';
import { lateSignupWelcomes } from '@/lib/signup-welcome';
import {
  DAY, brtDay, brtDayStart, dayKey, ms, isTeamAccount, chargeIndex, subscriptionKind, monthlyValueOf,
  isStoreProduct, isSiteProduct, isPaidKind, isTrialKind, firstChargeDay, type SubKind,
} from '@/lib/admin-subscriptions';

type DbError = { message: string } | null;

// PostgREST devolve no máximo 1000 linhas por consulta: pagina até o fim (sempre com ordem fixa).
async function paged<T>(build: (from: number, to: number) => PromiseLike<{ data: unknown; error: DbError }>, max = 200000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}
// Tabelas grandes: conta antes e busca as páginas em paralelo (8 por vez).
async function pagedParallel<T>(
  countQ: () => PromiseLike<{ count: number | null; error: DbError }>,
  pageQ: (from: number, to: number) => PromiseLike<{ data: unknown; error: DbError }>,
): Promise<T[]> {
  const { count, error } = await countQ();
  if (error) throw new Error(error.message);
  const starts = Array.from({ length: Math.ceil((count ?? 0) / 1000) + 1 }, (_, i) => i * 1000);
  const out: T[] = [];
  for (let i = 0; i < starts.length; i += 8) {
    const res = await Promise.all(starts.slice(i, i + 8).map(s => pageQ(s, s + 999)));
    for (const r of res) {
      if (r.error) throw new Error(r.error.message);
      out.push(...((r.data ?? []) as T[]));
    }
  }
  return out;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);

const CAPACITY_LIMITS = { db: 500 * 1024 * 1024, storage: 1024 * 1024 * 1024 }; // plano gratuito (cron capacity-alert)
const CAPACITY_WARN = 0.7;
const SUPPORT_SLA_HOURS = 2; // lib/support-service.ts
const CHANNEL_LABEL: Record<string, string> = { email: 'E-mail', whatsapp: 'WhatsApp', app: 'Chat do app', instagram: 'Instagram' };

export interface DayPoint { date: string; value: number }
export interface TodayMetric { key: string; label: string; today: number; yesterday: number; series: DayPoint[]; money?: boolean }
export interface AlertItem { key: string; ok: boolean; label: string; href?: string }

// Custo de servir por usuário no mês: lançamentos do Financeiro marcados como custo de operação
// + taxas de venda retidas na fonte (lojas e site = bruto - líquido de cada cobrança).
export interface UnitCost {
  label: string;
  total: number;
  byCategory: { category: string; brl: number }[];
  salesFees: number;
  activeUsers: number; perActive: number | null;
  payers: number; perPayer: number | null;
}

export interface Overview {
  generatedAt: string;
  today: string;
  alerts: { allOk: boolean; items: AlertItem[] };
  users: {
    total: number; newToday: number; new30d: number;
    taste: number;
    trial: number; trialCancelled: number; trialStore: number; trialSite: number; trialLegacy: number;
    paying: number; payingCancelled: number;
    noAccess: number;
  };
  todayVsYesterday: TodayMetric[];
  funnel30d: { key: string; label: string; count: number; pctOfSignups: number | null; stepPct: number | null; stepOf: string | null }[];
  money: {
    mrr: number; renewing: number; mrrIfTrialsConvert: number; trialsToCharge: number;
    month: { label: string; gross: number; net: number; charges: number; refunds: number; refundsBrl: number };
    firstCharges7d: { total: number; days: { date: string; store: number; site: number }[] };
    cancelledWithAccess: { total: number; trial: number; paying: number };
    unitCost: UnitCost;
  };
  engagement: {
    d1: { pct: number | null; retained: number; eligible: number };
    d7: { pct: number | null; retained: number; eligible: number };
    activeStreaks: number; practicedToday: number;
    dau7: DayPoint[];
  };
  support: {
    openTickets: number; withAi: number; waitingOverSla: number;
    week: { total: number; byChannel: { channel: string; label: string; count: number }[] };
    firstResponse: { avgMinutes: number | null; samples: number; allByAi: boolean };
  };
}

type UserRow = {
  id: string; email: string | null; created_at: string; is_institutional: boolean | null; hide_from_ranking: boolean | null;
  subscription_status: string | null; subscription_product: string | null; subscription_expires_at: string | null; trial_ends_at: string | null;
};
type RevRow = { app_user_id: string; event_type: string; store: string | null; price_purchased: number | null; gross_brl: number | null; net_brl: number | null; purchased_at: string | null; created_at: string | null };
type CkRow = { user_id: string; value_brl: number; trial_days: number | null; status: string; asaas_payment_id: string | null; paid_at: string | null; refunded_at: string | null; created_at: string };

/** Usuários (sem a equipe) divididos em grupos que somam o total. Usado pela visão geral e pela atualização rápida. */
function partitionUsers(usersAll: UserRow[], revAll: RevRow[], ckAll: CkRow[], nowMs: number) {
  const today = brtDay(nowMs);
  // ── Equipe fora ──────────────────────────────────────────────────────────
    const teamIds = new Set(usersAll.filter(isTeamAccount).map(u => String(u.id)));
    const notTeam = (id: string | null | undefined) => !!id && !teamIds.has(String(id));
    const users = usersAll.filter(u => notTeam(u.id));
    const rev = revAll.filter(r => notTeam(r.app_user_id));
    const cks = ckAll.filter(c => notTeam(c.user_id));

    // ── Situação de cada conta (mesma regra de Métricas e Usuários) ──────────
    const { firstChargeAt, siteCk } = chargeIndex(rev, cks);
    const kindOf = new Map<string, SubKind>(users.map(u => [String(u.id), subscriptionKind(u, firstChargeAt.has(String(u.id)), nowMs)]));
    const kind = (u: UserRow) => kindOf.get(String(u.id)) ?? null;
    const isTaster = (u: UserRow) => !u.subscription_status || u.subscription_status === 'none';

    // Grupos que somam o total: cada conta cai em exatamente um.
    const tasters = users.filter(isTaster);
    const trial = users.filter(u => !isTaster(u) && isTrialKind(kind(u)));
    const paying = users.filter(u => !isTaster(u) && isPaidKind(kind(u)));
    const noAccess = users.filter(u => !isTaster(u) && !isTrialKind(kind(u)) && !isPaidKind(kind(u)));

    const createdDay = (u: UserRow) => brtDay(ms(u.created_at));
    const usersBlock = {
      total: users.length,
      newToday: users.filter(u => createdDay(u) === today).length,
      new30d: users.filter(u => createdDay(u) >= today - 29).length,
      taste: tasters.length,
      trial: trial.length,
      trialCancelled: trial.filter(u => u.subscription_status === 'cancelled').length,
      trialStore: trial.filter(u => kind(u) === 'trial_store').length,
      trialSite: trial.filter(u => kind(u) === 'trial_site').length,
      trialLegacy: trial.filter(u => kind(u) === 'trial_legacy').length,
      paying: paying.length,
      payingCancelled: paying.filter(u => u.subscription_status === 'cancelled').length,
      noAccess: noAccess.length,
    };
  return { users, rev, cks, notTeam, kind, isTaster, usersBlock, firstChargeAt, siteCk, trial, paying, tasters, noAccess };
}

/** Só o bloco de usuários (consulta leve), para a tela atualizar a cada poucos segundos. */
export async function computeUsersBlock(nowMs = Date.now()) {
  const supabase = getSupabaseAdmin();
  const [usersAll, revAll, ckAll] = await Promise.all([
    paged<UserRow>((a, b) => supabase.from('charlotte_users')
      .select('id, email, created_at, is_institutional, hide_from_ranking, subscription_status, subscription_product, subscription_expires_at, trial_ends_at')
      .order('id').range(a, b)),
    paged<RevRow>((a, b) => supabase.from('revenue_events').select('app_user_id, event_type, store, price_purchased, gross_brl, net_brl, purchased_at, created_at').order('id').range(a, b)),
    paged<CkRow>((a, b) => supabase.from('asaas_checkouts').select('user_id, value_brl, trial_days, status, asaas_payment_id, paid_at, refunded_at, created_at')
      .eq('sandbox', false).order('created_at', { ascending: true }).order('id').range(a, b)),
  ]);
  return { generatedAt: new Date(nowMs).toISOString(), users: partitionUsers(usersAll, revAll, ckAll, nowMs).usersBlock };
}

export async function computeOverview(nowMs = Date.now()): Promise<Overview> {
  const supabase = getSupabaseAdmin();
  const today = brtDay(nowMs);
  const iso = (t: number) => new Date(t).toISOString();
  // Atividades: 31 dias cobrem o funil (30 dias), a retenção (coorte de 14 dias) e os gráficos de 7 dias.
  const practicesFrom = iso(brtDayStart(today - 30));
  const weekAgo = iso(nowMs - 7 * DAY);
  const monthKey = dayKey(today).slice(0, 7);
  const nextMonthFirst = (() => { const [y, m] = monthKey.split('-').map(Number); return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10); })();

  type ConvRow = { id: string; channel: string; status: string; created_at: string; last_inbound_at: string | null };
  type MsgRow = { conversation_id: string; direction: string; author: string | null; created_at: string };

  const [
    usersAll, practices, progress, revAll, ckAll, purchaseEvents, usage,
    weekConvs, openConvs, capacityRes, opsAlertsRes, opsErrorsRes, outboxStuckRes, welcome, financeRes,
  ] = await Promise.all([
    paged<UserRow>((a, b) => supabase.from('charlotte_users')
      .select('id, email, created_at, is_institutional, hide_from_ranking, subscription_status, subscription_product, subscription_expires_at, trial_ends_at')
      .order('id').range(a, b)),
    // Resgates de recompensa ficam fora (não são uso), como em Métricas.
    pagedParallel<{ user_id: string; created_at: string }>(
      () => supabase.from('charlotte_practices').select('id', { count: 'exact', head: true }).not('practice_type', 'like', '%reward%').gte('created_at', practicesFrom),
      (a, b) => supabase.from('charlotte_practices').select('user_id, created_at').not('practice_type', 'like', '%reward%').gte('created_at', practicesFrom).order('id').range(a, b),
    ),
    paged<{ user_id: string; streak_days: number | null; last_practice_date: string | null }>((a, b) =>
      supabase.from('charlotte_progress').select('user_id, streak_days, last_practice_date').order('user_id').range(a, b)),
    paged<RevRow>((a, b) => supabase.from('revenue_events').select('app_user_id, event_type, store, price_purchased, gross_brl, net_brl, purchased_at, created_at').order('id').range(a, b)),
    paged<CkRow>((a, b) => supabase.from('asaas_checkouts').select('user_id, value_brl, trial_days, status, asaas_payment_id, paid_at, refunded_at, created_at')
      .eq('sandbox', false).order('created_at', { ascending: true }).order('id').range(a, b)),
    // Compra na loja (início do teste grátis de 7 dias), registrada pelo app.
    paged<{ user_id: string; created_at: string }>((a, b) => supabase.from('charlotte_analytics_events').select('user_id, created_at')
      .eq('event_name', 'subscription_purchased').order('id').range(a, b)),
    // Custo de IA: hoje e os 7 dias anteriores (para a média).
    pagedParallel<{ user_id: string | null; cost_usd: number | string; created_at: string }>(
      () => supabase.from('openai_usage').select('id', { count: 'exact', head: true }).gte('created_at', iso(brtDayStart(today - 7))),
      (a, b) => supabase.from('openai_usage').select('user_id, cost_usd, created_at').gte('created_at', iso(brtDayStart(today - 7))).order('id').range(a, b),
    ).catch(() => null),
    paged<ConvRow>((a, b) => supabase.from('support_conversations').select('id, channel, status, created_at, last_inbound_at').gte('created_at', weekAgo).order('id').range(a, b)),
    paged<ConvRow>((a, b) => supabase.from('support_conversations').select('id, channel, status, created_at, last_inbound_at').in('status', ['escalated', 'open']).order('id').range(a, b)),
    supabase.rpc('capacity_usage'),
    supabase.from('ops_alerts').select('kind, message, created_at').gte('created_at', iso(nowMs - DAY)).order('created_at', { ascending: false }).limit(50),
    supabase.from('ops_errors').select('area').in('area', ['checkout', 'webhook', 'asaas']).gte('created_at', iso(nowMs - 3600000)).limit(200),
    supabase.from('email_outbox').select('id', { count: 'exact', head: true }).is('sent_at', null).gte('attempts', 3),
    lateSignupWelcomes().catch(() => ({ late: 0, stuck: 0 })),
    // Despesas do mês corrente no Financeiro (para o custo por usuário).
    supabase.from('finance_entries').select('category, amount_brl, status, unit_cost').eq('kind', 'expense').neq('status', 'canceled')
      .gte('due_date', `${monthKey}-01`).lt('due_date', nextMonthFirst).limit(2000),
  ]);

  const { users, rev, cks, notTeam, kind, isTaster, usersBlock, firstChargeAt, siteCk, trial, paying } = partitionUsers(usersAll, revAll, ckAll, nowMs);
  const createdDay = (u: UserRow) => brtDay(ms(u.created_at));

  // ── Atividade por dia (usuários ativos = fez alguma atividade no dia) ─────
  const activeOnDay = new Map<number, Set<string>>();
  const practicesByUser = new Map<string, number[]>();
  for (const p of practices) {
    if (!notTeam(p.user_id)) continue;
    const uid = String(p.user_id);
    const t = ms(p.created_at);
    const d = brtDay(t);
    if (!activeOnDay.has(d)) activeOnDay.set(d, new Set());
    activeOnDay.get(d)!.add(uid);
    if (!practicesByUser.has(uid)) practicesByUser.set(uid, []);
    practicesByUser.get(uid)!.push(t);
  }

  // ── Hoje x ontem, com os últimos 7 dias ──────────────────────────────────
  const days7 = Array.from({ length: 7 }, (_, i) => today - 6 + i);
  const countBy = <T>(list: T[], dayOf: (x: T) => number | null) => {
    const m = new Map<number, number>();
    for (const x of list) { const d = dayOf(x); if (d != null && Number.isFinite(d)) m.set(d, (m.get(d) ?? 0) + 1); }
    return m;
  };
  const metric = (key: string, label: string, byDay: Map<number, number>, money = false): TodayMetric => ({
    key, label, money,
    today: round2(byDay.get(today) ?? 0),
    yesterday: round2(byDay.get(today - 1) ?? 0),
    series: days7.map(d => ({ date: dayKey(d), value: round2(byDay.get(d) ?? 0) })),
  });

  const signupsByDay = countBy(users, createdDay);
  const dauByDay = new Map<number, number>(days7.map(d => [d, activeOnDay.get(d)?.size ?? 0]));

  // Teste grátis iniciado: 1ª compra na loja (evento do app) ou 1ª compra com dias grátis no site.
  const trialStartAt = new Map<string, number>();
  const noteTrial = (uid: string, t: number) => {
    if (!notTeam(uid) || !Number.isFinite(t)) return;
    const cur = trialStartAt.get(uid);
    if (cur == null || t < cur) trialStartAt.set(uid, t);
  };
  for (const e of purchaseEvents) noteTrial(String(e.user_id), ms(e.created_at));
  for (const c of cks) if (c.status === 'paid' && (c.trial_days ?? 0) > 0) noteTrial(String(c.user_id), ms(c.created_at));
  const trialsByDay = countBy([...trialStartAt.values()], t => brtDay(t));

  // Nova assinatura: 1ª cobrança da conta naquele dia.
  const newSubsByDay = countBy([...firstChargeAt.entries()].filter(([uid]) => notTeam(uid)).map(([, t]) => t), t => (t <= nowMs ? brtDay(t) : null));

  // Receita bruta (R$) por dia: cobranças sem reembolso, no dia de Brasília (data do site corrigida).
  const isCharge = (r: RevRow) => r.event_type !== 'REFUND' && Number(r.price_purchased) > 0;
  const grossOf = (r: RevRow) => Number(r.gross_brl ?? r.price_purchased ?? 0);
  const revenueByDay = new Map<number, number>();
  for (const r of rev) {
    if (!isCharge(r)) continue;
    const d = brtDay(revenueAtMs(r));
    revenueByDay.set(d, (revenueByDay.get(d) ?? 0) + grossOf(r));
  }

  const todayVsYesterday: TodayMetric[] = [
    metric('signups', 'Cadastros', signupsByDay),
    metric('active', 'Usuários ativos', dauByDay),
    metric('trials', 'Testes grátis iniciados', trialsByDay),
    metric('newSubs', 'Novas assinaturas', newSubsByDay),
    metric('revenue', 'Receita', revenueByDay, true),
  ];

  // ── Funil dos últimos 30 dias (contas criadas nos últimos 30 dias do calendário) ──
  const cohort = users.filter(u => createdDay(u) >= today - 29);
  const startedTrialEver = (u: UserRow) => isStoreProduct(u.subscription_product) || isSiteProduct(u.subscription_product) || u.subscription_status === 'trial';
  const f = {
    signups: cohort.length,
    first: cohort.filter(u => (practicesByUser.get(String(u.id))?.length ?? 0) >= 1).length,
    trial: cohort.filter(startedTrialEver).length,
    paid: cohort.filter(u => firstChargeAt.has(String(u.id))).length,
  };
  const funnel30d = [
    { key: 'signups', label: 'Cadastros', count: f.signups, pctOfSignups: f.signups ? 100 : null, stepPct: null, stepOf: null },
    { key: 'first', label: 'Fizeram a 1ª atividade', count: f.first, pctOfSignups: pct(f.first, f.signups), stepPct: pct(f.first, f.signups), stepOf: 'dos cadastros' },
    { key: 'trial', label: 'Começaram o teste grátis', count: f.trial, pctOfSignups: pct(f.trial, f.signups), stepPct: pct(f.trial, f.first), stepOf: 'de quem fez a 1ª atividade' },
    { key: 'paid', label: 'Pagantes', count: f.paid, pctOfSignups: pct(f.paid, f.signups), stepPct: pct(f.paid, f.trial), stepOf: 'de quem começou o teste' },
  ];

  // ── Dinheiro ─────────────────────────────────────────────────────────────
  // MRR como em Métricas: quem já pagou e segue com renovação ativa; o potencial soma os testes não cancelados.
  const renewing = paying.filter(u => u.subscription_status === 'active');
  const trialsToCharge = trial.filter(u => (kind(u) === 'trial_store' || kind(u) === 'trial_site') && u.subscription_status === 'active');
  const mrr = renewing.reduce((s, u) => s + monthlyValueOf(u, siteCk), 0);
  const trialMrr = trialsToCharge.reduce((s, u) => s + monthlyValueOf(u, siteCk), 0);

  // Receita do mês (calendário de Brasília).
  const todayKey = dayKey(today);
  const monthStartIdx = Math.floor(Date.parse(`${todayKey.slice(0, 7)}-01T00:00:00Z`) / DAY);
  const inMonth = (r: RevRow) => { const d = brtDay(revenueAtMs(r)); return d >= monthStartIdx && d <= today; };
  const monthCharges = rev.filter(r => isCharge(r) && inMonth(r));
  const monthRefunds = rev.filter(r => r.event_type === 'REFUND' && inMonth(r));
  const monthLabel = new Date(Date.parse(`${todayKey.slice(0, 7)}-15T12:00:00Z`)).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' });

  // 1ª cobrança nos próximos 7 dias (hoje e os 6 seguintes), pela regra do dia de cobrança da lista de Usuários.
  const chargeDays = Array.from({ length: 7 }, (_, i) => dayKey(today + i));
  const charge7 = new Map(chargeDays.map(d => [d, { store: 0, site: 0 }]));
  for (const u of trialsToCharge) {
    const d = firstChargeDay(u, siteCk);
    const slot = charge7.get(d);
    if (!slot) continue;
    if (kind(u) === 'trial_site') slot.site += 1; else slot.store += 1;
  }
  const charge7Days = chargeDays.map(date => ({ date, ...charge7.get(date)! }));

  // Custo por usuário no mês: despesas lançadas que contam como operação + taxas de venda, ÷ ativos do mês e ÷ pagantes.
  const costByCat = new Map<string, number>();
  for (const e of (financeRes.data ?? []) as { category: string; amount_brl: number | string | null; unit_cost: boolean | null }[]) {
    if (!countsInUnitCost(e)) continue;
    costByCat.set(e.category, (costByCat.get(e.category) ?? 0) + Number(e.amount_brl ?? 0));
  }
  const salesFees = monthCharges.reduce((s, r) => s + Math.max(0, grossOf(r) - Number(r.net_brl ?? 0)), 0);
  const activeMonth = new Set<string>();
  for (let d = monthStartIdx; d <= today; d++) for (const id of activeOnDay.get(d) ?? []) activeMonth.add(id);
  const unitTotal = [...costByCat.values()].reduce((a, b) => a + b, 0) + salesFees;
  const unitCost: UnitCost = {
    label: monthLabel,
    total: round2(unitTotal),
    byCategory: [...costByCat].map(([category, v]) => ({ category, brl: round2(v) })).sort((a, b) => b.brl - a.brl),
    salesFees: round2(salesFees),
    activeUsers: activeMonth.size,
    perActive: activeMonth.size ? round2(unitTotal / activeMonth.size) : null,
    payers: usersBlock.paying,
    perPayer: usersBlock.paying ? round2(unitTotal / usersBlock.paying) : null,
  };

  const money = {
    mrr: round2(mrr),
    renewing: renewing.length,
    mrrIfTrialsConvert: round2(mrr + trialMrr),
    trialsToCharge: trialsToCharge.length,
    month: {
      label: monthLabel,
      gross: round2(monthCharges.reduce((s, r) => s + grossOf(r), 0)),
      net: round2(monthCharges.reduce((s, r) => s + Number(r.net_brl ?? 0), 0)),
      charges: monthCharges.length,
      refunds: monthRefunds.length,
      refundsBrl: round2(monthRefunds.reduce((s, r) => s + Number(r.net_brl ?? 0), 0)),
    },
    firstCharges7d: { total: charge7Days.reduce((s, d) => s + d.store + d.site, 0), days: charge7Days },
    cancelledWithAccess: {
      total: usersBlock.trialCancelled + usersBlock.payingCancelled,
      trial: usersBlock.trialCancelled,
      paying: usersBlock.payingCancelled,
    },
    unitCost,
  };

  // ── Engajamento ──────────────────────────────────────────────────────────
  // Retenção como em Métricas (fez alguma atividade exatamente no dia X depois do cadastro), coorte dos últimos 14 dias.
  const recent = users.filter(u => createdDay(u) >= today - 13);
  const retentionAt = (x: number) => {
    const eligible = recent.filter(u => today >= createdDay(u) + x + 1);
    const retained = eligible.filter(u => activeOnDay.get(createdDay(u) + x)?.has(String(u.id))).length;
    return { pct: eligible.length ? Math.round((retained / eligible.length) * 100) : null, retained, eligible: eligible.length };
  };
  // Sequência ativa: praticou hoje ou ontem (dia de Brasília).
  const yesterdayKey = dayKey(today - 1);
  const prog = progress.filter(p => notTeam(p.user_id));
  const engagement = {
    d1: retentionAt(1),
    d7: retentionAt(7),
    activeStreaks: prog.filter(p => (p.streak_days ?? 0) > 0 && !!p.last_practice_date && p.last_practice_date >= yesterdayKey).length,
    practicedToday: prog.filter(p => (p.streak_days ?? 0) > 0 && p.last_practice_date === todayKey).length,
    dau7: days7.map(d => ({ date: dayKey(d), value: activeOnDay.get(d)?.size ?? 0 })),
  };

  // ── Suporte ──────────────────────────────────────────────────────────────
  const convIds = [...new Set([...weekConvs, ...openConvs].map(c => c.id))];
  const msgs: MsgRow[] = [];
  for (let i = 0; i < convIds.length; i += 100) {
    const ids = convIds.slice(i, i + 100);
    msgs.push(...await paged<MsgRow>((a, b) => supabase.from('support_messages').select('conversation_id, direction, author, created_at')
      .in('conversation_id', ids).order('id').range(a, b)));
  }
  const msgsBy = new Map<string, MsgRow[]>();
  for (const m of msgs) { if (!msgsBy.has(m.conversation_id)) msgsBy.set(m.conversation_id, []); msgsBy.get(m.conversation_id)!.push(m); }
  for (const list of msgsBy.values()) list.sort((a, b) => ms(a.created_at) - ms(b.created_at));

  const escalated = openConvs.filter(c => c.status === 'escalated');
  // Chamado esperando: com atendente, última mensagem do usuário há mais de 2 h e sem resposta de atendente depois dela.
  const slaCut = nowMs - SUPPORT_SLA_HOURS * 3600000;
  const waiting = escalated.filter(c => {
    const lastIn = ms(c.last_inbound_at);
    if (!Number.isFinite(lastIn) || lastIn > slaCut) return false;
    return !(msgsBy.get(c.id) ?? []).some(m => m.author === 'human' && ms(m.created_at) >= lastIn);
  });
  const byChannel = new Map<string, number>();
  for (const c of weekConvs) byChannel.set(c.channel, (byChannel.get(c.channel) ?? 0) + 1);
  // 1ª resposta: da 1ª mensagem do usuário até a 1ª resposta (IA ou atendente), conversas da semana.
  const firsts: { minutes: number; ai: boolean }[] = [];
  for (const c of weekConvs) {
    const list = msgsBy.get(c.id) ?? [];
    const firstIn = list.find(m => m.direction === 'in');
    if (!firstIn) continue;
    const reply = list.find(m => m.direction === 'out' && (m.author === 'agent' || m.author === 'human') && ms(m.created_at) >= ms(firstIn.created_at));
    if (!reply) continue;
    firsts.push({ minutes: (ms(reply.created_at) - ms(firstIn.created_at)) / 60000, ai: reply.author === 'agent' });
  }
  const support = {
    openTickets: escalated.length,
    withAi: openConvs.filter(c => c.status === 'open').length,
    waitingOverSla: waiting.length,
    week: {
      total: weekConvs.length,
      byChannel: [...byChannel.entries()].map(([channel, count]) => ({ channel, label: CHANNEL_LABEL[channel] ?? channel, count })).sort((a, b) => b.count - a.count),
    },
    firstResponse: {
      avgMinutes: firsts.length ? Math.round((firsts.reduce((s, x) => s + x.minutes, 0) / firsts.length) * 10) / 10 : null,
      samples: firsts.length,
      allByAi: firsts.length > 0 && firsts.every(x => x.ai),
    },
  };

  // ── Alertas ──────────────────────────────────────────────────────────────
  const items: AlertItem[] = [];
  // E-mails: fila travada (3+ tentativas, como no vigia do checkout) e boas-vindas atrasado (regra de lib/signup-welcome).
  const outboxStuck = outboxStuckRes.error ? 0 : outboxStuckRes.count ?? 0;
  const emailProblems: string[] = [];
  if (outboxStuck) emailProblems.push(`${outboxStuck} ${outboxStuck === 1 ? 'e-mail preso' : 'e-mails presos'} na fila depois de 3 tentativas`);
  if (welcome.late) emailProblems.push(`${welcome.late} ${welcome.late === 1 ? 'cadastro' : 'cadastros'} há mais de 20 min sem o e-mail de boas-vindas`);
  if (welcome.stuck) emailProblems.push(`${welcome.stuck} ${welcome.stuck === 1 ? 'e-mail' : 'e-mails'} de boas-vindas parado${welcome.stuck === 1 ? '' : 's'} na fila`);
  items.push(emailProblems.length
    ? { key: 'emails', ok: false, label: emailProblems.join(' · '), href: '/admin/notifications' }
    : { key: 'emails', ok: true, label: 'E-mails em dia' });

  items.push(waiting.length
    ? { key: 'support', ok: false, label: `${waiting.length} ${waiting.length === 1 ? 'chamado esperando' : 'chamados esperando'} resposta há mais de ${SUPPORT_SLA_HOURS} h`, href: '/admin/support' }
    : { key: 'support', ok: true, label: 'Nenhum chamado esperando' });

  // Pagamentos: alertas do vigia do checkout nas últimas 24 h e erros nas rotas de pagamento na última hora.
  const opsAlerts = ((opsAlertsRes.data ?? []) as { kind: string; message: string }[]).filter(a => a.kind !== 'email_stuck');
  const opsErrors = (opsErrorsRes.data ?? []).length;
  if (opsAlerts.length || opsErrors) {
    const parts: string[] = [];
    if (opsErrors) parts.push(`${opsErrors} ${opsErrors === 1 ? 'erro' : 'erros'} no checkout ou no pagamento na última hora`);
    const kinds = [...new Set(opsAlerts.map(a => a.kind))];
    if (kinds.length) parts.push(`${opsAlerts.length} ${opsAlerts.length === 1 ? 'alerta' : 'alertas'} do checkout nas últimas 24 h: ${opsAlerts[0].message}`);
    items.push({ key: 'payments', ok: false, label: parts.join(' · '), href: '/admin/commercial' });
  } else {
    items.push({ key: 'payments', ok: true, label: 'Pagamentos sem falha' });
  }

  const cap = capacityRes.error ? null : (capacityRes.data as { db_bytes: number; storage_bytes: number } | null);
  if (cap) {
    const dbPct = Math.round((cap.db_bytes / CAPACITY_LIMITS.db) * 100);
    const stPct = Math.round((cap.storage_bytes / CAPACITY_LIMITS.storage) * 100);
    const worst = Math.max(dbPct, stPct);
    items.push(worst >= CAPACITY_WARN * 100
      ? { key: 'capacity', ok: false, label: dbPct >= stPct ? `Banco em ${dbPct}% do limite do plano` : `Arquivos em ${stPct}% do limite do plano` }
      : { key: 'capacity', ok: true, label: `Banco em ${dbPct}% do limite` });
  }

  // Custo de IA hoje (US$) x média dos 7 dias anteriores; aviso se hoje já passou do dobro da média.
  if (usage) {
    const costByDay = new Map<number, number>();
    for (const r of usage) {
      if (r.user_id && !notTeam(r.user_id)) continue; // equipe fora, como em Métricas
      const d = brtDay(ms(r.created_at));
      costByDay.set(d, (costByDay.get(d) ?? 0) + Number(r.cost_usd || 0));
    }
    const costToday = costByDay.get(today) ?? 0;
    let sum = 0;
    for (let d = today - 7; d <= today - 1; d++) sum += costByDay.get(d) ?? 0;
    const avg = sum / 7;
    const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    items.push({
      key: 'ai', ok: !(avg > 0 && costToday > avg * 2),
      label: `Custo de IA hoje US$ ${fmt(costToday)} (média US$ ${fmt(avg)} por dia)`,
      href: avg > 0 && costToday > avg * 2 ? '/admin/finance' : undefined,
    });
  }

  // Custo por usuário no mês (detalhe no painel Dinheiro).
  if (unitCost.perActive != null) {
    const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    items.push({
      key: 'unit_cost', ok: true,
      label: `Custo por usuário em ${unitCost.label} ${brl(unitCost.perActive)}${unitCost.perPayer != null ? ` (por pagante ${brl(unitCost.perPayer)})` : ''}`,
    });
  }

  return {
    generatedAt: new Date(nowMs).toISOString(),
    today: todayKey,
    alerts: { allOk: items.every(i => i.ok), items },
    users: usersBlock,
    todayVsYesterday,
    funnel30d,
    money,
    engagement,
    support,
  };
}
