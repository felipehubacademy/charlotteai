// useAudioSessionKeeper — mantém a AVAudioSession do iOS ativa durante o
// exercicio. Sem isso, o doNotMix do setAudioModeAsync so pausa o Spotify
// ENQUANTO o app esta produzindo audio — entre Charlotte/SFX o iOS desativa
// a sessao e Spotify retoma. Truque conhecido (Duolingo).
//
// Por-screen (nao singleton): o player vive dentro do useEffect, morre no
// unmount. Sem risco de bleed entre tabs. Live Voice tem categoria
// .voiceChat propria que sobrescreve isso de qualquer jeito.
//
// Uso:
//   useAudioSessionKeeper(); // dentro do componente do exercise screen

import { useEffect } from 'react';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';

export function useAudioSessionKeeper(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    let player: AudioPlayer | null = null;
    try {
      // Reusa intro_app.mp3 (ja bundled). Volume 0 = silencioso. Loop = true
      // garante que a sessao fica continuamente ativa.
      player = createAudioPlayer(require('../assets/audio/sfx/intro_app.mp3'));
      player.loop = true;
      player.volume = 0;
      player.play();
    } catch (e) {
      console.warn('[useAudioSessionKeeper] start failed', e);
    }
    return () => {
      try { player?.pause(); player?.remove(); } catch {}
    };
  }, [enabled]);
}
