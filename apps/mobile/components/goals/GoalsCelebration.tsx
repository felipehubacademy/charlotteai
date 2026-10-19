// GoalsCelebration — comemora as metas creditadas pelo servidor (lib/goalsEvents), em três níveis:
//   1. cada missão do dia: aviso curto no topo, com som (nada de tela cheia: são três por dia);
//   2. as 3 missões do dia completas: tela curta com quem fala na Início (Família Queizy);
//   3. desafio da semana: comemoração completa, com o card de compartilhar (formato Stories).
// Montado uma vez em app/(app)/_layout.tsx.
import React, { useEffect, useRef, useState } from 'react';
import { View, Modal, TouchableOpacity, Animated, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, Trophy } from 'phosphor-react-native';
import * as Haptics from '@/lib/hapticsGated';
import { AppText } from '@/components/ui/Text';
import { onGoalsGranted } from '@/lib/goalsEvents';
import type { GoalsResponse } from '@/lib/missions';
import { soundEngine } from '@/lib/soundEngine';
import { systemIsPt } from '@/lib/systemLang';
import { characterInfo } from '@/lib/characters';
import { useAuth } from '@/hooks/useAuth';
import { useShareCard } from '@/components/share/ShareCardProvider';

const INK = '#16131F';
const VOLT = '#DCFF4A';
const GREEN = '#08804A';

type Item =
  | { kind: 'toast'; title: string; xp: number }
  | { kind: 'daily'; titles: string[]; xp: number }
  | { kind: 'weekly'; title: string; xp: number };

