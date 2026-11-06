// lib/admin-metrics.ts — números da aba "Métricas" do /admin (usado só por app/api/admin/metrics).
//
// As contas pesadas ficam no banco (supabase/migrations/20261106150000_admin_metrics_aggregates.sql):
// cada função devolve um jsonb com contagens, somas e linhas já agrupadas, e aqui só se monta a resposta.
// Antes a rota baixava todos os alunos, 90 dias de práticas, o custo de IA, os eventos e as cobranças.
// Regras de assinatura e calendário de Brasília: lib/admin-subscriptions.ts (reproduzidas nas funções).
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TASTE_DAYS } from '@/lib/taste';
import { DAY, brtDay, dayKey } from '@/lib/admin-subscriptions';

type DbError = { message: string } | null;

/** Lançamento do Queizy nas lojas (20/10/2026): médias de uso começam aqui. */
const LAUNCH_DAY = brtDay(Date.UTC(2026, 9, 20, 3));
/** Índice da segunda-feira da semana do dia idx. */
const mondayOf = (idx: number) => idx - ((new Date(idx * DAY).getUTCDay() + 6) % 7);

// Endpoints que não são uso de aluno (suporte, Instagram, admin, testes): ficam fora do custo por aluno.
const isInternalEndpoint = (e: string) => !e.startsWith('/api/') || e.startsWith('/api/admin');

// Fornecedor pelo modelo (o mesmo endpoint pode usar mais de um).
const providerOf = (model: string) =>
  /^eleven/i.test(model) ? 'ElevenLabs'
  : /^azure/i.test(model) ? 'Azure'
  : /^(gpt|whisper|o\d|tts-|text-embedding|dall)/i.test(model) ? 'OpenAI'
  : 'Outro';

const REASON_LABELS: Record<string, string> = {
  placement:   'Teste de nível',
  trail:       'Trilha (tópico travado)',
  track:       'Trilha extra',
  taste_today: 'Limite do dia da degustação',
  taste_done:  'Fim da degustação',
  other:       'Outros (menu, perfil, aviso)',
};
const KIND_LABELS: Record<string, string> = {
  degustacao: 'Na degustação',
  aberto:     'Com acesso (abriu a oferta)',
  sem_acesso: 'Sem acesso',
};
const SOURCE_LABELS: Record<string, string> = {
  influencer:   'Influenciador',
  meta_ads:     'Anúncio (Instagram/Facebook)',
  store_search: 'Busca na loja',
  friend:       'Indicação de amigo',
  other:        'Outro',
};
const CHANNEL_LABELS: Record<string, string> = {
  hosted: 'Página de pagamento do Asaas',
  direct: 'Checkout próprio do site',
};
const SYSTEM_LABELS: Record<string, string> = {
  'system:scheduler': 'Notificações (agendador)',
  'system:tts-cache': 'Áudios do vocabulário (cache)',
  'anonymous':        'Sem aluno identificado',
};

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round6(n: number): number { return Math.round(n * 1000000) / 1000000; }
/** Ordena pelo valor (maior primeiro) mantendo a ordem de chegada nos empates, como o sort estável de antes. */
const byOrdThen = <T extends { ord: number }>(rows: T[], val: (r: T) => number) =>
  [...rows].sort((a, b) => a.ord - b.ord).sort((a, b) => val(b) - val(a));

