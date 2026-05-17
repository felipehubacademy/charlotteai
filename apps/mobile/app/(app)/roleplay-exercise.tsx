/**
 * roleplay-exercise.tsx — Phase 3 MVP
 *
 * Voice-message role-play loop:
 *   user hold-to-record → upload to /api/roleplay/turn
 *   → renders user bubble + assistant audio bubble → auto-play assistant.
 *
 * This iteration ships the core audio loop wired end-to-end with the v2
 * curriculum role-play definition. Overlays (timer/checklist/hint/result card)
 * land in the next iteration.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, TouchableOpacity, StatusBar, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Microphone, X as XIcon } from 'phosphor-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer, RecordingPresets } from 'expo-audio';

import { AppText } from '@/components/ui/Text';
import ChatBox, { Message } from '@/components/chat/ChatBox';
import { useAuth } from '@/hooks/useAuth';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { getModule } from '@/lib/curriculum-v2/loader';
import type { Level as V2Level, RolePlay } from '@/lib/curriculum-v2/types';

const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

const C = {
  bg:          '#F4F3FA',
  card:        '#FFFFFF',
  navy:        '#16153A',
  navyMid:     '#4B4A72',
  navyLight:   '#9896B8',
  greenDark:   '#3D8800',
  green:       '#3D8800',
  red:         '#DC2626',
  border:      'rgba(22,21,58,0.08)',
};

// ── Main ──────────────────────────────────────────────────────────
export default function RolePlayExerciseScreen() {
  const params = useLocalSearchParams<{
    level?: string; moduleId?: string; unitId?: string;
  }>();
  const level    = (params.level ?? 'Novice') as V2Level;
  const moduleId = params.moduleId ?? '';
  const unitId   = params.unitId ?? '';

  const { profile } = useAuth();
  const userId      = profile?.id;
  const isPt        = level === 'Novice';

  // ── Load role-play definition from v2 ───────────────────────────
  const [rp, setRp] = useState<RolePlay | null>(null);
  const [unitTitle, setUnitTitle] = useState<string>('');
  useEffect(() => {
    const m = getModule(level, moduleId);
    if (!m) { router.back(); return; }
    const u = m.units.find(x => x.id === unitId);
    if (!u) { router.back(); return; }
    setRp(u.roleplay);
    setUnitTitle(u.title);
  }, [level, moduleId, unitId]);

  // ── Chat state ──────────────────────────────────────────────────
  const [messages, setMessages]               = useState<Message[]>([]);
  const [isProcessing, setIsProcessing]       = useState(false);
  const [transcript, setTranscript]           = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  // Conversation history for the backend (just role + content)
  const historyRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  // ── Player ─────────────────────────────────────────────────────
  const playerRef = useRef<AudioPlayer | null>(null);
  useEffect(() => {
    const p = createAudioPlayer(null);
    playerRef.current = p;
    return () => { try { p.pause(); p.remove(); } catch {} };
  }, []);

  // ── Show opening line as the first assistant message ────────────
  const openedRef = useRef(false);
  useEffect(() => {
    if (!rp || openedRef.current) return;
    openedRef.current = true;
    const id = `assist_${Date.now()}`;
    setMessages([{
      id, role: 'assistant', content: rp.opening_line,
      messageType: 'audio',
      timestamp: new Date(),
    }]);
    historyRef.current = [{ role: 'assistant', content: rp.opening_line }];
    // Fetch opener TTS + autoplay
    playAssistantOpener(id, rp);
  }, [rp]); // eslint-disable-line react-hooks/exhaustive-deps

  const playAssistantOpener = useCallback(async (msgId: string, rpDef: RolePlay) => {
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      const res = await fetch(`${API_BASE_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rpDef.opening_line, userId, source: 'roleplay-opener' }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const dir   = `${FileSystem.documentDirectory}roleplay/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
      const localUri = `${dir}${msgId}.flac`;
      await FileSystem.writeAsStringAsync(localUri, data.audio, { encoding: 'base64' as any });
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, audioUrl: localUri } : m));
      // Autoplay
      setPlayingMessageId(msgId);
      const p = playerRef.current;
      if (p) {
        p.replace({ uri: localUri });
        p.addListener('playbackStatusUpdate', s => {
          if (s.didJustFinish) setPlayingMessageId(prev => prev === msgId ? null : prev);
        });
        try { p.play(); } catch {}
      }
    } catch (e) { console.warn('[roleplay] opener TTS failed', e); }
  }, [userId]);

  // ── Audio recorder ──────────────────────────────────────────────
  const recorder = useAudioRecorder(RECORDING_OPTIONS, 30);
  const [isRecording, setIsRecording] = useState(false);

  const startRec = useCallback(async () => {
    if (isProcessing || isRecording) return;
    try {
      await recorder.startRecording();
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) { console.warn('[roleplay] start record failed', e); }
  }, [isProcessing, isRecording, recorder]);

  const stopRecAndSend = useCallback(async () => {
    if (!isRecording) return;
    setIsRecording(false);
    const result = await recorder.stopRecording();
    if (!result?.uri || !rp) return;

    // Push user bubble with audioUri (the local recording)
    const userMsgId = `user_${Date.now()}`;
    setMessages(prev => [...prev, {
      id: userMsgId, role: 'user', content: '',
      audioUri: result.uri, audioDuration: result.duration,
      messageType: 'audio', timestamp: new Date(),
    }]);

    setIsProcessing(true);
    try {
      const lower    = result.uri.toLowerCase();
      const isWav    = lower.endsWith('.wav');
      const formData = new FormData();
      formData.append('audio', {
        uri: result.uri,
        name: isWav ? 'turn.wav' : 'turn.m4a',
        type: isWav ? 'audio/wav' : 'audio/x-m4a',
      } as unknown as Blob);
      formData.append('payload', JSON.stringify({
        history:    historyRef.current,
        role_play:  rp,
        level,
        unit_title: unitTitle,
      }));
      if (userId) formData.append('user_id', userId);

      const res  = await fetch(`${API_BASE_URL}/api/roleplay/turn`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'turn failed');

      // Update user bubble with transcript
      setMessages(prev => prev.map(m => m.id === userMsgId
        ? { ...m, content: data.user_transcript ?? '' }
        : m
      ));
      historyRef.current.push({ role: 'user', content: data.user_transcript ?? '' });

      // Persist assistant audio locally + render
      const aMsgId = `assist_${Date.now()}`;
      const dir   = `${FileSystem.documentDirectory}roleplay/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
      const localUri = `${dir}${aMsgId}.flac`;
      await FileSystem.writeAsStringAsync(localUri, data.assistant_audio_b64, { encoding: 'base64' as any });

      setMessages(prev => [...prev, {
        id: aMsgId, role: 'assistant',
        content: data.assistant_text ?? '',
        audioUrl: localUri,
        messageType: 'audio', timestamp: new Date(),
      }]);
      historyRef.current.push({ role: 'assistant', content: data.assistant_text ?? '' });

      // Log objectives for debug (UI overlay arrives next iteration)
      if (Array.isArray(data.objectives_met) && data.objectives_met.length) {
        console.log('[roleplay] objectives met:', data.objectives_met);
      }

      // Autoplay assistant
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      setPlayingMessageId(aMsgId);
      const p = playerRef.current;
      if (p) {
        p.replace({ uri: localUri });
        p.addListener('playbackStatusUpdate', s => {
          if (s.didJustFinish) setPlayingMessageId(prev => prev === aMsgId ? null : prev);
        });
        try { p.play(); } catch {}
      }

      if (data.status === 'complete') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Result card chega na próxima iteração. Por enquanto, só desabilita o input.
      }
    } catch (e: any) {
      console.warn('[roleplay] turn failed', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsProcessing(false);
    }
  }, [isRecording, recorder, rp, level, unitTitle, userId]);

  // Play a specific message on tap (replay)
  const onPlayAudio = useCallback((messageId: string, uri: string) => {
    const p = playerRef.current; if (!p) return;
    setPlayingMessageId(messageId);
    p.replace({ uri });
    p.addListener('playbackStatusUpdate', s => {
      if (s.didJustFinish) setPlayingMessageId(prev => prev === messageId ? null : prev);
    });
    try { p.play(); } catch {}
  }, []);

  // ── Pulse animation pro mic enquanto grava ─────────────────────
  const micPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isRecording) { micPulse.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(micPulse, { toValue: 1.18, duration: 600, useNativeDriver: true }),
      Animated.timing(micPulse, { toValue: 1,    duration: 600, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [isRecording]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!rp) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.navy} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Header: persona badge + back button ──────────────────── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 16, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: C.border,
        backgroundColor: C.card,
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ArrowLeft size={22} color={C.navy} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <AppText style={{ fontSize: 14, fontWeight: '700', color: C.navy }}>
            {rp.persona}
          </AppText>
          <AppText style={{ fontSize: 11, color: C.navyLight, marginTop: 1 }} numberOfLines={1}>
            {rp.scenario}
          </AppText>
        </View>
        <View style={{
          backgroundColor: 'rgba(61,136,0,0.10)', paddingHorizontal: 10, paddingVertical: 4,
          borderRadius: 8,
        }}>
          <AppText style={{ fontSize: 10, fontWeight: '700', color: C.greenDark, letterSpacing: 0.5 }}>
            ROLE-PLAY
          </AppText>
        </View>
      </View>

      {/* ── ChatBox ───────────────────────────────────────────────── */}
      <View style={{ flex: 1 }}>
        <ChatBox
          messages={messages}
          transcript={transcript}
          finalTranscript={finalTranscript}
          isProcessingMessage={isProcessing}
          isProcessingAudio={isProcessing}
          userLevel={level}
          mode="chat"
          onPlayAudio={onPlayAudio}
          playingMessageId={playingMessageId}
        />
      </View>

      {/* ── Mic input (hold to record) ───────────────────────────── */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{
          paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20,
          backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border,
          flexDirection: 'row', alignItems: 'center', gap: 12,
        }}>
          <View style={{ flex: 1 }}>
            <AppText style={{ fontSize: 13, color: C.navyMid, textAlign: 'center' }}>
              {isRecording
                ? (isPt ? 'Gravando… solte pra enviar' : 'Recording… release to send')
                : (isPt ? 'Segure o microfone pra falar' : 'Hold the mic to speak')}
            </AppText>
          </View>
          <Animated.View style={{ transform: [{ scale: micPulse }] }}>
            <TouchableOpacity
              onPressIn={startRec}
              onPressOut={stopRecAndSend}
              disabled={isProcessing}
              style={{
                width: 64, height: 64, borderRadius: 32,
                backgroundColor: isProcessing
                  ? 'rgba(61,136,0,0.45)'
                  : (isRecording ? C.red : C.green),
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              {isProcessing
                ? <ActivityIndicator color="#FFF" />
                : isRecording
                  ? <XIcon size={28} color="#FFF" weight="bold" />
                  : <Microphone size={28} color="#FFF" weight="fill" />
              }
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
