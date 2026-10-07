/**
 * app/(app)/vocab-review.tsx
 * Sessão de revisão de vocabulário — flashcard com flip 3D.
 *
 * Arquitetura (Opção A):
 *   - Carrega de user_vocabulary onde next_review_at <= now()
 *   - SM-2 atualiza user_vocabulary diretamente (não sr_items)
 *   - Separado do review-session (exercícios de gramática da trilha)
 *
 * UX:
 *   Frente  → termo + fonética + categoria
 *   Verso   → definição + exemplo + tradução (Novice)
 *   Rating  → Hard / Ok / Easy (slide-up após flip)
 *   Summary → XP earned, streak de acertos, próxima revisão
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, TouchableOpacity, Animated, Platform, Easing,
  ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft, SpeakerHigh, Lightning,
} from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { AppText } from '@/components/ui/Text';
import { systemIsPt } from '@/lib/systemLang';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { calcNextReview, SRRating } from '@/lib/spacedRepetition';
import CharlotteAvatar from '@/components/ui/CharlotteAvatar';
import { soundEngine } from '@/lib/soundEngine';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import Constants from 'expo-constants';
import { QueizyWave } from '@/components/ui/QueizyWave';
import { MarkerText } from '@/components/ui/MarkerText';
import Svg, { Path } from 'react-native-svg';

const API_BASE = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:       '#FAF7F0',
  card:     '#FFFFFF',
  navy:     '#16131F',
  navyMid:  '#4D4858',
  navyLight:'#8A8494',
  ghost:    'rgba(22,19,31,0.06)',
  border:   'rgba(22,19,31,0.09)',
  red:      '#D12A64',
  redBg:    'rgba(255,79,139,0.08)',
  gold:     '#D12A64',
  goldBg:   '#FFEEF4',
  green:    '#08804A',
  greenBg:  'rgba(8,128,74,0.09)',
  volt:     '#DCFF4A',
  pink:     '#D12A64',
  pinkBg:   'rgba(255,79,139,0.10)',
};

const CATEGORY_LABELS: Record<string, string> = {
  word:         'Word',
  idiom:        'Idiom',
  phrasal_verb: 'Phrasal',
  grammar:      'Grammar',
};


const cardShadow = Platform.select({
  ios:     { shadowColor: 'rgba(22,19,31,0.14)', shadowOpacity: 1, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 8 },
}) as object;

const XP: Record<SRRating, number> = { hard: 5, ok: 10, easy: 15 };

// ── Selo de XP total: a cada nota o número sobe contando e o selo dá um pulinho
function SessionXPPill({ xp }: { xp: number }) {
  const [shown, setShown] = useState(xp);
  const [delta, setDelta] = useState(0);
  const scale = useRef(new Animated.Value(1)).current;
  const floatY = useRef(new Animated.Value(0)).current;
  const floatO = useRef(new Animated.Value(0)).current;
  const prev = useRef(xp);
  useEffect(() => {
    const from = prev.current;
    prev.current = xp;
    if (xp <= from) { setShown(xp); return; }
    // "+N" sobe de baixo do selo até ele, some, e aí o número conta e o selo pula.
    setDelta(xp - from);
    floatY.setValue(46);
    floatO.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(floatO, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 680, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(floatO, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
    let t: ReturnType<typeof setInterval> | null = null;
    const start = setTimeout(() => {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.18, duration: 120, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
      const steps = 12;
      let i = 0;
      t = setInterval(() => {
        i++;
        setShown(Math.round(from + ((xp - from) * i) / steps));
        if (i >= steps && t) clearInterval(t);
      }, 40);
    }, 640);
    return () => { clearTimeout(start); if (t) clearInterval(t); };
  }, [xp, scale, floatY, floatO]);
  return (
    <View>
      <Animated.View style={{
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(8,128,74,0.10)',
        borderRadius: 14, paddingHorizontal: 9, paddingVertical: 4,
        transform: [{ scale }],
      }}>
        <Lightning size={13} color="#08804A" weight="fill" />
        <AppText style={{ fontSize: 13, fontWeight: '800', color: '#08804A', fontVariant: ['tabular-nums'] }}>{shown.toLocaleString()}</AppText>
      </Animated.View>
      <Animated.View pointerEvents="none" style={{
        position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center',
        opacity: floatO, transform: [{ translateY: floatY }], zIndex: 10,
      }}>
        <View style={{ backgroundColor: '#DCFF4A', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3 }}>
          <AppText style={{ fontSize: 13, fontWeight: '800', color: '#16131F' }}>+{delta}</AppText>
        </View>
      </Animated.View>
    </View>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface VocabCard {
  id:                  string;
  term:                string;
  definition:          string;
  example:             string | null;
  example_translation: string | null;
  phonetic:            string | null;
  category:            string;
  ease_factor:         number;
  interval_days:       number;
  repetitions:         number;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function VocabReview() {
  const { session, profile } = useAuth();
  const userId   = session?.user?.id;
  const level    = profile?.charlotte_level ?? 'Inter';
  const isPt     = systemIsPt; // suporte/chrome: idioma do device
  const insets   = useSafeAreaInsets();


  const [cards,    setCards]    = useState<VocabCard[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [idx,      setIdx]      = useState(0);
  const [flipped,  setFlipped]  = useState(false);
  const [phase,    setPhase]    = useState<'card' | 'summary'>('card');

  // Reset contador Tier 4 ao iniciar a sessao
  useEffect(() => { soundEngine.resetStreak(); }, []);
  const [ratings,  setRatings]  = useState<SRRating[]>([]);
  const [totalXP,  setTotalXP]  = useState(0);   // XP desta sessão
  const [baseXP,   setBaseXP]   = useState<number | null>(null); // XP total do aluno ao abrir
  const [ttsLoading, setTtsLoading] = useState<string | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const showSRInfo = () => Alert.alert(
    isPt ? 'Como funciona?' : 'How does this work?',
    isPt
      ? 'O sistema ajusta quando cada palavra volta baseado em quão fácil foi lembrar.\n\nDifícil — voltará em breve, precisa de mais prática.\n\nOk — intervalo moderado, você está no caminho.\n\nFácil — intervalo longo, você domina esta palavra.'
      : 'The system adjusts when each word comes back based on how easy it was to remember.\n\nHard — comes back soon, needs more practice.\n\nOk — moderate interval, you\'re on the right track.\n\nEasy — long interval, you\'ve nailed this word.',
  );

  // Real flip: 0 = front, 1 = back (interpolated to 0→180deg)
  const flipAnim   = useRef(new Animated.Value(0)).current;
  // Card transition (rate animation)
  const slideAnim  = useRef(new Animated.Value(0)).current;
  const opacAnim   = useRef(new Animated.Value(1)).current;
  // Buttons slide-up
  const btnAnim    = useRef(new Animated.Value(60)).current;
  const btnOpac    = useRef(new Animated.Value(0)).current;

  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from('user_vocabulary')
        .select('id, term, definition, example, example_translation, phonetic, category, ease_factor, interval_days, repetitions')
        .eq('user_id', userId)
        .lte('next_review_at', new Date().toISOString())
        .order('next_review_at', { ascending: true })
        .limit(20);
      setCards(data ?? []);
      setLoading(false);
      // XP total (mesma fonte do header das abas) — o selo soma a sessão em cima.
      const { data: prog } = await supabase
        .from('charlotte_progress').select('total_xp').eq('user_id', userId).maybeSingle();
      setBaseXP(prog?.total_xp ?? 0);
    })();
  }, [userId]);

  const current = cards[idx];

  // ── Interpolations — real 3D flip ───────────────────────────────────────────
  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate  = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  // ── Flip card ────────────────────────────────────────────────────────────────
  const handleFlip = useCallback(() => {
    if (flipped) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(flipAnim, {
      toValue: 1, duration: 350, useNativeDriver: true,
    }).start(() => {
      setFlipped(true);
      Animated.parallel([
        Animated.spring(btnAnim, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
        Animated.timing(btnOpac, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  }, [flipped, flipAnim, btnAnim, btnOpac]);

  // ── TTS ─────────────────────────────────────────────────────────────────────
  const handleTts = useCallback(async (key: string, text?: string) => {
    const t = (text ?? current?.term ?? '').trim();
    if (!t || ttsLoading) return;
    setTtsLoading(key);
    try {
      const res = await fetch(`${API_BASE}/api/tts-cached?term=${encodeURIComponent(t)}`);
      if (!res.ok) throw new Error('TTS failed');
      const { url } = await res.json();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldRouteThroughEarpiece: false });
      try { playerRef.current?.remove(); } catch { /* ignore */ }
      const player = createAudioPlayer({ uri: url });
      playerRef.current = player;
      setPlayingKey(key);
      player.addListener('playbackStatusUpdate', (st: any) => {
        if (st?.didJustFinish) setPlayingKey(k => (k === key ? null : k));
      });
      player.play();
    } catch { setPlayingKey(null); }
    finally { setTtsLoading(null); }
  }, [current?.term, ttsLoading]);

  // Quando a palavra volta, por nota (mostrado em cada botão).
  const whenLabel = (rating: SRRating): string => {
    if (!current) return '';
    const n = calcNextReview(rating, {
      easeFactor: current.ease_factor ?? 2.5, intervalDays: current.interval_days ?? 0, repetitions: current.repetitions ?? 0,
    });
    const d = n.intervalDays;
    if (d <= 1) return isPt ? 'amanhã' : 'tomorrow';
    return isPt ? `${d} dias` : `${d} days`;
  };

  // ── Rate & advance ──────────────────────────────────────────────────────────
  const handleRate = useCallback(async (rating: SRRating) => {
    if (!current || !userId) return;

    // Para o áudio da palavra atual ao avançar (evita continuar tocando na próxima).
    try { playerRef.current?.pause(); } catch { /* ignore */ }

    const xp  = XP[rating];
    const next = calcNextReview(rating, {
      easeFactor:   current.ease_factor   ?? 2.5,
      intervalDays: current.interval_days ?? 0,
      repetitions:  current.repetitions   ?? 0,
    });

    // Update user_vocabulary SM-2 fields
    await supabase.from('user_vocabulary').update({
      ease_factor:      next.easeFactor,
      interval_days:    next.intervalDays,
      repetitions:      next.repetitions,
      next_review_at:   next.nextReviewAt.toISOString(),
      last_reviewed_at: new Date().toISOString(),
      last_rating:      rating,
    }).eq('id', current.id);

    // XP
    supabase.from('charlotte_practices').insert({
      user_id: userId, practice_type: 'vocab_review', xp_earned: xp,
    }).then(() => {});

    // Sound
    soundEngine.play(rating === 'hard' ? 'answer_wrong' : 'answer_correct').catch(() => {});
    Haptics.impactAsync(
      rating === 'hard' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    );


    const newRatings = [...ratings, rating];
    setRatings(newRatings);
    setTotalXP(prev => prev + xp);

    const isLast = idx + 1 >= cards.length;

    // Animate card out — slide on iOS, fade-only on Android
    const exitAnims: Animated.CompositeAnimation[] = [
      Animated.timing(opacAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(btnOpac, { toValue: 0, duration: 120, useNativeDriver: true }),
    ];
    if (Platform.OS === 'ios') {
      exitAnims.push(
        Animated.timing(slideAnim, {
          toValue: rating === 'hard' ? -40 : 40,
          duration: 180,
          useNativeDriver: true,
        }),
      );
    }
    Animated.parallel(exitAnims).start(() => {
      if (isLast) {
        setPhase('summary');
        return;
      }
      // Reset for next card
      flipAnim.setValue(0);
      slideAnim.setValue(0);
      btnAnim.setValue(60);
      btnOpac.setValue(0);
      setFlipped(false);
      setIdx(prev => prev + 1);
      Animated.timing(opacAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  }, [current, userId, ratings, idx, cards.length, flipAnim, slideAnim, opacAnim, btnAnim, btnOpac]);

  // ── Summary stats ───────────────────────────────────────────────────────────
  const easyCount = ratings.filter(r => r === 'easy').length;
  const okCount   = ratings.filter(r => r === 'ok').length;
  const hardCount = ratings.filter(r => r === 'hard').length;

  const nextReviewCard = cards
    .map((c, i) => {
      const r = ratings[i];
      if (!r) return null;
      return calcNextReview(r, { easeFactor: c.ease_factor ?? 2.5, intervalDays: c.interval_days ?? 0, repetitions: c.repetitions ?? 0 }).nextReviewAt;
    })
    .filter(Boolean)
    .sort((a, b) => a!.getTime() - b!.getTime())[0];

  const nextStr = nextReviewCard
    ? (nextReviewCard.toDateString() === new Date().toDateString()
        ? (isPt ? 'hoje' : 'today')
        : nextReviewCard.toDateString() === new Date(Date.now() + 86400000).toDateString()
          ? (isPt ? 'amanhã' : 'tomorrow')
          : isPt
            ? `em ${Math.ceil((nextReviewCard.getTime() - Date.now()) / 86400000)} dias`
            : `in ${Math.ceil((nextReviewCard.getTime() - Date.now()) / 86400000)} days`)
    : '';

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={C.navy} size="large" />
      </SafeAreaView>
    );
  }

  // ── Empty ───────────────────────────────────────────────────────────────────
  if (cards.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 16 }}>
          <ArrowLeft size={22} color={C.navy} weight="bold" />
        </TouchableOpacity>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <CharlotteAvatar size="xl" />
          <AppText display style={{ fontSize: 22, fontWeight: '800', color: C.navy, marginTop: 20, textAlign: 'center' }}>
            {isPt ? 'Tudo em dia!' : 'All caught up!'}
          </AppText>
          <AppText style={{ fontSize: 15, color: C.navyMid, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
            {isPt ? 'Nenhuma palavra para revisar agora.' : 'No vocabulary words due right now.'}
          </AppText>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 28, backgroundColor: C.navy, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 40 }}
          >
            <AppText style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>
              {isPt ? 'Voltar' : 'Back'}
            </AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  if (phase === 'summary') {
    const closing = hardCount === 0
      ? (isPt ? 'Perfeito! Você lembrou de todas hoje.' : 'Perfect! You nailed every word today.')
      : hardCount <= Math.floor(cards.length / 2)
        ? (isPt ? `Mandou bem! As ${hardCount} ${hardCount === 1 ? 'difícil volta' : 'difíceis voltam'} amanhã.` : `Great work! The ${hardCount} hard one${hardCount > 1 ? 's come' : ' comes'} back tomorrow.`)
        : (isPt ? 'Essas pediram mais atenção. Amanhã eu trago de volta!' : "These need more practice. I'll bring them back tomorrow!");
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }}>
          <View style={{ paddingTop: 36, alignItems: 'center' }}>
            <MarkerText display style={{ fontSize: 32, fontWeight: '800', color: C.navy, lineHeight: 38, textAlign: 'center' }}>
              {isPt ? 'Revisão concluída!' : 'Review complete!'}
            </MarkerText>
            <AppText style={{ fontSize: 15, color: C.navyMid, marginTop: 8, textAlign: 'center' }}>
              {isPt
                ? `${cards.length} ${cards.length === 1 ? 'palavra revisada' : 'palavras revisadas'} · +${totalXP} XP`
                : `${cards.length} ${cards.length === 1 ? 'word reviewed' : 'words reviewed'} · +${totalXP} XP`}
            </AppText>
          </View>

          {/* Onda completa: queizy → crazy */}
          <View style={{ marginTop: 24 }}>
            <QueizyWave progress={1} height={16} strokeWidth={5} />
          </View>

          {/* Contagem por nota */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
            {[
              { label: isPt ? 'Fácil' : 'Easy',     value: easyCount, color: C.navy, bg: C.volt },
              { label: 'Ok',                         value: okCount,   color: C.navy, bg: C.card },
              { label: isPt ? 'Difícil' : 'Hard',   value: hardCount, color: C.pink, bg: C.pinkBg },
            ].map(s2 => (
              <View key={s2.label} style={{ flex: 1, backgroundColor: s2.bg, borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: s2.bg === C.card ? 1 : 0, borderColor: C.border }}>
                <AppText display style={{ fontSize: 28, fontWeight: '800', color: s2.color }}>{s2.value}</AppText>
                <AppText style={{ fontSize: 12, fontWeight: '700', color: s2.color, marginTop: 2 }}>{s2.label}</AppText>
              </View>
            ))}
          </View>

          {nextStr ? (
            <AppText style={{ fontSize: 13, color: C.navyMid, textAlign: 'center', marginTop: 14 }}>
              {isPt ? `Próxima revisão: ${nextStr}` : `Next review: ${nextStr}`}
            </AppText>
          ) : null}

          {/* Balão da Charlotte */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 26 }}>
            <CharlotteAvatar size="sm" />
            <View style={{ flexShrink: 1, marginBottom: 14 }}>
              <View style={{ backgroundColor: C.card, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11, ...cardShadow }}>
                <AppText style={{ fontSize: 14, color: C.navy, lineHeight: 20 }}>{closing}</AppText>
              </View>
              <Svg width={18} height={12} viewBox="0 0 18 12" style={{ position: 'absolute', left: 8, bottom: -11 }}>
                <Path d="M17 0 L0 12 L6 0 Z" fill={C.card} />
              </Svg>
            </View>
          </View>

          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 28, backgroundColor: C.volt, borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
          >
            <AppText style={{ color: C.navy, fontSize: 16, fontWeight: '800' }}>
              {isPt ? 'Voltar ao vocabulário' : 'Back to vocabulary'}
            </AppText>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Card ─────────────────────────────────────────────────────────────────────
  if (!current) return null;


  return (
    <View style={{ flex: 1, backgroundColor: C.bg, position: 'relative' }}>
      {/* Status bar white */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.card }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 12,
          borderBottomWidth: 1, borderBottomColor: C.border,
        }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ArrowLeft size={22} color={C.navy} weight="bold" />
          </TouchableOpacity>
          {/* Progresso da sessão: a onda endireita a cada cartão */}
          <View style={{ flex: 1, marginHorizontal: 14 }}>
            <QueizyWave progress={cards.length ? idx / cards.length : 0} height={14} strokeWidth={4} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppText style={{ fontSize: 13, color: C.navyMid, fontVariant: ['tabular-nums'] }}>
              {idx + 1}/{cards.length}
            </AppText>
            {baseXP !== null && <SessionXPPill xp={baseXP + totalXP} />}
          </View>
        </View>
      </SafeAreaView>

      {/* Card area */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>

        {/* Recall prompt — acima do card, some depois de virar */}
        {!flipped && (
          // Pergunta como fala da Charlotte (balão com o rabinho do logo)
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
            <CharlotteAvatar size="sm" />
            <View style={{ flexShrink: 1, marginBottom: 12 }}>
              <View style={{ backgroundColor: C.card, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, ...cardShadow }}>
                <AppText display style={{ fontSize: 16, fontWeight: '800', color: C.navy, lineHeight: 21 }}>
                  {isPt ? 'Lembra o que significa?' : 'Remember what it means?'}
                </AppText>
              </View>
              <Svg width={16} height={11} viewBox="0 0 16 11" style={{ position: 'absolute', left: 8, bottom: -10 }}>
                <Path d="M15 0 L0 11 L5 0 Z" fill={C.card} />
              </Svg>
            </View>
          </View>
        )}

        <Animated.View style={{ width: '100%', opacity: opacAnim, ...(Platform.OS === 'ios' ? { transform: [{ translateY: slideAnim }] } : {}) }}>

          {/* ── FRONT ── */}
          <Animated.View
            pointerEvents={flipped ? 'none' : 'auto'}
            style={{
              backfaceVisibility: 'hidden',
              transform: [{ perspective: 1200 }, { rotateY: frontRotate }],
            }}>
            <TouchableOpacity
              
              activeOpacity={0.95}
              onPress={handleFlip}
              style={{
                backgroundColor: C.card, borderRadius: 28,
                padding: 32, minHeight: 320,
                justifyContent: 'space-between',
                ...cardShadow,
              }}
            >
              {/* Category chip + TTS */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ backgroundColor: C.ghost, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <AppText style={{ fontSize: 11, fontWeight: '800', color: C.navy, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                    {isPt
                      ? ({ word: 'Palavra', idiom: 'Expressão', phrasal_verb: 'Phrasal', grammar: 'Gramática' } as Record<string,string>)[current.category] ?? current.category
                      : CATEGORY_LABELS[current.category] ?? current.category}
                  </AppText>
                </View>
                <TouchableOpacity
                  onPress={() => handleTts('term')}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityLabel={isPt ? 'Ouvir' : 'Listen'}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: playingKey === 'term' ? C.volt : C.ghost, justifyContent: 'center', alignItems: 'center' }}
                >
                  {ttsLoading === 'term'
                    ? <ActivityIndicator size="small" color={C.navy} />
                    : <SpeakerHigh size={21} color={C.navy} weight="fill" />
                  }
                </TouchableOpacity>
              </View>

              {/* Term */}
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 24 }}>
                <AppText display style={{
                  fontSize: current.term.length > 12 ? 32 : 44,
                  fontWeight: '800', color: C.navy,
                  textAlign: 'center', lineHeight: current.term.length > 12 ? 38 : 50,
                }}>
                  {current.term}
                </AppText>
                {current.phonetic ? (
                  <AppText style={{ fontSize: 16, color: C.navyLight, marginTop: 8, textAlign: 'center' }}>
                    {current.phonetic}
                  </AppText>
                ) : null}
              </View>

              {/* Tap hint */}
              <View style={{ alignItems: 'center' }}>
                <View style={{ backgroundColor: C.navy, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 11 }}>
                  <AppText style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                    {isPt ? 'Ver significado' : 'Show meaning'}
                  </AppText>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* ── BACK ── */}
          <Animated.View
            pointerEvents={flipped ? 'auto' : 'none'}
            style={{
              backfaceVisibility: 'hidden',
              position: 'absolute', top: 0, left: 0, right: 0,
              transform: [{ perspective: 1200 }, { rotateY: backRotate }],
            }}>
            <View style={{
              backgroundColor: C.card, borderRadius: 28,
              padding: 28, minHeight: 320,
              ...cardShadow,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                <View style={{ flex: 1 }}>
                  <MarkerText display style={{ fontSize: 24, fontWeight: '800', color: C.navy, lineHeight: 30 }}>
                    {current.term}
                  </MarkerText>
                </View>
                <TouchableOpacity
                  onPress={() => handleTts('term')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: playingKey === 'term' ? C.volt : C.ghost, justifyContent: 'center', alignItems: 'center' }}
                >
                  <SpeakerHigh size={19} color={C.navy} weight="fill" />
                </TouchableOpacity>
              </View>
              <AppText style={{ fontSize: 20, fontWeight: '600', color: C.navy, lineHeight: 28, marginBottom: 16 }}>
                {current.definition}
              </AppText>
              {current.example ? (
                <View style={{ backgroundColor: C.bg, borderRadius: 14, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                  <AppText style={{ fontSize: 14, color: C.navy, fontStyle: 'italic', lineHeight: 20 }}>
                    {current.example}
                  </AppText>
                  {isPt && current.example_translation ? (
                    <AppText style={{ fontSize: 13, color: C.navyMid, marginTop: 6, lineHeight: 18 }}>
                      {current.example_translation}
                    </AppText>
                  ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleTts('example', current.example!)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: playingKey === 'example' ? C.volt : C.ghost, justifyContent: 'center', alignItems: 'center' }}
                  >
                    <SpeakerHigh size={15} color={C.navy} weight="fill" />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </Animated.View>

        </Animated.View>
      </View>

      {/* Rating buttons — slide up after flip */}
      <Animated.View style={{
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + 20,
        transform: [{ translateY: btnAnim }],
        opacity: btnOpac,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <AppText style={{ fontSize: 12, color: C.navyLight, letterSpacing: 0.4 }}>
            {isPt ? 'Como foi lembrar?' : 'How well did you remember?'}
          </AppText>
          <TouchableOpacity
            onPress={showSRInfo}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              width: 16, height: 16, borderRadius: 8,
              backgroundColor: C.navyLight,
              justifyContent: 'center', alignItems: 'center',
            }}
          >
            <AppText style={{ fontSize: 10, fontWeight: '800', color: '#FFF' }}>?</AppText>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {([
            { rating: 'hard' as SRRating, label: isPt ? 'Difícil' : 'Hard', color: C.pink, bg: C.pinkBg, border: 'rgba(255,79,139,0.35)' },
            { rating: 'ok'   as SRRating, label: 'Ok',                       color: C.navy, bg: C.card,   border: C.border },
            { rating: 'easy' as SRRating, label: isPt ? 'Fácil' : 'Easy',   color: C.navy, bg: C.volt,   border: C.volt },
          ] as const).map(btn => (
            <TouchableOpacity
              key={btn.rating}
              onPress={() => handleRate(btn.rating)}
              style={{
                flex: 1, backgroundColor: btn.bg, borderRadius: 16,
                paddingVertical: 12, alignItems: 'center',
                borderWidth: 1.5, borderColor: btn.border,
              }}
            >
              <AppText style={{ fontSize: 16, fontWeight: '800', color: btn.color }}>{btn.label}</AppText>
              <AppText style={{ fontSize: 11, fontWeight: '600', color: btn.color, opacity: 0.75, marginTop: 2 }}>{whenLabel(btn.rating)}</AppText>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

    </View>
  );
}
