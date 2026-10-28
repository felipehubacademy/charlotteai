// components/trail/TasteTomorrowCard.tsx — degustação: "volte amanhã" na tela inicial.
// Aparece quando o aluno já fez o tópico grátis de hoje e ainda há dias de degustação: diz que amanhã
// libera o próximo e leva à escolha da hora do lembrete. Só 12% da degustação voltava no dia seguinte.
import React from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { Bell, CaretRight } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/hooks/useAuth';
import { systemIsPt } from '@/lib/systemLang';
import { useTheme } from '@/lib/theme';
import { track } from '@/lib/analytics';

const shadow = Platform.select({
  ios:     { shadowColor: 'rgba(22,19,31,0.08)', shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 2 },
});

export function TasteTomorrowCard() {
  const { profile } = useAuth();
  const { colors: T } = useTheme();
  const isPt = systemIsPt;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => {
        if (profile?.id) track('taste_tomorrow_reminder_tap', {});
        router.push('/(app)/reminder-time' as any);
      }}
      accessibilityRole="button"
      accessibilityLabel={isPt ? 'Escolher a hora do lembrete' : 'Choose your reminder time'}
      style={{ marginHorizontal: 20, marginBottom: 20, borderRadius: 18, backgroundColor: T.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...shadow }}
    >
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#DCFF4A', alignItems: 'center', justifyContent: 'center' }}>
        <Bell size={22} color="#16131F" weight="fill" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText style={{ fontSize: 16, fontWeight: '800', color: T.textPrimary }}>
          {isPt ? 'Tópico de hoje concluído!' : "Today's topic done!"}
        </AppText>
        <AppText style={{ fontSize: 13, color: T.textSecondary, marginTop: 2 }}>
          {isPt ? 'Amanhã libera o próximo, grátis. Escolha a hora do lembrete para não esquecer.' : 'The next one unlocks tomorrow, free. Pick a reminder time so you don’t forget.'}
        </AppText>
      </View>
      <CaretRight size={18} color={T.textMuted} weight="bold" />
    </TouchableOpacity>
  );
}
