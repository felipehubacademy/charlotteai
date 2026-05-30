// components/trail/LevelDropdown.tsx
// Chip "Novice ▾" no hero. Tap abre popover ancorado abaixo do chip
// com 3 niveis (Novice / Inter / Advanced). Niveis > current_level
// aparecem com cadeado e ao tap mostram toast inline ("Complete o nivel
// atual pra desbloquear"). Selecao trava o nivel ativo do trail.
//
// Implementado com Modal transparente + posicionamento manual via
// onLayout do chip — sem dependencias extras, sem remontar o hero.

import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Modal, Pressable, Platform, LayoutChangeEvent, Animated } from 'react-native';
import { CaretDown, Lock } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import type { Level } from '@/lib/curriculum-v2/types';

const LEVEL_SHORT: Record<Level, string> = {
  Novice:   'Novice',
  Inter:    'Inter',
  Advanced: 'Advanced',
};

const LEVEL_COLOR: Record<Level, string> = {
  Novice:   '#D97706',
  Inter:    '#7C3AED',
  Advanced: '#0F766E',
};

const LEVELS: Level[] = ['Novice', 'Inter', 'Advanced'];

const C = {
  card:     '#FFFFFF',
  navy:     '#16153A',
  navyDim:  '#9896B8',
  border:   'rgba(22,21,58,0.08)',
  divider:  'rgba(22,21,58,0.06)',
  lockBg:   'rgba(22,21,58,0.06)',
  shadow:   'rgba(22,21,58,0.35)',
  backdrop: 'rgba(0,0,0,0.18)',
};

const shadow = Platform.select({
  ios:     { shadowColor: C.shadow, shadowOpacity: 1, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
  android: { elevation: 16 },
});

interface Props {
  selectedLevel: Level;
  currentLevel:  Level;       // perfil — limita o que esta liberado
  onSelect:      (level: Level) => void;
}

const LEVEL_ORDER: Record<Level, number> = { Novice: 0, Inter: 1, Advanced: 2 };

export function LevelDropdown({ selectedLevel, currentLevel, onSelect }: Props) {
  const [open, setOpen]         = useState(false);
  const [anchor, setAnchor]     = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [lockedToast, setLockedToast] = useState<Level | null>(null);
  const toastAnim                = useRef(new Animated.Value(0)).current;
  const chipRef                  = useRef<View>(null);
  const accent                   = LEVEL_COLOR[selectedLevel];

  function openMenu() {
    chipRef.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ x, y, w, h });
      setOpen(true);
    });
  }

  function pick(level: Level) {
    const isLocked = LEVEL_ORDER[level] > LEVEL_ORDER[currentLevel];
    if (isLocked) {
      setLockedToast(level);
      Animated.sequence([
        Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.delay(1600),
        Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => setLockedToast(null));
      return;
    }
    setOpen(false);
    if (level !== selectedLevel) onSelect(level);
  }

  return (
    <>
      <TouchableOpacity
        ref={chipRef as any}
        onPress={openMenu}
        activeOpacity={0.7}
        style={{
          flexDirection:    'row',
          alignItems:       'center',
          gap:              4,
          backgroundColor:  `${accent}14`,
          borderRadius:     14,
          paddingHorizontal:10,
          paddingVertical:  6,
        }}>
        <AppText style={{ fontSize: 13, fontWeight: '800', color: accent }}>
          {LEVEL_SHORT[selectedLevel]}
        </AppText>
        <CaretDown size={12} color={accent} weight="bold" />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: C.backdrop }}
          onPress={() => setOpen(false)}
        >
          {anchor && (() => {
            const MENU_W = 220;
            const menuLeft = Math.max(12, Math.min(anchor.x + anchor.w - MENU_W, 9999));
            const caretLeft = anchor.x + anchor.w / 2 - 7 - menuLeft;
            return (
              <>
                {/* Caret triangle apontando pro chip */}
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top:      anchor.y + anchor.h + 0,
                    left:     menuLeft + Math.max(8, Math.min(caretLeft, MENU_W - 22)),
                    width:    0, height: 0,
                    borderLeftWidth:   7, borderRightWidth: 7, borderBottomWidth: 8,
                    borderLeftColor:   'transparent', borderRightColor: 'transparent',
                    borderBottomColor: C.card,
                    zIndex:   2,
                  }}
                />
                {/* Container posicionado: menu + toast como flex column.
                    Toast aparece imediatamente abaixo do menu, sem calc manual. */}
                <View
                  style={{
                    position: 'absolute',
                    top:      anchor.y + anchor.h + 8,
                    left:     menuLeft,
                    width:    MENU_W,
                    gap:      8,
                  }}>
                  <View
                    style={[{
                      backgroundColor: C.card,
                      borderRadius:    18,
                      paddingVertical: 8,
                      borderWidth:     1,
                      borderColor:     C.border,
                    }, shadow as any]}>
                    {LEVELS.map((lvl, i) => {
                      const isLocked = LEVEL_ORDER[lvl] > LEVEL_ORDER[currentLevel];
                      const isActive = lvl === selectedLevel;
                      const color    = LEVEL_COLOR[lvl];
                      return (
                        <React.Fragment key={lvl}>
                          {i > 0 && <View style={{ height: 1, backgroundColor: C.divider, marginHorizontal: 18 }} />}
                          <Pressable
                            onPress={() => pick(lvl)}
                            style={({ pressed }) => ({
                              flexDirection:    'row',
                              alignItems:       'center',
                              justifyContent:   'space-between',
                              paddingHorizontal:22,
                              paddingVertical:  14,
                              backgroundColor:  pressed && !isLocked ? `${color}12` : 'transparent',
                              opacity:          isLocked ? 0.7 : 1,
                            })}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
                              {isActive && (
                                <View style={{
                                  width: 8, height: 8, borderRadius: 4,
                                  backgroundColor: color,
                                  marginRight: 12,
                                }} />
                              )}
                              <AppText
                                numberOfLines={1}
                                style={{
                                  fontSize:   15,
                                  fontWeight: isActive ? '900' : '700',
                                  color:      isLocked ? C.navyDim : color,
                                }}>
                                {LEVEL_SHORT[lvl]}
                              </AppText>
                            </View>
                            {isLocked && (
                              <View style={{
                                width: 22, height: 22, borderRadius: 11,
                                backgroundColor: C.lockBg,
                                alignItems: 'center', justifyContent: 'center',
                                marginLeft: 12,
                              }}>
                                <Lock size={11} color={C.navyDim} weight="fill" />
                              </View>
                            )}
                          </Pressable>
                        </React.Fragment>
                      );
                    })}
                  </View>

                  {lockedToast && (
                    <Animated.View
                      pointerEvents="none"
                      style={{
                        opacity:  toastAnim,
                        transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-4, 0] }) }],
                        paddingHorizontal: 14,
                        paddingVertical:   11,
                        backgroundColor:   C.navy,
                        borderRadius:      12,
                      }}>
                      <AppText style={{ fontSize: 13, color: '#fff', fontWeight: '600', textAlign: 'center' }}>
                        Complete o nível atual pra desbloquear
                      </AppText>
                    </Animated.View>
                  )}
                </View>
              </>
            );
          })()}
        </Pressable>
      </Modal>
    </>
  );
}
