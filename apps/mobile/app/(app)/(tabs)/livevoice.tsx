// app/(app)/(tabs)/livevoice.tsx
// Live Voice tab — hero com video da Charlotte + ring de pool mensal +
// resumo da última chamada + botão Start now. Beta only (new_layout).

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, ScrollView, TouchableOpacity, ActivityIndicator, Image,
  RefreshControl, Modal, Pressable, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Phone, XCircle, ClockCounterClockwise, CaretRight } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { HeaderPills } from '@/components/ui/HeaderPills';
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

const C = {
  stage:       '#18193D',  // mesmo do hero da Home (heroStrip)
  panel:       '#0B0B1F',  // navy mais escuro que o palco — contraste claro
  navyMid:     '#3B3A5A',  // tom do balão de fala (igual Home hero)
  navyLight:   'rgba(255,255,255,0.55)',
  navyGhost:   'rgba(255,255,255,0.10)',
  textWhite:   '#FFFFFF',
  textMuted:   'rgba(255,255,255,0.78)',
  textDim:     'rgba(255,255,255,0.48)',
  greenAccent: '#A3FF3C',
  greenDark:   '#3D8800',
  gold:        '#F59E0B',
  red:         '#EF4444',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface LastCall {
  id:               string;
  started_at:       string;
  duration_seconds: number;
  summary:          string | null;
  transcript:       string | null;
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

function CallListItem({ call, isPt, onPress }: {
  call: LastCall; isPt: boolean; onPress: () => void;
}) {
  const days = Math.floor((Date.now() - new Date(call.started_at).getTime()) / 86_400_000);
  const minutes = Math.round(call.duration_seconds / 60);
  const hasTranscript = !!(call.transcript && call.transcript.trim().length > 0);

  const whenLabel = days === 0 ? (isPt ? 'Hoje' : 'Today')
                  : days === 1 ? (isPt ? 'Ontem' : 'Yesterday')
                  : isPt ? `há ${days} dias` : `${days} days ago`;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={hasTranscript ? 0.6 : 1}
      disabled={!hasTranscript}
      style={{
        paddingVertical: 14, paddingHorizontal: 4,
        borderBottomWidth: 1, borderBottomColor: 'rgba(22,21,58,0.06)',
        flexDirection: 'row', alignItems: 'center', gap: 10,
      }}
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
  );
}

// ── Drawer lateral com lista de chamadas anteriores ───────────────────────────

function CallsDrawer({ calls, isOpen, onClose, onSelectCall, isPt }: {
  calls: LastCall[]; isOpen: boolean; onClose: () => void;
  onSelectCall: (call: LastCall) => void; isPt: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        {/* Drawer panel */}
        <View style={{
          width: '82%',
          backgroundColor: '#FFFFFF',
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 8,
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 20, paddingVertical: 12,
            borderBottomWidth: 1, borderBottomColor: 'rgba(22,21,58,0.08)',
          }}>
            <AppText style={{ fontSize: 16, fontWeight: '800', color: '#16153A', flex: 1 }}>
              {isPt ? 'Conversas anteriores' : 'Previous conversations'}
            </AppText>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <XCircle size={22} color="rgba(22,21,58,0.3)" weight="fill" />
            </TouchableOpacity>
          </View>

          {/* Lista */}
          {calls.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 }}>
              <AppText style={{ color: '#9896B8', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                {isPt ? 'Você ainda não fez nenhuma chamada.' : 'No calls yet.'}
              </AppText>
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4 }}
              showsVerticalScrollIndicator={false}
            >
              {calls.map(call => (
                <CallListItem
                  key={call.id}
                  call={call}
                  isPt={isPt}
                  onPress={() => onSelectCall(call)}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Backdrop (tap fora fecha) */}
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </View>
    </Modal>
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const startCall = useCallback(() => {
    if (!poolUnlimited && poolUsed >= poolTotal) return;
    soundEngine.setMuted(true);
    setShowLiveVoice(true);
  }, [poolUnlimited, poolUsed, poolTotal]);

  const isLimitReached = !poolUnlimited && poolUsed >= poolTotal;
  const statsParams = { sessionXP: String(todayXP), totalXP: String(totalXP), userId, userLevel: level, userName: profile?.name ?? 'Student' };

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
          <ActivityIndicator size="large" color={C.greenAccent} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>

          {/* ── PALCO: Charlotte (esquerda) + balão (direita), estilo Home hero ── */}
          <View style={{
            flex: 0.62,
            backgroundColor: C.stage,
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingTop: 16,
            paddingRight: 20,
            paddingLeft: 0,
          }}>
            {/* Charlotte full body, esquerda, 9:16 exato (180×320 = sem crop) */}
            <View style={{ width: 180, height: 320, alignSelf: 'flex-end', overflow: 'hidden' }}>
              <VideoView
                player={liveVoicePlayer}
                style={{ width: 180, height: 320, backgroundColor: 'transparent' }}
                contentFit="cover"
                nativeControls={false}
              />
            </View>

            {/* Balão à direita — canto sharp top-left pointing pra Charlotte */}
            <View style={{ flex: 1, paddingBottom: 80, paddingLeft: 4 }}>
              <View style={{
                backgroundColor: C.navyMid,
                borderRadius: 18, borderTopLeftRadius: 4,
                paddingHorizontal: 16, paddingVertical: 14,
                alignSelf: 'flex-start',
                maxWidth: '100%',
              }}>
                <AppText style={{ fontSize: 16, color: '#FFFFFF', lineHeight: 22, fontWeight: '600' }}>
                  {isPt ? 'Vamos conversar?' : 'Want to talk?'}
                </AppText>
              </View>
            </View>

            {/* Botão flutuante top-left: histórico de chamadas */}
            {recentCalls.length > 0 && (
              <TouchableOpacity
                onPress={() => setShowCallsDrawer(true)}
                accessibilityLabel={isPt ? 'Ver chamadas anteriores' : 'View previous calls'}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{
                  position: 'absolute',
                  top: 16, left: 16,
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: 'rgba(255,255,255,0.10)',
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <ClockCounterClockwise size={22} color="#FFFFFF" weight="regular" />
              </TouchableOpacity>
            )}
          </View>

          {/* ── PAINEL: Start big (primário) + pool ring menor abaixo ── */}
          <View style={{
            flex: 0.38,
            backgroundColor: C.panel,
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingHorizontal: 24,
            paddingTop: 28,
            paddingBottom: 24,
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: 20,
          }}>

            {/* Start button — protagonista */}
            <View style={{ alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={startCall}
                disabled={isLimitReached}
                activeOpacity={0.85}
                style={{
                  width: 104, height: 104, borderRadius: 52,
                  backgroundColor: isLimitReached ? C.navyGhost : accent,
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: isLimitReached ? 'transparent' : accent,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.55, shadowRadius: 22,
                  elevation: 12,
                  opacity: isLimitReached ? 0.6 : 1,
                }}
              >
                <Phone size={40} color={isLimitReached ? C.textDim : '#FFFFFF'} weight="fill" />
              </TouchableOpacity>
              <AppText style={{ fontSize: 13, fontWeight: '800', color: isLimitReached ? C.textDim : C.textWhite, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                {isLimitReached
                  ? (isPt ? 'Limite atingido' : 'Limit reached')
                  : (isPt ? 'Começar agora' : 'Start now')
                }
              </AppText>
            </View>

            {/* Pool ring — menor, secundário */}
            <View style={{ transform: [{ scale: 0.6 }] }}>
              <PoolRing used={poolUsed} total={poolTotal} isUnlimited={poolUnlimited} isPt={isPt} />
            </View>

          </View>

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

      <CallsDrawer
        calls={recentCalls}
        isOpen={showCallsDrawer}
        isPt={isPt}
        onClose={() => setShowCallsDrawer(false)}
        onSelectCall={(call) => {
          setShowCallsDrawer(false);
          setSelectedCall(call);
          // pequeno delay pra modal de cima fechar antes do bottom sheet abrir
          setTimeout(() => setShowTranscript(true), 220);
        }}
      />

    </View>
  );
}
