// hooks/useChat.ts - Lógica de mensagens do chat

import React, { useState, useCallback, useRef } from 'react';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import { Message } from '@/components/chat/ChatBox';
import { ConversationContextManager } from '@/lib/conversation-context';
import { transcribeAudio } from '@/hooks/useAudioRecorder';
import { checkXPMilestone, sendXPMilestoneNotification } from '@/hooks/usePushNotifications';
import { supabase } from '@/lib/supabase';
import { ChatMode } from '@/lib/levelConfig';
import { PronunciationData } from '@/components/chat/PronunciationScoreCard';
import { useAchievementsContext } from '@/components/achievements/AchievementsProvider';
import { soundEngine } from '@/lib/soundEngine';

const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

/** Persist a practice event to charlotte_practices (fires DB trigger → charlotte_progress + charlotte_leaderboard_cache). */
// Debounce guard: evita duplicata por duplo tap. Chave = userId+type, janela = 1500ms.
const _lastSaved: Record<string, number> = {};
async function savePractice(
  userId: string,
  practiceType: 'text_message' | 'audio_message' | 'grammar_message',
  xpEarned: number,
): Promise<void> {
  const key = `${userId}:${practiceType}`;
  const now = Date.now();
  if (_lastSaved[key] && now - _lastSaved[key] < 1500) return;
  _lastSaved[key] = now;

  const { error } = await supabase.from('charlotte_practices').insert({
    user_id:       userId,
    practice_type: practiceType,
    xp_earned:     xpEarned,
  });
  if (error) console.warn('⚠️ savePractice error:', error.message, error.code);
}

/** Persist a chat message for history and pedagogical analysis (fire-and-forget). */
function saveChatMessage(
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  mode: ChatMode,
): void {
  if (!userId) return;
  supabase.from('chat_messages').insert({ user_id: userId, role, content, mode })
    .then(({ error }) => { if (error) console.warn('⚠️ saveChatMessage:', error.message); });
}

