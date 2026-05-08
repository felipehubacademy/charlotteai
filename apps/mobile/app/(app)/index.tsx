import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Modal,
  Animated,
  unstable_batchedUpdates,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { router, useFocusEffect, Redirect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Fire,
  Lightning,
  Trophy,
  TextT,
  Microphone,
  ChatTeardropText,
  CheckCircle,
  Gear,
  Lightbulb,
  X,
  CaretRight,
  Lock,
  Phone,
  MapTrifold,
  Headphones,
  LightbulbFilament,
  Notepad,
} from 'phosphor-react-native';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { useXPToast } from '@/components/ui/XPToastProvider';
import LiveVoiceModal from '@/components/voice/LiveVoiceModal';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { LEVEL_CONFIG, UserLevel, ChatMode } from '@/lib/levelConfig';
import { getLiveVoiceStatus, getPoolForLevel } from '@/lib/liveVoiceUsage';
import { soundEngine } from '@/lib/soundEngine';
import { identifyUser, track } from '@/lib/analytics';
import { useTheme } from '@/lib/theme';
import { cacheHomeData, getCachedHomeData } from '@/lib/offlineCache';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePaywallContext } from '@/lib/paywallContext';
import { useTour } from '@/lib/tourContext';
import { getPendingReviews, ReviewItem } from '@/lib/spacedRepetition';
import { VocabFAB } from '@/components/vocabulary/VocabFAB';
import { getWeeklyChallenge, fetchWeeklyData, WeeklyChallengeState } from '@/lib/weeklyChallenge';
import { localMidnightUTC, localTodayStr } from '@/lib/dateUtils';
import { HomeData, Mission, buildMissions } from '@/lib/missions';
import { greetingCache, resetGreetingCache, prefetchGreeting } from '@/lib/greetingCache';

const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

// Module-level flag — persists for the entire JS session even if component remounts.
// Combined with a SecureStore date-check so the sound plays at most ONCE PER DAY,
// not on every app open.
let _streakSoundPlayedThisSession = false;

// Greeting: pre-fetched by AuthProvider via lib/greetingCache as soon as
// the profile loads. HomeScreen reads from the cache — see useEffect below.

// Palette estática usada apenas em constantes de módulo (fora do componente)
const C = {
  bg:         '#F4F3FA',
  card:       '#FFFFFF',
  navy:       '#16153A',
  navyMid:    '#4B4A72',
  navyLight:  '#9896B8',
  navyGhost:  'rgba(22,21,58,0.06)',
  green:      '#A3FF3C',
  greenDark:  '#3D8800',
  greenBg:    '#F0FFD9',
  blue:       '#60A5FA',
  blueBg:     '#EFF6FF',
  pink:       '#F472B6',
  pinkBg:     '#FDF2F8',
  orange:     '#FF6B35',
  gold:       '#F59E0B',
  shadow:     'rgba(22,21,58,0.08)',
};

const DAILY_XP_MILESTONES = [100, 200, 350, 500, 750, 1000];

function getDailyGoal(xp: number): number {
  for (const m of DAILY_XP_MILESTONES) {
    if (xp < m) return m;
  }
  // Beyond 1000: next multiple of 500
  return Math.ceil((xp + 1) / 500) * 500;
}

// Keep for legacy references (Charlotte message threshold)
const DAILY_XP_GOAL = 100;

// ── Types ─────────────────────────────────────────────────────

// HomeData and Mission are imported from lib/missions

interface ModeCard {
  mode: ChatMode | 'live';
  title: string;
  sub: string;
  route?: '/(app)/grammar' | '/(app)/pronunciation' | '/(app)/chat';
  accentColor: string;
  accentBg: string;
  icon: React.ReactNode;
  locked?: boolean;
  lockLevel?: string;  // texto exibido para locks de nivel
  lockXP?: number;     // threshold XP para unlock gradual (Novice)
  currentXP?: number;  // XP atual do usuario, passado junto com lockXP
}

// Unlock gradual para Novice: baseado em XP da trilha de aprendizado
// Calculo: N topics × 10 exercicios × 10 XP × 80% de acerto
const PRONUN_UNLOCK_XP = 1920; // modulo 5 completo @ 80% — 24 topics
const CHAT_UNLOCK_XP   = 2800; // modulo 8 completo @ 80% — 35 topics

// ── Helpers ───────────────────────────────────────────────────

function charlotteMessage(firstName: string, streak: number, todayXP: number, isPortuguese = false, isNewUser = false): string {
  if (isNewUser) {
    return isPortuguese
      ? `Oi, ${firstName}! Que bom ter você aqui. Vamos começar?`
      : `Hey ${firstName}! Great to have you here. Let's get started.`;
  }
  const now   = new Date();
  const h     = now.getHours();
  const seed  = localTodayStr().split('-').reduce((acc, p) => acc * 100 + parseInt(p, 10), 0);
  const hi    = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';

  if (isPortuguese) {
    const hiPt = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    if (todayXP >= DAILY_XP_GOAL) {
      const opts = [
        `Olá, ${firstName}! Você já bateu sua meta diária. Estou orgulhosa de você — continue assim!`,
        `Que esforço incrível, ${firstName}! Meta diária atingida. Vamos ainda mais longe.`,
        `${firstName}, você arrasou hoje. Meta cumprida. O ritmo agora é todo seu!`,
      ];
      return opts[seed % opts.length];
    }
    if (streak >= 14) {
      return `${hiPt}, ${firstName}. ${streak} dias seguidos — você é imparável. Vamos adicionar mais um!`;
    }
    if (streak >= 7) {
      return `${hiPt}, ${firstName}! Uma semana inteira de sequência. Você está construindo algo real aqui.`;
    }
    if (streak > 0 && todayXP === 0) {
      const opts = [
        `${hiPt}, ${firstName}. Sua sequência de ${streak} dias está em jogo — não deixe escapar hoje!`,
        `Ei ${firstName}, ainda sem prática hoje. Sua sequência está te esperando!`,
        `${hiPt}! Não deixe hoje quebrar sua sequência de ${streak} dias, ${firstName}. Você consegue!`,
      ];
      return opts[seed % opts.length];
    }
    if (todayXP > 0) {
      return `${hiPt}, ${firstName}! Bom começo hoje — faltam apenas ${DAILY_XP_GOAL - todayXP} XP para atingir sua meta diária.`;
    }
    // No activity yet — time-based default PT
    const poolsPt: Record<string, string[]> = {
      morning: [
        `Bom dia, ${firstName}! Pronto para começar o dia com um pouco de inglês?`,
        `Bom dia, ${firstName}! Vamos fazer hoje valer a pena.`,
        `Bom dia! O que vamos praticar hoje, ${firstName}?`,
        `Levanta e brilha, ${firstName}! Estou aqui sempre que você estiver pronto.`,
      ],
      afternoon: [
        `Boa tarde, ${firstName}! Que tal uma sessão de prática agora?`,
        `Ei ${firstName}, hora perfeita para um pouco de inglês hoje!`,
        `Boa tarde, ${firstName}. Vamos manter o ritmo!`,
        `Boa tarde, ${firstName}! Estava esperando por você.`,
      ],
      evening: [
        `Boa noite, ${firstName}! Uma última sessão antes de terminar o dia?`,
        `Boa noite, ${firstName}. Termine o dia forte — vamos praticar juntos.`,
        `Ei ${firstName}, que tal um pouco de inglês antes de dormir?`,
        `Boa noite! Ainda dá tempo de praticar hoje, ${firstName}.`,
      ],
    };
    const poolPt = h < 12 ? poolsPt.morning : h < 18 ? poolsPt.afternoon : poolsPt.evening;
    return poolPt[seed % poolPt.length];
  }

  if (todayXP >= DAILY_XP_GOAL) {
    const opts = [
      `${hi}, ${firstName}! You've already hit your daily goal. I'm proud of you — keep going!`,
      `Amazing effort today, ${firstName}! Daily goal reached. Let's push even further.`,
      `${firstName}, you crushed it today. Goal done. The momentum is all yours now.`,
    ];
    return opts[seed % opts.length];
  }
  if (streak >= 14) {
    return `${hi}, ${firstName}. ${streak} days in a row — you're truly unstoppable. Let's add one more.`;
  }
  if (streak >= 7) {
    return `${hi}, ${firstName}! A whole week streak. You're building something real here.`;
  }
  if (streak > 0 && todayXP === 0) {
    const opts = [
      `${hi}, ${firstName}. Your ${streak}-day streak is on the line — don't let it slip today!`,
      `Hey ${firstName}, no practice yet today. Your streak is waiting for you!`,
      `${hi}! Don't let today break your ${streak}-day streak, ${firstName}. You've got this.`,
    ];
    return opts[seed % opts.length];
  }
  if (todayXP > 0) {
    return `${hi}, ${firstName}! Good start today — just ${DAILY_XP_GOAL - todayXP} XP left to reach your daily goal.`;
  }

  // No activity yet — time-based default
  const pools: Record<string, string[]> = {
    morning: [
      `Good morning, ${firstName}! Ready to start the day with some English?`,
      `Morning, ${firstName}! Let's make today count.`,
      `Good morning! What shall we practise today, ${firstName}?`,
      `Rise and shine, ${firstName}! I'm here whenever you're ready.`,
    ],
    afternoon: [
      `Good afternoon, ${firstName}! How about a practice session right now?`,
      `Hey ${firstName}, perfect time for some English today!`,
      `Afternoon, ${firstName}. Let's keep the momentum going!`,
      `Good afternoon, ${firstName}! I've been waiting for you.`,
    ],
    evening: [
      `Good evening, ${firstName}! One last session before the day ends?`,
      `Evening, ${firstName}. End the day strong — let's practise together.`,
      `Hey ${firstName}, how about some English before bed tonight?`,
      `Good evening! There's still time to practise today, ${firstName}.`,
    ],
  };
  const pool = h < 12 ? pools.morning : h < 18 ? pools.afternoon : pools.evening;
  return pool[seed % pool.length];
}

function getLevel(xp: number) { return Math.floor(xp / 100) + 1; }

// ── Daily tip ──────────────────────────────────────────────────

interface Tip {
  type: 'word' | 'expression' | 'phrasal verb' | 'idiom';
  term: string;
  meaning: string;
  example: string;
  meaningPt?: string;
  examplePt?: string;
}

