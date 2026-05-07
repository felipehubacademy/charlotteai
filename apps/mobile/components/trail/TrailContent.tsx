// components/trail/TrailContent.tsx
// Reusable trail body — renders trail banner + modules + topics.
// Does NOT include its own ScrollView — caller provides scroll context.
// Used by LearnTrailScreen (legacy) and the new HomeTab.

import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  BookOpen, Microphone, CheckCircle, Lock, Play, CaretRight,
} from 'phosphor-react-native';
import * as SecureStore from 'expo-secure-store';
import { AppText } from '@/components/ui/Text';
import { CURRICULUM, TrailLevel, topicHasContent, totalTopics } from '@/data/curriculum';
import { MODULE_INTROS } from '@/data/moduleIntros';
import { useLearnProgress } from '@/hooks/useLearnProgress';

// ── Color helper — converts #RRGGBB + alpha to rgba() for Android compatibility ──
function a(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Palette ─────────────────────────────────────────────────────────────────
const C = {
  bg:          '#F4F3FA',
  card:        '#FFFFFF',
  navy:        '#16153A',
  navyMid:     '#4B4A72',
  navyLight:   '#9896B8',
  ghost:       'rgba(22,21,58,0.06)',
  border:      'rgba(22,21,58,0.10)',
  gold:        '#D97706',
  goldBg:      '#FFFBEB',
  green:       '#3D8800',
  greenBg:     '#F0FFD9',
  violet:      '#7C3AED',
  violetBg:    '#F5F3FF',
  lockGray:    '#C4C3D4',
};

const shadow = Platform.select({
  ios:     { shadowColor: 'rgba(22,21,58,0.10)', shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } },
  android: { elevation: 2 },
});

const LEVEL_LABELS: Record<TrailLevel, string> = {
  Novice:   'Novice — A1/A2',
  Inter:    'Intermediate — B1/B2',
  Advanced: 'Advanced — C1/C2',
};

const LEVEL_COLOR: Record<TrailLevel, string> = {
  Novice:   '#D97706',
  Inter:    '#7C3AED',
  Advanced: '#0F766E',
};

// ── Props ────────────────────────────────────────────────────────────────────
interface TrailContentProps {
  userId:      string | undefined;
  level:       TrailLevel;
}

