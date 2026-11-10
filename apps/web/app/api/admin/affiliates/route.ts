// /api/admin/affiliates — programa de afiliados no /admin.
//   GET                        lista com funil (cliques, cadastros, assinantes) e saldo de comissão
//   GET ?id=UUID               detalhe: alunos atribuídos e extrato de comissões
//   POST { action: 'save', affiliate }          cria ou edita (finance:write)
//   POST { action: 'attribute', id, userId }    marca um aluno manualmente (finance:write)
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin, audit } from '@/lib/admin-auth';
import { attributeUser, balanceOf, cleanAffiliateCode, type Affiliate } from '@/lib/affiliates';
import { readAll, readIn } from '@/lib/db-batch';

export const dynamic = 'force-dynamic';
const SITE = 'https://queizy.com';
const DAY = 86400000;

type Comm = { id: string; affiliate_id: string; user_id: string; kind: string; plan: string | null; product_id: string | null; net_brl: number; amount_brl: number; status: string; available_at: string; created_at: string; is_test?: boolean };
type Attr = { user_id: string; affiliate_id: string; source: string; attributed_at: string };

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, 'finance');
  if (admin instanceof NextResponse) return admin;
  const supabase = getSupabaseAdmin();
  const id = req.nextUrl.searchParams.get('id');

  if (id) {
    // Comissões em páginas: o saldo sai da lista inteira (com .limit(1000) um afiliado grande teria saldo errado).
    const [{ data: aff }, { data: attrs }, comms] = await Promise.all([
      supabase.from('affiliates').select('*').eq('id', id).maybeSingle(),
      supabase.from('affiliate_attributions').select('*').eq('affiliate_id', id).order('attributed_at', { ascending: false }).limit(500),
      readAll<Comm>('comissões do afiliado', () => supabase.from('affiliate_commissions').select('*').eq('affiliate_id', id)
        .order('created_at', { ascending: false }).order('id', { ascending: false })),
    ]);
    if (!aff) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const ids = [...new Set([...(attrs ?? []).map(a => (a as Attr).user_id), ...comms.map(c => c.user_id)])];
    // Ids em lotes: centenas de alunos atribuídos estouram o tamanho do endereço.
    const users = await readIn('alunos do afiliado', ids, chunk => supabase.from('charlotte_users').select('id, name, email, subscription_status, created_at').in('id', chunk).order('id'));
    return NextResponse.json({ affiliate: aff, link: `${SITE}/a/${(aff as unknown as Affiliate).code}`, attributions: attrs ?? [], commissions: comms, users, balance: balanceOf(comms) });
  }

  const since30 = new Date(Date.now() - 30 * DAY).toISOString();
  // O .limit(100000) não valia: a API devolve no máximo 1.000 linhas, e cliques, cadastros e comissões saíam cortados.
  // Agora o funil e as comissões são somados no banco, uma linha por afiliado (antes vinham todos os cadastros e
  // todas as comissões). Somas em dinheiro chegam como texto (mesma soma em ponto flutuante, na ordem de antes) e o
  // arredondamento continua aqui, igual ao de balanceOf.
  const { data: affs, error: affErr } = await supabase.from('affiliates').select('*').order('created_at', { ascending: false });
  if (affErr) return NextResponse.json({ error: affErr.message }, { status: 500 });
  const affList = (affs ?? []) as unknown as Affiliate[];
  type Totals = { affiliate_id: string; clicks: number; clicks30: number; signups: number; trials: number; subscribers: number; paying_users: number; revenue_net: string | null; bal_pending: string | null; bal_available: string | null; bal_paid: string | null };
  const totals = await readAll<Totals>('funil dos afiliados', () => supabase.rpc('affiliate_totals', { p_since30: since30, p_now: new Date().toISOString() }).order('affiliate_id'));
  const totalsOf = new Map(totals.map(t => [t.affiliate_id, t]));
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const num = (v: string | null | undefined) => Number(v ?? 0);

  const list = affList.map(a => {
    const t = totalsOf.get(a.id);
    return {
      ...a,
      link: `${SITE}/a/${a.code}`,
      clicks: t?.clicks ?? 0,
      clicks30: t?.clicks30 ?? 0,
      signups: t?.signups ?? 0,
      trials: t?.trials ?? 0,
      subscribers: t?.subscribers ?? 0,
      payingUsers: t?.paying_users ?? 0,
      revenueNet: round2(num(t?.revenue_net)),
      balance: { pending: round2(num(t?.bal_pending)), available: round2(num(t?.bal_available)), paid: round2(num(t?.bal_paid)) },
    };
  });
  return NextResponse.json({ affiliates: list });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, 'finance:write');
  if (admin instanceof NextResponse) return admin;
  const supabase = getSupabaseAdmin();
  const body = await req.json().catch(() => ({}));

  if (body.action === 'save') {
    const a = body.affiliate ?? {};
    const code = cleanAffiliateCode(a.code);
    if (!code || code.length < 3) return NextResponse.json({ error: 'Código precisa de pelo menos 3 letras ou números.' }, { status: 400 });
    if (!String(a.name ?? '').trim()) return NextResponse.json({ error: 'Informe o nome do afiliado.' }, { status: 400 });
    const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
    let ownerId: string | null = null;
    if (a.ownerEmail) {
      const { data: u } = await supabase.from('charlotte_users').select('id').ilike('email', String(a.ownerEmail).trim()).maybeSingle();
      ownerId = (u as { id: string } | null)?.id ?? null;
    }
    const row = {
      code, name: String(a.name).trim(), email: a.email ? String(a.email).trim() : null,
      status: a.status === 'paused' ? 'paused' : 'active',
      user_discount_pct: Math.max(0, Math.min(50, Math.round(num(a.user_discount_pct, 0)))),
      commission_type: a.commission_type === 'fixed' ? 'fixed' : 'percent',
      commission_pct: Math.max(0, Math.min(100, num(a.commission_pct, 10))),
      fixed_monthly_brl: Math.max(0, num(a.fixed_monthly_brl, 0)),
      fixed_annual_brl: Math.max(0, num(a.fixed_annual_brl, 0)),
      months_limit: Math.max(1, Math.round(num(a.months_limit, 12))),
      hold_days: Math.max(0, Math.round(num(a.hold_days, 30))),
      min_payout_brl: Math.max(0, num(a.min_payout_brl, 50)),
      owner_user_id: ownerId ?? (a.id ? undefined : null),
      notes: a.notes ? String(a.notes) : null,
      updated_at: new Date().toISOString(),
    };
    const q = a.id
      ? supabase.from('affiliates').update(row as never).eq('id', a.id).select('id').single()
      : supabase.from('affiliates').insert(row as never).select('id').single();
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: /duplicate|unique/i.test(error.message) ? 'Esse código já está em uso.' : error.message }, { status: 400 });
    await audit(admin, a.id ? 'affiliate.update' : 'affiliate.create', 'affiliate', (data as { id: string }).id, { code, name: row.name });
    return NextResponse.json({ ok: true, id: (data as { id: string }).id });
  }

  if (body.action === 'attribute') {
    const { data: aff } = await supabase.from('affiliates').select('code').eq('id', String(body.id ?? '')).maybeSingle();
    if (!aff) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    let userId = String(body.userId ?? '');
    if (!userId && body.email) {
      const { data: u } = await supabase.from('charlotte_users').select('id').ilike('email', String(body.email).trim()).maybeSingle();
      userId = (u as { id: string } | null)?.id ?? '';
    }
    if (!userId) return NextResponse.json({ error: 'Aluno não encontrado.' }, { status: 404 });
    const r = await attributeUser(userId, (aff as { code: string }).code, 'admin');
    if (!r.ok) return NextResponse.json({ error: r.error === 'already_attributed' ? 'Esse aluno já está com outro afiliado.' : r.error }, { status: 400 });
    await audit(admin, 'affiliate.attribute', 'affiliate', String(body.id), { userId });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
}