const TIPS: Record<string, Tip[]> = {
  Novice: [
    // ── Words ──
    { type: 'word',        term: 'ambitious',     meaning: 'having a strong desire to succeed',                          example: 'She\'s very ambitious and wants to become a doctor.',           meaningPt: 'ter um forte desejo de ter sucesso',                         examplePt: 'Ela é muito ambiciosa e quer se tornar médica.' },
    { type: 'word',        term: 'grateful',      meaning: 'feeling thankful for something good',                        example: 'I\'m so grateful for your help today.',                         meaningPt: 'sentir-se grato por algo bom',                               examplePt: 'Sou muito grato pela sua ajuda hoje.' },
    { type: 'word',        term: 'hesitate',      meaning: 'to pause before acting, often from doubt',                   example: 'Don\'t hesitate to ask if you have any questions.',             meaningPt: 'pausar antes de agir, geralmente por dúvida',                examplePt: 'Não hesite em perguntar se tiver dúvidas.' },
    { type: 'word',        term: 'fluent',        meaning: 'speaking a language smoothly and naturally',                 example: 'After two years of practice, she became fluent in English.',    meaningPt: 'falar um idioma com fluidez e naturalidade',                 examplePt: 'Após dois anos de prática, ela ficou fluente em inglês.' },
    { type: 'word',        term: 'available',     meaning: 'free to use or accessible at a given time',                  example: 'Is this time slot available for a meeting?',                   meaningPt: 'livre para usar ou acessível em determinado momento',        examplePt: 'Este horário está disponível para uma reunião?' },
    { type: 'word',        term: 'improve',       meaning: 'to get better at something over time',                       example: 'You\'ll improve faster if you practise every day.',             meaningPt: 'melhorar em algo ao longo do tempo',                         examplePt: 'Você vai melhorar mais rápido se praticar todos os dias.' },
    { type: 'word',        term: 'actually',      meaning: 'in reality — often used to correct or add information',      example: 'I thought it was easy, but actually it was quite hard.',        meaningPt: 'na verdade — usado para corrigir ou acrescentar algo',       examplePt: 'Achei que seria fácil, mas na verdade foi bem difícil.' },
    { type: 'word',        term: 'definitely',    meaning: 'without any doubt; certainly',                               example: 'I\'m definitely coming to the party tonight.',                  meaningPt: 'com certeza; definitivamente',                               examplePt: 'Com certeza vou à festa hoje à noite.' },
    { type: 'word',        term: 'although',      meaning: 'in spite of the fact that — like "even though"',             example: 'Although it was raining, we went for a walk.',                  meaningPt: 'embora; apesar de — como "even though"',                    examplePt: 'Embora estivesse chovendo, fomos caminhar.' },
    { type: 'word',        term: 'unless',        meaning: 'except if — used for conditions that prevent something',     example: 'I won\'t go unless you come with me.',                          meaningPt: 'a não ser que — condição que impede algo',                  examplePt: 'Não vou a não ser que você venha comigo.' },
    { type: 'word',        term: 'meanwhile',     meaning: 'at the same time; during that period',                       example: 'She cooked dinner. Meanwhile, he set the table.',               meaningPt: 'enquanto isso; ao mesmo tempo',                              examplePt: 'Ela cozinhou o jantar. Enquanto isso, ele pôs a mesa.' },
    { type: 'word',        term: 'whenever',      meaning: 'every time that; at any time',                               example: 'Whenever I\'m stressed, I go for a run.',                       meaningPt: 'sempre que; toda vez que',                                   examplePt: 'Sempre que estou estressado, vou correr.' },
    { type: 'word',        term: 'however',       meaning: 'on the other hand; despite that',                            example: 'It\'s expensive. However, it\'s worth it.',                     meaningPt: 'porém; no entanto',                                          examplePt: 'É caro. Porém, vale a pena.' },
    { type: 'word',        term: 'therefore',     meaning: 'as a result; for that reason',                               example: 'She studied hard and therefore passed the exam.',               meaningPt: 'portanto; por isso',                                         examplePt: 'Ela estudou muito e portanto passou na prova.' },
    { type: 'word',        term: 'especially',    meaning: 'more than usual; in particular',                             example: 'I love cooking, especially on weekends.',                       meaningPt: 'especialmente; em particular',                               examplePt: 'Adoro cozinhar, especialmente nos fins de semana.' },
    { type: 'word',        term: 'probably',      meaning: 'almost certainly; very likely',                              example: 'It\'s cloudy — it\'s probably going to rain.',                  meaningPt: 'provavelmente; quase certamente',                            examplePt: 'Está nublado — provavelmente vai chover.' },
    { type: 'word',        term: 'suddenly',      meaning: 'quickly and unexpectedly',                                   example: 'Suddenly, the lights went out.',                                meaningPt: 'de repente; subitamente',                                    examplePt: 'De repente, as luzes se apagaram.' },
    { type: 'word',        term: 'recently',      meaning: 'not long ago; in the near past',                             example: 'I recently started learning English.',                          meaningPt: 'recentemente; não faz muito tempo',                          examplePt: 'Comecei a aprender inglês recentemente.' },
    { type: 'word',        term: 'immediately',   meaning: 'at once; without delay',                                     example: 'Call me immediately if anything changes.',                      meaningPt: 'imediatamente; de imediato',                                 examplePt: 'Me ligue imediatamente se algo mudar.' },
    { type: 'word',        term: 'instead',       meaning: 'in place of; as an alternative',                             example: 'I had tea instead of coffee.',                                  meaningPt: 'em vez de; ao invés de',                                    examplePt: 'Tomei chá em vez de café.' },
    { type: 'word',        term: 'during',        meaning: 'throughout or at a point within a time period',              example: 'I fell asleep during the movie.',                               meaningPt: 'durante; ao longo de',                                       examplePt: 'Adormeci durante o filme.' },
    { type: 'word',        term: 'towards',       meaning: 'in the direction of',                                        example: 'She walked towards the door.',                                  meaningPt: 'em direção a; para',                                         examplePt: 'Ela caminhou em direção à porta.' },
    { type: 'word',        term: 'patient',       meaning: 'able to wait calmly without getting frustrated',             example: 'Be patient — learning a language takes time.',                  meaningPt: 'capaz de esperar com calma sem se frustrar',                 examplePt: 'Tenha paciência — aprender um idioma leva tempo.' },
    { type: 'word',        term: 'confident',     meaning: 'feeling certain about your own abilities',                   example: 'She felt confident speaking English at the meeting.',           meaningPt: 'sentir-se seguro quanto às próprias habilidades',            examplePt: 'Ela se sentiu confiante falando inglês na reunião.' },
    { type: 'word',        term: 'obvious',       meaning: 'easy to see or understand; clear',                           example: 'The answer was obvious once she explained it.',                 meaningPt: 'fácil de ver ou entender; claro',                            examplePt: 'A resposta ficou óbvia quando ela explicou.' },
    { type: 'word',        term: 'common',        meaning: 'happening often; found in many places',                      example: '"Get" is one of the most common verbs in English.',             meaningPt: 'que acontece com frequência; encontrado em muitos lugares',  examplePt: '"Get" é um dos verbos mais comuns em inglês.' },
    { type: 'word',        term: 'specific',      meaning: 'clearly defined; exact and detailed',                        example: 'Can you be more specific about what you need?',                 meaningPt: 'claramente definido; exato e detalhado',                     examplePt: 'Você pode ser mais específico sobre o que precisa?' },
    // ── Expressions ──
    { type: 'expression',  term: 'hang on',       meaning: 'wait a moment',                                              example: 'Hang on, I\'ll be right back.',                                 meaningPt: 'espera um momento',                                          examplePt: 'Espera, já volto.' },
    { type: 'expression',  term: 'go ahead',      meaning: 'you can proceed or do something',                            example: 'Go ahead — I\'m listening.',                                   meaningPt: 'você pode prosseguir ou fazer algo',                         examplePt: 'Pode ir — estou ouvindo.' },
    { type: 'expression',  term: 'no wonder',     meaning: 'it\'s not surprising',                                       example: 'No wonder you\'re tired — you worked all day!',                meaningPt: 'não é surpresa',                                             examplePt: 'Não é à toa que você está cansado — trabalhou o dia todo!' },
    { type: 'expression',  term: 'fair enough',   meaning: 'that\'s reasonable or acceptable',                           example: 'A: Can we meet at 3? B: Fair enough, see you then.',            meaningPt: 'isso é razoável ou aceitável',                               examplePt: 'R: Podemos nos encontrar às 3? B: Tudo bem, então.' },
    { type: 'expression',  term: 'of course',     meaning: 'naturally — warmer and more natural than "obviously"',       example: 'Of course I\'ll help you with that.',                           meaningPt: 'naturalmente — mais caloroso do que "obviously"',            examplePt: 'Claro que vou te ajudar com isso.' },
    { type: 'expression',  term: 'never mind',    meaning: 'it doesn\'t matter, forget it',                              example: 'Never mind, I found it myself.',                                meaningPt: 'não importa, esqueça',                                       examplePt: 'Deixa pra lá, eu mesmo encontrei.' },
    { type: 'expression',  term: 'I mean',        meaning: 'used to clarify or rephrase what you just said',             example: 'It was good — I mean, not perfect, but really solid.',          meaningPt: 'quer dizer — usado para esclarecer o que acabou de dizer',  examplePt: 'Foi bom — quer dizer, não perfeito, mas muito sólido.' },
    { type: 'expression',  term: 'you know',      meaning: 'used to check understanding or soften a statement',          example: 'It\'s like, you know, really hard to explain.',                 meaningPt: 'sabe? — usado para verificar compreensão ou suavizar',      examplePt: 'É tipo, sabe, muito difícil de explicar.' },
    { type: 'expression',  term: 'kind of',       meaning: 'somewhat; a little (informal softener)',                     example: 'I\'m kind of tired today — long week.',                         meaningPt: 'meio que; um pouco (suavizador informal)',                   examplePt: 'Estou meio cansado hoje — semana longa.' },
    { type: 'expression',  term: 'sort of',       meaning: 'similar to "kind of" — slightly, in a way',                 example: 'It\'s sort of complicated to explain.',                         meaningPt: 'parecido com "kind of" — de certa forma, um pouco',         examplePt: 'É de certa forma complicado de explicar.' },
    { type: 'expression',  term: 'by the way',    meaning: 'used to introduce a new topic or add a side comment',        example: 'By the way, did you see the news today?',                       meaningPt: 'aliás; a propósito — para introduzir um novo assunto',      examplePt: 'Aliás, você viu as notícias hoje?' },
    { type: 'expression',  term: 'as soon as',    meaning: 'immediately when; the moment that',                          example: 'Call me as soon as you arrive.',                                meaningPt: 'assim que; tão logo',                                        examplePt: 'Me ligue assim que chegar.' },
    { type: 'expression',  term: 'in fact',       meaning: 'used to add emphasis or introduce real information',         example: 'It was great. In fact, it was the best trip of my life.',       meaningPt: 'na verdade; de fato — para enfatizar ou acrescentar',       examplePt: 'Foi ótimo. De fato, foi a melhor viagem da minha vida.' },
    { type: 'expression',  term: 'at least',      meaning: 'not less than; used to find a positive in a bad situation',  example: 'The hotel wasn\'t great, but at least it was clean.',           meaningPt: 'pelo menos; ao menos',                                       examplePt: 'O hotel não era ótimo, mas pelo menos estava limpo.' },
    { type: 'expression',  term: 'as well',       meaning: 'in addition; too (used at the end of a sentence)',           example: 'She speaks French and German as well.',                         meaningPt: 'também; além disso (no final da frase)',                     examplePt: 'Ela fala francês e alemão também.' },
    { type: 'expression',  term: 'I see',         meaning: 'showing you understand or have just realised something',     example: 'I see — so the meeting was moved to Thursday?',                 meaningPt: 'entendo; ah, entendi — mostra que você compreendeu',         examplePt: 'Entendo — então a reunião foi movida para quinta?' },
    { type: 'expression',  term: 'more or less',  meaning: 'approximately; roughly',                                     example: 'It takes more or less an hour to get there by train.',          meaningPt: 'mais ou menos; aproximadamente',                             examplePt: 'Leva mais ou menos uma hora para chegar de trem.' },
    { type: 'expression',  term: 'take it easy',  meaning: 'relax; don\'t worry; slow down',                             example: 'Take it easy — there\'s no rush, we have plenty of time.',      meaningPt: 'relaxa; não se preocupa; vai com calma',                    examplePt: 'Vai com calma — não há pressa, temos bastante tempo.' },
    // ── Phrasal verbs ──
    { type: 'phrasal verb', term: 'give up',      meaning: 'to stop trying; to quit',                                    example: 'Don\'t give up — you\'re so close to finishing!',               meaningPt: 'desistir; parar de tentar',                                  examplePt: 'Não desista — você está tão perto de terminar!' },
    { type: 'phrasal verb', term: 'look up',      meaning: 'to search for information in a book or online',              example: 'I always look up new words in the dictionary.',                 meaningPt: 'procurar uma informação num livro ou online',                examplePt: 'Sempre procuro palavras novas no dicionário.' },
    { type: 'phrasal verb', term: 'show up',      meaning: 'to arrive somewhere; to appear',                             example: 'He didn\'t show up to the meeting — no one knows why.',         meaningPt: 'aparecer em algum lugar; chegar',                            examplePt: 'Ele não apareceu na reunião — ninguém sabe por quê.' },
    { type: 'phrasal verb', term: 'pick up',      meaning: 'to learn something informally; to collect something',        example: 'I picked up a lot of English just by watching series.',         meaningPt: 'aprender algo de forma informal; pegar algo',                examplePt: 'Aprendi muito inglês só assistindo a séries.' },
    { type: 'phrasal verb', term: 'find out',     meaning: 'to discover or learn new information',                       example: 'I just found out the exam is tomorrow — not next week.',        meaningPt: 'descobrir ou aprender uma informação nova',                  examplePt: 'Descobri que a prova é amanhã — não na semana que vem.' },
    { type: 'phrasal verb', term: 'wake up',      meaning: 'to stop sleeping; to become aware',                          example: 'I wake up at 7 every day, even on weekends.',                   meaningPt: 'acordar; parar de dormir',                                   examplePt: 'Acordo às 7 todos os dias, até nos fins de semana.' },
    // ── Idioms ──
    { type: 'idiom',        term: 'break the ice',  meaning: 'start a conversation in a social situation',               example: 'He told a joke to break the ice at the meeting.',               meaningPt: 'iniciar uma conversa em uma situação social',                examplePt: 'Ele contou uma piada para quebrar o gelo na reunião.' },
    { type: 'idiom',        term: 'piece of cake',  meaning: 'something very easy to do',                                example: 'The test was a piece of cake — I finished in 10 minutes.',      meaningPt: 'algo muito fácil de fazer',                                  examplePt: 'A prova foi moleza — terminei em 10 minutos.' },
    { type: 'idiom',        term: 'under the weather', meaning: 'feeling slightly ill or unwell',                        example: 'I\'m feeling a bit under the weather — I might stay home.',      meaningPt: 'sentindo-se um pouco mal ou indisposto',                    examplePt: 'Estou me sentindo um pouco mal — talvez fique em casa.' },
    { type: 'idiom',        term: 'on the tip of my tongue', meaning: 'you almost remember something but can\'t quite', example: 'His name is on the tip of my tongue — I just can\'t get it.',   meaningPt: 'quase lembro de algo, mas não consigo',                     examplePt: 'O nome dele está na ponta da língua — não consigo lembrar.' },
    { type: 'idiom',        term: 'better late than never', meaning: 'it\'s better to do something late than not at all', example: 'You finally finished the course — better late than never!',   meaningPt: 'melhor tarde do que nunca',                                  examplePt: 'Você finalmente terminou o curso — melhor tarde do que nunca!' },
    { type: 'idiom',        term: 'bite off more than you can chew', meaning: 'take on more than you can handle',       example: 'Don\'t bite off more than you can chew with all those classes.', meaningPt: 'assumir mais do que você consegue lidar',                  examplePt: 'Não assuma mais do que consegue com tantas aulas.' },
    { type: 'idiom',        term: 'cost an arm and a leg', meaning: 'to be very expensive',                              example: 'That new phone costs an arm and a leg.',                        meaningPt: 'custar muito caro; custar os olhos da cara',                 examplePt: 'Aquele celular novo custa os olhos da cara.' },
    { type: 'idiom',        term: 'hit the sack',   meaning: 'to go to bed; to go to sleep',                             example: 'I\'m exhausted — I\'m going to hit the sack early tonight.',   meaningPt: 'ir dormir; ir para a cama',                                  examplePt: 'Estou exausto — vou dormir cedo hoje à noite.' },
    { type: 'idiom',        term: 'once in a while', meaning: 'occasionally; sometimes but not often',                   example: 'I don\'t eat junk food often — only once in a while.',          meaningPt: 'de vez em quando; às vezes, mas não com frequência',        examplePt: 'Não como junk food sempre — só de vez em quando.' },
  ],
  Inter: [
    // ── Phrasal verbs ──
    { type: 'phrasal verb', term: 'bring up',      meaning: 'to mention a topic in conversation',                        example: 'She brought up the salary issue during the meeting.' },
    { type: 'phrasal verb', term: 'put off',       meaning: 'to postpone or delay something',                            example: 'Stop putting off your homework — do it now.' },
    { type: 'phrasal verb', term: 'run into',      meaning: 'to meet someone unexpectedly',                              example: 'I ran into my old teacher at the supermarket.' },
    { type: 'phrasal verb', term: 'give away',     meaning: 'to reveal information unintentionally',                     example: 'His nervous laugh gave away that he was lying.' },
    { type: 'phrasal verb', term: 'look into',     meaning: 'to investigate or research something',                      example: 'I\'ll look into the problem and get back to you.' },
    { type: 'phrasal verb', term: 'take on',       meaning: 'to accept a challenge or responsibility',                   example: 'She decided to take on the new project.' },
    { type: 'phrasal verb', term: 'come across',   meaning: 'to seem a certain way, or find something by chance',        example: 'He came across as very confident in the interview.' },
    { type: 'phrasal verb', term: 'figure out',    meaning: 'to understand or solve something',                          example: 'I couldn\'t figure out how to fix the error.' },
    { type: 'phrasal verb', term: 'turn down',     meaning: 'to reject an offer or request',                             example: 'She turned down the job offer — the salary was too low.' },
    { type: 'phrasal verb', term: 'catch up',      meaning: 'to reach the same level as others; to update someone',      example: 'I need to catch up on the emails I missed this week.' },
    { type: 'phrasal verb', term: 'back up',       meaning: 'to support someone; to save a copy of data',                example: 'Can you back me up in the meeting? And back up your files!' },
    { type: 'phrasal verb', term: 'carry out',     meaning: 'to complete or perform a task or plan',                     example: 'The team carried out the project on time and under budget.' },
    { type: 'phrasal verb', term: 'set up',        meaning: 'to establish, arrange, or prepare something',               example: 'She set up a new business after leaving her old job.' },
    { type: 'phrasal verb', term: 'deal with',     meaning: 'to handle or manage a situation or problem',                example: 'How do you deal with difficult clients at work?' },
    { type: 'phrasal verb', term: 'point out',     meaning: 'to draw attention to something; to mention',                example: 'He pointed out several errors in my presentation.' },
    { type: 'phrasal verb', term: 'fall apart',    meaning: 'to break into pieces; to fall into disorder',               example: 'The project started to fall apart after the manager left.' },
    { type: 'phrasal verb', term: 'go through',    meaning: 'to experience something; to examine carefully',             example: 'Let\'s go through the report together before the meeting.' },
    { type: 'phrasal verb', term: 'break down',    meaning: 'to stop working; to lose emotional control',                example: 'The car broke down on the motorway. She broke down in tears.' },
    { type: 'phrasal verb', term: 'hold on',       meaning: 'to wait; to grip something tightly',                        example: 'Hold on — I just need to check one thing.' },
    { type: 'phrasal verb', term: 'wrap up',       meaning: 'to finish or conclude something',                           example: 'Let\'s wrap up the meeting — we\'re running out of time.' },
    { type: 'phrasal verb', term: 'take up',       meaning: 'to begin a new hobby or activity',                          example: 'She took up running after the lockdown and never stopped.' },
    { type: 'phrasal verb', term: 'bring about',   meaning: 'to cause something to happen',                              example: 'The new policy brought about significant changes in the team.' },
    { type: 'phrasal verb', term: 'draw on',       meaning: 'to use experience or knowledge as a resource',              example: 'She drew on ten years of teaching experience for her talk.' },
    { type: 'phrasal verb', term: 'cut back on',   meaning: 'to reduce the amount of something',                         example: 'The company cut back on travel expenses to reduce costs.' },
    // ── Idioms ──
    { type: 'idiom',        term: 'hit the nail on the head', meaning: 'to describe something exactly right',            example: 'That\'s exactly it — you really hit the nail on the head.' },
    { type: 'idiom',        term: 'bite the bullet',  meaning: 'to endure a painful situation bravely',                  example: 'I bit the bullet and went to the dentist.' },
    { type: 'idiom',        term: 'on the fence',     meaning: 'undecided about something',                              example: 'I\'m still on the fence about moving to a new city.' },
    { type: 'idiom',        term: 'cost an arm and a leg', meaning: 'to be very expensive',                              example: 'That renovation is going to cost an arm and a leg.' },
    { type: 'idiom',        term: 'get the hang of it', meaning: 'to gradually learn how to do something well',          example: 'Keep practising — you\'ll get the hang of it soon.' },
    { type: 'idiom',        term: 'the ball is in your court', meaning: 'it\'s your turn to take action or decide',     example: 'I\'ve made my offer. The ball is in your court now.' },
    { type: 'idiom',        term: 'the last straw',   meaning: 'the final problem that makes a situation unbearable',    example: 'Being late again was the last straw — she quit immediately.' },
    { type: 'idiom',        term: 'beat around the bush', meaning: 'to avoid talking about the main point directly',    example: 'Stop beating around the bush and tell me what happened.' },
    { type: 'idiom',        term: 'once in a blue moon', meaning: 'very rarely; almost never',                           example: 'I only eat fast food once in a blue moon.' },
    { type: 'idiom',        term: 'pull someone\'s leg', meaning: 'to tease or joke with someone',                       example: 'A: You won the lottery! B: Are you pulling my leg?' },
    { type: 'idiom',        term: 'see eye to eye',   meaning: 'to agree with someone on something',                     example: 'We don\'t always see eye to eye, but we respect each other.' },
    { type: 'idiom',        term: 'ring a bell',      meaning: 'to sound familiar; to remind you of something',          example: 'That name rings a bell — did we meet at the conference?' },
    { type: 'idiom',        term: 'a blessing in disguise', meaning: 'something that seems bad but is actually good',   example: 'Losing that job was a blessing in disguise — I found a better one.' },
    { type: 'idiom',        term: 'get cold feet',    meaning: 'to suddenly feel nervous about doing something',         example: 'She got cold feet before the presentation but nailed it anyway.' },
    { type: 'idiom',        term: 'back to square one', meaning: 'having to start again from the beginning',            example: 'The client rejected everything — we\'re back to square one.' },
    // ── Expressions ──
    { type: 'expression',   term: 'to be honest',     meaning: 'used before a frank or direct opinion',                  example: 'To be honest, I don\'t think that plan will work.' },
    { type: 'expression',   term: 'as far as I know', meaning: 'based on what I know — with some uncertainty',           example: 'As far as I know, the meeting is still on for Friday.' },
    { type: 'expression',   term: 'let alone',        meaning: 'not to mention — for increasingly unlikely things',      example: 'I can barely afford rent, let alone a holiday.' },
    { type: 'expression',   term: 'in a nutshell',    meaning: 'in brief; summarising the key point',                    example: 'In a nutshell, the project is over budget and behind schedule.' },
    { type: 'expression',   term: 'easier said than done', meaning: 'something sounds simple but is actually difficult', example: '"Just relax." — Easier said than done when you\'re under pressure.' },
    { type: 'expression',   term: 'for what it\'s worth', meaning: 'used before an opinion that may or may not be useful', example: 'For what it\'s worth, I think you made the right call.' },
    { type: 'expression',   term: 'on second thought', meaning: 'after reconsidering something',                         example: 'On second thought, let\'s postpone the meeting to Friday.' },
    { type: 'expression',   term: 'that said',        meaning: 'however; in contrast to what was just said',             example: 'The report is long. That said, it covers everything we need.' },
    { type: 'expression',   term: 'as it turns out',  meaning: 'used to introduce a surprising or unexpected result',    example: 'As it turns out, the cheapest option was also the best.' },
    // ── Words ──
    { type: 'word',         term: 'ambiguous',        meaning: 'open to more than one interpretation; unclear',          example: 'His answer was ambiguous — I wasn\'t sure what he meant.' },
    { type: 'word',         term: 'elaborate',        meaning: 'to explain or describe something in more detail',        example: 'Could you elaborate on that point? I\'d like to know more.' },
    { type: 'word',         term: 'compelling',       meaning: 'convincing and interesting; difficult to ignore',        example: 'She made a compelling argument for changing the strategy.' },
    { type: 'word',         term: 'subtle',           meaning: 'not obvious; delicate and hard to notice',               example: 'There\'s a subtle difference between "affect" and "effect".' },
    { type: 'word',         term: 'concise',          meaning: 'giving a lot of information clearly and in few words',   example: 'Keep your email concise — no one reads long messages.' },
    { type: 'word',         term: 'assertive',        meaning: 'confident and direct in expressing opinions',            example: 'You need to be more assertive in meetings — speak up!' },
    { type: 'word',         term: 'prevalent',        meaning: 'widespread; very common in a place or time',             example: 'Remote work is now prevalent across most industries.' },
    { type: 'word',         term: 'tentative',        meaning: 'uncertain; not final or definite',                       example: 'We have a tentative plan, but nothing is confirmed yet.' },
    { type: 'word',         term: 'versatile',        meaning: 'able to adapt to many situations or uses',               example: 'She\'s a versatile writer — she does fiction, essays, and scripts.' },
  ],
  Advanced: [
    // ── Words ──
    { type: 'word',         term: 'albeit',           meaning: 'even though — used for concession mid-sentence',         example: 'It was a successful event, albeit a small one.' },
    { type: 'word',         term: 'concede',          meaning: 'to admit something is true, often reluctantly',          example: 'I have to concede that you make a valid point.' },
    { type: 'word',         term: 'nuance',           meaning: 'a subtle difference in meaning, tone, or expression',    example: 'There\'s a nuance between "confident" and "arrogant".' },
    { type: 'word',         term: 'mitigate',         meaning: 'to reduce the severity or impact of something',          example: 'Good preparation can mitigate the risk of failure.' },
    { type: 'word',         term: 'candid',           meaning: 'truthful and straightforward',                           example: 'Can I give you a candid opinion? I think you need more practice.' },
    { type: 'word',         term: 'pragmatic',        meaning: 'dealing with things sensibly and realistically',         example: 'Let\'s be pragmatic — we don\'t have the budget for that.' },
    { type: 'word',         term: 'eloquent',         meaning: 'expressing ideas clearly and effectively in speech or writing', example: 'Her eloquent defence of the proposal won over the board.' },
    { type: 'word',         term: 'lucid',            meaning: 'easy to understand; clear and rational',                 example: 'Despite the complexity, his explanation was remarkably lucid.' },
    { type: 'word',         term: 'unequivocal',      meaning: 'leaving no doubt; completely clear',                     example: 'The CEO gave an unequivocal statement: there will be no layoffs.' },
    { type: 'word',         term: 'reticent',         meaning: 'not revealing one\'s thoughts or feelings readily',      example: 'He was reticent about his plans — no one knew what he was thinking.' },
    { type: 'word',         term: 'ostensibly',       meaning: 'apparently or on the surface — but possibly not really', example: 'The meeting was ostensibly about budget, but the real issue was leadership.' },
    { type: 'word',         term: 'prerogative',      meaning: 'an exclusive right or privilege',                        example: 'It\'s entirely your prerogative to decline the offer.' },
    { type: 'word',         term: 'pervasive',        meaning: 'spreading widely throughout; present everywhere',        example: 'There\'s a pervasive sense of uncertainty in the market right now.' },
    { type: 'word',         term: 'delineate',        meaning: 'to describe or portray something precisely',             example: 'The report delineates the key risks facing the organisation.' },
    { type: 'word',         term: 'commensurate',     meaning: 'corresponding in size or degree; proportionate',         example: 'The salary should be commensurate with experience and qualifications.' },
    { type: 'word',         term: 'amalgamate',       meaning: 'to combine or unite different things into one',          example: 'The two departments were amalgamated to reduce overhead costs.' },
    { type: 'word',         term: 'circumvent',       meaning: 'to find a way around an obstacle or rule',               example: 'They tried to circumvent the policy, but the board refused.' },
    { type: 'word',         term: 'exacerbate',       meaning: 'to make a problem or bad situation worse',               example: 'The lack of sleep only exacerbated her anxiety before the talk.' },
    { type: 'word',         term: 'tenacious',        meaning: 'determined; refusing to give up easily',                 example: 'He\'s a tenacious negotiator — he never walks away empty-handed.' },
    { type: 'word',         term: 'succinct',         meaning: 'expressed briefly and clearly; to the point',            example: 'Her succinct summary saved everyone thirty minutes of reading.' },
    { type: 'word',         term: 'paradoxical',      meaning: 'seemingly contradictory but possibly true or well-founded', example: 'It\'s paradoxical — the busier I am, the more I seem to get done.' },
    // ── Idioms ──
    { type: 'idiom',        term: 'read between the lines', meaning: 'to understand the hidden or implied meaning',      example: 'Read between the lines — she said "fine" but she\'s not happy.' },
    { type: 'idiom',        term: 'burn bridges',     meaning: 'to permanently damage a relationship or opportunity',    example: 'Don\'t burn bridges with your old employer — you may need them.' },
    { type: 'idiom',        term: 'the tip of the iceberg', meaning: 'a small visible part of a much larger problem',   example: 'The complaints we heard are just the tip of the iceberg.' },
    { type: 'idiom',        term: 'take with a grain of salt', meaning: 'to be skeptical about something you\'ve heard', example: 'Take those reviews with a grain of salt — they may be fake.' },
    { type: 'idiom',        term: 'devil\'s advocate', meaning: 'arguing the opposite side to explore all angles',       example: 'Let me play devil\'s advocate — what if the opposite is true?' },
    { type: 'idiom',        term: 'push the envelope', meaning: 'to go beyond accepted limits; try something new',       example: 'This design really pushes the envelope in modern architecture.' },
    { type: 'idiom',        term: 'a double-edged sword', meaning: 'something with both advantages and disadvantages',   example: 'Social media is a double-edged sword — great for reach, risky for reputation.' },
    { type: 'idiom',        term: 'split hairs',      meaning: 'to make overly fine distinctions; argue about details',  example: 'We\'re splitting hairs here — both options are essentially the same.' },
    { type: 'idiom',        term: 'throw in the towel', meaning: 'to admit defeat; to give up',                          example: 'After three failed attempts, he finally threw in the towel.' },
    { type: 'idiom',        term: 'cut corners',      meaning: 'to do something poorly to save time or money',           example: 'Cutting corners on safety is never acceptable in this industry.' },
    { type: 'idiom',        term: 'on thin ice',      meaning: 'in a risky or precarious situation',                     example: 'After that comment, he\'s on very thin ice with his manager.' },
    { type: 'idiom',        term: 'go to great lengths', meaning: 'to make a big effort to achieve something',           example: 'She went to great lengths to ensure the client was satisfied.' },
    { type: 'idiom',        term: 'hold your ground', meaning: 'to maintain your position under pressure',               example: 'Negotiations were tough, but she held her ground throughout.' },
    { type: 'idiom',        term: 'in the same boat', meaning: 'in the same difficult situation as someone else',        example: 'We\'re all in the same boat here — none of us knows what\'s coming.' },
    { type: 'idiom',        term: 'wear many hats',   meaning: 'to have many different roles or responsibilities',       example: 'In a startup you wear many hats — today I\'m designer, tomorrow I\'m HR.' },
    { type: 'idiom',        term: 'move the goalposts', meaning: 'to change the rules or expectations unfairly',        example: 'Every time we meet the target, they move the goalposts.' },
    // ── Expressions ──
    { type: 'expression',   term: 'by the same token', meaning: 'for the same reason / in the same way',               example: 'He\'s talented, but by the same token, so are the other candidates.' },
    { type: 'expression',   term: 'to put it bluntly', meaning: 'to say something directly, even if it\'s harsh',       example: 'To put it bluntly, your report needs a complete rewrite.' },
    { type: 'expression',   term: 'needless to say',  meaning: 'it should be obvious — use sparingly to avoid arrogance', example: 'Needless to say, we were all shocked by the news.' },
    { type: 'expression',   term: 'all things considered', meaning: 'taking everything into account; overall',          example: 'All things considered, I think the project went quite well.' },
    { type: 'expression',   term: 'with that in mind', meaning: 'taking the previous point into consideration',         example: 'The data is inconclusive. With that in mind, I\'d recommend caution.' },
    { type: 'expression',   term: 'on the face of it', meaning: 'based on initial appearances; superficially',         example: 'On the face of it, the proposal looks attractive. But read the small print.' },
    { type: 'expression',   term: 'it goes without saying', meaning: 'something is so obvious it barely needs to be stated', example: 'It goes without saying that confidentiality is essential here.' },
    { type: 'expression',   term: 'in the final analysis', meaning: 'when everything has been considered; ultimately',  example: 'In the final analysis, the project failed due to poor communication.' },
    { type: 'expression',   term: 'to no avail',      meaning: 'without success; despite efforts',                      example: 'She tried to reach him several times, but to no avail.' },
    { type: 'expression',   term: 'strike a balance', meaning: 'to find an acceptable middle point between extremes',   example: 'The policy tries to strike a balance between security and privacy.' },
    { type: 'expression',   term: 'lend weight to',   meaning: 'to add support or credibility to an argument',          example: 'This new evidence lends weight to the prosecution\'s case.' },
    { type: 'expression',   term: 'read the room',    meaning: 'to understand the mood or feelings of the people around you', example: 'He kept making jokes — he clearly couldn\'t read the room.' },
    { type: 'expression',   term: 'at face value',    meaning: 'accepting something as it appears without questioning deeper', example: 'Don\'t take his offer at face value — read the contract first.' },
    // ── Phrasal verbs ──
    { type: 'phrasal verb', term: 'gloss over',       meaning: 'to treat something briefly without proper attention',   example: 'The report glosses over some serious financial problems.' },
    { type: 'phrasal verb', term: 'call into question', meaning: 'to cause doubt about something',                      example: 'The new findings call into question the entire research methodology.' },
    { type: 'phrasal verb', term: 'bear out',         meaning: 'to confirm or support the truth of something',          example: 'The results bear out the hypothesis we proposed last year.' },
    { type: 'phrasal verb', term: 'give rise to',     meaning: 'to cause or produce something',                         example: 'The merger gave rise to serious concerns about market competition.' },
    { type: 'phrasal verb', term: 'flesh out',        meaning: 'to add more detail or substance to an idea or plan',    example: 'The concept is good — let\'s flesh it out before the next meeting.' },
    { type: 'phrasal verb', term: 'narrow down',      meaning: 'to reduce a list of options to the most likely',        example: 'We\'ve narrowed down the candidates to three finalists.' },
    { type: 'phrasal verb', term: 'iron out',         meaning: 'to resolve difficulties or small problems',             example: 'There are a few details to iron out before we can sign the contract.' },
  ],
};