// ── Component ────────────────────────────────────────────────────────────────
export function TrailContent({ userId, level }: TrailContentProps) {
  const isPortuguese = level === 'Novice';
  const accent       = LEVEL_COLOR[level];
  const modules      = CURRICULUM[level];

  const { progress, loading, refetch, isTopicComplete, isCurrent, isLocked } =
    useLearnProgress(userId, level);

  // Re-fetch when screen gets focus (e.g. returning from learn-session)
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  // ── Intro completion tracking ─────────────────────────────────────────────
  const [introDone, setIntroDone] = useState<Record<number, boolean>>({});

  const loadIntroDone = useCallback(async () => {
    const levelIntros = MODULE_INTROS[level];
    if (!levelIntros) return;
    const results = await Promise.all(
      Object.keys(levelIntros).map(async (k) => {
        const mIdx = parseInt(k, 10);
        const val  = await SecureStore.getItemAsync(`intro_done_${userId}_${level}_${mIdx}`);
        return [mIdx, val === '1'] as [number, boolean];
      })
    );
    setIntroDone(Object.fromEntries(results));
  }, [level, userId]);

  useEffect(() => { loadIntroDone(); }, [loadIntroDone]);
  useFocusEffect(useCallback(() => { loadIntroDone(); }, [loadIntroDone]));

  // ── Progress counters ─────────────────────────────────────────────────────
  const completed = progress?.completed.length ?? 0;
  const total     = totalTopics(level);
  const pct       = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  const handleStart = (moduleIdx: number, topicIdx: number) => {
    router.push({
      pathname:  '/(app)/learn-session',
      params:    { level, moduleIndex: String(moduleIdx), topicIndex: String(topicIdx) },
    });
  };

  // ── Trail banner ──────────────────────────────────────────────────────────
  return (
    <View>
      <View style={{
        backgroundColor: C.card, borderRadius: 20, padding: 20,
        marginHorizontal: 20, marginBottom: 24,
        borderWidth: 1, borderColor: C.border, ...shadow,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <View style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: a(accent, 0.094),
            alignItems: 'center', justifyContent: 'center',
          }}>
            <BookOpen size={22} color={accent} weight="fill" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={{ fontSize: 13, fontWeight: '800', color: C.navy }}>
              {LEVEL_LABELS[level]}
            </AppText>
            <AppText style={{ fontSize: 12, color: C.navyLight, fontWeight: '500' }}>
              {modules.length} {isPortuguese ? 'módulos' : 'modules'} · {total} {isPortuguese ? 'tópicos' : 'topics'}
            </AppText>
          </View>
          <AppText style={{ fontSize: 18, fontWeight: '900', color: accent }}>{pct}%</AppText>
        </View>
        <View style={{ height: 6, backgroundColor: C.ghost, borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ height: 6, width: `${pct}%` as `${number}%`, backgroundColor: accent, borderRadius: 3 }} />
        </View>
        <AppText style={{ fontSize: 11, color: C.navyLight, fontWeight: '600', marginTop: 6 }}>
          {completed} {isPortuguese ? 'de' : 'of'} {total} {isPortuguese ? 'tópicos concluídos' : 'topics completed'}
        </AppText>
      </View>

      {/* ── Modules ── */}
      {loading ? (
        <View style={{ alignItems: 'center', paddingTop: 40 }}>
          <ActivityIndicator color={accent} />
          <AppText style={{ color: C.navyLight, marginTop: 12, fontSize: 13 }}>
            {isPortuguese ? 'Carregando seu progresso…' : 'Loading your progress…'}
          </AppText>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 20, gap: 24 }}>
          {modules.map((mod, mIdx) => (
            <View key={mIdx}>

              {/* Module header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View style={{
                  width: 28, height: 28, borderRadius: 8,
                  backgroundColor: accent, alignItems: 'center', justifyContent: 'center',
                }}>
                  <AppText style={{ fontSize: 12, fontWeight: '900', color: '#FFF' }}>
                    {mIdx + 1}
                  </AppText>
                </View>
                <AppText style={{ fontSize: 14, fontWeight: '800', color: C.navy, flex: 1 }}>
                  {mod.title}
                </AppText>
              </View>

              {/* Topics */}
              <View style={{ gap: 8 }}>

                {/* Module intro (mini-lesson) */}
                {(() => {
                  const intro = MODULE_INTROS[level]?.[mIdx];
                  if (!intro) return null;
                  const done = introDone[mIdx] ?? false;
                  const introLocked = mIdx > 0 && (() => {
                    const prevMod = modules[mIdx - 1];
                    if (!prevMod) return false;
                    return prevMod.topics.some((_, tIdx) => !isTopicComplete(mIdx - 1, tIdx));
                  })();
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        if (introLocked) return;
                        router.push({
                          pathname: '/(app)/learn-intro',
                          params: { level, moduleIndex: String(mIdx), topicIndex: '0' },
                        });
                      }}
                      activeOpacity={introLocked ? 1 : 0.75}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 14,
                        backgroundColor: done ? C.card : introLocked ? C.card : a(accent, 0.055),
                        borderRadius: 14, padding: 14,
                        borderWidth: introLocked ? 1 : 1.5,
                        borderColor: introLocked ? C.border : done ? C.border : a(accent, 0.208),
                        opacity: introLocked ? 0.55 : 1,
                        ...shadow,
                      }}
                    >
                      <View style={{
                        width: 36, height: 36, borderRadius: 10,
                        backgroundColor: introLocked ? 'rgba(22,21,58,0.05)' : done ? C.greenBg : a(accent, 0.125),
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {introLocked
                          ? <Lock size={18} color={C.lockGray} weight="fill" />
                          : done
                            ? <CheckCircle size={20} color={C.green} weight="fill" />
                            : <BookOpen size={18} color={accent} weight="fill" />
                        }
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText style={{ fontSize: 13, fontWeight: '700', color: introLocked ? C.navyLight : C.navy, lineHeight: 18 }}>
                          {intro.title}
                        </AppText>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 5 }}>
                          <View style={{
                            backgroundColor: introLocked ? 'rgba(22,21,58,0.05)' : a(accent, 0.082),
                            borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
                            flexDirection: 'row', alignItems: 'center', gap: 3,
                          }}>
                            <BookOpen size={11} color={introLocked ? C.navyLight : accent} weight="fill" />
                            <AppText style={{ fontSize: 10, fontWeight: '700', color: introLocked ? C.navyLight : accent }}>
                              Mini-lesson · {intro.slides.length} slides
                            </AppText>
                          </View>
                        </View>
                      </View>
                      {!introLocked && (
                        <View style={{
                          backgroundColor: done ? 'transparent' : accent,
                          borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
                          borderWidth: done ? 1 : 0, borderColor: a(accent, 0.25),
                          flexDirection: 'row', alignItems: 'center', gap: 4,
                        }}>
                          <AppText style={{ fontSize: 12, fontWeight: '800', color: done ? accent : '#FFF' }}>
                            {done ? (isPortuguese ? 'Rever' : 'Review') : (isPortuguese ? 'Começar' : 'Start')}
                          </AppText>
                          <CaretRight size={12} color={done ? accent : '#FFF'} weight="bold" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })()}

                {/* Topic rows */}
                {mod.topics.map((topic, tIdx) => {
                  const complete   = isTopicComplete(mIdx, tIdx);
                  const current    = isCurrent(mIdx, tIdx);
                  const miniLessonRequired = tIdx === 0 && !(introDone[mIdx] ?? false);
                  const locked     = miniLessonRequired || isLocked(mIdx, tIdx);
                  const hasContent = topicHasContent(level, mIdx, tIdx);
                  const comingSoon = locked && !hasContent;
                  const canTap     = !locked && (current || complete) && hasContent;

                  return (
                    <TouchableOpacity
                      key={tIdx}
                      onPress={() => canTap && handleStart(mIdx, tIdx)}
                      activeOpacity={canTap ? 0.75 : 1}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 14,
                        backgroundColor: C.card, borderRadius: 14, padding: 14,
                        borderWidth: 1, borderColor: C.border,
                        opacity: locked ? 0.55 : 1,
                        ...shadow,
                      }}
                    >
                      <View style={{
                        width: 36, height: 36, borderRadius: 10,
                        backgroundColor: complete ? C.greenBg : (!locked && current) ? a(accent, 0.094) : C.ghost,
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {complete ? (
                          <CheckCircle size={20} color={C.green} weight="fill" />
                        ) : locked ? (
                          <Lock size={18} color={C.lockGray} weight="fill" />
                        ) : (
                          <Play size={18} color={accent} weight="fill" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText style={{
                          fontSize: 13, fontWeight: current ? '700' : '600',
                          color: locked ? C.navyLight : C.navy, lineHeight: 18,
                        }}>
                          {topic.title}
                        </AppText>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                          {topic.grammar.length > 0 && (
                            <View style={{
                              flexDirection: 'row', alignItems: 'center', gap: 3,
                              backgroundColor: C.goldBg, borderRadius: 6,
                              paddingHorizontal: 7, paddingVertical: 3,
                            }}>
                              <BookOpen size={11} color={C.gold} weight="fill" />
                              <AppText style={{ fontSize: 10, fontWeight: '700', color: C.gold }}>
                                {topic.grammar.length} {isPortuguese ? 'gramática' : 'grammar'}
                              </AppText>
                            </View>
                          )}
                          {topic.pronunciation.length > 0 && (
                            <View style={{
                              flexDirection: 'row', alignItems: 'center', gap: 3,
                              backgroundColor: C.violetBg, borderRadius: 6,
                              paddingHorizontal: 7, paddingVertical: 3,
                            }}>
                              <Microphone size={11} color={C.violet} weight="fill" />
                              <AppText style={{ fontSize: 10, fontWeight: '700', color: C.violet }}>
                                {topic.pronunciation.length} {isPortuguese ? 'pronúncia' : 'pronunc.'}
                              </AppText>
                            </View>
                          )}
                          {comingSoon && (
                            <View style={{ backgroundColor: C.ghost, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
                              <AppText style={{ fontSize: 10, fontWeight: '700', color: C.navyLight }}>
                                {isPortuguese ? 'Em breve' : 'Coming soon'}
                              </AppText>
                            </View>
                          )}
                        </View>
                      </View>
                      {!locked && current && hasContent && !complete && (
                        <View style={{
                          backgroundColor: accent, borderRadius: 10,
                          paddingHorizontal: 12, paddingVertical: 8,
                          flexDirection: 'row', alignItems: 'center', gap: 4,
                        }}>
                          <AppText style={{ fontSize: 12, fontWeight: '800', color: '#FFF' }}>
                            {isPortuguese ? 'Iniciar' : 'Start'}
                          </AppText>
                          <CaretRight size={12} color="#FFF" weight="bold" />
                        </View>
                      )}
                      {!locked && complete && current && hasContent && (
                        <View style={{
                          backgroundColor: 'transparent', borderRadius: 10,
                          paddingHorizontal: 12, paddingVertical: 8,
                          borderWidth: 1, borderColor: a(accent, 0.314),
                          flexDirection: 'row', alignItems: 'center', gap: 4,
                        }}>
                          <AppText style={{ fontSize: 12, fontWeight: '800', color: accent }}>
                            {isPortuguese ? 'Rever' : 'Review'}
                          </AppText>
                          <CaretRight size={12} color={accent} weight="bold" />
                        </View>
                      )}
                      {complete && !current && (
                        <AppText style={{ fontSize: 11, fontWeight: '700', color: C.green }}>
                          {isPortuguese ? 'Feito' : 'Done'}
                        </AppText>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
