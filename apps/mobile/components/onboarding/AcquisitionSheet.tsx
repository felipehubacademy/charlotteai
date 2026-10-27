// "Como você conheceu o Queizy?" — pergunta única no fim da 1ª atividade da trilha.
// Só para quem criou a conta pela loja (o servidor confere: sem resposta e sem checkout no site).
// Um toque responde e fecha; "Pular" também conta como resposta, para a pergunta nunca mais aparecer.
// Liga ao anúncio quem começou o teste pela loja, onde não há link com utm.
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, View, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/Text';
import { supabase } from '@/lib/supabase';
import { systemIsPt } from '@/lib/systemLang';
import { track } from '@/lib/analytics';

const C = { navy: '#16131F', navyMid: '#3A3546', volt: '#DCFF4A', chip: '#F4F1EA', border: 'rgba(22,19,31,0.08)' };
const SCREEN_H = Dimensions.get('window').height;

const OPTIONS: { id: string; pt: string; en: string }[] = [
  { id: 'influencer',   pt: 'Influenciador',                  en: 'An influencer' },
  { id: 'meta_ads',     pt: 'Anúncio no Instagram ou Facebook', en: 'An ad on Instagram or Facebook' },
  { id: 'store_search', pt: 'Busca na loja',                  en: 'Searching the app store' },
  { id: 'friend',       pt: 'Indicação de amigo',             en: 'A friend told me' },
  { id: 'other',        pt: 'Outro',                          en: 'Other' },
];

/** Abre sozinho, com um pequeno atraso, quando `armed` vira true e o servidor diz que deve perguntar. */
export function AcquisitionSheet({ armed }: { armed: boolean }) {
  const insets = useSafeAreaInsets();
  const isPt = systemIsPt;
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const asked = useRef(false);
  const backdrop = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (!armed || asked.current) return;
    asked.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    supabase.rpc('acquisition_should_ask').then(({ data }) => {
      // Deixa a comemoração da atividade aparecer primeiro.
      if (data === true) timer = setTimeout(() => setVisible(true), 1400);
    });
    return () => { if (timer) clearTimeout(timer); };
  }, [armed]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(sheetY, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(sheetY, { toValue: SCREEN_H, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible, mounted, backdrop, sheetY]);

  const answer = (source: string) => {
    setVisible(false);
    supabase.rpc('answer_acquisition', { p_source: source }).then(() => {});
    track('acquisition_answered', { source });
  };

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => answer('skipped')} statusBarTranslucent>
      <View style={{ flex: 1 }}>
        <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdrop }}>
          <Pressable onPress={() => answer('skipped')} style={{ flex: 1 }} />
        </Animated.View>
        <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, transform: [{ translateY: sheetY }] }}>
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20 + insets.bottom }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(22,19,31,0.15)', alignSelf: 'center', marginBottom: 18 }} />
            <AppText display style={{ fontSize: 20, fontWeight: '800', color: C.navy, textAlign: 'center', marginBottom: 6 }}>
              {isPt ? 'Como você conheceu o Queizy?' : 'How did you hear about Queizy?'}
            </AppText>
            <AppText style={{ fontSize: 13, color: C.navyMid, textAlign: 'center', marginBottom: 18, lineHeight: 19 }}>
              {isPt ? 'Um toque só. Ajuda a gente a chegar em mais gente como você.' : 'Just one tap. It helps us reach more people like you.'}
            </AppText>
            <View style={{ gap: 8 }}>
              {OPTIONS.map(o => (
                <TouchableOpacity key={o.id} onPress={() => answer(o.id)} activeOpacity={0.8}
                  style={{ backgroundColor: C.chip, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingVertical: 14, paddingHorizontal: 16 }}>
                  <AppText style={{ fontSize: 15, fontWeight: '700', color: C.navy }}>{isPt ? o.pt : o.en}</AppText>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => answer('skipped')} activeOpacity={0.7} style={{ paddingVertical: 14, alignItems: 'center', marginTop: 4 }}>
              <AppText style={{ fontSize: 14, fontWeight: '700', color: C.navyMid }}>{isPt ? 'Pular' : 'Skip'}</AppText>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
