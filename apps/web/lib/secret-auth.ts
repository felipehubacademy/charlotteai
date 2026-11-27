// lib/secret-auth.ts — conferência de segredos das rotas de servidor (webhooks, crons).
// Regra: sem segredo configurado, recusa (nunca "aceita tudo"). Comparação em tempo constante.
import crypto from 'crypto';

/** Compara dois textos em tempo constante. Vazio nunca confere. */
export function safeEqual(got: string | null | undefined, expected: string | null | undefined): boolean {
  if (!got || !expected) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(a, b); } catch { return false; }
}

/** true se o header Authorization é "Bearer <um dos segredos>". Segredos vazios ou ausentes são ignorados. */
export function bearerMatches(authHeader: string | null | undefined, ...secrets: (string | null | undefined)[]): boolean {
  const h = authHeader ?? '';
  if (!/^Bearer\s+/i.test(h)) return false;
  const token = h.replace(/^Bearer\s+/i, '');
  return secrets.some(s => !!s && safeEqual(token, s));
}
