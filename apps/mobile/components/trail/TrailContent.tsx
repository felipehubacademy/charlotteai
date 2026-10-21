// components/trail/TrailContent.tsx — v8 (card list + accordion, level-color identity)
// Each module = card vertical. Atual auto-expandido. Tap pra expandir/colapsar.
// Barra segmentada 4 partes (tipos: grammar/speaking/roleplay/chat).
// Cor de estado vem do nivel (violet para Inter, gold para Novice, teal para Advanced).

import { systemIsPt } from '@/lib/systemLang';
import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View, TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import {
  BookOpen, Microphone, Play, ChatCircle, CaretRight, CaretDown, Lock,
} from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import type { TrailLevel } from '@/data/trailTypes';
import { listModules as listV2Modules } from '@/lib/curriculum-v2/loader';
import { usePlacementSkips } from '@/lib/curriculum-v2/usePlacementSkips';
import type { Level as V2LevelType } from '@/lib/curriculum-v2/types';
import type { Level as V2Level } from '@/lib/curriculum-v2/types';
import { useLearnProgressV2 } from '@/hooks/useLearnProgressV2';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/hooks/useAuth';
import { usePaywallContext } from '@/lib/paywallContext';
import { LEVEL_ACCENT } from '@/lib/levelColors';
import { extraTrack, unitImpression } from '@/lib/tracks';
import { ImpressionTag } from '@/components/trail/ImpressionTag';
import { LEVEL_ACCENT_BG } from '@/lib/levelColors';
import type { CharacterId, ImpressionId } from '@/lib/characters';

// ── Helpers ───────────────────────────────────────────────────────────────────
function a(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  navy:      '#16131F',
  navyMid:   '#4D4858',
  navyLight: '#8A8494',
  card:      '#FFFFFF',
  bg:        '#EFEBE4',
  border:    'rgba(22,19,31,0.06)',
  borderMid: 'rgba(22,19,31,0.12)',
  hairline:  'rgba(22,19,31,0.04)',
  ghost:     'rgba(22,19,31,0.06)',
};
const LEVEL_COLOR = LEVEL_ACCENT;

// ── Node types — fixed cycle per position within module ───────────────────────
type NodeType = 'grammar' | 'speaking' | 'roleplay' | 'chat';

const NODE_CONFIG: Record<NodeType, {
  color: string; Icon: any; label: string; labelPt: string;
}> = {
  grammar:  { color: '#D12A64', Icon: BookOpen,   label: 'Grammar',     labelPt: 'Gramática'  },
  speaking: { color: '#6B4BFF', Icon: Microphone, label: 'Speaking',    labelPt: 'Pronúncia'  },
  roleplay: { color: '#08804A', Icon: Play,        label: 'Role-play',   labelPt: 'Role-play'  },
  chat:     { color: '#16131F', Icon: ChatCircle,  label: 'Guided Chat', labelPt: 'Chat Guiado' },
};

const NEXT_GREEN = '#DCFF4A'; // Volt — próximo passo da trilha

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
  impression?:    ImpressionId;  // trilha do Igorfina: tópico com imitação (selo no cartão)
}

// ── Score colors (lógica da marca: abaixo da meta = queizy, passou = crazy) ──
const SCORE_PASSED = '#08804A'; // Verde Crazy (texto)
const SCORE_BELOW  = '#D12A64'; // Pink Queizy (texto)

