// app/api/health/route.ts
// Health check — measures real response times of critical services.
// GET with CRON_SECRET: full check (GitHub Actions). GET without: basic ping.

import { NextRequest, NextResponse } from 'next/server';
import { bearerMatches } from '@/lib/secret-auth';

export const dynamic = 'force-dynamic';

const APP_URL          = 'https://charlotte.hubacademybr.com';
const WARN_THRESHOLD_MS  = 20000; // 20s — degraded but within Hobby limit
const ERROR_THRESHOLD_MS = 28000; // 28s — at risk of 504

interface ServiceCheck {
  name:   string;
  ok:     boolean;
  ms:     number;
  error?: string;
}

async function checkAssistant(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const res = await fetch(`${APP_URL}/api/assistant`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcription: 'Hello',
        userLevel:     'Inter',
        userName:      'HealthCheck',
        messageType:   'text',
        mode:          'chat',
      }),
      signal: AbortSignal.timeout(29000),
    });
    const ms = Date.now() - start;
    if (!res.ok) return { name: 'assistant', ok: false, ms, error: `HTTP ${res.status}` };
    return { name: 'assistant', ok: true, ms };
  } catch (e: any) {
    return { name: 'assistant', ok: false, ms: Date.now() - start, error: e?.message ?? 'timeout' };
  }
}

async function checkTTS(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const res = await fetch(`${APP_URL}/api/tts`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text: 'Hello, health check.' }),
      signal:  AbortSignal.timeout(29000),
    });
    const ms = Date.now() - start;
    if (!res.ok) return { name: 'tts', ok: false, ms, error: `HTTP ${res.status}` };
    return { name: 'tts', ok: true, ms };
  } catch (e: any) {
    return { name: 'tts', ok: false, ms: Date.now() - start, error: e?.message ?? 'timeout' };
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  // Sem CRON_SECRET configurado, só o ping básico (antes "Bearer undefined" abria o check completo).
  const isAuthed   = bearerMatches(authHeader, process.env.CRON_SECRET);

  // Without auth: basic ping only (Vercel uptime checks, etc.)
  if (!isAuthed) {
    return NextResponse.json({
      status:    'ok',
      timestamp: new Date().toISOString(),
      services: {
        supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        openai:   !!process.env.OPENAI_API_KEY,
      },
    });
  }

  // Full check — runs assistant + TTS in parallel
  const [assistant, tts] = await Promise.all([checkAssistant(), checkTTS()]);

  const checks   = [assistant, tts];
  const anyError = checks.some(c => !c.ok || c.ms >= ERROR_THRESHOLD_MS);
  const anyWarn  = checks.some(c => c.ms >= WARN_THRESHOLD_MS);
  const status   = anyError ? 'error' : anyWarn ? 'degraded' : 'ok';

  const body = {
    status,
    timestamp: new Date().toISOString(),
    checks: checks.map(c => ({
      name:  c.name,
      ok:    c.ok,
      ms:    c.ms,
      warn:  c.ms >= WARN_THRESHOLD_MS,
      error: c.error ?? null,
    })),
    thresholds: { warn_ms: WARN_THRESHOLD_MS, error_ms: ERROR_THRESHOLD_MS },
  };

  // 503 makes GitHub Actions step fail → GitHub emails the repo owner automatically
  return NextResponse.json(body, { status: anyError ? 503 : 200 });
}
