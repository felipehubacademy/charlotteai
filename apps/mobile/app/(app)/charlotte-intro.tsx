// Abertura de conta nova (rota mantida como 'charlotte-intro' por compatibilidade com o AuthGuard).
// Três passos, sem sair da tela: a Charlotte dá oi pelo nome (com voz), o aluno escolhe o ritmo do dia
// e vê o plano dos 7 dias (aceitar = entra no desafio dos 7 dias). Depois vem o aviso de IA e, dele,
// direto a 1ª lição (lib/welcome.ts). "Pular" vai direto ao aviso, com o ritmo padrão e sem o desafio.
// No fim marca first_welcome_done e garante o nível padrão (com guard para não sobrescrever).

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, Animated, Easing, StatusBar, BackHandler, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { ArrowLeft, Check, Gift, Microphone } from 'phosphor-react-native';
import * as Haptics from '@/lib/hapticsGated';
import { AppText } from '@/components/ui/Text';
import { Flame } from '@/components/streak/StreakCelebration';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { hasAiConsent } from '@/lib/aiConsent';
import { acceptStreakChallenge } from '@/lib/streak';
import { splashGate } from '@/lib/splashGate';
import { systemIsPt } from '@/lib/systemLang';
import { track } from '@/lib/analytics';
import {
  RHYTHM_OPTIONS, DEFAULT_RHYTHM, firstName, prefetchWelcomeVoice, saveRhythm, markFirstLessonPending,
  firstLessonRoute, welcomeV2Enabled, WELCOME_FALLBACK_PT, WELCOME_FALLBACK_EN,
} from '@/lib/welcome';

const isPt = systemIsPt;
const INK = '#16131F';
const VOLT = '#DCFF4A';
const CREAM = '#FAF7F0';
const MUTED = '#5E5868';
const GREEN = '#08804A';
const VOICE_WAIT_MS = 3000; // espera a fala com o nome; depois disso toca a gravada

type Step = 'hello' | 'rhythm' | 'plan';

function useFadeIn(delay: number, deps: unknown[] = []) {
  const o = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    o.setValue(0); y.setValue(14);
    Animated.parallel([
      Animated.timing(o, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return { opacity: o, transform: [{ translateY: y }] };
}

function ProgressBar({ value, dark }: { value: number; dark?: boolean }) {
  return (
    <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(22,19,31,0.08)', overflow: 'hidden' }}>
      <View style={{ width: `${value * 100}%`, height: 8, borderRadius: 4, backgroundColor: dark ? VOLT : GREEN }} />
    </View>
  );
}

function PrimaryButton({ label, onPress, dark, busy }: { label: string; onPress: () => void; dark?: boolean; busy?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={busy}
      activeOpacity={0.85}
      style={{ height: 58, borderRadius: 29, backgroundColor: dark ? INK : VOLT, alignItems: 'center', justifyContent: 'center' }}
    >
      {busy
        ? <ActivityIndicator color={dark ? VOLT : INK} />
        : <AppText display style={{ fontSize: 18, fontWeight: '800', color: dark ? VOLT : INK }}>{label}</AppText>}
    </TouchableOpacity>
  );
}

// ── Passo 1: oi da Charlotte ────────────────────────────────────────────────────
function SpeakingBars({ active }: { active: boolean }) {
  const bars = [useRef(new Animated.Value(0.35)).current, useRef(new Animated.Value(0.35)).current,
    useRef(new Animated.Value(0.35)).current, useRef(new Animated.Value(0.35)).current];
  useEffect(() => {
    if (!active) { bars.forEach(b => b.setValue(0.35)); return; }
    const loops = bars.map((b, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 120),
      Animated.timing(b, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(b, { toValue: 0.35, duration: 320, useNativeDriver: true }),
    ])));
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 18 }}>
      {bars.map((b, i) => (
        <Animated.View key={i} style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: VOLT, transform: [{ scaleY: b }] }} />
      ))}
    </View>
  );
}

