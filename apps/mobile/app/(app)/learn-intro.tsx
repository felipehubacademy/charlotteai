/**
 * learn-intro.tsx
 *
 * Mini-lesson intro with karaoke-style word highlighting.
 * All words shown on screen dimmed; each word lights up as Rachel speaks it.
 *
 * Flow: learn-trail → learn-intro → learn-session
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, TouchableOpacity, Animated, ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight } from 'phosphor-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { AudioStatus } from 'expo-audio/build/Audio.types';

import { AppText } from '@/components/ui/Text';
import CharlotteAvatar from '@/components/ui/CharlotteAvatar';
import { MODULE_INTROS } from '@/data/moduleIntros';
import { TrailLevel } from '@/data/curriculum';
import { useAuth } from '@/hooks/useAuth';
import { useLearnProgress } from '@/hooks/useLearnProgress';

// ── Config ─────────────────────────────────────────────────────
const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

// ── Types ──────────────────────────────────────────────────────
interface WordTiming {
  word: string;
  start: number;
  end: number;
}

// ── Palette ────────────────────────────────────────────────────
const LEVEL_ACCENT: Record<string, { main: string; light: string }> = {
  Novice:   { main: '#D97706', light: '#FCD34D' },
  Inter:    { main: '#7C3AED', light: '#A78BFA' },
  Advanced: { main: '#0F766E', light: '#2DD4BF' },
};

function buildPalette(level: string) {
  const { main, light } = LEVEL_ACCENT[level] ?? LEVEL_ACCENT.Inter;
  return {
    bg:           '#16153A',
    white:        '#FFFFFF',
    wordDim:      'rgba(255,255,255,0.28)',
    wordSpoken:   '#FFFFFF',
    wordActive:   light,
    whiteAlpha:   'rgba(255,255,255,0.50)',
    violet:       main,
    violetLight:  light,
    violetHl:     main + '38',
    violetBorder: main + '73',
    dotInactive:  'rgba(255,255,255,0.22)',
  };
}

// ── Main screen ────────────────────────────────────────────────
export default function LearnIntroScreen() {
  const { level, moduleIndex, topicIndex } = useLocalSearchParams<{
    level: string; moduleIndex: string; topicIndex: string;
  }>();

  const mIdx        = parseInt(moduleIndex ?? '0', 10);
  const intro       = MODULE_INTROS[level as TrailLevel]?.[mIdx];
  const slides      = intro?.slides ?? [];
  const isPortuguese = level === 'Novice';
  const C           = buildPalette(level);
  const { session } = useAuth();
  const userId      = session?.user?.id ?? '';
  const { saveIntroDone } = useLearnProgress(userId, level as TrailLevel);

  const [slideIdx,     setSlideIdx]     = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const [wordTimings,  setWordTimings]  = useState<WordTiming[]>([]);
  const [currentTime,  setCurrentTime]  = useState(0);

  const fadeAnim      = useRef(new Animated.Value(1)).current;
  const playerRef     = useRef<AudioPlayer | null>(null);
  const subRef        = useRef<ReturnType<AudioPlayer['addListener']> | null>(null);
  const pendingPlay   = useRef(false);
  const slideIdxRef   = useRef(0);
  const redirectedRef = useRef(false);
  const pollRef       = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Audio player lifecycle ───────────────────────────────────
  useEffect(() => {
    const player = createAudioPlayer(null);
    playerRef.current = player;
    return () => {
      subRef.current?.remove();
      if (pollRef.current) clearInterval(pollRef.current);
      try { player.pause(); player.remove(); } catch {}
    };
  }, []);

  // ── Poll currentTime while playing ──────────────────────────
  useEffect(() => {
    pollRef.current = setInterval(() => {
      if (playerRef.current?.playing) {
        setCurrentTime(playerRef.current.currentTime ?? 0);
      }
    }, 50);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ── Fetch word timings JSON ──────────────────────────────────
  const fetchTimings = useCallback(async (text: string): Promise<WordTiming[]> => {
    try {
      const cacheDir = `${FileSystem.documentDirectory}tts_cache/`;
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true }).catch(() => {});
      const fileKey  = text.slice(0, 80).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const localUri = `${cacheDir}intro_${fileKey}.json`;

      const info = await FileSystem.getInfoAsync(localUri);
      if (info.exists) {
        return JSON.parse(await FileSystem.readAsStringAsync(localUri));
      }

      const res = await fetch(`${API_BASE_URL}/tts/${fileKey}.json`);
      if (res.ok) {
        const timings: WordTiming[] = await res.json();
        await FileSystem.writeAsStringAsync(localUri, JSON.stringify(timings));
        return timings;
      }
    } catch {}
    return [];
  }, []);

  // ── Fetch audio MP3 ─────────────────────────────────────────
  const fetchAudio = useCallback(async (text: string): Promise<string | null> => {
    try {
      const cacheDir = `${FileSystem.documentDirectory}tts_cache/`;
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true }).catch(() => {});
      const fileKey  = text.slice(0, 80).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const localUri = `${cacheDir}intro_${fileKey}.mp3`;

      const info = await FileSystem.getInfoAsync(localUri);
      if (info.exists) return localUri;

      const dl = await FileSystem.downloadAsync(`${API_BASE_URL}/tts/${fileKey}.mp3`, localUri);
      if (dl.status === 200) return localUri;
      await FileSystem.deleteAsync(localUri, { idempotent: true });

      const res = await fetch(`${API_BASE_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source: 'learn', ...(userId ? { userId } : {}) }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.audio) return null;
      await FileSystem.writeAsStringAsync(localUri, data.audio, { encoding: 'base64' as any });
      return localUri;
    } catch { return null; }
  }, []);

  // ── Load and play slide ──────────────────────────────────────
  const loadSlide = useCallback(async (idx: number) => {
    const slide = slides[idx];
    if (!slide || !playerRef.current) return;

    subRef.current?.remove();
    subRef.current = null;
    pendingPlay.current = false;
    setWordTimings([]);
    setCurrentTime(0);

    setAudioLoading(true);
    const [uri, timings] = await Promise.all([
      fetchAudio(slide.text),
      fetchTimings(slide.text),
    ]);
    setAudioLoading(false);

    setWordTimings(timings);

    if (!uri || !playerRef.current) return;

    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      playerRef.current.replace({ uri });
      pendingPlay.current = true;
      const capturedIdx = idx;

      subRef.current = playerRef.current.addListener(
        'playbackStatusUpdate',
        (status: AudioStatus) => {
          if (pendingPlay.current && status.isLoaded && !status.playing) {
            pendingPlay.current = false;
            try { playerRef.current?.play(); } catch {}
          }
          if (status.didJustFinish) {
            subRef.current?.remove();
            subRef.current = null;
          }
        },
      );

      setTimeout(() => {
        if (pendingPlay.current && capturedIdx === slideIdxRef.current) {
          pendingPlay.current = false;
          try { playerRef.current?.play(); } catch {}
        }
      }, 1500);
    } catch {}
  }, [slides, fetchAudio, fetchTimings]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Slide transition ─────────────────────────────────────────
  const goToSlide = useCallback((idx: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setSlideIdx(idx);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
  }, [fadeAnim]);

  useEffect(() => {
    slideIdxRef.current = slideIdx;
    loadSlide(slideIdx);
  }, [slideIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation ───────────────────────────────────────────────
  const goToSession = useCallback(() => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    subRef.current?.remove();
    try { playerRef.current?.pause(); } catch {}
    router.back();
  }, []);

  const handleNext = useCallback(async () => {
    if (slideIdx < slides.length - 1) {
      subRef.current?.remove();
      subRef.current = null;
      pendingPlay.current = false;
      try { playerRef.current?.pause(); } catch {}
      goToSlide(slideIdx + 1);
    } else {
      // Persist mini-lesson completion in DB (survives reinstall, syncs across devices).
      // Await the write so learn-trail's useFocusEffect reads the updated value.
      await saveIntroDone(level as TrailLevel, mIdx).catch(() => {});
      goToSession();
    }
  }, [slideIdx, slides.length, goToSlide, goToSession, level, mIdx, saveIntroDone]);

  useEffect(() => {
    if (!intro || slides.length === 0) goToSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!intro || slides.length === 0) return null;

  const slide  = slides[slideIdx];
  const isLast = slideIdx === slides.length - 1;

  // ── Karaoke word rendering ───────────────────────────────────
  const renderKaraokeText = () => {
    if (!wordTimings.length) {
      // Timings not loaded yet — show full text dimmed
      return (
        <AppText style={{ fontSize: 22, fontWeight: '600', color: C.wordDim, lineHeight: 34, textAlign: 'center' }}>
          {slide.text}
        </AppText>
      );
    }

    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
        {wordTimings.map((w, i) => {
          const isActive  = w.start <= currentTime && currentTime < w.end;
          const isSpoken  = w.end <= currentTime;
          const color     = isActive ? C.wordActive : isSpoken ? C.wordSpoken : C.wordDim;
          // Keep fontWeight constant to avoid text reflow — only color changes
          const opacity   = isActive ? 1 : undefined;

          return (
            <AppText
              key={i}
              style={{
                fontSize: 22,
                fontWeight: '600',
                color,
                lineHeight: 34,
                opacity,
              }}
            >
              {w.word}{' '}
            </AppText>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ── Skip ── */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 12 }}>
        <TouchableOpacity onPress={goToSession} hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}>
          <AppText style={{ color: C.whiteAlpha, fontSize: 14, fontWeight: '600' }}>{isPortuguese ? 'Pular' : 'Skip'}</AppText>
        </TouchableOpacity>
      </View>

      {/* ── Progress dots ── */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
        {slides.map((_, i) => (
          <View key={i} style={{
            height: 7, width: i === slideIdx ? 28 : 7,
            borderRadius: 4,
            backgroundColor: i === slideIdx ? C.violet : C.dotInactive,
          }} />
        ))}
      </View>

      {/* ── Slide content ── */}
      <TouchableOpacity activeOpacity={1} onPress={handleNext} style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28 }}>
        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>

          {/* Charlotte avatar */}
          <View style={{ marginBottom: 8 }}>
            <CharlotteAvatar size="xl" />
          </View>
          <AppText style={{ color: C.whiteAlpha, fontSize: 12, fontWeight: '700', marginBottom: 28 }}>
            Charlotte
          </AppText>

          {/* Label */}
          <AppText style={{
            fontSize: 11, fontWeight: '800', color: C.violet,
            textTransform: 'uppercase', letterSpacing: 1.8,
            marginBottom: 18, textAlign: 'center',
          }}>
            {slide.label}
          </AppText>

          {/* Karaoke text */}
          {renderKaraokeText()}

          {/* Highlight box */}
          {slide.highlight && (
            <View style={{
              backgroundColor: C.violetHl, borderRadius: 14,
              borderWidth: 1, borderColor: C.violetBorder,
              paddingHorizontal: 22, paddingVertical: 14,
              alignItems: 'center', marginTop: 28,
            }}>
              <AppText style={{ fontSize: 15, fontWeight: '700', color: C.violetLight, textAlign: 'center', lineHeight: 24 }}>
                {slide.highlight}
              </AppText>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>

      {/* ── Bottom ── */}
      <View style={{ paddingHorizontal: 28, paddingBottom: 40, gap: 10 }}>
        {audioLoading && <ActivityIndicator color={C.violet} style={{ marginBottom: 4 }} />}

        <TouchableOpacity
          onPress={handleNext}
          style={{
            backgroundColor: C.violet, borderRadius: 18, paddingVertical: 17,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            ...Platform.select({
              ios:     { shadowColor: C.violet, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
              android: { elevation: 6 },
            }),
          }}
        >
          <AppText style={{ fontSize: 16, fontWeight: '800', color: '#FFF' }}>
            {isLast ? (isPortuguese ? 'Concluir' : 'Finish') : (isPortuguese ? 'Próximo' : 'Next')}
          </AppText>
          <ArrowRight size={18} color="#FFF" weight="bold" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
