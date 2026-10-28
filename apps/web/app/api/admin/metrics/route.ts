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
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, can } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TASTE_DAYS } from '@/lib/taste';

type DbError = { message: string } | null;

// PostgREST devolve no máximo 1000 linhas por consulta: pagina até o fim (sempre com ordem fixa).
async function paged(build: (from: number, to: number) => PromiseLike<{ data: unknown; error: DbError }>, max = 200000) {
  const data: unknown[] = [];
  for (let from = 0; from < max; from += 1000) {
    const { data: rows, error } = await build(from, from + 999);
    if (error) return { data: data.length ? data : null, error };
    const arr = (rows ?? []) as unknown[];
    data.push(...arr);
    if (arr.length < 1000) break;
  }
  return { data, error: null as DbError };
}

// Para tabelas grandes: conta antes e busca as páginas em paralelo (8 por vez). A consulta de página
// precisa ter .order() por uma coluna única, senão o PostgREST pode repetir ou pular linhas.
async function pagedParallel(
  countQ: () => PromiseLike<{ count: number | null; error: DbError }>,
  pageQ: (from: number, to: number) => PromiseLike<{ data: unknown; error: DbError }>,
) {
  const { count, error } = await countQ();
  if (error) return { data: null, error };
  const starts = Array.from({ length: Math.ceil((count ?? 0) / 1000) + 1 }, (_, i) => i * 1000); // +1 página para o que entrou depois da contagem
  const data: unknown[] = [];
  for (let i = 0; i < starts.length; i += 8) {
    const res = await Promise.all(starts.slice(i, i + 8).map(s => pageQ(s, s + 999)));
    for (const r of res) {
      if (r.error) return { data: null, error: r.error };
      data.push(...((r.data ?? []) as unknown[]));
    }
  }
  return { data, error: null as DbError };
}

// Preços atuais (R$) da loja; no site vale o valor de cada compra (com cupom).
const MONTHLY_PRICE_BRL = 29.99;
const YEARLY_PRICE_BRL  = 199.99;

// ── Calendário de Brasília (UTC-3, sem horário de verão) ────────────────────
const DAY = 86400000;
const BRT = 3 * 3600000;
/** Índice do dia no calendário de Brasília. */
const brtDay = (t: number) => Math.floor((t - BRT) / DAY);
/** 00h de Brasília do dia de índice idx, em ms UTC. */
const brtDayStart = (idx: number) => idx * DAY + BRT;
/** YYYY-MM-DD do dia de índice idx. */
const dayKey = (idx: number) => new Date(idx * DAY).toISOString().slice(0, 10);
/** Índice da segunda-feira da semana do dia idx. */
const mondayOf = (idx: number) => idx - ((new Date(idx * DAY).getUTCDay() + 6) % 7);
const ms = (s: string | null | undefined) => (s ? new Date(s).getTime() : NaN);

