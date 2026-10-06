/**
 * AnimatedXPBadge
 *
 * Drop-in replacement for the static XP pill in headers.
 * - Snaps to initial DB value without animation (no false "+N XP" on mount)
 * - Count-up animation when xp genuinely increases during session
 * - Scale pulse on gain
 * - Registers its screen position so XPToastProvider can fly the toast here
 * - Triggers floating "+N XP" toast via XPToastProvider context
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View, StyleSheet } from 'react-native';
import { Lightning } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { useXPToast } from '@/components/ui/XPToastProvider';

const GREEN_DARK  = '#5C7300';
const NAVY_LIGHT  = '#8A8494';
const GREEN_BG    = 'rgba(92,115,0,0.10)';
const INACTIVE_BG = 'rgba(22,19,31,0.05)';

interface AnimatedXPBadgeProps {
  xp: number;
  iconSize?: number;
  fontSize?: number;
  padH?: number;
  padV?: number;
}

export default function AnimatedXPBadge({
  xp,
  iconSize = 13,
  fontSize = 12,
  padH = 8,
  padV = 4,
}: AnimatedXPBadgeProps) {
  const { triggerToast, registerBadge } = useXPToast();

  const prevXP          = useRef(xp);
  const isInitialLoad   = useRef(true);   // true until DB value has been received
  const initTimerRef    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [displayXP, setDisplayXP] = useState(xp);
  const animValue       = useRef(new Animated.Value(xp)).current;
  const scaleAnim       = useRef(new Animated.Value(1)).current;
  const listenerRef     = useRef<string | null>(null);
  const badgeRef        = useRef<View>(null);

  // ── Register badge position for XPToast flyTo ────────────────────────────
  const handleLayout = () => {
    // Small delay so the layout has fully settled
    setTimeout(() => {
      (badgeRef.current as any)?.measureInWindow(
        (x: number, y: number, width: number, height: number) => {
          registerBadge(x + width / 2, y + height / 2);
        },
      );
    }, 150);
  };

  // ── After 2s, mark DB load done regardless (handles 0-XP new users) ────────
  useEffect(() => {
    initTimerRef.current = setTimeout(() => {
      isInitialLoad.current = false;
    }, 2000);
    return () => {
      if (initTimerRef.current) clearTimeout(initTimerRef.current);
    };
  }, []);

  // ── XP change handler ─────────────────────────────────────────────────────
  useEffect(() => {
    const delta = xp - prevXP.current;

    if (delta <= 0) {
      // Snap (reset or no change) — do NOT clear isInitialLoad here
      prevXP.current = xp;
      animValue.setValue(xp);
      setDisplayXP(xp);
      return;
    }

    prevXP.current = xp;

    // First positive delta after mount = DB value arriving — snap silently
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      if (initTimerRef.current) clearTimeout(initTimerRef.current);
      animValue.setValue(xp);
      setDisplayXP(xp);
      return;
    }

    // Real XP gain during session — animate + toast
    if (listenerRef.current) {
      animValue.removeListener(listenerRef.current);
      listenerRef.current = null;
    }

    listenerRef.current = animValue.addListener(({ value }) => {
      setDisplayXP(Math.round(value));
    });

    Animated.timing(animValue, {
      toValue: xp,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      if (listenerRef.current) {
        animValue.removeListener(listenerRef.current);
        listenerRef.current = null;
      }
      setDisplayXP(xp);
    });

    // Scale pulse
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.2, duration: 150, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, speed: 20, bounciness: 8, useNativeDriver: true }),
    ]).start();

    // Trigger toast to fly toward this badge
    triggerToast(delta);

    return () => {
      if (listenerRef.current) {
        animValue.removeListener(listenerRef.current);
        listenerRef.current = null;
      }
    };
  }, [xp]);

  // ── Render ────────────────────────────────────────────────────────────────
  const isActive = displayXP > 0;
  const color    = isActive ? GREEN_DARK  : NAVY_LIGHT;
  const bg       = isActive ? GREEN_BG    : INACTIVE_BG;

  return (
    <Animated.View
      ref={badgeRef as any}
      onLayout={handleLayout}
      style={[
        styles.pill,
        {
          backgroundColor: bg,
          paddingHorizontal: padH,
          paddingVertical: padV,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Lightning size={iconSize} color={color} weight="fill" />
      <AppText style={{ fontSize, fontWeight: '800', color }}>
        {displayXP.toLocaleString()}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
  },
});
