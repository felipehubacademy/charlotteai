// Bottom sheet de "posicionar no nível certo" — Fase 1 (placement opcional).
//
// Aparece 1x por device (flag SecureStore PLACEMENT_PROMPT_DISMISSED), na Home,
// só pra quem ainda não fez o placement. Oferece o teste rápido OU começar do
// zero. Nunca bloqueia — é sempre dispensável.
//
// Espelha o NewLayoutWelcomeSheet (backdrop fade + sheet slide up).

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, Pressable, View, TouchableOpacity, Dimensions, Animated, Easing,
} from 'react-native';
import { Compass } from 'phosphor-react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { AppText } from '@/components/ui/Text';

const C = {
  navy:    '#16153A',
  navyMid: '#3B3A5A',
  green:   '#A3FF3C',
  iconBg:  'rgba(124,58,237,0.10)',
  iconCol: '#7C3AED',
};

const SCREEN_H = Dimensions.get('window').height;

interface Props {
  visible: boolean;
  isPt: boolean;
  onTakeTest: () => void;
  onStartFromZero: () => void;
}

export function PlacementPromptSheet({ visible, isPt, onTakeTest, onStartFromZero }: Props) {
  const [mounted, setMounted] = useState(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_H)).current;
  const tabBarHeight = useBottomTabBarHeight();

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: SCREEN_H, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible, mounted, backdropOpacity, sheetTranslateY]);

  if (!mounted) return null;

  const title = isPt ? 'Comece no ponto certo' : 'Start at the right level';
  const body  = isPt
    ? 'Já sabe um pouco de inglês? Um teste rápido posiciona você no nível ideal. Prefere começar do zero? Também dá — e você pode fazer o teste depois, no seu perfil.'
    : 'Already know some English? A quick test places you at the right level. Prefer to start from scratch? That works too — you can take the test later from your profile.';
  const primary   = isPt ? 'Fazer teste rápido' : 'Take the quick test';
  const secondary = isPt ? 'Começar do zero'    : 'Start from scratch';

  return (
    <Modal visible transparent animationType="none" onRequestClose={onStartFromZero} statusBarTranslucent>
      <View style={{ flex: 1 }}>
        <Animated.View
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: tabBarHeight,
            backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdropOpacity,
          }}
        >
          <Pressable onPress={onStartFromZero} style={{ flex: 1 }} />
        </Animated.View>

        <Animated.View style={{
          position: 'absolute', left: 0, right: 0, bottom: tabBarHeight,
          transform: [{ translateY: sheetTranslateY }],
        }}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24,
            }}
          >
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(22,21,58,0.15)', alignSelf: 'center', marginBottom: 18 }} />

            <View style={{
              width: 48, height: 48, borderRadius: 14, backgroundColor: C.iconBg,
              alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12,
            }}>
              <Compass size={26} color={C.iconCol} weight="fill" />
            </View>

            <AppText style={{ fontSize: 20, fontWeight: '800', color: C.navy, textAlign: 'center', marginBottom: 8 }}>
              {title}
            </AppText>
            <AppText style={{ fontSize: 13, color: C.navyMid, textAlign: 'center', marginBottom: 22, paddingHorizontal: 4, lineHeight: 19 }}>
              {body}
            </AppText>

            <TouchableOpacity
              onPress={onTakeTest}
              activeOpacity={0.85}
              style={{ backgroundColor: C.green, borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginBottom: 8 }}
            >
              <AppText style={{ fontSize: 15, fontWeight: '800', color: C.navy }}>
                {primary}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity onPress={onStartFromZero} activeOpacity={0.7} style={{ paddingVertical: 12, alignItems: 'center' }}>
              <AppText style={{ fontSize: 14, fontWeight: '700', color: C.navyMid }}>
                {secondary}
              </AppText>
            </TouchableOpacity>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
