// RecentAchievements — conquistas dos últimos 3 dias de quem está no seu
// ranking, com "Parabéns" (push na hora para a pessoa; um por conquista).
// Uma linha por pessoa (a conquista mais recente e "e mais N"), 6 linhas por vez com "Ver mais":
// quem ganha várias de uma vez não toma a lista inteira.
import React, { useCallback, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Confetti, Check, DotsThreeVertical } from 'phosphor-react-native';
import { openUserActions } from '@/lib/moderation';
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
  const [shown, setShown] = useState(6);

  useFocusEffect(useCallback(() => {
    let alive = true;
    fetchSocial().then(s => { if (alive && s) setFeed(s.feed); });
    return () => { alive = false; };
  }, []));

  if (!feed.length) return null;
  // Agrupa por pessoa, mantendo a ordem do feed (mais recente primeiro).
  const groups: { first: FeedItem; more: number }[] = [];
  const seen = new Map<string, number>();
  for (const f of feed) {
    const at = seen.get(f.userId);
    if (at == null) { seen.set(f.userId, groups.length); groups.push({ first: f, more: 0 }); }
    else groups[at].more += 1;
  }
  const cheer = async (f: FeedItem) => {
    setFeed(v => v.map(x => (x.id === f.id ? { ...x, cheered: true } : x)));
    await cheerAchievement(f.id);
  };

  return (
    <>
      <SectionTitle title={isPt ? 'Conquistas recentes' : 'Recent achievements'} />
      <Card style={{ paddingVertical: 6 }}>
        {groups.slice(0, shown).map(({ first: f, more }, i) => {
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
                  {name} · {ago(f.earnedAt, isPt)}{more ? (isPt ? ` · e mais ${more} ${more === 1 ? 'conquista' : 'conquistas'}` : ` · and ${more} more`) : ''}
                </AppText>
              </View>
              <TouchableOpacity disabled={f.cheered} onPress={() => cheer(f)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: f.cheered ? C.ghost : C.voltBg }}>
                {f.cheered ? <Check size={14} color={C.light} weight="bold" /> : <Confetti size={15} color={C.ink} weight="bold" />}
                <AppText style={{ fontSize: 13, fontWeight: '800', color: f.cheered ? C.light : C.ink }}>
                  {f.cheered ? (isPt ? 'Enviado' : 'Sent') : (isPt ? 'Parabéns' : 'Congrats')}
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity hitSlop={10} accessibilityLabel={isPt ? 'Denunciar ou bloquear' : 'Report or block'}
                onPress={() => openUserActions({ id: f.userId, name: f.name }, { context: 'conquistas recentes', onBlocked: () => setFeed(v => v.filter(x => x.userId !== f.userId)) })}>
                <DotsThreeVertical size={20} color={C.light} weight="bold" />
              </TouchableOpacity>
            </View>
          );
        })}
        {groups.length > shown && (
          <TouchableOpacity onPress={() => setShown(n => n + 6)} style={{ paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: C.border }}>
            <AppText style={{ fontSize: 14, fontWeight: '800', color: C.ink }}>{isPt ? 'Ver mais' : 'See more'}</AppText>
          </TouchableOpacity>
        )}
      </Card>
    </>
  );
}
