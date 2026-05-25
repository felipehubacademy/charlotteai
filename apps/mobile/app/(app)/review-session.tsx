import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Animated,
  ActivityIndicator, Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, CheckCircle, XCircle, Trophy, Star, ArrowRight, SpeakerHigh } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { soundEngine } from '@/lib/soundEngine';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { AppText } from '@/components/ui/Text';
import CharlotteAvatar from '@/components/ui/CharlotteAvatar';
import AnimatedXPBadge from '@/components/ui/AnimatedXPBadge';
import { CURRICULUM, TrailLevel } from '@/data/curriculum';
import { calcNextReview, SRRating } from '@/lib/spacedRepetition';

// ── Palette ─────────────────────────────────────────────────────────────────
const C = {
  bg:        '#F4F3FA',
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  navyGhost: 'rgba(22,21,58,0.06)',
  border:    'rgba(22,21,58,0.10)',
  green:     '#3D8800',
  greenDark: '#3D8800',
  greenBg:   '#F0FFD9',
  red:       '#DC2626',
  redBg:     'rgba(220,38,38,0.07)',
  gold:      '#D97706',
  goldBg:    '#FFFBEB',
  violet:    '#7C3AED',
  violetBg:  '#F5F3FF',
};

const cardShadow = Platform.select({
  ios:     { shadowColor: 'rgba(22,21,58,0.10)', shadowOpacity: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 3 },
}) as object;

// ── Types ────────────────────────────────────────────────────────────────────
type CardType = 'gap_fill' | 'reverse' | 'context_guess' | 'charlotte_challenge';

interface SRCardItem {
  id:           string;
  cardType:     CardType;
  userLevel:    string;
  moduleIndex:  number;
  topicIndex:   number;
  topicTitle:   string;
  easeFactor:   number;
  intervalDays: number;
  repetitions:  number;
  // Vocabulary-specific (when moduleIndex === -1)
  vocabTerm?:               string;
  vocabDefinition?:         string;
  vocabExample?:            string;
  vocabExampleTranslation?: string;  // PT-BR, Novice only
  vocabCategory?:           string;
}

interface CardQuestion {
  cardType:    CardType;
  instruction: string;
  sentence?:   string;
  blank?:      string;      // for gap_fill: the part with blank
  answer:      string;
  options?:    string[];    // for context_guess: multiple choice
  hint?:       string;
  explanation: string;
}

