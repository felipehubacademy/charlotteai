// /api/referral — convites "Estudar junto" (Bearer token do aluno).
//   GET                              meu código, link, dupla(s) e padrinho
//   POST { action: 'claim', code }   aceita um convite (conta nova); vira dupla
//   POST { action: 'nudge', to, key } cutuca alguém da dupla (1 por dia)
//
// Quem convida e quem é convidado ganham minutos de Live Voice de bônus quando
// o convite é aceito. Cutucadas usam só mensagens prontas: nada de texto livre,
// nada para moderar.
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { pushIsPt } from '@/lib/expo-notification-service';
import { friendsOf } from '@/lib/friends';

export const dynamic = 'force-dynamic';

const SITE = 'https://queizy.com';
const REWARD_SECONDS = 5 * 60;
const CLAIM_WINDOW_DAYS = 14;
const DAY = 86400000;

// Mensagens prontas das cutucadas (mesmas chaves no app).
const NUDGES: Record<string, { pt: string; en: string }> = {
  study:   { pt: 'Bora estudar hoje?', en: "Let's study today?" },
  cheer:   { pt: 'Você tá mandando bem, continua!', en: "You're doing great, keep going!" },
  chasing: { pt: 'Tô chegando no seu XP desta semana!', en: "I'm catching up on your XP this week!" },
  miss:    { pt: 'Senti sua falta nos estudos!', en: 'I missed you in our study sessions!' },
};

async function authUser(req: NextRequest) {
  const h = req.headers.get('authorization') ?? '';
  if (!h.startsWith('Bearer ')) return null;
  const { data } = await getSupabaseAdmin().auth.getUser(h.slice(7));
  return data?.user ?? null;
}

function makeCode(name: string | null): string {
  const base = (name ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'QUEIZY';
  const tail = randomBytes(3).toString('hex').toUpperCase().replace(/[01]/g, 'X').slice(0, 3);
  return `${base}${tail}`;
}

async function ensureCode(userId: string, name: string | null): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('referral_codes').select('code').eq('user_id', userId).maybeSingle();
  if (data) return (data as { code: string }).code;
  for (let i = 0; i < 5; i++) {
    const code = makeCode(name);
    const { error } = await supabase.from('referral_codes').insert({ user_id: userId, code } as never);
    if (!error) return code;
  }
  throw new Error('Não foi possível gerar o código.');
}

/** Segunda-feira 00:00 de Brasília, em ISO UTC. */
function weekStartIso(): string {
  const now = new Date(Date.now() - 3 * 3600000);
  const dow = (now.getUTCDay() + 6) % 7;
  const monday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dow);
  return new Date(monday + 3 * 3600000).toISOString();
}

const firstName = (n: string | null) => (n ?? '').trim().split(/\s+/)[0] || null;

async function buddyIds(userId: string): Promise<{ invited: string[]; invitedBy: string | null }> {
  const supabase = getSupabaseAdmin();
  const [mine, me] = await Promise.all([
    supabase.from('referrals').select('invitee_id').eq('inviter_id', userId),
    supabase.from('referrals').select('inviter_id').eq('invitee_id', userId).maybeSingle(),
  ]);
  return {
    invited: ((mine.data ?? []) as { invitee_id: string }[]).map(r => r.invitee_id),
    invitedBy: (me.data as { inviter_id: string } | null)?.inviter_id ?? null,
  };
}

async function sendPush(token: string | null, title: string, body: string, data: Record<string, unknown>) {
  if (!token) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify([{ to: token, title, body, sound: 'default', data }]),
    });
  } catch { /* push é melhor esforço */ }
}

