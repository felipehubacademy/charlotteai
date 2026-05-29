// SimpleSpeakExercise — UX base-da-base pra role-play scripted.simple_speak.
//
// Layout estilo L&S mas julga CONTEUDO (nao pronuncia):
//   1. Mount → download audio CDN + autoplay "Hi! How are you?"
//   2. Aluno segura mic e fala qualquer coisa
//   3. Release → Whisper STT → LLM judge → result slide-up
//   4. Pass: "Boa!" + Proximo | Fail: "Quase!" + Tentar de novo / Pular
//
// Sem loop aberto. 1 troca = 1 julgamento.

import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, Pressable, Animated, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, AudioPlayer, useAudioRecorder, setAudioModeAsync, RecordingPresets } from 'expo-audio';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Microphone, SpeakerHigh, Lightbulb, ArrowsClockwise } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import type { RolePlay } from '@/lib/curriculum-v2/types';
import Constants from 'expo-constants';
import { soundEngine } from '@/lib/soundEngine';

const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

const C = {
  bg:        '#FAF9FF',
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  ghost:     'rgba(22,21,58,0.06)',
  border:    'rgba(22,21,58,0.10)',
  green:     '#3D8800',
  greenBg:   '#EDFFD0',
  red:       '#DC2626',
  redBg:     '#FFF0F0',
  violet:    '#7C3AED',
  violetBg:  '#F5F3FF',
};

type Status = 'loading_audio' | 'listening' | 'recording' | 'evaluating' | 'result';

interface Props {
  rp:        RolePlay;
  isPt:      boolean;
  unitTitle: string;
  onBack:    () => void;
  /** Chamado quando o user toca "Proximo" ou "Pular". score 100 se passed, senao 0. */
  onComplete: (score: number) => void;
}

