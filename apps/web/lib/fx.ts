// lib/fx.ts
// Cotação de moeda estrangeira para real. A AwesomeAPI às vezes recusa
// chamadas vindas de servidores de nuvem (Vercel), então há duas fontes
// reserva: Frankfurter (BCE) e ExchangeRate-API. Retorna 0 se nenhuma responder.

async function tryRate(url: string, pick: (j: any) => unknown): Promise<number> {
  try {
    const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!r.ok) return 0;
    const rate = Number(pick(await r.json()));
    return Number.isFinite(rate) && rate > 0 ? rate : 0;
  } catch {
    return 0;
  }
}

export async function fxToBrl(currency: string): Promise<number> {
  const cur = (currency || 'BRL').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  if (cur === 'BRL') return 1;
  return (await tryRate(`https://economia.awesomeapi.com.br/json/last/${cur}-BRL`, j => j?.[`${cur}BRL`]?.bid))
    || (await tryRate(`https://api.frankfurter.dev/v1/latest?base=${cur}&symbols=BRL`, j => j?.rates?.BRL))
    || (await tryRate(`https://open.er-api.com/v6/latest/${cur}`, j => j?.rates?.BRL));
}
