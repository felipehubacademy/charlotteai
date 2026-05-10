// app/(app)/(tabs)/practice.tsx
// Practice tab unificada — 3 modos (chat / grammar / pronunciation) com toggle
// pill no topo. Substitui o trail antigo + as 3 rotas separadas
// (/grammar, /pronunciation, /chat) que viraram redirects.

import React, { useCallback, useState, useMemo, useEffect } from 'react';
import {
  Alert, View, TouchableOpacity, KeyboardAvoidingView, Platform, Modal,
  Pressable, Animated, Easing, ScrollView, Dimensions,
} from 'react-native';
import { Question, X, ClockCounterClockwise, XCircle, CaretRight, Trash } from 'phosphor-react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { HeaderPills } from '@/components/ui/HeaderPills';
import { AppText } from '@/components/ui/Text';
import ChatBox from '@/components/chat/ChatBox';
import ChatInputBar from '@/components/chat/ChatInputBar';
import AchievementNotification from '@/components/achievements/AchievementNotification';
import { useChat } from '@/hooks/useChat';
import { useMessageAudioPlayer } from '@/hooks/useMessageAudioPlayer';
import { usePaywallContext } from '@/lib/paywallContext';
import { Achievement } from '@/lib/types/achievement';
import { UserLevel } from '@/lib/levelConfig';
import { supabase } from '@/lib/supabase';

type Mode = 'chat' | 'grammar' | 'pronunciation';

const MODES: { id: Mode; labelPt: string; labelEn: string }[] = [
  { id: 'chat',          labelPt: 'Free Chat',     labelEn: 'Free Chat' },
  { id: 'grammar',       labelPt: 'Gramática',     labelEn: 'Grammar' },
  { id: 'pronunciation', labelPt: 'Pronúncia',     labelEn: 'Pronunciation' },
];

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
    sendTextMessage, sendAudioMessage, sendSilentMessage,
    activeSessionId, closeSession, loadSession,
  } = useChat({ userLevel, userName, userId, mode });

  const { playingMessageId, toggle } = useMessageAudioPlayer();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [recentSessions, setRecentSessions] = useState<ChatSession[]>([]);
  const insets = useSafeAreaInsets();
  const screenW = Dimensions.get('window').width;
  const drawerW = Math.round(screenW * 0.82);

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

  // Trocar de modo:
  // - chat → outro: encerra session (vai pro histórico) + limpa state
  // - outro → outro: só troca (state local zera via effect do useChat)
  const handleModeSwitch = useCallback(async (newMode: Mode) => {
    if (newMode === mode) return;

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
        streak={0}
        totalXP={totalXP}
        rank={null}
        statsParams={statsParams}
        isPt={isPt}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
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
              return (
                <TouchableOpacity
                  key={m.id}
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
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Botões flutuantes top-right: histórico (chat only) + ajuda ── */}
        <View style={{
          position: 'absolute',
          top: 18, right: 16,
          flexDirection: 'row', gap: 8,
          zIndex: 5,
        }}>
          {mode === 'chat' && (
            <TouchableOpacity
              onPress={() => setShowHistory(true)}
              style={{
                width: 34, height: 34, borderRadius: 17,
                backgroundColor: '#FFFFFF',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: C.border,
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={isPt ? 'Histórico de conversas' : 'Conversation history'}
            >
              <ClockCounterClockwise size={17} color={C.navyMid} weight="regular" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setShowHelp(true)}
            style={{
              width: 34, height: 34, borderRadius: 17,
              backgroundColor: '#FFFFFF',
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: C.border,
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={isPt ? 'Ajuda' : 'Help'}
          >
            <Question size={17} color={C.navyMid} weight="regular" />
          </TouchableOpacity>
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
            mode={mode === 'grammar' ? 'grammar' : undefined}
            onPlayAudio={toggle}
            playingMessageId={playingMessageId}
            onExplainMore={mode === 'grammar' ? handleExplainMore : undefined}
          />
        </View>

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

      {/* ── Drawer de histórico (Free Chat only) ── */}
      <ChatSessionsDrawer
        sessions={recentSessions}
        isOpen={showHistory}
        isPt={isPt}
        drawerWidth={drawerW}
        topInset={insets.top}
        bottomInset={insets.bottom}
        activeSessionId={activeSessionId}
        onClose={() => setShowHistory(false)}
        onSelect={handleLoadSession}
        onDelete={handleDeleteSession}
      />
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
  const slideX = React.useRef(new Animated.Value(drawerWidth)).current;
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
        Animated.timing(slideX, { toValue: drawerWidth, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
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
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', opacity: fade }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={{
          position: 'absolute',
          top: 0, bottom: 0, right: 0,
          width: drawerWidth,
          backgroundColor: '#FFFFFF',
          paddingTop: topInset + 8,
          paddingBottom: bottomInset + 8,
          transform: [{ translateX: slideX }],
          shadowColor: '#000', shadowOffset: { width: -4, height: 0 }, shadowOpacity: 0.2, shadowRadius: 8,
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
