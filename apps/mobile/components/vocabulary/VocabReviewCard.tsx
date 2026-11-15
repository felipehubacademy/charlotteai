// components/vocabulary/VocabReviewCard.tsx — tela inicial: há palavras do Vocabulário para revisar hoje
// (revisão espaçada). Leva direto à revisão; some quando não há pelo menos 3 palavras vencidas.
// É o momento no fluxo da revisão: o aluno não precisa lembrar de abrir a aba Vocabulário.
import React, { useCallback, useState } from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Cards, CaretRight } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { systemIsPt } from '@/lib/systemLang';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';

const MIN_DUE = 3;
const SESSION_MAX = 20; // a revisão carrega até 20 cartões por vez (vocab-review)

const shadow = Platform.select({
  ios:     { shadowColor: 'rgba(22,19,31,0.08)', shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 2 },
});

export function VocabReviewCard({ userId }: { userId: string | null | undefined }) {
  const { colors: T } = useTheme();
  const isPt = systemIsPt;
  const [due, setDue] = useState(0);

  useFocusEffect(useCallback(() => {
    if (!userId) return;
    let alive = true;
    supabase.from('user_vocabulary').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).lte('next_review_at', new Date().toISOString())
      .then(({ count }) => { if (alive) setDue(count ?? 0); }, () => {});
    return () => { alive = false; };
  }, [userId]));

  if (due < MIN_DUE) return null;
  const n = Math.min(due, SESSION_MAX);
  const minutes = Math.max(1, Math.ceil((n * 20) / 60)); // mesma conta da aba Vocabulário (20 s por cartão)

  return (
    <TouchableOpacity activeOpacity={0.85}
      onPress={() => { track('vocab_review_card_tap', { due }); router.push('/(app)/vocab-review'); }}
      accessibilityRole="button"
      style={{ marginHorizontal: 20, marginBottom: 20, borderRadius: 18, backgroundColor: T.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...shadow }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1FFB8', alignItems: 'center', justifyContent: 'center' }}>
        <Cards size={22} color="#16131F" weight="fill" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText style={{ fontSize: 16, fontWeight: '800', color: T.textPrimary }}>
          {isPt ? `Revisão rápida: ${n} ${n === 1 ? 'palavra' : 'palavras'}` : `Quick review: ${n} ${n === 1 ? 'word' : 'words'}`}
        </AppText>
        <AppText style={{ fontSize: 13, color: T.textSecondary, marginTop: 2 }}>
          {isPt
            ? `Cerca de ${minutes} min. Revisar no dia certo é o que faz a palavra ficar na memória.`
            : `About ${minutes} min. Reviewing on the right day is what makes words stick.`}
        </AppText>
      </View>
      <CaretRight size={18} color={T.textSecondary} weight="bold" />
    </TouchableOpacity>
  );
}
