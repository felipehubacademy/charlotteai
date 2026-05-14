// components/trail/TrailContent.tsx
// Snake-trail v4: 3 colunas, nodes 64px, SVG path com curvas suaves nas viradas.

import React, { useCallback, useState, useEffect } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Platform, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { router, useFocusEffect } from 'expo-router';
import { BookOpen, Microphone, Star, ChatCircle, Lock, CheckCircle, CaretRight } from 'phosphor-react-native';
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
  const cl = (n: number) => Math.max(0, Math.min(255, Math.round(n * (1 - amt))));
  const r = cl(parseInt(hex.slice(1, 3), 16));
  const g = cl(parseInt(hex.slice(3, 5), 16));
  const b = cl(parseInt(hex.slice(5, 7), 16));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  lockGray:  '#BDB9D8',
  lockBg:    '#E9E7F3',
};
const LEVEL_COLOR: Record<TrailLevel, string> = {
  Novice:   '#D97706',
  Inter:    '#7C3AED',
  Advanced: '#0F766E',
};

// ── Node types ────────────────────────────────────────────────────────────────
type NodeType = 'grammar' | 'speaking' | 'roleplay' | 'chat';
const NODE_CONFIG: Record<NodeType, { color: string; Icon: any; label: string; labelPt: string }> = {
  grammar:  { color: '#D97706', Icon: BookOpen,   label: 'Grammar',   labelPt: 'Gramatica'  },
  speaking: { color: '#7C3AED', Icon: Microphone, label: 'Speaking',  labelPt: 'Pronuncia'  },
  roleplay: { color: '#0F766E', Icon: Star,        label: 'Role-play', labelPt: 'Role-play'  },
  chat:     { color: '#2563EB', Icon: ChatCircle,  label: 'Chat',      labelPt: 'Chat'       },
};
function getNodeType(topic: Topic): NodeType {
  return topic.pronunciation.length > 0 ? 'speaking' : 'grammar';
}

// ── Layout ────────────────────────────────────────────────────────────────────
const W          = Dimensions.get('window').width;
const H_PAD      = 24;
const COLS       = 3;
const NODE       = 64;
const RING       = 4;
const UNIT       = NODE + RING * 2;          // 72
const GAP        = (W - H_PAD * 2 - UNIT * COLS) / (COLS - 1);
const LABEL_H    = 20;
const ROW_GAP    = 28;
const ROW_STRIDE = UNIT + LABEL_H + ROW_GAP; // vertical distance between row node centers
const PATH_W     = 11;
const CURVE      = Math.min(ROW_STRIDE * 0.40, GAP * 0.60); // corner bulge radius

// Column center x (0..COLS-1, left to right)
const COL_CX = Array.from({ length: COLS }, (_, c) => H_PAD + c * (UNIT + GAP) + UNIT / 2);

function nodePos(localIdx: number, globalRowOffset: number): { cx: number; cy: number } {
  const row   = Math.floor(localIdx / COLS);
  const col   = localIdx % COLS;
  const isLTR = (globalRowOffset + row) % 2 === 0;
  return {
    cx: COL_CX[isLTR ? col : COLS - 1 - col],
    cy: row * ROW_STRIDE + UNIT / 2,
  };
}

function moduleContainerHeight(count: number): number {
  if (count === 0) return 0;
  const rows = Math.ceil(count / COLS);
  return (rows - 1) * ROW_STRIDE + UNIT + LABEL_H + 12;
}

// Build SVG path with smooth cubic-bezier corners at row turns
function buildPath(count: number, globalRowOffset: number, limit?: number): string {
  const n = Math.min(count, limit ?? count);
  if (n === 0) return '';
  const pts = Array.from({ length: n }, (_, i) => nodePos(i, globalRowOffset));
  if (n === 1) return `M ${pts[0].cx.toFixed(1)} ${pts[0].cy.toFixed(1)}`;

  let d = `M ${pts[0].cx.toFixed(1)} ${pts[0].cy.toFixed(1)}`;
  for (let i = 1; i < n; i++) {
    const p = pts[i - 1];
    const c = pts[i];
    if (Math.floor((i - 1) / COLS) === Math.floor(i / COLS)) {
      // Same row → straight horizontal
      d += ` L ${c.cx.toFixed(1)} ${c.cy.toFixed(1)}`;
    } else {
      // Row change → smooth U-turn (cubic bezier bulges outward)
      const bulge = p.cx > W / 2 ? CURVE : -CURVE;
      d += ` C ${(p.cx + bulge).toFixed(1)} ${p.cy.toFixed(1)},`;
      d += ` ${(c.cx + bulge).toFixed(1)} ${c.cy.toFixed(1)},`;
      d += ` ${c.cx.toFixed(1)} ${c.cy.toFixed(1)}`;
    }
  }
  return d;
}

