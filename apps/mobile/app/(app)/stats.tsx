// Progresso — abre ao tocar nos contadores (sequência / XP / ranking) da Home.
// Hub da gamificação: resumo do aluno, progresso do nível e prévias de
// Conquistas, Ranking e Metas; cada prévia expande para a tela completa.

import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ShareNetwork, Fire, Trophy, BookOpenText, Lightning, Star, UsersThree, CaretRight, ChartLineUp } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { QueizyWave } from '@/components/ui/QueizyWave';
import {
  C, ScreenHeader, SectionTitle, Card, BadgeMedal, BadgeModal, RankRow, MissionRow,
  badgeTitle, firstName,
} from '@/components/stats/StatsUI';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useGoalsData } from '@/hooks/useGoalsData';
import { systemIsPt } from '@/lib/systemLang';
import { getBadgesForLevel, CatalogEntry } from '@/lib/achievementsCatalog';
import { getDailyGoal } from '@/lib/dailyGoal';
import { useShareCard } from '@/components/share/ShareCardProvider';
import {
  checkLevelPromotion, NEXT_LEVEL, PROMOTION_XP_THRESHOLD, TOTAL_TOPICS_PER_LEVEL, PromotionStatus,
} from '@/lib/levelPromotion';
import { UserLevel } from '@/lib/levelConfig';
import { localTodayStr } from '@/lib/dateUtils';

const isPt = systemIsPt;

interface TopEntry { userId: string; totalXp: number; name: string }

interface EarnedRow {
  id: string; code: string; title: string; rarity: string; category: string; earnedAt: Date;
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets(); // barra de navegação do Android / home indicator
  const openShare = useShareCard();
  const params = useLocalSearchParams<{ totalXP: string; userId: string; userLevel: string; userName: string }>();
  const { profile } = useAuth();

  const userId    = params.userId || profile?.id || '';
  const userLevel = (params.userLevel || profile?.charlotte_level || 'Inter') as UserLevel;
  const userName  = params.userName || profile?.name || '';

  const goals = useGoalsData(userId, userLevel);

  const [loading, setLoading]   = useState(true);
  const [streak, setStreak]     = useState(0);
  const [totalXP, setTotalXP]   = useState(Number(params.totalXP ?? 0));
  const [rank, setRank]         = useState(0);
  const [top3, setTop3]         = useState<TopEntry[]>([]);
  const [earned, setEarned]     = useState<EarnedRow[]>([]);
  const [trailDone, setTrailDone] = useState(0);
  const [promotion, setPromotion] = useState<PromotionStatus | null>(null);
  const [badgeModal, setBadgeModal] = useState<{ cat: CatalogEntry; earnedAt?: Date } | null>(null);

  useEffect(() => { if (userId) loadData(); }, [userId]);

  const loadData = async () => {
    try {
      const [statsRes, achRes, learnRes, levelUsersRes] = await Promise.all([
        supabase.from('charlotte_progress').select('streak_days,total_xp,last_practice_date').eq('user_id', userId).maybeSingle(),
        supabase.from('user_achievements')
          .select('id,achievement_type,achievement_name,rarity,category,earned_at')
          .eq('user_id', userId)
          .order('earned_at', { ascending: false }),
        supabase.from('learn_progress').select('completed').eq('user_id', userId).eq('level', userLevel).maybeSingle(),
        supabase.from('charlotte_users').select('id').eq('charlotte_level', userLevel),
      ]);

      const xp = statsRes.data?.total_xp ?? Number(params.totalXP ?? 0);
      const completed = (learnRes.data?.completed ?? []).length;
      const levelIds = (levelUsersRes.data ?? []).map((u: any) => u.id as string);

      const [rankRes, topRes] = await Promise.all([
        levelIds.length > 0
          ? supabase.from('charlotte_progress').select('user_id', { count: 'exact', head: true }).in('user_id', levelIds).gt('total_xp', xp)
          : Promise.resolve({ count: 0 }),
        levelIds.length > 0
          ? supabase.from('charlotte_progress').select('user_id,total_xp').in('user_id', levelIds).order('total_xp', { ascending: false }).limit(3)
          : Promise.resolve({ data: [] }),
      ]);

      const topRaw = ((topRes as any).data ?? []) as { user_id: string; total_xp: number }[];
      const { data: names } = topRaw.length > 0
        ? await supabase.from('charlotte_users').select('id, name').in('id', topRaw.map(r => r.user_id))
        : { data: [] as any[] };
      const nameMap: Record<string, string> = {};
      (names ?? []).forEach((u: any) => { nameMap[u.id] = u.name ?? ''; });

      // Mesma regra da Home: sequência só vale se praticou hoje ou ontem.
      const last = statsRes.data?.last_practice_date ?? null;
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
      setStreak(last === localTodayStr() || last === yesterday ? (statsRes.data?.streak_days ?? 0) : 0);
      setTotalXP(xp);
      setRank(((rankRes as any).count ?? 0) + 1);
      setTop3(topRaw.map(r => ({ userId: r.user_id, totalXp: r.total_xp ?? 0, name: nameMap[r.user_id] ?? '' })));
      setEarned((achRes.data ?? []).map((a: any) => ({
        id: a.id, code: a.achievement_type ?? '', title: a.achievement_name ?? '',
        rarity: a.rarity ?? 'common', category: a.category ?? 'general', earnedAt: new Date(a.earned_at),
      })));
      setTrailDone(completed);
      setPromotion(await checkLevelPromotion(userId, userLevel, completed));
    } catch {
      // mantém o que já carregou
    } finally {
      setLoading(false);
    }
  };

