// lib/receivables.ts — "A receber" do /admin › Financeiro: dinheiro já vendido que ainda não chegou na conta.
//
//  - Site (Asaas): ao vivo pela API. Cobrança CONFIRMADA = cartão aprovado aguardando o prazo de compensação
//    (data prevista de crédito do próprio Asaas); o saldo da conta é o que já compensou e pode ser sacado.
//    VENCIDAS = cobranças de cartão recusadas que ainda podem ser pagas (não entram no total a receber; Pix vencido fica de fora).
//  - Google Play: o líquido do mês (revenue_events, calendário de Brasília) é pago por volta do dia 15 do mês seguinte.
//  - App Store: a Apple paga o mês fiscal em até 45 dias depois do fim dele; o mês fiscal é próximo do mês do
//    calendário, então a previsão usa o mês do calendário. Valor abaixo do mínimo de pagamento da Apple fica como
//    "saldo transportado" para o mês seguinte. O valor exato e a data só aparecem nos relatórios de cada loja.
// Valores das lojas são estimativas (taxa e câmbio do evento); os do Asaas são os reais.
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { readAll } from '@/lib/db-batch';
import { revenueAtMs } from '@/lib/revenue-day';
import { asaasConfigured, accountBalance, paymentsByStatus } from '@/lib/asaas';

export interface ReceivableRow {
  channel: 'app_store' | 'play_store' | 'site';
  label: string;          // "App Store", "Google Play", "Site (cartão)"
  period: string;         // mês de referência (AAAA-MM) ou data prevista de crédito no Asaas
  net: number;            // líquido em reais
  charges: number;
  expected: string;       // data prevista (AAAA-MM-DD)
  expectedLabel: string;  // "por volta de", "até", "previsto pelo Asaas"
  estimate: boolean;      // valor estimado (lojas) ou real (Asaas)
}
export interface Receivables {
  total: number;
  rows: ReceivableRow[];
  asaas: { available: boolean; balance: number | null; overdue: { count: number; net: number }; error?: string };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const brtDayKey = (t: number) => new Date(t - 3 * 3600_000).toISOString().slice(0, 10);
const addMonths = (month: string, n: number) => { const [y, m] = month.split('-').map(Number); return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7); };
const lastDayOf = (month: string) => new Date(Date.parse(`${addMonths(month, 1)}-01T12:00:00Z`) - 86400_000).toISOString().slice(0, 10);
const plusDays = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86400_000).toISOString().slice(0, 10);

type Ev = { store: string; event_type: string; net_brl: number | null; purchased_at: string; created_at: string; product_id: string | null };

export async function computeReceivables(nowMs = Date.now()): Promise<Receivables> {
  const today = brtDayKey(nowMs);
  const rows: ReceivableRow[] = [];

  // Lojas: só os últimos meses podem estar pendentes (Apple paga em até 45 dias; Google no dia 15).
  const since = `${addMonths(today.slice(0, 7), -3)}-01T03:00:00Z`;
  // Compras antigas estornadas agora: o estorno entra pelo created_at, então a leitura considera as duas datas.
  const events = await readAll<Ev>('receita das lojas', () => getSupabaseAdmin().from('revenue_events')
    .select('store, event_type, net_brl, purchased_at, created_at, product_id').in('store', ['APP_STORE', 'MAC_APP_STORE', 'PLAY_STORE'])
    .or(`purchased_at.gte.${since},created_at.gte.${since}`).order('purchased_at').order('id'));
  const byMonth = new Map<string, { net: number; charges: number }>();
  for (const e of events) {
    const channel = e.store === 'PLAY_STORE' ? 'play_store' : 'app_store';
    // Estorno desconta no repasse do mês em que aconteceu (created_at), não no mês da compra original.
    const at = e.event_type === 'REFUND' ? Date.parse(e.created_at) : revenueAtMs(e as never);
    const month = brtDayKey(at).slice(0, 7);
    const k = `${channel}|${month}`;
    const cur = byMonth.get(k) ?? { net: 0, charges: 0 };
    const v = Number(e.net_brl ?? 0);
    if (e.event_type === 'REFUND') cur.net -= Math.abs(v); else { cur.net += v; cur.charges++; }
    byMonth.set(k, cur);
  }
  for (const [k, v] of byMonth) {
    const [channel, month] = k.split('|') as ['app_store' | 'play_store', string];
    const expected = channel === 'play_store' ? `${addMonths(month, 1)}-15` : plusDays(lastDayOf(month), 45);
    // Mês com mais estorno que venda fica negativo: a loja desconta do próximo repasse, então entra no total.
    if (expected < today || Math.abs(v.net) <= 0.005) continue;
    rows.push({
      channel, label: channel === 'play_store' ? 'Google Play' : 'App Store', period: month,
      net: round2(v.net), charges: v.charges, expected,
      expectedLabel: channel === 'play_store' ? 'por volta de' : 'até', estimate: true,
    });
  }

  // Site: ao vivo no Asaas.
  const asaas: Receivables['asaas'] = { available: asaasConfigured(), balance: null, overdue: { count: 0, net: 0 } };
  if (asaas.available) {
    try {
      const [confirmed, overdue, balance] = await Promise.all([paymentsByStatus('CONFIRMED'), paymentsByStatus('OVERDUE'), accountBalance()]);
      asaas.balance = round2(balance);
      // Só cartão: Pix vencido é QR code que a pessoa gerou e não pagou (desistência), não cobrança recusada.
      const refused = overdue.filter(p => p.billingType === 'CREDIT_CARD');
      asaas.overdue = { count: refused.length, net: round2(refused.reduce((s, p) => s + Number(p.netValue ?? p.value ?? 0), 0)) };
      const byDay = new Map<string, { net: number; charges: number }>();
      for (const p of confirmed) {
        const day = (p.estimatedCreditDate ?? p.creditDate ?? p.dueDate ?? today).slice(0, 10);
        const cur = byDay.get(day) ?? { net: 0, charges: 0 };
        cur.net += Number(p.netValue ?? p.value ?? 0); cur.charges++;
        byDay.set(day, cur);
      }
      for (const [day, v] of byDay) {
        rows.push({ channel: 'site', label: 'Site (cartão)', period: day, net: round2(v.net), charges: v.charges, expected: day, expectedLabel: 'previsto pelo Asaas', estimate: false });
      }
    } catch (e) {
      asaas.error = e instanceof Error ? e.message : String(e);
    }
  }

  rows.sort((a, b) => a.expected.localeCompare(b.expected) || a.label.localeCompare(b.label));
  return { total: round2(rows.reduce((s, r) => s + r.net, 0)), rows, asaas };
}
