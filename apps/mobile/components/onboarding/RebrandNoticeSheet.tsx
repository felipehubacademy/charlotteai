// Bottom sheet do rebrand Charlotte → Queizy.
//
// Aparece 1x por device, só para quem já usava o app antes do rebrand
// (decisão em app/(app)/(tabs)/index.tsx). Explica que o app mudou de nome e
// de cara, e que a Charlotte continua como professora.
//
// Espelha o PlacementPromptSheet (backdrop fade + sheet slide up).

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, Pressable, View, TouchableOpacity, Dimensions, Animated, Easing,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { AppText } from '@/components/ui/Text';

const C = {
  ink:     '#16131F',
  inkMid:  '#3A3546',
  volt:    '#DCFF4A',
  pink:    '#FF4F8B',
};

const SCREEN_H = Dimensions.get('window').height;

// Ícone do app (B.2): balão de fala com a onda da voz, torta → reta.
function QueizyMark({ size }: { size: number }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size * 0.23,
      backgroundColor: C.volt, alignItems: 'center', justifyContent: 'center',
    }}>
      <Svg width={size * 0.72} height={size * 0.72 * 170 / 190} viewBox="0 0 190 170">
        <Path
          d="M30 10 H160 Q180 10 180 30 V110 Q180 130 160 130 H70 L34 162 L40 130 H30 Q10 130 10 110 V30 Q10 10 30 10Z"
          fill={C.ink}
        />
        <Path
          d="M34 70 C40 40 46 100 54 62 C60 34 66 104 76 58 C84 40 88 86 98 66 C102 61 104 70 108 70"
          stroke={C.pink} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round"
        />
        <Path d="M108 70 H158" stroke={C.volt} strokeWidth={9} fill="none" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

interface Props {
  visible: boolean;
  isPt: boolean;
  onClose: () => void;
}

export function RebrandNoticeSheet({ visible, isPt, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_H)).current;
  const tabBarHeight = useBottomTabBarHeight();

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(sheetTranslateY, {
          toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(sheetTranslateY, {
          toValue: SCREEN_H, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible, mounted, backdropOpacity, sheetTranslateY]);

  if (!mounted) return null;

  const title = isPt ? 'A Charlotte agora mora no Queizy' : 'Charlotte now lives in Queizy';
  const body = isPt
    ? 'O app mudou de nome e de cara. A Charlotte continua sendo sua professora, e o seu progresso, o seu vocabulário e a sua assinatura continuam iguais.'
    : 'The app has a new name and a new look. Charlotte is still your teacher, and your progress, vocabulary and subscription stay the same.';
  const tagline = isPt ? 'Do queizy ao crazy.' : 'From queizy to crazy.';
  const cta = isPt ? 'Bora praticar' : "Let's practice";

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1 }}>
        <Animated.View
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: tabBarHeight,
            backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdropOpacity,
          }}
        >
          <Pressable onPress={onClose} style={{ flex: 1 }} />
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
              alignItems: 'center',
            }}
          >
            <View style={{
              width: 40, height: 4, borderRadius: 2,
              backgroundColor: 'rgba(22,19,31,0.15)', marginBottom: 22,
            }} />

            <QueizyMark size={84} />

            <AppText display style={{ fontSize: 22, fontWeight: '800', color: C.ink, textAlign: 'center', marginTop: 18, marginBottom: 8 }}>
              {title}
            </AppText>
            <AppText style={{ fontSize: 14, color: C.inkMid, textAlign: 'center', lineHeight: 20, paddingHorizontal: 4 }}>
              {body}
            </AppText>
            <AppText style={{ fontSize: 15, fontWeight: '800', color: C.pink, textAlign: 'center', marginTop: 14, marginBottom: 22 }}>
              {tagline}
            </AppText>

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.85}
              style={{
                alignSelf: 'stretch', backgroundColor: C.volt,
                borderRadius: 16, paddingVertical: 15, alignItems: 'center',
              }}
            >
              <AppText style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>
                {cta}
              </AppText>
            </TouchableOpacity>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
