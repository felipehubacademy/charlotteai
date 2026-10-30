// Estado inicial da Practice (conversa vazia): a Charlotte com um balão no
// estilo da Home (rabinho do logo apontando para ela) dizendo o que fazer no
// modo atual, e sugestões tocáveis logo abaixo.
//   Free Chat     → tópicos (a Charlotte abre o assunto)
//   Grammar       → frases com erros comuns para corrigir (conteúdo, em inglês)
//   Pronunciation → só o balão (as frases ficam no hint acima do microfone)
// No Free Chat, o aluno escolhe com quem conversar (Família Queizy): Charlotte ou Igorfina e, com o
// Igorfina, uma das imitações dele para a conversa inteira (Presidente, Astro do basquete...).

import React from 'react';
import { View, TouchableOpacity, Image, ScrollView } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AppText } from '@/components/ui/Text';
import { NOVICE_TOPICS, Topic } from './TopicPills';
import { CHARACTER_LIST, characterInfo, personaDisplay, type CharacterId, type ImpressionId } from '@/lib/characters';

type Mode = 'chat' | 'grammar' | 'pronunciation';

const INK = '#16131F';

// Erros clássicos de brasileiro — o aluno toca e a Charlotte corrige.
const GRAMMAR_SAMPLES = [
  'She don\'t like coffee.',
  'I have 25 years.',
  'He go to work yesterday.',
];

const TITLES: Record<Mode, { pt: string; en: string }> = {
  chat:          { pt: 'Sobre o que vamos conversar?', en: 'What should we talk about?' },
  grammar:       { pt: 'Manda uma frase, eu corrijo.',  en: 'Send me a sentence, I\'ll fix it.' },
  pronunciation: { pt: 'Segura o microfone e fala.',    en: 'Hold the mic and speak.' },
};

interface Props {
  mode: Mode;
  isPt: boolean;
  disabled?: boolean;
  onTopic: (topic: Topic) => void;
  onSample: (text: string) => void;
  /** Free Chat: com quem é a conversa e a troca de personagem. */
  character?: CharacterId;
  /** Conversa inteira com uma imitação do personagem (null = o próprio personagem). */
  impression?: ImpressionId | null;
  onCharacter?: (id: CharacterId, impression?: ImpressionId | null) => void;
}

const IGOR_TITLE = { pt: 'Bora começar o show?', en: 'Ready for the show?' };