  // ── Derivados ───────────────────────────────────────────────────────────────
  const nextLevel   = NEXT_LEVEL[userLevel];
  const xpTarget    = PROMOTION_XP_THRESHOLD[userLevel] ?? 9999;
  const trailTotal  = promotion?.totalTopics ?? TOTAL_TOPICS_PER_LEVEL[userLevel] ?? 0;
  const trailCount  = promotion?.completedTopics ?? trailDone;
  const catalog     = getBadgesForLevel(userLevel);
  const catalogMap  = Object.fromEntries(catalog.map(c => [c.code, c]));
  const earnedCodes = new Set(earned.map(e => e.code));
  const earnedInCatalog = catalog.filter(c => earnedCodes.has(c.code)).length;
  const dailyGoal   = getDailyGoal(goals.todayXP);
  const missionsDone = goals.missions.filter(m => m.completed).length;
  const you = isPt ? '(você)' : '(you)';

  const badgePreview = [
    ...earned.slice(0, 4).map(e => ({ key: e.id, earned: true, cat: catalogMap[e.code] as CatalogEntry | undefined, row: e })),
    ...catalog.filter(c => !earnedCodes.has(c.code)).slice(0, Math.max(0, 4 - Math.min(4, earned.length)))
      .map(c => ({ key: c.code, earned: false, cat: c as CatalogEntry | undefined, row: null as EarnedRow | null })),
  ];

