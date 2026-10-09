// /api/rally — Rallies (disputas de 24 horas ou 7 dias). Bearer token do aluno.
//   GET                                          meus rallies (ativos e últimos encerrados) + convites pendentes
//   POST { action: 'create', metric, hours, invite: [userId] }   cria e convida (push na hora)
//   POST { action: 'join', code }                 entra pelo código (convite ou link)
//   POST { action: 'decline', code }              recusa um convite
//   POST { action: 'rematch', code }              cria a revanche com os mesmos participantes
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { pushIsPt } from '@/lib/expo-notification-service';
import { friendsOf } from '@/lib/friends';
import { isBlocked, isSuspended } from '@/lib/moderation';
import {
  RALLY_METRICS, RALLY_DURATIONS, RALLY_MAX_PARTICIPANTS, RALLY_MAX_ACTIVE_CREATED,
  computeStandings, rallyLabel, firstName, sendDirectPush, type RallyRow, type RallyMetric,
} from '@/lib/rally';

export const dynamic = 'force-dynamic';
const SITE = 'https://queizy.com';

async function authUser(req: NextRequest) {
  const h = req.headers.get('authorization') ?? '';
  if (!h.startsWith('Bearer ')) return null;
  const { data } = await getSupabaseAdmin().auth.getUser(h.slice(7));
  return data?.user ?? null;
}

const newCode = () => randomBytes(4).toString('hex').toUpperCase().replace(/[01]/g, 'X').slice(0, 6);
const cleanCode = (c: unknown) => String(c ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

type PushUser = { id: string; name: string | null; expo_push_token: string | null; charlotte_level: string | null; app_language: string | null };
async function usersById(ids: string[]): Promise<Map<string, PushUser>> {
  if (!ids.length) return new Map();
  const { data } = await getSupabaseAdmin().from('charlotte_users').select('id, name, expo_push_token, charlotte_level, app_language').in('id', ids);
  return new Map(((data ?? []) as PushUser[]).map(u => [u.id, u]));
}

/** Só amigos de estudo (convite ou busca) podem ser convidados pelo app. */
async function buddiesOf(userId: string): Promise<Set<string>> {
  return new Set((await friendsOf(userId)).keys());
}

async function createRally(userId: string, metric: RallyMetric, hours: number, invite: string[]) {
  const supabase = getSupabaseAdmin();
  const { count } = await supabase.from('rallies').select('id', { count: 'exact', head: true })
    .eq('creator_id', userId).eq('finalized', false).gt('ends_at', new Date().toISOString());
  if ((count ?? 0) >= RALLY_MAX_ACTIVE_CREATED) return { error: 'too_many_active', status: 429 } as const;

  let rally: RallyRow | null = null;
  for (let i = 0; i < 5 && !rally; i++) {
    const { data } = await supabase.from('rallies').insert({
      code: newCode(), creator_id: userId, metric, duration_hours: hours,
      ends_at: new Date(Date.now() + hours * 3600000).toISOString(),
    } as never).select('*').maybeSingle();
    rally = data as RallyRow | null;
  }
  if (!rally) return { error: 'create_failed', status: 500 } as const;
  await supabase.from('rally_participants').insert({ rally_id: rally.id, user_id: userId } as never);

  const buddies = await buddiesOf(userId);
  const targets = [...new Set(invite)].filter(id => buddies.has(id) && id !== userId).slice(0, RALLY_MAX_PARTICIPANTS - 1);
  if (targets.length) {
    await supabase.from('rally_invites').insert(targets.map(t => ({ rally_id: rally!.id, user_id: t, invited_by: userId })) as never);
    const people = await usersById([userId, ...targets]);
    const me = firstName(people.get(userId)?.name) ?? null;
    await Promise.all(targets.map(t => {
      const u = people.get(t); if (!u) return null;
      const pt = pushIsPt(u);
      return sendDirectPush(u.expo_push_token,
        pt ? `${me ?? 'Alguém'} te chamou para uma competição` : `${me ?? 'Someone'} challenged you`,
        pt ? `${rallyLabel(metric, hours, true)}. Topa?` : `${rallyLabel(metric, hours, false)}. You in?`,
        { type: 'rally_invite', screen: 'study-together', code: rally!.code });
    }));
  }
  return { rally } as const;
}

export async function GET(req: NextRequest) {
  const user = await authUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const lang = req.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'pt';
  const pt = lang === 'pt';

  const [{ data: mine }, { data: invites }] = await Promise.all([
    supabase.from('rally_participants').select('rally_id').eq('user_id', user.id),
    supabase.from('rally_invites').select('rally_id, invited_by').eq('user_id', user.id),
  ]);
  const myIds = ((mine ?? []) as { rally_id: string }[]).map(r => r.rally_id);
  const invIds = ((invites ?? []) as { rally_id: string; invited_by: string }[]).map(r => r.rally_id).filter(id => !myIds.includes(id));
  const ids = [...new Set([...myIds, ...invIds])];
  if (!ids.length) return NextResponse.json({ active: [], finished: [], invites: [] });

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: rows } = await supabase.from('rallies').select('*').in('id', ids).gte('ends_at', weekAgo).order('ends_at', { ascending: true });
  const rallies = (rows ?? []) as unknown as RallyRow[];
  const standings = await computeStandings(rallies);
  const creators = await usersById([...new Set(rallies.map(r => r.creator_id))]);
  const now = Date.now();

  const view = (r: RallyRow) => ({
    code: r.code, metric: r.metric, hours: r.duration_hours, title: rallyLabel(r.metric, r.duration_hours, pt),
    startsAt: r.starts_at, endsAt: r.ends_at, finished: r.finalized || new Date(r.ends_at).getTime() <= now,
    creator: firstName(creators.get(r.creator_id)?.name), isCreator: r.creator_id === user.id,
    winnerId: r.winner_id, link: `${SITE}/r/${r.code}`,
    standings: (standings.get(r.id) ?? []).map(s => ({ ...s, isMe: s.userId === user.id })),
  });
  const joined = rallies.filter(r => myIds.includes(r.id));
  return NextResponse.json({
    active: joined.filter(r => !r.finalized && new Date(r.ends_at).getTime() > now).map(view),
    finished: joined.filter(r => r.finalized || new Date(r.ends_at).getTime() <= now).reverse().slice(0, 5).map(view),
    invites: rallies.filter(r => invIds.includes(r.id) && !r.finalized && new Date(r.ends_at).getTime() > now).map(view),
  });
}

