// components/trail/TrailContent.tsx
// Snake-trail v2: hierarquia visual clara, animacao de pulso, conectores coloridos.

import React, { useCallback, useState, useEffect } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Platform, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { router, useFocusEffect } from 'expo-router';
import {
  BookOpen, Microphone, Star, ChatCircle,
  Lock, CheckCircle, CaretRight,
} from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { CURRICULUM, TrailLevel, Topic, topicHasContent } from '@/data/curriculum';
import { MODULE_INTROS } from '@/data/moduleIntros';
import { useLearnProgress } from '@/hooks/useLearnProgress';

// ── Helpers ───────────────────────────────────────────────────────────────────
function a(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function darken(hex: string, amt: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  const r = clamp(Math.round(parseInt(hex.slice(1, 3), 16) * (1 - amt)));
  const g = clamp(Math.round(parseInt(hex.slice(3, 5), 16) * (1 - amt)));
  const b = clamp(Math.round(parseInt(hex.slice(5, 7), 16) * (1 - amt)));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  border:    'rgba(22,21,58,0.10)',
  lockGray:  '#C4C3D4',
  lockBg:    '#EDECF5',
};

const LEVEL_COLOR: Record<TrailLevel, string> = {
  Novice:   '#D97706',
  Inter:    '#7C3AED',
  Advanced: '#0F766E',
};

// ── Node types ────────────────────────────────────────────────────────────────
type NodeType = 'grammar' | 'speaking' | 'roleplay' | 'chat';

const NODE_CONFIG: Record<NodeType, {
  color: string; Icon: React.ComponentType<any>; label: string; labelPt: string;
}> = {
  grammar:  { color: '#D97706', Icon: BookOpen,   label: 'Grammar',   labelPt: 'Gramatica'  },
  speaking: { color: '#7C3AED', Icon: Microphone, label: 'Speaking',  labelPt: 'Pronuncia'  },
  roleplay: { color: '#0F766E', Icon: Star,        label: 'Role-play', labelPt: 'Role-play'  },
  chat:     { color: '#2563EB', Icon: ChatCircle,  label: 'Chat',      labelPt: 'Chat'       },
};

function getNodeType(topic: Topic): NodeType {
  if (topic.pronunciation.length > 0) return 'speaking';
  return 'grammar';
}

// ── Layout ────────────────────────────────────────────────────────────────────
const W        = Dimensions.get('window').width;
const H_PAD    = 20;
const COLS     = 4;
const NODE     = 52;
const RING     = 3;
const UNIT     = NODE + RING * 2;   // 58
const GAP      = (W - H_PAD * 2 - UNIT * COLS) / (COLS - 1);
const EDGE_CTR = H_PAD + UNIT / 2;

// ── Progress ring ─────────────────────────────────────────────────────────────
function ProgressRing({ fraction, color }: { fraction: number; color: string }) {
  if (fraction <= 0) return null;
  const sz = UNIT;
  const r  = (sz - RING) / 2;
  const c  = 2 * Math.PI * r;
  const d  = c * Math.min(1, fraction);
  return (
    <Svg width={sz} height={sz} style={{ position: 'absolute', top: 0, left: 0 }}>
      <Circle cx={sz/2} cy={sz/2} r={r}
        stroke={a(color, 0.18)} strokeWidth={RING} fill="none"
        rotation={-90} origin={`${sz/2},${sz/2}`} />
      <Circle cx={sz/2} cy={sz/2} r={r}
        stroke={color} strokeWidth={RING} fill="none"
        strokeDasharray={`${d} ${c}`} strokeLinecap="round"
        rotation={-90} origin={`${sz/2},${sz/2}`} />
    </Svg>
  );
}

// ── Pulse halo (Reanimated) ───────────────────────────────────────────────────
function PulseHalo({ color }: { color: string }) {
  const scale   = useSharedValue(0.9);
  const opacity = useSharedValue(0.45);
  useEffect(() => {
    scale.value   = withRepeat(withTiming(1.48, { duration: 1100, easing: Easing.out(Easing.quad) }), -1, true);
    opacity.value = withRepeat(withTiming(0,    { duration: 1100, easing: Easing.out(Easing.quad) }), -1, true);
  }, []);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  const sz = UNIT + 24;
  return (
    <Animated.View style={[{
      position: 'absolute',
      width: sz, height: sz, borderRadius: sz / 2,
      backgroundColor: color,
      top: -(sz - UNIT) / 2, left: -(sz - UNIT) / 2,
    }, s]} />
  );
}

// ── Connectors ────────────────────────────────────────────────────────────────
function HorizDash({ bothDone }: { bothDone: boolean }) {
  const dW   = 4;
  const dGap = 3;
  const n    = Math.max(2, Math.floor(GAP / (dW + dGap)));
  const bg   = bothDone ? C.lockGray : C.border;
  return (
    <View style={{ width: GAP, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: dGap }}>
      {Array.from({ length: n }).map((_, i) => (
        <View key={i} style={{ width: dW, height: 1.5, borderRadius: 1, backgroundColor: bg, opacity: 0.55 }} />
      ))}
    </View>
  );
}

function VertDash({ side }: { side: 'left' | 'right' }) {
  const pad = EDGE_CTR - 1;
  return (
    <View style={{
      alignItems: side === 'right' ? 'flex-end' : 'flex-start',
      paddingRight: side === 'right' ? pad : 0,
      paddingLeft:  side === 'left'  ? pad : 0,
      paddingVertical: 2,
    }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <View key={i} style={{
          width: 1.5, height: 4, borderRadius: 1,
          backgroundColor: C.border, opacity: 0.5,
          marginBottom: i < 7 ? 3 : 0,
        }} />
      ))}
    </View>
  );
}

