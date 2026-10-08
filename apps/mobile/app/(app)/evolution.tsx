// Minha evolução — o que o aluno acerta e erra, com o resumo da semana escrito
// pela Charlotte, pontos de atenção com "Treinar" e a referência do EF EPI.

import React, { useCallback, useState } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import { ArrowUp, ArrowDown, CheckCircle, Target, Microphone, PencilLine, Globe } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import CharlotteAvatar from '@/components/ui/CharlotteAvatar';
import { C, ScreenHeader, SectionTitle, Card } from '@/components/stats/StatsUI';
import { supabase } from '@/lib/supabase';
import { systemIsPt } from '@/lib/systemLang';

const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://charlotte.hubacademybr.com';

interface TopicStat { level: string; moduleIndex: number; topicIndex: number; module: string; topic: string; accuracy: number; answers: number }
interface Evolution {
  name: string | null; level: string | null; streak: number; xp: number;
  trail: { accuracy: number | null; previous: number | null; answers: number };
  pronunciation: { avg: number | null; previous: number | null; attempts: number; words: { word: string; count: number }[] };
  grammar: { errorFree: number | null; previous: number | null; analyzed: number; recent: { wrong: string; right: string }[] };
  strengths: TopicStat[]; focus: TopicStat[];
  weeks: { start: string; practices: number; trailAccuracy: number | null; pronunciation: number | null }[];
  benchmark: { source: string; text: string };
  summary: string;
}

function Delta({ now, prev, suffix = '' }: { now: number | null; prev: number | null; suffix?: string }) {
  if (now == null || prev == null || now === prev) return null;
  const up = now > prev;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 }}>
      <Icon size={11} color={up ? C.green : '#D12A64'} weight="bold" />
      <AppText style={{ fontSize: 11.5, fontWeight: '700', color: up ? C.green : '#D12A64' }}>{Math.abs(now - prev)}{suffix}</AppText>
    </View>
  );
}

function Kpi({ label, value, now, prev, suffix, sub }: { label: string; value: string; now: number | null; prev: number | null; suffix?: string; sub?: string }) {
  return (
    <Card style={{ flex: 1, padding: 14, marginHorizontal: 0 }}>
      <AppText style={{ fontSize: 11, fontWeight: '700', color: C.light, textTransform: 'uppercase', letterSpacing: 0.4 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{label}</AppText>
      <AppText display style={{ fontSize: 24, fontWeight: '800', color: C.ink, marginTop: 4 }}>{value}</AppText>
      <Delta now={now} prev={prev} suffix={suffix} />
      {sub ? <AppText style={{ fontSize: 11, color: C.light, marginTop: 4 }} numberOfLines={1}>{sub}</AppText> : null}
    </Card>
  );
}

function TrainButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
      <AppText style={{ fontSize: 12.5, fontWeight: '800', color: C.volt }}>{label}</AppText>
    </TouchableOpacity>
  );
}

