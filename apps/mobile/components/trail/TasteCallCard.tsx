// components/trail/TasteCallCard.tsx — degustação: convite para a ligação com o personagem na tela inicial.
// Aparece para quem está na degustação e ainda não concluiu nenhuma atividade da trilha (passada a
// primeira meia hora de conta): quem não entrou na trilha voltava mais quando fazia uma ligação.
import React from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { CaretRight, Phone } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import CharacterAvatar from '@/components/ui/CharacterAvatar';
import { useAuth } from '@/hooks/useAuth';
import { characterInfo } from '@/lib/characters';
import { systemIsPt } from '@/lib/systemLang';
import { useTheme } from '@/lib/theme';
import { track } from '@/lib/analytics';

const shadow = Platform.select({
  ios:     { shadowColor: 'rgba(22,19,31,0.08)', shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 2 },
});

export function TasteCallCard() {
  const { profile } = useAuth();
  const { colors: T } = useTheme();
  const isPt = systemIsPt;
  const host = characterInfo(profile?.active_character);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => {
        if (profile?.id) track('taste_call_card_tap', {});
        router.push('/(app)/(tabs)/livevoice' as any);
      }}
      accessibilityRole="button"
      accessibilityLabel={isPt ? `Ligar para ${host.name}` : `Call ${host.name}`}
      style={{ marginHorizontal: 20, marginBottom: 20, borderRadius: 18, backgroundColor: T.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...shadow }}
    >
      <CharacterAvatar character={profile?.active_character} size="lg" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText style={{ fontSize: 16, fontWeight: '800', color: T.textPrimary }}>
          {isPt ? 'Prefere começar conversando?' : 'Rather start by talking?'}
        </AppText>
        <AppText style={{ fontSize: 13, color: T.textSecondary, marginTop: 2 }}>
          {isPt ? `Ligue para ${host.name}: 3 minutos grátis de conversa por voz.` : `Call ${host.name}: 3 free minutes of voice chat.`}
        </AppText>
      </View>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.textPrimary, alignItems: 'center', justifyContent: 'center' }}>
        <Phone size={18} color={T.card} weight="fill" />
      </View>
      <CaretRight size={18} color={T.textMuted} weight="bold" />
    </TouchableOpacity>
  );
}
