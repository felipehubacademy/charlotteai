// /api/family-call/session — libera uma ligação ao vivo com um membro da Família Queizy (ElevenLabs).
//   POST { character: 'igorfina', topic?: string, trackTopic?: string, resume?: [{who, text}] }  (Bearer do aluno)
//   resume = retomada depois da pausa por inatividade: segue a conversa, sem cumprimentar de novo.
//   → { token, agentId, prompt, firstMessage, remainingSeconds }
// Confere os minutos do mês (mesma cota do Live Voice). A chave do ElevenLabs nunca sai do servidor: o app recebe só um
// token de conversa de curta duração.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { buildCallSession, generateOpener, type CallLevel } from '@/lib/family-call';
import { isTasterRow, TASTE_LIVE_VOICE_SECONDS } from '@/lib/taste';

export const dynamic = 'force-dynamic';

function monthStart(tz: string): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  return `${p.find(x => x.type === 'year')?.value}-${p.find(x => x.type === 'month')?.value}-01`;
}

export async function POST(req: NextRequest) {
  const h = req.headers.get('authorization') ?? '';
  if (!h.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const { data: auth } = await supabase.auth.getUser(h.slice(7));
  if (!auth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const { data: u } = await supabase.from('charlotte_users')
    .select('name, charlotte_level, beta_features, timezone, subscription_status, is_institutional, live_voice_seconds_used, live_voice_reset_date, live_voice_bonus_seconds')
    .eq('id', auth.user.id).maybeSingle();
  const user = u as Record<string, any> | null;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Minutos: mesma regra do /api/realtime-token (degustação 3 min uma vez; 7 dias grátis 5; assinatura 20).
  const taster = isTasterRow(user as never);
  const needsReset = !taster && (!user.live_voice_reset_date || user.live_voice_reset_date < monthStart(user.timezone || 'America/Sao_Paulo'));
  const used = needsReset ? 0 : Number(user.live_voice_seconds_used ?? 0);
  const pool = taster ? TASTE_LIVE_VOICE_SECONDS : user.subscription_status === 'trial' ? 300 : 1200;
  const remaining = Math.max(0, pool - used) + (taster ? 0 : Number(user.live_voice_bonus_seconds ?? 0));
  if (remaining <= 0) return NextResponse.json({ error: 'monthly_pool_exhausted' }, { status: 403 });

  const level = (['Novice', 'Inter', 'Advanced'].includes(user.charlotte_level) ? user.charlotte_level : 'Inter') as CallLevel;
  const characterId = String(body.character ?? 'igorfina');
  const topic = typeof body.topic === 'string' ? body.topic.slice(0, 120) : null;
  const trackTopic = typeof body.trackTopic === 'string' ? body.trackTopic.slice(0, 120) : null;
  const resume = Array.isArray(body.resume)
    ? (body.resume as unknown[]).slice(-8).map(l => l as { who?: unknown; text?: unknown })
      .filter(l => (l.who === 'ai' || l.who === 'user') && typeof l.text === 'string')
      .map(l => ({ who: l.who as 'ai' | 'user', text: String(l.text).slice(0, 300) }))
    : null;

  // Memória: anotações das 3 últimas ligações com este personagem; sequência para a abertura.
  const [{ data: calls }, { data: prog }] = await Promise.all([
    supabase.from('charlotte_live_calls').select('memory, summary').eq('user_id', auth.user.id).eq('character', characterId)
      .order('started_at', { ascending: false }).limit(3),
    supabase.from('charlotte_progress').select('streak_days').eq('user_id', auth.user.id).maybeSingle(),
  ]);
  const memories = ((calls ?? []) as { memory: string | null; summary: string | null }[]).map(c => c.memory || c.summary || '').filter(Boolean);
  const session = buildCallSession({ characterId, level, name: user.name ?? '', topic, trackTopic, memories, resume });
  if (!session) return NextResponse.json({ error: 'unknown_character' }, { status: 400 });

  const tz = user.timezone || 'America/Sao_Paulo';
  const now = new Date();
  const localHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(now));
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(now);
  // Retomada: usa a frase fixa de volta (sem gerar cumprimento novo).
  const openerP = resume?.length ? Promise.resolve(session.firstMessage) : generateOpener({
    characterId, level, name: user.name ?? '', fallback: session.firstMessage, localHour, weekday,
    streak: Number((prog as { streak_days?: number } | null)?.streak_days ?? 0), topic, trackTopic, memories,
  });

  const r = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${session.agentId}`, { headers: { 'xi-api-key': key } });
  if (!r.ok) {
    console.error('[family-call] token error', r.status, await r.text().catch(() => ''));
    return NextResponse.json({ error: 'token_failed' }, { status: 502 });
  }
  const { token } = (await r.json()) as { token: string };
  const firstMessage = await openerP;
  // A regra do TURNO 1 cita a primeira fala: entra no prompt depois de pronta.
  const prompt = session.prompt.replace('{GREETING}', firstMessage.replace(/<\/?[A-Za-z]+>/g, ''));
  return NextResponse.json({ token, agentId: session.agentId, prompt, firstMessage, characterName: session.characterName, remainingSeconds: remaining });
}
