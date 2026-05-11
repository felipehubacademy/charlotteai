// app/(app)/placement-test.tsx
//
// Placement test — assigns Charlotte level: Novice / Inter / Advanced
// Adaptive 3-block logic:
//   Block 1 (5 q, vocab)       — if <4 correct → Novice (stop)
//   Block 2 (5 q, basic gram.) — if <4 correct → Novice
//   Block 3 (5 q, advanced)    — if >=3 correct → Advanced, else Inter

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, TouchableOpacity, ScrollView,
  ActivityIndicator, Animated, Platform, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import {
  Headphones, Play, Pause, ArrowRight, CheckCircle, XCircle,
} from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import CharlotteAvatar from '@/components/ui/CharlotteAvatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useMessageAudioPlayer } from '@/hooks/useMessageAudioPlayer';
import { soundEngine } from '@/lib/soundEngine';
import * as Haptics from 'expo-haptics';

const SCREEN_W     = Dimensions.get('window').width;
const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:        '#F4F3FA',
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  border:    'rgba(22,21,58,0.10)',
  green:     '#A3FF3C',
  greenDark: '#3D8800',
  shadow: Platform.select({
    ios: {
      shadowColor: 'rgba(22,21,58,0.12)',
      shadowOpacity: 1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 4 },
  }),
};

const LEVEL_TAG: Record<string, string> = {
  Novice:   'NOVICE',
  Inter:    'INTERMEDIATE',
  Advanced: 'ADVANCED',
};

