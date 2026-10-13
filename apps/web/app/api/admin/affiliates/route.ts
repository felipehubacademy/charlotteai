// /api/admin/affiliates — programa de afiliados no /admin.
//   GET                        lista com funil (cliques, cadastros, assinantes) e saldo de comissão
//   GET ?id=UUID               detalhe: alunos atribuídos e extrato de comissões
//   POST { action: 'save', affiliate }          cria ou edita (finance:write)
//   POST { action: 'attribute', id, userId }    marca um aluno manualmente (finance:write)
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin, audit } from '@/lib/admin-auth';
import { attributeUser, balanceOf, cleanAffiliateCode, type Affiliate } from '@/lib/affiliates';

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
    const [{ data: aff }, { data: attrs }, { data: comms }] = await Promise.all([
      supabase.from('affiliates').select('*').eq('id', id).maybeSingle(),
      supabase.from('affiliate_attributions').select('*').eq('affiliate_id', id).order('attributed_at', { ascending: false }).limit(500),
      supabase.from('affiliate_commissions').select('*').eq('affiliate_id', id).order('created_at', { ascending: false }).limit(1000),
    ]);
    if (!aff) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const ids = [...new Set([...(attrs ?? []).map(a => (a as Attr).user_id), ...(comms ?? []).map(c => (c as Comm).user_id)])];
    const { data: users } = ids.length
      ? await supabase.from('charlotte_users').select('id, name, email, subscription_status, created_at').in('id', ids)
      : { data: [] as unknown[] };
    return NextResponse.json({ affiliate: aff, link: `${SITE}/a/${(aff as unknown as Affiliate).code}`, attributions: attrs ?? [], commissions: comms ?? [], users: users ?? [], balance: balanceOf((comms ?? []) as Comm[]) });
  }

  const since30 = new Date(Date.now() - 30 * DAY).toISOString();
  const [{ data: affs }, { data: clicks }, { data: clicks30 }, { data: attrs }, { data: comms }] = await Promise.all([
    supabase.from('affiliates').select('*').order('created_at', { ascending: false }),
    supabase.from('affiliate_clicks').select('affiliate_id').limit(100000),
    supabase.from('affiliate_clicks').select('affiliate_id').gte('created_at', since30).limit(100000),
    supabase.from('affiliate_attributions').select('user_id, affiliate_id').limit(100000),
    supabase.from('affiliate_commissions').select('affiliate_id, user_id, kind, net_brl, amount_brl, status, available_at, is_test').limit(100000),
  ]);
  const attrRows = (attrs ?? []) as Pick<Attr, 'user_id' | 'affiliate_id'>[];
  const userIds = [...new Set(attrRows.map(a => a.user_id))];
  const { data: subs } = userIds.length
    ? await supabase.from('charlotte_users').select('id, subscription_status').in('id', userIds)
    : { data: [] as unknown[] };
  const statusOf = new Map(((subs ?? []) as { id: string; subscription_status: string | null }[]).map(u => [u.id, u.subscription_status]));
  const count = (rows: { affiliate_id: string }[] | null, affId: string) => (rows ?? []).filter(r => r.affiliate_id === affId).length;

  const list = ((affs ?? []) as unknown as Affiliate[]).map(a => {
    const mine = attrRows.filter(r => r.affiliate_id === a.id);
    const myComms = ((comms ?? []) as Comm[]).filter(c => c.affiliate_id === a.id);
    const valid = myComms.filter(c => c.kind === 'commission' && c.status !== 'reversed' && !c.is_test);
    return {
      ...a,
      link: `${SITE}/a/${a.code}`,
      clicks: count(clicks as { affiliate_id: string }[] | null, a.id),
      clicks30: count(clicks30 as { affiliate_id: string }[] | null, a.id),
      signups: mine.length,
      trials: mine.filter(r => statusOf.get(r.user_id) === 'trial').length,
      subscribers: mine.filter(r => ['active', 'cancelled'].includes(statusOf.get(r.user_id) ?? '')).length,
      payingUsers: new Set(valid.map(c => c.user_id)).size,
      revenueNet: Math.round(valid.reduce((s, c) => s + Number(c.net_brl), 0) * 100) / 100,
      balance: balanceOf(myComms),
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
