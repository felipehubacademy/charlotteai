// Modal de FORMACAO FINAL — quando aluno completou 100% do Advanced.
// Espelha exatamente o PromotionModal (que ja funciona bonito): video
// fullscreen Charlotte com lip-sync, confete dourado ao final, fade-out
// auto. Sem coreografia multi-fase. Sem certificate. Sem nada extra.
//
// Diferenca vs Promotion:
// - Video graduation (Charlotte honor cord dourado)
// - Paleta confete inclui mais ouro/violeta (premium)
// - Audio narra "You did it. You graduated. I'm so proud of you."

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Modal, TouchableOpacity, Animated, Platform, Dimensions, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { GraduationCap, ArrowRight } from 'phosphor-react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { AppText } from '@/components/ui/Text';
import { soundEngine } from '@/lib/soundEngine';
import type { PromotionEvent } from '@/lib/curriculum-v2/usePromotion';

const GRADUATION_VIDEO_URL =
  'https://fnvjibzreepubageztoi.supabase.co/storage/v1/object/public/promotion-videos/graduation-final.mp4';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Paleta premium: mais dourado/violeta pra distinguir do level-up regular.
const CONFETTI_COLORS = ['#FBBF24', '#F59E0B', '#FCD34D', '#7C3AED', '#8B5CF6', '#FFFFFF', '#0EA5E9'];
const CONFETTI_COUNT  = 240;

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
    delay:  Math.random() * 2000,
    drift:  (Math.random() - 0.5) * 280,
    rot:    Math.random() * 720 - 360,
    color:  CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size:   7 + Math.floor(Math.random() * 9),
    dur:    3000 + Math.random() * 1600,
  }));
}

function Confetti() {
  const pieces = useMemo(makePieces, []);
  const progress = useRef(pieces.map(() => new Animated.Value(0))).current;

  useEffect(() => {
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

const shadow = Platform.select({
  ios: { shadowColor: 'rgba(0,0,0,0.2)', shadowOpacity: 1, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 12 },
});

type GraduationEvent = Extract<PromotionEvent, { type: 'graduation' }>;

interface Props {
  event: GraduationEvent | null;
  onClose: () => void;
}

export function GraduationModal({ event, onClose }: Props) {
  const scale = useRef(new Animated.Value(0.92)).current;
  const fade  = useRef(new Animated.Value(0)).current;
  const [videoFailed, setVideoFailed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const useVideo = !!event && !videoFailed;

  const videoPlayer = useVideoPlayer(useVideo ? GRADUATION_VIDEO_URL : null, (player) => {
    player.loop = false;
    player.muted = false;
    player.volume = 1.0;
  });

  const autoClose = useCallback(() => {
    try {
      videoPlayer?.pause();
      videoPlayer?.replace(null);
    } catch {}
    Animated.timing(fade, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
      onClose();
    });
  }, [fade, onClose, videoPlayer]);

  useEffect(() => {
    if (!useVideo || !videoPlayer) return;
    const sub = videoPlayer.addListener('playToEnd', () => {
      // Video terminou — burst final de celebracao + confete dourado +
      // SFX. 4.5s antes do fade pra confete cair.
      soundEngine.play('level_promotion', { volume: 0.6 }).catch(() => {});
      setShowConfetti(true);
      setTimeout(autoClose, 4500);
    });
    return () => { try { sub.remove(); } catch {} };
  }, [useVideo, videoPlayer, autoClose]);

  const triggeredForEvent = useRef<string | null>(null);
  useEffect(() => {
    if (!event) return;
    const key = `graduation:${event.fromLevel}`;
    if (triggeredForEvent.current === key) return;
    triggeredForEvent.current = key;

    fade.setValue(1);
    scale.setValue(1);

    if (!useVideo) {
      soundEngine.play('level_promotion', { volume: 1.0 }).catch(() => {});
      setShowConfetti(true);
    }

    if (useVideo) {
      try { videoPlayer.play(); } catch {}
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const t = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  if (!event) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      {useVideo ? (
        // FULLSCREEN — Charlotte toma a tela toda, confete por cima, fade ao
        // final do video. Sem texto/botao (audio narra tudo).
        <Animated.View style={{
          flex: 1,
          backgroundColor: '#F4F3FA',
          opacity: fade,
        }}>
          <View style={{ flex: 1, overflow: 'hidden' }}>
            <VideoView
              player={videoPlayer}
              style={{
                width: '100%', height: '100%',
                transform: [{ scale: 1.06 }, { translateX: 12 }],
              }}
              contentFit="cover"
              nativeControls={false}
              allowsFullscreen={false}
              allowsPictureInPicture={false}
            />
          </View>
          {showConfetti && <Confetti />}
        </Animated.View>
      ) : (
        // FALLBACK — modal card classico quando video falhar.
        <Animated.View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.55)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          opacity: fade,
        }}>
          <Animated.View style={[{
            width: '100%', maxWidth: 360,
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            padding: 28,
            alignItems: 'center',
            transform: [{ scale }],
          }, shadow as any]}>
            <View style={{
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: 'rgba(251,191,36,0.18)',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
            }}>
              <GraduationCap size={42} color="#F59E0B" weight="fill" />
            </View>
            <AppText style={{ fontSize: 24, fontWeight: '900', color: '#16153A', marginBottom: 8, textAlign: 'center' }}>
              You graduated!
            </AppText>
            <AppText style={{ fontSize: 15, fontWeight: '500', color: '#5A5878', textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
              You completed the entire Charlotte program. C1–C2 Advanced.
            </AppText>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.85}
              style={{
                backgroundColor: '#F59E0B', borderRadius: 14,
                paddingVertical: 14, paddingHorizontal: 24,
                flexDirection: 'row', alignItems: 'center', gap: 8,
                width: '100%', justifyContent: 'center',
              }}>
              <AppText style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                Continue with Charlotte
              </AppText>
              <ArrowRight size={16} color="#FFFFFF" weight="bold" />
            </TouchableOpacity>
          </Animated.View>
          {showConfetti && <Confetti />}
        </Animated.View>
      )}
    </Modal>
  );
}
