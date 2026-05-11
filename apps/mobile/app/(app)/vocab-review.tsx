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
  View, TouchableOpacity, Animated, Platform,
  ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft, Trophy, Star, SpeakerHigh,
} from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { AppText } from '@/components/ui/Text';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { calcNextReview, SRRating } from '@/lib/spacedRepetition';
import CharlotteAvatar from '@/components/ui/CharlotteAvatar';
import { soundEngine } from '@/lib/soundEngine';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import Constants from 'expo-constants';

const API_BASE = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:       '#F4F3FA',
  card:     '#FFFFFF',
  navy:     '#16153A',
  navyMid:  '#4B4A72',
  navyLight:'#9896B8',
  ghost:    'rgba(22,21,58,0.06)',
  border:   'rgba(22,21,58,0.09)',
  red:      '#DC2626',
  redBg:    'rgba(220,38,38,0.08)',
  gold:     '#D97706',
  goldBg:   '#FFFBEB',
  green:    '#3D8800',
  greenBg:  'rgba(61,136,0,0.09)',
};

const CATEGORY_LABELS: Record<string, string> = {
  word:         'Word',
  idiom:        'Idiom',
  phrasal_verb: 'Phrasal',
  grammar:      'Grammar',
};

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  word:         { color: '#7C3AED', bg: '#F5F3FF' },
  idiom:        { color: '#0F766E', bg: '#F0FDFA' },
  phrasal_verb: { color: '#D97706', bg: '#FFFBEB' },
  grammar:      { color: '#DC2626', bg: '#FEF2F2' },
};

const cardShadow = Platform.select({
  ios:     { shadowColor: 'rgba(22,21,58,0.14)', shadowOpacity: 1, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 8 },
}) as object;

