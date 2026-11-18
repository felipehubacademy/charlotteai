// components/streak/StreakProtectedCard.tsx — tela inicial: ontem o aluno faltou e a proteção da semana
// segurou a sequência. Some quando ele pratica hoje (a proteção só vale se ele voltar hoje).
// É só aviso: aparece uma vez por proteção (na 1ª vez que a tela inicial abre depois dela) e tem X.
// Volta só numa próxima proteção (outro dia protegido).
import React, { useEffect, useState } from 'react';
import { View, Platform, TouchableOpacity } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ShieldCheck, X } from 'phosphor-react-native';
import { track } from '@/lib/analytics';
import { AppText } from '@/components/ui/Text';
import { systemIsPt } from '@/lib/systemLang';
import { useTheme } from '@/lib/theme';

const shadow = Platform.select({
  ios:     { shadowColor: 'rgba(22,19,31,0.08)', shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 2 },
});

export function StreakProtectedCard({ streak, protectedDay }: { streak: number; protectedDay: string }) {
  const { colors: T } = useTheme();
  const isPt = systemIsPt;
  // null = conferindo; true = mostra nesta visita (e já marca como visto); false = já visto antes.
  const [show, setShow] = useState<boolean | null>(null);
  const key = `streak_protected_seen_${protectedDay}`;
  useEffect(() => {
    let alive = true;
    SecureStore.getItemAsync(key).catch(() => null).then(seen => {
      if (!alive) return;
      setShow(!seen);
      if (!seen) SecureStore.setItemAsync(key, '1').catch(() => {});
    });
    return () => { alive = false; };
  }, [key]);
  if (!show) return null;
  return (
    <View style={{ marginHorizontal: 20, marginBottom: 20, borderRadius: 18, backgroundColor: T.card, padding: 14, paddingRight: 34, flexDirection: 'row', alignItems: 'center', gap: 12, ...shadow }}>
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
      <TouchableOpacity onPress={() => { track('streak_protected_card_dismiss', { streak }); setShow(false); }}
        hitSlop={12} accessibilityRole="button" accessibilityLabel={isPt ? 'Fechar aviso' : 'Dismiss'}
        style={{ position: 'absolute', top: 10, right: 10, padding: 2 }}>
        <X size={14} color={T.textSecondary} weight="bold" />
      </TouchableOpacity>
    </View>
  );
}
