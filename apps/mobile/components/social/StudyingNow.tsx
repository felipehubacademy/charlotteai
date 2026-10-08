// StudyingNow — linha discreta na Home: quantas pessoas estão estudando agora
// (últimos 15 min) e, se for o caso, que a sua dupla também está. Toque leva
// para Estudar junto. Some quando há menos de 2 pessoas.
import React, { useCallback, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppText } from '@/components/ui/Text';
import { systemIsPt } from '@/lib/systemLang';
import { fetchSocial } from '@/lib/social';

export function StudyingNow() {
  const isPt = systemIsPt;
  const [info, setInfo] = useState<{ n: number; buddies: string[] } | null>(null);

  useFocusEffect(useCallback(() => {
    let alive = true;
    fetchSocial().then(s => { if (alive && s) setInfo({ n: s.studyingNow, buddies: s.buddiesNow }); });
    return () => { alive = false; };
  }, []));

  if (!info || (info.n < 2 && !info.buddies.length)) return null;
  const buddy = info.buddies[0];
  const text = buddy
    ? (isPt ? `${buddy}, da sua dupla, está estudando agora` : `${buddy}, your study buddy, is studying now`)
    : (isPt ? `${info.n} pessoas estudando agora` : `${info.n} people studying now`);
  const extra = buddy && info.n > 1 ? (isPt ? ` · ${info.n} no total` : ` · ${info.n} in total`) : '';

  return (
    <TouchableOpacity activeOpacity={0.75} onPress={() => router.push('/(app)/study-together' as any)}
      style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(8,128,74,0.08)' }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#2BD97C' }} />
      <AppText style={{ fontSize: 12.5, fontWeight: '700', color: '#08804A' }}>{text}{extra}</AppText>
    </TouchableOpacity>
  );
}
