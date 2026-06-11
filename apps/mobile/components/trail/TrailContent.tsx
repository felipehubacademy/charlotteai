// components/trail/TrailContent.tsx — v8 (card list + accordion, level-color identity)
// Each module = card vertical. Atual auto-expandido. Tap pra expandir/colapsar.
// Barra segmentada 4 partes (tipos: grammar/speaking/roleplay/chat).
// Cor de estado vem do nivel (violet para Inter, gold para Novice, teal para Advanced).

import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View, TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  BookOpen, Microphone, Play, ChatCircle, CaretRight, CaretDown, Lock,
} from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { CURRICULUM, TrailLevel, topicHasContent } from '@/data/curriculum';
import { MODULE_INTROS } from '@/data/moduleIntros';
import { listModules as listV2Modules } from '@/lib/curriculum-v2/loader';
import { usePlacementSkips } from '@/lib/curriculum-v2/usePlacementSkips';
import type { Level as V2LevelType } from '@/lib/curriculum-v2/types';
import type { Level as V2Level } from '@/lib/curriculum-v2/types';
import { useLearnProgress } from '@/hooks/useLearnProgress';
import { useLearnProgressV2 } from '@/hooks/useLearnProgressV2';
import { supabase } from '@/lib/supabase';

// ── Helpers ───────────────────────────────────────────────────────────────────
function a(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  card:      '#FFFFFF',
  bg:        '#EEEAF3',
  border:    'rgba(22,21,58,0.06)',
  borderMid: 'rgba(22,21,58,0.12)',
  hairline:  'rgba(22,21,58,0.04)',
  ghost:     'rgba(22,21,58,0.06)',
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
  grammar:  { color: '#D97706', Icon: BookOpen,   label: 'Grammar',     labelPt: 'Gramática'  },
  speaking: { color: '#7C3AED', Icon: Microphone, label: 'Speaking',    labelPt: 'Pronúncia'  },
  roleplay: { color: '#3D8800', Icon: Play,        label: 'Role-play',   labelPt: 'Role-play'  },
  chat:     { color: '#16153A', Icon: ChatCircle,  label: 'Guided Chat', labelPt: 'Chat Guiado' },
};

const NEXT_GREEN = '#3D8800';
const TOPICS_PER_MODULE = 4;

// ── Domain ────────────────────────────────────────────────────────────────────
type LessonState = 'done' | 'next' | 'locked';

interface Lesson {
  key:        string;
  label:      string;
  type:       NodeType;
  state:      LessonState;
  hasContent: boolean;
  moduleIdx:  number;
  topicIdx:   number;        // -1 quando intro
  isIntro:    boolean;
  slideCount?: number;
  score?:     number | null; // 0-100, calculado de learn_history
  // v2 — preenchido quando o trail vem do curriculum v2
  v2ModuleId?: string;
  v2UnitId?:   string;
  v2Activity?: NodeType;
}

interface ModuleData {
  idx:            number;
  title:          string;
  lessons:        Lesson[];
  completedCount: number;
  totalCount:     number;
  pct:            number;
  state:          'done' | 'active' | 'locked';
  avgScore:       number | null; // média dos scores das lessons concluídas
}

// ── Score color ramp ──────────────────────────────────────────────────────────
function scoreColor(s: number): string {
  if (s >= 85) return '#15803D';      // green
  if (s >= 70) return '#B45309';      // muted gold
  return '#B91C1C';                   // muted red
}

// ── Segmented progress bar (4 segments, type-tinted) ──────────────────────────
function SegmentedProgress({ lessons }: { lessons: Lesson[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4, marginTop: 16 }}>
      {lessons.map((l, i) => {
        const cfg = NODE_CONFIG[l.type];
        const isDone = l.state === 'done';
        const isNext = l.state === 'next';
        return (
          <View
            key={i}
            style={{
              flex: 1, height: 6, borderRadius: 3,
              backgroundColor: isDone
                ? cfg.color
                : isNext
                ? a(NEXT_GREEN, 0.30)
                : C.ghost,
            }}
          />
        );
      })}
    </View>
  );
}

