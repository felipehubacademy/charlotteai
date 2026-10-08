// Conquistas — catálogo completo do nível: as conquistadas primeiro, depois
// as que faltam. Toque em qualquer medalha para ver como ganhar.

import React, { useEffect, useState } from 'react';
import { useShareCard } from '@/components/share/ShareCardProvider';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/Text';
import { QueizyWave } from '@/components/ui/QueizyWave';
import { C, ScreenHeader, SectionTitle, BadgeMedal, BadgeModal, badgeTitle } from '@/components/stats/StatsUI';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { systemIsPt } from '@/lib/systemLang';
import { getBadgesForLevel, CatalogEntry } from '@/lib/achievementsCatalog';

const isPt = systemIsPt;

export default function AchievementsScreen() {
  const openShare = useShareCard();
  const params = useLocalSearchParams<{ userId: string; userLevel: string }>();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const userId    = params.userId || profile?.id || '';
  const userLevel = params.userLevel || profile?.charlotte_level || 'Inter';
  const catalog   = getBadgesForLevel(userLevel);

  const [earnedAt, setEarnedAt] = useState<Record<string, Date>>({});
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<CatalogEntry | null>(null);

  useEffect(() => {
    if (!userId) return;
    supabase.from('user_achievements')
      .select('achievement_type,earned_at')
      .eq('user_id', userId)
      .then(({ data }) => {
        const map: Record<string, Date> = {};
        (data ?? []).forEach((a: any) => { if (a.achievement_type) map[a.achievement_type] = new Date(a.earned_at); });
        setEarnedAt(map);
        setLoading(false);
      }, () => setLoading(false));
  }, [userId]);

  const earned = catalog
    .filter(c => earnedAt[c.code])
    .sort((a, b) => earnedAt[b.code].getTime() - earnedAt[a.code].getTime());
  const locked = catalog.filter(c => !earnedAt[c.code]);
  const xpEarned = earned.reduce((s, c) => s + c.xpReward, 0);

  const grid = (items: CatalogEntry[], isEarned: boolean) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, rowGap: 22 }}>
      {items.map(c => (
        <View key={c.code} style={{ width: '25%', alignItems: 'center' }}>
          <BadgeMedal
            category={c.category}
            rarity={c.rarity}
            earned={isEarned}
            label={badgeTitle(c, c.title, isPt)}
            xp={c.xpReward}
            size={54}
            onPress={() => setModal(c)}
          />
        </View>
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader title={isPt ? 'Conquistas' : 'Achievements'} />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.ink} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
          <View style={{ marginHorizontal: 16, backgroundColor: C.ink, borderRadius: 24, padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText style={{ fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase' }}>
                {isPt ? 'Sua estante' : 'Your shelf'}
              </AppText>
              <View style={{ backgroundColor: C.volt, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                <AppText style={{ fontSize: 12, fontWeight: '800', color: C.ink }}>{userLevel}</AppText>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 4 }}>
              <AppText display style={{ fontSize: 46, fontWeight: '800', color: '#FFFFFF', lineHeight: 50 }}>
                {earned.length}
              </AppText>
              <AppText style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
                {isPt ? `de ${catalog.length} conquistas` : `of ${catalog.length} achievements`}
                {xpEarned > 0 ? ` · +${xpEarned} XP` : ''}
              </AppText>
            </View>
            <View style={{ marginTop: 12 }}>
              <QueizyWave progress={catalog.length > 0 ? earned.length / catalog.length : 0} height={14} strokeWidth={4} doneColor="#2BD97C" />
            </View>
          </View>

          {earned.length > 0 && (
            <>
              <SectionTitle title={isPt ? 'Conquistadas' : 'Earned'} meta={String(earned.length)} />
              {grid(earned, true)}
            </>
          )}

          {locked.length > 0 && (
            <>
              <SectionTitle title={isPt ? 'Para conquistar' : 'Still to earn'} meta={String(locked.length)} />
              {grid(locked, false)}
            </>
          )}

          <AppText style={{ fontSize: 12, color: C.light, textAlign: 'center', marginTop: 28, paddingHorizontal: 24 }}>
            {isPt ? 'Toque em uma conquista para ver como ganhar.' : 'Tap an achievement to see how to earn it.'}
          </AppText>
        </ScrollView>
      )}

      {modal && (
        <BadgeModal cat={modal} earnedAt={earnedAt[modal.code]} isPt={isPt} onClose={() => setModal(null)}
          onShare={title => { setModal(null); setTimeout(() => openShare({ kind: 'achievement', big: title, title: isPt ? 'Conquista desbloqueada' : 'Achievement unlocked' }), 400); }} />
      )}
    </View>
  );
}
