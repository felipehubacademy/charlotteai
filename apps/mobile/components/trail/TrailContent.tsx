// components/trail/TrailContent.tsx
// Snake-trail v3: SVG path contínuo como backbone, nodes absolutamente posicionados.
// Path colorido (feito) vs cinza (bloqueado) mostra progresso visual claramente.

import React, { useCallback, useState, useEffect } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Platform, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
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
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n * (1 - amt))));
  const r = c(parseInt(hex.slice(1, 3), 16));
  const g = c(parseInt(hex.slice(3, 5), 16));
  const b = c(parseInt(hex.slice(5, 7), 16));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:        '#F4F3FA',
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  border:    'rgba(22,21,58,0.10)',
  lockGray:  '#C8C7DC',
  lockBg:    '#ECEAF5',
  trackDone: '#D0CAEE',   // color for completed path segments
  trackTodo: '#E0DFF0',   // color for locked path segments
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
  grammar:  { color: '#D97706', Icon: BookOpen,   label: 'Grammar',   labelPt: 'Gramatica' },
  speaking: { color: '#7C3AED', Icon: Microphone, label: 'Speaking',  labelPt: 'Pronuncia' },
  roleplay: { color: '#0F766E', Icon: Star,        label: 'Role-play', labelPt: 'Role-play' },
  chat:     { color: '#2563EB', Icon: ChatCircle,  label: 'Chat',      labelPt: 'Chat'      },
};

function getNodeType(topic: Topic): NodeType {
  if (topic.pronunciation.length > 0) return 'speaking';
  return 'grammar';
}

// ── Layout ────────────────────────────────────────────────────────────────────
const W          = Dimensions.get('window').width;
const H_PAD      = 24;
const COLS       = 4;
const NODE       = 48;          // inner circle px
const RING       = 3;
const UNIT       = NODE + RING * 2;   // 54 — footprint inc. ring space
const GAP        = (W - H_PAD * 2 - UNIT * COLS) / (COLS - 1);
const LABEL_H    = 18;
const ROW_GAP    = 20;
const ROW_STRIDE = UNIT + LABEL_H + ROW_GAP;   // vertical distance between row centers

// Center x of column c (LTR order 0..COLS-1)
const COL_CX = Array.from({ length: COLS }, (_, c) => H_PAD + c * (UNIT + GAP) + UNIT / 2);

function nodePos(localIdx: number, globalRowOffset: number): { cx: number; cy: number } {
  const row    = Math.floor(localIdx / COLS);
  const col    = localIdx % COLS;
  const isLTR  = (globalRowOffset + row) % 2 === 0;
  const cx     = COL_CX[isLTR ? col : COLS - 1 - col];
  const cy     = row * ROW_STRIDE + UNIT / 2;
  return { cx, cy };
}

function moduleHeight(nodeCount: number): number {
  if (nodeCount === 0) return 0;
  const rows = Math.ceil(nodeCount / COLS);
  return (rows - 1) * ROW_STRIDE + UNIT + LABEL_H + 8;
}

// Build SVG polyline path string from node positions
function buildPath(nodeCount: number, globalRowOffset: number, limit?: number): string {
  const n = limit ?? nodeCount;
  if (n <= 0) return '';
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const { cx, cy } = nodePos(i, globalRowOffset);
    pts.push(`${cx.toFixed(1)},${cy.toFixed(1)}`);
  }
  return 'M ' + pts.join(' L ');
}

// ── Progress ring ─────────────────────────────────────────────────────────────
function ProgressRing({ fraction, color }: { fraction: number; color: string }) {
  if (fraction <= 0) return null;
  const sz = UNIT;
  const r  = (sz - RING) / 2;
  const c  = 2 * Math.PI * r;
  const d  = c * Math.min(1, fraction);
  return (
    <Svg width={sz} height={sz} style={{ position: 'absolute', top: 0, left: 0 }}>
      <SvgCircle cx={sz/2} cy={sz/2} r={r}
        stroke={a(color, 0.18)} strokeWidth={RING} fill="none"
        rotation={-90} origin={`${sz/2},${sz/2}`} />
      <SvgCircle cx={sz/2} cy={sz/2} r={r}
        stroke={color} strokeWidth={RING} fill="none"
        strokeDasharray={`${d} ${c}`} strokeLinecap="round"
        rotation={-90} origin={`${sz/2},${sz/2}`} />
    </Svg>
  );
}

