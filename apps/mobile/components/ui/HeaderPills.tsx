// components/ui/HeaderPills.tsx
// Header com pills de streak / XP / rank + trial badge opcional.
// Usado por HomeTab e PracticeTab no novo layout (beta_features 'new_layout').

import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Fire, Lightning, Trophy } from 'phosphor-react-native';
import { AppText } from './Text';
import { HeaderLogo } from './HeaderLogo';

const C = {
  card:      '#FFFFFF',
  navyLight: '#8A8494',
  navyGhost: 'rgba(22,19,31,0.06)',
  orange:    '#FF6B35',
  greenDark: '#08804A',
  gold:      '#F59E0B',
};

interface HeaderPillsProps {
  streak:         number;
  totalXP:        number;
  rank:           number | null;
  statsParams:    Record<string, string>;
  trialDaysLeft?: number | null;
  onPaywallOpen?: () => void;
  isPt:           boolean;
}

export function HeaderPills({
  streak, totalXP, rank, statsParams, trialDaysLeft, onPaywallOpen, isPt,
}: HeaderPillsProps) {
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: C.card }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, height: 52,
        backgroundColor: C.card,
        borderBottomWidth: 1, borderBottomColor: C.navyGhost,
      }}>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/(app)/stats', params: statsParams })}
          activeOpacity={0.7}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}
          hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: streak ? 'rgba(251,146,60,0.12)' : 'rgba(22,19,31,0.05)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 5 }}>
            <Fire size={15} color={streak ? C.orange : C.navyLight} weight="fill" />
            <AppText style={{ fontSize: 13, fontWeight: '800', color: streak ? C.orange : C.navyLight }}>{streak}</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: totalXP > 0 ? 'rgba(8,128,74,0.10)' : 'rgba(22,19,31,0.05)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 5 }}>
            <Lightning size={15} color={totalXP > 0 ? C.greenDark : C.navyLight} weight="fill" />
            <AppText style={{ fontSize: 13, fontWeight: '800', color: totalXP > 0 ? C.greenDark : C.navyLight }}>{totalXP.toLocaleString()}</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: rank ? 'rgba(234,179,8,0.12)' : 'rgba(22,19,31,0.05)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 5 }}>
            <Trophy size={15} color={rank ? C.gold : C.navyLight} weight="fill" />
            <AppText style={{ fontSize: 13, fontWeight: '800', color: rank ? C.gold : C.navyLight }}>{rank ? `#${rank}` : '—'}</AppText>
          </View>
        </TouchableOpacity>

        <View style={{ flex: 1, minWidth: 6 }} />

        {trialDaysLeft !== null && trialDaysLeft !== undefined && onPaywallOpen && (
          <TouchableOpacity
            onPress={onPaywallOpen} activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ flexShrink: 0, backgroundColor: 'rgba(8,128,74,0.10)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 5, marginRight: 8, borderWidth: 1, borderColor: 'rgba(8,128,74,0.20)' }}
          >
            <AppText numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: C.greenDark }}>
              {isPt ? `${trialDaysLeft}d grátis` : `${trialDaysLeft}d trial`}
            </AppText>
          </TouchableOpacity>
        )}
        <View style={{ flexShrink: 0 }}><HeaderLogo /></View>
      </View>
    </SafeAreaView>
  );
}
