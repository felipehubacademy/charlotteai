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
import { AppState } from 'react-native';
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

    // Em telas sem Live Voice ativo (ex: Pronuncia), o onRouteChange do
    // CharlotteAudioSession NAO dispara (so emite quando a session esta ativa).
    // Por isso poll leve + re-check ao voltar do background: cobre conectar/
    // desconectar AirPods enquanto a tela esta aberta.
    const sub = CharlotteAudioSession.addRouteChangeListener(check);
    const poll = setInterval(check, 2000);
    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });

    return () => {
      sub.remove();
      clearInterval(poll);
      appSub.remove();
    };
  }, [active]);

  return { showHint };
}

export default useBluetoothMicHint;