// ── Segmented progress bar (4 segments, type-tinted) ──────────────────────────
function SegmentedProgress({ lessons, accent }: { lessons: Lesson[]; accent: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4, marginTop: 16 }}>
      {lessons.map((l, i) => {
        const isDone = l.state === 'done';
        return (
          <View
            key={i}
            style={{
              flex: 1, height: 6, borderRadius: 3,
              backgroundColor: isDone ? accent : C.ghost,
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
  lesson, isLast, onPress, isPt, isPrimary,
}: { lesson: Lesson; isLast: boolean; onPress: () => void; isPt: boolean; isPrimary: boolean }) {
  const cfg = NODE_CONFIG[lesson.type];
  const isDone   = lesson.state === 'done';
  const isNext   = lesson.state === 'next';
  const isLocked = lesson.state === 'locked';

  const iconBg = C.ghost;
  const iconColor = isLocked ? C.navyLight : C.navy;

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
        {/* Subtitulo: SO score/threshold. Nao exibe label de tipo (ex.: o
            "SPEAKING" que so aparecia no Listening & Speaking) — os exercicios
            mostram apenas o titulo, sem sublabel. */}
        {(() => {
          const hasScore = typeof lesson.score === 'number';
          // Threshold por tipo (sincronizado com useLearnProgressV2)
          const threshold = lesson.type === 'grammar' ? 70 : lesson.type === 'speaking' ? 60 : 100;
          const belowThreshold = hasScore && !isDone && (lesson.score as number) < threshold;
          if (!hasScore && !belowThreshold) return null;
          return (
            <AppText style={{
              fontSize: 10, fontWeight: '700',
              color: C.navyLight, letterSpacing: 0.8, marginTop: 2,
              textTransform: 'uppercase',
            }}>
              {isDone && hasScore && (
                <AppText style={{ color: SCORE_PASSED }}>
                  {`${Math.round(lesson.score!)}%`}
                </AppText>
              )}
              {belowThreshold && (
                <AppText style={{ color: SCORE_BELOW }}>
                  {`${Math.round(lesson.score!)}% — ${isPt ? `precisa ${threshold}%` : `need ${threshold}%`}`}
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
          backgroundColor: isPrimary ? NEXT_GREEN : 'transparent',
          borderWidth: isPrimary ? 0 : 1, borderColor: C.borderMid,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <AppText style={{ fontSize: 11, fontWeight: '700', color: C.navy }}>
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
  data, accent, expanded, onToggle, onStartLesson, isPt, isCurrentModule, onRef, onLayoutY, host, tagBg,
}: {
  host?:          CharacterId;   // anfitrião da trilha extra (para o selo de imitação)
  tagBg?:         string;
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
    ios:     { shadowColor: 'rgba(22,19,31,0.20)', shadowOpacity: 1, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
    android: { elevation: 4 },
  }) : Platform.select({
    ios:     { shadowColor: 'rgba(22,19,31,0.10)', shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
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
                ? (isPt ? `${data.totalCount} atividades · bloqueado` : `${data.totalCount} activities · locked`)
                : `${data.completedCount} ${isPt ? 'de' : 'of'} ${data.totalCount} ${isPt ? 'concluídos' : 'completed'}`}
            </AppText>
            <AppText
              display
              numberOfLines={2}
              style={{
                fontSize: 17, fontWeight: '800',
                color: isLocked ? C.navyLight : C.navy, lineHeight: 21,
              }}>
              {data.title}
            </AppText>
            {host && data.impression ? (
              <ImpressionTag character={host} impression={data.impression} isPt={isPt}
                color={accent} bg={tagBg ?? accent + '1A'} />
            ) : null}
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
        {!isLocked && <SegmentedProgress lessons={data.lessons} accent={accent} />}
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
              isPrimary={i === data.lessons.findIndex(x => x.state === 'next')}
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
  /** Backup do measureLayout — onLayout reporta y do modulo ativo direto.
   *  Pra trails grandes (Inter/Advanced) onde measureLayout falha silencioso. */
  onActiveModuleY?:   (y: number) => void;
  /** Sinaliza ao pai se a trilha esta finalizada (nenhum modulo ativo).
   *  Fonte de verdade pro FAB decidir "down = fim" vs "down = modulo ativo". */
  onTrailFinished?:   (finished: boolean) => void;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function TrailContent({ userId, level, onCurrentTopicRef, onActiveModuleY, onTrailFinished }: TrailContentProps) {
  const track   = extraTrack(level);
  const isPt    = systemIsPt; // chrome da trilha: idioma do aparelho (o conteúdo dos exercícios não muda)
  const accent  = LEVEL_COLOR[level];

  // v2: cada UNIT vira um card. Dentro: 4 rows fixas, uma por atividade.
  const modules = useMemo(() => {
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
          _impression:     unitImpression(u),
          topics: (['grammar', 'speaking', 'roleplay', 'chat'] as const).map(act => ({
            title:        labels[act],
            _v2ModuleId:  m.id,
            _v2UnitId:    u.id,
            _v2Activity:  act,
          })),
        };
      })
    );
  }, [level, isPt]);

  // Placement skips: nivel pulado → cascade desligado (tudo destravado).
  const { cascadeMode, isAccessible } = usePlacementSkips();
  // Degustação (conta nova sem assinatura): o 1º bloco dos 3 níveis fica aberto, inclusive
  // nos níveis ainda não liberados. Os blocos seguintes abrem o paywall.
  const { isTaster, profile } = useAuth();
  // Revisão (equipe e dono da trilha, chave reviewFlag): todas as unidades abertas. Alunos seguem em ordem.
  const reviewAll = !!track?.reviewFlag && !isTaster && (profile?.beta_features ?? []).includes(track.reviewFlag);
  const v2Cascade = reviewAll ? 'unlocked' : cascadeMode(level as V2LevelType);
  // Preview mode: aluno entrou em nivel ainda nao desbloqueado.
  // Tudo aparece lockado (read-only sneak peek do curriculo).
  const { openPaywall } = usePaywallContext();
  const isPreview = !isTaster && !isAccessible(level as V2LevelType);

  const v2Progress = useLearnProgressV2(userId, level as V2Level, v2Cascade);
  useFocusEffect(useCallback(() => {
    v2Progress.refetch();
  }, [v2Progress.refetch])); // eslint-disable-line react-hooks/exhaustive-deps

  // Build module data — cada unidade vira um card com as 4 atividades (Gramática, L&S, Role-play, Guided Chat).
  // Estado (locked/next/done) e nota vêm do useLearnProgressV2.
  const moduleData: ModuleData[] = useMemo(() => {
    return modules.map((mod, mIdx) => {
      const fixed: Lesson[] = mod.topics.map((topic, tIdx) => {
        const v2Activity = topic._v2Activity;
        const row = v2Progress.get(topic._v2ModuleId, topic._v2UnitId, v2Activity);
        const complete = !isPreview && !!row?.completed;
        // Degustação numa trilha extra: a unidade grátis abre como se fosse a primeira.
        const isTasteUnit = !!track && isTaster
          && track.tasteUnit.moduleId === topic._v2ModuleId && track.tasteUnit.unitId === topic._v2UnitId;
        const locked = isPreview || !v2Progress.isActivityUnlocked(
          topic._v2ModuleId, topic._v2UnitId, v2Activity,
          isTasteUnit ? undefined : mod._v2PrevUnitId, isTasteUnit ? undefined : mod._v2PrevModuleId,
        );
        return {
          key:        `m${mIdx}_t${tIdx}`,
          label:      topic.title,
          type:       v2Activity,
          state:      complete ? 'done' : locked ? 'locked' : 'next',
          hasContent: true,
          moduleIdx:  mIdx,
          topicIdx:   tIdx,
          score:      isPreview ? null : (typeof row?.score === 'number' ? row.score : null),
          v2ModuleId: topic._v2ModuleId,
          v2UnitId:   topic._v2UnitId,
          v2Activity,
        };
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
        idx: mIdx, title: mod.title, lessons: fixed, impression: mod._impression,
        completedCount, totalCount, pct, state, avgScore,
      };
    });
  }, [modules, v2Progress.rows, isPreview, track, isTaster]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeIdx = useMemo(
    () => moduleData.findIndex(m => m.state === 'active'),
    [moduleData],
  );

  // Reporta ao pai se a trilha esta finalizada: ha modulos carregados mas
  // nenhum esta 'active' (todos 'done'). Fonte de verdade pro FAB — evita
  // inferir "fim" a partir de um Y de modulo ativo que pode estar obsoleto.
  useEffect(() => {
    if (!onTrailFinished) return;
    onTrailFinished(moduleData.length > 0 && activeIdx === -1);
  }, [activeIdx, moduleData.length, onTrailFinished]);

  // Expansion state — auto-expand active module on mount / when active changes
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  useEffect(() => {
    if (activeIdx >= 0) setExpandedIdx(activeIdx);
  }, [activeIdx]);

  // Fim da degustação neste nível: terminou o 1º bloco → paywall uma vez (por nível).
  // Só com a Home em foco: a trilha fica montada por baixo do exercício e não pode abrir o
  // paywall por cima da tela "Missão concluída"; abre quando o aluno toca em Continuar.
  const isFocused = useIsFocused();
  const tasteDone = isTaster && (track
    ? v2Progress.isUnitComplete(track.tasteUnit.moduleId, track.tasteUnit.unitId)
    : moduleData[0]?.state === 'done');
  useEffect(() => {
    if (!tasteDone || !isFocused) return;
    const key = `taste_paywall_${level}`;
    let cancelled = false;
    (async () => {
      const seen = await SecureStore.getItemAsync(key).catch(() => null);
      if (seen || cancelled) return;
      await SecureStore.setItemAsync(key, '1').catch(() => {});
      openPaywall();
    })();
    return () => { cancelled = true; };
  }, [tasteDone, isFocused, level, openPaywall]);

  const handleStartLesson = useCallback((lesson: Lesson) => {
    // Trilha extra na degustação: só a unidade grátis; o resto (até com cadeado) abre o paywall.
    if (isTaster && track && !(lesson.v2ModuleId === track.tasteUnit.moduleId && lesson.v2UnitId === track.tasteUnit.unitId)) { openPaywall(); return; }
    if (lesson.state === 'locked' || !lesson.hasContent) return;
    if (isTaster && !track && lesson.moduleIdx > 0) { openPaywall(); return; }
    if (lesson.v2ModuleId && lesson.v2UnitId) {
      // O tipo da atividade (grammar/speaking/roleplay/chat) define qual fatia da unidade abre.
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
    }
  }, [level, isTaster, openPaywall, track]);

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

  return (
    <View style={{ paddingTop: 4, paddingBottom: 40 }}>
      {isPreview && (
        <View style={{
          marginHorizontal: 20, marginBottom: 16, padding: 14,
          backgroundColor: 'rgba(107,75,255,0.08)',
          borderRadius: 12,
          borderWidth: 1, borderColor: 'rgba(107,75,255,0.15)',
        }}>
          <AppText style={{ fontSize: 13, fontWeight: '700', color: '#6B4BFF', marginBottom: 2 }}>
            {isPt ? 'Pré-visualização' : 'Preview'}
          </AppText>
          <AppText style={{ fontSize: 12, color: '#6B4BFF', lineHeight: 17 }}>
            {isPt
              ? 'Você está vendo o curriculum deste nível. Complete o nível atual pra desbloquear as atividades.'
              : 'You are previewing this level. Complete the current level to unlock activities.'}
          </AppText>
        </View>
      )}
      {moduleData.map((m, i) => {
        const prevModId = i > 0 ? modules[i - 1]?._v2ModuleId : undefined;
        const currModId = modules[i]?._v2ModuleId;
        const showDivider = !!currModId && currModId !== prevModId;
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
              host={track?.character}
              tagBg={LEVEL_ACCENT_BG[level]}
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
      {moduleData.length > 0 && (() => {
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
