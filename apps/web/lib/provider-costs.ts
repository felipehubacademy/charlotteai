// Custo real dos provedores cobrados por uso (APIs de custo de cada um), por mês.
// Usado na tela de custos de IA e na sincronização automática com o Financeiro (lib/cost-sync).

import { getSupabaseAdmin as cacheDb } from '@/lib/supabase-admin';

export function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start, end };
}

export async function openaiReal(month: string): Promise<{ usd: number; lines: { name: string; usd: number }[] } | null> {
  const key = process.env.OPENAI_ADMIN_KEY;
  if (!key) return null;
  const { start, end } = monthRange(month);
  const lines = new Map<string, number>();
  let page: string | null = null;
  for (let i = 0; i < 10; i++) {
    const url = new URL('https://api.openai.com/v1/organization/costs');
    url.searchParams.set('start_time', String(Math.floor(start.getTime() / 1000)));
    url.searchParams.set('end_time', String(Math.floor(end.getTime() / 1000)));
    url.searchParams.set('bucket_width', '1d');
    url.searchParams.set('limit', '31');
    url.searchParams.append('group_by', 'line_item');
    if (page) url.searchParams.set('page', page);
    const r = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store' });
    if (!r.ok) throw new Error(`OpenAI costs ${r.status}`);
    const j = await r.json();
    for (const bucket of j.data ?? []) {
      for (const res of bucket.results ?? []) {
        const name = res.line_item ?? 'Outros';
        lines.set(name, (lines.get(name) ?? 0) + Number(res.amount?.value ?? 0));
      }
    }
    if (!j.has_more || !j.next_page) break;
    page = j.next_page;
  }
  const arr = [...lines.entries()].map(([name, usd]) => ({ name, usd })).sort((a, b) => b.usd - a.usd);
  return { usd: arr.reduce((s, l) => s + l.usd, 0), lines: arr };
}

export type Cost = { currency: string; total: number; lines: { name: string; amount: number }[] };

export async function azureReal(month: string): Promise<Cost | null> {
  const sub = process.env.AZURE_COST_SUBSCRIPTION_ID;
  const tenant = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_COST_CLIENT_ID || process.env.AZURE_CLIENT_ID;
  const secret = process.env.AZURE_COST_CLIENT_SECRET || process.env.AZURE_CLIENT_SECRET;
  if (!sub || !tenant || !clientId || !secret) return null;

  const tok = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, cache: 'no-store',
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: secret, scope: 'https://management.azure.com/.default' }),
  });
  if (!tok.ok) throw new Error(`Azure token ${tok.status}`);
  const { access_token } = await tok.json();

  const { start, end } = monthRange(month);
  const to = new Date(Math.min(end.getTime() - 1000, Date.now()));
  const r = await fetch(`https://management.azure.com/subscriptions/${sub}/providers/Microsoft.CostManagement/query?api-version=2023-03-01`, {
    method: 'POST', cache: 'no-store',
    headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'ActualCost', timeframe: 'Custom',
      timePeriod: { from: start.toISOString(), to: to.toISOString() },
      dataset: {
        granularity: 'None',
        aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
        grouping: [{ type: 'Dimension', name: 'ServiceName' }],
      },
    }),
  });
  if (!r.ok) throw new Error(`Azure custos ${r.status}`);
  const j = await r.json();
  const cols: string[] = (j.properties?.columns ?? []).map((c: { name: string }) => c.name);
  const iCost = cols.indexOf('Cost'), iName = cols.indexOf('ServiceName'), iCur = cols.indexOf('Currency');
  let currency = 'USD';
  const lines: { name: string; amount: number }[] = [];
  for (const row of j.properties?.rows ?? []) {
    if (iCur >= 0 && row[iCur]) currency = String(row[iCur]);
    lines.push({ name: String(row[iName] ?? 'Outros'), amount: Number(row[iCost] ?? 0) });
  }
  lines.sort((a, b) => b.amount - a.amount);
  return { currency, total: lines.reduce((s, l) => s + l.amount, 0), lines };
}


