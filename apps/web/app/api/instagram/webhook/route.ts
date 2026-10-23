// /api/instagram/webhook — eventos do Instagram (app "Queizy Suporte", caso de uso do Instagram).
//   GET  verificação do webhook (hub.mode / hub.verify_token / hub.challenge)
//   POST mensagens diretas (campo messages) e comentários (campo comments): responde 200 na hora.
// DM: mesmo atendimento do WhatsApp (lib/support-instagram). Comentário: entra como pendente e o
// cron responde depois de alguns minutos (lib/instagram-comments).
import { NextRequest, NextResponse, after } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { parseInstagramWebhook, validInstagramSignature } from '@/lib/instagram';
import { handleInstagramDM } from '@/lib/support-instagram';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const token = process.env.INSTAGRAM_VERIFY_TOKEN;
  if (p.get('hub.mode') === 'subscribe' && token && p.get('hub.verify_token') === token) {
    return new NextResponse(p.get('hub.challenge') ?? '', { status: 200 });
  }
  return NextResponse.json({ error: 'forbidden' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!validInstagramSignature(raw, req.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }
  let body: unknown = null;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }
  const { dms, comments } = parseInstagramWebhook(body);
  if (dms.length || comments.length) after(async () => {
    for (const m of dms) await handleInstagramDM(m).catch(e => console.error('[instagram] dm', e));
    if (comments.length) {
      const supabase = getSupabaseAdmin();
      const ids = [...new Set(comments.map(c => c.mediaId))];
      const { data: posts } = await supabase.from('instagram_posts').select('id, ig_media_id').in('ig_media_id', ids);
      const postOf = new Map(((posts ?? []) as { id: string; ig_media_id: string }[]).map(p => [p.ig_media_id, p.id]));
      await supabase.from('instagram_comments').upsert(comments.map(c => ({
        id: c.id, post_id: postOf.get(c.mediaId) ?? null, media_id: c.mediaId, username: c.username, text: c.text, commented_at: new Date().toISOString(),
      })) as never, { onConflict: 'id', ignoreDuplicates: true });
    }
  });
  return NextResponse.json({ ok: true });
}