  const openRoute = (pathname: string) =>
    router.push({ pathname: pathname as any, params: { userId, userLevel, userName } });

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScreenHeader title={isPt ? 'Seu progresso' : 'Your progress'} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.ink} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader
        title={isPt ? 'Seu progresso' : 'Your progress'}
        right={
          <TouchableOpacity
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => openShare(streak > 0
              ? { kind: 'streak', big: String(streak), title: isPt ? (streak === 1 ? 'dia seguido' : 'dias seguidos') : (streak === 1 ? 'day in a row' : 'days in a row'), subtitle: isPt ? 'Praticando inglês todo dia.' : 'Practicing English every day.' }
              : { kind: 'xp', big: totalXP.toLocaleString(isPt ? 'pt-BR' : 'en-US'), title: 'XP', subtitle: isPt ? 'Somando pontos estudando inglês.' : 'Racking up points learning English.' })}
          >
            <ShareNetwork size={21} color={C.ink} weight="bold" />
          </TouchableOpacity>
        }
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 16, paddingBottom: 48 + insets.bottom }} showsVerticalScrollIndicator={false}>

        {/* ── Resumo ─────────────────────────────────────────────────────── */}
        <View style={{ marginHorizontal: 16, backgroundColor: C.ink, borderRadius: 24, padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText style={{ fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase' }}>
              {isPt ? 'XP total' : 'Total XP'}
            </AppText>
            <View style={{ backgroundColor: C.volt, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
              <AppText style={{ fontSize: 12, fontWeight: '800', color: C.ink }}>{userLevel}</AppText>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 4 }}>
            <AppText display style={{ fontSize: 46, fontWeight: '800', color: '#FFFFFF', lineHeight: 50 }}>
              {totalXP.toLocaleString()}
            </AppText>
            {goals.todayXP > 0 && (
              <AppText style={{ fontSize: 14, fontWeight: '800', color: C.volt, marginBottom: 8 }}>
                +{goals.todayXP} {isPt ? 'hoje' : 'today'}
              </AppText>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 12, gap: 6 }}>
              <Fire size={18} color={streak > 0 ? C.pink : 'rgba(255,255,255,0.4)'} weight="fill" />
              <AppText display style={{ fontSize: 22, fontWeight: '800', color: '#FFFFFF' }}>{streak}</AppText>
              <AppText style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
                {isPt ? (streak === 1 ? 'dia seguido' : 'dias seguidos') : (streak === 1 ? 'day streak' : 'days streak')}
              </AppText>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => openRoute('/(app)/leaderboard')}
              style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 12, gap: 6 }}
            >
              <Trophy size={18} color={C.volt} weight="fill" />
              <AppText display style={{ fontSize: 22, fontWeight: '800', color: '#FFFFFF' }}>{rank > 0 ? (isPt ? `${rank}º` : `#${rank}`) : '—'}</AppText>
              <AppText style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
                {isPt ? `no ranking ${userLevel}` : `in ${userLevel} ranking`}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Minha evolução ─────────────────────────────────────────────── */}
        <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/(app)/evolution' as any)}
          style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: C.card, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: C.border }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.voltBg, alignItems: 'center', justifyContent: 'center' }}>
            <ChartLineUp size={22} color={C.ink} weight="bold" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText display style={{ fontSize: 17, fontWeight: '800', color: C.ink }}>{isPt ? 'Minha evolução' : 'My progress'}</AppText>
            <AppText style={{ fontSize: 13, color: C.mid, marginTop: 2 }}>
              {isPt ? 'O que você domina e o que vale treinar.' : "What you've mastered and what to practice."}
            </AppText>
          </View>
          <CaretRight size={18} color={C.ink} weight="bold" />
        </TouchableOpacity>

        {/* ── Progresso do nível ─────────────────────────────────────────── */}
        <SectionTitle title={nextLevel ? (isPt ? `Rumo ao ${nextLevel}` : `Road to ${nextLevel}`) : (isPt ? `Nível ${userLevel}` : `${userLevel} level`)} />
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <BookOpenText size={16} color={C.mid} weight="bold" />
            <AppText style={{ flex: 1, fontSize: 14, fontWeight: '700', color: C.ink }}>
              {isPt ? 'Trilha' : 'Trail'}
            </AppText>
            <AppText style={{ fontSize: 13, fontWeight: '800', color: C.mid }}>{trailCount}/{trailTotal}</AppText>
          </View>
          <QueizyWave progress={trailTotal > 0 ? trailCount / trailTotal : 0} height={14} strokeWidth={4} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, marginBottom: 8 }}>
            <Lightning size={16} color={C.mid} weight="fill" />
            <AppText style={{ flex: 1, fontSize: 14, fontWeight: '700', color: C.ink }}>XP</AppText>
            <AppText style={{ fontSize: 13, fontWeight: '800', color: C.mid }}>
              {totalXP.toLocaleString()}/{xpTarget.toLocaleString()}
            </AppText>
          </View>
          <QueizyWave progress={totalXP / xpTarget} height={14} strokeWidth={4} />

          {promotion?.eligible && nextLevel && (
            <View style={{
              marginTop: 16, backgroundColor: C.volt, borderRadius: 14,
              paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8,
            }}>
              <Star size={15} color={C.ink} weight="fill" />
              <AppText style={{ flex: 1, fontSize: 13, fontWeight: '800', color: C.ink }}>
                {isPt ? `Pronto para o ${nextLevel}!` : `Ready for ${nextLevel}!`}
              </AppText>
            </View>
          )}
        </Card>

        {/* ── Conquistas ─────────────────────────────────────────────────── */}
        <SectionTitle
          title={isPt ? 'Conquistas' : 'Achievements'}
          meta={`${earnedInCatalog}/${catalog.length}`}
          onPress={() => openRoute('/(app)/achievements')}
        />
        <Card style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, paddingTop: 20 }}>
          {badgePreview.map(b => (
            <BadgeMedal
              key={b.key}
              category={b.cat?.category ?? b.row?.category ?? 'general'}
              rarity={b.cat?.rarity ?? b.row?.rarity ?? 'common'}
              earned={b.earned}
              label={badgeTitle(b.cat, b.row?.title ?? '', isPt)}
              size={52}
              onPress={() => b.cat && setBadgeModal({ cat: b.cat, earnedAt: b.row?.earnedAt })}
            />
          ))}
        </Card>

        {/* ── Ranking ────────────────────────────────────────────────────── */}
        <SectionTitle
          title="Ranking"
          meta={userLevel}
          onPress={() => openRoute('/(app)/leaderboard')}
        />
        <Card style={{ paddingVertical: 6 }}>
          {top3.length === 0 ? (
            <AppText style={{ fontSize: 13, color: C.light, textAlign: 'center', paddingVertical: 18 }}>
              {isPt ? 'O ranking ainda está vazio.' : 'The ranking is still empty.'}
            </AppText>
          ) : (
            <>
              {top3.map((e, i) => (
                <RankRow
                  key={e.userId}
                  rank={i + 1}
                  name={firstName(e.userId === userId ? userName : e.name, `#${i + 1}`)}
                  xp={e.userId === userId ? totalXP : e.totalXp}
                  isUser={e.userId === userId}
                  youLabel={you}
                  last={i === top3.length - 1 && top3.some(t => t.userId === userId)}
                />
              ))}
              {!top3.some(e => e.userId === userId) && (
                <RankRow rank={rank} name={firstName(userName, isPt ? 'Você' : 'You')} xp={totalXP} isUser youLabel={you} last />
              )}
            </>
          )}
        </Card>

        {/* ── Estudar junto ───────────────────────────────────────────────── */}
        <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/(app)/study-together' as any)}
          style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: C.volt, borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
            <UsersThree size={22} color={C.volt} weight="bold" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText display style={{ fontSize: 17, fontWeight: '800', color: C.ink }}>{isPt ? 'Estudar junto' : 'Study together'}</AppText>
            <AppText style={{ fontSize: 13, color: C.mid, marginTop: 2 }}>
              {isPt ? 'Convide alguém e ganhem minutos de Live Voice.' : 'Invite someone and both get Live Voice minutes.'}
            </AppText>
          </View>
          <CaretRight size={18} color={C.ink} weight="bold" />
        </TouchableOpacity>

        {/* ── Metas ──────────────────────────────────────────────────────── */}
        <SectionTitle
          title={isPt ? 'Metas' : 'Goals'}
          meta={goals.missions.length > 0 ? `${missionsDone}/${goals.missions.length}` : undefined}
          onPress={() => router.push('/(app)/goals')}
        />
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <AppText style={{ flex: 1, fontSize: 14, fontWeight: '700', color: C.ink }}>
              {isPt ? 'Meta de hoje' : "Today's goal"}
            </AppText>
            <AppText style={{ fontSize: 13, fontWeight: '800', color: C.mid }}>
              {goals.todayXP}/{dailyGoal} XP
            </AppText>
          </View>
          <QueizyWave progress={goals.todayXP / dailyGoal} height={14} strokeWidth={4} />

          <View style={{ marginTop: 8 }}>
            {goals.missions.map((m, i) => (
              <MissionRow key={m.id} mission={m} isPt={isPt} compact last={i === goals.missions.length - 1} />
            ))}
          </View>

          {goals.weekly && (
            <View style={{ marginTop: 6, backgroundColor: C.bg, borderRadius: 14, padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <AppText style={{ flex: 1, fontSize: 13, fontWeight: '700', color: C.ink }} numberOfLines={1}>
                  {isPt ? 'Desafio da semana' : 'Weekly challenge'}
                  <AppText style={{ fontSize: 13, fontWeight: '600', color: C.mid }}>
                    {' · '}{isPt ? goals.weekly.challenge.title.pt : goals.weekly.challenge.title.en}
                  </AppText>
                </AppText>
                <AppText style={{ fontSize: 12, fontWeight: '800', color: C.mid }}>
                  {Math.min(goals.weekly.current, goals.weekly.challenge.target)}/{goals.weekly.challenge.target}
                </AppText>
              </View>
              <QueizyWave progress={goals.weekly.current / goals.weekly.challenge.target} height={12} strokeWidth={3.5} />
            </View>
          )}
        </Card>
      </ScrollView>

      {badgeModal && (
        <BadgeModal cat={badgeModal.cat} earnedAt={badgeModal.earnedAt} isPt={isPt} onClose={() => setBadgeModal(null)}
          onShare={title => { setBadgeModal(null); setTimeout(() => openShare({ kind: 'achievement', big: title, title: isPt ? 'Conquista desbloqueada' : 'Achievement unlocked' }), 400); }} />
      )}
    </View>
  );
}