// ── Vocabulary card generator ────────────────────────────────────────────────
function generateVocabCardQuestion(item: SRCardItem): CardQuestion | null {
  const { vocabTerm, vocabDefinition, vocabExample, vocabExampleTranslation, cardType } = item;
  if (!vocabTerm || !vocabDefinition) return null;
  const isPt = item.userLevel === 'Novice';

  // Para Novice: definição já está em PT-BR.
  // Exemplo de frase sempre em EN; tradução do exemplo (PT-BR) usada como dica/explicação.
  const exampleHint = isPt && vocabExampleTranslation ? vocabExampleTranslation : undefined;

  switch (cardType) {
    case 'gap_fill': {
      if (vocabExample) {
        const blanked = vocabExample.replace(new RegExp(vocabTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '___');
        return {
          cardType:    'gap_fill',
          instruction: isPt ? 'Complete com a palavra correta:' : 'Fill in the blank:',
          sentence:    blanked,
          answer:      vocabTerm,
          // Novice: dica = tradução da frase; explicação = definição em PT
          hint:        exampleHint,
          explanation: vocabDefinition,
        };
      }
      // Sem exemplo: mostrar definição em PT, pedir o termo em EN
      return {
        cardType:    'gap_fill',
        instruction: isPt ? 'Qual palavra significa:' : 'Which word means:',
        sentence:    vocabDefinition,
        answer:      vocabTerm,
        explanation: vocabDefinition,
      };
    }

    case 'reverse': {
      // Mostrar definição (PT para Novice) → usuário digita o termo em EN
      return {
        cardType:    'reverse',
        instruction: isPt ? 'Como você diz em inglês:' : 'How do you say:',
        sentence:    vocabDefinition,
        answer:      vocabTerm,
        // Novice: dica = tradução do exemplo; explicação = definição PT + exemplo EN
        hint:        exampleHint ?? (vocabExample ? undefined : undefined),
        explanation: isPt
          ? `${vocabDefinition}${vocabExample ? `\n\n"${vocabExample}"` : ''}${vocabExampleTranslation ? `\n${vocabExampleTranslation}` : ''}`
          : (vocabExample ?? vocabDefinition),
      };
    }

    case 'context_guess': {
      // Mostrar exemplo EN com termo destacado → usuário escolhe definição
      const sentence = vocabExample ?? `The term "${vocabTerm}" is used in this context.`;
      return {
        cardType:    'context_guess',
        instruction: isPt ? 'O que significa o termo destacado?' : 'What does the highlighted term mean?',
        sentence:    sentence.replace(new RegExp(vocabTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), `**${vocabTerm}**`),
        answer:      vocabDefinition,  // já em PT para Novice
        options:     [vocabDefinition],
        // Novice: explicação = tradução do exemplo + definição PT
        explanation: isPt
          ? `${vocabDefinition}${vocabExampleTranslation ? `\n\n${vocabExampleTranslation}` : ''}`
          : (vocabExample ?? vocabDefinition),
      };
    }

    default:
      return null;
  }
}

// ── Content generator ────────────────────────────────────────────────────────
function generateCardQuestion(item: SRCardItem): CardQuestion | null {
  // Vocabulary cards (moduleIndex === -1)
  if (item.moduleIndex === -1) return generateVocabCardQuestion(item);

  const modules = CURRICULUM[item.userLevel as TrailLevel];
  if (!modules) return null;
  const module = modules[item.moduleIndex];
  if (!module) return null;
  const topic = module.topics[item.topicIndex];
  if (!topic || !topic.grammar || topic.grammar.length === 0) return null;

  const grammar = topic.grammar;
  const isPt    = item.userLevel === 'Novice';

  switch (item.cardType) {
    case 'gap_fill': {
      // Pick a fill_gap exercise, fallback to word_bank or any
      const ex = grammar.find(e => e.type === 'fill_gap')
              ?? grammar.find(e => e.type === 'word_bank')
              ?? grammar[0];
      return {
        cardType:    'gap_fill',
        instruction: isPt ? 'Complete a lacuna:' : 'Fill in the blank:',
        sentence:    ex.sentence,
        answer:      ex.answer,
        hint:        ex.hint,
        explanation: ex.explanation,
      };
    }

    case 'reverse': {
      // Pick a fill_gap or word_bank exercise — ask user to recall the answer
      // from the blanked sentence (hint). Do NOT expose ex.explanation here:
      // it contains the rule + example with the answer itself, which would
      // turn recall into recognition.
      const ex = grammar.find(e => e.type === 'fill_gap')
              ?? grammar.find(e => e.type === 'word_bank')
              ?? grammar[1]
              ?? grammar[0];
      return {
        cardType:    'reverse',
        instruction: isPt
          ? `Tópico: "${topic.title}"\nComplete com a palavra ou expressão correta:`
          : `Topic: "${topic.title}"\nComplete with the correct word or expression:`,
        // No sentence: the blanked phrase in `hint` is the actual exercise.
        answer:      ex.answer,
        hint:        ex.sentence?.replace('_____', '___') ?? '',
        explanation: ex.explanation,
      };
    }

    case 'context_guess': {
      // Pick a multiple_choice exercise, fallback to word_bank
      const ex = grammar.find(e => e.type === 'multiple_choice')
              ?? grammar.find(e => e.type === 'word_bank')
              ?? grammar[2]
              ?? grammar[0];
      const opts = ex.options ?? ex.choices ?? [ex.answer];
      // Shuffle options
      const shuffled = [...opts].sort(() => Math.random() - 0.5);
      return {
        cardType:    'context_guess',
        instruction: isPt ? 'Escolha a resposta correta:' : 'Choose the correct answer:',
        sentence:    ex.sentence,
        answer:      ex.answer,
        options:     shuffled.length >= 2 ? shuffled : [ex.answer, ...(grammar.slice(0,2).map(g=>g.answer).filter(a=>a!==ex.answer))].slice(0,3),
        explanation: ex.explanation,
      };
    }

    case 'charlotte_challenge': {
      // Pick a fix_error or short_write exercise, fallback to read_answer
      const ex = grammar.find(e => e.type === 'fix_error')
              ?? grammar.find(e => e.type === 'short_write')
              ?? grammar.find(e => e.type === 'read_answer')
              ?? grammar[grammar.length - 1];
      return {
        cardType:    'charlotte_challenge',
        instruction: ex.type === 'fix_error'
          ? (isPt ? 'Corrija o erro na frase:' : 'Fix the error in the sentence:')
          : ex.type === 'short_write'
            ? (ex.prompt ?? (isPt ? 'Escreva uma frase:' : 'Write a sentence:'))
            : (isPt ? 'Responda com suas palavras:' : 'Answer in your own words:'),
        sentence:    ex.sentence ?? ex.passage ?? ex.question,
        answer:      ex.example_answer ?? ex.answer,
        hint:        ex.hint,
        explanation: ex.explanation,
      };
    }

    default:
      return null;
  }
}

// ── Normalise for comparison ─────────────────────────────────────────────────
function normalise(s: string) {
  return s.trim().toLowerCase().replace(/[''']/g, "'").replace(/\s+/g, ' ');
}
function answerIsCorrect(userAnswer: string, expected: string): boolean {
  const u = normalise(userAnswer);
  const c = normalise(expected);
  if (u === c) return true;
  if (u.includes(c) || c.includes(u)) return true;
  return false;
}

// ── XP per rating ────────────────────────────────────────────────────────────
const XP_BY_RATING: Record<SRRating, number> = { hard: 5, ok: 10, easy: 15 };

// ── Component ────────────────────────────────────────────────────────────────
export default function ReviewSession() {
  const { session, profile } = useAuth();
  const user = session?.user;
  const insets = useSafeAreaInsets();
  const level = (profile?.charlotte_level ?? 'Novice') as TrailLevel;
  const isPt  = level === 'Novice';

  const levelAccent:   string = level === 'Novice' ? '#D97706' : level === 'Inter' ? '#7C3AED' : '#0F766E';
  const levelAccentBg: string = level === 'Novice' ? '#FFFBEB' : level === 'Inter' ? '#F5F3FF' : '#F0FDFA';

  // Reset contador Tier 4 ao iniciar a sessao
  useEffect(() => { soundEngine.resetStreak(); }, []);

  // ── State ──────────────────────────────────────────────────────────────────
  const [items,         setItems]         = useState<SRCardItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [cardIdx,       setCardIdx]       = useState(0);
  const [phase,         setPhase]         = useState<'question' | 'rating' | 'summary'>('question');
  const [vocabDueCount, setVocabDueCount] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect,  setIsCorrect]  = useState<boolean | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [ratings,  setRatings]  = useState<SRRating[]>([]);
  const [totalXP,  setTotalXP]  = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // ── Load items ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('sr_items')
        .select('id, source_type, source_id, card_type, user_level, topic_title, ease_factor, interval_days, repetitions, next_review_at')
        .eq('user_id', user.id)
        .eq('source_type', 'learn_topic')
        .lte('next_review_at', now)
        .order('next_review_at', { ascending: true })
        .limit(20);

      if (error) {
        console.warn('[ReviewSession] load error:', error.message);
        setLoading(false);
        return;
      }

      // Only topic SR cards — vocabulary has its own review screen (vocab-review)
      const mapped: SRCardItem[] = (data ?? []).map(r => {
        const parts = (r.source_id as string).split(':');
        return {
          id:           r.id,
          cardType:     (r.card_type as CardType),
          userLevel:    r.user_level ?? level,
          moduleIndex:  parseInt(parts[1] ?? '0', 10),
          topicIndex:   parseInt(parts[2] ?? '0', 10),
          topicTitle:   r.topic_title ?? '',
          easeFactor:   r.ease_factor ?? 2.5,
          intervalDays: r.interval_days ?? 0,
          repetitions:  r.repetitions ?? 0,
        } as SRCardItem;
      }).filter((item): item is SRCardItem => {
        if (item === null) return false;
        const q = generateCardQuestion(item);
        if (!q) console.warn('[ReviewSession] item filtered out (no question):', item.topicTitle, item.cardType, item.moduleIndex, item.topicIndex);
        return !!q;
      });

      setItems(mapped);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  // ── Fetch vocab due when summary is shown ─────────────────────────────────
  useEffect(() => {
    if (phase !== 'summary' || !user?.id) return;
    const fetchVocabDue = async () => {
      const now = new Date().toISOString();
      const { count } = await supabase
        .from('user_vocabulary')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .lte('next_review_at', now);
      setVocabDueCount(count ?? 0);
    };
    fetchVocabDue();
  }, [phase, user?.id]);

  const currentItem     = items[cardIdx];
  const currentQuestion = currentItem ? generateCardQuestion(currentItem) : null;

  // ── Animate card transition ────────────────────────────────────────────────
  const animateNext = useCallback((cb: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      cb();
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  }, [fadeAnim]);

  // ── Apply rating & move to next ────────────────────────────────────────────
  const handleRating = useCallback(async (rating: SRRating) => {
    if (!currentItem || !user?.id) return;

    const xp = XP_BY_RATING[rating];
    const newRatings = [...ratings, rating];
    setRatings(newRatings);
    setTotalXP(prev => prev + xp);

    // SM-2 update
    const next = calcNextReview(rating, {
      easeFactor:   currentItem.easeFactor,
      intervalDays: currentItem.intervalDays,
      repetitions:  currentItem.repetitions,
    });

    await supabase.from('sr_items').update({
      ease_factor:      next.easeFactor,
      interval_days:    next.intervalDays,
      repetitions:      next.repetitions,
      next_review_at:   next.nextReviewAt.toISOString(),
      last_reviewed_at: new Date().toISOString(),
      last_rating:      rating,
    }).eq('id', currentItem.id);

    // XP to charlotte_practices
    supabase.from('charlotte_practices').insert({
      user_id:       user.id,
      practice_type: 'sr_review',
      xp_earned:     xp,
    }).then(({ error }) => { if (error) console.warn('[ReviewSession] xp error:', error.message); });

    // XP badge animation is triggered automatically when totalXP updates
    // (AnimatedXPBadge watches the xp prop and fires triggerToast on increase).

    // Advance
    animateNext(() => {
      if (cardIdx + 1 >= items.length) {
        setPhase('summary');
      } else {
        setCardIdx(cardIdx + 1);
        setPhase('question');
        setUserAnswer('');
        setSelectedOption(null);
        setIsCorrect(null);
      }
    });
  }, [currentItem, user?.id, ratings, cardIdx, items.length, animateNext]);

  // ── Submit answer ──────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    if (!currentQuestion) return;
    const answer = currentQuestion.cardType === 'context_guess'
      ? (selectedOption ?? '')
      : userAnswer;
    if (!answer.trim()) return;

    const correct = answerIsCorrect(answer, currentQuestion.answer);
    setIsCorrect(correct);

    if (correct) {
      soundEngine.play('answer_correct').catch(() => {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      soundEngine.play('answer_wrong').catch(() => {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setPhase('rating');
    // Auto-rate baseado na corretude — sem self-rating manual
    setTimeout(() => handleRating(correct ? 'easy' : 'hard'), 1800);
  }, [currentQuestion, userAnswer, selectedOption, handleRating]);

  // ── Select option (context_guess) ─────────────────────────────────────────
  const handleSelectOption = useCallback((opt: string) => {
    if (phase !== 'question') return;
    setSelectedOption(opt);
  }, [phase]);

  // ── After selecting option, auto-submit ───────────────────────────────────
  useEffect(() => {
    if (selectedOption && currentQuestion?.cardType === 'context_guess' && phase === 'question') {
      // Small delay so user sees the selection
      const t = setTimeout(() => handleSubmit(), 300);
      return () => clearTimeout(t);
    }
  }, [selectedOption, currentQuestion?.cardType, phase, handleSubmit]);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const correctCount = ratings.filter(r => r === 'easy').length;
  const wrongCount   = ratings.filter(r => r === 'hard').length;
  const easyCount    = correctCount; // compat para nextReview calc
  const okCount      = 0;
  const hardCount    = wrongCount;
  const nextReview = items
    .map((item, i) => {
      const r = ratings[i];
      if (!r) return null;
      const n = calcNextReview(r, { easeFactor: item.easeFactor, intervalDays: item.intervalDays, repetitions: item.repetitions });
      return n.nextReviewAt;
    })
    .filter(Boolean)
    .sort((a, b) => (a! < b! ? -1 : 1))[0];

  const nextReviewStr = nextReview
    ? (nextReview.toDateString() === new Date().toDateString()
        ? (isPt ? 'hoje' : 'today')
        : nextReview.toDateString() === (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); return d; })().toDateString()
          ? (isPt ? 'amanhã' : 'tomorrow')
          : isPt
            ? `em ${Math.ceil((nextReview.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000)} dias`
            : `in ${Math.ceil((nextReview.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000)} days`)
    : '';

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={levelAccent} size="large" />
      </SafeAreaView>
    );
  }

  // ── No items ──────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 4 }}>
            <ArrowLeft size={22} color={C.navy} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <CharlotteAvatar size="xl" />
          <AppText style={{ fontSize: 22, fontWeight: '700', color: C.navy, marginTop: 20, textAlign: 'center' }}>
            {isPt ? 'Tudo em dia!' : 'All caught up!'}
          </AppText>
          <AppText style={{ fontSize: 15, color: C.navyMid, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
            {isPt
              ? 'Nenhuma revisao pendente por agora. Continue praticando!'
              : 'No reviews due right now. Keep practising!'}
          </AppText>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.82}
            style={{
              marginTop: 32, backgroundColor: C.navy,
              borderRadius: 16, paddingVertical: 14, paddingHorizontal: 40,
            }}
          >
            <AppText style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
              {isPt ? 'Voltar ao inicio' : 'Back to Home'}
            </AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Summary screen ────────────────────────────────────────────────────────
  if (phase === 'summary') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 32 }}>
          {/* Header */}
          <View style={{ alignItems: 'center', paddingTop: 24, paddingBottom: 8 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: levelAccentBg, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Trophy size={32} color={levelAccent} weight="fill" />
            </View>
            <AppText style={{ fontSize: 24, fontWeight: '800', color: C.navy, textAlign: 'center' }}>
              {isPt ? 'Sessao concluida!' : 'Session complete!'}
            </AppText>
            <AppText style={{ fontSize: 15, color: C.navyMid, marginTop: 6, textAlign: 'center' }}>
              {isPt
                ? `Voce revisou ${items.length} ${items.length === 1 ? 'card' : 'cards'}`
                : `You reviewed ${items.length} ${items.length === 1 ? 'card' : 'cards'}`}
            </AppText>
          </View>

          {/* XP earned */}
          <View style={{ backgroundColor: C.card, borderRadius: 18, padding: 20, marginTop: 20, ...cardShadow, alignItems: 'center' }}>
            <AppText style={{ fontSize: 36, fontWeight: '800', color: levelAccent }}>+{totalXP} XP</AppText>
            <AppText style={{ fontSize: 13, color: C.navyMid, marginTop: 2 }}>
              {isPt ? 'ganhos nesta sessão' : 'earned this session'}
            </AppText>
          </View>

          {/* Stats grid */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <StatCard label={isPt ? 'Acertos' : 'Correct'} value={correctCount} color={C.green} bg={C.greenBg} />
            <StatCard label={isPt ? 'Erros' : 'Wrong'}     value={wrongCount}   color={C.red}   bg={C.redBg}   />
          </View>

          {/* Next review */}
          {nextReviewStr ? (
            <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...cardShadow }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: levelAccentBg, justifyContent: 'center', alignItems: 'center' }}>
                <Star size={20} color={levelAccent} weight="fill" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={{ fontSize: 13, color: C.navyMid }}>
                  {isPt ? 'Próxima revisão' : 'Next review'}
                </AppText>
                <AppText style={{ fontSize: 15, fontWeight: '700', color: C.navy, marginTop: 2 }}>
                  {nextReviewStr}
                </AppText>
              </View>
            </View>
          ) : null}

          {/* Charlotte message */}
          <View style={{ backgroundColor: levelAccentBg, borderRadius: 14, padding: 16, marginTop: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <CharlotteAvatar size="sm" />
            <AppText style={{ flex: 1, fontSize: 14, color: C.navy, lineHeight: 21 }}>
              {hardCount === 0
                ? (isPt ? 'Perfeito! Você dominou todos os cards hoje. Continue assim!' : 'Perfect! You nailed every card today. Keep it up!')
                : hardCount <= Math.floor(items.length / 2)
                  ? (isPt ? `Ótimo trabalho! Os ${hardCount} difíceis voltarão em breve para mais prática.` : `Great work! The ${hardCount} hard card${hardCount > 1 ? 's' : ''} will come back soon for more practice.`)
                  : (isPt ? 'Esses tópicos precisam de mais atenção. Vou trazê-los de volta em breve!' : "These topics need more attention. I'll bring them back soon!")}
            </AppText>
          </View>

          {/* Buttons */}
          <TouchableOpacity
            onPress={() => router.replace('/(app)')}
            activeOpacity={0.82}
            style={{
              marginTop: 24, backgroundColor: C.navy,
              borderRadius: 16, paddingVertical: 16, alignItems: 'center',
              ...Platform.select({ ios: { shadowColor: C.navy, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, android: { elevation: 4 } }),
            }}
          >
            <AppText style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
              {isPt ? 'Voltar ao inicio' : 'Back to Home'}
            </AppText>
          </TouchableOpacity>

          {vocabDueCount > 0 && (
            <TouchableOpacity
              onPress={() => router.replace('/(app)/vocab-review')}
              activeOpacity={0.82}
              style={{
                marginTop: 12, backgroundColor: 'transparent',
                borderRadius: 16, paddingVertical: 14, alignItems: 'center',
                borderWidth: 1.5, borderColor: C.greenDark,
              }}
            >
              <AppText style={{ color: C.greenDark, fontSize: 16, fontWeight: '800' }}>
                {isPt ? 'Revisar vocabulário também' : 'Review vocabulary too'}
              </AppText>
            </TouchableOpacity>
          )}

        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Card question / rating ─────────────────────────────────────────────────
  if (!currentQuestion) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 10}
      >
        {/* Top bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 4 }}>
            <ArrowLeft size={22} color={C.navy} />
          </TouchableOpacity>
          <View style={{ flex: 1, height: 6, backgroundColor: C.navyGhost, borderRadius: 3, marginHorizontal: 8 }}>
            <View style={{
              height: 6, borderRadius: 3, backgroundColor: levelAccent,
              width: `${((cardIdx + (phase === 'rating' ? 1 : 0)) / items.length) * 100}%`,
            }} />
          </View>
          <View style={{ marginRight: 6 }}>
            <AnimatedXPBadge xp={totalXP} />
          </View>
          <AppText style={{ fontSize: 13, color: C.navyMid, minWidth: 48, textAlign: 'right' }}>
            {cardIdx + 1}/{items.length}
          </AppText>
        </View>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Card type label */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 10 }}>
              <View style={{ backgroundColor: levelAccentBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                <AppText style={{ fontSize: 12, fontWeight: '700', color: levelAccent, letterSpacing: 0.5 }}>
                  {cardTypeLabel(currentQuestion.cardType, isPt)}
                </AppText>
              </View>
              <AppText style={{ fontSize: 12, color: C.navyLight }}>
                {currentItem.topicTitle}
              </AppText>
            </View>

            {/* Main card */}
            <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 22, ...cardShadow }}>
              {/* Instruction */}
              <AppText style={{ fontSize: 15, color: C.navyMid, marginBottom: 16, lineHeight: 22 }}>
                {currentQuestion.instruction}
              </AppText>

              {/* Sentence / context */}
              {currentQuestion.sentence ? (
                <View style={{ backgroundColor: C.bg, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <AppText style={{ fontSize: 17, color: C.navy, fontWeight: '600', lineHeight: 26 }}>
                    {formatSentence(currentQuestion.sentence)}
                  </AppText>
                </View>
              ) : null}

              {/* Hint */}
              {currentQuestion.hint && phase === 'question' && currentQuestion.cardType !== 'context_guess' ? (
                <AppText style={{ fontSize: 12, color: C.navyLight, marginBottom: 12, fontStyle: 'italic' }}>
                  {currentQuestion.hint}
                </AppText>
              ) : null}

              {/* Options (context_guess) */}
              {currentQuestion.cardType === 'context_guess' && currentQuestion.options && phase === 'question' ? (
                <View style={{ gap: 10 }}>
                  {currentQuestion.options.map(opt => (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => handleSelectOption(opt)}
                      style={{
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: selectedOption === opt ? levelAccent : C.border,
                        backgroundColor: selectedOption === opt ? levelAccentBg : C.card,
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                      }}
                    >
                      <AppText style={{ fontSize: 15, color: selectedOption === opt ? levelAccent : C.navy, fontWeight: selectedOption === opt ? '700' : '400' }}>
                        {opt}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {/* Text input (gap_fill, reverse, charlotte_challenge) */}
              {currentQuestion.cardType !== 'context_guess' && phase === 'question' ? (
                <View>
                  <TextInput
                    value={userAnswer}
                    onChangeText={setUserAnswer}
                    placeholder={isPt ? 'Digite sua resposta...' : 'Type your answer...'}
                    placeholderTextColor={C.navyLight}
                    style={{
                      borderWidth: 1.5,
                      borderColor: C.border,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontSize: 16,
                      color: C.navy,
                      backgroundColor: C.bg,
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={!userAnswer.trim()}
                    style={{
                      marginTop: 12,
                      backgroundColor: userAnswer.trim() ? levelAccent : C.navyGhost,
                      borderRadius: 12,
                      paddingVertical: 13,
                      alignItems: 'center',
                    }}
                  >
                    <AppText style={{ fontSize: 15, fontWeight: '700', color: userAnswer.trim() ? '#FFF' : C.navyLight }}>
                      {isPt ? 'Confirmar' : 'Submit'}
                    </AppText>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Answer reveal (phase === 'rating') */}
              {phase === 'rating' ? (
                <View>
                  <View style={{
                    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
                    backgroundColor: isCorrect ? C.greenBg : C.redBg,
                    borderRadius: 12, padding: 14, marginBottom: 16,
                  }}>
                    {isCorrect
                      ? <CheckCircle size={20} color={C.green} weight="fill" style={{ marginTop: 1 }} />
                      : <XCircle    size={20} color={C.red}   weight="fill" style={{ marginTop: 1 }} />
                    }
                    <View style={{ flex: 1 }}>
                      <AppText style={{ fontSize: 13, fontWeight: '700', color: isCorrect ? C.green : C.red, marginBottom: 4 }}>
                        {isCorrect
                          ? (isPt ? 'Correto!' : 'Correct!')
                          : (isPt ? 'Resposta correta:' : 'Correct answer:')}
                      </AppText>
                      {!isCorrect && (
                        <AppText style={{ fontSize: 15, color: C.navy, fontWeight: '600' }}>
                          {currentQuestion.answer}
                        </AppText>
                      )}
                    </View>
                  </View>

                  {/* Explanation */}
                  <View style={{ backgroundColor: C.bg, borderRadius: 12, padding: 14, marginBottom: 20 }}>
                    <AppText style={{ fontSize: 13, color: C.navyMid, lineHeight: 20 }}>
                      {currentQuestion.explanation}
                    </AppText>
                  </View>

                  {/* Proximo card automatico — sem self-rating */}
                </View>
              ) : null}
            </View>

            {/* Charlotte tip card (phase === 'question') */}
            {phase === 'question' && currentQuestion.cardType !== 'context_guess' && (
              <View style={{ backgroundColor: levelAccentBg, borderRadius: 14, padding: 14, marginTop: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <CharlotteAvatar size="xs" />
                <AppText style={{ flex: 1, fontSize: 13, color: C.navy, lineHeight: 19 }}>
                  {cardTip(currentQuestion.cardType, isPt)}
                </AppText>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function RatingButton({ label, color, bg, onPress, flex }: { label: string; color: string; bg: string; onPress: () => void; flex?: number }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flex, backgroundColor: bg, borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1.5, borderColor: color + '40' }}
    >
      <AppText style={{ fontSize: 14, fontWeight: '700', color }}>{label}</AppText>
    </TouchableOpacity>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: 14, padding: 14, alignItems: 'center' }}>
      <AppText style={{ fontSize: 26, fontWeight: '800', color }}>{value}</AppText>
      <AppText style={{ fontSize: 12, color, marginTop: 2 }}>{label}</AppText>
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function cardTypeLabel(type: CardType, isPt: boolean): string {
  switch (type) {
    case 'gap_fill':           return isPt ? 'Lacuna'    : 'Fill the Blank';
    case 'reverse':            return isPt ? 'Producao'  : 'Production';
    case 'context_guess':      return isPt ? 'Multipla escolha' : 'Multiple Choice';
    case 'charlotte_challenge': return isPt ? 'Desafio'  : 'Challenge';
    default:                   return type;
  }
}

function cardTip(type: CardType, isPt: boolean): string {
  switch (type) {
    case 'gap_fill':
      return isPt ? 'Digite apenas a palavra ou expressao que preenche o espaco.' : 'Type only the word or phrase that fills the blank.';
    case 'reverse':
      return isPt ? 'Tente lembrar a expressao sem olhar as dicas!' : 'Try to recall the expression without looking at hints!';
    case 'charlotte_challenge':
      return isPt ? 'Escreva a versao correta da frase.' : 'Write the corrected version of the sentence.';
    default:
      return '';
  }
}

function formatSentence(s: string): string {
  // Replace _____ with a visible blank marker
  return s.replace(/_____/g, '______');
}
