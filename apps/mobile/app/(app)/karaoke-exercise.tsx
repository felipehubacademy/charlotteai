/**
 * karaoke-exercise.tsx — Beta: Read Aloud (Karaoke)
 *
 * Layout: Charlotte video (top, always visible) + white box (karaoke + mic).
 * Charlotte stays on screen during user's turn (frozen on last frame).
 * Video and audio are exclusive: audio only loads when no video exists.
 */

import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import {
  View, TouchableOpacity, Animated, StatusBar, StyleSheet, ActivityIndicator, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Microphone, MicrophoneSlash, ArrowLeft, CheckCircle, Play } from 'phosphor-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer, RecordingPresets } from 'expo-audio';
import { AudioStatus } from 'expo-audio/build/Audio.types';
import { useVideoPlayer, VideoView } from 'expo-video';

import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/hooks/useAuth';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

const KARAOKE_RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

// ── Types ─────────────────────────────────────────────────────────
interface WordTiming { word: string; start: number; end: number; }
type WordScore  = 'dim' | 'good' | 'ok' | 'bad' | 'omission';
type ChunkPhase = 'upcoming' | 'charlotte' | 'listening' | 'scoring' | 'done';

interface ChunkState {
  phase:       ChunkPhase;
  wordScores:  WordScore[];
  attempts:    number;
  timings:     WordTiming[];
  currentTime: number;
}

interface KaraokeChunk    { text: string; words: string[]; translation?: string; }
interface KaraokeExercise { sentence: string; chunks: KaraokeChunk[]; }
interface KaraokeText     { level: 'Novice' | 'Inter' | 'Advanced'; title: string; exercises: KaraokeExercise[]; }

// ── Test data ─────────────────────────────────────────────────────
const KARAOKE_DATA: KaraokeText[] = [
  {
    level: 'Novice', title: 'My Morning Routine',
    exercises: [{
      sentence: 'Every morning, I wake up at seven.',
      chunks: [
        { text: 'Every morning',  words: ['Every', 'morning'],        translation: 'Todo dia de manhã' },
        { text: 'I wake up',      words: ['I', 'wake', 'up'],         translation: 'Eu acordo' },
        { text: 'at seven',       words: ['at', 'seven'],             translation: 'às sete' },
      ],
    }],
  },
  {
    level: 'Inter', title: 'An Unexpected Opportunity',
    exercises: [{
      sentence: 'After months of working overtime, she finally decided to hand in her resignation.',
      chunks: [
        { text: 'After months of working overtime', words: ['After', 'months', 'of', 'working', 'overtime'] },
        { text: 'she finally decided',              words: ['she', 'finally', 'decided'] },
        { text: 'to hand in her resignation',       words: ['to', 'hand', 'in', 'her', 'resignation'] },
      ],
    }],
  },
  {
    level: 'Advanced', title: 'Nobody Warned Daniel',
    exercises: [{
      sentence: 'He kept telling himself he just needed more time to adjust, but deep down he knew something had to change.',
      chunks: [
        { text: 'He kept telling himself',            words: ['He', 'kept', 'telling', 'himself'] },
        { text: 'he just needed more time to adjust', words: ['he', 'just', 'needed', 'more', 'time', 'to', 'adjust'] },
        { text: 'but deep down he knew',              words: ['but', 'deep', 'down', 'he', 'knew'] },
        { text: 'something had to change',            words: ['something', 'had', 'to', 'change'] },
      ],
    }],
  },
];

// ── Palette ───────────────────────────────────────────────────────
const C = {
  bg:          '#16153A',
  accent:      '#7C3AED',
  accentLight: '#A78BFA',
  white:       '#FFFFFF',
  whiteAlpha:  'rgba(255,255,255,0.45)',
  wordGood:    '#4ADE80',
  wordOk:      '#FCD34D',
  wordBad:     '#F87171',
  wordOmit:    '#DC2626',
};