const TIP_STYLE: Record<string, { bg: string; color: string }> = {
  'word':         { bg: '#F0FFD9', color: '#3D8800' },
  'expression':   { bg: '#EFF6FF', color: '#1D4ED8' },
  'phrasal verb': { bg: '#FDF2F8', color: '#BE185D' },
  'idiom':        { bg: '#F5F3FF', color: '#6D28D9' },
};

function getTip(level: string, seed: number): Tip {
  const pool = TIPS[level] ?? TIPS.Novice;
  return pool[seed % pool.length];
}

// ── Typing Dots — matches ChatBox TypingIndicator, white dots for dark bubble ──

function TypingDots() {
  // Same animation as ChatBox.TypingIndicator: opacity 0→1→0, staggered 200ms
  const dots = [0, 1, 2].map(() => useRef(new Animated.Value(0)).current);

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      ),
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []); // eslint-disable-line

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 }}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.75)', opacity: dot }}
        />
      ))}
    </View>
  );
}

// ── XP Ring ───────────────────────────────────────────────────

function XPRing({ todayXP, goal }: { todayXP: number; goal: number }) {
  const SIZE = 50, SW = 5;
  const r    = (SIZE - SW) / 2;
  const circ = 2 * Math.PI * r;
  const prog = Math.min(todayXP / goal, 1);
  const done = prog >= 1;

  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
        <Circle cx={SIZE/2} cy={SIZE/2} r={r} stroke={C.navyGhost} strokeWidth={SW} fill="none" />
        {prog > 0 && (
          <Circle
            cx={SIZE/2} cy={SIZE/2} r={r}
            stroke={C.greenDark}
            strokeWidth={SW} fill="none"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - prog)}
            strokeLinecap="round"
            transform={`rotate(-90 ${SIZE/2} ${SIZE/2})`}
          />
        )}
      </Svg>
      <AppText style={{ fontSize: 12, fontWeight: '900', color: C.navy }}>
        {todayXP}
      </AppText>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
