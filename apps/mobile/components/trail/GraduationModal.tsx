// Modal de formacao final — exclusivo do Advanced (terminal level).
// 3 fases coreografadas:
//   1. Build-up (3s):   tela escura, texto pulsing "Voce chegou ao final..."
//   2. Reveal (4s):     transicao pra claro, video Charlotte + audio + confetti premium
//   3. Certificate:     certificado visivel com nome+nivel+data, CTA "Continuar"
//
// Diferente do PromotionModal:
// - Promo eh momento transicional ("welcome to next level"); este eh terminal
// - 3 fases vs 1 reveal direto
// - Confetti dourado/violeta/azul (premium) vs paleta padrao
// - Audio orchestral swell vs SFX padrao
// - CTA volta pra home (nao avanca trail)

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal, View, Animated, Easing, Dimensions, Platform,
  TouchableOpacity, ScrollView,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import { AppText } from '@/components/ui/Text';
import { GraduationCap } from 'phosphor-react-native';
import { soundEngine } from '@/lib/soundEngine';
import { resolvePromotionVideoUriSync } from '@/hooks/usePromotionVideoPrefetch';
import type { PromotionEvent } from '@/lib/curriculum-v2/usePromotion';
import { useAuth } from '@/hooks/useAuth';

// TODO: subir audio orchestral pro Supabase Storage e plugar URL aqui.
// Ate la, fica null e a fase reveal usa SFX `level_promotion` em volume alto.
const GRADUATION_AUDIO_URL: string | null = null;
// Video Charlotte graduation premium — capelo + beca formal + honor cord
// dourado + diploma fita dourada. Lip-sync com TTS "You did it. You
// graduated. I'm so proud of you." (audio integrado no video).
const GRADUATION_VIDEO_URL: string =
  'https://fnvjibzreepubageztoi.supabase.co/storage/v1/object/public/promotion-videos/graduation-final.mp4';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Paleta premium pra graduation — distingue de promotion comum (mais ouro/violeta).
const PREMIUM_CONFETTI_COLORS = [
  '#FBBF24', '#F59E0B', '#FCD34D', // dourados
  '#8B5CF6', '#7C3AED',             // violetas
  '#0EA5E9', '#0284C7',             // azuis premium
  '#FFFFFF',                         // branco
];
const CONFETTI_COUNT = 260; // mais denso que promotion comum

type GraduationEvent = Extract<PromotionEvent, { type: 'graduation' }>;

interface Props {
  event: GraduationEvent | null;
  onClose: () => void;
}

type Phase = 'build-up' | 'reveal' | 'certificate';

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
  return Array.from({ length: CONFETTI_COUNT }, () => ({
    startX: Math.random() * SCREEN_W,
    delay:  Math.random() * 2200,
    drift:  (Math.random() - 0.5) * 280,
    rot:    Math.random() * 720 - 360,
    color:  PREMIUM_CONFETTI_COLORS[Math.floor(Math.random() * PREMIUM_CONFETTI_COLORS.length)],
    size:   8 + Math.random() * 8,
    dur:    3200 + Math.random() * 1600,
  }));
}

