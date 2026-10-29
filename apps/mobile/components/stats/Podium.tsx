// components/stats/Podium.tsx — o palco do top 3 do ranking.
// Cartão grafite com holofote volt atrás do líder; as colunas sobem animadas ao abrir, com a medalha
// metálica (ouro, prata, bronze) no topo; avatar com aro do mesmo metal.
// O líder ganha coroa que quica e brilhos piscando. Tudo em SVG + Animated (funciona por OTA).
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Animated, Easing, TouchableOpacity } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Stop, Path, Rect } from 'react-native-svg';
import { Crown } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { C, firstName } from '@/components/stats/StatsUI';
import { RankAvatar } from '@/components/stats/RankAvatar';
import { openPhotoPicker } from '@/components/social/PhotoNudge';
import { systemIsPt } from '@/lib/systemLang';

const PINK = '#FF4F8B';
const METAL = {
  1: { stops: ['#FFF4B8', '#F2C94C', '#C8901A', '#F7DC6F'], rim: '#9C6B0B', text: '#5C3D00' }, // ouro
  2: { stops: ['#FFFFFF', '#DDE3E9', '#9EA9B5', '#E8EDF1'], rim: '#6F7A86', text: '#323A44' }, // prata
  3: { stops: ['#FFD9B0', '#D99055', '#9A5523', '#E6A56E'], rim: '#6E3A12', text: '#3F1F05' }, // bronze
} as const;
const HEIGHT = { 1: 128, 2: 96, 3: 76 } as const;

function MetalDefs({ place, id }: { place: 1 | 2 | 3; id: string }) {
  const m = METAL[place];
  return (
    <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <Stop offset="0" stopColor={m.stops[0]} />
      <Stop offset="0.35" stopColor={m.stops[1]} />
      <Stop offset="0.75" stopColor={m.stops[2]} />
      <Stop offset="1" stopColor={m.stops[3]} />
    </LinearGradient>
  );
}

function Medal({ place, size }: { place: 1 | 2 | 3; size: number }) {
  const m = METAL[place];
  const id = `pm${place}`;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
        <Defs>
          <MetalDefs place={place} id={`${id}g`} />
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

/** Aro metálico em volta do avatar. */
function MetalRing({ place, size }: { place: 1 | 2 | 3; size: number }) {
  return (
    <Svg width={size} height={size} style={{ position: 'absolute' }}>
      <Defs><MetalDefs place={place} id={`pr${place}`} /></Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1.75} stroke={`url(#pr${place})`} strokeWidth={3.5} fill="none" />
    </Svg>
  );
}

function Sparkle({ style, delay }: { style: object; delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(v, { toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.delay(900),
    ]));
    loop.start();
    return () => loop.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }, style]}>
      <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" fill={C.volt} /></Svg>
    </Animated.View>
  );
}

export interface PodiumEntry { userId: string; name: string; xp: number; rank: number; avatarUrl?: string | null }

function Spot({ e, place, isUser, youLabel, rise }: { e: PodiumEntry | undefined; place: 1 | 2 | 3; isUser: boolean; youLabel: string; rise: Animated.Value }) {
  const big = place === 1;
  const size = big ? 74 : 58;
    const bounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!big) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(bounce, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(bounce, { toValue: 0, duration: 650, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [big]); // eslint-disable-line react-hooks/exhaustive-deps
  const height = rise.interpolate({ inputRange: [0, 1], outputRange: [12, HEIGHT[place]] });
  const fade = rise.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1] });

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
      {e ? (
        <Animated.View style={{ alignItems: 'center', opacity: fade, width: '100%' }}>
          {big && (
            <Animated.View style={{ marginBottom: 2, transform: [{ translateY: bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] }}>
              <Crown size={28} color={C.volt} weight="fill" />
            </Animated.View>
          )}
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <RankAvatar id={e.userId} name={e.name} url={e.avatarUrl} size={size - 7} />
            <MetalRing place={place} size={size} />
            {/* Você no pódio sem foto: o melhor momento para pedir a foto. */}
            {isUser && !e.avatarUrl && (
              <TouchableOpacity onPress={openPhotoPicker} hitSlop={8}
                style={{ position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: C.volt, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
                <AppText style={{ fontSize: 16, lineHeight: 18, fontWeight: '800', color: C.ink }}>+</AppText>
              </TouchableOpacity>
            )}
            {big && <>
              <Sparkle delay={0} style={{ top: -6, left: -10 }} />
              <Sparkle delay={500} style={{ top: 10, right: -16 }} />
              <Sparkle delay={1000} style={{ bottom: -2, left: -16 }} />
            </>}
          </View>
          <AppText numberOfLines={1} style={{ fontSize: big ? 16 : 14, fontWeight: '800', color: '#FFFFFF', marginTop: 8, maxWidth: '96%' }}>
            {firstName(e.name, `#${place}`)}
          </AppText>
          {isUser && (
            <View style={{ backgroundColor: C.volt, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1, marginTop: 3 }}>
              <AppText style={{ fontSize: 11, fontWeight: '800', color: C.ink }}>{youLabel}</AppText>
            </View>
          )}
          {isUser && !e.avatarUrl && (
            <TouchableOpacity onPress={openPhotoPicker} hitSlop={6}>
              <AppText style={{ fontSize: 11.5, fontWeight: '800', color: C.volt, marginTop: 4, textDecorationLine: 'underline' }}>
                {systemIsPt ? 'Coloque sua foto' : 'Add your photo'}
              </AppText>
            </TouchableOpacity>
          )}
          <AppText style={{ fontSize: 12.5, fontWeight: '800', color: big ? C.volt : 'rgba(255,255,255,0.6)', marginTop: 2, marginBottom: 12 }}>
            {e.xp.toLocaleString()} XP
          </AppText>
        </Animated.View>
      ) : null}
      {/* Coluna: sobe ao abrir, com a medalha no topo. */}
      <Animated.View
        style={{ width: '100%', height, borderTopLeftRadius: 16, borderTopRightRadius: 16, alignItems: 'center',
          backgroundColor: big ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.09)' }}>
        <Animated.View style={{ marginTop: 14, opacity: fade }}>
          <Medal place={place} size={big ? 50 : 42} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export function Podium({ entries, userId, youLabel }: { entries: PodiumEntry[]; userId: string; youLabel: string }) {
  const at = (p: number) => entries.find(e => e.rank === p) ?? entries[p - 1];
  const rises = useMemo(() => [new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)], []);
  const key = entries.map(e => e.userId).join(',');
  useEffect(() => {
    rises.forEach(r => r.setValue(0));
    // Sobe o 3º, depois o 2º, por último o 1º.
    Animated.stagger(140, [rises[2], rises[1], rises[0]].map(r =>
      Animated.spring(r, { toValue: 1, friction: 6, tension: 60, useNativeDriver: false }))).start();
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: C.ink, borderRadius: 28, overflow: 'hidden' }}>
      {/* Holofote volt atrás do líder */}
      <Svg width="100%" height="100%" style={{ position: 'absolute' }} pointerEvents="none">
        <Defs>
          <RadialGradient id="spot" cx="0.5" cy="0.3" r="0.5">
            <Stop offset="0" stopColor={C.volt} stopOpacity="0.28" />
            <Stop offset="1" stopColor={C.volt} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#spot)" />
      </Svg>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 14, paddingTop: 22 }}>
        {([2, 1, 3] as const).map(p => {
          const e = at(p);
          return <Spot key={p} e={e} place={p} isUser={!!e && e.userId === userId} youLabel={youLabel} rise={rises[p - 1]} />;
        })}
      </View>
    </View>
  );
}
