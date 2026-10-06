import React from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { AppText } from '@/components/ui/Text';

interface SimpleXPCounterProps {
  totalXP: number;
  sessionXP?: number;
  size?: number;
  onClick?: () => void;
}

function calculateLevel(xp: number): { currentLevel: number; progressPercentage: number } {
  const currentLevel = Math.floor(Math.sqrt(xp / 50)) + 1;
  const xpForCurrentLevel = Math.pow(currentLevel - 1, 2) * 50;
  const xpForNextLevel = Math.pow(currentLevel, 2) * 50;
  const progressInLevel = xp - xpForCurrentLevel;
  const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;
  const progressPercentage = Math.min((progressInLevel / xpNeededForNextLevel) * 100, 100);
  return { currentLevel, progressPercentage };
}

export default function SimpleXPCounter({
  totalXP,
  sessionXP = 0,
  size = 36,
  onClick,
}: SimpleXPCounterProps) {
  const { currentLevel, progressPercentage } = calculateLevel(totalXP);

  const prevSessionXP = React.useRef(sessionXP);
  const floatOpacity = React.useRef(new Animated.Value(0)).current;
  const floatY = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const [floatingDelta, setFloatingDelta] = React.useState(0);

  React.useEffect(() => {
    const delta = sessionXP - prevSessionXP.current;
    if (delta > 0) {
      setFloatingDelta(delta);
      prevSessionXP.current = sessionXP;

      floatOpacity.setValue(1);
      floatY.setValue(0);

      Animated.parallel([
        Animated.timing(floatOpacity, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 28,   // floats downward — away from notch, below header
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.15, duration: 200, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [sessionXP]);

  const ringSize = size;
  const innerSize = ringSize - 4;

  return (
    <TouchableOpacity
      onPress={onClick}
      disabled={!onClick}
      activeOpacity={0.8}
      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
      style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}
    >
      {/* Floating +XP badge — translates downward so it stays below the header notch */}
      <Animated.View
        style={{
          position: 'absolute',
          top: ringSize / 2 + 4,   // starts just below the badge, animates further down
          opacity: floatOpacity,
          transform: [{ translateY: floatY }],
          zIndex: 10,
          alignItems: 'center',
        }}
        pointerEvents="none"
      >
        <View
          style={{
            backgroundColor: '#DCFF4A',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 10,
          }}
        >
          <AppText className="text-black text-xs font-bold">+{floatingDelta} XP</AppText>
        </View>
      </Animated.View>

      {/* Ring circle */}
      <Animated.View
        style={{
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          borderWidth: 2.5,
          borderColor: '#DCFF4A',
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: scaleAnim }],
        }}
      >
        <View
          style={{
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText style={{ color: '#16131F', fontWeight: '700', fontSize: 13 }}>{currentLevel}</AppText>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}
