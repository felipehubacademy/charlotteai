// app/(app)/track.tsx — tela de uma trilha extra da Família Queizy (ex.: Manual do F#did@).
// Mesmo cartão e mesma trilha da tela inicial, com o nível = id da trilha (lib/tracks.ts).
import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Gift } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import CharacterAvatar from '@/components/ui/CharacterAvatar';
import { getModule } from '@/lib/curriculum-v2/loader';
import { LEVEL_ACCENT, LEVEL_ACCENT_BG } from '@/lib/levelColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/stats/StatsUI';
import { TrailBanner } from '@/components/trail/TrailBanner';
import { TrailContent } from '@/components/trail/TrailContent';
import { useAuth } from '@/hooks/useAuth';
import { systemIsPt } from '@/lib/systemLang';
import { useTheme } from '@/lib/theme';
import { extraTrack, EXTRA_TRACKS, unitImpression } from '@/lib/tracks';
import { ImpressionTag } from '@/components/trail/ImpressionTag';
import type { TrailLevel } from '@/data/trailTypes';

export default function TrackScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const track = extraTrack(id) ?? EXTRA_TRACKS[0];
  const { profile, isTaster } = useAuth();
  const { colors: T } = useTheme();
  const insets = useSafeAreaInsets();
  const level = track.id as TrailLevel;
  const isPt = systemIsPt;
  const tasteUnit  = getModule(track.id, track.tasteUnit.moduleId)?.units.find(u => u.id === track.tasteUnit.unitId);
  const tasteTitle = tasteUnit?.title;
  const tasteImpression = unitImpression(tasteUnit);
  const accent = LEVEL_ACCENT[track.id];
  const startTaste = () => router.push({
    pathname: '/(app)/learn-session',
    params: { v: 'v2', level, moduleId: track.tasteUnit.moduleId, unitId: track.tasteUnit.unitId, activity: 'grammar' },
  });

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScreenHeader title={systemIsPt ? 'Trilha da Família Queizy' : 'Queizy Family path'} />
      <ScrollView contentContainerStyle={{ paddingTop: 14, paddingBottom: 40 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <View style={{ marginHorizontal: 20, marginBottom: 24, borderRadius: 22, backgroundColor: T.card, overflow: 'hidden' }}>
          <TrailBanner userId={profile?.id} level={level} flush />
        </View>
        {/* Degustação: a unidade grátis em destaque, para começar direto por ela. */}
        {isTaster && tasteTitle ? (
          <View style={{ marginHorizontal: 20, marginTop: -8, marginBottom: 24, borderRadius: 20, padding: 16, backgroundColor: LEVEL_ACCENT_BG[track.id], borderWidth: 1, borderColor: accent + '33' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <CharacterAvatar character={track.character} size="lg" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Gift size={14} color={accent} weight="bold" />
                  <AppText style={{ fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: accent }}>
                    {isPt ? 'SEU TÓPICO GRÁTIS' : 'YOUR FREE TOPIC'}
                  </AppText>
                </View>
                <AppText style={{ fontSize: 16, fontWeight: '800', color: T.textPrimary, marginTop: 3 }}>{tasteTitle}</AppText>
                {tasteImpression ? (
                  <ImpressionTag character={track.character} impression={tasteImpression} isPt={isPt} color={accent} bg="#FFFFFF" />
                ) : null}
              </View>
            </View>
            <TouchableOpacity activeOpacity={0.85} onPress={startTaste} accessibilityRole="button"
              style={{ marginTop: 14, borderRadius: 14, paddingVertical: 13, alignItems: 'center', backgroundColor: '#16131F' }}>
              <AppText style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>{isPt ? 'Começar agora' : 'Start now'}</AppText>
            </TouchableOpacity>
          </View>
        ) : null}
        <TrailContent userId={profile?.id} level={level} showBanner={false} />
      </ScrollView>
    </View>
  );
}
