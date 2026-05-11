// app/(app)/(tabs)/livevoice.tsx
// Live Voice tab — hero com video da Charlotte + ring de pool mensal +
// resumo da última chamada + botão Start now. Beta only (new_layout).

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View, ScrollView, TouchableOpacity, ActivityIndicator, Image,
  RefreshControl, Modal, Pressable, Dimensions, Animated, Easing, Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useFocusEffect } from 'expo-router';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Phone, XCircle, ClockCounterClockwise, CaretRight, Trash, Question, X } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { HeaderPills } from '@/components/ui/HeaderPills';
import { useTour } from '@/lib/tourContext';
import { useAuth } from '@/hooks/useAuth';
import { usePaywallContext } from '@/lib/paywallContext';
import { supabase } from '@/lib/supabase';
import { UserLevel } from '@/lib/levelConfig';
import { getLiveVoiceStatus, getPoolForLevel, UNLIMITED_POOL_SECONDS } from '@/lib/liveVoiceUsage';
import { localTodayStr, localMidnightUTC } from '@/lib/dateUtils';
import { soundEngine } from '@/lib/soundEngine';
import LiveVoiceModal from '@/components/voice/LiveVoiceModal';

// ── Palette ───────────────────────────────────────────────────────────────────
// Tela full navy — todos os elementos em stack sobre o mesmo fundo.

