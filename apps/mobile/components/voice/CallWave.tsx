import React from 'react';
import { View, Animated } from 'react-native';

export type WaveState = 'idle' | 'connecting' | 'listening' | 'speaking';

interface CallWaveProps {
  state: WaveState;
}

const BAR_COUNT = 7;
const BAR_HEIGHTS = [28, 36, 44, 52, 44, 36, 28]; // natural arch shape

export default function CallWave({ state }: CallWaveProps) {
  const barAnims = React.useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.1))
  ).current;
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (state === 'idle') {
      barAnims.forEach(a =>
        Animated.timing(a, { toValue: 0.08, duration: 400, useNativeDriver: true }).start()
      );
      return;
    }

    const configs: Record<Exclude<WaveState, 'idle'>, { min: number; max: number; ms: number }> = {
      connecting: { min: 0.08, max: 0.3,  ms: 500 },
      listening:  { min: 0.2,  max: 0.85, ms: 110 },
      speaking:   { min: 0.35, max: 1.0,  ms: 80  },
    };

    const { min, max, ms } = configs[state as Exclude<WaveState, 'idle'>];

    const animate = () => {
      barAnims.forEach(anim => {
        Animated.timing(anim, {
          toValue: min + Math.random() * (max - min),
          duration: ms * 0.9,
          useNativeDriver: true,
        }).start();
      });
    };

    animate();
    intervalRef.current = setInterval(animate, ms);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state]);

  const color = state === 'connecting' ? '#FF4F8B' : '#DCFF4A';
  const opacity = state === 'idle' ? 0.18 : 0.85;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 56 }}>
      {barAnims.map((anim, i) => (
        <Animated.View
          key={i}
          style={{
            width: 4,
            height: BAR_HEIGHTS[i],
            borderRadius: 3,
            backgroundColor: color,
            opacity,
            transform: [{ scaleY: anim }],
          }}
        />
      ))}
    </View>
  );
}
