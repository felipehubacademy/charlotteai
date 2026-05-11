import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, ScrollView, TouchableOpacity, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { router } from 'expo-router';
import {
  ArrowLeft, BookOpen, Microphone, CheckCircle,
  Lock, Play, CaretRight,
} from 'phosphor-react-native';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/hooks/useAuth';
import { AppText } from '@/components/ui/Text';
import { CURRICULUM, TrailLevel, topicHasContent, totalTopics } from '@/data/curriculum';
import { MODULE_INTROS } from '@/data/moduleIntros';
import { useLearnProgress } from '@/hooks/useLearnProgress';

// ── Palette ────────────────────────────────────────────────────
const C = {
  bg:        '#F4F3FA',
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyMid:   '#4B4A72',
  navyLight: '#9896B8',
  ghost:     'rgba(22,21,58,0.06)',
  ghostMid:  'rgba(22,21,58,0.12)',
  border:    'rgba(22,21,58,0.10)',
  gold:      '#D97706',
  goldBg:    '#FFFBEB',
  goldBorder:'rgba(217,119,6,0.25)',
  green:     '#3D8800',
  greenBg:   '#F0FFD9',
  greenBorder:'rgba(61,136,0,0.25)',
  violet:    '#7C3AED',
  violetBg:  '#F5F3FF',
  lockGray:  '#C4C3D4',
};

