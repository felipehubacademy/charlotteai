// useBluetoothMicHint — detecta quando a rota de audio atual eh um fone
// Bluetooth (AirPods etc). Nesses casos o iOS/Android roteia o microfone
// para o HFP do fone, que cai para ~8kHz e degrada o reconhecimento de fala.
//
// Retorna { showHint } para exibir uma dica visual antes de exercicios de
// fala (learn-session L&S, learn-pronunciation, Practice). Nao altera o
// roteamento — decisao de produto: apenas avisar o aluno (Opcao A).
//
// Re-checa em mudancas de rota (conectar/desconectar AirPods durante a tela).

import { useEffect, useState } from 'react';
import CharlotteAudioSession from '../modules/charlotte-audio-session/src';

export function useBluetoothMicHint(active: boolean = true): { showHint: boolean } {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!active) {
      setShowHint(false);
      return;
    }

    const check = () => {
      try {
        setShowHint(CharlotteAudioSession.isUsingBluetoothMic());
      } catch {
        setShowHint(false);
      }
    };

    check();
    const sub = CharlotteAudioSession.addRouteChangeListener(check);
    return () => sub.remove();
  }, [active]);

  return { showHint };
}

export default useBluetoothMicHint;