export async function GET(req: NextRequest) {
  const user = await authUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdmin();

  const { data: meRow } = await supabase.from('charlotte_users').select('name, created_at').eq('id', user.id).maybeSingle();
  const me = meRow as { name: string | null; created_at: string } | null;
  const code = await ensureCode(user.id, me?.name ?? null);
  const { invited, invitedBy } = await buddyIds(user.id);
  const friends = await friendsOf(user.id); // convite + amigos da busca
  const ids = [...friends.keys()];

  let buddies: unknown[] = [];
  if (ids.length) {
    const since = weekStartIso();
    const dayAgo = new Date(Date.now() - DAY).toISOString();
    const [profiles, progress, practices, nudges] = await Promise.all([
      supabase.from('charlotte_users').select('id, name, avatar_url, charlotte_level').in('id', ids),
      supabase.from('charlotte_progress').select('user_id, streak_days, last_practice_date').in('user_id', ids),
      supabase.from('charlotte_practices').select('user_id, xp_earned, practice_type').in('user_id', [...ids, user.id]).gte('created_at', since).limit(20000),
      supabase.from('buddy_nudges').select('to_id').eq('from_id', user.id).gte('created_at', dayAgo),
    ]);
    const weekXp = new Map<string, number>();
    const weekLessons = new Map<string, number>();
    ((practices.data ?? []) as { user_id: string; xp_earned: number | null; practice_type: string }[]).forEach(p => {
      weekXp.set(p.user_id, (weekXp.get(p.user_id) ?? 0) + (p.xp_earned ?? 0));
      if (p.practice_type === 'learn_exercise') weekLessons.set(p.user_id, (weekLessons.get(p.user_id) ?? 0) + 1);
    });
    const prog = new Map(((progress.data ?? []) as { user_id: string; streak_days: number; last_practice_date: string | null }[]).map(p => [p.user_id, p]));
    const nudged = new Set(((nudges.data ?? []) as { to_id: string }[]).map(n => n.to_id));
    buddies = ((profiles.data ?? []) as { id: string; name: string | null; avatar_url: string | null; charlotte_level: string | null }[]).map(p => ({
      id: p.id,
      name: firstName(p.name),
      avatarUrl: p.avatar_url,
      level: p.charlotte_level,
      relation: friends.get(p.id) ?? 'friend',
      weekXp: weekXp.get(p.id) ?? 0,
      weekExercises: weekLessons.get(p.id) ?? 0,
      streak: prog.get(p.id)?.streak_days ?? 0,
      lastPractice: prog.get(p.id)?.last_practice_date ?? null,
      nudgedToday: nudged.has(p.id),
    }));
    const myXp = weekXp.get(user.id) ?? 0;
    return NextResponse.json({
      code, link: `${SITE}/c/${code}`,
      invitedCount: invited.length,
      canClaim: !invitedBy && !!me && Date.now() - new Date(me.created_at).getTime() < CLAIM_WINDOW_DAYS * DAY,
      me: { weekXp: myXp, weekExercises: weekLessons.get(user.id) ?? 0 },
      buddies, rewardMinutes: REWARD_SECONDS / 60,
    });
  }

  return NextResponse.json({
    code, link: `${SITE}/c/${code}`,
    invitedCount: 0,
    canClaim: !invitedBy && !!me && Date.now() - new Date(me.created_at).getTime() < CLAIM_WINDOW_DAYS * DAY,
    me: { weekXp: 0, weekExercises: 0 },
    buddies, rewardMinutes: REWARD_SECONDS / 60,
  });
}

