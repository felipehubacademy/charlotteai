// lib/admin-overview.ts — números da "Visão geral" do /admin (tela inicial da gestão).
//
// Tudo é calculado na hora, com as mesmas regras de Métricas, Usuários,
// Financeiro e Suporte (lib/admin-subscriptions, lib/revenue-day, lib/ops-monitor, lib/signup-welcome):
//  - Equipe fora de tudo (is_institutional, hide_from_ranking, @hubacademybr.com, @queizy.com, felipe.xavier1987+).
//  - Dias no calendário de Brasília; hoje está pela metade.
//  - Os quatro grupos de usuários (degustação, teste grátis, pagantes, sem acesso) somam exatamente o total.
// Sem números pedagógicos (lições, onde travaram): isso fica no Pedagógico.
// As contas de alunos, atividades e cobranças ficam no banco (admin_overview_users e admin_overview_aggregates,
// migração 20261106150000): aqui chegam só números e dias já agrupados, não as tabelas inteiras.
import { countsInUnitCost } from '@/lib/unit-cost';
import { cachedCost, openaiDaily } from '@/lib/provider-costs';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { lateSignupWelcomes } from '@/lib/signup-welcome';
import { DAY, brtDay, dayKey, ms } from '@/lib/admin-subscriptions';

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
const round2 = (n: number) => Math.round(n * 100) / 100;
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);

const CAPACITY_LIMITS = { db: 500 * 1024 * 1024, storage: 1024 * 1024 * 1024 }; // plano gratuito (cron capacity-alert)
const CAPACITY_WARN = 0.7;
const SUPPORT_SLA_HOURS = 2; // lib/support-service.ts
const CHANNEL_LABEL: Record<string, string> = { email: 'E-mail', whatsapp: 'WhatsApp', app: 'Chat do app', instagram: 'Instagram' };

export interface DayPoint { date: string; value: number }
export interface TodayMetric { key: string; label: string; today: number; yesterday: number; series: DayPoint[]; money?: boolean }
/** resolvable: mostra o botão "Resolvido" (alertas do checkout guardados em ops_alerts). */
export interface AlertItem { key: string; ok: boolean; label: string; href?: string; resolvable?: boolean }

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

// Resultado por mês (regime de competência das cobranças, despesas pelo vencimento) e ponto de equilíbrio do mês atual.
// Receita líquida = bruto - taxas de venda - reembolsos - impostos (DAS do Simples, dedução da receita).
// Custos de operação = todas as despesas do mês, menos impostos e reembolsos (que já saíram da receita).
// EBITDA = receita líquida - custos de operação. Trial e degustação consomem custo e entram na conta:
// o ponto de equilíbrio é quantos pagantes cobrem o custo do mês inteiro.
export interface PnlMonth {
  month: string; label: string;
  gross: number; salesFees: number; refunds: number; taxes: number; netRevenue: number;
  opex: number; ebitda: number; marginPct: number | null;
}
export interface Breakeven {
  ticketNet: number | null;      // receita líquida por pagante por mês (preço médio - taxas - impostos)
  payers: number; payersNeeded: number | null;
  revenueNeeded: number | null;  // receita bruta mensal recorrente que empata o custo do mês
  activeUsers: number; conversionPct: number | null; minConversionPct: number | null;
}
const PNL_EXCLUDED = ['Impostos', 'Reembolsos e estornos'];

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
    pnl: { months: PnlMonth[]; breakeven: Breakeven };
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

type UsersBlock = Overview['users'];

/** Jsonb de admin_overview_aggregates: dias de Brasília (índice), contagens e somas já feitas no banco. */
type OverviewAgg = {
  today: number;
  signups7: { d: number; n: number }[];
  dau7: { d: number; n: number }[];
  trials7: { d: number; n: number }[];
  newSubs7: { d: number; n: number }[];
  revDays: { d: number; gross: number; net: number; fees: number; charges: number; refunds: number; refunds_net: number; refunds_abs: number }[];
  activeMonth: number;
  funnel: { signups: number; first: number; trial: number; paid: number };
  money: { renewing: number; mrr: number; trialsToCharge: number; trialMrr: number };
  charge7: { d: number; site: number; store: number }[];
  retention: { x: number; eligible: number; retained: number }[];
  activeStreaks: number;
  practicedToday: number;
};

/** Usuários (sem a equipe) divididos em grupos que somam o total, contados no banco. */
async function readUsersBlock(nowMs: number): Promise<UsersBlock> {
  const { data, error } = await getSupabaseAdmin().rpc('admin_overview_users', { p_now_ms: nowMs });
  if (error) throw new Error(error.message);
  return data as UsersBlock;
}

