// components/trail/TrailContent.tsx — v7
// 4 colunas, tipos por posição, linhas tracejadas, espaçamento uniforme.

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
  BookOpen, Microphone, Play, ChatCircle, CaretRight,
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
  lockFill:  '#C8C4DC',
  lockRing:  '#ADA8C8',
  lockIcon:  '#9B96B8',
  card:      '#FFFFFF',
};
const LEVEL_COLOR: Record<TrailLevel, string> = {
  Novice:   '#D97706',
  Inter:    '#7C3AED',
  Advanced: '#0F766E',
};

// ── Node types — fixed cycle per position within module ───────────────────────
type NodeType = 'grammar' | 'speaking' | 'roleplay' | 'chat';
const TYPE_CYCLE: NodeType[] = ['grammar', 'speaking', 'roleplay', 'chat'];

const NODE_CONFIG: Record<NodeType, {
  color: string; Icon: any; label: string; labelPt: string;
}> = {
  grammar:  { color: '#D97706', Icon: BookOpen,   label: 'Grammar',      labelPt: 'Gramatica'   },
  speaking: { color: '#7C3AED', Icon: Microphone, label: 'Speaking',     labelPt: 'Pronuncia'   },
  roleplay: { color: '#3D8800', Icon: Play,        label: 'Role-play',    labelPt: 'Role-play'   },
  chat:     { color: '#16153A', Icon: ChatCircle,  label: 'Guided Chat',  labelPt: 'Chat Guiado' },
};

// ── Layout ────────────────────────────────────────────────────────────────────
const W          = Dimensions.get('window').width;
const H_PAD      = 20;
const COLS       = 4;
const NODE       = 50;          // diameter — all states
const BORDER_W   = 1.5;         // delicate border
const UNIT       = NODE + 8;    // 58 — slot footprint (4px buffer each side)
const GAP        = (W - H_PAD * 2 - UNIT * COLS) / (COLS - 1);
const ROW_GAP    = 28;
const ROW_STRIDE = UNIT + ROW_GAP;   // no LABEL_H — labels removed
const TOP_PAD    = ROW_GAP / 2;      // = 14 — equal space above and below each row
const PATH_W     = 3;
const CURVE      = Math.max(GAP * 0.65, 14);
const MOD_HDR_H  = 52;               // header block height

const COL_CX = Array.from(
  { length: COLS },
  (_, c) => H_PAD + c * (UNIT + GAP) + UNIT / 2,
);

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
  // TOP_PAD creates equal space above and below each module row
  const cy    = row * ROW_STRIDE + UNIT / 2 + hdrsBefore(si, modStarts) * MOD_HDR_H + TOP_PAD;
  return { cx, cy };
}

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
      d += ` L ${c.cx.toFixed(1)} ${c.cy.toFixed(1)}`;
    } else {
      const bulge = p.cx > W / 2 ? CURVE : -CURVE;
      d += ` C ${(p.cx + bulge).toFixed(1)} ${p.cy.toFixed(1)},`;
      d += ` ${(c.cx + bulge).toFixed(1)} ${c.cy.toFixed(1)},`;
      d += ` ${c.cx.toFixed(1)} ${c.cy.toFixed(1)}`;
    }
  }
  return d;
}

// ── FlatNode ──────────────────────────────────────────────────────────────────
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

type Slot = { kind: 'node'; node: FlatNode } | { kind: 'pad' };

// ── PulseHalo — barely visible, just a breath ────────────────────────────────
function PulseHalo({ color }: { color: string }) {
  const scale   = useSharedValue(1.0);
  const opacity = useSharedValue(0.12);
  useEffect(() => {
    scale.value   = withRepeat(withTiming(1.18, { duration: 2400, easing: Easing.out(Easing.ease) }), -1, true);
    opacity.value = withRepeat(withTiming(0,    { duration: 2400, easing: Easing.out(Easing.ease) }), -1, true);
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }], opacity: opacity.value,
  }));
  const sz = NODE + 4;   // barely extends beyond the node edge
  return (
    <Animated.View style={[{
      position: 'absolute',
      width: sz, height: sz, borderRadius: sz / 2,
      backgroundColor: color,
      top: (UNIT - sz) / 2, left: (UNIT - sz) / 2,
    }, style]} />
  );
}

