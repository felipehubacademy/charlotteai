// app/(app)/(tabs)/practice.tsx
// Practice tab unificada — 3 modos (chat / grammar / pronunciation) com toggle
// pill no topo. Substitui o trail antigo + as 3 rotas separadas
// (/grammar, /pronunciation, /chat) que viraram redirects.

import React, { useCallback, useState, useMemo } from 'react';
import {
  Alert, View, TouchableOpacity, KeyboardAvoidingView, Platform, Modal,
  Pressable,
} from 'react-native';
import { Question, X } from 'phosphor-react-native';
import { useLocalSearchParams, router } from 'expo-router';
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
};

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
  } = useChat({ userLevel, userName, userId, mode });

  const { playingMessageId, toggle } = useMessageAudioPlayer();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  // Trocar de modo — limpa conversa, com confirmação se houver mensagens
  const handleModeSwitch = useCallback((newMode: Mode) => {
    if (newMode === mode) return;

    const apply = () => {
      router.setParams({ mode: newMode });
    };

    if (messages.length >= 2) {
      Alert.alert(
        isPt ? 'Trocar de modo?' : 'Switch mode?',
        isPt ? 'A conversa atual será descartada.' : 'The current conversation will be cleared.',
        [
          { text: isPt ? 'Cancelar' : 'Cancel', style: 'cancel' },
          { text: isPt ? 'Trocar' : 'Switch', onPress: apply },
        ],
      );
    } else {
      apply();
    }
  }, [mode, messages.length, isPt]);

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

        {/* ── Botão "?" flutuante topo direito ── */}
        <TouchableOpacity
          onPress={() => setShowHelp(true)}
          style={{
            position: 'absolute',
            top: 18, right: 16,
            width: 34, height: 34, borderRadius: 17,
            backgroundColor: '#FFFFFF',
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: C.border,
            zIndex: 5,
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={isPt ? 'Ajuda' : 'Help'}
        >
          <Question size={17} color={C.navyMid} weight="regular" />
        </TouchableOpacity>

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
                  ? 'Use o seletor no topo. A conversa atual é descartada ao trocar.'
                  : 'Use the selector at the top. The current conversation is cleared when you switch.'}
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
