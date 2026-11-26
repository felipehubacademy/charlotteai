// lib/unsubscribe.ts
// Token de descadastro de 1 clique (sem login). HMAC do id do usuario com um
// segredo do servidor, pra ninguem descadastrar outra pessoa adivinhando ids.
import crypto from 'crypto';

const SECRET = process.env.ADMIN_SECRET ?? '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://charlotte.hubacademybr.com';

// Sem ADMIN_SECRET configurado não assina nem confere (antes a chave vazia deixava qualquer um gerar o link).
export function unsubToken(userId: string): string {
  if (!SECRET) return '';
  return crypto.createHmac('sha256', SECRET).update(`unsub:${userId}`).digest('hex').slice(0, 32);
}

export function verifyUnsub(userId: string, token: string): boolean {
  if (!SECRET || !userId || !token) return false;
  const expected = unsubToken(userId);
  if (token.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function unsubscribeUrl(userId: string): string {
  return `${APP_URL}/api/email/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubToken(userId)}`;
}
