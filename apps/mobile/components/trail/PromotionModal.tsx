// Modal de celebracao quando aluno e promovido organicamente de nivel
// (Novice -> Inter ou Inter -> Advanced). Dispara apos save de atividade
// que fecha o ultimo unit do level OU apos refetch do progress.
//
// UX: full-screen translucido, confetti OTA-safe (Animated puro),
// achievement_legendary SFX + haptic burst, 1 botao "Continuar no <novo
// nivel>" que fecha. Bilingue conforme novo nivel.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Modal, TouchableOpacity, Animated, Platform, Dimensions, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Trophy, ArrowRight } from 'phosphor-react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { AppText } from '@/components/ui/Text';
import { soundEngine } from '@/lib/soundEngine';
import type { PromotionEvent } from '@/lib/curriculum-v2/usePromotion';

// URLs dos videos de promocao no Supabase Storage. Pre-fetch eh feito quando
// o aluno entra na ultima unit do ultimo modulo (TrailContent / learn-session).
const PROMOTION_VIDEO: Record<string, string> = {
  Inter:    'https://fnvjibzreepubageztoi.supabase.co/storage/v1/object/public/promotion-videos/novice-to-inter.mp4',
  // Advanced: aguardando geracao do video Inter→Advanced.
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const CONFETTI_COLORS = ['#7C3AED', '#F59E0B', '#10B981', '#EF4444', '#3B82F6', '#EC4899', '#FBBF24'];
const CONFETTI_COUNT  = 140;

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
    delay:  Math.random() * 120, // burst quase simultaneo (era 600ms stagger)
    drift:  (Math.random() - 0.5) * 260,
    rot:    Math.random() * 720 - 360,
    color:  CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size:   6 + Math.floor(Math.random() * 8),
    dur:    2200 + Math.random() * 1600,
  }));
}

