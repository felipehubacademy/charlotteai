// components/streak/StreakProtectedCard.tsx — tela inicial: ontem o aluno faltou e a proteção da semana
// segurou a sequência. Some quando ele pratica hoje (a proteção só vale se ele voltar hoje).
import React from 'react';
import { View, Platform } from 'react-native';
import { ShieldCheck } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { systemIsPt } from '@/lib/systemLang';
import { useTheme } from '@/lib/theme';

const shadow = Platform.select({
  ios:     { shadowColor: 'rgba(22,19,31,0.08)', shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 2 },
});

export function StreakProtectedCard({ streak }: { streak: number }) {
  const { colors: T } = useTheme();
  const isPt = systemIsPt;
  return (
    <View style={{ marginHorizontal: 20, marginBottom: 20, borderRadius: 18, backgroundColor: T.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...shadow }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#D9EEFF', alignItems: 'center', justifyContent: 'center' }}>
        <ShieldCheck size={22} color="#2F7FC1" weight="fill" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText style={{ fontSize: 16, fontWeight: '800', color: T.textPrimary }}>
          {isPt ? 'Sua sequência foi protegida' : 'Your streak was protected'}
        </AppText>
        <AppText style={{ fontSize: 13, color: T.textSecondary, marginTop: 2 }}>
          {isPt
            ? `Ontem você não praticou, mas seus ${streak} ${streak === 1 ? 'dia continua' : 'dias continuam'}. Pratique hoje para manter.`
            : `You missed yesterday, but your ${streak}-day streak is safe. Practice today to keep it.`}
        </AppText>
      </View>
    </View>
  );
}
