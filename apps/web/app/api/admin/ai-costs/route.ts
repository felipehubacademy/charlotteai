// /api/admin/ai-costs — custo de IA do mês.
//   GET  ?month=YYYY-MM
//        OpenAI: valor REAL pela API de custos da organização quando existe
//        OPENAI_ADMIN_KEY (chave de administrador); sem ela, a estimativa
//        registrada pelo nosso logger (charlotte.openai_usage).
//        Azure (Speech e demais serviços): valor REAL pela API de Cost
//        Management quando existe AZURE_COST_SUBSCRIPTION_ID. Usa o mesmo app
//        do Azure (AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET), que precisa do
//        papel "Cost Management Reader" na assinatura.
//        ElevenLabs: uso real de caracteres e plano pela API (ELEVENLABS_API_KEY).
//   POST { month, provider } lança o custo do mês no Financeiro (uma vez por
//        provedor e mês). Provedores: OpenAI, Microsoft Azure.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin, audit } from '@/lib/admin-auth';
import { fxToBrl } from '@/lib/fx';

export const dynamic = 'force-dynamic';

function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start, end };
}

async function openaiReal(month: string): Promise<{ usd: number; lines: { name: string; usd: number }[] } | null> {
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

async function openaiEstimate(month: string): Promise<{ usd: number; lines: { name: string; usd: number }[] }> {
  const { start, end } = monthRange(month);
  const supabase = getSupabaseAdmin();
  const lines = new Map<string, number>();
  let from = 0;
  for (;;) {
    const { data } = await supabase.from('openai_usage')
      .select('model, cost_usd').gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
      .range(from, from + 999);
    const rows = (data ?? []) as { model: string | null; cost_usd: number | null }[];
    rows.forEach(r => lines.set(r.model ?? 'Outros', (lines.get(r.model ?? 'Outros') ?? 0) + Number(r.cost_usd ?? 0)));
    if (rows.length < 1000) break;
    from += 1000;
  }
  const arr = [...lines.entries()].map(([name, usd]) => ({ name, usd })).sort((a, b) => b.usd - a.usd);
  return { usd: arr.reduce((s, l) => s + l.usd, 0), lines: arr };
}

type Cost = { currency: string; total: number; lines: { name: string; amount: number }[] };

async function azureReal(month: string): Promise<Cost | null> {
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

async function elevenlabs(): Promise<{ plan: string; used: number; limit: number; resetAt: string | null; nextInvoiceUsd: number | null } | null> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return null;
  const r = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': key }, cache: 'no-store' });
  if (!r.ok) return null;
  const j = await r.json();
  return {
    plan: j.tier ?? '—',
    used: Number(j.character_count ?? 0),
    limit: Number(j.character_limit ?? 0),
    resetAt: j.next_character_count_reset_unix ? new Date(j.next_character_count_reset_unix * 1000).toISOString() : null,
    nextInvoiceUsd: j.next_invoice?.amount_due_cents != null ? j.next_invoice.amount_due_cents / 100 : null,
  };
}

const fxBrl = (cur = 'USD') => fxToBrl(cur);

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, 'finance');
  if (admin instanceof NextResponse) return admin;
  const month = req.nextUrl.searchParams.get('month') ?? new Date().toISOString().slice(0, 7);

  const prevMonth = (() => { const d = new Date(`${month}-01T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() - 1); return d.toISOString().slice(0, 7); })();

  const openaiFor = async (m: string): Promise<{ source: 'real' | 'estimate'; usd: number; lines: { name: string; usd: number }[]; error?: string }> => {
    try {
      const real = await openaiReal(m);
      return real ? { source: 'real', ...real } : { source: 'estimate', ...(await openaiEstimate(m)) };
    } catch (e) {
      return { source: 'estimate', ...(await openaiEstimate(m)), error: e instanceof Error ? e.message : 'erro' };
    }
  };
  const azureFor = async (m: string): Promise<(Cost & { error?: string }) | null> => {
    try { return await azureReal(m); }
    catch (e) { return { currency: 'USD', total: 0, lines: [], error: e instanceof Error ? e.message : 'erro' }; }
  };

  // Mês escolhido e mês anterior em paralelo, para a variação dos cards.
  const [openai, openaiPrev, azure, azurePrev, eleven, fx] = await Promise.all([
    openaiFor(month), openaiFor(prevMonth), azureFor(month), azureFor(prevMonth),
    elevenlabs().catch(() => null), fxBrl(),
  ]);

  const { data: posted } = await getSupabaseAdmin().from('finance_entries')
    .select('vendor').eq('category', 'Inteligência artificial').like('notes', `%[ai-cost ${month}]%`);
  const postedVendors = ((posted ?? []) as { vendor: string }[]).map(p => p.vendor);

  return NextResponse.json({
    month, prevMonth, fx, openai, azure, elevenlabs: eleven, posted: postedVendors,
    prev: {
      openai: { usd: openaiPrev.usd, lines: openaiPrev.lines },
      azure: azurePrev && !azurePrev.error ? { total: azurePrev.total, currency: azurePrev.currency } : null,
    },
    hasOpenAIAdminKey: !!process.env.OPENAI_ADMIN_KEY,
    hasAzureCost: !!process.env.AZURE_COST_SUBSCRIPTION_ID,
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, 'finance:write');
  if (admin instanceof NextResponse) return admin;
  const body = await req.json().catch(() => ({}));
  const month = String(body.month ?? '');
  const provider = String(body.provider ?? '');
  if (!/^\d{4}-\d{2}$/.test(month) || !['OpenAI', 'Microsoft Azure'].includes(provider)) {
    return NextResponse.json({ error: 'Mês e provedor válidos são obrigatórios.' }, { status: 400 });
  }
  const supabase = getSupabaseAdmin();
  const tag = `[ai-cost ${month}]`;
  const { count } = await supabase.from('finance_entries').select('id', { count: 'exact', head: true })
    .eq('vendor', provider).like('notes', `%${tag}%`);
  if (count) return NextResponse.json({ error: 'Esse mês já foi lançado.' }, { status: 409 });

  let amount: number, currency: string, note: string;
  if (provider === 'OpenAI') {
    const real = await openaiReal(month).catch(() => null);
    const data = real ?? (await openaiEstimate(month));
    amount = data.usd; currency = 'USD';
    note = real ? 'Valor real (API de custos da OpenAI).' : 'Estimativa pelo uso registrado no app.';
  } else {
    const az = await azureReal(month).catch(() => null);
    if (!az) return NextResponse.json({ error: 'Não foi possível ler o custo do Azure.' }, { status: 502 });
    amount = az.total; currency = az.currency;
    note = 'Valor real (Azure Cost Management).';
  }
  amount = Math.round(amount * 100) / 100;
  const fx = (await fxBrl(currency)) || 1;
  const { end } = monthRange(month);
  const lastDay = new Date(end.getTime() - 86400000).toISOString().slice(0, 10);

  const { data: entry, error } = await supabase.from('finance_entries').insert({
    kind: 'expense', description: `${provider === 'OpenAI' ? 'OpenAI' : 'Azure'} · uso de ${month}`, category: 'Inteligência artificial', vendor: provider,
    amount, currency, fx_rate: fx, amount_brl: Math.round(amount * fx * 100) / 100,
    due_date: lastDay, status: 'pending', recurrence: 'none',
    notes: `${note} ${tag}`,
    created_by: admin.userId,
  } as never).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await audit(admin, 'finance.ai_cost', 'finance_entry', (entry as { id: string }).id, { month, provider, amount, currency });
  return NextResponse.json({ ok: true });
}
