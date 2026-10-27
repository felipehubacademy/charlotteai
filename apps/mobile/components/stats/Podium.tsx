// components/stats/Podium.tsx — pódio do top 3 do ranking, lado a lado como numa competição:
// 2º à esquerda, 1º no centro (mais alto, com coroa) e 3º à direita.
// Degraus na cor da marca (grafite, com volt no topo do 1º) e o metal só na medalha de cada degrau:
// degradê com brilho (ouro, prata e bronze) em SVG, que já existe no app e funciona por OTA.
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Stop, Path } from 'react-native-svg';
import { Crown } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { C, firstName } from '@/components/stats/StatsUI';

const METAL = {
  1: { stops: ['#FFF4B8', '#F2C94C', '#C8901A', '#F7DC6F'], rim: '#9C6B0B', text: '#5C3D00' }, // ouro
  2: { stops: ['#FFFFFF', '#DDE3E9', '#9EA9B5', '#E8EDF1'], rim: '#6F7A86', text: '#323A44' }, // prata
  3: { stops: ['#FFD9B0', '#D99055', '#9A5523', '#E6A56E'], rim: '#6E3A12', text: '#3F1F05' }, // bronze
} as const;
const HEIGHT = { 1: 112, 2: 84, 3: 64 } as const;

function Medal({ place, size }: { place: 1 | 2 | 3; size: number }) {
  const m = METAL[place];
  const id = `medal${place}`;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={m.stops[0]} />
            <Stop offset="0.35" stopColor={m.stops[1]} />
            <Stop offset="0.75" stopColor={m.stops[2]} />
            <Stop offset="1" stopColor={m.stops[3]} />
          </LinearGradient>
          <RadialGradient id={`${id}s`} cx="0.32" cy="0.28" r="0.45">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.85" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="48" fill={m.rim} />
        <Circle cx="50" cy="50" r="44" fill={`url(#${id}g)`} />
        <Circle cx="50" cy="50" r="34" fill="none" stroke={m.rim} strokeOpacity={0.35} strokeWidth="2" />
        <Path d="M18 40 A34 34 0 0 1 60 14" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth="4" strokeLinecap="round" fill="none" />
        <Circle cx="50" cy="50" r="44" fill={`url(#${id}s)`} />
      </Svg>
      <AppText display style={{ fontSize: size * 0.42, lineHeight: size * 0.5, fontWeight: '800', color: m.text }}>{place}</AppText>
    </View>
  );
}

export interface PodiumEntry { userId: string; name: string; xp: number; rank: number }

function Spot({ e, place, isUser, youLabel }: { e: PodiumEntry | undefined; place: 1 | 2 | 3; isUser: boolean; youLabel: string }) {
  const big = place === 1;
  const size = big ? 62 : 50;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
      {e ? (
        <>
          {big && <Crown size={26} color={C.ink} weight="fill" style={{ marginBottom: 2 }} />}
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: big ? C.volt : C.bg, borderWidth: big ? 0 : 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
            <AppText display style={{ fontSize: big ? 26 : 21, fontWeight: '800', color: C.ink }}>
              {(e.name || '?').trim().charAt(0).toUpperCase()}
            </AppText>
          </View>
          <AppText numberOfLines={1} style={{ fontSize: 14, fontWeight: '800', color: C.ink, marginTop: 6, maxWidth: '92%' }}>
            {firstName(e.name, `#${place}`)}
          </AppText>
          {isUser && <AppText style={{ fontSize: 11, fontWeight: '700', color: C.green }}>{youLabel}</AppText>}
          <AppText style={{ fontSize: 12.5, fontWeight: '700', color: C.mid, marginTop: 1, marginBottom: 8 }}>
            {e.xp.toLocaleString()} XP
          </AppText>
        </>
      ) : <View style={{ height: 40 }} />}
      <View style={{ width: '100%', height: HEIGHT[place], backgroundColor: C.ink, borderTopLeftRadius: 14, borderTopRightRadius: 14, alignItems: 'center', paddingTop: 10, opacity: e ? 1 : 0.3, overflow: 'hidden' }}>
        {big && <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, backgroundColor: C.volt }} />}
        <Medal place={place} size={big ? 52 : 44} />
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
