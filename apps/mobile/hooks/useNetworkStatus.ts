import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Status de rede confiável.
 *
 * O netinfo sozinho NÃO basta: no simulador iOS (e às vezes em transições de
 * rede em devices) ele reporta `isConnected: false` mesmo COM internet, o que
 * fazia o banner "sem conexão" aparecer online. Solução (padrão dos apps
 * sérios): só declarar offline depois de CONFIRMAR com um teste real de
 * alcançabilidade. Se um HEAD rápido responde, estamos online — não importa o
 * que o netinfo diga.
 */

const PROBE_URL     = 'https://charlotte.hubacademybr.com/favicon.ico';
const PROBE_TIMEOUT = 3000;

async function reachable(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT);
    await fetch(`${PROBE_URL}?_=${Date.now()}`, { method: 'HEAD', cache: 'no-store', signal: ctrl.signal });
    clearTimeout(t);
    return true; // qualquer resposta HTTP = alcançável (mesmo 404/500)
  } catch {
    return false; // throw/timeout/abort = sem internet
  }
}

export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true); // otimista no cold start

  useEffect(() => {
    let cancelled = false;

    const evaluate = async () => {
      const state = await NetInfo.fetch();
      // netinfo com certeza conectado -> online, sem custo de probe.
      if (state.isConnected === true) {
        if (!cancelled) setIsOnline(true);
        return;
      }
      // netinfo diz desconectado/desconhecido -> CONFIRMA com teste real
      // (evita falso positivo do simulador e de transições de rede).
      const ok = await reachable();
      if (!cancelled) setIsOnline(ok);
    };

    evaluate();
    const unsubscribe = NetInfo.addEventListener(() => { evaluate(); });

    return () => { cancelled = true; unsubscribe(); };
  }, []);

  return isOnline;
}
