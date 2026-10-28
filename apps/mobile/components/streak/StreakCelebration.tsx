// Sequência do dia — tela cheia uma vez por dia, ao concluir a 1ª atividade (inspirada no que o Duolingo
// publicou: a animação da sequência no fim da lição aumentou a volta dos alunos novos).
// Chama que entra e tremula poucas vezes (sem loop infinito), número que sobe, a semana marcada
// (dias feitos, protegidos e o de hoje), o desafio dos 7 dias e a proteção da semana.
// Marcos (7, 30, 50, 100, 365...) ganham confete e frase própria; os outros dias são discretos.
import React, { useEffect, useRef, useState } from 'react';
import { View, Modal, TouchableOpacity, Animated, Easing, StatusBar, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Check, Snowflake, Phone, ShieldCheck } from 'phosphor-react-native';
import * as Haptics from '@/lib/hapticsGated';
import { AppText } from '@/components/ui/Text';
import { ConfettiRain } from '@/components/achievements/AchievementNotification';
import { soundEngine } from '@/lib/soundEngine';
import { voiceSFX } from '@/lib/voiceSFX';
import { systemIsPt } from '@/lib/systemLang';
import { STREAK_MILESTONES, StreakStatus, acceptStreakChallenge, protectedYesterday } from '@/lib/streak';
import { track } from '@/lib/analytics';

const INK = '#16131F';
const VOLT = '#DCFF4A';
const ORANGE = '#FF8A1F';
const ICE = '#7CC8FF';
const WEEK_PT = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const WEEK_EN = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function Flame({ size }: { size: number }) {
  return (
    <Svg width={size} height={size * 1.2} viewBox="0 0 100 120">
      <Defs>
        <LinearGradient id="fo" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFB547" />
          <Stop offset="1" stopColor="#FF5A36" />
        </LinearGradient>
        <LinearGradient id="fi" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFF3A6" />
          <Stop offset="1" stopColor="#FFC23D" />
        </LinearGradient>
      </Defs>
      <Path d="M50 4 C58 26 84 42 84 74 C84 99 67 116 50 116 C33 116 16 99 16 74 C16 55 28 45 35 30 C39 44 45 50 50 53 C48 36 43 22 50 4 Z" fill="url(#fo)" />
      <Path d="M50 58 C57 71 68 78 68 93 C68 105 60 113 50 113 C40 113 32 105 32 93 C32 83 40 77 43 68 C45 74 48 77 50 79 C50 72 47 66 50 58 Z" fill="url(#fi)" />
    </Svg>
  );
}

/** Quantos convites do desafio já apareceram (para não insistir: no máximo 3, um por dia). */
export interface ChallengeOffer { show: boolean; onShown: () => void }

