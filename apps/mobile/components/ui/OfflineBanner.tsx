import { View, Animated, useAnimatedValue } from 'react-native';
import { useEffect } from 'react';
import { WifiSlash } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/Text';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAuth } from '@/hooks/useAuth';

export function OfflineBanner() {
  const isOnline = useNetworkStatus();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const translateY = useAnimatedValue(-60);
  const isPt = (profile?.charlotte_level ?? 'Novice') === 'Novice';

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isOnline ? -60 : 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [isOnline]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        // Piso de 52pt (+8 = 60pt): se o inset vier 0 por algum motivo, o banner
        // ainda cai abaixo da Dynamic Island (~59pt) / notch. Quando o inset é
        // correto (ex.: 62 no 17 Pro Max) ele prevalece.
        position: 'absolute',
        top: Math.max(insets.top, 52) + 8,
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
