// /api/checkout/asaas/email — tela de sucesso do site: mostra o e-mail da compra e deixa corrigir.
//   GET              { email, canFix } do checkout deste navegador (cookie qz_checkout)
//   POST { email }   troca o e-mail (só conta criada pelo checkout e nunca usada) e reenvia o acesso
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { moveCheckoutEmail, FIX_ERROR_PT } from '@/lib/email-fix';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const id = req.cookies.get('qz_checkout')?.value;
  if (!id) return NextResponse.json({ email: null, canFix: false });
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('asaas_checkouts').select('user_id, created_account').eq('id', id).maybeSingle();
  const ck = data as { user_id: string; created_account: boolean | null } | null;
  if (!ck) return NextResponse.json({ email: null, canFix: false });
  const { data: u } = await supabase.from('charlotte_users').select('email, last_seen_at').eq('id', ck.user_id).maybeSingle();
  const user = u as { email: string | null; last_seen_at: string | null } | null;
  return NextResponse.json({ email: user?.email ?? null, canFix: ck.created_account === true && !user?.last_seen_at });
}

export async function POST(req: NextRequest) {
  const id = req.cookies.get('qz_checkout')?.value;
  if (!id) return NextResponse.json({ error: 'Não encontramos a compra neste navegador. Fale com o suporte.' }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const r = await moveCheckoutEmail(id, String(body.email ?? ''), 'site');
  if (!r.ok) return NextResponse.json({ error: FIX_ERROR_PT[r.error] }, { status: 400 });
  return NextResponse.json({ ok: true, email: r.email });
}
