// components/trail/TrailContent.tsx
// Snake-trail layout: circular checkpoints in a 4-column grid, alternating row direction.
// Each topic = 1 node. Module headers are full-width separators.
// Popup card appears inline below the selected row (Duolingo-style).

import React, { useCallback, useState } from 'react';
import {
  View, TouchableOpacity, ActivityIndicator, Platform, Dimensions,
} from 'react-native';
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

// ── Color helper ─────────────────────────────────────────────────────────────
function a(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  border:    'rgba(22,21,58,0.12)',
  ghost:     'rgba(22,21,58,0.06)',
  lockGray:  '#B0AECB',
  lockBg:    '#ECEAF6',
};

const LEVEL_COLOR: Record<TrailLevel, string> = {
  Novice:   '#D97706',
  Inter:    '#7C3AED',
  Advanced: '#0F766E',
};

// ── Node types ───────────────────────────────────────────────────────────────
type NodeType = 'grammar' | 'speaking' | 'roleplay' | 'chat';

const NODE_CONFIG: Record<NodeType, {
  color:   string;
  Icon:    React.ComponentType<any>;
  label:   string;
  labelPt: string;
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

// ── Layout constants ─────────────────────────────────────────────────────────
const W        = Dimensions.get('window').width;
const H_PAD    = 20;    // horizontal padding of trail area
const COLS     = 4;
const NODE     = 56;    // inner circle diameter
const RING     = 4;     // progress ring stroke width
const UNIT     = NODE + RING * 2;                                // 64 — node footprint incl. ring
const GAP      = (W - H_PAD * 2 - UNIT * COLS) / (COLS - 1);   // gap between nodes in a row
const EDGE_CTR = H_PAD + UNIT / 2;                              // dist. from edge to node center

// ── SVG progress ring ────────────────────────────────────────────────────────
function ProgressRing({ fraction, color }: { fraction: number; color: string }) {
  if (fraction <= 0) return null;
  const sz   = UNIT;
  const r    = (sz - RING) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(1, fraction);
  return (
    <Svg width={sz} height={sz} style={{ position: 'absolute', top: 0, left: 0 }}>
      <Circle
        cx={sz / 2} cy={sz / 2} r={r}
        stroke={a(color, 0.20)} strokeWidth={RING} fill="none"
        rotation={-90} origin={`${sz / 2},${sz / 2}`}
      />
      <Circle
        cx={sz / 2} cy={sz / 2} r={r}
        stroke={color} strokeWidth={RING} fill="none"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        rotation={-90} origin={`${sz / 2},${sz / 2}`}
      />
    </Svg>
  );
}

// ── Horizontal dash connector ─────────────────────────────────────────────────
function HorizDash() {
  const dW    = 5;
  const dGap  = 3;
  const count = Math.max(1, Math.floor(GAP / (dW + dGap)));
  return (
    <View style={{
      width: GAP,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: dGap,
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ width: dW, height: 2, backgroundColor: C.border, borderRadius: 1 }} />
      ))}
    </View>
  );
}

// ── Vertical snake connector (end-of-row turn) ───────────────────────────────
function VertDash({ side }: { side: 'left' | 'right' }) {
  // Center the connector on the edge node column.
  // EDGE_CTR = distance from screen edge to node center → pad by (EDGE_CTR - 1) from that edge.
  const pad = EDGE_CTR - 1;
  return (
    <View style={{
      alignItems: side === 'right' ? 'flex-end' : 'flex-start',
      paddingRight: side === 'right' ? pad : 0,
      paddingLeft:  side === 'left'  ? pad : 0,
      paddingVertical: 4,
    }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 2, height: 5, borderRadius: 1,
            backgroundColor: C.border,
            marginBottom: i < 4 ? 4 : 0,
          }}
        />
      ))}
    </View>
  );
}

// ── Flat node ────────────────────────────────────────────────────────────────
interface FlatNode {
  key:        string;
  label:      string;
  nodeType:   NodeType;
  state:      'complete' | 'active' | 'locked';
  hasContent: boolean;
  moduleIdx:  number;
  topicIdx:   number;   // -1 for module intro
  isIntro:    boolean;
  slideCount?: number;
}

// ── Props ────────────────────────────────────────────────────────────────────
interface TrailContentProps {
  userId:             string | undefined;
  level:              TrailLevel;
  showBanner?:        boolean;  // kept for API compat — banner lives in TrailBanner.tsx
  onCurrentTopicRef?: (node: View | null) => void;
}

