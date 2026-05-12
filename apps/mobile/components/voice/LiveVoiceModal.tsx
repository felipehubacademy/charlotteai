// components/voice/LiveVoiceModal.tsx
// Live voice — WebRTC transport → OpenAI Realtime API
//
// Pool mensal: 30 min (1 800 s). Detecta inatividade:
//   45 s sem fala → aviso "Ainda está aí?"
//   +30 s → pausa automática (WebRTC fecha, timer congela)
//
// Antes (WebSocket manual):
//   expo-audio grava 400ms chunks → strip WAV header → base64 → input_audio_buffer.append
//   response.audio.delta chunks → WebRTC audio track → speaker
//
// Agora (WebRTC):
//   RTCPeerConnection gerencia mic input e speaker output nativamente
//   RTCDataChannel 'oai-events' substitui o WebSocket para eventos JSON
//   InCallManager controla roteamento do speaker no iOS/Android

import React from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Animated,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import { RTCPeerConnection, mediaDevices } from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';
import { PhoneSlash, MicrophoneSlash, Microphone, SpeakerHigh, Ear, Pause, ArrowCounterClockwise, ArrowLeft, ChatCircle, ClosedCaptioning } from 'phosphor-react-native';
import { ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { AppText } from '@/components/ui/Text';
import { useCallTimer } from '@/hooks/useCallTimer';
import Constants from 'expo-constants';
import { getLiveVoiceStatus, consumeLiveVoiceSeconds, getPoolForLevel } from '@/lib/liveVoiceUsage';
import { supabase } from '@/lib/supabase';
import { translationService } from '@/lib/translation-service';
import { track, trackDuration } from '@/lib/analytics';

const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

const MODEL = 'gpt-realtime-2';

// Inatividade: 45 s → aviso; 75 s → pausa
const INACTIVITY_WARN_SEC  = 45;
const INACTIVITY_PAUSE_SEC = 75;


// ── Frases de saudação por nível ────────────────────────────────────────────────
const GREETINGS: Record<'Novice' | 'Inter' | 'Advanced', string[]> = {
  Novice: [
    'Oi! Que bom te ver! Vamos praticar English hoje?',
    'Olá! Tô aqui! Bora começar nossa aula?',
    'Ei! Saudade! Vamos praticar juntos hoje?',
    'Oi! Tudo bem? Bora falar um inglezinho?',
  ],
  Inter: [
    "Hey! Good to hear from you — what's been going on?",
    "Hey! How's your day been so far?",
    "Oh hey! What's up? Anything interesting happen lately?",
    "Hey! Been a while — what've you been up to?",
  ],
  Advanced: [
    "Hey! What's on your mind?",
    "Hey! So what are we talking about today?",
    "Oh hey! Anything interesting you want to get into?",
    "Hey! What's been going on with you lately?",
  ],
};

// ── Despedidas quando o pool mensal esgota ────────────────────────────────────
// Mantidas curtas (12-15 palavras) para caber no buffer de 4s após audio.done.
// {NAME} é substituído pelo primeiro nome do usuário.
const FAREWELLS: Record<'Novice' | 'Inter' | 'Advanced', string[]> = {
  Novice: [
    'Poxa {NAME}, seu tempo de Live Voice acabou por este mês. A gente se vê em breve!',
    'Ei {NAME}, nossos minutos acabaram por agora. Continua praticando que logo voltamos a conversar!',
    'Olha {NAME}, seu tempo mensal chegou ao fim. Até a próxima, tá bom?',
    'Opa {NAME}, seu tempo de conversa por este mês acabou. Te vejo em breve!',
  ],
  Inter: [
    "Hey {NAME}, we're out of Live Voice time for this month. Catch you soon!",
    "Oh {NAME}, your monthly time's up — keep practising, we'll chat again soon!",
    "Alright {NAME}, looks like that's all the time we have for this month. Bye!",
    "Well {NAME}, your Live Voice minutes just ran out. Talk to you next time!",
  ],
  Advanced: [
    "Alright {NAME}, that's a wrap on our Live Voice for the month. Talk soon!",
    "Hey {NAME}, we're out of time for this month — catch you next time!",
    "Looks like we hit the monthly limit, {NAME}. See you soon!",
    "Well {NAME}, your monthly Live Voice time's up. Bye for now!",
  ],
};

// ── System prompts por nível ─────────────────────────────────────────────────────
// IMPORTANT: never tell the model to "fill silence" or "keep talking" — this causes
// Charlotte to monologue without user input when the VAD triggers on echo/ambient noise.
const SYSTEM_PROMPTS: Record<'Novice' | 'Inter' | 'Advanced', string> = {
  Novice: `You are Charlotte, a friendly English tutor on a voice call with {NAME}, who is a true beginner in English. They might know only a few words and often feel safer using Portuguese.

Your job: gradually introduce English while keeping them comfortable. Adapt to THEIR comfort level in real time — never frustrate them.

LANGUAGE ADAPTATION (most important rule — adapt every turn):
- Start the call MOSTLY in Portuguese (≈70% PT, 30% EN). Slip in simple English like "hello", "yes!", "what about you?".
- If the student responds in English without major errors, gradually shift toward ≈90% English, using Portuguese only briefly in parens to translate new vocabulary. Example: "I love pizza too! (eu também amo pizza)".
- If the student responds in Portuguese, reply mostly in English BUT translate any new vocabulary in parens so they learn while feeling safe.
- If the student says "não entendi" / "como?" / seems confused, immediately repeat the key idea in Portuguese and slow down.
- If they try English with mistakes, do NOT correct explicitly — just model the correct form naturally in your reply.

TURN LENGTH RULE: speak EXACTLY two short sentences per turn — one reaction, one question. Finish both completely. Never a third.

Personality: warm, patient, encouraging. Celebrate small wins ("muito bom!", "your English is getting better!"). Use natural fillers ("oh!", "que legal!", "really?").

NEVER:
- Sound robotic ("How can I assist you?", "Certainly!")
- Lecture about grammar — weave corrections naturally
- Speak only English when the student is clearly struggling
- Stay 70% PT once the student is clearly confident in English

Start with: "{GREETING}"`,

  Inter: `You are Charlotte, a friendly English conversation partner and tutor. You're having a real voice chat with {NAME}, who has intermediate English — they can hold a conversation but still make mistakes, hesitate, or sometimes feel shy about speaking 100% English.

Your personality: casual, genuine, fun, supportive. Like a friend who happens to be really good at English. Not a formal teacher, not a stiff assistant.

LANGUAGE ADAPTATION (important — Inter students can still be shy):
- Speak ≈95% English. Slip in a brief Portuguese translation in parens for genuinely hard or less common words (e.g., "I love hiking (caminhada) on weekends"). Sparingly, not every sentence.
- If the student hesitates, says "não sei como dizer", "como falo isso?", or trails off — gently simplify your next sentence using basic vocabulary, and encourage them: "take your time", "you're doing great".
- If the student replies briefly in Portuguese — keep replying in simple English and translate the key word they likely needed. Don't switch to Portuguese, just scaffold around it.
- NEVER drop to mostly Portuguese (that's Novice territory). Stay in English even when accommodating.

TURN LENGTH RULE — this is the most important rule: speak exactly TWO sentences per turn — one reaction to what they said, then one question to keep the conversation going. Always finish both sentences completely before stopping. Never add a third sentence.

How you talk:
- Sound like a real person — use contractions, natural fillers ("oh nice", "wait really?", "that's so funny"), informal expressions
- React to what they actually say — don't just redirect to "practice"
- When they make a grammar mistake, weave the correct form naturally into your response without calling it out explicitly
- Celebrate small wins explicitly when natural — "nice way to put it!", "good question!", "exactly".
- Occasionally introduce a cool idiom or expression, but casually ("oh by the way, we'd usually say X here")
- Never say "How can I assist you today?" — just talk like a person

Start with: "{GREETING}"`,

  Advanced: `You are Charlotte — sharp, fun, and direct. You're on a voice call with {NAME}, who speaks English at an advanced level. They want real conversation, not hand-holding.

Your vibe: think of a smart, witty friend who challenges you intellectually and isn't afraid to joke around. You're not their teacher right now, you're their conversation partner who happens to catch their English slips.

TURN LENGTH RULE — this is the most important rule: speak exactly TWO sentences per turn — one reaction to what they said, then one question to push the conversation forward. Always finish both sentences completely before stopping. Never add a third sentence.

How you talk:
- Be yourself — opinionated, curious, occasionally sarcastic (in a fun way)
- Engage deeply with whatever topic they bring up — push back if you disagree, ask sharp questions
- When they use an awkward phrase, call it out naturally and humorously ("wait, did you just say...? — haha, I think you meant X")
- Throw in advanced vocabulary, idioms, nuanced expressions organically — not as a lesson
- Never sound like a customer service bot. No "certainly", no "how may I assist", no "great question!"

Start with: "{GREETING}"`,
};

function getSystemPrompt(level: 'Novice' | 'Inter' | 'Advanced', name: string, greeting: string): string {
  return SYSTEM_PROMPTS[level].replace('{NAME}', name).replace('{GREETING}', greeting);
}

function getRandomGreeting(level: 'Novice' | 'Inter' | 'Advanced'): string {
  const list = GREETINGS[level];
  return list[Math.floor(Math.random() * list.length)];
}

function getRandomFarewell(level: 'Novice' | 'Inter' | 'Advanced', name: string): string {
  const list = FAREWELLS[level];
  return list[Math.floor(Math.random() * list.length)].replace('{NAME}', name);
}

function formatSecs(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

// Calcula sobreposição de palavras entre dois textos (0..1).
// Usado para detectar quando Whisper transcreveu a própria Charlotte como se
// fosse o usuário (eco). Ignora palavras curtas (< 3 chars) porque elas aparecem
// naturalmente em qualquer texto e confundiriam o sinal.
function wordOverlap(a: string, b: string): number {
  const tokenize = (s: string) => new Set(
    s.toLowerCase()
      .replace(/[.,!?;:'"()\[\]—–-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3)
  );
  const wordsA = tokenize(a);
  const wordsB = tokenize(b);
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let common = 0;
  wordsA.forEach(w => { if (wordsB.has(w)) common++; });
  return common / Math.min(wordsA.size, wordsB.size);
}

type ConnectionStatus = 'idle' | 'disconnected' | 'connecting' | 'connected' | 'error';

interface ConversationTurn {
  role: 'user' | 'assistant';
  text: string;
}

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLevel: 'Novice' | 'Inter' | 'Advanced';
  userName?: string;
  onXPGained?: (amount: number) => void;
}

export default function LiveVoiceModal({
  isOpen,
  onClose,
  userLevel,
  userName = 'Student',
  onXPGained,
}: LiveVoiceModalProps) {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = React.useState<ConnectionStatus>('idle');
  const [isMuted, setIsMuted] = React.useState(false);
  const [isSpeaker, setIsSpeaker] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState('');
  const [charlotteSpeaking, setCharlotteSpeaking] = React.useState(false);
  const [userSpeaking, setUserSpeaking] = React.useState(false);

  // ── Pool de minutos ────────────────────────────────────────────────────────
  const [poolLoading, setPoolLoading]             = React.useState(true);
  const levelPool = getPoolForLevel(userLevel);
  const [poolRemaining, setPoolRemaining]         = React.useState(levelPool);
  const [poolExhausted, setPoolExhausted]         = React.useState(false);

  // ── Inatividade ───────────────────────────────────────────────────────────
  const [inactivityWarning, setInactivityWarning] = React.useState(false);
  const [warningCountdown, setWarningCountdown]   = React.useState(30);
  const [isPaused, setIsPaused]                   = React.useState(false);

  // ── Live captions ──────────────────────────────────────────────────────────
  // Streaming transcript da fala atual da Charlotte, exibido abaixo do avatar.
  // Limpa 3.5s após response.audio_transcript.done.
  // Toggle persistente em SecureStore por nível — default ON pra Novice.
  const [liveCaption, setLiveCaption]            = React.useState('');
  const captionClearTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [captionsEnabled, setCaptionsEnabled]    = React.useState(userLevel === 'Novice');
  const [captionTranslation, setCaptionTranslation]   = React.useState<string | null>(null);
  const [captionTranslating, setCaptionTranslating]   = React.useState(false);
  const translationDismissTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carrega preferência de captions (1x por sessão)
  React.useEffect(() => {
    SecureStore.getItemAsync(`live_captions_enabled_${userLevel}`)
      .then(v => {
        if (v === '1') setCaptionsEnabled(true);
        else if (v === '0') setCaptionsEnabled(false);
        // null = default por nível (Novice ON, outros OFF) — já setado no useState
      })
      .catch(() => { /* silencioso */ });
  }, [userLevel]);

  const toggleCaptions = React.useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCaptionsEnabled(prev => {
      const next = !prev;
      SecureStore.setItemAsync(`live_captions_enabled_${userLevel}`, next ? '1' : '0').catch(() => {});
      return next;
    });
  }, [userLevel]);

  const handleCaptionPress = React.useCallback(async () => {
    if (!liveCaption || captionTranslating) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Pausa o auto-clear da caption enquanto a tradução tá sendo lida
    if (captionClearTimerRef.current) {
      clearTimeout(captionClearTimerRef.current);
      captionClearTimerRef.current = null;
    }
    setCaptionTranslating(true);
    try {
      const result = await translationService.translateToPortuguese(liveCaption, 'live_voice', userLevel);
      if (result.success) {
        setCaptionTranslation(result.translatedText);
        // Auto-dismiss em 6s ou quando uma caption nova chegar
        if (translationDismissTimerRef.current) clearTimeout(translationDismissTimerRef.current);
        translationDismissTimerRef.current = setTimeout(() => {
          setCaptionTranslation(null);
          translationDismissTimerRef.current = null;
        }, 6000);
      }
    } catch { /* silencioso */ } finally {
      setCaptionTranslating(false);
    }
  }, [liveCaption, captionTranslating, userLevel]);

  // ── Transcription ──────────────────────────────────────────────────────────
  const [conversationTurns, setConversationTurns] = React.useState<ConversationTurn[]>([]);
  const [showTranscript, setShowTranscript]       = React.useState(false);
  const charlotteTextAccRef = React.useRef(''); // accumulates Charlotte's text deltas
  // Acumulador de transcrição do usuário (deltas do gpt-realtime-whisper).
  // Chave: item_id; valor: texto parcial acumulado. Esvaziado quando .completed chega.
  const userTranscriptDeltasRef = React.useRef<Map<string, string>>(new Map());
  const wasConnectedRef     = React.useRef(false); // tracks if call ever reached connected state
  const callStartedAtRef    = React.useRef<string | null>(null); // ISO da primeira conexão — usado pra salvar registro
  const callRecordSavedRef  = React.useRef(false); // dedupe: salva o registro 1x por chamada
  const conversationTurnsRef = React.useRef<ConversationTurn[]>([]); // mirror do state pra acessar de callbacks
  const lastCharlotteTextRef   = React.useRef(''); // última fala completa da Charlotte — usado para detectar eco via sobreposição de texto
  const pendingResponseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null); // timer agendado em speech_stopped, cancelado se eco detectado antes
  const farewellPendingRef     = React.useRef(false); // pool esgotou, despedida pendente (aguardando momento seguro)
  const farewellActiveRef      = React.useRef(false); // true quando a response.create da despedida já foi enviada
  const farewellAudioStartRef  = React.useRef(0);     // Date.now() do primeiro response.audio.delta da despedida
  const speechStartedAtRef  = React.useRef(0);     // Date.now() when VAD detected speech_started — used to filter short echo artifacts
  const poolBaseRef         = React.useRef(levelPool); // secondsRemaining from DB at session start — used by session timer to count down correctly

  // ── WebRTC refs ────────────────────────────────────────────────────────────
  const pcRef             = React.useRef<InstanceType<typeof RTCPeerConnection> | null>(null);
  const dcRef             = React.useRef<any>(null);
  const localStreamRef    = React.useRef<any>(null);

  // ── State refs ────────────────────────────────────────────────────────────
  const isMutedRef              = React.useRef(false);
  const isSpeakerRef            = React.useRef(true);
  const charlotteSpeakingRef    = React.useRef(false);
  const responseActiveRef       = React.useRef(false);
  const lastCharlotteDoneRef    = React.useRef(0);
  // Cooldown: timestamp do ultimo response.create enviado.
  // Impede que eco em loop dispare multiplos response.creates seguidos.
  const lastResponseCreateRef   = React.useRef(0);

  // ── Session tracking refs ─────────────────────────────────────────────────
  const sessionStartRef         = React.useRef<number>(0);      // Date.now() when segment started
  const sessionAccumSecs        = React.useRef<number>(0);      // total accumulated secs (all segments)
  const sessionIntervalRef      = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Inactivity tracking refs ──────────────────────────────────────────────
  const lastActivityRef         = React.useRef<number>(Date.now());
  const inactivityIntervalRef   = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const warnStartRef            = React.useRef<number>(0);

  const callTime = useCallTimer(status === 'connected' && !isPaused);

  // ── Helpers: clear timers ─────────────────────────────────────────────────
  const clearSessionInterval = React.useCallback(() => {
    if (sessionIntervalRef.current) {
      clearInterval(sessionIntervalRef.current);
      sessionIntervalRef.current = null;
    }
  }, []);

  const clearInactivityInterval = React.useCallback(() => {
    if (inactivityIntervalRef.current) {
      clearInterval(inactivityIntervalRef.current);
      inactivityIntervalRef.current = null;
    }
  }, []);

  // ── Audio mode ────────────────────────────────────────────────────────────
  // NOTA: deixamos InCallManager ser o único dono do AVAudioSession durante
  // a chamada. setAudioModeAsync não é chamado no fluxo de call porque sobrescreve
  // o mode .voiceChat necessário para o AEC hardware do iOS. Essa função fica
  // apenas como utilitária caso precise ser chamada fora do fluxo da chamada.
  const applyAudioMode = React.useCallback(async (speakerOn?: boolean) => {
    try {
      const useSpeaker = speakerOn !== undefined ? speakerOn : isSpeakerRef.current;
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
        shouldRouteThroughEarpiece: !useSpeaker,
      });
    } catch (e) { console.warn('applyAudioMode:', e); }
  }, []);


  // ── Mute ──────────────────────────────────────────────────────────────────
  // No react-native-webrtc, desabilitar o track via stream nao para o envio.
  // É necessário desabilitar via RTCPeerConnection senders E via stream.
  const applyMute = React.useCallback((muted: boolean) => {
    // Via stream (fallback)
    localStreamRef.current?.getAudioTracks().forEach((track: any) => {
      track.enabled = !muted;
    });
    // Via PC senders (método confiável no react-native-webrtc)
    pcRef.current?.getSenders?.()?.forEach?.((sender: any) => {
      if (sender?.track?.kind === 'audio') {
        sender.track.enabled = !muted;
      }
    });
  }, []);

  // ── Enviar evento via data channel ────────────────────────────────────────
  const sendEvent = React.useCallback((event: object) => {
    if (dcRef.current?.readyState === 'open') {
      dcRef.current.send(JSON.stringify(event));
    }
  }, []);

  // ── Avatar ring animations ────────────────────────────────────────────────
  const ringScale   = React.useRef(new Animated.Value(1)).current;
  const ringOpacity = React.useRef(new Animated.Value(0.5)).current;
  const loopRef     = React.useRef<Animated.CompositeAnimation | null>(null);

  React.useEffect(() => {
    loopRef.current?.stop();

    if (status === 'connecting') {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ringScale,   { toValue: 1.12, duration: 900, useNativeDriver: true }),
            Animated.timing(ringOpacity, { toValue: 0.2,  duration: 900, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(ringScale,   { toValue: 1, duration: 900, useNativeDriver: true }),
            Animated.timing(ringOpacity, { toValue: 0.45, duration: 900, useNativeDriver: true }),
          ]),
        ])
      );
      loopRef.current.start();
    } else if (status === 'connected' && charlotteSpeaking && !isPaused) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ringScale,   { toValue: 1.20, duration: 350, useNativeDriver: true }),
            Animated.timing(ringOpacity, { toValue: 0.6,  duration: 350, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(ringScale,   { toValue: 1.06, duration: 350, useNativeDriver: true }),
            Animated.timing(ringOpacity, { toValue: 0.25, duration: 350, useNativeDriver: true }),
          ]),
        ])
      );
      loopRef.current.start();
    } else if (status === 'connected' && !isPaused) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ringScale,   { toValue: 1.05, duration: 1800, useNativeDriver: true }),
            Animated.timing(ringOpacity, { toValue: 0.22, duration: 1800, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(ringScale,   { toValue: 1, duration: 1800, useNativeDriver: true }),
            Animated.timing(ringOpacity, { toValue: 0.10, duration: 1800, useNativeDriver: true }),
          ]),
        ])
      );
      loopRef.current.start();
    } else {
      ringScale.setValue(1);
      ringOpacity.setValue(0);
    }

    return () => loopRef.current?.stop();
  }, [status, charlotteSpeaking, isPaused]);

  const ringColor = status === 'connecting' ? '#F97316' : '#A3FF3C';

  // ── Pool: carregar ao abrir o modal ───────────────────────────────────────
  const loadPool = React.useCallback(async () => {
    setPoolLoading(true);
    setPoolExhausted(false);
    try {
      const { secondsRemaining } = await getLiveVoiceStatus(userLevel);
      setPoolRemaining(secondsRemaining);
      poolBaseRef.current = secondsRemaining; // base para o session timer contar a partir do restante real
      if (secondsRemaining <= 0) {
        setPoolExhausted(true);
        setStatus('error');
        setErrorMsg(
          userLevel === 'Novice'
            ? `Você usou seus ${Math.floor(levelPool / 60)} min de Live Voice deste mês. Volta no mês que vem!`
            : `You've used your ${Math.floor(levelPool / 60)}-min monthly Live Voice allowance. Come back next month!`
        );
      }
      return secondsRemaining;
    } catch (e) {
      console.warn('[LiveVoice] loadPool error:', e);
      return levelPool; // fallback: allow call
    } finally {
      setPoolLoading(false);
    }
  }, [userLevel]);

  // ── Session timer: conta segundos enquanto conectado ─────────────────────
  const startSessionTimer = React.useCallback(() => {
    sessionStartRef.current = Date.now();
    clearSessionInterval();
    sessionIntervalRef.current = setInterval(() => {
      // Usa poolBaseRef (segundos restantes do DB ao abrir o modal) como base,
      // não o pool total — assim o timer conta a partir do que realmente sobra.
      const elapsedInSession = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      const remaining = Math.max(0, poolBaseRef.current - elapsedInSession);
      setPoolRemaining(remaining);
      if (remaining <= 0) {
        setPoolExhausted(true);
      }
    }, 1000);
  }, [clearSessionInterval]);

  // ── Inactivity timer ──────────────────────────────────────────────────────
  const resetActivity = React.useCallback(() => {
    lastActivityRef.current = Date.now();
    if (inactivityWarning) {
      setInactivityWarning(false);
      setWarningCountdown(30);
    }
  }, [inactivityWarning]);

  const startInactivityTimer = React.useCallback(() => {
    lastActivityRef.current = Date.now();
    clearInactivityInterval();
    inactivityIntervalRef.current = setInterval(() => {
      const idleSec = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      if (idleSec >= INACTIVITY_PAUSE_SEC) {
        // Pausar por inatividade
        return; // será tratado pelo useEffect abaixo
      }
      if (idleSec >= INACTIVITY_WARN_SEC) {
        if (!warnStartRef.current) warnStartRef.current = Date.now();
        const secsUntilPause = Math.max(0, INACTIVITY_PAUSE_SEC - idleSec);
        setInactivityWarning(true);
        setWarningCountdown(secsUntilPause);
      } else {
        if (inactivityWarning) {
          setInactivityWarning(false);
          setWarningCountdown(30);
          warnStartRef.current = 0;
        }
      }
    }, 1000);
  }, [clearInactivityInterval, inactivityWarning]);

  // ── Auto-pause quando inatividade atingir limite ─────────────────────────
  React.useEffect(() => {
    if (!inactivityWarning) return;
    if (warningCountdown <= 0) {
      // Disparar pausa
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      pauseSession();
    }
  }, [warningCountdown, inactivityWarning]); // eslint-disable-line

  // ── Disconnect WebRTC (sem fechar modal) ─────────────────────────────────
  // Mantém o ref de turnos sincronizado com o state pra uso em callbacks finais.
  React.useEffect(() => { conversationTurnsRef.current = conversationTurns; }, [conversationTurns]);

  // Salva registro da chamada (charlotte_live_calls) + dispara resumo via /api/summarize-call.
  // Idempotente: só salva 1x por chamada (callRecordSavedRef).
  const saveCallRecord = React.useCallback(async (secsUsed: number) => {
    if (callRecordSavedRef.current) return;
    if (!callStartedAtRef.current) return;
    const turns = conversationTurnsRef.current;
    if (turns.length === 0 && secsUsed < 5) return; // chamada vazia/curta

    callRecordSavedRef.current = true;

    const transcript = turns
      .map(t => `${t.role === 'user' ? 'User' : 'Charlotte'}: ${t.text}`)
      .join('\n');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      await fetch(`${API_BASE_URL}/api/summarize-call`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          userId,
          userLevel,
          transcript,
          durationSeconds: secsUsed,
          startedAt:       callStartedAtRef.current,
        }),
      }).catch(err => console.warn('[saveCallRecord] fetch error:', err));
    } catch (err) {
      console.warn('[saveCallRecord] error:', err);
    }
  }, [userLevel]);

  const disconnectWebRTC = React.useCallback(() => {
    if (pendingResponseTimerRef.current) {
      clearTimeout(pendingResponseTimerRef.current);
      pendingResponseTimerRef.current = null;
    }
    if (captionClearTimerRef.current) {
      clearTimeout(captionClearTimerRef.current);
      captionClearTimerRef.current = null;
    }
    if (translationDismissTimerRef.current) {
      clearTimeout(translationDismissTimerRef.current);
      translationDismissTimerRef.current = null;
    }
    localStreamRef.current?.getTracks().forEach((t: any) => t.stop());
    localStreamRef.current = null;
    dcRef.current?.close();
    dcRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    InCallManager.stopRingback();
    InCallManager.stop(); // devolve o AVAudioSession ao estado anterior
    charlotteSpeakingRef.current = false;
    responseActiveRef.current    = false;
    setCharlotteSpeaking(false);
    setUserSpeaking(false);
    setLiveCaption('');
  }, []);

  // ── Disparar a despedida (função pura — pode ser chamada de vários lugares)
  const triggerFarewell = React.useCallback(() => {
    // Idempotente: só executa uma vez
    if (farewellActiveRef.current) return;
    if (!farewellPendingRef.current) return;

    if (dcRef.current?.readyState !== 'open') {
      // Data channel fechado — fallback: fechar direto com mensagem de erro
      farewellPendingRef.current = false;
      const secsUsed = sessionAccumSecs.current + Math.floor((Date.now() - sessionStartRef.current) / 1000);
      consumeLiveVoiceSeconds(secsUsed).catch(console.warn);
      saveCallRecord(secsUsed);
      sessionAccumSecs.current = 0;
      disconnectWebRTC();
      setStatus('error');
      setErrorMsg(
        userLevel === 'Novice'
          ? `Seus ${Math.floor(levelPool / 60)} min de Live Voice deste mês acabaram. Volta no mês que vem!`
          : `Your ${Math.floor(levelPool / 60)}-min monthly allowance is up. See you next month!`
      );
      return;
    }

    // Marcar como ativa APÓS confirmar que vamos disparar
    farewellActiveRef.current = true;
    farewellPendingRef.current = false;

    // Desativar VAD — Charlotte não deve reagir a mais nada do usuário.
    // GA: turn_detection ficou aninhado em audio.input + session.type obrigatório.
    sendEvent({
      type: 'session.update',
      session: {
        type: 'realtime',
        audio: { input: { turn_detection: null } },
      },
    });

    // Sorteia uma despedida do pool (varia a cada pool-exhausted)
    const farewellLine = getRandomFarewell(userLevel, userName);
    const farewellInstruction = userLevel === 'Novice'
      ? `Diga exatamente isto, com calor e naturalidade, como sua última mensagem: "${farewellLine}" Não diga mais nada além disso.`
      : `Say exactly this, warmly and naturally, as your last message: "${farewellLine}" Say nothing else.`;

    setTimeout(() => {
      if (dcRef.current?.readyState === 'open') {
        charlotteSpeakingRef.current = true;
        setCharlotteSpeaking(true);
        sendEvent({
          type: 'response.create',
          response: {
            // GA: modalities renamed to output_modalities (audio implies text too).
            output_modalities: ['audio'],
            instructions: farewellInstruction,
            max_output_tokens: 80,
          },
        });
      }
    }, 200);
  }, [sendEvent, disconnectWebRTC, userLevel, userName, levelPool]);

  // ── Pool esgotado — preparar despedida (aguarda momento seguro) ────────────
  React.useEffect(() => {
    if (!poolExhausted || status !== 'connected') return;
    if (farewellPendingRef.current || farewellActiveRef.current) return;

    farewellPendingRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    clearSessionInterval();
    clearInactivityInterval();

    // Se Charlotte NÃO está falando agora, dispara a despedida imediatamente.
    // Se ela ESTÁ falando, espera — o handler de response.done chamará triggerFarewell
    // quando a fala atual dela terminar naturalmente (fluxo muito mais suave).
    if (!responseActiveRef.current) {
      triggerFarewell();
    }
    // Se responseActive, não faz nada aqui — response.done handler cuida.
  }, [poolExhausted]); // eslint-disable-line

  // ── Pause por inatividade ─────────────────────────────────────────────────
  const pauseSession = React.useCallback(() => {
    const segSecs = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    const totalSecs = sessionAccumSecs.current + segSecs;
    // Salvar no DB (fire-and-forget)
    consumeLiveVoiceSeconds(totalSecs).catch(console.warn);
    sessionAccumSecs.current = 0;
    clearSessionInterval();
    clearInactivityInterval();
    setInactivityWarning(false);
    setWarningCountdown(30);
    warnStartRef.current = 0;
    disconnectWebRTC();
    setIsPaused(true);
    setStatus('disconnected');
  }, [disconnectWebRTC, clearSessionInterval, clearInactivityInterval]);

  // ── Connect via WebRTC ────────────────────────────────────────────────────
  const connect = React.useCallback(async () => {
    setStatus('connecting');
    setErrorMsg('');
    setIsPaused(false);
    setInactivityWarning(false);
    setWarningCountdown(30);

    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setErrorMsg(userLevel === 'Novice' ? 'Permissão de microfone negada' : 'Microphone permission denied');
        setStatus('error');
        return;
      }

      // CAMINHO A: InCallManager é a PRIMEIRA coisa a tocar no AVAudioSession.
      // Ele configura category=.playAndRecord + mode=.voiceChat, que é o que o
      // iOS precisa para ativar o Voice Processing I/O unit (AEC hardware).
      // Nenhum setAudioModeAsync é chamado no fluxo de chamada para não sobrescrever.
      InCallManager.start({ media: 'audio' });

      // 500ms para o AVAudioSession estabilizar no mode .voiceChat antes do
      // getUserMedia. Sem esse delay, o audio unit do mic pode ser criado
      // durante a transição e acabar sem AEC.
      await new Promise(resolve => setTimeout(resolve, 500));

      InCallManager.startRingback('_DEFAULT_');
      // startRingback no iOS reconfigura AVAudioSession internamente sem reaplica
      // o speaker override. O AVAudioPlayer do ringback inicializa em thread nativa,
      // então o setForceSpeakerphoneOn precisa de um delay para ter efeito.
      // Android responde imediatamente; iOS precisa de ~200ms.
      if (Platform.OS === 'android') {
        InCallManager.setForceSpeakerphoneOn(isSpeakerRef.current);
      } else {
        setTimeout(() => InCallManager.setForceSpeakerphoneOn(isSpeakerRef.current), 200);
      }

      // Passa o access token para validação server-side do pool
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const tokenRes = await fetch(`${API_BASE_URL}/api/realtime-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userLevel,
          userName,
          accessToken: authSession?.access_token,
        }),
      });
      if (tokenRes.status === 403) {
        const { error: serverErr } = await tokenRes.json().catch(() => ({ error: '' }));
        if (serverErr === 'monthly_pool_exhausted') {
          setPoolExhausted(true);
          setStatus('error');
          setErrorMsg(
            userLevel === 'Novice'
              ? `Você usou seus ${Math.floor(levelPool / 60)} min de Live Voice deste mês. Volta no mês que vem!`
              : `You've used your ${Math.floor(levelPool / 60)}-min monthly Live Voice allowance. Come back next month!`
          );
          InCallManager.stopRingback();
          return;
        }
        throw new Error('Failed to get session token (403)');
      }
      if (!tokenRes.ok) throw new Error('Failed to get session token');
      const { clientSecret } = await tokenRes.json();
      if (!clientSecret) throw new Error('No client secret returned');

      // echoCancellation removes Charlotte's speaker output from the mic signal
      // before it reaches the server VAD — this is the correct way to prevent
      // Charlotte from "hearing herself". noiseSuppression and autoGainControl
      // improve speech quality on mobile.
      const stream = await mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } as any,
        video: false,
      });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      stream.getTracks().forEach((track: any) => pc.addTrack(track, stream));

      pc.ontrack = () => {};

      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onopen = () => {
        InCallManager.stopRingback();
        setStatus('connected');
        wasConnectedRef.current = true;
        if (!callStartedAtRef.current) {
          callStartedAtRef.current = new Date().toISOString();
        }
        // Inicializar o echo guard com timestamp atual — evita que o guard
        // passe imediatamente (ref=0 → msSinceDone=∞) antes do primeiro
        // audio da Charlotte terminar, o que causava eco da abertura virar
        // turno do usuario.
        lastCharlotteDoneRef.current = Date.now();

        const greeting = getRandomGreeting(userLevel);
        // Idioma alvo: Novice fala português; Inter e Advanced, inglês.
        // O hint em transcription.language acelera + melhora o STT do input.
        const inputLang = userLevel === 'Novice' ? 'pt' : 'en';
        // GA shape: session needs type:'realtime', voice/format/transcription/
        // turn_detection moved under audio.{input,output}, modalities renamed
        // to output_modalities, max_response_output_tokens → max_output_tokens.
        dc.send(JSON.stringify({
          type: 'session.update',
          session: {
            type: 'realtime',
            model: MODEL,
            output_modalities: ['audio'],
            instructions: getSystemPrompt(userLevel, userName, greeting),
            max_output_tokens: 600,
            audio: {
              input: {
                // GA: format é objeto { type, rate } em vez de string 'pcm16'.
                format: { type: 'audio/pcm', rate: 24000 },
                // near_field = mic próximo (telefone). Limpa ruído de speaker no
                // viva voz antes do VAD/STT — resolve eco residual e melhora
                // recognition. Caveat: pode ter spike de latência no 1º turno.
                noise_reduction: { type: 'near_field' },
                transcription: {
                  // gpt-realtime-whisper emite .delta streaming + .completed
                  // canônico (whisper-1 só emitia .completed, causando
                  // transcrição truncada em turnos longos).
                  model: 'gpt-realtime-whisper',
                  language: inputLang, // ISO-639-1 hint — accuracy + latency
                  // 'medium' dá mais contexto antes de finalizar palavras
                  // (vs 'low' que truncava 'Vamos' e palavras curtas).
                  delay: 'medium',
                },
                turn_detection: {
                  // threshold 0.6 (era 0.90): com noise_reduction near_field,
                  // o sinal já chega limpo no VAD — não precisa filtrar tão
                  // agressivo. 0.6 captura fala mais baixa e o começo do turno.
                  type: 'server_vad',
                  threshold: 0.6,
                  prefix_padding_ms: 400,
                  silence_duration_ms: 1500,
                  create_response: false,
                },
              },
              output: {
                format: { type: 'audio/pcm', rate: 24000 },
                voice: 'coral',
              },
            },
          },
        }));

        setTimeout(() => {
          if (dcRef.current?.readyState === 'open') {
            // Marcar Charlotte como falando ANTES do response.create —
            // garante que charlotteSpeakingRef=true quando o VAD capturar
            // o eco da abertura, bloqueando speech_stopped corretamente.
            // Apenas o ref — sem setCharlotteSpeaking para evitar re-render
            // que pode interferir no pipeline de audio no iOS.
            charlotteSpeakingRef.current = true;
            dc.send(JSON.stringify({ type: 'response.create' }));
          }
        }, 500);

        // InCallManager.start foi chamado antes do getUserMedia para garantir
        // que o AVAudioSession esteja em .voiceChat mode quando o WebRTC
        // inicializa o audio unit do mic (ativa AEC hardware no iOS).
        // setForceSpeakerphoneOn também foi chamado antes, mas repetimos aqui
        // para Android que pode precisar depois do setup completo do audio session.
        if (Platform.OS === 'android') {
          setTimeout(() => {
            InCallManager.setForceSpeakerphoneOn(isSpeakerRef.current);
          }, 300);
        }

        // Iniciar timers
        startSessionTimer();
        startInactivityTimer();
        track('live_voice_started', { level: userLevel });
      };

      dc.onmessage = (event: any) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'response.audio.delta':            // legacy alias (pre-GA)
            case 'response.output_audio.delta':
              // Charlotte started sending audio.
              // Do NOT disable the mic — the user must be able to interrupt at any
              // moment by speaking. InCallManager (call mode) provides AEC so
              // Charlotte's speaker audio is suppressed before reaching the VAD.
              // Echo protection is handled by the 700ms time-guard in speech_stopped
              // and by create_response:false (VAD events can't auto-trigger responses).
              responseActiveRef.current = true;
              lastActivityRef.current = Date.now();
              if (!charlotteSpeakingRef.current) {
                charlotteSpeakingRef.current = true;
                setCharlotteSpeaking(true);
                setUserSpeaking(false);
                sendEvent({ type: 'input_audio_buffer.clear' });
              }
              // Registrar quando o áudio da despedida começou a chegar
              if (farewellActiveRef.current && farewellAudioStartRef.current === 0) {
                farewellAudioStartRef.current = Date.now();
              }
              break;

            case 'response.text.delta':             // legacy alias (pre-GA)
            case 'response.output_text.delta':
              // Accumulate deltas as primary source
              charlotteTextAccRef.current += (msg.delta ?? '');
              break;

            case 'response.audio_transcript.delta':  // legacy alias (pre-GA)
            case 'response.output_audio_transcript.delta':
              // Streaming caption — Charlotte fala. Acumula até .done.
              // Se um timer de clear já está rodando (resposta anterior finalizada),
              // cancela e começa caption fresca pra essa nova resposta.
              {
                const delta = msg.delta ?? '';
                if (captionClearTimerRef.current) {
                  clearTimeout(captionClearTimerRef.current);
                  captionClearTimerRef.current = null;
                  setLiveCaption(delta);
                } else {
                  // Cap de segurança: 800 chars (cabe sentenças longas, evita memory growth)
                  setLiveCaption(prev => (prev + delta).slice(-800));
                }
                // Nova caption chegou — dispensa tradução anterior se houver
                if (translationDismissTimerRef.current) {
                  clearTimeout(translationDismissTimerRef.current);
                  translationDismissTimerRef.current = null;
                }
                setCaptionTranslation(null);
              }
              break;

            case 'response.audio_transcript.done':   // legacy alias (pre-GA)
            case 'response.output_audio_transcript.done':
              // Texto da resposta terminou de gerar. Mas o áudio ainda toca por
              // ~1-3s — schedule clear longo (7s) pra caption ficar visível
              // durante toda a reprodução. response.audio.done abaixo encurta o
              // timer pra 2s quando o áudio realmente termina.
              if (captionClearTimerRef.current) clearTimeout(captionClearTimerRef.current);
              captionClearTimerRef.current = setTimeout(() => {
                setLiveCaption('');
                captionClearTimerRef.current = null;
              }, 7000);
              break;

            case 'response.done':
              // Lifecycle complete — extract Charlotte's text from the response payload.
              // Primary: accumulated deltas from response.text.delta events.
              // Fallback: msg.response.output (response.done always carries the full output).
              responseActiveRef.current = false;
              lastActivityRef.current = Date.now();
              {
                let charlotteText = charlotteTextAccRef.current.trim();
                charlotteTextAccRef.current = '';

                // Fallback: extract from response.done payload (more reliable in WebRTC mode).
                // GA renamed content types: text → output_text, audio → output_audio.
                if (!charlotteText) {
                  const output = msg.response?.output ?? [];
                  for (const item of output) {
                    if (item.role === 'assistant' || item.type === 'message') {
                      for (const c of item.content ?? []) {
                        if ((c.type === 'text' || c.type === 'output_text') && c.text) {
                          charlotteText += c.text;
                        }
                        if ((c.type === 'audio' || c.type === 'output_audio') && c.transcript) {
                          charlotteText += c.transcript;
                        }
                      }
                    }
                  }
                  charlotteText = charlotteText.trim();
                }

                if (charlotteText) {
                  setConversationTurns(prev => [...prev, { role: 'assistant', text: charlotteText }]);
                  lastCharlotteTextRef.current = charlotteText; // usado para detecção de eco
                }

                // Se a despedida está PENDENTE (pool esgotou durante esta fala),
                // disparar agora que Charlotte terminou a sentença dela naturalmente.
                // Pequeno delay de 400ms para parecer natural (respiração entre frases).
                if (farewellPendingRef.current && !farewellActiveRef.current) {
                  setTimeout(() => {
                    triggerFarewell();
                  }, 400);
                }
                // Fallback de segurança de 12s caso o response.audio.done da
                // despedida nunca chegue — evita modal travado.
                if (farewellActiveRef.current) {
                  setTimeout(() => {
                    if (farewellActiveRef.current) {
                      farewellActiveRef.current = false;
                      farewellAudioStartRef.current = 0;
                      const secsUsed = sessionAccumSecs.current + Math.floor((Date.now() - sessionStartRef.current) / 1000);
                      consumeLiveVoiceSeconds(secsUsed).catch(console.warn);
                      saveCallRecord(secsUsed);
                      sessionAccumSecs.current = 0;
                      disconnect();
                      onClose();
                    }
                  }, 12000);
                }
              }
              break;

            case 'conversation.item.input_audio_transcription.delta':
              // gpt-realtime-whisper emite deltas streaming enquanto o usuário
              // ainda fala. Acumulamos por item_id para uso futuro (detecção
              // precoce de eco, live caption do usuário). O canônico vem em
              // .completed e sobrescreve o acumulado.
              {
                const itemId = msg.item_id;
                const delta  = msg.delta ?? '';
                if (itemId && delta) {
                  const prev = userTranscriptDeltasRef.current.get(itemId) ?? '';
                  userTranscriptDeltasRef.current.set(itemId, prev + delta);
                }
              }
              break;

            case 'conversation.item.input_audio_transcription.completed':
              // Transcrição chegou. Decidir: é eco ou fala real?
              // Se eco → cancelar response.create pendente (não adicionar ao histórico).
              // Se fala real → disparar response.create imediatamente (sem esperar fallback).
              {
                // Preferir o transcript do .completed (canônico). Fallback
                // para o acumulado de deltas caso o servidor não envie.
                const itemId = msg.item_id;
                let userText: string = (msg.transcript ?? '').trim();
                if (!userText && itemId) {
                  userText = (userTranscriptDeltasRef.current.get(itemId) ?? '').trim();
                }
                if (itemId) userTranscriptDeltasRef.current.delete(itemId);
                const isEcho = userText.length > 0
                  && lastCharlotteTextRef.current.length > 0
                  && wordOverlap(userText, lastCharlotteTextRef.current) >= 0.5;

                if (isEcho) {
                  console.log(`[LiveVoice] echo blocked: "${userText.slice(0, 60)}"`);
                  if (pendingResponseTimerRef.current) {
                    clearTimeout(pendingResponseTimerRef.current);
                    pendingResponseTimerRef.current = null;
                  }
                  break;
                }

                if (userText) {
                  setConversationTurns(prev => [...prev, { role: 'user', text: userText }]);
                }

                // Transcrição não-eco chegou: se ainda há timer pendente, disparar
                // response.create agora (sem esperar o fallback de 2.5s).
                if (pendingResponseTimerRef.current) {
                  clearTimeout(pendingResponseTimerRef.current);
                  pendingResponseTimerRef.current = null;
                  if (dcRef.current?.readyState === 'open' && userText) {
                    lastResponseCreateRef.current = Date.now();
                    sendEvent({ type: 'response.create' });
                  }
                }
              }
              break;

            case 'response.audio.done':              // legacy alias (pre-GA)
            case 'response.output_audio.done':
              // Último chunk de áudio entregue ao WebRTC.
              // Estratégia anti-eco de 3 camadas:
              //   1. Stampar lastCharlotteDoneRef agora (guard de 6000ms no speech_stopped)
              //   2. Mutar fisicamente o mic por 2000ms — bloqueia eco de loudspeaker
              //   3. Manter charlotteSpeakingRef=true por 500ms extras (drain do jitter buffer)
              responseActiveRef.current = false;
              lastCharlotteDoneRef.current = Date.now();
              // Caption: áudio do servidor terminou; jitter buffer ainda toca por
              // ~1-2s. Reagendar clear pra 2s a partir de agora (encurta os 7s
              // que tinham sido agendados em audio_transcript.done).
              if (captionClearTimerRef.current) clearTimeout(captionClearTimerRef.current);
              captionClearTimerRef.current = setTimeout(() => {
                setLiveCaption('');
                captionClearTimerRef.current = null;
              }, 2000);
              applyMute(true);
              setTimeout(() => {
                if (!isMutedRef.current) applyMute(false);
                charlotteSpeakingRef.current = false;
                setCharlotteSpeaking(false);
              }, 2000);
              // Despedida: servidor terminou de enviar o áudio. O playback ainda
              // está rolando no device — o jitter buffer do WebRTC no iOS pode
              // ficar 1-2s atrás do audio.done em condições normais, e até mais
              // em rede instável. Buffer de 7s garante que o usuário ouça a frase
              // toda antes do disconnect. Extra é silêncio, não prejudica UX.
              if (farewellActiveRef.current) {
                setTimeout(() => {
                  if (farewellActiveRef.current) {
                    farewellActiveRef.current = false;
                    farewellAudioStartRef.current = 0;
                    const secsUsed = sessionAccumSecs.current + Math.floor((Date.now() - sessionStartRef.current) / 1000);
                    consumeLiveVoiceSeconds(secsUsed).catch(console.warn);
                    saveCallRecord(secsUsed);
                    sessionAccumSecs.current = 0;
                    disconnect();
                    onClose();
                  }
                }, 7000);
              }
              break;

            case 'input_audio_buffer.speech_started':
              // Usuario falou — pode ser interrupcao real ou eco da Charlotte.
              speechStartedAtRef.current = Date.now(); // registrar início para cálculo de duração
              lastActivityRef.current = Date.now();
              setUserSpeaking(true);
              setInactivityWarning(false);
              setWarningCountdown(30);
              warnStartRef.current = 0;
              if (charlotteSpeakingRef.current) {
                // Interrupcao (ou eco enquanto Charlotte fala): cancelar
                // resposta atual. lastCharlotteDone = now para que o echo guard
                // em speech_stopped bloqueie eco subsequente.
                charlotteSpeakingRef.current = false;
                setCharlotteSpeaking(false);
                lastCharlotteDoneRef.current = Date.now();
                if (responseActiveRef.current) {
                  responseActiveRef.current = false;
                  sendEvent({ type: 'response.cancel' });
                }
              }
              break;

            case 'input_audio_buffer.speech_stopped':
              setUserSpeaking(false);
              // ESTRATÉGIA DE FILTRO DE ECO:
              // Em vez de disparar response.create imediatamente (que fazia
              // Charlotte responder ao próprio eco antes da transcrição chegar),
              // agendamos um timer de fallback de 2.5s. A transcrição geralmente
              // chega em 500-1500ms. Quando chega, o handler de transcription.completed:
              //   - Se for eco (sobreposição >50% com a última fala da Charlotte):
              //     cancela o timer → Charlotte não responde ao eco.
              //   - Se for fala real: cancela o timer e dispara response.create
              //     imediatamente (zero latência extra).
              // Se transcrição nunca chegar em 2.5s (raro): timer expira e
              // response.create dispara mesmo assim, para não deixar o usuário
              // sem resposta.
              if (!charlotteSpeakingRef.current
                  && !farewellPendingRef.current
                  && !farewellActiveRef.current) {
                const speechDuration  = Date.now() - speechStartedAtRef.current;
                const msSinceDone     = Date.now() - lastCharlotteDoneRef.current;
                const msSinceLast     = Date.now() - lastResponseCreateRef.current;
                if (speechDuration > 300 && msSinceDone > 500 && msSinceLast > 500) {
                  if (pendingResponseTimerRef.current) {
                    clearTimeout(pendingResponseTimerRef.current);
                  }
                  pendingResponseTimerRef.current = setTimeout(() => {
                    pendingResponseTimerRef.current = null;
                    if (dcRef.current?.readyState === 'open') {
                      lastResponseCreateRef.current = Date.now();
                      sendEvent({ type: 'response.create' });
                    }
                  }, 250);
                }
              }
              break;

            case 'response.cancelled':
              responseActiveRef.current = false;
              charlotteSpeakingRef.current = false;
              setCharlotteSpeaking(false);
              break;

            case 'error':
              console.error('[LiveVoice] server error:', msg.error);
              break;
          }
        } catch { /* ignora erros de parse */ }
      };

      dc.onerror = (e: any) => console.warn('[LiveVoice] data channel error:', e);

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          console.warn('[LiveVoice] ICE', pc.iceConnectionState);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(
        `https://api.openai.com/v1/realtime/calls?model=${MODEL}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${clientSecret}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        }
      );

      if (!sdpRes.ok) {
        const err = await sdpRes.text();
        throw new Error(`SDP exchange failed: ${err}`);
      }

      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp } as any);

    } catch (error: any) {
      // Limpar recursos parcialmente alocados (mic, peer connection)
      localStreamRef.current?.getTracks().forEach((t: any) => t.stop());
      localStreamRef.current = null;
      dcRef.current?.close(); dcRef.current = null;
      pcRef.current?.close(); pcRef.current = null;
      InCallManager.stopRingback();
      console.error('[LiveVoice] connect error:', error);
      setStatus('error');
      setErrorMsg(
        userLevel === 'Novice'
          ? 'Não foi possível conectar. Tente novamente.'
          : 'Could not connect. Please try again.'
      );
    }
  }, [userLevel, userName, sendEvent, applyAudioMode, startSessionTimer, startInactivityTimer]);

  // ── Disconnect completo (fecha modal) ────────────────────────────────────
  const disconnect = React.useCallback(() => {
    clearSessionInterval();
    clearInactivityInterval();
    localStreamRef.current?.getTracks().forEach((t: any) => t.stop());
    localStreamRef.current = null;
    dcRef.current?.close();
    dcRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    InCallManager.stopRingback();
    InCallManager.stop(); // devolve o AVAudioSession ao estado anterior
    charlotteSpeakingRef.current = false;
    responseActiveRef.current    = false;
    setStatus('disconnected');
    setCharlotteSpeaking(false);
    setUserSpeaking(false);
    setIsPaused(false);
    setInactivityWarning(false);
    setWarningCountdown(30);
    warnStartRef.current = 0;
  }, [clearSessionInterval, clearInactivityInterval]);

  const handleEndCall = React.useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Registrar analytics
    const segSecsForTrack = sessionStartRef.current > 0
      ? Math.floor((Date.now() - sessionStartRef.current) / 1000) : 0;
    trackDuration('live_voice_ended', sessionAccumSecs.current + segSecsForTrack, { level: userLevel });
    // Salvar segundos acumulados
    const segSecs = sessionStartRef.current > 0
      ? Math.floor((Date.now() - sessionStartRef.current) / 1000)
      : 0;
    const totalSecs = sessionAccumSecs.current + segSecs;
    if (totalSecs > 0) {
      consumeLiveVoiceSeconds(totalSecs).catch(console.warn);
      sessionAccumSecs.current = 0;
    }
    saveCallRecord(totalSecs);
    // Flush any accumulated Charlotte text before disconnecting
    if (charlotteTextAccRef.current.trim()) {
      setConversationTurns(prev => [
        ...prev,
        { role: 'assistant', text: charlotteTextAccRef.current.trim() },
      ]);
      charlotteTextAccRef.current = '';
    }
    disconnect();
    onClose();
  }, [disconnect, onClose]);

  const handleMute = React.useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsMuted(v => {
      const next = !v;
      isMutedRef.current = next;
      applyMute(next);
      return next;
    });
  }, [applyMute]);

  const handleSpeakerToggle = React.useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSpeaker(v => {
      const next = !v;
      isSpeakerRef.current = next;
      InCallManager.setForceSpeakerphoneOn(next);
      return next;
    });
  }, []);

  const handleResume = React.useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const remaining = await loadPool();
    if (remaining > 0) {
      connect();
    }
  }, [loadPool, connect]);

  // ── StatusBar: imperativo para funcionar dentro de Modal no Android ─────────
  // Sempre seta — inclusive quando fecha (isOpen=false) para restaurar o padrão
  // da app e evitar race condition com o StatusBar declarativo da home screen.
  React.useEffect(() => {
    const callActive = isOpen && !showTranscript;
    const style = callActive ? 'light-content' : 'dark-content';
    const bg    = callActive ? '#07071C' : '#FFFFFF';
    StatusBar.setBarStyle(style, true);
    if (Platform.OS === 'android') StatusBar.setBackgroundColor(bg, true);
  }, [isOpen, showTranscript]);

  // ── Lifecycle: abrir/fechar modal ─────────────────────────────────────────
  React.useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setIsPaused(false);
      setPoolExhausted(false);
      setInactivityWarning(false);
      setWarningCountdown(30);
      setShowTranscript(false);
      setConversationTurns([]);
      charlotteTextAccRef.current = '';
      lastCharlotteTextRef.current = '';
      wasConnectedRef.current = false;
      callStartedAtRef.current = null;
      callRecordSavedRef.current = false;
      farewellPendingRef.current = false;
      farewellActiveRef.current = false;
      farewellAudioStartRef.current = 0;
      sessionAccumSecs.current = 0;
      warnStartRef.current = 0;
      loadPool().then(remaining => {
        if (remaining > 0) connect();
      });
    } else {
      // Salvar segundos ao fechar
      if (sessionStartRef.current > 0 && status === 'connected') {
        const segSecs = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        const totalSecs = sessionAccumSecs.current + segSecs;
        if (totalSecs > 0) {
          consumeLiveVoiceSeconds(totalSecs).catch(console.warn);
          sessionAccumSecs.current = 0;
        }
        saveCallRecord(totalSecs);
      }
      disconnect();
    }
  }, [isOpen]); // eslint-disable-line

  // ── RENDER ─────────────────────────────────────────────────────────────────

  const poolMins = Math.ceil(poolRemaining / 60);

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="fullScreen"
      transparent={false}
      hardwareAccelerated
    >

      {/* ── Transcript screen ─────────────────────────────────────────────── */}
      {showTranscript ? (
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          {/* Safe area top — white, matches header */}
          <View style={{ height: insets.top, backgroundColor: '#FFFFFF' }} />

          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 16, height: 56,
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1, borderBottomColor: 'rgba(22,21,58,0.10)',
          }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(124,58,237,0.10)', alignItems: 'center', justifyContent: 'center' }}>
              <ChatCircle size={20} color="#7C3AED" weight="fill" />
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <AppText style={{ fontSize: 9, fontWeight: '700', color: '#9896B8', textTransform: 'uppercase', letterSpacing: 1 }}>Charlotte</AppText>
              <AppText style={{ fontSize: 15, fontWeight: '800', color: '#16153A', letterSpacing: -0.3 }}>
                {userLevel === 'Novice' ? 'Transcrição da Chamada' : 'Call Transcript'}
              </AppText>
            </View>
            {/* Spacer to balance the icon on the left */}
            <View style={{ width: 36 }} />
          </View>

          {/* Bubbles */}
          <ScrollView
            style={{ flex: 1, backgroundColor: '#F4F3FA' }}
            contentContainerStyle={{ padding: 16, paddingBottom: 16, gap: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {conversationTurns.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 }}>
                <AppText style={{ color: '#9896B8', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                  {userLevel === 'Novice'
                    ? 'Transcrição não disponível para esta chamada.'
                    : 'No transcript available for this call.'}
                </AppText>
              </View>
            ) : (
              conversationTurns.map((turn, i) => {
                const isUser = turn.role === 'user';
                return (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 4 }}>
                    {!isUser && (
                      <Image
                        source={require('../../assets/charlotte-avatar.png')}
                        style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8, marginTop: 2, flexShrink: 0, backgroundColor: '#16153A' }}
                      />
                    )}
                    <View style={{
                      maxWidth: '78%',
                      backgroundColor: isUser ? '#A3FF3C' : '#FFFFFF',
                      borderRadius: 18,
                      borderBottomRightRadius: isUser ? 4 : 18,
                      borderBottomLeftRadius: isUser ? 18 : 4,
                      paddingHorizontal: 14, paddingVertical: 10,
                      shadowColor: 'rgba(22,21,58,0.08)', shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
                      elevation: 2,
                    }}>
                      <AppText style={{ fontSize: 14, fontWeight: '500', color: isUser ? '#16153A' : '#16153A', lineHeight: 20 }}>
                        {turn.text}
                      </AppText>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Close button in bottom safe area */}
          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1, borderTopColor: 'rgba(22,21,58,0.08)',
            paddingBottom: insets.bottom,
          }}>
            <TouchableOpacity
              onPress={() => { setShowTranscript(false); onClose(); }}
              style={{
                marginHorizontal: 24, marginTop: 12, marginBottom: 12,
                backgroundColor: '#7C3AED',
                borderRadius: 14, paddingVertical: 15,
                alignItems: 'center',
              }}
            >
              <AppText style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
                {userLevel === 'Novice' ? 'Fechar' : 'Close'}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
      <>
      <View style={{ flex: 1, backgroundColor: '#07071C', paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32, paddingVertical: 24 }}>

          {/* Caption toggle (absolute, top-right) */}
          <TouchableOpacity
            onPress={toggleCaptions}
            accessibilityLabel={captionsEnabled
              ? (userLevel === 'Novice' ? 'Desligar legendas' : 'Hide captions')
              : (userLevel === 'Novice' ? 'Ligar legendas' : 'Show captions')}
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              position: 'absolute',
              top: 16, right: 20,
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: captionsEnabled ? 'rgba(163,255,60,0.15)' : 'rgba(255,255,255,0.06)',
              borderWidth: 1,
              borderColor: captionsEnabled ? 'rgba(163,255,60,0.4)' : 'rgba(255,255,255,0.12)',
              alignItems: 'center', justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <ClosedCaptioning
              size={20}
              color={captionsEnabled ? '#A3FF3C' : 'rgba(255,255,255,0.6)'}
              weight={captionsEnabled ? 'fill' : 'regular'}
            />
          </TouchableOpacity>

          {/* ── TOP: Nome + Timer + Pool badge ─────────────────────── */}
          <View style={{ alignItems: 'center', paddingTop: 8 }}>
            <AppText style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
              Charlotte
            </AppText>
            {status === 'connected' && !isPaused && (
              <AppText style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, letterSpacing: 2,
                ...(Platform.OS === 'ios'
                  ? { fontVariant: ['tabular-nums'] }
                  : { fontFamily: 'monospace' }) }}>
                {callTime}
              </AppText>
            )}
            {status === 'connecting' && (
              <AppText style={{ color: '#F97316', fontSize: 13 }}>
                {userLevel === 'Novice' ? 'Chamando...' : 'Calling...'}
              </AppText>
            )}
            {isPaused && (
              <AppText style={{ color: '#F97316', fontSize: 13, letterSpacing: 0.5 }}>
                {userLevel === 'Novice' ? 'Pausado por inatividade' : 'Paused — inactive'}
              </AppText>
            )}
            {status === 'error' && (
              <View style={{ alignItems: 'center', gap: 8 }}>
                <AppText style={{ color: '#ef4444', fontSize: 13, textAlign: 'center', paddingHorizontal: 8 }}>
                  {errorMsg}
                </AppText>
                {!poolExhausted && (
                  <TouchableOpacity
                    onPress={() => connect()}
                    style={{
                      backgroundColor: '#A3FF3C', borderRadius: 20,
                      paddingHorizontal: 20, paddingVertical: 8,
                    }}
                  >
                    <AppText style={{ color: '#07071C', fontSize: 13, fontWeight: '700' }}>
                      {userLevel === 'Novice' ? 'Tentar novamente' : 'Try again'}
                    </AppText>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {poolLoading && status === 'idle' && (
              <AppText style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>...</AppText>
            )}
            {/* Aviso crítico apenas quando < 2 min — sem exibir créditos no header */}
            {!poolLoading && !poolExhausted && poolRemaining < 120 && (
              <AppText style={{
                marginTop: 5, fontSize: 12, fontWeight: '500', letterSpacing: 0.2,
                color: poolRemaining < 60 ? '#ef4444' : 'rgba(249,115,22,0.85)',
              }}>
                {userLevel === 'Novice'
                  ? `${poolMins} min restante${poolMins !== 1 ? 's' : ''}`
                  : `${poolMins} min left`}
              </AppText>
            )}
          </View>

          {/* ── CENTER: Avatar + Wave + Caption ─────────────────────── */}
          <View style={{ alignItems: 'center', gap: 24 }}>
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Animated.View style={{
                position: 'absolute',
                width: 148, height: 148, borderRadius: 74,
                borderWidth: 2, borderColor: isPaused ? '#F97316' : ringColor,
                transform: [{ scale: ringScale }],
                opacity: ringOpacity,
              }} />
              <View style={{
                position: 'absolute',
                width: 132, height: 132, borderRadius: 66,
                borderWidth: 1.5,
                borderColor: isPaused
                  ? 'rgba(249,115,22,0.25)'
                  : status === 'connected'
                    ? 'rgba(163,255,60,0.3)'
                    : 'rgba(249,115,22,0.25)',
              }} />
              <Image
                source={require('../../assets/charlotte-avatar.png')}
                style={{
                  width: 120, height: 120, borderRadius: 60,
                  borderWidth: 3,
                  borderColor: isPaused
                    ? '#F97316'
                    : status === 'connected'
                      ? '#A3FF3C'
                      : '#F97316',
                  opacity: isPaused ? 0.6 : 1,
                  backgroundColor: '#16153A',
                }}
                resizeMode="cover"
              />
              {isPaused && (
                <View style={{
                  position: 'absolute',
                  backgroundColor: 'rgba(7,7,28,0.7)',
                  width: 120, height: 120, borderRadius: 60,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Pause size={36} color="#F97316" weight="fill" />
                </View>
              )}
            </View>

            {!isPaused && captionsEnabled && liveCaption.length > 0 && (
              <TouchableOpacity
                onPress={handleCaptionPress}
                activeOpacity={0.7}
                disabled={captionTranslating}
                style={{ paddingHorizontal: 8, alignItems: 'center' }}
              >
                <AppText
                  style={{
                    color: '#FFFFFF',
                    fontSize: 16,
                    lineHeight: 22,
                    fontWeight: '500',
                    textAlign: 'center',
                    minHeight: 44,
                    textShadowColor: 'rgba(0,0,0,0.6)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2,
                  }}
                  numberOfLines={3}
                >
                  {liveCaption}
                </AppText>
                {captionTranslation && (
                  <AppText
                    style={{
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: 14,
                      lineHeight: 19,
                      fontStyle: 'italic',
                      textAlign: 'center',
                      marginTop: 6,
                      paddingHorizontal: 8,
                    }}
                    numberOfLines={3}
                  >
                    {captionTranslation}
                  </AppText>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* ── BOTTOM: controles ou pausa ───────────────────────── */}
          {isPaused ? (
            /* ── Estado pausado ── */
            <View style={{ alignItems: 'center', gap: 16 }}>
              <AppText style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center' }}>
                {userLevel === 'Novice'
                  ? 'Chamada pausada. O timer não correu enquanto esteve ausente.'
                  : 'Call paused. Timer stopped while you were away.'}
              </AppText>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <TouchableOpacity
                  onPress={handleResume}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    backgroundColor: '#A3FF3C', borderRadius: 28,
                    paddingHorizontal: 28, paddingVertical: 14,
                    shadowColor: '#A3FF3C', shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
                  }}
                >
                  <ArrowCounterClockwise size={20} color="#07071C" weight="bold" />
                  <AppText style={{ color: '#07071C', fontSize: 15, fontWeight: '800' }}>
                    {userLevel === 'Novice' ? 'Retomar' : 'Resume'}
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { disconnect(); onClose(); }}
                  style={{
                    width: 56, height: 56, borderRadius: 28,
                    backgroundColor: 'rgba(239,68,68,0.15)',
                    borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <PhoneSlash size={22} color="#ef4444" weight="regular" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ── Controles normais ── */
            <View style={{ width: '100%', alignItems: 'center', gap: 16 }}>
              {/* Banner de inatividade */}
              {inactivityWarning && (
                <View style={{
                  backgroundColor: 'rgba(249,115,22,0.15)',
                  borderRadius: 12, borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)',
                  paddingHorizontal: 20, paddingVertical: 10,
                  alignItems: 'center',
                }}>
                  <AppText style={{ color: '#F97316', fontSize: 13, fontWeight: '700' }}>
                    {userLevel === 'Novice'
                      ? `Ainda está aí? Pausando em ${warningCountdown}s`
                      : `Still there? Pausing in ${warningCountdown}s`}
                  </AppText>
                </View>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 48 }}>
                {/* Mute */}
                <TouchableOpacity
                  onPress={handleMute}
                  pressRetentionOffset={{ top: 20, bottom: 20, left: 20, right: 20 }}
                  accessibilityLabel={isMuted
                    ? (userLevel === 'Novice' ? 'Ativar microfone / Unmute' : 'Unmute microphone')
                    : (userLevel === 'Novice' ? 'Silenciar microfone / Mute' : 'Mute microphone')}
                  accessibilityRole="button"
                  style={{
                    width: 64, height: 64, borderRadius: 32,
                    backgroundColor: isMuted ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)',
                    borderWidth: 1,
                    borderColor: isMuted ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.12)',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {isMuted
                    ? <MicrophoneSlash size={24} color="#ef4444" weight="regular" />
                    : <Microphone     size={24} color="rgba(255,255,255,0.7)" weight="regular" />
                  }
                </TouchableOpacity>

                {/* End call */}
                <TouchableOpacity
                  onPress={handleEndCall}
                  pressRetentionOffset={{ top: 20, bottom: 20, left: 20, right: 20 }}
                  accessibilityLabel={userLevel === 'Novice' ? 'Encerrar chamada / End call' : 'End call'}
                  accessibilityRole="button"
                  style={{
                    width: 64, height: 64, borderRadius: 32,
                    backgroundColor: '#ef4444',
                    alignItems: 'center', justifyContent: 'center',
                    shadowColor: '#ef4444',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
                  }}
                >
                  <PhoneSlash size={26} color="#fff" weight="fill" />
                </TouchableOpacity>

                {/* Speaker / Ouvido */}
                <TouchableOpacity
                  onPress={handleSpeakerToggle}
                  pressRetentionOffset={{ top: 20, bottom: 20, left: 20, right: 20 }}
                  accessibilityLabel={isSpeaker
                    ? (userLevel === 'Novice' ? 'Usar fone de ouvido / Switch to earpiece' : 'Switch to earpiece')
                    : (userLevel === 'Novice' ? 'Usar alto-falante / Switch to speaker' : 'Switch to speaker')}
                  accessibilityRole="button"
                  style={{
                    width: 64, height: 64, borderRadius: 32,
                    backgroundColor: isSpeaker ? 'rgba(163,255,60,0.15)' : 'rgba(255,255,255,0.08)',
                    borderWidth: 1,
                    borderColor: isSpeaker ? 'rgba(163,255,60,0.4)' : 'rgba(255,255,255,0.12)',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {isSpeaker
                    ? <SpeakerHigh size={24} color="#A3FF3C" weight="regular" />
                    : <Ear        size={24} color="rgba(255,255,255,0.7)" weight="regular" />
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}

        </View>
      </View>
      </>
      )} {/* end showTranscript ternary */}
    </Modal>
  );
}
