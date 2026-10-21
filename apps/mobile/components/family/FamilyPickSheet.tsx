// components/family/FamilyPickSheet.tsx — "Quem vai te acompanhar?" (Família Queizy).
//
// Duas aberturas na Tela Inicial:
//   - 'first': 1x por conta neste aparelho, no primeiro acesso. O Igorfina já vem marcado (padrão da casa);
//     não fecha sem escolher (tocar fora ou voltar confirma o que está marcado).
//   - 'switch': tocar na foto de quem fala na saudação; fecha ao tocar fora.
// Quem é escolhido fica em charlotte_users.active_character (quem fecha a escolha é a Tela Inicial).

import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, View, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { AppText } from '@/components/ui/Text';
import { CHARACTERS, type CharacterId } from '@/lib/characters';

const C = {
  navy:    '#16131F',
  navyMid: '#3A3546',
  light:   '#8A8494',
  green:   '#DCFF4A',
  border:  'rgba(22,19,31,0.10)',
};

const SCREEN_H = Dimensions.get('window').height;
// Igorfina primeiro: é o padrão.
const ORDER: CharacterId[] = ['igorfina', 'charlotte'];

interface Props {
  visible: boolean;
  mode: 'first' | 'switch';
  isPt: boolean;
  current: CharacterId;
  saving?: boolean;
  onConfirm: (id: CharacterId) => void;
  onClose: () => void;
}

export function FamilyPickSheet({ visible, mode, isPt, current, saving, onConfirm, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [mounted, setMounted] = useState(false);
  const [picked, setPicked] = useState<CharacterId>(mode === 'first' ? 'igorfina' : current);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (visible) {
      setPicked(mode === 'first' ? 'igorfina' : current);
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
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  const dismiss = () => (mode === 'first' ? onConfirm(picked) : onClose());
  const name = CHARACTERS[picked].name;
  const title = mode === 'first'
    ? (isPt ? 'Quem vai te acompanhar?' : 'Who will keep you company?')
    : (isPt ? 'Quem fala com você?' : 'Who talks to you?');
  const body = isPt
    ? 'Fala com você na Tela Inicial, atende quando você liga e começa as conversas do Free Chat. A Charlotte segue como tutora da trilha.'
    : 'Talks to you on Home, picks up when you call and starts your Free Chat conversations. Charlotte stays your trail tutor.';
  const cta = mode === 'first'
    ? (isPt ? `Começar com ${picked === 'charlotte' ? 'a' : 'o'} ${name}` : `Start with ${name}`)
    : (isPt ? 'Confirmar' : 'Confirm');

  return (
    <Modal visible transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <View style={{ flex: 1 }}>
        <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: tabBarHeight, backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdropOpacity }}>
          <Pressable onPress={dismiss} style={{ flex: 1 }} />
        </Animated.View>

        <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: tabBarHeight, transform: [{ translateY: sheetTranslateY }] }}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 + insets.bottom }}
          >
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(22,19,31,0.15)', alignSelf: 'center', marginBottom: 16 }} />
            <AppText display style={{ fontSize: 21, fontWeight: '800', color: C.navy, textAlign: 'center', marginBottom: 6 }}>{title}</AppText>
            <AppText style={{ fontSize: 13, color: C.navyMid, textAlign: 'center', lineHeight: 19, marginBottom: 16, paddingHorizontal: 6 }}>{body}</AppText>

            {ORDER.map(id => {
              const c = CHARACTERS[id];
              const on = picked === id;
              return (
                <TouchableOpacity key={id} onPress={() => setPicked(id)} activeOpacity={0.85}
                  accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={c.name}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 10, borderRadius: 18, borderWidth: on ? 2 : 1, borderColor: on ? C.navy : C.border, backgroundColor: on ? 'rgba(220,255,74,0.18)' : '#FFFFFF' }}>
                  <Image source={c.avatar} style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: C.navy }} contentFit="cover" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText display style={{ fontSize: 17, fontWeight: '800', color: C.navy }}>{c.name}</AppText>
                    <AppText style={{ fontSize: 12.5, color: C.navyMid, lineHeight: 17, marginTop: 2 }}>{isPt ? c.taglinePt : c.taglineEn}</AppText>
                  </View>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? C.navy : 'rgba(22,19,31,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                    {on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.navy }} />}
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity onPress={() => onConfirm(picked)} disabled={saving} activeOpacity={0.85}
              style={{ backgroundColor: C.green, borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 6, opacity: saving ? 0.6 : 1 }}>
              <AppText style={{ fontSize: 15, fontWeight: '800', color: C.navy }}>{cta}</AppText>
            </TouchableOpacity>

            <AppText style={{ fontSize: 12, color: C.light, textAlign: 'center', lineHeight: 17, marginTop: 12 }}>
              {isPt
                ? 'Dá para trocar quando quiser: toque na foto da Tela Inicial ou vá em Perfil > Você no Queizy > Família Queizy.'
                : 'You can switch anytime: tap the photo on Home or go to Profile > You on Queizy > Queizy Family.'}
            </AppText>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
