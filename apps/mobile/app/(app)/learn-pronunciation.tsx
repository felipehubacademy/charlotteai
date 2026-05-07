import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft, ArrowRight, Play, Pause, Microphone,
  CheckCircle, XCircle, SpeakerHigh, Headphones,
} from 'phosphor-react-native';
import AnimatedXPBadge from '@/components/ui/AnimatedXPBadge';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '@/hooks/useAuth';
import { useTotalXP } from '@/hooks/useTotalXP';
import { AppText } from '@/components/ui/Text';
import CharlotteAvatar from '@/components/ui/CharlotteAvatar';
import Constants from 'expo-constants';
import { useAudioRecorder, RecordingPresets, IOSOutputFormat, AudioQuality } from 'expo-audio';
import { useMessageAudioPlayer } from '@/hooks/useMessageAudioPlayer';

// ── Palette ────────────────────────────────────────────────────
const C = {
  bg:        '#F4F3FA',
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  ghost:     'rgba(22,21,58,0.06)',
  border:    'rgba(22,21,58,0.10)',
  violet:    '#7C3AED',
  violetBg:  '#F5F3FF',
  greenDark: '#3D8800',
  greenBg:   '#F0FFD9',
  red:       '#DC2626',
  redBg:     'rgba(220,38,38,0.07)',
  gold:      '#F59E0B',
};

const shadow = Platform.select({
  ios:     { shadowColor: 'rgba(22,21,58,0.10)', shadowOpacity: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 3 },
});

const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

// ── Phrase banks by level ──────────────────────────────────────
// Sounds challenging for Brazilian Portuguese speakers

const PHRASES: Record<string, Array<{ text: string; focus: string }>> = {
  Novice: [
    { text: 'Hello, how are you?',              focus: 'the /h/ sound' },
    { text: 'My name is Charlotte.',            focus: 'the /tʃ/ in Charlotte' },
    { text: 'I want to learn English.',         focus: 'connected speech' },
    { text: 'Can you help me please?',          focus: 'vowel sounds' },
    { text: 'What time is it?',                 focus: 'the /w/ sound' },
    { text: 'Nice to meet you.',                focus: 'the /iː/ sound' },
    { text: 'Thank you very much.',             focus: 'the /θ/ in thank' },
    { text: 'I speak a little English.',        focus: 'vowel reduction' },
    { text: 'Where is the bathroom?',           focus: 'the /ð/ in the' },
    { text: 'Good morning, everyone!',          focus: 'the /ŋ/ in morning' },
    { text: 'Could you repeat that?',           focus: 'the /d/ vs /t/ ending' },
    { text: 'I do not understand.',             focus: 'do not reduction' },
    { text: 'I would like some water.',         focus: 'the /w/ + /ɔː/ sounds' },
    { text: 'This is very important.',          focus: 'stress pattern' },
    { text: 'I live in Brazil.',                focus: 'word stress' },
  ],
  Inter: [
    { text: 'I have been studying English for two years.',   focus: 'present perfect rhythm' },
    { text: 'She should have told me earlier.',              focus: 'modal + have reduction' },
    { text: 'The weather has been quite unpredictable.',     focus: 'the /ð/ + /w/ sounds' },
    { text: 'I am looking forward to meeting you.',          focus: 'phrasal verb stress' },
    { text: 'Would you mind turning down the music?',        focus: 'polite request intonation' },
    { text: 'I could not believe what happened.',            focus: 'could not reduction' },
    { text: 'They were supposed to arrive at three.',        focus: 'weak form reduction' },
    { text: 'Have you ever been to London?',                 focus: 'ever /ˈɛvər/ vowel' },
    { text: 'Let me know if you need anything else.',        focus: 'sentence rhythm' },
    { text: 'She tends to overthink everything.',            focus: 'the /θ/ in think' },
    { text: 'That is a really thoughtful question.',         focus: 'the /θ/ in thoughtful' },
    { text: 'He did not seem particularly interested.',      focus: 'adverb stress placement' },
    { text: 'We should probably discuss this further.',      focus: 'sentence-level stress' },
    { text: 'It is difficult to find a good balance.',       focus: 'stress on "difficult"' },
    { text: 'I need to finish this by Friday.',              focus: 'word stress and linking' },
  ],
  Advanced: [
    { text: 'Notwithstanding the challenges, the results were remarkable.',     focus: 'formal stress pattern' },
    { text: 'Had I known earlier, I would have prepared differently.',          focus: 'inversion stress' },
    { text: 'It was not until recently that the truth came to light.',          focus: 'cleft sentence rhythm' },
    { text: 'Rarely have I encountered such a pragmatic approach.',             focus: 'inversion + stress' },
    { text: 'The nuances of this policy are often misunderstood.',              focus: '/njuːɑːns/ pronunciation' },
    { text: 'By the same token, we cannot ignore the financial implications.',  focus: 'discourse marker stress' },
    { text: 'All things considered, I believe we made the right call.',         focus: 'concessive stress' },
    { text: 'The data, albeit preliminary, suggests a positive trend.',         focus: 'albeit pronunciation' },
    { text: 'She not only met but exceeded all expectations.',                  focus: 'not only / but stress' },
    { text: 'It goes without saying that confidentiality is paramount.',        focus: 'fixed expression rhythm' },
    { text: 'Despite considerable efforts, progress has been disappointing.',   focus: 'despite + complex rhythm' },
    { text: 'The committee recommends that the policy be reviewed annually.',   focus: 'subjunctive form stress' },
    { text: 'Let alone the cost — the timeline alone is problematic.',          focus: 'let alone emphasis' },
    { text: 'She spoke with such conviction that everyone listened.',           focus: 'emotional intonation' },
    { text: 'The report glosses over some serious underlying issues.',          focus: 'phrasal verb + adj stress' },
  ],
};

