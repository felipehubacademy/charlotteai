// components/ui/HeaderPills.tsx
// Header com pills de streak / XP / rank + trial badge opcional.
// Usado por HomeTab e PracticeTab no novo layout (beta_features 'new_layout').

import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Fire, Lightning, Trophy } from 'phosphor-react-native';
import { AppText } from './Text';

const C = {
  card:      '#FFFFFF',
  navyLight: '#9896B8',
  navyGhost: 'rgba(22,21,58,0.06)',
  orange:    '#FF6B35',
  greenDark: '#3D8800',
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
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: streak ? 'rgba(251,146,60,0.12)' : 'rgba(22,21,58,0.05)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Fire size={15} color={streak ? C.orange : C.navyLight} weight="fill" />
            <AppText style={{ fontSize: 13, fontWeight: '800', color: streak ? C.orange : C.navyLight }}>{streak}</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: totalXP > 0 ? 'rgba(61,136,0,0.10)' : 'rgba(22,21,58,0.05)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Lightning size={15} color={totalXP > 0 ? C.greenDark : C.navyLight} weight="fill" />
            <AppText style={{ fontSize: 13, fontWeight: '800', color: totalXP > 0 ? C.greenDark : C.navyLight }}>{totalXP.toLocaleString()}</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: rank ? 'rgba(234,179,8,0.12)' : 'rgba(22,21,58,0.05)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Trophy size={15} color={rank ? C.gold : C.navyLight} weight="fill" />
            <AppText style={{ fontSize: 13, fontWeight: '800', color: rank ? C.gold : C.navyLight }}>{rank ? `#${rank}` : '—'}</AppText>
          </View>
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        {trialDaysLeft !== null && trialDaysLeft !== undefined && onPaywallOpen && (
          <TouchableOpacity
            onPress={onPaywallOpen} activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(61,136,0,0.10)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, marginRight: 10, borderWidth: 1, borderColor: 'rgba(61,136,0,0.20)' }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.greenDark }} />
            <AppText style={{ fontSize: 12, fontWeight: '700', color: C.greenDark }}>
              {isPt ? `${trialDaysLeft}d grátis` : `${trialDaysLeft}d trial`}
            </AppText>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