function HelloStep({ name, speaking, played, onReplay, onNext, onSkip }: {
  name: string; speaking: boolean; played: boolean; onReplay: () => void; onNext: () => void; onSkip: () => void;
}) {
  const insets = useSafeAreaInsets();
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    l.start();
    return () => l.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const a1 = useFadeIn(200), a2 = useFadeIn(550), a3 = useFadeIn(900);
  return (
    <View style={{ flex: 1, backgroundColor: INK, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 24, paddingTop: 8 }}>
        <TouchableOpacity onPress={onSkip} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppText style={{ fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.6)' }}>{isPt ? 'Pular' : 'Skip'}</AppText>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'flex-end' }}>
        <Animated.View style={{
          position: 'absolute', bottom: 30, width: 280, height: 280, borderRadius: 140, backgroundColor: VOLT,
          opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.10, 0.18] }),
          transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }],
        }} />
        <View style={{ position: 'absolute', bottom: 6, width: 170, height: 20, borderRadius: 85, backgroundColor: 'rgba(0,0,0,0.45)' }} />
        <Image
          source={require('@/assets/charlotte-welcome.webp')}
          style={{ height: '96%', aspectRatio: 420 / 868 }}
          contentFit="contain"
          accessibilityLabel="Charlotte"
        />
      </View>

      <View style={{ paddingHorizontal: 28, paddingTop: 20, gap: 12 }}>
        <Animated.View style={a1}>
          <TouchableOpacity onPress={onReplay} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start' }}>
            <SpeakingBars active={speaking} />
            <AppText style={{ fontSize: 13, fontWeight: '600', color: VOLT }}>
              {played && !speaking ? (isPt ? 'Ouvir de novo' : 'Play again') : (isPt ? 'Charlotte falando' : 'Charlotte is speaking')}
            </AppText>
          </TouchableOpacity>
        </Animated.View>
        <Animated.View style={a2}>
          <AppText display style={{ fontSize: 38, lineHeight: 42, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1 }}>
            {isPt ? `Oi${name ? `, ${name}` : ''}!\nEu sou a Charlotte.` : `Hi${name ? `, ${name}` : ''}!\nI'm Charlotte.`}
          </AppText>
        </Animated.View>
        <Animated.View style={a3}>
          <AppText style={{ fontSize: 17, lineHeight: 25, color: 'rgba(255,255,255,0.78)' }}>
            {isPt ? 'Em 5 minutos você vai falar sua primeira frase em inglês. Bora?' : "In 5 minutes you'll say your first sentence in English. Ready?"}
          </AppText>
        </Animated.View>
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 }}>
        <PrimaryButton label={isPt ? 'Bora!' : "Let's go!"} onPress={onNext} />
      </View>
    </View>
  );
}

// ── Passo 2: ritmo ──────────────────────────────────────────────────────────────
function RhythmStep({ value, onPick, onBack, onNext }: { value: number; onPick: (m: number) => void; onBack: () => void; onNext: () => void }) {
  const insets = useSafeAreaInsets();
  const a1 = useFadeIn(80), a2 = useFadeIn(260);
  return (
    <View style={{ flex: 1, backgroundColor: CREAM, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 8 }}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel={isPt ? 'Voltar' : 'Back'}>
          <ArrowLeft size={22} color={INK} weight="bold" />
        </TouchableOpacity>
        <ProgressBar value={1 / 3} />
      </View>

      <Animated.View style={[{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 24, paddingTop: 36 }, a1]}>
        <Image source={require('@/assets/charlotte-avatar.png')} style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: INK }} />
        <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 20, borderBottomLeftRadius: 6, paddingHorizontal: 18, paddingVertical: 16 }}>
          <AppText display style={{ fontSize: 21, lineHeight: 26, fontWeight: '800', color: INK }}>
            {isPt ? 'Quanto tempo por dia você quer praticar comigo?' : 'How much time a day do you want to practice with me?'}
          </AppText>
        </View>
      </Animated.View>

      <Animated.View style={[{ paddingHorizontal: 24, paddingTop: 28, gap: 12 }, a2]}>
        {RHYTHM_OPTIONS.map(o => {
          const sel = o.minutes === value;
          return (
            <TouchableOpacity
              key={o.minutes}
              onPress={() => { Haptics.selectionAsync(); onPick(o.minutes); }}
              activeOpacity={0.85}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 18, paddingHorizontal: 20,
                borderRadius: 20, borderWidth: 2, borderColor: sel ? INK : 'rgba(22,19,31,0.08)', backgroundColor: sel ? INK : '#FFFFFF',
              }}
            >
              <AppText display style={{ fontSize: 24, fontWeight: '800', width: 84, color: sel ? VOLT : INK }}>{o.minutes} min</AppText>
              <View style={{ flex: 1 }}>
                <AppText style={{ fontSize: 16, fontWeight: '700', color: sel ? '#FFFFFF' : INK }}>{isPt ? o.pt : o.en}</AppText>
                <AppText style={{ fontSize: 14, color: sel ? 'rgba(255,255,255,0.75)' : MUTED, marginTop: 2 }}>
                  {isPt ? `${o.lessons} ${o.lessons === 1 ? 'lição' : 'lições'} por dia` : `${o.lessons} ${o.lessons === 1 ? 'lesson' : 'lessons'} a day`}
                </AppText>
              </View>
              {sel && <Check size={24} color={VOLT} weight="bold" />}
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      <View style={{ flex: 1 }} />
      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 }}>
        <PrimaryButton label={isPt ? 'Continuar' : 'Continue'} onPress={onNext} dark />
      </View>
    </View>
  );
}