/** Escolha de com quem conversar (Free Chat) e, com quem tem imitações, qual delas (ou o próprio personagem). */
function CharacterPicker({ value, impression, onChange, isPt, disabled }: { value: CharacterId; impression: ImpressionId | null; onChange: (id: CharacterId, impression?: ImpressionId | null) => void; isPt: boolean; disabled?: boolean }) {
  const current = characterInfo(value);
  return (
    // Desce um pouco: o balão de dica do topo ("Que tal praticar Gramática hoje?") fica por cima desta área.
    <View style={{ alignItems: 'center', marginTop: 44, marginBottom: 22, alignSelf: 'stretch' }}>
      <AppText style={{ fontSize: 12, color: '#8A8494', fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {isPt ? 'Conversar com' : 'Chat with'}
      </AppText>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {CHARACTER_LIST.map(c => {
          const on = c.id === value;
          return (
            <TouchableOpacity key={c.id} disabled={disabled} activeOpacity={0.8} onPress={() => (!on || impression) && onChange(c.id, null)}
              accessibilityRole="button" accessibilityState={{ selected: on }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4, paddingRight: 14, paddingVertical: 4, borderRadius: 24,
                backgroundColor: on ? INK : '#FFFFFF', borderWidth: 1, borderColor: on ? INK : 'rgba(22,19,31,0.10)', opacity: disabled ? 0.5 : 1 }}>
              <Image source={c.avatar} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: INK }} />
              <AppText style={{ fontSize: 14, fontWeight: '700', color: on ? '#DCFF4A' : INK }}>{c.name}</AppText>
            </TouchableOpacity>
          );
        })}
      </View>
      {/* Imitações de quem está escolhido: a conversa inteira com ela. Rola de lado quando a lista cresce. */}
      {!!current.impressions?.length && (
        <View style={{ marginTop: 12, alignSelf: 'stretch', alignItems: 'center' }}>
          <AppText style={{ fontSize: 11, color: '#8A8494', fontWeight: '700', marginBottom: 6 }}>
            {isPt ? `Ou com uma imitação do ${current.name}:` : `Or with one of ${current.name}'s impressions:`}
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4, flexGrow: 1, justifyContent: 'center' }}>
            {current.impressions.map(imp => {
              const on = impression === imp.id;
              return (
                <TouchableOpacity key={imp.id} disabled={disabled} activeOpacity={0.8} onPress={() => !on && onChange(value, imp.id)}
                  accessibilityRole="button" accessibilityState={{ selected: on }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 3, paddingRight: 12, paddingVertical: 3, borderRadius: 20,
                    backgroundColor: on ? INK : '#FFFFFF', borderWidth: 1, borderColor: on ? INK : 'rgba(22,19,31,0.10)', opacity: disabled ? 0.5 : 1 }}>
                  <Image source={imp.avatar ?? current.avatar} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: INK }} />
                  <AppText style={{ fontSize: 13, fontWeight: '700', color: on ? '#DCFF4A' : INK }}>{isPt ? imp.labelPt : imp.labelEn}</AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function Chip({ label, onPress, disabled, italic }: { label: string; onPress: () => void; disabled?: boolean; italic?: boolean }) {
  return (
    <TouchableOpacity
      onPress={() => !disabled && onPress()}
      activeOpacity={0.7}
      disabled={disabled}
      style={{
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18,
        backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(22,19,31,0.10)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <AppText style={{ fontSize: 13, fontWeight: '600', color: INK, fontStyle: italic ? 'italic' : 'normal' }}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

export function PracticeEmptyState({ mode, isPt, disabled, onTopic, onSample, character = 'charlotte', impression = null, onCharacter }: Props) {
  // Gramática e Pronúncia são sempre com a Charlotte (correção de professora).
  const who = characterInfo(mode === 'chat' ? character : 'charlotte');
  const persona = personaDisplay(who.id, mode === 'chat' ? impression : null, isPt);
  const title = who.id === 'igorfina' ? (isPt ? IGOR_TITLE.pt : IGOR_TITLE.en) : (isPt ? TITLES[mode].pt : TITLES[mode].en);

  return (
    <View pointerEvents="box-none" style={{ paddingHorizontal: 20, paddingTop: 28, alignItems: 'center' }}>
      {mode === 'chat' && onCharacter && (
        <CharacterPicker value={who.id} impression={persona.impression?.id ?? null} onChange={onCharacter} isPt={isPt} disabled={disabled} />
      )}
      {/* Balão + avatar */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8 }}>
        <Image
          source={persona.avatar}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: INK }}
          accessibilityLabel={persona.name}
        />
        <View style={{ maxWidth: '78%', marginBottom: 16 }}>
          <View style={{
            backgroundColor: '#FFFFFF', borderRadius: 18,
            paddingHorizontal: 16, paddingVertical: 12,
            shadowColor: 'rgba(22,19,31,0.10)', shadowOpacity: 1, shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 }, elevation: 2,
          }}>
            <AppText display style={{ fontSize: 20, fontWeight: '800', color: INK, lineHeight: 25 }}>
              {title}
            </AppText>
          </View>
          <Svg width={20} height={14} viewBox="0 0 20 14" style={{ position: 'absolute', left: 8, bottom: -13 }}>
            <Path d="M19 0 L0 14 L7 0 Z" fill="#FFFFFF" />
          </Svg>
        </View>
      </View>

      {/* Sugestões */}
      {mode === 'chat' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          {NOVICE_TOPICS.slice(0, 6).map(t => (
            <Chip key={t.id} label={isPt ? t.labelPt : t.labelEn} disabled={disabled} onPress={() => onTopic(t)} />
          ))}
        </View>
      )}
      {mode === 'grammar' && (
        <View style={{ alignItems: 'center', marginTop: 20, gap: 8 }}>
          <AppText style={{ fontSize: 12, color: '#8A8494', fontWeight: '600' }}>
            {isPt ? 'Ou toque numa frase para ver a correção:' : 'Or tap a sentence to see the fix:'}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            {GRAMMAR_SAMPLES.map(t => (
              <Chip key={t} label={t} italic disabled={disabled} onPress={() => onSample(t)} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