// ── Number chip ───────────────────────────────────────────────────────────────
function NumberChip({
  n, state, accent,
}: { n: number; state: ModuleData['state']; accent: string }) {
  const isDone   = state === 'done';
  const isActive = state === 'active';
  const isLocked = state === 'locked';

  const bg = isActive
    ? accent
    : isDone
    ? a(accent, 0.12)
    : C.ghost;
  const fg = isActive
    ? '#FFF'
    : isDone
    ? accent
    : C.navyLight;

  return (
    <View style={{
      width: 34, height: 34, borderRadius: 12,
      backgroundColor: bg,
      alignItems: 'center', justifyContent: 'center',
    }}>
      {isLocked ? (
        <Lock size={16} color={fg} weight="regular" />
      ) : (
        <AppText style={{ fontSize: 14, fontWeight: '700', color: fg }}>{n}</AppText>
      )}
    </View>
  );
}

// ── Lesson row (expanded view) ────────────────────────────────────────────────
function LessonRow({
  lesson, isLast, onPress, isPt,
}: { lesson: Lesson; isLast: boolean; onPress: () => void; isPt: boolean }) {
  const cfg = NODE_CONFIG[lesson.type];
  const isDone   = lesson.state === 'done';
  const isNext   = lesson.state === 'next';
  const isLocked = lesson.state === 'locked';

  const iconBg = isLocked ? C.ghost : cfg.color;
  const iconColor = isLocked ? C.navyLight : '#FFF';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isLocked}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 12,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: C.hairline,
      }}
    >
      {/* Square rounded icon — 32x32, radius 10 — distinguishes from circular module dots */}
      <View style={{
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: iconBg,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <cfg.Icon size={18} color={iconColor} weight="fill" />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText
          numberOfLines={1}
          style={{
            fontSize: 14, fontWeight: '600',
            color: isLocked ? C.navyLight : C.navy, lineHeight: 18,
          }}>
          {lesson.label}
        </AppText>
        {/* Subtitulo: oculta quando label ja é o tipo (caso v2). Score sempre aparece se houver. */}
        {(() => {
          const hasScore = typeof lesson.score === 'number';
          const labelMatches = lesson.label === (isPt ? cfg.labelPt : cfg.label);
          // Threshold por tipo (sincronizado com useLearnProgressV2)
          const threshold = lesson.type === 'grammar' ? 70 : lesson.type === 'speaking' ? 60 : 100;
          const belowThreshold = hasScore && !isDone && (lesson.score as number) < threshold;
          if (labelMatches && !hasScore && !belowThreshold) return null;
          return (
            <AppText style={{
              fontSize: 10, fontWeight: '700',
              color: C.navyLight, letterSpacing: 0.8, marginTop: 2,
              textTransform: 'uppercase',
            }}>
              {!labelMatches ? (isPt ? cfg.labelPt : cfg.label) : ''}
              {isDone && hasScore && (
                <AppText style={{ color: scoreColor(lesson.score!) }}>
                  {`${!labelMatches ? '  ·  ' : ''}${Math.round(lesson.score!)}%`}
                </AppText>
              )}
              {belowThreshold && (
                <AppText style={{ color: '#D97706' }}>
                  {`${!labelMatches ? '  ·  ' : ''}${Math.round(lesson.score!)}% — ${isPt ? `precisa ${threshold}%` : `need ${threshold}%`}`}
                </AppText>
              )}
            </AppText>
          );
        })()}
      </View>

      {/* All action pills share size: paddingHorizontal:10 paddingVertical:6 borderRadius:10 */}
      {/* All action pills share the same dimensions: minWidth 56, padding 10/6, radius 10 */}
      {isDone && (
        <View style={{
          minWidth: 56,
          paddingHorizontal: 10, paddingVertical: 6,
          borderRadius: 10,
          borderWidth: 1, borderColor: C.borderMid,
          backgroundColor: 'transparent',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <AppText style={{ fontSize: 11, fontWeight: '600', color: C.navyMid }}>
            {isPt ? 'Refazer' : 'Redo'}
          </AppText>
        </View>
      )}
      {isNext && (
        <View style={{
          minWidth: 56,
          paddingHorizontal: 10, paddingVertical: 6,
          borderRadius: 10,
          backgroundColor: NEXT_GREEN,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <AppText style={{ fontSize: 11, fontWeight: '700', color: '#FFF' }}>
            {isPt ? 'Começar' : 'Start'}
          </AppText>
        </View>
      )}
      {isLocked && (
        <View style={{
          minWidth: 56,
          paddingHorizontal: 10, paddingVertical: 6,
          borderRadius: 10,
          borderWidth: 1, borderColor: C.borderMid,
          backgroundColor: 'transparent',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Lock size={13} color={C.navyLight} weight="regular" />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Module card ───────────────────────────────────────────────────────────────
function ModuleCard({
  data, accent, expanded, onToggle, onStartLesson, isPt, isCurrentModule, onRef, onLayoutY,
}: {
  data:           ModuleData;
  accent:         string;
  expanded:       boolean;
  onToggle:       () => void;
  onStartLesson:  (lesson: Lesson) => void;
  isPt:           boolean;
  isCurrentModule: boolean;
  onRef?:         (r: View | null) => void;
  onLayoutY?:     (y: number) => void;
}) {
  const isDone   = data.state === 'done';
  const isActive = data.state === 'active';
  const isLocked = data.state === 'locked';

  const elevation = isActive ? Platform.select({
    ios:     { shadowColor: 'rgba(22,21,58,0.20)', shadowOpacity: 1, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
    android: { elevation: 4 },
  }) : Platform.select({
    ios:     { shadowColor: 'rgba(22,21,58,0.10)', shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    android: { elevation: 1 },
  });

  return (
    <View
      ref={onRef as any}
      collapsable={false}
      onLayout={onLayoutY ? (e) => onLayoutY(e.nativeEvent.layout.y) : undefined}
      style={{
        marginHorizontal: 20, marginBottom: 14,
        backgroundColor: C.card,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1, borderColor: C.border,
        ...elevation,
      }}>
      <TouchableOpacity
        onPress={onToggle}
        disabled={isLocked}
        activeOpacity={0.85}
        style={{ paddingHorizontal: 18, paddingVertical: 16 }}
      >
        {/* Head row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <NumberChip n={data.idx + 1} state={data.state} accent={accent} />

          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText style={{
              fontSize: 11, fontWeight: '500', color: C.navyLight, marginBottom: 2,
            }}>
              {isLocked
                ? (isPt ? `${data.totalCount} tópicos · bloqueado` : `${data.totalCount} topics · locked`)
                : `${data.completedCount} ${isPt ? 'de' : 'of'} ${data.totalCount} ${isPt ? 'concluidos' : 'completed'}`}
            </AppText>
            <AppText
              numberOfLines={2}
              style={{
                fontSize: 16, fontWeight: '700',
                color: isLocked ? C.navyLight : C.navy, lineHeight: 20,
              }}>
              {data.title}
            </AppText>
          </View>

          {!isLocked && (
            <AppText style={{
              fontSize: 13, fontWeight: '600',
              color: isActive ? accent : isDone ? accent : C.navyLight,
            }}>
              {data.pct}%
            </AppText>
          )}

          {!isLocked && (
            <CaretDown
              size={14}
              color={C.navyLight}
              weight="bold"
              style={{ transform: [{ rotate: expanded ? '0deg' : '-90deg' }] }}
            />
          )}
        </View>

        {/* Segmented progress bar */}
        {!isLocked && <SegmentedProgress lessons={data.lessons} />}
      </TouchableOpacity>

      {/* Expanded lessons list */}
      {expanded && !isLocked && (
        <View style={{
          paddingHorizontal: 18, paddingBottom: 16,
          borderTopWidth: 1, borderTopColor: C.border,
          paddingTop: 6,
        }}>
          {data.lessons.map((l, i) => (
            <LessonRow
              key={l.key}
              lesson={l}
              isLast={i === data.lessons.length - 1}
              onPress={() => onStartLesson(l)}
              isPt={isPt}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface TrailContentProps {
  userId:             string | undefined;
  level:              TrailLevel;
  showBanner?:        boolean;
  onCurrentTopicRef?: (node: View | null) => void;
  /** Reporta posicao Y do modulo ativo via onLayout (mais confiavel que measureLayout). */
  onActiveModuleY?:   (y: number) => void;
  useV2?:             boolean;   // when true, loads modules from curriculum-v2
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function TrailContent({ userId, level, onCurrentTopicRef, onActiveModuleY, useV2 }: TrailContentProps) {
  const isPt    = level === 'Novice';
  const accent  = LEVEL_COLOR[level];

  // v2: cada UNIT vira um card. Dentro: 4 rows fixas, uma por atividade.
  // Cap TOPICS_PER_MODULE=4 nao restringe porque sao exatamente 4 atividades.
  const v2Wrapped = useMemo(() => {
    if (!useV2) return null;
    const labels = {
      grammar:  isPt ? 'Gramática'            : 'Grammar',
      speaking: isPt ? 'Listening & Speaking' : 'Listening & Speaking',
      roleplay: isPt ? 'Role-play'            : 'Role-play',
      chat:     isPt ? 'Guided Chat'          : 'Guided Chat',
    } as const;
    const allModules = listV2Modules(level as V2Level);
    return allModules.flatMap((m, mIdx) =>
      m.units.map((u, uIdx) => {
        // Cascade cross-module: primeira unit do M(n>0) depende da ULTIMA unit
        // do M(n-1). Demais units do mesmo modulo dependem da unit anterior local.
        let prevUnitId: string | undefined;
        let prevModuleId: string | undefined;
        if (uIdx > 0) {
          prevUnitId   = m.units[uIdx - 1].id;
          prevModuleId = m.id;
        } else if (mIdx > 0) {
          const prevMod = allModules[mIdx - 1];
          const lastUnit = prevMod.units[prevMod.units.length - 1];
          prevUnitId   = lastUnit?.id;
          prevModuleId = prevMod.id;
        }
        return {
          title:           u.title,
          _v2ModuleId:     m.id,
          _v2ModuleTitle:  m.title,
          _v2PrevUnitId:   prevUnitId,
          _v2PrevModuleId: prevModuleId,
          topics: (['grammar', 'speaking', 'roleplay', 'chat'] as const).map(act => ({
            title:        labels[act],
            _v2ModuleId:  m.id,
            _v2UnitId:    u.id,
            _v2Activity:  act,
          })),
        };
      })
    );
  }, [useV2, level, isPt]);

  const modules = (v2Wrapped ?? CURRICULUM[level]) as Array<{
    title: string;
    _v2ModuleId?: string;
    _v2ModuleTitle?: string;
    _v2PrevUnitId?: string;
    _v2PrevModuleId?: string;
    topics: Array<{ title: string; _v2ModuleId?: string; _v2UnitId?: string; _v2Activity?: NodeType }>;
  }>;

  const {
    loading, refetch,
    isTopicComplete, isCurrent, isLocked, isIntroDone,
  } = useLearnProgress(userId, level);

  // Placement skips: nivel pulado → cascade desligado (tudo destravado).
  const { cascadeMode, isAccessible } = usePlacementSkips();
  const v2Cascade = cascadeMode(level as V2LevelType);
  // Preview mode: aluno entrou em nivel ainda nao desbloqueado.
  // Tudo aparece lockado (read-only sneak peek do curriculo).
  const isPreview = useV2 && !isAccessible(level as V2LevelType);

  // v2 progress — só lê quando useV2 (sem custo extra em v1)
  const v2Progress = useLearnProgressV2(userId, level as V2Level, v2Cascade);
  useFocusEffect(useCallback(() => {
    if (useV2) v2Progress.refetch();
  }, [useV2, v2Progress.refetch])); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  // ── Fetch per-lesson scores from learn_history (% correct + pronunciation score) ──
  const [scoreMap, setScoreMap] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('learn_history')
        .select('module_index, topic_index, is_correct, score')
        .eq('user_id', userId)
        .eq('level', level);
      if (error || cancelled || !data) return;

      const acc: Record<string, { sum: number; n: number }> = {};
      for (const row of data) {
        const key = `m${row.module_index}_t${row.topic_index}`;
        // Prefer pronunciation `score` (0-100) when present; else is_correct → 0/100
        const v = typeof row.score === 'number'
          ? Math.max(0, Math.min(100, row.score))
          : row.is_correct ? 100 : 0;
        const bucket = acc[key] ?? { sum: 0, n: 0 };
        bucket.sum += v;
        bucket.n   += 1;
        acc[key]    = bucket;
      }
      const map: Record<string, number> = {};
      for (const k of Object.keys(acc)) {
        map[k] = acc[k].sum / acc[k].n;
      }
      if (!cancelled) setScoreMap(map);
    })();
    return () => { cancelled = true; };
  }, [userId, level]);

  // Build module data — each module gets up to 4 lessons (intro + topics, capped at 4)
  const moduleData: ModuleData[] = useMemo(() => {
    return modules.map((mod, mIdx) => {
      const lessons: Lesson[] = [];
      let pos = 0;

      const intro = useV2 ? null : MODULE_INTROS[level]?.[mIdx];
      if (intro) {
        const done = isIntroDone(mIdx);
        const introLocked = mIdx > 0 &&
          modules[mIdx - 1].topics.some((_, t) => !isTopicComplete(mIdx - 1, t));
        lessons.push({
          key:        `m${mIdx}_intro`,
          label:      intro.title,
          type:       TYPE_CYCLE[pos++] ?? 'grammar',
          state:      done ? 'done' : introLocked ? 'locked' : 'next',
          hasContent: true,
          moduleIdx:  mIdx,
          topicIdx:   -1,
          isIntro:    true,
          slideCount: intro.slides.length,
          // Intros vao receber exercicios em breve — usar score real se houver,
          // senao 100 quando concluida (intro = "aula assistida").
          score:      done ? (scoreMap[`m${mIdx}_intro`] ?? 100) : null,
        });
      }

      mod.topics.forEach((topic: any, tIdx: number) => {
        if (pos >= TOPICS_PER_MODULE) return;
        const key      = `m${mIdx}_t${tIdx}`;
        const v2Activity: NodeType | undefined = topic._v2Activity;
        const lessonType = useV2 && v2Activity ? v2Activity : (TYPE_CYCLE[pos] ?? 'grammar');
        if (!(useV2 && v2Activity)) pos++;

        let complete: boolean;
        let locked:   boolean;
        let lessonScore: number | null;

        if (useV2 && v2Activity && topic._v2ModuleId && topic._v2UnitId) {
          const row = v2Progress.get(topic._v2ModuleId, topic._v2UnitId, v2Activity);
          complete    = !isPreview && !!row?.completed;
          locked      = isPreview || !v2Progress.isActivityUnlocked(
                          topic._v2ModuleId, topic._v2UnitId, v2Activity,
                          mod._v2PrevUnitId, mod._v2PrevModuleId,
                        );
          lessonScore = isPreview ? null : (typeof row?.score === 'number' ? row.score : null);
        } else {
          complete    = isTopicComplete(mIdx, tIdx);
          const miniReq = tIdx === 0 && !isIntroDone(mIdx);
          locked      = !complete && (miniReq || isLocked(mIdx, tIdx));
          lessonScore = complete && scoreMap[key] !== undefined ? scoreMap[key] : null;
        }

        lessons.push({
          key,
          label:      topic.title,
          type:       lessonType,
          state:      complete ? 'done' : locked ? 'locked' : 'next',
          hasContent: useV2 ? true : topicHasContent(level, mIdx, tIdx),
          moduleIdx:  mIdx,
          topicIdx:   tIdx,
          isIntro:    false,
          score:      lessonScore,
          v2ModuleId: topic._v2ModuleId,
          v2UnitId:   topic._v2UnitId,
          v2Activity,
        });
      });

      // v1: progressive lock — first non-done becomes 'next', rest 'locked'.
      // v2: já vem com locked/next/done corretos do hook useLearnProgressV2.
      let foundNext = false;
      const fixed = lessons.map(l => {
        if (useV2) return l;
        if (l.state === 'done') return l;
        if (!foundNext && l.state === 'next') { foundNext = true; return l; }
        return { ...l, state: 'locked' as LessonState };
      });

      const completedCount = fixed.filter(l => l.state === 'done').length;
      const totalCount     = fixed.length;
      const pct            = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      let state: ModuleData['state'];
      if (completedCount === totalCount && totalCount > 0)         state = 'done';
      else if (fixed.some(l => l.state === 'next'))                state = 'active';
      else                                                          state = 'locked';

      const scored = fixed.filter(l => typeof l.score === 'number') as (Lesson & { score: number })[];
      const avgScore = scored.length > 0
        ? scored.reduce((s, l) => s + l.score, 0) / scored.length
        : null;

      return {
        idx: mIdx, title: mod.title, lessons: fixed,
        completedCount, totalCount, pct, state, avgScore,
      };
    });
  }, [modules, level, useV2, isTopicComplete, isLocked, isIntroDone, scoreMap, v2Progress.rows]);

  const activeIdx = useMemo(
    () => moduleData.findIndex(m => m.state === 'active'),
    [moduleData],
  );

  // Expansion state — auto-expand active module on mount / when active changes
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  useEffect(() => {
    if (activeIdx >= 0) setExpandedIdx(activeIdx);
  }, [activeIdx]);

  const handleStartLesson = useCallback((lesson: Lesson) => {
    if (lesson.state === 'locked' || !lesson.hasContent) return;
    if (lesson.isIntro) {
      router.push({
        pathname: '/(app)/learn-intro',
        params: { level, moduleIndex: String(lesson.moduleIdx), topicIndex: '0' },
      });
    } else if (lesson.v2ModuleId && lesson.v2UnitId) {
      // v2 routing: o tipo ciclado (grammar/speaking/roleplay/chat) define
      // qual fatia do unit abre. Mesma posicao → mesma atividade, igual v15
      // visual mas agora funcional.
      switch (lesson.type) {
        case 'grammar':
          router.push({
            pathname: '/(app)/learn-session',
            params: { v: 'v2', level, moduleId: lesson.v2ModuleId, unitId: lesson.v2UnitId, activity: 'grammar' },
          });
          return;
        case 'speaking':
          router.push({
            pathname: '/(app)/learn-session',
            params: { v: 'v2', level, moduleId: lesson.v2ModuleId, unitId: lesson.v2UnitId, activity: 'ls' },
          });
          return;
        case 'roleplay':
          router.push({
            pathname: '/(app)/roleplay-exercise' as any,
            params: { level, moduleId: lesson.v2ModuleId, unitId: lesson.v2UnitId },
          });
          return;
        case 'chat':
          router.push({
            pathname: '/(app)/guided-chat-exercise' as any,
            params: { level, moduleId: lesson.v2ModuleId, unitId: lesson.v2UnitId },
          });
          return;
      }
    } else {
      router.push({
        pathname: '/(app)/learn-session',
        params: { level, moduleIndex: String(lesson.moduleIdx), topicIndex: String(lesson.topicIdx) },
      });
    }
  }, [level]);

  // Ref pra scroll-to-active module
  const activeRef = useRef<View | null>(null);
  // Guard: identifica o ultimo node ja dispatchado pra evitar re-trigger
  // a cada render (ref callback eh nova func a cada render, dispararia loop).
  const dispatchedNodeRef = useRef<View | null>(null);
  useEffect(() => {
    if (onCurrentTopicRef && activeRef.current && dispatchedNodeRef.current !== activeRef.current) {
      dispatchedNodeRef.current = activeRef.current;
      onCurrentTopicRef(activeRef.current);
    }
  }, [activeIdx, onCurrentTopicRef]);
  // Re-dispatch ref no focus — volta de exercicio re-scrolla pro ativo
  useFocusEffect(useCallback(() => {
    if (onCurrentTopicRef && activeRef.current) {
      // No focus, RE-dispatcha mesmo no mesmo node (volta de exercicio)
      dispatchedNodeRef.current = activeRef.current;
      onCurrentTopicRef(activeRef.current);
    }
  }, [onCurrentTopicRef]));

  // ── Loading ──────────────────────────────────────────────────────────────
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

  return (
    <View style={{ paddingTop: 4, paddingBottom: 40 }}>
      {isPreview && (
        <View style={{
          marginHorizontal: 20, marginBottom: 16, padding: 14,
          backgroundColor: 'rgba(124,58,237,0.08)',
          borderRadius: 12,
          borderWidth: 1, borderColor: 'rgba(124,58,237,0.15)',
        }}>
          <AppText style={{ fontSize: 13, fontWeight: '700', color: '#5B21B6', marginBottom: 2 }}>
            {isPt ? 'Pré-visualização' : 'Preview'}
          </AppText>
          <AppText style={{ fontSize: 12, color: '#5B21B6', lineHeight: 17 }}>
            {isPt
              ? 'Você está vendo o curriculum deste nível. Complete o nível atual pra desbloquear as atividades.'
              : 'You are previewing this level. Complete the current level to unlock activities.'}
          </AppText>
        </View>
      )}
      {moduleData.map((m, i) => {
        const prevModId = i > 0 ? modules[i - 1]?._v2ModuleId : undefined;
        const currModId = modules[i]?._v2ModuleId;
        const showDivider = useV2 && !!currModId && currModId !== prevModId;
        const divTitle    = modules[i]?._v2ModuleTitle;
        return (
          <React.Fragment key={`mod_${m.idx}`}>
            {showDivider && divTitle && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                marginTop: i === 0 ? 4 : 18, marginBottom: 10, paddingHorizontal: 4,
              }}>
                <View style={{ flex: 1, height: 1, backgroundColor: C.borderMid }} />
                <AppText style={{
                  fontSize: 11, fontWeight: '700', color: C.navyLight,
                  letterSpacing: 1.2, textTransform: 'uppercase',
                }}>
                  {divTitle}
                </AppText>
                <View style={{ flex: 1, height: 1, backgroundColor: C.borderMid }} />
              </View>
            )}
            <ModuleCard
              data={m}
              accent={accent}
              expanded={expandedIdx === i}
              onToggle={() => setExpandedIdx(k => k === i ? null : i)}
              onStartLesson={handleStartLesson}
              isPt={isPt}
              isCurrentModule={i === activeIdx}
              onRef={i === activeIdx ? (r) => {
                activeRef.current = r;
                // Dispatch SO se for um node novo (primeira attach pra esse
                // node) — evita re-trigger em re-renders normais que ficariam
                // re-rolando pra trilha toda vez que user scrolla.
                if (r && onCurrentTopicRef && dispatchedNodeRef.current !== r) {
                  dispatchedNodeRef.current = r;
                  onCurrentTopicRef(r);
                }
              } : undefined}
              onLayoutY={i === activeIdx && onActiveModuleY ? onActiveModuleY : undefined}
            />
          </React.Fragment>
        );
      })}
      {/* Divisor final indicando proximo nivel (so v2, com modulos compilados) */}
      {useV2 && moduleData.length > 0 && (() => {
        const nextLabel = level === 'Novice' ? 'INTERMEDIATE'
          : level === 'Inter' ? 'ADVANCED' : null;
        if (!nextLabel) return null;
        return (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            marginTop: 24, marginBottom: 4, paddingHorizontal: 4,
          }}>
            <View style={{ flex: 1, height: 1, backgroundColor: C.borderMid }} />
            <AppText style={{
              fontSize: 11, fontWeight: '700', color: C.navyLight,
              letterSpacing: 1.2, textTransform: 'uppercase',
            }}>
              {isPt ? `Próximo nível · ${nextLabel}` : `Next level · ${nextLabel}`}
            </AppText>
            <View style={{ flex: 1, height: 1, backgroundColor: C.borderMid }} />
          </View>
        );
      })()}
    </View>
  );
}
