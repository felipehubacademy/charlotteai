// /api/admin/commercial — área Comercial do /admin (cupons e vendas pelo site).
//   GET  ?view=coupons     cupons com usos (checkouts pagos) e receita
//   GET  ?view=checkouts   últimos checkouts do site (pagos, em aberto, abandonados)
//   POST { action: 'save_coupon', coupon }            cria ou edita (finance)
//   POST { action: 'toggle_coupon', code, active }    pausa ou reativa (finance)
// Os cupons valem só no site (Asaas). Afiliados ficam em /api/admin/affiliates.
import { NextRequest, NextResponse } from 'next/server';
import { cleanCampaign } from '@/lib/ad-attribution';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin, audit } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

type Coupon = {
  code: string; discount_pct: number; plans: string[] | null; active: boolean;
  starts_at: string | null; expires_at: string | null; max_uses: number | null;
  duration_cycles: number | null; note: string | null; created_at: string;
};
type Checkout = {
  id: string; user_id: string; plan: string; method: string | null; value_brl: number; status: string;
  coupon_code: string | null; affiliate_code: string | null; discount_pct: number | null; trial_days: number;
  created_at: string; paid_at: string | null; refunded_at: string | null; price_restored_at: string | null; coupon_cycles: number | null;
  recovery_stage: number;
};

