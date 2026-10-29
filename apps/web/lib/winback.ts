// lib/winback.ts — campanha de volta: "O que te fez parar?" com 1 toque no e-mail (sem login).
// Cada opção é um link assinado (HMAC do id do aluno, como o descadastro). Responder credita
// 5 minutos de ligação com a Charlotte (live_voice_bonus_seconds), uma vez por aluno.
import crypto from 'crypto';

const SECRET = process.env.ADMIN_SECRET ?? '';
const APP_URL = 'https://queizy.com';

export const WINBACK_REWARD_SECONDS = 5 * 60;

export const WINBACK_ANSWERS = [
  { id: 'hard',           label: 'Achei difícil' },
  { id: 'easy',           label: 'Achei fácil demais' },
  { id: 'no_time',        label: 'Não tive tempo' },
  { id: 'expected_other', label: 'Esperava outra coisa' },
  { id: 'app_problem',    label: 'O app deu problema' },
] as const;
export type WinbackAnswer = typeof WINBACK_ANSWERS[number]['id'];
export const isWinbackAnswer = (a: string): a is WinbackAnswer => WINBACK_ANSWERS.some(x => x.id === a);

export function winbackToken(userId: string): string {
  return crypto.createHmac('sha256', SECRET).update(`winback:${userId}`).digest('hex').slice(0, 32);
}

export function verifyWinback(userId: string, token: string): boolean {
  if (!userId || !token) return false;
  const expected = winbackToken(userId);
  if (token.length !== expected.length) return false;
  try { return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected)); } catch { return false; }
}

export function winbackAnswerUrl(userId: string, answer: WinbackAnswer): string {
  return `${APP_URL}/api/winback?u=${encodeURIComponent(userId)}&t=${winbackToken(userId)}&a=${answer}`;
}
