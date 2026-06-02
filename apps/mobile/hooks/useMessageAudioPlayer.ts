/**
 * useMessageAudioPlayer
 *
 * Single persistent AudioPlayer that switches sources via replace().
 * Calling play() before isLoaded is a race on expo-audio — we wait for
 * the playbackStatusUpdate 'isLoaded' event before playing.
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import { createAudioPlayer, AudioPlayer, setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';
import { AudioStatus } from 'expo-audio/build/Audio.types';

export function useMessageAudioPlayer() {
  const playerRef    = useRef<AudioPlayer | null>(null);
  const currentIdRef  = useRef<string | null>(null);
  const currentUriRef = useRef<string | null>(null);
  const pendingPlay   = useRef<string | null>(null); // id waiting for isLoaded
  const subRef       = useRef<ReturnType<AudioPlayer['addListener']> | null>(null);
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Polling defensivo: alguns devices nao disparam playbackStatusUpdate
  // no instante em que o audio termina. Verifica a cada 120ms se o player
  // ainda esta tocando — se nao, limpa o estado imediatamente.
  useEffect(() => {
    if (!playingId) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      // Ainda nao comecou (pendingPlay) — ignora
      if (pendingPlay.current) return;
      if (!p.playing) {
        setPlayingId(null);
      }
    }, 120);
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [playingId]);

  // Create a single player on mount; destroy on unmount
  useEffect(() => {
    const p = createAudioPlayer(null);
    playerRef.current = p;
    return () => {
      subRef.current?.remove();
      try { p.pause(); p.remove(); } catch {}
    };
  }, []);

  const toggle = useCallback(async (id: string, uri: string) => {
    const player = playerRef.current;
    if (!player) return;

    // Same ID *and* same URI → just toggle play/pause.
    // Same ID but different URI (e.g. learn exercises reusing 'charlotte-learn-phrase')
    // must replace the source, so treat as a new source.
    const isSame = currentIdRef.current === id && currentUriRef.current === uri;

    // ── Same bubble ────────────────────────────────────────────
    if (isSame) {
      pendingPlay.current = null; // cancel any pending-load
      if (player.playing) {
        try { player.pause(); } catch {}
        setPlayingId(null);
      } else {
        try { player.play(); } catch {}
        setPlayingId(id);
      }
      return;
    }

    // ── Different bubble — replace source ──────────────────────
    subRef.current?.remove();
    subRef.current = null;

    // Ensure speaker output (resets after recording or live voice call).
    // NAO mudamos interruptionMode aqui — o screen mount ja setou doNotMix
    // e soundEngine nao reverte mais. Mudar mode antes do replace causava
    // hiccup que cortava o audio no comeco.
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldRouteThroughEarpiece: false,
        interruptionMode: 'doNotMix',
      });
      await setIsAudioActiveAsync(true);
    } catch {}

    try { player.pause(); } catch {}

    currentIdRef.current  = id;
    currentUriRef.current = uri;
    pendingPlay.current   = id;

    // Replace source — native layer starts loading
    try { player.replace({ uri }); } catch {}

    // Listen for load + finish events
    subRef.current = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      // Wait for load before playing (avoids "play before ready" race)
      if (pendingPlay.current === id && status.isLoaded && !status.playing) {
        pendingPlay.current = null;
        try { player.play(); } catch {}
        setPlayingId(id);
      }

      // Natural end of playback. Em alguns devices o didJustFinish nao
      // dispara confiavelmente — fallback usa currentTime >= duration.
      const reachedEnd =
        status.didJustFinish ||
        (status.isLoaded && !status.playing && status.duration > 0 &&
          status.currentTime >= status.duration - 0.08);
      if (reachedEnd && currentIdRef.current === id) {
        subRef.current?.remove();
        subRef.current = null;
        currentIdRef.current = null;
        currentUriRef.current = null;
        setPlayingId(null);
      }
    });

    // Fallback: if isLoaded event never fires (expo-audio race on some devices),
    // attempt play after 1.5s so the button doesn't stay stuck.
    setTimeout(() => {
      if (pendingPlay.current === id) {
        pendingPlay.current = null;
        try { player.play(); } catch {}
      }
    }, 1500);

    // Optimistically show as "playing" immediately for snappy UI
    setPlayingId(id);
  }, []);

  const stop = useCallback(() => {
    subRef.current?.remove();
    subRef.current = null;
    pendingPlay.current = null;
    try { playerRef.current?.pause(); } catch {}
    currentIdRef.current = null;
    setPlayingId(null);
  }, []);

  return {
    playingMessageId: playingId,
    toggle,
    stop,
  };
}
