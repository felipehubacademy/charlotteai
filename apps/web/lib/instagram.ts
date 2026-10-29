// lib/instagram.ts — API do Instagram (login do Instagram, graph.instagram.com) para o @queizyapp.
// Publicação agendada, comentários e mensagens diretas. App da Meta: "Queizy Suporte" (caso de uso
// "Gerir mensagens e conteúdos no Instagram").
//
// Chave de acesso: vale 60 dias. A primeira vem da env INSTAGRAM_ACCESS_TOKEN; depois fica em
// public.instagram_auth e o cron renova (refresh_access_token) antes de vencer.
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const GRAPH = `https://graph.instagram.com/${process.env.INSTAGRAM_GRAPH_VERSION || 'v23.0'}`;
const RENOVAR_COM_DIAS = 20; // renova quando faltar menos que isso (e a chave tiver mais de 24 h)

export interface IgAuth { token: string; igUserId: string; username: string | null }
export type IgResult<T> = { ok: true; data: T } | { ok: false; error: string };

export const instagramConfigured = () => !!process.env.INSTAGRAM_ACCESS_TOKEN;

/** Assinatura do webhook (x-hub-signature-256) com o app secret do Instagram. */
export function validInstagramSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.INSTAGRAM_APP_SECRET;
  if (!secret || !header?.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const got = header.slice(7);
  return got.length === expected.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

async function call<T>(method: 'GET' | 'POST', path: string, token: string, params: Record<string, unknown> = {}): Promise<IgResult<T>> {
  try {
    const url = new URL(path.startsWith('http') ? path : `${GRAPH}/${path.replace(/^\//, '')}`);
    let init: RequestInit = { method, headers: { Authorization: `Bearer ${token}` } };
    if (method === 'GET') for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    else init = { ...init, headers: { ...init.headers, 'Content-Type': 'application/json' }, body: JSON.stringify(params) };
    const res = await fetch(url, init);
    const j = await res.json().catch(() => ({})) as { error?: { message?: string; error_user_msg?: string } } & T;
    if (!res.ok || j.error) return { ok: false, error: j.error?.error_user_msg || j.error?.message || `HTTP ${res.status}` };
    return { ok: true, data: j };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Chave atual e o id da conta profissional. Chave nova colada na env substitui a do banco. */
export async function getInstagramAuth(): Promise<IgAuth | null> {
  const supabase = getSupabaseAdmin();
  const envToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const envHash = envToken ? crypto.createHash('sha256').update(envToken).digest('hex').slice(0, 16) : null;
  const { data } = await supabase.from('instagram_auth').select('access_token, ig_user_id, username, env_hash').eq('id', 1).maybeSingle();
  const row = data as { access_token: string; ig_user_id: string | null; username: string | null; env_hash: string | null } | null;
  // A do banco vale enquanto veio da mesma chave da env (ela pode ter sido renovada pelo cron).
  if (row?.ig_user_id && (!envHash || row.env_hash === envHash)) return { token: row.access_token, igUserId: row.ig_user_id, username: row.username };
  if (!envToken) return null;
  const me = await call<{ user_id?: string; id: string; username?: string }>('GET', 'me', envToken, { fields: 'user_id,username' });
  if (!me.ok) { console.error('[instagram] me', me.error); return null; }
  const igUserId = me.data.user_id ?? me.data.id;
  await supabase.from('instagram_auth').upsert({
    id: 1, access_token: envToken, env_hash: envHash, ig_user_id: igUserId, username: me.data.username ?? null,
    refreshed_at: new Date().toISOString(), expires_at: null,
  } as never);
  return { token: envToken, igUserId, username: me.data.username ?? null };
}

/** Renova a chave quando estiver perto de vencer. Chamado pelo cron. */
export async function refreshInstagramTokenIfNeeded(): Promise<{ refreshed: boolean; error?: string }> {
  const auth = await getInstagramAuth();
  if (!auth) return { refreshed: false, error: 'sem chave' };
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('instagram_auth').select('expires_at, refreshed_at').eq('id', 1).maybeSingle();
  const row = data as { expires_at: string | null; refreshed_at: string } | null;
  const idadeH = row ? (Date.now() - new Date(row.refreshed_at).getTime()) / 3600000 : 0;
  const faltamDias = row?.expires_at ? (new Date(row.expires_at).getTime() - Date.now()) / 86400000 : null;
  // Sem data de validade conhecida: renova depois de 24 h para passar a saber.
  if (idadeH < 24 || (faltamDias !== null && faltamDias > RENOVAR_COM_DIAS)) return { refreshed: false };
  const r = await call<{ access_token: string; expires_in: number }>('GET', 'https://graph.instagram.com/refresh_access_token', auth.token, { grant_type: 'ig_refresh_token', access_token: auth.token });
  if (!r.ok) return { refreshed: false, error: r.error };
  await supabase.from('instagram_auth').update({
    access_token: r.data.access_token, refreshed_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + r.data.expires_in * 1000).toISOString(),
  } as never).eq('id', 1);
  return { refreshed: true };
}

// ── Publicação ──────────────────────────────────────────────────────────────

export interface IgMedia { url: string; type: 'image' | 'video' }

/** Cria o(s) contêiner(es) do post na Meta. A publicação vem depois, quando o contêiner estiver pronto. */
export async function createContainer(auth: IgAuth, post: { kind: 'image' | 'carousel' | 'reels'; caption: string; media: IgMedia[]; cover_url: string | null }): Promise<IgResult<string>> {
  const u = auth.igUserId;
  if (post.kind === 'reels') {
    const video = post.media.find(m => m.type === 'video');
    if (!video) return { ok: false, error: 'Reels sem vídeo' };
    const r = await call<{ id: string }>('POST', `${u}/media`, auth.token, {
      media_type: 'REELS', video_url: video.url, caption: post.caption, share_to_feed: true,
      ...(post.cover_url ? { cover_url: post.cover_url } : {}),
    });
    return r.ok ? { ok: true, data: r.data.id } : r;
  }
  if (post.kind === 'image' || post.media.length === 1) {
    const r = await call<{ id: string }>('POST', `${u}/media`, auth.token, { image_url: post.media[0]?.url, caption: post.caption });
    return r.ok ? { ok: true, data: r.data.id } : r;
  }
  const filhos: string[] = [];
  for (const m of post.media.slice(0, 10)) {
    const r = await call<{ id: string }>('POST', `${u}/media`, auth.token,
      m.type === 'video' ? { media_type: 'VIDEO', video_url: m.url, is_carousel_item: true } : { image_url: m.url, is_carousel_item: true });
    if (!r.ok) return r;
    filhos.push(r.data.id);
  }
  const r = await call<{ id: string }>('POST', `${u}/media`, auth.token, { media_type: 'CAROUSEL', children: filhos.join(','), caption: post.caption });
  return r.ok ? { ok: true, data: r.data.id } : r;
}

/** FINISHED = pronto para publicar; IN_PROGRESS = a Meta ainda processa (vídeo); ERROR/EXPIRED = refazer. */
export async function containerStatus(auth: IgAuth, containerId: string): Promise<IgResult<string>> {
  const r = await call<{ status_code: string }>('GET', containerId, auth.token, { fields: 'status_code' });
  return r.ok ? { ok: true, data: r.data.status_code } : r;
}

export async function publishContainer(auth: IgAuth, containerId: string): Promise<IgResult<{ mediaId: string; permalink: string | null }>> {
  const r = await call<{ id: string }>('POST', `${auth.igUserId}/media_publish`, auth.token, { creation_id: containerId });
  if (!r.ok) return r;
  const p = await call<{ permalink?: string }>('GET', r.data.id, auth.token, { fields: 'permalink' });
  return { ok: true, data: { mediaId: r.data.id, permalink: p.ok ? p.data.permalink ?? null : null } };
}

// ── Comentários ─────────────────────────────────────────────────────────────

export interface IgComment { id: string; text: string; username: string | null; timestamp: string; fromId: string | null }

export async function listComments(auth: IgAuth, mediaId: string): Promise<IgResult<IgComment[]>> {
  const r = await call<{ data: { id: string; text?: string; username?: string; timestamp: string; from?: { id: string } }[] }>(
    'GET', `${mediaId}/comments`, auth.token, { fields: 'id,text,username,timestamp,from', limit: 50 });
  if (!r.ok) return r;
  return { ok: true, data: r.data.data.map(c => ({ id: c.id, text: c.text ?? '', username: c.username ?? null, timestamp: c.timestamp, fromId: c.from?.id ?? null })) };
}

export async function replyToComment(auth: IgAuth, commentId: string, message: string): Promise<IgResult<string>> {
  const r = await call<{ id: string }>('POST', `${commentId}/replies`, auth.token, { message });
  return r.ok ? { ok: true, data: r.data.id } : r;
}

export async function hideComment(auth: IgAuth, commentId: string): Promise<IgResult<true>> {
  const r = await call<{ success: boolean }>('POST', commentId, auth.token, { hide: true });
  return r.ok ? { ok: true, data: true } : r;
}

// ── Mensagens diretas ───────────────────────────────────────────────────────

/** Responde uma DM. A Meta só permite resposta livre até 24 h depois da última mensagem da pessoa. */
export async function sendInstagramText(recipientId: string, text: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const auth = await getInstagramAuth();
  if (!auth) return { ok: false, error: 'Instagram não configurado' };
  const r = await call<{ message_id: string }>('POST', `${auth.igUserId}/messages`, auth.token, { recipient: { id: recipientId }, message: { text: text.slice(0, 1000) } });
  return r.ok ? { ok: true, id: r.data.message_id } : { ok: false, error: r.error };
}

/** Nome e @ de quem mandou a DM (pode falhar se a Meta não liberar o perfil). */
export async function instagramProfile(userId: string): Promise<{ name: string | null; username: string | null }> {
  const auth = await getInstagramAuth();
  if (!auth) return { name: null, username: null };
  const r = await call<{ name?: string; username?: string }>('GET', userId, auth.token, { fields: 'name,username' });
  return r.ok ? { name: r.data.name ?? null, username: r.data.username ?? null } : { name: null, username: null };
}

export interface IncomingInstagramDM { id: string; from: string; text: string | null; hasAttachment: boolean; timestamp: number }
export interface IncomingInstagramComment { id: string; mediaId: string; text: string; username: string | null; fromId: string | null }

/** Webhook: DMs recebidas (ignora as nossas próprias, "echo") e comentários novos. */
export function parseInstagramWebhook(body: unknown): { dms: IncomingInstagramDM[]; comments: IncomingInstagramComment[] } {
  const dms: IncomingInstagramDM[] = [], comments: IncomingInstagramComment[] = [];
  const b = body as { object?: string; entry?: { id: string; messaging?: unknown[]; changes?: { field: string; value: unknown }[] }[] };
  if (b?.object !== 'instagram') return { dms, comments };
  for (const e of b.entry ?? []) {
    for (const raw of e.messaging ?? []) {
      const m = raw as { sender?: { id: string }; timestamp?: number; message?: { mid: string; text?: string; is_echo?: boolean; attachments?: unknown[] } };
      if (!m.message || m.message.is_echo || !m.sender?.id || m.sender.id === e.id) continue;
      dms.push({ id: m.message.mid, from: m.sender.id, text: m.message.text ?? null, hasAttachment: !!m.message.attachments?.length, timestamp: m.timestamp ?? Date.now() });
    }
    for (const ch of e.changes ?? []) {
      if (ch.field !== 'comments') continue;
      const v = ch.value as { id: string; text?: string; from?: { id: string; username?: string }; media?: { id: string } };
      if (v?.id && v.media?.id && v.from?.id !== e.id) comments.push({ id: v.id, mediaId: v.media.id, text: v.text ?? '', username: v.from?.username ?? null, fromId: v.from?.id ?? null });
    }
  }
  return { dms, comments };
}
