/**
 * XPToastProvider
 *
 * Renders a "+N XP" pill that flies from the center of the screen toward
 * the registered XP badge position (the counter in the header), as if
 * being absorbed by the badge.
 *
 * Usage:
 *   const { triggerToast, registerBadge } = useXPToast();
 *   triggerToast(10);        // show "+10 XP" flying toward badge
 *   registerBadge(x, y);    // called by AnimatedXPBadge on layout
 */
import React, {
  createContext, useCallback, useContext,
  useRef, useState,
} from 'react';
import {
  Animated, Easing, View, StyleSheet, Dimensions,
} from 'react-native';
import { Lightning } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Context ────────────────────────────────────────────────────────────────
interface XPToastContextValue {
  triggerToast:   (delta: number) => void;
  registerBadge:  (x: number, y: number) => void;
}

const XPToastContext = createContext<XPToastContextValue>({
  triggerToast:  () => {},
  registerBadge: () => {},
});

export function useXPToast() {
  return useContext(XPToastContext);
}

// ── Provider ───────────────────────────────────────────────────────────────
export function XPToastProvider({ children }: { children: React.ReactNode }) {
  const insets        = useSafeAreaInsets();
  const [delta, setDelta]     = useState(0);
  const [visible, setVisible] = useState(false);

  // Badge center registered by AnimatedXPBadge via onLayout + measureInWindow
  const badgePosRef = useRef<{ x: number; y: number } | null>(null);

  // Toast starts here (vertically centered, horizontally centered)
  const startLeft = SCREEN_W / 2 - 48;
  const startTop  = SCREEN_H * 0.22;

  // Animated values
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale      = useRef(new Animated.Value(1)).current;
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registerBadge = useCallback((x: number, y: number) => {
    badgePosRef.current = { x, y };
  }, []);

  const triggerToast = useCallback((amount: number) => {
    if (amount <= 0) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    setDelta(amount);
    setVisible(true);

    // Reset
    opacity.setValue(1);
    translateX.setValue(0);
    translateY.setValue(0);
    scale.setValue(1);

    // Destination: registered badge center, or fallback top-right
    const destX = badgePosRef.current
      ? badgePosRef.current.x - startLeft - 48   // offset to badge center
      : SCREEN_W * 0.55;
    const destY = badgePosRef.current
      ? badgePosRef.current.y - startTop - 10
      : -(SCREEN_H * 0.28);

    // Hold briefly, then fly toward badge and shrink/fade
    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: destX,
          duration: 550,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: destY,
          duration: 550,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.3,
          duration: 550,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 550,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => setVisible(false));
    }, 600);
  }, [opacity, translateX, translateY, scale, startLeft, startTop]);

  return (
    <XPToastContext.Provider value={{ triggerToast, registerBadge }}>
      {children}

      {visible && (
        <View pointerEvents="none" style={[styles.overlay, { top: startTop, left: startLeft }]}>
          <Animated.View
            style={[
              styles.pill,
              { opacity, transform: [{ translateX }, { translateY }, { scale }] },
            ]}
          >
            <Lightning size={15} color="#FFFFFF" weight="fill" />
            <AppText style={styles.label}>+{delta} XP</AppText>
          </Animated.View>
        </View>
      )}
    </XPToastContext.Provider>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    zIndex: 9999,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#08804A',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 10,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
