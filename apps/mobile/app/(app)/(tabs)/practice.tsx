// app/(app)/(tabs)/practice.tsx
// Practice tab unificada — 3 modos (chat / grammar / pronunciation) com toggle
// pill no topo. Substitui o trail antigo + as 3 rotas separadas
// (/grammar, /pronunciation, /chat) que viraram redirects.

import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import {
  Alert, View, TouchableOpacity, KeyboardAvoidingView, Platform, Modal,
  Pressable, Animated, Easing, ScrollView, Dimensions,
} from 'react-native';
import { Question, X, ClockCounterClockwise, XCircle, CaretRight, Trash, Plus } from 'phosphor-react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/hooks/useAuth';
import { HeaderPills } from '@/components/ui/HeaderPills';
import { AppText } from '@/components/ui/Text';
import ChatBox from '@/components/chat/ChatBox';
import ChatInputBar from '@/components/chat/ChatInputBar';
import AchievementNotification from '@/components/achievements/AchievementNotification';
import { TooltipAnchor } from '@/components/ui/TooltipBalloon';
import { PracticeSuggestionTooltip } from '@/components/practice/PracticeSuggestionTooltip';
import { TopicPills, Topic } from '@/components/practice/TopicPills';
import { PronunciationPhraseHint } from '@/components/practice/PronunciationPhraseHint';
import { useChat } from '@/hooks/useChat';
import { useMessageAudioPlayer } from '@/hooks/useMessageAudioPlayer';
import { usePaywallContext } from '@/lib/paywallContext';
import { Achievement } from '@/lib/types/achievement';
import { UserLevel } from '@/lib/levelConfig';
import { supabase } from '@/lib/supabase';
import { localTodayStr } from '@/lib/dateUtils';

type Mode = 'chat' | 'grammar' | 'pronunciation';

const MODES: { id: Mode; labelPt: string; labelEn: string }[] = [
  { id: 'chat',          labelPt: 'Free Chat',     labelEn: 'Free Chat' },
  { id: 'grammar',       labelPt: 'Gramática',     labelEn: 'Grammar' },
  { id: 'pronunciation', labelPt: 'Pronúncia',     labelEn: 'Pronunciation' },
];

// practice_types gravados em charlotte_practices, agrupados por modo do toggle.
const MODE_PRACTICE_TYPES: Record<Mode, string[]> = {
  chat:          ['text_message', 'chat'],
  grammar:       ['grammar_message', 'grammar'],
  pronunciation: ['audio_message', 'pronunciation'],
};

const C = {
  bg:        '#F4F3FA',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  navyGhost: 'rgba(22,21,58,0.06)',
  border:    'rgba(22,21,58,0.10)',
  greenAccent: '#A3FF3C',
  red:       '#DC2626',
};

interface ChatSession {
  id:            string;
  started_at:    string;
  ended_at:      string | null;
  summary:       string | null;
  message_count: number;
}

