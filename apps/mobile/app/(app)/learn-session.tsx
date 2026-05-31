import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAchievementsContext } from '@/components/achievements/AchievementsProvider';
import {
  View, ScrollView, TouchableOpacity, TextInput,
  Platform, Animated,
  ActivityIndicator, Pressable, Modal,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, ArrowRight, CheckCircle, XCircle,
  LightbulbFilament, BookOpen, Microphone,
  SpeakerLow, SpeakerHigh, Play, Pause, ArrowsClockwise,
  ThumbsUp, ThumbsDown,
} from 'phosphor-react-native';
import AnimatedXPBadge from '@/components/ui/AnimatedXPBadge';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { soundEngine } from '@/lib/soundEngine';
import { scheduleReviews, markReviewDone, rescheduleReview } from '@/lib/spacedRepetition';
import { track } from '@/lib/analytics';
import * as FileSystem from 'expo-file-system/legacy';
import { useAudioRecorder, setAudioModeAsync, RecordingPresets } from 'expo-audio';
import { Image } from 'expo-image';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

// Guard: module is only available after a native build that includes expo-speech-recognition.
// On older builds the native module is absent — disable ASR to prevent render crash.
const ASR_AVAILABLE = !!ExpoSpeechRecognitionModule?.start;
import Constants from 'expo-constants';
import { useAuth } from '@/hooks/useAuth';
import { useTotalXP } from '@/hooks/useTotalXP';
import { AppText } from '@/components/ui/Text';
import { TranslatableText } from '@/components/ui/TranslatableText';
import CharlotteAvatar from '@/components/ui/CharlotteAvatar';
import { useMessageAudioPlayer } from '@/hooks/useMessageAudioPlayer';
import { useLearnProgress } from '@/hooks/useLearnProgress';
import {
  CURRICULUM, TrailLevel, GrammarEx, PronStep,
  getTopic,
} from '@/data/curriculum';
import { getV2TopicForUnit } from '@/lib/curriculum-v2/adapter';
import type { Level as V2Level } from '@/lib/curriculum-v2/types';
import { useLearnProgressV2 } from '@/hooks/useLearnProgressV2';
import { checkLevelPromotion, promoteUserLevel, NEXT_LEVEL } from '@/lib/levelPromotion';
import PromotionModal from '@/components/ui/PromotionModal';
import { supabase } from '@/lib/supabase';

