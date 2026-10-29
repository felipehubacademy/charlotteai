// /api/cron/access-help — de hora em hora (vercel.json): quem pagou no site há mais de 24 h e nunca entrou no app
// recebe o e-mail de ajuda com link novo de criar senha (lib/access-help), uma única vez por compra.
// Prevenção: antes dependia de alguém olhar os dados ou do aluno escrever para o suporte.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendAccessHelp, whenLabel } from '@/lib/access-help';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const crons = [process.env.CRON_SECRET_TOKEN, process.env.CRON_SECRET].filter(Boolean);
  const admin = process.env.ADMIN_SECRET;
  return (!!bearer && crons.includes(bearer)) || (!!admin && req.headers.get('x-admin-secret') === admin);
}

async function run(dryRun: boolean) {
  const supabase = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const since = new Date(Date.now() - 20 * 86_400_000).toISOString(); // compras recentes (não reabre casos antigos)
  const { data } = await supabase.from('asaas_checkouts').select('id, user_id, created_at')
    .eq('status', 'paid').eq('sandbox', false).is('access_help_sent_at', null).is('refunded_at', null)
    .lt('created_at', cutoff).gt('created_at', since).limit(50);
  const out: { email: string; sent: boolean }[] = [];
  for (const c of (data ?? []) as { id: string; user_id: string; created_at: string }[]) {
    const { data: auth } = await supabase.auth.admin.getUserById(c.user_id);
    if (!auth?.user || auth.user.last_sign_in_at) continue; // já entrou
    const { data: u } = await supabase.from('charlotte_users').select('id, name, email').eq('id', c.user_id).maybeSingle();
    const user = u as { id: string; name: string | null; email: string } | null;
    if (!user?.email || /^felipe\.xavier1987\+/i.test(user.email)) continue;
    if (dryRun) { out.push({ email: user.email, sent: false }); continue; }
    const r = await sendAccessHelp(user, whenLabel(c.created_at));
    if (r.ok) await supabase.from('asaas_checkouts').update({ access_help_sent_at: new Date().toISOString() } as never).eq('id', c.id);
    out.push({ email: user.email, sent: r.ok });
  }
  return { checked: (data ?? []).length, sent: out.filter(o => o.sent).length, dryRun, list: out };
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await run(req.nextUrl.searchParams.get('dryRun') === '1'));
}
export const POST = GET;
