// Modal de celebracao quando aluno e promovido organicamente de nivel
// (Novice -> Inter ou Inter -> Advanced). Dispara apos save de atividade
// que fecha o ultimo unit do level OU apos refetch do progress.
//
// UX: full-screen translucido, confetes nao (manter simples), 1 botao
// "Continuar no <novo nivel>" que fecha. Bilingue conforme novo nivel.

import React, { useEffect, useRef } from 'react';
import { View, Modal, TouchableOpacity, Animated, Platform } from 'react-native';
import { Trophy, ArrowRight } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import type { PromotionEvent } from '@/lib/curriculum-v2/usePromotion';

const LEVEL_LABEL: Record<string, string> = {
  Inter:    'Intermediate',
  Advanced: 'Advanced',
};

const LEVEL_COLOR: Record<string, string> = {
  Inter:    '#7C3AED',
  Advanced: '#0F766E',
};

const shadow = Platform.select({
  ios: { shadowColor: 'rgba(0,0,0,0.2)', shadowOpacity: 1, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 12 },
});

interface Props {
  event: PromotionEvent | null;
  onClose: () => void;
}

export function PromotionModal({ event, onClose }: Props) {
  const scale = useRef(new Animated.Value(0.92)).current;
  const fade  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (event) {
      scale.setValue(0.92); fade.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 60 }),
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [event, scale, fade]);

  if (!event) return null;
  const isPt   = event.toLevel === 'Inter'; // Inter ainda pode ser PT-explanation usuario; melhor pivot por toLevel
  // Idioma do modal: usa o nivel novo para decidir (Novice eh PT; Inter/Advanced EN).
  const labelLvl = LEVEL_LABEL[event.toLevel] ?? event.toLevel;
  const accent   = LEVEL_COLOR[event.toLevel] ?? '#7C3AED';
  const isPortuguese = false; // promovido sempre cruzou pra >= Inter, mostrar EN.

  const title    = isPortuguese ? 'Parabéns!' : 'Congratulations!';
  const subtitle = isPortuguese
    ? `Você concluiu o nível ${event.fromLevel} e foi promovido para ${labelLvl}.`
    : `You completed the ${event.fromLevel} level and were promoted to ${labelLvl}.`;
  const cta      = isPortuguese ? `Continuar no ${labelLvl}` : `Continue in ${labelLvl}`;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        opacity: fade,
      }}>
        <Animated.View style={[{
          width: '100%', maxWidth: 360,
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          padding: 28,
          alignItems: 'center',
          transform: [{ scale }],
        }, shadow as any]}>
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: `${accent}1a`,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
          }}>
            <Trophy size={42} color={accent} weight="fill" />
          </View>

          <AppText style={{ fontSize: 24, fontWeight: '900', color: '#16153A', marginBottom: 8, textAlign: 'center' }}>
            {title}
          </AppText>

          <AppText style={{ fontSize: 15, fontWeight: '500', color: '#5A5878', textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
            {subtitle}
          </AppText>

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.85}
            style={{
              backgroundColor: accent,
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 24,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              justifyContent: 'center',
            }}>
            <AppText style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
              {cta}
            </AppText>
            <ArrowRight size={16} color="#FFFFFF" weight="bold" />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
