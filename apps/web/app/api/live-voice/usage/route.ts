// /api/live-voice/usage — minutos de Live Voice (ligação com a Charlotte e com a Família), contados no servidor.
//   GET                          saldo → { secondsUsed, secondsRemaining, poolTotal, bonusSeconds, resetDate }
//   POST { sessionId, seconds }  fim da ligação (sessionId veio do /api/realtime-token ou /api/family-call/session):
//                                o servidor cobra min(tempo corrido, teto); seconds só baixa a conta (até 20 s).
//                                → { charged, closed, ...saldo }
// Login obrigatório (middleware, AI_ROUTES). O app não grava mais esses campos na conta (guarda no banco).
import { NextRequest, NextResponse } from 'next/server';
import { requestUserId } from '@/lib/request-user';
import { closeLiveVoiceSession, liveVoiceStatus } from '@/lib/live-voice-usage';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function statusBody(s: Awaited<ReturnType<typeof liveVoiceStatus>>) {
  if (!s) return null;
  return { secondsUsed: s.secondsUsed, secondsRemaining: s.secondsRemaining, poolTotal: s.poolTotal, bonusSeconds: s.bonusSeconds, resetDate: s.resetDate };
}

export async function GET(req: NextRequest) {
  const userId = await requestUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const s = statusBody(await liveVoiceStatus(userId));
    if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json(s);
  } catch (e) {
    console.warn('[live-voice/usage] status failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await requestUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (!UUID.test(sessionId)) return NextResponse.json({ error: 'invalid_session' }, { status: 400 });
  const seconds = Number(body.seconds);
  try {
    const r = await closeLiveVoiceSession(userId, sessionId, Number.isFinite(seconds) ? Math.min(seconds, 4 * 3600) : null);
    const s = statusBody(await liveVoiceStatus(userId).catch(() => null));
    return NextResponse.json({ ...r, ...(s ?? {}) });
  } catch (e) {
    console.warn('[live-voice/usage] close failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}
