import React from 'react';
import {
  View, TextInput, TouchableOpacity, Pressable,
  Animated, Platform, Easing,
} from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { ArrowUp, Microphone, X, Play, Pause, Hourglass, Lock } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { AppText } from '@/components/ui/Text';
import { useAudioRecorder, PRONUNCIATION_RECORDING_OPTIONS } from '@/hooks/useAudioRecorder';
import type { RateLimitState } from '@/hooks/useChat';

// ── Light theme ───────────────────────────────────────────────
const C = {
  bg:        '#FFFFFF',
  pill:      '#F4F3FA',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  border:    'rgba(22,21,58,0.09)',
  topBorder: 'rgba(22,21,58,0.08)',
  green:     '#A3FF3C',
  greenDark: '#3D8800',
  red:       '#DC2626',
};

interface ChatInputBarProps {
  onSendText: (text: string) => void;
  onSendAudio?: (uri: string, duration: number) => void;
  onLiveVoicePress?: () => void; // kept for compat — Phone moved to header
  onUpgradePress?: () => void;
  disabled?: boolean;
  mode?: 'grammar' | 'pronunciation' | 'chat';
  userLevel?: string;
  rateLimited?: RateLimitState | null;
}

const BAR_COUNT = 22;

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

export default function ChatInputBar({
  onSendText,
  onSendAudio,
  onUpgradePress,
  disabled = false,
  mode = 'chat',
  userLevel,
  rateLimited,
}: ChatInputBarProps) {
  const isNovice = userLevel === 'Novice';

  // Countdown timer for rate-limited state
  const [countdown, setCountdown] = React.useState(0);
  React.useEffect(() => {
    if (!rateLimited) { setCountdown(0); return; }
    setCountdown(rateLimited.retryAfter);
    const t = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(t); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [rateLimited]);
  // Bottom safe area é cuidado pela tab bar do expo-router (esta tela
  // sempre vive em (tabs)). Usar insets.bottom aqui criava gap visível
  // entre o input bar e a tab bar no Android (nav bar somava ~30-50px).
  const [text, setText]             = React.useState('');
  const [previewUri, setPreviewUri] = React.useState<string | null>(null);
  const [previewDur, setPreviewDur] = React.useState(0);

  const player       = useAudioPlayer(previewUri ?? undefined);
  const playerStatus = useAudioPlayerStatus(player);
  const isPlaying    = playerStatus.playing;

  const barAnims = React.useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.15))
  ).current;
  const waveRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulsing rings for pronunciation recording state
  const ring1 = React.useRef(new Animated.Value(0)).current;
  const ring2 = React.useRef(new Animated.Value(0)).current;
  const ring3 = React.useRef(new Animated.Value(0)).current;

  // Pronunciation mode records WAV (PCM 16kHz) so Azure Speech SDK can process
  // it directly without any server-side conversion (M4A fails in serverless).
  const { state, duration, startRecording, stopRecording, cancelRecording } =
    useAudioRecorder(
      mode === 'pronunciation' ? PRONUNCIATION_RECORDING_OPTIONS : undefined,
      mode === 'pronunciation' ? 10 : 30, // pronunciation: 10s, chat: 30s
    );

  const isRecording  = state === 'recording';
  const isProcessing = state === 'processing';
  const isPreview    = !!previewUri;
  const hasText      = text.trim().length > 0;
  const releasedRef  = React.useRef(false);

  // Wave animation (chat mode only)
  React.useEffect(() => {
    if (isRecording && mode !== 'pronunciation') {
      const go = () => barAnims.forEach(a =>
        Animated.timing(a, { toValue: 0.1 + Math.random() * 0.9, duration: 100, useNativeDriver: true }).start()
      );
      go();
      waveRef.current = setInterval(go, 120);
      return () => { if (waveRef.current) clearInterval(waveRef.current); barAnims.forEach(a => a.setValue(0.15)); };
    }
  }, [isRecording, mode]);

  // Pulse rings animation (pronunciation mode only)
  React.useEffect(() => {
    if (mode !== 'pronunciation') return;
    if (!isRecording) {
      ring1.setValue(0); ring2.setValue(0); ring3.setValue(0);
      return;
    }
    const makePulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1, duration: 1400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
    const a1 = makePulse(ring1, 0);
    const a2 = makePulse(ring2, 470);
    const a3 = makePulse(ring3, 940);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); ring1.setValue(0); ring2.setValue(0); ring3.setValue(0); };
  }, [isRecording, mode]);

  const sendText = () => {
    if (!text.trim() || disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSendText(text.trim());
    setText('');
  };

  const micPressIn = async () => {
    if (disabled || isProcessing || isPreview) return;
    releasedRef.current = false;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await startRecording();
    if (releasedRef.current) await cancelRecording();
  };

  const micPressOut = async () => {
    releasedRef.current = true;
    if (!isRecording) return;
    const res = await stopRecording();
    if (res && res.duration >= 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Send immediately on release — no preview step
      if (onSendAudio) onSendAudio(res.uri, res.duration);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };


  const cancelPreview = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    player.pause();
    setPreviewUri(null);
    setPreviewDur(0);
  };

  const sendPreview = () => {
    if (!previewUri || !onSendAudio) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const uri = previewUri; const dur = previewDur;
    player.pause();
    setPreviewUri(null); setPreviewDur(0);
    onSendAudio(uri, dur);
  };

  const wrapper = {
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.topBorder,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
  };

  // ── Rate-limited overlay (shared across all modes) ────────────────────────
  if (rateLimited) {
    const isDaily  = rateLimited.type === 'daily';

    const formatCountdown = (secs: number) => {
      if (isDaily) {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}:${String(s).padStart(2, '0')}`;
    };

    const pillLabel = isDaily
      ? (isNovice ? `Volte amanhã  ${formatCountdown(countdown)}` : `Come back tomorrow  ${formatCountdown(countdown)}`)
      : (isNovice ? `Volte em ${formatCountdown(countdown)}` : `Come back in ${formatCountdown(countdown)}`);

    return (
      <View style={[wrapper, { gap: 8 }]}>
        {/* Lock pill */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          backgroundColor: '#F4F3FA', borderRadius: 24, borderWidth: 1,
          borderColor: 'rgba(22,21,58,0.09)', minHeight: 44,
          paddingHorizontal: 16, paddingVertical: 10, gap: 8,
        }}>
          <Lock size={15} color="#9896B8" weight="bold" />
          <AppText style={{
            color: '#4B4A72', fontSize: 14, fontWeight: '600',
            ...(Platform.OS === 'ios' ? { fontVariant: ['tabular-nums'] } : { fontFamily: 'monospace' }),
          }}>
            {pillLabel}
          </AppText>
        </View>

        {/* Upgrade CTA — trial users only */}
        {rateLimited.isTrial && (
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onUpgradePress?.(); }}
            activeOpacity={0.85}
            style={{
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: '#16153A', borderRadius: 24,
              minHeight: 44, paddingHorizontal: 20, paddingVertical: 10,
            }}
          >
            <AppText style={{ color: '#A3FF3C', fontSize: 14, fontWeight: '700' }}>
              {isNovice ? 'Ativar assinatura' : 'Upgrade your plan'}
            </AppText>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════
  //  PRONUNCIATION — pill + mic button (mesmo layout do chat)
  //  Idle: pill com label "Hold to record"
  //  Recording: pill com waveform + timer (igual chat)
  //  Preview: pill com play/pause + waveform + duration (igual chat)
  // ══════════════════════════════════════════════════════════
  if (mode === 'pronunciation') {
    return (
      <View style={wrapper}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>

          {/* Input pill — label idle / waveform recording / preview */}
          <View style={[styles.pill, { flex: 1, paddingHorizontal: 16, paddingVertical: 8 }]}>

            {/* Audio preview (mesmo do chat) */}
            {isPreview && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <TouchableOpacity
                  onPress={() => { if (isPlaying) player.pause(); else player.play(); }}
                  style={{ padding: 2 }}
                  accessibilityLabel={isPlaying
                    ? (isNovice ? 'Pausar / Pause' : 'Pause')
                    : (isNovice ? 'Reproduzir / Play' : 'Play')}
                  accessibilityRole="button"
                >
                  {isPlaying
                    ? <Pause size={16} color={C.navy} weight="fill" />
                    : <Play  size={16} color={C.navy} weight="fill" />
                  }
                </TouchableOpacity>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', height: 28, gap: 2 }}>
                  {Array.from({ length: BAR_COUNT }).map((_, i) => (
                    <View key={i} style={{
                      flex: 1, height: 4 + ((i * 5) % 16), borderRadius: 2,
                      backgroundColor: C.navy, opacity: isPlaying ? 0.6 : (0.2 + (i % 4) * 0.1),
                    }} />
                  ))}
                </View>
                <AppText style={{ color: C.navyLight, fontSize: 12, fontVariant: ['tabular-nums'] }}>
                  {formatDuration(previewDur)}
                </AppText>
                <TouchableOpacity
                  onPress={cancelPreview}
                  style={{ padding: 2 }}
                  accessibilityLabel={isNovice ? 'Cancelar / Cancel' : 'Cancel'}
                  accessibilityRole="button"
                >
                  <X size={16} color={C.red} weight="bold" />
                </TouchableOpacity>
              </View>
            )}

            {/* Recording waveform (mesmo do chat) */}
            {!isPreview && isRecording && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.red, flexShrink: 0 }} />
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', height: 28, gap: 2 }}>
                  {barAnims.map((anim, i) => (
                    <Animated.View key={i} style={{
                      flex: 1, height: 22, borderRadius: 2,
                      backgroundColor: C.navy, opacity: 0.4,
                      transform: [{ scaleY: anim }],
                    }} />
                  ))}
                </View>
                <AppText style={{
                  color: C.navy, fontSize: 13, minWidth: 36,
                  ...(Platform.OS === 'ios' ? { fontVariant: ['tabular-nums'] } : { fontFamily: 'monospace' }),
                }}>
                  {formatDuration(duration)}
                </AppText>
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); cancelRecording(); }}
                  style={{ padding: 2 }}
                  accessibilityLabel={isNovice ? 'Cancelar gravação / Cancel recording' : 'Cancel recording'}
                  accessibilityRole="button"
                >
                  <X size={16} color={C.red} weight="bold" />
                </TouchableOpacity>
              </View>
            )}

            {/* Idle: label de instrução (não editável) */}
            {!isPreview && !isRecording && (
              <View style={{ flex: 1, justifyContent: 'center', minHeight: 28 }}>
                <AppText style={{ color: C.navyLight, fontSize: 15, lineHeight: 22 }}>
                  {isNovice ? 'Segure o microfone pra gravar' : 'Hold the mic to record'}
                </AppText>
              </View>
            )}
          </View>

          {/* Action button — preview: send | idle/recording: mic */}
          {isPreview ? (
            <TouchableOpacity
              onPress={sendPreview}
              style={[styles.actionBtn, { backgroundColor: C.green }]}
              accessibilityLabel={isNovice ? 'Enviar áudio / Send audio' : 'Send audio'}
              accessibilityRole="button"
            >
              <ArrowUp size={20} color={C.navy} weight="bold" />
            </TouchableOpacity>
          ) : (
            <Pressable
              onPressIn={micPressIn}
              onPressOut={micPressOut}
              disabled={disabled || isProcessing}
              pressRetentionOffset={{ top: 30, bottom: 30, left: 30, right: 30 }}
              style={[styles.actionBtn, {
                backgroundColor: isRecording
                  ? C.red
                  : (disabled || isProcessing ? `${C.green}50` : C.green),
              }]}
              accessibilityLabel={isNovice ? 'Microfone — segure para gravar / Hold to record' : 'Hold to record audio'}
              accessibilityRole="button"
            >
              {isProcessing
                ? <Hourglass size={17} color={`${C.navy}60`} weight="regular" />
                : <Microphone size={20} color={isRecording ? '#FFFFFF' : C.navy} weight="bold" />
              }
            </Pressable>
          )}
        </View>
      </View>
    );
  }


  // ══════════════════════════════════════════════════════════
  //  GRAMMAR — text pill + send button outside (disabled when empty)
  // ══════════════════════════════════════════════════════════
  if (mode === 'grammar') {
    return (
      <View style={wrapper}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>

          {/* Input pill — mesma altura do chat/pronunciation */}
          <View style={[styles.pill, { flex: 1, paddingHorizontal: 16, paddingVertical: 8 }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={isNovice ? 'Digite em inglês...' : 'Type in English...'}
              placeholderTextColor={C.navyLight}
              style={{ color: C.navy, fontSize: 15, lineHeight: 22, maxHeight: 120, flex: 1 }}
              multiline
              returnKeyType="default"
              editable={!disabled}
              onSubmitEditing={hasText ? sendText : undefined}
            />
          </View>

          {/* Send button — sempre verde (consistente com mic dos outros modos),
              opacidade reduzida quando vazio sinaliza estado disabled. */}
          <TouchableOpacity
            onPress={sendText}
            disabled={disabled || !hasText}
            style={[
              styles.actionBtn,
              { backgroundColor: hasText ? C.green : `${C.green}50` },
            ]}
            accessibilityLabel={isNovice ? 'Enviar mensagem / Send message' : 'Send message'}
            accessibilityRole="button"
          >
            <ArrowUp size={20} color={hasText ? C.navy : `${C.navy}60`} weight="bold" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════
  //  CHAT — pill + outside button (mic ↔ send)
  // ══════════════════════════════════════════════════════════
  return (
    <View style={wrapper}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>

        {/* Input pill — shows text OR waveform OR preview */}
        <View style={[styles.pill, { flex: 1, paddingHorizontal: 16, paddingVertical: 8 }]}>

          {/* Audio preview */}
          {isPreview && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <TouchableOpacity
                onPress={() => { if (isPlaying) player.pause(); else player.play(); }}
                style={{ padding: 2 }}
                accessibilityLabel={isPlaying
                  ? (isNovice ? 'Pausar / Pause' : 'Pause')
                  : (isNovice ? 'Reproduzir / Play' : 'Play')}
                accessibilityRole="button"
              >
                {isPlaying
                  ? <Pause size={16} color={C.navy} weight="fill" />
                  : <Play  size={16} color={C.navy} weight="fill" />
                }
              </TouchableOpacity>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', height: 28, gap: 2 }}>
                {Array.from({ length: BAR_COUNT }).map((_, i) => (
                  <View key={i} style={{
                    flex: 1, height: 4 + ((i * 5) % 16), borderRadius: 2,
                    backgroundColor: C.navy, opacity: isPlaying ? 0.6 : (0.2 + (i % 4) * 0.1),
                  }} />
                ))}
              </View>
              <AppText style={{ color: C.navyLight, fontSize: 12, fontVariant: ['tabular-nums'] }}>
                {formatDuration(previewDur)}
              </AppText>
              <TouchableOpacity
                onPress={cancelPreview}
                style={{ padding: 2 }}
                accessibilityLabel={isNovice ? 'Cancelar / Cancel' : 'Cancel'}
                accessibilityRole="button"
              >
                <X size={16} color={C.red} weight="bold" />
              </TouchableOpacity>
            </View>
          )}

          {/* Recording waveform */}
          {!isPreview && isRecording && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.red, flexShrink: 0 }} />
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', height: 28, gap: 2 }}>
                {barAnims.map((anim, i) => (
                  <Animated.View key={i} style={{
                    flex: 1, height: 22, borderRadius: 2,
                    backgroundColor: C.navy, opacity: 0.4,
                    transform: [{ scaleY: anim }],
                  }} />
                ))}
              </View>
              <AppText style={{
                color: C.navy, fontSize: 13, minWidth: 36,
                ...(Platform.OS === 'ios' ? { fontVariant: ['tabular-nums'] } : { fontFamily: 'monospace' }),
              }}>
                {formatDuration(duration)}
              </AppText>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); cancelRecording(); }}
                style={{ padding: 2 }}
                accessibilityLabel={isNovice ? 'Cancelar gravação / Cancel recording' : 'Cancel recording'}
                accessibilityRole="button"
              >
                <X size={16} color={C.red} weight="bold" />
              </TouchableOpacity>
            </View>
          )}

          {/* Text input */}
          {!isPreview && !isRecording && (
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Type in English..."
              placeholderTextColor={C.navyLight}
              style={{ color: C.navy, fontSize: 15, lineHeight: 22, maxHeight: 120, flex: 1 }}
              multiline
              returnKeyType="default"
              editable={!disabled}
              onSubmitEditing={hasText ? sendText : undefined}
            />
          )}
        </View>

        {/* Action button — outside the pill */}
        {isPreview ? (
          // Preview: send audio
          <TouchableOpacity
            onPress={sendPreview}
            style={[styles.actionBtn, { backgroundColor: C.green }]}
            accessibilityLabel={isNovice ? 'Enviar áudio / Send audio' : 'Send audio'}
            accessibilityRole="button"
          >
            <ArrowUp size={20} color={C.navy} weight="bold" />
          </TouchableOpacity>
        ) : hasText ? (
          // Has text: send text
          <TouchableOpacity
            onPress={sendText}
            disabled={disabled}
            style={[styles.actionBtn, { backgroundColor: C.green, opacity: disabled ? 0.4 : 1 }]}
            accessibilityLabel={isNovice ? 'Enviar mensagem / Send message' : 'Send message'}
            accessibilityRole="button"
          >
            <ArrowUp size={20} color={C.navy} weight="bold" />
          </TouchableOpacity>
        ) : (
          // No text, no preview: mic
          <Pressable
            onPressIn={micPressIn}
            onPressOut={micPressOut}
            disabled={disabled || isProcessing}
            pressRetentionOffset={{ top: 30, bottom: 30, left: 30, right: 30 }}
            style={[styles.actionBtn, {
              backgroundColor: disabled || isProcessing ? `${C.green}50` : C.green,
            }]}
            accessibilityLabel={isNovice ? 'Microfone — segure para gravar / Hold to record' : 'Hold to record audio'}
            accessibilityRole="button"
          >
            {isProcessing
              ? <Hourglass size={17} color={`${C.navy}60`} weight="regular" />
              : <Microphone size={20} color={C.navy} weight="bold" />
            }
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = {
  pill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#F4F3FA',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(22,21,58,0.09)',
    minHeight: 44,
  },
  actionBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#A3FF3C',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
};