export function StreakScene({ status, offer, onClose }: { status: StreakStatus; offer: ChallengeOffer; onClose: () => void }) {
  const isPt = systemIsPt;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const n = status.streak;
  const milestone = STREAK_MILESTONES.includes(n) && n >= 7;
  const ch = status.challenge;
  const challengeDoneToday = ch?.status === 'completed' && !!ch.completed_at
    && new Date(ch.completed_at).getTime() > Date.now() - 20 * 3600000;
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const canOffer = offer.show && (!ch || ch.status === 'failed');

  const flame = useRef(new Animated.Value(0)).current;
  const flicker = useRef(new Animated.Value(0)).current;
  const content = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(Math.max(0, n - 1));
  const bump = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (canOffer) offer.onShown();
    Animated.sequence([
      Animated.spring(flame, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
      // Três tremidas e para: vivo, sem ficar repetindo na tela.
      Animated.loop(Animated.sequence([
        Animated.timing(flicker, { toValue: 1, duration: 260, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 0, duration: 260, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]), { iterations: 3 }),
    ]).start();
    const t = setTimeout(() => {
      setShown(n);
      Animated.sequence([
        Animated.timing(bump, { toValue: 1.25, duration: 140, useNativeDriver: true }),
        Animated.spring(bump, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      soundEngine.play('streak_alive').catch(() => {});
      if (n === 7) setTimeout(() => voiceSFX.play('streak_7_days').catch(() => {}), 900);
      else if (n === 30) setTimeout(() => voiceSFX.play('streak_30_days').catch(() => {}), 900);
    }, 650);
    Animated.timing(content, { toValue: 1, duration: 420, delay: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const title = n === 1
    ? (isPt ? 'Sequência iniciada!' : 'Streak started!')
    : milestone
    ? (isPt ? `Marco de ${n} dias!` : `${n}-day milestone!`)
    : (isPt ? `${n} dias seguidos!` : `${n} days in a row!`);
  const sub = protectedYesterday(status)
    ? (isPt ? 'Ontem a proteção da semana segurou sua sequência. Hoje ela continua.' : 'Yesterday your weekly protection saved your streak. Today it keeps going.')
    : n === 1
    ? (isPt ? 'Volte amanhã para fazer 2 dias.' : 'Come back tomorrow to make it 2 days.')
    : milestone
    ? (isPt ? 'Pouca gente chega aqui. Que constância!' : 'Few people get here. Amazing consistency!')
    : (isPt ? `Volte amanhã para fazer ${n + 1}.` : `Come back tomorrow to make it ${n + 1}.`);

  const accept = async () => {
    setAccepting(true);
    const ok = await acceptStreakChallenge();
    setAccepting(false);
    if (ok) { setAccepted(true); track('streak_challenge_accepted', { streak: n }); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }
  };

  const fade = { opacity: content, transform: [{ translateY: content.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] };

  return (
    <View style={{ flex: 1, backgroundColor: INK, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20, paddingHorizontal: 24 }}>
      <StatusBar barStyle="light-content" />
      {milestone && <ConfettiRain width={width} height={height} run={1} />}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{
          transform: [
            { scale: flame.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
            { scaleY: flicker.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
          ],
          opacity: flame,
        }}>
          <Flame size={Math.min(130, width * 0.32)} />
        </Animated.View>
        <Animated.View style={{ transform: [{ scale: bump }], marginTop: 6 }}>
          <AppText display style={{ fontSize: 72, fontWeight: '800', color: ORANGE, textAlign: 'center', lineHeight: 80 }}>{shown}</AppText>
        </Animated.View>
        <Animated.View style={[{ alignItems: 'center', width: '100%' }, fade]}>
          <AppText display style={{ fontSize: 26, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginTop: 4 }}>{title}</AppText>
          <AppText style={{ fontSize: 15, color: 'rgba(255,255,255,0.72)', textAlign: 'center', marginTop: 8, lineHeight: 21, maxWidth: 320 }}>{sub}</AppText>

          {/* Semana: feitos (laranja), protegidos (gelo), hoje, faltas e dias que ainda vêm. */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 26, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 14 }}>
            {status.week.map((d, i) => {
              const done = d.state === 'done', frozen = d.state === 'frozen';
              return (
                <View key={d.date} style={{ alignItems: 'center', gap: 6 }}>
                  <AppText style={{ fontSize: 11, fontWeight: '700', color: d.date === status.today ? '#FFFFFF' : 'rgba(255,255,255,0.45)' }}>
                    {(isPt ? WEEK_PT : WEEK_EN)[i]}
                  </AppText>
                  <View style={{
                    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: done ? ORANGE : frozen ? ICE : 'transparent',
                    borderWidth: done || frozen ? 0 : 2,
                    borderColor: d.state === 'missed' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.22)',
                  }}>
                    {done && <Check size={16} color={INK} weight="bold" />}
                    {frozen && <Snowflake size={16} color={INK} weight="bold" />}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Desafio dos 7 dias: convite (até 3 vezes), andamento ou conclusão. */}
          {challengeDoneToday ? (
            <View style={{ marginTop: 16, width: '100%', maxWidth: 340, backgroundColor: VOLT, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Phone size={22} color={INK} weight="fill" />
              <View style={{ flex: 1 }}>
                <AppText style={{ fontSize: 15, fontWeight: '800', color: INK }}>{isPt ? 'Desafio dos 7 dias concluído!' : '7-day challenge complete!'}</AppText>
                <AppText style={{ fontSize: 13, color: 'rgba(22,19,31,0.75)', marginTop: 2 }}>
                  {isPt ? `Ganhou ${ch!.reward_minutes} minutos de ligação por voz.` : `You earned ${ch!.reward_minutes} minutes of voice calls.`}
                </AppText>
              </View>
            </View>
          ) : ch?.status === 'active' || accepted ? (
            <View style={{ marginTop: 16, width: '100%', maxWidth: 340, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 18, padding: 14 }}>
              <AppText style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                {isPt ? `Desafio dos 7 dias: dia ${accepted ? 1 : ch!.day} de 7` : `7-day challenge: day ${accepted ? 1 : ch!.day} of 7`}
              </AppText>
              <View style={{ flexDirection: 'row', gap: 4, marginTop: 10 }}>
                {Array.from({ length: 7 }, (_, i) => (
                  <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < (accepted ? 1 : ch!.day) ? VOLT : 'rgba(255,255,255,0.14)' }} />
                ))}
              </View>
              <AppText style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
                {isPt ? `No 7º dia você ganha ${ch?.reward_minutes ?? 10} minutos de ligação por voz.` : `On day 7 you earn ${ch?.reward_minutes ?? 10} minutes of voice calls.`}
              </AppText>
            </View>
          ) : canOffer ? (
            <View style={{ marginTop: 16, width: '100%', maxWidth: 340, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 18, padding: 16 }}>
              <AppText style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>{isPt ? 'Desafio dos 7 dias' : '7-day challenge'}</AppText>
              <AppText style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', marginTop: 4, lineHeight: 19 }}>
                {isPt ? 'Pratique 7 dias seguidos a partir de hoje e ganhe 10 minutos de ligação por voz.' : 'Practice 7 days in a row starting today and earn 10 minutes of voice calls.'}
              </AppText>
              <TouchableOpacity onPress={accept} disabled={accepting} activeOpacity={0.85}
                style={{ marginTop: 12, backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 12, alignItems: 'center' }}>
                {accepting ? <ActivityIndicator color={INK} /> : (
                  <AppText style={{ fontSize: 15, fontWeight: '800', color: INK }}>{isPt ? 'Aceitar o desafio' : 'Accept the challenge'}</AppText>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          {status.freeze_available && n >= 1 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 }}>
              <ShieldCheck size={15} color={ICE} weight="fill" />
              <AppText style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                {isPt ? 'Proteção da semana ativa: se faltar um dia, a sequência não zera.' : 'Weekly protection on: miss one day and your streak stays.'}
              </AppText>
            </View>
          )}
        </Animated.View>
      </View>

      <TouchableOpacity onPress={onClose} activeOpacity={0.85}
        style={{ backgroundColor: VOLT, borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}>
        <AppText style={{ fontSize: 16, fontWeight: '800', color: INK }}>{isPt ? 'Continuar' : 'Continue'}</AppText>
      </TouchableOpacity>
    </View>
  );
}

export function StreakCelebrationModal({ status, offer, onClose }: { status: StreakStatus | null; offer: ChallengeOffer; onClose: () => void }) {
  if (!status) return null;
  return (
    <Modal visible transparent={false} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <StreakScene status={status} offer={offer} onClose={onClose} />
    </Modal>
  );
}