// TESTE — bg claro mesmo do Goals (#F7F6FD) com elementos escuros.
// Nomes textWhite/textMuted/textDim mantidos pra evitar refactor massivo,
// mas os VALORES agora são escuros (legado naming).
const C = {
  stage:       '#FAF9FF',  // lavanda muito claro
  panel:       '#FFFFFF',
  navyMid:     '#3B3A5A',
  navyLight:   'rgba(22,21,58,0.55)',
  navyGhost:   'rgba(22,21,58,0.08)',
  textWhite:   '#16153A',  // legado: agora é texto primário escuro
  textMuted:   '#4B4A72',
  textDim:     '#9896B8',
  greenAccent: '#A3FF3C',
  greenDark:   '#3D8800',
  gold:        '#D97706',
  red:         '#DC2626',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface LastCall {
  id:               string;
  started_at:       string;
  duration_seconds: number;
  summary:          string | null;
  transcript:       string | null;
}

// ── Helpers de label ──────────────────────────────────────────────────────────

function poolStatusLabel(
  isPt: boolean, isLimitReached: boolean, isUnlimited: boolean,
  used: number, total: number,
): string {
  if (isLimitReached) return isPt ? 'Limite mensal atingido' : 'Monthly limit reached';
  if (isUnlimited) return isPt ? 'Charlotte disponível · ilimitado' : 'Charlotte available · unlimited';
  const remainMin = Math.max(0, Math.floor((total - used) / 60));
  return isPt
    ? `Charlotte disponível · ${remainMin} min restantes`
    : `Charlotte available · ${remainMin} min left`;
}

function formatCallMeta(call: { started_at: string; duration_seconds: number }, isPt: boolean): string {
  const days = Math.floor((Date.now() - new Date(call.started_at).getTime()) / 86_400_000);
  const minutes = Math.round(call.duration_seconds / 60);
  const whenLabel = days === 0 ? (isPt ? 'Hoje' : 'Today')
                  : days === 1 ? (isPt ? 'Ontem' : 'Yesterday')
                  : isPt ? `há ${days} dias` : `${days} days ago`;
  return `${whenLabel} · ${minutes} min`;
}

// ── Pool ring ─────────────────────────────────────────────────────────────────
// Versão dark: ring fino branco com progresso colorido, número grande no centro.

function PoolRing({ used, total, isUnlimited, isPt }: {
  used: number; total: number; isUnlimited: boolean; isPt: boolean;
}) {
  const SIZE = 130, SW = 6;
  const r    = (SIZE - SW) / 2;
  const circ = 2 * Math.PI * r;

  const ratio = isUnlimited ? 0 : Math.min(used / total, 1);
  const color = isUnlimited
    ? C.greenAccent
    : ratio >= 0.85 ? C.red
    : ratio >= 0.6  ? C.gold
                    : C.greenAccent;

  const usedMin  = Math.floor(used / 60);
  const totalMin = Math.floor(total / 60);
  const remainMin = totalMin - usedMin;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: SIZE, width: SIZE }}>
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={SIZE/2} cy={SIZE/2} r={r} stroke={C.navyGhost} strokeWidth={SW} fill="none" />
        {!isUnlimited && (
          <Circle
            cx={SIZE/2} cy={SIZE/2} r={r}
            stroke={color} strokeWidth={SW} fill="none"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - ratio)}
            strokeLinecap="round"
          />
        )}
      </Svg>
      <View style={{ alignItems: 'center' }}>
        {isUnlimited ? (
          <>
            <AppText style={{ fontSize: 28, fontWeight: '900', color: C.greenAccent }}>∞</AppText>
            <AppText style={{ fontSize: 10, color: C.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
              {isPt ? 'Ilimitado' : 'Unlimited'}
            </AppText>
          </>
        ) : (
          <>
            <AppText style={{ fontSize: 30, fontWeight: '900', color: C.textWhite, lineHeight: 34 }}>{remainMin}</AppText>
            <AppText style={{ fontSize: 10, color: C.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
              {isPt ? 'min restantes' : 'min remaining'}
            </AppText>
          </>
        )}
      </View>
    </View>
  );
}

// ── Item da lista do drawer ───────────────────────────────────────────────────
// Card clicável (abre transcrição) + botão lixeira separado (com confirmação).

function CallListItem({ call, isPt, onPress, onDelete }: {
  call: LastCall; isPt: boolean; onPress: () => void; onDelete: () => void;
}) {
  const days = Math.floor((Date.now() - new Date(call.started_at).getTime()) / 86_400_000);
  const minutes = Math.round(call.duration_seconds / 60);
  const hasTranscript = !!(call.transcript && call.transcript.trim().length > 0);

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
    }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={hasTranscript ? 0.6 : 1}
        disabled={!hasTranscript}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <AppText style={{ fontSize: 13, fontWeight: '800', color: '#16153A' }}>{whenLabel}</AppText>
            <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(22,21,58,0.3)' }} />
            <AppText style={{ fontSize: 12, fontWeight: '600', color: 'rgba(22,21,58,0.55)' }}>{minutes} min</AppText>
          </View>
          <AppText
            style={{ fontSize: 13, color: 'rgba(22,21,58,0.7)', lineHeight: 18 }}
            numberOfLines={2}
          >
            {call.summary ?? (isPt ? 'Sem resumo disponível.' : 'No summary available.')}
          </AppText>
        </View>
        {hasTranscript && <CaretRight size={14} color="rgba(22,21,58,0.3)" weight="bold" />}
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

// ── Drawer lateral (in-screen, não cobre HeaderPills nem tab bar) ─────────────
// Posicionado absoluto dentro do content area, com slide animation translateX.

function CallsDrawer({ calls, isOpen, onClose, onSelectCall, onDeleteCall, isPt, drawerWidth }: {
  calls: LastCall[]; isOpen: boolean; onClose: () => void;
  onSelectCall: (call: LastCall) => void;
  onDeleteCall: (callId: string) => void;
  isPt: boolean; drawerWidth: number;
}) {
  const slideX = React.useRef(new Animated.Value(-drawerWidth)).current;
  const fade   = React.useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = React.useState(isOpen);

  React.useEffect(() => {
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
      {/* Backdrop dim — atrás do drawer */}
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.28)', opacity: fade }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      {/* Drawer panel — slide from left */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0, bottom: 0, left: 0,
          width: drawerWidth,
          backgroundColor: '#FFFFFF',
          transform: [{ translateX: slideX }],
          shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.2, shadowRadius: 8,
          elevation: 8,
        }}
      >
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 18, paddingVertical: 14,
          borderBottomWidth: 1, borderBottomColor: 'rgba(22,21,58,0.08)',
        }}>
          <AppText style={{ fontSize: 15, fontWeight: '800', color: '#16153A', flex: 1 }}>
            {isPt ? 'Conversas anteriores' : 'Previous conversations'}
          </AppText>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <XCircle size={20} color="rgba(22,21,58,0.3)" weight="fill" />
          </TouchableOpacity>
        </View>

        {/* Lista */}
        {calls.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 40, paddingHorizontal: 20 }}>
            <AppText style={{ color: '#9896B8', fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
              {isPt ? 'Você ainda não fez nenhuma chamada.' : 'No calls yet.'}
            </AppText>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {calls.map(call => (
              <CallListItem
                key={call.id}
                call={call}
                isPt={isPt}
                onPress={() => onSelectCall(call)}
                onDelete={() => onDeleteCall(call.id)}
              />
            ))}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

// ── Transcript bottom sheet ───────────────────────────────────────────────────
// Mesmo padrão do "Por que errei?" da learn-session: sheet sobe do fundo,
// dim overlay com tap-outside pra fechar. Parse "User: ...\nCharlotte: ..."
// em turnos e renderiza bolhas iMessage.

function TranscriptModal({ call, isOpen, onClose, isPt }: {
  call: LastCall | null; isOpen: boolean; onClose: () => void; isPt: boolean;
}) {
  const insets = useSafeAreaInsets();
  const screenH = Dimensions.get('window').height;
  const sheetMaxH = Math.round(screenH * 0.85);

  const turns = useMemo(() => {
    if (!call?.transcript) return [] as Array<{ role: 'user' | 'assistant'; text: string }>;
    return call.transcript.split('\n').reduce((acc, line) => {
      const m = line.match(/^(User|Charlotte):\s*(.+)$/);
      if (m) {
        acc.push({ role: m[1] === 'User' ? 'user' : 'assistant', text: m[2] });
      } else if (acc.length > 0) {
        // Linha de continuação — append na última
        acc[acc.length - 1].text += '\n' + line;
      }
      return acc;
    }, [] as Array<{ role: 'user' | 'assistant'; text: string }>);
  }, [call?.transcript]);

  if (!call) return null;

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            maxHeight: sheetMaxH,
            paddingBottom: insets.bottom,
          }}
        >
          {/* Handle */}
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(22,21,58,0.15)', alignSelf: 'center', marginTop: 10, marginBottom: 14 }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 }}>
            <AppText style={{ fontSize: 16, fontWeight: '800', color: '#16153A', flex: 1 }}>
              {isPt ? 'Conversa anterior' : 'Previous conversation'}
            </AppText>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <XCircle size={22} color="rgba(22,21,58,0.3)" weight="fill" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ maxHeight: sheetMaxH - 80 - insets.bottom }}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24, gap: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Resumo no topo */}
            {call.summary && (
              <View style={{
                backgroundColor: '#F0F0FB', borderRadius: 12, padding: 14,
                borderLeftWidth: 3, borderLeftColor: '#7C3AED',
                marginBottom: 4,
              }}>
                <AppText style={{ fontSize: 10, fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                  {isPt ? 'Resumo' : 'Summary'}
                </AppText>
                <AppText style={{ fontSize: 14, color: '#16153A', lineHeight: 20 }}>
                  {call.summary}
                </AppText>
              </View>
            )}

            {turns.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 30, paddingHorizontal: 12 }}>
                <AppText style={{ color: '#9896B8', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                  {isPt ? 'Transcrição não disponível para esta chamada.' : 'No transcript available for this call.'}
                </AppText>
              </View>
            ) : (
              turns.map((turn, i) => {
                const isUser = turn.role === 'user';
                return (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                    {!isUser && (
                      <Image
                        source={require('@/assets/charlotte-avatar.png')}
                        style={{ width: 26, height: 26, borderRadius: 13, marginRight: 8, marginTop: 2, flexShrink: 0, backgroundColor: '#16153A' }}
                      />
                    )}
                    <View style={{
                      maxWidth: '78%',
                      backgroundColor: isUser ? '#A3FF3C' : '#F4F3FA',
                      borderRadius: 16,
                      borderBottomRightRadius: isUser ? 4 : 16,
                      borderBottomLeftRadius: isUser ? 16 : 4,
                      paddingHorizontal: 13, paddingVertical: 9,
                    }}>
                      <AppText style={{ fontSize: 14, fontWeight: '500', color: '#16153A', lineHeight: 20 }}>
                        {turn.text}
                      </AppText>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LiveVoiceTab() {
  const { profile }     = useAuth();
  const { openPaywall } = usePaywallContext();
  const level   = (profile?.charlotte_level ?? 'Novice') as UserLevel;
  const userId  = profile?.id ?? '';
  const isPt    = level === 'Novice';
  const accent  = level === 'Novice' ? '#D97706' : level === 'Inter' ? '#7C3AED' : '#0F766E';

  const [streak,  setStreak]  = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [todayXP, setTodayXP] = useState(0);
  const [rank,    setRank]    = useState<number | null>(null);

  const [poolUsed,        setPoolUsed]        = useState(0);
  const [poolTotal,       setPoolTotal]       = useState(getPoolForLevel(level));
  const [poolUnlimited,   setPoolUnlimited]   = useState(false);
  const [recentCalls,     setRecentCalls]     = useState<LastCall[]>([]);
  const [selectedCall,    setSelectedCall]    = useState<LastCall | null>(null);
  const [showCallsDrawer, setShowCallsDrawer] = useState(false);
  const [showLiveVoice,   setShowLiveVoice]   = useState(false);
  const [showTranscript,  setShowTranscript]  = useState(false);
  const [showHelp,        setShowHelp]        = useState(false);

  const { startTour } = useTour();
  const tourCharlotteRef = useRef<View>(null);
  const tourCtaRef       = useRef<any>(null);
  const tourActionsRef   = useRef<View>(null);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);

  const trialDaysLeft = useMemo(() => {
    if (!profile || profile.is_institutional) return null;
    if (profile.subscription_status !== 'trial') return null;
    if (!profile.trial_ends_at) return null;
    const diff = new Date(profile.trial_ends_at).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }, [profile]);

  const liveVoicePlayer = useVideoPlayer(require('@/assets/charlotte-livevoice.mp4'), p => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  // Garante loop sempre ativo quando a tab volta a ficar visível.
  // Sem isso, o player pode ficar pausado após navegação entre tabs.
  useFocusEffect(useCallback(() => {
    liveVoicePlayer.loop = true;
    liveVoicePlayer.play();
  }, [liveVoicePlayer]));

  const loadData = useCallback(async () => {
    if (!userId) return;
    try {
      const todayISO = localMidnightUTC().toISOString();

      const [prog, lv, recent, achToday, recentCallsRes] = await Promise.all([
        supabase.from('charlotte_progress')
          .select('streak_days,total_xp,last_practice_date')
          .eq('user_id', userId)
          .maybeSingle(),
        getLiveVoiceStatus(level).catch(() => null),
        supabase.from('charlotte_practices')
          .select('xp_earned')
          .eq('user_id', userId)
          .gte('created_at', todayISO),
        supabase.from('user_achievements')
          .select('xp_bonus')
          .eq('user_id', userId)
          .gte('earned_at', todayISO),
        supabase.from('charlotte_live_calls')
          .select('id,started_at,duration_seconds,summary,transcript')
          .eq('user_id', userId)
          .order('started_at', { ascending: false })
          .limit(10),
      ]);

      const userTotalXP = prog.data?.total_xp ?? 0;
      const todayXPVal  = (recent.data ?? []).reduce((s: number, p: { xp_earned?: number | null }) => s + (p.xp_earned ?? 0), 0)
        + (achToday.data ?? []).reduce((s: number, x: { xp_bonus?: number | null }) => s + (x.xp_bonus ?? 0), 0);

      const { count: higherCount } = await supabase
        .from('charlotte_leaderboard_cache')
        .select('*', { count: 'exact', head: true })
        .eq('user_level', level)
        .gt('total_xp', userTotalXP);
      const computedRank = (higherCount ?? 0) + 1;

      const todayStr     = localTodayStr();
      const yesterdayStr = (() => {
        const d = new Date(); d.setDate(d.getDate() - 1);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      })();
      const lastPracticeDate = prog.data?.last_practice_date ?? null;
      const streakAlive = lastPracticeDate === todayStr || lastPracticeDate === yesterdayStr;
      const streakDays  = streakAlive ? (prog.data?.streak_days ?? 0) : 0;

      setStreak(streakDays);
      setTotalXP(userTotalXP);
      setTodayXP(todayXPVal);
      setRank(userTotalXP > 0 ? computedRank : null);

      if (lv) {
        setPoolUsed(lv.secondsUsed);
        setPoolTotal(lv.poolTotal);
        setPoolUnlimited(!!lv.isUnlimited);
      }
      setRecentCalls(recentCallsRes?.data ?? []);
    } catch { /* silencioso */ } finally {
      setLoading(false);
    }
  }, [userId, level]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // Auto-fecha drawer/transcript/help ao sair da tab (não persiste ao voltar)
  useFocusEffect(useCallback(() => {
    return () => {
      setShowCallsDrawer(false);
      setShowTranscript(false);
      setShowHelp(false);
    };
  }, []));

  // Tour livevoice-new (1x via SecureStore TOUR_livevoice-new_DONE)
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      startTour('livevoice-new', [
        {
          ref: tourCharlotteRef,
          spotlightRadius: 24,
          title: 'Charlotte tá pronta',
          description: 'Esta é sua tutora ao vivo. Toque no botão Conversar pra iniciar uma chamada de voz real com ela.',
        },
        {
          ref: tourCtaRef,
          spotlightRadius: 18,
          title: 'Conversar com Charlotte',
          description: 'Aqui você começa a chamada. Fale em inglês (ou português, se for Novice) — a Charlotte responde por voz e adapta ao seu nível.',
        },
        {
          ref: tourActionsRef,
          spotlightRadius: 16,
          title: 'Histórico e ajuda',
          description: 'Cada chamada vira um resumo no histórico (relógio). O ícone de ajuda explica como funciona o Live Voice.',
        },
      ], 'pt');
    }, 900);
    return () => clearTimeout(t);
  }, [loading, startTour]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleDeleteCall = useCallback(async (callId: string) => {
    // Otimista: remove da UI imediatamente, depois apaga no DB.
    setRecentCalls(prev => prev.filter(c => c.id !== callId));
    try {
      const { error } = await supabase.from('charlotte_live_calls').delete().eq('id', callId);
      if (error) throw error;
    } catch (err) {
      console.warn('[livevoice] failed to delete call:', err);
      // Fallback: re-fetch pra reconciliar (registro volta se DB rejeitou)
      loadData();
    }
  }, [loadData]);

  const startCall = useCallback(() => {
    if (!poolUnlimited && poolUsed >= poolTotal) return;
    soundEngine.setMuted(true);
    setShowLiveVoice(true);
  }, [poolUnlimited, poolUsed, poolTotal]);

  const isLimitReached = !poolUnlimited && poolUsed >= poolTotal;
  const statsParams = { sessionXP: String(todayXP), totalXP: String(totalXP), userId, userLevel: level, userName: profile?.name ?? 'Student' };

  // Charlotte responsiva — calculada do espaço REAL disponível na tela.
  // Antes (multiplicador fixo 0.55 do screenH) overflowava em telas menores
  // tipo iPhone 13 — Charlotte ficava grande demais e empurrava CTA pra
  // grudar na tab bar.
  const screenW = Dimensions.get('window').width;
  const screenH = Dimensions.get('window').height;
  const isAndroid = Platform.OS === 'android';

  // Altura da tab bar (React Navigation) — usada pra offsetar conteúdo do fundo.
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();

  // Espaço usável = screen - safe areas - HeaderPills (52) - tab bar
  const usableHeight = screenH - insets.top - 52 - tabBarHeight;
  // Espaço fixo dentro da tela: header título(70) + drawer(56) + CTA(84) +
  // min spacer flex(32) + spacer Android extra (16 se Android)
  const RESERVED = 70 + 56 + 84 + 32 + (isAndroid ? 16 : 0);

  // Charlotte: máximo 480, mínimo 280, fit dentro do que sobra
  const charH   = Math.min(480, Math.max(280, usableHeight - RESERVED));
  const charW   = Math.round(charH * 9 / 16);
  const drawerW = Math.round(screenW * 0.82);

  return (
    <View style={{ flex: 1, backgroundColor: C.stage }}>

      <HeaderPills
        streak={streak}
        totalXP={totalXP}
        rank={rank}
        statsParams={statsParams}
        trialDaysLeft={trialDaysLeft}
        onPaywallOpen={openPaywall}
        isPt={isPt}
      />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.textWhite} />
        </View>
      ) : (
        <View style={{ flex: 1, backgroundColor: C.stage, position: 'relative' }}>

          <View style={{ flex: 1 }}>

            {/* ── Header da tela: título + status row ── */}
            <View style={{ paddingHorizontal: 24, paddingTop: 18, paddingBottom: 12 }}>
              <AppText style={{ fontSize: 26, fontWeight: '900', color: C.textWhite, letterSpacing: -0.3 }}>
                Live Voice
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 }}>
                <View style={{
                  width: 8, height: 8, borderRadius: 4,
                  backgroundColor: isLimitReached ? C.red : C.greenDark,
                }} />
                <AppText style={{ fontSize: 13, color: C.textMuted, fontWeight: '500' }}>
                  {poolStatusLabel(isPt, isLimitReached, poolUnlimited, poolUsed, poolTotal)}
                </AppText>
              </View>
            </View>

            {/* Spacer empurra Charlotte pra baixo */}
            <View style={{ flex: 1 }} />

            {/* ── Charlotte centralizada ── */}
            {/* Container 20px mais curto + vídeo deslocado -10 no topo:
                corta 10px do topo E 10px do fundo (artefatos do Veo nas
                duas pontas do frame). */}
            <View ref={tourCharlotteRef} collapsable={false} style={{ alignItems: 'center', marginBottom: 24 }}>
              <View style={{ width: charW, height: charH - 20, overflow: 'hidden' }}>
                <VideoView
                  player={liveVoicePlayer}
                  style={{ width: charW, height: charH, marginTop: -10, backgroundColor: 'transparent' }}
                  contentFit="cover"
                  nativeControls={false}
                />
              </View>
            </View>

            {/* ── Botões drawer + help (sempre visíveis pra estabilidade de layout).
                Drawer mostra empty state quando recentCalls.length === 0. ── */}
            <View ref={tourActionsRef} collapsable={false} style={{
              paddingHorizontal: 24, marginBottom: 12,
              flexDirection: 'row', justifyContent: 'flex-end', gap: 10,
            }}>
              <TouchableOpacity
                onPress={() => setShowCallsDrawer(true)}
                accessibilityLabel={isPt ? 'Ver chamadas anteriores' : 'View previous calls'}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1, borderColor: 'rgba(22,21,58,0.10)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <ClockCounterClockwise size={20} color={C.textMuted} weight="regular" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowHelp(true)}
                accessibilityLabel={isPt ? 'Ajuda' : 'Help'}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1, borderColor: 'rgba(22,21,58,0.10)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Question size={20} color={C.textMuted} weight="regular" />
              </TouchableOpacity>
            </View>

            {/* ── CTA primário: Conversar com Charlotte ── */}
            <TouchableOpacity
              ref={tourCtaRef}
              onPress={startCall}
              disabled={isLimitReached}
              activeOpacity={0.85}
              style={{
                marginHorizontal: 24,
                marginBottom: 24,
                backgroundColor: isLimitReached ? C.navyGhost : accent,
                borderRadius: 16, paddingVertical: 18,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                shadowColor: isLimitReached ? 'transparent' : accent,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4, shadowRadius: 14,
                elevation: 8,
                opacity: isLimitReached ? 0.5 : 1,
              }}
            >
              <Phone size={20} color={isLimitReached ? C.textDim : '#FFFFFF'} weight="fill" />
              <AppText style={{ fontSize: 15, fontWeight: '800', color: isLimitReached ? C.textDim : '#FFFFFF', letterSpacing: 0.3 }}>
                {isLimitReached
                  ? (isPt ? 'Limite atingido' : 'Limit reached')
                  : (isPt ? 'Conversar com Charlotte' : 'Talk with Charlotte')
                }
              </AppText>
            </TouchableOpacity>

          </View>

          {/* Spacer Android pra dar respiro acima da tab bar */}
          {Platform.OS === 'android' && <View style={{ height: 16 }} />}

          {/* Drawer in-screen (absolute dentro do content area, não cobre header/tab) */}
          <CallsDrawer
            calls={recentCalls}
            isOpen={showCallsDrawer}
            isPt={isPt}
            drawerWidth={drawerW}
            onClose={() => setShowCallsDrawer(false)}
            onSelectCall={(call) => {
              setShowCallsDrawer(false);
              setSelectedCall(call);
              setTimeout(() => setShowTranscript(true), 240);
            }}
            onDeleteCall={handleDeleteCall}
          />

        </View>
      )}

      {showLiveVoice && (
        <LiveVoiceModal
          isOpen={showLiveVoice}
          userLevel={level}
          userName={profile?.name ?? 'Student'}
          onClose={() => {
            setShowLiveVoice(false);
            soundEngine.setMuted(false);
            loadData();
          }}
        />
      )}

      <TranscriptModal
        call={selectedCall}
        isOpen={showTranscript}
        isPt={isPt}
        onClose={() => setShowTranscript(false)}
      />

      {/* ── Help modal (bottom sheet) ── */}
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
              <AppText style={{ fontSize: 17, fontWeight: '800', color: C.textWhite, flex: 1 }}>
                {isPt ? 'Como usar o Live Voice' : 'How Live Voice works'}
              </AppText>
              <TouchableOpacity onPress={() => setShowHelp(false)}>
                <X size={20} color={C.textMuted} weight="bold" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 14 }}>
              <LVHelpRow
                title={isPt ? 'Conversa em tempo real' : 'Real-time conversation'}
                desc={isPt
                  ? 'Toque em "Conversar" pra falar com a Charlotte por voz. Ela ouve e responde como uma conversa natural.'
                  : 'Tap "Talk" to chat with Charlotte using your voice. She listens and replies naturally.'}
              />
              {!isPt && (
                <LVHelpRow
                  title="Captions and translation"
                  desc="Captions appear in English as Charlotte speaks. Tap any caption to see the translation."
                />
              )}
              <LVHelpRow
                title={isPt ? 'Histórico de chamadas' : 'Call history'}
                desc={isPt
                  ? 'Cada chamada vira um resumo curto no drawer (ícone de relógio). Toque numa chamada pra ver a transcrição completa.'
                  : 'Each call becomes a short summary in the drawer (clock icon). Tap a call to see the full transcript.'}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}

function LVHelpRow({ title, desc }: { title: string; desc: string }) {
  return (
    <View>
      <AppText style={{ fontSize: 14, fontWeight: '800', color: '#1E1D45', marginBottom: 2 }}>
        {title}
      </AppText>
      <AppText style={{ fontSize: 13, color: '#3B3A5A', lineHeight: 19 }}>
        {desc}
      </AppText>
    </View>
  );
}
