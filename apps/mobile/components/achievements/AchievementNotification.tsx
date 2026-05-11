import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  Animated,
  Platform,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Lightning, Star, Trophy, Fire, Medal, Confetti,
} from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { Achievement } from '@/lib/types/achievement';
import { soundEngine, SoundName } from '@/lib/soundEngine';
import { voiceSFX } from '@/lib/voiceSFX';
import { shareAchievement } from '@/lib/shareUtils';
import { GENERAL_ACHIEVEMENTS, LEVEL_ACHIEVEMENTS } from '@/lib/achievementsCatalog';
import { ShareNetwork } from 'phosphor-react-native';

const ALL_CATALOG = [...GENERAL_ACHIEVEMENTS, ...LEVEL_ACHIEVEMENTS];
function getCatalogTitle(code: string, isPt: boolean): string | undefined {
  const entry = ALL_CATALOG.find(e => e.code === code);
  if (!entry) return undefined;
  return isPt ? entry.title : (entry.titleEN ?? entry.title);
}

function achievementSound(rarity: Achievement['rarity']): SoundName {
  switch (rarity) {
    case 'legendary': return 'achievement_legendary';
    case 'epic':      return 'achievement_epic';
    case 'rare':      return 'achievement_rare';
    default:          return 'achievement_common';
  }
}

async function achievementHaptic(rarity: Achievement['rarity']): Promise<void> {
  switch (rarity) {
    case 'legendary':
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await new Promise(r => setTimeout(r, 80));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await new Promise(r => setTimeout(r, 80));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case 'epic':
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await new Promise(r => setTimeout(r, 100));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case 'rare':
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    default:
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

const C = {
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  green:     '#A3FF3C',
  greenDark: '#3D8800',
  greenBg:   '#F0FFD9',
  sheet:     '#FFFFFF',
  border:    'rgba(22,21,58,0.08)',
};

const RARITY_COLORS: Record<Achievement['rarity'], string> = {
  common:    '#22C55E',
  rare:      '#3B82F6',
  epic:      '#A855F7',
  legendary: '#EAB308',
};

const RARITY_BG: Record<Achievement['rarity'], string> = {
  common:    '#F0FFF4',
  rare:      '#EFF6FF',
  epic:      '#FAF5FF',
  legendary: '#FFFBEB',
};

// ── Sparkle particles — varied angles, distances, sizes, shapes ──────────────
const SPARKLES = [
  { angle: 0,    dist: 92,  size: 10, diamond: false },
  { angle: 30,   dist: 76,  size: 6,  diamond: true  },
  { angle: 60,   dist: 88,  size: 8,  diamond: false },
  { angle: 90,   dist: 96,  size: 10, diamond: false },
  { angle: 120,  dist: 72,  size: 6,  diamond: true  },
  { angle: 150,  dist: 84,  size: 8,  diamond: false },
  { angle: 180,  dist: 92,  size: 10, diamond: false },
  { angle: 210,  dist: 76,  size: 6,  diamond: true  },
  { angle: 240,  dist: 88,  size: 8,  diamond: false },
  { angle: 270,  dist: 96,  size: 10, diamond: false },
  { angle: 300,  dist: 72,  size: 6,  diamond: true  },
  { angle: 330,  dist: 84,  size: 8,  diamond: false },
];

function SparkleRing({ color, anim }: { color: string; anim: Animated.Value }) {
  return (
    <>
      {SPARKLES.map((s, i) => {
        const rad = (s.angle * Math.PI) / 180;
        const x = Math.cos(rad) * s.dist;
        const y = Math.sin(rad) * s.dist;
        const delay = (i % 3) * 60;
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: s.size,
              height: s.size,
              borderRadius: s.diamond ? 0 : s.size / 2,
              backgroundColor: i % 4 === 0 ? C.green : color,
              transform: [
                {
                  translateX: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, x],
                  }),
                },
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, y],
                  }),
                },
                {
                  rotate: s.diamond ? '45deg' : '0deg',
                },
                {
                  scale: anim.interpolate({
                    inputRange: [0, 0.25, 0.65, 1],
                    outputRange: [0, 1.5, 1.2, 0],
                  }),
                },
              ],
              opacity: anim.interpolate({
                inputRange: [0, 0.15, 0.75, 1],
                outputRange: [0, 1, 1, 0],
              }),
            }}
          />
        );
      })}
    </>
  );
}

function RarityIcon({ rarity, size = 44 }: { rarity: Achievement['rarity']; size?: number }) {
  const color = RARITY_COLORS[rarity];
  switch (rarity) {
    case 'legendary': return <Trophy    size={size} color={color} weight="fill" />;
    case 'epic':      return <Fire      size={size} color={color} weight="fill" />;
    case 'rare':      return <Medal     size={size} color={color} weight="fill" />;
    default:          return <Lightning size={size} color={color} weight="fill" />;
  }
}

interface Props {
  achievements: Achievement[];
  onDismiss: (id: string) => void;
  isPt?: boolean;
}