const shadow = Platform.select({
  ios:     { shadowColor: 'rgba(22,21,58,0.10)', shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } },
  android: {},
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

export default function LearnTrailScreen() {
  const { profile } = useAuth();
  const level = (profile?.charlotte_level ?? 'Novice') as TrailLevel;
  const userId = profile?.id;
  const isPortuguese = level === 'Novice';

  const { progress, loading, refetch, isTopicComplete, isCurrent, isLocked } = useLearnProgress(userId, level);


  // Re-fetch progress whenever the trail screen gets focus (e.g. returning from learn-session)
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const modules = CURRICULUM[level];
  const accent  = LEVEL_COLOR[level];

  // ── Intro completion tracking ────────────────────────────────
  const [introDone, setIntroDone] = useState<Record<number, boolean>>({});

  const loadIntroDone = useCallback(async () => {
    const levelIntros = MODULE_INTROS[level];
    if (!levelIntros) return;
    const results = await Promise.all(
      Object.keys(levelIntros).map(async (k) => {
        const mIdx = parseInt(k, 10);
        const val = await SecureStore.getItemAsync(`intro_done_${userId}_${level}_${mIdx}`);
        return [mIdx, val === '1'] as [number, boolean];
      })
    );
    setIntroDone(Object.fromEntries(results));
  }, [level, userId]);

  // Load on mount and every time the screen regains focus (e.g. returning from Finish)
  useEffect(() => { loadIntroDone(); }, [loadIntroDone]);
  useFocusEffect(useCallback(() => { loadIntroDone(); }, [loadIntroDone]));

  // ── Progress counters ────────────────────────────────────────
  // Mini-lesson intros are NOT counted as progress — only regular topic completions.
  const completed = progress?.completed.length ?? 0;
  const total     = totalTopics(level);
  const pct       = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;


  const handleStart = (moduleIdx: number, topicIdx: number) => {
    router.push({
      pathname: '/(app)/learn-session',
      params: { level, moduleIndex: String(moduleIdx), topicIndex: String(topicIdx) },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top', 'left', 'right', 'bottom']}>

      {/* ── Header ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, height: 52,
        borderBottomWidth: 1, borderBottomColor: C.border,
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ArrowLeft size={22} color={C.navy} weight="bold" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <AppText style={{ fontSize: 9, fontWeight: '700', color: C.navyLight, textTransform: 'uppercase', letterSpacing: 1 }}>
            Charlotte
          </AppText>
          <AppText style={{ fontSize: 18, fontWeight: '800', color: C.navy, letterSpacing: -0.3 }}>
            {isPortuguese ? 'Trilha de Aprendizado' : 'Learning Trail'}
          </AppText>
        </View>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Trail banner ── */}
        <View style={{
          backgroundColor: C.card, borderRadius: 20, padding: 20, marginBottom: 24,
          borderWidth: 1, borderColor: C.border, ...shadow,
        }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14,
          }}>
            <View style={{
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: accent + '18',
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

          {/* Progress bar */}
          <View style={{ height: 6, backgroundColor: C.ghost, borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ height: 6, width: `${pct}%` as `${number}%`, backgroundColor: accent, borderRadius: 3 }} />
          </View>
          <AppText style={{ fontSize: 11, color: C.navyLight, fontWeight: '600', marginTop: 6 }}>
            {completed} {isPortuguese ? 'de' : 'of'} {total} {isPortuguese ? 'tópicos concluídos' : 'topics completed'}
          </AppText>
        </View>

        {loading ? (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <ActivityIndicator color={accent} />
            <AppText style={{ color: C.navyLight, marginTop: 12, fontSize: 13 }}>{isPortuguese ? 'Carregando seu progresso…' : 'Loading your progress…'}</AppText>
          </View>
        ) : (
          modules.map((mod, mIdx) => (
            <View key={mIdx} style={{ marginBottom: 24 }}>

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

                {/* ── Module intro row (mini-lesson) ── */}
                {(() => {
                  const intro = MODULE_INTROS[level]?.[mIdx];
                  if (!intro) return null;
                  const done = introDone[mIdx] ?? false;

                  // Lock mini-lesson for module N>0 until all topics in module N-1 are done.
                  // Module 0 is always accessible (entry point).
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
                        backgroundColor: done ? C.card : introLocked ? C.card : accent + '0E',
                        borderRadius: 14, padding: 14,
                        borderWidth: introLocked ? 1 : 1.5,
                        borderColor: introLocked ? C.border : done ? C.border : accent + '35',
                        opacity: introLocked ? 0.55 : 1,
                        ...shadow,
                      }}
                    >
                      {/* Icon */}
                      <View style={{
                        width: 36, height: 36, borderRadius: 10,
                        backgroundColor: introLocked
                          ? 'rgba(22,21,58,0.05)'
                          : done ? C.greenBg : accent + '20',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {introLocked
                          ? <Lock size={18} color={C.lockGray} weight="fill" />
                          : done
                            ? <CheckCircle size={20} color={C.green} weight="fill" />
                            : <BookOpen size={18} color={accent} weight="fill" />
                        }
                      </View>

                      {/* Title + tag */}
                      <View style={{ flex: 1 }}>
                        <AppText style={{ fontSize: 13, fontWeight: '700', color: introLocked ? C.navyLight : C.navy, lineHeight: 18 }}>
                          {intro.title}
                        </AppText>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 5 }}>
                          <View style={{
                            backgroundColor: introLocked ? 'rgba(22,21,58,0.05)' : accent + '15',
                            borderRadius: 6,
                            paddingHorizontal: 7, paddingVertical: 3,
                            flexDirection: 'row', alignItems: 'center', gap: 3,
                          }}>
                            <BookOpen size={11} color={introLocked ? C.navyLight : accent} weight="fill" />
                            <AppText style={{ fontSize: 10, fontWeight: '700', color: introLocked ? C.navyLight : accent }}>
                              Mini-lesson · {intro.slides.length} slides
                            </AppText>
                          </View>
                        </View>
                      </View>

                      {/* CTA */}
                      {!introLocked && (
                        <View style={{
                          backgroundColor: done ? 'transparent' : accent,
                          borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
                          borderWidth: done ? 1 : 0, borderColor: accent + '40',
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

                {mod.topics.map((topic, tIdx) => {
                  const complete = isTopicComplete(mIdx, tIdx);
                  const current  = isCurrent(mIdx, tIdx);
                  // First topic of every module stays locked until the module mini-lesson is done
                  const miniLessonRequired = tIdx === 0 && !(introDone[mIdx] ?? false);
                  // Completed topics are never locked — user can always review
                  const locked   = !complete && (miniLessonRequired || isLocked(mIdx, tIdx));
                  const hasContent = topicHasContent(level, mIdx, tIdx);

                  // If locked and no content, show coming soon
                  const comingSoon = locked && !hasContent;
                  const canTap = !locked && hasContent;

                  return (
                    <TouchableOpacity
                      key={tIdx}
                      
                      onPress={() => canTap && handleStart(mIdx, tIdx)}
                      activeOpacity={canTap ? 0.75 : 1}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 14,
                        backgroundColor: C.card,
                        borderRadius: 14, padding: 14,
                        borderWidth: 1,
                        borderColor: C.border,
                        opacity: locked ? 0.55 : 1,
                        ...shadow,
                      }}
                    >
                      {/* Status icon */}
                      <View style={{
                        width: 36, height: 36, borderRadius: 10,
                        backgroundColor: complete ? C.greenBg : (!locked && current) ? accent + '18' : C.ghost,
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

                      {/* Title */}
                      <View style={{ flex: 1 }}>
                        <AppText style={{
                          fontSize: 13, fontWeight: current ? '700' : '600',
                          color: locked ? C.navyLight : complete ? C.navyMid : current ? C.navy : C.navy,
                          lineHeight: 18,
                        }}>
                          {topic.title}
                        </AppText>

                        {/* Tags */}
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
                            <View style={{
                              backgroundColor: C.ghost, borderRadius: 6,
                              paddingHorizontal: 7, paddingVertical: 3,
                            }}>
                              <AppText style={{ fontSize: 10, fontWeight: '700', color: C.navyLight }}>
                                {isPortuguese ? 'Em breve' : 'Coming soon'}
                              </AppText>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* CTA arrow — "Iniciar" se current e não completo, "Rever" se current e já feito */}
                      {!locked && current && hasContent && !complete && (
                        <View style={{
                          backgroundColor: accent, borderRadius: 10,
                          paddingHorizontal: 12, paddingVertical: 8,
                          flexDirection: 'row', alignItems: 'center', gap: 4,
                        }}>
                          <AppText style={{ fontSize: 12, fontWeight: '800', color: '#FFF' }}>{isPortuguese ? 'Iniciar' : 'Start'}</AppText>
                          <CaretRight size={12} color="#FFF" weight="bold" />
                        </View>
                      )}
                      {!locked && complete && current && hasContent && (
                        <View style={{
                          backgroundColor: 'transparent', borderRadius: 10,
                          paddingHorizontal: 12, paddingVertical: 8,
                          borderWidth: 1, borderColor: accent + '50',
                          flexDirection: 'row', alignItems: 'center', gap: 4,
                        }}>
                          <AppText style={{ fontSize: 12, fontWeight: '800', color: accent }}>{isPortuguese ? 'Rever' : 'Review'}</AppText>
                          <CaretRight size={12} color={accent} weight="bold" />
                        </View>
                      )}
                      {complete && !current && (
                        <AppText style={{ fontSize: 11, fontWeight: '700', color: C.green }}>{isPortuguese ? 'Feito' : 'Done'}</AppText>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
