// lib/entitlement.ts — quem pode usar as rotas de IA pagas (conferido no servidor; antes era só o login).
// Mesma regra do app (apps/mobile/components/auth/AuthProvider.tsx, hasAccess e isTaster):
//   paid     institucional ou equipe (is_admin); assinatura ativa ou cancelada ainda no prazo; 7 dias grátis no prazo
//   taster   conta sem assinatura (degustação): o app libera parte da trilha, do Practice e 3 min de ligação.
//            O servidor não sabe qual tópico é de graça: dá um teto diário por rota, folgado para o que o app libera.
//   blocked  assinatura ou teste vencidos (o app só mostra o paywall): 402 nas rotas de IA.
// Limite por aluno, por rota, por hora e por dia (public.api_rate_hit, migration 20261126170000_api_rate_limits):
// vale para todos, menor na degustação. Erro de banco nunca bloqueia o aluno (como lib/rate-limit).
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export type Tier = 'paid' | 'taster' | 'blocked';

// Folga para o aviso da loja atrasar (webhook/sincronização): o app já mostra o paywall no vencimento.
const EXPIRY_GRACE_MS = 2 * 86400000;

type UserRow = {
  is_institutional: boolean | null; is_admin?: boolean | null; is_active: boolean | null; subscription_status: string | null;
  subscription_expires_at: string | null; trial_ends_at: string | null;
};

export function tierOf(u: UserRow, now = Date.now()): Tier {
  if (u.is_institutional || u.is_admin) return 'paid';
  const s = u.subscription_status;
  if (!s || s === 'none') return 'taster';
  if (!u.is_active) return 'blocked';
  if (s === 'active' || s === 'cancelled') {
    if (u.subscription_expires_at && new Date(u.subscription_expires_at).getTime() + EXPIRY_GRACE_MS < now) return 'blocked';
    return 'paid';
  }
  if (s === 'trial') {
    if (!u.trial_ends_at) return 'blocked';
    return new Date(u.trial_ends_at).getTime() + EXPIRY_GRACE_MS > now ? 'paid' : 'blocked';
  }
  return 'blocked';
}

const tierCache = new Map<string, { tier: Tier; at: number }>();
const TIER_TTL_MS = 60_000;

/** Plano do aluno. null = não deu para ler (não bloqueia). */
export async function userTier(userId: string): Promise<Tier | null> {
  const hit = tierCache.get(userId);
  if (hit && Date.now() - hit.at < TIER_TTL_MS) return hit.tier;
  try {
    const { data, error } = await getSupabaseAdmin().from('charlotte_users')
      .select('is_institutional, is_admin, is_active, subscription_status, subscription_expires_at, trial_ends_at')
      .eq('id', userId).maybeSingle();
    if (error) { console.warn('[entitlement] leitura falhou:', error.message); return null; }
    if (!data) return 'blocked'; // sem cadastro
    const tier = tierOf(data as UserRow);
    // Sem assinatura não fica guardado: quem acabou de assinar passa no pedido seguinte.
    if (tier !== 'blocked') {
      if (tierCache.size > 5000) tierCache.clear();
      tierCache.set(userId, { tier, at: Date.now() });
    }
    return tier;
  } catch (e) {
    console.warn('[entitlement] leitura falhou:', e);
    return null;
  }
}

type Limit = { hour: number; day: number };
type RouteRule = { paid: Limit; taster: Limit; blocked?: Limit };

// Tetos por rota. blocked: só rotas que o app usa também fora da assinatura (áudio pronto do vocabulário).
const AI_ROUTE_RULES: Record<AiRoute, RouteRule> = {
  'roleplay':               { paid: { hour: 60,  day: 300 },  taster: { hour: 30,  day: 80 } },
  'guided-chat':            { paid: { hour: 60,  day: 300 },  taster: { hour: 30,  day: 80 } },
  'tts':                    { paid: { hour: 300, day: 1500 }, taster: { hour: 150, day: 400 } },
  'tts-cached':             { paid: { hour: 600, day: 3000 }, taster: { hour: 300, day: 1000 }, blocked: { hour: 100, day: 300 } },
  'transcribe':             { paid: { hour: 120, day: 600 },  taster: { hour: 60,  day: 200 } },
  'translate':              { paid: { hour: 200, day: 1000 }, taster: { hour: 100, day: 300 } },
  'pronunciation':          { paid: { hour: 120, day: 600 },  taster: { hour: 60,  day: 200 } },
  'pronunciation-semantic': { paid: { hour: 120, day: 600 },  taster: { hour: 60,  day: 200 } },
  'exercise-help':          { paid: { hour: 60,  day: 300 },  taster: { hour: 30,  day: 80 } },
  'enrich-term':            { paid: { hour: 60,  day: 300 },  taster: { hour: 30,  day: 100 } },
  'vocabulary':             { paid: { hour: 60,  day: 300 },  taster: { hour: 30,  day: 100 } },
  'chat-title':             { paid: { hour: 30,  day: 150 },  taster: { hour: 15,  day: 50 } },
  'summarize-chat':         { paid: { hour: 30,  day: 150 },  taster: { hour: 15,  day: 50 } },
  'summarize-call':         { paid: { hour: 30,  day: 150 },  taster: { hour: 15,  day: 50 } },
  'call-vocab':             { paid: { hour: 30,  day: 150 },  taster: { hour: 15,  day: 50 } },
  'trail-feedback':         { paid: { hour: 60,  day: 300 },  taster: { hour: 30,  day: 80 } },
  'greeting':               { paid: { hour: 20,  day: 60 },   taster: { hour: 20,  day: 60 } },
  // Tokens de ligação (os minutos já são contados à parte; isto só segura pedidos em série).
  'live-voice-token':       { paid: { hour: 20,  day: 60 },   taster: { hour: 10,  day: 20 } },
};

