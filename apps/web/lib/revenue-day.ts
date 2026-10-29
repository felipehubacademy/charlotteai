// lib/revenue-day.ts — dia (calendário de Brasília) de cada linha de revenue_events.
//
// As cobranças do site (store = 'ASAAS') chegam com a data da confirmação sem horário
// ("2026-10-29"), gravada como 00:00 UTC. Convertida para Brasília (UTC-3), essa hora cai às
// 21h do DIA ANTERIOR, e toda venda do site aparecia um dia antes. Aqui a linha só com data vale
// para o próprio dia: o instante efetivo passa a ser 00h de Brasília daquela data.
// As lojas (RevenueCat) mandam data e hora de verdade, que seguem como estão.
//
// Sem dependências de servidor: usado nas rotas do /admin e também nas telas (cliente).

const DAY = 86400000;
const BRT = 3 * 3600000;

export type RevenueDateRow = { store?: string | null; purchased_at?: string | null; created_at?: string | null };

/** Linha do site gravada só com a data (00:00:00.000 UTC). */
export function isDateOnlyRevenue(row: RevenueDateRow): boolean {
  if (row.store !== 'ASAAS' || !row.purchased_at) return false;
  const t = new Date(row.purchased_at).getTime();
  return Number.isFinite(t) && t % DAY === 0;
}

/**
 * Instante da cobrança em ms UTC, pronto para comparar com períodos de Brasília.
 * Linha só com data = 00h de Brasília daquele dia. Sem purchased_at, vale o created_at.
 */
export function revenueAtMs(row: RevenueDateRow): number {
  const iso = row.purchased_at ?? row.created_at ?? null;
  if (!iso) return NaN;
  const t = new Date(iso).getTime();
  return isDateOnlyRevenue(row) ? t + BRT : t;
}

/** Dia da cobrança no calendário de Brasília (YYYY-MM-DD). */
export function revenueDayBRT(row: RevenueDateRow): string {
  const t = revenueAtMs(row);
  return Number.isFinite(t) ? new Date(t - BRT).toISOString().slice(0, 10) : '';
}

/** Mês da cobrança no calendário de Brasília (YYYY-MM). */
export function revenueMonthBRT(row: RevenueDateRow): string {
  return revenueDayBRT(row).slice(0, 7);
}
