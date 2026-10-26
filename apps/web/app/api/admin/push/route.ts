// /api/admin/push — inscrição do aparelho nos alertas da gestão (PWA do /admin).
// GET: chave pública + se este aparelho já está inscrito. POST: inscreve. DELETE: remove.
// POST com { test: true }: manda um alerta de teste só para quem pediu.
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { getAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { vapidPublicKey } from '@/lib/admin-push';

export async function GET(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const endpoint = req.nextUrl.searchParams.get('endpoint');
  let subscribed = false;
  if (endpoint && admin.userId) {
    const { data } = await getSupabaseAdmin().from('admin_push_subscriptions').select('id').eq('endpoint', endpoint).eq('user_id', admin.userId!).maybeSingle();
    subscribed = !!data;
  }
  return NextResponse.json({ publicKey: vapidPublicKey(), subscribed, legacy: admin.legacy });
}

export async function POST(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (admin.legacy) return NextResponse.json({ error: 'Entre com seu e-mail para ativar os alertas.' }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const supabase = getSupabaseAdmin();

  if (body.test) {
    const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
    if (!pub || !priv) return NextResponse.json({ error: 'Alertas ainda não configurados no servidor.' }, { status: 503 });
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:suporte@queizy.com', pub, priv);
    const { data: subs } = await supabase.from('admin_push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', admin.userId!);
    let sent = 0;
    for (const s of (subs ?? []) as { endpoint: string; p256dh: string; auth: string }[]) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: 'Queizy Gestão', body: 'Alertas ativados. É assim que os avisos vão chegar.', url: '/admin' }));
        sent++;
      } catch { /* inscrição morta: some no próximo alerta */ }
    }
    return NextResponse.json({ sent });
  }

  const sub = body.subscription as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | undefined;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return NextResponse.json({ error: 'Inscrição inválida' }, { status: 400 });
  const { error } = await supabase.from('admin_push_subscriptions').upsert({
    user_id: admin.userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth,
    user_agent: req.headers.get('user-agent')?.slice(0, 300) ?? null,
  } as never, { onConflict: 'endpoint' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { endpoint } = await req.json().catch(() => ({}));
  if (endpoint && admin.userId) await getSupabaseAdmin().from('admin_push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', admin.userId!);
  return NextResponse.json({ ok: true });
}