// Formato do jsonb de cada função do banco.
type Accounts = {
  users: Record<string, number> & { acq_since: number | null };
  acqBase: number; acqAnswered: number; acqTotal: number;
  bySource: { key: string; ord: number; accounts: number; trial: number; paid: number }[];
  cash: { gross: number; net: number; charges: number; store_charges: number; site_charges: number; refunds_brl: number; refunds: number };
  ckGroups: { dim: 'channel' | 'affiliate' | 'coupon'; key: string; ord: number; checkouts: number; completed: number; paid: number }[];
  siteFunnel: { platform: string; checkouts: number; started: number; direct: number; paid: number }[];
  appVersions: { app_platform: string | null; app_version: string | null; n: number; ord: number }[];
  mrrWeeks: { wk: number; amount: number }[];
};
type Activity = {
  days: { d: number; n: number }[];
  wau: number; mau: number; prevMau: number; mauComplete: number;
  activeInRange: number; prevActiveInRange: number; inactivePaying: number;
  retention: { x: number; eligible: number; retained: number }[];
  funnel: { signups: number; first: number; three: number; retained30Base: number; retained30: number };
  ttfv: { n: number; medianMs: number | null; p90Ms: number | null; b1: number; b24: number; b72: number; b168: number; b720: number; bInf: number };
  cohorts: { w: number; start: number; size: number; surv: Record<string, { e: number; k: number }> }[];
  heatmap: { dow: number; hour: number; n: number }[];
  streak: Record<string, number>;
};
type AiCost = {
  totalCost: number; callCount: number; studentCost: number; prevCost: number; prevStudentCost: number;
  groups: { endpoint: string; model: string | null; cost: number; calls: number; tokens: number; ord: number }[];
  topUsers: { uid: string; cost: number; ord: number; email: string | null; name: string | null }[];
  system: { uid: string; cost: number }[];
  daily: { d: number; cost: number }[];
};
type Paywall = {
  groups: { dim: 'plat' | 'reason' | 'kind'; key: string; name: string; users: number; paid: number }[];
  live: { calls: number; seconds: number; users: number };
  liveByCharacter: { character: string; calls: number; seconds: number }[];
};

export type MetricsRange = { from: Date; to: Date; days: number };
export type MetricsFilters = { level: string | null; plan: string | null };

