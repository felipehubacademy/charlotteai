// SplashOverlay — cobre a tela com o splash.png (Charlotte) + spinner
// enquanto a auth carrega e o AuthGuard decide pra qual rota navegar.
// Some com fade quando `ready=true`, garantindo transicao suave entre
// boot e tela final (sem flash).
//
// OTA-safe (puro JS). A native splash em app.config.ts continua
// apontando pra splash-bg.png; trocar pra splash.png exige rebuild
// nativo — entao por ora pode aparecer ~200-500ms de lavanda da
// native splash antes desse overlay assumir.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, ActivityIndicator, View, StyleSheet, Image } from 'react-native';

interface Props {
  /** true quando profile/auth/consent estao prontos e a tela final pode aparecer */
  ready: boolean;
}

// Tempo minimo que o splash fica visivel, mesmo quando o profile carrega
// quase instantaneo. Garante que o usuario VEJA o splash da Charlotte
// em vez de um piscar de 50ms (padrao Duolingo).
const MIN_VISIBLE_MS = 1200;

export function SplashOverlay({ ready }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;
  const mountedAt = useRef(Date.now());
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    if (!ready) return;
    const elapsed = Date.now() - mountedAt.current;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
    const t = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }, remaining);
    return () => clearTimeout(t);
  }, [ready, opacity]);

  if (!mounted) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { opacity, zIndex: 9999 }]}
    >
      <Image
        source={require('@/assets/splash.png')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      <View style={{ position: 'absolute', bottom: '14%', left: 0, right: 0, alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    </Animated.View>
  );
}
