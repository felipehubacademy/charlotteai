// POST /api/admin/web-subscription/extend { email, days } — estende o teste grátis (ou a próxima cobrança) de uma
// assinatura do site: adia a cobrança no Asaas (assinatura + cobrança pendente) e o acesso do aluno do nosso lado.
// Para quando o aluno perdeu dias por um erro nosso (ex.: não conseguiu criar a senha).
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, audit } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getSubscription, postponeSubscription } from '@/lib/asaas';

export const dynamic = 'force-dynamic';

const addDays = (ymd: string, d: number) => {
  const t = new Date(`${ymd}T12:00:00Z`); t.setUTCDate(t.getUTCDate() + d); return t.toISOString().slice(0, 10);
};

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, 'users:write');
  if (admin instanceof NextResponse) return admin;
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  const days = Math.round(Number(body.days));
  if (!email.includes('@') || !(days >= 1 && days <= 30)) {
    return NextResponse.json({ error: 'Informe o e-mail e de 1 a 30 dias.' }, { status: 400 });
  }
  const supabase = getSupabaseAdmin();
  const { data: u } = await supabase.from('charlotte_users').select('id, subscription_product, subscription_expires_at').ilike('email', email).maybeSingle();
  const user = u as { id: string; subscription_product: string | null; subscription_expires_at: string | null } | null;
  if (!user) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 });
  if (!user.subscription_product?.startsWith('web_')) return NextResponse.json({ error: 'Essa conta não tem assinatura do site.' }, { status: 400 });
  const { data: ck } = await supabase.from('asaas_checkouts').select('asaas_subscription_id, sandbox')
    .eq('user_id', user.id).eq('status', 'paid').not('asaas_subscription_id', 'is', null)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  const c = ck as { asaas_subscription_id: string; sandbox: boolean } | null;
  if (!c) return NextResponse.json({ error: 'Assinatura no Asaas não encontrada.' }, { status: 404 });

  try {
    const sub = await getSubscription(c.asaas_subscription_id);
    const newDate = addDays(sub.nextDueDate, days);
    const r = await postponeSubscription(c.asaas_subscription_id, newDate, c.sandbox);
    // Acesso do nosso lado acompanha a nova data da cobrança.
    const base = user.subscription_expires_at ? new Date(user.subscription_expires_at) : new Date(`${sub.nextDueDate}T23:59:59-03:00`);
    const expires = new Date(base.getTime() + days * 86_400_000).toISOString();
    await supabase.from('charlotte_users').update({ subscription_expires_at: expires } as never).eq('id', user.id);
    await audit(admin, 'web_subscription.extend', 'user', user.id, { email, days, from: sub.nextDueDate, to: newDate, payments: r.payments });
    return NextResponse.json({ ok: true, from: sub.nextDueDate, to: newDate, payments: r.payments, accessUntil: expires });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Falha no Asaas' }, { status: 502 });
  }
}
