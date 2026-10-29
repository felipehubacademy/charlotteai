// lib/finance-revenue.ts — receita por canal e projeção de 12 meses para o /admin › Financeiro.
//
// Fonte: revenue_events (cada compra, renovação e reembolso de verdade, das lojas e do Asaas),
// com o bruto e o líquido já gravados. Taxa = bruto − líquido (imposto + comissão da loja,
// ou a taxa do Asaas). A projeção usa os assinantes ativos que já pagaram ao menos uma vez:
// mensal renova todo mês até o vencimento ser cancelado; anual renova na data de vencimento.
// Pix e 12x do site não renovam sozinhos e não entram na projeção.
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export type Channel = 'app_store' | 'play_store' | 'site_monthly' | 'site_annual_card' | 'site_annual_pix' | 'site_annual_12x';
export const CHANNEL_LABEL: Record<Channel, string> = {
  app_store:        'App Store',
  play_store:       'Google Play',
  site_monthly:     'Site · mensal (cartão)',
  site_annual_card: 'Site · anual (cartão)',
  site_annual_pix:  'Site · anual (Pix)',
  site_annual_12x:  'Site · anual (12x)',
};

// Taxa usada quando o canal ainda não tem venda para medir (fração do bruto).
const DEFAULT_FEE: Record<Channel, number> = {
  app_store: 0.324, play_store: 0.15,           // Apple no Brasil: 32,4% no 1º ano (tabela do App Store Connect); Google: 15%, sem imposto
  site_monthly: 0.0299, site_annual_card: 0.0299, // cartão à vista/recorrente no Asaas (+ R$ 0,49)
  site_annual_pix: 0.01, site_annual_12x: 0.0399,
};
const FIXED_FEE: Partial<Record<Channel, number>> = { site_monthly: 0.49, site_annual_card: 0.49, site_annual_12x: 0.49 };

type Ev = { app_user_id: string | null; store: string; product_id: string | null; event_type: string; gross_brl: number; net_brl: number; purchased_at: string | null; created_at: string };

export function channelOf(store: string, productId: string | null): Channel | null {
  const p = (productId ?? '').toLowerCase();
  if (store === 'ASAAS') {
    if (p === 'web_monthly') return 'site_monthly';
    if (p === 'web_annual_pix') return 'site_annual_pix';
    if (p === 'web_annual_12x') return 'site_annual_12x';
    return 'site_annual_card';
  }
  if (store === 'APP_STORE' || store === 'MAC_APP_STORE') return 'app_store';
  if (store === 'PLAY_STORE') return 'play_store';
  return null;
}
const isAnnual = (c: Channel, productId: string | null) =>
  c.startsWith('site_annual') || /year|annual/i.test(productId ?? '');

const round2 = (n: number) => Math.round(n * 100) / 100;
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export interface ChannelRow { channel: Channel; label: string; sales: number; refunds: number; gross: number; fees: number; net: number; feePct: number }
export interface ProjectionMonth { month: string; gross: number; fees: number; net: number; renewals: number }
export interface RevenueSummary {
  since: string;
  channels: ChannelRow[];
  totals: { gross: number; fees: number; net: number };
  projection: ProjectionMonth[];
  projectionTotals: { gross: number; fees: number; net: number };
  activeSubscribers: number;
  inTrial: number; // ativos sem nenhuma cobrança ainda (teste da loja ou do site): não entram na projeção
}

