// app/(onboarding)/index.tsx
// 3-slide onboarding shown once on first launch (before login)

import React, { useRef, useState, useEffect } from 'react';
import {
  Image, View, ScrollView, TouchableOpacity, Dimensions,
  Animated, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { ArrowRight, CheckCircle } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { HeaderLogo } from '@/components/ui/HeaderLogo';
import Svg, { Path } from 'react-native-svg';
import CharlotteAvatar from '@/components/ui/CharlotteAvatar';
import { systemIsPt } from '@/lib/systemLang';

// Onboarding é chrome/marketing: segue o idioma do aparelho. O inglês da
// demonstração de conversa (slide 2) é conteúdo e fica em inglês.
const isPt = systemIsPt;

const { width: W } = Dimensions.get('window');
export const ONBOARDING_KEY = 'onboarding_v3';

const C = {
  bg:        '#FAF7F0',
  card:      '#FFFFFF',
  navy:      '#16131F',
  navyMid:   '#4D4858',
  navyLight: '#8A8494',
  border:    'rgba(22,19,31,0.08)',
  green:     '#DCFF4A',
  greenDark: '#08804A',
  shadow: Platform.select({
    ios: {
      shadowColor: 'rgba(22,19,31,0.10)',
      shadowOpacity: 1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 4 },
  }),
};

// ── helpers ──────────────────────────────────────────────────────────────────

async function markOnboardingDone() {
  await SecureStore.setItemAsync(ONBOARDING_KEY, 'done');
}

function goToLogin() {
  router.replace('/(auth)/login');
}

function goToSignup() {
  router.replace('/(auth)/signup');
}

// ── Dot indicator ─────────────────────────────────────────────────────────────

function Dots({ total, active }: { total: number; active: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === active ? 20 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i === active ? C.navy : 'rgba(22,19,31,0.18)',
          }}
        />
      ))}
    </View>
  );
}

// ── Slide 1 — Meet Charlotte ──────────────────────────────────────────────────