export async function POST(req: NextRequest) {
  const user = await authUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const body = await req.json().catch(() => ({}));
  if ((body.action === 'create' || body.action === 'join' || body.action === 'rematch') && await isSuspended(user.id)) {
    return NextResponse.json({ error: 'suspended' }, { status: 403 });
  }

  if (body.action === 'create') {
    const metric = body.metric as RallyMetric;
    const hours = Number(body.hours);
    if (!RALLY_METRICS.includes(metric) || !(RALLY_DURATIONS as readonly number[]).includes(hours)) {
      return NextResponse.json({ error: 'invalid' }, { status: 400 });
    }
    const r = await createRally(user.id, metric, hours, Array.isArray(body.invite) ? body.invite.map(String) : []);
    if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json({ ok: true, code: r.rally.code, link: `${SITE}/r/${r.rally.code}` });
  }

  const code = cleanCode(body.code);
  if (!code) return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
  const { data: row } = await supabase.from('rallies').select('*').eq('code', code).maybeSingle();
  const rally = row as RallyRow | null;
  if (!rally) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (body.action === 'join') {
    if (rally.finalized || new Date(rally.ends_at).getTime() <= Date.now()) return NextResponse.json({ error: 'ended' }, { status: 400 });
    if (await isBlocked(user.id, rally.creator_id)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const { count } = await supabase.from('rally_participants').select('user_id', { count: 'exact', head: true }).eq('rally_id', rally.id);
    if ((count ?? 0) >= RALLY_MAX_PARTICIPANTS) return NextResponse.json({ error: 'full' }, { status: 400 });
    const { error } = await supabase.from('rally_participants').insert({ rally_id: rally.id, user_id: user.id } as never);
    await supabase.from('rally_invites').delete().eq('rally_id', rally.id).eq('user_id', user.id);
    if (error) return NextResponse.json({ ok: true, already: true, code });
    const people = await usersById([user.id, rally.creator_id]);
    const creator = people.get(rally.creator_id);
    if (creator && creator.id !== user.id) {
      const pt = pushIsPt(creator);
      const who = firstName(people.get(user.id)?.name) ?? (pt ? 'Alguém' : 'Someone');
      await sendDirectPush(creator.expo_push_token,
        pt ? `${who} entrou na sua competição` : `${who} joined your challenge`,
        pt ? `${rallyLabel(rally.metric, rally.duration_hours, true)}. Que vença o melhor!` : `${rallyLabel(rally.metric, rally.duration_hours, false)}. May the best one win!`,
        { type: 'rally_update', screen: 'study-together', code });
    }
    return NextResponse.json({ ok: true, code });
  }

  if (body.action === 'decline') {
    await supabase.from('rally_invites').delete().eq('rally_id', rally.id).eq('user_id', user.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'rematch') {
    const { data: parts } = await supabase.from('rally_participants').select('user_id').eq('rally_id', rally.id);
    const ids = ((parts ?? []) as { user_id: string }[]).map(p => p.user_id);
    if (!ids.includes(user.id)) return NextResponse.json({ error: 'not_participant' }, { status: 403 });
    const r = await createRally(user.id, rally.metric, rally.duration_hours, ids.filter(i => i !== user.id));
    if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json({ ok: true, code: r.rally.code, link: `${SITE}/r/${r.rally.code}` });
  }

  return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
}
