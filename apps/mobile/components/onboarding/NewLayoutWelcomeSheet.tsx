// Bottom sheet de boas-vindas ao novo layout — substitui o tour multi-step
// por uma única tela explicando onde cada feature foi parar nas tabs.
//
// Aparece 1x por device. Flag em SecureStore: NEW_LAYOUT_WELCOME_DONE.
// Mostrado a partir do primeiro foco na Home tab.
//
// Animação: content slide up + backdrop fade in (padrão Apple/Notion). RN
// Modal animationType=fade fade tudo junto e o slide nativo desce a sombra
// também — usamos animationType=none + Animated.Value manual.

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, Pressable, View, TouchableOpacity, Dimensions,
  Animated, Easing,
} from 'react-native';
import {
  House, Phone, Lightning, Notepad, Rocket, UserCircle,
} from 'phosphor-react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { AppText } from '@/components/ui/Text';

const C = {
  navy:      '#16153A',
  navyMid:   '#3B3A5A',
  navyLight: '#9896B8',
  border:    'rgba(22,21,58,0.10)',
  green:     '#A3FF3C',
  iconBg:    'rgba(124,58,237,0.10)',
  iconColor: '#7C3AED',
};

interface Tab {
  Icon:  React.ComponentType<{ size?: number; color?: string; weight?: any }>;
  title: string;
  desc:  string;
}

const TABS: Tab[] = [
  { Icon: House,      title: 'Home',         desc: 'Sua trilha de aprendizado e progresso geral.' },
  { Icon: Phone,      title: 'Live Voice',   desc: 'Converse com a Charlotte por voz em tempo real.' },
  { Icon: Lightning,  title: 'Practice',     desc: 'Free Chat, Gramática e Pronúncia no mesmo lugar.' },
  { Icon: Notepad,    title: 'Vocabulário',  desc: 'Palavras e expressões que você está aprendendo.' },
  { Icon: Rocket,     title: 'Metas',        desc: 'Missões diárias, XP do dia e desafio da semana.' },
  { Icon: UserCircle, title: 'Perfil',       desc: 'Configurações, assinatura e seus dados.' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

const SCREEN_H = Dimensions.get('window').height;

export function NewLayoutWelcomeSheet({ visible, onClose }: Props) {
  // Modal stays mounted enquanto animacao roda — desmonta no fim do fade-out
  const [mounted, setMounted] = useState(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_H)).current;
  // Tab bar height inclui safe area no Android — usamos pra deixar o navbar
  // visivel debaixo do sheet (usuario ve os tabs sendo descritos).
  const tabBarHeight = useBottomTabBarHeight();

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(sheetTranslateY, {
          toValue: SCREEN_H,
          duration: 260,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible, mounted, backdropOpacity, sheetTranslateY]);

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1 }}>
        {/* Backdrop dim — ocupa só ATÉ o topo do tab bar. Area abaixo (onde
            o tab bar vive na tela) fica transparente, deixando o navbar
            do app visivel pro usuario conectar o conteudo do sheet aos
            tabs descritos. */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            bottom: tabBarHeight,
            backgroundColor: 'rgba(0,0,0,0.45)',
            opacity: backdropOpacity,
          }}
        >
          <Pressable onPress={onClose} style={{ flex: 1 }} />
        </Animated.View>

        {/* Sheet sit acima do tab bar */}
        <Animated.View style={{
          position: 'absolute',
          left: 0, right: 0,
          bottom: tabBarHeight,
          transform: [{ translateY: sheetTranslateY }],
        }}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 24,
              paddingTop: 16,
              paddingBottom: 24,
            }}
          >
            {/* Drag handle */}
            <View style={{
              width: 40, height: 4, borderRadius: 2,
              backgroundColor: 'rgba(22,21,58,0.15)',
              alignSelf: 'center', marginBottom: 18,
            }} />

            <AppText style={{ fontSize: 20, fontWeight: '800', color: C.navy, textAlign: 'center', marginBottom: 6 }}>
              Bem-vindo ao novo layout
            </AppText>
            <AppText style={{ fontSize: 13, color: C.navyMid, textAlign: 'center', marginBottom: 22, paddingHorizontal: 8 }}>
              As mesmas features de sempre, só reorganizadas nas abas embaixo. Aqui vai um mapa rápido:
            </AppText>

            <View style={{ gap: 14, marginBottom: 24 }}>
              {TABS.map((t, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{
                    width: 36, height: 36, borderRadius: 10,
                    backgroundColor: C.iconBg,
                    alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <t.Icon size={20} color={C.iconColor} weight="fill" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={{ fontSize: 14, fontWeight: '800', color: C.navy }}>
                      {t.title}
                    </AppText>
                    <AppText style={{ fontSize: 12, color: C.navyMid, lineHeight: 17, marginTop: 1 }}>
                      {t.desc}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.85}
              style={{
                backgroundColor: C.green,
                borderRadius: 16,
                paddingVertical: 15,
                alignItems: 'center',
              }}
            >
              <AppText style={{ fontSize: 15, fontWeight: '800', color: C.navy }}>
                Entendi, vamos lá
              </AppText>
            </TouchableOpacity>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