const ABANDON_AFTER_MS = 2 * 3600 * 1000; // o link do checkout do Asaas vence em 120 min

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, 'finance');
  if (admin instanceof NextResponse) return admin;
  const supabase = getSupabaseAdmin();
  const view = req.nextUrl.searchParams.get('view') ?? 'coupons';

  // Saúde do checkout (24 h): compras, recusas, Pix, erros das rotas críticas e alertas do vigia.
  if (view === 'health') {
    const since = new Date(Date.now() - 86400000).toISOString();
    const [{ data: cks }, { data: att }, { data: errs }, { data: alerts }] = await Promise.all([
      supabase.from('asaas_checkouts').select('status, method, channel, pending_payment_id').eq('sandbox', false).gte('created_at', since),
      supabase.from('checkout_attempts').select('ok').eq('kind', 'card').gte('created_at', since),
      supabase.from('ops_errors').select('created_at, area, route, message').gte('created_at', since).order('created_at', { ascending: false }).limit(50),
      supabase.from('ops_alerts').select('created_at, kind, message, sent_email, sent_whatsapp').order('created_at', { ascending: false }).limit(20),
    ]);
    const c = (cks ?? []) as { status: string; method: string | null; channel: string; pending_payment_id: string | null }[];
    const a = (att ?? []) as { ok: boolean | null }[];
    const pix = c.filter(r => r.method === 'annual_pix');
    return NextResponse.json({
      health: {
        checkouts: c.length, paid: c.filter(r => r.status === 'paid').length,
        hosted: c.filter(r => r.channel === 'hosted').length, direct: c.filter(r => r.channel === 'direct').length,
        cardOk: a.filter(r => r.ok === true).length, cardDeclined: a.filter(r => r.ok === false).length,
        pixCreated: pix.length, pixPaid: pix.filter(r => r.status === 'paid').length,
      },
      errors: errs ?? [], alerts: alerts ?? [],
    });
  }

  // Teste A/B de anúncios: lado "loja" (cliques no /baixar) x lado "site" (visitas com utm e compras no site).
  // As instalações pela loja não chegam aqui: ficam em App Store Connect › Campanhas e no Play Console.
  if (view === 'ads') {
    const days = Math.min(90, Math.max(1, Number(req.nextUrl.searchParams.get('days') ?? 14)));
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const [{ data: ev }, { data: cks }] = await Promise.all([
      supabase.from('ad_events').select('kind, arm, campaign, platform').gte('created_at', since).limit(50000),
      supabase.from('asaas_checkouts').select('status, asaas_payment_id, value_brl, meta_tracking, created_at')
        .eq('sandbox', false).gte('created_at', since).not('meta_tracking->utm', 'is', null),
    ]);
    type Row = { campaign: string; clicks: number; ios: number; android: number; desktop: number; visits: number; checkouts: number; started: number; charged: number; revenue: number };
    const map = new Map<string, Row>();
    const row = (c: string) => { if (!map.has(c)) map.set(c, { campaign: c, clicks: 0, ios: 0, android: 0, desktop: 0, visits: 0, checkouts: 0, started: 0, charged: 0, revenue: 0 }); return map.get(c)!; };
    for (const e of (ev ?? []) as { kind: string; campaign: string; platform: string | null }[]) {
      const r = row(e.campaign);
      if (e.kind === 'click') { r.clicks++; if (e.platform === 'ios') r.ios++; else if (e.platform === 'android') r.android++; else r.desktop++; }
      else r.visits++;
    }
    for (const c of (cks ?? []) as { status: string; asaas_payment_id: string | null; value_brl: number; meta_tracking: { utm?: { c?: string } } | null }[]) {
      const raw = String(c.meta_tracking?.utm?.c ?? '');
      const camp = raw ? cleanCampaign(raw) : ''; // mesma limpeza das visitas e cliques (lib/ad-attribution)
      if (!camp) continue;
      const r = row(camp);
      r.checkouts++;
      if (c.status === 'paid') r.started++;
      if (c.asaas_payment_id) { r.charged++; r.revenue += Number(c.value_brl) || 0; }
    }
    return NextResponse.json({ days, ads: [...map.values()].sort((a, b) => (b.clicks + b.visits) - (a.clicks + a.visits)) });
  }

  if (view === 'checkouts') {
    const { data } = await supabase.from('asaas_checkouts')
      .select('id, user_id, plan, method, value_brl, status, coupon_code, affiliate_code, discount_pct, trial_days, created_at, paid_at, refunded_at, price_restored_at, coupon_cycles, recovery_stage')
      .order('created_at', { ascending: false }).limit(300);
    const rows = (data ?? []) as Checkout[];
    const ids = [...new Set(rows.map(r => r.user_id))];
    const { data: users } = ids.length
      ? await supabase.from('charlotte_users').select('id, name, email, subscription_status').in('id', ids)
      : { data: [] as unknown[] };
    const byId = new Map(((users ?? []) as { id: string; name: string | null; email: string | null; subscription_status: string | null }[]).map(u => [u.id, u]));
    // Abandonado: não pagou, o link já venceu e a pessoa não assinou depois por outro checkout.
    const paidUsers = new Set(rows.filter(r => r.status === 'paid').map(r => r.user_id));
    const list = rows.map(r => {
      const u = byId.get(r.user_id);
      const old = Date.now() - new Date(r.created_at).getTime() > ABANDON_AFTER_MS;
      const state = r.refunded_at ? 'refunded' : r.status === 'paid' ? 'paid' : !old ? 'open' : paidUsers.has(r.user_id) ? 'superseded' : 'abandoned';
      return { ...r, state, name: u?.name ?? null, email: u?.email ?? null, subscription_status: u?.subscription_status ?? null };
    });
    const since30 = Date.now() - 30 * 86400000;
    const last30 = list.filter(r => new Date(r.created_at).getTime() >= since30);
    return NextResponse.json({
      checkouts: list,
      summary: {
        started30: last30.length,
        paid30: last30.filter(r => r.state === 'paid').length,
        abandoned30: last30.filter(r => r.state === 'abandoned').length,
        // Recebeu lembrete de carrinho abandonado e assinou depois.
        recovered30: last30.filter(r => r.recovery_stage > 0 && paidUsers.has(r.user_id)).length,
        revenue30: last30.filter(r => r.state === 'paid').reduce((s, r) => s + Number(r.value_brl || 0), 0),
      },
    });
  }

  const [{ data: coupons }, { data: paid }] = await Promise.all([
    supabase.from('coupons').select('*').order('created_at', { ascending: false }),
    supabase.from('asaas_checkouts').select('coupon_code, value_brl').eq('status', 'paid').not('coupon_code', 'is', null).limit(100000),
  ]);
  const uses = new Map<string, { n: number; revenue: number }>();
  for (const r of (paid ?? []) as { coupon_code: string; value_brl: number }[]) {
    const u = uses.get(r.coupon_code) ?? { n: 0, revenue: 0 };
    u.n += 1; u.revenue += Number(r.value_brl || 0);
    uses.set(r.coupon_code, u);
  }
  const now = Date.now();
  const list = ((coupons ?? []) as Coupon[]).map(c => {
    const u = uses.get(c.code) ?? { n: 0, revenue: 0 };
    const state = !c.active ? 'paused'
      : c.starts_at && new Date(c.starts_at).getTime() > now ? 'scheduled'
      : c.expires_at && new Date(c.expires_at).getTime() < now ? 'expired'
      : c.max_uses != null && u.n >= c.max_uses ? 'used_up'
      : 'live';
    return { ...c, uses: u.n, revenue: u.revenue, state };
  });
  return NextResponse.json({ coupons: list });
}

