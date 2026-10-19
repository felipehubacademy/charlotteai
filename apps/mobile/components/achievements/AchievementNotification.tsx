// Conquista desbloqueada — tela cheia na cor da raridade, com a Charlotte como anfitriã.
// Comum: lima · Rara: violeta · Épica: rosa (+ confete) · Lendária: tinta com volt (+ confete).
// A medalha usa o ícone da categoria (o mesmo da tela de Conquistas) e entra girando.
import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from '@/lib/hapticsGated';
import { Lightning, ShareNetwork } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { QueizyWave } from '@/components/ui/QueizyWave';
import { AchievementIcon, RARITY } from '@/components/stats/StatsUI';
import { Achievement } from '@/lib/types/achievement';
import { soundEngine, SoundName } from '@/lib/soundEngine';
import { voiceSFX } from '@/lib/voiceSFX';
import { useShareCard } from '@/components/share/ShareCardProvider';
import { GENERAL_ACHIEVEMENTS, LEVEL_ACHIEVEMENTS } from '@/lib/achievementsCatalog';

const ALL_CATALOG = [...GENERAL_ACHIEVEMENTS, ...LEVEL_ACHIEVEMENTS];
const catalogOf = (code: string) => ALL_CATALOG.find(e => e.code === code);

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

const INK = '#16131F';
const VOLT = '#DCFF4A';
const WHITE = '#FFFFFF';

// Cena por raridade: fundo, texto, medalha, destaque e o botão principal.
const SCENE: Record<Achievement['rarity'], {
  bg: string; ink: string; sub: string; medal: string; icon: string; ring: string;
  btnBg: string; btnInk: string; ghostBg: string; wave: string; confetti: boolean;
}> = {
  common:    { bg: VOLT,      ink: INK,   sub: 'rgba(22,19,31,0.70)',  medal: WHITE, icon: '#08804A', ring: INK,  btnBg: INK,  btnInk: VOLT, ghostBg: 'rgba(22,19,31,0.08)',  wave: INK,  confetti: false },
  rare:      { bg: '#6B4BFF', ink: WHITE, sub: 'rgba(255,255,255,0.80)', medal: WHITE, icon: '#6B4BFF', ring: VOLT, btnBg: VOLT, btnInk: INK,  ghostBg: 'rgba(255,255,255,0.16)', wave: VOLT, confetti: false },
  epic:      { bg: '#FF4F8B', ink: WHITE, sub: 'rgba(255,255,255,0.85)', medal: WHITE, icon: '#FF4F8B', ring: VOLT, btnBg: INK,  btnInk: VOLT, ghostBg: 'rgba(255,255,255,0.18)', wave: INK,  confetti: true  },
  legendary: { bg: INK,       ink: WHITE, sub: 'rgba(255,255,255,0.72)', medal: VOLT,  icon: INK,       ring: VOLT, btnBg: VOLT, btnInk: INK,  ghostBg: 'rgba(255,255,255,0.12)', wave: VOLT, confetti: true  },
};

const CHARLOTTE_LINE: Record<Achievement['rarity'], { pt: string; en: string }> = {
  common:    { pt: 'Mandou bem! Mais uma para a coleção.',   en: 'Nice one! Another one for the collection.' },
  rare:      { pt: 'Essa não é para qualquer um. Orgulho!',  en: 'Not everyone gets this one. So proud!' },
  epic:      { pt: 'Uau! Você está voando no inglês.',        en: 'Wow! Your English is taking off.' },
  legendary: { pt: 'Lendário! Pouca gente chega aqui.',       en: 'Legendary! Very few people get here.' },
};

// ── Confete (Épica e Lendária) ───────────────────────────────────────────────
const CONFETTI_COLORS = [VOLT, '#FF4F8B', '#6B4BFF', '#2BD97C', WHITE];
const PIECES = Array.from({ length: 70 }, (_, i) => ({
  x: (i * 37 + (i % 3) * 11) % 100,  // % da largura
  delay: (i % 10) * 70,
  dur: 2600 + (i % 6) * 220,
  size: 6 + (i % 3) * 3,
  spin: (i % 2 ? 1 : -1) * (180 + (i % 5) * 90),
  drift: ((i % 5) - 2) * 30,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  round: i % 3 === 0,
}));

