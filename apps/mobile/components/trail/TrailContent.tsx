// components/trail/TrailContent.tsx — v6
// Slot-based layout: each module padded to row boundary → no diagonal lines.
// COLS=4, single SVG canvas, continuous cross-module path.

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View, TouchableOpacity, ActivityIndicator, Platform, Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { router, useFocusEffect } from 'expo-router';
import {
  BookOpen, Microphone, Star, ChatCircle, CaretRight,
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
  lockFill:  '#C8C4DC',   // solid fill for locked nodes
  lockRing:  '#B0ABCC',   // ring/border for locked nodes
  card:      '#FFFFFF',
};
const LEVEL_COLOR: Record<TrailLevel, string> = {
  Novice:   '#D97706',
  Inter:    '#7C3AED',
  Advanced: '#0F766E',
};

// ── Node types ────────────────────────────────────────────────────────────────
type NodeType = 'grammar' | 'speaking' | 'roleplay' | 'chat';
const NODE_CONFIG: Record<NodeType, {
  color: string; Icon: any; label: string; labelPt: string;
}> = {
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
const NODE       = 50;         // diameter — same for all states
const RING       = 4;
const UNIT       = NODE + RING * 2;   // 58 — slot footprint
const GAP        = (W - H_PAD * 2 - UNIT * COLS) / (COLS - 1);
const LABEL_H    = 17;
const ROW_GAP    = 30;
const ROW_STRIDE = UNIT + LABEL_H + ROW_GAP;  // ~105
const PATH_W     = 4;
const CURVE      = Math.max(GAP * 0.70, 16);
// Vertical canvas space reserved per module header (sits above the module's first row)
const MOD_HDR_H  = 72;

// Column centres, left-to-right
const COL_CX = Array.from(
  { length: COLS },
  (_, c) => H_PAD + c * (UNIT + GAP) + UNIT / 2,
);

/**
 * modStarts[m] is always a multiple of COLS (guaranteed by padding in buildSlots).
 * So hdrsBefore(si) = number of modules whose start index <= si = module index + 1
 * for every slot within module m.
 */
function hdrsBefore(si: number, modStarts: number[]): number {
  let cnt = 0;
  for (let m = 0; m < modStarts.length; m++) {
    if (si >= modStarts[m]) cnt++;
    else break;
  }
  return cnt;
}

function slotPos(si: number, modStarts: number[]): { cx: number; cy: number } {
  const row   = Math.floor(si / COLS);
  const col   = si % COLS;
  const isLTR = row % 2 === 0;
  const cx    = COL_CX[isLTR ? col : COLS - 1 - col];
  const cy    = row * ROW_STRIDE + UNIT / 2 + hdrsBefore(si, modStarts) * MOD_HDR_H;
  return { cx, cy };
}

/** Build SVG path through all slot positions (including invisible pads). */
function buildSvgPath(
  totalSlots: number,
  modStarts:  number[],
  limit?:     number,
): string {
  const n = Math.min(totalSlots, limit ?? totalSlots);
  if (n < 1) return '';
  const pts = Array.from({ length: n }, (_, si) => ({
    ...slotPos(si, modStarts),
    row: Math.floor(si / COLS),
  }));
  if (n === 1) return `M ${pts[0].cx.toFixed(1)} ${pts[0].cy.toFixed(1)}`;

  let d = `M ${pts[0].cx.toFixed(1)} ${pts[0].cy.toFixed(1)}`;
  for (let i = 1; i < n; i++) {
    const p = pts[i - 1];
    const c = pts[i];
    if (p.row === c.row) {
      // Same row — guaranteed same cy now that modules are row-aligned
      d += ` L ${c.cx.toFixed(1)} ${c.cy.toFixed(1)}`;
    } else {
      // Row change → cubic-bezier U-turn, bulges away from screen centre
      const bulge = p.cx > W / 2 ? CURVE : -CURVE;
      d += ` C ${(p.cx + bulge).toFixed(1)} ${p.cy.toFixed(1)},`;
      d += ` ${(c.cx + bulge).toFixed(1)} ${c.cy.toFixed(1)},`;
      d += ` ${c.cx.toFixed(1)} ${c.cy.toFixed(1)}`;
    }
  }
  return d;
}

// ── Data types ────────────────────────────────────────────────────────────────
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

// Discriminated union: visible node or invisible row-alignment padding
type Slot = { kind: 'node'; node: FlatNode } | { kind: 'pad' };

// ── PulseHalo ─────────────────────────────────────────────────────────────────
function PulseHalo({ color }: { color: string }) {
  const scale   = useSharedValue(1.0);
  const opacity = useSharedValue(0.14);
  useEffect(() => {
    scale.value   = withRepeat(withTiming(1.22, { duration: 2400, easing: Easing.out(Easing.ease) }), -1, true);
    opacity.value = withRepeat(withTiming(0,    { duration: 2400, easing: Easing.out(Easing.ease) }), -1, true);
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }], opacity: opacity.value,
  }));
  const sz = UNIT + 6;   // barely extends beyond the node border
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

  // Shadow only for complete/active (not locked — they must block the path behind)
  const shadow: object = isLock ? {} : (Platform.select({
    ios: {
      shadowColor:   cfg.color,
      shadowOpacity: isComp ? 0.40 : 0.20,
      shadowRadius:  isComp ? 12 : 8,
      shadowOffset:  { width: 0, height: isComp ? 5 : 3 },
    },
    android: { elevation: isComp ? 8 : isCurrNode ? 4 : 2 },
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
      <View style={{ width: UNIT, height: UNIT, alignItems: 'center', justifyContent: 'center' }}>
        {/* Subtle pulse — current node only */}
        {isCurrNode && <PulseHalo color={cfg.color} />}

        {/*
          All nodes are NODE×NODE — same size regardless of state.
          Complete  → filled accent color + thick ring border, no icon
          Active    → white fill + thick colored ring (progress indicator) + icon
          Locked    → solid gray fill + gray ring, fully opaque (covers path), no icon
        */}
        <View style={{
          width: NODE, height: NODE, borderRadius: NODE / 2,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: isLock ? C.lockFill : isComp ? cfg.color : C.card,
          borderWidth: RING,
          borderColor: isLock
            ? C.lockRing
            : isComp
            ? darken(cfg.color, 0.15)
            : cfg.color,
          ...shadow,
        }}>
          {/* Icon only on active nodes */}
          {!isComp && !isLock && (
            <cfg.Icon size={21} color={cfg.color} weight="fill" />
          )}
        </View>

        {/* XP badge on current node */}
        {isCurrNode && (
          <View style={{
            position: 'absolute', top: 1, right: 2,
            backgroundColor: '#FF6B35', borderRadius: 8,
            paddingHorizontal: 5, paddingVertical: 1.5,
            borderWidth: 1.5, borderColor: C.card,
          }}>
            <AppText style={{ fontSize: 8, fontWeight: '900', color: '#FFF' }}>XP</AppText>
          </View>
        )}
      </View>

      {/* Label — same for all states; gray for locked */}
      <AppText style={{
        fontSize: 10, fontWeight: '700', textAlign: 'center',
        color: isLock ? C.lockRing : isComp ? cfg.color : cfg.color,
        marginTop: 4, width: UNIT + 14,
      }} numberOfLines={1}>
        {isPt ? cfg.labelPt : cfg.label}
      </AppText>
    </TouchableOpacity>
  );
});

