// /api/goals/claim — paga o XP das metas concluídas (Bearer do aluno).
//   POST { items: [{ kind: 'mission' | 'weekly', id, period: 'AAAA-MM-DD' }] }
//   → { granted: [{ kind, id, xp }] }
// Valores fixos no servidor; cada meta paga no máximo 1 vez por período
// (índice único practices_goal_reward_once). O crédito entra em charlotte_practices,
// e o gatilho do banco soma no XP total, na sequência e no ranking.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// Espelho de apps/mobile/lib/missions.tsx e lib/weeklyChallenge.ts (manter iguais).
const MISSION_XP: Record<string, number> = {
  messages_3: 12, messages_5: 20, messages_10: 35, messages_20: 60,
  xp_20: 8, xp_50: 15, xp_100: 25,
  streak_2: 20, streak_10: 80,
  text_3: 15, text_7: 28,
  audio_1: 15, audio_3: 30, audio_5: 45,
};
const WEEKLY_XP: Record<string, number> = {
  messages_50: 100, xp_500: 120, streak_5: 80, lessons_5: 100, audio_10: 90, grammar_20: 90,
};
const DAY = 86400000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: NextRequest) {
  const h = req.headers.get('authorization') ?? '';
  if (!h.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const { data: auth } = await supabase.auth.getUser(h.slice(7));
  const user = auth?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const items = (Array.isArray(body.items) ? body.items : []).slice(0, 6) as { kind?: string; id?: string; period?: string }[];
  const now = Date.now();
  const granted: { kind: string; id: string; xp: number }[] = [];

  for (const it of items) {
    const kind = it.kind === 'weekly' ? 'weekly' : it.kind === 'mission' ? 'mission' : null;
    const id = String(it.id ?? '');
    const period = String(it.period ?? '');
    if (!kind || !DATE_RE.test(period)) continue;
    const xp = (kind === 'mission' ? MISSION_XP : WEEKLY_XP)[id];
    if (!xp) continue;
    // Período precisa ser o atual (dia de hoje, ou segunda desta semana), com folga de fuso.
    const t = new Date(`${period}T12:00:00Z`).getTime();
    const ok = kind === 'mission' ? Math.abs(now - t) <= 1.5 * DAY : now - t >= -1.5 * DAY && now - t <= 8 * DAY;
    if (!ok) continue;
    const { error } = await supabase.from('charlotte_practices').insert({
      user_id: user.id, practice_type: `${kind === 'mission' ? 'mission' : 'weekly'}_reward_${id}_${period}`, xp_earned: xp,
    } as never);
    if (!error) granted.push({ kind, id, xp }); // erro = já pago (índice único) ou falha: não credita de novo
  }
  return NextResponse.json({ granted });
}
