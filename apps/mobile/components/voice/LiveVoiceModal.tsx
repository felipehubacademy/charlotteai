// components/voice/LiveVoiceModal.tsx
// Live voice — WebRTC transport → OpenAI Realtime API (GA, gpt-realtime-2)
//
// Reset cirurgico 2026-05-13 (branch livevoice-reset-2026-05):
//   - InCallManager fora; CharlotteAudioSession (Expo Module nativo) controla
//     AVAudioSession (iOS) e AudioManager (Android). Mode .default em vez de
//     .voiceChat resolve bug de cabo USB ignorando override pra speaker.
//   - Server gerencia turns: turn_detection.create_response = true +
//     interrupt_response = true. Sem response.create manual no client.
//   - Echo guard upstream: debounce de speech_started durante janela
//     output_audio_buffer.started -> stopped. Sem wordOverlap em transcript.
//   - State machine de response: activeResponseIdRef set em response.created.
//   - Captions: clear sincronizado com output_audio_buffer.stopped (buffer
//     drenou no device), nao timer arbitrario.
//
// Inatividade:
//   45 s sem fala -> aviso "Ainda esta ai?"
//   +30 s -> pausa automatica (WebRTC fecha, timer congela)

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
import CharlotteAudioSession from 'charlotte-audio-session';
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
  Novice: `# CRITICAL RULES — VIOLATE ANY = HARD FAILURE

1. **NEVER invent content the user didn't say.** Respond ONLY to what {NAME} actually said. If unclear, ask: "Não entendi, pode repetir?" — do NOT guess and continue.

2. **NEVER narrate internal reasoning.** Banned phrases (any variation):
   - "Deixa eu [VERBO]..." (organizar/pensar/processar/responder/ajudar/ver/explicar/te ajudar — ZERO tolerance, any verb)
   - "Vou [VERBO]..." quando é preâmbulo (vou pensar, vou explicar, vou te ajudar)
   - "Let me [VERB]..." (think, see, help, explain, organize, walk you through)
   - "Hmm", "Vamos ver", "Tudo bem, deixa..."
   You don't announce what you're about to do. You just do it.

3. **NEVER say goodbye on your own.** Words like "tchau", "até a próxima", "goodbye", "take care", "see you", "talk to you next time" are FORBIDDEN unless {NAME} explicitly said goodbye first. If unsure, keep the conversation going.

4. **NEVER teach in drill mode.** Don't repeat "Você pode dizer X?" twice in a row. Conversation, not exercises.

---

You are Charlotte, a friendly English conversation partner on a voice call with {NAME}, who is a true beginner. They know some English but feel safer in Portuguese. You speak Brazilian Portuguese fluently.

Your job: have a REAL conversation in a natural PT/EN mix, adapting to their comfort. NOT a drill class. Talk about life, hobbies, their day — like a friend who's helping them practice English.

LANGUAGE ADAPTATION — this is dynamic, change every turn based on their LAST reply:

START (first 2-3 turns): ≈70% PT / 30% EN. Use full English phrases mixed naturally, not just single words.
  Example: "Oi Felipe! Como vai? Tell me — what's been good lately?"

SHIFT TO 50/50: as soon as they reply with even a SHORT clean English sentence (3+ words). Even one good reply triggers the shift.
  Example trigger reply: "I'm good, how are you?" → next Charlotte turn: "I'm great! So tell me, where are you from? Me conta um pouco da sua cidade."

SHIFT TO 70 EN / 30 PT: after 2+ clean English replies in a row. Keep PT only for tricky vocabulary or comfort phrases.
  Example: "Oh that's awesome! What do you usually do on weekends? (final de semana)"

ALMOST FULL ENGLISH (90/10): after 4+ clean replies. Drop PT entirely except for very hard words.

GO BACK to 70 PT immediately if:
- Student replies in Portuguese
- Student hesitates / says "não sei", "como?", "não entendi"
- Student stays silent / replies very short ("uh", "yes")

ABSOLUTELY DO NOT:
- Repeat the same teaching pattern ("Você pode dizer: X?", "Você pode dizer: Y?", "Você pode dizer: Z?") — this is drill class, not conversation. NEVER do "Você pode dizer X" twice in a row.
- Translate basic words the student already knows (não traduza "ótimo", "música", "hoje", "legal").
- Stay at 70% PT after they've shown English fluency. ADAPT.
- Treat each user reply as a chance to teach a phrase. Treat it as a normal conversation reply.

CONVERSATIONAL VARIETY — vary your patterns each turn:
- React to what they actually said ("Oh, jazz! That's interesting...")
- Share a tiny opinion or fact about yourself ("I love rainy days myself!")
- Ask a follow-up question that builds on their answer
- Occasionally compliment ("Your English is great!")
- DON'T just keep asking "Can you say X?" — that's mechanical and boring.

CRITICAL — MIX PT/EN BY FULL SENTENCES, NEVER CODE-SWITCH MID-SENTENCE:
Each sentence must be ENTIRELY in ONE language. You may alternate between sentences. Do NOT insert a Portuguese word inside an English sentence (or vice versa).

Right (full-sentence mix):
- "Que legal! What music do you like?"
- "Adorei. Do you listen to a lot of music?"
- "Oh nice! E você costuma escutar todo dia?"

Wrong (mid-sentence code-switch — sounds like broken pidgin, makes you sound stupid):
- "What music do you like ouvir?" ❌
- "What do you enjoy ouvir quando quer relaxar?" ❌
- "Do you prefer rock or pop hoje à noite?" ❌

PARENS (X): use only for genuinely new English vocabulary that they likely don't know. Example: "Do you commute (ir e voltar do trabalho) by car?". NEVER translate basic English words back to PT. NEVER use parens when the surrounding sentence is PT.

TURN LENGTH: 2 short sentences max. One reaction + one question. Finish both.

ZERO preâmbulo. ZERO meta-narração. Frases banidas LITERAIS (blacklist — se aparecer no output, falhou):
- "Deixa eu [qualquer verbo]..." (pensar, organizar, processar, responder, ajudar, ver, explicar, te ajudar)
- "Vou conferir rapidinho..."
- "Vou pensar um pouquinho"
- "Vou dar uma olhada"
- "Vou te explicar"
- "Vou te ajudar"
- "Beleza, deixa eu..."
- "Tá, vou..."
- "Hmm", "Vamos ver", "Tudo bem, deixa..."
- "Let me [any verb]..." (think, see, help, explain, organize)
- "Let me lean into"
- "for a moment" (depois de "let me")
- "That's a great question"

Você NUNCA fala sobre o que VAI fazer. Você só FAZ.
Errado: "Deixa eu te ajudar com isso." → Certo: já dá a ajuda.
Errado: "Vou te explicar." → Certo: já explica.
Errado: "Let me think." → Certo: já responde.

If you didn't understand the user, ask DIRECTLY: "Não entendi, pode repetir?" or "Could you say that again?" — never narrate the confusion.

Personality: warm, fun, encouraging like a real friend. Celebrate progress naturally ("Look at you talking in English! Que legal."). Use real fillers ("oh!", "really?", "que legal!", "wow", "interesting").

Start with: "{GREETING}"`,

  Inter: `You are Charlotte, a friendly English conversation partner and tutor. You're having a real voice chat with {NAME}, who has intermediate English — they can hold a conversation but still make mistakes, hesitate, or sometimes feel shy about speaking 100% English.

Your personality: casual, genuine, fun, supportive. Like a friend who happens to be really good at English. Not a formal teacher, not a stiff assistant.

LANGUAGE ADAPTATION (important — Inter students can still be shy):
- Speak ≈95% English. Slip in a brief Portuguese translation in parens for genuinely hard or less common words (e.g., "I love hiking (caminhada) on weekends"). Sparingly, not every sentence.
- If the student hesitates, says "não sei como dizer", "como falo isso?", or trails off — gently simplify your next sentence using basic vocabulary, and encourage them: "take your time", "you're doing great".
- If the student replies briefly in Portuguese — keep replying in simple English and translate the key word they likely needed. Don't switch to Portuguese, just scaffold around it.
- NEVER drop to mostly Portuguese (that's Novice territory). Stay in English even when accommodating.

TURN LENGTH RULE — this is the most important rule: speak exactly TWO SHORT sentences per turn — one brief reaction (max 8 words) + one short question (max 12 words). Always finish both completely. Never add a third sentence.

ZERO preamble. ZERO meta-narration. Banned EXACT phrases (literal blacklist — if any appear in your output, you have failed):
- "Let me lean into that"
- "Let me dig into that"
- "Let me think about that"
- "Let me see"
- "Let me explain"
- "Let me help you with that"
- "I'll explain"
- "I'll help you with that"
- "I'll dive into"
- "Hmm, let me..."
- "for a moment"
- "Give me a moment"
- "That's a great question"
- "Deixa eu..." (any verb)
- "Vou..." as preamble (vou pensar, vou explicar, vou organizar, vou conferir)
- "Vou conferir rapidinho..."
- "Vamos ver"

You NEVER announce what you're about to do. You just DO it.
Wrong: "Let me help you with that." → Right: just give the help.
Wrong: "I'll explain it." → Right: just explain it.

If you didn't understand, ask DIRECTLY: "Sorry, could you repeat that?" — never narrate confusion.

How you talk:
- Sound like a real person — use contractions, natural fillers ("oh nice", "wait really?", "that's so funny"), informal expressions
- React to what they actually say — don't just redirect to "practice"
- When they make a grammar mistake, weave the correct form naturally into your response without calling it out explicitly
- Celebrate small wins explicitly when natural — "nice way to put it!", "good question!", "exactly".
- Occasionally introduce a cool idiom or expression, but casually ("oh by the way, we'd usually say X here")
- Never say "How can I assist you today?" — just talk like a person

Start with: "{GREETING}"`,

  Advanced: `# CRITICAL RULES — VIOLATE ANY = HARD FAILURE

1. **NEVER invent content {NAME} didn't say.** If unclear: "Sorry, could you repeat that?" — never guess.

2. **ZERO preamble. ZERO meta-narration. ZERO filler reasoning.** Banned EXACT phrases (this is a literal blacklist — if any of these strings appear in your output, you have failed):
   - "Let me lean into that"
   - "Let me dig into that"
   - "Let me think about that"
   - "Let me break it down"
   - "Let me walk you through"
   - "Let me see"
   - "Let me try that"
   - "I'll dive into"
   - "I'll take a stab at"
   - "I'll think about"
   - "Hmm, let me..."
   - "One sec"
   - "Give me a moment"
   - "That's a great question"
   - "for a moment" (especially "for a moment" after any "let me ___")
   You don't preface, hedge, or buffer. You respond directly.

3. **NEVER say goodbye on your own.** "talk to you later", "see you", "take care" FORBIDDEN unless {NAME} said it first.

---

You are Charlotte — sharp, fun, and direct. You're on a voice call with {NAME}, who speaks English at an advanced level. They want real conversation, not hand-holding.

Your vibe: think of a smart, witty friend who challenges you intellectually and isn't afraid to joke around. You're not their teacher right now, you're their conversation partner who happens to catch their English slips.

TURN LENGTH RULE — this is the most important rule: speak exactly TWO SHORT sentences per turn — one brief reaction (max 10 words) + one short question (max 14 words). Always finish both completely. Never add a third sentence.

You NEVER announce what you're about to do. You just DO it.
Wrong: "Let me lean into that for a moment." → Right: just react and ask.
Wrong: "Let me think about that." → Right: just give the take.
Wrong: "Let me break this down." → Right: just break it down without preamble.

If you didn't understand, ask DIRECTLY: "Sorry, could you repeat that?" — never narrate confusion.

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

type ConnectionStatus = 'idle' | 'disconnected' | 'connecting' | 'connected' | 'error';
type FarewellState = 'idle' | 'pending' | 'speaking' | 'closing';

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
  // Streaming transcript: Charlotte (assistant) OU usuário (user). O speaker
  // alterna conforme quem está falando — quando a Charlotte começa a falar
  // a caption do usuário vai embora e vice-versa.
  // Limpa 3.5s após response.audio_transcript.done.
  // Toggle persistente em SecureStore por nível — default ON pra Novice.
  const [liveCaption, setLiveCaption]            = React.useState('');
  const [captionSpeaker, setCaptionSpeaker]      = React.useState<'user' | 'assistant'>('assistant');
  // Ref espelho do speaker pra leitura dentro do dc.onmessage (que captura
  // a closure inicial — sem ref, captionSpeaker fica stale entre eventos).
  const captionSpeakerRef = React.useRef<'user' | 'assistant'>('assistant');
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
  // Acumulador de transcricao do usuario (deltas do gpt-realtime-whisper).
  // Chave: item_id; valor: texto parcial acumulado. Esvaziado quando .completed chega.
  // Bandaid: whisper as vezes manda .completed com 1 palavra; usamos delta se maior.
  const userTranscriptDeltasRef = React.useRef<Map<string, string>>(new Map());
  const wasConnectedRef     = React.useRef(false); // tracks if call ever reached connected state
  const callStartedAtRef    = React.useRef<string | null>(null); // ISO da primeira conexao
  const callRecordSavedRef  = React.useRef(false); // dedupe: salva 1x por chamada
  const conversationTurnsRef = React.useRef<ConversationTurn[]>([]); // mirror do state pra callbacks

  // Echo guard upstream: janela entre output_audio_buffer.started e .stopped
  // identifica "Charlotte falando agora no speaker". speech_started disparado
  // nessa janela = quase certamente eco do speaker pego pelo mic. Ignorar.
  // Tambem ignoramos por 300ms apos .stopped (jitter buffer drenando).
  const outputAudioBufferActiveRef = React.useRef(false);
  const lastBufferStoppedAtRef     = React.useRef(0);

  // State machine de response (GA): set em response.created, clear em
  // response.done / response.cancelled. Source of truth pra "ha resposta ativa".
  const activeResponseIdRef = React.useRef<string | null>(null);

  // Farewell state machine: substitui 4 refs booleanos (pending/active/audioStart).
  // Transitions: idle -> pending (pool esgotou) -> speaking (response.created) -> closing (audio.done).
  const farewellStateRef = React.useRef<FarewellState>('idle');

  // Kickoff: response.create inicial disparado em session.updated. Idempotente.
  const greetingFiredRef = React.useRef(false);

  // Turn detection config completa — guardada pra restore apos disable
  // (quando Charlotte fala, desligamos VAD pra evitar self-interrupt por eco).
  const turnDetectionConfigRef = React.useRef<object | null>(null);
  const vadRestoreTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const poolBaseRef         = React.useRef(levelPool); // secondsRemaining do DB no session start

  // ── WebRTC refs ────────────────────────────────────────────────────────────
  const pcRef             = React.useRef<InstanceType<typeof RTCPeerConnection> | null>(null);
  const dcRef             = React.useRef<any>(null);
  const localStreamRef    = React.useRef<any>(null);

  // ── Ringback player (delegado ao native module) ─────────────────────────
  // O player roda DENTRO da session que CharlotteAudioSession gerencia.
  // Zero conflito com a session da call — mesmo dono. iOS: AVAudioPlayer.
  // Android: MediaPlayer. MP3 bundlado pelo config plugin with-incallmanager-
  // ringback.js (nome herdado, e so um asset).
  const startCustomRingback = React.useCallback(() => {
    CharlotteAudioSession.playRingback().catch(e =>
      console.warn('[LiveVoice] playRingback error:', e)
    );
  }, []);

  const stopCustomRingback = React.useCallback(() => {
    CharlotteAudioSession.stopRingback().catch(() => { /* silencioso */ });
  }, []);

  // ── State refs ────────────────────────────────────────────────────────────
  const isMutedRef              = React.useRef(false);
  const isSpeakerRef            = React.useRef(true);
  const charlotteSpeakingRef    = React.useRef(false);

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
  // Quando Charlotte fala, escala/opacidade refletem o audioLevel real do
  // stream inbound (extraído via pc.getStats() a cada 100ms). Quando ela
  // não fala, animação ambiente sutil (breathing).
  const ringScale   = React.useRef(new Animated.Value(1)).current;
  const ringOpacity = React.useRef(new Animated.Value(0.5)).current;
  const loopRef     = React.useRef<Animated.CompositeAnimation | null>(null);
  const audioLevelIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Estado anterior do totalAudioEnergy/totalSamplesDuration usado como
  // fallback quando o audioLevel direto nao vem populado no getStats().
  // RMS energy = sqrt((energy_now - energy_prev) / (duration_now - duration_prev))
  const lastAudioEnergyRef = React.useRef<{ energy: number; duration: number } | null>(null);
  const audioLevelLogCounterRef = React.useRef(0);
  const smoothedLevelRef = React.useRef(0);

  // Useffect unificado: gerencia tanto animacao ambient quanto audio-reactiva.
  // Charlotte falando = poll getStats e seta ringScale/ringOpacity direto
  // via setValue (sem fila de Animated.timing). Caso contrario, loop ambient.
  React.useEffect(() => {
    // Limpa qualquer estado anterior antes de decidir
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }
    loopRef.current?.stop();
    lastAudioEnergyRef.current = null;
    smoothedLevelRef.current = 0;

    // 1) Charlotte falando — audio-reactivo via getStats
    if (status === 'connected' && charlotteSpeaking && !isPaused) {
      let tickCount = 0;
      audioLevelIntervalRef.current = setInterval(async () => {
        tickCount++;
        try {
          const pc = pcRef.current;
          if (!pc?.getStats) return;
          const stats = await pc.getStats();
          let level = 0;
          let foundAudioLevel = false;
          stats.forEach((report: any) => {
            if (report.type !== 'inbound-rtp' || report.kind !== 'audio') return;
            // Tentativa 1: audioLevel direto. No react-native-webrtc o campo
            // VEM populado mas SEMPRE 0 — entao so usa se > 0.
            if (typeof report.audioLevel === 'number' && report.audioLevel > 0) {
              level = Math.max(level, report.audioLevel);
              foundAudioLevel = true;
            }
            // Tentativa 2 (sempre tenta tambem): derivar de
            // totalAudioEnergy/totalSamplesDuration via RMS = sqrt(dE/dt).
            const energy   = typeof report.totalAudioEnergy === 'number'    ? report.totalAudioEnergy    : null;
            const duration = typeof report.totalSamplesDuration === 'number' ? report.totalSamplesDuration : null;
            if (energy != null && duration != null) {
              const prev = lastAudioEnergyRef.current;
              if (prev) {
                const dEnergy   = energy - prev.energy;
                const dDuration = duration - prev.duration;
                if (dDuration > 0 && dEnergy >= 0) {
                  const derived = Math.min(1, Math.sqrt(dEnergy / dDuration));
                  level = Math.max(level, derived);
                }
              }
              lastAudioEnergyRef.current = { energy, duration };
            }
          });

          // Smoothing exponencial: alpha=0.4 da reatividade rapida mas
          // sem jerkiness entre ticks (especialmente quando level varia
          // muito 0.05 -> 0.30 -> 0.10 num ciclo de 300ms).
          smoothedLevelRef.current = smoothedLevelRef.current * 0.5 + level * 0.5;
          const lv = smoothedLevelRef.current;

          // Curva sqrt comprime range alto e estica range baixo —
          // valores tipicos de fala (0.05-0.30) ficam bem distribuidos
          // entre scale 1.0 e 1.25 em vez de saturar logo no 1.30.
          const dispLevel = Math.sqrt(lv);  // 0.05→0.22, 0.20→0.45, 0.40→0.63
          // Range mais agressivo: scale 1.0→1.40 (40% maior), opacidade
          // 0.15→0.85. Variacao tipica de fala fica entre 1.10-1.30 =
          // claramente visivel no telefone.
          const targetScale   = 1 + Math.min(dispLevel * 0.65, 0.40);
          const targetOpacity = 0.15 + Math.min(dispLevel * 1.0, 0.70);
          // Usa Animated.timing com useNativeDriver pra que a atualizacao
          // realmente chegue na UI native — setValue() puro nao propaga
          // depois que o Animated.Value foi tocado por animacao nativa
          // (bug conhecido do RN). Duration 80ms < intervalo 100ms = sem fila.
          Animated.timing(ringScale,   { toValue: targetScale,   duration: 80, useNativeDriver: true }).start();
          Animated.timing(ringOpacity, { toValue: targetOpacity, duration: 80, useNativeDriver: true }).start();

          // Log mais frequente (5 ticks = 500ms) com scale tambem
          audioLevelLogCounterRef.current = (audioLevelLogCounterRef.current + 1) % 5;
          if (audioLevelLogCounterRef.current === 0) {
            console.log(`[LiveVoice] raw=${level.toFixed(3)} smooth=${lv.toFixed(3)} scale=${targetScale.toFixed(3)} src=${foundAudioLevel ? 'direct' : 'derived'}`);
          }
        } catch (e: any) {
          if (tickCount % 20 === 1) console.warn(`[LiveVoice ring] getStats error: ${e?.message || e}`);
        }
      }, 100);

      return () => {
        if (audioLevelIntervalRef.current) {
          clearInterval(audioLevelIntervalRef.current);
          audioLevelIntervalRef.current = null;
        }
      };
    }

    // 2) Connecting — pulse mais rapido (laranja)
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
      return () => loopRef.current?.stop();
    }

    // 3) Connected mas Charlotte nao fala — RING TOTALMENTE PARADO.
    //    Ring so se mexe quando Charlotte fala (audio-reactivo). Sem
    //    breathing ambient — quietude e o sinal de "ela ta ouvindo voce".
    //    Animated.timing pra garantir propagacao no native driver.
    if (status === 'connected' && !isPaused) {
      Animated.timing(ringScale,   { toValue: 1,    duration: 200, useNativeDriver: true }).start();
      Animated.timing(ringOpacity, { toValue: 0.18, duration: 200, useNativeDriver: true }).start();
      return;
    }

    // 4) Demais estados — ring apagado
    Animated.timing(ringScale,   { toValue: 1, duration: 200, useNativeDriver: true }).start();
    Animated.timing(ringOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
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
    if (captionClearTimerRef.current) {
      clearTimeout(captionClearTimerRef.current);
      captionClearTimerRef.current = null;
    }
    if (translationDismissTimerRef.current) {
      clearTimeout(translationDismissTimerRef.current);
      translationDismissTimerRef.current = null;
    }
    if (vadRestoreTimerRef.current) {
      clearTimeout(vadRestoreTimerRef.current);
      vadRestoreTimerRef.current = null;
    }
    localStreamRef.current?.getTracks().forEach((t: any) => t.stop());
    localStreamRef.current = null;
    dcRef.current?.close();
    dcRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    stopCustomRingback();
    // Devolve AVAudioSession / AudioManager ao estado anterior.
    CharlotteAudioSession.stop().catch(() => { /* silencioso */ });
    charlotteSpeakingRef.current = false;
    activeResponseIdRef.current = null;
    outputAudioBufferActiveRef.current = false;
    greetingFiredRef.current = false;
    setCharlotteSpeaking(false);
    setUserSpeaking(false);
    setLiveCaption('');
  }, []);

  // ── Disparar a despedida (state machine farewellStateRef) ────────────────
  const triggerFarewell = React.useCallback(() => {
    // Idempotente: so dispara se estiver pending.
    if (farewellStateRef.current !== 'pending') return;

    if (dcRef.current?.readyState !== 'open') {
      // Data channel fechado — fallback: fechar direto com mensagem de erro.
      farewellStateRef.current = 'idle';
      const secsUsed = sessionAccumSecs.current + Math.floor((Date.now() - sessionStartRef.current) / 1000);
      consumeLiveVoiceSeconds(secsUsed).catch(console.warn);
      saveCallRecord(secsUsed);
      sessionAccumSecs.current = 0;
      disconnectWebRTC();
      setStatus('error');
      setErrorMsg(
        userLevel === 'Novice'
          ? `Seus ${Math.floor(levelPool / 60)} min de Live Voice deste mes acabaram. Volta no mes que vem!`
          : `Your ${Math.floor(levelPool / 60)}-min monthly allowance is up. See you next month!`
      );
      return;
    }

    farewellStateRef.current = 'speaking';

    // Desativa VAD — Charlotte nao deve reagir a mais nada do usuario.
    sendEvent({
      type: 'session.update',
      session: {
        type: 'realtime',
        audio: { input: { turn_detection: null } },
      },
    });

    const farewellLine = getRandomFarewell(userLevel, userName);
    const farewellInstruction = userLevel === 'Novice'
      ? `Diga exatamente isto, com calor e naturalidade, como sua ultima mensagem: "${farewellLine}" Nao diga mais nada alem disso.`
      : `Say exactly this, warmly and naturally, as your last message: "${farewellLine}" Say nothing else.`;

    setTimeout(() => {
      if (dcRef.current?.readyState === 'open') {
        sendEvent({
          type: 'response.create',
          response: {
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
    if (farewellStateRef.current !== 'idle') return;

    farewellStateRef.current = 'pending';
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    clearSessionInterval();
    clearInactivityInterval();

    // Se Charlotte NAO esta falando agora, dispara despedida imediatamente.
    // Se ela ESTA falando (activeResponseIdRef), o handler de response.done
    // chamara triggerFarewell quando a fala terminar naturalmente.
    if (!activeResponseIdRef.current) {
      triggerFarewell();
    }
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

      // FIX iOS 26 audio session contamination:
      // Antes do Live Voice, outros componentes podem ter deixado a AVAudioSession
      // em estado output-only / mixWithOthers (soundEngine SFX, voiceSFX, expo-video
      // da propria aba). Forcamos reset pra estado compativel com playAndRecord
      // ANTES de qualquer chamada nativa nossa. expo-audio.setAudioModeAsync com
      // allowsRecording: true forca a categoria pra .playAndRecord, neutralizando
      // contaminacao anterior.
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
        shouldPlayInBackground: true,
      }).catch(() => { /* silencioso */ });

      // Configura AVAudioSession (iOS) / AudioManager (Android):
      //   iOS: pre-seed RTCAudioSessionConfiguration singleton + override speaker.
      //        NAO chamamos setConfiguration aqui — o WebRTC ADM aplica o singleton
      //        sozinho quando o primeiro audio track binda (via getUserMedia +
      //        addTrack). Pattern verificado em RTCAudioSession.mm configureWebRTCSession.
      //   Android: AudioManager.MODE_IN_COMMUNICATION + setSpeakerphoneOn(true).
      await CharlotteAudioSession.start(isSpeakerRef.current);

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

      // Ringback toca DEPOIS do getUserMedia: nesse ponto o WebRTC ADM ja
      // aplicou o singleton (setConfiguration:active:YES com playAndRecord +
      // videoChat). AVAudioPlayer herda a session correta e nao deixa ela em
      // estado output-only. Antes do fix iOS 26, ringback rodava ANTES do
      // getUserMedia e ativava session na config errada → mic morria.
      startCustomRingback();

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      stream.getTracks().forEach((track: any) => pc.addTrack(track, stream));

      pc.ontrack = () => {};

      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onopen = () => {
        stopCustomRingback();
        setStatus('connected');
        wasConnectedRef.current = true;
        if (!callStartedAtRef.current) {
          callStartedAtRef.current = new Date().toISOString();
        }

        const greeting = getRandomGreeting(userLevel);
        // Hint de idioma:
        //  - Inter/Advanced -> 'en' (sempre ingles)
        //  - Novice -> 'pt' (mistura PT/EN, mas auto-detect estava degenerando
        //    pra scripts aleatorios — Malayalam, Chinese — em audio ambiguo).
        //    Trade-off: "I work nights" pode virar "Work need" mas e bem
        //    melhor que "不啊" ou "ലിസർക്കെ".
        // Novice: SEM language hint — usuario mistura PT/EN o tempo todo, hint
        // forcado em PT fazia Whisper transcrever "Sleep early" como "ler" etc.
        // Sem hint, Whisper auto-detecta por turno. Safety filter no
        // input_audio_transcription.completed handler descarta scripts
        // asiaticos (Malayalam, Chinese, etc) se voltarem.
        // Inter/Advanced: hint 'en' (sempre ingles) ajuda accuracy.
        const inputLang = userLevel === 'Novice' ? null : 'en';
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
            // reasoning_effort: minimal — reduz tendencia do modelo de "pensar
            // em voz alta" (CoT leak). Sem isso, gpt-realtime-2 usa "deixa eu
            // organizar/responder/te ajudar..." como filler conversational.
            // 'minimal' faz ele responder direto sem preambulos.
            reasoning_effort: 'minimal',
            // 500 (era 300): em modo ensino com explicacoes em PT-BR + EN, 300
            // batia o limite e cortava mid-frase. Prompt ainda pede brevidade,
            // mas 500 da margem pra ensino sem cortar.
            max_output_tokens: 500,
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
                  // language: omitido se undefined (Novice, auto-detect). Inter/Adv
                  // mantem hint 'en' que ainda ajuda accuracy/latency.
                  ...(inputLang ? { language: inputLang } : {}),
                  // 'medium' dá mais contexto antes de finalizar palavras
                  // (vs 'low' que truncava 'Vamos' e palavras curtas).
                  delay: 'medium',
                },
                turn_detection: (() => {
                  const cfg = {
                    type: 'server_vad' as const,
                    threshold: 0.85,
                    prefix_padding_ms: 600,
                    silence_duration_ms: 700,
                    create_response: true,
                    interrupt_response: true,
                  };
                  // Cache pra restore apos disable durante Charlotte falando.
                  turnDetectionConfigRef.current = cfg;
                  return cfg;
                })(),
              },
              output: {
                format: { type: 'audio/pcm', rate: 24000 },
                // cedar (GA 2026-05): pesquisa interna apontou cedar com menos
                // tendencia a verbalizar reasoning (CoT leak) que marin. Trade-off:
                // sotaque mais americano em PT (mas user reportou que marin tava
                // vazando "let me lean into / vou conferir rapidinho").
                voice: 'cedar',
              },
            },
          },
        }));

        // Kickoff inicial sera disparado em `session.updated` (handler abaixo),
        // assim que server confirmar config. Evita setTimeout arbitrario.

        // Iniciar timers
        startSessionTimer();
        startInactivityTimer();
        track('live_voice_started', { level: userLevel });
      };

      dc.onmessage = (event: any) => {
        try {
          const msg = JSON.parse(event.data);

          // [DIAG] Log AMPLO de TODOS os event types do server. Investigando bug
          // de user_turns=0 — suspeita: evento de transcription renomeado em GA
          // ou whisper rejeitado silenciosamente no session.update.
          // Filtra logs verbosos (response.output_audio_transcript.delta floods).
          if (typeof msg.type === 'string') {
            const verboseTypes = ['response.output_audio_transcript.delta', 'response.audio.delta', 'output_audio_buffer.audio_chunk_finished'];
            if (!verboseTypes.includes(msg.type)) {
              console.log('[LiveVoice][DIAG] evt:', msg.type);
            }
            if (msg.type.includes('transcription') || msg.type.includes('input_audio')) {
              console.log('[LiveVoice][DIAG] FULL:', msg.type, 'transcript:', JSON.stringify(msg.transcript ?? null), 'item_id:', msg.item_id);
            }
            if (msg.type === 'error') {
              console.log('[LiveVoice][DIAG] ERROR:', JSON.stringify(msg.error ?? msg));
            }
          }

          switch (msg.type) {
            // ── Session lifecycle: server confirmou config -> dispara greeting
            case 'session.updated':
              if (!greetingFiredRef.current && dcRef.current?.readyState === 'open') {
                greetingFiredRef.current = true;
                dcRef.current.send(JSON.stringify({ type: 'response.create' }));
              }
              break;

            // ── Response lifecycle (state machine) ────────────────────────
            case 'response.created':
              activeResponseIdRef.current = msg.response?.id ?? 'unknown';
              lastActivityRef.current = Date.now();
              break;

            case 'response.done':
              activeResponseIdRef.current = null;
              lastActivityRef.current = Date.now();
              {
                // Captura texto da Charlotte do payload final.
                let charlotteText = charlotteTextAccRef.current.trim();
                charlotteTextAccRef.current = '';
                if (!charlotteText) {
                  const output = msg.response?.output ?? [];
                  for (const item of output) {
                    if (item.role === 'assistant' || item.type === 'message') {
                      for (const c of item.content ?? []) {
                        if (c.type === 'output_text' && c.text) charlotteText += c.text;
                        if (c.type === 'output_audio' && c.transcript) charlotteText += c.transcript;
                      }
                    }
                  }
                  charlotteText = charlotteText.trim();
                }
                if (charlotteText) {
                  // Cleanup: espaco apos sentence-end coincidindo com proxima
                  // sentenca (modelo streama "legal.Que" em vez de "legal. Que").
                  charlotteText = charlotteText.replace(/([.!?])([A-ZÀ-Ý])/g, '$1 $2');
                  console.log(`[LiveVoice] charlotte said: "${charlotteText.slice(0, 200)}"`);
                  setConversationTurns(prev => [...prev, { role: 'assistant', text: charlotteText }]);
                }

                // Farewell choreography: se pool esgotou enquanto Charlotte
                // falava, dispara agora (frase natural terminou).
                if (farewellStateRef.current === 'pending') {
                  setTimeout(() => triggerFarewell(), 400);
                }
              }
              break;

            case 'response.cancelled':
              activeResponseIdRef.current = null;
              break;

            // ── Output audio buffer (WebRTC GA) — source-of-truth pra
            // "Charlotte falando agora" e janela anti-eco ─────────────────
            case 'output_audio_buffer.started':
              outputAudioBufferActiveRef.current = true;
              charlotteSpeakingRef.current = true;
              setCharlotteSpeaking(true);
              setUserSpeaking(false);
              // Anti self-interrupt: desabilita VAD durante a fala da Charlotte.
              // Server VAD estava cancelando a propria response em eco do speaker
              // (interrupt_response:true). Trade-off: user nao consegue barge-in
              // nessa janela. Restora em output_audio_buffer.stopped + 400ms grace.
              if (vadRestoreTimerRef.current) {
                clearTimeout(vadRestoreTimerRef.current);
                vadRestoreTimerRef.current = null;
              }
              sendEvent({
                type: 'session.update',
                session: {
                  type: 'realtime',
                  audio: { input: { turn_detection: null } },
                },
              });
              break;

            case 'output_audio_buffer.stopped':
            case 'output_audio_buffer.cleared':
              outputAudioBufferActiveRef.current = false;
              lastBufferStoppedAtRef.current = Date.now();
              charlotteSpeakingRef.current = false;
              setCharlotteSpeaking(false);
              // Restora VAD apos 400ms de grace (jitter buffer drenando no device).
              // Se nova fala da Charlotte comecar antes, o handler de started
              // limpa este timer.
              if (vadRestoreTimerRef.current) clearTimeout(vadRestoreTimerRef.current);
              vadRestoreTimerRef.current = setTimeout(() => {
                vadRestoreTimerRef.current = null;
                if (turnDetectionConfigRef.current && dcRef.current?.readyState === 'open') {
                  sendEvent({
                    type: 'session.update',
                    session: {
                      type: 'realtime',
                      audio: { input: { turn_detection: turnDetectionConfigRef.current } },
                    },
                  });
                }
              }, 400);

              // Caption clear: 800ms grace pra cobrir jitter buffer residual
              // (audio ja drenou no servidor mas device pode ter +1 chunk).
              if (captionClearTimerRef.current) clearTimeout(captionClearTimerRef.current);
              captionClearTimerRef.current = setTimeout(() => {
                setLiveCaption('');
                captionClearTimerRef.current = null;
              }, 800);

              // Farewell: audio drenou de verdade no device. Fecha modal.
              if (farewellStateRef.current === 'speaking') {
                farewellStateRef.current = 'closing';
                setTimeout(() => {
                  if (farewellStateRef.current === 'closing') {
                    const secsUsed = sessionAccumSecs.current + Math.floor((Date.now() - sessionStartRef.current) / 1000);
                    consumeLiveVoiceSeconds(secsUsed).catch(console.warn);
                    saveCallRecord(secsUsed);
                    sessionAccumSecs.current = 0;
                    farewellStateRef.current = 'idle';
                    disconnect();
                    onClose();
                  }
                }, 500);
              }
              break;

            // ── Charlotte text/transcript deltas ─────────────────────────
            case 'response.output_text.delta':
              charlotteTextAccRef.current += (msg.delta ?? '');
              break;

            case 'response.output_audio_transcript.delta':
              {
                const delta = msg.delta ?? '';
                // Log chars suspeitos pra investigar relato de "outro alphabet".
                // Detecta qualquer codepoint fora de Latin (Basic+Supplement),
                // pontuacao geral, e simbolos comuns.
                const suspicious = [...delta].filter(c => {
                  const cp = c.codePointAt(0) ?? 0;
                  // Latin basico, suplementar, pontuacao, simbolos comuns
                  return !(
                    (cp >= 0x20 && cp <= 0x7E) || // ASCII printable
                    (cp >= 0xA0 && cp <= 0xFF) || // Latin-1 Supplement (acentos PT)
                    (cp >= 0x100 && cp <= 0x17F) || // Latin Extended-A
                    cp === 0x2014 || cp === 0x2013 || // em/en dash
                    cp === 0x2018 || cp === 0x2019 || cp === 0x201C || cp === 0x201D // curly quotes
                  );
                });
                if (suspicious.length > 0) {
                  console.log(`[LiveVoice] caption suspicious chars: ${suspicious.map(c => `U+${(c.codePointAt(0)??0).toString(16).toUpperCase().padStart(4,'0')}`).join(',')} in delta="${delta}"`);
                }

                const wasUser = captionSpeakerRef.current === 'user';
                captionSpeakerRef.current = 'assistant';
                setCaptionSpeaker('assistant');
                if (wasUser) {
                  setLiveCaption(delta);
                } else if (captionClearTimerRef.current) {
                  clearTimeout(captionClearTimerRef.current);
                  captionClearTimerRef.current = null;
                  setLiveCaption(delta);
                } else {
                  // Cleanup leve: insere espaco apos sentence-end que coincide
                  // com inicio de palavra nova (modelo as vezes streama
                  // "olá.Tudo" em vez de "olá. Tudo").
                  setLiveCaption(prev => {
                    const joined = (prev + delta).slice(-800);
                    return joined.replace(/([.!?])([A-ZÀ-Ý])/g, '$1 $2');
                  });
                }
                if (translationDismissTimerRef.current) {
                  clearTimeout(translationDismissTimerRef.current);
                  translationDismissTimerRef.current = null;
                }
                setCaptionTranslation(null);
              }
              break;

            // response.output_audio_transcript.done nao limpa caption —
            // esperamos output_audio_buffer.stopped (jitter buffer real).

            // ── User transcript (gpt-realtime-whisper) ────────────────────
            case 'conversation.item.input_audio_transcription.delta':
              {
                const itemId = msg.item_id;
                const delta  = msg.delta ?? '';
                if (itemId && delta) {
                  const prev = userTranscriptDeltasRef.current.get(itemId) ?? '';
                  const next = prev + delta;
                  userTranscriptDeltasRef.current.set(itemId, next);

                  // Caption do user: SO Novice + so quando Charlotte nao fala.
                  if (userLevel === 'Novice' && !charlotteSpeakingRef.current) {
                    captionSpeakerRef.current = 'user';
                    setCaptionSpeaker('user');
                    if (captionClearTimerRef.current) {
                      clearTimeout(captionClearTimerRef.current);
                      captionClearTimerRef.current = null;
                    }
                    if (translationDismissTimerRef.current) {
                      clearTimeout(translationDismissTimerRef.current);
                      translationDismissTimerRef.current = null;
                    }
                    setCaptionTranslation(null);
                    setLiveCaption(next.slice(-800));
                  }
                }
              }
              break;

            case 'conversation.item.input_audio_transcription.completed':
              {
                // Whisper bandaid: .completed as vezes vem com 1a palavra so.
                // Usa delta se for maior.
                const itemId = msg.item_id;
                const completedText = (msg.transcript ?? '').trim();
                const deltaText = itemId
                  ? (userTranscriptDeltasRef.current.get(itemId) ?? '').trim()
                  : '';
                const userText: string =
                  deltaText.length > completedText.length ? deltaText : completedText;
                if (itemId) userTranscriptDeltasRef.current.delete(itemId);
                if (userText) {
                  // Safety filter: detecta scripts inesperados (Malayalam,
                  // Chinese, Devanagari etc) e descarta. User fala PT-BR + EN —
                  // tudo em Latin. Auto-detect do whisper as vezes hallucina
                  // scripts em audio ambiguo.
                  const nonLatinCount = [...userText].filter(c => {
                    const cp = c.codePointAt(0) ?? 0;
                    if (cp <= 0x7F) return false; // ASCII
                    if (cp >= 0xA0 && cp <= 0x17F) return false; // Latin-1 + Extended-A
                    if (cp >= 0x2000 && cp <= 0x206F) return false; // pontuacao geral
                    if (cp === 0x2014 || cp === 0x2013) return false; // dashes
                    return true; // qualquer outro script
                  }).length;
                  const totalChars = [...userText].filter(c => /\S/.test(c)).length;
                  if (totalChars > 0 && nonLatinCount / totalChars > 0.3) {
                    console.log(`[LiveVoice] user transcript REJECTED (non-Latin): "${userText.slice(0, 60)}"`);
                    break;
                  }
                  console.log(`[LiveVoice] user said: "${userText.slice(0, 200)}"`);
                  setConversationTurns(prev => [...prev, { role: 'user', text: userText }]);
                }
              }
              break;

            // ── VAD events ────────────────────────────────────────────────
            case 'input_audio_buffer.speech_started':
              {
                // Echo guard upstream: ignora speech_started disparado durante
                // janela "Charlotte falando" ou ate 300ms apos buffer drenar.
                // Sinal: mic capturou som do speaker via reverb residual.
                const inEchoWindow =
                  outputAudioBufferActiveRef.current ||
                  (Date.now() - lastBufferStoppedAtRef.current) < 300;

                if (inEchoWindow) {
                  console.log('[LiveVoice] echo guard: speech_started ignored (buffer window)');
                  break;
                }

                lastActivityRef.current = Date.now();
                setUserSpeaking(true);
                setInactivityWarning(false);
                setWarningCountdown(30);
                warnStartRef.current = 0;
                // Barge-in: servidor cancela response automaticamente via
                // interrupt_response:true. Nao precisamos enviar response.cancel.
              }
              break;

            case 'input_audio_buffer.speech_stopped':
              setUserSpeaking(false);
              // Server VAD vai disparar response.create automaticamente (config
              // create_response:true). Nada a fazer client-side.
              break;

            case 'error':
              {
                const err = msg.error ?? {};
                // response_cancel_not_active: tolerable, race comum.
                // conversation_already_has_active_response: nao deveria mais
                // acontecer com state machine, mas log nao-fatal.
                if (err.code === 'response_cancel_not_active') {
                  console.log('[LiveVoice] cancel race (tolerable)');
                } else {
                  console.error('[LiveVoice] server error:', err);
                }
              }
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
      stopCustomRingback();
      CharlotteAudioSession.stop().catch(() => { /* silencioso */ });
      console.error('[LiveVoice] connect error:', error);
      setStatus('error');
      setErrorMsg(
        userLevel === 'Novice'
          ? 'Não foi possível conectar. Tente novamente.'
          : 'Could not connect. Please try again.'
      );
    }
  }, [userLevel, userName, sendEvent, startSessionTimer, startInactivityTimer]);

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
    stopCustomRingback();
    CharlotteAudioSession.stop().catch(() => { /* silencioso */ });
    charlotteSpeakingRef.current = false;
    activeResponseIdRef.current = null;
    outputAudioBufferActiveRef.current = false;
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
      CharlotteAudioSession.setSpeakerOn(next).catch(() => { /* silencioso */ });
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
  // Sempre dark-content sobre bg claro (#FAF9FF), tanto na tela de chamada
  // quanto no transcript. Restaura ao fechar.
  React.useEffect(() => {
    StatusBar.setBarStyle('dark-content', true);
    if (Platform.OS === 'android') {
      const bg = isOpen && !showTranscript ? '#FAF9FF' : '#FFFFFF';
      StatusBar.setBackgroundColor(bg, true);
    }
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
      wasConnectedRef.current = false;
      callStartedAtRef.current = null;
      callRecordSavedRef.current = false;
      farewellStateRef.current = 'idle';
      outputAudioBufferActiveRef.current = false;
      lastBufferStoppedAtRef.current = 0;
      activeResponseIdRef.current = null;
      greetingFiredRef.current = false;
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
      animationType="fade"
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
      <View style={{ flex: 1, backgroundColor: '#FAF9FF', paddingTop: insets.top, paddingBottom: insets.bottom }}>
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
              backgroundColor: captionsEnabled ? 'rgba(124,58,237,0.10)' : 'rgba(22,21,58,0.04)',
              borderWidth: 1,
              borderColor: captionsEnabled ? 'rgba(124,58,237,0.35)' : 'rgba(22,21,58,0.10)',
              alignItems: 'center', justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <ClosedCaptioning
              size={20}
              color={captionsEnabled ? '#7C3AED' : 'rgba(22,21,58,0.55)'}
              weight={captionsEnabled ? 'fill' : 'regular'}
            />
          </TouchableOpacity>

          {/* ── TOP: Nome + Timer + Pool badge ─────────────────────── */}
          <View style={{ alignItems: 'center', paddingTop: 8 }}>
            <AppText style={{ color: 'rgba(22,21,58,0.5)', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
              Charlotte
            </AppText>
            {status === 'connected' && !isPaused && (
              <AppText style={{ color: 'rgba(22,21,58,0.85)', fontSize: 15, letterSpacing: 2,
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
              <AppText style={{ color: 'rgba(22,21,58,0.4)', fontSize: 12 }}>...</AppText>
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

          {/* ── CENTER: Avatar (sempre fixo no centro) + Caption (flutuante abaixo) ── */}
          {/* O container do center tem altura suficiente para avatar + caption.
              Avatar fica visualmente centralizado; caption usa position absolute
              abaixo, então ligar/desligar caption não muda a posição do avatar. */}
          <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: 360 }}>
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
                  backgroundColor: 'rgba(255,255,255,0.75)',
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
                disabled={captionTranslating || captionSpeaker === 'user'}
                style={{
                  // Ancorado pelo TOPO (top fixo), nao pelo BOTTOM. Assim o
                  // chip fica em y constante e o texto cresce pra baixo,
                  // sem empurrar o chip para dentro dos arcos.
                  // top:285 esta abaixo do raio max do ring audio-reactivo
                  // (avatar centro y=180 + max ring 96px = y=276 → margem 9px).
                  position: 'absolute',
                  top: 285, left: 0, right: 0,
                  paddingHorizontal: 16, alignItems: 'center',
                }}
              >
                {/* Mini chip indicando quem está falando. */}
                <View style={{
                  paddingHorizontal: 8, paddingVertical: 2,
                  borderRadius: 8,
                  backgroundColor: captionSpeaker === 'user'
                    ? 'rgba(61,136,0,0.12)'
                    : 'rgba(124,58,237,0.10)',
                  marginBottom: 6,
                }}>
                  <AppText style={{
                    fontSize: 9, fontWeight: '800',
                    letterSpacing: 1,
                    color: captionSpeaker === 'user' ? '#3D8800' : '#7C3AED',
                  }}>
                    {captionSpeaker === 'user'
                      ? (userLevel === 'Novice' ? 'VOCÊ' : 'YOU')
                      : 'CHARLOTTE'}
                  </AppText>
                </View>
                <AppText
                  style={{
                    color: captionSpeaker === 'user' ? '#3D8800' : '#16153A',
                    fontSize: 16,
                    lineHeight: 22,
                    fontWeight: '500',
                    textAlign: 'center',
                    minHeight: 44,
                  }}
                  numberOfLines={5}
                  ellipsizeMode="head"
                >
                  {liveCaption}
                </AppText>
                {captionTranslation && (
                  <AppText
                    style={{
                      color: 'rgba(22,21,58,0.6)',
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
              <AppText style={{ color: 'rgba(22,21,58,0.55)', fontSize: 13, textAlign: 'center' }}>
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
                    backgroundColor: isMuted ? 'rgba(239,68,68,0.12)' : 'rgba(22,21,58,0.06)',
                    borderWidth: 1,
                    borderColor: isMuted ? 'rgba(239,68,68,0.4)' : 'rgba(22,21,58,0.10)',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {isMuted
                    ? <MicrophoneSlash size={24} color="#ef4444" weight="regular" />
                    : <Microphone     size={24} color="rgba(22,21,58,0.65)" weight="regular" />
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
                    backgroundColor: isSpeaker ? 'rgba(61,136,0,0.12)' : 'rgba(22,21,58,0.06)',
                    borderWidth: 1,
                    borderColor: isSpeaker ? 'rgba(61,136,0,0.4)' : 'rgba(22,21,58,0.10)',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {isSpeaker
                    ? <SpeakerHigh size={24} color="#3D8800" weight="regular" />
                    : <Ear        size={24} color="rgba(22,21,58,0.65)" weight="regular" />
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
