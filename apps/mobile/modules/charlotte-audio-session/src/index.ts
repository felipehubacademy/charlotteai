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
   * Snapshot da rota atual (debug). Formato:
   *   iOS:    "BuiltInSpeaker:Speaker" ou "Headphones:Headphones" etc
   *   Android: "speaker:Speaker,earpiece:Earpiece"
   */
  getCurrentRoute(): string {
    return Native.getCurrentRoute();
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
