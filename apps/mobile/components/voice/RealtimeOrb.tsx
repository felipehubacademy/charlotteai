import React from 'react';
import { View, Animated } from 'react-native';

type OrbStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface RealtimeOrbProps {
  status: OrbStatus;
  size?: number;
}

const STATUS_COLORS: Record<OrbStatus, { core: string; ring: string; glow: string }> = {
  disconnected: { core: 'rgba(220,255,74,0.08)', ring: 'rgba(220,255,74,0.3)', glow: 'rgba(220,255,74,0.15)' },
  connecting:   { core: 'rgba(255,165,0,0.15)',  ring: 'rgba(255,165,0,0.4)',  glow: 'rgba(255,165,0,0.2)' },
  connected:    { core: 'rgba(220,255,74,0.2)',  ring: 'rgba(220,255,74,0.6)', glow: 'rgba(220,255,74,0.3)' },
  error:        { core: 'rgba(239,68,68,0.15)',  ring: 'rgba(239,68,68,0.5)', glow: 'rgba(239,68,68,0.2)' },
};

// Particle positions — 8 particles distributed around the orb
const PARTICLES = [0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => ({
  angle,
  delay: i * 120,
  radius: 0.65 + (i % 3) * 0.08,
  scale: 0.4 + (i % 4) * 0.15,
}));

export default function RealtimeOrb({ status, size = 112 }: RealtimeOrbProps) {
  const colors = STATUS_COLORS[status];
  const isActive = status === 'connected' || status === 'connecting';

  // Core pulse
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  // Glow ring fade
  const glowAnim = React.useRef(new Animated.Value(0.4)).current;
  // Particle anims
  const particleAnims = React.useRef(
    PARTICLES.map(() => new Animated.Value(0))
  ).current;

  React.useEffect(() => {
    if (isActive) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      );
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      glow.start();

      const particleLoops = particleAnims.map((anim, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(PARTICLES[i].delay),
            Animated.timing(anim, { toValue: 1, duration: 1200, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: true }),
          ])
        )
      );
      particleLoops.forEach(a => a.start());

      return () => {
        pulse.stop();
        glow.stop();
        particleLoops.forEach(a => a.stop());
      };
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0.4);
      particleAnims.forEach(a => a.setValue(0));
    }
  }, [isActive, status]);

  const half = size / 2;
  const coreSize = size * 0.56;
  const ringSize = size * 0.82;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer glow ring */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: half,
          backgroundColor: colors.glow,
          opacity: glowAnim,
        }}
      />

      {/* Middle ring */}
      <View
        style={{
          position: 'absolute',
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          borderWidth: 1.5,
          borderColor: colors.ring,
          backgroundColor: 'transparent',
        }}
      />

      {/* Particles */}
      {PARTICLES.map((p, i) => {
        const rad = (p.angle * Math.PI) / 180;
        const dist = half * p.radius;
        const tx = Math.cos(rad) * dist;
        const ty = Math.sin(rad) * dist;
        const dotSize = 4 * p.scale;

        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: status === 'connecting' ? '#FFA500' : '#DCFF4A',
              opacity: isActive ? particleAnims[i] : 0,
              transform: [{ translateX: tx }, { translateY: ty }],
            }}
          />
        );
      })}

      {/* Core orb */}
      <Animated.View
        style={{
          width: coreSize,
          height: coreSize,
          borderRadius: coreSize / 2,
          backgroundColor: colors.core,
          borderWidth: 2,
          borderColor: colors.ring,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pulseAnim }],
        }}
      />
    </View>
  );
}
