// lib/partner-report.ts
// Relatório mensal para os sócios: resultado financeiro (regime de caixa),
// divisão de 50%, alunos e assinaturas. Usado pelo cron do dia 1, pelo botão
// de prévia no admin e pelo envio manual.

import { getSupabaseAdmin } from '@/lib/supabase-admin';

export interface PartnerReport {
  period: string; label: string;
  income: number; expense: number; result: number; share: number;
  prev: { income: number; expense: number; result: number };
  expenseByCategory: { category: string; amount: number }[];
  incomeByCategory: { category: string; amount: number }[];
  aiCost: number;
  students: { total: number; newInMonth: number; activeInMonth: number; paying: number; trial: number };
  sales: { purchases: number; renewals: number; refunds: number };
}

function range(period: string) {
  const [y, m] = period.split('-').map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10),
    end: new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10),
  };
}

export function previousPeriod(period?: string): string {
  const d = period ? new Date(`${period}-01T12:00:00Z`) : new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
}

async function money(period: string) {
  const { start, end } = range(period);
  const { data } = await getSupabaseAdmin().from('finance_entries')
    .select('kind, category, amount_brl').eq('status', 'paid').gte('paid_at', start).lt('paid_at', end).limit(10000);
  const rows = (data ?? []) as { kind: string; category: string; amount_brl: number }[];
  const sum = (k: string) => rows.filter(r => r.kind === k).reduce((s, r) => s + Number(r.amount_brl), 0);
  const group = (k: string) => {
    const m = new Map<string, number>();
    rows.filter(r => r.kind === k).forEach(r => m.set(r.category, (m.get(r.category) ?? 0) + Number(r.amount_brl)));
    return [...m.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  };
  return { income: sum('income'), expense: sum('expense'), incomeBy: group('income'), expenseBy: group('expense') };
}

export async function buildPartnerReport(period: string): Promise<PartnerReport> {
  const supabase = getSupabaseAdmin();
  const { start, end } = range(period);
  const [cur, prev] = await Promise.all([money(period), money(previousPeriod(period))]);

  const [total, newIn, paying, trial, practices, revenue] = await Promise.all([
    supabase.from('charlotte_users').select('id', { count: 'exact', head: true }),
    supabase.from('charlotte_users').select('id', { count: 'exact', head: true }).gte('created_at', start).lt('created_at', end),
    supabase.from('charlotte_users').select('id', { count: 'exact', head: true }).eq('subscription_status', 'active').eq('is_institutional', false),
    supabase.from('charlotte_users').select('id', { count: 'exact', head: true }).eq('subscription_status', 'trial'),
    supabase.from('charlotte_practices').select('user_id').gte('created_at', start).lt('created_at', end).limit(50000),
    supabase.from('revenue_events').select('event_type').gte('purchased_at', start).lt('purchased_at', end).limit(10000),
  ]);
  const active = new Set(((practices.data ?? []) as { user_id: string }[]).map(p => p.user_id)).size;
  const ev = (revenue.data ?? []) as { event_type: string }[];
  const [y, m] = period.split('-').map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const result = cur.income - cur.expense;

  return {
    period, label,
    income: cur.income, expense: cur.expense, result, share: result / 2,
    prev: { income: prev.income, expense: prev.expense, result: prev.income - prev.expense },
    expenseByCategory: cur.expenseBy, incomeByCategory: cur.incomeBy,
    aiCost: cur.expenseBy.find(c => c.category === 'Inteligência artificial')?.amount ?? 0,
    students: { total: total.count ?? 0, newInMonth: newIn.count ?? 0, activeInMonth: active, paying: paying.count ?? 0, trial: trial.count ?? 0 },
    sales: {
      purchases: ev.filter(e => ['INITIAL_PURCHASE', 'NON_RENEWING_PURCHASE', 'TRIAL_CONVERTED'].includes(e.event_type)).length,
      renewals: ev.filter(e => e.event_type === 'RENEWAL').length,
      refunds: ev.filter(e => e.event_type === 'REFUND').length,
    },
  };
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
function delta(cur: number, prev: number) {
  if (!prev) return '';
  const p = Math.round(((cur - prev) / Math.abs(prev)) * 100);
  return `<span style="color:${p >= 0 ? '#08804A' : '#D12A64'};font-size:12px;font-weight:700"> ${p >= 0 ? '+' : ''}${p}% vs mês anterior</span>`;
}

export function renderPartnerReportHtml(r: PartnerReport): string {
  const row = (k: string, v: string, strong = false) =>
    `<tr><td style="padding:8px 0;color:#4D4858;font-size:14px">${k}</td><td style="padding:8px 0;text-align:right;font-size:14px;${strong ? 'font-weight:800;color:#16131F' : 'color:#16131F'}">${v}</td></tr>`;
  const cats = r.expenseByCategory.slice(0, 6).map(c => row(c.category, brl(c.amount))).join('');
  return `<!doctype html><html><body style="margin:0;background:#FAF7F0;font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#16131F">
<div style="max-width:560px;margin:0 auto;padding:28px 20px">
  <img src="https://queizy.com/images/queizy-logo.png" alt="Queizy" height="28" style="height:28px">
  <h1 style="font-size:24px;margin:18px 0 4px">Relatório de ${r.label}</h1>
  <p style="margin:0 0 20px;color:#8A8494;font-size:13px">Regime de caixa: o que foi pago e recebido no mês.</p>

  <div style="background:#16131F;color:#fff;border-radius:20px;padding:20px">
    <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.6);font-weight:700">Resultado do mês</div>
    <div style="font-size:34px;font-weight:800;margin:4px 0;color:${r.result < 0 ? '#FF4F8B' : '#DCFF4A'}">${brl(r.result)}</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.75)">50% por sócio: <b>${brl(r.share)}</b></div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-top:18px;background:#fff;border-radius:16px;padding:6px 16px;display:block">
    ${row('Entradas', `${brl(r.income)}${delta(r.income, r.prev.income)}`, true)}
    ${row('Saídas', `${brl(r.expense)}${delta(r.expense, r.prev.expense)}`, true)}
    ${row('Custo de IA', brl(r.aiCost))}
  </table>

  <h2 style="font-size:16px;margin:24px 0 8px">Para onde foi o dinheiro</h2>
  <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:16px;padding:6px 16px;display:block">${cats || row('Sem saídas pagas no mês', '—')}</table>

  <h2 style="font-size:16px;margin:24px 0 8px">Alunos e vendas</h2>
  <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:16px;padding:6px 16px;display:block">
    ${row('Cadastros no mês', String(r.students.newInMonth))}
    ${row('Alunos que praticaram', String(r.students.activeInMonth))}
    ${row('Assinantes pagantes hoje', String(r.students.paying))}
    ${row('Em teste grátis hoje', String(r.students.trial))}
    ${row('Novas compras', String(r.sales.purchases))}
    ${row('Renovações', String(r.sales.renewals))}
    ${row('Reembolsos', String(r.sales.refunds))}
    ${row('Total de alunos', String(r.students.total))}
  </table>

  <p style="margin:24px 0 0;font-size:12px;color:#8A8494">Detalhes, lançamentos e exportação em queizy.com/admin/finance.</p>
</div></body></html>`;
}

/** Destinatários: membros ativos com papel de dono, sócio ou financeiro. */
export async function partnerReportRecipients(): Promise<string[]> {
  const { data } = await getSupabaseAdmin().from('admin_members')
    .select('email').eq('active', true).in('role', ['owner', 'partner', 'finance']);
  return [...new Set(((data ?? []) as { email: string }[]).map(m => m.email))];
}
