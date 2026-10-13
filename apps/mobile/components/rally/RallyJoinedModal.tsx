// RallyJoinedModal — aparece quando o aluno entra numa competição pelo link (ou depois do
// cadastro, com o link guardado): "Você entrou na competição do Marco", o que vale, quanto
// falta, quem está na disputa e o prêmio. Também explica quando não deu para entrar.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Modal, TouchableOpacity, Animated, Easing, Dimensions, Image } from 'react-native';
import { router } from 'expo-router';
import { Flag, WarningCircle } from 'phosphor-react-native';
import * as Haptics from '@/lib/hapticsGated';
import { AppText } from '@/components/ui/Text';
import { soundEngine } from '@/lib/soundEngine';
import { systemIsPt } from '@/lib/systemLang';
import { onRallyJoin, rallyTimeLeft, type RallyJoinEvent, type RallyStanding } from '@/lib/rally';

const C = { ink: '#16131F', volt: '#DCFF4A', white: '#FFFFFF', soft: 'rgba(255,255,255,0.72)', faint: 'rgba(255,255,255,0.55)' };
const { width: W, height: H } = Dimensions.get('window');
const COLORS = ['#DCFF4A', '#FF4F8B', '#2BD97C', '#6B4BFF', '#FFFFFF'];

const ERRORS: Record<string, { pt: string; en: string }> = {
  ended:     { pt: 'Essa competição já terminou.', en: 'That challenge has already ended.' },
  full:      { pt: 'Essa competição já está cheia.', en: 'That challenge is already full.' },
  not_found: { pt: 'Não encontramos essa competição.', en: "We couldn't find that challenge." },
  suspended: { pt: 'Sua conta não pode entrar em competições agora.', en: "Your account can't join challenges right now." },
};

