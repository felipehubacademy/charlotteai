// /api/admin/ai-costs — custo de IA do mês.
//   GET  ?month=YYYY-MM
//        OpenAI: valor REAL pela API de custos da organização quando existe
//        OPENAI_ADMIN_KEY (chave de administrador); sem ela, a estimativa
//        registrada pelo nosso logger (charlotte.openai_usage).
//        ElevenLabs: uso real de caracteres e plano pela API (ELEVENLABS_API_KEY).
//   POST { month, provider } lança o custo do mês no Financeiro (uma vez por
//        provedor e mês).
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin, audit } from '@/lib/admin-auth';

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

async function usdBrl(): Promise<number> {
  try {
    const r = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL', { cache: 'no-store' });
    const j = await r.json();
    return Number(j?.USDBRL?.bid) || 0;
  } catch { return 0; }
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, 'finance');
  if (admin instanceof NextResponse) return admin;
  const month = req.nextUrl.searchParams.get('month') ?? new Date().toISOString().slice(0, 7);

  let openai: { source: 'real' | 'estimate'; usd: number; lines: { name: string; usd: number }[]; error?: string };
  try {
    const real = await openaiReal(month);
    openai = real ? { source: 'real', ...real } : { source: 'estimate', ...(await openaiEstimate(month)) };
  } catch (e) {
    openai = { source: 'estimate', ...(await openaiEstimate(month)), error: e instanceof Error ? e.message : 'erro' };
  }
  const [eleven, fx] = await Promise.all([elevenlabs().catch(() => null), usdBrl()]);

  const { data: posted } = await getSupabaseAdmin().from('finance_entries')
    .select('vendor').eq('category', 'Inteligência artificial').like('notes', `%[ai-cost ${month}]%`);
  const postedVendors = ((posted ?? []) as { vendor: string }[]).map(p => p.vendor);

  return NextResponse.json({ month, fx, openai, elevenlabs: eleven, hasOpenAIAdminKey: !!process.env.OPENAI_ADMIN_KEY, posted: postedVendors });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, 'finance:write');
  if (admin instanceof NextResponse) return admin;
  const body = await req.json().catch(() => ({}));
  const month = String(body.month ?? '');
  const provider = String(body.provider ?? '');
  if (!/^\d{4}-\d{2}$/.test(month) || provider !== 'OpenAI') {
    return NextResponse.json({ error: 'Mês e provedor válidos são obrigatórios.' }, { status: 400 });
  }
  const supabase = getSupabaseAdmin();
  const tag = `[ai-cost ${month}]`;
  const { count } = await supabase.from('finance_entries').select('id', { count: 'exact', head: true })
    .eq('vendor', provider).like('notes', `%${tag}%`);
  if (count) return NextResponse.json({ error: 'Esse mês já foi lançado.' }, { status: 409 });

  const real = await openaiReal(month).catch(() => null);
  const data = real ?? (await openaiEstimate(month));
  const fx = (await usdBrl()) || 1;
  const usd = Math.round(data.usd * 100) / 100;
  const { end } = monthRange(month);
  const lastDay = new Date(end.getTime() - 86400000).toISOString().slice(0, 10);

  const { data: entry, error } = await supabase.from('finance_entries').insert({
    kind: 'expense', description: `OpenAI · uso de ${month}`, category: 'Inteligência artificial', vendor: provider,
    amount: usd, currency: 'USD', fx_rate: fx, amount_brl: Math.round(usd * fx * 100) / 100,
    due_date: lastDay, status: 'pending', recurrence: 'none',
    notes: `${real ? 'Valor real (API de custos da OpenAI).' : 'Estimativa pelo uso registrado no app.'} ${tag}`,
    created_by: admin.userId,
  } as never).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await audit(admin, 'finance.ai_cost', 'finance_entry', (entry as { id: string }).id, { month, provider, usd });
  return NextResponse.json({ ok: true });
}