// ── Props ─────────────────────────────────────────────────────────────────────
interface TrailContentProps {
  userId:             string | undefined;
  level:              TrailLevel;
  showBanner?:        boolean;
  onCurrentTopicRef?: (node: View | null) => void;
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

  // ── Slot list + module start indices ─────────────────────────────────────
  const { slots, modStarts } = useMemo(() => {
    const slotsArr:  Slot[]   = [];
    const startsArr: number[] = [];

    modules.forEach((mod, mIdx) => {
      // Record where this module begins in the slot array
      startsArr.push(slotsArr.length);

      // Build all nodes for this module into a temp list, then cap at COLS (4).
      // This keeps each module as exactly one row of 4 checkpoints.
      const modNodes: { kind: 'node'; node: FlatNode }[] = [];

      // Optional mini-lesson intro
      const intro = MODULE_INTROS[level]?.[mIdx];
      if (intro) {
        const done        = isIntroDone(mIdx);
        const introLocked = mIdx > 0 &&
          modules[mIdx - 1].topics.some((_, t) => !isTopicComplete(mIdx - 1, t));
        modNodes.push({
          kind: 'node',
          node: {
            key: `m${mIdx}_intro`, label: intro.title, nodeType: 'grammar',
            state: done ? 'complete' : introLocked ? 'locked' : 'active',
            hasContent: true, moduleIdx: mIdx, topicIdx: -1,
            isIntro: true, slideCount: intro.slides.length,
          },
        });
      }

      // Topics
      mod.topics.forEach((topic, tIdx) => {
        const complete = isTopicComplete(mIdx, tIdx);
        const miniReq  = tIdx === 0 && !isIntroDone(mIdx);
        const locked   = !complete && (miniReq || isLocked(mIdx, tIdx));
        modNodes.push({
          kind: 'node',
          node: {
            key: `m${mIdx}_t${tIdx}`, label: topic.title,
            nodeType: getNodeType(topic),
            state: complete ? 'complete' : locked ? 'locked' : 'active',
            hasContent: topicHasContent(level, mIdx, tIdx),
            moduleIdx: mIdx, topicIdx: tIdx, isIntro: false,
          },
        });
      });

      // Cap at COLS (4) — one row per module
      const visible = modNodes.slice(0, COLS);
      visible.forEach(s => slotsArr.push(s));

      // Pad to next row boundary so the next module always starts at col 0
      const rem = slotsArr.length % COLS;
      if (rem !== 0) {
        for (let p = 0; p < COLS - rem; p++) slotsArr.push({ kind: 'pad' });
      }
    });

    return { slots: slotsArr, modStarts: startsArr };
  }, [modules, level, isTopicComplete, isLocked, isIntroDone]);

