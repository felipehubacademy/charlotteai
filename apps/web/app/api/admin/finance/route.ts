// /api/admin/finance — lançamentos financeiros (entradas e saídas).
//   GET              todos os lançamentos (o painel calcula gráficos no cliente)
//   GET ?fx=USD      cotação atual da moeda em reais (AwesomeAPI)
//   POST             cria lançamento
//   PATCH            { id, ...campos } edita; ao pagar um recorrente, cria o próximo
//   DELETE ?id=      apaga
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin, audit } from '@/lib/admin-auth';
import { fxToBrl } from '@/lib/fx';

export const dynamic = 'force-dynamic';

const FIELDS = 'id, kind, description, category, vendor, amount, currency, fx_rate, amount_brl, due_date, paid_at, status, recurrence, recurrence_of, scope, notes, attachment_url, created_at, updated_at';

type Entry = {
  id: string; kind: 'expense' | 'income'; description: string; category: string; vendor: string | null;
  amount: number; currency: string; fx_rate: number; amount_brl: number; due_date: string;
  paid_at: string | null; status: 'pending' | 'paid' | 'canceled'; recurrence: 'none' | 'monthly' | 'yearly';
  recurrence_of: string | null; scope: string; notes: string | null; attachment_url: string | null;
};

const today = () => new Date().toISOString().slice(0, 10);

function clean(body: Record<string, unknown>): Partial<Entry> & { error?: string } {
  const out: Record<string, unknown> = {};
  if (body.kind !== undefined) {
    if (body.kind !== 'expense' && body.kind !== 'income') return { error: 'Tipo inválido' };
    out.kind = body.kind;
  }
  for (const k of ['description', 'category', 'vendor', 'notes', 'attachment_url', 'scope'] as const) {
    if (body[k] !== undefined) out[k] = body[k] === null ? null : String(body[k]).trim() || null;
  }
  if (body.currency !== undefined) out.currency = String(body.currency).toUpperCase().slice(0, 3);
  if (body.amount !== undefined) {
    const n = Number(body.amount);
    if (!Number.isFinite(n) || n < 0) return { error: 'Valor inválido' };
    out.amount = Math.round(n * 100) / 100;
  }
  if (body.fx_rate !== undefined) {
    const n = Number(body.fx_rate);
    if (!Number.isFinite(n) || n <= 0) return { error: 'Cotação inválida' };
    out.fx_rate = n;
  }
  for (const k of ['due_date', 'paid_at'] as const) {
    if (body[k] !== undefined) {
      const v = body[k] ? String(body[k]).slice(0, 10) : null;
      if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { error: 'Data inválida' };
      out[k] = v;
    }
  }
  if (body.status !== undefined) {
    if (!['pending', 'paid', 'canceled'].includes(String(body.status))) return { error: 'Status inválido' };
    out.status = body.status;
  }
  if (body.recurrence !== undefined) {
    if (!['none', 'monthly', 'yearly'].includes(String(body.recurrence))) return { error: 'Recorrência inválida' };
    out.recurrence = body.recurrence;
  }
  return out as Partial<Entry>;
}

function addPeriod(date: string, recurrence: 'monthly' | 'yearly'): string {
  const d = new Date(date + 'T12:00:00Z');
  if (recurrence === 'monthly') d.setUTCMonth(d.getUTCMonth() + 1);
  else d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, 'finance');
  if (admin instanceof NextResponse) return admin;

  const fx = req.nextUrl.searchParams.get('fx');
  if (fx) {
    const cur = fx.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    const rate = await fxToBrl(cur);
    if (!rate) return NextResponse.json({ error: 'Cotação indisponível' }, { status: 502 });
    return NextResponse.json({ rate: Math.round(rate * 10000) / 10000 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('finance_entries').select(FIELDS)
    .order('due_date', { ascending: false }).limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data ?? [] });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, 'finance:write');
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));
  const c = clean(body);
  if (c.error) return NextResponse.json({ error: c.error }, { status: 400 });
  if (!c.kind || !c.description || !c.category || c.amount === undefined || !c.due_date) {
    return NextResponse.json({ error: 'Tipo, descrição, categoria, valor e data são obrigatórios.' }, { status: 400 });
  }
  const currency = c.currency ?? 'BRL';
  const fx_rate = currency === 'BRL' ? 1 : (c.fx_rate ?? 1);
  const status = c.status ?? 'pending';
  const row = {
    ...c, currency, fx_rate,
    amount_brl: Math.round(c.amount * fx_rate * 100) / 100,
    status,
    paid_at: status === 'paid' ? (c.paid_at ?? today()) : null,
    created_by: admin.userId,
  };

  const { data, error } = await getSupabaseAdmin().from('finance_entries').insert(row as never).select(FIELDS).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const created = data as unknown as Entry;
  await audit(admin, 'finance.create', 'finance_entry', created.id, { description: created.description, amount_brl: created.amount_brl, kind: created.kind });
  return NextResponse.json({ entry: created });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req, 'finance:write');
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? '');
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
  const c = clean(body);
  if (c.error) return NextResponse.json({ error: c.error }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: currentRow } = await supabase.from('finance_entries').select(FIELDS).eq('id', id).maybeSingle();
  const cur = currentRow as unknown as Entry | null;
  if (!cur) return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 });

  const next = { ...cur, ...c } as Entry;
  if (next.currency === 'BRL') next.fx_rate = 1;
  const update: Record<string, unknown> = {
    ...c,
    fx_rate: next.fx_rate,
    amount_brl: Math.round(next.amount * next.fx_rate * 100) / 100,
    updated_at: new Date().toISOString(),
  };
  if (c.status === 'paid' && !next.paid_at) update.paid_at = today();
  if (c.status && c.status !== 'paid') update.paid_at = null;

  const { data, error } = await supabase.from('finance_entries').update(update as never).eq('id', id).select(FIELDS).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const saved = data as unknown as Entry;

  // Recorrente que acabou de ser pago: deixa o próximo vencimento lançado.
  let created: Entry | null = null;
  if (cur.status !== 'paid' && saved.status === 'paid' && saved.recurrence !== 'none') {
    const root = saved.recurrence_of ?? saved.id;
    const nextDue = addPeriod(saved.due_date, saved.recurrence);
    const { count } = await supabase.from('finance_entries').select('id', { count: 'exact', head: true })
      .or(`id.eq.${root},recurrence_of.eq.${root}`).eq('due_date', nextDue);
    if (!count) {
      const { data: n } = await supabase.from('finance_entries').insert({
        kind: saved.kind, description: saved.description, category: saved.category, vendor: saved.vendor,
        amount: saved.amount, currency: saved.currency, fx_rate: saved.fx_rate, amount_brl: saved.amount_brl,
        due_date: nextDue, status: 'pending', recurrence: saved.recurrence, recurrence_of: root,
        scope: saved.scope, notes: saved.notes, created_by: admin.userId,
      } as never).select(FIELDS).single();
      created = (n as unknown as Entry) ?? null;
    }
  }

  await audit(admin, 'finance.update', 'finance_entry', id, update);
  return NextResponse.json({ entry: saved, nextEntry: created });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req, 'finance:write');
  if (admin instanceof NextResponse) return admin;
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data: cur } = await supabase.from('finance_entries').select('description, amount_brl, kind').eq('id', id).maybeSingle();
  const { error } = await supabase.from('finance_entries').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await audit(admin, 'finance.delete', 'finance_entry', id, (cur ?? {}) as Record<string, unknown>);
  return NextResponse.json({ ok: true });
}
