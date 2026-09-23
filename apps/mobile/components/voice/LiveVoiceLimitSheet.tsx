// LiveVoiceLimitSheet — popup (bottom sheet) mostrado quando o tempo mensal de
// Live Voice acaba.
//   - Trial:        "Assine para ter mais minutos" -> abre o paywall.
//   - Premium/Inst: compra de minutos avulsos (consumível) -> saldo bônus.

import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Animated, TouchableOpacity, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhoneSlash } from 'phosphor-react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { AppText } from '@/components/ui/Text';
import { getMinutePacks, purchasePackage, MINUTES_BY_PRODUCT } from '@/lib/purchases';

const C = {
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  green:     '#A3FF3C',
  greenDark: '#3D8800',
  border:    'rgba(22,21,58,0.10)',
  lossRedBg: '#FEE2E2',
  lossRed:   '#DC2626',
};

interface Props {
  visible: boolean;
  isPt: boolean;
  isSubscriber: boolean; // premium ou institucional
  poolMin: number;       // minutos do pool mensal (5 ou 20)
  onSubscribe: () => void;
  onPurchased: () => void; // chamado após comprar minutos com sucesso
  onClose: () => void;
}

export function LiveVoiceLimitSheet({ visible, isPt, isSubscriber, poolMin, onSubscribe, onPurchased, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(500)).current;
  const backdrop   = useRef(new Animated.Value(0)).current;

  const [packs, setPacks]         = useState<PurchasesPackage[] | null>(null);
  const [buying, setBuying]       = useState<string | null>(null); // productId em compra
  const [purchaseErr, setErr]     = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }),
        Animated.timing(backdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      // Busca os pacotes só quando é assinante (quem compra minutos).
      if (isSubscriber) {
        setPacks(null); setErr(false);
        getMinutePacks().then(setPacks).catch(() => setPacks([]));
      }
    } else {
      translateY.setValue(500);
      backdrop.setValue(0);
      setBuying(null);
    }
  }, [visible, isSubscriber]); // eslint-disable-line react-hooks/exhaustive-deps

  const buy = async (pkg: PurchasesPackage) => {
    const productId = pkg.product.identifier;
    setBuying(productId); setErr(false);
    const res = await purchasePackage(pkg);
    setBuying(null);
    if (res.success) {
      onPurchased(); // pai atualiza o pool (grant vem via webhook) e fecha
    } else if (!res.cancelled) {
      setErr(true);
    }
  };

  const title = isPt ? 'Seus minutos acabaram' : 'You’re out of minutes';

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
            <AppText style={{ fontSize: 14, color: C.navyMid, textAlign: 'center', lineHeight: 21, marginBottom: 22 }}>
              {isSubscriber
                ? (isPt
                    ? `Você usou seus ${poolMin} minutos deste mês. Compre mais minutos para continuar conversando agora — eles não expiram no fim do mês.`
                    : `You’ve used your ${poolMin} minutes this month. Buy more minutes to keep talking now — they don’t expire at month’s end.`)
                : (isPt
                    ? `Você usou seus ${poolMin} minutos de Live Voice deste mês. Assine o Premium para ter 20 minutos por mês e continuar conversando com a Charlotte.`
                    : `You’ve used your ${poolMin} minutes of Live Voice this month. Subscribe to Premium for 20 minutes a month and keep talking with Charlotte.`)}
            </AppText>
          </View>

          {isSubscriber ? (
            <>
              {packs === null ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <ActivityIndicator color={C.greenDark} />
                </View>
              ) : packs.length === 0 ? (
                <TouchableOpacity onPress={onClose} activeOpacity={0.85}
                  style={{ backgroundColor: C.navy, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}>
                  <AppText style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
                    {isPt ? 'Entendi' : 'Got it'}
                  </AppText>
                </TouchableOpacity>
              ) : (
                packs
                  .slice()
                  .sort((a, b) => (MINUTES_BY_PRODUCT[a.product.identifier] ?? 0) - (MINUTES_BY_PRODUCT[b.product.identifier] ?? 0))
                  .map(pkg => {
                    const pid = pkg.product.identifier;
                    const mins = MINUTES_BY_PRODUCT[pid];
                    const isBuying = buying === pid;
                    return (
                      <TouchableOpacity
                        key={pid}
                        onPress={() => !buying && buy(pkg)}
                        activeOpacity={0.85}
                        disabled={!!buying}
                        style={{
                          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                          backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: C.border,
                          borderRadius: 14, paddingVertical: 16, paddingHorizontal: 18, marginBottom: 10,
                          opacity: buying && !isBuying ? 0.5 : 1,
                        }}
                      >
                        <AppText style={{ fontSize: 16, fontWeight: '800', color: C.navy }}>
                          {mins ? `+${mins} min` : pkg.product.title}
                        </AppText>
                        {isBuying
                          ? <ActivityIndicator color={C.greenDark} />
                          : <AppText style={{ fontSize: 16, fontWeight: '800', color: C.greenDark }}>{pkg.product.priceString}</AppText>}
                      </TouchableOpacity>
                    );
                  })
              )}
              {purchaseErr && (
                <AppText style={{ fontSize: 12, color: C.lossRed, textAlign: 'center', marginTop: 2, marginBottom: 6 }}>
                  {isPt ? 'Não foi possível concluir a compra. Tente de novo.' : 'Couldn’t complete the purchase. Try again.'}
                </AppText>
              )}
              <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ paddingVertical: 12, alignItems: 'center' }}>
                <AppText style={{ fontSize: 14, fontWeight: '600', color: C.navyLight }}>
                  {isPt ? 'Agora não' : 'Not now'}
                </AppText>
              </TouchableOpacity>
            </>
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
