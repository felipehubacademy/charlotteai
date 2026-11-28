// Textos do relatório "Onde os alunos travaram" que o painel (cliente) e o e-mail diário (servidor) dividem.

export interface RetryStops { noSpeech: number; silence: number; max: number; tap: number; unknown: number }

/** Frase com o motivo dos "fale de novo" (para o painel e o e-mail diário); vazia se não houver nada a dizer. */
export function retryStopsText(t: { retries: number; retryStops: RetryStops; micTaps: number }): string {
  const s = t.retryStops;
  const parts: string[] = [];
  if (s.noSpeech) parts.push(`${s.noSpeech} sem fala no prazo`);
  if (s.silence) parts.push(`${s.silence} parada(s) no silêncio depois da fala`);
  if (s.tap) parts.push(`${s.tap} parada(s) no toque depois da fala`);
  if (s.max) parts.push(`${s.max} no tempo máximo`);
  if (s.unknown && parts.length) parts.push(`${s.unknown} de app sem o registro do motivo`);
  const why = parts.length ? `Motivo dos "fale de novo": ${parts.join(', ')}.` : '';
  const taps = t.micTaps ? `${t.micTaps} toque(s) no microfone antes da fala (não contam como "fale de novo" nem erro).` : '';
  return [why, taps].filter(Boolean).join(' ');
}
