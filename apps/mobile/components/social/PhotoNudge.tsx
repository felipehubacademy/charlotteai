// components/social/PhotoNudge.tsx — convite leve para colocar a foto no perfil (campanha da foto).
// Só aparece para quem ainda não tem foto. Toque: abre o Perfil já na tela de escolher a foto.
// A foto vale a conquista "Cara do Queizy" (+20 XP).
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Camera } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/hooks/useAuth';
import { systemIsPt } from '@/lib/systemLang';
import { C } from '@/components/stats/StatsUI';

export function openPhotoPicker() {
  router.push({ pathname: '/(app)/(tabs)/profile', params: { photo: '1' } } as any);
}

export function PhotoNudge({ text, style }: { text?: string; style?: object }) {
  const { profile } = useAuth();
  const isPt = systemIsPt;
  if (!profile || profile.avatar_url) return null;
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={openPhotoPicker}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: C.border }, style]}>
      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.voltBg, alignItems: 'center', justifyContent: 'center' }}>
        <Camera size={20} color={C.ink} weight="bold" />
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>{isPt ? 'Coloque sua foto' : 'Add your photo'}</AppText>
        <AppText style={{ fontSize: 13, color: C.mid, marginTop: 1, lineHeight: 18 }}>
          {text ?? (isPt ? 'Seus amigos te reconhecem mais fácil.' : 'Your friends will recognize you more easily.')}
        </AppText>
      </View>
      <View style={{ backgroundColor: C.volt, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
        <AppText style={{ fontSize: 12, fontWeight: '800', color: C.ink }}>+20 XP</AppText>
      </View>
    </TouchableOpacity>
  );
}