export type AiRoute =
  | 'roleplay' | 'guided-chat' | 'tts' | 'tts-cached' | 'transcribe' | 'translate' | 'pronunciation'
  | 'pronunciation-semantic' | 'exercise-help' | 'enrich-term' | 'vocabulary' | 'chat-title' | 'summarize-chat'
  | 'summarize-call' | 'call-vocab' | 'trail-feedback' | 'greeting' | 'live-voice-token';

export const SUBSCRIPTION_REQUIRED_PT = 'Sua assinatura não está ativa. Assine o Queizy para continuar usando a Charlotte.';
export const SUBSCRIPTION_REQUIRED_EN = 'Your subscription is not active. Subscribe to Queizy to keep using Charlotte.';

/** Idioma do aviso: o app manda x-lang ('pt' ou 'en'); sem o cabeçalho, português. */
const isEn = (lang?: string | null) => (lang ?? '').trim().toLowerCase().startsWith('en');

function subscriptionRequired(lang?: string | null): NextResponse {
  const message = isEn(lang) ? SUBSCRIPTION_REQUIRED_EN : SUBSCRIPTION_REQUIRED_PT;
  return NextResponse.json({ error: 'subscription_required', message }, { status: 402 });
}

/**
 * Só o plano (para /api/assistant, que já tem o próprio limite em lib/rate-limit e a degustação do Practice em
 * lib/taste): sem assinatura ativa, 402. Devolve null para seguir.
 * lang: o x-lang do pedido (com 'en' o aviso sai em inglês; sem ele, português). Vale também para checkAiAccess.
 */
export async function checkAiPlan(userId: string | null | undefined, lang?: string | null): Promise<NextResponse | null> {
  if (!userId) return null;
  return (await userTier(userId)) === 'blocked' ? subscriptionRequired(lang) : null;
}

/**
 * Confere plano e limite do aluno para a rota. Devolve a resposta de erro (402 sem assinatura, 429 acima do limite)
 * ou null para seguir. Sem aluno (rota sem login): null; o login é exigido no middleware.
 */
export async function checkAiAccess(userId: string | null | undefined, route: AiRoute, lang?: string | null): Promise<NextResponse | null> {
  if (!userId) return null;
  const rule: RouteRule = AI_ROUTE_RULES[route];
  const tier = (await userTier(userId)) ?? 'paid'; // leitura falhou: não bloqueia
  const limit = tier === 'paid' ? rule.paid : tier === 'taster' ? rule.taster : rule.blocked;
  if (!limit) return subscriptionRequired(lang);
  try {
    const { data, error } = await getSupabaseAdmin().rpc('api_rate_hit', { p_user: userId, p_route: route, p_hour_max: limit.hour, p_day_max: limit.day });
    if (error) { console.warn('[entitlement] limite falhou:', error.message); return null; }
    const r = (data ?? {}) as { ok?: boolean; scope?: 'hour' | 'day'; retry_after?: number };
    if (r.ok !== false) return null;
    const retry = Math.max(1, Number(r.retry_after ?? 3600));
    const en = isEn(lang);
    const message = r.scope === 'day'
      ? (en ? "You've reached today's limit for this feature. It resets tomorrow." : 'Você atingiu o limite de hoje para este recurso. Amanhã libera de novo.')
      : (en ? `Too many requests in a row. Try again in ${Math.ceil(retry / 60)} min.` : `Muitos pedidos seguidos. Tente de novo em ${Math.ceil(retry / 60)} min.`);
    return NextResponse.json(
      { error: 'rate_limited', type: r.scope === 'day' ? 'daily' : 'hourly', message, retry_after: retry, is_trial: tier !== 'paid' },
      { status: 429, headers: { 'Retry-After': String(retry) } },
    );
  } catch (e) {
    console.warn('[entitlement] limite falhou:', e);
    return null;
  }
}
