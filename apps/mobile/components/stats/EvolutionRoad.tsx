// EvolutionRoad — "Estrada da evolução": as últimas semanas como paradas numa
// estrada em S. O trecho já percorrido fica pintado e o trecho até a bandeira
// (próxima semana) fica tracejado. Paradas são medalhas com a data embaixo; a
// foto do aluno fica ao lado da semana atual com "Você está aqui". Ao abrir, a
// estrada se desenha e o aluno chega. Tocar numa parada mostra os números.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, Image, Animated, Easing } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Check, Flag } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { C } from '@/components/stats/StatsUI';
import { useAuth } from '@/hooks/useAuth';

export interface RoadWeek { start: string; practices: number; trailAccuracy: number | null; pronunciation: number | null }

const AnimatedPath = Animated.createAnimatedComponent(Path);

const H = 250;
const PAD_X = 30;
const AMP = 58;
const GOAL = 10;      // práticas na semana para bater a meta
const R = 17;         // raio das medalhas
const SAMPLES = 90;

function plural(n: number, one: string, many: string) { return `${n} ${n === 1 ? one : many}`; }
const fmt = (iso: string) => { const [, m, d] = iso.split('-'); return `${d}/${m}`; };

/** Ponto da curva em S (1,25 onda) para t de 0 a 1. */
function curve(t: number, width: number) {
  return {
    x: PAD_X + t * (width - PAD_X * 2),
    y: H / 2 - 6 + AMP * Math.sin(t * Math.PI * 2.5),
  };
}