//  HOME SCREEN
// ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { profile, isFreshLogin } = useAuth();
  const { openPaywall } = usePaywallContext();
  const insets = useSafeAreaInsets();
  const userId = profile?.id ?? '';
  const level  = (profile?.charlotte_level ?? 'Novice') as UserLevel;
  const name   = profile?.name ?? profile?.email?.split('@')[0] ?? 'Student';
  const config = LEVEL_CONFIG[level];
  const { colors: T, isDark } = useTheme();
  // Dentro do componente, C = T para que todos os estilos respondam ao dark mode
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const C = T;
  const isOnline = useNetworkStatus();
  const { triggerToast } = useXPToast();
  const levelAccent: string = level === 'Novice' ? '#D97706' : level === 'Inter' ? '#7C3AED' : '#0F766E';
  const levelAccentBg: string = level === 'Novice' ? '#FFFBEB' : level === 'Inter' ? '#F5F3FF' : '#F0FDFA';

  // Beta: new tab-based layout
  if (profile?.beta_features?.includes('new_layout')) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  // Trial badge — days remaining for non-institutional users on trial
  const trialDaysLeft = useMemo(() => {
    if (!profile || profile.is_institutional) return null;
    if (profile.subscription_status !== 'trial') return null;
    if (!profile.trial_ends_at) return null;
    const diff = new Date(profile.trial_ends_at).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }, [profile]);

  const [data, setData]             = useState<HomeData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTipModal, setShowTipModal]   = useState(false);
  const [showLiveVoice, setShowLiveVoice]           = useState(false);
  const [liveVoiceRemaining, setLiveVoiceRemaining] = useState<number | null>(null);
  const [pendingReviews, setPendingReviews]         = useState<ReviewItem[]>([]);
  const [vocabDueCount,  setVocabDueCount]          = useState(0);
  const [weeklyState, setWeeklyState]               = useState<WeeklyChallengeState | null>(null);
  const [aiGreeting, setAiGreeting]         = useState<string | null>(null);
  const [greetingLoading, setGreetingLoading] = useState(true);
  // Tracks weekly challenge rewards already granted this session to prevent double-credit
  const weeklyRewardedRef  = useRef<Set<string>>(new Set());

  // Track which mission rewards were already granted today (persisted in charlotte_practices)
  const rewardedMissionsRef = React.useRef<Set<string>>(new Set());
  const rewardSeedLoadedRef = React.useRef(false);
  // Prevent concurrent fetchData calls (race condition → double mission grants)
  const isFetchingRef = React.useRef(false);

  // Tour
  const { startTour }       = useTour();
  const scrollViewRef       = useRef<any>(null);
  const headerRef           = useRef<any>(null);
  const charlotteCardRef    = useRef<any>(null);
  const goalsBannerRef      = useRef<any>(null);
  const learnTrailRef       = useRef<any>(null);
  const reviewCardRef       = useRef<any>(null);
  const myVocabRef          = useRef<any>(null);
  const grammarRef          = useRef<any>(null);
  const pronunciationRef    = useRef<any>(null);
  const chatRef             = useRef<any>(null);
  const liveVoiceRef        = useRef<any>(null);
  const vocabFABRef         = useRef<any>(null);
  const tipBarRef           = useRef<any>(null);
  const practiceYRef        = useRef(0);
  // Streak sound deferred while WelcomeModal voice-over is playing
  const isFreshLoginRef   = React.useRef(isFreshLogin);
  const pendingStreakRef  = React.useRef(false);
  useEffect(() => { isFreshLoginRef.current = isFreshLogin; }, [isFreshLogin]);
  // When WelcomeModal is dismissed (isFreshLogin → false), play any pending streak sound
  useEffect(() => {
    if (!isFreshLogin && pendingStreakRef.current) {
      pendingStreakRef.current = false;
      setTimeout(() => soundEngine.play('streak_alive').catch(() => {}), 800);
    }
  }, [isFreshLogin]);
  // streakSoundPlayed: uses module-level var so it survives component remounts

  const fetchData = useCallback(async () => {
    if (!userId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
    // localMidnightUTC(): meia-noite de hoje no fuso local, convertida para UTC.
    // Correto para qualquer país — não assume UTC=local.
    const todayISO = localMidnightUTC().toISOString();
    const [prog, prac, achToday] = await Promise.all([
      supabase.from('charlotte_progress').select('streak_days,total_xp,last_practice_date').eq('user_id', userId).maybeSingle(),
      supabase.from('charlotte_practices').select('practice_type,xp_earned').eq('user_id', userId).gte('created_at', todayISO),
      // Achievement bonuses earned today (go via direct UPDATE, not in charlotte_practices)
      supabase.from('user_achievements').select('xp_bonus').eq('user_id', userId).gte('earned_at', todayISO),
    ]);
    const practices         = prac.data ?? [];
    const practicesXP       = practices.reduce((s, p) => s + (p.xp_earned ?? 0), 0);
    const achievementXP     = (achToday.data ?? []).reduce((s: number, a: any) => s + (a.xp_bonus ?? 0), 0);
    const todayXP           = practicesXP + achievementXP;
    const userTotalXP       = prog.data?.total_xp ?? 0;

    // Seed already-rewarded missions from DB (only once per session)
    if (!rewardSeedLoadedRef.current) {
      rewardSeedLoadedRef.current = true;
      practices
        .filter(p => p.practice_type.startsWith('mission_reward_'))
        .forEach(p => rewardedMissionsRef.current.add(p.practice_type));
    }

    // Dynamic rank: count charlotte_leaderboard_cache entries in same level with strictly higher total_xp
    const { count: higherCount } = await supabase
      .from('charlotte_leaderboard_cache')
      .select('*', { count: 'exact', head: true })
      .eq('user_level', level)
      .gt('total_xp', userTotalXP);
    const computedRank = (higherCount ?? 0) + 1;

    // Streak só é válido se praticou hoje ou ontem no fuso do device.
    // Se last_practice_date for mais antigo, o streak já quebrou mas o DB ainda não sabe.
    const lastPracticeDate = prog.data?.last_practice_date ?? null; // 'YYYY-MM-DD'
    const todayStr = localTodayStr();
    const yesterdayStr = (() => {
      const d = new Date(); d.setDate(d.getDate() - 1);
      const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    })();
    const streakAlive = lastPracticeDate === todayStr || lastPracticeDate === yesterdayStr;
    const streakDays = streakAlive ? (prog.data?.streak_days ?? 0) : 0;

    const newData: HomeData = {
      streakDays,
      totalXP:       userTotalXP,
      todayXP,
      rank:          userTotalXP > 0 ? computedRank : null,
      todayMessages: practices.filter(p => ['text_message','audio_message'].includes(p.practice_type)).length,
      todayAudios:   practices.filter(p => p.practice_type === 'audio_message').length,
    };

    // Grant mission rewards for newly completed missions (idempotent via rewardedMissionsRef)
    const missions = buildMissions(newData, level);
    let missionXPGranted = 0;
    for (const m of missions) {
      const rewardKey = `mission_reward_${m.id}`;
      if (m.completed && !rewardedMissionsRef.current.has(rewardKey)) {
        rewardedMissionsRef.current.add(rewardKey);
        const { error } = await supabase.from('charlotte_practices').insert({
          user_id:       userId,
          practice_type: rewardKey,
          xp_earned:     m.xpReward,
        });
        if (error) {
          console.warn('⚠️ mission reward error:', error.message);
          rewardedMissionsRef.current.delete(rewardKey); // rollback on failure
        } else {
          missionXPGranted += m.xpReward;
        }
      }
    }
    // Reflect granted reward XP immediately so Total matches Hoje
    if (missionXPGranted > 0) {
      newData.totalXP += missionXPGranted;
      newData.todayXP += missionXPGranted;
    }
    setData(newData);

    // 🔊 Som de streak — toca UMA VEZ POR DIA quando há streak ativo.
    // Se o WelcomeModal estiver aberto (isFreshLogin=true), adia o som até ele fechar.
    if (!_streakSoundPlayedThisSession && newData.streakDays > 0) {
      const today = localTodayStr(); // YYYY-MM-DD no fuso do device
      const streakKey = `streak_sound_played_${userId}`;
      SecureStore.getItemAsync(streakKey).then(lastPlayed => {
        if (lastPlayed !== today) {
          _streakSoundPlayedThisSession = true;
          SecureStore.setItemAsync(streakKey, today).catch(() => {});
          if (isFreshLoginRef.current) {
            // WelcomeModal está visível — aguardar dismissal para tocar depois
            pendingStreakRef.current = true;
          } else {
            setTimeout(() => soundEngine.play('streak_alive').catch(() => {}), 800);
          }
        } else {
          _streakSoundPlayedThisSession = true; // skip but mark so we don't check again
        }
      }).catch(() => {});
    }
    // Cache para uso offline
    cacheHomeData({ ...newData, cachedAt: Date.now() }).catch(() => {});
    } catch (e) {
      console.warn('⚠️ fetchData error:', e);
      // Offline fallback: tentar carregar dados cacheados
      if (!data) {
        const cached = await getCachedHomeData().catch(() => null);
        if (cached) {
          setData({
            streakDays:    cached.streakDays,
            totalXP:       cached.totalXP,
            todayXP:       cached.todayXP,
            rank:          cached.rank,
            todayMessages: cached.todayMessages,
            todayAudios:   cached.todayAudios,
          });
        }
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [userId, level]);

  useEffect(() => {
    if (!userId) return;
    identifyUser(userId, level);
    track('app_open');
    // Atualiza last_seen_at — rastreia abertura do app independente de prática concluída
    supabase.from('charlotte_users').update({ last_seen_at: new Date().toISOString() }).eq('id', userId).then(() => {});
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [userId]); // eslint-disable-line

  useFocusEffect(useCallback(() => {
    if (userId) fetchData();
  }, [fetchData]));

  // Dispara o tour da home ao focar na tela (re-dispara após resetTour)
  useFocusEffect(useCallback(() => {
    if (!data) return;
    const pt = level === 'Novice';
    const scrollToPractice = async () => {
      scrollViewRef.current?.scrollTo({ y: Math.max(0, practiceYRef.current - 100), animated: false });
      await new Promise<void>(r => setTimeout(r, 180));
    };
    startTour('HOME', [
      {
        ref: headerRef,
        spotlightRadius: 20,
        title: pt ? 'Seu progresso' : 'Your progress',
        description: pt
          ? 'Sua sequência de dias, XP total e ranking global. Toque para ver seu histórico completo.'
          : 'Your daily streak, total XP and global rank. Tap to see your full activity history.',
      },
      {
        ref: charlotteCardRef,
        spotlightRadius: 22,
        title: pt ? 'Charlotte, sua tutora' : 'Charlotte, your tutor',
        description: pt
          ? 'A Charlotte te saúda com uma mensagem personalizada toda vez que você abre o app. O anel mostra sua meta de XP diária.'
          : 'Charlotte greets you with a personalised message every time you open the app. The ring tracks your daily XP goal.',
      },
      {
        ref: goalsBannerRef,
        spotlightRadius: 14,
        title: pt ? 'Metas diárias' : 'Goals',
        description: pt
          ? 'Missões diárias e desafio semanal com XP bônus. Complete para manter sua sequência.'
          : 'Daily missions and weekly challenge with bonus XP. Complete them to keep your streak going.',
      },
      {
        ref: learnTrailRef,
        spotlightRadius: 18,
        title: pt ? 'Trilha de Aprendizado' : 'Learning Trail',
        description: pt
          ? 'Lições estruturadas de gramática e pronúncia organizadas em módulos progressivos.'
          : 'Structured grammar and pronunciation lessons organised in progressive modules.',
      },
      {
        ref: reviewCardRef,
        spotlightRadius: 18,
        title: pt ? 'Revisão' : 'Review',
        description: pt
          ? 'Quando tiver tópicos ou vocabulário para revisar, este card acende com o número pendente.'
          : 'When you have topics or vocabulary to review, this card lights up with the pending count.',
      },
      {
        ref: myVocabRef,
        spotlightRadius: 14,
        title: pt ? 'Meu Vocabulário' : 'My Vocabulary',
        description: pt
          ? 'Todas as palavras que você salvou ficam aqui. Revise com flashcards pelo sistema de repetição espaçada.'
          : 'All the words you have saved live here. Review them with flashcards using spaced repetition.',
      },
      {
        ref: grammarRef,
        spotlightRadius: 18,
        title: pt ? 'Gramática' : 'Grammar',
        description: pt
          ? 'Escreva em inglês e a Charlotte corrige sua gramática em tempo real com explicações detalhadas.'
          : 'Write in English and Charlotte corrects your grammar in real time with detailed explanations.',
        onBeforeMeasure: scrollToPractice,
      },
      {
        ref: pronunciationRef,
        spotlightRadius: 18,
        title: pt ? 'Pronúncia' : 'Pronunciation',
        description: pt
          ? 'Grave sua voz e receba análise detalhada de pronúncia palavra por palavra.'
          : 'Record your voice and get a detailed word-by-word pronunciation analysis.',
        onBeforeMeasure: scrollToPractice,
      },
      {
        ref: chatRef,
        spotlightRadius: 18,
        title: 'Free Chat',
        description: pt
          ? 'Conversação livre em inglês — texto ou áudio. A Charlotte responde como uma parceira de conversa nativa.'
          : 'Free conversation in English — text or audio. Charlotte responds like a native conversation partner.',
        onBeforeMeasure: scrollToPractice,
      },
      {
        ref: liveVoiceRef,
        spotlightRadius: 18,
        title: 'Live Voice',
        description: pt
          ? 'Conversa de voz em tempo real com IA. A experiência mais próxima de uma aula com professor nativo.'
          : 'Real-time voice conversation with AI. The closest experience to a lesson with a native teacher.',
        onBeforeMeasure: scrollToPractice,
      },
      {
        ref: vocabFABRef,
        spotlightRadius: 25,
        title: pt ? 'Salvar palavra' : 'Save a word',
        description: pt
          ? 'Toque para adicionar uma palavra nova ao seu vocabulário sem sair da tela inicial.'
          : 'Tap to add a new word to your vocabulary without leaving the home screen.',
      },
      {
        ref: tipBarRef,
        spotlightRadius: 0,
        title: pt ? 'Vocabulário do dia' : 'Vocabulary of the day',
        description: pt
          ? 'Uma palavra, expressão ou idiom novo todo dia. Toque para ver os detalhes e adicionar ao seu vocabulário.'
          : 'A new word, expression or idiom every day. Tap to see the details and add it to your vocabulary.',
      },
    ], pt ? 'pt' : 'en');
  }, [data])); // eslint-disable-line

  const loadLiveVoicePool = useCallback(async () => {
    if (!userId) return;
    try {
      const { secondsRemaining } = await getLiveVoiceStatus(level);
      setLiveVoiceRemaining(secondsRemaining);
    } catch { /* silencioso */ }
  }, [userId, level]);

  const loadPendingReviews = useCallback(async () => {
    if (!userId) return;
    try {
      const items = await getPendingReviews(userId);
      setPendingReviews(items);
    } catch { /* silencioso */ }
  }, [userId]);

  const loadVocabDue = useCallback(async () => {
    if (!userId) return;
    try {
      const { count } = await supabase
        .from('user_vocabulary')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .lte('next_review_at', new Date().toISOString());
      setVocabDueCount(count ?? 0);
    } catch { /* silencioso */ }
  }, [userId]);

  const loadWeeklyChallenge = useCallback(async () => {
    if (!userId) return;
    try {
      const weekly = await fetchWeeklyData(userId);
      const state = getWeeklyChallenge(
        weekly.weeklyMessages, weekly.weeklyXP,
        data?.streakDays ?? 0, weekly.weeklyLessons, weekly.weeklyAudios,
        weekly.weeklyGrammarMessages, level, weekly.weeklyActiveDays,
      );

      // ── Weekly challenge completion celebration & XP credit ───────────────
      if (state.completed) {
        const rewardKey = `weekly_reward_${state.challenge.id}_${state.weekStart}`;
        if (!weeklyRewardedRef.current.has(rewardKey)) {
          weeklyRewardedRef.current.add(rewardKey);

          // Check DB to avoid crediting again after app restart
          const { data: existing } = await supabase
            .from('charlotte_practices')
            .select('id')
            .eq('user_id', userId)
            .eq('practice_type', rewardKey)
            .maybeSingle();

          if (!existing) {
            // Credit XP
            const { error } = await supabase.from('charlotte_practices').insert({
              user_id:       userId,
              practice_type: rewardKey,
              xp_earned:     state.challenge.xpReward,
            });

            if (!error) {
              // Celebrate!
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setTimeout(() => {
                soundEngine.play('achievement_rare').catch(() => {});
                triggerToast(state.challenge.xpReward);
              }, 300);
            } else {
              weeklyRewardedRef.current.delete(rewardKey); // rollback
            }
          }
        }
      }

      setWeeklyState(state);
    } catch { /* silencioso */ }
  }, [userId, data?.streakDays, triggerToast]);

  useEffect(() => {
    if (userId) { loadLiveVoicePool(); loadPendingReviews(); loadWeeklyChallenge(); loadVocabDue(); }
  }, [userId]); // eslint-disable-line

  useFocusEffect(useCallback(() => {
    if (userId) { loadLiveVoicePool(); loadPendingReviews(); loadWeeklyChallenge(); loadVocabDue(); }
  }, [loadLiveVoicePool, loadPendingReviews, loadWeeklyChallenge, loadVocabDue]));

  const handleCardPress = useCallback((card: ModeCard) => {
    const pt = level === 'Novice';
    if (card.locked) {
      if (card.lockXP !== undefined && card.currentXP !== undefined) {
        const xpLeft = card.lockXP - card.currentXP;
        const pct = Math.min(100, Math.round((card.currentXP / card.lockXP) * 100));
        Alert.alert(
          card.title,
          `Para desbloquear ${card.title} voce precisa de ${card.lockXP.toLocaleString('pt-BR')} XP na trilha.\n\nSeu progresso: ${card.currentXP.toLocaleString('pt-BR')} / ${card.lockXP.toLocaleString('pt-BR')} XP (${pct}%)\n\nFaltam ${xpLeft.toLocaleString('pt-BR')} XP. Continue praticando Gramatica!`,
          [{ text: 'Entendido' }],
        );
      } else {
        Alert.alert(
          pt ? `Recurso ${card.lockLevel}` : `${card.lockLevel} Feature`,
          pt
            ? `${card.title} sera desbloqueado ao atingir o nivel ${card.lockLevel}. Continue praticando!`
            : `${card.title} unlocks when you reach the ${card.lockLevel} level. Keep practising!`,
          [{ text: pt ? 'Entendido' : 'Got it' }],
        );
      }
    } else if (card.mode === 'live') {
      if (liveVoiceRemaining === 0) {
        const totalMin = Math.floor(getPoolForLevel(level) / 60);
        Alert.alert(
          pt ? 'Limite mensal atingido' : 'Monthly limit reached',
          pt
            ? `Voce usou seus ${totalMin} min de Live Voice deste mes. Volte no mes que vem!`
            : `You've used your ${totalMin}-min monthly Live Voice allowance. Come back next month!`,
          [{ text: pt ? 'Ok' : 'OK' }],
        );
      } else {
        soundEngine.setMuted(true);
        setShowLiveVoice(true);
      }
    } else if (card.route) {
      router.push(card.route);
    }
  }, [liveVoiceRemaining, level]); // eslint-disable-line

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // ── AI Greeting ─────────────────────────────────────────────
  // AuthProvider pre-fetches the greeting (via lib/greetingCache) the instant
  // the profile loads — before this component even mounts. This effect just
  // reads from the cache or waits for the in-flight request to resolve.
  useEffect(() => {
    if (!userId || !name) return;

    const isNewUser   = !profile?.first_welcome_done;
    const isPt        = level === 'Novice';
    const fallback    = charlotteMessage(firstName, data?.streakDays ?? 0, data?.todayXP ?? 0, isPt, isNewUser);
    const showFallback = () => {
      // Once fallback is shown it is never replaced — user already read it.
      setAiGreeting(prev => prev ?? fallback);
      setGreetingLoading(false);
    };

    // ── New user: skip API entirely, show hardcoded immediately ───────────
    if (isNewUser) {
      showFallback();
      return;
    }

    // ── Reset + refetch if level changed after placement test ─────────────
    if (greetingCache.level && greetingCache.level !== level && profile) {
      resetGreetingCache();
      setAiGreeting(null);
      setGreetingLoading(true);
      prefetchGreeting(profile);
    }

    // ── Restore cached greeting immediately on remount ────────────────────
    if (greetingCache.text) {
      setAiGreeting(greetingCache.text);
      setGreetingLoading(false);
      return;
    }

    // ── API already finished with no result → fallback ────────────────────
    if (greetingCache.fetched && !greetingCache.pending) {
      showFallback();
      return;
    }

    // ── API in-flight: poll + 3s timeout ──────────────────────────────────
    // Dots mínimo de 600ms — sensação de Charlotte "digitando" sem ser lento.
    const minDotsMs  = 600;
    const fetchStart = Date.now();
    let   settled    = false;

    const resolve = (text: string) => {
      if (settled) return;
      settled = true;
      const elapsed = Date.now() - fetchStart;
      const delay   = Math.max(0, minDotsMs - elapsed);
      setTimeout(() => {
        unstable_batchedUpdates(() => {
          setAiGreeting(text);
          setGreetingLoading(false);
        });
      }, delay);
    };

    const poll = setInterval(() => {
      if (greetingCache.text) {
        clearInterval(poll);
        resolve(greetingCache.text);
      } else if (!greetingCache.pending) {
        clearInterval(poll);
        resolve(fallback);
      }
    }, 50);

    // 3s timeout — if API hasn't responded, show fallback and lock it.
    // If API comes back later, `settled = true` prevents overwrite.
    const timeout = setTimeout(() => {
      clearInterval(poll);
      resolve(fallback);
    }, 3000);

    return () => { clearInterval(poll); clearTimeout(timeout); };
  // NOTE: 'data' removed from deps intentionally — having it caused the effect to re-run
  // every time fetchData completed, interfering with the in-flight async setAiGreeting call.
  }, [userId, name, level, profile]); // eslint-disable-line

  const missions     = data ? buildMissions(data, level) : [];
  const doneMissions = missions.filter(m => m.completed).length;
  const todayXP      = data?.todayXP   ?? 0;
  const streak       = data?.streakDays ?? 0;
  const totalXP      = data?.totalXP   ?? 0;
  const rank         = data?.rank;
  const levelNum     = getLevel(totalXP);
  const firstName    = (name.split(' ')[0] ?? name);
  const daySeed      = localTodayStr().split('-').reduce((acc, p) => acc * 100 + parseInt(p, 10), 0);
  const tip          = getTip(level, daySeed);

  const isPortuguese    = level === 'Novice';

  const hasGrammar = config.tabs.includes('grammar');
  // Novice: unlock gradual via XP — Inter/Advanced: baseado em tabs do levelConfig
  const hasPronun  = level !== 'Novice'
    ? config.tabs.includes('pronunciation')
    : totalXP >= PRONUN_UNLOCK_XP;
  const hasChat    = level !== 'Novice'
    ? config.tabs.includes('chat')
    : totalXP >= CHAT_UNLOCK_XP;
  const hasLive    = level === 'Advanced' || level === 'Inter';

  const modeCards: ModeCard[] = [
    {
      mode: 'grammar' as const,
      title: isPortuguese ? 'Gram\u00e1tica' : 'Grammar',
      sub: '',
      route: '/(app)/grammar' as const,
      accentColor: levelAccent,
      accentBg: levelAccentBg,
      icon: <TextT size={26} color={levelAccent} weight="fill" />,
      locked: !hasGrammar,
      lockLevel: 'Intermediate',
    },
    {
      mode: 'pronunciation' as const,
      title: isPortuguese ? 'Pron\u00fancia' : 'Pronunciation',
      sub: '',
      route: '/(app)/pronunciation' as const,
      accentColor: levelAccent,
      accentBg: levelAccentBg,
      icon: <Microphone size={26} color={levelAccent} weight="fill" />,
      locked: !hasPronun,
      lockLevel: level === 'Novice' ? undefined : 'Intermediate',
      lockXP:    level === 'Novice' && !hasPronun ? PRONUN_UNLOCK_XP : undefined,
      currentXP: level === 'Novice' && !hasPronun ? totalXP          : undefined,
    },
    {
      mode: 'chat' as const,
      title: 'Free Chat',
      sub: '',
      route: '/(app)/chat' as const,
      accentColor: levelAccent,
      accentBg: levelAccentBg,
      icon: <ChatTeardropText size={26} color={levelAccent} weight="fill" />,
      locked: !hasChat,
      lockLevel: level === 'Novice' ? undefined : 'Intermediate',
      lockXP:    level === 'Novice' && !hasChat ? CHAT_UNLOCK_XP : undefined,
      currentXP: level === 'Novice' && !hasChat ? totalXP        : undefined,
    },
    {
      mode: 'live' as const,
      title: 'Live Voice',
      sub: '',
      accentColor: C.orange,
      accentBg: 'rgba(255,107,53,0.10)',
      icon: <Phone size={26} color={hasLive ? C.orange : C.navyLight} weight="fill" />,
      locked: !hasLive,
      lockLevel: 'Intermediate',
    },
  ];

  const tipStyle = TIP_STYLE[tip.type];

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg }}>
          <ActivityIndicator size="large" color={C.navy} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.card }} edges={['top', 'left', 'right', 'bottom']}>

      {/* ══════════════════════════════════════════
          HEADER  —  streak · XP · rank · gear
      ══════════════════════════════════════════ */}
      <View
        style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 20, height: 52,
          backgroundColor: C.card,
          borderBottomWidth: 1,
          borderBottomColor: C.navyGhost,
        }}
      >
        {/* Stats pills — tappable group → stats modal */}
        <View ref={headerRef} collapsable={false}>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/(app)/stats', params: { sessionXP: String(data?.todayXP ?? 0), totalXP: String(totalXP), userId: userId ?? '', userLevel: level ?? 'Inter', userName: name ?? '' } })}
          activeOpacity={0.7}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
          accessibilityLabel="Estatísticas / Stats"
          accessibilityRole="button"
        >
          {/* Streak pill */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 5,
            backgroundColor: streak ? 'rgba(251,146,60,0.12)' : 'rgba(22,21,58,0.05)',
            borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
          }}>
            <Fire size={15} color={streak ? C.orange : C.navyLight} weight="fill" />
            <AppText style={{ fontSize: 13, fontWeight: '800', color: streak ? C.orange : C.navyLight }}>
              {streak}
            </AppText>
          </View>

          {/* XP pill */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 5,
            backgroundColor: totalXP > 0 ? 'rgba(61,136,0,0.10)' : 'rgba(22,21,58,0.05)',
            borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
          }}>
            <Lightning size={15} color={totalXP > 0 ? C.greenDark : C.navyLight} weight="fill" />
            <AppText style={{ fontSize: 13, fontWeight: '800', color: totalXP > 0 ? C.greenDark : C.navyLight }}>
              {totalXP.toLocaleString()}
            </AppText>
          </View>

          {/* Rank pill */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 5,
            backgroundColor: rank ? 'rgba(234,179,8,0.12)' : 'rgba(22,21,58,0.05)',
            borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
          }}>
            <Trophy size={15} color={rank ? C.gold : C.navyLight} weight="fill" />
            <AppText style={{ fontSize: 13, fontWeight: '800', color: rank ? C.gold : C.navyLight }}>
              {rank ? `#${rank}` : '—'}
            </AppText>
          </View>
        </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }} />

        {/* Trial badge — shown only while on trial */}
        {trialDaysLeft !== null && (
          <TouchableOpacity
            onPress={openPaywall}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: 'rgba(61,136,0,0.10)',
              borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
              marginRight: 10,
              borderWidth: 1, borderColor: 'rgba(61,136,0,0.20)',
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#3D8800' }} />
            <AppText style={{ fontSize: 12, fontWeight: '700', color: '#3D8800' }}>
              {level === 'Novice'
                ? `${trialDaysLeft}d grátis`
                : `${trialDaysLeft}d trial`}
            </AppText>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => router.push('/(app)/configuracoes')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Configurações / Settings"
          accessibilityRole="button"
        >
          <Gear size={22} color={C.navyMid} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1, backgroundColor: T.bg }}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.navy} />}
      >

        {/* ══════════════════════════════════════════
            CHARLOTTE HERO CARD
            Navy header + white body.
            She opens every session — coach, not mascot.
        ══════════════════════════════════════════ */}
        <View ref={charlotteCardRef} collapsable={false} style={{ marginHorizontal: 20, marginTop: 8 }}>
          <View style={{
            borderRadius: 22,
            backgroundColor: C.card,
            overflow: 'hidden',
            ...cardShadow,
          }}>
            {/* Navy header strip */}
            <View style={{
              backgroundColor: C.navy,
              paddingRight: 20, paddingTop: 0, paddingBottom: 0,
              flexDirection: 'row', alignItems: 'center', gap: 0,
              minHeight: 140,
            }}>
              {/* Bust — bottom edge flush com o strip */}
              <Image
                source={require('@/assets/charlotte-bust.png')}
                style={{ width: 118, height: 165, marginBottom: -15, flexShrink: 0, alignSelf: 'flex-end' }}
                resizeMode="contain"
              />

              {/* Chat bubble */}
              <View style={{ flex: 1, paddingLeft: 10, paddingVertical: 16, justifyContent: 'center' }}>
                <View style={{
                  backgroundColor: '#3B3A5A',
                  borderRadius: 18,
                  borderTopLeftRadius: 0,
                  paddingHorizontal: 14,
                  paddingVertical: greetingLoading ? 10 : 12,
                  alignSelf: 'flex-start',
                }}>
                  {(greetingLoading || !aiGreeting) ? (
                    <TypingDots />
                  ) : (
                    <AppText style={{
                      fontSize: 14, color: '#FFFFFF',
                      lineHeight: 21, fontWeight: '500',
                    }}>
                      {aiGreeting}
                    </AppText>
                  )}
                </View>
              </View>
            </View>

            {/* Accent divider — bridges navy and white */}
            <View style={{ height: 1, backgroundColor: C.navyGhost }} />

            {/* White body — XP progress (tappable → stats screen) */}
            <TouchableOpacity onPress={() => router.push({ pathname: '/(app)/stats', params: { sessionXP: String(data?.todayXP ?? 0), totalXP: String(totalXP), userId: userId ?? '', userLevel: level ?? 'Inter', userName: name ?? '' } })} activeOpacity={0.75} style={{ padding: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <XPRing todayXP={todayXP} goal={getDailyGoal(todayXP)} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}>
                    <AppText style={{ fontSize: 11, color: C.navyMid, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 }}>
                      {isPortuguese ? 'XP de hoje' : "Today's XP"}
                    </AppText>
                    <AppText style={{ fontSize: 11, fontWeight: '800', color: C.greenDark }}>
                      {todayXP} / {getDailyGoal(todayXP)}
                    </AppText>
                  </View>
                  <View style={{ height: 8, backgroundColor: C.navyGhost, borderRadius: 4, overflow: 'hidden' }}>
                    <View style={{
                      height: '100%',
                      width: `${(todayXP / getDailyGoal(todayXP)) * 100}%`,
                      backgroundColor: C.greenDark,
                      borderRadius: 4,
                    }} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ══════════════════════════════════════════
            GOALS BANNER — taps to /goals
        ══════════════════════════════════════════ */}
        <TouchableOpacity
          ref={goalsBannerRef}
          onPress={() => router.push('/(app)/goals')}
          activeOpacity={0.78}
          style={{
            marginHorizontal: 20, marginTop: 14,
            backgroundColor: C.card,
            borderRadius: 14, borderWidth: 1, borderColor: C.navyGhost,
            paddingHorizontal: 16, paddingVertical: 12,
            flexDirection: 'row', alignItems: 'center', gap: 10,
            ...cardShadow,
          }}
        >
          <View style={{ flex: 1 }}>
            <AppText style={{ fontSize: 14, fontWeight: '700', color: C.navy }}>
              {isPortuguese ? 'Metas' : 'Goals'}
            </AppText>
            <AppText style={{ fontSize: 11, color: C.navyLight }}>
              {doneMissions}/{missions.length} {isPortuguese ? 'missões' : 'missions'}
              {weeklyState ? (weeklyState.completed
                ? (isPortuguese ? ' · Desafio completo' : ' · Challenge done')
                : ` · ${Math.round((weeklyState.current / weeklyState.challenge.target) * 100)}% ${isPortuguese ? 'semanal' : 'weekly'}`)
                : ''}
            </AppText>
          </View>
          <CaretRight size={16} color={C.navyLight} />
        </TouchableOpacity>

        {/* ══════════════════════════════════════════
            LEARN — structured lessons
        ══════════════════════════════════════════ */}
        <SectionHeader label={isPortuguese ? 'Aprender com Charlotte' : 'Learn with Charlotte'} />

        <View style={{ paddingHorizontal: 20, flexDirection: 'row', gap: 10 }}>

          {/* Learning Trail card (left, half width) */}
          <TouchableOpacity
            ref={learnTrailRef}
            onPress={() => router.push('/(app)/learn-trail')}
            activeOpacity={0.72}
            style={{
              flex: 1,
              borderRadius: 18,
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.navyGhost,
              padding: 16,
              gap: 10,
              ...cardShadow,
            }}
          >
            <View style={{
              width: 44, height: 44, borderRadius: 13,
              backgroundColor: levelAccentBg,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <MapTrifold size={24} color={levelAccent} weight="fill" />
            </View>
            <AppText style={{ fontSize: 14, fontWeight: '800', color: C.navy, letterSpacing: -0.2 }}>
              {isPortuguese ? 'Trilha de Aprendizado' : 'Learning Trail'}
            </AppText>
            <AppText style={{ fontSize: 11, color: C.navyLight, lineHeight: 15 }}>
              {isPortuguese ? 'Gramática & Pronúncia' : 'Grammar & Pronunciation'}
            </AppText>
          </TouchableOpacity>

          {/* Review card (right, half width) — two states */}
          <TouchableOpacity
            ref={reviewCardRef}
            onPress={() => {
              const srDue = pendingReviews.length > 0;
              const vocabDue = vocabDueCount > 0;
              if (!srDue && !vocabDue) return;
              if (srDue) {
                router.push('/(app)/review-session');
              } else {
                router.push('/(app)/vocab-review');
              }
            }}
            activeOpacity={(pendingReviews.length > 0 || vocabDueCount > 0) ? 0.72 : 1}
            style={{
              flex: 1,
              borderRadius: 18,
              backgroundColor: (pendingReviews.length > 0 || vocabDueCount > 0) ? levelAccentBg : C.card,
              borderWidth: 1,
              borderColor: (pendingReviews.length > 0 || vocabDueCount > 0) ? (levelAccent + '60') : C.navyGhost,
              padding: 16,
              gap: 10,
              ...((pendingReviews.length > 0 || vocabDueCount > 0) ? { elevation: 0 } : cardShadow),
            }}
          >
            {/* badge */}
            {(pendingReviews.length > 0 || vocabDueCount > 0) && (
              <View style={{
                position: 'absolute', top: 10, right: 10,
                backgroundColor: levelAccent, borderRadius: 10,
                paddingHorizontal: 7, paddingVertical: 2, minWidth: 20, alignItems: 'center',
              }}>
                <AppText style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>
                  {pendingReviews.length + vocabDueCount}
                </AppText>
              </View>
            )}
            <View style={{
              width: 44, height: 44, borderRadius: 13,
              backgroundColor: (pendingReviews.length > 0 || vocabDueCount > 0) ? (levelAccent + '18') : C.navyGhost,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <LightbulbFilament
                size={24}
                color={(pendingReviews.length > 0 || vocabDueCount > 0) ? levelAccent : C.navyLight}
                weight={(pendingReviews.length > 0 || vocabDueCount > 0) ? 'fill' : 'regular'}
              />
            </View>
            <AppText style={{
              fontSize: 14, fontWeight: '800', letterSpacing: -0.2,
              color: (pendingReviews.length > 0 || vocabDueCount > 0) ? C.navy : C.navyLight,
            }}>
              {isPortuguese ? 'Revisão' : 'Review'}
            </AppText>
            <AppText style={{ fontSize: 11, lineHeight: 15, color: (pendingReviews.length > 0 || vocabDueCount > 0) ? C.navyMid : C.navyLight }}>
              {pendingReviews.length > 0
                ? (isPortuguese
                    ? `${pendingReviews.length} tópico${pendingReviews.length > 1 ? 's' : ''} pendente${pendingReviews.length > 1 ? 's' : ''}`
                    : `${pendingReviews.length} topic${pendingReviews.length > 1 ? 's' : ''} to review`)
                : vocabDueCount > 0
                  ? (isPortuguese
                      ? `${vocabDueCount} ${vocabDueCount === 1 ? 'palavra' : 'palavras'} para revisar`
                      : `${vocabDueCount} vocab ${vocabDueCount === 1 ? 'word' : 'words'} to review`)
                  : (isPortuguese ? 'Nada para hoje' : 'Nothing today')}
            </AppText>
          </TouchableOpacity>

        </View>

        {/* My Vocabulary quick link */}
        <TouchableOpacity
          ref={myVocabRef}
          onPress={() => router.push('/(app)/my-vocabulary')}
          activeOpacity={0.78}
          style={{
            marginHorizontal: 20, marginTop: 10,
            backgroundColor: C.card,
            borderRadius: 14, borderWidth: 1, borderColor: C.navyGhost,
            paddingHorizontal: 16, paddingVertical: 12,
            flexDirection: 'row', alignItems: 'center', gap: 10,
            ...cardShadow,
          }}
        >
          <View style={{ flex: 1 }}>
            <AppText style={{ fontSize: 14, fontWeight: '700', color: C.navy }}>
              {isPortuguese ? 'Meu Vocabulário' : 'My Vocabulary'}
            </AppText>
            <AppText style={{ fontSize: 11, color: C.navyLight }}>
              {isPortuguese ? 'Suas palavras salvas' : 'Your saved words'}
            </AppText>
          </View>
          <CaretRight size={16} color={C.navyLight} />
        </TouchableOpacity>

        {/* ══════════════════════════════════════════
            PRACTICE — destination cards
        ══════════════════════════════════════════ */}
        <SectionHeader label={isPortuguese ? 'Praticar com Charlotte' : 'Practise with Charlotte'} />

        <View
          style={{ paddingHorizontal: 20, gap: 10 }}
          onLayout={e => { practiceYRef.current = e.nativeEvent.layout.y; }}
        >
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View ref={grammarRef} collapsable={false} style={{ flex: 1 }}>
              <PracticePortal card={modeCards[0]} onPress={() => handleCardPress(modeCards[0])} />
            </View>
            <View ref={pronunciationRef} collapsable={false} style={{ flex: 1 }}>
              <PracticePortal card={modeCards[1]} onPress={() => handleCardPress(modeCards[1])} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View ref={chatRef} collapsable={false} style={{ flex: 1 }}>
              <PracticePortal card={modeCards[2]} onPress={() => handleCardPress(modeCards[2])} />
            </View>
            <View ref={liveVoiceRef} collapsable={false} style={{ flex: 1 }}>
              <PracticePortal card={modeCards[3]} onPress={() => handleCardPress(modeCards[3])} />
            </View>
          </View>
        </View>

      </ScrollView>

      {/* ══════════════════════════════════════════
          BOTTOM TIP BAR — fixed, daily tip by level
      ══════════════════════════════════════════ */}
      <TouchableOpacity
        ref={tipBarRef}
        onPress={() => setShowTipModal(true)}
        activeOpacity={0.75}
        style={{
          backgroundColor: C.card,
          borderTopWidth: 1,
          borderTopColor: C.navyGhost,
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View style={{
          width: 36, height: 36, borderRadius: 12,
          backgroundColor: tipStyle.bg,
          alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Lightbulb size={18} color={tipStyle.color} weight="fill" />
        </View>
        <View style={{ flex: 1 }}>
          <AppText style={{ fontSize: 9, fontWeight: '700', color: C.navyLight, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 3 }}>
            {isPortuguese ? 'Vocabulário do dia' : 'Vocabulary of the day'}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <View style={{ backgroundColor: tipStyle.bg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
              <AppText style={{ fontSize: 10, fontWeight: '700', color: tipStyle.color, textTransform: 'capitalize' }}>
                {tip.type}
              </AppText>
            </View>
            <AppText style={{ fontSize: 13, fontWeight: '700', color: C.navy }}>
              {tip.term}
            </AppText>
          </View>
          <AppText style={{ fontSize: 12, color: C.navyMid, lineHeight: 16 }} numberOfLines={1}>
            {isPortuguese && tip.meaningPt ? tip.meaningPt : tip.meaning}
          </AppText>
        </View>
        <CaretRight size={16} color={C.navyLight} weight="bold" />
      </TouchableOpacity>

      <LiveVoiceModal
        isOpen={showLiveVoice}
        onClose={() => {
          setShowLiveVoice(false);
          soundEngine.setMuted(false); // reativar sons
          setTimeout(() => loadLiveVoicePool(), 1500);
        }}
        userLevel={level}
        userName={name}
      />

      {/* ══════════════════════════════════════════
          TIP MODAL
      ══════════════════════════════════════════ */}
      <Modal visible={showTipModal} transparent animationType="fade" onRequestClose={() => setShowTipModal(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(22,21,58,0.52)', justifyContent: 'center', padding: 24 }}
          activeOpacity={1}
          onPress={() => setShowTipModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={{ backgroundColor: C.card, borderRadius: 24, padding: 24 }}>

              {/* Header row */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                <View style={{ backgroundColor: tipStyle.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <AppText style={{ fontSize: 12, fontWeight: '700', color: tipStyle.color, textTransform: 'capitalize' }}>
                    {tip.type}
                  </AppText>
                </View>
                <TouchableOpacity
                  onPress={() => setShowTipModal(false)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <X size={20} color={C.navyLight} weight="bold" />
                </TouchableOpacity>
              </View>

              {/* Term */}
              <AppText style={{ fontSize: 26, fontWeight: '800', color: C.navy, marginBottom: 8, letterSpacing: -0.5 }}>
                {tip.term}
              </AppText>

              {/* Meaning */}
              <AppText style={{ fontSize: 15, color: C.navyMid, lineHeight: 23, marginBottom: 20 }}>
                {isPortuguese && tip.meaningPt ? tip.meaningPt : tip.meaning}
              </AppText>

              {/* Example */}
              <View style={{ backgroundColor: tipStyle.bg, borderRadius: 16, padding: 16 }}>
                <AppText style={{ fontSize: 10, fontWeight: '700', color: tipStyle.color, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                  {isPortuguese ? 'Exemplo' : 'Example'}
                </AppText>
                <AppText style={{ fontSize: 15, color: C.navy, fontStyle: 'italic', lineHeight: 23 }}>
                  "{tip.example}"
                </AppText>
                {isPortuguese && tip.examplePt && (
                  <AppText style={{ fontSize: 14, color: C.navyMid, fontStyle: 'italic', lineHeight: 22, marginTop: 8 }}>
                    "{tip.examplePt}"
                  </AppText>
                )}
              </View>

              {/* Add to my list button */}
              <TouchableOpacity
                onPress={() => {
                  setShowTipModal(false);
                  router.push({
                    pathname: '/(app)/add-word',
                    params: {
                      term: tip.term,
                      source: 'vocab_of_day',
                    },
                  });
                }}
                style={{
                  marginTop: 16,
                  backgroundColor: levelAccent,
                  borderRadius: 12, paddingVertical: 12,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Notepad size={16} color="#FFFFFF" weight="fill" />
                <AppText style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
                  {isPortuguese ? '+ Salvar na minha lista' : '+ Add to my list'}
                </AppText>
              </TouchableOpacity>

            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* FAB — adicionar palavra */}
      <VocabFAB ref={vocabFABRef} bottom={68} color={C.navy} />

    </SafeAreaView>
  );
}

// ── Helpers & sub-components ──────────────────────────────────

const cardShadow = Platform.select({
  ios: {
    shadowColor: C.shadow,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 4 },
});

function SectionHeader({ label, badge, isPt }: { label: string; badge?: string; isPt?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 28, marginBottom: 16 }}>
      <AppText style={{ fontSize: 17, fontWeight: '800', color: C.navy, flex: 1 }}>
        {label}
      </AppText>
      {badge ? (
        <View style={{ backgroundColor: C.navyGhost, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
          <AppText style={{ fontSize: 12, fontWeight: '700', color: C.navyMid }}>{badge} {isPt ? 'feito' : 'done'}</AppText>
        </View>
      ) : null}
    </View>
  );
}

// Practice portal — 2×2 grid card, icon + label only

function PracticePortal({ card, onPress }: { card: ModeCard; onPress: () => void }) {
  const locked = !!card.locked;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.72}
      style={{
        flex: 1,
        borderRadius: 18,
        backgroundColor: locked ? C.bg : C.card,
        borderWidth: 1,
        borderColor: C.navyGhost,
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 8,
        opacity: locked ? 0.52 : 1,
        ...cardShadow,
      }}
    >
      <View style={{
        width: 52, height: 52, borderRadius: 16,
        backgroundColor: locked ? 'rgba(22,21,58,0.05)' : card.accentBg,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 10,
      }}>
        {locked ? <Lock size={26} color={C.navyLight} weight="bold" /> : card.icon}
      </View>
      <AppText style={{ fontSize: 13, fontWeight: '700', color: locked ? C.navyLight : C.navy, textAlign: 'center' }}>
        {card.title}
      </AppText>
      {locked && card.lockXP !== undefined && card.currentXP !== undefined ? (
        // Unlock gradual (Novice): barra de progresso XP
        <View style={{ width: '100%', paddingHorizontal: 4, marginTop: 6 }}>
          <AppText style={{ fontSize: 9, color: C.navyLight, textAlign: 'center', marginBottom: 4 }}>
            {card.currentXP.toLocaleString('pt-BR')} / {card.lockXP.toLocaleString('pt-BR')} XP
          </AppText>
          <View style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(22,21,58,0.10)' }}>
            <View style={{
              height: 3,
              borderRadius: 2,
              backgroundColor: C.navyLight,
              width: `${Math.min(100, Math.round((card.currentXP / card.lockXP) * 100))}%` as any,
            }} />
          </View>
        </View>
      ) : locked && card.lockLevel ? (
        <AppText style={{ fontSize: 10, color: C.navyLight, marginTop: 3, textAlign: 'center' }}>
          {card.lockLevel}
        </AppText>
      ) : null}
      {!locked && card.sub ? (
        <AppText style={{ fontSize: 10, color: C.navyLight, marginTop: 3, textAlign: 'center' }}>
          {card.sub}
        </AppText>
      ) : null}
    </TouchableOpacity>
  );
}