// ── Pulse halo ────────────────────────────────────────────────────────────────
function PulseHalo({ color }: { color: string }) {
  const scale   = useSharedValue(0.85);
  const opacity = useSharedValue(0.50);
  useEffect(() => {
    scale.value   = withRepeat(withTiming(1.55, { duration: 1100, easing: Easing.out(Easing.quad) }), -1, true);
    opacity.value = withRepeat(withTiming(0,    { duration: 1100, easing: Easing.out(Easing.quad) }), -1, true);
  }, []);
  const s  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  const sz = UNIT + 28;
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

// ── Abs-positioned node ───────────────────────────────────────────────────────
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
  const ring   = isComp ? 1 : isCurrNode ? 0.42 : 0;
  const sz     = isCurrNode ? NODE + 6 : NODE;

  const shadow = Platform.select({
    ios: {
      shadowColor:   isLock ? 'transparent' : isComp ? cfg.color : cfg.color,
      shadowOpacity: isComp ? 0.55 : isCurrNode ? 0.30 : 0.12,
      shadowRadius:  isComp ? 16 : isCurrNode ? 12 : 6,
      shadowOffset:  { width: 0, height: isComp ? 6 : 3 },
    },
    android: { elevation: isLock ? 0 : isComp ? 9 : isCurrNode ? 5 : 2 },
  });

  return (
    <TouchableOpacity
      ref={refCb}
      onPress={onPress}
      activeOpacity={isLock ? 1 : 0.80}
      style={{
        position: 'absolute',
        left: cx - UNIT / 2,
        top: cy - UNIT / 2,
        width: UNIT,
        alignItems: 'center',
      }}
    >
      {/* Ring + circle container */}
      <View style={{ width: UNIT, height: UNIT, alignItems: 'center', justifyContent: 'center' }}>
        {isCurrNode && <PulseHalo color={cfg.color} />}
        <ProgressRing fraction={ring} color={cfg.color} />
        <View style={{
          width: sz, height: sz, borderRadius: sz / 2,
          backgroundColor: isLock ? C.lockBg : isComp ? cfg.color : C.card,
          borderWidth: isLock || isComp ? 0 : isCurrNode ? 2.5 : 1.5,
          borderColor: a(cfg.color, isCurrNode ? 0.40 : 0.22),
          alignItems: 'center', justifyContent: 'center',
          ...shadow,
        }}>
          {isComp
            ? <CheckCircle size={20} color="#FFF" weight="fill" />
            : isLock
            ? <Lock size={16} color={C.lockGray} weight="fill" />
            : <cfg.Icon size={isCurrNode ? 21 : 19} color={cfg.color} weight="fill" />
          }
        </View>
        {/* XP badge */}
        {isCurrNode && (
          <View style={{
            position: 'absolute', top: 0, right: -2,
            backgroundColor: '#FF6B35', borderRadius: 8,
            paddingHorizontal: 5, paddingVertical: 2,
            borderWidth: 1.5, borderColor: C.card,
          }}>
            <AppText style={{ fontSize: 8, fontWeight: '900', color: '#FFF' }}>XP</AppText>
          </View>
        )}
      </View>

      {/* Label */}
      {!isLock ? (
        <AppText style={{
          fontSize: 10, fontWeight: '700', textAlign: 'center',
          color: isComp || isCurrNode ? cfg.color : C.navyMid,
          marginTop: 4, width: UNIT + 16,
        }} numberOfLines={1}>
          {isPt ? cfg.labelPt : cfg.label}
        </AppText>
      ) : (
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.lockGray, marginTop: 5 }} />
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

  // ── Build module node groups ───────────────────────────────────────────────
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
        marginHorizontal: H_PAD - 4, marginTop: 8, marginBottom: 4,
        backgroundColor: cfg.color, borderRadius: 22, overflow: 'hidden',
        ...Platform.select({
          ios: { shadowColor: cfg.color, shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
          android: { elevation: 10 },
        }),
      }}>
        <View style={{
          backgroundColor: darken(cfg.color, 0.20),
          paddingHorizontal: 18, paddingVertical: 10,
          flexDirection: 'row', alignItems: 'center', gap: 8,
        }}>
          <cfg.Icon size={13} color="rgba(255,255,255,0.72)" weight="fill" />
          <AppText style={{ fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.72)', letterSpacing: 0.8 }}>
            {isPt ? cfg.labelPt.toUpperCase() : cfg.label.toUpperCase()}
          </AppText>
        </View>
        <View style={{ padding: 18, paddingTop: 14 }}>
          <AppText style={{ fontSize: 18, fontWeight: '900', color: '#FFF', lineHeight: 26, marginBottom: 4 }}>
            {node.label}
          </AppText>
          <AppText style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', marginBottom: 18 }}>
            {node.isIntro && node.slideCount ? `${node.slideCount} slides` : isPt ? 'Topico de aprendizagem' : 'Learning topic'}
          </AppText>
          <TouchableOpacity onPress={() => handleStart(node)} activeOpacity={0.85} style={{
            backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 15,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <AppText style={{ fontSize: 15, fontWeight: '900', color: cfg.color }}>
              {isComp ? (isPt ? 'Revisar' : 'Review') : (isPt ? 'Comecar  +20 XP' : 'Start  +20 XP')}
            </AppText>
            <CaretRight size={16} color={cfg.color} weight="bold" />
          </TouchableOpacity>
        </View>
      </View>
    );
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
        const globalOffset = rowCount;
        rowCount += Math.ceil(nodes.length / COLS);

        const h          = moduleHeight(nodes.length);
        const doneUntil  = Math.max(0, nodes.findIndex(n => n.state !== 'complete'));
        const allDone    = nodes.every(n => n.state === 'complete');
        const donePath   = buildPath(nodes.length, globalOffset, allDone ? nodes.length : doneUntil + 1);
        const fullPath   = buildPath(nodes.length, globalOffset);
        const selectedNode = nodes.find(n => n.key === selectedKey);

        return (
          <View key={mIdx} style={{ marginBottom: 32 }}>
            {/* Module header */}
            <View style={{ marginHorizontal: H_PAD, marginBottom: 22 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: a(accent, 0.15) }} />
                <View style={{ backgroundColor: accent, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 }}>
                  <AppText style={{ fontSize: 10, fontWeight: '900', color: '#FFF', letterSpacing: 0.6 }}>
                    {isPt ? `MODULO ${mIdx + 1}` : `MODULE ${mIdx + 1}`}
                  </AppText>
                </View>
                <View style={{ flex: 1, height: 1, backgroundColor: a(accent, 0.15) }} />
              </View>
              <AppText style={{ fontSize: 15, fontWeight: '800', color: C.navy, textAlign: 'center' }}>
                {title}
              </AppText>
            </View>

            {/* Trail: SVG path + absolute nodes */}
            <View style={{ height: h, position: 'relative' }}>
              <Svg
                width={W}
                height={h}
                style={{ position: 'absolute', top: 0, left: 0 }}
              >
                {/* Full gray track */}
                {fullPath ? (
                  <Path
                    d={fullPath}
                    stroke={C.trackTodo}
                    strokeWidth={5}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
                {/* Completed overlay */}
                {donePath && donePath !== fullPath ? (
                  <Path
                    d={donePath}
                    stroke={C.trackDone}
                    strokeWidth={5}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
              </Svg>

              {/* Nodes */}
              {nodes.map((node, i) => {
                const { cx, cy }  = nodePos(i, globalOffset);
                const isCurrNode  = node.state === 'active' && isCurrent(node.moduleIdx, node.topicIdx);
                return (
                  <TrailNode
                    key={node.key}
                    node={node}
                    cx={cx}
                    cy={cy}
                    isCurrNode={isCurrNode}
                    isPt={isPt}
                    onPress={() => handleTap(node)}
                    refCb={isCurrNode && onCurrentTopicRef
                      ? (r) => onCurrentTopicRef(r as unknown as View | null)
                      : undefined}
                  />
                );
              })}
            </View>

            {/* Inline popup below trail */}
            {selectedNode && renderPopup(selectedNode)}
          </View>
        );
      })}
    </View>
  );
}
