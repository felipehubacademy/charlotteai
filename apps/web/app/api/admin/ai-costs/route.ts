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
//        Divisão do mês: créditos por produto (ligações x falas) e por voz, somados
//        por personagem; a chave precisa das permissões user_read e usage (leitura).
//        Ligações ao vivo do mês por personagem (charlotte_live_calls): ligações,
//        alunos e minutos. Charlotte = linhas "realtime" da OpenAI.
//   POST { month, provider } lança o custo do mês no Financeiro (uma vez por
//        provedor e mês). Provedores: OpenAI, Microsoft Azure.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin, audit } from '@/lib/admin-auth';
import { runAiCostReport } from '@/lib/ai-cost-report';
import { fxToBrl } from '@/lib/fx';
import { CHARACTERS } from '@/lib/characters';
import { monthRange, openaiReal, azureReal, cachedCost, type Cost } from '@/lib/provider-costs';

export const dynamic = 'force-dynamic';

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

const fxBrl = (cur = 'USD') => fxToBrl(cur);

// Créditos do fornecedor de voz no mês: por produto (ligações x falas) e por personagem
// (cada voz cujo nome cita o personagem conta para ele; as demais são "Outras vozes").
async function voiceUsage(month: string): Promise<{ byProduct: { name: string; credits: number }[]; byCharacter: { id: string; name: string; credits: number }[]; error?: string } | null> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return null;
  const { start, end } = monthRange(month);
  const stop = Math.min(end.getTime(), Date.now());
  const get = async (breakdown: string) => {
    const r = await fetch(`https://api.elevenlabs.io/v1/usage/character-stats?start_unix=${start.getTime()}&end_unix=${stop}&breakdown_type=${breakdown}`, { headers: { 'xi-api-key': key }, cache: 'no-store' });
    if (!r.ok) throw new Error(`uso ${r.status}`);
    const j = await r.json() as { usage?: Record<string, number[]> };
    return Object.entries(j.usage ?? {}).map(([name, v]) => ({ name, credits: v.reduce((a, b) => a + Number(b || 0), 0) }));
  };
  try {
    const [products, voices] = await Promise.all([get('product_type'), get('voice')]);
    // "Conversational AI" e "Conversational AI - LLM" = ligações; o resto = falas e vocabulário.
    const calls = products.filter(p => /conversational/i.test(p.name)).reduce((a, p) => a + p.credits, 0);
    const other = products.filter(p => !/conversational/i.test(p.name)).reduce((a, p) => a + p.credits, 0);
    const chars = Object.values(CHARACTERS).filter(c => c.id !== 'charlotte');
    const byChar = new Map<string, { id: string; name: string; credits: number }>();
    for (const v of voices) {
      const c = chars.find(ch => v.name.toLowerCase().includes(ch.id));
      const k = c?.id ?? 'outras';
      const cur = byChar.get(k) ?? { id: k, name: c?.name ?? 'Outras vozes', credits: 0 };
      cur.credits += v.credits; byChar.set(k, cur);
    }
    return {
      byProduct: [{ name: 'Ligações (Família)', credits: calls }, { name: 'Falas e vocabulário', credits: other }],
      byCharacter: [...byChar.values()].filter(c => c.credits > 0).sort((a, b) => b.credits - a.credits),
    };
  } catch (e) {
    return { byProduct: [], byCharacter: [], error: e instanceof Error ? e.message : 'erro' };
  }
}

