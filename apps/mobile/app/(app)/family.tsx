// app/(app)/family.tsx — Família Queizy: os personagens do app.
// O aluno escolhe quem o acompanha (charlotte_users.active_character): fala na tela inicial, atende a
// ligação (aba de ligação) e começa o Free Chat ("Conversar com" troca só a conversa). O cartão
// inteiro é o seletor; a trilha própria de quem está escolhido aparece na tela inicial ("Ver trilha" abre).
// Quem tem imitações (Igorfina) mostra a lista delas: "Conversar" abre o Free Chat e "Ligar" liga só com
// aquela imitação, sem trocar quem fala na tela inicial (sempre o personagem principal).
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Check, BookOpenText, CaretRight, CaretDown, ChatCircleDots, Phone } from 'phosphor-react-native';
import { ScreenHeader } from '@/components/stats/StatsUI';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { systemIsPt } from '@/lib/systemLang';
import { CHARACTER_LIST, characterInfo, type CharacterId } from '@/lib/characters';
import { visibleTracks } from '@/lib/tracks';
import { markFamilyMemberPicked } from '@/lib/familyInvite';
import { LEVEL_ACCENT, LEVEL_ACCENT_BG } from '@/lib/levelColors';

const C = {
  bg: '#FAF7F0', card: '#FFFFFF', ink: '#16131F', inkMid: '#4D4858', inkLight: '#8A8494',
  volt: '#DCFF4A', border: 'rgba(22,19,31,0.08)',
};
const shadow = Platform.select({
  ios: { shadowColor: 'rgba(22,19,31,0.08)', shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 2 },
}) as object;

