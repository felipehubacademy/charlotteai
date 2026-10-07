// Estado inicial da Practice (conversa vazia): a Charlotte com um balão no
// estilo da Home (rabinho do logo apontando para ela) dizendo o que fazer no
// modo atual, e sugestões tocáveis logo abaixo.
//   Free Chat     → tópicos (a Charlotte abre o assunto)
//   Grammar       → frases com erros comuns para corrigir (conteúdo, em inglês)
//   Pronunciation → só o balão (as frases ficam no hint acima do microfone)

import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AppText } from '@/components/ui/Text';
import { NOVICE_TOPICS, Topic } from './TopicPills';

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

export function PracticeEmptyState({ mode, isPt, disabled, onTopic, onSample }: Props) {
  const title = isPt ? TITLES[mode].pt : TITLES[mode].en;

  return (
    <View pointerEvents="box-none" style={{ paddingHorizontal: 20, paddingTop: 28, alignItems: 'center' }}>
      {/* Balão + avatar */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8 }}>
        <Image
          source={require('@/assets/charlotte-avatar.png')}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: INK }}
          accessibilityLabel="Charlotte"
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