// ── Flat node ─────────────────────────────────────────────────────────────────
interface FlatNode {
  key: string; label: string; nodeType: NodeType;
  state: 'complete' | 'active' | 'locked';
  hasContent: boolean; moduleIdx: number; topicIdx: number;
  isIntro: boolean; slideCount?: number;
}

// ── Single node ───────────────────────────────────────────────────────────────
function TrailNode({
  node, isCurrNode, isPt, onPress, refCb,
}: {
  node: FlatNode; isCurrNode: boolean; isPt: boolean;
  onPress: () => void; refCb?: (r: any) => void;
}) {
  const cfg    = NODE_CONFIG[node.nodeType];
  const isComp = node.state === 'complete';
  const isLock = node.state === 'locked';
  const ring   = isComp ? 1 : isCurrNode ? 0.42 : 0;
  const sz     = isCurrNode ? NODE + 4 : NODE;

  const shadow = Platform.select({
    ios: {
      shadowColor:   isLock ? 'transparent' : cfg.color,
      shadowOpacity: isComp ? 0.55 : isCurrNode ? 0.32 : 0.14,
      shadowRadius:  isComp ? 18 : isCurrNode ? 14 : 7,
      shadowOffset:  { width: 0, height: isComp ? 7 : 3 },
    },
    android: { elevation: isLock ? 0 : isComp ? 10 : isCurrNode ? 6 : 3 },
  });

  return (
    <TouchableOpacity
      ref={refCb}
      onPress={onPress}
      activeOpacity={isLock ? 1 : 0.78}
      style={{ alignItems: 'center', width: UNIT + 16 }}
    >
      <View style={{ width: UNIT, height: UNIT, alignItems: 'center', justifyContent: 'center' }}>
        {isCurrNode && <PulseHalo color={cfg.color} />}
        <ProgressRing fraction={ring} color={cfg.color} />

        <View style={{
          width: sz, height: sz, borderRadius: sz / 2,
          backgroundColor: isLock ? C.lockBg : isComp ? cfg.color : C.card,
          borderWidth: isLock || isComp ? 0 : isCurrNode ? 2.5 : 1.5,
          borderColor: a(cfg.color, isCurrNode ? 0.42 : 0.22),
          alignItems: 'center', justifyContent: 'center',
          ...shadow,
        }}>
          {isComp
            ? <CheckCircle size={22} color="#FFF" weight="fill" />
            : isLock
            ? <Lock size={18} color={C.lockGray} weight="fill" />
            : <cfg.Icon size={isCurrNode ? 22 : 20} color={isComp ? '#FFF' : cfg.color} weight="fill" />
          }
        </View>

        {isCurrNode && (
          <View style={{
            position: 'absolute', top: 0, right: 0,
            backgroundColor: '#FF6B35', borderRadius: 9,
            paddingHorizontal: 5, paddingVertical: 2,
            borderWidth: 1.5, borderColor: '#FFF',
          }}>
            <AppText style={{ fontSize: 8, fontWeight: '900', color: '#FFF', letterSpacing: 0.2 }}>XP</AppText>
          </View>
        )}
      </View>

      {!isLock ? (
        <AppText style={{
          fontSize: 10, fontWeight: '700', textAlign: 'center',
          color: isComp || isCurrNode ? cfg.color : C.navyMid,
          marginTop: 5, maxWidth: UNIT + 16,
        }} numberOfLines={1}>
          {isPt ? cfg.labelPt : cfg.label}
        </AppText>
      ) : (
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.lockGray, marginTop: 6 }} />
      )}
    </TouchableOpacity>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface TrailContentProps {
  userId: string | undefined; level: TrailLevel;
  showBanner?: boolean; onCurrentTopicRef?: (node: View | null) => void;
}

