// app/(onboarding)/index.tsx
// 3-slide onboarding shown once on first launch (before login)

import React, { useRef, useState, useEffect } from 'react';
import {
  View, ScrollView, TouchableOpacity, Dimensions,
  Animated, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { ArrowRight, CheckCircle } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import CharlotteAvatar from '@/components/ui/CharlotteAvatar';

const { width: W } = Dimensions.get('window');
export const ONBOARDING_KEY = 'onboarding_v3';

const C = {
  bg:        '#F4F3FA',
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  border:    'rgba(22,21,58,0.08)',
  green:     '#A3FF3C',
  greenDark: '#3D8800',
  shadow: Platform.select({
    ios: {
      shadowColor: 'rgba(22,21,58,0.10)',
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
            backgroundColor: i === active ? C.navy : 'rgba(22,21,58,0.18)',
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

      {/* Avatar + pulse rings */}
      <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        <Animated.View style={{
          position: 'absolute',
          width: 140, height: 140, borderRadius: 70,
          backgroundColor: 'rgba(163,255,60,0.10)',
          transform: [{ scale: pulse1 }],
        }} />
        <Animated.View style={{
          position: 'absolute',
          width: 116, height: 116, borderRadius: 58,
          backgroundColor: 'rgba(163,255,60,0.14)',
          transform: [{ scale: pulse2 }],
        }} />
        <CharlotteAvatar size="xxl" />
      </View>

      {/* Speech bubble */}
      <Animated.View style={{
        opacity: bubbleO,
        transform: [{ translateY: bubbleY }],
        backgroundColor: C.navy,
        borderRadius: 16,
        borderBottomLeftRadius: 4,
        paddingHorizontal: 20,
        paddingVertical: 12,
        marginBottom: 36,
        alignSelf: 'center',
        ...C.shadow,
      }}>
        <AppText style={{ color: C.green, fontSize: 16, fontWeight: '700' }}>
          Oi! Eu sou a Charlotte.
        </AppText>
      </Animated.View>

      {/* Headline */}
      <Animated.View style={{ opacity: headlineO, transform: [{ translateY: headlineY }], alignItems: 'center' }}>
        <AppText style={{
          fontSize: 38, fontWeight: '900', color: C.navy,
          textAlign: 'center', lineHeight: 44, letterSpacing: -1,
          marginBottom: 12,
        }}>
          Fale inglês.{'\n'}De verdade.
        </AppText>
        <AppText style={{
          fontSize: 15, color: C.navyMid, textAlign: 'center', lineHeight: 22, maxWidth: 260,
        }}>
          Sua professora de IA que conversa, corrige e te faz evoluir.
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
  { from: 'score',     label: 'Nota 92', sub: 'Fluência ótima · Pronúncia 88/100' },
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
                  backgroundColor: 'rgba(163,255,60,0.12)',
                  borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
                  borderWidth: 1, borderColor: 'rgba(163,255,60,0.25)',
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
                  backgroundColor: isCharlotte ? C.navy : 'rgba(22,21,58,0.07)',
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

      <AppText style={{
        fontSize: 32, fontWeight: '800', color: C.navy,
        textAlign: 'center', lineHeight: 38, letterSpacing: -0.5, marginBottom: 12,
      }}>
        Pratique{'\n'}falando.
      </AppText>
      <AppText style={{
        fontSize: 15, color: C.navyMid, textAlign: 'center', lineHeight: 22, maxWidth: 270,
      }}>
        A Charlotte corrige sua gramática e avalia sua pronúncia em tempo real.
      </AppText>

    </View>
  );
}

// ── Slide 3 — Daily goal ──────────────────────────────────────────────────────

const GOAL_OPTIONS = [
  { label: '5 min',  value: 5,  sub: 'Suave'    },
  { label: '10 min', value: 10, sub: 'Ideal'     },
  { label: '15 min', value: 15, sub: 'Intenso'   },
  { label: '20 min', value: 20, sub: 'Dedicado'  },
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
          color: isSelected ? 'rgba(163,255,60,0.7)' : C.navyLight,
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
            Quanto tempo por dia{'\n'}você consegue estudar?
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

        {/* Top bar — "Entrar" sempre visível */}
        <View style={{
          height: 44, flexDirection: 'row', justifyContent: 'flex-end',
          alignItems: 'center', paddingHorizontal: 20,
        }}>
          <TouchableOpacity onPress={goLogin} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <AppText style={{ fontSize: 14, color: C.navyLight, fontWeight: '600' }}>Entrar</AppText>
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
              {isLast ? 'Criar minha conta' : 'Próximo'}
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
                Já tenho uma conta
              </AppText>
            </TouchableOpacity>
          )}

        </View>

      </SafeAreaView>
    </Animated.View>
  );
}