// ── Pulse halo ────────────────────────────────────────────────────────────────
function PulseHalo({ color }: { color: string }) {
  const scale   = useSharedValue(0.88);
  const opacity = useSharedValue(0.55);
  useEffect(() => {
    scale.value   = withRepeat(withTiming(1.55, { duration: 1150, easing: Easing.out(Easing.quad) }), -1, true);
    opacity.value = withRepeat(withTiming(0,    { duration: 1150, easing: Easing.out(Easing.quad) }), -1, true);
  }, []);
  const s  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  const sz = UNIT + 30;
  return (
    <Animated.View style={[{
      position: 'absolute',
      width: sz, height: sz, borderRadius: sz / 2,
      backgroundColor: color,
      top: -(sz - UNIT) / 2, left: -(sz - UNIT) / 2,
    }, s]} />
  );
}

// ── Flat node ─────────────────────────────────────────────────────────────────
interface FlatNode {
  key: string; label: string; nodeType: NodeType;
  state: 'complete' | 'active' | 'locked';
  hasContent: boolean; moduleIdx: number; topicIdx: number;
  isIntro: boolean; slideCount?: number;
}

// ── Absolute node component ───────────────────────────────────────────────────
function TrailNode({
  node, cx, cy, isCurrNode, isPt, onPress, refCb,
}: {
  node: FlatNode; cx: number; cy: number;
  isCurrNode: boolean; isPt: boolean;
  onPress: () => void; refCb?: (r: any) => void;
}) {
  const cfg    = NODE_CONFIG[node.nodeType];
  const isComp = node.state === 'complete';
  const isLock = node.state === 'locked';
  const ring   = isComp ? 1 : isCurrNode ? 0.45 : 0;
  const sz     = isCurrNode ? NODE + 8 : NODE;

  // SVG ring (inline, no react-native-svg import needed here — handled separately)
  // We'll use a border-based ring for simplicity
  const ringBorder = ring > 0 ? {
    borderWidth:  RING,
    borderColor:  isComp ? darken(cfg.color, 0.10) : a(cfg.color, 0.35),
  } : {
    borderWidth:  isLock ? 0 : 2,
    borderColor:  a(cfg.color, 0.25),
  };

  const shadow = Platform.select({
    ios: {
      shadowColor:   isLock ? 'transparent' : cfg.color,
      shadowOpacity: isComp ? 0.60 : isCurrNode ? 0.35 : 0,
      shadowRadius:  isComp ? 20 : 14,
      shadowOffset:  { width: 0, height: isComp ? 8 : 4 },
    },
    android: { elevation: isLock ? 0 : isComp ? 12 : isCurrNode ? 7 : 2 },
  });

  return (
    <TouchableOpacity
      ref={refCb}
      onPress={onPress}
      activeOpacity={isLock ? 1 : 0.78}
      style={{
        position: 'absolute',
        left: cx - UNIT / 2,
        top:  cy - UNIT / 2,
        width: UNIT,
        alignItems: 'center',
      }}
    >
      {/* Circle container */}
      <View style={{ width: UNIT, height: UNIT, alignItems: 'center', justifyContent: 'center' }}>
        {isCurrNode && <PulseHalo color={cfg.color} />}

        {/* White glow ring for complete nodes */}
        {isComp && (
          <View style={{
            position: 'absolute',
            width: UNIT + 6, height: UNIT + 6,
            borderRadius: (UNIT + 6) / 2,
            backgroundColor: a(cfg.color, 0.18),
          }} />
        )}

        <View style={{
          width: sz, height: sz, borderRadius: sz / 2,
          backgroundColor: isLock ? C.lockBg : isComp ? cfg.color : C.card,
          alignItems: 'center', justifyContent: 'center',
          ...ringBorder,
          ...shadow,
        }}>
          {isComp
            ? <CheckCircle size={28} color="#FFF" weight="fill" />
            : isLock
            ? <Lock size={22} color={C.lockGray} weight="fill" />
            : <cfg.Icon size={isCurrNode ? 26 : 24} color={cfg.color} weight="fill" />
          }
        </View>

        {/* XP badge */}
        {isCurrNode && (
          <View style={{
            position: 'absolute', top: 2, right: 0,
            backgroundColor: '#FF6B35', borderRadius: 9,
            paddingHorizontal: 6, paddingVertical: 2,
            borderWidth: 1.5, borderColor: C.card,
          }}>
            <AppText style={{ fontSize: 9, fontWeight: '900', color: '#FFF' }}>XP</AppText>
          </View>
        )}
      </View>

      {/* Label — only non-locked */}
      {!isLock ? (
        <AppText style={{
          fontSize: 11, fontWeight: '700', textAlign: 'center',
          color: isComp ? cfg.color : isCurrNode ? cfg.color : C.navyMid,
          marginTop: 5, width: UNIT + 20,
        }} numberOfLines={1}>
          {isPt ? cfg.labelPt : cfg.label}
        </AppText>
      ) : (
        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.lockGray, marginTop: 6 }} />
      )}
    </TouchableOpacity>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface TrailContentProps {
  userId: string | undefined; level: TrailLevel;
  showBanner?: boolean; onCurrentTopicRef?: (node: View | null) => void;
}