function cleanCode(raw: unknown): string {
  return String(raw ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 30);
}
function isoOrNull(v: unknown): string | null {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, 'finance');
  if (admin instanceof NextResponse) return admin;
  const supabase = getSupabaseAdmin();
  const body = await req.json().catch(() => ({}));

  if (body.action === 'toggle_coupon') {
    const code = cleanCode(body.code);
    if (!code) return NextResponse.json({ error: 'Cupom inválido.' }, { status: 400 });
    const { error } = await supabase.from('coupons').update({ active: !!body.active } as never).eq('code', code);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await audit(admin, body.active ? 'coupon_resume' : 'coupon_pause', 'coupon', code);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'save_coupon') {
    const c = body.coupon ?? {};
    const code = cleanCode(c.code);
    const pct = Math.round(Number(c.discount_pct));
    const plans = (Array.isArray(c.plans) ? c.plans : ['monthly', 'annual']).filter((p: string) => p === 'monthly' || p === 'annual');
    const cycles = c.duration_cycles == null || c.duration_cycles === '' ? null : Math.round(Number(c.duration_cycles));
    const maxUses = c.max_uses == null || c.max_uses === '' ? null : Math.round(Number(c.max_uses));
    const startsAt = isoOrNull(c.starts_at);
    const expiresAt = isoOrNull(c.expires_at);
    if (code.length < 3) return NextResponse.json({ error: 'O código precisa de pelo menos 3 letras ou números.' }, { status: 400 });
    if (!(pct >= 1 && pct <= 50)) return NextResponse.json({ error: 'O desconto vai de 1% a 50%.' }, { status: 400 });
    if (!plans.length) return NextResponse.json({ error: 'Escolha pelo menos um plano.' }, { status: 400 });
    if (cycles != null && !(cycles >= 1 && cycles <= 24)) return NextResponse.json({ error: 'A duração vai de 1 a 24 cobranças (ou vazio para sempre).' }, { status: 400 });
    if (maxUses != null && !(maxUses >= 1)) return NextResponse.json({ error: 'O limite de usos precisa ser 1 ou mais (ou vazio para sem limite).' }, { status: 400 });
    if (startsAt && expiresAt && new Date(startsAt) >= new Date(expiresAt)) return NextResponse.json({ error: 'O fim precisa ser depois do início.' }, { status: 400 });
    // Código de cupom não pode colidir com código de afiliado (o checkout procura nos dois).
    if (!body.editing) {
      const { data: aff } = await supabase.from('affiliates').select('code').eq('code', code).maybeSingle();
      if (aff) return NextResponse.json({ error: 'Esse código já é de um afiliado.' }, { status: 400 });
    }
    const row = {
      code, discount_pct: pct, plans, active: c.active !== false, starts_at: startsAt, expires_at: expiresAt,
      max_uses: maxUses, duration_cycles: cycles, note: String(c.note ?? '').slice(0, 300) || null,
    };
    const { error } = body.editing
      ? await supabase.from('coupons').update(row as never).eq('code', code)
      : await supabase.from('coupons').insert(row as never);
    if (error) return NextResponse.json({ error: error.code === '23505' ? 'Já existe um cupom com esse código.' : error.message }, { status: 400 });
    await audit(admin, body.editing ? 'coupon_update' : 'coupon_create', 'coupon', code, row);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
}
