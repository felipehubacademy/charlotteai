/**
 * guided-chat-exercise.tsx — Phase 4 MVP
 *
 * Text-message guided chat loop:
 *   user types → POSTs to /api/guided-chat/turn
 *   → renders user bubble + assistant bubble (text only, no audio).
 *
 * Mirrors roleplay-exercise.tsx with audio loop swapped for text:
 *   - Same scenario banner (amber) + sticky objectives card
 *   - Same timer + Need a hand? floating button
 *   - Same result card with score + Refazer/Voltar
 *   - Same v2 progress save (activity_type='chat')
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, TouchableOpacity, StatusBar, ActivityIndicator,
  KeyboardAvoidingView, Platform, TextInput, Animated,
} from 'react-native';
import { setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';
import { useAudioSessionKeeper } from '@/hooks/useAudioSessionKeeper';
import { usePromotionVideoPrefetch } from '@/hooks/usePromotionVideoPrefetch';
import { setPromotionPending } from '@/lib/promotionState';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, X as XIcon, CheckCircle, Lightbulb, Trophy,
  ArrowsClockwise, PaperPlaneRight,
} from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';

import { AppText } from '@/components/ui/Text';
import ChatBox, { Message } from '@/components/chat/ChatBox';
import { useAuth } from '@/hooks/useAuth';
import { getModule, listModules } from '@/lib/curriculum-v2/loader';
import type { Level as V2Level, GuidedChat } from '@/lib/curriculum-v2/types';
import { useLearnProgressV2 } from '@/hooks/useLearnProgressV2';
import { soundEngine } from '@/lib/soundEngine';

const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

// Guided Chat tem time budget próprio (mais generoso que role-play voz).
const GUIDED_CHAT_BUDGET_SEC: Record<V2Level, number> = {
  Novice:   300,
  Inter:    420,
  Advanced: 600,
};

const C = {
  bg:        '#F4F3FA',
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  greenDark: '#3D8800',
  green:     '#3D8800',
  red:       '#DC2626',
  border:    'rgba(22,21,58,0.08)',
};

export default function GuidedChatExerciseScreen() {
  const params = useLocalSearchParams<{
    level?: string; moduleId?: string; unitId?: string;
  }>();
  const level    = (params.level ?? 'Novice') as V2Level;
  const moduleId = params.moduleId ?? '';
  const unitId   = params.unitId ?? '';

  const { profile } = useAuth();
  const userId      = profile?.id;
  const isPt        = level === 'Novice';
  const insets      = useSafeAreaInsets();

  // Load guided-chat definition from v2
  const [gc, setGc] = useState<GuidedChat | null>(null);
  const [unitTitle, setUnitTitle] = useState<string>('');
  useEffect(() => {
    const m = getModule(level, moduleId);
    if (!m) { router.back(); return; }
    const u = m.units.find(x => x.id === unitId);
    if (!u) { router.back(); return; }
    setGc(u.guided_chat);
    setUnitTitle(u.title);
  }, [level, moduleId, unitId]);

  // Silent loop mantem AVAudioSession ativa pra Spotify nao voltar.
  useAudioSessionKeeper();

  // Pre-fetch do video de promocao se essa for a ultima atividade do
  // ultimo modulo do nivel (promocao iminente). Quando dispara, video
  // ja esta em disco — modal carrega instantaneo.
  const NEXT_LEVEL: Record<string, string | null> = {
    Novice: 'Inter', Inter: 'Advanced', Advanced: null,
  };
  const isLastUnitOfLastModule = (() => {
    const mods = listModules(level as any);
    if (!mods.length) return false;
    const lastMod = mods[mods.length - 1];
    const lastUnit = lastMod?.units[lastMod.units.length - 1];
    return moduleId === lastMod?.id && unitId === lastUnit?.id;
  })();
  const nextLevel = NEXT_LEVEL[level];
  usePromotionVideoPrefetch(isLastUnitOfLastModule ? nextLevel : null);

  // Pausar musica externa enquanto chat ativo.
  useEffect(() => {
    (async () => {
      await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix' }).catch(() => {});
      await setIsAudioActiveAsync(true).catch(() => {});
    })();
    return () => {
      (async () => {
        await setIsAudioActiveAsync(false).catch(() => {});
        await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
      })();
    };
  }, []);

  // Chat state
  const [messages, setMessages]               = useState<Message[]>([]);
  const [draft,    setDraft]                  = useState('');
  const [isProcessing, setIsProcessing]       = useState(false);
  const [objectivesMet, setObjectivesMet]       = useState<Set<number>>(new Set());
  const [sessionComplete, setSessionComplete]   = useState(false);
  const [lastFiredObjective, setLastFiredObjective] = useState<number | null>(null);
  const checkPulse = useRef(new Animated.Value(1)).current;

  // Pulse animation no check que acabou de bater
  useEffect(() => {
    if (lastFiredObjective === null) return;
    checkPulse.setValue(0.4);
    Animated.spring(checkPulse, {
      toValue: 1, friction: 3, tension: 80, useNativeDriver: true,
    }).start();
    const t = setTimeout(() => setLastFiredObjective(null), 800);
    return () => clearTimeout(t);
  }, [lastFiredObjective]); // eslint-disable-line react-hooks/exhaustive-deps
  // Scripted scaffold: id da ultima npc_line tocada que ainda espera resposta
  const [activeNpcLineId, setActiveNpcLineId] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed]             = useState(0);
  const [hintVisible, setHintVisible]         = useState<string | null>(null);
  const [remainingSec, setRemainingSec]       = useState<number>(0);
  const startTimeRef  = useRef<number>(0);
  const stuckTurnsRef = useRef(0);

  const v2Progress = useLearnProgressV2(userId, level);
  const historyRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  // Opening message + start timer (no TTS — apenas pusha a bubble de texto)
  const openedRef = useRef(false);
  useEffect(() => {
    if (!gc || openedRef.current) return;
    openedRef.current = true;
    const id = `assist_${Date.now()}`;
    const openerText = gc.scripted
      ? (gc.scripted?.npc_lines?.[(gc.scripted?.flow?.start ?? '')]?.text ?? gc.opening_message)
      : gc.opening_message;
    setMessages([{
      id, role: 'assistant', content: openerText,
      messageType: 'text', timestamp: new Date(),
    }]);
    historyRef.current = [{ role: 'assistant', content: openerText }];
    if (gc.scripted) setActiveNpcLineId(gc.scripted?.flow?.start ?? null);
    startTimeRef.current = Date.now();
    setRemainingSec(GUIDED_CHAT_BUDGET_SEC[level] ?? 300);
  }, [gc, level]);

  // Timer countdown
  useEffect(() => {
    if (!gc || sessionComplete) return;
    const budget = GUIDED_CHAT_BUDGET_SEC[level] ?? 300;
    const tick = setInterval(() => {
      const elapsed   = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, budget - elapsed);
      setRemainingSec(remaining);
      if (remaining === 0) {
        setSessionComplete(true);
        clearInterval(tick);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [gc, level, sessionComplete]);

  // Save attempt to learn_history_v2 on completion
  const savedRef = useRef(false);
  useEffect(() => {
    if (!sessionComplete || savedRef.current || !gc) return;
    savedRef.current = true;
    const total = gc.objectives.length || 1;
    const score = Math.round((objectivesMet.size / total) * 100);
    v2Progress.saveAttempt(moduleId, unitId, 'chat', score)
      .catch(e => console.warn('[guided-chat] saveAttempt failed', e));
  }, [sessionComplete, gc, objectivesMet, moduleId, unitId, v2Progress]);

  // Restart session (Refazer button)
  const restartSession = useCallback(() => {
    if (!gc) return;
    setObjectivesMet(new Set());
    setSessionComplete(false);
    setHintsUsed(0);
    setHintVisible(null);
    setDraft('');
    savedRef.current = false;
    stuckTurnsRef.current = 0;
    const id = `assist_${Date.now()}`;
    const openerText = gc.scripted
      ? (gc.scripted?.npc_lines?.[(gc.scripted?.flow?.start ?? '')]?.text ?? gc.opening_message)
      : gc.opening_message;
    setMessages([{
      id, role: 'assistant', content: openerText,
      messageType: 'text', timestamp: new Date(),
    }]);
    historyRef.current = [{ role: 'assistant', content: openerText }];
    if (gc.scripted) setActiveNpcLineId(gc.scripted?.flow?.start ?? null);
    startTimeRef.current = Date.now();
    setRemainingSec(GUIDED_CHAT_BUDGET_SEC[level] ?? 300);
  }, [gc, level]);

  // Need a hand? hint (Novice/Inter only)
  const showHint = useCallback(() => {
    if (!gc || level === 'Advanced' || sessionComplete) return;
    const pending = gc.objectives.find(o => !objectivesMet.has(o.id));
    if (!pending) return;
    const hint = isPt ? (pending.hint_pt ?? pending.label_pt) : (pending.hint_en ?? pending.label_en);
    setHintVisible(hint);
    setHintsUsed(prev => prev + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setHintVisible(null), 6000);
  }, [gc, level, sessionComplete, objectivesMet, isPt]);

  // Send text message
  const sendMessage = useCallback(async () => {
    const text = draft.trim();
    if (!text || !gc || isProcessing || sessionComplete) return;
    setDraft('');

    const userMsgId = `user_${Date.now()}`;
    setMessages(prev => [...prev, {
      id: userMsgId, role: 'user', content: text,
      messageType: 'text', timestamp: new Date(),
    }]);

    setIsProcessing(true);
    try {
      // ── MODO SCRIPTED ──────────────────────────────────────────
      // Classifica intent localmente, renderiza npc_line do CDN.
      // Sem chamada de LLM.
      if (gc.scripted) {
        historyRef.current.push({ role: 'user', content: text });

        const { runScriptedTurn } = await import('@/lib/scriptedRunner');
        const out = runScriptedTurn({
          flow:          gc.scripted,
          transcript:    text,
          objectivesMet: new Set(objectivesMet),
          stuckTurns:    stuckTurnsRef.current,
        });

        if (out.newly_met.length > 0) {
          stuckTurnsRef.current = 0;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          soundEngine.play('answer_correct').catch(() => {});
          setLastFiredObjective(out.newly_met[0]);
          setObjectivesMet(prev => {
            const next = new Set(prev);
            for (const n of out.newly_met) next.add(n);
            return next;
          });
        } else {
          stuckTurnsRef.current += 1;
        }

        if (out.next_line_id) {
          const npcLine = gc.scripted?.npc_lines?.[out.next_line_id];
          setActiveNpcLineId(out.next_line_id);
          if (npcLine?.text) {
            const aMsgId = `assist_${Date.now()}`;
            setMessages(prev => [...prev, {
              id: aMsgId, role: 'assistant',
              content: npcLine.text,
              messageType: 'text', timestamp: new Date(),
            }]);
            historyRef.current.push({ role: 'assistant', content: npcLine.text });
          }
        }
        // TODO(fallback LLM): se out.should_fallback_llm, chamar /api/guided-chat/turn como fallback.

        const totalObjS  = gc.objectives.length;
        const willBeMetS = objectivesMet.size + out.newly_met.length;
        if (out.session_complete || willBeMetS >= totalObjS) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(() => setSessionComplete(true), 2500);
        }
        return; // termina branch scripted
      }

      // ── MODO LLM (legado) ──────────────────────────────────────
      const nextPending = gc.objectives.find(o => !objectivesMet.has(o.id));
      const res = await fetch(`${API_BASE_URL}/api/guided-chat/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history:           historyRef.current,
          guided_chat:       gc,
          level,
          user_message:      text,
          unit_title:        unitTitle,
          stuck_turns:       stuckTurnsRef.current,
          next_objective_id: nextPending?.id,
          user_id:           userId,
          user_name:         profile?.name?.split(' ')[0] ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'turn failed');

      historyRef.current.push({ role: 'user', content: text });

      const aMsgId = `assist_${Date.now()}`;
      setMessages(prev => [...prev, {
        id: aMsgId, role: 'assistant',
        content: data.reply ?? '',
        messageType: 'text', timestamp: new Date(),
      }]);
      historyRef.current.push({ role: 'assistant', content: data.reply ?? '' });

      // Tick checklist + haptic; update stuck_turns
      const newOnes = (Array.isArray(data.objectives_met) ? data.objectives_met : [])
        .filter((n: any) => typeof n === 'number' && !objectivesMet.has(n));
      if (newOnes.length > 0) {
        stuckTurnsRef.current = 0;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        soundEngine.play('answer_correct').catch(() => {});
        setLastFiredObjective(newOnes[0]);
        setObjectivesMet(prev => {
          const next = new Set(prev);
          for (const n of newOnes) next.add(n);
          return next;
        });
      } else {
        stuckTurnsRef.current += 1;
      }

      // Encerra se backend marcou OU se já bateu todas as objectives.
      // Não dependemos só do backend — o modelo às vezes esquece de emitir
      // session_complete mesmo com todos os objetivos batidos.
      const totalObj  = gc.objectives.length;
      const willBeMet = objectivesMet.size + newOnes.length;
      if (data.status === 'complete' || willBeMet >= totalObj) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => setSessionComplete(true), 2500);
      }
    } catch (e: any) {
      console.warn('[guided-chat] turn failed', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsProcessing(false);
    }
  }, [draft, gc, isProcessing, sessionComplete, level, unitTitle, userId, objectivesMet]);

  if (!gc) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.navy} />
      </SafeAreaView>
    );
  }

  const objectivesDone    = objectivesMet.size;
  const objectivesTotal   = gc.objectives.length;
  const timerStr          = `${Math.floor(remainingSec / 60).toString().padStart(2, '0')}:${(remainingSec % 60).toString().padStart(2, '0')}`;
  const timerWarn         = remainingSec > 0 && remainingSec <= 30;
  const showHintBtn       = level !== 'Advanced';
  const allObjectivesDone = objectivesDone === objectivesTotal;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.card} />

      {/* Header: persona + timer */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 16, paddingVertical: 10,
        backgroundColor: C.card,
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ArrowLeft size={22} color={C.navy} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <AppText style={{ fontSize: 15, fontWeight: '700', color: C.navy }}>
            {gc.persona}
          </AppText>
          <AppText style={{ fontSize: 11, color: C.navyLight, marginTop: 1, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: '600' }}>
            {isPt ? 'Chat Guiado' : 'Guided Chat'}
          </AppText>
        </View>
        <View style={{
          backgroundColor: timerWarn ? 'rgba(220,38,38,0.10)' : 'rgba(22,21,58,0.06)',
          paddingHorizontal: 10, paddingVertical: 5,
          borderRadius: 10, minWidth: 56, alignItems: 'center',
        }}>
          <AppText style={{
            fontSize: 13, fontWeight: '700',
            color: timerWarn ? C.red : C.navy,
            ...(Platform.OS === 'ios' ? { fontVariant: ['tabular-nums'] } : { fontFamily: 'monospace' }),
          }}>
            {timerStr}
          </AppText>
        </View>
      </View>

      {/* Sticky checklist */}
      <View style={{
        marginHorizontal: 14, marginTop: 6, marginBottom: 10,
        padding: 14, borderRadius: 14,
        backgroundColor: 'rgba(22,21,58,0.04)',
        borderWidth: 1, borderColor: C.border,
      }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 10,
        }}>
          <AppText style={{
            fontSize: 10, fontWeight: '700', color: C.navyLight,
            letterSpacing: 1.2, textTransform: 'uppercase',
          }}>
            {isPt ? 'Sua missão' : 'Your mission'}
          </AppText>
          <AppText style={{
            fontSize: 11, fontWeight: '700',
            color: allObjectivesDone ? C.greenDark : C.navyMid,
          }}>
            {objectivesDone}/{objectivesTotal}
          </AppText>
        </View>
        <View style={{ gap: 8 }}>
          {gc.objectives.map(obj => {
            const met     = objectivesMet.has(obj.id);
            const label   = isPt ? obj.label_pt : (obj.label_en || obj.label_pt);
            const pulsing = met && lastFiredObjective === obj.id;
            return (
              <View key={obj.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {met
                  ? (
                    <Animated.View style={{ transform: [{ scale: pulsing ? checkPulse : 1 }] }}>
                      <CheckCircle size={18} color={C.greenDark} weight="fill" />
                    </Animated.View>
                  )
                  : <View style={{
                      width: 16, height: 16, borderRadius: 8,
                      borderWidth: 1.5, borderColor: C.navyLight, marginHorizontal: 1,
                    }} />}
                <AppText style={{
                  flex: 1, fontSize: 13,
                  color: met ? C.navyMid : C.navy,
                  fontWeight: met ? '500' : '600',
                  textDecorationLine: met ? 'line-through' : 'none',
                }}>
                  {label}
                </AppText>
              </View>
            );
          })}
        </View>
      </View>

      {/* ChatBox with scenario as scrolling top banner */}
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ChatBox
          messages={messages}
          transcript=""
          finalTranscript=""
          isProcessingMessage={isProcessing}
          isProcessingAudio={false}
          userLevel={level}
          mode="chat"
          topBanner={
            <View style={{
              alignSelf: 'center',
              maxWidth: '82%',
              marginBottom: 12, padding: 12, borderRadius: 14,
              backgroundColor: 'rgba(217,119,6,0.10)',
              borderWidth: 1, borderColor: 'rgba(217,119,6,0.30)',
            }}>
              <AppText style={{
                fontSize: 10, fontWeight: '700', color: '#B45309',
                letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6,
              }}>
                {isPt ? 'Cenário' : 'Scenario'}
              </AppText>
              <AppText style={{
                fontSize: 13, color: '#92400E', lineHeight: 18,
              }}>
                {(isPt ? gc.intro_pt : gc.intro_en) ?? gc.scenario}
              </AppText>
            </View>
          }
        />

      </View>

      {/* ── Scaffold INLINE acima do input (sempre visivel, sem clique).
          Removidos botao Lightbulb + popup hint (redundantes). */}
      {!sessionComplete && !isProcessing && level !== 'Advanced' && (() => {
        // Gradiente por nivel:
        // - Novice: label PT + "Por exemplo: hint_en"
        // - Inter:  label_en do objetivo (sem hint, sem exemplo)
        // - Advanced: scaffold escondido (gate acima)
        let en: string | undefined;
        let pt: string | undefined;
        let interLabel: string | undefined;
        if (gc.scripted && activeNpcLineId) {
          const exp = gc.scripted?.npc_lines?.[activeNpcLineId]?.expected_student_response;
          en = exp?.en;
          pt = exp?.pt_hint;
        } else {
          const pending = gc.objectives.find(o => !objectivesMet.has(o.id));
          en = pending?.hint_en;
          pt = pending?.label_pt;
          interLabel = pending?.label_en;
        }
        if (level === 'Inter') {
          if (!interLabel) return null;
          return (
            <View style={{
              marginHorizontal: 12, marginBottom: 6,
              backgroundColor: C.navy, borderRadius: 12, padding: 14,
              flexDirection: 'row', gap: 10, alignItems: 'flex-start',
            }}>
              <Lightbulb size={18} color="#FFD27A" weight="fill" />
              <AppText style={{ flex: 1, color: '#FFF', fontSize: 14, fontWeight: '600', lineHeight: 18 }}>
                {interLabel}
              </AppText>
            </View>
          );
        }
        if (!en) return null;
        return (
          <View style={{
            marginHorizontal: 12, marginBottom: 6,
            backgroundColor: C.navy, borderRadius: 12, padding: 14,
            flexDirection: 'row', gap: 10, alignItems: 'flex-start',
          }}>
            <Lightbulb size={18} color="#FFD27A" weight="fill" />
            <View style={{ flex: 1 }}>
              {isPt && pt && (
                <AppText style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 16, marginBottom: 4 }}>
                  {pt}
                </AppText>
              )}
              <AppText style={{ color: '#FFF', fontSize: 15, fontWeight: '700', lineHeight: 20 }}>
                <AppText style={{ color: 'rgba(255,255,255,0.55)', fontWeight: '500' }}>
                  {isPt ? 'Por exemplo: ' : 'For example: '}
                </AppText>
                {en}
              </AppText>
            </View>
          </View>
        );
      })()}

      {/* Text input + send */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{
          paddingHorizontal: 12, paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 14),
          backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border,
          flexDirection: 'row', alignItems: 'flex-end', gap: 8,
        }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={sessionComplete
              ? (isPt ? 'Missão concluída!' : 'Mission complete!')
              : (isPt ? 'Escreva sua mensagem...' : 'Type your message...')}
            placeholderTextColor={C.navyLight}
            editable={!sessionComplete && !isProcessing}
            multiline
            style={{
              flex: 1,
              minHeight: 44, maxHeight: 120,
              paddingHorizontal: 14, paddingVertical: 10,
              borderRadius: 22,
              backgroundColor: 'rgba(22,21,58,0.05)',
              color: C.navy, fontSize: 15, lineHeight: 20,
            }}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!draft.trim() || isProcessing || sessionComplete}
            style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: (!draft.trim() || isProcessing || sessionComplete)
                ? 'rgba(22,21,58,0.15)'
                : C.green,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <PaperPlaneRight size={20}
              color={(!draft.trim() || isProcessing || sessionComplete) ? C.navyLight : '#FFF'}
              weight="fill"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Result card overlay */}
      {sessionComplete && (
        <View style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
          backgroundColor: 'rgba(22,21,58,0.55)',
          alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <View style={{
            backgroundColor: C.card, borderRadius: 20, padding: 24,
            width: '100%', maxWidth: 400, alignItems: 'center',
            shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 }, elevation: 10,
          }}>
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: allObjectivesDone ? 'rgba(61,136,0,0.12)' : 'rgba(217,119,6,0.12)',
              alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}>
              <Trophy size={32} color={allObjectivesDone ? C.greenDark : '#B45309'} weight="fill" />
            </View>
            <AppText style={{ fontSize: 20, fontWeight: '800', color: C.navy, marginBottom: 4 }}>
              {allObjectivesDone
                ? (isPt ? 'Missão concluída!' : 'Mission complete!')
                : (isPt ? 'Tempo esgotado' : 'Time up')}
            </AppText>
            <AppText style={{ fontSize: 13, color: C.navyMid, marginBottom: 20, textAlign: 'center' }}>
              {allObjectivesDone
                ? (isPt ? 'Você bateu todos os objetivos.' : 'You hit all objectives.')
                : (isPt ? `Você bateu ${objectivesDone} de ${objectivesTotal}.` : `You hit ${objectivesDone} of ${objectivesTotal}.`)}
            </AppText>

            <View style={{ width: '100%', gap: 8, marginBottom: 16 }}>
              {gc.objectives.map(obj => {
                const met = objectivesMet.has(obj.id);
                const label = isPt ? obj.label_pt : (obj.label_en || obj.label_pt);
                return (
                  <View key={obj.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {met
                      ? <CheckCircle size={18} color={C.greenDark} weight="fill" />
                      : <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: C.navyLight, marginHorizontal: 1 }} />}
                    <AppText style={{ flex: 1, fontSize: 13, color: met ? C.navyMid : C.navy }}>
                      {label}
                    </AppText>
                  </View>
                );
              })}
            </View>

            {/* Recap PT/EN do JSON, quando completo */}
            {allObjectivesDone && (isPt ? gc.recap_pt : gc.recap_en) && (
              <View style={{
                width: '100%',
                padding: 12, borderRadius: 12, marginBottom: 16,
                backgroundColor: 'rgba(61,136,0,0.08)',
                borderWidth: 1, borderColor: 'rgba(61,136,0,0.20)',
              }}>
                <AppText style={{ fontSize: 13, color: C.navy, lineHeight: 18 }}>
                  {isPt ? gc.recap_pt : gc.recap_en}
                </AppText>
              </View>
            )}

            <View style={{
              flexDirection: 'row', justifyContent: 'space-around',
              width: '100%', paddingVertical: 12,
              borderTopWidth: 1, borderTopColor: C.border,
              borderBottomWidth: 1, borderBottomColor: C.border,
              marginBottom: 20,
            }}>
              <View style={{ alignItems: 'center' }}>
                <AppText style={{ fontSize: 18, fontWeight: '800', color: C.navy }}>
                  {Math.floor(((GUIDED_CHAT_BUDGET_SEC[level] ?? 300) - remainingSec) / 60)}:{(((GUIDED_CHAT_BUDGET_SEC[level] ?? 300) - remainingSec) % 60).toString().padStart(2, '0')}
                </AppText>
                <AppText style={{ fontSize: 10, fontWeight: '600', color: C.navyLight, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  {isPt ? 'Tempo' : 'Time'}
                </AppText>
              </View>
              <View style={{ alignItems: 'center' }}>
                <AppText style={{ fontSize: 18, fontWeight: '800', color: allObjectivesDone ? C.greenDark : '#B45309' }}>
                  {Math.round((objectivesDone / objectivesTotal) * 100)}%
                </AppText>
                <AppText style={{ fontSize: 10, fontWeight: '600', color: C.navyLight, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  {isPt ? 'Score' : 'Score'}
                </AppText>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity
                onPress={restartSession}
                style={{
                  flex: 1, paddingVertical: 14, borderRadius: 14,
                  backgroundColor: 'rgba(22,21,58,0.06)',
                  alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
                }}
              >
                <ArrowsClockwise size={18} color={C.navy} weight="bold" />
                <AppText style={{ fontSize: 14, fontWeight: '700', color: C.navy }}>
                  {isPt ? 'Refazer' : 'Try again'}
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  // Chat eh ULTIMA activity da unit. Se passou:
                  //   - tem proxima unit no mesmo modulo → grammar dela
                  //   - eh ultima unit do modulo → grammar do M(n+1) N01
                  //   - eh ultima unit do ultimo modulo → home (com spinner
                  //     pra cobrir o gap ate o PromotionModal aparecer)
                  if (!allObjectivesDone) { router.back(); return; }
                  const allMods = listModules(level as any);
                  const modIdx  = allMods.findIndex(m => m.id === moduleId);
                  const currMod = allMods[modIdx];
                  if (!currMod) { router.replace('/(app)/(tabs)' as any); return; }
                  const unitIdx = currMod.units.findIndex(u => u.id === unitId);
                  // Proxima unit no mesmo modulo
                  if (unitIdx >= 0 && unitIdx < currMod.units.length - 1) {
                    const nextUnit = currMod.units[unitIdx + 1];
                    router.replace({
                      pathname: '/(app)/learn-session',
                      params: { v: 'v2', level, moduleId, unitId: nextUnit.id, activity: 'grammar' } as any,
                    });
                    return;
                  }
                  // Ultima unit → proximo modulo
                  if (modIdx >= 0 && modIdx < allMods.length - 1) {
                    const nextMod = allMods[modIdx + 1];
                    const firstUnit = nextMod.units[0];
                    if (firstUnit) {
                      router.replace({
                        pathname: '/(app)/learn-session',
                        params: { v: 'v2', level, moduleId: nextMod.id, unitId: firstUnit.id, activity: 'grammar' } as any,
                      });
                      return;
                    }
                  }
                  // Sem proximo (= ultima unit do ultimo modulo = promocao
                  // iminente). Seta flag global ANTES de navegar — home
                  // ja renderiza overlay assim que monta. Sem setTimeout
                  // intermediario que causava transicao visivel (tab bar
                  // pop-in quando guided-chat desmontava). Navega
                  // imediato — overlay module-level persiste atraves
                  // do unmount/mount.
                  setPromotionPending(true);
                  router.replace('/(app)/(tabs)' as any);
                }}
                style={{
                  flex: 1, paddingVertical: 14, borderRadius: 14,
                  backgroundColor: C.green,
                  alignItems: 'center',
                }}
              >
                <AppText style={{ fontSize: 14, fontWeight: '700', color: '#FFF' }}>
                  {allObjectivesDone ? (isPt ? 'Continuar' : 'Continue') : (isPt ? 'Voltar' : 'Back')}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}