function buildPath(t0: number, t1: number, width: number) {
  const n = Math.max(2, Math.round(SAMPLES * (t1 - t0)));
  let d = '';
  let len = 0;
  let prev: { x: number; y: number } | null = null;
  for (let i = 0; i <= n; i++) {
    const p = curve(t0 + ((t1 - t0) * i) / n, width);
    d += `${i ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
    if (prev) len += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return { d, len };
}

export function EvolutionRoad({ weeks, isPt }: { weeks: RoadWeek[]; isPt: boolean }) {
  const { profile } = useAuth();
  const avatarUrl = profile?.avatar_url ?? null;
  const initial = (profile?.name ?? '?').trim().charAt(0).toUpperCase();
  const [width, setWidth] = useState(0);
  const current = weeks.length - 1;
  const [selected, setSelected] = useState<number>(current);
  const draw = useRef(new Animated.Value(0)).current;
  const arrive = useRef(new Animated.Value(0)).current;

  const n = weeks.length + 1; // + bandeira
  const tOf = (i: number) => i / (n - 1);
  const stops = useMemo(() => (width ? Array.from({ length: n }, (_, i) => curve(tOf(i), width)) : []), [width, n]); // eslint-disable-line react-hooks/exhaustive-deps
  const base = useMemo(() => (width ? buildPath(0, 1, width) : null), [width]);
  const done = useMemo(() => (width ? buildPath(0, tOf(current), width) : null), [width, current]); // eslint-disable-line react-hooks/exhaustive-deps
  const ahead = useMemo(() => (width ? buildPath(tOf(current), 1, width) : null), [width, current]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!width) return;
    draw.setValue(0); arrive.setValue(0);
    Animated.sequence([
      Animated.timing(draw, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.spring(arrive, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
    ]).start();
  }, [width, draw, arrive]);

  const best = weeks.reduce((bi, w, i) => (w.practices > (weeks[bi]?.practices ?? -1) ? i : bi), 0);
  const sel = weeks[selected];
  const doneLen = done?.len ?? 0;
  const dashOffset = draw.interpolate({ inputRange: [0, 1], outputRange: [doneLen, 0] });

  const cur = stops[current];
  const flag = stops[n - 1];
  // O avatar do aluno fica do lado em que a estrada não passa: se a parada atual está
  // na metade de baixo, ela vai embaixo (o trecho anterior vem de cima).
  const charlotteAbove = cur ? cur.y < H / 2 - 6 : true;

  return (
    <View>
      <View style={{ height: H }} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && base && done && ahead && (
          <Svg width={width} height={H}>
            <Defs>
              <LinearGradient id="roadDone" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={C.volt} />
                <Stop offset="1" stopColor={C.greenBright} />
              </LinearGradient>
            </Defs>
            {/* leito da estrada */}
            <Path d={base.d} stroke="rgba(22,19,31,0.07)" strokeWidth={26} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {/* trecho à frente, tracejado */}
            <Path d={ahead.d} stroke="rgba(22,19,31,0.25)" strokeWidth={3} fill="none" strokeDasharray="2 9" strokeLinecap="round" />
            {/* trecho percorrido, pintado e animado */}
            <AnimatedPath d={done.d} stroke="url(#roadDone)" strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={`${doneLen} ${doneLen}`} strokeDashoffset={dashOffset} />
            {/* medalhas */}
            {weeks.map((w, i) => {
              const p = stops[i];
              const fill = w.practices >= GOAL ? C.greenBright : w.practices > 0 ? C.volt : '#EEEBE4';
              return (
                <Circle key={w.start} cx={p.x} cy={p.y} r={R} fill={fill}
                  stroke={i === selected ? C.ink : '#FFFFFF'} strokeWidth={i === selected ? 3 : 3} />
              );
            })}
          </Svg>
        )}

        {/* números, vistos, datas e área de toque */}
        {weeks.map((w, i) => {
          const p = stops[i];
          if (!p) return null;
          const labelBelow = p.y >= H / 2 - 6;
          return (
            <React.Fragment key={w.start}>
              <Pressable onPress={() => setSelected(i)} hitSlop={6}
                style={{ position: 'absolute', left: p.x - R, top: p.y - R, width: R * 2, height: R * 2, alignItems: 'center', justifyContent: 'center' }}>
                <AppText style={{ fontSize: 12, fontWeight: '800', color: w.practices ? C.ink : C.light }}>{w.practices || '·'}</AppText>
              </Pressable>
              {w.practices >= GOAL && (
                <View pointerEvents="none" style={{ position: 'absolute', left: p.x + R - 9, top: p.y - R - 3, width: 16, height: 16, borderRadius: 8, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={10} color={C.volt} weight="bold" />
                </View>
              )}
              <AppText pointerEvents="none" style={{
                position: 'absolute', width: 44, left: p.x - 22, top: labelBelow ? p.y + R + 4 : p.y - R - 19,
                textAlign: 'center', fontSize: 10.5, fontWeight: i === selected ? '800' : '600', color: i === selected ? C.ink : C.light,
              }}>
                {i === current ? (isPt ? 'hoje' : 'now') : fmt(w.start)}
              </AppText>
            </React.Fragment>
          );
        })}

        {/* bandeira com a próxima meta */}
        {flag && (
          <View pointerEvents="none" style={{ position: 'absolute', left: flag.x - 13, top: flag.y - 30, alignItems: 'center' }}>
            <Flag size={28} color={C.pink} weight="fill" />
          </View>
        )}
        {/* próxima meta, no canto livre */}
        <View pointerEvents="none" style={{ position: 'absolute', right: 0, top: 4, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,79,139,0.10)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Flag size={12} color={C.pink} weight="fill" />
          <AppText style={{ fontSize: 11, fontWeight: '800', color: '#D12A64' }}>
            {isPt ? `Próxima: ${GOAL} práticas` : `Next: ${GOAL} practices`}
          </AppText>
        </View>

        {/* o aluno chega na semana atual */}
        {cur && (
          <Animated.View pointerEvents="none" style={{
            position: 'absolute', left: cur.x - 74, top: charlotteAbove ? cur.y - R - 54 : cur.y + R + 22,
            flexDirection: 'row', alignItems: 'center', gap: 6,
            opacity: arrive, transform: [{ scale: arrive.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          }}>
            <View style={{ backgroundColor: C.ink, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
              <AppText style={{ fontSize: 10.5, fontWeight: '800', color: C.volt }}>{isPt ? 'Você está aqui' : "You're here"}</AppText>
            </View>
            <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 2.5, borderColor: C.volt, overflow: 'hidden', backgroundColor: C.ink }}>
              {avatarUrl
                ? <Image source={{ uri: avatarUrl }} style={{ width: 29, height: 29 }} />
                : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><AppText style={{ fontSize: 14, fontWeight: '800', color: C.volt }}>{initial}</AppText></View>}
            </View>
          </Animated.View>
        )}
      </View>

      {/* detalhe da parada escolhida */}
      {sel && (
        <View style={{ marginTop: 4, backgroundColor: C.bg, borderRadius: 14, padding: 12 }}>
          <AppText style={{ fontSize: 13, fontWeight: '800', color: C.ink }}>
            {selected === current ? (isPt ? 'Esta semana' : 'This week') : (isPt ? `Semana de ${fmt(sel.start)}` : `Week of ${fmt(sel.start)}`)}
            {selected === best && sel.practices > 0 ? (isPt ? ' · sua melhor semana' : ' · your best week') : ''}
          </AppText>
          <AppText style={{ fontSize: 12.5, color: C.mid, marginTop: 3 }}>
            {sel.practices === 0
              ? (isPt ? 'Semana sem prática. Bora retomar?' : 'No practice this week. Ready to get back to it?')
              : [
                  isPt ? plural(sel.practices, 'prática', 'práticas') : plural(sel.practices, 'practice', 'practices'),
                  sel.trailAccuracy != null ? (isPt ? `${sel.trailAccuracy}% de acerto na trilha` : `${sel.trailAccuracy}% correct on the trail`) : null,
                  sel.pronunciation != null ? (isPt ? `nota ${sel.pronunciation} na pronúncia` : `pronunciation score ${sel.pronunciation}`) : null,
                ].filter(Boolean).join(' · ')}
          </AppText>
        </View>
      )}
    </View>
  );
}