export default function FamilyScreen() {
  const isPt = systemIsPt;
  const insets = useSafeAreaInsets();
  const { profile, refreshProfile, isTaster } = useAuth();
  const tracks = visibleTracks(profile?.beta_features);
  const current = characterInfo(profile?.active_character).id;
  const [saving, setSaving] = useState<CharacterId | null>(null);
  const [openImpressions, setOpenImpressions] = useState<CharacterId | null>(null); // lista de imitações aberta (dropdown)

  const choose = async (id: CharacterId) => {
    if (!profile?.id || id === current || saving) return;
    setSaving(id);
    if (id !== 'charlotte') markFamilyMemberPicked(); // some o convite da Família na tela inicial
    try {
      const { error } = await supabase.from('charlotte_users').update({ active_character: id }).eq('id', profile.id);
      if (!error) await refreshProfile();
    } finally {
      setSaving(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader title={isPt ? 'Família Queizy' : 'Queizy family'} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}>
        <AppText style={{ fontSize: 14, color: C.inkMid, lineHeight: 20, marginBottom: 18, marginHorizontal: 4 }}>
          {isPt
            ? 'Escolha quem te acompanha no app: fala com você na tela inicial, atende quando você liga e começa as conversas do Free Chat. Quem tem trilha própria mostra a trilha na sua tela inicial.'
            : 'Choose who keeps you company in the app: they talk to you on Home, pick up when you call and start your Free Chat conversations. If they have their own trail, it shows on your Home.'}
        </AppText>

        {CHARACTER_LIST.map(c => {
          const on = c.id === current;
          const track = tracks.find(t => t.character === c.id);
          return (
            // O cartão inteiro é o seletor: tocar escolhe quem te acompanha no app.
            <TouchableOpacity key={c.id} onPress={() => choose(c.id)} disabled={on || !!saving} activeOpacity={0.85}
              accessibilityRole="radio" accessibilityState={{ selected: on }}
              accessibilityLabel={isPt ? `Escolher ${c.name}` : `Choose ${c.name}`}
              style={{ backgroundColor: C.card, borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: on ? 2 : 1, borderColor: on ? C.ink : C.border, ...shadow }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Image source={c.avatar} style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.ink }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AppText display style={{ fontSize: 19, fontWeight: '800', color: C.ink }}>{c.name}</AppText>
                    {on && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.volt, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Check size={12} color={C.ink} weight="bold" />
                        <AppText style={{ fontSize: 11, fontWeight: '800', color: C.ink }}>{isPt ? 'Escolhido' : 'Chosen'}</AppText>
                      </View>
                    )}
                  </View>
                  <AppText style={{ fontSize: 13, color: C.inkMid, marginTop: 3, lineHeight: 18 }}>{isPt ? c.taglinePt : c.taglineEn}</AppText>
                </View>
                {/* Seletor */}
                <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: on ? C.ink : 'rgba(22,19,31,0.25)', alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.ink : 'transparent' }}>
                  {saving === c.id ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.inkLight }} />
                    : on ? <Check size={14} color={C.volt} weight="bold" /> : null}
                </View>
              </View>
              {track ? (
                // Trilha própria: aparece na tela inicial quando ele está escolhido; "Ver trilha" abre direto.
                <TouchableOpacity onPress={() => router.push({ pathname: '/(app)/track' as any, params: { id: track.id } })} activeOpacity={0.7}
                  accessibilityRole="button"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border }}>
                  <BookOpenText size={16} color={LEVEL_ACCENT[track.id]} weight="bold" />
                  <AppText numberOfLines={1} style={{ flex: 1, fontSize: 13, color: C.inkMid }}>
                    {isPt ? 'Trilha própria: ' : 'Own trail: '}
                    <AppText style={{ fontSize: 13, fontWeight: '800', color: C.ink }}>{isPt ? track.titlePt : track.titleEn}</AppText>
                  </AppText>
                  {isTaster ? (
                    <View style={{ backgroundColor: LEVEL_ACCENT_BG[track.id], borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <AppText style={{ fontSize: 11, fontWeight: '800', color: LEVEL_ACCENT[track.id] }}>{isPt ? '1 tópico grátis por dia' : '1 free topic a day'}</AppText>
                    </View>
                  ) : null}
                  <AppText style={{ fontSize: 13, fontWeight: '700', color: C.ink }}>{isPt ? 'Ver trilha' : 'View trail'}</AppText>
                  <CaretRight size={12} color={C.ink} weight="bold" />
                </TouchableOpacity>
              ) : null}
              {c.impressions?.length ? (
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border, gap: 12 }}>
                  {/* Dropdown: fechado mostra só a linha com a quantidade; aberto, a lista com Conversar e Ligar. */}
                  <TouchableOpacity onPress={() => setOpenImpressions(o => (o === c.id ? null : c.id))} activeOpacity={0.7}
                    accessibilityRole="button" accessibilityState={{ expanded: openImpressions === c.id }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AppText style={{ flex: 1, fontSize: 13, color: C.inkMid }}>
                      {isPt ? `Imitações do ${c.name}: ` : `${c.name}'s impressions: `}
                      <AppText style={{ fontSize: 13, fontWeight: '800', color: C.ink }}>{c.impressions.length}</AppText>
                    </AppText>
                    <AppText style={{ fontSize: 13, fontWeight: '700', color: C.ink }}>{openImpressions === c.id ? (isPt ? 'Fechar' : 'Close') : (isPt ? 'Ver todas' : 'See all')}</AppText>
                    <View style={{ transform: [{ rotate: openImpressions === c.id ? '180deg' : '0deg' }] }}>
                      <CaretDown size={12} color={C.ink} weight="bold" />
                    </View>
                  </TouchableOpacity>
                  {openImpressions === c.id && c.impressions.map(imp => {
                    const label = isPt ? imp.labelPt : imp.labelEn;
                    return (
                      <View key={imp.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Image source={imp.avatar ?? c.avatar} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.ink }} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <AppText style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>{label}</AppText>
                          <AppText style={{ fontSize: 12, color: C.inkMid, marginTop: 2, lineHeight: 16 }}>{isPt ? imp.taglinePt : imp.taglineEn}</AppText>
                        </View>
                        <TouchableOpacity onPress={() => router.push({ pathname: '/(app)/(tabs)/practice', params: { mode: 'chat', character: c.id, impression: imp.id } } as any)}
                          activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={isPt ? `Conversar com ${imp.articlePt}${label}` : `Chat with ${label}`}
                          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(22,19,31,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                          <ChatCircleDots size={20} color={C.ink} weight="bold" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push({ pathname: '/(app)/(tabs)/livevoice', params: { call: c.id, impression: imp.id } } as any)}
                          activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={isPt ? `Ligar para ${imp.articlePt}${label}` : `Call ${label}`}
                          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.volt, alignItems: 'center', justifyContent: 'center' }}>
                          <Phone size={20} color={C.ink} weight="fill" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}

        {/* Em breve: a Família vai crescer (mesmo recado do onboarding e do site). Não é selecionável. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 20, padding: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(22,19,31,0.18)' }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(22,19,31,0.06)', alignItems: 'center', justifyContent: 'center' }}>
            <AppText display style={{ fontSize: 26, fontWeight: '800', color: C.inkLight }}>?</AppText>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText display style={{ fontSize: 19, fontWeight: '800', color: C.ink }}>{isPt ? 'Em breve' : 'Coming soon'}</AppText>
            <AppText style={{ fontSize: 13, color: C.inkMid, marginTop: 3, lineHeight: 18 }}>
              {isPt ? 'A Família está crescendo: tem gente nova chegando para conversar com você.' : 'The family is growing: new people are coming to chat with you.'}
            </AppText>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
