// middleware.ts — trava de conta na API do app.
// Pedido com prova de login (Authorization: Bearer <token do aluno>): se o Supabase diz que a conta não existe mais
// (apagada pelo /admin, por exemplo), recusa com 401 { error: 'account_not_found' } e o app sai da conta.
// Só esse caso é barrado: token vencido, falha de rede ou pedido sem a prova seguem como antes (apps antigos ainda
// não mandam a prova). Rotas de IA sem a prova são contadas (AI_ROUTES) até dar para exigir (ENFORCE).
import { NextRequest, NextResponse, type NextFetchEvent } from 'next/server';

export const config = { matcher: '/api/:path*' };

// Rotas com autenticação própria ou chamadas por terceiros (webhooks, cron, admin, hook de e-mail do Supabase).
const SKIP = /^\/api\/(webhooks|cron|admin|auth|support-test|leads|affiliate|meta)(\/|$)/;

// Rotas que usam IA paga (ou gravam no nome de um aluno). Hoje: pedido sem prova de login é contado em
// public.api_auth_misses (por dia e rota). Quando a contagem zerar (versões antigas fora de uso), ENFORCE = true
// passa a recusar com 401.
const AI_ROUTES = /^\/api\/(assistant|realtime-token|transcribe|tts|tts-cached|pronunciation|pronunciation-semantic|translate|learn-grammar|demo-sentence|enrich-term|guided-chat|roleplay|exercise-help|vocabulary|chat-title|summarize-chat|summarize-call|greeting|trail|family-call)(\/|$)/;
const ENFORCE = false;

function noteMiss(route: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return Promise.resolve();
  return fetch(`${url}/rest/v1/rpc/note_api_auth_miss`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_route: route }),
  }).then(() => {}, () => {});
}

const cache = new Map<string, { gone: boolean; at: number }>();
const TTL_MS = 5 * 60_000;

async function accountGone(token: string): Promise<boolean> {
  const hit = cache.get(token);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.gone;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  try {
    const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
    let gone = false;
    if (r.status === 401 || r.status === 403) {
      const b = await r.json().catch(() => ({} as Record<string, unknown>));
      gone = b.error_code === 'user_not_found' || /does not exist/i.test(String(b.msg ?? b.message ?? ''));
    }
    if (cache.size > 5000) cache.clear();
    cache.set(token, { gone, at: Date.now() });
    return gone;
  } catch { return false; }
}

export async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const path = req.nextUrl.pathname;
  if (SKIP.test(path)) return NextResponse.next();
  const h = req.headers.get('authorization') ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (token.split('.').length !== 3) { // sem prova de login (ou não é token de aluno)
    if (AI_ROUTES.test(path) && req.method !== 'OPTIONS') {
      if (ENFORCE) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      ev.waitUntil(noteMiss(path.replace(/^\/api\//, '')));
    }
    return NextResponse.next();
  }
  if (await accountGone(token)) {
    return NextResponse.json({ error: 'account_not_found', message: 'Esta conta não existe mais.' }, { status: 401 });
  }
  return NextResponse.next();
}
