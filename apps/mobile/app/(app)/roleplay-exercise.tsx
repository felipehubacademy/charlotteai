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
import { ArrowLeft, Microphone, X as XIcon, CheckCircle, Lightbulb, Trophy, ArrowsClockwise } from 'phosphor-react-native';
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
import { useLearnProgressV2 } from '@/hooks/useLearnProgressV2';

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
  const [objectivesMet, setObjectivesMet]     = useState<Set<number>>(new Set());
  const [sessionComplete, setSessionComplete] = useState(false);
  const [hintsUsed, setHintsUsed]             = useState(0);
  const [hintVisible, setHintVisible]         = useState<string | null>(null);
  const [remainingSec, setRemainingSec]       = useState<number>(0);
  const startTimeRef = useRef<number>(0);

  // v2 progress (write on completion)
  const v2Progress = useLearnProgressV2(userId, level);

  // Conversation history for the backend (just role + content)
  const historyRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  // ── Player ─────────────────────────────────────────────────────
  // Mantemos UM player single-instance e UM listener didJustFinish.
  // onPlayAudio toggla pause/play se a mesma msg, ou troca a fonte se outra.
  const playerRef = useRef<AudioPlayer | null>(null);
  useEffect(() => {
    const p = createAudioPlayer(null);
    playerRef.current = p;
    const sub = p.addListener('playbackStatusUpdate', s => {
      if (s.didJustFinish) setPlayingMessageId(null);
    });
    return () => { try { sub.remove(); p.pause(); p.remove(); } catch {} };
  }, []);

  // ── Show opening line as the first assistant message ────────────
  // NÃO pusha bubble vazio. Enquanto TTS carrega, isProcessing=true →
  // ChatBox renderiza o TypingIndicator (mic animado) na posição da
  // próxima mensagem. Quando o áudio chega, pusha o bubble real.
  const openedRef = useRef(false);
  useEffect(() => {
    if (!rp || openedRef.current) return;
    openedRef.current = true;
    historyRef.current = [{ role: 'assistant', content: rp.opening_line }];
    startTimeRef.current = Date.now();
    setRemainingSec(rp.time_budget_sec);
    setIsProcessing(true);
    playAssistantOpener(`assist_${Date.now()}`, rp);
  }, [rp]); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer countdown — auto-encerra ao zerar
  useEffect(() => {
    if (!rp || sessionComplete) return;
    const tick = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, rp.time_budget_sec - elapsed);
      setRemainingSec(remaining);
      if (remaining === 0) {
        setSessionComplete(true);
        clearInterval(tick);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [rp, sessionComplete]);

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
      // Audio pronto: pusha o bubble real, encerra o typing indicator
      setMessages(prev => [...prev, {
        id: msgId, role: 'assistant',
        content: rpDef.opening_line,
        audioUrl: localUri,
        messageType: 'audio',
        timestamp: new Date(),
      }]);
      setIsProcessing(false);
      const p = playerRef.current;
      if (p) {
        p.replace({ uri: localUri });
        setPlayingMessageId(msgId);
        try { p.play(); } catch {}
      }
    } catch (e) { console.warn('[roleplay] opener TTS failed', e); setIsProcessing(false); }
  }, [userId]);

  // Save attempt to learn_history_v2 when session completes (or timer expires).
  // Score = % objectives met. completed=true only when score === 100 (threshold).
  const savedRef = useRef(false);
  useEffect(() => {
    if (!sessionComplete || savedRef.current || !rp) return;
    savedRef.current = true;
    const total = rp.objectives.length || 1;
    const score = Math.round((objectivesMet.size / total) * 100);
    v2Progress.saveAttempt(moduleId, unitId, 'roleplay', score)
      .catch(e => console.warn('[roleplay] saveAttempt failed', e));
  }, [sessionComplete, rp, objectivesMet, moduleId, unitId, v2Progress]);

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

      // Tick checklist + haptic celebration por objetivo batido nesse turno
      if (Array.isArray(data.objectives_met) && data.objectives_met.length) {
        setObjectivesMet(prev => {
          const next = new Set(prev);
          let firedHaptic = false;
          for (const n of data.objectives_met) {
            if (typeof n === 'number' && !next.has(n)) {
              next.add(n);
              if (!firedHaptic) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                firedHaptic = true;
              }
            }
          }
          return next;
        });
      }

      // Autoplay assistant
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      const p = playerRef.current;
      if (p) {
        p.replace({ uri: localUri });
        setPlayingMessageId(aMsgId);
        try { p.play(); } catch {}
      }

      if (data.status === 'complete') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSessionComplete(true);
      }
    } catch (e: any) {
      console.warn('[roleplay] turn failed', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsProcessing(false);
    }
  }, [isRecording, recorder, rp, level, unitTitle, userId]);

  // ── Restart sessão (Result Card → Refazer) ─────────────────────
  const restartSession = useCallback(() => {
    if (!rp) return;
    setMessages([]);
    setObjectivesMet(new Set());
    setSessionComplete(false);
    setHintsUsed(0);
    setHintVisible(null);
    savedRef.current = false;
    historyRef.current = [{ role: 'assistant', content: rp.opening_line }];
    startTimeRef.current = Date.now();
    setRemainingSec(rp.time_budget_sec);
    setIsProcessing(true);
    playAssistantOpener(`assist_${Date.now()}`, rp);
  }, [rp]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Need a hand? — shows hint of the NEXT pending objective ─────
  // Disponivel só pra Novice/Inter (Advanced reformula sozinho via prompt).
  const showHint = useCallback(() => {
    if (!rp || level === 'Advanced' || sessionComplete) return;
    const pending = rp.objectives.find(o => !objectivesMet.has(o.id));
    if (!pending) return;
    const hint = isPt ? (pending.hint_pt ?? pending.label_pt) : (pending.hint_en ?? pending.label_en);
    setHintVisible(hint);
    setHintsUsed(prev => prev + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setHintVisible(null), 6000);
  }, [rp, level, sessionComplete, objectivesMet, isPt]);

  // Tap no bubble: toggla pause/play se for a mesma mensagem,
  // ou troca a fonte e toca se for outra. Listener didJustFinish é
  // anexado UMA vez no mount, então não acumula a cada chamada.
  const onPlayAudio = useCallback((messageId: string, uri: string) => {
    const p = playerRef.current; if (!p) return;

    if (playingMessageId === messageId) {
      if (p.playing) {
        try { p.pause(); } catch {}
        setPlayingMessageId(null);
      } else {
        try { p.play(); } catch {}
        setPlayingMessageId(messageId);
      }
      return;
    }

    p.replace({ uri });
    setPlayingMessageId(messageId);
    try { p.play(); } catch {}
  }, [playingMessageId]);

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

  const objectivesDone  = objectivesMet.size;
  const objectivesTotal = rp.objectives.length;
  const timerStr = `${Math.floor(remainingSec / 60).toString().padStart(2, '0')}:${(remainingSec % 60).toString().padStart(2, '0')}`;
  const timerWarn = remainingSec > 0 && remainingSec <= 30;
  const showHintBtn = level !== 'Advanced';
  const allObjectivesDone = objectivesDone === objectivesTotal;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.card} />

      {/* ── Header: persona badge + back button ──────────────────── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 16, paddingVertical: 10,
        backgroundColor: C.card,
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ArrowLeft size={22} color={C.navy} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <AppText style={{ fontSize: 15, fontWeight: '700', color: C.navy }}>
            {rp.persona}
          </AppText>
          <AppText style={{ fontSize: 11, color: C.navyLight, marginTop: 1, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: '600' }}>
            {isPt ? 'Role-play' : 'Role-play'}
          </AppText>
        </View>
        {/* Timer pill — fica vermelho nos últimos 30s */}
        <View style={{
          backgroundColor: timerWarn ? 'rgba(220,38,38,0.10)' : 'rgba(22,21,58,0.06)',
          paddingHorizontal: 10, paddingVertical: 5,
          borderRadius: 10,
          minWidth: 56, alignItems: 'center',
        }}>
          <AppText style={{
            fontSize: 13, fontWeight: '700',
            color: timerWarn ? C.red : C.navy,
            ...(Platform.OS === 'ios' ? { fontVariant: ['tabular-nums'] } : { fontFamily: 'monospace' }),
          }}>
            {timerStr}
          </AppText>
        </View>
      </View>

      {/* ── Checklist fixo (sempre visível enquanto rola) ────────── */}
      <View style={{
        marginHorizontal: 14, marginTop: 6, marginBottom: 10,
        padding: 14, borderRadius: 14,
        backgroundColor: 'rgba(22,21,58,0.04)',
        borderWidth: 1, borderColor: C.border,
      }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 10,
        }}>
          <AppText style={{
            fontSize: 10, fontWeight: '700', color: C.navyLight,
            letterSpacing: 1.2, textTransform: 'uppercase',
          }}>
            {isPt ? 'Sua missão' : 'Your mission'}
          </AppText>
          <AppText style={{
            fontSize: 11, fontWeight: '700',
            color: allObjectivesDone ? C.greenDark : C.navyMid,
          }}>
            {objectivesDone}/{objectivesTotal}
          </AppText>
        </View>
        <View style={{ gap: 8 }}>
          {rp.objectives.map(obj => {
            const met   = objectivesMet.has(obj.id);
            const label = isPt ? obj.label_pt : (obj.label_en || obj.label_pt);
            return (
              <View key={obj.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {met
                  ? <CheckCircle size={18} color={C.greenDark} weight="fill" />
                  : <View style={{
                      width: 16, height: 16, borderRadius: 8,
                      borderWidth: 1.5, borderColor: C.navyLight, marginHorizontal: 1,
                    }} />
                }
                <AppText style={{
                  flex: 1, fontSize: 13,
                  color: met ? C.navyMid : C.navy,
                  fontWeight: met ? '500' : '600',
                  textDecorationLine: met ? 'line-through' : 'none',
                }}>
                  {label}
                </AppText>
              </View>
            );
          })}
        </View>
      </View>

      {/* ── ChatBox com cenário rolando como banner ──────────────── */}
      <View style={{ flex: 1, backgroundColor: C.bg }}>
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
          topBanner={
            <View style={{
              marginBottom: 12, padding: 14, borderRadius: 14,
              backgroundColor: 'rgba(22,21,58,0.04)',
              borderWidth: 1, borderColor: C.border,
            }}>
              <AppText style={{
                fontSize: 10, fontWeight: '700', color: C.navyLight,
                letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6,
              }}>
                {isPt ? 'Cenário' : 'Scenario'}
              </AppText>
              <AppText style={{
                fontSize: 13, color: C.navyMid, lineHeight: 18,
              }}>
                {rp.scenario}
              </AppText>
            </View>
          }
        />
      </View>

      {/* ── Hint popup (acima do input) ──────────────────────────── */}
      {hintVisible && (
        <View style={{
          position: 'absolute', left: 16, right: 16, bottom: 110,
          backgroundColor: C.navy, borderRadius: 12, padding: 14,
          flexDirection: 'row', gap: 10, alignItems: 'flex-start',
          shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 }, elevation: 6,
        }}>
          <Lightbulb size={18} color="#FFD27A" weight="fill" />
          <AppText style={{ flex: 1, color: '#FFF', fontSize: 13, lineHeight: 18 }}>
            {hintVisible}
          </AppText>
          <TouchableOpacity onPress={() => setHintVisible(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <XIcon size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Mic input (hold to record) + hint button ─────────────── */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{
          paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20,
          backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border,
          flexDirection: 'row', alignItems: 'center', gap: 10,
        }}>
          {showHintBtn && !sessionComplete && !allObjectivesDone && (
            <TouchableOpacity
              onPress={showHint}
              disabled={isProcessing}
              style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: 'rgba(217,119,6,0.12)',
                borderWidth: 1, borderColor: 'rgba(217,119,6,0.30)',
                alignItems: 'center', justifyContent: 'center',
              }}
              accessibilityLabel={isPt ? 'Dica' : 'Hint'}
            >
              <Lightbulb size={20} color="#B45309" weight="fill" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <AppText style={{ fontSize: 13, color: C.navyMid, textAlign: 'center' }}>
              {sessionComplete
                ? (isPt ? 'Missão concluída!' : 'Mission complete!')
                : isRecording
                  ? (isPt ? 'Gravando… solte pra enviar' : 'Recording… release to send')
                  : (isPt ? 'Segure o microfone pra falar' : 'Hold the mic to speak')}
            </AppText>
          </View>
          <Animated.View style={{ transform: [{ scale: micPulse }] }}>
            <TouchableOpacity
              onPressIn={startRec}
              onPressOut={stopRecAndSend}
              disabled={isProcessing || sessionComplete}
              style={{
                width: 64, height: 64, borderRadius: 32,
                backgroundColor: (sessionComplete || isProcessing)
                  ? 'rgba(22,21,58,0.15)'
                  : (isRecording ? C.red : C.green),
                alignItems: 'center', justifyContent: 'center',
                opacity: isProcessing ? 0.5 : 1,
              }}
            >
              {isRecording
                ? <XIcon size={28} color="#FFF" weight="bold" />
                : <Microphone size={28} color={(sessionComplete || isProcessing) ? C.navyLight : '#FFF'} weight="fill" />
              }
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>

      {/* ── Result card overlay (sessão concluída) ───────────────── */}
      {sessionComplete && (
        <View style={{
          ...StyleSheetAbsoluteFill,
          backgroundColor: 'rgba(22,21,58,0.55)',
          alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}>
          <View style={{
            backgroundColor: C.card, borderRadius: 20, padding: 24,
            width: '100%', maxWidth: 400, alignItems: 'center',
            shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 }, elevation: 10,
          }}>
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: allObjectivesDone ? 'rgba(61,136,0,0.12)' : 'rgba(217,119,6,0.12)',
              alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}>
              <Trophy size={32} color={allObjectivesDone ? C.greenDark : '#B45309'} weight="fill" />
            </View>
            <AppText style={{ fontSize: 20, fontWeight: '800', color: C.navy, marginBottom: 4 }}>
              {allObjectivesDone
                ? (isPt ? 'Missão concluída!' : 'Mission complete!')
                : (isPt ? 'Tempo esgotado' : 'Time up')}
            </AppText>
            <AppText style={{ fontSize: 13, color: C.navyMid, marginBottom: 20, textAlign: 'center' }}>
              {allObjectivesDone
                ? (isPt ? 'Você bateu todos os objetivos.' : 'You hit all objectives.')
                : (isPt ? `Você bateu ${objectivesDone} de ${objectivesTotal}.` : `You hit ${objectivesDone} of ${objectivesTotal}.`)}
            </AppText>

            {/* Objectives breakdown */}
            <View style={{ width: '100%', gap: 8, marginBottom: 20 }}>
              {rp.objectives.map(obj => {
                const met = objectivesMet.has(obj.id);
                const label = isPt ? obj.label_pt : (obj.label_en || obj.label_pt);
                return (
                  <View key={obj.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {met
                      ? <CheckCircle size={18} color={C.greenDark} weight="fill" />
                      : <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: C.navyLight, marginHorizontal: 1 }} />
                    }
                    <AppText style={{ flex: 1, fontSize: 13, color: met ? C.navyMid : C.navy }}>
                      {label}
                    </AppText>
                  </View>
                );
              })}
            </View>

            {/* Stats line */}
            <View style={{
              flexDirection: 'row', justifyContent: 'space-around',
              width: '100%', paddingVertical: 12,
              borderTopWidth: 1, borderTopColor: C.border,
              borderBottomWidth: 1, borderBottomColor: C.border,
              marginBottom: 20,
            }}>
              <View style={{ alignItems: 'center' }}>
                <AppText style={{ fontSize: 18, fontWeight: '800', color: C.navy }}>
                  {Math.floor((rp.time_budget_sec - remainingSec) / 60)}:{((rp.time_budget_sec - remainingSec) % 60).toString().padStart(2, '0')}
                </AppText>
                <AppText style={{ fontSize: 10, fontWeight: '600', color: C.navyLight, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  {isPt ? 'Tempo' : 'Time'}
                </AppText>
              </View>
              <View style={{ alignItems: 'center' }}>
                <AppText style={{ fontSize: 18, fontWeight: '800', color: C.navy }}>
                  {hintsUsed}
                </AppText>
                <AppText style={{ fontSize: 10, fontWeight: '600', color: C.navyLight, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  {isPt ? 'Dicas' : 'Hints'}
                </AppText>
              </View>
              <View style={{ alignItems: 'center' }}>
                <AppText style={{ fontSize: 18, fontWeight: '800', color: allObjectivesDone ? C.greenDark : '#B45309' }}>
                  {Math.round((objectivesDone / objectivesTotal) * 100)}%
                </AppText>
                <AppText style={{ fontSize: 10, fontWeight: '600', color: C.navyLight, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  {isPt ? 'Score' : 'Score'}
                </AppText>
              </View>
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity
                onPress={restartSession}
                style={{
                  flex: 1, paddingVertical: 14, borderRadius: 14,
                  backgroundColor: 'rgba(22,21,58,0.06)',
                  alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
                }}
              >
                <ArrowsClockwise size={18} color={C.navy} weight="bold" />
                <AppText style={{ fontSize: 14, fontWeight: '700', color: C.navy }}>
                  {isPt ? 'Refazer' : 'Try again'}
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.back()}
                style={{
                  flex: 1, paddingVertical: 14, borderRadius: 14,
                  backgroundColor: C.green,
                  alignItems: 'center',
                }}
              >
                <AppText style={{ fontSize: 14, fontWeight: '700', color: '#FFF' }}>
                  {isPt ? 'Voltar' : 'Back'}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const StyleSheetAbsoluteFill = {
  position: 'absolute' as const,
  top: 0, bottom: 0, left: 0, right: 0,
};
