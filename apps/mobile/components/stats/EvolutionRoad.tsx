// EvolutionRoad — "Estrada da evolução": as últimas semanas como paradas num
// caminho sinuoso (a onda da marca). Cada parada cresce com a prática da
// semana; a Charlotte fica na semana atual; a melhor semana ganha uma estrela;
// a bandeira à frente é a próxima semana. Tocar numa parada mostra os números.

import React, { useMemo, useState } from 'react';
import { View, Pressable, Image } from 'react-native';
import Svg, { Path, Circle, Polygon, Line } from 'react-native-svg';
import { Star } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { C } from '@/components/stats/StatsUI';

export interface RoadWeek { start: string; practices: number; trailAccuracy: number | null; pronunciation: number | null }

const H = 210;
const PAD_X = 26;
const AMP = 46;
const GOAL = 10; // práticas na semana para a parada ficar verde

function plural(n: number, one: string, many: string) { return `${n} ${n === 1 ? one : many}`; }

export function EvolutionRoad({ weeks, isPt }: { weeks: RoadWeek[]; isPt: boolean }) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number>(weeks.length - 1);

  const pts = useMemo(() => {
    if (!width) return [];
    const n = weeks.length + 1; // + bandeira da próxima semana
    const step = (width - PAD_X * 2) / (n - 1);
    return Array.from({ length: n }, (_, i) => ({ x: PAD_X + i * step, y: H / 2 + (i % 2 === 0 ? AMP : -AMP) * 0.85 }));
  }, [width, weeks.length]);

  const path = useMemo(() => {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const mx = (a.x + b.x) / 2;
      d += ` C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
    }
    return d;
  }, [pts]);

  const best = weeks.reduce((bi, w, i) => (w.practices > (weeks[bi]?.practices ?? -1) ? i : bi), 0);
  const maxP = Math.max(1, ...weeks.map(w => w.practices));
  const current = weeks.length - 1;
  const sel = weeks[selected];
  const fmt = (iso: string) => { const [, m, d] = iso.split('-'); return `${d}/${m}`; };

  return (
    <View>
      <View style={{ height: H }} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={H}>
            {/* estrada: base larga clara + faixa tracejada no meio */}
            <Path d={path} stroke="rgba(22,19,31,0.08)" strokeWidth={22} fill="none" strokeLinecap="round" />
            <Path d={path} stroke="rgba(22,19,31,0.22)" strokeWidth={2.5} fill="none" strokeDasharray="6 8" strokeLinecap="round" />
            {/* bandeira da próxima semana */}
            {pts.length > 0 && (() => {
              const f = pts[pts.length - 1];
              return (
                <>
                  <Line x1={f.x} y1={f.y + 12} x2={f.x} y2={f.y - 26} stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
                  <Polygon points={`${f.x},${f.y - 26} ${f.x + 20},${f.y - 19} ${f.x},${f.y - 12}`} fill={C.pink} />
                </>
              );
            })()}
            {/* paradas */}
            {weeks.map((w, i) => {
              const p = pts[i];
              if (!p) return null;
              const r = w.practices ? 11 + (w.practices / maxP) * 9 : 9;
              const fill = w.practices >= GOAL ? C.greenBright : w.practices > 0 ? C.volt : '#E4E1DA';
              return (
                <Circle key={w.start} cx={p.x} cy={p.y} r={r} fill={fill}
                  stroke={i === selected ? C.ink : '#FFFFFF'} strokeWidth={i === selected ? 3 : 2.5} />
              );
            })}
          </Svg>
        )}

        {/* camadas tocáveis, estrela da melhor semana e a Charlotte na semana atual */}
        {weeks.map((w, i) => {
          const p = pts[i];
          if (!p) return null;
          return (
            <Pressable key={w.start} onPress={() => setSelected(i)} hitSlop={8}
              style={{ position: 'absolute', left: p.x - 22, top: p.y - 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              {w.practices > 0 && (
                <AppText style={{ fontSize: 11, fontWeight: '800', color: C.ink }}>{w.practices}</AppText>
              )}
            </Pressable>
          );
        })}
        {pts[best] && weeks[best]?.practices > 0 && best !== current && (
          <View pointerEvents="none" style={{ position: 'absolute', left: pts[best].x - 10, top: pts[best].y + (pts[best].y > H / 2 ? 18 : -42) }}>
            <Star size={20} color={C.ink} weight="fill" />
          </View>
        )}
        {pts[current] && (
          <View pointerEvents="none" style={{
            position: 'absolute', left: pts[current].x - 19, top: pts[current].y + (pts[current].y > H / 2 ? -62 : 22),
            width: 38, height: 38, borderRadius: 19, borderWidth: 3, borderColor: C.volt, overflow: 'hidden', backgroundColor: C.ink,
          }}>
            <Image source={require('@/assets/charlotte-avatar.png')} style={{ width: 32, height: 32 }} />
          </View>
        )}
      </View>

      {/* detalhe da parada escolhida */}
      {sel && (
        <View style={{ marginTop: 6, backgroundColor: C.bg, borderRadius: 14, padding: 12 }}>
          <AppText style={{ fontSize: 13, fontWeight: '800', color: C.ink }}>
            {selected === current ? (isPt ? 'Esta semana' : 'This week') : (isPt ? `Semana de ${fmt(sel.start)}` : `Week of ${fmt(sel.start)}`)}
            {selected === best && sel.practices > 0 ? (isPt ? ' · sua melhor semana' : ' · your best week') : ''}
          </AppText>
          <AppText style={{ fontSize: 12.5, color: C.mid, marginTop: 3 }}>
            {[
              isPt ? plural(sel.practices, 'prática', 'práticas') : plural(sel.practices, 'practice', 'practices'),
              sel.trailAccuracy != null ? (isPt ? `${sel.trailAccuracy}% de acerto na trilha` : `${sel.trailAccuracy}% correct on the trail`) : null,
              sel.pronunciation != null ? (isPt ? `nota ${sel.pronunciation} na pronúncia` : `pronunciation score ${sel.pronunciation}`) : null,
            ].filter(Boolean).join(' · ')}
          </AppText>
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
        {[
          { c: '#E4E1DA', l: isPt ? 'parado' : 'no study' },
          { c: C.volt, l: isPt ? 'estudou' : 'studied' },
          { c: C.greenBright, l: isPt ? `${GOAL}+ práticas` : `${GOAL}+ practices` },
        ].map(k => (
          <View key={k.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: k.c }} />
            <AppText style={{ fontSize: 11.5, color: C.light }}>{k.l}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}
