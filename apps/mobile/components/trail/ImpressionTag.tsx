// Selo discreto dos tópicos com imitação na trilha do Igorfina: só o nome ("Presidente").
import React from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/ui/Text';
import { characterInfo, impressionLabel, type CharacterId, type ImpressionId } from '@/lib/characters';

export function ImpressionTag({ character, impression, isPt, color, bg }: {
  character: CharacterId; impression: ImpressionId; isPt: boolean; color: string; bg: string;
}) {
  const label = impressionLabel(characterInfo(character), impression, isPt);
  if (!label) return null;
  return (
    <View style={{ alignSelf: 'flex-start', marginTop: 5, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: bg }}>
      <AppText style={{ fontSize: 11, fontWeight: '700', color }}>
        {label}
      </AppText>
    </View>
  );
}
