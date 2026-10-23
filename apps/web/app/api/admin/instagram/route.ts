// /api/admin/instagram — aba Instagram do /admin (calendário, aprovação e comentários do @queizyapp).
//   GET  ?view=posts       posts de 2 dias atrás até 40 dias à frente
//   GET  ?view=comments    últimos comentários e o que a IA fez
//   GET  ?view=status      conta conectada, validade da chave, contagens
//   POST { action: 'approve', ids }                aprova (só sai o que estiver aprovado)
//   POST { action: 'unapprove', id }               volta para rascunho (antes de preparar)
//   POST { action: 'cancel', id }                  cancela
//   POST { action: 'update', id, caption?, scheduled_at? }   edita legenda ou horário (antes de preparar)
//   POST { action: 'retry', id }                   post com erro volta para aprovado
//   POST { action: 'reply_comment', id, text }     responde um comentário pelo /admin
//   POST { action: 'hide_comment', id }            oculta um comentário
//   POST { action: 'resolve_comment', id }         marca como resolvido sem responder
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin, audit } from '@/lib/admin-auth';
import { getInstagramAuth, replyToComment, hideComment, instagramConfigured } from '@/lib/instagram';

export const dynamic = 'force-dynamic';
const AREA = 'notifications' as const; // publicar para o público, como os envios em massa

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req, AREA);
  if (admin instanceof NextResponse) return admin;
  const supabase = getSupabaseAdmin();
  const view = req.nextUrl.searchParams.get('view') ?? 'posts';

  if (view === 'comments') {
    const { data } = await supabase.from('instagram_comments')
      .select('id, username, text, commented_at, action, category, reply_text, replied_by, note, handled_at, post_id, instagram_posts(source_key, linha, permalink)')
      .order('created_at', { ascending: false }).limit(150);
    return NextResponse.json({ comments: data ?? [] });
  }
  if (view === 'status') {
    const { data } = await supabase.from('instagram_auth').select('username, expires_at, refreshed_at').eq('id', 1).maybeSingle();
    const { data: st } = await supabase.from('instagram_posts').select('status');
    const counts: Record<string, number> = {};
    for (const r of (st ?? []) as { status: string }[]) counts[r.status] = (counts[r.status] ?? 0) + 1;
    const { count: escalados } = await supabase.from('instagram_comments').select('id', { count: 'exact', head: true }).eq('action', 'escalado');
    return NextResponse.json({ configured: instagramConfigured(), auth: data ?? null, counts, escalados: escalados ?? 0 });
  }
  const from = new Date(Date.now() - 2 * 86400000).toISOString();
  const to = new Date(Date.now() + 40 * 86400000).toISOString();
  const { data } = await supabase.from('instagram_posts')
    .select('id, source_key, scheduled_at, linha, kind, caption, media, cover_url, status, approved_by, approved_at, permalink, error, attempts, published_at')
    .gte('scheduled_at', from).lte('scheduled_at', to).order('scheduled_at');
  return NextResponse.json({ posts: data ?? [] });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, AREA);
  if (admin instanceof NextResponse) return admin;
  const supabase = getSupabaseAdmin();
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const now = new Date().toISOString();
  const who = admin.email ?? admin.name ?? 'admin';

  switch (body.action) {
    case 'approve': {
      const ids = (Array.isArray(body.ids) ? body.ids : [body.id]).map(String).filter(Boolean);
      const { data } = await supabase.from('instagram_posts').update({ status: 'aprovado', approved_by: who, approved_at: now, error: null, attempts: 0, updated_at: now } as never)
        .in('id', ids).eq('status', 'rascunho').select('id');
      await audit(admin, 'instagram.approve', 'instagram_post', ids.join(','));
      return NextResponse.json({ ok: true, approved: (data ?? []).length });
    }
    case 'unapprove':
    case 'cancel': {
      const id = String(body.id ?? '');
      const status = body.action === 'cancel' ? 'cancelado' : 'rascunho';
      const { data } = await supabase.from('instagram_posts').update({ status, approved_by: null, approved_at: null, updated_at: now } as never)
        .eq('id', id).in('status', ['rascunho', 'aprovado', 'erro']).select('id');
      if (!(data ?? []).length) return NextResponse.json({ error: 'Esse post já está sendo publicado ou já saiu.' }, { status: 400 });
      await audit(admin, `instagram.${body.action}`, 'instagram_post', id);
      return NextResponse.json({ ok: true });
    }
    case 'retry': {
      const id = String(body.id ?? '');
      await supabase.from('instagram_posts').update({ status: 'aprovado', attempts: 0, error: null, ig_container_id: null, updated_at: now } as never).eq('id', id).eq('status', 'erro');
      await audit(admin, 'instagram.retry', 'instagram_post', id);
      return NextResponse.json({ ok: true });
    }
    case 'update': {
      const id = String(body.id ?? '');
      const patch: Record<string, unknown> = { updated_at: now };
      if (typeof body.caption === 'string') patch.caption = body.caption.slice(0, 2200);
      if (typeof body.scheduled_at === 'string' && !Number.isNaN(Date.parse(body.scheduled_at))) patch.scheduled_at = new Date(body.scheduled_at).toISOString();
      const { data } = await supabase.from('instagram_posts').update(patch as never).eq('id', id).in('status', ['rascunho', 'aprovado', 'erro']).select('id');
      if (!(data ?? []).length) return NextResponse.json({ error: 'Esse post já está sendo publicado ou já saiu.' }, { status: 400 });
      await audit(admin, 'instagram.update', 'instagram_post', id, { fields: Object.keys(patch) });
      return NextResponse.json({ ok: true });
    }
    case 'reply_comment':
    case 'hide_comment': {
      const id = String(body.id ?? '');
      const auth = await getInstagramAuth();
      if (!auth) return NextResponse.json({ error: 'Instagram não configurado.' }, { status: 400 });
      if (body.action === 'reply_comment') {
        const text = String(body.text ?? '').trim();
        if (!text) return NextResponse.json({ error: 'Escreva a resposta.' }, { status: 400 });
        const r = await replyToComment(auth, id, text);
        if (!r.ok) return NextResponse.json({ error: `Não foi possível responder: ${r.error}` }, { status: 502 });
        await supabase.from('instagram_comments').update({ action: 'respondido', reply_text: text, reply_id: r.data, replied_by: who, handled_at: now } as never).eq('id', id);
      } else {
        const r = await hideComment(auth, id);
        if (!r.ok) return NextResponse.json({ error: `Não foi possível ocultar: ${r.error}` }, { status: 502 });
        await supabase.from('instagram_comments').update({ action: 'oculto', replied_by: who, handled_at: now } as never).eq('id', id);
      }
      await audit(admin, `instagram.${body.action}`, 'instagram_comment', id);
      return NextResponse.json({ ok: true });
    }
    case 'resolve_comment': {
      const id = String(body.id ?? '');
      await supabase.from('instagram_comments').update({ action: 'ignorado', replied_by: who, handled_at: now } as never).eq('id', id);
      return NextResponse.json({ ok: true });
    }
  }
  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}
