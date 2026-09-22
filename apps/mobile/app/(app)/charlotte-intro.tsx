import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, StatusBar } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router, useNavigation } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const videoSource = require('@/assets/charlotte-intro.mp4');

// Trava por SESSÃO do app: a tela pode remontar durante transições / refresh de
// profile, criando um 2o player que tocava o áudio de novo (inclusive sobre a
// Home). Isso garante que o vídeo toque no máximo uma vez por launch.
let introConsumed = false;

const LOG = (...a: unknown[]) => { try { console.log('[intro]', Date.now(), ...a); } catch {} };

export default function CharlotteIntroScreen() {
  const { profile, refreshProfile } = useAuth();
  const navigation = useNavigation();
  const doneRef    = useRef(false);
  const startedRef = useRef(false); // true once video rendered its 1st real frame
  const playedRef  = useRef(false); // play() disparado no máximo 1x
  const canPlayRef = useRef(false); // vira true só quando a transição de rota termina
  // Cobre a tela (preto) no mount; revela (0) quando o vídeo começa a renderizar.
  const fadeOutAnim = useRef(new Animated.Value(1)).current;

  const player = useVideoPlayer(videoSource, p => {
    p.loop   = false;
    // MUDO + volume 0 até o 1o frame real. O som só liga quando a Charlotte
    // aparece de fato — e o play só é liberado depois que o loading sai
    // (transitionEnd), então nada disso acontece sobre a tela de loading.
    p.muted  = true;
    p.volume = 0;
  });

  LOG('mount introConsumed=', introConsumed);

  const navigateWithFade = useCallback(async () => {
    if (doneRef.current) return;
    doneRef.current = true;
    LOG('navigateWithFade');

    // Fade to black before navigating.
    await new Promise<void>(resolve => {
      Animated.timing(fadeOutAnim, {
        toValue: 1,
        duration: 500,
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

  // Remontagem depois que o intro já rodou nesta sessão -> vai direto pra Home
  // (não cria um 2o player que tocaria o áudio de novo).
  useEffect(() => {
    if (introConsumed) {
      LOG('already consumed -> skip to home');
      doneRef.current = true;
      router.replace('/(app)');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // O play só é liberado quando a TRANSIÇÃO de rota termina — ou seja, quando o
  // loading (rota `/`, index.tsx) realmente saiu da tela. transitionEnd é o
  // único sinal confiável disso (focus/runAfterInteractions disparam no meio da
  // transição, com o loading ainda por cima -> áudio vazava sobre o load).
  useEffect(() => {
    if (introConsumed) return;
    const startPlayback = (src: string) => {
      if (playedRef.current) return;
      playedRef.current  = true;
      canPlayRef.current = true;
      introConsumed      = true;
      LOG('startPlayback via', src);
      try { player.play(); } catch {}
    };
    // A animação de entrada pode estar no nosso navigator OU no stack pai (raiz).
    const parent = (navigation as { getParent?: () => unknown }).getParent?.();
    const navs = [navigation, parent].filter(Boolean) as Array<{
      addListener: (e: string, cb: (ev: { data?: { closing?: boolean } }) => void) => (() => void);
    }>;
    const unsubs = navs.map((n, i) =>
      n.addListener('transitionEnd', (ev) => {
        LOG('transitionEnd nav', i, 'closing=', ev?.data?.closing);
        if (ev?.data?.closing) return;
        startPlayback('transitionEnd' + i);
      })
    );
    // Fallback: se nenhum transitionEnd vier (ex.: sem animação de transição),
    // toca depois de uma folga generosa pra o loading já ter saído.
    const fb = setTimeout(() => startPlayback('fallback'), 1400);
    return () => { unsubs.forEach(u => { try { u(); } catch {} }); clearTimeout(fb); };
  }, [navigation, player]);

  useEffect(() => {
    // playingChange dispara quando o player começa/para.
    const sub = player.addListener('playingChange', ({ isPlaying }) => {
      LOG('playingChange isPlaying=', isPlaying, 'canPlay=', canPlayRef.current, 'started=', startedRef.current);
      if (isPlaying) {
        // Só revela/dessilencia se a transição já terminou (loading fora). Um
        // player-fantasma que comece antes disso fica mudo e coberto.
        if (!startedRef.current && canPlayRef.current) {
          startedRef.current = true;
          // 1o frame real com o loading já fora: liga o som e revela juntos.
          try { player.muted = false; player.volume = 1; } catch {}
          LOG('reveal + unmute');
          Animated.timing(fadeOutAnim, { toValue: 0, duration: 160, useNativeDriver: true }).start();
        }
      } else if (startedRef.current) {
        // Parou depois de ter começado -> chegou ao fim.
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