const XP: Record<SRRating, number> = { hard: 5, ok: 10, easy: 15 };

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
  const isPt     = level === 'Novice';
  const insets   = useSafeAreaInsets();
  const levelAccent   = level === 'Novice' ? C.gold   : level === 'Inter' ? '#7C3AED' : '#0F766E';
  const levelAccentBg = level === 'Novice' ? C.goldBg : level === 'Inter' ? '#F5F3FF' : '#F0FDFA';


  const [cards,    setCards]    = useState<VocabCard[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [idx,      setIdx]      = useState(0);
  const [flipped,  setFlipped]  = useState(false);
  const [phase,    setPhase]    = useState<'card' | 'summary'>('card');
  const [ratings,  setRatings]  = useState<SRRating[]>([]);
  const [totalXP,  setTotalXP]  = useState(0);
  const [ttsLoading, setTtsLoading] = useState(false);
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
  // XP toast
  const [xpToast,  setXpToast]  = useState(0);
  const [showXP,   setShowXP]   = useState(false);

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
  const handleTts = useCallback(async () => {
    if (!current?.term || ttsLoading) return;
    setTtsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/tts-cached?term=${encodeURIComponent(current.term)}`);
      if (!res.ok) throw new Error('TTS failed');
      const { url } = await res.json();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldRouteThroughEarpiece: false });
      try { playerRef.current?.remove(); } catch { /* ignore */ }
      const player = createAudioPlayer({ uri: url });
      playerRef.current = player;
      player.play();
    } catch { /* silencioso */ }
    finally { setTtsLoading(false); }
  }, [current?.term, ttsLoading]);

  // ── Rate & advance ──────────────────────────────────────────────────────────
  const handleRate = useCallback(async (rating: SRRating) => {
    if (!current || !userId) return;

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

    // XP toast
    setXpToast(xp);
    setShowXP(true);
    setTimeout(() => setShowXP(false), 1200);

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
        <ActivityIndicator color={levelAccent} size="large" />
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
          <AppText style={{ fontSize: 22, fontWeight: '800', color: C.navy, marginTop: 20, textAlign: 'center' }}>
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
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }}>
          <View style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 8 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: levelAccentBg, justifyContent: 'center', alignItems: 'center', marginBottom: 18 }}>
              <Trophy size={36} color={levelAccent} weight="fill" />
            </View>
            <AppText style={{ fontSize: 26, fontWeight: '800', color: C.navy, textAlign: 'center' }}>
              {isPt ? 'Revisão concluída!' : 'Review complete!'}
            </AppText>
            <AppText style={{ fontSize: 15, color: C.navyMid, marginTop: 6, textAlign: 'center' }}>
              {isPt
                ? `${cards.length} ${cards.length === 1 ? 'palavra revisada' : 'palavras revisadas'}`
                : `${cards.length} ${cards.length === 1 ? 'word reviewed' : 'words reviewed'}`}
            </AppText>
          </View>

          {/* XP */}
          <View style={{ backgroundColor: C.card, borderRadius: 18, padding: 20, marginTop: 20, ...cardShadow, alignItems: 'center' }}>
            <AppText style={{ fontSize: 40, fontWeight: '800', color: levelAccent }}>+{totalXP} XP</AppText>
            <AppText style={{ fontSize: 13, color: C.navyMid, marginTop: 2 }}>
              {isPt ? 'ganhos nesta sessão' : 'earned this session'}
            </AppText>
          </View>

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            {[
              { label: isPt ? 'Fácil' : 'Easy', value: easyCount, color: C.green, bg: C.greenBg },
              { label: 'Ok',                     value: okCount,   color: C.gold,  bg: C.goldBg  },
              { label: isPt ? 'Difícil' : 'Hard', value: hardCount, color: C.red,  bg: C.redBg   },
            ].map(s => (
              <View key={s.label} style={{ flex: 1, backgroundColor: s.bg, borderRadius: 14, padding: 14, alignItems: 'center' }}>
                <AppText style={{ fontSize: 28, fontWeight: '800', color: s.color }}>{s.value}</AppText>
                <AppText style={{ fontSize: 12, color: s.color, marginTop: 2 }}>{s.label}</AppText>
              </View>
            ))}
          </View>

          {/* Next review */}
          {nextStr ? (
            <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...cardShadow }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: levelAccentBg, justifyContent: 'center', alignItems: 'center' }}>
                <Star size={20} color={levelAccent} weight="fill" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={{ fontSize: 13, color: C.navyMid }}>{isPt ? 'Próxima revisão' : 'Next review'}</AppText>
                <AppText style={{ fontSize: 16, fontWeight: '700', color: C.navy, marginTop: 2 }}>{nextStr}</AppText>
              </View>
            </View>
          ) : null}

          {/* Charlotte message */}
          <View style={{ backgroundColor: levelAccentBg, borderRadius: 14, padding: 16, marginTop: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <CharlotteAvatar size="sm" />
            <AppText style={{ flex: 1, fontSize: 14, color: C.navy, lineHeight: 21 }}>
              {hardCount === 0
                ? (isPt ? 'Perfeito! Você dominou todas as palavras hoje.' : 'Perfect! You nailed every word today.')
                : hardCount <= Math.floor(cards.length / 2)
                  ? (isPt ? `Ótimo trabalho! As ${hardCount} difíceis voltarão em breve.` : `Great work! The ${hardCount} hard word${hardCount > 1 ? 's' : ''} will come back soon.`)
                  : (isPt ? 'Essas palavras precisam de mais atenção — vou trazê-las de volta amanhã!' : "These words need more practice — I'll bring them back tomorrow!")}
            </AppText>
          </View>

          {/* Buttons */}
          <TouchableOpacity
            onPress={() => router.replace('/(app)')}
            style={{
              marginTop: 24, backgroundColor: C.navy, borderRadius: 16,
              paddingVertical: 16, alignItems: 'center',
              ...Platform.select({ ios: { shadowColor: C.navy, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, android: { elevation: 4 } }),
            }}
          >
            <AppText style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>
              {isPt ? 'Voltar ao início' : 'Back to Home'}
            </AppText>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Card ─────────────────────────────────────────────────────────────────────
  if (!current) return null;

  const catStyle = CATEGORY_COLORS[current.category] ?? { color: C.navyMid, bg: C.ghost };

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
          {/* Progress dots */}
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {cards.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === idx ? 20 : 6,
                  height: 6, borderRadius: 3,
                  backgroundColor: i < idx ? levelAccent : i === idx ? levelAccent : C.ghost,
                  opacity: i < idx ? 0.4 : 1,
                }}
              />
            ))}
            </View>
          </View>
          <AppText style={{ fontSize: 13, color: C.navyMid, minWidth: 40, textAlign: 'right' }}>
            {idx + 1}/{cards.length}
          </AppText>
        </View>
      </SafeAreaView>

      {/* XP toast */}
      {showXP && (
        <View style={{
          position: 'absolute', top: insets.top + 70, right: 20, zIndex: 100,
          backgroundColor: C.greenBg, borderRadius: 20,
          paddingHorizontal: 14, paddingVertical: 6,
          borderWidth: 1, borderColor: C.green + '30',
        }}>
          <AppText style={{ fontSize: 15, fontWeight: '800', color: C.green }}>+{xpToast} XP</AppText>
        </View>
      )}

      {/* Card area */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>

        {/* Recall prompt — acima do card, some depois de virar */}
        {!flipped && (
          <AppText style={{
            fontSize: 13, color: C.navyLight, textAlign: 'center',
            marginBottom: 14, letterSpacing: 0.2, lineHeight: 18,
          }}>
            {isPt
              ? 'Você lembra o significado desta palavra?'
              : 'Do you remember the meaning of this word?'}
          </AppText>
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
                <View style={{ backgroundColor: catStyle.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <AppText style={{ fontSize: 11, fontWeight: '700', color: catStyle.color, letterSpacing: 0.5 }}>
                    {isPt
                      ? ({ word: 'Palavra', idiom: 'Expressão', phrasal_verb: 'Phrasal', grammar: 'Gramática' } as Record<string,string>)[current.category] ?? current.category
                      : CATEGORY_LABELS[current.category] ?? current.category}
                  </AppText>
                </View>
                <TouchableOpacity
                  
                  onPress={handleTts}
                  disabled={ttsLoading}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}
                >
                  {ttsLoading
                    ? <ActivityIndicator size="small" color={levelAccent} />
                    : <SpeakerHigh size={20} color={levelAccent} weight="fill" />
                  }
                </TouchableOpacity>
              </View>

              {/* Term */}
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 24 }}>
                <AppText style={{
                  fontSize: current.term.length > 12 ? 30 : 40,
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
                <AppText style={{ fontSize: 12, color: C.navyLight, letterSpacing: 0.4 }}>
                  {isPt ? 'toque para revelar' : 'tap to reveal'}
                </AppText>
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
              <AppText style={{ fontSize: 13, fontWeight: '700', color: levelAccent, marginBottom: 12 }}>
                {current.term}
              </AppText>
              <AppText style={{ fontSize: 20, fontWeight: '700', color: C.navy, lineHeight: 28, marginBottom: 16 }}>
                {current.definition}
              </AppText>
              {current.example ? (
                <View style={{
                  backgroundColor: C.bg, borderRadius: 14, padding: 14,
                  borderLeftWidth: 3, borderLeftColor: levelAccent,
                }}>
                  <AppText style={{ fontSize: 14, color: C.navy, fontStyle: 'italic', lineHeight: 20 }}>
                    {current.example}
                  </AppText>
                  {isPt && current.example_translation ? (
                    <AppText style={{ fontSize: 13, color: C.navyMid, marginTop: 6, lineHeight: 18 }}>
                      {current.example_translation}
                    </AppText>
                  ) : null}
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
            {isPt ? 'como foi?' : 'how did it go?'}
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
            { rating: 'hard' as SRRating, label: isPt ? 'Difícil' : 'Hard', color: C.red,   bg: C.redBg  },
            { rating: 'ok'   as SRRating, label: 'Ok',                       color: C.gold,  bg: C.goldBg },
            { rating: 'easy' as SRRating, label: isPt ? 'Fácil' : 'Easy',   color: C.green, bg: C.greenBg },
          ] as const).map(btn => (
            <TouchableOpacity
              key={btn.rating}
              onPress={() => handleRate(btn.rating)}
              style={{
                flex: 1, backgroundColor: btn.bg, borderRadius: 16,
                paddingVertical: 16, alignItems: 'center',
                borderWidth: 1.5, borderColor: btn.color + '40',
              }}
            >
              <AppText style={{ fontSize: 15, fontWeight: '700', color: btn.color }}>{btn.label}</AppText>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

    </View>
  );
}
