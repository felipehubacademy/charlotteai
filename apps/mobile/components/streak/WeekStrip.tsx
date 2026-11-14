// components/streak/WeekStrip.tsx — a semana da sequência na tela inicial, numa linha só abaixo do balão
// da Charlotte: 7 bolinhas de segunda a domingo com a letra do dia, as mesmas cores da tela da sequência (feito = laranja,
// protegido = gelo). Hoje ainda sem prática e com sequência viva: a bolinha de hoje pulsa (sequência em risco).
// Sem sequência e sem nenhum dia feito na semana, não aparece (aluno novo não vê 7 bolinhas vazias).
// Toque abre a tela da semana para consultar (StreakProvider.openStreakWeek).
import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated, Easing, Platform } from 'react-native';
import { AppText } from '@/components/ui/Text';
import { systemIsPt } from '@/lib/systemLang';
import { useStreak } from '@/components/streak/StreakProvider';

const INK = '#16131F';
const ORANGE = '#FF8A1F';
const ICE = '#7CC8FF';
const GHOST = 'rgba(22,19,31,0.14)';
const MUTED = '#8A8494';
const WEEK_PT = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const WEEK_EN = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DOT = 22;

export function WeekStrip() {
  const isPt = systemIsPt;
  const { status, openStreakWeek } = useStreak();
  const pulse = useRef(new Animated.Value(0)).current;

  const week = status?.week ?? [];
  const anyThisWeek = week.some(d => d.state === 'done' || d.state === 'frozen');
  const atRisk = !!status && status.streak > 0 && !status.practiced_today;

  useEffect(() => {
    if (!atRisk) { pulse.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [atRisk, pulse]);

  if (!status || week.length !== 7 || (status.streak < 1 && !anyThisWeek)) return null;

  const label = isPt
    ? `Sua semana: ${status.streak} ${status.streak === 1 ? 'dia seguido' : 'dias seguidos'}${atRisk ? ', pratique hoje para manter' : ''}`
    : `Your week: ${status.streak}-day streak${atRisk ? ', practice today to keep it' : ''}`;

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={openStreakWeek} accessibilityRole="button" accessibilityLabel={label}
      style={{
        alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, marginBottom: 6,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#FFFFFF',
        ...Platform.select({
          ios:     { shadowColor: 'rgba(22,19,31,0.08)', shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
          android: { elevation: 1 },
        }),
      }}>
      {week.map((d, i) => {
        const done = d.state === 'done', frozen = d.state === 'frozen';
        const isToday = d.date === status.today;
        const letter = (isPt ? WEEK_PT : WEEK_EN)[i];
        const dot = (
          <View style={{
            width: DOT, height: DOT, borderRadius: DOT / 2, alignItems: 'center', justifyContent: 'center',
            backgroundColor: done ? ORANGE : frozen ? ICE : 'transparent',
            borderWidth: done || frozen ? 0 : isToday ? 2 : 1.5,
            borderColor: isToday ? ORANGE : GHOST,
          }}>
            <AppText style={{ fontSize: 10, fontWeight: '800', color: done || frozen ? INK : isToday ? ORANGE : d.state === 'missed' ? 'rgba(138,132,148,0.55)' : MUTED }}>{letter}</AppText>
          </View>
        );
        if (isToday && atRisk) {
          return (
            <Animated.View key={d.date} style={{
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }],
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.75] }),
            }}>{dot}</Animated.View>
          );
        }
        return <View key={d.date}>{dot}</View>;
      })}
    </TouchableOpacity>
  );
}
