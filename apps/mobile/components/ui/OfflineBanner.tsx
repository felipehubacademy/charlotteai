import { View, Animated, useAnimatedValue } from 'react-native';
import { useEffect } from 'react';
import { WifiSlash } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/Text';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { systemIsPt } from '@/lib/systemLang';

export function OfflineBanner() {
  const isOnline = useNetworkStatus();
  const insets = useSafeAreaInsets();
  // Aviso de sistema: idioma segue o device.
  const isPt = systemIsPt;

  // Posição de repouso (visível): abaixo da Dynamic Island/notch. Piso de 52pt
  // caso o inset venha 0.
  const topOffset = Math.max(insets.top, 52) + 8;
  // Posição escondida: sobe o SUFICIENTE pra sair inteiro da tela (topo + altura
  // do banner + folga). O antigo -60 era menor que o topOffset, então o banner
  // só encostava atrás do notch em vez de sumir.
  const HIDDEN = -(topOffset + 56);
  const translateY = useAnimatedValue(HIDDEN);

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isOnline ? HIDDEN : 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [isOnline, HIDDEN]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: topOffset,
        left: 0,
        right: 0,
        zIndex: 9999,
        alignItems: 'center',
        transform: [{ translateY }],
      }}
    >
      <View style={{
        backgroundColor: 'rgba(30,27,60,0.92)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
      }}>
        <WifiSlash size={14} color="#F87171" weight="fill" />
        <AppText style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
          {isPt ? 'Sem conexão com a internet' : 'No internet connection'}
        </AppText>
      </View>
    </Animated.View>
  );
}
