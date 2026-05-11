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
  const fadeOutAnim = useRef(new Animated.Value(0)).current;

  const player = useVideoPlayer(videoSource, p => {
    p.loop  = false;
    p.muted = false;
    p.play();
  });

  // Fix 1: Force play after mount — iOS sometimes needs this after VideoView renders.
  useEffect(() => {
    const t = setTimeout(() => {
      try { player.play(); } catch {}
    }, 300);
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
        await supabase
          .from('charlotte_users')
          .update({ first_welcome_done: true })
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
        startedRef.current = true;
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
