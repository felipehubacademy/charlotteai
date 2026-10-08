// RecentAchievements — conquistas dos últimos 3 dias de quem está no seu
// ranking, com "Parabéns" (push na hora para a pessoa; um por conquista).
import React, { useCallback, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Confetti, Check } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { C, Card, SectionTitle, AchievementIcon } from '@/components/stats/StatsUI';
import { systemIsPt } from '@/lib/systemLang';
import { fetchSocial, cheerAchievement, FeedItem } from '@/lib/social';
import { GENERAL_ACHIEVEMENTS, LEVEL_ACHIEVEMENTS } from '@/lib/achievementsCatalog';

const RARITY_COLOR: Record<string, string> = { common: '#08804A', rare: '#3B82F6', epic: '#A855F7', legendary: '#F59E0B' };
const ALL = [...GENERAL_ACHIEVEMENTS, ...LEVEL_ACHIEVEMENTS];

function ago(iso: string, pt: boolean) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return pt ? 'agora há pouco' : 'just now';
  if (h < 24) return pt ? `há ${h}h` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return pt ? `há ${d} ${d === 1 ? 'dia' : 'dias'}` : `${d}d ago`;
}

export function RecentAchievements() {
  const isPt = systemIsPt;
  const [feed, setFeed] = useState<FeedItem[]>([]);

  useFocusEffect(useCallback(() => {
    let alive = true;
    fetchSocial().then(s => { if (alive && s) setFeed(s.feed); });
    return () => { alive = false; };
  }, []));

  if (!feed.length) return null;
  const cheer = async (f: FeedItem) => {
    setFeed(v => v.map(x => (x.id === f.id ? { ...x, cheered: true } : x)));
    await cheerAchievement(f.id);
  };

  return (
    <>
      <SectionTitle title={isPt ? 'Conquistas recentes' : 'Recent achievements'} />
      <Card style={{ paddingVertical: 6 }}>
        {feed.map((f, i) => {
          const cat = ALL.find(a => a.code === f.code);
          const title = cat ? (isPt ? cat.title : (cat.titleEN ?? cat.title)) : f.title;
          const name = (f.name ?? '').trim().split(/\s+/)[0] || (isPt ? 'Alguém' : 'Someone');
          return (
            <View key={f.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ghost }}>
                <AchievementIcon category={f.category} color={RARITY_COLOR[f.rarity] ?? C.green} size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={{ fontSize: 14, fontWeight: '800', color: C.ink }} numberOfLines={2}>{title}</AppText>
                <AppText style={{ fontSize: 12.5, color: C.mid, marginTop: 1 }} numberOfLines={1}>
                  {name} · {ago(f.earnedAt, isPt)}
                </AppText>
              </View>
              <TouchableOpacity disabled={f.cheered} onPress={() => cheer(f)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: f.cheered ? C.ghost : C.voltBg }}>
                {f.cheered ? <Check size={14} color={C.light} weight="bold" /> : <Confetti size={15} color={C.ink} weight="bold" />}
                <AppText style={{ fontSize: 13, fontWeight: '800', color: f.cheered ? C.light : C.ink }}>
                  {f.cheered ? (isPt ? 'Enviado' : 'Sent') : (isPt ? 'Parabéns' : 'Congrats')}
                </AppText>
              </TouchableOpacity>
            </View>
          );
        })}
      </Card>
    </>
  );
}
