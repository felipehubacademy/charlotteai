// components/trail/TrailContent.tsx — v5
// 4 colunas, trail contínua cross-module, canvas SVG único.

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Platform, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
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
  const cl = (n: number) => Math.max(0, Math.min(255, Math.round(n * (1 - amt))));
  const r = cl(parseInt(hex.slice(1, 3), 16));
  const g = cl(parseInt(hex.slice(3, 5), 16));
  const b = cl(parseInt(hex.slice(5, 7), 16));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  lockGray:  '#C4C1DC',
  lockBg:    '#ECEAF4',
  card:      '#FFFFFF',
};
const LEVEL_COLOR: Record<TrailLevel, string> = {
  Novice:   '#D97706',
  Inter:    '#7C3AED',
  Advanced: '#0F766E',
};

// ── Node types ────────────────────────────────────────────────────────────────
type NodeType = 'grammar' | 'speaking' | 'roleplay' | 'chat';
const NODE_CONFIG: Record<NodeType, { color: string; Icon: any; label: string; labelPt: string }> = {
  grammar:  { color: '#D97706', Icon: BookOpen,   label: 'Grammar',   labelPt: 'Gramatica' },
  speaking: { color: '#7C3AED', Icon: Microphone, label: 'Speaking',  labelPt: 'Pronuncia' },
  roleplay: { color: '#0F766E', Icon: Star,        label: 'Role-play', labelPt: 'Role-play' },
  chat:     { color: '#2563EB', Icon: ChatCircle,  label: 'Chat',      labelPt: 'Chat'      },
};
function getNodeType(topic: Topic): NodeType {
  return topic.pronunciation.length > 0 ? 'speaking' : 'grammar';
}

// ── Layout ────────────────────────────────────────────────────────────────────
const W          = Dimensions.get('window').width;
const H_PAD      = 20;
const COLS       = 4;
const NODE       = 50;         // active / complete diameter
const NODE_LOCK  = 34;         // locked diameter — visually subordinate
const RING       = 4;
const UNIT       = NODE + RING * 2;   // 58 — slot width/height for layout
const GAP        = (W - H_PAD * 2 - UNIT * COLS) / (COLS - 1);
const LABEL_H    = 17;
const ROW_GAP    = 28;
const ROW_STRIDE = UNIT + LABEL_H + ROW_GAP;  // ~103
const PATH_W     = 9;
const CURVE      = Math.max(GAP * 0.80, 22);

// Vertical space reserved in the canvas for each module's header block
const MOD_HDR_H  = 82;

// Column center X coords (left-to-right order; RTL is handled in nodePos)
const COL_CX = Array.from(
  { length: COLS },
  (_, c) => H_PAD + c * (UNIT + GAP) + UNIT / 2,
);

// How many module headers sit above globalIdx (every module, including 0)
function hdrsBefore(gi: number, modStarts: number[]): number {
  let cnt = 0;
  for (let m = 0; m < modStarts.length; m++) {
    if (gi >= modStarts[m]) cnt++;
    else break;
  }
  return cnt;
}

function nodePos(gi: number, modStarts: number[]): { cx: number; cy: number } {
  const row   = Math.floor(gi / COLS);
  const col   = gi % COLS;
  const isLTR = row % 2 === 0;
  const cx    = COL_CX[isLTR ? col : COLS - 1 - col];
  const cy    = row * ROW_STRIDE + UNIT / 2 + hdrsBefore(gi, modStarts) * MOD_HDR_H;
  return { cx, cy };
}

// Single SVG path through all nodes (or up to `limit`)
function buildPath(
  total: number,
  modStarts: number[],
  limit?: number,
): string {
  const n = Math.min(total, limit ?? total);
  if (n === 0) return '';
  const pts = Array.from({ length: n }, (_, i) => ({
    ...nodePos(i, modStarts),
    row: Math.floor(i / COLS),
  }));
  if (n === 1) return `M ${pts[0].cx.toFixed(1)} ${pts[0].cy.toFixed(1)}`;

  let d = `M ${pts[0].cx.toFixed(1)} ${pts[0].cy.toFixed(1)}`;
  for (let i = 1; i < n; i++) {
    const p = pts[i - 1];
    const c = pts[i];
    if (p.row === c.row) {
      // Same row → straight horizontal segment
      d += ` L ${c.cx.toFixed(1)} ${c.cy.toFixed(1)}`;
    } else {
      // Row change → cubic-bezier U-turn (bulges away from centre)
      const bulge = p.cx > W / 2 ? CURVE : -CURVE;
      d += ` C ${(p.cx + bulge).toFixed(1)} ${p.cy.toFixed(1)},`;
      d += ` ${(c.cx + bulge).toFixed(1)} ${c.cy.toFixed(1)},`;
      d += ` ${c.cx.toFixed(1)} ${c.cy.toFixed(1)}`;
    }
  }
  return d;
}