/** Só o bloco de usuários (consulta leve), para a tela atualizar a cada poucos segundos. */
export async function computeUsersBlock(nowMs = Date.now()) {
  return { generatedAt: new Date(nowMs).toISOString(), users: await readUsersBlock(nowMs) };
}

export async function computeOverview(nowMs = Date.now()): Promise<Overview> {
  const supabase = getSupabaseAdmin();
  const today = brtDay(nowMs);
  const iso = (t: number) => new Date(t).toISOString();
  const weekAgo = iso(nowMs - 7 * DAY);
  const monthKey = dayKey(today).slice(0, 7);
  // 12 meses para trás: despesa anual entra como 1/12 em cada mês dos 12 a partir do vencimento.
  const pnlFrom = (() => { const [y, m] = monthKey.split('-').map(Number); return new Date(Date.UTC(y, m - 12, 1)).toISOString().slice(0, 10); })();
  const nextMonthFirst = (() => { const [y, m] = monthKey.split('-').map(Number); return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10); })();

  type ConvRow = { id: string; channel: string; status: string; created_at: string; last_inbound_at: string | null };
  type MsgRow = { conversation_id: string; direction: string; author: string | null; created_at: string };

  const [
    usersBlock, aggRes, daily,
    weekConvs, openConvs, capacityRes, opsAlertsRes, opsErrorsRes, instagramDrafts, outboxStuckRes, welcome, financeRes,
  ] = await Promise.all([
    readUsersBlock(nowMs),
    // Usuários, atividades (31 dias, sem resgates de recompensa), cobranças, testes iniciados e sequências.
    supabase.rpc('admin_overview_aggregates', { p_now_ms: nowMs }),
    // Custo de IA: valor real diário da OpenAI, guardado pela sincronização (renova se tiver mais de 2 h).
    cachedCost('openai-daily', 2 * 3600_000, () => openaiDaily(8)).catch(() => null),
    paged<ConvRow>((a, b) => supabase.from('support_conversations').select('id, channel, status, created_at, last_inbound_at').gte('created_at', weekAgo).order('id').range(a, b)),
    paged<ConvRow>((a, b) => supabase.from('support_conversations').select('id, channel, status, created_at, last_inbound_at').in('status', ['escalated', 'open']).order('id').range(a, b)),
    supabase.rpc('capacity_usage'),
    supabase.from('ops_alerts').select('kind, message, created_at').is('resolved_at', null).gte('created_at', iso(nowMs - DAY)).order('created_at', { ascending: false }).limit(50),
    supabase.from('ops_errors').select('area').in('area', ['checkout', 'webhook', 'asaas']).gte('created_at', iso(nowMs - 3600000)).limit(200),
    // Instagram: rascunhos que já deveriam estar aprovados (regra em lib/instagram-approval-alert).
    supabase.from('instagram_posts').select('id', { count: 'exact', head: true }).eq('status', 'rascunho')
      .gte('scheduled_at', iso(nowMs)).lt('scheduled_at', iso(instagramApprovalDeadlineMs(nowMs))),
    supabase.from('email_outbox').select('id', { count: 'exact', head: true }).is('sent_at', null).gte('attempts', 3),
    lateSignupWelcomes().catch(() => ({ late: 0, stuck: 0 })),
    // Despesas dos últimos 6 meses no Financeiro (custo por usuário no mês atual e resultado mês a mês).
    // Em páginas: o .limit(5000) não valia (máximo de 1.000 linhas por leitura).
    paged<FinRow>((a, b) => supabase.from('finance_entries').select('category, amount_brl, status, unit_cost, due_date, recurrence').eq('kind', 'expense').neq('status', 'canceled')
      .gte('due_date', pnlFrom).lt('due_date', nextMonthFirst).order('id').range(a, b)).then(data => ({ data })),
  ]);

  if (aggRes.error) throw new Error(aggRes.error.message);
  const agg = aggRes.data as OverviewAgg;
  const toMap = (list: { d: number; n: number }[]) => new Map<number, number>(list.map(x => [x.d, x.n]));

  // ── Hoje x ontem, com os últimos 7 dias ──────────────────────────────────
  const days7 = Array.from({ length: 7 }, (_, i) => today - 6 + i);
  const metric = (key: string, label: string, byDay: Map<number, number>, money = false): TodayMetric => ({
    key, label, money,
    today: round2(byDay.get(today) ?? 0),
    yesterday: round2(byDay.get(today - 1) ?? 0),
    series: days7.map(d => ({ date: dayKey(d), value: round2(byDay.get(d) ?? 0) })),
  });

  const dauByDay = toMap(agg.dau7);
  // Receita bruta (R$) por dia: cobranças sem reembolso, no dia de Brasília (data do site corrigida).
  const revenueByDay = new Map<number, number>(agg.revDays.map(r => [r.d, r.gross]));

  const todayVsYesterday: TodayMetric[] = [
    metric('signups', 'Cadastros', toMap(agg.signups7)),
    metric('active', 'Usuários ativos', dauByDay),
    // Teste grátis iniciado: 1ª compra na loja (evento do app) ou 1ª compra com dias grátis no site.
    metric('trials', 'Testes grátis iniciados', toMap(agg.trials7)),
    // Nova assinatura: 1ª cobrança da conta naquele dia.
    metric('newSubs', 'Novas assinaturas', toMap(agg.newSubs7)),
    metric('revenue', 'Receita', revenueByDay, true),
  ];

  // ── Funil dos últimos 30 dias (contas criadas nos últimos 30 dias do calendário) ──
  const f = agg.funnel;
  const funnel30d = [
    { key: 'signups', label: 'Cadastros', count: f.signups, pctOfSignups: f.signups ? 100 : null, stepPct: null, stepOf: null },
    { key: 'first', label: 'Fizeram a 1ª atividade', count: f.first, pctOfSignups: pct(f.first, f.signups), stepPct: pct(f.first, f.signups), stepOf: 'dos cadastros' },
    { key: 'trial', label: 'Começaram o teste grátis', count: f.trial, pctOfSignups: pct(f.trial, f.signups), stepPct: pct(f.trial, f.first), stepOf: 'de quem fez a 1ª atividade' },
    { key: 'paid', label: 'Pagantes', count: f.paid, pctOfSignups: pct(f.paid, f.signups), stepPct: pct(f.paid, f.trial), stepOf: 'de quem começou o teste' },
  ];

  // ── Dinheiro ─────────────────────────────────────────────────────────────
  // MRR como em Métricas: quem já pagou e segue com renovação ativa; o potencial soma os testes não cancelados.
  const { renewing, mrr, trialsToCharge, trialMrr } = agg.money;

  // Receita do mês (calendário de Brasília).
  const todayKey = dayKey(today);
  const monthStartIdx = Math.floor(Date.parse(`${todayKey.slice(0, 7)}-01T00:00:00Z`) / DAY);
  const monthDays = agg.revDays.filter(r => r.d >= monthStartIdx && r.d <= today);
  const sumOf = <T>(list: T[], v: (x: T) => number) => list.reduce((s, x) => s + v(x), 0);
  const monthLabel = new Date(Date.parse(`${todayKey.slice(0, 7)}-15T12:00:00Z`)).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' });

  // 1ª cobrança nos próximos 7 dias (hoje e os 6 seguintes), pela regra do dia de cobrança da lista de Usuários.
  const charge7 = new Map(agg.charge7.map(c => [c.d, c]));
  const charge7Days = Array.from({ length: 7 }, (_, i) => today + i)
    .map(d => ({ date: dayKey(d), store: charge7.get(d)?.store ?? 0, site: charge7.get(d)?.site ?? 0 }));

  // Custo por usuário no mês: despesas lançadas que contam como operação + taxas de venda, ÷ ativos do mês e ÷ pagantes.
  const costByCat = new Map<string, number>();
  type FinRow = { category: string; amount_brl: number | string | null; unit_cost: boolean | null; due_date: string; recurrence: string | null };
  const finRows = (financeRes.data ?? []) as FinRow[];
  // Quanto de uma despesa cai no mês: anual = 1/12 nos 12 meses a partir do vencimento; o resto, inteira no mês do vencimento.
  const monthIdx = (k: string) => { const [y, m] = k.split('-').map(Number); return y * 12 + m - 1; };
  const shareIn = (e: FinRow, key: string) => {
    const diff = monthIdx(key) - monthIdx(e.due_date.slice(0, 7));
    if (e.recurrence === 'yearly') return diff >= 0 && diff < 12 ? Number(e.amount_brl ?? 0) / 12 : 0;
    return diff === 0 ? Number(e.amount_brl ?? 0) : 0;
  };
  for (const e of finRows) {
    const v = countsInUnitCost(e) ? shareIn(e, monthKey) : 0;
    if (v) costByCat.set(e.category, (costByCat.get(e.category) ?? 0) + v);
  }
  const salesFees = sumOf(monthDays, r => r.fees);
  const activeMonth = agg.activeMonth; // ativos do mês (alguma atividade de 1º do mês até hoje)
  const unitTotal = [...costByCat.values()].reduce((a, b) => a + b, 0) + salesFees;
  const unitCost: UnitCost = {
    label: monthLabel,
    total: round2(unitTotal),
    byCategory: [...costByCat].map(([category, v]) => ({ category, brl: round2(v) })).sort((a, b) => b.brl - a.brl),
    salesFees: round2(salesFees),
    activeUsers: activeMonth,
    perActive: activeMonth ? round2(unitTotal / activeMonth) : null,
    payers: usersBlock.paying,
    perPayer: usersBlock.paying ? round2(unitTotal / usersBlock.paying) : null,
  };

  // Resultado mês a mês (6 meses) e ponto de equilíbrio do mês atual.
  const pnlKeys = Array.from({ length: 6 }, (_, i) => { const [y, m] = monthKey.split('-').map(Number); return new Date(Date.UTC(y, m - 6 + i, 1)).toISOString().slice(0, 7); });
  const pnlMonths: PnlMonth[] = pnlKeys.map(key => {
    const inKey = agg.revDays.filter(r => dayKey(r.d).slice(0, 7) === key);
    const gross = sumOf(inKey, r => r.gross);
    const fees = sumOf(inKey, r => r.fees);
    const refunds = sumOf(inKey, r => r.refunds_abs);
    const taxes = finRows.filter(e => e.category === 'Impostos').reduce((s, e) => s + shareIn(e, key), 0);
    const opex = finRows.filter(e => !PNL_EXCLUDED.includes(e.category)).reduce((s, e) => s + shareIn(e, key), 0);
    const netRevenue = gross - fees - refunds - taxes;
    const ebitda = netRevenue - opex;
    return {
      month: key,
      label: new Date(Date.parse(`${key}-15T12:00:00Z`)).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' }),
      gross: round2(gross), salesFees: round2(fees), refunds: round2(refunds), taxes: round2(taxes), netRevenue: round2(netRevenue),
      opex: round2(opex), ebitda: round2(ebitda), marginPct: netRevenue > 0 ? Math.round((ebitda / netRevenue) * 100) : null,
    };
  }).filter((m, i, all) => m.gross > 0 || m.opex > 0 || i === all.length - 1);
  // Taxas e impostos como fração do bruto: 3 últimos meses com receita (amostra pequena num mês só).
  const recent3 = pnlMonths.slice(-3);
  const g3 = recent3.reduce((s, m) => s + m.gross, 0);
  const deductRate = g3 > 0 ? (recent3.reduce((s, m) => s + m.salesFees + m.taxes, 0) / g3) : 0;
  const cur = pnlMonths[pnlMonths.length - 1];
  const priceAvg = renewing ? mrr / renewing : null;
  const ticketNet = priceAvg != null ? priceAvg * (1 - deductRate) : null;
  const payersNeeded = ticketNet && ticketNet > 0 ? Math.ceil(cur.opex / ticketNet) : null;
  const breakeven: Breakeven = {
    ticketNet: ticketNet != null ? round2(ticketNet) : null,
    payers: usersBlock.paying,
    payersNeeded,
    revenueNeeded: deductRate < 1 ? round2(cur.opex / (1 - deductRate)) : null,
    activeUsers: activeMonth,
    conversionPct: activeMonth ? Math.round((usersBlock.paying / activeMonth) * 1000) / 10 : null,
    minConversionPct: payersNeeded != null && activeMonth ? Math.round((payersNeeded / activeMonth) * 1000) / 10 : null,
  };

  const money = {
    mrr: round2(mrr),
    renewing,
    mrrIfTrialsConvert: round2(mrr + trialMrr),
    trialsToCharge,
    month: {
      label: monthLabel,
      gross: round2(sumOf(monthDays, r => r.gross)),
      net: round2(sumOf(monthDays, r => r.net)),
      charges: sumOf(monthDays, r => r.charges),
      refunds: sumOf(monthDays, r => r.refunds),
      refundsBrl: round2(sumOf(monthDays, r => r.refunds_net)),
    },
    firstCharges7d: { total: charge7Days.reduce((s, d) => s + d.store + d.site, 0), days: charge7Days },
    cancelledWithAccess: {
      total: usersBlock.trialCancelled + usersBlock.payingCancelled,
      trial: usersBlock.trialCancelled,
      paying: usersBlock.payingCancelled,
    },
    unitCost,
    pnl: { months: pnlMonths, breakeven },
  };

  // ── Engajamento ──────────────────────────────────────────────────────────
  // Retenção como em Métricas (fez alguma atividade exatamente no dia X depois do cadastro), coorte dos últimos 14 dias.
  const retentionAt = (x: number) => {
    const r = agg.retention.find(y => y.x === x);
    const eligible = r?.eligible ?? 0, retained = r?.retained ?? 0;
    return { pct: eligible ? Math.round((retained / eligible) * 100) : null, retained, eligible };
  };
  // Sequência ativa: praticou hoje ou ontem (dia de Brasília).
  const engagement = {
    d1: retentionAt(1),
    d7: retentionAt(7),
    activeStreaks: agg.activeStreaks,
    practicedToday: agg.practicedToday,
    dau7: days7.map(d => ({ date: dayKey(d), value: dauByDay.get(d) ?? 0 })),
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
  const allOpsAlerts = (opsAlertsRes.data ?? []) as { kind: string; message: string }[];
  // Avisos do Instagram (domingo e diário) têm cartão próprio, que some sozinho ao aprovar os posts.
  const opsAlerts = allOpsAlerts.filter(a => a.kind !== 'email_stuck' && !a.kind.startsWith('instagram_'));
  const opsErrors = (opsErrorsRes.data ?? []).length;
  if (opsAlerts.length || opsErrors) {
    const parts: string[] = [];
    if (opsErrors) parts.push(`${opsErrors} ${opsErrors === 1 ? 'erro' : 'erros'} no checkout ou no pagamento na última hora`);
    const kinds = [...new Set(opsAlerts.map(a => a.kind))];
    if (kinds.length) parts.push(`${opsAlerts.length} ${opsAlerts.length === 1 ? 'alerta' : 'alertas'} do checkout nas últimas 24 h: ${opsAlerts[0].message}`);
    items.push({ key: 'payments', ok: false, label: parts.join(' · '), href: '/admin/commercial?tab=health', resolvable: opsAlerts.length > 0 });
  } else {
    items.push({ key: 'payments', ok: true, label: 'Pagamentos sem falha' });
  }

  // Instagram: conta os posts pendentes agora (some assim que aprovar). Semana sem nenhum post: o aviso do domingo.
  const igPending = instagramDrafts.count ?? 0;
  const igEmptyWeek = allOpsAlerts.find(a => a.kind === INSTAGRAM_ALERT_KIND && a.message.includes('não tem nenhum post'));
  if (igPending) {
    items.push({ key: 'instagram', ok: false, label: `Instagram: ${igPending} ${igPending === 1 ? 'post aguarda' : 'posts aguardam'} aprovação. Sem aprovação, não saem.`, href: '/admin/instagram' });
  } else if (igEmptyWeek) {
    items.push({ key: 'instagram', ok: false, label: igEmptyWeek.message, href: '/admin/instagram' });
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

  // Custo de IA hoje (US$, valor real da OpenAI guardado pela sincronização de hora em hora) x média dos 7 dias anteriores;
  // aviso se hoje já passou do dobro da média. Os dias seguem o calendário da OpenAI (UTC).
  if (daily?.value?.length) {
    const todayUtc = new Date(nowMs).toISOString().slice(0, 10);
    const costToday = daily.value.find(d => d.date === todayUtc)?.usd ?? 0;
    const prev = daily.value.filter(d => d.date < todayUtc).slice(-7);
    const avg = prev.length ? prev.reduce((a, d) => a + d.usd, 0) / prev.length : 0;
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

const INSTAGRAM_ALERT_KIND = 'instagram_aprovacao';

/** Até quando os posts já deveriam estar aprovados: fim da semana atual (segunda 00:00 em Brasília);
 *  a partir de domingo 20h, inclui a semana seguinte (o prazo de aprovação dela é domingo 20h). */
function instagramApprovalDeadlineMs(nowMs: number): number {
  const br = new Date(nowMs - 3 * 3600000); // relógio de Brasília (UTC-3) nos campos UTC
  const dow = br.getUTCDay();
  const nextMonday = Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), br.getUTCDate() + (dow === 0 ? 1 : 8 - dow)) + 3 * 3600000;
  return dow === 0 && br.getUTCHours() >= 20 ? nextMonday + 7 * 86400000 : nextMonday;
}