// ── Sequence ────────────────────────────────────────────────────
// Each phrase appears twice: first as 'repeat' (practice speaking),
// then as 'listen_write' (test comprehension). Audio is reused for the pair.

const PRON_TOTAL = 30; // 15 phrases × 2 modes

function getPronStep(step: number): { phraseIdx: number; mode: ExerciseType } {
  return {
    phraseIdx: Math.floor(step / 2),
    mode: step % 2 === 0 ? 'repeat' : 'listen_write',
  };
}

// ── Score helpers ──────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 85) return '#22C55E';
  if (s >= 70) return C.gold;
  if (s >= 55) return '#FB923C';
  return C.red;
}
function scoreLabel(s: number) {
  if (s >= 90) return 'Excellent!';
  if (s >= 80) return 'Very good!';
  if (s >= 70) return 'Good job!';
  if (s >= 55) return 'Keep going!';
  return 'Keep practising';
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = scoreColor(score);
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
        <AppText style={{ fontSize: 11, color: C.navyLight, fontWeight: '600' }}>{label}</AppText>
        <AppText style={{ fontSize: 11, color, fontWeight: '800' }}>{Math.round(score)}</AppText>
      </View>
      <View style={{ height: 5, backgroundColor: C.ghost, borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${Math.min(score, 100)}%`, backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

// ── Types ──────────────────────────────────────────────────────

type ExerciseType = 'repeat' | 'listen_write' | 'minimal_pairs' | 'shadowing' | 'sentence_stress';
type Status = 'loading_audio' | 'listening' | 'recording' | 'assessing' | 'result' | 'error';

const TYPE_LABELS: Record<ExerciseType, string> = {
  repeat:          'Repeat After Me',
  listen_write:    'Listen & Write',
  minimal_pairs:   'Minimal Pairs',
  shadowing:       'Shadowing',
  sentence_stress: 'Sentence Stress',
};

// ── Main Screen ────────────────────────────────────────────────

export default function LearnPronunciationScreen() {
  const { profile } = useAuth();
  const userId    = profile?.id;
  const userLevel = (profile?.charlotte_level ?? 'Novice') as string;
  const baseTotalXP = useTotalXP(userId);

  const [stepIndex, setStepIndex]       = useState(0);
  const [isComplete, setIsComplete]     = useState(false);
  const [exerciseType, setExerciseType] = useState<ExerciseType>('repeat');
  const [phrase, setPhrase]             = useState<{ text: string; focus: string } | null>(null);
  const [charlotteAudioUri, setCharlotteAudioUri] = useState<string | null>(null);
  const [status, setStatus]             = useState<Status>('loading_audio');
  const [listenWriteAnswer, setListenWriteAnswer] = useState('');
  const [listenWriteCorrect, setListenWriteCorrect] = useState<boolean | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<any>(null);
  const [sessionScores, setSessionScores] = useState<number[]>([]);
  const [sessionXP, setSessionXP]         = useState(0);
  // minimal_pairs state
  const [mpChosen, setMpChosen]           = useState<'word1' | 'word2' | null>(null);
  const [mpCorrect, setMpCorrect]         = useState<boolean | null>(null);
  // sentence_stress state
  const [stressTapped, setStressTapped]   = useState<string | null>(null);
  const [stressCorrect, setStressCorrect] = useState<boolean | null>(null);

  const { playingMessageId, toggle: toggleAudio, stop: stopAudio } = useMessageAudioPlayer();
  const charlottePlayId = 'charlotte-learn-phrase';
  const isPlaying = playingMessageId === charlottePlayId;

  // Preset otimizado para Azure Speech: iOS → WAV PCM 16kHz mono, Android → OGG/OPUS 16kHz mono
  const PRONUNCIATION_PRESET = Platform.select({
    ios: {
      extension: '.wav',
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 256000,
      ios: {
        outputFormat: IOSOutputFormat.LINEARPCM,
        audioQuality: AudioQuality.MAX,
        linearPCMBitDepth: 16 as 8 | 16 | 24 | 32,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
    },
    android: {
      extension: '.m4a',
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 192000,
      android: {
        outputFormat: 'mpeg4',
        audioEncoder: 'aac',
      },
    },
    default: RecordingPresets.HIGH_QUALITY,
  } as any)!;

  const recorder     = useAudioRecorder(PRONUNCIATION_PRESET); // 10s max handled by recordingRef
  const recordingRef = useRef(false);
  const resultAnim   = useRef(new Animated.Value(0)).current;

  // ── TTS fetch — same pattern as useChat.ts ────────────────

  const fetchTTS = useCallback(async (text: string): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source: 'pronunciation', ...(userId ? { userId } : {}) }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.audio) return null;
      const uri = `${FileSystem.cacheDirectory}learn_tts_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(uri, data.audio, { encoding: 'base64' as any });
      return uri;
    } catch {
      return null;
    }
  }, []);

  // ── Load step ────────────────────────────────────────────────

  const loadStep = useCallback(async (step: number) => {
    if (step >= PRON_TOTAL) { setIsComplete(true); return; }

    const { phraseIdx, mode } = getPronStep(step);
    const prevPhraseIdx = step > 0 ? Math.floor((step - 1) / 2) : -1;
    const phrases = PHRASES[userLevel] ?? PHRASES.Inter;
    const newPhrase = phrases[phraseIdx % phrases.length];
    const isNewPhrase = phraseIdx !== prevPhraseIdx;

    setStepIndex(step);
    setExerciseType(mode);
    setPhrase(newPhrase);
    setAssessmentResult(null);
    setListenWriteAnswer('');
    setListenWriteCorrect(null);
    resultAnim.setValue(0);
    stopAudio();

    if (isNewPhrase) {
      setStatus('loading_audio');
      const uri = await fetchTTS(newPhrase.text);
      if (!uri) { setStatus('error'); return; }
      setCharlotteAudioUri(uri);
    }
    // else: same phrase (repeat → listen_write), reuse charlotteAudioUri already in state

    setStatus('listening');
  }, [userLevel, fetchTTS, stopAudio, resultAnim]);

  useEffect(() => { loadStep(0); }, []);

  // ── Play Charlotte's audio ────────────────────────────────

  const handlePlayCharlotte = () => {
    if (!charlotteAudioUri) return;
    toggleAudio(charlottePlayId, charlotteAudioUri);
  };

  // ── Recording ────────────────────────────────────────────

  const startRecording = async () => {
    if (recordingRef.current) return;
    recordingRef.current = true;
    setStatus('recording');
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      recordingRef.current = false;
      setStatus('listening');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setStatus('assessing');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await recorder.stop();
      const audioUri = recorder.uri;
      if (!audioUri || !phrase) { setStatus('error'); return; }

      // Detectar formato pelo URI para declarar Content-Type correto ao servidor.
      // iOS grava .wav PCM; Android grava .m4a (AAC/MPEG-4) e o servidor
      // transcodifica para WAV antes de chamar Azure.
      const lower = audioUri.toLowerCase();
      const isWav = lower.endsWith('.wav');
      const audioName = isWav ? 'recording.wav' : 'recording.m4a';
      const audioType = isWav ? 'audio/wav'     : 'audio/x-m4a';
      const formData = new FormData();
      formData.append('audio', {
        uri:  audioUri,
        name: audioName,
        type: audioType,
      } as unknown as Blob);
      formData.append('referenceText', phrase.text); // ← precise reference text mode
      if (userId) formData.append('userId', userId);

      const res = await fetch(`${API_BASE_URL}/api/pronunciation`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Assessment failed');
      const data = await res.json();

      if (data.result) {
        setAssessmentResult(data.result);
        const score = data.result.pronunciationScore ?? 0;
        setSessionScores(prev => [...prev, score]);
        const xp = score >= 85 ? 15 : score >= 70 ? 10 : 5;
        setSessionXP(prev => prev + xp);
        if (score >= 80) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Animated.spring(resultAnim, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }).start();
      }
      setStatus('result');
    } catch {
      setStatus('error');
    }
  };

  // ── Listen & Write check ──────────────────────────────────

  const checkListenWrite = () => {
    if (!phrase || !listenWriteAnswer.trim()) return;
    const u = listenWriteAnswer.trim().toLowerCase().replace(/[.,!?]/g, '');
    const c = phrase.text.toLowerCase().replace(/[.,!?]/g, '');
    const words   = c.split(' ').filter(w => w.length > 2);
    const matched = words.filter(w => u.includes(w)).length;
    const correct = matched >= Math.ceil(words.length * 0.7);
    setListenWriteCorrect(correct);
    setSessionXP(prev => prev + (correct ? 8 : 2));
    if (correct) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else         Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Animated.spring(resultAnim, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }).start();
    setStatus('result');
  };

  const handleNext = () => { loadStep(stepIndex + 1); };

  const avgScore = sessionScores.length > 0
    ? Math.round(sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length)
    : null;
  const progress = (stepIndex + 1) / PRON_TOTAL;

  // ── Completion ──────────────────────────────────────────────
  if (isComplete) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top', 'left', 'right', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: C.violetBg, borderWidth: 2, borderColor: C.violet,
            alignItems: 'center', justifyContent: 'center', marginBottom: 24,
          }}>
            <CheckCircle size={40} color={C.violet} weight="fill" />
          </View>
          <AppText style={{ fontSize: 24, fontWeight: '900', color: C.navy, marginBottom: 8, letterSpacing: -0.5 }}>
            Session complete!
          </AppText>
          <AppText style={{ fontSize: 15, color: C.navyMid, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
            {avgScore !== null ? `Average score: ${avgScore}` : 'Great practice!'} · {sessionXP} XP earned
          </AppText>
          <TouchableOpacity
            onPress={() => { setSessionScores([]); setSessionXP(0); setIsComplete(false); loadStep(0); }}
            style={{ backgroundColor: C.navy, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 40, marginBottom: 16 }}
          >
            <AppText style={{ fontSize: 15, fontWeight: '800', color: '#FFF' }}>Start again</AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}>
            <AppText style={{ fontSize: 14, color: C.navyLight, fontWeight: '600' }}>Back to home</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top', 'left', 'right', 'bottom']}>

      {/* ── Header ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, height: 52,
        borderBottomWidth: 1, borderBottomColor: C.border,
        backgroundColor: C.card,
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ArrowLeft size={22} color={C.navy} weight="bold" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <AppText style={{ fontSize: 9, fontWeight: '700', color: C.navyLight, textTransform: 'uppercase', letterSpacing: 1 }}>
            Learn with Charlotte
          </AppText>
          <AppText style={{ fontSize: 15, fontWeight: '800', color: C.navy, letterSpacing: -0.3 }}>
            Pronunciation
          </AppText>
        </View>
        <TouchableOpacity onPress={() => router.push({ pathname: '/(app)/stats', params: { sessionXP: String(sessionXP), totalXP: String(baseTotalXP + sessionXP), userId: userId ?? '', userLevel: userLevel ?? 'Inter', userName: '' } })} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <AnimatedXPBadge xp={baseTotalXP + sessionXP} iconSize={13} fontSize={13} padH={10} padV={5} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={{ flex: 1, backgroundColor: C.bg }}
          contentContainerStyle={{ padding: 20, paddingBottom: 24, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Progress ── */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{
                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
                backgroundColor: C.violetBg, borderWidth: 1, borderColor: 'rgba(124,58,237,0.2)',
              }}>
                <AppText style={{ fontSize: 11, fontWeight: '700', color: C.violet }}>
                  {TYPE_LABELS[exerciseType]}
                </AppText>
              </View>
              <AppText style={{ fontSize: 12, color: C.navyLight, fontWeight: '600' }}>
                {stepIndex + 1} / {PRON_TOTAL}
              </AppText>
            </View>
            <View style={{ height: 5, backgroundColor: C.ghost, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: 5, width: `${progress * 100}%` as `${number}%`, backgroundColor: C.violet, borderRadius: 3 }} />
            </View>
          </View>

          {/* ── Session stats ── */}
          {avgScore !== null && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              backgroundColor: C.card, borderRadius: 14, padding: 12,
              borderWidth: 1, borderColor: C.border, marginBottom: 16, ...shadow,
            }}>
              <SpeakerHigh size={16} color={C.violet} weight="fill" />
              <AppText style={{ fontSize: 13, color: C.navyMid, flex: 1 }}>
                <AppText style={{ fontWeight: '800', color: C.navy }}>{sessionScores.length}</AppText>
                {' phrase'}{sessionScores.length !== 1 ? 's' : ''}{' · avg '}
                <AppText style={{ fontWeight: '800', color: scoreColor(avgScore) }}>{avgScore}</AppText>
              </AppText>
            </View>
          )}

          {/* ── Loading / Assessing ── */}
          {(status === 'loading_audio' || status === 'assessing') && (
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 16 }}>
              <ActivityIndicator size="large" color={C.violet} />
              <AppText style={{ fontSize: 14, color: C.navyLight }}>
                {status === 'loading_audio' ? 'Charlotte is preparing…' : 'Analysing your pronunciation…'}
              </AppText>
            </View>
          )}

          {/* ── Error ── */}
          {status === 'error' && (
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 16 }}>
              <AppText style={{ fontSize: 15, color: C.navyMid, textAlign: 'center' }}>
                Something went wrong. Try again.
              </AppText>
              <TouchableOpacity
                onPress={() => loadStep(stepIndex)}
                style={{ backgroundColor: C.navy, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 }}
              >
                <AppText style={{ fontSize: 14, fontWeight: '700', color: '#FFF' }}>Try again</AppText>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Main exercise ── */}
          {phrase && (status === 'listening' || status === 'recording' || status === 'result') && (
            <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: C.border, ...shadow }}>

              {/* Charlotte instruction */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 24 }}>
                <CharlotteAvatar size="xs" />
                <View style={{
                  flex: 1, backgroundColor: C.violetBg,
                  borderRadius: 14, borderBottomLeftRadius: 4,
                  paddingHorizontal: 14, paddingVertical: 14,
                }}>
                  <AppText style={{ fontSize: 14, color: C.violet, fontWeight: '700' }}>
                    {exerciseType === 'repeat'
                      ? `Listen first, then record yourself. Focus on: ${phrase.focus}.`
                      : 'Listen to what I say and write it down.'}
                  </AppText>
                </View>
              </View>

              {/* Phrase — shown for repeat, hidden for listen_write until result */}
              {(exerciseType === 'repeat' || status === 'result') && (
                <View style={{
                  backgroundColor: C.ghost, borderRadius: 16,
                  padding: 24, marginBottom: 24,
                  borderLeftWidth: 3, borderLeftColor: C.violet,
                }}>
                  <AppText style={{ fontSize: 24, fontWeight: '700', color: C.navy, lineHeight: 36, letterSpacing: -0.5 }}>
                    {phrase.text}
                  </AppText>
                  {exerciseType === 'repeat' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.violet }} />
                      <AppText style={{ fontSize: 12, color: C.violet, fontWeight: '600' }}>
                        Focus: {phrase.focus}
                      </AppText>
                    </View>
                  )}
                </View>
              )}

              {/* Charlotte audio player */}
              <TouchableOpacity
                onPress={handlePlayCharlotte}
                disabled={!charlotteAudioUri}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  backgroundColor: C.violetBg, borderRadius: 16,
                  paddingHorizontal: 18, paddingVertical: 16, marginBottom: 20,
                  borderWidth: 1, borderColor: 'rgba(124,58,237,0.15)',
                }}
              >
                <View style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: C.violet,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {isPlaying
                    ? <Pause size={18} color="#FFF" weight="fill" />
                    : <Play  size={18} color="#FFF" weight="fill" />
                  }
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontSize: 14, fontWeight: '700', color: C.violet }}>
                    Charlotte's version
                  </AppText>
                  <AppText style={{ fontSize: 12, color: C.navyLight, marginTop: 2 }}>
                    {isPlaying ? 'Playing…' : 'Tap to listen'}
                  </AppText>
                </View>
                <Headphones size={20} color="rgba(124,58,237,0.45)" weight="regular" />
              </TouchableOpacity>

              {/* Spacer — fills space when no result yet */}
              {status !== 'result' && <View style={{ flex: 1 }} />}

              {/* Listen & Write input */}
              {exerciseType === 'listen_write' && (status === 'listening' || status === 'recording') && (
                <TextInput
                  value={listenWriteAnswer}
                  onChangeText={setListenWriteAnswer}
                  placeholder="Write what you heard…"
                  placeholderTextColor={C.navyLight}
                  style={{
                    borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
                    paddingHorizontal: 16, paddingVertical: 14,
                    fontSize: 16, color: C.navy, backgroundColor: '#FAFAF9',
                    minHeight: 90, textAlignVertical: 'top',
                  }}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
              )}

              {/* ── Result ── */}
              {status === 'result' && (
                <Animated.View style={{
                  opacity: resultAnim,
                  transform: [{ translateY: resultAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
                }}>
                  {/* Repeat: score card */}
                  {exerciseType === 'repeat' && assessmentResult && (
                    <View style={{ marginTop: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                        <View style={{
                          width: 66, height: 66, borderRadius: 33,
                          backgroundColor: `${scoreColor(assessmentResult.pronunciationScore)}18`,
                          borderWidth: 2.5, borderColor: scoreColor(assessmentResult.pronunciationScore),
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <AppText style={{ fontSize: 22, fontWeight: '900', color: scoreColor(assessmentResult.pronunciationScore), letterSpacing: -1 }}>
                            {Math.round(assessmentResult.pronunciationScore)}
                          </AppText>
                        </View>
                        <View>
                          <AppText style={{ fontSize: 17, fontWeight: '800', color: C.navy }}>
                            {scoreLabel(assessmentResult.pronunciationScore)}
                          </AppText>
                          <AppText style={{ fontSize: 12, color: C.navyLight, marginTop: 3 }}>
                            Pronunciation score
                          </AppText>
                        </View>
                      </View>

                      <ScoreBar label="Accuracy"     score={assessmentResult.accuracyScore}     />
                      <ScoreBar label="Fluency"      score={assessmentResult.fluencyScore}      />
                      <ScoreBar label="Completeness" score={assessmentResult.completenessScore} />
                      {!!assessmentResult.prosodyScore && assessmentResult.prosodyScore > 0 && (
                        <ScoreBar label="Prosody" score={assessmentResult.prosodyScore} />
                      )}

                      {(() => {
                        const bad = (assessmentResult.words ?? []).filter(
                          (w: any) => w.errorType === 'Mispronunciation' && w.accuracyScore < 70
                        );
                        if (!bad.length) return null;
                        return (
                          <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.ghost }}>
                            <AppText style={{ fontSize: 10, fontWeight: '700', color: C.navyLight, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                              Needs work
                            </AppText>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                              {bad.slice(0, 4).map((w: any, i: number) => (
                                <View key={i} style={{
                                  backgroundColor: C.redBg, borderRadius: 8,
                                  paddingHorizontal: 9, paddingVertical: 4,
                                  borderWidth: 1, borderColor: 'rgba(220,38,38,0.18)',
                                }}>
                                  <AppText style={{ fontSize: 13, color: C.red, fontWeight: '700' }}>{w.word}</AppText>
                                </View>
                              ))}
                            </View>
                          </View>
                        );
                      })()}
                    </View>
                  )}

                  {/* Listen & Write result */}
                  {exerciseType === 'listen_write' && listenWriteCorrect !== null && (
                    <View>
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 10,
                        padding: 12, borderRadius: 12, marginBottom: 10,
                        backgroundColor: listenWriteCorrect ? C.greenBg : C.redBg,
                        borderWidth: 1,
                        borderColor: listenWriteCorrect ? 'rgba(61,136,0,0.2)' : 'rgba(220,38,38,0.18)',
                      }}>
                        {listenWriteCorrect
                          ? <CheckCircle size={18} color={C.greenDark} weight="fill" />
                          : <XCircle    size={18} color={C.red}       weight="fill" />
                        }
                        <AppText style={{ fontSize: 14, fontWeight: '700', color: listenWriteCorrect ? C.greenDark : C.red, flex: 1 }}>
                          {listenWriteCorrect ? 'Correct!' : 'Not quite — see the phrase above'}
                        </AppText>
                      </View>
                      <View style={{ padding: 12, backgroundColor: C.ghost, borderRadius: 12 }}>
                        <AppText style={{ fontSize: 11, fontWeight: '700', color: C.navyLight, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 }}>
                          Your answer
                        </AppText>
                        <AppText style={{ fontSize: 14, color: C.navyMid }}>{listenWriteAnswer}</AppText>
                      </View>
                    </View>
                  )}
                </Animated.View>
              )}
            </View>
          )}

        </ScrollView>

        {/* ── Bottom CTA ── */}
        {phrase && status === 'listening' && (
          <View style={{
            paddingHorizontal: 20, paddingTop: 12,
            paddingBottom: Platform.OS === 'ios' ? 28 : 20,
            backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border,
          }}>
            {exerciseType === 'repeat' ? (
              <Pressable
                onPressIn={startRecording}
                onPressOut={stopRecording}
                style={{
                  backgroundColor: C.navy, borderRadius: 16, paddingVertical: 15,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}
              >
                <Microphone size={20} color="#FFF" weight="fill" />
                <AppText style={{ fontSize: 15, fontWeight: '800', color: '#FFF' }}>
                  Hold to record
                </AppText>
              </Pressable>
            ) : (
              <TouchableOpacity
                onPress={checkListenWrite}
                disabled={!listenWriteAnswer.trim()}
                style={{
                  backgroundColor: listenWriteAnswer.trim() ? C.navy : C.ghost,
                  borderRadius: 16, paddingVertical: 15, alignItems: 'center',
                }}
              >
                <AppText style={{ fontSize: 15, fontWeight: '800', color: listenWriteAnswer.trim() ? '#FFF' : C.navyLight }}>
                  Check answer
                </AppText>
              </TouchableOpacity>
            )}
          </View>
        )}

        {status === 'recording' && (
          <View style={{
            paddingHorizontal: 20, paddingTop: 12,
            paddingBottom: Platform.OS === 'ios' ? 28 : 20,
            backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border,
          }}>
            <Pressable
              onPressOut={stopRecording}
              style={{
                backgroundColor: '#DC2626', borderRadius: 16, paddingVertical: 15,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}
            >
              <Microphone size={20} color="#FFF" weight="fill" />
              <AppText style={{ fontSize: 15, fontWeight: '800', color: '#FFF' }}>
                Recording… release to stop
              </AppText>
            </Pressable>
          </View>
        )}

        {status === 'result' && (
          <View style={{
            paddingHorizontal: 20, paddingTop: 12,
            paddingBottom: Platform.OS === 'ios' ? 28 : 20,
            backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border,
          }}>
            <TouchableOpacity
              onPress={handleNext}
              style={{
                backgroundColor: C.navy, borderRadius: 16, paddingVertical: 15,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <AppText style={{ fontSize: 15, fontWeight: '800', color: '#FFF' }}>
                {stepIndex + 1 >= PRON_TOTAL ? 'Finish' : 'Next'}
              </AppText>
              <ArrowRight size={18} color="#FFF" weight="bold" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}
