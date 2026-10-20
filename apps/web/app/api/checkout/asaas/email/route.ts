// /api/checkout/asaas/email — tela de sucesso do site: mostra o e-mail da compra e deixa corrigir.
//   GET              { email, canFix } do checkout deste navegador (cookie qz_checkout)
//   POST { email }   troca o e-mail (só conta criada pelo checkout e nunca usada) e reenvia o acesso
//   POST { action: 'resend' }  reenvia o e-mail com o link de criar a senha (1 por minuto por compra)
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { moveCheckoutEmail, FIX_ERROR_PT } from '@/lib/email-fix';
import { sendWebWelcome } from '@/lib/web-welcome';
import type { WebPlan } from '@/lib/asaas';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'gru1'; // perto do banco (São Paulo)

export async function GET(req: NextRequest) {
  const id = req.cookies.get('qz_checkout')?.value;
  if (!id) return NextResponse.json({ email: null, canFix: false });
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('asaas_checkouts').select('user_id, created_account, plan, value_brl, trial_days').eq('id', id).maybeSingle();
  const ck = data as { user_id: string; created_account: boolean | null; plan: string; value_brl: number; trial_days: number } | null;
  if (!ck) return NextResponse.json({ email: null, canFix: false });
  const { data: u } = await supabase.from('charlotte_users').select('email, last_seen_at').eq('id', ck.user_id).maybeSingle();
  const user = u as { email: string | null; last_seen_at: string | null } | null;
  return NextResponse.json({
    email: user?.email ?? null, canFix: ck.created_account === true && !user?.last_seen_at,
    // Para o pixel da tela de sucesso (mesmo event_id do servidor).
    checkoutId: id, plan: ck.plan, value: Number(ck.value_brl), trialDays: ck.trial_days,
  });
}

export async function POST(req: NextRequest) {
  const id = req.cookies.get('qz_checkout')?.value;
  if (!id) return NextResponse.json({ error: 'Não encontramos a compra neste navegador. Fale com o suporte.' }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  if (body.action === 'resend') {
    const supabase = getSupabaseAdmin();
    const key = `resend:${id}`;
    const { count } = await supabase.from('checkout_attempts').select('id', { count: 'exact', head: true })
      .eq('email', key).gte('created_at', new Date(Date.now() - 60000).toISOString());
    if ((count ?? 0) > 0) return NextResponse.json({ error: 'Acabamos de reenviar. Confira também a caixa de spam e aguarde um minuto para pedir de novo.' }, { status: 429 });
    await supabase.from('checkout_attempts').insert({ email: key, ip: null } as never);
    const { data } = await supabase.from('asaas_checkouts').select('user_id, plan, trial_days').eq('id', id).maybeSingle();
    const ck = data as { user_id: string; plan: WebPlan; trial_days: number } | null;
    if (!ck) return NextResponse.json({ error: 'Não encontramos a compra neste navegador. Fale com o suporte.' }, { status: 400 });
    await sendWebWelcome(ck.user_id, ck.plan, ck.trial_days);
    return NextResponse.json({ ok: true });
  }
  const r = await moveCheckoutEmail(id, String(body.email ?? ''), 'site');
  if (!r.ok) return NextResponse.json({ error: FIX_ERROR_PT[r.error] }, { status: 400 });
  return NextResponse.json({ ok: true, email: r.email });
}