/** Resposta completa da aba Métricas. Lança se uma leitura falhar (leitura que falha não pode virar número menor). */
export async function computeMetrics({ from, to, days }: MetricsRange, filters: MetricsFilters, nowMs = Date.now()) {
  const fromMs = from.getTime();
  const toMs = to.getTime();
  // Período anterior do MESMO tamanho, terminando onde o atual começa.
  const prevToMs   = fromMs - 1;
  const prevFromMs = fromMs - days * DAY;
  const today = brtDay(nowMs);
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const supabase = getSupabaseAdmin();

  const args = { p_from_ms: fromMs, p_to_ms: toMs, p_now_ms: nowMs, p_level: filters.level, p_plan: filters.plan };
  const [accRes, actRes, aiRes, pwRes, relRes, sentRes, failedRes, adVisitRes, adClickRes] = await Promise.all([
    supabase.rpc('admin_metrics_accounts', { ...args, p_days: days, p_taste_days: TASTE_DAYS }),
    supabase.rpc('admin_metrics_activity', { ...args, p_days: days }),
    supabase.rpc('admin_metrics_ai_cost', { ...args, p_days: days }),
    supabase.rpc('admin_metrics_paywall', args),
    supabase.from('app_release').select('platform, latest_version'),
    // Entrega de push no período (só para o alerta).
    supabase.from('notification_logs').select('id', { count: 'exact', head: true }).eq('status', 'sent').neq('notification_type', 'scheduler_lock').gte('created_at', fromIso).lte('created_at', toIso),
    supabase.from('notification_logs').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('created_at', fromIso).lte('created_at', toIso),
    supabase.from('ad_events').select('id', { count: 'exact', head: true }).eq('kind', 'visit').gte('created_at', fromIso).lte('created_at', toIso),
    supabase.from('ad_events').select('id', { count: 'exact', head: true }).eq('kind', 'click').gte('created_at', fromIso).lte('created_at', toIso),
  ]);
  for (const r of [accRes, actRes, pwRes] as { error: DbError }[]) if (r.error) throw new Error(r.error.message);
  const A = accRes.data as Accounts;
  const act = actRes.data as Activity;
  const pw = pwRes.data as Paywall;
  // Custo de IA indisponível: a tela mostra "sem tabela", como antes.
  const usageTableMissing = Boolean(aiRes.error);
  const ai: AiCost = usageTableMissing
    ? { totalCost: 0, callCount: 0, studentCost: 0, prevCost: 0, prevStudentCost: 0, groups: [], topUsers: [], system: [], daily: [] }
    : aiRes.data as AiCost;
  const U = A.users;

  // Ativos por dia de Brasília.
  const activeOnDay = new Map<number, number>(act.days.map(x => [x.d, x.n]));

  // ─────────────────────────────────────────────────────────────────────────
  // RECEITA
  // ─────────────────────────────────────────────────────────────────────────
  const subs = {
    paidStore:   U.paid_store,
    paidSite:    U.paid_site,
    trialStore:  U.trial_store,
    trialSite:   U.trial_site,
    trialLegacy: U.trial_legacy,
    cancelledWithAccess: U.cancelled_with_access,
    cancelledPaid:  U.cancelled_paid,
    cancelledTrial: U.cancelled_trial,
  };
  // MRR: só quem pagou e segue com renovação ativa (quem cancelou aparece à parte).
  const mrr = U.mrr;
  const arr = mrr * 12;
  // MRR que entra se os testes atuais (não cancelados) virarem pagantes.
  const trialMrrPotential = U.trial_mrr;
  // Cards de pagantes e de teste contam também quem cancelou e ainda tem acesso (mesma regra da Visão geral e de Usuários).
  const onTrial = subs.trialStore + subs.trialSite + subs.trialLegacy + subs.cancelledTrial;
  const payingTotal = U.active_subs + subs.cancelledPaid;

  // Conversão do teste com cartão: convertido = teve alguma cobrança; perdido = teste terminou sem cobrança.
  const convertedFromTrial = U.converted;
  const convDen = convertedFromTrial + U.ended_unpaid;
  const trialConversionPct = convDen === 0 ? null : Math.round((convertedFromTrial / convDen) * 100);

  // Cancelamento (churn): pagantes perdidos no período ÷ pagantes no início do período.
  const payingAtStart = U.paying_at_start;
  const churnedFromStart = U.churned_from_start;
  const churnPct = payingAtStart === 0 ? null : Math.round((churnedFromStart / payingAtStart) * 100);

  // Cobranças dos próximos 7 dias (hoje e os 6 seguintes, pelo dia de cobrança).
  const firstCharges7d = U.first_charges_7d;
  const renewalCharges7d = U.renewal_charges_7d;

  // Receita real do caixa no período (líquida).
  const cash = {
    grossBrl: round2(A.cash.gross),
    netBrl: round2(A.cash.net),
    charges: A.cash.charges,
    storeCharges: A.cash.store_charges,
    siteCharges: A.cash.site_charges,
    refundsBrl: round2(A.cash.refunds_brl),
    refunds: A.cash.refunds,
  };

  // Degustação.
  const taste = {
    total: U.taste_total,
    day1: U.taste_day1,
    lastDay: U.taste_last_day,
    inProgress: U.taste_in_progress,
    exhausted: U.taste_exhausted,
    tasteDays: TASTE_DAYS,
  };

  // Retenção D1 / D7 / D30: cadastros dos últimos 60 dias com atividade exatamente no dia X.
  const retentionAt = (x: number) => {
    const r = act.retention.find(y => y.x === x);
    const eligible = r?.eligible ?? 0, retained = r?.retained ?? 0;
    return { pct: eligible ? Math.round((retained / eligible) * 100) : null, retained, eligible };
  };
  const r1 = retentionAt(1), r7 = retentionAt(7), r30 = retentionAt(30);
  const retention = {
    d1: r1.pct, d7: r7.pct, d30: r30.pct,
    n: {
      d1:  { retained: r1.retained,  eligible: r1.eligible },
      d7:  { retained: r7.retained,  eligible: r7.eligible },
      d30: { retained: r30.retained, eligible: r30.eligible },
    },
  };

  const signups = U.signups;
  const newUsers = signups;

  // ─────────────────────────────────────────────────────────────────────────
  // CUSTO DE IA
  // ─────────────────────────────────────────────────────────────────────────
  const totalCost = ai.totalCost;
  const callCount = ai.callCount;
  const costByEndpoint = new Map<string, { cost: number; calls: number; tokens: number; providers: Set<string>; ord: number }>();
  const costByModel = new Map<string, { cost: number; calls: number; tokens: number; ord: number }>();
  for (const g of ai.groups) {
    const e = costByEndpoint.get(g.endpoint) ?? { cost: 0, calls: 0, tokens: 0, providers: new Set<string>(), ord: g.ord };
    e.cost += g.cost; e.calls += g.calls; e.tokens += g.tokens; e.providers.add(providerOf(g.model || '')); e.ord = Math.min(e.ord, g.ord);
    costByEndpoint.set(g.endpoint, e);
    const mk = String(g.model);
    const m = costByModel.get(mk) ?? { cost: 0, calls: 0, tokens: 0, ord: g.ord };
    m.cost += g.cost; m.calls += g.calls; m.tokens += g.tokens; m.ord = Math.min(m.ord, g.ord);
    costByModel.set(mk, m);
  }
  const byEndpoint = byOrdThen([...costByEndpoint].map(([endpoint, v]) => ({
    endpoint, cost: round6(v.cost), calls: v.calls, tokens: v.tokens, providers: [...v.providers].sort(), internal: isInternalEndpoint(endpoint), ord: v.ord,
  })), r => r.cost).map(({ ord: _ord, ...r }) => r);
  const byModel = byOrdThen([...costByModel].map(([model, v]) => ({
    model, provider: providerOf(model), cost: round6(v.cost), calls: v.calls, tokens: v.tokens, ord: v.ord,
  })), r => r.cost).map(({ ord: _ord, ...r }) => r);
  const topUsers = byOrdThen(ai.topUsers.map(u => ({ userId: u.uid, email: u.email ?? null, name: u.name ?? null, cost: round6(u.cost), ord: u.ord })), r => r.cost)
    .slice(0, 10).map(({ ord: _ord, ...r }) => r);
  const systemCosts = ai.system
    .map(s => ({ label: SYSTEM_LABELS[s.uid] ?? s.uid, cost: round6(s.cost) }))
    .sort((a, b) => b.cost - a.cost);

  // Custo por aluno ativo: só uso do app (sem suporte, Instagram, admin), ÷ alunos com atividade no período.
  const studentCost = ai.studentCost;
  const internalCost = totalCost - studentCost;
  const activeInRange = act.activeInRange;
  const costPerActiveSub = activeInRange === 0 ? 0 : studentCost / activeInRange;
  const prevActiveInRange = act.prevActiveInRange;
  const prevCost = ai.prevCost;
  const prevCostPerActive = prevActiveInRange === 0 ? 0 : ai.prevStudentCost / prevActiveInRange;

  // Custo por dia (Brasília), com dias sem custo zerados.
  const costPerDay = new Map<number, number>(ai.daily.map(x => [x.d, x.cost]));
  const timeseries: { date: string; cost: number }[] = [];
  for (let d = brtDay(fromMs); d <= brtDay(toMs); d++) timeseries.push({ date: dayKey(d), cost: round6(costPerDay.get(d) ?? 0) });

  // ─────────────────────────────────────────────────────────────────────────
  // SAÚDE DA RECEITA (receita nova x perdida), pela data da cobrança
  // ─────────────────────────────────────────────────────────────────────────
  const newMrr = U.new_mrr;
  const churnedMrr = U.churned_mrr;
  // null = nenhuma receita perdida no período (a tela mostra "sem perda").
  const quickRatio = churnedMrr <= 0.001 ? null : round2(newMrr / churnedMrr);
  // Receita nova por semana (12 semanas, segunda 00h de Brasília), semanas vazias = 0.
  const thisMonday = mondayOf(today);
  const mrrWeekly = new Map<number, number>();
  for (let w = 11; w >= 0; w--) mrrWeekly.set(thisMonday - w * 7, 0);
  for (const w of A.mrrWeeks) if (mrrWeekly.has(w.wk)) mrrWeekly.set(w.wk, w.amount);
  const mrrTrend = [...mrrWeekly.entries()].sort((a, b) => a[0] - b[0]).map(([wk, amount]) => ({ week: dayKey(wk), amount: round2(amount) }));

  // ─────────────────────────────────────────────────────────────────────────
  // ENGAJAMENTO
  // ─────────────────────────────────────────────────────────────────────────
  const dau = activeOnDay.get(today) ?? 0;   // hoje, no calendário de Brasília
  const wau = act.wau;                        // últimos 7 dias, contando hoje
  const mau = act.mau;                        // últimos 30 dias, contando hoje
  const prevMau = act.prevMau;
  const avgDaily = (a: number, b: number) => {
    let s = 0;
    for (let d = a; d <= b; d++) s += activeOnDay.get(d) ?? 0;
    return s / (b - a + 1);
  };
  // Hábito diário: média de ativos por dia ÷ ativos no mês, só com dias completos (sem hoje, que está pela metade).
  // A média começa no lançamento: os dias antes dele, quase sem alunos, puxariam o número para baixo.
  // Janelas: 30 dias, 7 dias e ontem; o divisor é sempre os ativos nos 30 dias até ontem.
  const mauComplete = act.mauComplete;
  const habitOver = (n: number) => {
    const start = Math.max(today - n, LAUNCH_DAY);
    const span = today - start;
    const avg = span > 0 ? avgDaily(start, today - 1) : 0;
    return {
      pct: mauComplete === 0 || span <= 0 ? null : Math.round((avg / mauComplete) * 100),
      avgDau: round2(avg),
      days: Math.max(0, span),
    };
  };
  const habit = { d30: habitOver(30), d7: habitOver(7), d1: habitOver(1), monthly: mauComplete };
  const avgDau30 = habit.d30.avgDau;
  const stickinessPct = habit.d30.pct;
  const avgDau7 = avgDaily(today - 7, today - 1);
  const prevAvgDau7 = avgDaily(today - 14, today - 8);

  // Ativos por dia no período (até 90 dias).
  const seriesDays = Math.min(90, brtDay(toMs) - brtDay(fromMs) + 1);
  const lastDay = brtDay(toMs);
  const dauTimeseries: { date: string; dau: number }[] = [];
  for (let d = lastDay - seriesDays + 1; d <= lastDay; d++) dauTimeseries.push({ date: dayKey(d), dau: activeOnDay.get(d) ?? 0 });

  // Live Voice no período.
  const liveVoice = {
    calls: pw.live.calls,
    minutes: round2(pw.live.seconds / 60),
    users: pw.live.users,
    byCharacter: pw.liveByCharacter.map(c => ({ character: c.character, calls: c.calls, minutes: round2(c.seconds / 60) })).sort((a, b) => b.minutes - a.minutes),
  };

  // ─────────────────────────────────────────────────────────────────────────
  // FUNIL DE ATIVAÇÃO (contas criadas no período)
  // ─────────────────────────────────────────────────────────────────────────
  const funnelStages = [
    { stage: 'signup',          label: 'Cadastro',                  count: signups },
    { stage: 'first_practice',  label: '1ª atividade',              count: act.funnel.first },
    { stage: 'three_practices', label: '3 ou mais atividades',      count: act.funnel.three },
    { stage: 'paid',            label: 'Pagou',                     count: U.paid_in_cohort },
    { stage: 'retained_30d',    label: 'Ainda ativos após 30 dias', count: act.funnel.retained30, eligibleDenominator: act.funnel.retained30Base },
  ];
  const placement = { done: U.placement_done, of: signups };

  // ─────────────────────────────────────────────────────────────────────────
  // FUNIL DEGUSTAÇÃO → TESTE → PAGO (período)
  // ─────────────────────────────────────────────────────────────────────────
  const ev = (dim: Paywall['groups'][number]['dim'], key: string, name: string) => pw.groups.find(g => g.dim === dim && g.key === key && g.name === name);
  const storeFunnel = (['ios', 'android'] as const).map(platform => ({
    platform,
    shown: ev('plat', platform, 'paywall_shown')?.users ?? 0,
    tapped: ev('plat', platform, 'paywall_purchase_tap')?.users ?? 0,
    started: ev('plat', platform, 'subscription_purchased')?.users ?? 0,
    paid: ev('plat', platform, 'subscription_purchased')?.paid ?? 0,
  }));
  const siteFunnel = (['ios', 'android', 'web'] as const).map(platform => {
    const r = A.siteFunnel.find(x => x.platform === platform);
    return { platform, checkouts: r?.checkouts ?? 0, started: r?.started ?? 0, direct: r?.direct ?? 0, paid: r?.paid ?? 0 };
  });
  const byReason = Object.keys(REASON_LABELS).map(reason => ({
    reason, label: REASON_LABELS[reason],
    shown: ev('reason', reason, 'paywall_shown')?.users ?? 0,
    started: ev('reason', reason, 'subscription_purchased')?.users ?? 0,
    paid: ev('reason', reason, 'subscription_purchased')?.paid ?? 0,
  })).filter(r => r.shown || r.started);
  const byKind = Object.keys(KIND_LABELS).map(kind => ({
    kind, label: KIND_LABELS[kind],
    shown: ev('kind', kind, 'paywall_shown')?.users ?? 0,
    started: ev('kind', kind, 'subscription_purchased')?.users ?? 0,
  })).filter(r => r.shown || r.started);
  const tasteFunnel = {
    signups: { total: signups, ios: U.signups_ios, android: U.signups_android, unknown: signups - U.signups_ios - U.signups_android },
    store: storeFunnel,
    site: siteFunnel,
    byReason,
    byKind,
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ORIGEM DAS CONTAS
  // ─────────────────────────────────────────────────────────────────────────
  const acqSince = U.acq_since;
  const acqBase = acqSince == null ? 0 : A.acqBase; // contas criadas desde que a pergunta existe
  const bySource = [...A.bySource].sort((a, b) => a.ord - b.ord).map(s => ({
    source: s.key,
    label: s.key === 'skipped' ? 'Pulou a pergunta' : SOURCE_LABELS[s.key],
    accounts: s.accounts,
    trial: s.trial,
    paid: s.paid,
  })).sort((a, b) => (a.source === 'skipped' ? 1 : 0) - (b.source === 'skipped' ? 1 : 0) || b.accounts - a.accounts);
  const groupCk = (dim: Accounts['ckGroups'][number]['dim'], labelOf: (k: string) => string) =>
    byOrdThen(A.ckGroups.filter(g => g.dim === dim), g => g.checkouts)
      .map(g => ({ key: g.key, label: labelOf(g.key), checkouts: g.checkouts, completed: g.completed, paid: g.paid }));
  const acquisition = {
    since: acqSince != null ? new Date(acqSince).toISOString() : null,
    base: acqBase,
    answered: A.acqAnswered,
    skipped: A.acqTotal - A.acqAnswered,
    responseRatePct: acqBase ? Math.round((A.acqAnswered / acqBase) * 100) : null,
    bySource,
    site: {
      visits: adVisitRes.error ? null : adVisitRes.count ?? 0,
      clicks: adClickRes.error ? null : adClickRes.count ?? 0,
      byChannel: groupCk('channel', k => CHANNEL_LABELS[k] ?? k),
      byAffiliate: groupCk('affiliate', k => k),
      byCoupon: groupCk('coupon', k => k),
    },
  };

  // Sequência atual (só quem fez atividade nos últimos 30 dias).
  const streakDistribution = ['0', '1-3', '4-7', '8-14', '15-30', '30+'].map(bucket => ({ bucket, count: act.streak[bucket] ?? 0 }));

  // Coortes semanais (semana começa segunda 00h de Brasília): semana N = atividade entre N e N+1 semanas
  // depois do cadastro; só entra quem já tem N+1 semanas de conta.
  const retentionCohorts = Array.from({ length: 8 }, (_, i) => 7 - i).map(w => {
    const c = act.cohorts.find(x => x.w === w);
    const startIdx = thisMonday - w * 7;
    const survivalAt = (n: number) => {
      const s = c?.surv[String(n)];
      return !s || s.e === 0 ? null : Math.round((s.k / s.e) * 100);
    };
    return {
      cohort: dayKey(startIdx),
      size: c?.size ?? 0,
      survival: { w1: survivalAt(1), w2: survivalAt(2), w3: survivalAt(3), w4: survivalAt(4), w6: survivalAt(6), w8: survivalAt(8) },
    };
  });

  // Tempo até a 1ª atividade (contas criadas no período).
  const t = act.ttfv;
  const timeToFirstValue = {
    sampleSize: t.n,
    cohortSize: signups,
    medianHours: t.n && t.medianMs != null ? t.medianMs / 3600000 : null,
    p90Hours: t.n && t.p90Ms != null ? t.p90Ms / 3600000 : null,
    distribution: [
      { bucket: '<1h', count: t.b1 }, { bucket: '1-24h', count: t.b24 }, { bucket: '1-3d', count: t.b72 },
      { bucket: '3-7d', count: t.b168 }, { bucket: '7-30d', count: t.b720 }, { bucket: '>30d', count: t.bInf },
    ],
  };

  // Mapa de horários (atividades do período, horário de Brasília).
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const h of act.heatmap) heatmap[h.dow][h.hour] = h.n;

  const previousPeriod = {
    range: { from: new Date(prevFromMs).toISOString(), to: new Date(prevToMs).toISOString() },
    newUsers: U.prev_signups,
    mau: prevMau,                 // os 30 dias antes dos últimos 30
    totalCost: round6(prevCost),
    costPerActive: round6(prevCostPerActive),
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ALERTAS
  // ─────────────────────────────────────────────────────────────────────────
  type Alert = { severity: 'warn' | 'critical'; message: string };
  const alerts: Alert[] = [];

  if (churnPct != null && churnPct >= 10 && payingAtStart >= 10) {
    alerts.push({
      severity: churnPct >= 20 ? 'critical' : 'warn',
      message: `Cancelamento do período em ${churnPct}% (${churnedFromStart} de ${payingAtStart} pagantes) — acima do saudável (<10%).`,
    });
  }

  if (stickinessPct != null && stickinessPct < 20 && mauComplete >= 20 && habit.d30.days >= 7) {
    alerts.push({
      severity: 'warn',
      message: `Hábito diário (ativos no dia ÷ ativos no mês) em ${stickinessPct}% — abaixo da referência de 20%.`,
    });
  }

  const sentCount = sentRes.error ? 0 : sentRes.count ?? 0;
  const failedCount = failedRes.error ? 0 : failedRes.count ?? 0;
  const totalAttempts = sentCount + failedCount;
  const deliveryRatePct = totalAttempts === 0 ? null : Math.round((sentCount / totalAttempts) * 100);
  if (deliveryRatePct != null && deliveryRatePct < 95 && totalAttempts >= 10) {
    alerts.push({
      severity: deliveryRatePct < 85 ? 'critical' : 'warn',
      message: `Taxa de entrega de push em ${deliveryRatePct}%. Verifique os tokens e o FCM.`,
    });
  }

  if (prevCostPerActive > 0 && costPerActiveSub > prevCostPerActive * 1.3) {
    const pctUp = Math.round(((costPerActiveSub - prevCostPerActive) / prevCostPerActive) * 100);
    alerts.push({ severity: 'warn', message: `Custo de IA por aluno ativo subiu ${pctUp}% em relação ao período anterior.` });
  }

  if (prevAvgDau7 >= 5 && avgDau7 < prevAvgDau7 * 0.7) {
    const pctDown = Math.round(((prevAvgDau7 - avgDau7) / prevAvgDau7) * 100);
    alerts.push({ severity: 'warn', message: `A média de ativos por dia caiu ${pctDown}% (últimos 7 dias em relação aos 7 anteriores).` });
  }

  if (trialConversionPct != null && trialConversionPct < 15 && convDen >= 10) {
    alerts.push({
      severity: 'warn',
      message: `Conversão do teste grátis em pago em ${trialConversionPct}% (${convertedFromTrial} de ${convDen}). Referência de apps por assinatura: 25% a 40%.`,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VERSÃO DO APP
  // ─────────────────────────────────────────────────────────────────────────
  // Versão vigente = app_release (a mesma do aviso "Tem versão nova"). Base: quem abriu o app nos últimos 30 dias,
  // agrupado no banco por plataforma e versão.
  const latestBy = new Map(((relRes.data ?? []) as { platform: string; latest_version: string }[]).map(r => [r.platform, r.latest_version]));
  const latestVersion = latestBy.get('ios') ?? latestBy.get('android') ?? '';
  const opened = A.appVersions;
  const isLatest = (g: Accounts['appVersions'][number]) => !!g.app_version && g.app_version === (latestBy.get(g.app_platform ?? '') ?? latestVersion);
  const sumN = (list: typeof opened) => list.reduce((s, g) => s + g.n, 0);
  const opened30 = sumN(opened);
  const appOnLatest = opened.filter(isLatest);
  const onLatest = sumN(appOnLatest);
  const versionCount = new Map<string, { n: number; ord: number }>();
  for (const g of opened) {
    const v = g.app_version ?? 'sem versão';
    const cur = versionCount.get(v) ?? { n: 0, ord: g.ord };
    cur.n += g.n; cur.ord = Math.min(cur.ord, g.ord);
    versionCount.set(v, cur);
  }
  const byVersion = byOrdThen([...versionCount].map(([version, v]) => ({ version, count: v.n, ord: v.ord })), r => r.count)
    .slice(0, 6).map(({ ord: _ord, ...r }) => r);
  const appVersions = {
    latestVersion,
    total: U.total,
    opened30d: opened30,
    onLatest,
    outdated: sumN(opened.filter(g => !!g.app_version && !isLatest(g))),
    unknown: sumN(opened.filter(g => !g.app_version)),
    onLatestPct: opened30 ? round2((onLatest / opened30) * 100) : 0,
    byVersion,
    byPlatform: {
      ios:     sumN(appOnLatest.filter(g => g.app_platform === 'ios')),
      android: sumN(appOnLatest.filter(g => g.app_platform === 'android')),
    },
  };

  return {
    range: { from: from.toISOString(), to: to.toISOString(), days },
    appVersions,
    revenue: {
      mrr: round2(mrr),
      arr: round2(arr),
      activeSubs: U.active_subs,
      payingTotal,
      monthlySubs: U.monthly_subs,
      yearlySubs: U.yearly_subs,
      onTrial,
      subs,
      trialMrrPotential: round2(trialMrrPotential),
      trialConversionPct,
      trialConversion: { converted: convertedFromTrial, total: convDen },
      churnPct,
      churn: { lost: churnedFromStart, base: payingAtStart },
      renewals7d: firstCharges7d + renewalCharges7d,
      charges7d: { firstCharge: firstCharges7d, renewal: renewalCharges7d },
      inactivePaying: act.inactivePaying,
      newUsers,
      totalUsers: U.total,
      cash,
    },
    taste,
    tasteFunnel,
    acquisition,
    retention,
    openai: {
      tableMissing: usageTableMissing,
      totalCost: round6(totalCost),
      studentCost: round6(studentCost),
      internalCost: round6(internalCost),
      callCount,
      activeInRange,
      costPerActiveSub: round6(costPerActiveSub),
      byEndpoint,
      byModel,
      topUsers,
      systemCosts,
      timeseries,
    },
    mrrHealth: {
      newMrr:     round2(newMrr),
      churnedMrr: round2(churnedMrr),
      quickRatio,
      newInRange:     { monthly: U.new_monthly,     yearly: U.new_yearly,     count: U.new_count },
      churnedInRange: { monthly: U.churned_monthly, yearly: U.churned_yearly, count: U.churned_count },
      mrrTrend,
    },
    engagement: {
      dau, wau, mau,
      stickinessPct,
      avgDau30: round2(avgDau30),
      habit,
      dauTimeseries,
      liveVoice,
    },
    activationFunnel: funnelStages,
    placement,
    streakDistribution,
    retentionCohorts,
    timeToFirstValue,
    practiceHeatmap: heatmap,
    previousPeriod,
    alerts,
    filters,
  };
}

