// Pills de tópico pra Free Chat Novice. Aparece quando a conversa está vazia
// (só welcome). Tap dispara sendSilentMessage com prompt em EN instruindo a
// Charlotte a abrir o tópico — a mensagem do user NÃO aparece, só o typing
// indicator + resposta da Charlotte.

import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import {
  ForkKnife, Users, Airplane, Briefcase, FilmStrip,
  Sun, HeartStraight, Coffee,
} from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';

export interface Topic {
  id:        string;
  labelPt:   string;
  labelEn:   string;
  prompt:    string;            // instrução em EN pra Charlotte abrir o tópico
  Icon:      React.ComponentType<{ size?: number; color?: string; weight?: any }>;
}

export const NOVICE_TOPICS: Topic[] = [
  { id: 'food',     labelPt: 'Comida',         labelEn: 'Food',      Icon: ForkKnife,
    prompt: 'Start a friendly conversation about food and cuisine. Ask me one short question to get started.' },
  { id: 'family',   labelPt: 'Família',        labelEn: 'Family',    Icon: Users,
    prompt: 'Start a friendly conversation about family. Ask me one short question to get started.' },
  { id: 'travel',   labelPt: 'Viagem',         labelEn: 'Travel',    Icon: Airplane,
    prompt: 'Start a friendly conversation about travel. Ask me one short question to get started.' },
  { id: 'work',     labelPt: 'Trabalho',       labelEn: 'Work',      Icon: Briefcase,
    prompt: 'Start a friendly conversation about work or studies. Ask me one short question to get started.' },
  { id: 'movies',   labelPt: 'Filmes',         labelEn: 'Movies',    Icon: FilmStrip,
    prompt: 'Start a friendly conversation about movies or TV shows. Ask me one short question to get started.' },
  { id: 'routine',  labelPt: 'Rotina',         labelEn: 'Routine',   Icon: Sun,
    prompt: 'Start a friendly conversation about daily routines. Ask me one short question to get started.' },
  { id: 'hobbies',  labelPt: 'Hobbies',        labelEn: 'Hobbies',   Icon: HeartStraight,
    prompt: 'Start a friendly conversation about hobbies and free time. Ask me one short question to get started.' },
  { id: 'weekend',  labelPt: 'Fim de semana',  labelEn: 'Weekend',   Icon: Coffee,
    prompt: 'Start a friendly conversation about weekend plans. Ask me one short question to get started.' },
];

interface Props {
  isPt:     boolean;
  accent:   string;
  disabled?: boolean;
  onSelect: (topic: Topic) => void;
}

export function TopicPills({ isPt, accent, disabled, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 14,
        paddingVertical:    8,
        gap:                8,
      }}
      style={{ flexGrow: 0 }}
    >
      {NOVICE_TOPICS.map(t => (
        <TouchableOpacity
          key={t.id}
          onPress={() => !disabled && onSelect(t)}
          activeOpacity={0.7}
          disabled={disabled}
          style={{
            flexDirection:    'row',
            alignItems:       'center',
            gap:              6,
            paddingHorizontal: 12,
            paddingVertical:   8,
            borderRadius:     18,
            backgroundColor:  '#FFFFFF',
            borderWidth:      1,
            borderColor:      'rgba(22,21,58,0.10)',
            shadowColor:      'rgba(22,21,58,0.06)',
            shadowOpacity:    1,
            shadowRadius:     4,
            shadowOffset:     { width: 0, height: 1 },
            elevation:        1,
            opacity:          disabled ? 0.5 : 1,
          }}
        >
          <View style={{ marginLeft: -2 }}>
            <t.Icon size={15} color={accent} weight="fill" />
          </View>
          <AppText style={{ fontSize: 13, fontWeight: '600', color: '#16153A' }}>
            {isPt ? t.labelPt : t.labelEn}
          </AppText>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