export function GoalsCelebration() {
  const isPt = systemIsPt;
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const openShare = useShareCard();
  const [queue, setQueue] = useState<Item[]>([]);
  const current = queue[0] ?? null;
  const slide = useRef(new Animated.Value(-160)).current;

  useEffect(() => onGoalsGranted((g: GoalsResponse) => {
    const t = (b: { pt: string; en: string }) => (isPt ? b.pt : b.en);
    const items: Item[] = [];
    const missions = g.granted.filter(x => x.kind === 'mission');
    if (g.dailyAllDoneNow) {
      items.push({ kind: 'daily', titles: g.daily.map(m => t(m.title)), xp: g.daily.reduce((a, m) => a + m.xp, 0) });
    } else {
      missions.forEach(m => items.push({ kind: 'toast', title: t(m.title), xp: m.xp }));
    }
    const weekly = g.granted.find(x => x.kind === 'weekly');
    if (weekly) items.push({ kind: 'weekly', title: t(weekly.title), xp: weekly.xp });
    if (items.length) setQueue(q => [...q, ...items]);
  }), [isPt]);

  const next = () => setQueue(q => q.slice(1));

  // Aviso curto: desce, fica 2,6 s e sobe.
  useEffect(() => {
    if (!current) return;
    if (current.kind === 'toast') {
      soundEngine.play('xp_gained').catch(() => {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      slide.setValue(-160);
      Animated.sequence([
        Animated.spring(slide, { toValue: 0, useNativeDriver: true, friction: 8, tension: 70 }),
        Animated.delay(2600),
        Animated.timing(slide, { toValue: -160, duration: 220, useNativeDriver: true }),
      ]).start(() => next());
    } else {
      soundEngine.play(current.kind === 'weekly' ? 'achievement_epic' : 'daily_goal').catch(() => {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) return null;

  if (current.kind === 'toast') {
    return (
      <Animated.View pointerEvents="none" style={{
        position: 'absolute', left: 12, right: 12, top: insets.top + 8, zIndex: 9000,
        transform: [{ translateY: slide }],
        backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 10,
      }}>
        <CheckCircle size={30} color={GREEN} weight="fill" />
        <View style={{ flex: 1 }}>
          <AppText style={{ fontSize: 11, fontWeight: '800', color: GREEN, letterSpacing: 1, textTransform: 'uppercase' }}>
            {isPt ? 'Missão concluída' : 'Mission complete'}
          </AppText>
          <AppText style={{ fontSize: 14, fontWeight: '700', color: INK, marginTop: 2 }} numberOfLines={3}>{current.title}</AppText>
        </View>
        <View style={{ backgroundColor: VOLT, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
          <AppText style={{ fontSize: 13, fontWeight: '800', color: INK }}>+{current.xp} XP</AppText>
        </View>
      </Animated.View>
    );
  }

  const host = characterInfo(profile?.active_character);
  const weekly = current.kind === 'weekly';
  return (
    <Modal visible transparent animationType="fade" onRequestClose={next}>
      <View style={{ flex: 1, backgroundColor: 'rgba(22,19,31,0.88)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ width: '100%', maxWidth: 360, backgroundColor: weekly ? VOLT : '#FFFFFF', borderRadius: 28, padding: 24, alignItems: 'center' }}>
          {weekly ? (
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={44} color={VOLT} weight="fill" />
            </View>
          ) : (
            <Image source={host.avatar} style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: INK }} />
          )}
          <AppText style={{ fontSize: 12, fontWeight: '800', color: weekly ? INK : GREEN, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 16 }}>
            {weekly ? (isPt ? 'Desafio da semana' : 'Weekly challenge') : (isPt ? 'Missões do dia' : 'Daily missions')}
          </AppText>
          <AppText display style={{ fontSize: 28, lineHeight: 32, fontWeight: '800', color: INK, textAlign: 'center', marginTop: 6 }}>
            {weekly ? (isPt ? 'Desafio concluído!' : 'Challenge complete!') : (isPt ? 'As 3 missões de hoje estão feitas!' : 'All 3 missions done today!')}
          </AppText>
          {weekly ? (
            <AppText style={{ fontSize: 15, color: 'rgba(22,19,31,0.75)', textAlign: 'center', marginTop: 8 }}>{current.title}</AppText>
          ) : (
            <View style={{ alignSelf: 'stretch', marginTop: 14, gap: 8 }}>
              {current.titles.map(t => (
                <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={18} color={GREEN} weight="fill" />
                  <AppText style={{ flex: 1, fontSize: 14, color: INK }}>{t}</AppText>
                </View>
              ))}
            </View>
          )}
          <View style={{ backgroundColor: weekly ? INK : VOLT, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, marginTop: 16 }}>
            <AppText style={{ fontSize: 16, fontWeight: '800', color: weekly ? VOLT : INK }}>+{current.xp} XP</AppText>
          </View>
          {!weekly && (
            <AppText style={{ fontSize: 13, color: 'rgba(22,19,31,0.6)', textAlign: 'center', marginTop: 12 }}>
              {isPt ? 'Amanhã tem missão nova. Bora manter o ritmo!' : 'New missions tomorrow. Keep it up!'}
            </AppText>
          )}

          {weekly && (
            <TouchableOpacity activeOpacity={0.85}
              onPress={() => {
                const c = current; next();
                // O iOS não apresenta dois modais juntos: fecha este e abre o card depois.
                setTimeout(() => openShare({
                  kind: 'challenge', big: `+${c.xp} XP`, seed: c.title,
                  title: isPt ? 'Desafio da semana concluído' : 'Weekly challenge complete',
                  subtitle: c.title,
                }), 450);
              }}
              style={{ alignSelf: 'stretch', backgroundColor: INK, borderRadius: 999, paddingVertical: 15, alignItems: 'center', marginTop: 20 }}>
              <AppText style={{ fontSize: 15, fontWeight: '800', color: VOLT }}>{isPt ? 'Compartilhar' : 'Share'}</AppText>
            </TouchableOpacity>
          )}
          <TouchableOpacity activeOpacity={0.85} onPress={next}
            style={{ alignSelf: 'stretch', backgroundColor: weekly ? 'transparent' : INK, borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: weekly ? 6 : 20 }}>
            <AppText style={{ fontSize: 15, fontWeight: '800', color: weekly ? INK : '#FFFFFF' }}>{isPt ? 'Continuar' : 'Continue'}</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
