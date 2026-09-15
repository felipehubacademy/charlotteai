export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * app/api/admin/bounces/route.ts
 * Le os NDRs (falha de entrega) recentes da caixa da Charlotte via Microsoft
 * Graph, cruza com os emails dos nossos usuarios e (opcional) marca
 * email_bounced=true pra nao reenviar. Higiene de lista.
 *
 * POST { since?: ISO, apply?: boolean }
 *   since  -> janela de leitura (default: ultimas 3h)
 *   apply  -> se true, marca os usuarios casados como email_bounced
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { listBounceRecipients } from '@/lib/microsoft-graph-email-service';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? '';
function checkAuth(req: NextRequest) {
  const auth = req.headers.get('x-admin-secret') ?? req.nextUrl.searchParams.get('secret') ?? '';
  return ADMIN_SECRET && auth === ADMIN_SECRET;
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch {}
  const apply: boolean = body?.apply === true;
  const since: string = body?.since || new Date(Date.now() - 3 * 3600 * 1000).toISOString();

  let scan;
  try {
    scan = await listBounceRecipients(since);
  } catch (e) {
    return NextResponse.json({ error: `Falha ao ler a caixa (Mail.Read?): ${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
  }
  const bounceSet = new Set(scan.emails);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('charlotte_users').select('id, email, email_bounced');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const matched = (data ?? []).filter(
    (u: any) => u.email && bounceSet.has(String(u.email).toLowerCase()),
  ) as { id: string; email: string; email_bounced: boolean }[];

  let applied = 0;
  if (apply && matched.length) {
    const ids = matched.map(u => u.id);
    const { error: upErr } = await supabase
      .from('charlotte_users').update({ email_bounced: true }).in('id', ids);
    if (upErr) return NextResponse.json({ error: `Falha ao marcar: ${upErr.message}` }, { status: 500 });
    applied = ids.length;
  }

  return NextResponse.json({
    ok: true,
    since,
    scannedMessages: scan.scanned,
    bounceEmailsFound: scan.emails.length,
    matchedUsers: matched.length,
    matchedEmails: matched.map(u => u.email),
    applied,
  });
}
