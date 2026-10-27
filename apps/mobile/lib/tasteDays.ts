// lib/tasteDays.ts — degustação diária (conta sem assinatura).
//
// Em vez de um tópico uma vez só, a degustação libera 1 tópico novo da trilha por dia, por
// TASTE_DAYS dias (o 1º no dia do cadastro). Dá motivo para voltar no dia seguinte; a oferta dos
// 7 dias grátis segue visível o tempo todo. O servidor usa a mesma conta (apps/web/lib/taste.ts).

export const TASTE_DAYS = 5;

// Quem já estava na degustação antes da mudança começa a contar daqui (não ganha 5 tópicos de uma vez).
const TASTE_DAILY_START = new Date(2026, 9, 28); // 28/10/2026, meia-noite local

/** Dia da degustação: 1 no dia do cadastro, 2 no dia seguinte… (dias do calendário local). */
export function tasteDayNumber(createdAt: string | null | undefined, now: Date = new Date()): number {
  const created = createdAt ? new Date(createdAt) : now;
  const start = created > TASTE_DAILY_START ? created : TASTE_DAILY_START;
  const a = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

/** Quantos tópicos da trilha estão liberados hoje (1 a TASTE_DAYS). */
export function tasteFreeUnits(createdAt: string | null | undefined, now: Date = new Date()): number {
  return Math.min(tasteDayNumber(createdAt, now), TASTE_DAYS);
}