export async function POST(req: NextRequest) {
  const user = await authUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const body = await req.json().catch(() => ({}));

  if (body.action === 'claim') {
    const code = String(body.code ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!code) return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
    const { data: owner } = await supabase.from('referral_codes').select('user_id').eq('code', code).maybeSingle();
    const inviterId = (owner as { user_id: string } | null)?.user_id;
    if (!inviterId) return NextResponse.json({ error: 'invalid_code' }, { status: 404 });
    if (inviterId === user.id) return NextResponse.json({ error: 'own_code' }, { status: 400 });

    const { data: meRow } = await supabase.from('charlotte_users').select('name, created_at, live_voice_bonus_seconds').eq('id', user.id).maybeSingle();
    const me = meRow as { name: string | null; created_at: string; live_voice_bonus_seconds: number | null } | null;
    if (!me) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (Date.now() - new Date(me.created_at).getTime() > CLAIM_WINDOW_DAYS * DAY) {
      return NextResponse.json({ error: 'too_late' }, { status: 400 });
    }
    // Evita ciclo: quem me convidou não pode ter sido convidado por mim.
    const { data: reverse } = await supabase.from('referrals').select('invitee_id').eq('inviter_id', user.id).eq('invitee_id', inviterId).maybeSingle();
    if (reverse) return NextResponse.json({ error: 'already_buddies' }, { status: 400 });

    const { error } = await supabase.from('referrals').insert({ invitee_id: user.id, inviter_id: inviterId, code, rewarded: true } as never);
    if (error) return NextResponse.json({ error: 'already_claimed' }, { status: 409 });

    const { data: invRow } = await supabase.from('charlotte_users').select('name, live_voice_bonus_seconds, expo_push_token, charlotte_level, app_language').eq('id', inviterId).maybeSingle();
    const inviter = invRow as { name: string | null; live_voice_bonus_seconds: number | null; expo_push_token: string | null; charlotte_level: string | null; app_language: string | null } | null;
    await Promise.all([
      supabase.from('charlotte_users').update({ live_voice_bonus_seconds: (me.live_voice_bonus_seconds ?? 0) + REWARD_SECONDS } as never).eq('id', user.id),
      inviter ? supabase.from('charlotte_users').update({ live_voice_bonus_seconds: (inviter.live_voice_bonus_seconds ?? 0) + REWARD_SECONDS } as never).eq('id', inviterId) : Promise.resolve(),
    ]);
    // Conquistas de padrinho (Trouxe um Amigo, Turma Formada...) saem na hora.
    await supabase.rpc('rn_award_achievements', { p_user_id: inviterId }).then(undefined, () => {});
    // Push no idioma do aparelho de quem recebe.
    const pt = inviter ? pushIsPt(inviter) : true;
    const who = firstName(me.name) ?? (pt ? 'Alguém' : 'Someone');
    await sendPush(inviter?.expo_push_token ?? null,
      pt ? `${who} aceitou seu convite` : `${who} accepted your invite`,
      pt ? `Agora vocês estudam juntos. Você ganhou ${REWARD_SECONDS / 60} minutos de Live Voice.` : `You're now study buddies. You got ${REWARD_SECONDS / 60} Live Voice minutes.`,
      { type: 'buddy_joined', screen: 'study-together' });
    return NextResponse.json({ ok: true, inviter: firstName(inviter?.name ?? null), rewardMinutes: REWARD_SECONDS / 60 });
  }

  if (body.action === 'nudge') {
    const to = String(body.to ?? '');
    const msg = NUDGES[String(body.key ?? '')];
    if (!to || !msg) return NextResponse.json({ error: 'invalid' }, { status: 400 });
    const friends = await friendsOf(user.id);
    if (!friends.has(to)) return NextResponse.json({ error: 'not_buddy' }, { status: 403 });
    const { count } = await supabase.from('buddy_nudges').select('id', { count: 'exact', head: true })
      .eq('from_id', user.id).eq('to_id', to).gte('created_at', new Date(Date.now() - DAY).toISOString());
    if (count) return NextResponse.json({ error: 'already_today' }, { status: 429 });

    await supabase.from('buddy_nudges').insert({ from_id: user.id, to_id: to, message: String(body.key) } as never);
    const [{ data: fromRow }, { data: toRow }] = await Promise.all([
      supabase.from('charlotte_users').select('name').eq('id', user.id).maybeSingle(),
      supabase.from('charlotte_users').select('expo_push_token, charlotte_level, app_language').eq('id', to).maybeSingle(),
    ]);
    const target = toRow as { expo_push_token: string | null; charlotte_level: string | null; app_language: string | null } | null;
    const pt = target ? pushIsPt(target) : true;
    const from = firstName((fromRow as { name: string | null } | null)?.name ?? null) ?? (pt ? 'Sua dupla' : 'Your buddy');
    await sendPush(target?.expo_push_token ?? null, pt ? `${from} te cutucou` : `${from} nudged you`, pt ? msg.pt : msg.en,
      { type: 'buddy_nudge', screen: 'study-together' });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
}