export function GraduationModal({ event, onClose }: Props) {
  const { profile } = useAuth();
  const [phase, setPhase] = useState<Phase>('build-up');
  const bgFade   = useRef(new Animated.Value(0)).current; // 0 dark -> 1 light
  const buildUpPulse = useRef(new Animated.Value(0)).current;
  const revealOpacity = useRef(new Animated.Value(0)).current;
  const certOpacity   = useRef(new Animated.Value(0)).current;
  const pieces = useMemo(() => makePieces(), []);

  const videoUri = event ? GRADUATION_VIDEO_URL : null;
  const videoPlayer = useVideoPlayer(videoUri, p => {
    if (videoUri) {
      p.loop = false;
      p.muted = true; // audio vem do swell orchestral overlayed
    }
  });

  // Build-up: 3s. Pulsing text loop ate fade pra reveal.
  useEffect(() => {
    if (!event) return;
    setPhase('build-up');
    bgFade.setValue(0);
    revealOpacity.setValue(0);
    certOpacity.setValue(0);

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(buildUpPulse, { toValue: 1, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(buildUpPulse, { toValue: 0, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ]),
    );
    pulse.start();

    const t1 = setTimeout(() => {
      // FASE 2: reveal — transicao bg, video play, audio swell.
      setPhase('reveal');
      pulse.stop();
      Animated.parallel([
        Animated.timing(bgFade, { toValue: 1, duration: 800, useNativeDriver: false, easing: Easing.out(Easing.cubic) }),
        Animated.timing(revealOpacity, { toValue: 1, duration: 1000, delay: 200, useNativeDriver: true }),
      ]).start();

      // Audio orchestral (placeholder: usa level_promotion enquanto nao temos asset)
      soundEngine.play('level_promotion', { volume: 0.9 }).catch(() => {});

      // Play video
      try { videoPlayer.play(); } catch {}
    }, 3000);

    const t2 = setTimeout(() => {
      // FASE 3: certificate aparece 4s depois do reveal.
      setPhase('certificate');
      Animated.timing(certOpacity, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    }, 7000);

    return () => {
      pulse.stop();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [event]);

  // playToEnd handler — pra video nao travar em frame final
  useEventListener(videoPlayer, 'playToEnd', () => {
    // No-op por enquanto; deixa frame final visivel.
  });

  if (!event) return null;

  const userName = profile?.name?.split(' ')[0] ?? '';
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  // Animated bg color: dark navy -> light
  const bgColor = bgFade.interpolate({
    inputRange:  [0, 1],
    outputRange: ['#0A0820', '#F5F3FF'],
  });

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent>
      <Animated.View style={{
        flex: 1, backgroundColor: bgColor,
        alignItems: 'center', justifyContent: 'center',
      }}>
        {/* ──── FASE 1: BUILD-UP ──── */}
        {phase === 'build-up' && (
          <View style={{ alignItems: 'center', paddingHorizontal: 32 }}>
            <Animated.View style={{
              opacity: buildUpPulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
              transform: [{ scale: buildUpPulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.05] }) }],
              alignItems: 'center',
            }}>
              <GraduationCap size={64} color="#FBBF24" weight="duotone" />
              <AppText style={{
                marginTop: 24, fontSize: 22, fontWeight: '700', color: '#FFF',
                textAlign: 'center', letterSpacing: 0.5,
              }}>
                Você chegou ao final…
              </AppText>
              <AppText style={{
                marginTop: 12, fontSize: 14, fontWeight: '400', color: 'rgba(255,255,255,0.7)',
                textAlign: 'center',
              }}>
                Da jornada inteira com a Charlotte
              </AppText>
            </Animated.View>
          </View>
        )}

        {/* ──── FASE 2 + 3: REVEAL E CERTIFICATE ──── */}
        {phase !== 'build-up' && (
          <Animated.View style={{ flex: 1, width: '100%', opacity: revealOpacity }}>
            {/* Confetti premium */}
            <ConfettiLayer pieces={pieces} />

            {/* Video Charlotte */}
            <View style={{
              position: 'absolute', top: SCREEN_H * 0.08,
              alignSelf: 'center', width: SCREEN_W * 0.6, height: SCREEN_W * 0.6 * (1280 / 704),
              zIndex: 2,
            }}>
              {videoUri ? (
                <VideoView
                  player={videoPlayer}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                  nativeControls={false}
                />
              ) : null}
            </View>

            {/* Texto reveal — fica ate certificado aparecer */}
            <View style={{
              position: 'absolute', bottom: SCREEN_H * 0.45, alignSelf: 'center',
              alignItems: 'center', paddingHorizontal: 32, zIndex: 3,
            }}>
              <AppText style={{
                fontSize: 24, fontWeight: '800', color: '#0F1F3D', textAlign: 'center', letterSpacing: -0.3,
              }}>
                Você se formou!
              </AppText>
              <AppText style={{
                marginTop: 6, fontSize: 14, fontWeight: '500', color: '#3D4170', textAlign: 'center',
              }}>
                C1–C2 Advanced English
              </AppText>
            </View>

            {/* Certificado (Fase 3) */}
            {phase === 'certificate' && (
              <Animated.View style={{
                position: 'absolute', bottom: SCREEN_H * 0.08,
                alignSelf: 'center', width: SCREEN_W * 0.86, opacity: certOpacity,
                zIndex: 4,
              }}>
                <View style={{
                  backgroundColor: '#FFFBEB',
                  borderWidth: 2, borderColor: '#FBBF24',
                  borderRadius: 16, padding: 18,
                  shadowColor: '#7C3AED', shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 4 },
                  elevation: 8,
                }}>
                  <View style={{ alignItems: 'center', marginBottom: 8 }}>
                    <GraduationCap size={28} color="#7C3AED" weight="fill" />
                  </View>
                  <AppText style={{
                    fontSize: 11, fontWeight: '700', color: '#7C3AED',
                    textTransform: 'uppercase', letterSpacing: 1.5, textAlign: 'center',
                  }}>
                    Certificate of Mastery
                  </AppText>
                  <AppText style={{
                    marginTop: 10, fontSize: 18, fontWeight: '800', color: '#0F1F3D', textAlign: 'center',
                  }}>
                    {userName || 'Aluno(a) Charlotte'}
                  </AppText>
                  <AppText style={{
                    marginTop: 4, fontSize: 12, color: '#8B8FAF', textAlign: 'center',
                  }}>
                    completou todo o programa C1–C2
                  </AppText>
                  <AppText style={{
                    marginTop: 12, fontSize: 11, color: '#8B8FAF', textAlign: 'center',
                  }}>
                    {today}
                  </AppText>

                  <TouchableOpacity
                    onPress={onClose}
                    style={{
                      marginTop: 18, backgroundColor: '#0F1F3D', paddingVertical: 12,
                      borderRadius: 12, alignItems: 'center',
                    }}
                    activeOpacity={0.85}
                  >
                    <AppText style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>
                      Continuar com a Charlotte
                    </AppText>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          </Animated.View>
        )}
      </Animated.View>
    </Modal>
  );
}

// ── Confetti subcomponent (igual ao PromotionModal, paleta premium) ──
function ConfettiLayer({ pieces }: { pieces: Piece[] }) {
  return (
    <View pointerEvents="none" style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1,
    }}>
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} piece={p} />
      ))}
    </View>
  );
}

function ConfettiPiece({ piece }: { piece: Piece }) {
  const fall = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fall, {
      toValue: 1, duration: piece.dur, delay: piece.delay,
      useNativeDriver: true, easing: Easing.in(Easing.cubic),
    }).start();
  }, []);
  const ty = fall.interpolate({ inputRange: [0, 1], outputRange: [-30, SCREEN_H + 50] });
  const tx = fall.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, piece.drift / 2, piece.drift] });
  const rot = fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${piece.rot}deg`] });
  return (
    <Animated.View style={{
      position: 'absolute', left: piece.startX, top: 0,
      width: piece.size, height: piece.size * 1.4, backgroundColor: piece.color,
      borderRadius: 1.5,
      transform: [{ translateX: tx }, { translateY: ty }, { rotate: rot }],
    }} />
  );
}
