// /api/social — comunidade (Bearer token do aluno).
//   GET  ?lang=pt|en   "estudando agora" (pessoas e amigos), pedidos de amizade e
//                      convites de competição esperando resposta, e conquistas
//                      recentes de quem está no seu ranking (últimos 3 dias)
//   POST { action: 'cheer', id }   dá parabéns numa conquista (push na hora)
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { pushIsPt } from '@/lib/expo-notification-service';
import { firstName, sendDirectPush } from '@/lib/rally';
import { friendsOf } from '@/lib/friends';
import { blockedWith, isBlocked } from '@/lib/moderation';

export const dynamic = 'force-dynamic';
const NOW_WINDOW_MIN = 15;

async function authUser(req: NextRequest) {
  const h = req.headers.get('authorization') ?? '';
  if (!h.startsWith('Bearer ')) return null;
  const { data } = await getSupabaseAdmin().auth.getUser(h.slice(7));
  return data?.user ?? null;
}

export async function GET(req: NextRequest) {
  const user = await authUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdmin();

  const since = new Date(Date.now() - NOW_WINDOW_MIN * 60000).toISOString();
  const [{ data: recent }, { data: me }, friends] = await Promise.all([
    supabase.from('charlotte_practices').select('user_id').gte('created_at', since).limit(5000),
    supabase.from('charlotte_users').select('charlotte_level').eq('id', user.id).maybeSingle(),
    friendsOf(user.id),
  ]);
  const active = new Set(((recent ?? []) as { user_id: string }[]).map(r => r.user_id));
  active.delete(user.id);
  const buddyIds = [...friends.keys()].filter(id => active.has(id));
  let buddiesNow: string[] = [];
  if (buddyIds.length) {
    const { data } = await supabase.from('charlotte_users').select('name').in('id', buddyIds);
    buddiesNow = ((data ?? []) as { name: string | null }[]).map(u => firstName(u.name)).filter(Boolean) as string[];
  }

  // Conquistas recentes de quem está no mesmo ranking (nível).
  const level = (me as { charlotte_level: string | null } | null)?.charlotte_level ?? 'Novice';
  const { data: board } = await supabase.from('charlotte_leaderboard_cache').select('user_id, display_name').eq('user_level', level).order('total_xp', { ascending: false }).limit(100);
  const blocked = await blockedWith(user.id);
  const boardRows = ((board ?? []) as { user_id: string; display_name: string | null }[]).filter(r => r.user_id !== user.id && !blocked.has(r.user_id));
  const nameOf = new Map(boardRows.map(r => [r.user_id, r.display_name]));
  let feed: unknown[] = [];
  if (boardRows.length) {
    const { data: ach } = await supabase.from('user_achievements')
      .select('id, user_id, achievement_code, achievement_name, rarity, category, earned_at')
      .in('user_id', boardRows.map(r => r.user_id))
      .gte('earned_at', new Date(Date.now() - 3 * 86400000).toISOString())
      .order('earned_at', { ascending: false }).limit(20);
    const rows = (ach ?? []) as { id: string; user_id: string; achievement_code: string; achievement_name: string; rarity: string; category: string; earned_at: string }[];
    const { data: cheered } = rows.length
      ? await supabase.from('achievement_cheers').select('user_achievement_id').eq('from_id', user.id).in('user_achievement_id', rows.map(r => r.id))
      : { data: [] };
    const done = new Set(((cheered ?? []) as { user_achievement_id: string }[]).map(c => c.user_achievement_id));
    feed = rows.map(r => ({
      id: r.id, userId: r.user_id, name: nameOf.get(r.user_id) ?? null,
      code: r.achievement_code, title: r.achievement_name, rarity: r.rarity, category: r.category,
      earnedAt: r.earned_at, cheered: done.has(r.id),
    }));
  }

  // Esperando resposta: pedidos de amizade e convites de competição ainda abertos.
  const [{ data: reqs }, { data: invs }] = await Promise.all([
    supabase.from('friend_requests').select('from_id').eq('to_id', user.id).eq('status', 'pending').order('created_at', { ascending: false }).limit(20),
    supabase.from('rally_invites').select('invited_by, rallies!inner(ends_at, finalized)').eq('user_id', user.id).limit(20),
  ]);
  const reqIds = ((reqs ?? []) as { from_id: string }[]).map(r => r.from_id).filter(id => !blocked.has(id));
  const nowIso = new Date().toISOString();
  const invIds = ((invs ?? []) as unknown as { invited_by: string; rallies: { ends_at: string; finalized: boolean } }[])
    .filter(i => !i.rallies.finalized && i.rallies.ends_at > nowIso && !blocked.has(i.invited_by)).map(i => i.invited_by);
  const pendIds = [...new Set([...reqIds, ...invIds])];
  const { data: pendUsers } = pendIds.length ? await supabase.from('charlotte_users').select('id, name').in('id', pendIds) : { data: [] };
  const pn = new Map(((pendUsers ?? []) as { id: string; name: string | null }[]).map(u => [u.id, firstName(u.name)]));
  const pendingRequests = reqIds.map(id => pn.get(id)).filter(Boolean) as string[];
  const rallyInvites = invIds.map(id => pn.get(id)).filter(Boolean) as string[];

  return NextResponse.json({ studyingNow: active.size, buddiesNow, pendingRequests, rallyInvites, feed });
}

export async function POST(req: NextRequest) {
  const user = await authUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const body = await req.json().catch(() => ({}));
  if (body.action !== 'cheer') return NextResponse.json({ error: 'invalid_action' }, { status: 400 });

  const { data: row } = await supabase.from('user_achievements').select('id, user_id, achievement_name').eq('id', String(body.id ?? '')).maybeSingle();
  const ach = row as { id: string; user_id: string; achievement_name: string } | null;
  if (!ach) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (ach.user_id === user.id) return NextResponse.json({ error: 'own' }, { status: 400 });
  if (await isBlocked(user.id, ach.user_id)) return NextResponse.json({ ok: true, already: true });

  const { error } = await supabase.from('achievement_cheers').insert({ from_id: user.id, to_id: ach.user_id, user_achievement_id: ach.id } as never);
  if (error) return NextResponse.json({ ok: true, already: true });

  const [{ data: fromRow }, { data: toRow }] = await Promise.all([
    supabase.from('charlotte_users').select('name').eq('id', user.id).maybeSingle(),
    supabase.from('charlotte_users').select('expo_push_token, charlotte_level, app_language').eq('id', ach.user_id).maybeSingle(),
  ]);
  const target = toRow as { expo_push_token: string | null; charlotte_level: string | null; app_language: string | null } | null;
  if (target) {
    const pt = pushIsPt(target);
    const from = firstName((fromRow as { name: string | null } | null)?.name) ?? (pt ? 'Alguém do ranking' : 'Someone on the leaderboard');
    await sendDirectPush(target.expo_push_token,
      pt ? `${from} te deu parabéns` : `${from} congratulated you`,
      pt ? `Pela conquista "${ach.achievement_name}". Continue assim!` : `For your "${ach.achievement_name}" achievement. Keep it up!`,
      { type: 'achievement_cheer', screen: 'achievements' });
  }
  return NextResponse.json({ ok: true });
}
