// components/trail/TrailBanner.tsx
// Card-resumo do módulo: level icon + nome + N módulos · M tópicos + % + barra
// + "X de Y concluídos". Usado no hero da Home (fixo) e legacy LearnTrailScreen.
// TrailContent pode ocultar via showBanner={false} pra não duplicar.

import React, { useCallback } from 'react';
import { View, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { BookOpen } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { CURRICULUM, TrailLevel } from '@/data/curriculum';
import { useLearnProgress } from '@/hooks/useLearnProgress';
import { LevelDropdown } from './LevelDropdown';
import type { Level } from '@/lib/curriculum-v2/types';

function a(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const C = {
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyLight: '#9896B8',
  ghost:     'rgba(22,21,58,0.06)',
  border:    'rgba(22,21,58,0.10)',
};

const shadow = Platform.select({
  ios:     { shadowColor: 'rgba(22,21,58,0.10)', shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } },
  android: {},
});

const LEVEL_LABELS: Record<TrailLevel, string> = {
  Novice:   'Novice — A1/A2',
  Inter:    'Intermediate — B1/B2',
  Advanced: 'Advanced — C1/C2',
};

const LEVEL_COLOR: Record<TrailLevel, string> = {
  Novice:   '#D97706',
  Inter:    '#7C3AED',
  Advanced: '#0F766E',
};

interface TrailBannerProps {
  userId: string | undefined;
  level:  TrailLevel;
  /** Sem padding/margin externos (default false). Use quando o banner já vive
   *  dentro de outro card (hero da Home). */
  flush?: boolean;
  /** Nivel "max" liberado pelo perfil — controla cadeado no dropdown.
   *  Default = level (sem dropdown lock). */
  currentLevel?: TrailLevel;
  /** Callback ao trocar de nivel via dropdown. Se ausente, dropdown nao aparece. */
  onLevelChange?: (level: TrailLevel) => void;
}

export function TrailBanner({ userId, level, flush = false, currentLevel, onLevelChange }: TrailBannerProps) {
  const isPortuguese = level === 'Novice';
  const accent       = LEVEL_COLOR[level];
  const modules      = CURRICULUM[level];

  const { progress, refetch } = useLearnProgress(userId, level);

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  // Count modules completed (all topics done) — banner serves as level summary
  const completedSet = progress?.completed ?? [];
  const completed = modules.reduce((n, mod, mIdx) => {
    const allDone = mod.topics.every((_, tIdx) =>
      completedSet.some(k => k.m === mIdx && k.t === tIdx));
    return allDone ? n + 1 : n;
  }, 0);
  const total     = modules.length;
  const pct       = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  const wrapperStyle = flush
    ? { padding: 20 }
    : {
        backgroundColor: C.card,
        borderRadius:    20,
        padding:         20,
        marginHorizontal: 20,
        marginBottom:    24,
        borderWidth:     1,
        borderColor:     C.border,
        ...shadow,
      };

  return (
    <View style={wrapperStyle}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <View style={{
          width: 40, height: 40, borderRadius: 12,
          backgroundColor: a(accent, 0.094),
          alignItems: 'center', justifyContent: 'center',
        }}>
          <BookOpen size={22} color={accent} weight="fill" />
        </View>
        <View style={{ flex: 1 }}>
          <AppText style={{ fontSize: 13, fontWeight: '800', color: C.navy }}>
            {LEVEL_LABELS[level]}
          </AppText>
          <AppText style={{ fontSize: 12, color: C.navyLight, fontWeight: '500' }}>
            {total} {isPortuguese ? 'módulos' : 'modules'}
          </AppText>
        </View>
        {onLevelChange ? (
          <LevelDropdown
            selectedLevel={level as Level}
            currentLevel={(currentLevel ?? level) as Level}
            onSelect={(l) => onLevelChange(l as TrailLevel)}
          />
        ) : (
          <AppText style={{ fontSize: 18, fontWeight: '900', color: accent }}>{pct}%</AppText>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, height: 6, backgroundColor: C.ghost, borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ height: 6, width: `${pct}%` as `${number}%`, backgroundColor: accent, borderRadius: 3 }} />
        </View>
        {onLevelChange && (
          <AppText style={{ fontSize: 13, fontWeight: '800', color: accent, minWidth: 36, textAlign: 'right' }}>
            {pct}%
          </AppText>
        )}
      </View>
      <AppText style={{ fontSize: 11, color: C.navyLight, fontWeight: '600', marginTop: 6 }}>
        {completed} {isPortuguese ? 'de' : 'of'} {total} {isPortuguese ? 'módulos concluídos' : 'modules completed'}
      </AppText>
    </View>
  );
}
