// /api/friends — busca de alunos e amigos de estudo pela busca (Bearer token).
//   GET ?q=nome sobrenome   alunos que aparecem na busca, com a relação comigo
//   GET                     pedidos de amizade recebidos (pendentes)
//   POST { action: 'request', to }    pede amizade (push na hora; se já houver
//                                     pedido no sentido contrário, vira amizade)
//   POST { action: 'accept' | 'decline', from }
//   POST { action: 'searchable', value }  aparecer ou não na busca
//   POST { action: 'username', value }    trocar o @ (único)
//   GET ?me=1                              meu @ e se apareço na busca
//   GET ?blocked=1                         quem eu bloqueei
//   POST { action: 'unfriend', id }                 deixar de estudar junto (sem bloquear)
//   POST { action: 'block' | 'unblock', id }        bloquear / desbloquear
//   POST { action: 'report', id, reason, context }  denunciar (e-mail ao suporte)
// Na busca aparecem o nome completo, o @ (que diferencia homônimos), a foto e o nível.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { pushIsPt } from '@/lib/expo-notification-service';
import { friendsOf, orderedPair } from '@/lib/friends';
import { sendDirectPush } from '@/lib/rally';
import { blockedWith, isBlocked, isOffensiveHandle, isSuspended } from '@/lib/moderation';
import { sendEmail } from '@/lib/microsoft-graph-email-service';

export const dynamic = 'force-dynamic';
const MAX_REQUESTS_PER_DAY = 30;

async function authUser(req: NextRequest) {
  const h = req.headers.get('authorization') ?? '';
  if (!h.startsWith('Bearer ')) return null;
  const { data } = await getSupabaseAdmin().auth.getUser(h.slice(7));
  return data?.user ?? null;
}

const displayName = (full: string | null) => (full ?? '').trim().replace(/\s+/g, ' ');
const USERNAME_RE = /^[a-z0-9._]{3,20}$/;
const first = (full: string | null) => (full ?? '').trim().split(/\s+/)[0] || null;
const clean = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type U = { id: string; name: string | null; username: string | null; charlotte_level: string | null; avatar_url: string | null };

