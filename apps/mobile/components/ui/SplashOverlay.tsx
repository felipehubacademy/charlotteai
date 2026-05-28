// SplashOverlay — cobre a tela com splash.png (Charlotte) + spinner por
// 1200ms minimo. Fade out depois. OTA-safe (puro JS).

import React, { useEffect, useRef, useState } from 'react';
import { Animated, ActivityIndicator, View, StyleSheet, Image } from 'react-native';

const MIN_VISIBLE_MS = 3000;

export function SplashOverlay() {
  const opacity = useRef(new Animated.Value(1)).current;
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }, MIN_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [opacity]);

  if (!mounted) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        { opacity, zIndex: 9999, backgroundColor: '#F4F3FA', alignItems: 'center', justifyContent: 'center' },
      ]}
    >
      <Image
        source={require('@/assets/splash.png')}
        style={{ width: '100%', height: '100%' }}
        resizeMode="contain"
      />
      <View style={{ position: 'absolute', bottom: '32%', left: 0, right: 0, alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#9896B8" />
      </View>
    </Animated.View>
  );
}
