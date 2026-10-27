// components/social/RankLeaderModal.tsx — celebração de quem assume o 1º lugar do ranking do nível.
// Tela cheia escura, coroa que entra com mola, chuva de confete dupla, som e vibração de conquista
// lendária, e o card para compartilhar nas redes (ShareCardModal, tipo 'rank').
// Dispara na tela inicial uma vez por conquista da liderança (perdeu e voltou = celebra de novo).
import React, { useEffect, useRef, useState } from 'react';
import { View, Modal, TouchableOpacity, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Crown, ShareNetwork } from 'phosphor-react-native';
import * as Haptics from '@/lib/hapticsGated';
import { AppText } from '@/components/ui/Text';
import { Confetti } from '@/components/ui/Confetti';
import { soundEngine } from '@/lib/soundEngine';
import { systemIsPt } from '@/lib/systemLang';
import { useShareCard } from '@/components/share/ShareCardProvider';
import { track } from '@/lib/analytics';

const INK = '#16131F';
const VOLT = '#DCFF4A';
const PAPER = '#FAF7F0';

export interface RankLeaderEvent {
  level: string;      // Novice | Inter | Advanced
  totalXP: number;
  leadXP: number | null; // vantagem sobre o 2º (null = ninguém atrás)
  players: number;    // alunos no ranking do nível
}

const LEVEL_NAME: Record<string, string> = { Novice: 'Novice', Inter: 'Intermediate', Advanced: 'Advanced' };
const fmt = (n: number, pt: boolean) => n.toLocaleString(pt ? 'pt-BR' : 'en-US');

export function RankLeaderModal({ event, onClose }: { event: RankLeaderEvent | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const isPt = systemIsPt;
  const openShare = useShareCard();
  const crown = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;
  const [secondWave, setSecondWave] = useState(false);

  useEffect(() => {
    if (!event) return;
    crown.setValue(0); text.setValue(0); setSecondWave(false);
    soundEngine.play('achievement_legendary').catch(() => {});
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const h = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 350);
    const w = setTimeout(() => setSecondWave(true), 1600);
    Animated.sequence([
      Animated.spring(crown, { toValue: 1, friction: 4, tension: 70, useNativeDriver: true }),
      Animated.timing(text, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    pulse.start();
    track('rank_leader_shown', { level: event.level });
    return () => { clearTimeout(h); clearTimeout(w); pulse.stop(); };
  }, [event]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!event) return null;
  const level = LEVEL_NAME[event.level] ?? event.level;
  const crownScale = crown.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  const crownRotate = crown.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });
  const textY = text.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  const share = () => {
    track('rank_leader_share', { level: event.level });
    onClose();
    // O iOS não apresenta dois modais juntos: o card abre depois que este fecha.
    setTimeout(() => openShare({
      kind: 'rank',
      seed: event.level,
      badge: 'Líder do ranking',
      big: '#1',
      title: `no ranking do ${level}`,
      subtitle: `${fmt(event.totalXP, true)} XP${event.players > 1 ? `, à frente de ${fmt(event.players - 1, true)} alunos` : ''}`,
      icon: <Crown size={44} color={INK} weight="fill" />,
    }), 450);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(22,19,31,0.96)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingTop: insets.top, paddingBottom: insets.bottom + 20 }}>
        <Confetti />
        {secondWave && <Confetti />}

        <View style={{ alignItems: 'center', justifyContent: 'center', width: 220, height: 220 }}>
          <Animated.View style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: VOLT, opacity: glowOpacity, transform: [{ scale: glowScale }] }} />
          <Animated.View style={{ width: 150, height: 150, borderRadius: 75, backgroundColor: INK, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: VOLT, transform: [{ scale: crownScale }, { rotate: crownRotate }] }}>
            <Crown size={84} color={VOLT} weight="fill" />
          </Animated.View>
        </View>

        <Animated.View style={{ alignItems: 'center', marginTop: 18, opacity: text, transform: [{ translateY: textY }] }}>
          <AppText style={{ fontSize: 13, fontWeight: '800', letterSpacing: 2, color: VOLT, textTransform: 'uppercase' }}>
            {isPt ? `Ranking do ${level}` : `${level} leaderboard`}
          </AppText>
          <AppText display style={{ fontSize: 96, lineHeight: 100, fontWeight: '800', color: '#FFFFFF', letterSpacing: -3, marginTop: 6 }}>#1</AppText>
          <AppText display style={{ fontSize: 28, lineHeight: 33, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginTop: 4 }}>
            {isPt ? 'Você assumiu a liderança!' : "You're in the lead!"}
          </AppText>
          <AppText style={{ fontSize: 15, lineHeight: 21, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 10 }}>
            {isPt
              ? `${fmt(event.totalXP, true)} XP${event.leadXP != null ? ` e ${fmt(event.leadXP, true)} à frente do 2º lugar` : ''}. Agora é defender o trono.`
              : `${fmt(event.totalXP, false)} XP${event.leadXP != null ? `, ${fmt(event.leadXP, false)} ahead of 2nd place` : ''}. Now defend your crown.`}
          </AppText>
        </Animated.View>

        <Animated.View style={{ width: '100%', marginTop: 34, gap: 12, opacity: text }}>
          <TouchableOpacity onPress={share} activeOpacity={0.85}
            style={{ backgroundColor: VOLT, borderRadius: 999, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <ShareNetwork size={20} color={INK} weight="bold" />
            <AppText style={{ fontSize: 16, fontWeight: '800', color: INK }}>{isPt ? 'Compartilhar conquista' : 'Share it'}</AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ paddingVertical: 12, alignItems: 'center' }}>
            <AppText style={{ fontSize: 15, fontWeight: '700', color: PAPER }}>{isPt ? 'Continuar' : 'Continue'}</AppText>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}