// ── Passo 3: plano dos 7 dias ───────────────────────────────────────────────────
const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function PlanStep({ minutes, busy, onBack, onAccept }: { minutes: number; busy: boolean; onBack: () => void; onAccept: () => void }) {
  const insets = useSafeAreaInsets();
  const today = new Date().getDay();
  const pops = useRef(Array.from({ length: 7 }, () => new Animated.Value(0))).current;
  const flame = useRef(new Animated.Value(0)).current;
  const a1 = useFadeIn(100), aReward = useFadeIn(1200);
  useEffect(() => {
    Animated.stagger(110, pops.map(p => Animated.spring(p, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }))).start();
    const l = Animated.loop(Animated.sequence([
      Animated.timing(flame, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(flame, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    l.start();
    return () => l.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ flex: 1, backgroundColor: INK, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 8 }}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel={isPt ? 'Voltar' : 'Back'}>
          <ArrowLeft size={22} color="#FFFFFF" weight="bold" />
        </TouchableOpacity>
        <ProgressBar value={2 / 3} dark />
      </View>

      <View style={{ alignItems: 'center', paddingTop: 36 }}>
        <Animated.View style={{ transform: [
          { scale: flame.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) },
          { rotate: flame.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '2deg'] }) },
        ] }}>
          <Flame size={96} />
        </Animated.View>
      </View>

      <Animated.View style={[{ paddingHorizontal: 28, paddingTop: 18, alignItems: 'center', gap: 10 }, a1]}>
        <AppText style={{ fontSize: 13, fontWeight: '700', letterSpacing: 1.4, color: VOLT }}>{isPt ? 'SEU PLANO' : 'YOUR PLAN'}</AppText>
        <AppText display style={{ fontSize: 32, lineHeight: 37, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', letterSpacing: -0.8 }}>
          {isPt ? `${minutes} minutos por dia,\n7 dias seguidos.` : `${minutes} minutes a day,\n7 days in a row.`}
        </AppText>
      </Animated.View>

      <View style={{ marginHorizontal: 20, marginTop: 26, paddingVertical: 18, paddingHorizontal: 10, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.06)', flexDirection: 'row' }}>
        {pops.map((p, i) => {
          const first = i === 0, last = i === 6;
          const label = first ? (isPt ? 'Hoje' : 'Today') : (isPt ? DAYS_PT : DAYS_EN)[(today + i) % 7];
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 8 }}>
              <AppText style={{ fontSize: 12, fontWeight: first ? '700' : '600', color: first ? VOLT : 'rgba(255,255,255,0.6)' }}>{label}</AppText>
              <Animated.View style={{
                width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
                backgroundColor: last ? VOLT : first ? 'transparent' : 'rgba(255,255,255,0.10)',
                borderWidth: first ? 2.5 : 0, borderColor: VOLT,
                opacity: p, transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
              }}>
                {first && <Flame size={14} />}
                {last && <Gift size={18} color={INK} weight="bold" />}
              </Animated.View>
            </View>
          );
        })}
      </View>

      <Animated.View style={[{ marginHorizontal: 20, marginTop: 16, padding: 16, borderRadius: 20, backgroundColor: VOLT, flexDirection: 'row', alignItems: 'center', gap: 14 }, aReward]}>
        <Microphone size={26} color={INK} weight="bold" />
        <AppText style={{ flex: 1, fontSize: 15, lineHeight: 21, fontWeight: '600', color: INK }}>
          {isPt ? 'Complete os 7 dias e ganhe 10 minutos de conversa por voz com a Charlotte.' : 'Complete all 7 days and earn 10 minutes of voice conversation with Charlotte.'}
        </AppText>
      </Animated.View>

      <View style={{ flex: 1 }} />
      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 }}>
        <PrimaryButton label={isPt ? 'Aceito o desafio' : 'I accept the challenge'} onPress={onAccept} busy={busy} />
      </View>
    </View>
  );
}

// ── Tela ────────────────────────────────────────────────────────────────────────
export default function WelcomeRoute() {
  const { profile } = useAuth();
  if (!profile) return <View style={{ flex: 1, backgroundColor: CREAM }} />;
  return welcomeV2Enabled(profile) ? <WelcomeScreen /> : <LegacyFinish />;
}