// Colors for words on the white bottom box
const CW = {
  dim:    'rgba(0,0,0,0.18)',
  active: '#7C3AED',
  spoken: '#1e1b4b',
  good:   '#16a34a',
  ok:     '#d97706',
  bad:    '#dc2626',
  omit:   '#991b1b',
};

function scoreColorW(s: WordScore): string {
  switch (s) {
    case 'good':     return CW.good;
    case 'ok':       return CW.ok;
    case 'bad':      return CW.bad;
    case 'omission': return CW.omit;
    default:         return CW.dim;
  }
}

// ── Main screen ───────────────────────────────────────────────────
export default function KaraokeExerciseScreen() {
  const { profile, session } = useAuth();
  const userId       = session?.user?.id ?? '';
  const defaultLevel = (profile?.charlotte_level ?? 'Inter') as 'Novice' | 'Inter' | 'Advanced';
  const [selectedLevel, setSelectedLevel] = useState<'Novice' | 'Inter' | 'Advanced'>(defaultLevel);
  const userLevel = selectedLevel;
  const isPt      = userLevel === 'Novice';
  const data      = KARAOKE_DATA.find(d => d.level === userLevel) ?? KARAOKE_DATA[1];

  const [exIdx, setExIdx] = useState(0);
  const [done,  setDone]  = useState(false);
  const exercise          = data.exercises[exIdx];

  const initChunkStates = (ex: KaraokeExercise): ChunkState[] =>
    ex.chunks.map((_, i) => ({
      phase: i === 0 ? 'charlotte' : 'upcoming',
      wordScores: [], attempts: 0, timings: [], currentTime: 0,
    }));

  const [chunks, setChunks] = useState<ChunkState[]>(() => initChunkStates(exercise));
  const activeIdx = chunks.findIndex(c => c.phase !== 'done' && c.phase !== 'upcoming');

  // Video state
  const [isVideoLoading, setIsVideoLoading] = useState(false); // download in progress
  const [readyToPlay,    setReadyToPlay]    = useState(false); // download done, waiting for tap
  const [showVideoView,  setShowVideoView]  = useState(false); // video confirmed playing

  // Pending URIs — set during download, consumed when user taps play
  const pendingVideoUri = useRef<string | null>(null);
  const pendingAudioUri = useRef<string | null>(null);
  const pendingTimings  = useRef<WordTiming[]>([]);
  const pendingChunkIdx = useRef(0);

  // Mic pulse + tooltip
  const micPulse       = useRef(new Animated.Value(1)).current;
  const micPulseLoop   = useRef<Animated.CompositeAnimation | null>(null);
  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  const tooltipY       = useRef(new Animated.Value(8)).current;

  // Audio player
  const playerRef   = useRef<AudioPlayer | null>(null);
  const subRef      = useRef<ReturnType<AudioPlayer['addListener']> | null>(null);
  const pendingPlay = useRef(false);
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  // Silence detection
  const silencePollRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const safetyTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSpeechRef         = useRef(false);
  const meteringWorkedRef    = useRef(false);
  const silenceStartRef      = useRef<number | null>(null);
  const recordStartRef       = useRef(0);
  const userInitiatedScoreRef = useRef(false);

  const recorder    = useAudioRecorder(KARAOKE_RECORDING_OPTIONS, 12);
  const videoPlayer = useVideoPlayer(null, () => {});
  const videoSubRef = useRef<ReturnType<typeof videoPlayer.addListener> | null>(null);

  const patchChunk = useCallback((idx: number, patch: Partial<ChunkState>) => {
    setChunks(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c));
  }, []);

  // ── Tooltip: aparece durante 'listening', some quando fecha ──
  useEffect(() => {
    const listening = activeIdx >= 0 && chunks[activeIdx]?.phase === 'listening';
    Animated.parallel([
      Animated.timing(tooltipOpacity, { toValue: listening ? 1 : 0, duration: 220, useNativeDriver: true }),
      Animated.timing(tooltipY,       { toValue: listening ? 0 : 8, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [activeIdx, chunks]); // eslint-disable-line react-hooks/exhaustive-deps

  const scoreChunkRef = useRef<(idx: number) => void>(() => {});

  // ── Audio player setup ───────────────────────────────────────
  useEffect(() => {
    const player = createAudioPlayer(null);
    playerRef.current = player;
    return () => {
      subRef.current?.remove();
      videoSubRef.current?.remove();
      if (pollRef.current)        clearInterval(pollRef.current);
      if (silencePollRef.current) clearInterval(silencePollRef.current);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      micPulseLoop.current?.stop();
      try { player.pause(); player.remove(); } catch {}
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Poll currentTime for karaoke word highlight ──────────────
  // Video and audio player are exclusive — check which one is playing.
  useEffect(() => {
    pollRef.current = setInterval(() => {
      if (activeIdx < 0) return;
      if (showVideoView && videoPlayer.playing) {
        const t = videoPlayer.currentTime ?? 0;
        patchChunk(activeIdx, { currentTime: t });
      } else if (playerRef.current?.playing) {
        const t = playerRef.current.currentTime ?? 0;
        patchChunk(activeIdx, { currentTime: t });
      }
    }, 50);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeIdx, patchChunk, showVideoView, videoPlayer]);

  // ── Fetch helpers ────────────────────────────────────────────
  const fetchTimings = useCallback(async (text: string): Promise<WordTiming[]> => {
    try {
      const cacheDir = `${FileSystem.documentDirectory}tts_cache/`;
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true }).catch(() => {});
      const key      = text.slice(0, 80).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const localUri = `${cacheDir}karaoke_${key}.json`;
      const info     = await FileSystem.getInfoAsync(localUri);
      if (info.exists) return JSON.parse(await FileSystem.readAsStringAsync(localUri));
      const res = await fetch(`${API_BASE_URL}/tts/${key}.json`);
      if (res.ok) {
        const t: WordTiming[] = await res.json();
        await FileSystem.writeAsStringAsync(localUri, JSON.stringify(t));
        return t;
      }
    } catch {}
    return [];
  }, []);

  const fetchVideo = useCallback(async (text: string): Promise<string | null> => {
    try {
      const cacheDir = `${FileSystem.documentDirectory}tts_cache/`;
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true }).catch(() => {});
      const key      = text.slice(0, 80).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const localUri = `${cacheDir}karaoke_${key}.mp4`;
      const info     = await FileSystem.getInfoAsync(localUri);
      if (info.exists) return localUri;
      const dl = await FileSystem.downloadAsync(`${API_BASE_URL}/tts/${key}.mp4`, localUri);
      if (dl.status === 200) return localUri;
      await FileSystem.deleteAsync(localUri, { idempotent: true });
      return null;
    } catch { return null; }
  }, []);

  const fetchAudio = useCallback(async (text: string): Promise<string | null> => {
    try {
      const cacheDir = `${FileSystem.documentDirectory}tts_cache/`;
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true }).catch(() => {});
      const key      = text.slice(0, 80).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const localUri = `${cacheDir}karaoke_${key}.mp3`;
      const info     = await FileSystem.getInfoAsync(localUri);
      if (info.exists) return localUri;
      const dl = await FileSystem.downloadAsync(`${API_BASE_URL}/tts/${key}.mp3`, localUri);
      if (dl.status === 200) return localUri;
      await FileSystem.deleteAsync(localUri, { idempotent: true });
      const res = await fetch(`${API_BASE_URL}/api/tts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source: 'karaoke', ...(userId ? { userId } : {}) }),
      });
      if (!res.ok) return null;
      const d = await res.json();
      if (!d.audio) return null;
      await FileSystem.writeAsStringAsync(localUri, d.audio, { encoding: 'base64' as any });
      return localUri;
    } catch { return null; }
  }, [userId]);

  // ── Download chunk assets → show play button when ready ──────
  const playChunk = useCallback(async (idx: number) => {
    const chunk = exercise.chunks[idx];
    if (!chunk) return;

    subRef.current?.remove();
    videoSubRef.current?.remove();
    subRef.current = null;
    videoSubRef.current = null;
    pendingPlay.current = false;
    pendingVideoUri.current = null;
    pendingAudioUri.current = null;
    pendingChunkIdx.current = idx;

    setIsVideoLoading(true);
    setReadyToPlay(false);
    setShowVideoView(false);
    patchChunk(idx, { phase: 'charlotte', currentTime: 0, timings: [] });

    // Android: expo-video has known local playback issues — use audio only
    const videoUri = Platform.OS === 'android' ? null : await fetchVideo(chunk.text);

    if (videoUri) {
      const timings = await fetchTimings(chunk.text);
      pendingTimings.current = timings;
      patchChunk(idx, { timings });
      pendingVideoUri.current = videoUri;
    } else {
      const [audioUri, timings] = await Promise.all([
        fetchAudio(chunk.text),
        fetchTimings(chunk.text),
      ]);
      pendingTimings.current = timings;
      patchChunk(idx, { timings });
      pendingAudioUri.current = audioUri;
    }

    setIsVideoLoading(false);
    // Chunk 0: show play button so user controls when to start.
    // Chunks 1+: auto-play immediately after download.
    if (idx === 0) {
      setReadyToPlay(true);
    } else {
      startPlaying();
    }
  }, [exercise, fetchVideo, fetchAudio, fetchTimings, patchChunk]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── User taps play → Charlotte speaks ────────────────────────
  const startPlaying = useCallback(async () => {
    const idx      = pendingChunkIdx.current;
    const videoUri = pendingVideoUri.current;
    const audioUri = pendingAudioUri.current;

    setReadyToPlay(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (videoUri) {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldRouteThroughEarpiece: false }).catch(() => {});

      try {
        videoPlayer.replace({ uri: videoUri });
        videoPlayer.muted = false;
        videoPlayer.play();

        let videoStarted = false;
        videoSubRef.current = videoPlayer.addListener('playingChange', ({ isPlaying }: { isPlaying: boolean }) => {
          if (isPlaying && !videoStarted) {
            videoStarted = true;
            setShowVideoView(true);
          } else if (!isPlaying && videoStarted) {
            videoSubRef.current?.remove();
            videoSubRef.current = null;
            openMic(idx);
          }
        });

        setTimeout(() => { if (!videoStarted) openMic(idx); }, 15_000);
      } catch { openMic(idx); }
      return;
    }

    if (!audioUri || !playerRef.current) { openMic(idx); return; }

    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldRouteThroughEarpiece: false }).catch(() => {});
      playerRef.current.replace({ uri: audioUri });
      pendingPlay.current = true;

      subRef.current = playerRef.current.addListener('playbackStatusUpdate', (status: AudioStatus) => {
        if (pendingPlay.current && status.isLoaded && !status.playing) {
          pendingPlay.current = false;
          try { playerRef.current?.play(); } catch {}
        }
        if (status.didJustFinish) {
          subRef.current?.remove();
          subRef.current = null;
          openMic(idx);
        }
      });

      setTimeout(() => {
        if (pendingPlay.current) {
          pendingPlay.current = false;
          try { playerRef.current?.play(); } catch {}
        }
      }, 1500);
    } catch { openMic(idx); }
  }, [videoPlayer]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Open mic ─────────────────────────────────────────────────
  const openMic = useCallback(async (idx: number) => {
    patchChunk(idx, { phase: 'listening' });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Freeze video on last frame during user's turn
    try { videoPlayer.pause(); } catch {}

    micPulseLoop.current?.stop();
    micPulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(micPulse, { toValue: 1.25, duration: 600, useNativeDriver: true }),
        Animated.timing(micPulse, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ])
    );
    micPulseLoop.current.start();

    await recorder.startRecording();

    hasSpeechRef.current          = false;
    meteringWorkedRef.current     = false;
    silenceStartRef.current       = null;
    recordStartRef.current        = Date.now();
    userInitiatedScoreRef.current = false;

    if (silencePollRef.current) clearInterval(silencePollRef.current);
    silencePollRef.current = setInterval(() => {
      const elapsed  = Date.now() - recordStartRef.current;
      const metering = recorder.getMeteringLevel();

      if (metering !== undefined && metering !== null) {
        meteringWorkedRef.current = true;
        if (!hasSpeechRef.current && metering > -20) {
          hasSpeechRef.current    = true;
          silenceStartRef.current = null;
        }
        if (hasSpeechRef.current) {
          if (metering < -35) {
            if (!silenceStartRef.current) silenceStartRef.current = Date.now();
            if (Date.now() - silenceStartRef.current >= 450 && elapsed >= 700) {
              clearInterval(silencePollRef.current!);
              silencePollRef.current = null;
              if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null; }
              scoreChunkRef.current(idx);
              return;
            }
          } else {
            silenceStartRef.current = null;
          }
        }
      }
    }, 100);

    const wordCount = exercise.chunks[idx]?.words.length ?? 4;
    const safetyCap = Math.max(2500, wordCount * 700 + 800);
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    safetyTimerRef.current = setTimeout(() => {
      safetyTimerRef.current = null;
      if (silencePollRef.current) { clearInterval(silencePollRef.current); silencePollRef.current = null; }
      scoreChunkRef.current(idx);
    }, safetyCap);
  }, [recorder, micPulse, patchChunk, videoPlayer]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Score chunk ──────────────────────────────────────────────
  const scoreChunk = useCallback(async (idx: number) => {
    if (silencePollRef.current) { clearInterval(silencePollRef.current); silencePollRef.current = null; }
    if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null; }

    if (meteringWorkedRef.current && !hasSpeechRef.current && !userInitiatedScoreRef.current) {
      await recorder.stopRecording().catch(() => {});
      setTimeout(() => openMic(idx), 300);
      return;
    }

    micPulseLoop.current?.stop();
    micPulse.setValue(1);

    patchChunk(idx, { phase: 'scoring' });
    const result = await recorder.stopRecording();

    const chunk = exercise.chunks[idx];
    if (!result?.uri) {
      patchChunk(idx, { phase: 'done', wordScores: chunk.words.map(() => 'dim') });
      advance(idx);
      return;
    }

    try {
      const lower    = result.uri.toLowerCase();
      const isWav    = lower.endsWith('.wav');
      const formData = new FormData();
      formData.append('audio', { uri: result.uri, name: isWav ? 'r.wav' : 'r.m4a', type: isWav ? 'audio/wav' : 'audio/x-m4a' } as unknown as Blob);
      formData.append('referenceText', chunk.text);
      if (userId) formData.append('userId', userId);

      const res  = await fetch(`${API_BASE_URL}/api/pronunciation`, { method: 'POST', body: formData });
      const d    = await res.json();
      const words: Array<{ word: string; accuracyScore: number; errorType: string }> = d.result?.words ?? [];

      const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
      const scores: WordScore[] = chunk.words.map(ref => {
        const match = words.find(w => norm(w.word) === norm(ref));
        if (!match || match.errorType === 'Omission') return 'omission';
        if (match.accuracyScore >= 80) return 'good';
        if (match.accuracyScore >= 50) return 'ok';
        return 'bad';
      });

      const hasOmission     = scores.includes('omission');
      const currentAttempts = chunks[idx]?.attempts ?? 0;

      if (hasOmission && currentAttempts < 2) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        patchChunk(idx, { phase: 'listening', wordScores: scores, attempts: currentAttempts + 1 });
        setTimeout(() => openMic(idx), 800);
      } else {
        Haptics.notificationAsync(
          scores.every(s => s === 'good')
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Warning
        );
        patchChunk(idx, { phase: 'done', wordScores: scores });
        setTimeout(() => advance(idx), 600);
      }
    } catch {
      patchChunk(idx, { phase: 'done', wordScores: chunk.words.map(() => 'dim') });
      advance(idx);
    }
  }, [exercise, recorder, chunks, patchChunk, micPulse]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => { scoreChunkRef.current = scoreChunk; }, [scoreChunk]);

  // ── Advance to next chunk ────────────────────────────────────
  const advance = useCallback((idx: number) => {
    const next = idx + 1;
    if (next < exercise.chunks.length) {
      patchChunk(next, { phase: 'charlotte' });
      playChunk(next);
    } else {
      const nextEx = exIdx + 1;
      if (nextEx < data.exercises.length) {
        setExIdx(nextEx);
      } else {
        setDone(true);
      }
    }
  }, [exercise, exIdx, data.exercises, patchChunk, playChunk]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reset on level change ────────────────────────────────────
  useEffect(() => {
    subRef.current?.remove();
    videoSubRef.current?.remove();
    if (silencePollRef.current) clearInterval(silencePollRef.current);
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    micPulseLoop.current?.stop();
    micPulse.setValue(1);
    try { playerRef.current?.pause(); videoPlayer.pause(); } catch {}
    setShowVideoView(false);
    setIsVideoLoading(false);
    setReadyToPlay(false);
    setExIdx(0);
    setDone(false);
    setChunks(initChunkStates(data.exercises[0]));
  }, [selectedLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setChunks(initChunkStates(data.exercises[exIdx]));
  }, [exIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (chunks[0]?.phase === 'charlotte') playChunk(0);
  }, [exIdx, selectedLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Word color (white box) ───────────────────────────────────
  function wordColor(chunkIdx: number, wordIdx: number): string {
    const state = chunks[chunkIdx];
    if (!state) return CW.dim;
    switch (state.phase) {
      case 'upcoming': return CW.dim;
      case 'charlotte': {
        if (!state.timings.length) return CW.dim;
        const t = state.timings[wordIdx];
        if (!t) return CW.dim;
        if (t.start <= state.currentTime && state.currentTime < t.end) return CW.active;
        if (t.end <= state.currentTime) return CW.spoken;
        return CW.dim;
      }
      case 'listening':
      case 'scoring':
        if (state.wordScores.length) return scoreColorW(state.wordScores[wordIdx] ?? 'dim');
        return CW.spoken;
      case 'done':
        return scoreColorW(state.wordScores[wordIdx] ?? 'dim');
      default: return CW.dim;
    }
  }

  // ── Done screen ──────────────────────────────────────────────
  if (done) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <CheckCircle size={64} color={C.wordGood} weight="fill" />
        <AppText style={{ fontSize: 26, fontWeight: '800', color: C.white, marginTop: 20, textAlign: 'center' }}>
          {isPt ? 'Muito bem!' : 'Great job!'}
        </AppText>
        <AppText style={{ fontSize: 15, color: C.whiteAlpha, marginTop: 8, textAlign: 'center' }}>
          {data.title}
        </AppText>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 36, backgroundColor: C.accent, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 40 }}
        >
          <AppText style={{ fontSize: 16, fontWeight: '800', color: C.white }}>
            {isPt ? 'Voltar' : 'Back'}
          </AppText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const activeState = activeIdx >= 0 ? chunks[activeIdx] : null;
  const isListening = activeState?.phase === 'listening';
  const isCharlotte = activeState?.phase === 'charlotte';
  const totalDone   = chunks.filter(c => c.phase === 'done').length;
  const progressPct = totalDone / exercise.chunks.length;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ── Charlotte zone (top) ───────────────────────────────── */}
      <View style={styles.charlotteZone}>

        {/* Header — above image, not overlapping Charlotte */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ArrowLeft size={22} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <AppText style={styles.headerTitle}>{data.title}</AppText>
          <View style={{ width: 22 }} />
        </View>

        {/* Progress bar */}
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
        </View>

        {/* Media area — Charlotte image + video, below header */}
        <View style={styles.charlotteMedia}>
          {/* Static image — wrapper centraliza o conteúdo do PNG */}
          <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
            <Image
              source={require('@/assets/charlotte-bust.png')}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          </View>

          {/* Video — only rendered after video is confirmed playing */}
          {showVideoView && (
            <VideoView
              player={videoPlayer}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              nativeControls={false}
              allowsFullscreen={false}
              allowsPictureInPicture={false}
            />
          )}

          {/* Loading overlay — opaque while downloading */}
          {isVideoLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color="rgba(255,255,255,0.6)" size="large" />
            </View>
          )}

          {/* Play button — download done, waiting for user tap */}
          {readyToPlay && (
            <TouchableOpacity
              onPress={startPlaying}
              style={styles.playButtonOverlay}
              activeOpacity={0.8}
            >
              <View style={styles.playButtonCircle}>
                <Play size={36} color="#FFFFFF" weight="fill" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Card flutuante (bottom) ────────────────────────────── */}
      <View style={styles.bottomBoxWrapper}>
      <View style={styles.bottomBox}>

        {/* Karaoke words */}
        <View style={styles.wordsContainer}>
          {exercise.chunks.map((chunk, chunkIdx) =>
            chunk.words.map((word, wordIdx) => (
              <AppText
                key={`${chunkIdx}-${wordIdx}`}
                style={[styles.word, { color: wordColor(chunkIdx, wordIdx) }]}
              >
                {word}{' '}
              </AppText>
            ))
          )}
        </View>

        <View style={{ height: 16 }} />

        {/* Mic area */}
        <View style={styles.micArea}>
          <Animated.View
            pointerEvents="none"
            style={[styles.tooltip, { opacity: tooltipOpacity, transform: [{ translateY: tooltipY }] }]}
          >
            <AppText style={styles.tooltipText}>
              {isPt ? 'sua vez' : 'your turn'}
            </AppText>
          </Animated.View>

          <Animated.View style={[
            styles.micButton,
            {
              backgroundColor: isListening ? 'rgba(124,58,237,0.12)' : isCharlotte ? 'rgba(248,113,113,0.08)' : 'rgba(0,0,0,0.05)',
              borderColor:     isListening ? C.accentLight : isCharlotte ? 'rgba(248,113,113,0.3)' : 'rgba(0,0,0,0.08)',
              transform: [{ scale: isListening ? micPulse : 1 }],
            },
          ]}>
            {isCharlotte
              ? <MicrophoneSlash size={34} color="#F87171" weight="fill" />
              : <Microphone      size={34} color={isListening ? C.accent : 'rgba(0,0,0,0.3)'} weight="fill" />
            }
          </Animated.View>
        </View>
      </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#16153A', // dark bg visível abaixo do card
  },
  charlotteZone: {
    flex: 58,
    backgroundColor: '#0d0c2e',
  },
  charlotteMedia: {
    flex: 1,
    overflow: 'hidden',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0d0c2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
  },
  progressBg: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginHorizontal: 20,
    borderRadius: 1,
    marginBottom: 4,
  },
  progressFill: {
    height: 2,
    borderRadius: 1,
    backgroundColor: '#A78BFA',
  },
  bottomBoxWrapper: {
    flex: 42,
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomBox: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  wordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
  },
  word: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 38,
  },
  micArea: {
    alignItems: 'center',
  },
  tooltip: {
    backgroundColor: 'rgba(124,58,237,0.88)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginBottom: 16,
  },
  tooltipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  playButtonCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(124,58,237,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4, // optical center for play icon
  },
});