// ── TrailNode ─────────────────────────────────────────────────────────────────
const TrailNode = React.memo(function TrailNode({
  node, cx, cy, isCurrNode, onPress, refCb,
}: {
  node:       FlatNode;
  cx:         number;
  cy:         number;
  isCurrNode: boolean;
  onPress:    () => void;
  refCb?:     (r: any) => void;
}) {
  const cfg    = NODE_CONFIG[node.nodeType];
  const isComp = node.state === 'complete';
  const isLock = node.state === 'locked';

  const shadow: object = isLock ? {} : (Platform.select({
    ios: {
      shadowColor:   cfg.color,
      shadowOpacity: isComp ? 0.35 : 0.18,
      shadowRadius:  isComp ? 10 : 6,
      shadowOffset:  { width: 0, height: isComp ? 4 : 2 },
    },
    android: { elevation: isComp ? 6 : isCurrNode ? 4 : 1 },
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
        width: UNIT, height: UNIT,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Subtle pulse — current node only */}
      {isCurrNode && <PulseHalo color={cfg.color} />}

      {/*
        All states use NODE × NODE circle.
        Complete → solid type color, thin ring, no icon.
        Active   → white fill, colored ring (progress indicator), type icon.
        Locked   → solid gray, gray ring, type icon in gray.
      */}
      <View style={{
        width: NODE, height: NODE, borderRadius: NODE / 2,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: isLock ? C.lockFill : isComp ? cfg.color : C.card,
        borderWidth: BORDER_W,
        borderColor:  isLock
          ? C.lockRing
          : isComp
          ? darken(cfg.color, 0.18)
          : cfg.color,
        ...shadow,
      }}>
        {/* Icon: active shows type icon; locked shows type icon in gray; complete shows nothing */}
        {!isComp && (
          <cfg.Icon
            size={20}
            color={isLock ? C.lockIcon : cfg.color}
            weight="fill"
          />
        )}
      </View>

      {/* XP badge — current node only */}
      {isCurrNode && (
        <View style={{
          position: 'absolute', top: 2, right: 2,
          backgroundColor: '#FF6B35', borderRadius: 7,
          paddingHorizontal: 4, paddingVertical: 1,
          borderWidth: 1.5, borderColor: C.card,
        }}>
          <AppText style={{ fontSize: 8, fontWeight: '900', color: '#FFF' }}>XP</AppText>
        </View>
      )}
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

  // ── Slot list: node types assigned by position (grammar→speaking→roleplay→chat) ──
  const { slots, modStarts } = useMemo(() => {
    const slotsArr:  Slot[]   = [];
    const startsArr: number[] = [];

    modules.forEach((mod, mIdx) => {
      startsArr.push(slotsArr.length);

      const modNodes: { kind: 'node'; node: FlatNode }[] = [];
      let pos = 0;   // position within this module (determines type)

      // Optional mini-lesson intro
      const intro = MODULE_INTROS[level]?.[mIdx];
      if (intro) {
        const done        = isIntroDone(mIdx);
        const introLocked = mIdx > 0 &&
          modules[mIdx - 1].topics.some((_, t) => !isTopicComplete(mIdx - 1, t));
        modNodes.push({
          kind: 'node',
          node: {
            key: `m${mIdx}_intro`, label: intro.title,
            nodeType: TYPE_CYCLE[pos++] ?? 'grammar',
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
            nodeType: TYPE_CYCLE[pos++] ?? 'grammar',
            state: complete ? 'complete' : locked ? 'locked' : 'active',
            hasContent: topicHasContent(level, mIdx, tIdx),
            moduleIdx: mIdx, topicIdx: tIdx, isIntro: false,
          },
        });
      });

      // Cap at COLS (4) — one row per module
      modNodes.slice(0, COLS).forEach(s => slotsArr.push(s));

      // Pad to next row boundary
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
    return last.cy + UNIT / 2 + TOP_PAD + 24;
  }, [totalSlots, modStarts]);

  // ── SVG paths ─────────────────────────────────────────────────────────────
  const { fullPath, donePath } = useMemo(() => {
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
  // y = cy - UNIT/2 - MOD_HDR_H - TOP_PAD ensures TOP_PAD gap above nodes
  const modHeaders = useMemo(() =>
    modules.map((mod, mIdx) => {
      const si  = modStarts[mIdx];
      const pos = slotPos(si, modStarts);
      return { mIdx, title: mod.title, y: pos.cy - UNIT / 2 - MOD_HDR_H - TOP_PAD };
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
          ios:     { shadowColor: cfg.color, shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 7 } },
          android: { elevation: 10 },
        }),
      }}>
        <View style={{
          backgroundColor: darken(cfg.color, 0.20), paddingHorizontal: 20,
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
      <View style={{ height: canvasH, position: 'relative' }}>

        {/* SVG backbone — dashed lines */}
        <Svg width={W} height={canvasH} style={{ position: 'absolute', top: 0, left: 0 }}>
          {fullPath ? (
            <Path
              d={fullPath}
              stroke={a(accent, 0.20)}
              strokeWidth={PATH_W}
              strokeDasharray="7 5"
              fill="none"
              strokeLinecap="round"
            />
          ) : null}
          {donePath ? (
            <Path
              d={donePath}
              stroke={a(accent, 0.55)}
              strokeWidth={PATH_W}
              strokeDasharray="7 5"
              fill="none"
              strokeLinecap="round"
            />
          ) : null}
        </Svg>

        {/* Module headers: ── Title ── with short lines */}
        {modHeaders.map(({ mIdx, title, y }) => (
          <View key={`hdr_${mIdx}`} style={{
            position: 'absolute', left: H_PAD, right: H_PAD,
            top: y, height: MOD_HDR_H,
            justifyContent: 'center',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {/* Short decorative lines — do NOT extend to screen edge */}
              <View style={{ width: 28, height: 1, backgroundColor: a(accent, 0.30) }} />
              <AppText style={{
                fontSize: 13, fontWeight: '800', color: C.navy,
                flexShrink: 1,
              }} numberOfLines={1}>
                {title}
              </AppText>
              <View style={{ width: 28, height: 1, backgroundColor: a(accent, 0.30) }} />
            </View>
          </View>
        ))}

        {/* Trail nodes */}
        {slots.map((slot, si) => {
          if (slot.kind === 'pad') return null;
          const node       = slot.node;
          const { cx, cy } = slotPos(si, modStarts);
          const isCurrNode = node.state === 'active' && isCurrent(node.moduleIdx, node.topicIdx);
          return (
            <TrailNode
              key={node.key}
              node={node} cx={cx} cy={cy}
              isCurrNode={isCurrNode}
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