export default function EvolutionScreen() {
  const isPt = systemIsPt;
  const t = (pt: string, en: string) => (isPt ? pt : en);
  const [data, setData] = useState<Evolution | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const { data: s } = await supabase.auth.getSession();
      const r = await fetch(`${API_BASE_URL}/api/progress/evolution?lang=${isPt ? 'pt' : 'en'}`, {
        headers: { Authorization: `Bearer ${s.session?.access_token ?? ''}` },
      });
      if (!r.ok) throw new Error(String(r.status));
      setData(await r.json());
    } catch { setError(true); }
    setLoading(false);
  }, [isPt]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const pctText = (v: number | null) => (v == null ? '—' : `${v}%`);
  const maxWeek = Math.max(1, ...(data?.weeks.map(w => w.practices) ?? [1]));
  const trainTopic = (f: TopicStat) => router.push({
    pathname: '/(app)/learn-session',
    params: { level: f.level, moduleIndex: String(f.moduleIndex), topicIndex: String(f.topicIndex) },
  } as any);
  const trainPractice = (mode: 'pronunciation' | 'grammar') => router.push({ pathname: '/(app)/(tabs)/practice', params: { mode } } as any);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader title={t('Minha evolução', 'My progress')} />
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 48 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
        {loading && !data && <ActivityIndicator color={C.ink} style={{ marginTop: 40 }} />}
        {error && !data && (
          <AppText style={{ textAlign: 'center', color: C.mid, marginTop: 40 }}>{t('Não foi possível carregar agora.', "Couldn't load right now.")}</AppText>
        )}

        {data && (
          <>
            {/* Resumo da semana, pela Charlotte */}
            <View style={{ marginHorizontal: 16, backgroundColor: C.ink, borderRadius: 24, padding: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <CharlotteAvatar size="sm" />
                <View>
                  <AppText style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>Charlotte</AppText>
                  <AppText style={{ fontSize: 11, fontWeight: '700', color: C.volt, letterSpacing: 0.6, textTransform: 'uppercase' }}>{t('Resumo da semana', 'Weekly summary')}</AppText>
                </View>
              </View>
              <AppText style={{ fontSize: 15.5, lineHeight: 23, color: 'rgba(255,255,255,0.92)' }}>{data.summary}</AppText>
            </View>

            {/* Números dos últimos 30 dias vs os 30 anteriores */}
            <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 14 }}>
              <Kpi label={t('Trilha', 'Trail')} value={pctText(data.trail.accuracy)} now={data.trail.accuracy} prev={data.trail.previous} suffix="%" sub={data.trail.answers ? t(`${data.trail.answers} respostas`, `${data.trail.answers} answers`) : undefined} />
              <Kpi label={t('Pronúncia', 'Pronunciation')} value={data.pronunciation.avg == null ? '—' : String(data.pronunciation.avg)} now={data.pronunciation.avg} prev={data.pronunciation.previous} sub={data.pronunciation.attempts ? t(`${data.pronunciation.attempts} frases`, `${data.pronunciation.attempts} phrases`) : undefined} />
              <Kpi label={t('Gramática', 'Grammar')} value={pctText(data.grammar.errorFree)} now={data.grammar.errorFree} prev={data.grammar.previous} suffix="%" sub={data.grammar.analyzed ? t(`sem erro em ${data.grammar.analyzed}`, `error-free of ${data.grammar.analyzed}`) : undefined} />
            </View>
            <AppText style={{ fontSize: 11.5, color: C.light, marginHorizontal: 20, marginTop: 6 }}>
              {t('Últimos 30 dias, comparados aos 30 anteriores.', 'Last 30 days, compared with the 30 before.')}
            </AppText>

            {/* Pontos fortes */}
            {data.strengths.length > 0 && (
              <>
                <SectionTitle title={t('Você está mandando bem em', "You're nailing")} />
                <Card style={{ paddingVertical: 6 }}>
                  {data.strengths.map((s, i) => (
                    <View key={`${s.level}${s.moduleIndex}${s.topicIndex}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
                      <CheckCircle size={20} color={C.green} weight="fill" />
                      <View style={{ flex: 1 }}>
                        <AppText style={{ fontSize: 14.5, fontWeight: '700', color: C.ink }}>{s.topic}</AppText>
                        <AppText style={{ fontSize: 12, color: C.light, marginTop: 1 }}>{s.level} · {s.module}</AppText>
                      </View>
                      <AppText style={{ fontSize: 15, fontWeight: '800', color: C.green }}>{s.accuracy}%</AppText>
                    </View>
                  ))}
                </Card>
              </>
            )}

            {/* Pontos de atenção */}
            {(data.focus.length > 0 || data.pronunciation.words.length > 0 || data.grammar.recent.length > 0) && (
              <SectionTitle title={t('Vale treinar', 'Worth practicing')} />
            )}
            {data.focus.length > 0 && (
              <Card style={{ paddingVertical: 6 }}>
                {data.focus.map((f, i) => (
                  <View key={`${f.level}${f.moduleIndex}${f.topicIndex}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
                    <Target size={20} color="#D12A64" weight="bold" />
                    <View style={{ flex: 1 }}>
                      <AppText style={{ fontSize: 14.5, fontWeight: '700', color: C.ink }}>{f.topic}</AppText>
                      <AppText style={{ fontSize: 12, color: C.light, marginTop: 1 }}>{t(`${f.accuracy}% de acerto`, `${f.accuracy}% correct`)}</AppText>
                    </View>
                    <TrainButton label={t('Treinar', 'Practice')} onPress={() => trainTopic(f)} />
                  </View>
                ))}
              </Card>
            )}
            {data.pronunciation.words.length > 0 && (
              <Card style={{ marginTop: 10, padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Microphone size={18} color={C.ink} weight="bold" />
                  <AppText style={{ flex: 1, fontSize: 14.5, fontWeight: '700', color: C.ink }}>{t('Palavras para caprichar', 'Words to polish')}</AppText>
                  <TrainButton label={t('Treinar', 'Practice')} onPress={() => trainPractice('pronunciation')} />
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {data.pronunciation.words.map(w => (
                    <View key={w.word} style={{ backgroundColor: 'rgba(209,42,100,0.10)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <AppText style={{ fontSize: 13, fontWeight: '700', color: '#D12A64' }}>{w.word}</AppText>
                    </View>
                  ))}
                </View>
              </Card>
            )}
            {data.grammar.recent.length > 0 && (
              <Card style={{ marginTop: 10, padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <PencilLine size={18} color={C.ink} weight="bold" />
                  <AppText style={{ flex: 1, fontSize: 14.5, fontWeight: '700', color: C.ink }}>{t('Correções recentes', 'Recent corrections')}</AppText>
                  <TrainButton label={t('Treinar', 'Practice')} onPress={() => trainPractice('grammar')} />
                </View>
                {data.grammar.recent.map((c, i) => (
                  <AppText key={i} style={{ fontSize: 13.5, lineHeight: 20, marginTop: i ? 6 : 0 }}>
                    <AppText style={{ color: '#D12A64', textDecorationLine: 'line-through' }}>{c.wrong}</AppText>
                    <AppText style={{ color: C.light }}>{'  →  '}</AppText>
                    <AppText style={{ color: C.green, fontWeight: '700' }}>{c.right}</AppText>
                  </AppText>
                ))}
              </Card>
            )}

            {/* Últimas 8 semanas */}
            <SectionTitle title={t('Suas últimas 8 semanas', 'Your last 8 weeks')} />
            <Card style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 110 }}>
                {data.weeks.map((w, i) => (
                  <View key={w.start} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <AppText style={{ fontSize: 10.5, fontWeight: '700', color: C.mid }}>{w.practices || ''}</AppText>
                    <View style={{ width: '100%', height: Math.max(4, (w.practices / maxWeek) * 80), borderRadius: 6, backgroundColor: i === data.weeks.length - 1 ? C.ink : C.volt }} />
                  </View>
                ))}
              </View>
              <AppText style={{ fontSize: 11.5, color: C.light, marginTop: 10 }}>{t('Práticas por semana. A barra escura é esta semana.', 'Practices per week. The dark bar is this week.')}</AppText>
            </Card>

            {/* Referência pública */}
            <SectionTitle title={t('Você e o Brasil', 'You and Brazil')} />
            <Card style={{ padding: 16, flexDirection: 'row', gap: 12 }}>
              <Globe size={22} color={C.ink} weight="bold" />
              <View style={{ flex: 1 }}>
                <AppText style={{ fontSize: 14, lineHeight: 20, color: C.mid }}>{data.benchmark.text}</AppText>
                <AppText style={{ fontSize: 11.5, color: C.light, marginTop: 6 }}>{t('Fonte', 'Source')}: {data.benchmark.source}</AppText>
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}