export async function GET(req: NextRequest) {
  const user = await authUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();

  if (req.nextUrl.searchParams.get('blocked')) {
    const { data } = await supabase.from('user_blocks').select('blocked_id').eq('blocker_id', user.id);
    const ids = ((data ?? []) as { blocked_id: string }[]).map(r => r.blocked_id);
    if (!ids.length) return NextResponse.json({ blocked: [] });
    const { data: us } = await supabase.from('charlotte_users').select('id, name, username, charlotte_level, avatar_url').in('id', ids);
    return NextResponse.json({ blocked: ((us ?? []) as U[]).map(u => ({ id: u.id, name: displayName(u.name), username: u.username, level: u.charlotte_level, avatarUrl: u.avatar_url })) });
  }

  if (req.nextUrl.searchParams.get('me')) {
    const { data } = await supabase.from('charlotte_users').select('username, searchable').eq('id', user.id).maybeSingle();
    return NextResponse.json(data ?? {});
  }

  if (!q) {
    const { data } = await supabase.from('friend_requests').select('from_id, created_at').eq('to_id', user.id).eq('status', 'pending').order('created_at', { ascending: false }).limit(30);
    const ids = ((data ?? []) as { from_id: string }[]).map(r => r.from_id);
    if (!ids.length) return NextResponse.json({ incoming: [] });
    const { data: us } = await supabase.from('charlotte_users').select('id, name, username, charlotte_level, avatar_url').in('id', ids);
    const byId = new Map(((us ?? []) as U[]).map(u => [u.id, u]));
    return NextResponse.json({
      incoming: ids.map(id => byId.get(id)).filter(Boolean).map(u => ({ id: u!.id, name: displayName(u!.name), username: u!.username, level: u!.charlotte_level, avatarUrl: u!.avatar_url })),
    });
  }

  if (q.replace('@', '').length < 2) return NextResponse.json({ results: [] });
  if (await isSuspended(user.id)) return NextResponse.json({ results: [] });
  // Busca pelo @: começa com o que foi digitado.
  if (q.startsWith('@')) {
    const handle = clean(q.slice(1)).replace(/[^a-z0-9._]/g, '');
    const { data } = await supabase.from('charlotte_users').select('id, name, username, charlotte_level, avatar_url')
      .eq('searchable', true).neq('id', user.id).ilike('username', `${handle}%`).order('username').limit(20);
    const blocked = await blockedWith(user.id);
    return NextResponse.json({ results: await withRelation(user.id, ((data ?? []) as U[]).filter(u => !blocked.has(u.id))) });
  }
  // Cada palavra precisa aparecer no nome (sem diferenciar acento e maiúscula).
  const words = clean(q).split(/\s+/).filter(Boolean).slice(0, 3);
  let query = supabase.from('charlotte_users').select('id, name, username, charlotte_level, avatar_url').eq('searchable', true).neq('id', user.id);
  for (const w of words) query = query.ilike('name', `%${w.replace(/[%_]/g, '')}%`);
  const { data: rough } = await query.limit(60);
  // ilike não ignora acento: refiltra sem acento e também busca a versão acentuada.
  const { data: wide } = words.length ? await supabase.from('charlotte_users').select('id, name, username, charlotte_level, avatar_url')
    .eq('searchable', true).neq('id', user.id).ilike('name', `%${words[0].slice(0, 3)}%`).limit(400) : { data: [] };
  const pool = new Map<string, U>();
  for (const u of [...((rough ?? []) as U[]), ...((wide ?? []) as U[])]) pool.set(u.id, u);
  const blocked = await blockedWith(user.id);
  const hits = [...pool.values()].filter(u => !blocked.has(u.id)).filter(u => { const n = clean(`${u.name ?? ''} ${u.username ?? ''}`); return words.every(w => n.includes(w)); }).slice(0, 20);
  return NextResponse.json({ results: await withRelation(user.id, hits) });
}

async function withRelation(userId: string, hits: U[]) {
  const supabase = getSupabaseAdmin();
  const ids = hits.map(h => h.id);
  const [friends, out, inc] = await Promise.all([
    friendsOf(userId),
    ids.length ? supabase.from('friend_requests').select('to_id').eq('from_id', userId).eq('status', 'pending').in('to_id', ids) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from('friend_requests').select('from_id').eq('to_id', userId).eq('status', 'pending').in('from_id', ids) : Promise.resolve({ data: [] }),
  ]);
  const pendingOut = new Set(((out.data ?? []) as { to_id: string }[]).map(r => r.to_id));
  const pendingIn = new Set(((inc.data ?? []) as { from_id: string }[]).map(r => r.from_id));
  return hits.map(u => ({
    id: u.id, name: displayName(u.name), username: u.username, level: u.charlotte_level, avatarUrl: u.avatar_url,
    relation: friends.has(u.id) ? 'friend' : pendingIn.has(u.id) ? 'pending_in' : pendingOut.has(u.id) ? 'pending_out' : null,
  }));
}

async function becomeFriends(a: string, b: string) {
  const supabase = getSupabaseAdmin();
  const [x, y] = orderedPair(a, b);
  await supabase.from('study_unfriended').delete().eq('user_a', x).eq('user_b', y);
  await supabase.from('study_friends').upsert({ user_a: x, user_b: y } as never, { onConflict: 'user_a,user_b', ignoreDuplicates: true });
  await supabase.from('friend_requests').update({ status: 'accepted', responded_at: new Date().toISOString() } as never)
    .or(`and(from_id.eq.${a},to_id.eq.${b}),and(from_id.eq.${b},to_id.eq.${a})`);
}