// ── Main component ────────────────────────────────────────────────────────────
export function TrailContent({ userId, level, onCurrentTopicRef }: TrailContentProps) {
  const isPt    = level === 'Novice';
  const accent  = LEVEL_COLOR[level];
  const modules = CURRICULUM[level];

  const { loading, refetch, isTopicComplete, isCurrent, isLocked, isIntroDone } =
    useLearnProgress(userId, level);

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // ── Build groups ───────────────────────────────────────────────────────────
  const groups = modules.map((mod, mIdx) => {
    const nodes: FlatNode[] = [];
    const intro = MODULE_INTROS[level]?.[mIdx];
    if (intro) {
      const done = isIntroDone(mIdx);
      const introLocked = mIdx > 0 && modules[mIdx - 1].topics.some((_, t) => !isTopicComplete(mIdx - 1, t));
      nodes.push({
        key: `m${mIdx}_intro`, label: intro.title, nodeType: 'grammar',
        state: done ? 'complete' : introLocked ? 'locked' : 'active',
        hasContent: true, moduleIdx: mIdx, topicIdx: -1, isIntro: true,
        slideCount: intro.slides.length,
      });
    }
    mod.topics.forEach((topic, tIdx) => {
      const complete = isTopicComplete(mIdx, tIdx);
      const miniReq  = tIdx === 0 && !isIntroDone(mIdx);
      const locked   = !complete && (miniReq || isLocked(mIdx, tIdx));
      nodes.push({
        key: `m${mIdx}_t${tIdx}`, label: topic.title,
        nodeType: getNodeType(topic),
        state: complete ? 'complete' : locked ? 'locked' : 'active',
        hasContent: topicHasContent(level, mIdx, tIdx),
        moduleIdx: mIdx, topicIdx: tIdx, isIntro: false,
      });
    });
    return { mIdx, title: mod.title, nodes };
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleTap = (node: FlatNode) => {
    if (node.state === 'locked' || !node.hasContent) return;
    setSelectedKey(k => k === node.key ? null : node.key);
  };
  const handleStart = (node: FlatNode) => {
    setSelectedKey(null);
    if (node.isIntro) {
      router.push({ pathname: '/(app)/learn-intro', params: { level, moduleIndex: String(node.moduleIdx), topicIndex: '0' } });
    } else {
      router.push({ pathname: '/(app)/learn-session', params: { level, moduleIndex: String(node.moduleIdx), topicIndex: String(node.topicIdx) } });
    }
  };

  // ── Popup ──────────────────────────────────────────────────────────────────
  const renderPopup = (node: FlatNode) => {
    const cfg    = NODE_CONFIG[node.nodeType];
    const isComp = node.state === 'complete';
    return (
      <View style={{
        marginHorizontal: H_PAD, marginTop: 12, marginBottom: 4,
        backgroundColor: cfg.color, borderRadius: 22, overflow: 'hidden',
        ...Platform.select({
          ios: { shadowColor: cfg.color, shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
          android: { elevation: 10 },
        }),
      }}>
        <View style={{
          backgroundColor: darken(cfg.color, 0.22),
          paddingHorizontal: 18, paddingVertical: 10,
          flexDirection: 'row', alignItems: 'center', gap: 8,
        }}>
          <cfg.Icon size={13} color="rgba(255,255,255,0.70)" weight="fill" />
          <AppText style={{ fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.70)', letterSpacing: 0.8 }}>
            {isPt ? cfg.labelPt.toUpperCase() : cfg.label.toUpperCase()}
          </AppText>
        </View>
        <View style={{ padding: 18, paddingTop: 14 }}>
          <AppText style={{ fontSize: 18, fontWeight: '900', color: '#FFF', lineHeight: 26, marginBottom: 4 }}>
            {node.label}
          </AppText>
          <AppText style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', marginBottom: 18 }}>
            {node.isIntro && node.slideCount != null
              ? `${node.slideCount} slides`
              : isPt ? 'Topico de aprendizagem' : 'Learning topic'}
          </AppText>
          <TouchableOpacity
            onPress={() => handleStart(node)}
            activeOpacity={0.85}
            style={{
              backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 15,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <AppText style={{ fontSize: 15, fontWeight: '900', color: cfg.color, letterSpacing: 0.2 }}>
              {isComp ? (isPt ? 'Revisar' : 'Review') : (isPt ? 'Comecar  +20 XP' : 'Start  +20 XP')}
            </AppText>
            <CaretRight size={16} color={cfg.color} weight="bold" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Rows ───────────────────────────────────────────────────────────────────
  const renderRows = (nodes: FlatNode[], globalOffset: number) => {
    const rows: FlatNode[][] = [];
    for (let i = 0; i < nodes.length; i += COLS) rows.push(nodes.slice(i, i + COLS));

    return rows.map((row, rIdx) => {
      const isLTR   = (globalOffset + rIdx) % 2 === 0;
      const display = isLTR ? [...row] : [...row].reverse();
      const selected = row.find(n => n.key === selectedKey);

      return (
        <View key={rIdx}>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            justifyContent: isLTR ? 'flex-start' : 'flex-end',
            paddingHorizontal: H_PAD, marginBottom: 4,
          }}>
            {display.map((node, i) => {
              const isCurrNode = node.state === 'active' && isCurrent(node.moduleIdx, node.topicIdx);
              const next       = display[i + 1];
              const bothDone   = node.state === 'complete' && next?.state === 'complete';
              return (
                <React.Fragment key={node.key}>
                  <TrailNode
                    node={node} isCurrNode={isCurrNode} isPt={isPt}
                    onPress={() => handleTap(node)}
                    refCb={isCurrNode && onCurrentTopicRef
                      ? (r) => onCurrentTopicRef(r as unknown as View | null)
                      : undefined}
                  />
                  {i < display.length - 1 && (
                    <View style={{ height: UNIT, alignItems: 'center', justifyContent: 'center' }}>
                      <HorizDash bothDone={bothDone} />
                    </View>
                  )}
                </React.Fragment>
              );
            })}
          </View>
          {selected && renderPopup(selected)}
          {rIdx < rows.length - 1 && <VertDash side={isLTR ? 'right' : 'left'} />}
        </View>
      );
    });
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ alignItems: 'center', paddingTop: 40 }}>
        <ActivityIndicator color={accent} />
        <AppText style={{ color: C.navyLight, marginTop: 12, fontSize: 13 }}>
          {isPt ? 'Carregando sua trilha...' : 'Loading your trail...'}
        </AppText>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  let rowCount = 0;
  return (
    <View style={{ paddingBottom: 32 }}>
      {groups.map(({ mIdx, title, nodes }) => {
        const offset = rowCount;
        rowCount    += Math.ceil(nodes.length / COLS);
        return (
          <View key={mIdx} style={{ marginBottom: 36 }}>
            {/* Module header — editorial */}
            <View style={{ marginHorizontal: H_PAD, marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: a(accent, 0.18) }} />
                <View style={{
                  backgroundColor: accent, borderRadius: 20,
                  paddingHorizontal: 12, paddingVertical: 5,
                }}>
                  <AppText style={{ fontSize: 10, fontWeight: '900', color: '#FFF', letterSpacing: 0.6 }}>
                    {isPt ? `MODULO ${mIdx + 1}` : `MODULE ${mIdx + 1}`}
                  </AppText>
                </View>
                <View style={{ flex: 1, height: 1, backgroundColor: a(accent, 0.18) }} />
              </View>
              <AppText style={{ fontSize: 15, fontWeight: '800', color: C.navy, textAlign: 'center' }}>
                {title}
              </AppText>
            </View>

            {renderRows(nodes, offset)}
          </View>
        );
      })}
    </View>
  );
}
