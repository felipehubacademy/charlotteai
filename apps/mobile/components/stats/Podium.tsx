// components/stats/Podium.tsx — pódio do top 3 do ranking, lado a lado como numa competição:
// 2º à esquerda, 1º no centro (mais alto, com coroa) e 3º à direita, nas cores de ouro, prata e bronze.
import React from 'react';
import { View } from 'react-native';
import { Crown } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { C, firstName } from '@/components/stats/StatsUI';

const MEDAL = {
  1: { color: '#F5B700', soft: '#FFF3C4', label: '#7A5A00' }, // ouro
  2: { color: '#A9B4C0', soft: '#EEF1F4', label: '#4B5663' }, // prata
  3: { color: '#CD7F32', soft: '#F8E6D4', label: '#7A4613' }, // bronze
} as const;
const HEIGHT = { 1: 118, 2: 88, 3: 68 } as const;

export interface PodiumEntry { userId: string; name: string; xp: number; rank: number }

function Spot({ e, place, isUser, youLabel }: { e: PodiumEntry | undefined; place: 1 | 2 | 3; isUser: boolean; youLabel: string }) {
  const m = MEDAL[place];
  const big = place === 1;
  const size = big ? 64 : 52;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
      {e ? (
        <>
          {big && <Crown size={26} color={m.color} weight="fill" style={{ marginBottom: 2 }} />}
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: m.soft, borderWidth: 3, borderColor: m.color, alignItems: 'center', justifyContent: 'center' }}>
            <AppText display style={{ fontSize: big ? 26 : 21, fontWeight: '800', color: m.label }}>
              {(e.name || '?').trim().charAt(0).toUpperCase()}
            </AppText>
          </View>
          <AppText numberOfLines={1} style={{ fontSize: 14, fontWeight: '800', color: C.ink, marginTop: 6, maxWidth: '92%' }}>
            {firstName(e.name, `#${place}`)}
          </AppText>
          {isUser && <AppText style={{ fontSize: 11, fontWeight: '700', color: C.green }}>{youLabel}</AppText>}
          <AppText style={{ fontSize: 12.5, fontWeight: '700', color: C.mid, marginTop: 1, marginBottom: 6 }}>
            {e.xp.toLocaleString()} XP
          </AppText>
        </>
      ) : <View style={{ height: 40 }} />}
      <View style={{ width: '100%', height: HEIGHT[place], backgroundColor: m.color, borderTopLeftRadius: 14, borderTopRightRadius: 14, alignItems: 'center', paddingTop: 10, opacity: e ? 1 : 0.35 }}>
        <AppText display style={{ fontSize: big ? 40 : 32, lineHeight: big ? 44 : 36, fontWeight: '800', color: '#FFFFFF' }}>{place}</AppText>
      </View>
    </View>
  );
}

export function Podium({ entries, userId, youLabel }: { entries: PodiumEntry[]; userId: string; youLabel: string }) {
  const at = (p: number) => entries.find(e => e.rank === p) ?? entries[p - 1];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginHorizontal: 16, marginBottom: 16, paddingHorizontal: 12, paddingTop: 16, backgroundColor: C.card, borderRadius: 24, overflow: 'hidden' }}>
      {([2, 1, 3] as const).map(p => {
        const e = at(p);
        return <Spot key={p} e={e} place={p} isUser={!!e && e.userId === userId} youLabel={youLabel} />;
      })}
    </View>
  );
}
