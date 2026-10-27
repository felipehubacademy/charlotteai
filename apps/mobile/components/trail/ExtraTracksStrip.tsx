// components/trail/ExtraTracksStrip.tsx — faixa "Trilhas da Família Queizy" na tela inicial.
// Um cartão por trilha extra (lib/tracks.ts): avatar, nome, com quem é e o progresso.
// Com uma trilha só, o cartão ocupa a largura toda; com mais, a faixa desliza para o lado.
import React, { useCallback, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { CaretRight, Gift, X } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import CharacterAvatar from '@/components/ui/CharacterAvatar';
import { useAuth } from '@/hooks/useAuth';
import { useLearnProgressV2 } from '@/hooks/useLearnProgressV2';
import { listModules } from '@/lib/curriculum-v2/loader';
import { LEVEL_ACCENT, LEVEL_VIVID, LEVEL_ACCENT_BG } from '@/lib/levelColors';
import { systemIsPt } from '@/lib/systemLang';
import { useTheme } from '@/lib/theme';
import { visibleTracks, type ExtraTrack } from '@/lib/tracks';
import { CHARACTER_LIST, characterInfo } from '@/lib/characters';
import { shouldShowFamilyInvite, dismissFamilyInvite } from '@/lib/familyInvite';

const shadow = Platform.select({
  ios:     { shadowColor: 'rgba(22,19,31,0.08)', shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 2 },
});

function TrackCard({ track, width }: { track: ExtraTrack; width: number }) {
  const { profile, isTaster } = useAuth();
  const { colors: T } = useTheme();
  const isPt = systemIsPt;
  const { isUnitComplete } = useLearnProgressV2(profile?.id, track.id);
  const units = listModules(track.id).flatMap(m => m.units.map(u => ({ moduleId: m.id, unitId: u.id })));
  const done = units.filter(u => isUnitComplete(u.moduleId, u.unitId)).length;
  const pct = units.length ? Math.round((done / units.length) * 100) : 0;
  const accent = LEVEL_ACCENT[track.id];

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: '/(app)/track' as any, params: { id: track.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${isPt ? track.titlePt : track.titleEn}, ${isPt ? track.hostPt : track.hostEn}`}
      style={{ width, borderRadius: 18, backgroundColor: T.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...shadow }}
    >
      <View style={{ padding: 2, borderRadius: 28, borderWidth: 2, borderColor: LEVEL_VIVID[track.id] }}>
        <CharacterAvatar character={track.character} size="lg" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText numberOfLines={1} style={{ fontSize: 16, fontWeight: '800', color: T.textPrimary }}>
          {isPt ? track.titlePt : track.titleEn}
        </AppText>
        <AppText numberOfLines={1} style={{ fontSize: 13, color: T.textSecondary, marginTop: 1 }}>
          {isPt ? track.hostPt : track.hostEn}
        </AppText>
        {isTaster ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7, alignSelf: 'flex-start', backgroundColor: LEVEL_ACCENT_BG[track.id], borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Gift size={13} color={accent} weight="bold" />
            <AppText style={{ fontSize: 12, fontWeight: '700', color: accent }}>
              {isPt ? '1 tópico grátis por dia' : '1 free topic a day'}
            </AppText>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: LEVEL_ACCENT_BG[track.id], overflow: 'hidden' }}>
              <View style={{ width: `${Math.max(pct, 3)}%`, height: 6, borderRadius: 3, backgroundColor: LEVEL_VIVID[track.id] }} />
            </View>
            <AppText style={{ fontSize: 12, fontWeight: '700', color: accent }}>{pct}%</AppText>
          </View>
        )}
      </View>
      <CaretRight size={18} color={T.textMuted} weight="bold" />
    </TouchableOpacity>
  );
}

export function ExtraTracksStrip({ onLayoutHeight }: { onLayoutHeight?: (h: number) => void }) {
  const { profile } = useAuth();
  const { colors: T } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const tracks = visibleTracks(profile?.beta_features);
  if (!tracks.length) return null;
  const single = tracks.length === 1;
  const cardW = single ? screenW - 40 : Math.min(300, screenW - 72);

  return (
    <View style={{ marginBottom: 22 }} onLayout={e => onLayoutHeight?.(e.nativeEvent.layout.height + 22)}>
      <AppText style={{ marginHorizontal: 20, marginBottom: 10, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, color: T.textMuted }}>
        {systemIsPt ? 'TRILHAS DA FAMÍLIA QUEIZY' : 'QUEIZY FAMILY PATHS'}
      </AppText>
      <ScrollView
        horizontal
        scrollEnabled={!single}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 6, gap: 12 }}
      >
        {tracks.map(t => <TrackCard key={t.id} track={t} width={cardW} />)}
      </ScrollView>
    </View>
  );
}

/**
 * Versão em linha, dentro do cartão da trilha da tela inicial (sempre visível: a tela inicial rola sozinha
 * até o tópico ativo, então uma faixa acima da trilha ficaria escondida para quem está no meio).
 * Mostra só a trilha de quem o aluno escolheu na Família (quem fala na tela inicial): com várias
 * trilhas de influenciadores, a tela inicial não vira uma lista. As outras ficam na tela Família.
 * Com a Charlotte na tela inicial, aparece no lugar o convite para conhecer a Família (FamilyInviteRow).
 */
export function ExtraTracksRow() {
  const { profile, isTaster } = useAuth();
  const { colors: T } = useTheme();
  const active = characterInfo(profile?.active_character).id;
  const tracks = visibleTracks(profile?.beta_features).filter(t => t.character === active);
  if (!tracks.length) return active === 'charlotte' ? <FamilyInviteRow /> : null;
  const isPt = systemIsPt;
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: T.border, paddingHorizontal: 20, paddingVertical: 10, gap: 8 }}>
      {tracks.map(t => (
        <TouchableOpacity
          key={t.id}
          activeOpacity={0.7}
          onPress={() => router.push({ pathname: '/(app)/track' as any, params: { id: t.id } })}
          accessibilityRole="button"
          accessibilityLabel={`${isPt ? t.titlePt : t.titleEn}, ${isPt ? t.hostPt : t.hostEn}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}
        >
          <View style={{ padding: 1.5, borderRadius: 20, borderWidth: 1.5, borderColor: LEVEL_VIVID[t.id] }}>
            <CharacterAvatar character={t.character} size="sm" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText numberOfLines={1} style={{ fontSize: 14, fontWeight: '800', color: T.textPrimary }}>
              {isPt ? t.titlePt : t.titleEn}
            </AppText>
            <AppText numberOfLines={1} style={{ fontSize: 12, color: T.textSecondary }}>
              {/* Curto para caber ao lado do selo em telas estreitas (Android): só com quem é. */}
              {isPt ? t.hostPt : t.hostEn}
            </AppText>
          </View>
          {isTaster ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: LEVEL_ACCENT_BG[t.id], borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Gift size={12} color={LEVEL_ACCENT[t.id]} weight="bold" />
              <AppText style={{ fontSize: 11, fontWeight: '800', color: LEVEL_ACCENT[t.id] }}>{isPt ? 'Grátis' : 'Free'}</AppText>
            </View>
          ) : (
            <TrackPct track={t} />
          )}
          <CaretRight size={16} color={T.textMuted} weight="bold" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

/** Convite "Conheça a Família Queizy" (regras de quando aparece em lib/familyInvite). */
function FamilyInviteRow() {
  const { profile, isTaster } = useAuth();
  const { colors: T } = useTheme();
  const isPt = systemIsPt;
  const [show, setShow] = useState(false);
  useFocusEffect(useCallback(() => {
    let alive = true;
    shouldShowFamilyInvite(profile?.active_character, profile?.created_at).then(v => { if (alive) setShow(v); });
    return () => { alive = false; };
  }, [profile?.active_character, profile?.created_at]));
  if (!show) return null;

  const others = CHARACTER_LIST.filter(c => c.id !== 'charlotte');
  const withTrack = visibleTracks(profile?.beta_features).find(t => others.some(c => c.id === t.character));
  const host = characterInfo(withTrack?.character ?? others[0]?.id).name;
  const subtitle = withTrack
    ? (isTaster
        ? (isPt ? `O ${host} tem um tópico grátis por dia para você` : `${host} has a free topic a day for you`)
        : (isPt ? `O ${host} tem uma trilha só dele` : `${host} has a trail of his own`))
    : (isPt ? `Converse com o comediante ${host}` : `Chat with comedian ${host}`);

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: T.border, paddingLeft: 20, paddingRight: 10, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push('/(app)/family' as any)}
        accessibilityRole="button"
        accessibilityLabel={isPt ? 'Conheça a Família Queizy' : 'Meet the Queizy family'}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}
      >
        <View style={{ flexDirection: 'row' }}>
          {others.slice(0, 3).map((c, i) => (
            <View key={c.id} style={{ marginLeft: i ? -10 : 0, borderRadius: 20, borderWidth: 2, borderColor: T.card }}>
              <CharacterAvatar character={c.id} size="sm" />
            </View>
          ))}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText numberOfLines={1} style={{ fontSize: 14, fontWeight: '800', color: T.textPrimary }}>
            {isPt ? 'Conheça a Família Queizy' : 'Meet the Queizy family'}
          </AppText>
          <AppText numberOfLines={1} style={{ fontSize: 12, color: T.textSecondary }}>{subtitle}</AppText>
        </View>
        <CaretRight size={16} color={T.textMuted} weight="bold" />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => { setShow(false); dismissFamilyInvite(); }}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={isPt ? 'Fechar convite' : 'Dismiss'}
        style={{ padding: 6 }}
      >
        <X size={14} color={T.textMuted} weight="bold" />
      </TouchableOpacity>
    </View>
  );
}

function TrackPct({ track }: { track: ExtraTrack }) {
  const { profile } = useAuth();
  const { isUnitComplete } = useLearnProgressV2(profile?.id, track.id);
  const units = listModules(track.id).flatMap(m => m.units.map(u => ({ moduleId: m.id, unitId: u.id })));
  const done = units.filter(u => isUnitComplete(u.moduleId, u.unitId)).length;
  const pct = units.length ? Math.round((done / units.length) * 100) : 0;
  return <AppText style={{ fontSize: 13, fontWeight: '800', color: LEVEL_ACCENT[track.id] }}>{pct}%</AppText>;
}