// Antes da abertura nova valer para todos (lib/welcome.ts): só conclui a configuração e vai para a tela inicial.
function LegacyFinish() {
  const { profile, refreshProfile } = useAuth();
  const doneRef = useRef(false);
  useEffect(() => {
    if (doneRef.current || !profile?.id) return;
    doneRef.current = true;
    (async () => {
      try {
        const update: Record<string, unknown> = { first_welcome_done: true };
        if (!profile.charlotte_level) update.charlotte_level = 'Novice';
        await supabase.from('charlotte_users').update(update).eq('id', profile.id);
        refreshProfile().catch(() => {});
      } catch {
        // Não crítico
      }
      router.replace('/(app)');
    })();
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ flex: 1, backgroundColor: CREAM, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={INK} />
    </View>
  );
}

function WelcomeScreen() {
  const { profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<Step>('hello');
  const [minutes, setMinutes] = useState<number>(DEFAULT_RHYTHM);
  const [speaking, setSpeaking] = useState(false);
  const [played, setPlayed] = useState(false);
  const [busy, setBusy] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);
  const voiceUri = useRef<string | number | null>(null);
  const doneRef = useRef(false);
  const name = firstName(profile?.name);

  useEffect(() => { track('welcome_step', { step }); }, [step]);

  const playVoice = useCallback((src: string | number) => {
    try {
      playerRef.current?.remove();
      const p = createAudioPlayer(typeof src === 'string' ? { uri: src } : src);
      playerRef.current = p;
      p.addListener('playbackStatusUpdate', st => { if (st.didJustFinish) setSpeaking(false); });
      setSpeaking(true);
      setPlayed(true);
      p.play();
    } catch { setSpeaking(false); }
  }, []);

  const stopVoice = useCallback(() => {
    try { playerRef.current?.pause(); playerRef.current?.remove(); } catch {}
    playerRef.current = null;
    setSpeaking(false);
  }, []);

  // Fala da Charlotte: com o nome se a geração chegar a tempo; senão a gravada.
  useEffect(() => {
    let alive = true;
    (async () => {
      const named = prefetchWelcomeVoice(profile?.name);
      await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
      await splashGate;
      const uri = await Promise.race([named, new Promise<null>(r => setTimeout(() => r(null), VOICE_WAIT_MS))]);
      if (!alive) return;
      const src: string | number = uri ?? (isPt ? WELCOME_FALLBACK_PT : WELCOME_FALLBACK_EN);
      voiceUri.current = src;
      track('welcome_voice', { named: !!uri });
      await new Promise(r => setTimeout(r, 350)); // deixa o texto entrar antes
      if (alive) playVoice(src);
    })();
    return () => { alive = false; stopVoice(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const leaveHello = useCallback(() => { stopVoice(); }, [stopVoice]);

  // Conclui a abertura: grava o ritmo, entra no desafio (se aceitou) e segue para o aviso de IA / 1ª lição.
  const finish = useCallback(async (accepted: boolean) => {
    if (doneRef.current || !profile?.id) return;
    doneRef.current = true;
    setBusy(true);
    stopVoice();
    const uid = profile.id;
    track('welcome_done', { accepted, minutes });
    try {
      await saveRhythm(uid, minutes);
      await markFirstLessonPending(uid);
      if (accepted) await acceptStreakChallenge();
      const update: Record<string, unknown> = { first_welcome_done: true };
      if (!profile.charlotte_level) update.charlotte_level = 'Novice';
      // Desde 2026-10-14 o teste grátis de 7 dias é o da loja; conta nova entra na degustação.
      await supabase.from('charlotte_users').update(update).eq('id', uid);
      await refreshProfile().catch(() => {});
    } catch {
      // Não crítico
    }
    // Sem o aceite de IA (conta nova): o AuthGuard leva ao aviso, e dele a 1ª lição.
    const consent = await hasAiConsent(uid, profile.created_at).catch(() => false);
    const lesson = consent ? firstLessonRoute(profile.charlotte_level) : null;
    if (lesson) router.replace(lesson as any);
    else router.replace('/(app)');
  }, [profile?.id, profile?.charlotte_level, profile?.created_at, minutes, refreshProfile, stopVoice]); // eslint-disable-line react-hooks/exhaustive-deps

  const skip = useCallback(() => { track('welcome_skip', { step }); finish(false); }, [finish, step]);

  // Voltar do Android: volta um passo; no primeiro, não sai da abertura.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 'plan') setStep('rhythm');
      else if (step === 'rhythm') setStep('hello');
      return true;
    });
    return () => sub.remove();
  }, [step]);

  const dark = step !== 'rhythm';
  return (
    <View style={{ flex: 1, backgroundColor: dark ? INK : CREAM }}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      {step === 'hello' && (
        <HelloStep
          name={name}
          speaking={speaking}
          played={played}
          onReplay={() => { if (voiceUri.current != null) playVoice(voiceUri.current); }}
          onNext={() => { leaveHello(); setStep('rhythm'); }}
          onSkip={() => { leaveHello(); skip(); }}
        />
      )}
      {step === 'rhythm' && (
        <RhythmStep value={minutes} onPick={setMinutes} onBack={() => setStep('hello')} onNext={() => setStep('plan')} />
      )}
      {step === 'plan' && (
        <PlanStep minutes={minutes} busy={busy} onBack={() => setStep('rhythm')} onAccept={() => finish(true)} />
      )}
    </View>
  );
}
