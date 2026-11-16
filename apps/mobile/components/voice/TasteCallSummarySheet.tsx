// TasteCallSummarySheet — degustação: resumo no fim da ligação grátis, com a oferta para continuar conversando.
// Mostra quanto tempo o aluno falou e quantas falas dele foram em inglês (a ligação é o momento "uau";
// sem o resumo, quem desligava voltava para a tela sem nenhum convite).
import React, { useEffect, useRef } from 'react';
import { Modal, View, Animated, TouchableOpacity, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Phone } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';

const C = {
  card: '#FFFFFF', navy: '#16131F', navyMid: '#4D4858', navyLight: '#8A8494',
  green: '#DCFF4A', greenDark: '#08804A',
};

interface Props {
  visible: boolean;
  isPt: boolean;
  hostName: string;
  secs: number;
  userTurns: number;
  /** true = os 3 minutos grátis acabaram nesta ligação. */
  exhausted: boolean;
  onContinue: () => void;
  onClose: () => void;
}

export function TasteCallSummarySheet({ visible, isPt, hostName, secs, userTurns, exhausted, onContinue, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(500)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }),
        Animated.timing(backdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      translateY.setValue(500);
      backdrop.setValue(0);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const m = Math.floor(secs / 60), s = secs % 60;
  const time = m > 0 ? `${m}:${String(s).padStart(2, '0')} min` : `${s} s`;
  const title = isPt ? `Você conversou ${time} em inglês!` : `You talked for ${time} in English!`;
  const said = userTurns > 0
    ? (isPt
        ? `Foram ${userTurns} ${userTurns === 1 ? 'fala sua' : 'falas suas'} com ${hostName}, sem roteiro. `
        : `That's ${userTurns} ${userTurns === 1 ? 'reply' : 'replies'} from you with ${hostName}, no script. `)
    : '';
  const body = said + (exhausted
    ? (isPt
        ? 'Seus minutos grátis de ligação acabaram. Com a assinatura, são 20 minutos por mês para conversar quando quiser.'
        : 'Your free call minutes are used up. With a subscription, you get 20 minutes a month to talk whenever you want.')
    : (isPt
        ? 'Com a assinatura, são 20 minutos de ligação por mês para conversar quando quiser.'
        : 'With a subscription, you get 20 call minutes a month to talk whenever you want.'));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdrop }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
        <Animated.View style={{
          backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingHorizontal: 24, paddingTop: 20, paddingBottom: insets.bottom + 20, transform: [{ translateY }],
        }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(22,19,31,0.12)', marginBottom: 20 }} />
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(8,128,74,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Phone size={28} color={C.greenDark} weight="fill" />
            </View>
            <AppText display style={{ fontSize: 20, fontWeight: '800', color: C.navy, textAlign: 'center', marginBottom: 8 }}>
              {title}
            </AppText>
            <AppText style={{ fontSize: 14, color: C.navyMid, textAlign: 'center', lineHeight: 21, marginBottom: 22 }}>
              {body}
            </AppText>
          </View>
          <TouchableOpacity
            onPress={onContinue}
            activeOpacity={0.85}
            style={{ backgroundColor: C.green, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 10 }}
          >
            <AppText style={{ fontSize: 15, fontWeight: '800', color: C.navy }}>
              {isPt ? 'Continuar conversando' : 'Keep talking'}
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ paddingVertical: 12, alignItems: 'center' }}>
            <AppText style={{ fontSize: 14, fontWeight: '600', color: C.navyLight }}>
              {isPt ? 'Agora não' : 'Not now'}
            </AppText>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}