// ── Question types ────────────────────────────────────────────────────────────
type GrammarQ = {
  kind: 'grammar';
  id: number;
  block: number;
  difficulty?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type ListeningQ = {
  kind: 'listening';
  id: number;
  block: number;
  forLevel: 'Inter' | 'Advanced';
  audioText: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type AnyQuestion = GrammarQ | ListeningQ;

// ── Block 1 — Very Basic (vocab/translation) ──────────────────────────────────
const BLOCK1: GrammarQ[] = [
  {
    kind: 'grammar', id: 101, block: 1,
    question: 'Como se diz "casa" em inglês?',
    options: ['house', 'horse', 'mouse', 'noise'],
    correctIndex: 0,
    explanation: '"House" significa casa. "Horse" é cavalo.',
  },
  {
    kind: 'grammar', id: 102, block: 1,
    question: 'Qual palavra significa "obrigado" em inglês?',
    options: ['Sorry', 'Please', 'Thank you', 'Excuse me'],
    correctIndex: 2,
    explanation: '"Thank you" é a forma de agradecer em inglês.',
  },
  {
    kind: 'grammar', id: 103, block: 1,
    question: 'Qual é a cor do céu em inglês?',
    options: ['red', 'green', 'blue', 'yellow'],
    correctIndex: 2,
    explanation: '"Blue" significa azul — a cor do céu.',
  },
  {
    kind: 'grammar', id: 104, block: 1,
    question: 'Que número vem depois de "two" (dois)?',
    options: ['one', 'four', 'three', 'five'],
    correctIndex: 2,
    explanation: '"Three" é o número 3 — vem depois de "two" (2).',
  },
  {
    kind: 'grammar', id: 105, block: 1,
    question: 'Como se diz "bom dia" em inglês?',
    options: ['Good night', 'Good morning', 'Good afternoon', 'Goodbye'],
    correctIndex: 1,
    explanation: '"Good morning" é bom dia. "Good night" é boa noite.',
  },
];

// ── Block 2 — Novice/Intermediate (basic grammar) ─────────────────────────────
const BLOCK2: GrammarQ[] = [
  {
    kind: 'grammar', id: 201, block: 2,
    question: 'She ___ to school every day.',
    options: ['go', 'goes', 'going', 'gone'],
    correctIndex: 1,
    explanation: 'Com "she/he/it", usamos "goes" (simple present com -es).',
  },
  {
    kind: 'grammar', id: 202, block: 2,
    question: 'I ___ a student.',
    options: ['am', 'is', 'are', 'be'],
    correctIndex: 0,
    explanation: 'Com "I", o verbo "to be" é "am": I am a student.',
  },
  {
    kind: 'grammar', id: 203, block: 2,
    question: 'Yesterday, I ___ dinner at home.',
    options: ['eat', 'eats', 'eating', 'ate'],
    correctIndex: 3,
    explanation: '"Ate" é o passado de "eat". Yesterday indica passado simples.',
  },
  {
    kind: 'grammar', id: 204, block: 2,
    question: 'There ___ many people in the park.',
    options: ['is', 'are', 'was', 'am'],
    correctIndex: 1,
    explanation: '"People" é plural, então usamos "are": There are many people.',
  },
  {
    kind: 'grammar', id: 205, block: 2,
    question: 'How ___ books do you have?',
    options: ['much', 'more', 'many', 'most'],
    correctIndex: 2,
    explanation: '"Many" é usado com substantivos contáveis no plural, como "books".',
  },
];

// ── Listening questions (reused in Block 3) ───────────────────────────────────
const LISTENING_INTER: ListeningQ = {
  kind: 'listening', id: 20, block: 3, forLevel: 'Inter',
  audioText:
    "Hi, my name is Sarah. I moved to London about a year ago for work. " +
    "At first, I found it quite difficult to understand different accents, " +
    "but I've gotten much better over time. " +
    "My colleagues have been really helpful — they speak more slowly whenever I ask them to. " +
    "The hardest part is still understanding people on the phone, " +
    "because you can't see their lips or expressions.",
  prompt: 'According to Sarah, what has helped her most with understanding accents?',
  options: [
    'Taking extra English lessons after work',
    'Watching British TV shows with subtitles',
    'Her colleagues slowing down when she asks',
    'Living in London for more than two years',
  ],
  correctIndex: 2,
  explanation: 'Listen carefully to the audio and choose the best answer that matches what was said.',
};

const LISTENING_ADVANCED: ListeningQ = {
  kind: 'listening', id: 21, block: 3, forLevel: 'Advanced',
  audioText:
    "The recent surge in artificial intelligence adoption has sparked considerable debate among economists. " +
    "While proponents argue that automation will ultimately create more jobs than it displaces — " +
    "much as previous technological revolutions did — " +
    "critics contend that the pace of this transition is unprecedented. " +
    "The concern isn't merely about job losses, " +
    "but about whether workers can adapt quickly enough " +
    "to the demands of an increasingly automated economy.",
  prompt: 'What do critics specifically highlight as different about the current AI transition?',
  options: [
    'The total number of jobs that will be permanently eliminated',
    'The unprecedented speed at which the change is happening',
    'The absence of government regulation in the tech sector',
    'The fact that only low-skilled roles are at risk',
  ],
  correctIndex: 1,
  explanation: 'Listen carefully to the audio and choose the best answer that matches what was said.',
};

// ── Block 3 — Advanced (grammar, listening, grammar, listening, grammar) ───────
const BLOCK3: AnyQuestion[] = [
  {
    kind: 'grammar', id: 6, block: 3, difficulty: 'Advanced',
    question: 'A new bridge ___ across the river by the end of next year.',
    options: [
      'is going to build',
      'will have been built',
      'is going to be building',
      'will have built',
    ],
    correctIndex: 1,
    explanation: '"will have been built" — passive voice in the future perfect.',
  },
  LISTENING_INTER,
  {
    kind: 'grammar', id: 8, block: 3, difficulty: 'Expert',
    question: 'Not until the final results were announced ___ how close the election had been.',
    options: [
      'the public realized',
      'did the public realize',
      'the public did realize',
      'realized the public',
    ],
    correctIndex: 1,
    explanation: '"did the public realize" — inverted word order after negative adverbial "not until".',
  },
  LISTENING_ADVANCED,
  {
    kind: 'grammar', id: 10, block: 3, difficulty: 'Expert',
    question: 'Scarcely ___ the building when the fire alarm went off.',
    options: ['we had entered', 'had we entered', 'we entered', 'did we enter'],
    correctIndex: 1,
    explanation: '"had we entered" — subject-auxiliary inversion required after "scarcely".',
  },
];

// ── Level logic ───────────────────────────────────────────────────────────────
type Level = 'Novice' | 'Inter' | 'Advanced';

function computeLevel(
  block1Correct: number,
  block2Correct: number,
  block3Correct: number,
): Level {
  if (block1Correct < 4) return 'Novice';
  if (block2Correct < 4) return 'Novice';
  if (block3Correct >= 3) return 'Advanced';
  return 'Inter';
}

const LEVEL_META: Record<Level, {
  label: string; tagline: string;
  description: string; charlotteMessage: string;
}> = {
  Novice: {
    label: 'Novice',
    tagline: 'Você está começando sua jornada!',
    description:
      'Sem problema — todo expert já foi iniciante. Vou te guiar passo a passo, ' +
      'com suporte em português, conversas simples e as bases que você precisa para evoluir com confiança.',
    charlotteMessage: 'Estou aqui para te apoiar em cada etapa. Vamos juntos!',
  },
  Inter: {
    label: 'Intermediate',
    tagline: 'You have a solid foundation!',
    description:
      "Your English is functional — now let's take it further. I'll challenge you " +
      "with real conversations, complex grammar, and the nuances that separate good from fluent.",
    charlotteMessage: "I can't wait to push your English to the next level. Let's go!",
  },
  Advanced: {
    label: 'Advanced',
    tagline: 'Your English is impressive!',
    description:
      "You're operating at a high level. I'll engage you in sophisticated discussions, " +
      "sharpen your nuances, and help you reach that native-like fluency you're after.",
    charlotteMessage: "Let's have some real conversations — I'm excited to work with you.",
  },
};

// ── Main component ────────────────────────────────────────────────────────────
type Phase = 'intro' | 'test' | 'saving' | 'result';
type BlockNum = 1 | 2 | 3;

export default function PlacementTestScreen() {
  const { session, refreshProfile, profile } = useAuth();
  const { toggle: toggleAudio, playingMessageId, stop: stopAudio } = useMessageAudioPlayer();

  const firstName = (profile?.name ?? '').split(' ')[0] || 'você';

  const insets = useSafeAreaInsets();

  const [phase, setPhase]         = useState<Phase>('intro');
  const [block, setBlock]         = useState<BlockNum>(1);
  const [blockQuestions, setBlockQuestions] = useState<AnyQuestion[]>(BLOCK1);
  const [qIndex, setQIndex]       = useState(0);
  const [selected, setSelected]   = useState<number | null>(null);
  const [locked, setLocked]       = useState(false);
  const [verified, setVerified]   = useState(false);
  const [answers, setAnswers]     = useState<{ block: BlockNum; idx: number; correct: boolean }[]>([]);
  const [level, setLevel]         = useState<Level>('Novice');
  const [saveError, setSaveError] = useState<string | null>(null);

  const [audioUri, setAudioUri]         = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const LISTEN_ID = 'placement-listen';
  const isPlaying  = playingMessageId === LISTEN_ID;

  const slideAnim    = useRef(new Animated.Value(0)).current;
  const feedbackAnim = useRef(new Animated.Value(0)).current;

  const slideIn = useCallback((fromRight = true) => {
    slideAnim.setValue(fromRight ? SCREEN_W : -SCREEN_W);
    Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 55, useNativeDriver: true }).start();
  }, [slideAnim]);

  const handleSkipToNovice = () => {
    setLevel('Novice');
    setPhase('saving');
    saveResult('Novice');
  };

  const handleStart = () => {
    setBlock(1);
    setBlockQuestions(BLOCK1);
    setQIndex(0);
    setAnswers([]);
    setSelected(null);
    setLocked(false);
    setVerified(false);
    setPhase('test');
    slideIn();
  };

  // Static pre-generated audio hosted on Vercel — instant load, no TTS call at runtime
  const STATIC_AUDIO: Record<number, string> = {
    20: `${API_BASE_URL}/audio/placement_inter.mp3`,
    21: `${API_BASE_URL}/audio/placement_advanced.mp3`,
  };

  useEffect(() => {
    if (phase !== 'test') return;
    const q = blockQuestions[qIndex];
    if (!q || q.kind !== 'listening') return;
    stopAudio();
    const uri = STATIC_AUDIO[q.id] ?? null;
    setAudioUri(uri);
    setAudioLoading(false);
  }, [phase, qIndex, blockQuestions]);

  // Select only — no auto-advance (Duolingo style)
  const handleSelect = (idx: number) => {
    if (locked) return;
    setSelected(idx);
  };

  // Verificar — lock selection and show feedback panel
  const handleVerify = () => {
    if (selected === null) return;
    setLocked(true);
    setVerified(true);
    const isCorrect = selected === currentQ.correctIndex;
    if (isCorrect) {
      soundEngine.play('answer_correct');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      soundEngine.play('answer_wrong');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    Animated.spring(feedbackAnim, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }).start();
  };

  // handleNext — record answer then advance through blocks
  const handleNext = () => {
    const currentBlock = block;
    const currentBlockQuestions = blockQuestions;
    const isCorrect = selected !== null && selected === currentQ.correctIndex;
    const newAnswers = [...answers, { block: currentBlock, idx: qIndex, correct: isCorrect }];

    Animated.timing(feedbackAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setVerified(false);
      setLocked(false);

      const isLastInBlock = qIndex + 1 >= currentBlockQuestions.length;

      if (!isLastInBlock) {
        // Advance to next question in same block
        setAnswers(newAnswers);
        Animated.timing(slideAnim, { toValue: -SCREEN_W, duration: 200, useNativeDriver: true }).start(() => {
          setSelected(null);
          setQIndex(qIndex + 1);
          slideIn(true);
        });
        return;
      }

      // Block ended — count correct answers for this block
      const blockCorrect = newAnswers.filter(a => a.block === currentBlock && a.correct).length;

      if (currentBlock === 1) {
        if (blockCorrect < 4) {
          // Early exit — Novice
          finalize(newAnswers, 'Novice');
        } else {
          // Advance to Block 2
          setAnswers(newAnswers);
          Animated.timing(slideAnim, { toValue: -SCREEN_W, duration: 200, useNativeDriver: true }).start(() => {
            setSelected(null);
            setBlock(2);
            setBlockQuestions(BLOCK2);
            setQIndex(0);
            slideIn(true);
          });
        }
        return;
      }

      if (currentBlock === 2) {
        if (blockCorrect < 4) {
          finalize(newAnswers, 'Novice');
        } else {
          // Advance to Block 3
          setAnswers(newAnswers);
          Animated.timing(slideAnim, { toValue: -SCREEN_W, duration: 200, useNativeDriver: true }).start(() => {
            setSelected(null);
            setBlock(3);
            setBlockQuestions(BLOCK3);
            setQIndex(0);
            slideIn(true);
          });
        }
        return;
      }

      // Block 3 ended
      const block3Correct = newAnswers.filter(a => a.block === 3 && a.correct).length;
      const finalLevel: Level = block3Correct >= 3 ? 'Advanced' : 'Inter';
      finalize(newAnswers, finalLevel);
    });
  };

  const finalize = (
    finalAnswers: { block: BlockNum; idx: number; correct: boolean }[],
    finalLevel: Level,
  ) => {
    setLevel(finalLevel);
    setAnswers(finalAnswers);
    setPhase('saving');
    saveResult(finalLevel);
  };

  const saveResult = async (assignedLevel: Level) => {
    setSaveError(null);
    try {
      const userId = session?.user?.id;
      if (!userId) throw new Error('Not authenticated');
      // Start 7-day trial automatically when placement test is completed.
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);
      const { error } = await supabase
        .from('charlotte_users')
        .update({
          charlotte_level:     assignedLevel,
          placement_test_done: true,
          subscription_status: 'trial',
          trial_ends_at:       trialEndsAt.toISOString(),
          is_active:           true,
        })
        .eq('id', userId);
      if (error) throw error;

      // Dispara email de boas-vindas em background (fire-and-forget).
      // Nao bloqueia o fluxo — se falhar, nao afeta o usuario.
      const accessToken = (await supabase.auth.getSession()).data.session?.access_token;
      if (accessToken) {
        fetch(`${API_BASE_URL}/api/auth/welcome`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        }).catch(e => console.warn('[PlacementTest] welcome email error:', e));
      }

      // Do NOT call refreshProfile() here — it would trigger AuthGuard
      // (placement_test_done: true && !first_welcome_done → charlotte-intro)
      // before the ResultScreen has a chance to render.
      // refreshProfile is called in onFinish, after the user reads the result.
      setPhase('result');
    } catch (e: any) {
      console.error('[PlacementTest] save error:', e);
      setSaveError('Erro ao salvar resultado. Seu nível foi definido localmente.');
      setPhase('result');
    }
  };

  if (phase === 'intro')  return <IntroScreen firstName={firstName} onStart={handleStart} onSkip={handleSkipToNovice} />;
  if (phase === 'saving') return <SavingScreen />;
  if (phase === 'result') return (
    <ResultScreen
      level={level}
      firstName={firstName}
      saveError={saveError}
      onFinish={() => {
        // Navigate first, then refresh profile in background.
        // AuthGuard will also see placement_test_done=true → charlotte-intro,
        // but lastRoute dedup prevents a double push.
        router.replace('/(app)/charlotte-intro');
        refreshProfile().catch(() => {});
      }}
    />
  );

  const currentQ = blockQuestions[qIndex];
  if (!currentQ) return null;

  const progress = (qIndex + 1) / blockQuestions.length;
  const currentIsCorrect = selected !== null && selected === currentQ.correctIndex;
  const feedbackTranslateY = feedbackAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] });

  // Charlotte instruction bubble text per block/kind
  let instructionText: string;
  if (block === 1) {
    instructionText = 'Escolha a alternativa correta.';
  } else if (block === 2) {
    instructionText = 'Complete a frase corretamente.';
  } else if (currentQ.kind === 'listening') {
    instructionText = 'Listen to the audio and choose the best answer.';
  } else {
    instructionText = 'Choose the correct option to complete the sentence.';
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top']}>

      {/* Progress header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <AppText style={{ fontSize: 11, fontWeight: '700', color: C.navyLight, letterSpacing: 0.5 }}>
            {`Etapa ${block} de 3`}
          </AppText>
          <AppText style={{ fontSize: 11, fontWeight: '600', color: C.navyLight }}>
            {`${qIndex + 1} / ${blockQuestions.length}`}
          </AppText>
        </View>
        <View style={{ height: 4, backgroundColor: 'rgba(22,21,58,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <View style={{ height: 4, width: `${progress * 100}%` as `${number}%`, backgroundColor: C.green, borderRadius: 2 }} />
        </View>
      </View>

      {/* Scrollable content */}
      <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: verified ? 280 : 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Charlotte instruction */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 0, marginBottom: 28 }}>
            <CharlotteAvatar size="xs" />
            <View style={{
              width: 0, height: 0,
              borderTopWidth: 5, borderTopColor: 'transparent',
              borderBottomWidth: 5, borderBottomColor: 'transparent',
              borderRightWidth: 7, borderRightColor: 'rgba(22,21,58,0.08)',
              marginTop: 10, marginLeft: 2,
            }} />
            <View style={{
              flex: 1, backgroundColor: 'rgba(22,21,58,0.06)',
              borderRadius: 14, borderTopLeftRadius: 4,
              paddingHorizontal: 14, paddingVertical: 12,
            }}>
              <AppText style={{ fontSize: 14, color: C.navy, fontWeight: '700', lineHeight: 20 }}>
                {instructionText}
              </AppText>
            </View>
          </View>

          {/* Listening audio player */}
          {currentQ.kind === 'listening' && (
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: C.navy, borderRadius: 14,
              paddingHorizontal: 16, paddingVertical: 12,
              marginBottom: 20, gap: 12,
            }}>
              <Headphones size={16} color={C.green} weight="duotone" />
              <AppText style={{ flex: 1, fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.65)' }}>
                {isPlaying ? 'Playing...' : 'Tap to listen'}
              </AppText>
              {audioLoading ? (
                <ActivityIndicator size="small" color={C.green} />
              ) : (
                <TouchableOpacity
                  onPress={() => audioUri && toggleAudio(LISTEN_ID, audioUri)}
                  activeOpacity={0.8}
                  disabled={!audioUri}
                  style={{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: C.green,
                    alignItems: 'center', justifyContent: 'center',
                    opacity: audioUri ? 1 : 0.4,
                  }}
                >
                  {isPlaying
                    ? <Pause size={16} color={C.navy} weight="fill" />
                    : <Play  size={16} color={C.navy} weight="fill" />}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Question — large and prominent */}
          <AppText style={{ fontSize: 22, fontWeight: '700', color: C.navy, lineHeight: 34, marginBottom: 32 }}>
            {currentQ.kind === 'grammar' ? currentQ.question : currentQ.prompt}
          </AppText>

          {/* Options */}
          <OptionList
            options={currentQ.options}
            selected={selected}
            locked={locked}
            correctIndex={currentQ.correctIndex}
            onSelect={handleSelect}
          />

        </ScrollView>
      </Animated.View>

      {/* Verificar button — fixed above bottom safe area */}
      {!verified && (
        <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 16, paddingTop: 12, backgroundColor: C.card }}>
          <TouchableOpacity
            onPress={handleVerify}
            disabled={selected === null}
            activeOpacity={0.85}
            style={{
              backgroundColor: selected !== null ? C.navy : 'rgba(22,21,58,0.08)',
              borderRadius: 16, paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            <AppText style={{ fontSize: 15, fontWeight: '800', color: selected !== null ? '#FFFFFF' : C.navyLight }}>
              Verificar
            </AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* Feedback panel — slides up from bottom */}
      {verified && (
        <Animated.View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: currentIsCorrect ? '#EDFFD0' : '#FFF0F0',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          borderTopWidth: 1,
          borderColor: currentIsCorrect ? '#A3FF3C40' : '#DC262640',
          paddingHorizontal: 24, paddingTop: 24,
          paddingBottom: insets.bottom + 20,
          transform: [{ translateY: feedbackTranslateY }],
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            {currentIsCorrect
              ? <CheckCircle size={24} color={C.greenDark} weight="fill" />
              : <XCircle    size={24} color="#DC2626"     weight="fill" />}
            <AppText style={{
              fontSize: 17, fontWeight: '800',
              color: currentIsCorrect ? C.greenDark : '#DC2626',
            }}>
              {currentIsCorrect ? 'Correto!' : 'Não foi dessa vez'}
            </AppText>
          </View>
          {!currentIsCorrect && (
            <AppText style={{ fontSize: 13, color: '#DC2626', marginBottom: 8 }}>
              {`Resposta certa: "${currentQ.options[currentQ.correctIndex]}"`}
            </AppText>
          )}
          <AppText style={{
            fontSize: 13,
            color: currentIsCorrect ? C.greenDark : '#7B2020',
            marginBottom: 16,
            lineHeight: 19,
          }}>
            {currentQ.explanation}
          </AppText>
          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.85}
            style={{
              backgroundColor: currentIsCorrect ? C.greenDark : '#DC2626',
              borderRadius: 16, paddingVertical: 16, alignItems: 'center',
            }}
          >
            <AppText style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
              Próxima →
            </AppText>
          </TouchableOpacity>
        </Animated.View>
      )}

    </SafeAreaView>
  );
}