// Ligações ao vivo do mês por personagem (a da Charlotte fica com character nulo).
async function liveCallsByCharacter(month: string): Promise<{ id: string; name: string; calls: number; students: number; minutes: number }[]> {
  const { start, end } = monthRange(month);
  const supabase = getSupabaseAdmin();
  const agg = new Map<string, { calls: number; users: Set<string>; secs: number }>();
  let from = 0;
  for (;;) {
    const { data } = await supabase.from('charlotte_live_calls')
      .select('character, user_id, duration_seconds').gte('started_at', start.toISOString()).lt('started_at', end.toISOString())
      .range(from, from + 999);
    const rows = (data ?? []) as { character: string | null; user_id: string; duration_seconds: number | null }[];
    for (const r of rows) {
      const k = r.character || 'charlotte';
      const a = agg.get(k) ?? { calls: 0, users: new Set<string>(), secs: 0 };
      a.calls += 1; a.users.add(r.user_id); a.secs += Number(r.duration_seconds ?? 0);
      agg.set(k, a);
    }
    if (rows.length < 1000) break;
    from += 1000;
  }
  return [...agg.entries()].map(([id, a]) => ({
    id, name: (CHARACTERS as Record<string, { name: string }>)[id]?.name ?? id,
    calls: a.calls, students: a.users.size, minutes: Math.round(a.secs / 6) / 10,
  })).sort((x, y) => y.minutes - x.minutes);
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, 'finance');
  if (admin instanceof NextResponse) return admin;
  const month = req.nextUrl.searchParams.get('month') ?? new Date().toISOString().slice(0, 7);

  const prevMonth = (() => { const d = new Date(`${month}-01T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() - 1); return d.toISOString().slice(0, 7); })();

  // Valor real guardado (lib/provider-costs → provider_cost_cache): mês atual vale 30 min, meses fechados 1 dia.
  // Abrir a tela não consulta mais a OpenAI/Azure toda vez (as APIs recusavam com 429 e a tela caía na estimativa).
  const maxAge = (m: string) => (m === new Date().toISOString().slice(0, 7) ? 30 * 60_000 : 24 * 3600_000);
  const openaiFor = async (m: string): Promise<{ source: 'real' | 'estimate'; usd: number; lines: { name: string; usd: number }[]; error?: string; at?: string | null }> => {
    const c = await cachedCost(`openai:${m}`, maxAge(m), () => openaiReal(m));
    if (c.value) return { source: 'real', ...c.value, at: c.at };
    return { source: 'estimate', ...(await openaiEstimate(m)), error: c.error };
  };
  const azureFor = async (m: string): Promise<(Cost & { error?: string }) | null> => {
    const c = await cachedCost(`azure:${m}`, maxAge(m), () => azureReal(m));
    if (c.value) return c.value;
    return c.error ? { currency: 'USD', total: 0, lines: [], error: c.error } : null;
  };

  // Mês escolhido e mês anterior em paralelo, para a variação dos cards.
  const [openai, openaiPrev, azure, azurePrev, eleven, fx] = await Promise.all([
    openaiFor(month), openaiFor(prevMonth), azureFor(month), azureFor(prevMonth),
    elevenlabs().catch(() => null), fxBrl(),
  ]);
  const [voice, liveCalls] = await Promise.all([voiceUsage(month), liveCallsByCharacter(month).catch(() => [])]);

  const { data: posted } = await getSupabaseAdmin().from('finance_entries')
    .select('vendor').eq('category', 'Inteligência artificial').like('notes', `%[ai-cost ${month}]%`);
  const postedVendors = ((posted ?? []) as { vendor: string }[]).map(p => p.vendor);
  // ElevenLabs: a API não informa o valor cobrado (a próxima fatura vem zerada); vale o que está lançado no Financeiro no mês.
  const { end: monthEnd } = monthRange(month);
  const { data: elRows } = await getSupabaseAdmin().from('finance_entries').select('amount_brl')
    .eq('kind', 'expense').eq('vendor', 'ElevenLabs').neq('status', 'canceled')
    .gte('due_date', `${month}-01`).lt('due_date', monthEnd.toISOString().slice(0, 10));
  const elevenBilledBrl = Math.round(((elRows ?? []) as { amount_brl: number }[]).reduce((a, r) => a + Number(r.amount_brl ?? 0), 0) * 100) / 100;

  return NextResponse.json({
    month, prevMonth, fx, openai, azure, elevenlabs: eleven, elevenBilledBrl, voice, liveCalls, posted: postedVendors,
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
  // Reenvia o e-mail de custos de IA agora (o automático sai às 8h).
  if (body.action === 'daily_report') {
    const r = await runAiCostReport({ force: true });
    await audit(admin, 'ai_costs.daily_report', 'ai_cost_daily', null, r);
    return NextResponse.json(r);
  }
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
