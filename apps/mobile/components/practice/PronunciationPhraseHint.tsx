// Hint de frase pra praticar pronunciation. Comportamento por nível:
// - Novice: balão sempre visível com "Tente dizer:" + frase + tradução PT
//   abaixo. Botão refresh sorteia outra (sem repetir a anterior).
// - Inter/Advanced: botão discreto "Need an idea?" → ao tocar, mostra a
//   frase. Botão X dispensa. Refresh sorteia outra.
//
// Frases hardcoded em lib/pronunciationPhrases.ts. Última frase usada
// persistida em SecureStore por nível pra evitar repetição imediata.

import React, { useCallback, useEffect, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ArrowsClockwise, X, Lightbulb } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import {
  pickPhrase, PronunciationPhrase, PronunciationLevel,
} from '@/lib/pronunciationPhrases';

interface Props {
  userLevel: PronunciationLevel;
  isPt:      boolean;
  accent:    string;
}

export function PronunciationPhraseHint({ userLevel, isPt, accent }: Props) {
  const isNovice = userLevel === 'Novice';
  const [phrase, setPhrase] = useState<PronunciationPhrase | null>(null);
  // Novice: sempre visível. Inter/Adv: visível só após tocar "Need an idea?".
  const [shown, setShown] = useState(isNovice);

  const refresh = useCallback(async () => {
    const lastId = await SecureStore
      .getItemAsync(`pronunciation_last_phrase_${userLevel}`)
      .catch(() => null);
    const next = pickPhrase(userLevel, lastId);
    setPhrase(next);
    SecureStore
      .setItemAsync(`pronunciation_last_phrase_${userLevel}`, next.id)
      .catch(() => {});
  }, [userLevel]);

  useEffect(() => {
    if (isNovice) refresh();
  }, [isNovice, refresh]);

  const handleTapIdea = useCallback(() => {
    setShown(true);
    refresh();
  }, [refresh]);

  // Inter/Adv: link discreto (alinhado à direita acima do mic)
  if (!shown && !isNovice) {
    return (
      <View style={{ paddingHorizontal: 16, paddingVertical: 6, alignItems: 'flex-end' }}>
        <TouchableOpacity
          onPress={handleTapIdea}
          activeOpacity={0.7}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Lightbulb size={13} color={accent} weight="fill" />
          <AppText style={{ fontSize: 12, fontWeight: '600', color: '#4B4A72' }}>
            Need an idea?
          </AppText>
        </TouchableOpacity>
      </View>
    );
  }

  if (!phrase) return null;

  return (
    <View style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
      <View
        style={{
          flexDirection:    'row',
          alignItems:       'flex-start',
          backgroundColor:  '#FFFFFF',
          borderRadius:     14,
          paddingHorizontal: 14,
          paddingVertical:   12,
          borderWidth:      1,
          borderColor:      'rgba(22,21,58,0.10)',
          shadowColor:      'rgba(22,21,58,0.06)',
          shadowOpacity:    1,
          shadowRadius:     4,
          shadowOffset:     { width: 0, height: 1 },
          elevation:        1,
          gap:              10,
        }}
      >
        <View style={{ flex: 1 }}>
          <AppText
            style={{
              fontSize:      11,
              fontWeight:    '700',
              color:         accent,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              marginBottom:  4,
            }}
          >
            {isNovice ? 'Tente dizer' : 'Try saying'}
          </AppText>
          <AppText
            style={{ fontSize: 16, fontWeight: '600', color: '#16153A', lineHeight: 22 }}
          >
            {`"${phrase.text}"`}
          </AppText>
          {isNovice && phrase.hint && (
            <AppText
              style={{ fontSize: 12, color: 'rgba(22,21,58,0.55)', marginTop: 4, fontStyle: 'italic' }}
            >
              {phrase.hint}
            </AppText>
          )}
        </View>

        <View style={{ flexDirection: 'column', gap: 6, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={refresh}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: 'rgba(22,21,58,0.06)',
              alignItems: 'center', justifyContent: 'center',
            }}
            accessibilityLabel={isPt ? 'Outra frase' : 'Another phrase'}
          >
            <ArrowsClockwise size={13} color="#4B4A72" weight="bold" />
          </TouchableOpacity>
          {!isNovice && (
            <TouchableOpacity
              onPress={() => setShown(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                width: 28, height: 28, borderRadius: 14,
                alignItems: 'center', justifyContent: 'center',
              }}
              accessibilityLabel="Dismiss"
            >
              <X size={12} color="#9896B8" weight="bold" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