/** Call TTS endpoint and save the mp3 to a local temp file. Returns local URI or null. */
async function fetchTTS(text: string, userId?: string): Promise<string | null> {
  try {
    console.log('🔊 Fetching TTS for:', text.slice(0, 60));
    const response = await fetch(`${API_BASE_URL}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source: 'chat', ...(userId ? { userId } : {}) }),
    });
    if (!response.ok) {
      const err = await response.text();
      console.warn('❌ TTS HTTP error:', response.status, err);
      return null;
    }
    const data = await response.json();
    if (!data.audio) {
      console.warn('❌ TTS response missing audio field:', JSON.stringify(data).slice(0, 200));
      return null;
    }
    const ext = data.mimeType === 'audio/wav' ? 'wav' : 'mp3';
    const uri = `${FileSystem.cacheDirectory}tts_${Date.now()}.${ext}`;
    await FileSystem.writeAsStringAsync(uri, data.audio, {
      encoding: 'base64' as any,
    });
    console.log('✅ TTS saved to:', uri);
    return uri;
  } catch (e) {
    console.warn('❌ TTS fetch failed:', e);
    return null;
  }
}

interface UseChatOptions {
  userLevel: 'Novice' | 'Inter' | 'Advanced';
  userName: string;
  userId: string;
  mode?: ChatMode;
}

export interface RateLimitState {
  type: 'hourly' | 'daily';
  retryAfter: number; // seconds from now
  isTrial: boolean;
}

export function useChat({ userLevel, userName, userId, mode = 'chat' }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(mode === 'chat');
  const [sessionXP, setSessionXP] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [rateLimited, setRateLimited] = useState<RateLimitState | null>(null);
  const historyLoadedRef = useRef(false);
  const { checkForNewAchievements } = useAchievementsContext();

  // Auto-clear rate limit when retry window expires
  React.useEffect(() => {
    if (!rateLimited) return;
    const ms = rateLimited.retryAfter * 1000;
    const t  = setTimeout(() => setRateLimited(null), ms);
    return () => clearTimeout(t);
  }, [rateLimited]);

  // Load real totalXP from charlotte_progress on mount
  React.useEffect(() => {
    if (!userId) return;
    supabase
      .from('charlotte_progress')
      .select('total_xp')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setTotalXP(data.total_xp ?? 0);
      })
      .then(undefined, () => {});
  }, [userId]);

  const contextManagerRef = useRef(
    new ConversationContextManager(userLevel, userName)
  );

  // ── Load chat history on mount (chat mode only) ───────────────────────────
  React.useEffect(() => {
    if (!userId || mode !== 'chat' || historyLoadedRef.current) return;
    historyLoadedRef.current = true;

    supabase
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('user_id', userId)
      .eq('mode', 'chat')
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data, error }) => {
        setHistoryLoading(false);
        if (error) { console.warn('⚠️ load chat history:', error.message); setMessages([buildWelcome(mode, userLevel, userName)]); return; }
        if (!data || data.length === 0) {
          // No history — show welcome message
          setMessages([buildWelcome(mode, userLevel, userName)]);
          return;
        }

        const history = [...data].reverse(); // oldest first

        // Seed context manager so LLM has prior context
        history.slice(-8).forEach(row => {
          contextManagerRef.current.addMessage(row.role as 'user' | 'assistant', row.content, 'text');
        });

        const historyMsgs: Message[] = history.map(row => ({
          id: `hist-${row.created_at}`,
          role: row.role as 'user' | 'assistant',
          content: row.content,
          messageType: 'text' as const,
          timestamp: new Date(row.created_at),
        }));

        // Add a subtle session separator after history
        const separator: Message = {
          id: 'session-sep',
          role: 'assistant',
          content: '— new session —',
          messageType: 'text',
          timestamp: new Date(),
          isSeparator: true,
        };

        // Prepend welcome message so Charlotte's opening always shows at the top
        // of the conversation (even when returning to prior history).
        setMessages([buildWelcome(mode, userLevel, userName), ...historyMsgs, separator]);
      });
  }, [userId, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Welcome message on mount — only for non-chat modes (chat shows history or welcome async)
  React.useEffect(() => {
    if (mode === 'chat') return; // handled above with history
    setMessages([buildWelcome(mode, userLevel, userName)]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addMessage = useCallback((msg: Message) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  const getAssistantResponse = useCallback(
    async (
      userMessage: string,
      messageType: 'text' | 'audio',
      pronunciationData?: any
    ) => {
      const contextString = contextManagerRef.current.generateContextForAssistant();

      const response = await fetch(`${API_BASE_URL}/api/assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {}),
        },
        body: JSON.stringify({
          transcription: userMessage,
          pronunciationData: pronunciationData ?? null,
          userLevel,
          userName,
          messageType,
          mode,
          conversationContext: contextString,
        }),
      });

      if (response.status === 429) {
        const data = await response.json();
        // Inject Charlotte's rate-limit message as a normal chat bubble
        const rlMsg: Message = {
          id:          generateId(),
          role:        'assistant',
          content:     data.message ?? (userLevel === 'Novice' ? 'Limite atingido. Tente mais tarde!' : 'Limit reached. Try again later!'),
          messageType: 'text',
          timestamp:   new Date(),
        };
        setMessages(prev => [...prev, rlMsg]);
        saveChatMessage(userId, 'assistant', rlMsg.content, mode);
        setRateLimited({
          type:        data.type ?? 'hourly',
          retryAfter:  data.retry_after ?? 3600,
          isTrial:     data.is_trial ?? false,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return null; // signal caller to skip normal flow
      }

      if (!response.ok) throw new Error(`Assistant API error: ${response.status}`);

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Assistant API failed');

      return {
        feedback: data.result.feedback as string,
        technicalFeedback: data.result.technicalFeedback as string | undefined,
        xpAwarded: (data.result.xpAwarded as number) ?? 10,
        vocabularySuggestions: (data.result.vocabulary_suggestions as string[] | undefined) ?? [],
      };
    },
    [userLevel, userName, mode]
  );

  /**
   * Delivers assistant messages one-by-one with 1500ms delay.
   *
   * TTS routing:
   *   - grammar mode  → NEVER (text only)
   *   - chat text in  → NEVER (text → text)
   *   - chat audio in → YES   (audio → audio)
   *   - pronunciation → handled separately (demo TTS only)
   */
  const deliverSequentially = useCallback(
    async (
      parts: string[],
      technicalFeedback: string | undefined,
      respondWithAudio = false,
      extraProps: Partial<Message> = {}
    ) => {
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) await delay(1500);

        const audioUri = respondWithAudio ? await fetchTTS(parts[i], userId) : null;

        const msg: Message = {
          id: `${generateId()}-${i}`,
          role: 'assistant',
          content: parts[i],
          messageType: respondWithAudio && audioUri ? 'audio' : 'text',
          audioUrl: audioUri ?? undefined,
          audioDuration: undefined,
          timestamp: new Date(),
          technicalFeedback: i === 0 ? technicalFeedback : undefined,
          ...extraProps,
        };

        setMessages(prev => [...prev, msg]);
      }
    },
    []
  );

  const sendTextMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isProcessing) return;

      const userMsg: Message = {
        id: generateId(),
        role: 'user',
        content: text.trim(),
        messageType: 'text',
        timestamp: new Date(),
      };

      addMessage(userMsg);
      setIsProcessing(true);
      contextManagerRef.current.addMessage('user', text.trim(), 'text');

      // Save user message to history
      saveChatMessage(userId, 'user', text.trim(), mode);

      try {
        const result = await getAssistantResponse(text.trim(), 'text');
        if (!result) { setIsProcessing(false); return; }
        const { feedback, technicalFeedback, xpAwarded, vocabularySuggestions } = result;

        contextManagerRef.current.addMessage('assistant', feedback, 'text');

        if (technicalFeedback?.trim()) {
          setMessages(prev =>
            prev.map(m => m.id === userMsg.id ? { ...m, technicalFeedback } : m)
          );
        }

        // Text input → text output always (no TTS regardless of mode)
        await deliverSequentially(
          [feedback.trim()], technicalFeedback, false,
          vocabularySuggestions?.length ? { vocabularySuggestions } : {}
        );

        // Save assistant reply to history
        saveChatMessage(userId, 'assistant', feedback, mode);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        soundEngine.play('xp_gained').catch(() => {}); // 🔊 XP ding
        setSessionXP(prev => prev + xpAwarded);
        setTotalXP(prev => {
          const milestone = checkXPMilestone(prev, prev + xpAwarded);
          if (milestone) sendXPMilestoneNotification(milestone);
          return prev + xpAwarded;
        });
        if (userId) {
          await savePractice(userId, mode === 'grammar' ? 'grammar_message' : 'text_message', xpAwarded);
          // Poll for new achievements after DB trigger has time to run
          setTimeout(() => checkForNewAchievements(), 1500);
        }
      } catch (error) {
        console.error('❌ sendTextMessage error:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const fallback: Message = {
          id: generateId(),
          role: 'assistant',
          content: `Great practice, ${userName}! Keep it up! 😊`,
          messageType: 'text',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, fallback]);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, addMessage, getAssistantResponse, deliverSequentially, userLevel, userName, userId, mode]
  );

  /**
   * Sends a prompt silently — no user bubble added to the chat.
   * Used by "Explain more": the user tap triggers the flow invisibly,
   * Charlotte's typing indicator appears, and her response is marked
   * isExplainMore:true so the "Explain more" button is hidden on it.
   */
  const sendSilentMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isProcessing) return;

      setIsProcessing(true);
      contextManagerRef.current.addMessage('user', text.trim(), 'text');

      try {
        const result = await getAssistantResponse(text.trim(), 'text');
        if (!result) { setIsProcessing(false); return; }
        const { feedback, technicalFeedback, xpAwarded } = result;

        contextManagerRef.current.addMessage('assistant', feedback, 'text');

        await deliverSequentially([feedback.trim()], technicalFeedback, false, { isExplainMore: true });

        saveChatMessage(userId, 'assistant', feedback, mode);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        soundEngine.play('xp_gained').catch(() => {});
        setSessionXP(prev => prev + xpAwarded);
        setTotalXP(prev => {
          const milestone = checkXPMilestone(prev, prev + xpAwarded);
          if (milestone) sendXPMilestoneNotification(milestone);
          return prev + xpAwarded;
        });
        if (userId) {
          await savePractice(userId, mode === 'grammar' ? 'grammar_message' : 'text_message', xpAwarded);
          setTimeout(() => checkForNewAchievements(), 1500);
        }
      } catch (error) {
        console.error('sendSilentMessage error:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, getAssistantResponse, deliverSequentially, userLevel, userId, mode]
  );

  /**
   * Pronunciation mode — full pipeline:
   * record → transcribe → Azure assessment → score card → Charlotte text (no TTS) → demo TTS
   */
  const sendPronunciationAudio = useCallback(
    async (audioUri: string, audioDuration: number) => {
      setIsProcessing(true);
      setIsProcessingAudio(true);

      const tempId = generateId();
      addMessage({
        id: tempId,
        role: 'user',
        content: '',
        audioUri,
        audioDuration,
        messageType: 'audio',
        timestamp: new Date(),
        isRecording: true,
      });

      try {
        // ── 1. Transcribe ───────────────────────────────────────
        const transcription = await transcribeAudio(audioUri);
        setMessages(prev =>
          prev.map(m => m.id === tempId ? { ...m, content: '', isRecording: false } : m)
        );

        if (!transcription) {
          setMessages(prev =>
            prev.map(m => m.id === tempId ? {
              ...m, isRecording: false,
              technicalFeedback: "Couldn't hear you clearly. Try again in a quiet place 🎤",
            } : m)
          );
          setMessages(prev => [...prev, {
            id: generateId(), role: 'assistant',
            content: "I didn't catch that. Hold the mic and speak clearly.",
            messageType: 'text', timestamp: new Date(),
          }]);
          return;
        }

        contextManagerRef.current.addMessage('user', transcription, 'audio');

        // ── 2. Azure pronunciation assessment — always in reference mode ──
        // Whisper already produces the semantically-intended form of what the user
        // said (e.g. it transcribes "world" even if the user said "word").
        // We use that as the reference so Azure can detect the phonetic gap between
        // what the user said and what the correct word sounds like.
        // The semantic/minimal-pair check runs AFTER Azure — only for demo feedback.
        const referenceText = transcription; // always use Whisper's transcript
        console.log('🔤 [azure] Using Whisper transcript as ref text:', referenceText);

        // ── 3. Azure pronunciation assessment (with ref text if available) ──
        let pronunciationData: PronunciationData | null = null;
        let mispronounced: string[] = [];
        let azureAvailable = false;
        try {
          const lower = audioUri.toLowerCase();
          const isWav = lower.endsWith('.wav'); // iOS; Android uses .m4a
          const formData = new FormData();
          formData.append('audio', {
            uri:  audioUri,
            name: isWav ? 'recording.wav' : 'recording.m4a',
            type: isWav ? 'audio/wav'     : 'audio/x-m4a',
          } as unknown as Blob);
          // Always pass Whisper's transcript as reference — Azure reference mode
          // gives proper per-word errorType detection and reliable scores.
          formData.append('referenceText', referenceText);
          console.log(`🔬 Calling /api/pronunciation... (ref: "${referenceText.slice(0, 60)}")`);
          const res = await fetch(`${API_BASE_URL}/api/pronunciation`, {
            method: 'POST',
            body: formData,
          });
          console.log('🔬 Pronunciation API status:', res.status);
          if (res.ok) {
            const json = await res.json();
            console.log('🔬 Pronunciation result:', JSON.stringify(json).slice(0, 300));
            if (json.success && json.result) {
              azureAvailable = true;
              pronunciationData = {
                text:               json.result.text               ?? transcription,
                pronunciationScore: json.result.pronunciationScore ?? 0,
                accuracyScore:      json.result.accuracyScore      ?? 0,
                fluencyScore:       json.result.fluencyScore       ?? 0,
                completenessScore:  json.result.completenessScore  ?? 0,
                prosodyScore:       json.result.prosodyScore,
                words:              json.result.words              ?? [],
              };
              // In reference mode Azure returns proper errorTypes; in free speech
              // mode fall back to accuracy threshold to catch weak spots.
              mispronounced = (json.result.words ?? [])
                .filter((w: { errorType?: string; accuracyScore: number }) =>
                  w.errorType === 'Mispronunciation' || w.accuracyScore < 82
                )
                .map((w: { word: string }) => w.word);
            } else {
              console.warn('⚠️ Pronunciation API returned failure:', json.error ?? 'unknown');
            }
          } else {
            const errText = await res.text().catch(() => '');
            console.warn('⚠️ Pronunciation API HTTP error:', res.status, errText.slice(0, 200));
          }
        } catch (e) {
          console.warn('⚠️ Pronunciation API unreachable:', e);
        }

        // ── 3. Score card bubble ────────────────────────────────
        if (azureAvailable && pronunciationData) {
          setMessages(prev => [...prev, {
            id: generateId(),
            role: 'assistant',
            content: '',
            messageType: 'pronunciation_score',
            pronunciationData,
            timestamp: new Date(),
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: generateId(),
            role: 'assistant',
            content: '',
            messageType: 'pronunciation_score',
            pronunciationData: {
              text:               transcription,
              pronunciationScore: -1,
              accuracyScore:      -1,
              fluencyScore:       -1,
              completenessScore:  -1,
              words:              [],
            },
            timestamp: new Date(),
          }]);
        }

        // ── 4. Charlotte feedback — TEXT only in pronunciation mode ──
        const pronunciationResult = await getAssistantResponse(transcription, 'audio', pronunciationData);
        if (!pronunciationResult) return;
        const { feedback, xpAwarded } = pronunciationResult;

        contextManagerRef.current.addMessage('assistant', feedback, 'text');

        setMessages(prev => [...prev, {
          id: generateId(),
          role: 'assistant',
          content: feedback,
          messageType: 'text',
          timestamp: new Date(),
        }]);

        // Save transcription + score summary for pedagogical analysis
        if (transcription) {
          const scoreNote = pronunciationData
            ? ` [score:${pronunciationData.pronunciationScore} mispronounced:${mispronounced.join(',')}]`
            : '';
          saveChatMessage(userId, 'user', transcription + scoreNote, 'pronunciation');
          saveChatMessage(userId, 'assistant', feedback, 'pronunciation');
        }

        // ── 5a. Semantic check — POST-Azure, for demo feedback only ──
        // Now that Azure has already scored the audio against Whisper's transcript,
        // we check if Whisper itself over-corrected (e.g. user said "word" but
        // context made Whisper write "world"). This detection is used ONLY to
        // generate a targeted demo — it no longer influences Azure scoring.
        interface SemanticCorrection { heard: string; likely: string }
        let semanticCorrections: SemanticCorrection[] = [];
        if (transcription && transcription.trim().length > 3) {
          try {
            const semRes = await fetch(`${API_BASE_URL}/api/pronunciation-semantic`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: transcription }),
            });
            if (semRes.ok) {
              const semJson = await semRes.json();
              semanticCorrections = semJson.corrections ?? [];
              if (semanticCorrections.length > 0) {
                console.log('🔤 [semantic] Minimal-pair error detected (demo only):', semanticCorrections);
              } else {
                console.log('🔤 [semantic] No minimal-pair errors found — sentence is semantically correct');
              }
            }
          } catch (e) {
            console.warn('⚠️ Semantic check failed, skipping demo for minimal pairs:', e);
          }
        }

        // ── 5b. Demo TTS ────────────────────────────────────────────────────────
        // Always demo the user's OWN sentence via Charlotte's TTS.
        //
        // Path a / c (mispronounced words or prosody): play the original sentence
        // as-is — the user hears how THEIR sentence should sound with correct
        // stress, intonation and word pronunciation.
        //
        // Path b (semantic/minimal-pair): the user said the wrong word (e.g. "world"
        // instead of "word"). Substitute each wrong word with the correct one in the
        // original sentence so the user hears the same context with the fix applied.
        // e.g. "I heard the world" → "I heard the word"
        const lowProsody = pronunciationData != null &&
          (pronunciationData.prosodyScore ?? 100) < 82;

        const shouldDemo =
          pronunciationData != null &&
          (
            mispronounced.length > 0 ||
            semanticCorrections.length > 0 ||
            (lowProsody && pronunciationData.pronunciationScore < 88)
          );

        if (shouldDemo && pronunciationData) {
          let demoText = transcription?.trim() ?? '';

          if (semanticCorrections.length > 0 && mispronounced.length === 0 && demoText) {
            // Path b — replace each wrongly-heard word with the correct one
            // using a case-insensitive whole-word substitution so sentence
            // structure is preserved.
            let corrected = demoText;
            for (const { heard, likely } of semanticCorrections) {
              corrected = corrected.replace(
                new RegExp(`\\b${heard}\\b`, 'gi'),
                likely
              );
            }
            demoText = corrected;
          }

          // Path a / c — mispronounced words or prosody: demo the user's own
          // sentence so they hear exactly how it should sound.
          if (!demoText && transcription) {
            demoText = transcription.trim();
          }

          if (demoText) {
            const demoUri = await fetchTTS(demoText, userId);
            if (demoUri) {
              setMessages(prev => [...prev, {
                id: generateId(),
                role: 'assistant',
                content: demoText,
                messageType: 'audio',
                audioUrl: demoUri,
                isDemonstration: true,
                timestamp: new Date(),
              }]);
            }
          }
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        soundEngine.play('xp_gained').catch(() => {}); // 🔊 XP ding
        setSessionXP(prev => prev + xpAwarded);
        setTotalXP(prev => {
          const milestone = checkXPMilestone(prev, prev + xpAwarded);
          if (milestone) sendXPMilestoneNotification(milestone);
          return prev + xpAwarded;
        });
        if (userId) {
          await savePractice(userId, 'audio_message', xpAwarded);
          setTimeout(() => checkForNewAchievements(), 1500);
        }

      } catch (error) {
        console.error('❌ pronunciation flow error:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, isRecording: false } : m));
        setMessages(prev => [...prev, {
          id: generateId(), role: 'assistant',
          content: "Sorry, I had trouble with that. Please try again!",
          messageType: 'text', timestamp: new Date(),
        }]);
      } finally {
        setIsProcessing(false);
        setIsProcessingAudio(false);
      }
    },
    [addMessage, getAssistantResponse, userLevel, userId]
  );

  /**
   * Send a recorded audio message.
   * - pronunciation mode → full assessment pipeline
   * - chat mode          → transcribe → GPT → TTS response (audio in → audio out)
   * - grammar mode       → transcribe → GPT → text response (no TTS)
   */
  const sendAudioMessage = useCallback(
    async (audioUri: string, audioDuration: number) => {
      if (isProcessing) return;

      if (mode === 'pronunciation') {
        await sendPronunciationAudio(audioUri, audioDuration);
        return;
      }

      setIsProcessing(true);
      setIsProcessingAudio(true);

      const tempId = generateId();
      addMessage({
        id: tempId,
        role: 'user',
        content: '',
        audioUri,
        audioDuration,
        messageType: 'audio',
        timestamp: new Date(),
        isRecording: true,
      });

      try {
        console.log('🎤 Transcribing audio:', audioUri);
        const transcription = await transcribeAudio(audioUri);
        console.log('📝 Transcription result:', transcription);

        setMessages(prev =>
          prev.map(m => m.id === tempId ? { ...m, content: '', isRecording: false } : m)
        );

        if (!transcription) {
          console.warn('⚠️ Transcription returned null — aborting');
          setMessages(prev =>
            prev.map(m => m.id === tempId ? {
              ...m, isRecording: false,
              technicalFeedback: "Couldn't hear you clearly. Try again in a quiet place 🎤",
            } : m)
          );
          setMessages(prev => [...prev, {
            id: generateId(), role: 'assistant',
            content: "I didn't catch that — the audio was too short or silent. Hold the mic button and speak clearly.",
            messageType: 'text', timestamp: new Date(),
          }]);
          setIsProcessing(false);
          setIsProcessingAudio(false);
          return;
        }

        contextManagerRef.current.addMessage('user', transcription, 'audio');

        // Save transcription as user message in chat history
        saveChatMessage(userId, 'user', transcription, mode);

        const audioResult = await getAssistantResponse(transcription, 'audio');
        if (!audioResult) return;
        const { feedback, technicalFeedback, xpAwarded, vocabularySuggestions } = audioResult;

        contextManagerRef.current.addMessage('assistant', feedback, 'text');

        if (technicalFeedback?.trim()) {
          setMessages(prev =>
            prev.map(m => m.id === tempId ? { ...m, technicalFeedback } : m)
          );
        }

        // chat audio in → audio out (TTS); grammar audio in → text out
        const withAudio = mode === 'chat';
        await deliverSequentially(
          [feedback.trim()], technicalFeedback, withAudio,
          vocabularySuggestions?.length ? { vocabularySuggestions } : {}
        );

        // Save assistant reply to chat history
        saveChatMessage(userId, 'assistant', feedback, mode);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSessionXP(prev => prev + xpAwarded);
        setTotalXP(prev => {
          const milestone = checkXPMilestone(prev, prev + xpAwarded);
          if (milestone) sendXPMilestoneNotification(milestone);
          return prev + xpAwarded;
        });
        if (userId) {
          await savePractice(userId, 'audio_message', xpAwarded);
          setTimeout(() => checkForNewAchievements(), 1500);
        }
      } catch (error) {
        console.error('❌ sendAudioMessage error:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, isRecording: false } : m));
        setMessages(prev => [...prev, {
          id: generateId(), role: 'assistant',
          content: "Sorry, I had trouble processing that. Please try again!",
          messageType: 'text', timestamp: new Date(),
        }]);
      } finally {
        setIsProcessing(false);
        setIsProcessingAudio(false);
      }
    },
    [isProcessing, mode, sendPronunciationAudio, addMessage, getAssistantResponse, deliverSequentially, userLevel, userId]
  );

  return {
    messages,
    isProcessing,
    isProcessingAudio,
    historyLoading,
    sessionXP,
    totalXP,
    rateLimited,
    sendTextMessage,
    sendSilentMessage,
    sendAudioMessage,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildWelcome(mode: ChatMode, userLevel: string, userName: string): Message {
  // Use only the first name for a warmer, more personal greeting
  const firstName = userName.split(/[\s\-]+/)[0];
  const welcomeMessages: Record<string, Record<string, string>> = {
    grammar: {
      Advanced: `Hi ${firstName}! Let's sharpen your grammar. Type a sentence and I'll give you a detailed analysis.`,
      Inter: `Hi ${firstName}! Send me a sentence in English and I'll help you improve your grammar.`,
      Novice: `Olá ${firstName}! Escreva uma frase em inglês e eu vou analisar sua gramática. Pode ser simples!`,
    },
    pronunciation: {
      Advanced: `Hi ${firstName}! Let's work on your pronunciation. Hold the mic and say something — I'll analyze stress, intonation, and fluency.`,
      Inter: `Hi ${firstName}! Hold the mic button and say something in English. I'll check your pronunciation and give you tips!`,
      Novice: `Olá ${firstName}! Segure o botão do microfone e fale em inglês. Vou analisar sua pronúncia!`,
    },
    chat: {
      Advanced: `Hey ${firstName}! Ready to practice? What's on your mind today?`,
      Inter: `Hi ${firstName}! Great to see you. Let's practice some English today!`,
      Novice: `Olá ${firstName}! Vamos praticar inglês juntos hoje? Pode escrever em português se preferir!`,
    },
  };
  return {
    id: 'welcome-0',
    role: 'assistant',
    content: (welcomeMessages[mode] ?? welcomeMessages.chat)[userLevel] ?? welcomeMessages.chat[userLevel],
    messageType: 'text',
    timestamp: new Date(),
  };
}