// ── Component ────────────────────────────────────────────────────────────────
export function TrailContent({
  userId, level, onCurrentTopicRef,
}: TrailContentProps) {
  const isPt    = level === 'Novice';
  const accent  = LEVEL_COLOR[level];
  const modules = CURRICULUM[level];

  const { loading, refetch, isTopicComplete, isCurrent, isLocked, isIntroDone } =
    useLearnProgress(userId, level);

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // ── Build flat node groups per module ──────────────────────────────────────
  const groups = modules.map((mod, mIdx) => {
    const nodes: FlatNode[] = [];

    // Module intro mini-lesson
    const intro = MODULE_INTROS[level]?.[mIdx];
    if (intro) {
      const done = isIntroDone(mIdx);
      const introLocked =
        mIdx > 0 &&
        modules[mIdx - 1].topics.some((_, tIdx) => !isTopicComplete(mIdx - 1, tIdx));
      nodes.push({
        key:        `m${mIdx}_intro`,
        label:      intro.title,
        nodeType:   'grammar',
        state:      done ? 'complete' : introLocked ? 'locked' : 'active',
        hasContent: true,
        moduleIdx:  mIdx,
        topicIdx:   -1,
        isIntro:    true,
        slideCount: intro.slides.length,
      });
    }

    // Topics
    mod.topics.forEach((topic, tIdx) => {
      const complete     = isTopicComplete(mIdx, tIdx);
      const miniRequired = tIdx === 0 && !isIntroDone(mIdx);
      const locked       = !complete && (miniRequired || isLocked(mIdx, tIdx));
      nodes.push({
        key:        `m${mIdx}_t${tIdx}`,
        label:      topic.title,
        nodeType:   getNodeType(topic),
        state:      complete ? 'complete' : locked ? 'locked' : 'active',
        hasContent: topicHasContent(level, mIdx, tIdx),
        moduleIdx:  mIdx,
        topicIdx:   tIdx,
        isIntro:    false,
      });
    });

    return { mIdx, title: mod.title, nodes };
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleTap = (node: FlatNode) => {
    if (node.state === 'locked' || !node.hasContent) return;
    setSelectedKey(k => (k === node.key ? null : node.key));
  };

  const handleStart = (node: FlatNode) => {
    setSelectedKey(null);
    if (node.isIntro) {
      router.push({
        pathname: '/(app)/learn-intro',
        params: { level, moduleIndex: String(node.moduleIdx), topicIndex: '0' },
      });
    } else {
      router.push({
        pathname: '/(app)/learn-session',
        params: { level, moduleIndex: String(node.moduleIdx), topicIndex: String(node.topicIdx) },
      });
    }
  };

  // ── Node circle ───────────────────────────────────────────────────────────
  const renderNode = (node: FlatNode) => {
    const cfg      = NODE_CONFIG[node.nodeType];
    const isComp   = node.state === 'complete';
    const isLock   = node.state === 'locked';
    const isCurrNode = node.state === 'active' && isCurrent(node.moduleIdx, node.topicIdx);
    const ring     = isComp ? 1 : isCurrNode ? 0.45 : 0;

    const bgColor   = isComp ? cfg.color : isLock ? C.lockBg : C.card;
    const iconColor = isComp ? '#FFF' : isLock ? C.lockGray : cfg.color;

    const nodeShadow = Platform.select({
      ios: {
        shadowColor:   isLock ? 'transparent' : cfg.color,
        shadowOpacity: 0.28,
        shadowRadius:  10,
        shadowOffset:  { width: 0, height: 4 },
      },
      android: { elevation: isLock ? 1 : 4 },
    });

    return (
      <View style={{ alignItems: 'center' }}>
        {/* Ring + circle container */}
        <View style={{ width: UNIT, height: UNIT, alignItems: 'center', justifyContent: 'center', ...nodeShadow }}>
          <ProgressRing fraction={ring} color={cfg.color} />
          <View style={{
            width: NODE, height: NODE, borderRadius: NODE / 2,
            backgroundColor: bgColor,
            borderWidth: isComp || isLock ? 0 : 2,
            borderColor: a(cfg.color, 0.30),
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {isComp
              ? <CheckCircle size={26} color="#FFF" weight="fill" />
              : isLock
              ? <Lock size={22} color={C.lockGray} weight="fill" />
              : <cfg.Icon size={24} color={iconColor} weight="fill" />
            }
          </View>
        </View>
        {/* Label */}
        <AppText style={{
          fontSize: 10, fontWeight: '600', textAlign: 'center',
          color: isLock ? C.lockGray : C.navyMid,
          marginTop: 5, maxWidth: UNIT + 8,
        }} numberOfLines={2}>
          {isPt ? cfg.labelPt : cfg.label}
        </AppText>
      </View>
    );
  };

  // ── Popup card (inline below selected row) ────────────────────────────────
  const renderPopup = (node: FlatNode) => {
    const cfg    = NODE_CONFIG[node.nodeType];
    const isComp = node.state === 'complete';
    return (
      <View style={{
        marginHorizontal: H_PAD,
        marginTop: 10,
        marginBottom: 6,
        backgroundColor: cfg.color,
        borderRadius: 20,
        padding: 18,
        ...Platform.select({
          ios: {
            shadowColor:   cfg.color,
            shadowOpacity: 0.40,
            shadowRadius:  18,
            shadowOffset:  { width: 0, height: 6 },
          },
          android: { elevation: 8 },
        }),
      }}>
        <AppText style={{
          fontSize: 11, fontWeight: '800',
          color: 'rgba(255,255,255,0.75)', letterSpacing: 0.6, marginBottom: 3,
        }}>
          {isPt ? cfg.labelPt.toUpperCase() : cfg.label.toUpperCase()}
        </AppText>
        <AppText style={{
          fontSize: 17, fontWeight: '800', color: '#FFF', lineHeight: 24, marginBottom: 2,
        }}>
          {node.label}
        </AppText>
        <AppText style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 16 }}>
          {node.isIntro && node.slideCount != null
            ? `${node.slideCount} slides`
            : isPt ? 'Topico de aprendizagem' : 'Learning topic'}
        </AppText>
        <TouchableOpacity
          onPress={() => handleStart(node)}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#FFF', borderRadius: 14, paddingVertical: 14,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <AppText style={{ fontSize: 15, fontWeight: '800', color: cfg.color }}>
            {isComp
              ? (isPt ? 'Revisar' : 'Review')
              : (isPt ? 'Comecar  +20 XP' : 'Start  +20 XP')}
          </AppText>
          <CaretRight size={16} color={cfg.color} weight="bold" />
        </TouchableOpacity>
      </View>
    );
  };

  // ── Module rows (snake pattern) ───────────────────────────────────────────
  const renderRows = (nodes: FlatNode[], globalRowOffset: number) => {
    // Split into rows of COLS
    const rows: FlatNode[][] = [];
    for (let i = 0; i < nodes.length; i += COLS) rows.push(nodes.slice(i, i + COLS));

    return rows.map((row, rIdx) => {
      const isLTR     = (globalRowOffset + rIdx) % 2 === 0;
      // RTL rows: reverse data so snake connects correctly + right-align partial rows
      const display   = isLTR ? [...row] : [...row].reverse();
      const selected  = row.find(n => n.key === selectedKey);

      return (
        <View key={rIdx}>
          {/* Node row */}
          <View style={{
            flexDirection: 'row',
            alignItems:   'flex-start',
            justifyContent: isLTR ? 'flex-start' : 'flex-end',
            paddingHorizontal: H_PAD,
            marginBottom: 4,
          }}>
            {display.map((node, i) => {
              const isCurrNode =
                node.state === 'active' && isCurrent(node.moduleIdx, node.topicIdx);
              return (
                <React.Fragment key={node.key}>
                  <TouchableOpacity
                    ref={(r) => {
                      if (isCurrNode && onCurrentTopicRef) {
                        onCurrentTopicRef(r as unknown as View | null);
                      }
                    }}
                    onPress={() => handleTap(node)}
                    activeOpacity={node.state === 'locked' ? 1 : 0.80}
                  >
                    {renderNode(node)}
                  </TouchableOpacity>

                  {/* Horizontal dash connector between nodes */}
                  {i < display.length - 1 && (
                    <View style={{ height: UNIT, alignItems: 'center', justifyContent: 'center' }}>
                      <HorizDash />
                    </View>
                  )}
                </React.Fragment>
              );
            })}
          </View>

          {/* Inline popup below this row when a node in it is selected */}
          {selected && renderPopup(selected)}

          {/* Vertical connector turning to next row */}
          {rIdx < rows.length - 1 && (
            <VertDash side={isLTR ? 'right' : 'left'} />
          )}
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

  // ── Render ────────────────────────────────────────────────────────────────
  let rowCount = 0;

  return (
    <View style={{ paddingBottom: 32 }}>
      {groups.map(({ mIdx, title, nodes }) => {
        const offset  = rowCount;
        rowCount     += Math.ceil(nodes.length / COLS);

        return (
          <View key={mIdx} style={{ marginBottom: 32 }}>
            {/* Module label */}
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              marginHorizontal: H_PAD, marginBottom: 16, gap: 10,
            }}>
              <View style={{
                width: 28, height: 28, borderRadius: 8, backgroundColor: accent,
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <AppText style={{ fontSize: 12, fontWeight: '900', color: '#FFF' }}>
                  {mIdx + 1}
                </AppText>
              </View>
              <AppText style={{ fontSize: 14, fontWeight: '800', color: C.navy, flex: 1 }}>
                {title}
              </AppText>
            </View>

            {/* Snake rows */}
            {renderRows(nodes, offset)}
          </View>
        );
      })}
    </View>
  );
}
