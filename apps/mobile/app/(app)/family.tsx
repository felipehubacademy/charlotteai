// app/(app)/family.tsx — Família Queizy: os personagens do app.
// Fase 1: o aluno escolhe quem fala na Início (charlotte_users.active_character). Conversar com
// cada um é no Practice > Free Chat ("Conversar com"). Fase 2: trilhas, atividades e Live Voice
// de cada personagem (vantagens do Premium) entram aqui.
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Check, ChatCircleDots } from 'phosphor-react-native';
import { ScreenHeader } from '@/components/stats/StatsUI';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { systemIsPt } from '@/lib/systemLang';
import { CHARACTER_LIST, characterInfo, type CharacterId } from '@/lib/characters';

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
  const { profile, refreshProfile } = useAuth();
  const current = characterInfo(profile?.active_character).id;
  const [saving, setSaving] = useState<CharacterId | null>(null);

  const choose = async (id: CharacterId) => {
    if (!profile?.id || id === current || saving) return;
    setSaving(id);
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
            ? 'Escolha quem fala com você na tela Início. Para conversar com cada um, vá em Practice > Free Chat e toque em "Conversar com".'
            : 'Choose who talks to you on the Home screen. To chat with each one, go to Practice > Free Chat and tap "Chat with".'}
        </AppText>

        {CHARACTER_LIST.map(c => {
          const on = c.id === current;
          return (
            <View key={c.id} style={{ backgroundColor: C.card, borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: on ? 2 : 1, borderColor: on ? C.ink : C.border, ...shadow }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Image source={c.avatar} style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.ink }} />
                <View style={{ flex: 1 }}>
                  <AppText display style={{ fontSize: 19, fontWeight: '800', color: C.ink }}>{c.name}</AppText>
                  <AppText style={{ fontSize: 13, color: C.inkMid, marginTop: 3, lineHeight: 18 }}>{isPt ? c.taglinePt : c.taglineEn}</AppText>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <TouchableOpacity onPress={() => choose(c.id)} disabled={on || !!saving} activeOpacity={0.8}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 14, backgroundColor: on ? C.volt : C.ink }}>
                  {on && <Check size={15} color={C.ink} weight="bold" />}
                  <AppText style={{ fontSize: 14, fontWeight: '700', color: on ? C.ink : '#FFFFFF' }}>
                    {on ? (isPt ? 'Fala na Início' : 'On your Home') : saving === c.id ? (isPt ? 'Salvando…' : 'Saving…') : (isPt ? 'Falar na Início' : 'Show on Home')}
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push({ pathname: '/(app)/(tabs)/practice', params: { mode: 'chat', character: c.id } } as any)} activeOpacity={0.8}
                  accessibilityLabel={isPt ? `Conversar com ${c.name}` : `Chat with ${c.name}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: C.border }}>
                  <ChatCircleDots size={16} color={C.ink} weight="regular" />
                  <AppText style={{ fontSize: 14, fontWeight: '700', color: C.ink }}>{isPt ? 'Conversar' : 'Chat'}</AppText>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