function Slide1() {
  const pulse1    = useRef(new Animated.Value(1)).current;
  const pulse2    = useRef(new Animated.Value(1)).current;
  const bubbleY   = useRef(new Animated.Value(10)).current;
  const bubbleO   = useRef(new Animated.Value(0)).current;
  const headlineO = useRef(new Animated.Value(0)).current;
  const headlineY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    const ring = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1.18, duration: 900, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1,    duration: 900, useNativeDriver: true }),
        ])
      );
    ring(pulse1, 0).start();
    ring(pulse2, 450).start();

    Animated.parallel([
      Animated.timing(bubbleO,   { toValue: 1, duration: 380, delay: 400, useNativeDriver: true }),
      Animated.timing(bubbleY,   { toValue: 0, duration: 380, delay: 400, useNativeDriver: true }),
      Animated.timing(headlineO, { toValue: 1, duration: 380, delay: 720, useNativeDriver: true }),
      Animated.timing(headlineY, { toValue: 0, duration: 380, delay: 720, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={{ width: W, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>

      {/* Ícone do Queizy + pulse rings */}
      <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        <Animated.View style={{
          position: 'absolute',
          width: 140, height: 140, borderRadius: 70,
          backgroundColor: 'rgba(220,255,74,0.10)',
          transform: [{ scale: pulse1 }],
        }} />
        <Animated.View style={{
          position: 'absolute',
          width: 116, height: 116, borderRadius: 58,
          backgroundColor: 'rgba(220,255,74,0.14)',
          transform: [{ scale: pulse2 }],
        }} />
        <Image
          source={require('@/assets/icon.png')}
          style={{ width: 104, height: 104, borderRadius: 26 }}
          accessibilityLabel="Queizy"
        />
      </View>

      {/* Headline */}
      <Animated.View style={{ opacity: headlineO, transform: [{ translateY: headlineY }], alignItems: 'center' }}>
        <AppText display style={{
          fontSize: 38, fontWeight: '900', color: C.navy,
          textAlign: 'center', lineHeight: 44, letterSpacing: -1,
          marginBottom: 12,
        }}>
          {isPt ? <>Do queizy{'\n'}ao crazy.</> : <>From queizy{'\n'}to crazy.</>}
        </AppText>
        <AppText style={{
          fontSize: 15, color: C.navyMid, textAlign: 'center', lineHeight: 22, maxWidth: 290,
        }}>
          {isPt
            ? 'O app que te leva do inglês travado ao inglês fluente, sem vergonha de errar no caminho.'
            : 'The app that takes you from stuck to fluent English, with no shame in getting it wrong along the way.'}
        </AppText>
      </Animated.View>

    </View>
  );
}

// ── Slide 2 — Real conversation ───────────────────────────────────────────────

type ChatItem =
  | { from: 'charlotte' | 'user'; text: string }
  | { from: 'score'; label: string; sub: string };

const CHAT_ITEMS: ChatItem[] = [
  { from: 'charlotte', text: 'How was your weekend?' },
  { from: 'user',      text: 'It was great, I went to the beach' },
  { from: 'score',     label: isPt ? 'Nota 92' : 'Score 92', sub: isPt ? 'Fluência ótima · Pronúncia 88/100' : 'Great fluency · Pronunciation 88/100' },
];

function Slide2({ active }: { active: boolean }) {
  const anims = useRef(CHAT_ITEMS.map(() => ({
    opacity: new Animated.Value(0),
    y:       new Animated.Value(10),
  }))).current;

  useEffect(() => {
    if (!active) return;
    anims.forEach(a => { a.opacity.setValue(0); a.y.setValue(10); });
    const seq = anims.map((a, i) =>
      Animated.parallel([
        Animated.timing(a.opacity, { toValue: 1, duration: 320, delay: i * 520, useNativeDriver: true }),
        Animated.timing(a.y,       { toValue: 0, duration: 320, delay: i * 520, useNativeDriver: true }),
      ])
    );
    Animated.sequence(seq).start();
  }, [active]);

  return (
    <View style={{ width: W, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>

      {/* Mock chat */}
      <View style={{
        width: '100%', backgroundColor: C.card, borderRadius: 20,
        padding: 16, marginBottom: 36,
        borderWidth: 1, borderColor: C.border, ...C.shadow,
      }}>
        {CHAT_ITEMS.map((item, i) => {
          const a = anims[i];
          const isCharlotte = item.from === 'charlotte';
          const isScore     = item.from === 'score';

          return (
            <Animated.View
              key={i}
              style={{
                opacity: a.opacity,
                transform: [{ translateY: a.y }],
                marginBottom: i < CHAT_ITEMS.length - 1 ? 10 : 0,
                alignItems: isCharlotte ? 'flex-start' : isScore ? 'flex-start' : 'flex-end',
              }}
            >
              {isScore ? (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  backgroundColor: 'rgba(220,255,74,0.12)',
                  borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
                  borderWidth: 1, borderColor: 'rgba(220,255,74,0.25)',
                }}>
                  <CheckCircle size={15} color={C.greenDark} weight="fill" />
                  <View>
                    <AppText style={{ fontSize: 13, fontWeight: '800', color: C.greenDark }}>
                      {(item as Extract<ChatItem, { from: 'score' }>).label}
                    </AppText>
                    <AppText style={{ fontSize: 11, color: C.greenDark, opacity: 0.75, marginTop: 1 }}>
                      {(item as Extract<ChatItem, { from: 'score' }>).sub}
                    </AppText>
                  </View>
                </View>
              ) : (
                <View style={{
                  backgroundColor: isCharlotte ? C.navy : 'rgba(22,19,31,0.07)',
                  borderRadius: 14,
                  borderBottomLeftRadius: isCharlotte ? 3 : 14,
                  borderBottomRightRadius: isCharlotte ? 14 : 3,
                  paddingHorizontal: 12, paddingVertical: 8,
                  maxWidth: '80%',
                }}>
                  <AppText style={{ fontSize: 13, color: isCharlotte ? '#FFFFFF' : C.navy, lineHeight: 18 }}>
                    {(item as Extract<ChatItem, { from: 'charlotte' | 'user' }>).text}
                  </AppText>
                </View>
              )}
            </Animated.View>
          );
        })}
      </View>

      <AppText display style={{
        fontSize: 32, fontWeight: '800', color: C.navy,
        textAlign: 'center', lineHeight: 38, letterSpacing: -0.5, marginBottom: 12,
      }}>
        {isPt ? <>Conheça a Charlotte,{'\n'}sua tutora.</> : <>Meet Charlotte,{'\n'}your tutor.</>}
      </AppText>
      <AppText style={{
        fontSize: 15, color: C.navyMid, textAlign: 'center', lineHeight: 22, maxWidth: 270,
      }}>
        {isPt
          ? 'Ela conversa com você, corrige sua gramática e avalia sua pronúncia em tempo real.'
          : 'She chats with you, fixes your grammar and scores your pronunciation in real time.'}
      </AppText>

    </View>
  );
}

// ── Slide 3 — Daily goal ──────────────────────────────────────────────────────

const GOAL_OPTIONS = [
  { label: '5 min',  value: 5,  sub: isPt ? 'Suave'    : 'Light'     },
  { label: '10 min', value: 10, sub: 'Ideal'                            },
  { label: '15 min', value: 15, sub: isPt ? 'Intenso'  : 'Intense'   },
  { label: '20 min', value: 20, sub: isPt ? 'Dedicado' : 'Dedicated' },
];

function Slide3({ active, selectedGoal, onGoalSelect }: {
  active: boolean;
  selectedGoal: number;
  onGoalSelect: (v: number) => void;
}) {
  const bubbleO = useRef(new Animated.Value(0)).current;
  const bubbleY = useRef(new Animated.Value(10)).current;
  const gridO   = useRef(new Animated.Value(0)).current;
  const gridY   = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    if (!active) return;
    bubbleO.setValue(0); bubbleY.setValue(10); gridO.setValue(0); gridY.setValue(14);
    Animated.parallel([
      Animated.timing(bubbleO, { toValue: 1, duration: 350,              useNativeDriver: true }),
      Animated.timing(bubbleY, { toValue: 0, duration: 350,              useNativeDriver: true }),
      Animated.timing(gridO,   { toValue: 1, duration: 350, delay: 240,  useNativeDriver: true }),
      Animated.timing(gridY,   { toValue: 0, duration: 350, delay: 240,  useNativeDriver: true }),
    ]).start();
  }, [active]);

  const renderCard = (opt: typeof GOAL_OPTIONS[number]) => {
    const isSelected = selectedGoal === opt.value;
    return (
      <TouchableOpacity
        key={opt.value}
        onPress={() => onGoalSelect(opt.value)}
        activeOpacity={0.75}
        style={{
          flex: 1,
          backgroundColor: isSelected ? C.navy : C.card,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: isSelected ? C.navy : C.border,
          paddingVertical: 22,
          alignItems: 'center',
          ...C.shadow,
        }}
      >
        <AppText style={{
          fontSize: 22, fontWeight: '900', letterSpacing: -0.5,
          color: isSelected ? C.green : C.navy,
        }}>
          {opt.label}
        </AppText>
        <AppText style={{
          fontSize: 12, fontWeight: '600', marginTop: 3,
          color: isSelected ? 'rgba(220,255,74,0.7)' : C.navyLight,
        }}>
          {opt.sub}
        </AppText>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ width: W, flex: 1, justifyContent: 'center', paddingHorizontal: 28 }}>

      {/* Charlotte + bubble */}
      <Animated.View style={{
        opacity: bubbleO,
        transform: [{ translateY: bubbleY }],
        flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 28,
      }}>
        <CharlotteAvatar size="md" />
        <View style={{
          backgroundColor: C.navy, borderRadius: 16, borderBottomLeftRadius: 3,
          paddingHorizontal: 16, paddingVertical: 14, flex: 1,
          ...C.shadow,
        }}>
          <AppText style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', lineHeight: 24 }}>
            {isPt ? <>Quanto tempo por dia{'\n'}você quer praticar?</> : <>How much time a day{'\n'}do you want to practice?</>}
          </AppText>
        </View>
      </Animated.View>

      {/* Goal grid — 2 x 2 */}
      <Animated.View style={{ opacity: gridO, transform: [{ translateY: gridY }], gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {GOAL_OPTIONS.slice(0, 2).map(renderCard)}
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {GOAL_OPTIONS.slice(2, 4).map(renderCard)}
        </View>
      </Animated.View>

    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const TOTAL = 3;

export default function OnboardingScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [slide, setSlide]           = useState(0);
  const [ready, setReady]           = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(10);

  const screenO = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(screenO, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    setReady(true);
  }, []);

  const onScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / W);
    if (idx !== slide) setSlide(idx);
  };

  const goNext = async () => {
    if (slide < TOTAL - 1) {
      scrollRef.current?.scrollTo({ x: (slide + 1) * W, animated: true });
    } else {
      await markOnboardingDone();
      await SecureStore.setItemAsync('DAILY_GOAL_MINUTES', String(selectedGoal));
      goToSignup();
    }
  };

  const goLogin = async () => {
    await markOnboardingDone();
    goToLogin();
  };

  const isLast = slide === TOTAL - 1;

  return (
    <Animated.View style={{ flex: 1, backgroundColor: C.bg, opacity: screenO }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

        {/* Top bar — logo à esquerda, "Entrar" sempre visível à direita */}
        <View style={{
          height: 44, flexDirection: 'row', justifyContent: 'space-between',
          alignItems: 'center', paddingHorizontal: 20,
        }}>
          <HeaderLogo />
          <TouchableOpacity onPress={goLogin} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <AppText style={{ fontSize: 14, color: C.navyLight, fontWeight: '600' }}>{isPt ? 'Entrar' : 'Sign in'}</AppText>
          </TouchableOpacity>
        </View>

        {/* Slides */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onScroll}
          style={{ flex: 1 }}
        >
          <Slide1 />
          <Slide2 active={ready && slide === 1} />
          <Slide3
            active={ready && slide === 2}
            selectedGoal={selectedGoal}
            onGoalSelect={setSelectedGoal}
          />
        </ScrollView>

        {/* Bottom bar */}
        <View style={{
          paddingHorizontal: 24,
          paddingBottom: Platform.OS === 'ios' ? 8 : 16,
          paddingTop: 16,
          gap: 14,
        }}>

          <View style={{ alignItems: 'center' }}>
            <Dots total={TOTAL} active={slide} />
          </View>

          <TouchableOpacity
            onPress={goNext}
            activeOpacity={0.85}
            style={{
              backgroundColor: C.navy,
              borderRadius: 16,
              height: 54,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              ...C.shadow,
            }}
          >
            <AppText style={{ fontSize: 16, fontWeight: '800', color: C.green }}>
              {isLast ? (isPt ? 'Criar minha conta' : 'Create my account') : (isPt ? 'Próximo' : 'Next')}
            </AppText>
            <ArrowRight size={18} color={C.green} weight="bold" />
          </TouchableOpacity>

          {isLast && (
            <TouchableOpacity
              onPress={goLogin}
              activeOpacity={0.85}
              style={{
                backgroundColor: 'transparent',
                borderRadius: 14, paddingVertical: 15, alignItems: 'center',
                borderWidth: 1.5, borderColor: C.border,
              }}
            >
              <AppText style={{ fontSize: 15, fontWeight: '700', color: C.navy }}>
                {isPt ? 'Já tenho uma conta' : 'I already have an account'}
              </AppText>
            </TouchableOpacity>
          )}

        </View>

      </SafeAreaView>
    </Animated.View>
  );
}