export default function AchievementNotification({ achievements, onDismiss, isPt = true }: Props) {
  const current = achievements[0];
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(320, width * 0.88);

  const backdropAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim   = React.useRef(new Animated.Value(0)).current;
  const sparkAnim   = React.useRef(new Animated.Value(0)).current;
  const glowAnim    = React.useRef(new Animated.Value(1)).current;
  const autoDismissRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!current) return;

    backdropAnim.setValue(0);
    scaleAnim.setValue(0);
    sparkAnim.setValue(0);
    glowAnim.setValue(1);

    soundEngine.play(achievementSound(current.rarity)).catch(() => {});
    achievementHaptic(current.rarity).catch(() => {});

    // Tier 4 — voz da Charlotte para conquistas de alto impacto.
    // Delays alinhados com a duracao do SFX musical para nao colidir.
    if (current.rarity === 'epic') {
      setTimeout(() => voiceSFX.play('achievement_epic').catch(() => {}), 1900); // SFX ~1.8s
    } else if (current.rarity === 'legendary') {
      setTimeout(() => voiceSFX.play('achievement_legendary').catch(() => {}), 2300); // SFX ~2.2s
    }

    // Backdrop fades in first (120ms), then card bounces in with overshoot
    Animated.timing(backdropAnim, { toValue: 1, duration: 120, useNativeDriver: true }).start(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        stiffness: 260,
        damping: 14,
        mass: 0.9,
        useNativeDriver: true,
      }).start(() => {
        Animated.timing(sparkAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1.14, duration: 550, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 1,    duration: 550, useNativeDriver: true }),
          ])
        ).start();
      });
    });

    autoDismissRef.current = setTimeout(() => handleDismiss(), 8000);
    return () => {
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    };
  }, [current?.id]);

  if (!current) return null;

  const rarityColor = RARITY_COLORS[current.rarity];
  const rarityBg    = RARITY_BG[current.rarity];

  const handleDismiss = () => {
    if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(scaleAnim,    { toValue: 0.82, duration: 180, useNativeDriver: true }),
    ]).start(() => onDismiss(current.id));
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={handleDismiss}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(22,21,58,0.78)',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: backdropAnim,
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleDismiss}
          style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}
        >
          <Animated.View
            style={{
              transform: [{ scale: scaleAnim }],
              alignItems: 'center',
            }}
          >
            {/* Card */}
            <View
              style={{
                backgroundColor: C.sheet,
                borderRadius: 28,
                paddingHorizontal: 28,
                paddingTop: 40,
                paddingBottom: 32,
                alignItems: 'center',
                width: cardWidth,
                ...Platform.select({
                  ios: {
                    borderWidth: 0,
                    shadowColor: rarityColor,
                    shadowOpacity: 0.30,
                    shadowRadius: 28,
                    shadowOffset: { width: 0, height: 10 },
                  },
                  android: {
                    elevation: 16,
                    borderWidth: 2,
                    borderColor: `${rarityColor}50`,
                  },
                }),
              }}
            >
              {/* "Achievement Unlocked" label */}
              <View style={{
                backgroundColor: rarityBg,
                paddingHorizontal: 14, paddingVertical: 5,
                borderRadius: 20, marginBottom: 24,
                borderWidth: 1, borderColor: `${rarityColor}25`,
              }}>
                <AppText style={{
                  color: rarityColor, fontSize: 11, fontWeight: '800',
                  letterSpacing: 1.2, textTransform: 'uppercase',
                }}>
                  {isPt ? 'Conquista Desbloqueada' : 'Achievement Unlocked'}
                </AppText>
              </View>

              {/* Icon with sparkles */}
              <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <SparkleRing color={rarityColor} anim={sparkAnim} />
                <Animated.View
                  style={{
                    width: 92,
                    height: 92,
                    borderRadius: 26,
                    backgroundColor: rarityBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: `${rarityColor}45`,
                    transform: [{ scale: glowAnim }],
                    ...Platform.select({
                      ios: {
                        shadowColor: rarityColor,
                        shadowOpacity: 0.35,
                        shadowRadius: 14,
                        shadowOffset: { width: 0, height: 4 },
                      },
                    }),
                  }}
                >
                  <RarityIcon rarity={current.rarity} size={46} />
                </Animated.View>
              </View>

              {/* Title */}
              <AppText style={{
                color: C.navy, fontSize: 22, fontWeight: '900',
                textAlign: 'center', marginBottom: 8,
              }}>
                {getCatalogTitle(current.type, isPt ?? true) ?? current.title}
              </AppText>

              {/* Description */}
              <AppText style={{
                color: C.navyMid, fontSize: 14, textAlign: 'center',
                lineHeight: 21, marginBottom: 20,
              }}>
                {current.description}
              </AppText>

              {/* Rarity + XP bonus row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 }}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 12, paddingVertical: 6,
                  borderRadius: 20, backgroundColor: rarityBg,
                  borderWidth: 1, borderColor: `${rarityColor}30`,
                }}>
                  <Star size={12} color={rarityColor} weight="fill" />
                  <AppText style={{
                    color: rarityColor, fontSize: 12, fontWeight: '800',
                    textTransform: 'uppercase', letterSpacing: 0.8,
                  }}>
                    {current.rarity}
                  </AppText>
                </View>
                {current.xpBonus > 0 && (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    paddingHorizontal: 12, paddingVertical: 6,
                    borderRadius: 20, backgroundColor: C.greenBg,
                    borderWidth: 1, borderColor: `${C.green}60`,
                  }}>
                    <Lightning size={12} color={C.greenDark} weight="fill" />
                    <AppText style={{ color: C.greenDark, fontSize: 12, fontWeight: '800' }}>
                      +{current.xpBonus} XP
                    </AppText>
                  </View>
                )}
              </View>

              {/* Action buttons */}
              <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                <TouchableOpacity
                  onPress={handleDismiss}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    backgroundColor: C.green,
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    borderRadius: 16,
                    alignItems: 'center',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <AppText style={{ color: C.navy, fontSize: 15, fontWeight: '800' }}>
                      {isPt ? 'Incrível!' : 'Awesome!'}
                    </AppText>
                    <Confetti size={16} color={C.navy} weight="fill" />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => shareAchievement(current.title, current.rarity, isPt)}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: 'rgba(22,21,58,0.06)',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(22,21,58,0.08)',
                  }}
                >
                  <ShareNetwork size={18} color={C.navy} weight="bold" />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}