// Vercel: cobranças do mês pela API de faturamento (formato FOCUS, uma linha JSON por cobrança).
// Precisa de VERCEL_BILLING_TOKEN (token de conta com acesso ao time) e VERCEL_TEAM_ID.
export async function vercelReal(month: string): Promise<Cost | null> {
  const token = process.env.VERCEL_BILLING_TOKEN;
  const team = process.env.VERCEL_TEAM_ID;
  if (!token || !team) return null;
  const { start, end } = monthRange(month);
  const url = new URL('https://api.vercel.com/v1/billing/charges');
  url.searchParams.set('from', start.toISOString());
  url.searchParams.set('to', new Date(Math.min(end.getTime(), Date.now())).toISOString());
  url.searchParams.set('teamId', team);
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!r.ok) throw new Error(`Vercel cobranças ${r.status}`);
  const text = await r.text();
  const rows: Record<string, unknown>[] = text.trim().startsWith('[')
    ? JSON.parse(text)
    : text.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
  let currency = 'USD';
  const lines = new Map<string, number>();
  for (const row of rows) {
    if (row.BillingCurrency) currency = String(row.BillingCurrency);
    const name = String(row.ServiceName ?? row.ChargeDescription ?? 'Outros');
    lines.set(name, (lines.get(name) ?? 0) + Number(row.BilledCost ?? 0));
  }
  const arr = [...lines].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  return { currency, total: arr.reduce((s, l) => s + l.amount, 0), lines: arr };
}

// ── Leitura guardada ────────────────────────────────────────────────────────
// As APIs de custo recusam (429) quando são chamadas demais. A tela e a sincronização leem daqui:
// se a última leitura real tem menos de maxAgeMs, usa ela; senão consulta o provedor e guarda.
// Se o provedor falhar, devolve a última leitura guardada (com stale: true) em vez de cair na estimativa.

export async function cachedCost<T>(key: string, maxAgeMs: number, read: () => Promise<T | null>): Promise<{ value: T | null; at: string | null; stale: boolean; error?: string }> {
  const db = cacheDb();
  const { data } = await db.from('provider_cost_cache').select('payload, updated_at').eq('key', key).maybeSingle();
  const row = data as { payload: T; updated_at: string } | null;
  if (row && Date.now() - new Date(row.updated_at).getTime() < maxAgeMs) return { value: row.payload, at: row.updated_at, stale: false };
  try {
    const value = await read();
    if (value != null) {
      const at = new Date().toISOString();
      await db.from('provider_cost_cache').upsert({ key, payload: value as never, updated_at: at } as never);
      return { value, at, stale: false };
    }
    return { value: null, at: null, stale: false };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return row ? { value: row.payload, at: row.updated_at, stale: true, error } : { value: null, at: null, stale: false, error };
  }
}

// OpenAI: custo real por dia (calendário UTC da API), dos últimos `days` dias até hoje.
export async function openaiDaily(days = 8): Promise<{ date: string; usd: number }[] | null> {
  const key = process.env.OPENAI_ADMIN_KEY;
  if (!key) return null;
  const start = new Date(); start.setUTCHours(0, 0, 0, 0); start.setUTCDate(start.getUTCDate() - (days - 1));
  const url = new URL('https://api.openai.com/v1/organization/costs');
  url.searchParams.set('start_time', String(Math.floor(start.getTime() / 1000)));
  url.searchParams.set('bucket_width', '1d');
  url.searchParams.set('limit', String(days + 1));
  const r = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store' });
  if (!r.ok) throw new Error(`OpenAI costs ${r.status}`);
  const j = await r.json();
  return (j.data ?? []).map((b: { start_time: number; results?: { amount?: { value?: number } }[] }) => ({
    date: new Date(b.start_time * 1000).toISOString().slice(0, 10),
    usd: (b.results ?? []).reduce((s, x) => s + Number(x.amount?.value ?? 0), 0),
  }));
}
