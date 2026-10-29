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
import { characterInfo } from '@/lib/characters';

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

// ── Slide Família — Conheça a Família Queizy ─────────────────────────────────
// Mesmo recado do site (queizy.com/#familia): a Charlotte e o Igorfina, e um cartão "Em breve"
// deixando claro que a Família vai crescer. Novo personagem: acrescente em FAMILY_MEMBERS.

const FAMILY_MEMBERS: { id: 'charlotte' | 'igorfina'; role: string; line: string }[] = [
  { id: 'charlotte', role: isPt ? 'Tutora' : 'Tutor',
    line: isPt ? 'Paciente e animada. Corrige na hora, sem vergonha de errar.' : 'Patient and upbeat. Corrects you on the spot.' },
  { id: 'igorfina', role: isPt ? 'Comediante e imitador' : 'Comedian and impressionist',
    line: isPt ? 'Solta imitações no meio da conversa e tem trilha própria.' : 'Drops impressions mid-chat and has his own trail.' },
];

function SlideFamily({ active }: { active: boolean }) {
  const anims = useRef([0, 1, 2].map(() => ({ o: new Animated.Value(0), y: new Animated.Value(12) }))).current;
  useEffect(() => {
    if (!active) return;
    Animated.stagger(140, anims.map(a => Animated.parallel([
      Animated.timing(a.o, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(a.y, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]))).start();
  }, [active]);

  const card = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14, backgroundColor: C.card, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: C.border };
  // Em tela pequena o conteúdo pode passar da altura: rola na vertical em vez de cortar.
  return (
    <ScrollView style={{ width: W, flex: 1 }} showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 12 }}>
      <View style={{ width: '100%', gap: 10, marginBottom: 22 }}>
        {FAMILY_MEMBERS.map((m, i) => {
          const info = characterInfo(m.id);
          return (
            <Animated.View key={m.id} style={{ opacity: anims[i].o, transform: [{ translateY: anims[i].y }], ...card, ...C.shadow }}>
              <Image source={info.avatar} style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.navy }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText display style={{ fontSize: 17, fontWeight: '800', color: C.navy }}>{info.name}</AppText>
                <AppText style={{ fontSize: 12, fontWeight: '700', color: C.greenDark, marginTop: 1 }}>{m.role}</AppText>
                <AppText style={{ fontSize: 13, color: C.navyMid, lineHeight: 18, marginTop: 3 }}>{m.line}</AppText>
              </View>
            </Animated.View>
          );
        })}
        <Animated.View style={{ opacity: anims[2].o, transform: [{ translateY: anims[2].y }], ...card, backgroundColor: 'transparent', borderStyle: 'dashed', borderWidth: 1.5, borderColor: 'rgba(22,19,31,0.18)' }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(22,19,31,0.25)' }}>
            <AppText display style={{ fontSize: 22, fontWeight: '800', color: C.navyLight }}>?</AppText>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText display style={{ fontSize: 17, fontWeight: '800', color: C.navy }}>{isPt ? 'Em breve' : 'Coming soon'}</AppText>
            <AppText style={{ fontSize: 13, color: C.navyMid, lineHeight: 18, marginTop: 3 }}>
              {isPt ? 'A Família está crescendo: tem gente nova chegando para conversar com você.' : 'The family is growing: new people are coming to chat with you.'}
            </AppText>
          </View>
        </Animated.View>
      </View>

      <AppText display style={{
        fontSize: 30, fontWeight: '800', color: C.navy,
        textAlign: 'center', lineHeight: 35, letterSpacing: -0.5, marginBottom: 10,
      }}>
        {isPt ? <>Conheça a{'\n'}Família Queizy.</> : <>Meet the{'\n'}Queizy family.</>}
      </AppText>
      <AppText style={{ fontSize: 15, color: C.navyMid, textAlign: 'center', lineHeight: 22, maxWidth: 290 }}>
        {isPt
          ? 'Cada um tem seu jeito de falar, para você praticar inglês de verdade.'
          : 'Each one has their own way of talking, so you practice real English.'}
      </AppText>
    </ScrollView>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const TOTAL = 3;

export default function OnboardingScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [slide, setSlide]           = useState(0);
  const [ready, setReady]           = useState(false);

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
          <SlideFamily active={ready && slide === 2} />
          {/* O ritmo do dia saiu daqui: agora é escolhido na abertura, depois do cadastro (app/(app)/charlotte-intro.tsx). */}
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
