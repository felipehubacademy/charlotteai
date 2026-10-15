// components/trail/TrackHostReaction.tsx — o anfitrião da trilha extra (ex.: Igorfina) ao lado do
// exercício, no lugar da Charlotte animada. Ainda não temos as animações dele: usamos o avatar,
// que pula quando o aluno acerta e balança quando erra.
import React, { useEffect, useRef } from 'react';
import { Animated, Image, View } from 'react-native';
import { characterInfo } from '@/lib/characters';
import { LEVEL_VIVID } from '@/lib/levelColors';

export function TrackHostReaction({ character, trackId, size, mood }: {
  character: string; trackId: string; size: number; mood: 'idle' | 'cheer' | 'error';
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (mood === 'cheer') {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.14, useNativeDriver: true, speed: 30, bounciness: 14 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }),
      ]).start();
    } else if (mood === 'error') {
      Animated.sequence([-8, 8, -6, 6, 0].map(v =>
        Animated.timing(shift, { toValue: v, duration: 55, useNativeDriver: true }),
      )).start();
    }
  }, [mood, scale, shift]);

  const c = characterInfo(character);
  return (
    <View style={{ width: size + 8, height: size + 8, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{
        transform: [{ scale }, { translateX: shift }],
        padding: 3, borderRadius: (size + 6) / 2, borderWidth: 3, borderColor: LEVEL_VIVID[trackId] ?? '#F59E0B',
      }}>
        <Image source={c.avatar} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#16131F' }} resizeMode="cover" />
      </Animated.View>
    </View>
  );
}