export async function revenueSummary(months = 12): Promise<RevenueSummary> {
  const supabase = getSupabaseAdmin();
  const since = new Date(); since.setMonth(since.getMonth() - months); since.setDate(1);
  const { data: evs } = await supabase.from('revenue_events')
    .select('app_user_id, store, product_id, event_type, gross_brl, net_brl, purchased_at, created_at')
    .order('created_at', { ascending: true }).limit(50000);
  const all = (evs ?? []) as Ev[];

  // ── Canais (período) ──
  const rows = new Map<Channel, ChannelRow>();
  const feeObs = new Map<Channel, { gross: number; fees: number }>();
  for (const e of all) {
    const c = channelOf(e.store, e.product_id);
    if (!c) continue;
    const gross = Number(e.gross_brl) || 0;
    const net = Number(e.net_brl) || 0;
    const refund = e.event_type === 'REFUND';
    if (!refund && gross > 0) {
      const o = feeObs.get(c) ?? { gross: 0, fees: 0 };
      o.gross += gross; o.fees += Math.max(0, gross - net); feeObs.set(c, o);
    }
    if (new Date(e.purchased_at ?? e.created_at) < since) continue;
    const r = rows.get(c) ?? { channel: c, label: CHANNEL_LABEL[c], sales: 0, refunds: 0, gross: 0, fees: 0, net: 0, feePct: 0 };
    if (refund) { r.refunds += 1; r.gross -= gross; r.net -= net; r.fees -= Math.max(0, gross - net); }
    else { r.sales += 1; r.gross += gross; r.net += net; r.fees += Math.max(0, gross - net); }
    rows.set(c, r);
  }
  const channels = [...rows.values()].map(r => ({
    ...r, gross: round2(r.gross), fees: round2(r.fees), net: round2(r.net),
    feePct: r.gross > 0 ? round2((r.fees / r.gross) * 100) : 0,
  })).sort((a, b) => b.gross - a.gross);
  const totals = channels.reduce((t, r) => ({ gross: t.gross + r.gross, fees: t.fees + r.fees, net: t.net + r.net }), { gross: 0, fees: 0, net: 0 });

  // Taxa por canal: a observada nas vendas reais; sem venda, a padrão do contrato.
  const feeRate = (c: Channel) => {
    const o = feeObs.get(c);
    return o && o.gross > 0 ? o.fees / o.gross : DEFAULT_FEE[c];
  };

  // ── Projeção ──
  const { data: users } = await supabase.from('charlotte_users')
    .select('id, subscription_status, subscription_expires_at, is_institutional')
    .eq('subscription_status', 'active').limit(100000);
  const lastPaid = new Map<string, Ev>();
  for (const e of all) if (e.app_user_id && e.event_type !== 'REFUND' && Number(e.gross_brl) > 0) lastPaid.set(e.app_user_id, e);

  const now = new Date();
  const projection: ProjectionMonth[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return { month: monthKey(d), gross: 0, fees: 0, net: 0, renewals: 0 };
  });
  const add = (when: Date, gross: number, c: Channel) => {
    const row = projection.find(p => p.month === monthKey(when));
    if (!row) return;
    const fee = gross * feeRate(c) + (feeObs.get(c) ? 0 : FIXED_FEE[c] ?? 0);
    row.gross += gross; row.fees += fee; row.net += gross - fee; row.renewals += 1;
  };

  let active = 0; let inTrial = 0;
  for (const u of (users ?? []) as { id: string; subscription_expires_at: string | null; is_institutional: boolean | null }[]) {
    if (u.is_institutional) continue;
    active += 1;
    const ev = lastPaid.get(u.id);
    if (!ev) { inTrial += 1; continue; }
    const c = channelOf(ev.store, ev.product_id);
    if (!c || c === 'site_annual_pix' || c === 'site_annual_12x') continue; // não renovam sozinhos
    const gross = Number(ev.gross_brl);
    let next = u.subscription_expires_at ? new Date(u.subscription_expires_at) : null;
    if (!next || next < now) continue;
    const step = isAnnual(c, ev.product_id) ? 12 : 1;
    for (let k = 0; k < 12 && next; k++) {
      add(next, gross, c);
      next = new Date(next); next.setMonth(next.getMonth() + step);
      if (step === 12) break;
    }
  }
  const proj = projection.map(p => ({ ...p, gross: round2(p.gross), fees: round2(p.fees), net: round2(p.net) }));
  const projectionTotals = proj.reduce((t, p) => ({ gross: t.gross + p.gross, fees: t.fees + p.fees, net: t.net + p.net }), { gross: 0, fees: 0, net: 0 });

  return {
    since: since.toISOString().slice(0, 10),
    channels,
    totals: { gross: round2(totals.gross), fees: round2(totals.fees), net: round2(totals.net) },
    projection: proj,
    projectionTotals: { gross: round2(projectionTotals.gross), fees: round2(projectionTotals.fees), net: round2(projectionTotals.net) },
    activeSubscribers: active,
    inTrial,
  };
}