async function pushTo(id: string, title: (pt: boolean) => string, body: (pt: boolean) => string, type: string) {
  const { data } = await getSupabaseAdmin().from('charlotte_users').select('expo_push_token, charlotte_level, app_language').eq('id', id).maybeSingle();
  const u = data as { expo_push_token: string | null; charlotte_level: string | null; app_language: string | null } | null;
  if (!u) return;
  const pt = pushIsPt(u);
  await sendDirectPush(u.expo_push_token, title(pt), body(pt), { type, screen: 'study-together' });
}

export async function POST(req: NextRequest) {
  const user = await authUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const body = await req.json().catch(() => ({}));
  const { data: meRow } = await supabase.from('charlotte_users').select('name').eq('id', user.id).maybeSingle();
  const me = first((meRow as { name: string | null } | null)?.name ?? null);

  if (body.action === 'searchable') {
    await supabase.from('charlotte_users').update({ searchable: !!body.value } as never).eq('id', user.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'username') {
    const value = clean(String(body.value ?? '')).replace(/^@/, '').trim();
    if (!USERNAME_RE.test(value)) return NextResponse.json({ error: 'invalid_username' }, { status: 400 });
    if (isOffensiveHandle(value)) return NextResponse.json({ error: 'offensive_username' }, { status: 400 });
    const { data: taken } = await supabase.from('charlotte_users').select('id').eq('username', value).neq('id', user.id).maybeSingle();
    if (taken) return NextResponse.json({ error: 'username_taken' }, { status: 409 });
    const { error } = await supabase.from('charlotte_users').update({ username: value } as never).eq('id', user.id);
    if (error) return NextResponse.json({ error: 'username_taken' }, { status: 409 });
    return NextResponse.json({ ok: true, username: value });
  }

  if (body.action === 'unfriend') {
    const id = String(body.id ?? '');
    if (!id || id === user.id) return NextResponse.json({ error: 'invalid' }, { status: 400 });
    const [x, y] = orderedPair(user.id, id);
    await Promise.all([
      supabase.from('study_friends').delete().eq('user_a', x).eq('user_b', y),
      supabase.from('study_unfriended').upsert({ user_a: x, user_b: y } as never, { onConflict: 'user_a,user_b', ignoreDuplicates: true }),
      supabase.from('friend_requests').delete().or(`and(from_id.eq.${user.id},to_id.eq.${id}),and(from_id.eq.${id},to_id.eq.${user.id})`),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'block' || body.action === 'unblock') {
    const id = String(body.id ?? '');
    if (!id || id === user.id) return NextResponse.json({ error: 'invalid' }, { status: 400 });
    if (body.action === 'unblock') {
      await supabase.from('user_blocks').delete().eq('blocker_id', user.id).eq('blocked_id', id);
      return NextResponse.json({ ok: true });
    }
    const [x, y] = orderedPair(user.id, id);
    await Promise.all([
      supabase.from('user_blocks').upsert({ blocker_id: user.id, blocked_id: id } as never, { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true }),
      supabase.from('study_friends').delete().eq('user_a', x).eq('user_b', y),
      supabase.from('friend_requests').delete().or(`and(from_id.eq.${user.id},to_id.eq.${id}),and(from_id.eq.${id},to_id.eq.${user.id})`),
      supabase.from('rally_invites').delete().or(`and(user_id.eq.${user.id},invited_by.eq.${id}),and(user_id.eq.${id},invited_by.eq.${user.id})`),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'report') {
    const id = String(body.id ?? '');
    const reason = String(body.reason ?? 'other').slice(0, 40);
    const context = String(body.context ?? '').slice(0, 200);
    if (!id || id === user.id) return NextResponse.json({ error: 'invalid' }, { status: 400 });
    await supabase.from('user_reports').insert({ reporter_id: user.id, reported_id: id, reason, context } as never);
    const { data: who } = await supabase.from('charlotte_users').select('name, username, email').in('id', [user.id, id]);
    const rows = (who ?? []) as { name: string | null; username: string | null; email: string }[];
    const fmt = (r?: { name: string | null; username: string | null; email: string }) => r ? `${r.name ?? ''} (@${r.username ?? '?'}) <${r.email}>` : '?';
    const reporter = rows.find(r => r.email && r.email === (user.email ?? ''));
    const reported = rows.find(r => r !== reporter);
    await sendEmail({
      to: 'suporte@queizy.com',
      subject: `Denúncia de usuário: @${reported?.username ?? id}`,
      html: `<p><b>Denúncia no app (analisar em até 24h)</b></p><p>Denunciado: ${fmt(reported)}<br/>Id: ${id}</p><p>Quem denunciou: ${fmt(reporter)}</p><p>Motivo: ${reason}<br/>Contexto: ${context || '—'}</p>`,
    }).catch(() => false);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'request') {
    const to = String(body.to ?? '');
    if (!to || to === user.id) return NextResponse.json({ error: 'invalid' }, { status: 400 });
    if (await isBlocked(user.id, to)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if ((await friendsOf(user.id)).has(to)) return NextResponse.json({ ok: true, relation: 'friend' });
    // Pedido no sentido contrário já existe: vira amizade na hora.
    const { data: reverse } = await supabase.from('friend_requests').select('status').eq('from_id', to).eq('to_id', user.id).eq('status', 'pending').maybeSingle();
    if (reverse) {
      await becomeFriends(user.id, to);
      await pushTo(to, pt => (pt ? `${me ?? 'Alguém'} aceitou seu pedido` : `${me ?? 'Someone'} accepted your request`),
        pt => (pt ? 'Agora vocês são amigos de estudo. Bora competir?' : "You're now study friends. Ready to compete?"), 'friend_accepted');
      return NextResponse.json({ ok: true, relation: 'friend' });
    }
    const { count } = await supabase.from('friend_requests').select('to_id', { count: 'exact', head: true })
      .eq('from_id', user.id).gte('created_at', new Date(Date.now() - 86400000).toISOString());
    if ((count ?? 0) >= MAX_REQUESTS_PER_DAY) return NextResponse.json({ error: 'too_many' }, { status: 429 });
    const { data: target } = await supabase.from('charlotte_users').select('id, searchable').eq('id', to).maybeSingle();
    if (!target || !(target as { searchable: boolean }).searchable) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const { error } = await supabase.from('friend_requests').upsert({ from_id: user.id, to_id: to, status: 'pending', created_at: new Date().toISOString(), responded_at: null } as never, { onConflict: 'from_id,to_id' });
    if (error) return NextResponse.json({ error: 'failed' }, { status: 500 });
    await pushTo(to, pt => (pt ? `${me ?? 'Alguém'} quer estudar com você` : `${me ?? 'Someone'} wants to study with you`),
      pt => (pt ? 'Aceite para virarem amigos de estudo, se cutucarem e competirem juntos.' : 'Accept to become study friends, nudge each other and compete together.'), 'friend_request');
    return NextResponse.json({ ok: true, relation: 'pending_out' });
  }

  if (body.action === 'accept' || body.action === 'decline') {
    const from = String(body.from ?? '');
    const { data: reqRow } = await supabase.from('friend_requests').select('status').eq('from_id', from).eq('to_id', user.id).eq('status', 'pending').maybeSingle();
    if (!reqRow) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (body.action === 'decline') {
      await supabase.from('friend_requests').update({ status: 'declined', responded_at: new Date().toISOString() } as never).eq('from_id', from).eq('to_id', user.id);
      return NextResponse.json({ ok: true });
    }
    await becomeFriends(from, user.id);
    await pushTo(from, pt => (pt ? `${me ?? 'Alguém'} aceitou seu pedido` : `${me ?? 'Someone'} accepted your request`),
      pt => (pt ? 'Agora vocês são amigos de estudo. Bora competir?' : "You're now study friends. Ready to compete?"), 'friend_accepted');
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
}
