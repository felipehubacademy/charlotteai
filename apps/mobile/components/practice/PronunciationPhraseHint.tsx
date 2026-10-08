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
  pickPhrase, phraseForWord, PronunciationPhrase, PronunciationLevel,
} from '@/lib/pronunciationPhrases';

interface Props {
  userLevel: PronunciationLevel;
  isPt:      boolean;
  accent:    string;
  /** Fired sempre que uma frase nova é mostrada (refresh ou "Need an idea?"
   *  no Inter/Adv). NOT chamado no auto-pick inicial pro Novice. */
  onPhraseChange?: () => void;
  /** Palavras de "Palavras para caprichar" (Minha evolução). Quando vem, o
   *  hint treina uma palavra por vez, em todos os níveis; o X sai do treino. */
  targetWords?: string[] | null;
  onExitTargets?: () => void;
}

export function PronunciationPhraseHint({ userLevel, isPt, accent, onPhraseChange, targetWords, onExitTargets }: Props) {
  const isNovice = userLevel === 'Novice';
  const [phrase, setPhrase] = useState<PronunciationPhrase | null>(null);
  const [wordIdx, setWordIdx] = useState(0);
  const targets = targetWords && targetWords.length ? targetWords : null;

  // Treino de palavras: uma por vez, numa frase do banco que a contenha.
  useEffect(() => {
    if (!targets) return;
    setWordIdx(0);
    setPhrase(phraseForWord(targets[0], userLevel));
  }, [targets?.join('|'), userLevel]); // eslint-disable-line react-hooks/exhaustive-deps
  // Novice: sempre visível. Inter/Adv: visível só após tocar "Need an idea?".
  const [shown, setShown] = useState(isNovice);

  const pickNext = useCallback(async () => {
    const lastId = await SecureStore
      .getItemAsync(`pronunciation_last_phrase_${userLevel}`)
      .catch(() => null);
    const next = pickPhrase(userLevel, lastId);
    setPhrase(next);
    SecureStore
      .setItemAsync(`pronunciation_last_phrase_${userLevel}`, next.id)
      .catch(() => {});
  }, [userLevel]);

  // Refresh manual (botão) — limpa chat E sorteia próxima.
  const refresh = useCallback(async () => {
    onPhraseChange?.();
    await pickNext();
  }, [pickNext, onPhraseChange]);

  // Auto-pick inicial pro Novice — sem disparar onPhraseChange (welcome só).
  useEffect(() => {
    if (isNovice) pickNext();
  }, [isNovice, pickNext]);

  // Inter/Adv: "Need an idea?" também limpa o chat antes de revelar.
  const handleTapIdea = useCallback(() => {
    onPhraseChange?.();
    setShown(true);
    pickNext();
  }, [pickNext, onPhraseChange]);

  if (targets && phrase) {
    const next = () => {
      onPhraseChange?.();
      const i = (wordIdx + 1) % targets.length;
      setWordIdx(i);
      setPhrase(phraseForWord(targets[i], userLevel));
    };
    const word = targets[wordIdx];
    return (
      <View style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'flex-start', gap: 10,
          backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
          borderWidth: 1, borderColor: 'rgba(209,42,100,0.25)',
        }}>
          <View style={{ flex: 1 }}>
            <AppText style={{ fontSize: 11, fontWeight: '700', color: '#D12A64', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>
              {isPt ? `Palavra para caprichar · ${wordIdx + 1} de ${targets.length}` : `Word to polish · ${wordIdx + 1} of ${targets.length}`}
            </AppText>
            <AppText style={{ fontSize: 16, fontWeight: '600', color: '#16131F', lineHeight: 22 }}>
              {`"${phrase.text}"`}
            </AppText>
            {phrase.text.toLowerCase() !== word.toLowerCase() && (
              <AppText style={{ fontSize: 12, color: 'rgba(22,19,31,0.55)', marginTop: 4 }}>
                {isPt ? `Foco em "${word}"` : `Focus on "${word}"`}
              </AppText>
            )}
          </View>
          <View style={{ flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            {targets.length > 1 && (
              <TouchableOpacity
                onPress={next}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(22,19,31,0.06)', alignItems: 'center', justifyContent: 'center' }}
                accessibilityLabel={isPt ? 'Próxima palavra' : 'Next word'}
              >
                <ArrowsClockwise size={13} color="#4D4858" weight="bold" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => { onPhraseChange?.(); onExitTargets?.(); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
              accessibilityLabel={isPt ? 'Sair do treino de palavras' : 'Exit word practice'}
            >
              <X size={12} color="#8A8494" weight="bold" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

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
          <AppText style={{ fontSize: 12, fontWeight: '600', color: '#4D4858' }}>
            {isPt ? 'Precisa de uma ideia?' : 'Need an idea?'}
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
          borderColor:      'rgba(22,19,31,0.10)',
          shadowColor:      'rgba(22,19,31,0.06)',
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
            {isPt ? 'Tente dizer' : 'Try saying'}
          </AppText>
          <AppText
            style={{ fontSize: 16, fontWeight: '600', color: '#16131F', lineHeight: 22 }}
          >
            {`"${phrase.text}"`}
          </AppText>
          {isNovice && phrase.hint && (
            <AppText
              style={{ fontSize: 12, color: 'rgba(22,19,31,0.55)', marginTop: 4, fontStyle: 'italic' }}
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
              backgroundColor: 'rgba(22,19,31,0.06)',
              alignItems: 'center', justifyContent: 'center',
            }}
            accessibilityLabel={isPt ? 'Outra frase' : 'Another phrase'}
          >
            <ArrowsClockwise size={13} color="#4D4858" weight="bold" />
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
              <X size={12} color="#8A8494" weight="bold" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