// Contas da equipe (mesmo padrão de release-broadcast) + hide_from_ranking + institucional.
const TEAM_EMAIL = (e: string | null | undefined) =>
  !!e && (/@(hubacademybr\.com|queizy\.com)$/i.test(e) || /^felipe\.xavier1987\+/i.test(e));

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

  const { from, to, days } = parseRange(req);
  const filters = parseFilters(req);
  const fromMs = from.getTime();
  const toMs = to.getTime();
  // Período anterior do MESMO tamanho, terminando onde o atual começa.
  const prevToMs   = fromMs - 1;
  const prevFromMs = fromMs - days * DAY;
  const nowMs = Date.now();
  const today = brtDay(nowMs);
  const inRange = (t: number) => t >= fromMs && t <= toMs;
  const inPrev  = (t: number) => t >= prevFromMs && t <= prevToMs;
  const supabase = getSupabaseAdmin();

  // Atividades: 90 dias do calendário (gráficos, retenção, coortes) ou desde o início do período anterior.
  const wideStartMs = Math.min(prevFromMs, brtDayStart(today - 89));
  const wideStartIso = new Date(wideStartMs).toISOString();
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const prevFromIso = new Date(prevFromMs).toISOString();

  type UserRow = {
    id: string;
    email?: string | null;
    name?: string | null;
    created_at: string;
    charlotte_level: string | null;
    is_institutional: boolean | null;
    hide_from_ranking: boolean | null;
    subscription_status: string | null;
    subscription_product: string | null;
    subscription_expires_at: string | null;
    trial_ends_at: string | null;
    placement_test_done: boolean | null;
    app_version: string | null;
    app_platform: string | null;
    last_seen_at: string | null;
  };
  type PracticeRow = { user_id: string; created_at: string };
  type ProgressRow = { user_id: string; streak_days: number | null; last_practice_date: string | null };
  type UsageRow = { user_id: string | null; endpoint: string; model: string; cost_usd: number | string; total_tokens: number | null; created_at: string };
  type RevRow = { app_user_id: string; event_type: string; store: string | null; price_purchased: number | null; net_brl: number | null; purchased_at: string | null };
  type CkRow = {
    user_id: string; plan: string | null; method: string | null; value_brl: number; trial_days: number | null; status: string;
    asaas_payment_id: string | null; paid_at: string | null; refunded_at: string | null; created_at: string;
    channel: string | null; affiliate_code: string | null; coupon_code: string | null;
  };
  type EventRow = { user_id: string; event_name: string; platform: string | null; properties: unknown; created_at: string };
  type AcqRow = { user_id: string; source: string | null; created_at: string };
  type LiveRow = { user_id: string; duration_seconds: number | null; character: string | null };

  const practiceCols = 'user_id, created_at';
  const usageCols = 'user_id, endpoint, model, total_tokens, cost_usd, created_at';

  const [
    usersRes, wideRes, progressRes, usageRes, revRes, ckRes, relRes, evRes, acqRes, liveRes,
    sentRes, failedRes, adVisitRes, adClickRes,
  ] = await Promise.all([
    paged((a, b) => supabase.from('charlotte_users').select('id, email, name, created_at, charlotte_level, is_institutional, hide_from_ranking, subscription_status, subscription_product, subscription_expires_at, trial_ends_at, placement_test_done, app_version, app_platform, last_seen_at').order('id').range(a, b)),
    // Resgates de recompensa (mission_reward_*, weekly_reward_*) ficam fora: não são estudo.
    pagedParallel(
      () => supabase.from('charlotte_practices').select('id', { count: 'exact', head: true }).not('practice_type', 'like', '%reward%').gte('created_at', wideStartIso).lte('created_at', toIso),
      (a, b) => supabase.from('charlotte_practices').select(practiceCols).not('practice_type', 'like', '%reward%').gte('created_at', wideStartIso).lte('created_at', toIso).order('id').range(a, b),
    ),
    paged((a, b) => supabase.from('charlotte_progress').select('user_id, streak_days, last_practice_date').order('user_id').range(a, b)),
    // Custo de IA do período atual e do anterior (para a variação).
    pagedParallel(
      () => supabase.from('openai_usage').select('id', { count: 'exact', head: true }).gte('created_at', prevFromIso).lte('created_at', toIso),
      (a, b) => supabase.from('openai_usage').select(usageCols).gte('created_at', prevFromIso).lte('created_at', toIso).order('id').range(a, b),
    ),
    paged((a, b) => supabase.from('revenue_events').select('app_user_id, event_type, store, price_purchased, net_brl, purchased_at').order('id').range(a, b)),
    paged((a, b) => supabase.from('asaas_checkouts').select('user_id, plan, method, value_brl, trial_days, status, asaas_payment_id, paid_at, refunded_at, created_at, channel, affiliate_code, coupon_code')
      .eq('sandbox', false).order('created_at', { ascending: true }).order('id').range(a, b)),
    supabase.from('app_release').select('platform, latest_version'),
    paged((a, b) => supabase.from('charlotte_analytics_events').select('user_id, event_name, platform, properties, created_at')
      .in('event_name', ['paywall_shown', 'paywall_purchase_tap', 'subscription_purchased'])
      .gte('created_at', fromIso).lte('created_at', toIso).order('id').range(a, b)),
    paged((a, b) => supabase.from('acquisition_answers').select('user_id, source, created_at').order('user_id').range(a, b)),
    paged((a, b) => supabase.from('charlotte_live_calls').select('user_id, duration_seconds, character')
      .gte('started_at', fromIso).lte('started_at', toIso).order('id').range(a, b)),
    // Entrega de push no período (só para o alerta).
    supabase.from('notification_logs').select('id', { count: 'exact', head: true }).eq('status', 'sent').neq('notification_type', 'scheduler_lock').gte('created_at', fromIso).lte('created_at', toIso),
    supabase.from('notification_logs').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('created_at', fromIso).lte('created_at', toIso),
    supabase.from('ad_events').select('id', { count: 'exact', head: true }).eq('kind', 'visit').gte('created_at', fromIso).lte('created_at', toIso),
    supabase.from('ad_events').select('id', { count: 'exact', head: true }).eq('kind', 'click').gte('created_at', fromIso).lte('created_at', toIso),
  ]);

  if (usersRes.error) return NextResponse.json({ error: usersRes.error.message }, { status: 500 });
  if (wideRes.error)  return NextResponse.json({ error: wideRes.error.message },  { status: 500 });

  // ── Equipe fora de tudo ──────────────────────────────────────────────────
  const usersAll = (usersRes.data ?? []) as UserRow[];
  const teamIds = new Set(usersAll.filter(u => u.is_institutional || u.hide_from_ranking || TEAM_EMAIL(u.email)).map(u => String(u.id)));
  const notTeam = (id: string | null | undefined) => !id || !teamIds.has(String(id));
  const baseUsers = usersAll.filter(u => notTeam(u.id));

  let practicesWide = ((wideRes.data ?? []) as PracticeRow[]).filter(p => notTeam(p.user_id));
  let progress      = ((progressRes.data ?? []) as ProgressRow[]).filter(p => notTeam(p.user_id));
  let usage         = ((usageRes.data ?? []) as UsageRow[]).filter(r => notTeam(r.user_id));
  let events        = ((evRes.data ?? []) as EventRow[]).filter(e => notTeam(e.user_id));
  let liveCalls     = ((liveRes.data ?? []) as LiveRow[]).filter(c => notTeam(c.user_id));
  const revAll      = ((revRes.data ?? []) as RevRow[]).filter(r => notTeam(r.app_user_id));
  const ckAll       = ((ckRes.data ?? []) as CkRow[]).filter(c => notTeam(c.user_id));
  const usageTableMissing = Boolean(usageRes.error);

  // ── Cobranças ────────────────────────────────────────────────────────────
  // Compra reembolsada por inteiro não conta como cobrança.
  const purchases = new Map<string, number>();
  const refunds = new Map<string, number>();
  for (const r of revAll) {
    const uid = String(r.app_user_id);
    if (r.event_type === 'REFUND') refunds.set(uid, (refunds.get(uid) ?? 0) + 1);
    else if (Number(r.price_purchased) > 0) purchases.set(uid, (purchases.get(uid) ?? 0) + 1);
  }
  const fullyRefunded = (uid: string) => (refunds.get(uid) ?? 0) > 0 && (refunds.get(uid) ?? 0) >= (purchases.get(uid) ?? 0);

  // 1ª cobrança de cada conta: revenue_events (loja e site) e compras do site já cobradas.
  const firstChargeAt = new Map<string, number>();
  const noteCharge = (uid: string, t: number) => {
    if (!Number.isFinite(t)) return;
    const cur = firstChargeAt.get(uid);
    if (cur == null || t < cur) firstChargeAt.set(uid, t);
  };
  for (const r of revAll) {
    const uid = String(r.app_user_id);
    if (r.event_type === 'REFUND' || !(Number(r.price_purchased) > 0) || fullyRefunded(uid)) continue;
    noteCharge(uid, ms(r.purchased_at));
  }
  const siteCk = new Map<string, CkRow>(); // última compra concluída no site (sem reembolso)
  for (const c of ckAll) {
    if (c.status !== 'paid' || c.refunded_at) continue;
    const uid = String(c.user_id);
    siteCk.set(uid, c);
    if (c.paid_at) noteCharge(uid, ms(c.paid_at));
    else if (!((c.trial_days ?? 0) > 0)) noteCharge(uid, ms(c.created_at)); // Pix/cartão sem teste: cobrado na hora
    else if (c.asaas_payment_id) noteCharge(uid, ms(c.created_at) + (c.trial_days ?? 0) * DAY);
  }
  const paidEver = (u: UserRow) => firstChargeAt.has(String(u.id));

  const isStore  = (p: string | null) => p === 'monthly' || p === 'yearly';
  const isSite   = (p: string | null) => !!p && p.startsWith('web_');
  const isAnnual = (p: string | null) => p === 'yearly' || !!p?.startsWith('web_annual'); // web_annual, web_annual_pix, web_annual_12x

  // Situação atual de cada conta com acesso.
  type SubKind = 'paid_store' | 'paid_site' | 'trial_store' | 'trial_site' | 'trial_legacy' | null;
  const kindOf = (u: UserRow): SubKind => {
    if (u.subscription_status === 'trial') return u.trial_ends_at && ms(u.trial_ends_at) > nowMs ? 'trial_legacy' : null;
    if (u.subscription_status !== 'active' && u.subscription_status !== 'cancelled') return null;
    if (!u.subscription_expires_at || ms(u.subscription_expires_at) <= nowMs) return null;
    if (isStore(u.subscription_product)) return paidEver(u) ? 'paid_store' : 'trial_store';
    if (isSite(u.subscription_product)) return paidEver(u) ? 'paid_site' : 'trial_site';
    return null;
  };
  const kinds = new Map(baseUsers.map(u => [String(u.id), kindOf(u)] as const));
  const kindOfId = (u: UserRow) => kinds.get(String(u.id)) ?? null;
  const isPaidKind  = (k: SubKind) => k === 'paid_store' || k === 'paid_site';
  const isTrialKind = (k: SubKind) => k === 'trial_store' || k === 'trial_site' || k === 'trial_legacy';
  const isTaster = (u: UserRow) => !u.subscription_status || u.subscription_status === 'none';

  // ── Filtros de nível e plano ─────────────────────────────────────────────
  let users = baseUsers;
  if (filters.level) users = users.filter(u => u.charlotte_level === filters.level);
  if (filters.plan === 'taste') users = users.filter(isTaster);
  else if (filters.plan === 'trial') users = users.filter(u => isTrialKind(kindOfId(u)));
  else if (filters.plan === 'paid') users = users.filter(u => isPaidKind(kindOfId(u)));
  else if (filters.plan === 'monthly' || filters.plan === 'annual') {
    const wantAnnual = filters.plan === 'annual';
    users = users.filter(u => { const k = kindOfId(u); return !!k && k !== 'trial_legacy' && isAnnual(u.subscription_product) === wantAnnual; });
  }
  const hasFilter = !!(filters.level || filters.plan);
  const filteredIds = new Set(users.map(u => String(u.id)));
  if (hasFilter) {
    const keep = (id: string | null | undefined) => !!id && filteredIds.has(String(id));
    practicesWide = practicesWide.filter(p => keep(p.user_id));
    progress      = progress.filter(p => keep(p.user_id));
    usage         = usage.filter(r => keep(r.user_id)); // custos do sistema não têm aluno: saem com filtro
    events        = events.filter(e => keep(e.user_id));
    liveCalls     = liveCalls.filter(c => keep(c.user_id));
  }
  const userById = new Map(users.map(u => [String(u.id), u]));

  // Atividades por aluno e por dia de Brasília.
  const practicesByUser = new Map<string, number[]>();
  const activeOnDay = new Map<number, Set<string>>();
  const practices: PracticeRow[] = []; // só do período
  for (const p of practicesWide) {
    const uid = String(p.user_id);
    const t = ms(p.created_at);
    if (!practicesByUser.has(uid)) practicesByUser.set(uid, []);
    practicesByUser.get(uid)!.push(t);
    const d = brtDay(t);
    if (!activeOnDay.has(d)) activeOnDay.set(d, new Set());
    activeOnDay.get(d)!.add(uid);
    if (inRange(t)) practices.push(p);
  }
  const activeBetween = (a: number, b: number) => {
    const s = new Set<string>();
    for (let d = a; d <= b; d++) for (const uid of activeOnDay.get(d) ?? []) s.add(uid);
    return s;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RECEITA
  // ─────────────────────────────────────────────────────────────────────────

  const activeSubs   = users.filter(u => isPaidKind(kindOfId(u)) && u.subscription_status === 'active');
  const trialsActive = users.filter(u => { const k = kindOfId(u); return (k === 'trial_store' || k === 'trial_site') && u.subscription_status === 'active'; });
  const cancelledWithAccessList = users.filter(u => u.subscription_status === 'cancelled' && !!kindOfId(u));
  const subs = {
    paidStore:   activeSubs.filter(u => kindOfId(u) === 'paid_store').length,
    paidSite:    activeSubs.filter(u => kindOfId(u) === 'paid_site').length,
    trialStore:  trialsActive.filter(u => kindOfId(u) === 'trial_store').length,
    trialSite:   trialsActive.filter(u => kindOfId(u) === 'trial_site').length,
    trialLegacy: users.filter(u => kindOfId(u) === 'trial_legacy').length,
    cancelledWithAccess: cancelledWithAccessList.length,
    cancelledPaid:  cancelledWithAccessList.filter(u => isPaidKind(kindOfId(u))).length,
    cancelledTrial: cancelledWithAccessList.filter(u => !isPaidKind(kindOfId(u))).length,
  };
  const monthlySubs = activeSubs.filter(u => !isAnnual(u.subscription_product)).length;
  const yearlySubs  = activeSubs.filter(u => isAnnual(u.subscription_product)).length;
  const monthlyValue = (u: UserRow): number => {
    const ck = isSite(u.subscription_product) ? siteCk.get(String(u.id)) : null;
    if (ck) return isAnnual(u.subscription_product) ? Number(ck.value_brl) / 12 : Number(ck.value_brl);
    return isAnnual(u.subscription_product) ? YEARLY_PRICE_BRL / 12 : MONTHLY_PRICE_BRL;
  };
  // MRR: só quem pagou e segue com renovação ativa (quem cancelou aparece à parte).
  const mrr = activeSubs.reduce((sum, u) => sum + monthlyValue(u), 0);
  const arr = mrr * 12;
  // MRR que entra se os testes atuais (não cancelados) virarem pagantes.
  const trialMrrPotential = trialsActive.reduce((sum, u) => sum + monthlyValue(u), 0);
  const onTrial = subs.trialStore + subs.trialSite + subs.trialLegacy;

  // ── Conversão do teste com cartão ────────────────────────────────────────
  // Teve teste com cartão: loja (sempre tem) ou site com dias grátis. Convertido = teve alguma cobrança,
  // não importa se depois cancelou. Perdido = teste terminou sem cobrança. Quem ainda está no teste não entra.
  const hadCardTrial = (u: UserRow) => {
    if (isStore(u.subscription_product)) return true;
    if (!isSite(u.subscription_product)) return false;
    const ck = siteCk.get(String(u.id));
    return !ck || (ck.trial_days ?? 0) > 0;
  };
  const convertedFromTrial = users.filter(u => hadCardTrial(u) && paidEver(u)).length;
  const endedUnpaid = users.filter(u => hadCardTrial(u) && !paidEver(u) && !kindOfId(u)
    && (u.subscription_status === 'cancelled' || u.subscription_status === 'expired')).length;
  const convDen = convertedFromTrial + endedUnpaid;
  const trialConversionPct = convDen === 0 ? null : Math.round((convertedFromTrial / convDen) * 100);

  // ── Cancelamento (churn) do período ──────────────────────────────────────
  // Pagantes perdidos no período ÷ pagantes no início do período.
  const expMs = (u: UserRow) => ms(u.subscription_expires_at);
  const lostAccess = (u: UserRow) => (u.subscription_status === 'cancelled' || u.subscription_status === 'expired') && paidEver(u);
  const payingAtStart = users.filter(u => {
    const fc = firstChargeAt.get(String(u.id));
    if (fc == null || fc >= fromMs) return false;
    const e = expMs(u);
    return Number.isFinite(e) ? e >= fromMs : u.subscription_status === 'active';
  });
  const churnedFromStart = payingAtStart.filter(u => lostAccess(u) && inRange(expMs(u))).length;
  const churnPct = payingAtStart.length === 0 ? null : Math.round((churnedFromStart / payingAtStart.length) * 100);

  // ── Cobranças dos próximos 7 dias ────────────────────────────────────────
  const in7d = nowMs + 7 * DAY;
  const due7d = (u: UserRow) => { const e = expMs(u); return e > nowMs && e <= in7d; };
  const firstCharges7d = trialsActive.filter(due7d).length;
  const renewalCharges7d = activeSubs.filter(due7d).length;

  // ── Pagantes sem estudar há 14 dias ──────────────────────────────────────
  const d14 = nowMs - 14 * DAY;
  const inactivePaying = activeSubs.filter(u => {
    const acts = practicesByUser.get(String(u.id)) ?? [];
    return !acts.some(t => t >= d14);
  }).length;

  // ── Receita real do caixa no período (líquida) ───────────────────────────
  const revInScope = revAll.filter(r => !hasFilter || filteredIds.has(String(r.app_user_id)));
  const cashRows = revInScope.filter(r => r.event_type !== 'REFUND' && Number(r.price_purchased) > 0 && inRange(ms(r.purchased_at)));
  const refundRows = revInScope.filter(r => r.event_type === 'REFUND' && inRange(ms(r.purchased_at)));
  const cash = {
    netBrl: round2(cashRows.reduce((s, r) => s + Number(r.net_brl ?? 0), 0)),
    charges: cashRows.length,
    storeCharges: cashRows.filter(r => r.store !== 'ASAAS').length,
    siteCharges: cashRows.filter(r => r.store === 'ASAAS').length,
    refundsBrl: round2(refundRows.reduce((s, r) => s + Number(r.net_brl ?? 0), 0)),
    refunds: refundRows.length,
  };

  // ── Degustação ───────────────────────────────────────────────────────────
  const tasters = users.filter(isTaster);
  const tasteDayOf = (u: UserRow) => today - brtDay(ms(u.created_at)) + 1;
  const taste = {
    total: tasters.length,
    day1: tasters.filter(u => tasteDayOf(u) === 1).length,
    lastDay: tasters.filter(u => tasteDayOf(u) === TASTE_DAYS).length,
    inProgress: tasters.filter(u => tasteDayOf(u) <= TASTE_DAYS).length,
    exhausted: tasters.filter(u => tasteDayOf(u) > TASTE_DAYS).length,
    tasteDays: TASTE_DAYS,
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RETENÇÃO D1 / D7 / D30 (dias do calendário de Brasília)
  // ─────────────────────────────────────────────────────────────────────────
  // Entre quem se cadastrou nos últimos 60 dias: fez alguma atividade exatamente no dia X depois do
  // cadastro (dia 0 = dia do cadastro). Só entra quem já completou o dia X (idade ≥ X+1 dias).
  const cohortUsers = users.filter(u => ms(u.created_at) >= nowMs - 60 * DAY);
  const retentionAt = (x: number) => {
    const eligible = cohortUsers.filter(u => today >= brtDay(ms(u.created_at)) + x + 1);
    const retained = eligible.filter(u => activeOnDay.get(brtDay(ms(u.created_at)) + x)?.has(String(u.id))).length;
    return { pct: eligible.length ? Math.round((retained / eligible.length) * 100) : null, retained, eligible: eligible.length };
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

  // ── Novos no período (mesma base do "Cadastro" do funil) ─────────────────
  const funnelCohort = users.filter(u => inRange(ms(u.created_at)));
  const newUsers = funnelCohort.length;

  // ─────────────────────────────────────────────────────────────────────────
  // CUSTO DE IA
  // ─────────────────────────────────────────────────────────────────────────

  const usageRows = usage.filter(r => inRange(ms(r.created_at)));
  const usagePrev = usage.filter(r => inPrev(ms(r.created_at)));
  const costOf = (rows: UsageRow[]) => rows.reduce((s, r) => s + Number(r.cost_usd || 0), 0);
  const totalCost = costOf(usageRows);
  const callCount = usageRows.length;

  const costByEndpoint: Record<string, { cost: number; calls: number; tokens: number; providers: Set<string> }> = {};
  for (const r of usageRows) {
    const e = (costByEndpoint[r.endpoint] ??= { cost: 0, calls: 0, tokens: 0, providers: new Set() });
    e.cost += Number(r.cost_usd || 0);
    e.calls += 1;
    e.tokens += r.total_tokens || 0;
    e.providers.add(providerOf(r.model || ''));
  }
  const byEndpoint = Object.entries(costByEndpoint)
    .map(([endpoint, v]) => ({ endpoint, cost: round6(v.cost), calls: v.calls, tokens: v.tokens, providers: [...v.providers].sort(), internal: isInternalEndpoint(endpoint) }))
    .sort((a, b) => b.cost - a.cost);

  const costByModel: Record<string, { cost: number; calls: number; tokens: number }> = {};
  for (const r of usageRows) {
    const m = (costByModel[r.model] ??= { cost: 0, calls: 0, tokens: 0 });
    m.cost += Number(r.cost_usd || 0);
    m.calls += 1;
    m.tokens += r.total_tokens || 0;
  }
  const byModel = Object.entries(costByModel)
    .map(([model, v]) => ({ model, provider: providerOf(model), ...v, cost: round6(v.cost) }))
    .sort((a, b) => b.cost - a.cost);

  // Custos de alunos x custos do sistema.
  const SYSTEM_LABELS: Record<string, string> = {
    'system:scheduler': 'Notificações (agendador)',
    'system:tts-cache': 'Áudios do vocabulário (cache)',
    'anonymous':        'Sem aluno identificado',
  };
  const costByUser: Record<string, number> = {};
  const costBySystem: Record<string, number> = {};
  for (const r of usageRows) {
    const uid = r.user_id ?? 'anonymous';
    if (uid === 'anonymous' || uid.startsWith('system:')) costBySystem[uid] = (costBySystem[uid] ?? 0) + Number(r.cost_usd || 0);
    else costByUser[uid] = (costByUser[uid] ?? 0) + Number(r.cost_usd || 0);
  }
  const topUsers = Object.entries(costByUser)
    .map(([userId, cost]) => { const u = userById.get(userId); return { userId, email: u?.email ?? null, name: u?.name ?? null, cost: round6(cost) }; })
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10);
  const systemCosts = Object.entries(costBySystem)
    .map(([uid, cost]) => ({ label: SYSTEM_LABELS[uid] ?? uid, cost: round6(cost) }))
    .sort((a, b) => b.cost - a.cost);

  // Custo por aluno ativo: só uso do app (sem suporte, Instagram, admin), ÷ alunos com atividade no período.
  const studentCost = costOf(usageRows.filter(r => !isInternalEndpoint(r.endpoint)));
  const internalCost = totalCost - studentCost;
  const activeInRange = new Set(practices.map(p => String(p.user_id))).size;
  const costPerActiveSub = activeInRange === 0 ? 0 : studentCost / activeInRange;
  const prevActiveInRange = new Set(practicesWide.filter(p => inPrev(ms(p.created_at))).map(p => String(p.user_id))).size;
  const prevCost = costOf(usagePrev);
  const prevStudentCost = costOf(usagePrev.filter(r => !isInternalEndpoint(r.endpoint)));
  const prevCostPerActive = prevActiveInRange === 0 ? 0 : prevStudentCost / prevActiveInRange;

  // Custo por dia (Brasília), com dias sem custo zerados.
  const costPerDay = new Map<number, number>();
  for (const r of usageRows) { const d = brtDay(ms(r.created_at)); costPerDay.set(d, (costPerDay.get(d) ?? 0) + Number(r.cost_usd || 0)); }
  const timeseries: { date: string; cost: number }[] = [];
  for (let d = brtDay(fromMs); d <= brtDay(toMs); d++) timeseries.push({ date: dayKey(d), cost: round6(costPerDay.get(d) ?? 0) });

  // ─────────────────────────────────────────────────────────────────────────
  // SAÚDE DA RECEITA (receita nova x perdida), pela data da cobrança
  // ─────────────────────────────────────────────────────────────────────────

  const newInRange = users.filter(u => { const t = firstChargeAt.get(String(u.id)); return t != null && inRange(t); });
  const newMonthly = newInRange.filter(u => !isAnnual(u.subscription_product)).length;
  const newYearly  = newInRange.filter(u => isAnnual(u.subscription_product)).length;
  const newMrr = newInRange.reduce((sum, u) => sum + monthlyValue(u), 0);

  // Receita perdida: quem já pagou e perdeu o acesso dentro do período.
  const churnedPaid = users.filter(u => lostAccess(u) && inRange(expMs(u)));
  const churnedMonthly = churnedPaid.filter(u => !isAnnual(u.subscription_product)).length;
  const churnedYearly  = churnedPaid.filter(u => isAnnual(u.subscription_product)).length;
  const churnedMrr = churnedPaid.reduce((sum, u) => sum + monthlyValue(u), 0);
  // null = nenhuma receita perdida no período (a tela mostra "sem perda").
  const quickRatio = churnedMrr <= 0.001 ? null : round2(newMrr / churnedMrr);

  // Receita nova por semana (12 semanas, segunda 00h de Brasília), semanas vazias = 0.
  const thisMonday = mondayOf(today);
  const mrrWeekly = new Map<number, number>();
  for (let w = 11; w >= 0; w--) mrrWeekly.set(thisMonday - w * 7, 0);
  for (const u of users) {
    const t = firstChargeAt.get(String(u.id));
    if (t == null) continue;
    const wk = mondayOf(brtDay(t));
    if (mrrWeekly.has(wk)) mrrWeekly.set(wk, mrrWeekly.get(wk)! + monthlyValue(u));
  }
  const mrrTrend = [...mrrWeekly.entries()].sort((a, b) => a[0] - b[0]).map(([wk, amount]) => ({ week: dayKey(wk), amount: round2(amount) }));

  // ─────────────────────────────────────────────────────────────────────────
  // ENGAJAMENTO
  // ─────────────────────────────────────────────────────────────────────────

  const dau = activeOnDay.get(today)?.size ?? 0;          // hoje, no calendário de Brasília
  const wau = activeBetween(today - 6, today).size;      // últimos 7 dias, contando hoje
  const mauSet = activeBetween(today - 29, today);       // últimos 30 dias, contando hoje
  const mau = mauSet.size;
  const prevMau = activeBetween(today - 59, today - 30).size;
  const avgDaily = (a: number, b: number) => {
    let s = 0;
    for (let d = a; d <= b; d++) s += activeOnDay.get(d)?.size ?? 0;
    return s / (b - a + 1);
  };
  // Hábito diário: média de ativos por dia ÷ ativos no mês, nos 30 dias completos (sem hoje, que está pela metade).
  const mauComplete = activeBetween(today - 30, today - 1).size;
  const avgDau30 = avgDaily(today - 30, today - 1);
  const stickinessPct = mauComplete === 0 ? null : Math.round((avgDau30 / mauComplete) * 100);
  const avgDau7 = avgDaily(today - 7, today - 1);
  const prevAvgDau7 = avgDaily(today - 14, today - 8);

  // Ativos por dia no período (até 90 dias).
  const seriesDays = Math.min(90, brtDay(toMs) - brtDay(fromMs) + 1);
  const lastDay = brtDay(toMs);
  const dauTimeseries: { date: string; dau: number }[] = [];
  for (let d = lastDay - seriesDays + 1; d <= lastDay; d++) dauTimeseries.push({ date: dayKey(d), dau: activeOnDay.get(d)?.size ?? 0 });

  // ── Live Voice no período ────────────────────────────────────────────────
  const liveByChar: Record<string, { calls: number; seconds: number }> = {};
  for (const c of liveCalls) {
    const k = c.character || 'charlotte';
    const e = (liveByChar[k] ??= { calls: 0, seconds: 0 });
    e.calls += 1; e.seconds += Number(c.duration_seconds ?? 0);
  }
  const liveSeconds = liveCalls.reduce((s, c) => s + Number(c.duration_seconds ?? 0), 0);
  const liveVoice = {
    calls: liveCalls.length,
    minutes: round2(liveSeconds / 60),
    users: new Set(liveCalls.map(c => String(c.user_id))).size,
    byCharacter: Object.entries(liveByChar).map(([character, v]) => ({ character, calls: v.calls, minutes: round2(v.seconds / 60) })).sort((a, b) => b.minutes - a.minutes),
  };

  // ─────────────────────────────────────────────────────────────────────────
  // FUNIL DE ATIVAÇÃO (contas criadas no período)
  // ─────────────────────────────────────────────────────────────────────────

  const practiceCount = (u: UserRow) => practicesByUser.get(String(u.id))?.length ?? 0;
  const signups        = funnelCohort.length;
  const firstPractice  = funnelCohort.filter(u => practiceCount(u) >= 1).length;
  const threePractices = funnelCohort.filter(u => practiceCount(u) >= 3).length;
  const paidInCohort   = funnelCohort.filter(paidEver).length;
  const retained30Base = funnelCohort.filter(u => nowMs - ms(u.created_at) >= 30 * DAY);
  const retained30 = retained30Base.filter(u => {
    const created = ms(u.created_at);
    return (practicesByUser.get(String(u.id)) ?? []).some(t => t - created >= 30 * DAY);
  }).length;
  const funnelStages = [
    { stage: 'signup',          label: 'Cadastro',                  count: signups },
    { stage: 'first_practice',  label: '1ª atividade',              count: firstPractice },
    { stage: 'three_practices', label: '3 ou mais atividades',      count: threePractices },
    { stage: 'paid',            label: 'Pagou',                     count: paidInCohort },
    { stage: 'retained_30d',    label: 'Ainda ativos após 30 dias', count: retained30, eligibleDenominator: retained30Base.length },
  ];
  const placement = { done: funnelCohort.filter(u => u.placement_test_done === true).length, of: signups };

  // ─────────────────────────────────────────────────────────────────────────
  // FUNIL DEGUSTAÇÃO → TESTE → PAGO (período)
  // ─────────────────────────────────────────────────────────────────────────

  const parseProps = (p: unknown): Record<string, unknown> => {
    if (p && typeof p === 'object') return p as Record<string, unknown>;
    if (typeof p === 'string') { try { const o = JSON.parse(p); return o && typeof o === 'object' ? o : {}; } catch { return {}; } }
    return {};
  };
  const normPlat = (p: string | null | undefined) => (p === 'ios' || p === 'android' ? p : 'web');
  type PEv = { uid: string; name: string; plat: string; kind: string; reason: string };
  const pevs: PEv[] = events.map(e => {
    const pr = parseProps(e.properties);
    const reason = typeof pr.reason === 'string' && REASON_LABELS[pr.reason] ? pr.reason : 'other';
    return { uid: String(e.user_id), name: e.event_name, plat: normPlat(e.platform), kind: typeof pr.kind === 'string' ? pr.kind : 'outro', reason };
  });
  const usersWith = (name: string, pred: (e: PEv) => boolean = () => true) => new Set(pevs.filter(e => e.name === name && pred(e)).map(e => e.uid));
  const countPaid = (ids: Set<string>) => [...ids].filter(id => firstChargeAt.has(id)).length;
  const storeFunnel = (['ios', 'android'] as const).map(platform => {
    const started = usersWith('subscription_purchased', e => e.plat === platform);
    return {
      platform,
      shown: usersWith('paywall_shown', e => e.plat === platform).size,
      tapped: usersWith('paywall_purchase_tap', e => e.plat === platform).size,
      started: started.size,
      paid: countPaid(started),
    };
  });
  const ckInRange = ckAll.filter(c => inRange(ms(c.created_at)) && (!hasFilter || filteredIds.has(String(c.user_id))));
  const ckCharged = (c: CkRow) => !c.refunded_at && (!!c.paid_at || (c.status === 'paid' && !((c.trial_days ?? 0) > 0)) || firstChargeAt.has(String(c.user_id)));
  const sitePlatOf = (c: CkRow) => normPlat(userById.get(String(c.user_id))?.app_platform);
  const siteFunnel = (['ios', 'android', 'web'] as const).map(platform => {
    const rows = ckInRange.filter(c => sitePlatOf(c) === platform);
    return {
      platform,
      checkouts: new Set(rows.map(c => String(c.user_id))).size,
      started: new Set(rows.filter(c => c.status === 'paid' && (c.trial_days ?? 0) > 0).map(c => String(c.user_id))).size,
      direct: new Set(rows.filter(c => c.status === 'paid' && !((c.trial_days ?? 0) > 0)).map(c => String(c.user_id))).size,
      paid: new Set(rows.filter(ckCharged).map(c => String(c.user_id))).size,
    };
  });
  const byReason = Object.keys(REASON_LABELS).map(reason => {
    const started = usersWith('subscription_purchased', e => e.reason === reason);
    return { reason, label: REASON_LABELS[reason], shown: usersWith('paywall_shown', e => e.reason === reason).size, started: started.size, paid: countPaid(started) };
  }).filter(r => r.shown || r.started);
  const byKind = Object.keys(KIND_LABELS).map(kind => {
    const started = usersWith('subscription_purchased', e => e.kind === kind);
    return { kind, label: KIND_LABELS[kind], shown: usersWith('paywall_shown', e => e.kind === kind).size, started: started.size };
  }).filter(r => r.shown || r.started);
  const signupsByPlat = {
    ios: funnelCohort.filter(u => u.app_platform === 'ios').length,
    android: funnelCohort.filter(u => u.app_platform === 'android').length,
  };
  const tasteFunnel = {
    signups: { total: signups, ...signupsByPlat, unknown: signups - signupsByPlat.ios - signupsByPlat.android },
    store: storeFunnel,
    site: siteFunnel,
    byReason,
    byKind,
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ORIGEM DAS CONTAS
  // ─────────────────────────────────────────────────────────────────────────

  const acqRows = ((acqRes.data ?? []) as AcqRow[]).filter(a => userById.has(String(a.user_id)));
  const acqSince = acqRows.reduce<number | null>((m, a) => { const t = ms(a.created_at); return m == null || t < m ? t : m; }, null);
  const acqBase = acqSince == null ? 0 : users.filter(u => ms(u.created_at) >= acqSince).length; // contas criadas desde que a pergunta existe
  const acqAnswered = acqRows.filter(a => a.source && a.source !== 'skipped');
  const startedTrialEver = (u: UserRow) => isStore(u.subscription_product) || isSite(u.subscription_product) || u.subscription_status === 'trial';
  const bySourceMap = new Map<string, UserRow[]>();
  for (const a of acqRows) {
    const key = a.source && SOURCE_LABELS[a.source] ? a.source : a.source === 'skipped' || !a.source ? 'skipped' : 'other';
    const u = userById.get(String(a.user_id))!;
    if (!bySourceMap.has(key)) bySourceMap.set(key, []);
    bySourceMap.get(key)!.push(u);
  }
  const bySource = [...bySourceMap.entries()].map(([source, list]) => ({
    source,
    label: source === 'skipped' ? 'Pulou a pergunta' : SOURCE_LABELS[source],
    accounts: list.length,
    trial: list.filter(startedTrialEver).length,
    paid: list.filter(paidEver).length,
  })).sort((a, b) => (a.source === 'skipped' ? 1 : 0) - (b.source === 'skipped' ? 1 : 0) || b.accounts - a.accounts);

  const groupCk = (keyOf: (c: CkRow) => string | null, labelOf: (k: string) => string) => {
    const m = new Map<string, CkRow[]>();
    for (const c of ckInRange) { const k = keyOf(c); if (!k) continue; if (!m.has(k)) m.set(k, []); m.get(k)!.push(c); }
    return [...m.entries()].map(([key, rows]) => ({
      key, label: labelOf(key),
      checkouts: new Set(rows.map(c => String(c.user_id))).size,
      completed: new Set(rows.filter(c => c.status === 'paid').map(c => String(c.user_id))).size,
      paid: new Set(rows.filter(ckCharged).map(c => String(c.user_id))).size,
    })).sort((a, b) => b.checkouts - a.checkouts);
  };
  const acquisition = {
    since: acqSince != null ? new Date(acqSince).toISOString() : null,
    base: acqBase,
    answered: acqAnswered.length,
    skipped: acqRows.length - acqAnswered.length,
    responseRatePct: acqBase ? Math.round((acqAnswered.length / acqBase) * 100) : null,
    bySource,
    site: {
      visits: adVisitRes.error ? null : adVisitRes.count ?? 0,
      clicks: adClickRes.error ? null : adClickRes.count ?? 0,
      byChannel: groupCk(c => c.channel ?? 'sem canal', k => CHANNEL_LABELS[k] ?? k),
      byAffiliate: groupCk(c => c.affiliate_code, k => k),
      byCoupon: groupCk(c => c.coupon_code, k => k),
    },
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SEQUÊNCIA ATUAL (só quem fez atividade nos últimos 30 dias)
  // ─────────────────────────────────────────────────────────────────────────

  const streakCutoff = dayKey(today - 1); // sem atividade hoje ou ontem, a sequência atual é 0
  const streakBuckets = { '0': 0, '1-3': 0, '4-7': 0, '8-14': 0, '15-30': 0, '30+': 0 };
  for (const p of progress) {
    if (!mauSet.has(String(p.user_id))) continue;
    const s = p.last_practice_date && p.last_practice_date >= streakCutoff ? (p.streak_days ?? 0) : 0;
    if (s === 0) streakBuckets['0'] += 1;
    else if (s <= 3)  streakBuckets['1-3'] += 1;
    else if (s <= 7)  streakBuckets['4-7'] += 1;
    else if (s <= 14) streakBuckets['8-14'] += 1;
    else if (s <= 30) streakBuckets['15-30'] += 1;
    else              streakBuckets['30+'] += 1;
  }
  const streakDistribution = Object.entries(streakBuckets).map(([bucket, count]) => ({ bucket, count }));

  // ─────────────────────────────────────────────────────────────────────────
  // COORTES SEMANAIS (semana começa segunda 00h de Brasília)
  // ─────────────────────────────────────────────────────────────────────────
  // Semana N = atividade entre N e N+1 semanas depois do cadastro; só entra quem já tem N+1 semanas de conta.
  const retentionCohorts = Array.from({ length: 8 }, (_, i) => 7 - i).map(w => {
    const startIdx = thisMonday - w * 7;
    const startMs = brtDayStart(startIdx);
    const endMs = brtDayStart(startIdx + 7) - 1;
    const cohort = users.filter(u => { const c = ms(u.created_at); return c >= startMs && c <= endMs; });
    const survivalAt = (n: number) => {
      const eligible = cohort.filter(u => nowMs - ms(u.created_at) >= (n + 1) * 7 * DAY);
      if (eligible.length === 0) return null;
      const kept = eligible.filter(u => {
        const c = ms(u.created_at);
        return (practicesByUser.get(String(u.id)) ?? []).some(t => t >= c + n * 7 * DAY && t < c + (n + 1) * 7 * DAY);
      }).length;
      return Math.round((kept / eligible.length) * 100);
    };
    return {
      cohort: dayKey(startIdx),
      size: cohort.length,
      survival: { w1: survivalAt(1), w2: survivalAt(2), w3: survivalAt(3), w4: survivalAt(4), w6: survivalAt(6), w8: survivalAt(8) },
    };
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEMPO ATÉ A 1ª ATIVIDADE (contas criadas no período)
  // ─────────────────────────────────────────────────────────────────────────

  const ttfvHours: number[] = [];
  for (const u of funnelCohort) {
    const arrT = practicesByUser.get(String(u.id)) ?? [];
    if (!arrT.length) continue;
    const hours = (Math.min(...arrT) - ms(u.created_at)) / 3600000;
    if (hours >= 0) ttfvHours.push(hours);
  }
  ttfvHours.sort((a, b) => a - b);
  const percentile = (a: number[], p: number) => (a.length === 0 ? null : a[Math.min(a.length - 1, Math.floor(a.length * p))]);
  const ttfvBuckets = [
    { bucket: '<1h',   min: 0,   max: 1 },
    { bucket: '1-24h', min: 1,   max: 24 },
    { bucket: '1-3d',  min: 24,  max: 72 },
    { bucket: '3-7d',  min: 72,  max: 168 },
    { bucket: '7-30d', min: 168, max: 720 },
    { bucket: '>30d',  min: 720, max: Infinity },
  ];
  const timeToFirstValue = {
    sampleSize: ttfvHours.length,
    cohortSize: funnelCohort.length,
    medianHours: percentile(ttfvHours, 0.5),
    p90Hours: percentile(ttfvHours, 0.9),
    distribution: ttfvBuckets.map(b => ({ bucket: b.bucket, count: ttfvHours.filter(h => h >= b.min && h < b.max).length })),
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MAPA DE HORÁRIOS (atividades do período, horário de Brasília)
  // ─────────────────────────────────────────────────────────────────────────

  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const p of practices) {
    const brt = new Date(ms(p.created_at) - BRT);
    heatmap[brt.getUTCDay()][brt.getUTCHours()] += 1;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PERÍODO ANTERIOR
  // ─────────────────────────────────────────────────────────────────────────

  const previousPeriod = {
    range: { from: new Date(prevFromMs).toISOString(), to: new Date(prevToMs).toISOString() },
    newUsers: users.filter(u => inPrev(ms(u.created_at))).length,
    mau: prevMau,                 // os 30 dias antes dos últimos 30
    totalCost: round6(prevCost),
    costPerActive: round6(prevCostPerActive),
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ALERTAS
  // ─────────────────────────────────────────────────────────────────────────

  type Alert = { severity: 'warn' | 'critical'; message: string };
  const alerts: Alert[] = [];

  if (churnPct != null && churnPct >= 10 && payingAtStart.length >= 10) {
    alerts.push({
      severity: churnPct >= 20 ? 'critical' : 'warn',
      message: `Cancelamento do período em ${churnPct}% (${churnedFromStart} de ${payingAtStart.length} pagantes) — acima do saudável (<10%).`,
    });
  }

  if (stickinessPct != null && stickinessPct < 20 && mauComplete >= 20) {
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
  // Versão vigente = app_release (a mesma do aviso "Tem versão nova"). Base: quem abriu o app nos últimos 30 dias.
  const latestBy = new Map(((relRes.data ?? []) as { platform: string; latest_version: string }[]).map(r => [r.platform, r.latest_version]));
  const latestVersion = latestBy.get('ios') ?? latestBy.get('android') ?? '';
  const d30ms = nowMs - 30 * DAY;
  const opened30 = users.filter(u => u.last_seen_at && ms(u.last_seen_at) >= d30ms);
  const isLatest = (u: UserRow) => !!u.app_version && u.app_version === (latestBy.get(u.app_platform ?? '') ?? latestVersion);
  const appOnLatest = opened30.filter(isLatest);
  const appOutdated = opened30.filter(u => !!u.app_version && !isLatest(u));
  const byVersion = Object.entries(opened30.reduce<Record<string, number>>((m, u) => { const v = u.app_version ?? 'sem versão'; m[v] = (m[v] ?? 0) + 1; return m; }, {}))
    .map(([version, count]) => ({ version, count })).sort((x, y) => y.count - x.count).slice(0, 6);
  const appVersions = {
    latestVersion,
    total: users.length,
    opened30d: opened30.length,
    onLatest: appOnLatest.length,
    outdated: appOutdated.length,
    unknown: opened30.filter(u => !u.app_version).length,
    onLatestPct: opened30.length ? round2((appOnLatest.length / opened30.length) * 100) : 0,
    byVersion,
    byPlatform: {
      ios:     appOnLatest.filter(u => u.app_platform === 'ios').length,
      android: appOnLatest.filter(u => u.app_platform === 'android').length,
    },
  };

  return NextResponse.json({
    range: { from: from.toISOString(), to: to.toISOString(), days },
    appVersions,
    revenue: {
      mrr: round2(mrr),
      arr: round2(arr),
      activeSubs: activeSubs.length,
      monthlySubs,
      yearlySubs,
      onTrial,
      subs,
      trialMrrPotential: round2(trialMrrPotential),
      trialConversionPct,
      trialConversion: { converted: convertedFromTrial, total: convDen },
      churnPct,
      churn: { lost: churnedFromStart, base: payingAtStart.length },
      renewals7d: firstCharges7d + renewalCharges7d,
      charges7d: { firstCharge: firstCharges7d, renewal: renewalCharges7d },
      inactivePaying,
      newUsers,
      totalUsers: users.length,
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
      newInRange:     { monthly: newMonthly,     yearly: newYearly,     count: newInRange.length },
      churnedInRange: { monthly: churnedMonthly, yearly: churnedYearly, count: churnedPaid.length },
      mrrTrend,
    },
    engagement: {
      dau, wau, mau,
      stickinessPct,
      avgDau30: round2(avgDau30),
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
  });
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round6(n: number): number { return Math.round(n * 1000000) / 1000000; }
