// components/ui/Confetti.tsx — chuva de confete OTA-safe (Animated puro, sem módulo nativo).
// Usada na promoção de nível e na liderança do ranking.
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Animated, Dimensions, Easing } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const CONFETTI_COLORS = ['#DCFF4A', '#FF4F8B', '#2BD97C', '#6B4BFF', '#16131F', '#FFFFFF'];
const CONFETTI_COUNT  = 220;

interface Piece {
  startX: number;
  delay:  number;
  drift:  number;
  rot:    number;
  color:  string;
  size:   number;
  dur:    number;
}

function makePieces(): Piece[] {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    startX: Math.random() * SCREEN_W,
    // Stagger longo (0-1800ms): cortina continua caindo por mais tempo
    // em vez de burst simultaneo. Densidade visual no momento permanece
    // similar — sao apenas mais pecas espalhadas no tempo.
    delay:  Math.random() * 1800,
    drift:  (Math.random() - 0.5) * 260,
    rot:    Math.random() * 720 - 360,
    color:  CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size:   6 + Math.floor(Math.random() * 8),
    dur:    2800 + Math.random() * 1400,
  }));
}

export function Confetti() {
  const pieces = useMemo(makePieces, []);
  const progress = useRef(pieces.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Burst simultaneo: roda todas em paralelo (sem stagger). delay
    // individual ja eh pequeno (0-120ms) pra ter variacao natural.
    Animated.parallel(
      progress.map((v, i) =>
        Animated.timing(v, {
          toValue: 1,
          duration: pieces[i].dur,
          delay: pieces[i].delay,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, []);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {pieces.map((p, i) => {
        const translateY = progress[i].interpolate({
          inputRange: [0, 1],
          outputRange: [-40, SCREEN_H + 40],
        });
        const translateX = progress[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0, p.drift],
        });
        const rotate = progress[i].interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${p.rot}deg`],
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              top: 0,
              left: p.startX,
              width: p.size,
              height: p.size * 0.6,
              backgroundColor: p.color,
              borderRadius: 2,
              transform: [{ translateY }, { translateX }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}