// ── Option list ───────────────────────────────────────────────────────────────

function OptionList({
  options, selected, locked, correctIndex, onSelect,
}: {
  options: string[];
  selected: number | null;
  locked: boolean;
  correctIndex: number;
  onSelect: (idx: number) => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      {options.map((option, idx) => {
        const isSelected = selected === idx;
        const isCorrect  = idx === correctIndex;

        let borderColor = C.border;
        let bgColor = C.card;
        if (locked) {
          if (isCorrect)                    { borderColor = C.greenDark; bgColor = 'rgba(61,136,0,0.08)'; }
          else if (isSelected && !isCorrect){ borderColor = '#DC2626';   bgColor = 'rgba(220,38,38,0.06)'; }
        } else {
          if (isSelected) { borderColor = C.green; bgColor = 'rgba(163,255,60,0.10)'; }
        }

        return (
          <TouchableOpacity
            key={idx}
            onPress={() => onSelect(idx)}
            activeOpacity={locked ? 1 : 0.75}
            style={{
              borderRadius: 14, borderWidth: 2,
              borderColor, backgroundColor: bgColor,
              paddingHorizontal: 16, paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            <AppText style={{ fontSize: 16, fontWeight: '600', color: C.navy, textAlign: 'center', lineHeight: 22 }}>
              {option}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Intro screen ──────────────────────────────────────────────────────────────

function IntroScreen({ firstName, onStart, onSkip }: { firstName: string; onStart: () => void; onSkip: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulse1   = useRef(new Animated.Value(1)).current;
  const pulse2   = useRef(new Animated.Value(1)).current;
  const bubbleY  = useRef(new Animated.Value(12)).current;
  const bubbleO  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    // Pulse rings around avatar
    const ring = (anim: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1,    duration: 1000, useNativeDriver: true }),
      ]));
    ring(pulse1, 0).start();
    ring(pulse2, 500).start();

    // Speech bubble entrance
    Animated.parallel([
      Animated.timing(bubbleO, { toValue: 1, duration: 380, delay: 350, useNativeDriver: true }),
      Animated.timing(bubbleY, { toValue: 0, duration: 380, delay: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <Animated.View style={{
        flex: 1, opacity: fadeAnim,
        justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 32, paddingVertical: 40,
      }}>

        {/* Avatar with pulse rings */}
        <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
          <Animated.View style={{
            position: 'absolute',
            width: 152, height: 152, borderRadius: 76,
            backgroundColor: 'rgba(163,255,60,0.08)',
            transform: [{ scale: pulse1 }],
          }} />
          <Animated.View style={{
            position: 'absolute',
            width: 124, height: 124, borderRadius: 62,
            backgroundColor: 'rgba(163,255,60,0.13)',
            transform: [{ scale: pulse2 }],
          }} />
          <CharlotteAvatar size="xxl" />
        </View>

        {/* Charlotte speech bubble */}
        <Animated.View style={{
          opacity: bubbleO,
          transform: [{ translateY: bubbleY }],
          width: '100%', marginBottom: 36,
        }}>
          {/* Bubble tail pointing up to avatar */}
          <View style={{
            alignSelf: 'center',
            width: 0, height: 0,
            borderLeftWidth: 10, borderLeftColor: 'transparent',
            borderRightWidth: 10, borderRightColor: 'transparent',
            borderBottomWidth: 12, borderBottomColor: C.navy,
            marginBottom: -1,
          }} />
          <View style={{
            backgroundColor: C.navy, borderRadius: 20,
            paddingHorizontal: 22, paddingVertical: 20,
            ...C.shadow,
          }}>
            <AppText style={{
              fontSize: 11, fontWeight: '800', color: C.green,
              letterSpacing: 0.8, marginBottom: 10,
            }}>
              CHARLOTTE
            </AppText>
            <AppText style={{ fontSize: 17, color: '#FFFFFF', lineHeight: 26, fontWeight: '500' }}>
              Olá, {firstName}! Qual é o seu nível de inglês?
            </AppText>
            <AppText style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 23, marginTop: 8 }}>
              Me responde algumas questões rápidas e eu adapto as conversas e o conteúdo ao seu nível.
            </AppText>
          </View>
        </Animated.View>

        {/* CTAs */}
        <View style={{ width: '100%', gap: 12 }}>

          {/* Primário — fazer o teste */}
          <TouchableOpacity
            onPress={onStart}
            activeOpacity={0.85}
            style={{
              backgroundColor: C.green, borderRadius: 16,
              paddingVertical: 18, width: '100%',
              alignItems: 'center', justifyContent: 'center',
              overflow: 'visible',
            }}
          >
            {/* Badge RECOMENDADO — vaza fora do botão no canto superior direito */}
            <View style={{
              position: 'absolute', top: -13, right: -4,
              backgroundColor: C.navy,
              borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4,
            }}>
              <AppText style={{ fontSize: 10, fontWeight: '800', color: C.green, letterSpacing: 0.6 }}>
                RECOMENDADO
              </AppText>
            </View>
            <AppText style={{ fontSize: 16, fontWeight: '800', color: C.navy }}>Descobrir meu nível</AppText>
          </TouchableOpacity>

          {/* Secundário — começar do zero */}
          <TouchableOpacity
            onPress={onSkip}
            activeOpacity={0.85}
            style={{
              borderRadius: 16, paddingVertical: 16, width: '100%',
              borderWidth: 2, borderColor: 'rgba(22,21,58,0.15)',
              alignItems: 'center',
            }}
          >
            <AppText style={{ fontSize: 15, fontWeight: '700', color: C.navyMid }}>
              Começar do zero
            </AppText>
          </TouchableOpacity>

        </View>

      </Animated.View>
    </SafeAreaView>
  );
}

// ── Saving screen ─────────────────────────────────────────────────────────────

function SavingScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
      <CharlotteAvatar size="xl" />
      <ActivityIndicator size="large" color={C.navy} style={{ marginTop: 24 }} />
      <AppText style={{ marginTop: 14, fontSize: 15, color: C.navyMid, fontWeight: '500' }}>
        Calculando seu nível...
      </AppText>
    </SafeAreaView>
  );
}

// ── Result screen ──────────────────────────────────────────────────────────────

function ResultScreen({
  level, firstName, saveError, onFinish,
}: {
  level: Level; firstName: string; saveError: string | null; onFinish: () => void;
}) {
  const meta   = LEVEL_META[level];
  const insets = useSafeAreaInsets();

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 480, delay: 80, useNativeDriver: true }).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }} edges={['top']}>
      <StatusBar style="light" />
      <Animated.View style={{ flex: 1, opacity: anim, transform: [{ translateY }] }}>

        {/* Navy hero — compact, avatar + level + tagline */}
        <View style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 28, paddingHorizontal: 28 }}>
          <CharlotteAvatar size="xl" />
          <View style={{
            marginTop: 16, backgroundColor: 'rgba(163,255,60,0.15)',
            borderRadius: 100, paddingHorizontal: 18, paddingVertical: 6,
            borderWidth: 1, borderColor: 'rgba(163,255,60,0.3)',
          }}>
            <AppText style={{ fontSize: 10, fontWeight: '900', color: C.green, letterSpacing: 2 }}>
              {LEVEL_TAG[level]}
            </AppText>
          </View>
          <AppText style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', lineHeight: 28, marginTop: 12 }}>
            {meta.tagline}
          </AppText>
        </View>

        {/* White sheet */}
        <View style={{ flex: 1, backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 28, paddingTop: 28,
              paddingBottom: insets.bottom + 16,
              flexGrow: 1,
            }}
          >
            <AppText style={{ fontSize: 15, color: C.navyMid, lineHeight: 24, marginBottom: 24 }}>
              {meta.description}
            </AppText>

            {/* Charlotte quote */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 0 }}>
              <CharlotteAvatar size="xs" />
              <View style={{
                width: 0, height: 0,
                borderTopWidth: 5, borderTopColor: 'transparent',
                borderBottomWidth: 5, borderBottomColor: 'transparent',
                borderRightWidth: 7, borderRightColor: 'rgba(22,21,58,0.08)',
                marginTop: 10, marginLeft: 2,
              }} />
              <View style={{
                flex: 1, backgroundColor: 'rgba(22,21,58,0.06)',
                borderRadius: 14, borderTopLeftRadius: 4,
                paddingHorizontal: 14, paddingVertical: 12,
              }}>
                <AppText style={{ fontSize: 14, color: C.navy, fontStyle: 'italic', lineHeight: 22 }}>
                  "{meta.charlotteMessage}"
                </AppText>
              </View>
            </View>

            {saveError && (
              <View style={{
                backgroundColor: 'rgba(220,38,38,0.07)', borderRadius: 12,
                borderWidth: 1, borderColor: 'rgba(220,38,38,0.2)',
                padding: 12, marginTop: 20,
              }}>
                <AppText style={{ fontSize: 13, color: '#DC2626', textAlign: 'center', lineHeight: 20 }}>
                  {saveError}
                </AppText>
              </View>
            )}

            <View style={{ height: 32 }} />

            {/* CTA */}
            <TouchableOpacity
              onPress={onFinish}
              activeOpacity={0.85}
              style={{
                backgroundColor: C.green, borderRadius: 16, paddingVertical: 17,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <AppText style={{ fontSize: 16, fontWeight: '800', color: C.navy }}>Começar a aprender</AppText>
              <ArrowRight size={18} color={C.navy} weight="bold" />
            </TouchableOpacity>
          </ScrollView>
        </View>

      </Animated.View>
    </SafeAreaView>
  );
}
