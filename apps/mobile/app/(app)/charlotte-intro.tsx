import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, StatusBar, InteractionManager } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router, useFocusEffect } from 'expo-router';
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
    // Começa MUDO: o som só liga quando o vídeo de fato renderiza o 1o frame
    // (evento playingChange). Assim o áudio nunca sai sob o loading nem sob o
    // cover preto durante a latência do play().
    p.muted = true;
    // NÃO tocar no init: começaria durante a transição do loading (glitch de
    // "vídeo rodando antes do loading sair"). Play acontece após a tela montar.
  });

  // O play NÃO pode depender de um timer chutado: a tela de loading (rota `/`,
  // index.tsx) sai numa transição de navegação, e um setTimeout fixo cai no
  // meio dela -> o áudio da Charlotte começa enquanto o loading ainda está na
  // tela. useFocusEffect + InteractionManager.runAfterInteractions só roda
  // DEPOIS que a transição de rota terminou (loading realmente saiu da tela).
  // Só então tocamos — áudio e imagem nascem juntos, nunca antes do load sair.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const task = InteractionManager.runAfterInteractions(() => {
        if (cancelled) return;
        try { player.play(); } catch {}
      });
      return () => {
        cancelled = true;
        try { (task as { cancel?: () => void })?.cancel?.(); } catch {}
      };
    }, [player])
  );

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
          // Frames reais começaram a renderizar: liga o som AGORA (junto com a
          // revelação da imagem) e revela o vídeo. Áudio e Charlotte nascem no
          // mesmo instante — nunca o som antes.
          try { player.muted = false; } catch {}
          Animated.timing(fadeOutAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start();
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