// ── Color helper — rgba() for Android hex+alpha compatibility ──
function a(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Quebra padrões de diálogo "A: ... B: ..." em duas linhas. Match em
// " Name: " (palavra capitalizada seguida de ":" e espaço) precedida
// de espaço — só insere \n quando há um segundo speaker mid-sentence.
function formatDialogue(s: string): string {
  return s.replace(/\s+([A-Z][a-zA-Z]*): /g, '\n$1: ');
}

// ── Palette ────────────────────────────────────────────────────
const C = {
  bg:        '#F4F3FA',
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  ghost:     'rgba(22,21,58,0.06)',
  border:    'rgba(22,21,58,0.10)',
  gold:      '#D97706',
  goldBg:    '#FFFBEB',
  green:     '#3D8800',
  greenBg:   '#F0FFD9',
  red:       '#DC2626',
  redBg:     'rgba(220,38,38,0.07)',
  violet:    '#7C3AED',
  violetBg:  '#F5F3FF',
};

const shadow = Platform.select({
  ios:     { shadowColor: 'rgba(22,21,58,0.10)', shadowOpacity: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 3 },
});

const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

// ── Step types ─────────────────────────────────────────────────
type StepKind = 'grammar' | 'pronunciation';
interface GrammarStep  { kind: 'grammar';       exercise: GrammarEx }
interface PronStepWrap { kind: 'pronunciation'; phrase: PronStep }
type SessionStep = GrammarStep | PronStepWrap;

// ── Grammar helpers ────────────────────────────────────────────
function normalise(s: string) {
  return s.trim().toLowerCase().replace(/[''']/g, "'").replace(/\s+/g, ' ');
}

// Expand common contractions so "haven't" matches "have not", etc.
function expandContractions(s: string) {
  return s
    .replace(/won't/g, 'will not')
    .replace(/can't/g, 'cannot')
    .replace(/n't/g, ' not')
    .replace(/i've/g, 'i have')
    .replace(/you've/g, 'you have')
    .replace(/we've/g, 'we have')
    .replace(/they've/g, 'they have')
    .replace(/he's/g, 'he has')
    .replace(/she's/g, 'she has')
    .replace(/it's/g, 'it has')
    .replace(/i'm/g, 'i am')
    .replace(/you're/g, 'you are')
    .replace(/we're/g, 'we are')
    .replace(/they're/g, 'they are')
    .replace(/i'll/g, 'i will')
    .replace(/you'll/g, 'you will')
    .replace(/he'll/g, 'he will')
    .replace(/she'll/g, 'she will')
    .replace(/we'll/g, 'we will')
    .replace(/they'll/g, 'they will')
    .replace(/i'd/g, 'i would')
    .replace(/you'd/g, 'you would')
    .replace(/he'd/g, 'he would')
    .replace(/she'd/g, 'she would')
    .replace(/we'd/g, 'we would')
    .replace(/they'd/g, 'they would');
}

function checkGrammar(ex: GrammarEx, answer: string): boolean {
  const u = normalise(answer);
  const c = normalise(ex.answer);
  if (u === c) return true;
  // Variantes aceitas (ex: "Thanks" / "Thank you" / "Thanks so much")
  // Pra read_answer/fix_error/fill_gap, accepts tambem aceita via includes
  // (input contem o accept OU accept contem input — tolerancia natural).
  if (ex.accepts) {
    const lenient = ex.type === 'read_answer' || ex.type === 'fix_error' || ex.type === 'fill_gap';
    for (const a of ex.accepts) {
      const na = normalise(a);
      if (na === u) return true;
      if (lenient && (u.includes(na) || na.includes(u))) return true;
    }
  }
  if (ex.type === 'multiple_choice' || ex.type === 'word_bank' || ex.type === 'word_order') return false;

  // If the expected answer uses a contraction, don't expand — test is specifically
  // checking the contracted form. Only expand when the answer uses the full form.
  const answerHasContraction = /n't|'ve|'re|'ll|'d|'m/.test(c);

  if (ex.type === 'fill_gap') {
    if (u.includes(c)) return true; // accepts full sentence
    if (!answerHasContraction) {
      const uExp = expandContractions(u);
      const cExp = expandContractions(c);
      if (uExp === cExp || uExp.includes(cExp)) return true;
    }
    return false;
  }
  if (ex.type === 'fix_error') {
    if (u.includes(c) || c.includes(u)) return true;
    if (!answerHasContraction) {
      const uExp = expandContractions(u);
      const cExp = expandContractions(c);
      if (uExp.includes(cExp) || cExp.includes(uExp)) return true;
    }
    return false;
  }
  if (ex.type === 'read_answer') {
    const cExp = answerHasContraction ? c : expandContractions(c);
    const uExp = answerHasContraction ? u : expandContractions(u);
    const words = cExp.split(' ').filter(w => w.length > 2);
    return words.length > 0 && words.filter(w => uExp.includes(w)).length >= Math.ceil(words.length * 0.6);
  }
  return false;
}

// ── Pronunciation helpers ──────────────────────────────────────
// Rotacao de feedbacks positivos pra Novice (PT-BR). Evita repeticao
// quando o aluno faz 5 frases seguidas e tira o tom "Pronuncia ok"
// que soava morno demais.
const NOVICE_CORRECT_MESSAGES_PT = [
  'Mandou bem! Pronúncia clara.',
  'Show! Saiu direitinho.',
  'Boa! Charlotte entendeu de primeira.',
  'Isso aí! Você falou redondo.',
  'Manda mais — pronúncia limpa.',
];
function pickNoviceCorrectMessage(): string {
  return NOVICE_CORRECT_MESSAGES_PT[Math.floor(Math.random() * NOVICE_CORRECT_MESSAGES_PT.length)];
}

function wordMatchPercent(spoken: string, reference: string): number {
  const ref = reference.trim().toLowerCase().replace(/[.,!?;:]/g, '').split(' ').filter(w => w.length > 0);
  const sp  = spoken.trim().toLowerCase().replace(/[.,!?;:]/g, '');
  if (ref.length === 0) return 0;
  const matched = ref.filter(w => sp.includes(w)).length;
  return (matched / ref.length) * 100;
}

// ── Main screen ────────────────────────────────────────────────
export default function LearnSessionScreen() {
  const params = useLocalSearchParams<{
    level: string; moduleIndex: string; topicIndex: string; reviewId?: string;
    // v2 params — if v=v2, load from curriculum-v2 by moduleId/unitId
    v?: string; moduleId?: string; unitId?: string; activity?: string;
  }>();
  const level       = (params.level ?? 'Novice') as TrailLevel;
  const moduleIndex = parseInt(params.moduleIndex ?? '0', 10);
  const topicIndex  = parseInt(params.topicIndex  ?? '0', 10);
  const isV2        = params.v === 'v2' && !!params.moduleId && !!params.unitId;

  const { profile, refreshProfile } = useAuth();
  const userId      = profile?.id;
  const userLevel   = (profile?.charlotte_level ?? 'Novice') as string;
  const isPortuguese = userLevel === 'Novice';
  const baseTotalXP = useTotalXP(userId);
  const insets      = useSafeAreaInsets();
  const learnProgress = useLearnProgress(userId, level);
  // v2 mode: skip v1-specific learn_history (uses learn_history_v2 via v2Progress),
  // mas AINDA escreve XP em charlotte_practices pra o pill da home / leaderboard
  // / progresso global funcionarem normal.
  const saveTopicComplete = isV2 ? (async () => {}) : learnProgress.saveTopicComplete;
  const saveExercise = useCallback(async (params: any) => {
    if (!isV2) return learnProgress.saveExercise(params);
    // v2 path: só XP via charlotte_practices (sem learn_history v1)
    if (!userId || typeof params?.xpEarned !== 'number') return;
    try {
      await supabase.from('charlotte_practices').insert({
        user_id:       userId,
        practice_type: 'learn_exercise',
        xp_earned:     params.xpEarned,
      });
    } catch (e) { console.warn('[v2] charlotte_practices insert failed', e); }
  }, [isV2, userId, learnProgress.saveExercise]);
  const v2Progress        = useLearnProgressV2(userId, level as V2Level);

  // v2 score trackers — populated during the session, persisted on completion
  // Score POR STEP — a retry no mesmo step OVERWRITE. No fim, médio do
  // valor final de cada step (não acumula tentativas falhas).
  const pronScoresRef    = useRef<Map<number, number>>(new Map());
  const grammarTotalRef  = useRef(0);
  const grammarCorrectRef = useRef(0);
  const { pauseNotifications } = useAchievementsContext();

  useFocusEffect(
    useCallback(() => {
      pauseNotifications(true);
      return () => pauseNotifications(false);
    }, [pauseNotifications])
  );

  const topic = isV2
    ? getV2TopicForUnit(
        level as V2Level,
        params.moduleId!,
        params.unitId!,
        (params.activity as 'grammar' | 'ls' | 'both') ?? 'both'
      )
    : getTopic(level, moduleIndex, topicIndex);

  // ── Build flat steps array ─────────────────────────────────
  const steps: SessionStep[] = [
    ...(topic?.grammar.map(ex => ({ kind: 'grammar' as const, exercise: ex })) ?? []),
    ...(topic?.pronunciation.map(ph => ({ kind: 'pronunciation' as const, phrase: ph })) ?? []),
  ];
  const totalSteps = steps.length;

  // ── Session XP accumulator ─────────────────────────────────
  const [sessionXP, setSessionXP] = useState(0);
  const [sessionErrors, setSessionErrors] = useState(0);

  // ── Promotion state ────────────────────────────────────────
  const [showPromotion, setShowPromotion] = useState(false);
  const [promotionNextLevel, setPromotionNextLevel] = useState<string>('');

  // ── Step index — with resume from SecureStore ──────────────
  const resumeKey = userId
    ? (isV2
        ? `learn_step_v2_${userId}_${params.moduleId}_${params.unitId}_${params.activity ?? 'both'}`
        : `learn_step_${userId}_${level}_${moduleIndex}_${topicIndex}`)
    : null;

  const [stepIdx, setStepIdx]         = useState(0);
  const [isComplete, setIsComplete]   = useState(false);
  // Pulse anim para o botao redondo de mic durante gravacao
  const micRingAnim = useRef(new Animated.Value(0)).current;
  // "Me ajuda" — explicacao contextual via LLM (PT-BR Novice, EN Inter+)
  const [helpExplanation, setHelpExplanation] = useState<string | null>(null);
  const [helpLoading, setHelpLoading]         = useState(false);
  // v2: armazena score+threshold da atividade recem concluida pra
  // mostrar banner "precisa X% pra desbloquear proxima" quando passa
  // sem bater threshold.
  const [completedActivityScore, setCompletedActivityScore] = useState<{
    score: number; threshold: number; activityType: 'grammar' | 'speaking' | 'roleplay' | 'chat';
  } | null>(null);
  const stepLoadedRef = useRef(false);
  const scrollRef = useRef<InstanceType<typeof ScrollView>>(null);

  // ── Tour refs ──────────────────────────────────────────────

  // Reset contador de acertos consecutivos ao iniciar a sessao
  // (Tier 4 — voiceSFX dispara em 3/5/10 acertos seguidos)
  useEffect(() => { soundEngine.resetStreak(); }, []);

  // Loop de pulso do mic ring durante gravacao
  useEffect(() => {
    if (pronStatus === 'recording') {
      micRingAnim.setValue(0);
      const loop = Animated.loop(
        Animated.timing(micRingAnim, {
          toValue: 1, duration: 1400, useNativeDriver: true,
        })
      );
      loop.start();
      return () => loop.stop();
    } else {
      micRingAnim.setValue(0);
    }
  }, [pronStatus, micRingAnim]);

  // Load saved step on mount (resume mid-topic)
  useEffect(() => {
    if (!resumeKey || stepLoadedRef.current) return;
    stepLoadedRef.current = true;
    SecureStore.getItemAsync(resumeKey).then(saved => {
      if (saved) {
        const idx = parseInt(saved, 10);
        if (idx > 0 && idx < totalSteps) setStepIdx(idx);
      }
    });
  }, [resumeKey, totalSteps]);

  // Save step whenever it advances
  useEffect(() => {
    if (!resumeKey || !stepLoadedRef.current) return;
    if (stepIdx === 0) return; // don't save initial state
    SecureStore.setItemAsync(resumeKey, String(stepIdx));
  }, [stepIdx, resumeKey]);

  // Clear saved step on completion
  useEffect(() => {
    if (isComplete && resumeKey) SecureStore.deleteItemAsync(resumeKey);
  }, [isComplete, resumeKey]);

  // ── Grammar state ──────────────────────────────────────────
  const [gStatus, setGStatus]           = useState<'answering' | 'submitted'>('answering');
  const [userAnswer, setUserAnswer]     = useState('');
  const [isCorrect, setIsCorrect]       = useState<boolean | null>(null);
  const [showHint, setShowHint]         = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [shuffledChoices, setShuffledChoices] = useState<string[]>([]);
  const [wordOrderPlaced, setWordOrderPlaced] = useState<string[]>([]);
  const [wordOrderPool, setWordOrderPool]     = useState<string[]>([]);
  const feedbackAnim = useRef(new Animated.Value(0)).current;

  // ── Explain error modal ──────────────────────────────────────────────────────
  const [showExplain, setShowExplain]         = useState(false);
  const [explainLoading, setExplainLoading]   = useState(false);
  const [explainContent, setExplainContent]   = useState<string | null>(null);
  const [explainRating, setExplainRating]     = useState<1 | -1 | null>(null);
  const explainIdRef = useRef<string | null>(null); // DB row id for thumb update

  // ── Pronunciation state ────────────────────────────────────
  type PronStatus = 'loading_audio' | 'listening' | 'recording' | 'assessing' | 'result' | 'error' | 'retry';
  type PronFeedbackState = 'correct' | 'close' | 'error';
  type PronFeedback = { state: PronFeedbackState; message: string; xp: number } | null;
  const [pronStatus, setPronStatus]           = useState<PronStatus>('loading_audio');
  const [charlotteAudioUri, setCharlotteAudioUri] = useState<string | null>(null);
  const [listenWriteAnswer, setListenWriteAnswer] = useState('');
  const [listenWriteCorrect, setListenWriteCorrect] = useState<boolean | null>(null);
  const [pronFeedback, setPronFeedback]       = useState<PronFeedback>(null);
  // minimal_pairs state
  const [mpChosen, setMpChosen]       = useState<'word1' | 'word2' | null>(null);
  const [mpCorrect, setMpCorrect]     = useState<boolean | null>(null);
  // sentence_stress state
  const [stressTapped, setStressTapped]   = useState<string | null>(null);
  const [stressCorrect, setStressCorrect] = useState<boolean | null>(null);
  const pronFeedbackAnim = useRef(new Animated.Value(0)).current;
  // on-device ASR transcript (repeat)
  const speechTranscriptRef = useRef('');

  // ── Speech recognition events (no-op on builds without native module) ──
  useSpeechRecognitionEvent('result', (event) => {
    if (!ASR_AVAILABLE) return;
    const transcript = event.results[0]?.transcript;
    if (transcript) speechTranscriptRef.current = transcript;
  });
  useSpeechRecognitionEvent('error', () => {
    // keep whatever transcript we have so far
  });

  const { playingMessageId, toggle: toggleAudio, stop: stopAudio } = useMessageAudioPlayer();
  const charlottePlayId = 'learn-session-phrase';
  const isPlaying = playingMessageId === charlottePlayId;

  // Charlotte animated WebPs com alpha (rembg + isnet + alpha-matting).
  // expo-image faz loop nativo; trocar source faz cross-fade entre idle/cheering.
  const idleSrc = require('@/assets/charlotte-livevoice.webp');
  const cheerSrc = require('@/assets/charlotte-goals.webp');
  const errorSrc = require('@/assets/charlotte-error.webp');

  // WAV/PCM 16kHz mono — required by Azure Speech SDK (M4A causes NoMatch)
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    ios: {
      extension: '.wav',
      outputFormat: 'lpcm' as any,
      audioQuality: 127,
      sampleRate: 16000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
  }); // duration handled by recordingRef auto-stop
  const recordingRef      = useRef(false);
  const recordingStartRef = useRef(0);

  // ── Colour by step kind ────────────────────────────────────
  const currentStep  = steps[stepIdx];
  const accent       = !currentStep ? C.gold
    : currentStep.kind === 'grammar' ? C.gold : C.violet;
  const accentBg     = !currentStep ? C.goldBg
    : currentStep.kind === 'grammar' ? C.goldBg : C.violetBg;

  // Estado da Charlotte no grammar: cheering (acertou), error (errou) ou idle.
  const showCheering = currentStep?.kind === 'grammar' && gStatus === 'submitted' && isCorrect === true;
  const showError    = currentStep?.kind === 'grammar' && gStatus === 'submitted' && isCorrect === false;
  const charlotteSrc = showCheering ? cheerSrc : showError ? errorSrc : idleSrc;

  // ── Explain error ────────────────────────────────────────────────────────────
  const fetchExplainError = useCallback(async () => {
    if (!currentStep || currentStep.kind !== 'grammar') return;
    const ex = currentStep.exercise;
    setShowExplain(true);
    setExplainLoading(true);
    setExplainContent(null);
    setExplainRating(null);
    explainIdRef.current = null;
    try {
      const res = await fetch(`${API_BASE_URL}/api/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(userId ? { 'x-user-id': userId } : {}) },
        body: JSON.stringify({
          transcription: ex.sentence ?? (ex as any).question ?? '',
          userAnswer,
          correctAnswer: ex.answer ?? '',
          exerciseType: ex.type,
          userLevel: level,
          mode: 'explain_error',
        }),
      });
      const data = await res.json();
      const text = data?.result?.feedback ?? '';
      setExplainContent(text);

      // Persist for analytics
      if (userId && text) {
        const { data: row } = await supabase
          .from('explain_feedback')
          .insert({
            user_id: userId,
            exercise_type: ex.type,
            level,
            sentence: ex.sentence ?? (ex as any).question ?? '',
            user_answer: userAnswer,
            correct_answer: ex.answer ?? '',
            explanation: text,
          })
          .select('id')
          .single();
        if (row?.id) explainIdRef.current = row.id;
      }
    } catch {
      setExplainContent(isPortuguese
        ? 'Não foi possível carregar a explicação. Tente novamente.'
        : 'Could not load the explanation. Please try again.');
    } finally {
      setExplainLoading(false);
    }
  }, [currentStep, userAnswer, userId, level, isPortuguese]);

  const saveExplainRating = useCallback(async (rating: 1 | -1) => {
    setExplainRating(rating);
    if (!explainIdRef.current) return;
    try {
      await supabase
        .from('explain_feedback')
        .update({ rating })
        .eq('id', explainIdRef.current);
    } catch { /* fire-and-forget */ }
  }, []);

  // ── TTS — local cache → pre-generated file → ElevenLabs API ──
  const fetchTTS = useCallback(async (text: string, preferredUrl?: string): Promise<string | null> => {
    try {
      const cacheDir = `${FileSystem.documentDirectory}tts_cache/`;
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true }).catch(() => {});
      const fileKey  = text.slice(0, 80).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const localUri = `${cacheDir}el_${fileKey}.mp3`;

      // 0. Curriculum v2 pre-generated audio (CDN URL stamped at compile time).
      // Cache key derived from URL hash so different voices/versions don't collide.
      if (preferredUrl) {
        const urlKey = preferredUrl.split('/').pop()?.replace(/[^a-zA-Z0-9.]/g, '_') ?? fileKey;
        const v2Uri  = `${cacheDir}v2_${urlKey}`;
        const v2Info = await FileSystem.getInfoAsync(v2Uri);
        if (v2Info.exists) return v2Uri;
        const v2Dl = await FileSystem.downloadAsync(preferredUrl, v2Uri);
        if (v2Dl.status === 200) return v2Uri;
        await FileSystem.deleteAsync(v2Uri, { idempotent: true });
        // fall through to legacy flow on miss (network error etc)
      }

      // 1. Local cache hit — instant
      const info = await FileSystem.getInfoAsync(localUri);
      if (info.exists) return localUri;

      // 2. Pre-generated file served as static asset from Vercel CDN
      const fileUrl = `${API_BASE_URL}/tts/${fileKey}.mp3`;
      const dl = await FileSystem.downloadAsync(fileUrl, localUri);
      if (dl.status === 200) return localUri;
      await FileSystem.deleteAsync(localUri, { idempotent: true });

      // 3. Fallback: generate via ElevenLabs API and cache
      const res = await fetch(`${API_BASE_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source: 'learn', ...(userId ? { userId } : {}) }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.audio) return null;
      await FileSystem.writeAsStringAsync(localUri, data.audio, { encoding: 'base64' as any });
      return localUri;
    } catch { return null; }
  }, []);

  // ── Load grammar step ──────────────────────────────────────
  const loadGrammarStep = useCallback((ex: GrammarEx) => {
    setGStatus('answering');
    setUserAnswer('');
    setIsCorrect(null);
    setShowHint(false);
    setHelpExplanation(null);
    setHelpLoading(false);
    feedbackAnim.setValue(0);
    if (ex.options) setShuffledOptions([...ex.options].sort(() => Math.random() - 0.5));
    if (ex.choices) setShuffledChoices([...ex.choices].sort(() => Math.random() - 0.5));
    if (ex.type === 'word_order' && ex.words) {
      setWordOrderPool([...ex.words].sort(() => Math.random() - 0.5));
      setWordOrderPlaced([]);
    } else {
      setWordOrderPool([]);
      setWordOrderPlaced([]);
    }
  }, [feedbackAnim]);

  // ── Load pronunciation step ────────────────────────────────
  const lastPhraseText = useRef<string | null>(null);
  // Ref sincronizada com charlotteAudioUri pra usar dentro de loadPronStep
  // sem precisar re-criar o callback a cada uri mudar.
  const charlotteAudioUriRef = useRef<string | null>(null);
  useEffect(() => { charlotteAudioUriRef.current = charlotteAudioUri; }, [charlotteAudioUri]);

  const loadPronStep = useCallback(async (ph: PronStep) => {
    setPronStatus('loading_audio');
    setPronFeedback(null);
    pronFeedbackAnim.setValue(0);
    setListenWriteAnswer('');
    setListenWriteCorrect(null);
    setMpChosen(null);
    setMpCorrect(null);
    setStressTapped(null);
    setStressCorrect(null);
    speechTranscriptRef.current = '';
    stopAudio();

    // Captura uri local pra usar no autoplay no fim — evita race com state.
    let autoplayUri: string | null = null;

    try {
      if (ph.type === 'sentence_stress') {
        // No audio needed for sentence_stress
        setCharlotteAudioUri(null);
        lastPhraseText.current = null;
      } else if (ph.type === 'minimal_pairs') {
        // Fetch TTS for the target word
        const targetWord = ph.target === 'word2' ? ph.word2 : ph.word1;
        if (targetWord && targetWord !== lastPhraseText.current) {
          const uri = await fetchTTS(targetWord);
          if (uri) {
            setCharlotteAudioUri(uri);
            lastPhraseText.current = targetWord;
            autoplayUri = uri;
          } else {
            setCharlotteAudioUri(null);
            lastPhraseText.current = null;
          }
        } else if (targetWord === lastPhraseText.current) {
          autoplayUri = charlotteAudioUriRef.current;
        }
      } else if (ph.text) {
        // repeat, listen_write — use ph.text
        if (ph.text !== lastPhraseText.current) {
          const uri = await fetchTTS(ph.text, ph.audio_url);
          if (uri) {
            setCharlotteAudioUri(uri);
            lastPhraseText.current = ph.text;
            autoplayUri = uri;
          } else {
            setCharlotteAudioUri(null);
            lastPhraseText.current = null;
          }
        } else {
          autoplayUri = charlotteAudioUriRef.current;
        }
      }
      // Pre-warm: já configura a session em modo de gravação ANTES do
      // user tocar no mic. Sem isso, o startRecording precisa fazer o
      // setAudioModeAsync (100-300ms) e o início da fala fica cortado.
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, interruptionMode: 'doNotMix' }).catch(() => {});
    } catch {}

    // Always transition to listening — record button must always appear
    setPronStatus('listening');

    // Autoplay (padrao Duolingo): toca uma vez ao entrar no step.
    if (autoplayUri && ph.type !== 'sentence_stress') {
      setTimeout(async () => {
        try {
          await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldRouteThroughEarpiece: false });
        } catch {}
        try { toggleAudio(charlottePlayId, autoplayUri!); } catch {}
      }, 600);
    }
  }, [fetchTTS, stopAudio, pronFeedbackAnim, toggleAudio]);

  // ── Initialise & step transitions ──────────────────────────
  useEffect(() => {
    if (!currentStep) return;
    if (currentStep.kind === 'grammar') {
      loadGrammarStep(currentStep.exercise);
    } else {
      loadPronStep(currentStep.phrase);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx]);

  // ── Grammar: check answer ──────────────────────────────────
  const handleGrammarSubmit = () => {
    if (!currentStep || currentStep.kind !== 'grammar') return;

    const ex = currentStep.exercise;

    // short_write: free-form — always correct if non-trivial length
    if (ex.type === 'short_write') {
      if (userAnswer.trim().length <= 5) return;
      setIsCorrect(true);
      setGStatus('submitted');
      setSessionXP(prev => prev + 8);
      saveExercise({ level, moduleIndex, topicIndex, exerciseType: ex.type, isCorrect: true, xpEarned: 8,
        exerciseData: { question: ex.prompt, correctAnswer: ex.answer, userAnswer: userAnswer.trim() } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      soundEngine.play('answer_correct').catch(() => {});
      Animated.spring(feedbackAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 60 }).start();
      return;
    }

    // word_order: check placed words against answer
    if (ex.type === 'word_order') {
      if (wordOrderPlaced.length === 0) return;
      const answerText = wordOrderPlaced.join(' ');
      const correct = checkGrammar(ex, answerText);
      const xp = correct ? 10 : 0;
      setIsCorrect(correct);
      setGStatus('submitted');
      setSessionXP(prev => prev + xp);
      saveExercise({ level, moduleIndex, topicIndex, exerciseType: ex.type, isCorrect: correct, xpEarned: xp,
        exerciseData: { question: ex.prompt, correctAnswer: ex.answer, userAnswer: answerText } });
      if (correct) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); soundEngine.play('answer_correct').catch(() => {}); }
      else         { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);   soundEngine.play('answer_wrong').catch(() => {}); setSessionErrors(prev => prev + 1); }
      Animated.spring(feedbackAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 60 }).start();
      return;
    }

    if (!userAnswer.trim()) return;

    const correct = checkGrammar(ex, userAnswer);
    const xp = correct ? 10 : 0;
    setIsCorrect(correct);
    setGStatus('submitted');
    setSessionXP(prev => prev + xp);

    saveExercise({
      level, moduleIndex, topicIndex,
      exerciseType: ex.type,
      isCorrect: correct, xpEarned: xp,
      exerciseData: { question: ex.prompt, correctAnswer: ex.answer, userAnswer: userAnswer.trim() },
    });

    if (correct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      soundEngine.play('answer_correct').catch(() => {});
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      soundEngine.play('answer_wrong').catch(() => {});
      setSessionErrors(prev => prev + 1);
    }
    Animated.spring(feedbackAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 60 }).start();
  };

  // ── Pronunciation: play ────────────────────────────────────
  const handlePlayCharlotte = () => {
    if (charlotteAudioUri) toggleAudio(charlottePlayId, charlotteAudioUri);
  };

  // Ondas animadas no icone de speaker quando audio toca: alterna entre
  // SpeakerLow (1 onda) e SpeakerHigh (2 ondas) a cada 300ms, dando
  // sensacao de som emanando. SpeakerSimpleNone foi removido pq tem
  // design diferente (sem espacamento branco no tail) e quebrava o ciclo.
  const [speakerWave, setSpeakerWave] = useState<0 | 1>(1);
  useEffect(() => {
    if (!isPlaying) { setSpeakerWave(1); return; }
    const iv = setInterval(() => {
      setSpeakerWave(prev => (prev === 0 ? 1 : 0));
    }, 300);
    return () => clearInterval(iv);
  }, [isPlaying]);
  const SpeakerIcon = speakerWave === 0 ? SpeakerLow : SpeakerHigh;

  // ── Pronunciation: show result panel ──────────────────────
  const showPronResult = (feedback: NonNullable<PronFeedback>) => {
    setPronFeedback(feedback);
    setSessionXP(prev => prev + feedback.xp);
    Animated.spring(pronFeedbackAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 60 }).start();
    setPronStatus('result');
  };

  const handleRetryPron = () => {
    setPronFeedback(null);
    pronFeedbackAnim.setValue(0);
    speechTranscriptRef.current = '';
    setPronStatus('listening');
  };

  // ── Pronunciation: record (repeat = on-device ASR, fallback = Whisper) ──
  const startRecording = async () => {
    if (recordingRef.current) return;
    if (!currentStep || currentStep.kind !== 'pronunciation') return;

    recordingRef.current = true;
    recordingStartRef.current = Date.now();
    speechTranscriptRef.current = '';
    setPronStatus('recording');

    try {
      if (currentStep.phrase.type === 'repeat' && ASR_AVAILABLE) {
        // On-device ASR — no audio file needed
        const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!perm.granted) {
          recordingRef.current = false;
          setPronStatus('listening');
          return;
        }
        // Registra a sessão no expo-audio antes do módulo nativo configurar a AVAudioSession.
        // Sem isso, o setAudioModeAsync do reset não consegue sobrescrever o estado que o
        // ExpoSpeechRecognitionModule deixa — causa earpiece persistente no iOS.
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: true });
      } else {
        // Recorder — Whisper fallback (when on-device ASR unavailable)
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      recordingRef.current = false;
      setPronStatus('listening');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current || !currentStep || currentStep.kind !== 'pronunciation') return;

    const elapsed = Date.now() - recordingStartRef.current;

    // Ignore accidental releases shorter than 300ms
    if (elapsed < 300) {
      recordingRef.current = false;
      if (ASR_AVAILABLE) {
        ExpoSpeechRecognitionModule.abort();
      } else {
        try { await recorder.stop(); } catch {}
      }
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, interruptionMode: 'doNotMix' });
      setPronStatus('listening');
      return;
    }

    recordingRef.current = false;
    setPronStatus('assessing');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      if (ASR_AVAILABLE) {
        // ── REPEAT: on-device ASR + string similarity ────────────
        ExpoSpeechRecognitionModule.stop();
        // Give ~300ms for final result event to fire
        await new Promise(r => setTimeout(r, 300));
        // Restore speaker routing — ASR leaves iOS audio session in earpiece mode
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, interruptionMode: 'doNotMix' });

        const transcript = speechTranscriptRef.current;
        const pct = transcript ? wordMatchPercent(transcript, currentStep.phrase.text ?? '') : 0;

        let feedback: NonNullable<PronFeedback>;
        // Novice: binário (acerto/erro). Inter/Advanced: 3 estados.
        if (level === 'Novice') {
          if (pct >= 70) {
            feedback = { state: 'correct', xp: 15, message: isPortuguese ? pickNoviceCorrectMessage() : 'Nice! Pronunciation ok.' };
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            soundEngine.play('answer_correct').catch(() => {});
          } else {
            feedback = { state: 'error', xp: 0, message: isPortuguese ? `Tente de novo. Entendemos: "${transcript}".` : `Try again. We heard: "${transcript}".` };
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            soundEngine.play('answer_wrong').catch(() => {});
            setSessionErrors(prev => prev + 1);
          }
        } else if (pct >= 85) {
          feedback = { state: 'correct', xp: 15, message: isPortuguese ? 'Perfeito! Ótima pronúncia.' : 'Perfect! Great pronunciation.' };
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          soundEngine.play('answer_correct').catch(() => {});
        } else if (pct >= 50) {
          feedback = { state: 'close', xp: 8, message: isPortuguese ? `Quase! Entendemos: "${transcript}". Tente de novo.` : `Close! We heard: "${transcript}". Try again.` };
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else {
          feedback = { state: 'error', xp: 0, message: isPortuguese ? 'Não conseguimos entender. Fale mais perto do microfone.' : "We didn't catch that. Speak closer to the mic." };
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          soundEngine.play('answer_wrong').catch(() => {});
          setSessionErrors(prev => prev + 1);
        }
        // v2: Novice binário (100/0), outros níveis score real. Map por stepIdx
        // garante que retry sobrescreve a tentativa anterior do mesmo step.
        if (isV2) {
          pronScoresRef.current.set(stepIdx,
            level === 'Novice' ? (feedback.state === 'correct' ? 100 : 0) : pct
          );
        }
        saveExercise({ level, moduleIndex, topicIndex, exerciseType: 'repeat', isCorrect: feedback.state === 'correct', xpEarned: feedback.xp,
          exerciseData: { question: currentStep.phrase.text, score: pct, userAnswer: transcript } });
        showPronResult(feedback);

      } else {
        // ── REPEAT fallback: Whisper transcription (no native ASR) ──
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, interruptionMode: 'doNotMix' });
        const audioUri = recorder.uri;
        if (!audioUri) { setPronStatus('error'); return; }

        const isWav = audioUri.toLowerCase().endsWith('.wav');
        const formData = new FormData();
        formData.append('audio', { uri: audioUri, name: isWav ? 'recording.wav' : 'recording.m4a', type: isWav ? 'audio/wav' : 'audio/x-m4a' } as unknown as Blob);
        if (userId) formData.append('userId', userId);

        const res = await fetch(`${API_BASE_URL}/api/transcribe`, { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Transcription failed');
        const data = await res.json();

        const transcript = (data.transcription as string) ?? '';
        const pct = transcript ? wordMatchPercent(transcript, currentStep.phrase.text ?? '') : 0;

        let feedback: NonNullable<PronFeedback>;
        // Novice: binário (acerto/erro). Inter/Advanced: 3 estados.
        if (level === 'Novice') {
          if (pct >= 70) {
            feedback = { state: 'correct', xp: 15, message: isPortuguese ? pickNoviceCorrectMessage() : 'Nice! Pronunciation ok.' };
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            soundEngine.play('answer_correct').catch(() => {});
          } else {
            feedback = { state: 'error', xp: 0, message: isPortuguese ? `Tente de novo. Entendemos: "${transcript}".` : `Try again. We heard: "${transcript}".` };
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            soundEngine.play('answer_wrong').catch(() => {});
            setSessionErrors(prev => prev + 1);
          }
        } else if (pct >= 85) {
          feedback = { state: 'correct', xp: 15, message: isPortuguese ? 'Perfeito! Ótima pronúncia.' : 'Perfect! Great pronunciation.' };
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          soundEngine.play('answer_correct').catch(() => {});
        } else if (pct >= 50) {
          feedback = { state: 'close', xp: 8, message: isPortuguese ? `Quase! Entendemos: "${transcript}". Tente de novo.` : `Close! We heard: "${transcript}". Try again.` };
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else {
          feedback = { state: 'error', xp: 0, message: isPortuguese ? 'Não conseguimos entender. Fale mais perto do microfone.' : "We didn't catch that. Speak closer to the mic." };
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          soundEngine.play('answer_wrong').catch(() => {});
          setSessionErrors(prev => prev + 1);
        }
        if (isV2) {
          pronScoresRef.current.set(stepIdx,
            level === 'Novice' ? (feedback.state === 'correct' ? 100 : 0) : pct
          );
        }
        saveExercise({ level, moduleIndex, topicIndex, exerciseType: 'repeat', isCorrect: feedback.state === 'correct', xpEarned: feedback.xp,
          exerciseData: { question: currentStep.phrase.text, score: pct, userAnswer: transcript } });
        showPronResult(feedback);
      }
    } catch { setPronStatus('error'); }
  };

  // ── Pronunciation: listen_write check ─────────────────────
  const checkListenWrite = () => {
    if (!currentStep || currentStep.kind !== 'pronunciation') return;
    if (!listenWriteAnswer.trim()) return;
    const u = listenWriteAnswer.trim().toLowerCase().replace(/[.,!?]/g, '');
    const c = (currentStep.phrase.text ?? '').toLowerCase().replace(/[.,!?]/g, '');
    const words   = c.split(' ').filter(w => w.length > 2);
    const matched = words.filter(w => u.includes(w)).length;
    const correct = matched >= Math.ceil(words.length * 0.7);
    setListenWriteCorrect(correct);
    const xp = correct ? 8 : 0;
    saveExercise({ level, moduleIndex, topicIndex, exerciseType: 'listen_write', isCorrect: correct, xpEarned: xp,
      exerciseData: { question: currentStep.phrase.text, correctAnswer: currentStep.phrase.text, userAnswer: listenWriteAnswer.trim() } });
    if (correct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      soundEngine.play('answer_correct').catch(() => {});
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      soundEngine.play('answer_wrong').catch(() => {});
      setSessionErrors(prev => prev + 1);
    }
    const message = correct
      ? (isPortuguese ? 'Correto! Boa escuta.' : 'Correct! Great listening.')
      : (isPortuguese ? 'Quase lá — ouça novamente.' : 'Almost there — listen again.');
    showPronResult({ state: correct ? 'correct' : 'error', message, xp });
  };

  // ── Advance step ───────────────────────────────────────────
  const handleNext = async () => {
    setWordOrderPlaced([]);
    setWordOrderPool([]);
    const next = stepIdx + 1;
    if (next >= totalSteps) {
      await saveTopicComplete(level, moduleIndex, topicIndex);

      // v2 progress write — compute score, save to learn_history_v2.
      // 1 retentativa de exercício não conta como erro extra (sessionErrors
      // só incrementa na PRIMEIRA falha de cada step). Score = % de steps
      // sem erro. Ajustes finos vêm quando rolarmos métricas de produção.
      if (isV2 && params.moduleId && params.unitId && totalSteps > 0) {
        const activityType: 'grammar' | 'speaking' =
          params.activity === 'ls' ? 'speaking' : 'grammar';
        // Speaking: média do ÚLTIMO score de cada step (retry sobrescreve).
        // Grammar: 100 − % de erros entre as tentativas. Igual antes.
        let rawScore: number;
        if (activityType === 'speaking') {
          const map = pronScoresRef.current;
          const values = Array.from(map.values());
          rawScore = values.length > 0
            ? Math.round(values.reduce((s, x) => s + x, 0) / values.length)
            : 0;
        } else {
          rawScore = Math.round(((totalSteps - sessionErrors) / totalSteps) * 100);
        }
        const finalScore = Math.max(0, Math.min(100, rawScore));
        const threshold = activityType === 'grammar' ? 70 : activityType === 'speaking' ? 60 : 100;
        setCompletedActivityScore({ score: finalScore, threshold, activityType });
        try {
          await v2Progress.saveAttempt(
            params.moduleId, params.unitId, activityType, finalScore,
          );
        } catch (e) {
          console.warn('[v2Progress] save attempt failed', e);
        }
      }

      setIsComplete(true);
      if (userId) {
        // 📅 Agendar revisões espaçadas (3, 7, 14, 30 dias) — somente se NÃO for uma revisão
        if (!params.reviewId) {
          scheduleReviews(userId, level, moduleIndex, topicIndex, topic?.title ?? '').catch(console.warn);
        } else {
          // ✅ Marcar revisão como concluída — ou reagendar se houve erros
          if (sessionErrors > 0) {
            rescheduleReview(
              params.reviewId,
              userId,
              level,
              moduleIndex,
              topicIndex,
              topic?.title ?? '',
            ).catch(console.warn);
          } else {
            markReviewDone(params.reviewId).catch(console.warn);
          }
        }
        track('lesson_completed', { level, module: moduleIndex, topic: topicIndex, isReview: !!params.reviewId });

        // Check level promotion after topic complete (only when NOT a review)
        if (!params.reviewId) {
          try {
            const { data: progressData } = await supabase
              .from('learn_progress')
              .select('completed')
              .eq('user_id', userId)
              .eq('level', level)
              .maybeSingle();
            const completedCount = (progressData?.completed ?? []).length;
            const status = await checkLevelPromotion(userId, level, completedCount);
            if (status.eligible && status.nextLevel) {
              setPromotionNextLevel(status.nextLevel);
              setShowPromotion(true);
            }
          } catch (e) {
            console.warn('[Promotion] check error:', e);
          }
        }
      }
      // Celebracao de conclusao: detecta se foi modulo completo (ultimo topico)
      const moduleData = CURRICULUM[level]?.[moduleIndex];
      const isLastTopic = !!moduleData && topicIndex === moduleData.topics.length - 1;
      const isModuleComplete = isLastTopic && !params.reviewId;

      if (isModuleComplete) {
        // SFX grande + voz "Module complete!" (delay interno no soundEngine)
        soundEngine.play('module_complete').catch(() => {});
      } else {
        // Topico finalizado: SFX curto + voz "Topic done!"
        soundEngine.play('topic_complete').catch(() => {});
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 120);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 280);
    } else {
      setStepIdx(next);
    }
  };

  const handlePromotion = async () => {
    if (!userId || !promotionNextLevel) return;
    try {
      await promoteUserLevel(userId, promotionNextLevel);
      await refreshProfile(); // refresh auth context so level updates everywhere
    } catch (e) {
      console.error('[Promotion] error:', e);
    }
    setShowPromotion(false);
    router.replace('/(app)'); // go home
  };

  const progress = totalSteps > 0 ? (stepIdx + 1) / totalSteps : 0;

  const modTitle   = CURRICULUM[level]?.[moduleIndex]?.title ?? '';
  const topicTitle = topic?.title ?? '';

  // ── Completion screen ──────────────────────────────────────
  if (isComplete) {
    // ── Tela de conclusão: REVISÃO ─────────────────────────────
    if (params.reviewId) {
      const perfect = sessionErrors === 0;
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top', 'left', 'right']}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            {/* Ícone */}
            <View style={{
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: perfect ? C.greenBg : C.violetBg,
              borderWidth: 2, borderColor: perfect ? C.green : C.violet,
              alignItems: 'center', justifyContent: 'center', marginBottom: 24,
            }}>
              {perfect
                ? <CheckCircle size={40} color={C.green} weight="fill" />
                : <ArrowsClockwise size={40} color={C.violet} weight="fill" />
              }
            </View>

            {/* Badge revisão */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: C.violetBg, borderRadius: 10,
              paddingHorizontal: 10, paddingVertical: 4, marginBottom: 16 }}>
              <ArrowsClockwise size={11} color={C.violet} weight="bold" />
              <AppText style={{ fontSize: 11, fontWeight: '700', color: C.violet }}>
                {isPortuguese ? 'Revisão' : 'Review'}
              </AppText>
            </View>

            <AppText style={{ fontSize: 24, fontWeight: '900', color: C.navy, marginBottom: 8, letterSpacing: -0.5, textAlign: 'center' }}>
              {perfect
                ? (isPortuguese ? 'Revisão perfeita!' : 'Perfect review!')
                : (isPortuguese ? 'Revisão concluída!' : 'Review complete!')}
            </AppText>
            <AppText style={{ fontSize: 15, color: C.navyMid, textAlign: 'center', lineHeight: 22, marginBottom: 8 }}>
              {topicTitle}
            </AppText>
            <AppText style={{ fontSize: 13, color: C.navyLight, textAlign: 'center', lineHeight: 20, marginBottom: 12 }}>
              {sessionXP} {isPortuguese ? 'XP ganhos' : 'XP earned'}
            </AppText>

            {/* Feedback de erros / reagendamento */}
            <View style={{
              backgroundColor: perfect ? C.greenBg : C.violetBg,
              borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12,
              marginBottom: 32, alignItems: 'center',
            }}>
              <AppText style={{ fontSize: 13, color: perfect ? C.green : C.violet, fontWeight: '600', textAlign: 'center', lineHeight: 20 }}>
                {perfect
                  ? (isPortuguese
                    ? 'Excelente! Memoria consolidada — proxima revisao em breve.'
                    : 'Excellent! Memory consolidated — next review coming up.')
                  : (isPortuguese
                    ? `${sessionErrors} erro${sessionErrors > 1 ? 's' : ''} detectado${sessionErrors > 1 ? 's' : ''}. Revisao reagendada para daqui 3 dias.`
                    : `${sessionErrors} mistake${sessionErrors > 1 ? 's' : ''} detected. Review rescheduled for 3 days from now.`)
                }
              </AppText>
            </View>

            <TouchableOpacity
              onPress={() => router.replace('/(app)')}
              style={{ backgroundColor: C.navy, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 40, marginBottom: 16 }}
            >
              <AppText style={{ fontSize: 15, fontWeight: '800', color: '#FFF' }}>
                {isPortuguese ? 'Voltar ao início' : 'Back to home'}
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace('/(app)/learn-trail')}>
              <AppText style={{ fontSize: 14, color: C.navyLight, fontWeight: '600' }}>
                {isPortuguese ? 'Ver trilha' : 'View trail'}
              </AppText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    // ── Tela de conclusão: APRENDIZADO NORMAL ──────────────────
    const modules = CURRICULUM[level];
    let nextModuleIdx = moduleIndex;
    let nextTopicIdx = topicIndex + 1;

    if (modules[nextModuleIdx] && nextTopicIdx >= modules[nextModuleIdx].topics.length) {
      nextModuleIdx = moduleIndex + 1;
      nextTopicIdx = 0;
    }

    const hasNextTopic = nextModuleIdx < modules.length && modules[nextModuleIdx]?.topics[nextTopicIdx] !== undefined;

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: accentBg, borderWidth: 2, borderColor: accent,
            alignItems: 'center', justifyContent: 'center', marginBottom: 24,
          }}>
            <CheckCircle size={40} color={accent} weight="fill" />
          </View>
          <AppText style={{ fontSize: 24, fontWeight: '900', color: C.navy, marginBottom: 8, letterSpacing: -0.5 }}>
            {isPortuguese ? 'Tópico concluído!' : 'Topic complete!'}
          </AppText>
          <AppText style={{ fontSize: 15, color: C.navyMid, textAlign: 'center', lineHeight: 22, marginBottom: 8 }}>
            {topicTitle}
          </AppText>
          <AppText style={{ fontSize: 13, color: C.navyLight, textAlign: 'center', lineHeight: 20, marginBottom: 32 }}>
            {sessionXP} {isPortuguese ? 'XP ganhos' : 'XP earned'}
          </AppText>

          {/* Banner: score < threshold ⇒ proxima atividade nao destrava */}
          {(() => {
            const c = completedActivityScore;
            if (!c || c.score >= c.threshold) return null;
            const nextActivityLabel = c.activityType === 'grammar'
              ? (isPortuguese ? 'Listening & Speaking' : 'Listening & Speaking')
              : c.activityType === 'speaking'
              ? (isPortuguese ? 'Role-play' : 'Role-play')
              : (isPortuguese ? 'Guided Chat' : 'Guided Chat');
            return (
              <View style={{
                width: '100%', maxWidth: 360,
                backgroundColor: 'rgba(217,119,6,0.08)',
                borderWidth: 1, borderColor: 'rgba(217,119,6,0.25)',
                borderRadius: 16, padding: 18, marginBottom: 20, alignItems: 'center',
              }}>
                <AppText style={{ fontSize: 14, color: '#92400E', fontWeight: '700', textAlign: 'center', marginBottom: 6 }}>
                  {isPortuguese
                    ? `Você fez ${c.score}%. Precisa de ${c.threshold}% pra desbloquear ${nextActivityLabel}.`
                    : `You scored ${c.score}%. Need ${c.threshold}% to unlock ${nextActivityLabel}.`}
                </AppText>
                <TouchableOpacity
                  onPress={() => {
                    // Refazer: re-route mesmo path/params, reseta estado
                    router.replace({
                      pathname: '/(app)/learn-session',
                      params: { ...params } as any,
                    });
                  }}
                  style={{
                    marginTop: 10, backgroundColor: '#D97706',
                    borderRadius: 12, paddingVertical: 11, paddingHorizontal: 22,
                  }}
                >
                  <AppText style={{ fontSize: 14, fontWeight: '800', color: '#FFF' }}>
                    {isPortuguese ? 'Refazer' : 'Try again'}
                  </AppText>
                </TouchableOpacity>
              </View>
            );
          })()}

          {/* "Continuar" so faz sentido se passou (tem proxima activity)
              OU se eh v1 (fluxo legado sem threshold). v2 + nao passou:
              esconde botao (banner ja oferece Refazer; link Voltar abaixo). */}
          {(() => {
            const c = completedActivityScore;
            const v2NotPassed = isV2 && c && c.score < c.threshold;
            if (v2NotPassed) return null;
            return (
              <TouchableOpacity
                onPress={() => {
                  if (isV2) {
                    const passed = c && c.score >= c.threshold;
                    if (passed && params.moduleId && params.unitId) {
                      if (c.activityType === 'grammar') {
                        router.replace({
                          pathname: '/(app)/learn-session',
                          params: { v: 'v2', level, moduleId: params.moduleId, unitId: params.unitId, activity: 'ls' } as any,
                        });
                        return;
                      }
                      if (c.activityType === 'speaking') {
                        router.replace({
                          pathname: '/(app)/roleplay-exercise' as any,
                          params: { level, moduleId: params.moduleId, unitId: params.unitId } as any,
                        });
                        return;
                      }
                    }
                    router.replace('/(app)/(tabs)' as any);
                  } else if (hasNextTopic) {
                    router.replace({
                      pathname: '/(app)/learn-session',
                      params: { level, moduleIndex: String(nextModuleIdx), topicIndex: String(nextTopicIdx) },
                    });
                  } else {
                    router.replace('/(app)/learn-trail');
                  }
                }}
                style={{ backgroundColor: C.navy, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 40, marginBottom: 16 }}
              >
                <AppText style={{ fontSize: 15, fontWeight: '800', color: '#FFF' }}>{isPortuguese ? 'Continuar trilha' : 'Continue trail'}</AppText>
              </TouchableOpacity>
            );
          })()}
          <TouchableOpacity onPress={() => router.replace(isV2 ? '/(app)/(tabs)' as any : '/(app)/learn-trail')}>
            <AppText style={{ fontSize: 14, color: C.navyLight, fontWeight: '600' }}>{isPortuguese ? 'Voltar' : 'Back'}</AppText>
          </TouchableOpacity>
        </View>
        <PromotionModal
          isOpen={showPromotion}
          nextLevel={promotionNextLevel}
          onConfirm={handlePromotion}
        />
      </SafeAreaView>
    );
  }

  if (!currentStep) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top', 'left', 'right']}>

      {/* ── Header ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, height: 52,
        borderBottomWidth: 1, borderBottomColor: C.border,
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ArrowLeft size={22} color={C.navy} weight="bold" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          {params.reviewId ? (
            /* Badge de revisão — substitui o modTitle quando é uma revisão */
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4,
              backgroundColor: C.violetBg, borderRadius: 8,
              paddingHorizontal: 8, paddingVertical: 2, marginBottom: 2 }}>
              <ArrowsClockwise size={10} color={C.violet} weight="bold" />
              <AppText style={{ fontSize: 9, fontWeight: '700', color: C.violet, textTransform: 'uppercase', letterSpacing: 1 }}>
                {isPortuguese ? 'Revisão' : 'Review'}
              </AppText>
            </View>
          ) : (
            <AppText style={{ fontSize: 9, fontWeight: '700', color: C.navyLight, textTransform: 'uppercase', letterSpacing: 1 }}>
              {modTitle}
            </AppText>
          )}
          <AppText style={{ fontSize: 18, fontWeight: '800', color: C.navy, letterSpacing: -0.3 }} numberOfLines={1}>
            {topicTitle}
          </AppText>
        </View>
        <TouchableOpacity onPress={() => router.push({ pathname: '/(app)/stats', params: { sessionXP: String(sessionXP), totalXP: String(baseTotalXP + sessionXP), userId: userId ?? '', userLevel: userLevel ?? 'Inter', userName: '' } })} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <AnimatedXPBadge xp={baseTotalXP + sessionXP} iconSize={13} fontSize={13} padH={10} padV={5} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#FAF9FF' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1, backgroundColor: '#FAF9FF' }}
          contentContainerStyle={{ padding: 20, paddingBottom: currentStep.kind === 'pronunciation' && pronStatus === 'result' ? 300 : 24, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={
            // Grammar exercises com input (read_answer/fix_error/short_write) ou
            // passagens longas precisam scroll pra revelar input acima do teclado.
            // Pronunciation: so listen_write (mantido). MC/word_bank/fill_gap nao
            // precisam input do teclado, sem scroll.
            (currentStep.kind === 'grammar' &&
              ['read_answer', 'fix_error', 'short_write'].includes(currentStep.exercise.type)) ||
            (currentStep.kind === 'pronunciation' && currentStep.phrase?.type === 'listen_write')
          }
        >
          {/* ── Progress (sem chip de tipo, mesmo padrao do grammar) ── */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 8 }}>
              <AppText style={{ fontSize: 12, color: C.navyLight, fontWeight: '600' }}>
                {stepIdx + 1} / {totalSteps}
              </AppText>
            </View>
            <View style={{ height: 8, backgroundColor: C.ghost, borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ height: 8, width: `${progress * 100}%` as `${number}%`, backgroundColor: accent, borderRadius: 4 }} />
            </View>
          </View>

          {/* ── GRAMMAR (full-screen, no card wrapper) ── */}
          {currentStep.kind === 'grammar' && (
            <View style={{ flex: 1 }}>
              {/* Instruction — bubble na cor do nível, sem avatar, centralizado */}
              <View style={{ backgroundColor: accentBg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 16, alignSelf: 'center' }}>
                <AppText style={{ fontSize: 12, color: accent, fontWeight: '700', textAlign: 'center' }}>
                  {currentStep.exercise.type === 'multiple_choice' ? (isPortuguese ? 'Escolha a opção correta para completar a frase.'    : 'Choose the correct option to complete the sentence.')
                    : currentStep.exercise.type === 'word_bank'      ? (isPortuguese ? 'Toque na palavra correta para preencher o espaço.' : 'Tap the correct word to fill the blank.')
                    : currentStep.exercise.type === 'fill_gap'       ? (isPortuguese ? 'Digite a palavra que falta na lacuna.'            : 'Type the missing word in the blank.')
                    : currentStep.exercise.type === 'fix_error'      ? (isPortuguese ? 'Encontre o erro e reescreva a frase corretamente.'  : 'Find the mistake and rewrite the sentence correctly.')
                    : currentStep.exercise.type === 'word_order'     ? (isPortuguese ? 'Toque nas palavras abaixo para montar a frase na ordem correta.' : 'Tap the words below to build the sentence in the correct order.')
                    : currentStep.exercise.type === 'short_write'    ? (isPortuguese ? 'Escreva sua resposta em inglês. Depois, veja o exemplo.' : 'Write your answer in English. Then see the model answer.')
                    :                                                   (isPortuguese ? 'Leia o texto e responda à pergunta.'                : 'Read the text and answer the question.')}
                </AppText>
              </View>

              {/* Row: Charlotte LEFT + sentence/passage RIGHT (Duo style).
                  WebP com alpha real — sem crop hack. */}
              {(() => { const CHAR_H = 196; const CHAR_W = 110; return (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <View style={{ width: CHAR_W, alignItems: 'center' }}>
                  <Image
                    source={charlotteSrc}
                    style={{ width: CHAR_W, height: CHAR_H }}
                    contentFit="contain"
                    transition={150}
                  />
                  {/* Sombra elíptica abaixo dos pés */}
                  <View style={{
                    width: 80, height: 10, marginTop: -2,
                    borderRadius: 60,
                    backgroundColor: 'rgba(22,21,58,0.16)',
                    transform: [{ scaleY: 0.4 }],
                  }} />
                </View>

                {/* Right col: passage + sentence/question */}
                <View style={{ flex: 1 }}>
                  {/* Passage (read_answer) */}
                  {currentStep.exercise.type === 'read_answer' && currentStep.exercise.passage && (
                    <View style={{ backgroundColor: C.ghost, borderRadius: 14, padding: 14, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: accent }}>
                      {isPortuguese
                        ? <TranslatableText text={formatDialogue(currentStep.exercise.passage)} style={{ fontSize: 14, color: C.navy, lineHeight: 22 }} />
                        : <AppText style={{ fontSize: 14, color: C.navy, lineHeight: 22 }}>{formatDialogue(currentStep.exercise.passage)}</AppText>
                      }
                    </View>
                  )}

                  {/* Bubble com sentence — só multiple_choice. Mesmo padrão
                      do word_bank: gap inline preenchido pelo userAnswer
                      (substitui dinamicamente quando troca de opção). */}
                  {currentStep.exercise.type === 'multiple_choice' && !!currentStep.exercise.sentence && (() => {
                    const GAP = '_____';
                    const sentence = formatDialogue(currentStep.exercise.sentence ?? '');
                    const parts = sentence.split(GAP);
                    const beforeRaw = parts[0] ?? '';
                    const afterRaw  = parts[1] ?? '';
                    const hasGap    = parts.length > 1;
                    const gapColor  = gStatus === 'submitted' ? (isCorrect ? C.green : C.red) : accent;
                    const gapText   = userAnswer || '______';
                    const beforeLines = beforeRaw.split('\n');
                    const afterLines  = afterRaw.split('\n');
                    const lastBefore  = beforeLines[beforeLines.length - 1];
                    const firstAfter  = afterLines[0];
                    const preLines    = beforeLines.slice(0, -1);
                    const postLines   = afterLines.slice(1);
                    const baseStyle   = { fontSize: 16, color: C.navy, fontWeight: '700' as const, lineHeight: 22 };
                    return (
                      <View style={{
                        backgroundColor: '#FFF',
                        borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
                        borderWidth: 1, borderColor: C.border,
                      }}>
                        {hasGap ? (
                          <View>
                            {preLines.map((ln, i) => ln.length > 0 && (
                              <AppText key={`pre${i}`} style={[baseStyle, { marginBottom: 2 }]}>{ln}</AppText>
                            ))}
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                              {lastBefore.length > 0 && <AppText style={baseStyle}>{lastBefore}</AppText>}
                              <AppText style={{ ...baseStyle, color: gapColor, textDecorationLine: 'underline' }}>{gapText}</AppText>
                              {firstAfter.length > 0 && <AppText style={baseStyle}>{firstAfter}</AppText>}
                            </View>
                            {postLines.map((ln, i) => ln.length > 0 && (
                              <AppText key={`post${i}`} style={[baseStyle, { marginTop: 2 }]}>{ln}</AppText>
                            ))}
                          </View>
                        ) : (
                          <AppText style={baseStyle}>{sentence}</AppText>
                        )}
                      </View>
                    );
                  })()}

                  {/* Sentence / Question — escondida pra multiple_choice (já no bubble) */}
                  {currentStep.exercise.type !== 'multiple_choice' && (
              (currentStep.exercise.type === 'fill_gap' || currentStep.exercise.type === 'word_bank') ? (
                /* ── Fill-gap & Word-bank: sentence with inline gap ── */
                (() => {
                  const GAP = '_____';
                  const sentence = currentStep.exercise.sentence ?? '';
                  const parts    = sentence.split(GAP);
                  const before   = formatDialogue(parts[0] ?? '');
                  const after    = formatDialogue(parts[1] ?? '');
                  const gapColor = gStatus === 'submitted' ? (isCorrect ? C.green : C.red) : accent;
                  const gapAnswer = userAnswer || '______';
                  const isWordBank = currentStep.exercise.type === 'word_bank';
                  const isFillGapAnswering = !isWordBank && gStatus === 'answering';
                  const inputWidth = userAnswer.length > 0
                    ? Math.min(userAnswer.length * 12 + 16, 200)
                    : 64;
                  const ts = { fontSize: 18, fontWeight: '500' as const, color: C.navy, lineHeight: 28 };
                  // Split por linha (formatDialogue inseriu \n entre speakers).
                  // O input fica inline na linha que tem o GAP — outras linhas
                  // viram blocos de texto acima/abaixo.
                  const beforeLines = before.split('\n');
                  const afterLines  = after.split('\n');
                  const lastBefore  = beforeLines[beforeLines.length - 1];
                  const firstAfter  = afterLines[0];
                  const preLines    = beforeLines.slice(0, -1);  // linhas antes da do gap
                  const postLines   = afterLines.slice(1);       // linhas depois da do gap
                  const renderText = (txt: string, key?: string) => isPortuguese
                    ? <TranslatableText key={key} text={txt} style={ts} />
                    : <AppText key={key} style={ts}>{txt}</AppText>;
                  return (
                    <View style={{ marginBottom: isWordBank ? 24 : 16 }}>
                      {preLines.map((ln, i) => ln.length > 0 && (
                        <View key={`pre${i}`} style={{ marginBottom: 4 }}>{renderText(ln)}</View>
                      ))}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        {lastBefore.length > 0 && renderText(lastBefore.replace(/\s+$/, ''), 'lastBefore')}
                        {/* TranslatableText engole espaço de ponta — injetamos manual */}
                        {/\s$/.test(lastBefore) && <AppText style={ts}>{' '}</AppText>}
                        {isFillGapAnswering ? (
                          <TextInput
                            value={userAnswer}
                            onChangeText={setUserAnswer}
                            autoFocus
                            autoCorrect={false}
                            autoCapitalize="none"
                            returnKeyType="done"
                            onSubmitEditing={handleGrammarSubmit}
                            style={{
                              fontSize: 18, fontWeight: '700', color: accent,
                              borderBottomWidth: 2.5, borderBottomColor: accent,
                              width: inputWidth,
                              height: 30,
                              paddingHorizontal: 4,
                              paddingVertical: 0,
                            }}
                          />
                        ) : (
                          <AppText style={{ fontSize: 18, fontWeight: '700', color: gapColor, textDecorationLine: 'underline', lineHeight: 28 }}>
                            {gapAnswer}
                          </AppText>
                        )}
                        {/^\s/.test(firstAfter) && <AppText style={ts}>{' '}</AppText>}
                        {firstAfter.length > 0 && renderText(firstAfter.replace(/^\s+/, ''), 'firstAfter')}
                      </View>
                      {postLines.map((ln, i) => ln.length > 0 && (
                        <View key={`post${i}`} style={{ marginTop: 4 }}>{renderText(ln)}</View>
                      ))}
                    </View>
                  );
                })()
              ) : isPortuguese ? (
                <TranslatableText
                  text={formatDialogue(currentStep.exercise.type === 'read_answer' ? (currentStep.exercise.question ?? '') : (currentStep.exercise.sentence ?? ''))}
                  style={{
                    fontSize: currentStep.exercise.type === 'read_answer' ? 16 : 22,
                    fontWeight: currentStep.exercise.type === 'read_answer' ? '700' : '500',
                    color: C.navy,
                    lineHeight: currentStep.exercise.type === 'read_answer' ? 26 : 34,
                  }}
                />
              ) : (
                <AppText style={{
                  fontSize: currentStep.exercise.type === 'read_answer' ? 16 : 22,
                  fontWeight: currentStep.exercise.type === 'read_answer' ? '700' : '500',
                  color: C.navy,
                  lineHeight: currentStep.exercise.type === 'read_answer' ? 26 : 34,
                  marginBottom: gStatus === 'answering' ? 0 : 20,
                }}>
                  {formatDialogue(String(currentStep.exercise.type === 'read_answer' ? currentStep.exercise.question : currentStep.exercise.sentence) ?? '')}
                </AppText>
              )
              )}
                </View>
              </View>
              ); })()}

              {/* Multiple choice */}
              {currentStep.exercise.type === 'multiple_choice' && (
                <View style={{ gap: 10 }}>
                  {shuffledOptions.map((opt, i) => {
                    const selected = userAnswer === opt;
                    const isCorrectOpt = opt === currentStep.exercise.answer;
                    // locked state colours (after submit)
                    let borderColor = selected ? accent : C.border;
                    let bgColor     = selected ? accentBg : C.card;
                    let dotBg       = selected ? accent : C.ghost;
                    let dotText     = selected ? '#FFF' : C.navyMid;
                    let trailIcon   = selected ? <CheckCircle size={18} color={accent} weight="fill" /> : null;
                    if (gStatus === 'submitted') {
                      if (isCorrectOpt)                        { borderColor = C.green; bgColor = 'rgba(61,136,0,0.08)';    dotBg = C.green;  dotText = '#FFF'; trailIcon = <CheckCircle size={18} color={C.green} weight="fill" />; }
                      else if (selected && !isCorrectOpt)      { borderColor = C.red;   bgColor = 'rgba(220,38,38,0.06)';  dotBg = C.red;    dotText = '#FFF'; trailIcon = <XCircle    size={18} color={C.red}   weight="fill" />; }
                      else                                     { borderColor = C.border; bgColor = C.card; dotBg = C.ghost; dotText = C.navyMid; trailIcon = null; }
                    }
                    return (
                      <TouchableOpacity
                        key={i}
                        onPress={() => gStatus === 'answering' && setUserAnswer(selected ? '' : opt)}
                        activeOpacity={gStatus === 'submitted' ? 1 : 0.7}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 14,
                          borderRadius: 14, borderWidth: 2,
                          borderColor, backgroundColor: bgColor,
                          paddingHorizontal: 16, paddingVertical: 16,
                        }}
                      >
                        <View style={{
                          width: 30, height: 30, borderRadius: 15,
                          backgroundColor: dotBg,
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <AppText style={{ fontSize: 13, fontWeight: '800', color: dotText }}>
                            {['A', 'B', 'C'][i]}
                          </AppText>
                        </View>
                        {isPortuguese
                          ? <View style={{ flex: 1 }}><TranslatableText text={opt} style={{ fontSize: 15, fontWeight: '600', color: C.navy }} /></View>
                          : <AppText style={{ fontSize: 15, fontWeight: '600', color: C.navy, flex: 1 }}>{opt}</AppText>
                        }
                        {trailIcon}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Word bank — chips only, selected word appears inline in sentence above */}
              {currentStep.exercise.type === 'word_bank' && gStatus === 'answering' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
                  {shuffledChoices.map((chip, i) => {
                    const used = chip === userAnswer;
                    return (
                      <TouchableOpacity
                        key={i}
                        onPress={() => setUserAnswer(used ? '' : chip)}
                        activeOpacity={0.7}
                        style={{
                          width: '48%', minHeight: 70,
                          paddingHorizontal: 16, paddingVertical: 18,
                          borderRadius: 14, borderWidth: 1.5,
                          borderColor: used ? accent : C.border,
                          backgroundColor: used ? accentBg : C.card,
                          opacity: used ? 0.85 : 1,
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {isPortuguese
                          ? <TranslatableText text={chip} style={{ fontSize: 17, fontWeight: '700', color: used ? accent : C.navy }} />
                          : <AppText style={{ fontSize: 17, fontWeight: '700', color: used ? accent : C.navy }}>{chip}</AppText>
                        }
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* ── Word Order ── */}
              {currentStep.exercise.type === 'word_order' && gStatus === 'answering' && (
                <View style={{ gap: 12 }}>
                  {/* Context in PT */}
                  {currentStep.exercise.context_pt && (
                    <AppText style={{ fontSize: 14, color: C.navyMid, fontStyle: 'italic', textAlign: 'center' }}>
                      {currentStep.exercise.context_pt}
                    </AppText>
                  )}

                  {/* Sentence builder — placed words */}
                  <View style={{
                    minHeight: 52, backgroundColor: C.ghost, borderRadius: 14,
                    borderWidth: 1.5, borderColor: C.border,
                    flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 8, alignItems: 'center',
                  }}>
                    {wordOrderPlaced.length === 0 && (
                      <AppText style={{ color: C.navyLight, fontSize: 14 }}>
                        {isPortuguese ? 'Toque nas palavras abaixo...' : 'Tap words below...'}
                      </AppText>
                    )}
                    {wordOrderPlaced.map((w, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => {
                          setWordOrderPlaced(prev => prev.filter((_, idx) => idx !== i));
                          setWordOrderPool(prev => [...prev, w]);
                        }}
                        style={{ backgroundColor: C.violet, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
                      >
                        <AppText style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>{w}</AppText>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Word pool — available chips */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {wordOrderPool.map((w, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => {
                          setWordOrderPool(prev => prev.filter((_, idx) => idx !== i));
                          setWordOrderPlaced(prev => [...prev, w]);
                        }}
                        style={{ backgroundColor: C.card, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.border }}
                      >
                        <AppText style={{ color: C.navy, fontWeight: '600', fontSize: 15 }}>{w}</AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* ── Short Write ── */}
              {currentStep.exercise.type === 'short_write' && gStatus === 'answering' && (
                <View style={{ gap: 12 }}>
                  {currentStep.exercise.prompt && (
                    <View style={{ backgroundColor: C.goldBg, borderRadius: 12, padding: 14 }}>
                      <AppText style={{ fontSize: 14, color: C.gold, fontWeight: '700', marginBottom: 4 }}>
                        {isPortuguese ? 'Sua tarefa:' : 'Your task:'}
                      </AppText>
                      <AppText style={{ fontSize: 15, color: C.navy, lineHeight: 22 }}>
                        {currentStep.exercise.prompt}
                      </AppText>
                    </View>
                  )}
                  <TextInput
                    value={userAnswer}
                    onChangeText={setUserAnswer}
                    placeholder={isPortuguese ? 'Escreva sua resposta em inglês...' : 'Write your answer in English...'}
                    placeholderTextColor={C.navyLight}
                    style={{
                      borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
                      paddingHorizontal: 16, paddingVertical: 14,
                      fontSize: 15, color: C.navy, minHeight: 110,
                      textAlignVertical: 'top', backgroundColor: C.card,
                    }}
                    multiline
                    autoCorrect={false}
                    autoCapitalize="sentences"
                    onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
                  />
                </View>
              )}

              {/* Text input (fix_error / read_answer) — fill_gap usa lacuna inline na frase acima */}
              {(currentStep.exercise.type === 'fix_error' || currentStep.exercise.type === 'read_answer') && gStatus === 'answering' && (
                <>
                  <View style={{ flex: 1 }} />
                  <TextInput
                    value={userAnswer}
                    onChangeText={setUserAnswer}
                    placeholder={
                      currentStep.exercise.type === 'fix_error' ? (isPortuguese ? 'Reescreva a frase completa…'  : 'Rewrite the full sentence…')
                      :                                            (isPortuguese ? 'Sua resposta…'               : 'Your answer…')
                    }
                    placeholderTextColor={C.navyLight}
                    style={{
                      borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
                      paddingHorizontal: 16, paddingVertical: 14,
                      fontSize: 16, color: C.navy, backgroundColor: '#FAFAF9',
                      minHeight: 110,
                      textAlignVertical: 'top',
                    }}
                    multiline
                    returnKeyType="default"
                    onSubmitEditing={handleGrammarSubmit}
                    autoCorrect={false}
                    autoCapitalize="none"
                    onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
                  />
                </>
              )}

            </View>
          )}

          {/* ── PRONUNCIATION — sem card, mesmo padrao do grammar (direto na lavanda) ── */}
          {currentStep.kind === 'pronunciation' && (
            <View>
              {/* Bubble centralizada (sem avatar embedded) */}
              <View style={{ backgroundColor: accentBg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 16, alignSelf: 'center' }}>
                <AppText style={{ fontSize: 12, color: accent, fontWeight: '700', textAlign: 'center' }}>
                  {currentStep.phrase.type === 'repeat'
                    ? (isPortuguese ? 'Ouça a Charlotte e repita a frase.'        : 'Listen to Charlotte and repeat the phrase.')
                    : currentStep.phrase.type === 'minimal_pairs'
                    ? (isPortuguese ? 'Ouça a Charlotte e toque na palavra que ela disse.' : 'Listen to Charlotte and tap the word you heard.')
                    : currentStep.phrase.type === 'sentence_stress'
                    ? (isPortuguese ? 'Toque na palavra que tem a sílaba mais forte na frase.' : 'Tap the word that carries the strongest stress in this sentence.')
                    : (isPortuguese ? 'Ouça a Charlotte e escreva o que ouviu.'   : 'Listen to Charlotte and write what you hear.')}
                </AppText>
              </View>

              {/* Focus label removido da UI — metadata pedagogica fica no
                  markdown da unidade (referencia pro autor), nao distrai
                  o aluno no momento da execucao. */}

              {/* Phrase + play icon inline (estilo Duolingo).
                  O proprio icone pulsa (escala) quando audio toca — sem
                  ring externo, animacao no proprio glifo. */}
              {(currentStep.phrase.type === 'repeat' || pronStatus === 'result') && currentStep.phrase.text && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
                  {currentStep.phrase.type !== 'sentence_stress' && pronStatus !== 'loading_audio' && (
                    <TouchableOpacity onPress={handlePlayCharlotte} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <SpeakerIcon size={32} color={accent} weight="fill" />
                    </TouchableOpacity>
                  )}
                  <AppText style={{ fontSize: 22, fontWeight: '500', color: C.navy, lineHeight: 34, textAlign: 'center' }}>
                    {currentStep.phrase.text}
                  </AppText>
                </View>
              )}

              {/* Botao redondo de mic — centralizado, com aneis animados durante gravacao.
                  Aparece pra repeat (pre-result), antes era inline pill no bottom strip. */}
              {currentStep.phrase.type === 'repeat'
                && pronStatus !== 'result' && pronStatus !== 'error'
                && pronStatus !== 'loading_audio' && pronStatus !== 'assessing' && (() => {
                  const bg = isPlaying ? '#9CA3AF'
                    : pronStatus === 'recording' ? '#DC2626' : '#7C3AED';
                  const isRec = pronStatus === 'recording';
                  return (
                    <View style={{ alignItems: 'center', marginTop: 'auto', marginBottom: 56 }}>
                      <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
                        {/* Aneis pulsantes (so quando recording) */}
                        {isRec && [0, 0.3, 0.6].map((delay, idx) => (
                          <Animated.View
                            key={idx}
                            pointerEvents="none"
                            style={{
                              position: 'absolute', width: 120, height: 120, borderRadius: 60,
                              borderWidth: 2, borderColor: '#DC2626',
                              opacity: micRingAnim.interpolate({
                                inputRange: [0, delay, delay + 0.4, 1],
                                outputRange: [0, 0.55, 0, 0],
                                extrapolate: 'clamp',
                              }),
                              transform: [{
                                scale: micRingAnim.interpolate({
                                  inputRange: [0, delay, delay + 0.4, 1],
                                  outputRange: [1, 1, 1.6, 1.6],
                                  extrapolate: 'clamp',
                                }),
                              }],
                            }}
                          />
                        ))}
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPressIn={isPlaying ? undefined : startRecording}
                          onPressOut={isPlaying ? undefined : stopRecording}
                          disabled={isPlaying}
                          style={{
                            width: 120, height: 120, borderRadius: 60,
                            backgroundColor: bg,
                            alignItems: 'center', justifyContent: 'center',
                            opacity: isPlaying ? 0.5 : 1,
                            shadowColor: bg,
                            shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 },
                            elevation: 8,
                            transform: [{ scale: isRec ? 1.06 : 1 }],
                          }}
                        >
                          <Microphone size={56} color="#FFF" weight="fill" />
                        </TouchableOpacity>
                      </View>
                      <AppText style={{
                        marginTop: 14, fontSize: 12, color: C.navyLight,
                        fontWeight: '600', letterSpacing: 0.4,
                      }}>
                        {isRec
                          ? (isPortuguese ? 'Solte para parar' : 'Release to stop')
                          : (isPortuguese ? 'Segure para falar' : 'Hold to speak')}
                      </AppText>
                    </View>
                  );
                })()}
              {/* listen_write / minimal_pairs pre-result: play icon centralizado, sem texto */}
              {(currentStep.phrase.type === 'listen_write' || currentStep.phrase.type === 'minimal_pairs') && pronStatus !== 'result' && pronStatus !== 'loading_audio' && (
                <View style={{ alignItems: 'center', marginBottom: 24 }}>
                  <TouchableOpacity onPress={handlePlayCharlotte} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <SpeakerIcon size={56} color={accent} weight="fill" />
                  </TouchableOpacity>
                </View>
              )}

              {/* sentence_stress: show tappable words */}
              {currentStep.phrase.type === 'sentence_stress' && currentStep.phrase.text && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                  {currentStep.phrase.text.split(' ').map((word, i) => {
                    const tapped = stressTapped === word;
                    const isCorrectWord = stressCorrect !== null && word === currentStep.phrase.stressed_word;
                    const isWrongTap    = stressCorrect === false && tapped;
                    return (
                      <TouchableOpacity
                        key={i}
                        disabled={stressTapped !== null}
                        onPress={() => {
                          const correct = word === currentStep.phrase.stressed_word;
                          setStressTapped(word);
                          setStressCorrect(correct);
                          const xp = correct ? 8 : 0;
                          saveExercise({ level, moduleIndex, topicIndex, exerciseType: 'sentence_stress', isCorrect: correct, xpEarned: xp });
                          if (correct) {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            soundEngine.play('answer_correct').catch(() => {});
                          } else {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                            soundEngine.play('answer_wrong').catch(() => {});
                            setSessionErrors(prev => prev + 1);
                          }
                          const stressedWord = currentStep.phrase.stressed_word ?? '';
                          const message = correct
                            ? (isPortuguese ? 'Exato! Essa é a palavra tônica.' : "Exactly! That's the stressed word.")
                            : (isPortuguese ? `Quase! A palavra tônica é "${stressedWord}".` : `Almost! The stressed word is "${stressedWord}".`);
                          showPronResult({ state: correct ? 'correct' : 'error', message, xp });
                        }}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
                          borderWidth: 2,
                          borderColor: isCorrectWord ? C.green : isWrongTap ? C.red : tapped ? accent : C.border,
                          backgroundColor: isCorrectWord ? C.greenBg : isWrongTap ? C.redBg : tapped ? accentBg : C.card,
                        }}
                      >
                        <AppText style={{
                          fontSize: 17, fontWeight: '700',
                          color: isCorrectWord ? C.green : isWrongTap ? C.red : C.navy,
                        }}>
                          {word}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Loading state (audio nao chegou ainda) */}
              {currentStep.phrase.type !== 'sentence_stress' && pronStatus === 'loading_audio' && (
                <View style={{ alignItems: 'center', paddingVertical: 16, marginBottom: 12 }}>
                  <ActivityIndicator color={accent} />
                </View>
              )}

              {/* minimal_pairs: word choice buttons */}
              {currentStep.phrase.type === 'minimal_pairs' && pronStatus === 'listening' && currentStep.phrase.word1 && currentStep.phrase.word2 && (
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                  {(['word1', 'word2'] as const).map(key => {
                    const word = currentStep.phrase[key] as string;
                    return (
                      <TouchableOpacity
                        key={key}
                        onPress={() => {
                          const correct = key === currentStep.phrase.target;
                          setMpChosen(key);
                          setMpCorrect(correct);
                          const xp = correct ? 8 : 0;
                          saveExercise({ level, moduleIndex, topicIndex, exerciseType: 'minimal_pairs', isCorrect: correct, xpEarned: xp });
                          if (correct) {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            soundEngine.play('answer_correct').catch(() => {});
                          } else {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                            soundEngine.play('answer_wrong').catch(() => {});
                            setSessionErrors(prev => prev + 1);
                          }
                          const correctWord = currentStep.phrase.target === 'word2' ? currentStep.phrase.word2 : currentStep.phrase.word1;
                          const message = correct
                            ? (isPortuguese ? 'Correto! Você ouviu a diferença.' : 'Correct! You heard the difference.')
                            : (isPortuguese ? `Quase lá — Charlotte disse "${correctWord}".` : `Not quite — Charlotte said "${correctWord}".`);
                          showPronResult({ state: correct ? 'correct' : 'error', message, xp });
                        }}
                        style={{
                          flex: 1, paddingVertical: 18, borderRadius: 14,
                          borderWidth: 2, borderColor: C.border,
                          backgroundColor: C.card, alignItems: 'center',
                        }}
                      >
                        <AppText style={{ fontSize: 20, fontWeight: '800', color: C.navy }}>{word}</AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Listen & Write: text input */}
              {currentStep.phrase.type === 'listen_write' && (pronStatus === 'listening' || pronStatus === 'result') && (
                <>
                  <TextInput
                    value={listenWriteAnswer}
                    onChangeText={setListenWriteAnswer}
                    placeholder={isPortuguese ? 'Digite o que você ouviu…' : 'Type what you heard…'}
                    placeholderTextColor={C.navyLight}
                    editable={pronStatus === 'listening'}
                    style={{
                      borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
                      paddingHorizontal: 16, paddingVertical: 14,
                      fontSize: 16, color: C.navy, backgroundColor: '#FAFAF9',
                      minHeight: 80, textAlignVertical: 'top', marginBottom: 16,
                    }}
                    autoCorrect={false} autoCapitalize="none" multiline
                    onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
                  />
                  {pronStatus === 'listening' && (
                    <TouchableOpacity
                      onPress={checkListenWrite}
                      disabled={!listenWriteAnswer.trim()}
                      style={{
                        backgroundColor: listenWriteAnswer.trim() ? accent : C.ghost,
                        borderRadius: 16, paddingVertical: 15, alignItems: 'center',
                      }}
                    >
                      <AppText style={{ fontSize: 15, fontWeight: '800', color: listenWriteAnswer.trim() ? '#FFF' : C.navyLight }}>
                        {isPortuguese ? 'Verificar' : 'Check'}
                      </AppText>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {/* Error fallback — shown when assessment failed */}
              {pronStatus === 'error' && (
                <AppText style={{ color: C.red, fontSize: 13, textAlign: 'center', marginBottom: 12, marginTop: 8 }}>
                  {isPortuguese ? 'Não foi possível avaliar. Toque em Próximo para continuar.' : 'Could not assess. Tap Next to continue.'}
                </AppText>
              )}

            </View>
          )}
        </ScrollView>

        {/* ── Bottom CTA — lavanda sem border-top, integral com o body
            tanto pra grammar quanto pra pronunciation ── */}
        <View style={{
          paddingHorizontal: 20, paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          backgroundColor: '#FAF9FF',
        }}>
          {/* ── Grammar ── */}
          {currentStep.kind === 'grammar' && gStatus === 'answering' && (() => {
            const ex = currentStep.exercise;
            const canSubmit =
              ex.type === 'word_order'  ? wordOrderPlaced.length > 0 :
              ex.type === 'short_write' ? userAnswer.trim().length > 5 :
              !!userAnswer.trim();
            return (
              <View style={{ gap: 10 }}>
                {ex.hint && showHint && (
                  <View style={{ backgroundColor: accentBg, borderRadius: 12, padding: 12 }}>
                    <AppText style={{ fontSize: 14, color: accent, lineHeight: 19 }}>{ex.hint}</AppText>
                  </View>
                )}
                {helpExplanation && (
                  <View style={{ backgroundColor: '#EEF2FF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#C7D2FE' }}>
                    <AppText style={{ fontSize: 14, color: '#3730A3', lineHeight: 20 }}>{helpExplanation}</AppText>
                  </View>
                )}
                <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                  {ex.hint && (
                    <TouchableOpacity
                      onPress={() => setShowHint(v => !v)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}
                    >
                      <LightbulbFilament size={16} color={accent} weight="fill" />
                      <AppText style={{ fontSize: 13, color: accent, fontWeight: '700' }}>
                        {showHint ? (isPortuguese ? 'Ocultar dica' : 'Hide hint') : (isPortuguese ? 'Dica' : 'Hint')}
                      </AppText>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={async () => {
                      if (helpLoading) return;
                      // Se ja tem explicacao, botao vira "Fechar" (limpa estado)
                      if (helpExplanation) {
                        setHelpExplanation(null);
                        return;
                      }
                      setHelpLoading(true);
                      try {
                        const correctAnswer = String(ex.answer ?? '');
                        const questionText = ex.passage ?? ex.sentence ?? ex.prompt ?? ex.question ?? '';
                        const res = await fetch(`${API_BASE_URL}/api/exercise-help`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            question:       questionText,
                            correct_answer: correctAnswer,
                            user_attempt:   userAnswer.trim() || undefined,
                            exercise_type:  ex.type,
                            options:        ex.options ?? ex.choices,
                            level,
                            ...(userId ? { user_id: userId } : {}),
                          }),
                        });
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        const data = await res.json();
                        setHelpExplanation(data.explanation || (isPortuguese ? 'Não consegui gerar uma dica agora — tenta de novo.' : 'Could not generate help now — try again.'));
                      } catch (e) {
                        setHelpExplanation(isPortuguese ? 'Erro ao buscar ajuda. Tenta de novo.' : 'Error fetching help. Try again.');
                      } finally {
                        setHelpLoading(false);
                      }
                    }}
                    disabled={helpLoading}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, opacity: helpLoading ? 0.5 : 1 }}
                  >
                    <BookOpen size={16} color="#4F46E5" weight="fill" />
                    <AppText style={{ fontSize: 13, color: '#4F46E5', fontWeight: '700' }}>
                      {helpLoading
                        ? (isPortuguese ? 'Carregando...' : 'Loading...')
                        : helpExplanation
                          ? (isPortuguese ? 'Fechar explicação' : 'Close explanation')
                          : (isPortuguese ? 'Me ajuda' : 'Help me')}
                    </AppText>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={handleGrammarSubmit} disabled={!canSubmit}
                  style={{ backgroundColor: canSubmit ? C.navy : C.ghost, borderRadius: 16, paddingVertical: 15, alignItems: 'center' }}>
                  <AppText style={{ fontSize: 15, fontWeight: '800', color: canSubmit ? '#FFF' : C.navyLight }}>{isPortuguese ? 'Verificar' : 'Check'}</AppText>
                </TouchableOpacity>
              </View>
            );
          })()}

          {/* ── Pronunciation: Repeat — bottom strip apenas pra estados auxiliares.
                Botao redondo de mic renderiza no main area acima (centralizado). */}
          {currentStep.kind === 'pronunciation' && currentStep.phrase.type === 'repeat' && (
            pronStatus === 'error' ? (
              <TouchableOpacity onPress={handleNext}
                style={{ backgroundColor: C.navy, borderRadius: 16, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <AppText style={{ fontSize: 15, fontWeight: '800', color: '#FFF' }}>{stepIdx + 1 >= totalSteps ? (isPortuguese ? 'Concluir' : 'Finish') : (isPortuguese ? 'Próximo' : 'Next')}</AppText>
                {stepIdx + 1 < totalSteps && <ArrowRight size={18} color="#FFF" weight="bold" />}
              </TouchableOpacity>
            ) : pronStatus === 'loading_audio' ? (
              <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                <ActivityIndicator color={accent} />
              </View>
            ) : pronStatus === 'assessing' ? (
              <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                <ActivityIndicator color={accent} />
                <AppText style={{ color: C.navyLight, fontSize: 13, marginTop: 6 }}>{isPortuguese ? 'Analisando…' : 'Assessing…'}</AppText>
              </View>
            ) : null
          )}

          {/* ── Pronunciation: Listen & Write ── */}
          {currentStep.kind === 'pronunciation' && currentStep.phrase.type === 'listen_write' && pronStatus === 'error' && (
            <TouchableOpacity onPress={handleNext}
              style={{ backgroundColor: C.navy, borderRadius: 16, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <AppText style={{ fontSize: 15, fontWeight: '800', color: '#FFF' }}>{stepIdx + 1 >= totalSteps ? (isPortuguese ? 'Concluir' : 'Finish') : (isPortuguese ? 'Próximo' : 'Next')}</AppText>
              {stepIdx + 1 < totalSteps && <ArrowRight size={18} color="#FFF" weight="bold" />}
            </TouchableOpacity>
          )}

          {/* ── Pronunciation: Minimal Pairs / Sentence Stress — error fallback only ── */}
          {currentStep.kind === 'pronunciation' && (currentStep.phrase.type === 'minimal_pairs' || currentStep.phrase.type === 'sentence_stress') && pronStatus === 'error' && (
            <TouchableOpacity onPress={handleNext}
              style={{ backgroundColor: C.navy, borderRadius: 16, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <AppText style={{ fontSize: 15, fontWeight: '800', color: '#FFF' }}>{stepIdx + 1 >= totalSteps ? (isPortuguese ? 'Concluir' : 'Finish') : (isPortuguese ? 'Próximo' : 'Next')}</AppText>
              {stepIdx + 1 < totalSteps && <ArrowRight size={18} color="#FFF" weight="bold" />}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* ── Grammar feedback panel — slides up from bottom (placement-test style) ── */}
      {currentStep.kind === 'grammar' && gStatus === 'submitted' && isCorrect !== null && (
        <Animated.View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: isCorrect ? '#EDFFD0' : '#FFF0F0',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingHorizontal: 24, paddingTop: 20,
          paddingBottom: insets.bottom + 20,
          transform: [{ translateY: feedbackAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] }) }],
        }}>
          {/* Header row: icon + title + XP badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            {isCorrect
              ? <CheckCircle size={24} color={C.green}  weight="fill" />
              : <XCircle     size={24} color={C.red}    weight="fill" />}
            <AppText style={{ fontSize: 17, fontWeight: '800', color: isCorrect ? C.green : C.red, flex: 1 }}>
              {isCorrect
                ? (isPortuguese ? 'Correto!' : 'Correct!')
                : (isPortuguese ? 'Quase lá…' : 'Almost there…')}
            </AppText>
            <View style={{ backgroundColor: isCorrect ? 'rgba(61,136,0,0.12)' : 'rgba(220,38,38,0.10)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
              <AppText style={{ fontSize: 12, fontWeight: '800', color: isCorrect ? C.green : C.red }}>
                +{!isCorrect ? 0 : currentStep.exercise.type === 'short_write' ? 8 : 10} XP
              </AppText>
            </View>
          </View>

          {/* Correct answer (wrong only) */}
          {!isCorrect && (
            <View style={{ padding: 12, backgroundColor: 'rgba(220,38,38,0.07)', borderRadius: 12, marginBottom: 10 }}>
              <AppText style={{ fontSize: 11, fontWeight: '700', color: C.red, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 }}>
                {isPortuguese ? 'Resposta correta' : 'Correct answer'}
              </AppText>
              {isPortuguese
                ? <TranslatableText text={currentStep.exercise.answer ?? ''} style={{ fontSize: 15, color: C.navy, fontWeight: '600' }} />
                : <AppText style={{ fontSize: 15, color: C.navy, fontWeight: '600' }}>{currentStep.exercise.answer}</AppText>}
            </View>
          )}

          {/* Model answer for short_write */}
          {currentStep.exercise.type === 'short_write' && currentStep.exercise.example_answer && (
            <View style={{ padding: 12, backgroundColor: 'rgba(61,136,0,0.07)', borderRadius: 12, marginBottom: 10 }}>
              <AppText style={{ fontSize: 11, fontWeight: '700', color: C.green, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 }}>
                {isPortuguese ? 'Exemplo de resposta' : 'Model answer'}
              </AppText>
              <AppText style={{ fontSize: 14, color: C.navy, fontStyle: 'italic', lineHeight: 20 }}>
                "{currentStep.exercise.example_answer}"
              </AppText>
            </View>
          )}

          {/* Why / Por quê */}
          <View style={{ padding: 12, backgroundColor: 'rgba(22,21,58,0.06)', borderRadius: 12, marginBottom: !isCorrect ? 10 : 16 }}>
            <AppText style={{ fontSize: 11, fontWeight: '700', color: isCorrect ? C.green : C.red, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 }}>
              {isPortuguese ? 'Por quê' : 'Why'}
            </AppText>
            <AppText style={{ fontSize: 13, color: isCorrect ? '#1a3a00' : '#7B2020', lineHeight: 19 }}>
              {currentStep.exercise.explanation}
            </AppText>
          </View>

          {/* Explain my error button — wrong answers only */}
          {!isCorrect && (
            <TouchableOpacity
              onPress={fetchExplainError}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                borderWidth: 1.5, borderColor: 'rgba(220,38,38,0.35)',
                borderRadius: 12, paddingVertical: 11, marginBottom: 16,
              }}
            >
              <AppText style={{ fontSize: 13, fontWeight: '700', color: C.red }}>
                {isPortuguese ? 'Por que errei?' : 'Explain my error'}
              </AppText>
            </TouchableOpacity>
          )}

          {/* Next button */}
          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.85}
            style={{
              backgroundColor: isCorrect ? C.green : C.red,
              borderRadius: 16, paddingVertical: 15,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <AppText style={{ fontSize: 15, fontWeight: '800', color: '#FFF' }}>
              {stepIdx + 1 >= totalSteps ? (isPortuguese ? 'Concluir' : 'Finish') : (isPortuguese ? 'Próximo' : 'Next')}
            </AppText>
            {stepIdx + 1 < totalSteps && <ArrowRight size={18} color="#FFF" weight="bold" />}
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── Pronunciation feedback panel — slides up from bottom ── */}
      {currentStep.kind === 'pronunciation' && pronStatus === 'result' && pronFeedback !== null && (() => {
        const fb = pronFeedback;
        const isCorrectState = fb.state === 'correct';
        const isCloseState   = fb.state === 'close';
        const panelBg    = isCorrectState ? '#EDFFD0' : isCloseState ? '#FFFBE6' : '#FFF0F0';
        const panelBorder = isCorrectState ? 'rgba(163,255,60,0.4)' : isCloseState ? 'rgba(245,158,11,0.4)' : 'rgba(220,38,38,0.25)';
        const textColor   = isCorrectState ? C.green : isCloseState ? '#92400E' : C.red;
        const btnColor    = isCorrectState ? C.green : isCloseState ? '#D97706' : C.red;
        const xpBg        = isCorrectState ? 'rgba(61,136,0,0.12)' : isCloseState ? 'rgba(217,119,6,0.12)' : 'rgba(220,38,38,0.10)';
        const title       = isCorrectState
          ? (isPortuguese ? 'Correto!' : 'Correct!')
          : isCloseState
          ? (isPortuguese ? 'Quase lá!' : 'Almost!')
          : (isPortuguese ? 'Tente de novo' : 'Try again');
        const canRetry = currentStep.phrase.type === 'repeat' && !isCorrectState;
        return (
          <Animated.View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            backgroundColor: panelBg,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            paddingHorizontal: 24, paddingTop: 20,
            paddingBottom: insets.bottom + 20,
            transform: [{ translateY: pronFeedbackAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] }) }],
          }}>
            {/* Header: icon + title + XP badge */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              {isCorrectState
                ? <CheckCircle size={24} color={C.green} weight="fill" />
                : isCloseState
                ? <Play size={24} color="#D97706" weight="fill" />
                : <XCircle size={24} color={C.red} weight="fill" />}
              <AppText style={{ fontSize: 17, fontWeight: '800', color: textColor, flex: 1 }}>{title}</AppText>
              <View style={{ backgroundColor: xpBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                <AppText style={{ fontSize: 12, fontWeight: '800', color: textColor }}>+{fb.xp} XP</AppText>
              </View>
            </View>

            {/* Feedback message */}
            <View style={{ padding: 12, backgroundColor: 'rgba(22,21,58,0.06)', borderRadius: 12, marginBottom: 14 }}>
              <AppText style={{ fontSize: 13, color: isCorrectState ? '#1a3a00' : isCloseState ? '#78350F' : '#7B2020', lineHeight: 19 }}>
                {fb.message}
              </AppText>
            </View>

            {/* listen_write: show correct answer when wrong */}
            {currentStep.phrase.type === 'listen_write' && !isCorrectState && (
              <View style={{ padding: 12, backgroundColor: 'rgba(220,38,38,0.07)', borderRadius: 12, marginBottom: 14 }}>
                <AppText style={{ fontSize: 11, fontWeight: '700', color: C.red, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 }}>
                  {isPortuguese ? 'Resposta correta' : 'Correct answer'}
                </AppText>
                <AppText style={{ fontSize: 15, color: C.navy, fontWeight: '600' }}>{currentStep.phrase.text}</AppText>
              </View>
            )}

            {/* Primary button */}
            <TouchableOpacity
              onPress={canRetry && !isCorrectState ? handleRetryPron : handleNext}
              activeOpacity={0.85}
              style={{ backgroundColor: btnColor, borderRadius: 16, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <AppText style={{ fontSize: 15, fontWeight: '800', color: '#FFF' }}>
                {canRetry && !isCorrectState
                  ? (isPortuguese ? 'Tentar de novo' : 'Try again')
                  : stepIdx + 1 >= totalSteps ? (isPortuguese ? 'Concluir' : 'Finish') : (isPortuguese ? 'Próximo' : 'Next')}
              </AppText>
              {(!canRetry || isCorrectState) && stepIdx + 1 < totalSteps && <ArrowRight size={18} color="#FFF" weight="bold" />}
            </TouchableOpacity>

            {/* Skip link for close/error on audio types */}
            {canRetry && (
              <TouchableOpacity onPress={handleNext} style={{ alignItems: 'center', marginTop: 12 }}>
                <AppText style={{ fontSize: 13, color: textColor, fontWeight: '600', opacity: 0.7 }}>
                  {stepIdx + 1 >= totalSteps ? (isPortuguese ? 'Concluir mesmo assim' : 'Finish anyway') : (isPortuguese ? 'Pular' : 'Skip')}
                </AppText>
              </TouchableOpacity>
            )}
          </Animated.View>
        );
      })()}

      {/* ── Explain Error Modal ──────────────────────────────────────────────── */}
      <Modal
        visible={showExplain}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExplain(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <View style={{
            backgroundColor: '#FFF',
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            paddingHorizontal: 24, paddingTop: 20,
            paddingBottom: insets.bottom + 24,
          }}>
            {/* Handle */}
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(22,21,58,0.15)', alignSelf: 'center', marginBottom: 20 }} />

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <AppText style={{ fontSize: 16, fontWeight: '800', color: C.navy, flex: 1 }}>
                {isPortuguese ? 'Por que errei?' : 'Explain my error'}
              </AppText>
              <TouchableOpacity onPress={() => setShowExplain(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <XCircle size={22} color="rgba(22,21,58,0.3)" weight="fill" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            {explainLoading ? (
              <View style={{ gap: 10, marginBottom: 24 }}>
                {[1, 0.7, 0.5].map((opacity, i) => (
                  <View key={i} style={{ height: 14, borderRadius: 7, backgroundColor: `rgba(22,21,58,${opacity * 0.1})`, width: `${85 - i * 15}%` }} />
                ))}
                <ActivityIndicator size="small" color={C.red} style={{ marginTop: 8 }} />
              </View>
            ) : (
              <View style={{ marginBottom: 20 }}>
                <AppText style={{ fontSize: 14, color: C.navy, lineHeight: 22 }}>
                  {explainContent ?? ''}
                </AppText>
              </View>
            )}

            {/* Thumbs feedback */}
            {!explainLoading && explainContent && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <AppText style={{ fontSize: 12, color: 'rgba(22,21,58,0.45)', flex: 1 }}>
                  {isPortuguese ? 'Esta explicação foi útil?' : 'Was this helpful?'}
                </AppText>
                <TouchableOpacity
                  onPress={() => saveExplainRating(1)}
                  style={{
                    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: explainRating === 1 ? 'rgba(61,136,0,0.15)' : 'rgba(22,21,58,0.06)',
                  }}
                >
                  <ThumbsUp size={18} color={explainRating === 1 ? C.green : 'rgba(22,21,58,0.35)'} weight={explainRating === 1 ? 'fill' : 'regular'} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => saveExplainRating(-1)}
                  style={{
                    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: explainRating === -1 ? 'rgba(220,38,38,0.12)' : 'rgba(22,21,58,0.06)',
                  }}
                >
                  <ThumbsDown size={18} color={explainRating === -1 ? C.red : 'rgba(22,21,58,0.35)'} weight={explainRating === -1 ? 'fill' : 'regular'} />
                </TouchableOpacity>
              </View>
            )}

            {/* Continue button */}
            <TouchableOpacity
              onPress={() => { setShowExplain(false); handleNext(); }}
              activeOpacity={0.85}
              style={{
                backgroundColor: C.navy, borderRadius: 14, paddingVertical: 15,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <AppText style={{ fontSize: 15, fontWeight: '800', color: '#FFF' }}>
                {stepIdx + 1 >= totalSteps
                  ? (isPortuguese ? 'Concluir' : 'Finish')
                  : (isPortuguese ? 'Continuar' : 'Continue')}
              </AppText>
              {stepIdx + 1 < totalSteps && <ArrowRight size={18} color="#FFF" weight="bold" />}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