function Confetti() {
  const pieces = useMemo(makePieces, []);
  const progress = useRef(pieces.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Burst simultaneo: roda todas em paralelo (sem stagger). delay
    // individual ja eh pequeno (0-120ms) pra ter variacao natural.
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

const LEVEL_LABEL: Record<string, string> = {
  Inter:    'Intermediate',
  Advanced: 'Advanced',
};

const LEVEL_COLOR: Record<string, string> = {
  Inter:    '#7C3AED',
  Advanced: '#0F766E',
};

const shadow = Platform.select({
  ios: { shadowColor: 'rgba(0,0,0,0.2)', shadowOpacity: 1, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 12 },
});

interface Props {
  event: PromotionEvent | null;
  onClose: () => void;
}

export function PromotionModal({ event, onClose }: Props) {
  const scale = useRef(new Animated.Value(0.92)).current;
  const fade  = useRef(new Animated.Value(0)).current;
  const [videoFailed, setVideoFailed] = useState(false);

  const videoUrl = event ? PROMOTION_VIDEO[event.toLevel] : undefined;
  const useVideo = !!videoUrl && !videoFailed;

  const videoPlayer = useVideoPlayer(videoUrl ?? null, (player) => {
    player.loop = false;
    player.muted = false;
    player.volume = 1.0;
  });

  // Auto-close com fade quando video termina
  const autoClose = useCallback(() => {
    Animated.timing(fade, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
      onClose();
    });
  }, [fade, onClose]);

  useEffect(() => {
    if (!useVideo || !videoPlayer) return;
    const sub = videoPlayer.addListener('playToEnd', () => {
      // Video terminou. Toca o SFX celebratorio APOS a fala (nao em
      // paralelo — antes competia pela sessao e causava freeze do video).
      // Janela de respiro de 1.6s deixa o SFX brilhar antes do fade.
      soundEngine.play('level_promotion', { volume: 0.6 }).catch(() => {});
      setTimeout(autoClose, 1600);
    });
    return () => { try { sub.remove(); } catch {} };
  }, [useVideo, videoPlayer, autoClose]);

  // Trigger UMA vez por evento (estavel — refs nao precisam estar nas deps).
  // Antes inclui useVideo + videoPlayer nas deps, mas videoPlayer pode
  // recriar em re-render, re-executando play() ou interrompendo audio.
  const triggeredForEvent = useRef<string | null>(null);
  useEffect(() => {
    if (!event) return;
    const key = `${event.fromLevel}->${event.toLevel}`;
    if (triggeredForEvent.current === key) return;
    triggeredForEvent.current = key;

    scale.setValue(0.92); fade.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 60 }),
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    // SFX so toca quando NAO ha video (video ja tem narracao emocional
    // propria). SFX em paralelo competia pela sessao de audio e causava
    // freeze no meio da playback (reportado pelo user 2026-06-01).
    if (!useVideo) {
      soundEngine.play('level_promotion', { volume: 1.0 }).catch(() => {});
    }

    if (useVideo) {
      try { videoPlayer.play(); } catch {}
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const t = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }, 350);
    return () => clearTimeout(t);
    // Deps minima: so o evento. Outras vars sao refs ou derivadas estaveis.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  if (!event) return null;
  const isPt   = event.toLevel === 'Inter'; // Inter ainda pode ser PT-explanation usuario; melhor pivot por toLevel
  // Idioma do modal: usa o nivel novo para decidir (Novice eh PT; Inter/Advanced EN).
  const labelLvl = LEVEL_LABEL[event.toLevel] ?? event.toLevel;
  const accent   = LEVEL_COLOR[event.toLevel] ?? '#7C3AED';
  const isPortuguese = false; // promovido sempre cruzou pra >= Inter, mostrar EN.

  const title    = isPortuguese ? 'Parabéns!' : 'Congratulations!';
  const subtitle = isPortuguese
    ? `Você concluiu o nível ${event.fromLevel} e foi promovido para ${labelLvl}.`
    : `You completed the ${event.fromLevel} level and were promoted to ${labelLvl}.`;
  const cta      = isPortuguese ? `Continuar no ${labelLvl}` : `Continue in ${labelLvl}`;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {useVideo ? (
        // FULLSCREEN — Charlotte toma a tela toda, confete por cima, fade ao
        // final do video. Sem texto/botao (audio narra tudo, modelo Duolingo).
        <Animated.View style={{
          flex: 1,
          backgroundColor: '#F4F3FA', // mesmo cinza claro do fundo do video
          opacity: fade,
        }}>
          <View style={{ flex: 1, overflow: 'hidden' }}>
            <VideoView
              player={videoPlayer}
              style={{
                width: '100%', height: '100%',
                // Pequeno zoom + shift pra direita esconde a linha preta
                // vertical da esquerda (artifact do Aurora). Mantem pes e
                // cabeca visiveis porque video eh portrait e zoom eh suave.
                transform: [{ scale: 1.06 }, { translateX: 12 }],
              }}
              contentFit="cover"
              nativeControls={false}
              allowsFullscreen={false}
              allowsPictureInPicture={false}
            />
          </View>
          {/* Confete por cima do video */}
          <Confetti />
        </Animated.View>
      ) : (
        // FALLBACK — modal card classico quando nao tem video pro nivel.
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
              backgroundColor: `${accent}1a`,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
            }}>
              <Trophy size={42} color={accent} weight="fill" />
            </View>
            <AppText style={{ fontSize: 24, fontWeight: '900', color: '#16153A', marginBottom: 8, textAlign: 'center' }}>
              {title}
            </AppText>
            <AppText style={{ fontSize: 15, fontWeight: '500', color: '#5A5878', textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
              {subtitle}
            </AppText>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.85}
              style={{
                backgroundColor: accent, borderRadius: 14,
                paddingVertical: 14, paddingHorizontal: 24,
                flexDirection: 'row', alignItems: 'center', gap: 8,
                width: '100%', justifyContent: 'center',
              }}>
              <AppText style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>{cta}</AppText>
              <ArrowRight size={16} color="#FFFFFF" weight="bold" />
            </TouchableOpacity>
          </Animated.View>
          <Confetti />
        </Animated.View>
      )}
    </Modal>
  );
}
