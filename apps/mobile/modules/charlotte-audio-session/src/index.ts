// charlotte-audio-session — TS wrapper do Expo Module nativo.
//
// Uso esperado no LiveVoiceModal:
//
//   await CharlotteAudioSession.start(true);          // speaker on
//   ...
//   await CharlotteAudioSession.setSpeakerOn(false);   // earpiece
//   ...
//   await CharlotteAudioSession.stop();
//
// O modulo configura AVAudioSession (iOS) / AudioManager (Android) com
// mode .default + DefaultToSpeaker e listener de mudancas de rota.
// Substitui InCallManager (que usava mode .voiceChat e quebrava com cabo USB).

import { requireNativeModule, type EventSubscription } from 'expo-modules-core';

export interface RouteChangeEvent {
  // iOS
  reason?: number;
  outputs?: string;
  // Android
  action?: string;
  state?: number;
}

export interface InterruptionEvent {
  type: number; // iOS AVAudioSession.InterruptionType raw
}

type Events = {
  onRouteChange: (event: RouteChangeEvent) => void;
  onInterruption: (event: InterruptionEvent) => void;
};

interface CharlotteAudioSessionNative {
  start(preferSpeaker: boolean): Promise<boolean>;
  stop(): Promise<void>;
  setSpeakerOn(on: boolean): Promise<boolean>;
  playRingback(): Promise<boolean>;
  stopRingback(): Promise<void>;
  getCurrentRoute(): string;
  addListener<E extends keyof Events>(eventName: E, listener: Events[E]): EventSubscription;
}

const Native = requireNativeModule<CharlotteAudioSessionNative>('CharlotteAudioSession');

const CharlotteAudioSession = {
  /**
   * Inicia a sessao de audio para Live Voice.
   * Idempotente — pode ser chamado varias vezes.
   *
   * @param preferSpeaker - true: speaker (default), false: earpiece
   */
  start(preferSpeaker: boolean = true): Promise<boolean> {
    return Native.start(preferSpeaker);
  },

  /**
   * Desativa a sessao e devolve controle ao sistema.
   */
  stop(): Promise<void> {
    return Native.stop();
  },

  /**
   * Toggle speaker/earpiece em tempo real durante a chamada.
   */
  setSpeakerOn(on: boolean): Promise<boolean> {
    return Native.setSpeakerOn(on);
  },

  /**
   * Toca ringback em loop (incallmanager_ringback.mp3 bundlado).
   * Player roda DENTRO da nossa session — zero conflito com a call.
   * Se start() ainda nao foi chamado, configura session com defaults.
   */
  playRingback(): Promise<boolean> {
    return Native.playRingback();
  },

  /**
   * Para o ringback. Mantem a session ativa (para a call).
   */
  stopRingback(): Promise<void> {
    return Native.stopRingback();
  },

  /**
   * Snapshot da rota atual (debug). Formato:
   *   iOS:    "BuiltInSpeaker:Speaker" ou "Headphones:Headphones" etc
   *   Android: "speaker:Speaker,earpiece:Earpiece"
   */
  getCurrentRoute(): string {
    return Native.getCurrentRoute();
  },

  /**
   * true quando a rota de audio atual eh um dispositivo Bluetooth (AirPods,
   * fones BT, etc). Nesses casos o mic vira o HFP do fone — qualidade baixa
   * (8kHz) que degrada o reconhecimento de fala. Usado para exibir uma dica
   * visual ("fale proximo ao iPhone" / "remova os AirPods") antes de
   * exercicios de fala. iOS: rota reportada como "BluetoothHFP:...",
   * "BluetoothA2DP:...", "BluetoothLE:...". Android: "bluetooth*:...".
   */
  isUsingBluetoothMic(): boolean {
    try {
      const route = (Native.getCurrentRoute() || '').toLowerCase();
      return route.includes('bluetooth');
    } catch {
      return false;
    }
  },

  /**
   * Listener pra mudancas de rota de audio. Usado pra logging/analytics.
   * O modulo nativo JA re-aplica speaker override automaticamente — este
   * listener nao precisa fazer nada. Util pra debug.
   */
  addRouteChangeListener(callback: (e: RouteChangeEvent) => void): EventSubscription {
    return Native.addListener('onRouteChange', callback);
  },

  /**
   * Listener pra interrupcoes (chamada telefonica, Siri, etc).
   * O modulo nativo re-ativa session no .ended automaticamente.
   */
  addInterruptionListener(callback: (e: InterruptionEvent) => void): EventSubscription {
    return Native.addListener('onInterruption', callback);
  },
};

export default CharlotteAudioSession;