export default function PracticeTab() {
  const { profile, signOut } = useAuth();
  const { openPaywall } = usePaywallContext();

  const userLevel = (profile?.charlotte_level ?? 'Novice') as UserLevel;
  const userName  = profile?.name ?? profile?.email?.split('@')[0] ?? 'Student';
  const userId    = profile?.id ?? '';
  const isPt      = userLevel === 'Novice';
  const accent    = userLevel === 'Novice' ? '#D97706' : userLevel === 'Inter' ? '#7C3AED' : '#0F766E';

  // Mode state — vem do URL ?mode=, default 'chat'
  const params = useLocalSearchParams<{ mode?: string }>();
  const rawMode = (params.mode ?? 'chat') as string;
  const mode: Mode = MODES.some(m => m.id === rawMode) ? (rawMode as Mode) : 'chat';

  // useChat com mode dinâmico — re-monta quando mode troca
  const {
    messages, isProcessing, isProcessingAudio, historyLoading,
    sessionXP, totalXP, rateLimited,
    sendTextMessage, sendAudioMessage, sendSilentMessage, resetMessages,
    activeSessionId, closeSession, loadSession,
  } = useChat({ userLevel, userName, userId, mode });

  const { playingMessageId, toggle } = useMessageAudioPlayer();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [recentSessions, setRecentSessions] = useState<ChatSession[]>([]);
  // daysSince por modo (-1 = nunca / não carregado, 0 = hoje, ...). 999 = nunca tentou
  const [daysSince, setDaysSince] = useState<Record<Mode, number>>({
    chat: -1, grammar: -1, pronunciation: -1,
  });
  // Streak + rank pra HeaderPills (mesmo padrão das outras tabs)
  const [streak, setStreak] = useState(0);
  const [rank,   setRank]   = useState<number | null>(null);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const screenW = Dimensions.get('window').width;
  const drawerW = Math.round(screenW * 0.82);

  // Fetch das práticas dos últimos 30 dias pra calcular daysSince por mode
  const fetchDaysSince = useCallback(async () => {
    if (!userId) return;
    const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { data } = await supabase
      .from('charlotte_practices')
      .select('practice_type, created_at')
      .eq('user_id', userId)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false });

    const result: Record<Mode, number> = { chat: 999, grammar: 999, pronunciation: 999 };
    if (data) {
      const now = Date.now();
      for (const m of MODES) {
        const types = MODE_PRACTICE_TYPES[m.id];
        const last = data.find(p => types.includes(p.practice_type));
        if (last) {
          result[m.id] = Math.floor((now - new Date(last.created_at).getTime()) / 86_400_000);
        }
      }
    }
    setDaysSince(result);
  }, [userId]);

  useFocusEffect(useCallback(() => { fetchDaysSince(); }, [fetchDaysSince]));

  // Refetch daysSince ao trocar de modo (focus only não cobre mode-switch
  // dentro da tab) e quando uma nova msg é enviada (rastreado por messages.length).
  useEffect(() => { fetchDaysSince(); }, [mode, fetchDaysSince]);
  useEffect(() => {
    if (messages.length > 1) fetchDaysSince();
  }, [messages.length, fetchDaysSince]);

  // Fetch streak + rank pra header pills (mesmo padrão das outras tabs)
  const fetchHeaderStats = useCallback(async () => {
    if (!userId) return;
    const [prog, leaderboardCount] = await Promise.all([
      supabase.from('charlotte_progress')
        .select('streak_days, last_practice_date, total_xp')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase.from('charlotte_leaderboard_cache')
        .select('*', { count: 'exact', head: true })
        .eq('user_level', userLevel)
        .gt('total_xp', totalXP),
    ]);

    const userTotalXP = prog.data?.total_xp ?? 0;
    const todayStr = localTodayStr();
    const yesterdayStr = (() => {
      const d = new Date(); d.setDate(d.getDate() - 1);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    })();
    const lastPractice = prog.data?.last_practice_date ?? null;
    const alive = lastPractice === todayStr || lastPractice === yesterdayStr;
    setStreak(alive ? (prog.data?.streak_days ?? 0) : 0);
    setRank(userTotalXP > 0 ? (leaderboardCount.count ?? 0) + 1 : null);
  }, [userId, userLevel, totalXP]);

  useFocusEffect(useCallback(() => { fetchHeaderStats(); }, [fetchHeaderStats]));

  // Fetch das sessions encerradas (chat mode only)
  const fetchSessions = useCallback(async () => {
    if (!userId || mode !== 'chat') return;
    const { data } = await supabase
      .from('charlotte_chat_sessions')
      .select('id,started_at,ended_at,summary,message_count')
      .eq('user_id', userId)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(20);
    setRecentSessions(data ?? []);
  }, [userId, mode]);

  useFocusEffect(useCallback(() => { fetchSessions(); }, [fetchSessions]));

  // ── Sugestão diária (tooltip ancorado no pill) ──
  // Lógica: ignora modo atual. Prioriza atrasado (d>=3 e !=999, mais antigo
  // primeiro), depois novo (d===999, Free Chat preferido). Todos recentes →
  // não sugere. Mostra 1x/dia (SecureStore flag por data).
  const [suggestionAnchor, setSuggestionAnchor] = useState<TooltipAnchor | null>(null);
  const [suggestionMode,   setSuggestionMode]   = useState<Mode | null>(null);
  const [suggestionShown,  setSuggestionShown]  = useState(false);
  const pillRefs = useRef<Partial<Record<Mode, View | null>>>({});

  const suggestedMode = useMemo<Mode | null>(() => {
    const others = MODES.filter(m => m.id !== mode);
    if (others.some(m => daysSince[m.id] < 0)) return null;     // ainda carregando
    const overdue = others
      .filter(m => daysSince[m.id] >= 3 && daysSince[m.id] !== 999)
      .sort((a, b) => daysSince[b.id] - daysSince[a.id]);
    if (overdue[0]) return overdue[0].id;
    const fresh = others.filter(m => daysSince[m.id] === 999);
    if (fresh.length) return (fresh.find(m => m.id === 'chat') ?? fresh[0]).id;
    return null;
  }, [mode, daysSince]);

  const suggestionText = useMemo(() => {
    if (!suggestionMode) return '';
    const labels: Record<Mode, { pt: string; en: string }> = {
      chat:          { pt: 'Free Chat',  en: 'Free Chat' },
      grammar:       { pt: 'Gramática',  en: 'Grammar' },
      pronunciation: { pt: 'Pronúncia',  en: 'Pronunciation' },
    };
    const l = labels[suggestionMode];
    return isPt ? `Que tal praticar ${l.pt} hoje?` : `Try ${l.en} today?`;
  }, [suggestionMode, isPt]);

  // Carrega flag "já mostrado hoje" 1x ao montar
  useEffect(() => {
    SecureStore.getItemAsync(`practice_suggestion_${localTodayStr()}`)
      .then(v => { if (v) setSuggestionShown(true); })
      .catch(() => {});
  }, []);

  // Quando suggestedMode aparece e ainda não foi mostrado hoje, mede o pill
  useEffect(() => {
    if (!suggestedMode || suggestionShown) return;
    const t = setTimeout(() => {
      const ref = pillRefs.current[suggestedMode];
      if (!ref) return;
      ref.measureInWindow((x, y, w, h) => {
        if (!w) return;     // layout ainda não pronto
        setSuggestionAnchor({ x, y, width: w, height: h });
        setSuggestionMode(suggestedMode);
        setSuggestionShown(true);
        SecureStore
          .setItemAsync(`practice_suggestion_${localTodayStr()}`, '1')
          .catch(() => {});
      });
    }, 600);
    return () => clearTimeout(t);
  }, [suggestedMode, suggestionShown]);

  const dismissSuggestion = useCallback(() => {
    setSuggestionAnchor(null);
    setSuggestionMode(null);
  }, []);

  // Auto-fecha drawer/help/etc ao sair da tab (não persiste ao voltar)
  useFocusEffect(useCallback(() => {
    return () => {
      setShowHistory(false);
      setShowHelp(false);
      setSuggestionAnchor(null);
      setSuggestionMode(null);
    };
  }, []));

  // Trocar de modo:
  // - chat → outro: encerra session (vai pro histórico) + limpa state
  // - outro → outro: só troca (state local zera via effect do useChat)
  const handleModeSwitch = useCallback(async (newMode: Mode) => {
    if (newMode === mode) return;
    // Limpa tooltip de sugestão se estiver visível (evita ficar ancorado num
    // pill que já não faz sentido após a troca).
    setSuggestionAnchor(null);
    setSuggestionMode(null);

    if (mode === 'chat' && messages.length >= 2) {
      Alert.alert(
        isPt ? 'Encerrar conversa?' : 'End conversation?',
        isPt
          ? 'A conversa será salva no histórico e você poderá retomar depois.'
          : 'The conversation will be saved to history and you can resume it later.',
        [
          { text: isPt ? 'Cancelar' : 'Cancel', style: 'cancel' },
          {
            text: isPt ? 'Encerrar' : 'End',
            onPress: async () => {
              await closeSession();
              router.setParams({ mode: newMode });
              // Refresh sessions list (chamado pelo useFocusEffect quando voltar)
            },
          },
        ],
      );
    } else {
      // Outros modos não tem session persistente — só troca
      router.setParams({ mode: newMode });
    }
  }, [mode, messages.length, isPt, closeSession]);

  // Tap em session do drawer: fecha drawer + carrega no ChatBox
  const handleLoadSession = useCallback(async (sessionId: string) => {
    setShowHistory(false);
    await loadSession(sessionId);
    fetchSessions();
  }, [loadSession, fetchSessions]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    setRecentSessions(prev => prev.filter(s => s.id !== sessionId));
    // Apaga sessão + mensagens associadas
    await supabase.from('chat_messages').delete().eq('session_id', sessionId);
    const { error } = await supabase.from('charlotte_chat_sessions').delete().eq('id', sessionId);
    if (error) {
      console.warn('[practice] delete session failed:', error.message);
      fetchSessions();
    }
  }, [fetchSessions]);

  // Tap em pill de tópico (Novice Free Chat) — silent prompt, Charlotte abre
  // o tópico com pergunta. User não vê própria msg, só o typing indicator.
  const handleTopicSelect = useCallback((topic: Topic) => {
    if (isProcessing) return;
    sendSilentMessage(topic.prompt);
  }, [isProcessing, sendSilentMessage]);

  // Botão "+" — força nova conversa. Se vazia, no-op. Se tem msgs, confirma.
  const handleNewSession = useCallback(() => {
    if (messages.length <= 1) return;        // só welcome → já está em conversa nova
    Alert.alert(
      isPt ? 'Iniciar nova conversa?' : 'Start a new conversation?',
      isPt
        ? 'A conversa atual será salva no histórico e você poderá retomar depois.'
        : 'The current conversation will be saved to history and you can resume it later.',
      [
        { text: isPt ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: isPt ? 'Nova conversa' : 'New conversation',
          onPress: async () => { await closeSession(); fetchSessions(); },
        },
      ],
    );
  }, [messages.length, isPt, closeSession, fetchSessions]);

  // Explain more (grammar only)
  const handleExplainMore = useCallback((_originalCorrection: string) => {
    const prompt = isPt
      ? 'Me explique melhor essa correção, com mais detalhes e exemplos em português.'
      : 'Please explain that correction in more detail, with examples.';
    sendSilentMessage(prompt);
  }, [isPt, sendSilentMessage]);

  // Stats nav params
  const statsParams = useMemo(() => ({
    sessionXP: String(sessionXP), totalXP: String(totalXP),
    userId, userLevel, userName,
  }), [sessionXP, totalXP, userId, userLevel, userName]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>

      <HeaderPills
        streak={streak}
        totalXP={totalXP}
        rank={rank}
        statsParams={statsParams}
        isPt={isPt}
      />

      {/* Body wrapper — drawer absolute fica DENTRO deste wrapper, não cobre
          HeaderPills (que tá acima) nem tab bar (que tá fora do screen). */}
      <View style={{ flex: 1, position: 'relative' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        // iOS: KAV adiciona padding = (frame.bottom - keyboard.screenY) + offset.
        // MAIOR offset = MAIS push. Como o input bar perdeu insets.bottom de
        // padding interno (gap fix), precisamos somar insets.bottom aqui pra
        // recuperar o push perdido. iPhone com home indicator: tabBarHeight 83
        // + insets.bottom 34 + 12 = 129. Sem isso o teclado corta o input.
        keyboardVerticalOffset={Platform.OS === 'ios' ? tabBarHeight + insets.bottom + 12 : 0}
      >
        {/* ── Toggle pill (3 modos, hug content centered) ── */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
          <View style={{
            flexDirection: 'row',
            backgroundColor: '#FFFFFF',
            borderRadius: 22,
            padding: 4,
            borderWidth: 1, borderColor: C.border,
            shadowColor: 'rgba(22,21,58,0.08)',
            shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}>
            {MODES.map(m => {
              const active = m.id === mode;
              const d = daysSince[m.id];
              // Dot só pra pills inativos. Verde = nunca tentou (novo);
              // âmbar = 3+ dias sem praticar. Recentes (0-2) sem dot.
              const dotColor =
                active || d < 0 ? null
                : d === 999 ? '#3D8800'      // novo (nunca tentou)
                : d >= 3    ? '#D97706'      // atrasado
                            : null;
              return (
                <TouchableOpacity
                  key={m.id}
                  ref={(r) => { pillRefs.current[m.id] = r as unknown as View | null; }}
                  onPress={() => handleModeSwitch(m.id)}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 7,
                    borderRadius: 18,
                    backgroundColor: active ? accent : 'transparent',
                  }}
                >
                  <AppText style={{
                    fontSize: 13, fontWeight: '700',
                    color: active ? '#FFFFFF' : C.navyMid,
                  }}>
                    {isPt ? m.labelPt : m.labelEn}
                  </AppText>
                  {dotColor && (
                    <View style={{
                      position: 'absolute',
                      top: 4, right: 6,
                      width: 6, height: 6, borderRadius: 3,
                      backgroundColor: dotColor,
                    }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>


        {/* ── Área de mensagens ── */}
        <View style={{ flex: 1 }}>
          <ChatBox
            messages={messages}
            transcript=""
            finalTranscript=""
            isProcessingMessage={isProcessing}
            isProcessingAudio={mode === 'chat' ? isProcessingAudio : false}
            historyLoading={historyLoading}
            userLevel={userLevel}
            mode={mode}
            onPlayAudio={toggle}
            playingMessageId={playingMessageId}
            onExplainMore={mode === 'grammar' ? handleExplainMore : undefined}
          />

          {/* Botões flutuantes bottom-right: histórico (chat only) + ajuda */}
          <View style={{
            position: 'absolute',
            bottom: 10, right: 12,
            flexDirection: 'row', gap: 8,
            zIndex: 5,
          }}>
            {mode === 'chat' && (
              <>
                <TouchableOpacity
                  onPress={handleNewSession}
                  style={{
                    width: 34, height: 34, borderRadius: 17,
                    backgroundColor: '#FFFFFF',
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1, borderColor: C.border,
                    shadowColor: 'rgba(22,21,58,0.12)',
                    shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
                    elevation: 3,
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={isPt ? 'Nova conversa' : 'New conversation'}
                >
                  <Plus size={17} color={C.navyMid} weight="regular" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowHistory(true)}
                  style={{
                    width: 34, height: 34, borderRadius: 17,
                    backgroundColor: '#FFFFFF',
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1, borderColor: C.border,
                    shadowColor: 'rgba(22,21,58,0.12)',
                    shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
                    elevation: 3,
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={isPt ? 'Histórico de conversas' : 'Conversation history'}
                >
                  <ClockCounterClockwise size={17} color={C.navyMid} weight="regular" />
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              onPress={() => setShowHelp(true)}
              style={{
                width: 34, height: 34, borderRadius: 17,
                backgroundColor: '#FFFFFF',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: C.border,
                shadowColor: 'rgba(22,21,58,0.12)',
                shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
                elevation: 3,
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={isPt ? 'Ajuda' : 'Help'}
            >
              <Question size={17} color={C.navyMid} weight="regular" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Topic pills (Novice + Free Chat + conversa vazia) ── */}
        {userLevel === 'Novice' && mode === 'chat' && messages.length <= 1 && (
          <TopicPills
            isPt={isPt}
            accent={accent}
            disabled={isProcessing || !!rateLimited}
            onSelect={handleTopicSelect}
          />
        )}

        {/* ── Pronunciation phrase hint (sempre Novice; toggle pra Inter/Adv) ── */}
        {mode === 'pronunciation' && (
          <PronunciationPhraseHint
            userLevel={userLevel}
            isPt={isPt}
            accent={accent}
            onPhraseChange={resetMessages}
          />
        )}

        {/* ── Input bar — varia por modo ── */}
        <ChatInputBar
          onSendText={mode === 'pronunciation' ? () => {} : sendTextMessage}
          onSendAudio={mode === 'grammar' ? undefined : sendAudioMessage}
          onUpgradePress={openPaywall}
          disabled={isProcessing || !!rateLimited}
          mode={mode}
          userLevel={userLevel}
          rateLimited={rateLimited}
        />
      </KeyboardAvoidingView>

      {/* ── Drawer de histórico (Free Chat only) — DENTRO do body wrapper ── */}
      <ChatSessionsDrawer
        sessions={recentSessions}
        isOpen={showHistory}
        isPt={isPt}
        drawerWidth={drawerW}
        topInset={0}
        bottomInset={0}
        activeSessionId={activeSessionId}
        onClose={() => setShowHistory(false)}
        onSelect={handleLoadSession}
        onDelete={handleDeleteSession}
      />
      </View>
      {/* /body wrapper */}

      {/* ── Sugestão diária ancorada ABAIXO do pill, fica até user fechar ── */}
      <PracticeSuggestionTooltip
        visible={!!suggestionAnchor && !!suggestionMode}
        text={suggestionText}
        anchor={suggestionAnchor}
        onClose={dismissSuggestion}
      />

      {/* ── Achievement notification (grammar + pronunciation) ── */}
      {(mode === 'grammar' || mode === 'pronunciation') && (
        <AchievementNotification
          achievements={achievements}
          onDismiss={id => setAchievements(prev => prev.filter(a => a.id !== id))}
          isPt={isPt}
        />
      )}

      {/* ── Help modal (bottom sheet style) ── */}
      <Modal visible={showHelp} transparent animationType="fade" onRequestClose={() => setShowHelp(false)}>
        <Pressable
          onPress={() => setShowHelp(false)}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              paddingHorizontal: 24, paddingTop: 18, paddingBottom: 28,
            }}
          >
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(22,21,58,0.15)', alignSelf: 'center', marginBottom: 16 }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <AppText style={{ fontSize: 17, fontWeight: '800', color: C.navy, flex: 1 }}>
                {isPt ? 'Como usar' : 'How it works'}
              </AppText>
              <TouchableOpacity onPress={() => setShowHelp(false)}>
                <X size={20} color={C.navyLight} weight="bold" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 14 }}>
              <HelpRow
                title={isPt ? 'Free Chat' : 'Free Chat'}
                desc={isPt
                  ? 'Conversa livre com a Charlotte. Toque pra digitar ou segure o microfone pra falar.'
                  : 'Open conversation with Charlotte. Type or hold the mic to speak.'}
              />
              <HelpRow
                title={isPt ? 'Gramática' : 'Grammar'}
                desc={isPt
                  ? 'Digite uma frase em inglês e a Charlotte corrige com explicação em português.'
                  : 'Type an English sentence and Charlotte will correct grammar, spelling and style.'}
              />
              <HelpRow
                title={isPt ? 'Pronúncia' : 'Pronunciation'}
                desc={isPt
                  ? 'Segure o microfone pra gravar uma frase. A Charlotte analisa sua pronúncia e dá feedback.'
                  : 'Hold the mic to record a phrase. Charlotte analyses your pronunciation and gives feedback.'}
              />
              <HelpRow
                title={isPt ? 'Trocar de modo' : 'Switch mode'}
                desc={isPt
                  ? 'No Free Chat a conversa é salva no histórico ao trocar de modo. Grammar e Pronúncia descartam a conversa.'
                  : 'In Free Chat your conversation is saved to history when you switch mode. Grammar and Pronunciation discard the conversation.'}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function HelpRow({ title, desc }: { title: string; desc: string }) {
  return (
    <View>
      <AppText style={{ fontSize: 14, fontWeight: '800', color: C.navy, marginBottom: 2 }}>
        {title}
      </AppText>
      <AppText style={{ fontSize: 13, color: C.navyMid, lineHeight: 19 }}>
        {desc}
      </AppText>
    </View>
  );
}

// ── Drawer in-screen com lista de sessions de Free Chat ──────────────────────
// Mesmo padrão do CallsDrawer da livevoice tab. Slide da direita (oposto ao
// LiveVoice drawer que é da esquerda) — botão histórico do Practice fica na
// direita do header, então drawer entra do mesmo lado.

function ChatSessionsDrawer({
  sessions, isOpen, onClose, onSelect, onDelete, isPt, drawerWidth, topInset, bottomInset,
  activeSessionId,
}: {
  sessions: ChatSession[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  isPt: boolean;
  drawerWidth: number;
  topInset: number;
  bottomInset: number;
  activeSessionId: string | null;
}) {
  // Slide da esquerda (mesmo padrão do CallsDrawer no LiveVoice)
  const slideX = React.useRef(new Animated.Value(-drawerWidth)).current;
  const fade   = React.useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(slideX, { toValue: 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fade,   { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideX, { toValue: -drawerWidth, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fade,   { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [isOpen, drawerWidth, slideX, fade]);

  if (!mounted) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}
    >
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.28)', opacity: fade }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={{
          position: 'absolute',
          top: 0, bottom: 0, left: 0,
          width: drawerWidth,
          backgroundColor: '#FFFFFF',
          paddingTop: topInset + 8,
          paddingBottom: bottomInset + 8,
          transform: [{ translateX: slideX }],
          shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.2, shadowRadius: 8,
          elevation: 8,
        }}
      >
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 18, paddingVertical: 14,
          borderBottomWidth: 1, borderBottomColor: 'rgba(22,21,58,0.08)',
        }}>
          <AppText style={{ fontSize: 15, fontWeight: '800', color: C.navy, flex: 1 }}>
            {isPt ? 'Conversas anteriores' : 'Previous conversations'}
          </AppText>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <XCircle size={20} color={C.navyLight} weight="fill" />
          </TouchableOpacity>
        </View>

        {sessions.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 40, paddingHorizontal: 20 }}>
            <AppText style={{ color: C.navyLight, fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
              {isPt ? 'Nenhuma conversa salva ainda.' : 'No saved conversations yet.'}
            </AppText>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {sessions.map(s => (
              <ChatSessionItem
                key={s.id}
                session={s}
                isPt={isPt}
                isActive={s.id === activeSessionId}
                onPress={() => onSelect(s.id)}
                onDelete={() => onDelete(s.id)}
              />
            ))}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

function ChatSessionItem({ session, isPt, isActive, onPress, onDelete }: {
  session: ChatSession; isPt: boolean; isActive: boolean;
  onPress: () => void; onDelete: () => void;
}) {
  const days = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 86_400_000);
  const whenLabel = days === 0 ? (isPt ? 'Hoje' : 'Today')
                  : days === 1 ? (isPt ? 'Ontem' : 'Yesterday')
                  : isPt ? `há ${days} dias` : `${days} days ago`;

  const handleDeletePress = () => {
    Alert.alert(
      isPt ? 'Excluir conversa?' : 'Delete conversation?',
      isPt ? 'Esta ação não pode ser desfeita.' : 'This cannot be undone.',
      [
        { text: isPt ? 'Cancelar' : 'Cancel', style: 'cancel' },
        { text: isPt ? 'Excluir' : 'Delete', style: 'destructive', onPress: onDelete },
      ],
    );
  };

  return (
    <View style={{
      paddingVertical: 14, paddingHorizontal: 4,
      borderBottomWidth: 1, borderBottomColor: 'rgba(22,21,58,0.06)',
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: isActive ? 'rgba(163,255,60,0.10)' : 'transparent',
    }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.6}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <AppText style={{ fontSize: 13, fontWeight: '800', color: C.navy }}>{whenLabel}</AppText>
            <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(22,21,58,0.3)' }} />
            <AppText style={{ fontSize: 12, fontWeight: '600', color: 'rgba(22,21,58,0.55)' }}>
              {session.message_count} {isPt ? 'msg' : 'msg'}
            </AppText>
          </View>
          <AppText
            style={{ fontSize: 13, color: 'rgba(22,21,58,0.7)', lineHeight: 18 }}
            numberOfLines={2}
          >
            {session.summary ?? (isPt ? 'Sem resumo disponível.' : 'No summary available.')}
          </AppText>
        </View>
        <CaretRight size={14} color="rgba(22,21,58,0.3)" weight="bold" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleDeletePress}
        accessibilityLabel={isPt ? 'Excluir esta conversa' : 'Delete this conversation'}
        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
        style={{
          width: 36, height: 36, borderRadius: 18,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Trash size={16} color="rgba(220,38,38,0.7)" weight="regular" />
      </TouchableOpacity>
    </View>
  );
}