// ── Flat node type ────────────────────────────────────────────────────────────
interface FlatNode {
  key:        string;
  label:      string;
  nodeType:   NodeType;
  state:      'complete' | 'active' | 'locked';
  hasContent: boolean;
  moduleIdx:  number;
  topicIdx:   number;
  isIntro:    boolean;
  slideCount?: number;
}

// ── PulseHalo ─────────────────────────────────────────────────────────────────
function PulseHalo({ color }: { color: string }) {
  const scale   = useSharedValue(0.85);
  const opacity = useSharedValue(0.50);
  useEffect(() => {
    scale.value   = withRepeat(withTiming(1.65, { duration: 1200, easing: Easing.out(Easing.quad) }), -1, true);
    opacity.value = withRepeat(withTiming(0,    { duration: 1200, easing: Easing.out(Easing.quad) }), -1, true);
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  const sz    = UNIT + 30;
  return (
    <Animated.View style={[{
      position: 'absolute',
      width: sz, height: sz, borderRadius: sz / 2,
      backgroundColor: color,
      top: -(sz - UNIT) / 2, left: -(sz - UNIT) / 2,
    }, style]} />
  );
}

// ── TrailNode ─────────────────────────────────────────────────────────────────
const TrailNode = React.memo(function TrailNode({
  node, cx, cy, isCurrNode, isPt, onPress, refCb,
}: {
  node:       FlatNode;
  cx:         number;
  cy:         number;
  isCurrNode: boolean;
  isPt:       boolean;
  onPress:    () => void;
  refCb?:     (r: any) => void;
}) {
  const cfg    = NODE_CONFIG[node.nodeType];
  const isComp = node.state === 'complete';
  const isLock = node.state === 'locked';
  const sz     = isLock ? NODE_LOCK : isCurrNode ? NODE + 6 : NODE;

  const shadow: object = isLock ? {} : (Platform.select({
    ios: {
      shadowColor:   cfg.color,
      shadowOpacity: isComp ? 0.55 : isCurrNode ? 0.32 : 0,
      shadowRadius:  isComp ? 18 : 12,
      shadowOffset:  { width: 0, height: isComp ? 7 : 4 },
    },
    android: { elevation: isComp ? 10 : isCurrNode ? 6 : 2 },
  }) ?? {});

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
      {/* Node circle + decorations */}
      <View style={{ width: UNIT, height: UNIT, alignItems: 'center', justifyContent: 'center' }}>
        {isCurrNode && <PulseHalo color={cfg.color} />}

        {/* Soft glow ring on completed nodes */}
        {isComp && (
          <View style={{
            position: 'absolute',
            width: UNIT + 10, height: UNIT + 10,
            borderRadius: (UNIT + 10) / 2,
            backgroundColor: a(cfg.color, 0.14),
          }} />
        )}

        <View style={{
          width: sz, height: sz, borderRadius: sz / 2,
          backgroundColor: isLock ? C.lockBg : isComp ? cfg.color : C.card,
          alignItems: 'center', justifyContent: 'center',
          opacity: isLock ? 0.55 : 1,
          borderWidth:  isLock ? 0 : isComp ? RING : 2,
          borderColor:  isComp ? darken(cfg.color, 0.12) : a(cfg.color, 0.32),
          ...shadow,
        }}>
          {isComp
            ? <CheckCircle size={22} color="#FFF" weight="fill" />
            : isLock
            ? <Lock size={15} color={C.lockGray} weight="fill" />
            : <cfg.Icon size={isCurrNode ? 23 : 21} color={cfg.color} weight="fill" />}
        </View>

        {/* XP badge */}
        {isCurrNode && (
          <View style={{
            position: 'absolute', top: 1, right: 0,
            backgroundColor: '#FF6B35', borderRadius: 8,
            paddingHorizontal: 5, paddingVertical: 1.5,
            borderWidth: 1.5, borderColor: C.card,
          }}>
            <AppText style={{ fontSize: 8, fontWeight: '900', color: '#FFF' }}>XP</AppText>
          </View>
        )}
      </View>

      {/* Label or dot */}
      {!isLock ? (
        <AppText style={{
          fontSize: 10, fontWeight: '700', textAlign: 'center',
          color: isComp ? cfg.color : isCurrNode ? cfg.color : C.navyMid,
          marginTop: 4, width: UNIT + 14,
        }} numberOfLines={1}>
          {isPt ? cfg.labelPt : cfg.label}
        </AppText>
      ) : (
        <View style={{
          width: 4, height: 4, borderRadius: 2,
          backgroundColor: C.lockGray, marginTop: 5, opacity: 0.55,
        }} />
      )}
    </TouchableOpacity>
  );
});

// ── Props ─────────────────────────────────────────────────────────────────────
interface TrailContentProps {
  userId:              string | undefined;
  level:               TrailLevel;
  showBanner?:         boolean;
  onCurrentTopicRef?:  (node: View | null) => void;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function TrailContent({ userId, level, onCurrentTopicRef }: TrailContentProps) {
  const isPt    = level === 'Novice';
  const accent  = LEVEL_COLOR[level];
  const modules = CURRICULUM[level];

  const {
    loading, refetch,
    isTopicComplete, isCurrent, isLocked, isIntroDone,
  } = useLearnProgress(userId, level);

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // ── Flat node list (all modules concatenated) ─────────────────────────────
  const allNodes = useMemo<FlatNode[]>(() => {
    const result: FlatNode[] = [];
    modules.forEach((mod, mIdx) => {
      const intro = MODULE_INTROS[level]?.[mIdx];
      if (intro) {
        const done        = isIntroDone(mIdx);
        const introLocked = mIdx > 0 && modules[mIdx - 1].topics.some((_, t) => !isTopicComplete(mIdx - 1, t));
        result.push({
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
        result.push({
          key: `m${mIdx}_t${tIdx}`, label: topic.title,
          nodeType: getNodeType(topic),
          state: complete ? 'complete' : locked ? 'locked' : 'active',
          hasContent: topicHasContent(level, mIdx, tIdx),
          moduleIdx: mIdx, topicIdx: tIdx, isIntro: false,
        });
      });
    });
    return result;
  }, [modules, level, isTopicComplete, isLocked, isIntroDone]);

  // ── Module start indices in allNodes ──────────────────────────────────────
  const modStarts = useMemo<number[]>(() => {
    const starts: number[] = [];
    let gi = 0;
    modules.forEach((mod, mIdx) => {
      starts.push(gi);
      const intro = MODULE_INTROS[level]?.[mIdx];
      gi += (intro ? 1 : 0) + mod.topics.length;
    });
    return starts;
  }, [modules, level]);

  // ── Canvas total height ───────────────────────────────────────────────────
  const canvasH = useMemo(() => {
    if (allNodes.length === 0) return 0;
    const last = nodePos(allNodes.length - 1, modStarts);
    return last.cy + UNIT / 2 + LABEL_H + 40;
  }, [allNodes.length, modStarts]);

  // ── SVG paths ─────────────────────────────────────────────────────────────
  const { fullPath, donePath } = useMemo(() => {
    const firstActive = allNodes.findIndex(n => n.state !== 'complete');
    const doneCount   = firstActive < 0 ? allNodes.length : firstActive + 1;
    return {
      fullPath: buildPath(allNodes.length, modStarts),
      donePath: doneCount > 1 ? buildPath(allNodes.length, modStarts, doneCount) : '',
    };
  }, [allNodes, modStarts]);

  // ── Module headers (absolute Y positions) ─────────────────────────────────
  const modHeaders = useMemo(() =>
    modules.map((mod, mIdx) => {
      const gi  = modStarts[mIdx];
      const pos = nodePos(gi, modStarts);
      return {
        mIdx,
        title: mod.title,
        y: pos.cy - UNIT / 2 - MOD_HDR_H,
      };
    }),
  [modules, modStarts]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleTap = useCallback((node: FlatNode) => {
    if (node.state === 'locked' || !node.hasContent) return;
    setSelectedKey(k => k === node.key ? null : node.key);
  }, []);

  const handleStart = useCallback((node: FlatNode) => {
    setSelectedKey(null);
    if (node.isIntro) {
      router.push({ pathname: '/(app)/learn-intro', params: { level, moduleIndex: String(node.moduleIdx), topicIndex: '0' } });
    } else {
      router.push({ pathname: '/(app)/learn-session', params: { level, moduleIndex: String(node.moduleIdx), topicIndex: String(node.topicIdx) } });
    }
  }, [level]);

  const selectedNode = allNodes.find(n => n.key === selectedKey);

  // ── Popup card ────────────────────────────────────────────────────────────
  const renderPopup = (node: FlatNode) => {
    const cfg    = NODE_CONFIG[node.nodeType];
    const isComp = node.state === 'complete';
    return (
      <View style={{
        marginHorizontal: H_PAD - 4, marginTop: 12, marginBottom: 4,
        backgroundColor: cfg.color, borderRadius: 24, overflow: 'hidden',
        ...Platform.select({
          ios:     { shadowColor: cfg.color, shadowOpacity: 0.48, shadowRadius: 22, shadowOffset: { width: 0, height: 8 } },
          android: { elevation: 12 },
        }),
      }}>
        {/* Header strip */}
        <View style={{
          backgroundColor: darken(cfg.color, 0.22), paddingHorizontal: 20,
          paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 8,
        }}>
          <cfg.Icon size={14} color="rgba(255,255,255,0.72)" weight="fill" />
          <AppText style={{ fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.72)', letterSpacing: 0.8 }}>
            {isPt ? cfg.labelPt.toUpperCase() : cfg.label.toUpperCase()}
          </AppText>
        </View>

        {/* Body */}
        <View style={{ padding: 20, paddingTop: 16 }}>
          <AppText style={{ fontSize: 18, fontWeight: '900', color: '#FFF', lineHeight: 26, marginBottom: 4 }}>
            {node.label}
          </AppText>
          <AppText style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)', marginBottom: 20 }}>
            {node.isIntro && node.slideCount
              ? `${node.slideCount} slides`
              : isPt ? 'Topico de aprendizagem' : 'Learning topic'}
          </AppText>
          <TouchableOpacity
            onPress={() => handleStart(node)}
            activeOpacity={0.85}
            style={{
              backgroundColor: '#FFF', borderRadius: 18, paddingVertical: 15,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <AppText style={{ fontSize: 16, fontWeight: '900', color: cfg.color }}>
              {isComp
                ? (isPt ? 'Revisar' : 'Review')
                : (isPt ? 'Comecar  +20 XP' : 'Start  +20 XP')}
            </AppText>
            <CaretRight size={17} color={cfg.color} weight="bold" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Loading ───────────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={{ paddingBottom: 40 }}>
      {/* Unified trail canvas */}
      <View style={{ height: canvasH, position: 'relative' }}>

        {/* SVG path backbone */}
        <Svg width={W} height={canvasH} style={{ position: 'absolute', top: 0, left: 0 }}>
          {fullPath ? (
            <Path
              d={fullPath}
              stroke={a(accent, 0.14)}
              strokeWidth={PATH_W}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {donePath ? (
            <Path
              d={donePath}
              stroke={a(accent, 0.52)}
              strokeWidth={PATH_W}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>

        {/* Module header labels (float over the path) */}
        {modHeaders.map(({ mIdx, title, y }) => (
          <View
            key={`hdr_${mIdx}`}
            style={{
              position: 'absolute',
              left: 0, right: 0,
              top: y,
              height: MOD_HDR_H,
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingBottom: 14,
            }}
          >
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              marginBottom: 6, paddingHorizontal: H_PAD,
              alignSelf: 'stretch',
            }}>
              <View style={{ flex: 1, height: 1, backgroundColor: a(accent, 0.14) }} />
              <View style={{
                backgroundColor: accent, borderRadius: 20,
                paddingHorizontal: 14, paddingVertical: 5,
              }}>
                <AppText style={{ fontSize: 10, fontWeight: '900', color: '#FFF', letterSpacing: 0.9 }}>
                  {isPt ? `MODULO ${mIdx + 1}` : `MODULE ${mIdx + 1}`}
                </AppText>
              </View>
              <View style={{ flex: 1, height: 1, backgroundColor: a(accent, 0.14) }} />
            </View>
            <AppText style={{
              fontSize: 13, fontWeight: '800', color: C.navy,
              textAlign: 'center', lineHeight: 19,
              paddingHorizontal: H_PAD + 4,
            }} numberOfLines={1}>
              {title}
            </AppText>
          </View>
        ))}

        {/* Trail nodes */}
        {allNodes.map((node, gi) => {
          const { cx, cy } = nodePos(gi, modStarts);
          const isCurrNode = node.state === 'active' && isCurrent(node.moduleIdx, node.topicIdx);
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

      {/* Popup for selected node — appears below the canvas */}
      {selectedNode && renderPopup(selectedNode)}
    </View>
  );
}
