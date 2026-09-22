import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, StatusBar } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const videoSource = require('@/assets/charlotte-intro.mp4');

export default function CharlotteIntroScreen() {
  const { profile, refreshProfile } = useAuth();
  const doneRef    = useRef(false);
  const startedRef = useRef(false); // true once video has played at least 1 frame
  // Cobre a tela (preto) no mount pra o vídeo não "aparecer rodando" durante a
  // transição do loading; revela (0) quando o vídeo começa; volta a 1 no fim.
  const fadeOutAnim = useRef(new Animated.Value(1)).current;

  const player = useVideoPlayer(videoSource, p => {
    p.loop  = false;
    p.muted = false;
    // NÃO tocar no init: começaria durante a transição do loading (glitch de
    // "vídeo rodando antes do loading sair"). Play acontece após a tela montar.
  });

  // Toca só depois que a tela está montada/estabilizada (evita começar durante
  // a transição do loading). iOS às vezes precisa desse play explícito também.
  useEffect(() => {
    const t = setTimeout(() => {
      try { player.play(); } catch {}
    }, 350);
    return () => clearTimeout(t);
  }, [player]);

  const navigateWithFade = useCallback(async () => {
    if (doneRef.current) return;
    doneRef.current = true;

    // Fade to black before navigating.
    await new Promise<void>(resolve => {
      Animated.timing(fadeOutAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start(() => resolve());
    });

    try {
      if (profile?.id) {
        // Fase 1: placement virou opcional. Como o trial + nível nasciam no
        // placement, garantimos aqui (fim do onboarding) que TODO usuário
        // ganha nível default + 7 dias de trial — com guard pra não
        // sobrescrever quem já tem nível/assinatura (institucional/pago/placement).
        const update: Record<string, unknown> = { first_welcome_done: true };
        if (!profile.charlotte_level) update.charlotte_level = 'Novice';
        const needsTrial =
          !profile.is_institutional &&
          (!profile.subscription_status || profile.subscription_status === 'none') &&
          !profile.trial_ends_at;
        if (needsTrial) {
          const trialEnds = new Date();
          trialEnds.setDate(trialEnds.getDate() + 7);
          update.subscription_status = 'trial';
          update.trial_ends_at       = trialEnds.toISOString();
          update.is_active           = true;
        }
        await supabase
          .from('charlotte_users')
          .update(update)
          .eq('id', profile.id);
        // refresh so AuthGuard won't redirect back here
        refreshProfile().catch(() => {});
      }
    } catch {
      // Non-critical
    }

    router.replace('/(app)');
  }, [profile?.id, fadeOutAnim]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // playingChange fires when the player starts or stops.
    // We detect "ended" by: video was playing (startedRef) and now stopped.
    const sub = player.addListener('playingChange', ({ isPlaying }) => {
      if (isPlaying) {
        if (!startedRef.current) {
          startedRef.current = true;
          // Revela o vídeo suavemente quando ele realmente começa a tocar.
          Animated.timing(fadeOutAnim, { toValue: 0, duration: 350, useNativeDriver: true }).start();
        }
      } else if (startedRef.current) {
        // Video stopped after having started -> assume it reached the end.
        navigateWithFade();
      }
    });

    return () => sub.remove();
  }, [player, navigateWithFade]);

  // Safety fallback: if something prevents the event from firing, navigate after 15s
  useEffect(() => {
    const t = setTimeout(navigateWithFade, 15_000);
    return () => clearTimeout(t);
  }, [navigateWithFade]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#07071C" translucent />
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000', opacity: fadeOutAnim }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07071C',
  },
  video: {
    flex: 1,
    width: '100%',
  },
});