// ── Main ──────────────────────────────────────────────────────────────────────
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
      const done        = isIntroDone(mIdx);
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
        marginHorizontal: H_PAD - 4, marginTop: 12, marginBottom: 4,
        backgroundColor: cfg.color, borderRadius: 24, overflow: 'hidden',
        ...Platform.select({
          ios: { shadowColor: cfg.color, shadowOpacity: 0.50, shadowRadius: 22, shadowOffset: { width: 0, height: 8 } },
          android: { elevation: 12 },
        }),
      }}>
        <View style={{
          backgroundColor: darken(cfg.color, 0.22), paddingHorizontal: 20,
          paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 8,
        }}>
          <cfg.Icon size={14} color="rgba(255,255,255,0.72)" weight="fill" />
          <AppText style={{ fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.72)', letterSpacing: 0.8 }}>
            {isPt ? cfg.labelPt.toUpperCase() : cfg.label.toUpperCase()}
          </AppText>
        </View>
        <View style={{ padding: 20, paddingTop: 16 }}>
          <AppText style={{ fontSize: 19, fontWeight: '900', color: '#FFF', lineHeight: 27, marginBottom: 4 }}>
            {node.label}
          </AppText>
          <AppText style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', marginBottom: 20 }}>
            {node.isIntro && node.slideCount ? `${node.slideCount} slides` : isPt ? 'Topico de aprendizagem' : 'Learning topic'}
          </AppText>
          <TouchableOpacity onPress={() => handleStart(node)} activeOpacity={0.85} style={{
            backgroundColor: '#FFF', borderRadius: 18, paddingVertical: 16,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <AppText style={{ fontSize: 16, fontWeight: '900', color: cfg.color }}>
              {isComp ? (isPt ? 'Revisar' : 'Review') : (isPt ? 'Comecar  +20 XP' : 'Start  +20 XP')}
            </AppText>
            <CaretRight size={17} color={cfg.color} weight="bold" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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

  let rowCount = 0;

  return (
    <View style={{ paddingBottom: 32 }}>
      {groups.map(({ mIdx, title, nodes }) => {
        const offset  = rowCount;
        rowCount     += Math.ceil(nodes.length / COLS);
        const h       = moduleContainerHeight(nodes.length);

        // Split path at the first non-complete node
        const firstActive = nodes.findIndex(n => n.state !== 'complete');
        const doneCount   = firstActive < 0 ? nodes.length : firstActive + 1;

        const fullPath = buildPath(nodes.length, offset);
        const donePath = doneCount > 1 ? buildPath(nodes.length, offset, doneCount) : '';

        const selectedNode = nodes.find(n => n.key === selectedKey);

        return (
          <View key={mIdx} style={{ marginBottom: 28 }}>
            {/* Module header */}
            <View style={{ marginHorizontal: H_PAD, marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: a(accent, 0.15) }} />
                <View style={{ backgroundColor: accent, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 }}>
                  <AppText style={{ fontSize: 10, fontWeight: '900', color: '#FFF', letterSpacing: 0.8 }}>
                    {isPt ? `MODULO ${mIdx + 1}` : `MODULE ${mIdx + 1}`}
                  </AppText>
                </View>
                <View style={{ flex: 1, height: 1, backgroundColor: a(accent, 0.15) }} />
              </View>
              <AppText style={{ fontSize: 16, fontWeight: '800', color: C.navy, textAlign: 'center', lineHeight: 22 }}>
                {title}
              </AppText>
            </View>

            {/* Trail: SVG path + absolute nodes */}
            <View style={{ height: h, position: 'relative' }}>
              <Svg width={W} height={h} style={{ position: 'absolute', top: 0, left: 0 }}>
                {/* Full gray track (todo) */}
                {fullPath ? (
                  <Path d={fullPath} stroke={a(accent, 0.16)} strokeWidth={PATH_W}
                    fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ) : null}
                {/* Done overlay */}
                {donePath ? (
                  <Path d={donePath} stroke={a(accent, 0.48)} strokeWidth={PATH_W}
                    fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ) : null}
              </Svg>

              {nodes.map((node, i) => {
                const { cx, cy }  = nodePos(i, offset);
                const isCurrNode  = node.state === 'active' && isCurrent(node.moduleIdx, node.topicIdx);
                return (
                  <TrailNode
                    key={node.key}
                    node={node} cx={cx} cy={cy}
                    isCurrNode={isCurrNode} isPt={isPt}
                    onPress={() => handleTap(node)}
                    refCb={isCurrNode && onCurrentTopicRef
                      ? (r) => onCurrentTopicRef(r as unknown as View | null)
                      : undefined}
                  />
                );
              })}
            </View>

            {selectedNode && renderPopup(selectedNode)}
          </View>
        );
      })}
    </View>
  );
}
