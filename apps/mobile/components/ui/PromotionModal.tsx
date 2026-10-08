import React, { useEffect, useRef } from 'react';
import {
  Modal, View, TouchableOpacity, Animated, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star, ArrowRight, Trophy } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { LEVEL_ACCENT } from '@/lib/levelColors';
import { systemIsPt as isPt } from '@/lib/systemLang';

interface Props {
  isOpen: boolean;
  nextLevel: string;
  onConfirm: () => void;
}

const LEVEL_COLOR = LEVEL_ACCENT;

const LEVEL_LABEL: Record<string, { pt: string; en: string }> = {
  Inter:    { pt: 'Intermediário', en: 'Intermediate' },
  Advanced: { pt: 'Avançado',     en: 'Advanced' },
};

export default function PromotionModal({ isOpen, nextLevel, onConfirm }: Props) {
  const accent = LEVEL_COLOR[nextLevel] ?? '#6B4BFF';
  const scaleAnim  = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const labelPt = LEVEL_LABEL[nextLevel]?.pt ?? nextLevel;
  const labelEn = LEVEL_LABEL[nextLevel]?.en ?? nextLevel;

  return (
    <Modal visible={isOpen} transparent animationType="fade" statusBarTranslucent>
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(22,19,31,0.72)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
      }}>
        <Animated.View style={{
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: 28,
          padding: 32,
          alignItems: 'center',
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 40, shadowOffset: { width: 0, height: 20 } },
            android: { elevation: 20 },
          }),
        }}>

          {/* Icon */}
          <View style={{
            width: 88, height: 88, borderRadius: 44,
            backgroundColor: accent + '15',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 24,
            borderWidth: 2,
            borderColor: accent + '30',
          }}>
            <Trophy size={44} color={accent} weight="fill" />
          </View>

          {/* Headline */}
          <AppText style={{
            fontSize: 11, fontWeight: '700', color: '#8A8494',
            textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10,
          }}>
            {isPt ? 'Nível desbloqueado' : 'Level unlocked'}
          </AppText>
          <AppText style={{
            fontSize: 32, fontWeight: '900', color: '#16131F',
            letterSpacing: -1, textAlign: 'center', marginBottom: 8,
            lineHeight: 38,
          }}>
            {isPt ? labelPt : labelEn}
          </AppText>
          {isPt && (
            <AppText style={{
              fontSize: 14, fontWeight: '500', color: '#8A8494',
              letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8,
            }}>
              {labelEn}
            </AppText>
          )}

          {/* Accent divider */}
          <View style={{
            width: 48, height: 3, borderRadius: 2,
            backgroundColor: accent, marginBottom: 24,
          }} />

          <AppText style={{
            fontSize: 15, color: '#4D4858', textAlign: 'center',
            lineHeight: 22, marginBottom: 32, fontWeight: '500',
          }}>
            {isPt
              ? `Você completou a trilha com nota suficiente.\nBoas-vindas ao nível ${labelPt}!`
              : `You completed the trail with a strong enough score.\nWelcome to ${labelEn}!`}
          </AppText>

          {/* CTA */}
          <TouchableOpacity
            onPress={onConfirm}
            activeOpacity={0.85}
            style={{
              width: '100%',
              backgroundColor: accent,
              borderRadius: 16,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <AppText style={{ color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: -0.3 }}>
              {isPt ? `Começar o ${labelPt}` : `Start ${labelEn}`}
            </AppText>
            <ArrowRight size={18} color="#FFF" weight="bold" />
          </TouchableOpacity>

        </Animated.View>
      </View>
    </Modal>
  );
}
