// lib/push-quiet-hours.ts
// Janela de envio de push: das 9h às 21h no horário do aluno. Fora dela nenhum push de
// engajamento ou da competição sai (antes o "oi da Charlotte" chegava às 23h e até às 4h).

const DEFAULT_TZ = 'America/Sao_Paulo';
export const PUSH_WINDOW_START = 9;  // primeira hora permitida (9:00)
export const PUSH_WINDOW_END = 21;   // a partir das 21:00 não envia

function localHour(now: Date, tz: string): number {
  try {
    const h = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).format(now);
    return parseInt(h, 10) % 24;
  } catch {
    return tz === DEFAULT_TZ ? now.getUTCHours() : localHour(now, DEFAULT_TZ);
  }
}

/** true = fora da janela de envio no fuso do aluno. */
export function inQuietHours(tz: string | null | undefined, now: Date = new Date()): boolean {
  const h = localHour(now, tz || DEFAULT_TZ);
  return h < PUSH_WINDOW_START || h >= PUSH_WINDOW_END;
}