function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 90 }, (_, i) => ({
    x: Math.random() * W, delay: Math.random() * 900, drift: (Math.random() - 0.5) * 220,
    rot: Math.random() * 720 - 360, color: COLORS[i % COLORS.length], size: 6 + Math.floor(Math.random() * 7), dur: 2200 + Math.random() * 1200,
  })), []);
  const values = useRef(pieces.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.parallel(values.map((v, i) => Animated.timing(v, {
      toValue: 1, duration: pieces[i].dur, delay: pieces[i].delay, easing: Easing.in(Easing.quad), useNativeDriver: true,
    }))).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {pieces.map((p, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', top: 0, left: p.x, width: p.size, height: p.size * 0.6, borderRadius: 2, backgroundColor: p.color,
          transform: [
            { translateY: values[i].interpolate({ inputRange: [0, 1], outputRange: [-30, H + 30] }) },
            { translateX: values[i].interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
            { rotate: values[i].interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot}deg`] }) },
          ],
        }} />
      ))}
    </View>
  );
}

function Face({ s, index }: { s: RallyStanding; index: number }) {
  const box = { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: C.ink, marginLeft: index ? -10 : 0 };
  if (s.avatarUrl) return <Image source={{ uri: s.avatarUrl }} style={box} />;
  return (
    <View style={{ ...box, backgroundColor: C.volt, alignItems: 'center', justifyContent: 'center' }}>
      <AppText style={{ fontSize: 17, fontWeight: '800', color: C.ink }}>{(s.name ?? '?').charAt(0).toUpperCase()}</AppText>
    </View>
  );
}

export function RallyJoinedModal() {
  const isPt = systemIsPt;
  const t = (pt: string, en: string) => (isPt ? pt : en);
  const [ev, setEv] = useState<RallyJoinEvent | null>(null);
  const scale = useRef(new Animated.Value(0.85)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => onRallyJoin(setEv), []);

  useEffect(() => {
    if (!ev) return;
    scale.setValue(0.85); fade.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    if (ev.ok && !ev.already) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      soundEngine.play('achievement_common', { volume: 0.7 }).catch(() => {});
    }
  }, [ev]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ev) return null;
  const close = () => setEv(null);
  const go = (path: string) => { setEv(null); router.push(path as any); };

  const rally = ev.ok ? ev.rally : null;
  const host = rally && !rally.isCreator ? rally.creator : null;
  const title = !ev.ok
    ? t('Não deu para entrar', "Couldn't join")
    : ev.already
      ? t('Você já está nessa competição', "You're already in this challenge")
      : host ? t(`Você entrou na competição do ${host}`, `You joined ${host}'s challenge`) : t('Você entrou na competição', 'You joined the challenge');
  const errorText = !ev.ok ? (ERRORS[ev.error] ? t(ERRORS[ev.error].pt, ERRORS[ev.error].en) : t('Tente de novo em instantes.', 'Please try again in a moment.')) : null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={close}>
      <Animated.View style={{ flex: 1, opacity: fade, backgroundColor: 'rgba(22,19,31,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {ev.ok && !ev.already && <Confetti />}
        <Animated.View style={{ width: '100%', maxWidth: 360, backgroundColor: C.ink, borderRadius: 26, padding: 24, alignItems: 'center', transform: [{ scale }] }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: ev.ok ? C.volt : 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            {ev.ok ? <Flag size={30} color={C.ink} weight="fill" /> : <WarningCircle size={32} color={C.white} weight="bold" />}
          </View>
          <AppText display style={{ fontSize: 25, lineHeight: 30, fontWeight: '800', color: C.white, textAlign: 'center' }}>{title}</AppText>

          {rally && (
            <>
              <AppText style={{ fontSize: 16, fontWeight: '700', color: C.volt, textAlign: 'center', marginTop: 10 }}>{rally.title}</AppText>
              <AppText style={{ fontSize: 13.5, color: C.faint, marginTop: 4 }}>{rallyTimeLeft(rally.endsAt, isPt)}</AppText>
              {rally.standings.length > 0 && (
                <View style={{ flexDirection: 'row', marginTop: 16 }}>
                  {rally.standings.slice(0, 6).map((s, i) => <Face key={s.userId} s={s} index={i} />)}
                </View>
              )}
              {ev.ok && !ev.already && (
                <AppText style={{ fontSize: 14.5, lineHeight: 20, color: C.soft, textAlign: 'center', marginTop: 14 }}>
                  {t('Quem vencer ganha 5 minutos de Live Voice. Boa disputa!', 'The winner gets 5 Live Voice minutes. Good luck!')}
                </AppText>
              )}
            </>
          )}
          {errorText && (
            <AppText style={{ fontSize: 15, lineHeight: 21, color: C.soft, textAlign: 'center', marginTop: 10 }}>{errorText}</AppText>
          )}

          {ev.ok ? (
            <>
              <TouchableOpacity onPress={() => go('/(app)/(tabs)/practice')} activeOpacity={0.85}
                style={{ marginTop: 22, alignSelf: 'stretch', backgroundColor: C.volt, borderRadius: 999, paddingVertical: 15, alignItems: 'center' }}>
                <AppText style={{ fontSize: 16, fontWeight: '800', color: C.ink }}>{t('Praticar agora', 'Practice now')}</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => go('/(app)/study-together')} style={{ marginTop: 12, padding: 6 }}>
                <AppText style={{ fontSize: 14, fontWeight: '700', color: C.faint }}>{t('Ver competição', 'See challenge')}</AppText>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={close} activeOpacity={0.85}
                style={{ marginTop: 22, alignSelf: 'stretch', backgroundColor: C.volt, borderRadius: 999, paddingVertical: 15, alignItems: 'center' }}>
                <AppText style={{ fontSize: 16, fontWeight: '800', color: C.ink }}>{t('Entendi', 'Got it')}</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => go('/(app)/study-together')} style={{ marginTop: 12, padding: 6 }}>
                <AppText style={{ fontSize: 14, fontWeight: '700', color: C.faint }}>{t('Ver minhas competições', 'See my challenges')}</AppText>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