  const totalSlots = slots.length;

  // ── Canvas height ─────────────────────────────────────────────────────────
  const canvasH = useMemo(() => {
    if (totalSlots === 0) return 0;
    const last = slotPos(totalSlots - 1, modStarts);
    return last.cy + UNIT / 2 + LABEL_H + 40;
  }, [totalSlots, modStarts]);

  // ── SVG paths ─────────────────────────────────────────────────────────────
  const { fullPath, donePath } = useMemo(() => {
    // Slot index of first non-complete node (done path includes active node)
    const firstActiveSi = slots.findIndex(
      s => s.kind === 'node' && s.node.state !== 'complete',
    );
    const doneCount = firstActiveSi < 0 ? totalSlots : firstActiveSi + 1;
    return {
      fullPath: buildSvgPath(totalSlots, modStarts),
      donePath: doneCount > 1 ? buildSvgPath(totalSlots, modStarts, doneCount) : '',
    };
  }, [slots, totalSlots, modStarts]);

  // ── Module header positions ────────────────────────────────────────────────
  const modHeaders = useMemo(() =>
    modules.map((mod, mIdx) => {
      const si  = modStarts[mIdx];
      const pos = slotPos(si, modStarts);
      return { mIdx, title: mod.title, y: pos.cy - UNIT / 2 - MOD_HDR_H };
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

  const selectedNode = useMemo(() => {
    for (const s of slots) {
      if (s.kind === 'node' && s.node.key === selectedKey) return s.node;
    }
    return null;
  }, [slots, selectedKey]);

  // ── Popup card ─────────────────────────────────────────────────────────────
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
      {/* Single unified canvas for all modules */}
      <View style={{ height: canvasH, position: 'relative' }}>

        {/* SVG backbone — faint full trail + accent progress overlay */}
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

        {/* Module headers float above each module's first row */}
        {modHeaders.map(({ mIdx, title, y }) => (
          <View key={`hdr_${mIdx}`} style={{
            position: 'absolute', left: 0, right: 0,
            top: y, height: MOD_HDR_H,
            justifyContent: 'center', paddingHorizontal: H_PAD,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: a(accent, 0.22) }} />
              <AppText style={{ fontSize: 13, fontWeight: '800', color: C.navy, flexShrink: 1 }}
                numberOfLines={1}>
                {title}
              </AppText>
              <View style={{ flex: 1, height: 1, backgroundColor: a(accent, 0.22) }} />
            </View>
          </View>
        ))}

        {/* Trail nodes — pads are skipped (invisible) */}
        {slots.map((slot, si) => {
          if (slot.kind === 'pad') return null;
          const node       = slot.node;
          const { cx, cy } = slotPos(si, modStarts);
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

      {/* Popup for selected node */}
      {selectedNode !== null && renderPopup(selectedNode)}
    </View>
  );
}