function ConfettiRain({ width, height, run }: { width: number; height: number; run: number }) {
  const anims = React.useRef(PIECES.map(() => new Animated.Value(0))).current;
  React.useEffect(() => {
    anims.forEach(a => a.setValue(0));
    Animated.parallel(anims.map((a, i) => Animated.timing(a, {
      toValue: 1, duration: PIECES[i].dur, delay: PIECES[i].delay, easing: Easing.in(Easing.quad), useNativeDriver: true,
    }))).start();
  }, [run]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {PIECES.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute', top: -20, left: (p.x / 100) * width,
            width: p.size, height: p.round ? p.size : p.size * 1.8, borderRadius: p.round ? p.size / 2 : 2,
            backgroundColor: p.color,
            transform: [
              { translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [0, height + 40] }) },
              { translateX: anims[i].interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              { rotate: anims[i].interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

interface Props {
  achievements: Achievement[];
  onDismiss: (id: string) => void;
  isPt?: boolean;
}

/** Uma conquista por vez, num único Modal que fica aberto enquanto houver fila.
 *  Só o conteúdo troca (key = id), cada um com as próprias animações. Trocar o Modal inteiro
 *  a cada conquista fazia o sistema fechar o novo junto com o anterior, e conquistas eram puladas. */
export default function AchievementNotification({ achievements, onDismiss, isPt = true }: Props) {
  const current = achievements[0];
  if (!current) return null;
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => onDismiss(current.id)}>
      <AchievementScene key={current.id} current={current} onDismiss={onDismiss} isPt={isPt} />
    </Modal>
  );
}

function AchievementScene({ current, onDismiss, isPt }: { current: Achievement; onDismiss: (id: string) => void; isPt: boolean }) {
  const openShare = useShareCard();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const medalSize = Math.min(176, Math.round(height * 0.2));

  const fade   = React.useRef(new Animated.Value(0)).current;
  const medal  = React.useRef(new Animated.Value(0)).current; // entrada com giro
  const pulse  = React.useRef(new Animated.Value(1)).current;
  const slide  = React.useRef(new Animated.Value(0)).current; // texto e botões sobem
  const autoDismissRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissingRef = React.useRef(false);
  const mountedAtRef = React.useRef(Date.now());

  React.useEffect(() => {

    soundEngine.play(achievementSound(current.rarity)).catch(() => {});
    achievementHaptic(current.rarity).catch(() => {});
    // Voz da Charlotte nas de alto impacto, depois do SFX musical.
    if (current.rarity === 'epic') {
      setTimeout(() => voiceSFX.play('achievement_epic').catch(() => {}), 1900);
    } else if (current.rarity === 'legendary') {
      setTimeout(() => voiceSFX.play('achievement_legendary').catch(() => {}), 2300);
    }

    Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    Animated.sequence([
      Animated.delay(80),
      Animated.spring(medal, { toValue: 1, stiffness: 180, damping: 12, mass: 0.9, useNativeDriver: true }),
    ]).start(() => {
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
    });
    Animated.timing(slide, { toValue: 1, duration: 420, delay: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

    autoDismissRef.current = setTimeout(() => handleDismiss(), 10000);
    return () => { if (autoDismissRef.current) clearTimeout(autoDismissRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const s = SCENE[current.rarity] ?? SCENE.common;
  const cat = catalogOf(current.type);
  const title = cat ? (isPt ? cat.title : (cat.titleEN ?? cat.title)) : current.title;
  const howTo = cat ? (isPt ? cat.howToEarnPT : cat.howToEarnEN) : current.description;
  const rarityLabel = isPt ? RARITY[current.rarity]?.pt : RARITY[current.rarity]?.en;
  const line = CHARLOTTE_LINE[current.rarity] ?? CHARLOTTE_LINE.common;

  function handleDismiss(fromTap = false) {
    if (dismissingRef.current) return; // toque duplo / tempo esgotado junto com o toque
    // Toque logo que a conquista aparece = sobra do toque que fechou a anterior: ignora.
    if (fromTap && Date.now() - mountedAtRef.current < 700) return;
    dismissingRef.current = true;
    if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onDismiss(current.id));
  }

  const rise = { opacity: slide, transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] };

  return (
    <>
      <StatusBar barStyle={s.ink === INK ? 'dark-content' : 'light-content'} />
      <Animated.View style={{ flex: 1, backgroundColor: s.bg, opacity: fade }}>
        {s.confetti && <ConfettiRain width={width} height={height} run={0} />}

        <View style={{ flex: 1, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20, paddingHorizontal: 24 }}>
          {/* Selo do topo */}
          <View style={{ alignItems: 'center' }}>
            <View style={{ backgroundColor: s.ghostBg, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
              <AppText style={{ color: s.ink, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                {isPt ? 'Conquista desbloqueada' : 'Achievement unlocked'}
              </AppText>
            </View>
          </View>

          {/* Medalha */}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={{
              transform: [
                { scale: Animated.multiply(medal, pulse) },
                { rotate: medal.interpolate({ inputRange: [0, 1], outputRange: ['-200deg', '0deg'] }) },
              ],
            }}>
              <View style={{
                width: medalSize + 24, height: medalSize + 24, borderRadius: (medalSize + 24) / 2,
                borderWidth: 4, borderColor: s.ring, alignItems: 'center', justifyContent: 'center',
              }}>
                <View style={{
                  width: medalSize, height: medalSize, borderRadius: medalSize / 2, backgroundColor: s.medal,
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: INK, shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10,
                }}>
                  <AchievementIcon category={cat?.category ?? 'general'} color={s.icon} size={Math.round(medalSize * 0.46)} />
                </View>
              </View>
            </Animated.View>

            <Animated.View style={[{ alignItems: 'center', marginTop: 28, width: '100%' }, rise]}>
              <AppText style={{ color: s.ink, fontSize: 13, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', opacity: 0.8, marginBottom: 6 }}>
                {rarityLabel}
              </AppText>
              <AppText display style={{ color: s.ink, fontSize: 34, fontWeight: '800', textAlign: 'center', lineHeight: 38, letterSpacing: -0.5 }}>
                {title}
              </AppText>
              {!!howTo && (
                <AppText style={{ color: s.sub, fontSize: 15, textAlign: 'center', lineHeight: 21, marginTop: 10, maxWidth: 320 }}>
                  {howTo}
                </AppText>
              )}
              <View style={{ width: 160, marginTop: 18 }}>
                <QueizyWave progress={0} height={14} strokeWidth={3.5} todoColor={s.wave} doneColor={s.wave} />
              </View>
              {current.xpBonus > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, backgroundColor: s.ghostBg, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}>
                  <Lightning size={14} color={s.ink} weight="fill" />
                  <AppText style={{ color: s.ink, fontSize: 14, fontWeight: '800' }}>+{current.xpBonus} XP</AppText>
                </View>
              )}
            </Animated.View>
          </View>

          {/* Charlotte + botões */}
          <Animated.View style={rise}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 18 }}>
              <Image source={require('@/assets/charlotte-avatar.png')} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: INK }} />
              <View style={{ flex: 1, backgroundColor: WHITE, borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 11 }}>
                <AppText style={{ color: INK, fontSize: 15, fontWeight: '700', lineHeight: 20 }}>
                  {isPt ? line.pt : line.en}
                </AppText>
              </View>
            </View>

            <TouchableOpacity onPress={() => handleDismiss(true)} activeOpacity={0.85}
              style={{ backgroundColor: s.btnBg, borderRadius: 16, paddingVertical: 17, alignItems: 'center' }}>
              <AppText style={{ color: s.btnInk, fontSize: 16, fontWeight: '800' }}>{isPt ? 'Continuar' : 'Continue'}</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                handleDismiss();
                setTimeout(() => openShare({ kind: 'achievement', big: title, title: isPt ? 'Conquista desbloqueada' : 'Achievement unlocked', seed: current.type, rarity: current.rarity, category: cat?.category, badge: current.rarity === 'legendary' ? (isPt ? 'Lendária' : 'Legendary') : undefined }), 450);
              }}
              activeOpacity={0.85}
              style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10, borderRadius: 16, paddingVertical: 14, backgroundColor: s.ghostBg }}
            >
              <ShareNetwork size={18} color={s.ink} weight="bold" />
              <AppText style={{ color: s.ink, fontSize: 15, fontWeight: '800' }}>{isPt ? 'Compartilhar' : 'Share'}</AppText>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </>
  );
}