export function SimpleSpeakExercise({ rp, isPt, unitTitle, onBack, onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const ss = rp.scripted;

  const [status, setStatus]               = useState<Status>('loading_audio');
  const [questionAudioUri, setQAUri]       = useState<string | null>(null);
  const [result, setResult]               = useState<{ passed: boolean; feedback_pt: string; feedback_en: string } | null>(null);
  const [transcript, setTranscript]       = useState('');
  const [attemptCount, setAttemptCount]   = useState(0);
  const slideAnim                          = useRef(new Animated.Value(0)).current;
  const playerRef                          = useRef<AudioPlayer | null>(null);

  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    ios: {
      extension: '.wav', outputFormat: 'lpcm' as any, audioQuality: 127,
      sampleRate: 16000, linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false,
    },
  });

  // Setup player on mount
  useEffect(() => {
    playerRef.current = createAudioPlayer(null);
    return () => { try { playerRef.current?.pause(); playerRef.current?.remove(); } catch {} };
  }, []);

  // Download + autoplay question
  useEffect(() => {
    const qAudio = ss?.question?.audio;
    if (!qAudio) { setStatus('listening'); return; }
    let cancelled = false;
    (async () => {
      try {
        const dir = `${FileSystem.documentDirectory}simple-speak/`;
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
        const local = `${dir}q.mp3`;
        await FileSystem.downloadAsync(qAudio, local);
        if (cancelled) return;
        setQAUri(local);
        setStatus('listening');
        // Autoplay com pequeno delay pra tela settle
        setTimeout(async () => {
          try {
            await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldRouteThroughEarpiece: false });
          } catch {}
          try { playerRef.current?.replace({ uri: local }); playerRef.current?.play(); } catch {}
        }, 300);
      } catch (e) {
        console.warn('[simple-speak] download failed', e);
        setStatus('listening');
      }
    })();
    return () => { cancelled = true; };
  }, [ss?.question?.audio]);

  const playQuestion = () => {
    if (!questionAudioUri) return;
    try {
      playerRef.current?.replace({ uri: questionAudioUri });
      playerRef.current?.play();
    } catch {}
  };

  const startRec = async () => {
    if (status !== 'listening') return;
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, interruptionMode: 'doNotMix' });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setStatus('recording');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) { console.warn('[simple-speak] start rec failed', e); }
  };

  const stopRecAndJudge = async () => {
    if (status !== 'recording') return;
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) { setStatus('listening'); return; }
      setStatus('evaluating');
      setAttemptCount(prev => prev + 1);

      // 1. Whisper STT
      const fd = new FormData();
      const isWav = uri.toLowerCase().endsWith('.wav');
      fd.append('audio', {
        uri, name: isWav ? 'rec.wav' : 'rec.m4a', type: isWav ? 'audio/wav' : 'audio/x-m4a',
      } as unknown as Blob);
      const tRes = await fetch(`${API_BASE_URL}/api/transcribe`, { method: 'POST', body: fd });
      if (!tRes.ok) throw new Error('transcribe failed');
      const tData = await tRes.json();
      const transcript = (tData.transcription as string) ?? '';
      setTranscript(transcript);

      // 2. LLM judge
      const jRes = await fetch(`${API_BASE_URL}/api/judge-objective`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          hidden_prompt: ss?.hidden_prompt ?? '',
          expected_response_en: ss?.expected_response?.en ?? '',
          level: 'Novice',
        }),
      });
      if (!jRes.ok) throw new Error('judge failed');
      const jData = await jRes.json();
      setResult({
        passed:      Boolean(jData.passed),
        feedback_pt: String(jData.feedback_pt ?? ''),
        feedback_en: String(jData.feedback_en ?? ''),
      });
      setStatus('result');
      Haptics.notificationAsync(jData.passed ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
      soundEngine.play(jData.passed ? 'answer_correct' : 'answer_wrong').catch(() => {});
      Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 60 }).start();
    } catch (e) {
      console.warn('[simple-speak] judge failed', e);
      setStatus('listening');
    }
  };

  const handleRetry = () => {
    slideAnim.setValue(0);
    setResult(null);
    setStatus('listening');
    setTimeout(() => playQuestion(), 200);
  };

  const handleNext = () => {
    onComplete(result?.passed ? 100 : 0);
  };

  const accent   = C.violet;
  const accentBg = C.violetBg;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={C.navy} weight="bold" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <AppText style={{ fontSize: 11, color: C.navyLight, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            {isPt ? 'Role-play' : 'Role-play'}
          </AppText>
          <AppText style={{ fontSize: 16, fontWeight: '800', color: C.navy }} numberOfLines={1}>{unitTitle}</AppText>
        </View>
        <View style={{ width: 22 }} />
      </View>

      {/* Body */}
      <View style={{ flex: 1, padding: 20 }}>
        {/* Charlotte avatar (big, central top) */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <View style={{ width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#F97316', backgroundColor: '#16153A', overflow: 'hidden' }}>
            <Image source={require('@/assets/charlotte-avatar.png')} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          </View>
        </View>

        {/* Question card */}
        <View style={{
          backgroundColor: accentBg, borderRadius: 16, padding: 16,
          borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)',
          flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24,
        }}>
          <TouchableOpacity onPress={playQuestion} activeOpacity={0.7} disabled={!questionAudioUri}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
            <SpeakerHigh size={22} color="#FFF" weight="fill" />
          </TouchableOpacity>
          <AppText style={{ flex: 1, fontSize: 18, fontWeight: '700', color: C.navy, lineHeight: 24 }}>
            {ss?.question?.text ?? rp.opening_line}
          </AppText>
        </View>

        {/* Scaffold "Diga: ..." (sempre visivel) */}
        {ss?.expected_response && (
          <View style={{
            backgroundColor: C.navy, borderRadius: 12, padding: 14,
            flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 24,
          }}>
            <Lightbulb size={18} color="#FFD27A" weight="fill" />
            <View style={{ flex: 1 }}>
              {isPt && ss.expected_response.pt_hint && (
                <AppText style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 16, marginBottom: 4 }}>
                  {ss.expected_response.pt_hint}
                </AppText>
              )}
              <AppText style={{ color: '#FFF', fontSize: 16, fontWeight: '700', lineHeight: 22 }}>
                {ss.expected_response.en}
              </AppText>
            </View>
          </View>
        )}

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Mic / Loading state */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          {status === 'loading_audio' && (
            <ActivityIndicator size="large" color={accent} />
          )}
          {status === 'evaluating' && (
            <View style={{ alignItems: 'center' }}>
              <ActivityIndicator size="large" color={accent} />
              <AppText style={{ fontSize: 13, color: C.navyMid, marginTop: 8 }}>{isPt ? 'Analisando…' : 'Checking…'}</AppText>
            </View>
          )}
          {(status === 'listening' || status === 'recording') && (
            <>
              <Pressable
                onPressIn={startRec}
                onPressOut={stopRecAndJudge}
                pressRetentionOffset={{ top: 20, left: 20, right: 20, bottom: 20 }}
                style={{
                  width: 88, height: 88, borderRadius: 44,
                  backgroundColor: status === 'recording' ? C.red : accent,
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: accent, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
                }}
              >
                <Microphone size={36} color="#FFF" weight="fill" />
              </Pressable>
              <AppText style={{ fontSize: 14, color: C.navyMid, marginTop: 12, textAlign: 'center' }}>
                {status === 'recording'
                  ? (isPt ? 'Gravando… solte pra enviar' : 'Recording… release to send')
                  : (isPt ? 'Segure pra falar' : 'Hold to speak')}
              </AppText>
            </>
          )}
        </View>
      </View>

      {/* ── Result slide-up panel ────────────────────────────────────── */}
      {status === 'result' && result && (
        <Animated.View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: result.passed ? C.greenBg : C.redBg,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingHorizontal: 24, paddingTop: 20,
          paddingBottom: insets.bottom + 20,
          transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] }) }],
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            {result.passed
              ? <CheckCircle size={26} color={C.green} weight="fill" />
              : <XCircle size={26} color={C.red} weight="fill" />
            }
            <AppText style={{ fontSize: 18, fontWeight: '800', color: result.passed ? C.green : C.red, flex: 1 }}>
              {result.passed ? (isPt ? 'Boa! Você acertou.' : 'Nailed it!') : (isPt ? 'Quase…' : 'Almost…')}
            </AppText>
            {result.passed && (
              <View style={{ backgroundColor: 'rgba(61,136,0,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                <AppText style={{ fontSize: 12, fontWeight: '800', color: C.green }}>+10 XP</AppText>
              </View>
            )}
          </View>

          {!!transcript && (
            <View style={{ padding: 10, backgroundColor: 'rgba(22,21,58,0.06)', borderRadius: 10, marginBottom: 10 }}>
              <AppText style={{ fontSize: 11, fontWeight: '700', color: C.navyMid, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 2 }}>
                {isPt ? 'Você disse' : 'You said'}
              </AppText>
              <AppText style={{ fontSize: 14, color: C.navy }}>{transcript}</AppText>
            </View>
          )}

          <View style={{ padding: 12, backgroundColor: 'rgba(22,21,58,0.06)', borderRadius: 12, marginBottom: 14 }}>
            <AppText style={{ fontSize: 13, color: C.navy, lineHeight: 19 }}>
              {isPt ? result.feedback_pt : result.feedback_en}
            </AppText>
            {!result.passed && ss?.expected_response?.en && (
              <AppText style={{ fontSize: 14, fontWeight: '700', color: C.navy, marginTop: 6 }}>
                {isPt ? 'Esperávamos: ' : 'Expected: '}<AppText style={{ color: C.violet }}>{ss.expected_response.en}</AppText>
              </AppText>
            )}
          </View>

          {result.passed ? (
            <TouchableOpacity onPress={handleNext} activeOpacity={0.85}
              style={{ backgroundColor: C.green, borderRadius: 16, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <AppText style={{ fontSize: 15, fontWeight: '800', color: '#FFF' }}>{isPt ? 'Concluir' : 'Finish'}</AppText>
              <ArrowRight size={18} color="#FFF" weight="bold" />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity onPress={handleRetry} activeOpacity={0.85}
                style={{ backgroundColor: C.red, borderRadius: 16, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <ArrowsClockwise size={18} color="#FFF" weight="bold" />
                <AppText style={{ fontSize: 15, fontWeight: '800', color: '#FFF' }}>{isPt ? 'Tentar de novo' : 'Try again'}</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNext} style={{ alignItems: 'center', marginTop: 12 }}>
                <AppText style={{ fontSize: 13, color: C.red, fontWeight: '600', opacity: 0.7 }}>
                  {isPt ? 'Pular' : 'Skip'}
                </AppText>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
