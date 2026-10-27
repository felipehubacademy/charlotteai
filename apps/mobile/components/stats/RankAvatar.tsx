// components/stats/RankAvatar.tsx — avatar do ranking: a foto do aluno, ou a inicial num círculo com uma
// das cores da marca (sempre a mesma para a mesma pessoa). Aro opcional (metal das medalhas no pódio).
import React from 'react';
import { View, Image } from 'react-native';
import { AppText } from '@/components/ui/Text';

const INK = '#16131F';
// [fundo, texto]
const SWATCHES: [string, string][] = [
  ['#DCFF4A', INK],      // volt
  ['#FF4F8B', '#FFFFFF'], // rosa
  ['#6B4BFF', '#FFFFFF'], // violeta
  ['#2BD97C', INK],      // verde
  ['#FFB547', INK],      // laranja
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function RankAvatar({ id, name, url, size, ring, ringWidth = 3 }: {
  id: string; name: string; url?: string | null; size: number; ring?: string; ringWidth?: number;
}) {
  const [bg, fg] = SWATCHES[hash(id) % SWATCHES.length];
  const inner = ring ? size - ringWidth * 2 : size;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: ring ?? 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      {url ? (
        <Image source={{ uri: url }} style={{ width: inner, height: inner, borderRadius: inner / 2 }} />
      ) : (
        <View style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
          <AppText display style={{ fontSize: inner * 0.42, fontWeight: '800', color: fg }}>
            {(name || '?').trim().charAt(0).toUpperCase()}
          </AppText>
        </View>
      )}
    </View>
  );
}
