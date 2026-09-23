import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

/**
 * Detecta status de rede via @react-native-community/netinfo (API nativa).
 * Retorna false SÓ quando não há rede de fato (`isConnected === false` —
 * modo avião / wifi e dados desligados).
 *
 * NÃO usamos `isInternetReachable`: o probe de alcançabilidade dá falso
 * negativo no simulador e em transições de rede em devices reais, o que
 * mostraria um banner de "offline" com a internet funcionando (pior que
 * não avisar). `isConnected` é o sinal duro e confiável do cenário "sem rede".
 */
export function useNetworkStatus(): boolean {
  return false; // TEMP-VERIFY: forcar banner visivel p/ conferir posicao (REMOVER)
  // eslint-disable-next-line no-unreachable
  const [isOnline, setIsOnline] = useState(true); // otimista no cold start

  useEffect(() => {
    NetInfo.fetch().then((state: NetInfoState) => {
      setIsOnline(state.isConnected !== false);
    });

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOnline(state.isConnected !== false);
    });

    return unsubscribe;
  }, []);

  return isOnline;
}
