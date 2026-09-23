// LiveVoiceLimitSheet — popup (bottom sheet) mostrado quando o tempo mensal de
// Live Voice acaba.
//   - Trial:        "Assine para ter mais minutos" -> abre o paywall.
//   - Premium/Inst: "Renova no dia 1º" (IAP de minutos avulsos = fase futura).

import React, { useEffect, useRef } from 'react';
import { Modal, View, Animated, TouchableOpacity, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhoneSlash } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';

const C = {
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  green:     '#A3FF3C',
  lossRedBg: '#FEE2E2',
  lossRed:   '#DC2626',
};

interface Props {
  visible: boolean;
  isPt: boolean;
  isSubscriber: boolean; // premium ou institucional
  poolMin: number;       // minutos do pool (5 ou 20)
  onSubscribe: () => void;
  onClose: () => void;
}

export function LiveVoiceLimitSheet({ visible, isPt, isSubscriber, poolMin, onSubscribe, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(400)).current;
  const backdrop   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }),
        Animated.timing(backdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      translateY.setValue(400);
      backdrop.setValue(0);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const title = isPt ? 'Seus minutos acabaram' : 'You’re out of minutes';
  const body = isSubscriber
    ? (isPt
        ? `Você usou seus ${poolMin} minutos de Live Voice deste mês. Eles renovam no dia 1º. Em breve você poderá comprar minutos avulsos para continuar na hora.`
        : `You’ve used your ${poolMin} minutes of Live Voice this month. They renew on the 1st. Soon you’ll be able to buy extra minutes to keep going right away.`)
    : (isPt
        ? `Você usou seus ${poolMin} minutos de Live Voice deste mês. Assine o Premium para ter 20 minutos por mês e continuar conversando com a Charlotte.`
        : `You’ve used your ${poolMin} minutes of Live Voice this month. Subscribe to Premium for 20 minutes a month and keep talking with Charlotte.`);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={{ ...StyleAbsFill, backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdrop }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={{
            backgroundColor: C.card,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            paddingHorizontal: 24, paddingTop: 20,
            paddingBottom: insets.bottom + 20,
            transform: [{ translateY }],
          }}
        >
          {/* handle */}
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(22,21,58,0.12)', marginBottom: 20 }} />

          <View style={{ alignItems: 'center' }}>
            <View style={{
              width: 60, height: 60, borderRadius: 30, backgroundColor: C.lossRedBg,
              alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}>
              <PhoneSlash size={28} color={C.lossRed} weight="fill" />
            </View>

            <AppText style={{ fontSize: 20, fontWeight: '800', color: C.navy, textAlign: 'center', marginBottom: 8 }}>
              {title}
            </AppText>
            <AppText style={{ fontSize: 14, color: C.navyMid, textAlign: 'center', lineHeight: 21, marginBottom: 24 }}>
              {body}
            </AppText>
          </View>

          {isSubscriber ? (
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.85}
              style={{ backgroundColor: C.navy, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
            >
              <AppText style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
                {isPt ? 'Entendi' : 'Got it'}
              </AppText>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                onPress={onSubscribe}
                activeOpacity={0.85}
                style={{
                  backgroundColor: C.green, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 10,
                  shadowColor: C.green, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
                }}
              >
                <AppText style={{ fontSize: 15, fontWeight: '800', color: C.navy }}>
                  {isPt ? 'Assinar Premium' : 'Subscribe to Premium'}
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ paddingVertical: 12, alignItems: 'center' }}>
                <AppText style={{ fontSize: 14, fontWeight: '600', color: C.navyLight }}>
                  {isPt ? 'Agora não' : 'Not now'}
                </AppText>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const StyleAbsFill = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };
