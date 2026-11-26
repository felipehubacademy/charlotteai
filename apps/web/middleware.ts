// middleware.ts — trava de conta na API do app.
// Pedido com prova de login (Authorization: Bearer <token do aluno>): se o Supabase diz que a conta não existe mais
// (apagada pelo /admin, por exemplo), recusa com 401 { error: 'account_not_found' } e o app sai da conta.
// Rotas de IA (AI_ROUTES) exigem prova VÁLIDA (ENFORCE): sem ela, vencida ou forjada, 401. O aluno conferido vai
// para as rotas no cabeçalho x-auth-user (lib/request-user); ids mandados no corpo não valem mais.
import { NextRequest, NextResponse, type NextFetchEvent } from 'next/server';

export const config = { matcher: '/api/:path*' };

// Rotas com autenticação própria ou chamadas por terceiros (webhooks, cron, admin, hook de e-mail do Supabase).
const SKIP = /^\/api\/(webhooks|cron|admin|auth|support-test|leads|affiliate|meta)(\/|$)/;

// Rotas que usam IA paga (ou gravam no nome de um aluno). Hoje: pedido sem prova de login é contado em
// public.api_auth_misses (por dia e rota). Quando a contagem zerar (versões antigas fora de uso), ENFORCE = true
// passa a recusar com 401.
const AI_ROUTES = /^\/api\/(assistant|realtime-token|transcribe|tts|tts-cached|pronunciation|pronunciation-semantic|translate|learn-grammar|demo-sentence|enrich-term|guided-chat|roleplay|exercise-help|vocabulary|chat-title|summarize-chat|summarize-call|greeting|trail|family-call|call-vocab|live-voice)(\/|$)/;
const ENFORCE = true; // ligado em 16/11: pedidos sem login zeraram desde 12/11 (todas as versões mandam a prova)

function noteMiss(route: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return Promise.resolve();
  return fetch(`${url}/rest/v1/rpc/note_api_auth_miss`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_route: route }),
  }).then(() => {}, () => {});
}

// Prova de login conferida no Supabase (cache de 5 min por token): id do aluno, conta apagada ou token inválido.
type Check = { id: string | null; gone: boolean; at: number };
const cache = new Map<string, Check>();
const TTL_MS = 5 * 60_000;

async function checkToken(token: string): Promise<Check | null> {
  const hit = cache.get(token);
  if (hit && Date.now() - hit.at < TTL_MS) return hit;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
    let res: Check;
    if (r.ok) {
      const b = await r.json().catch(() => ({} as Record<string, unknown>));
      res = { id: typeof b.id === 'string' ? b.id : null, gone: false, at: Date.now() };
    } else if (r.status === 401 || r.status === 403) {
      const b = await r.json().catch(() => ({} as Record<string, unknown>));
      const gone = b.error_code === 'user_not_found' || /does not exist/i.test(String(b.msg ?? b.message ?? ''));
      res = { id: null, gone, at: Date.now() };
    } else {
      return null; // erro do Supabase: não guarda
    }
    if (cache.size > 5000) cache.clear();
    cache.set(token, res);
    return res;
  } catch { return null; }
}

// Cabeçalho com o aluno conferido aqui. As rotas confiam nele (lib/request-user): o que vier de fora é apagado.
const AUTH_USER_HEADER = 'x-auth-user';

function pass(req: NextRequest, userId: string | null) {
  const headers = new Headers(req.headers);
  headers.delete(AUTH_USER_HEADER);
  if (userId) headers.set(AUTH_USER_HEADER, userId);
  return NextResponse.next({ request: { headers } });
}

export async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const path = req.nextUrl.pathname;
  if (SKIP.test(path)) return pass(req, null);
  const ai = AI_ROUTES.test(path) && req.method !== 'OPTIONS';
  const h = req.headers.get('authorization') ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (token.split('.').length !== 3) { // sem prova de login (ou não é token de aluno)
    if (ai) {
      if (ENFORCE) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      ev.waitUntil(noteMiss(path.replace(/^\/api\//, '')));
    }
    return pass(req, null);
  }
  const c = await checkToken(token);
  if (c?.gone) {
    return NextResponse.json({ error: 'account_not_found', message: 'Esta conta não existe mais.' }, { status: 401 });
  }
  if (ai && ENFORCE) {
    if (!c) return NextResponse.json({ error: 'auth_unavailable' }, { status: 503 });
    if (!c.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); // token vencido ou forjado
  }
  return pass(req, c?.id ?? null);
}
