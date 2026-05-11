import React, { useEffect, useState } from 'react';
import {
  View, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator,
  Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft, ShareNetwork, Star, Lightning, Fire, Trophy,
  BookOpenText, CaretRight, Medal,
  Microphone, PencilLine, GraduationCap, Sun, CalendarCheck,
  RocketLaunch, X, Lock, CheckCircle,
} from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { supabase } from '@/lib/supabase';
import { Achievement } from '@/lib/types/achievement';
import { getBadgesForLevel, CatalogEntry } from '@/lib/achievementsCatalog';
import { shareStreak, shareXP } from '@/lib/shareUtils';
import {
  checkLevelPromotion,
  NEXT_LEVEL,
  PROMOTION_XP_THRESHOLD,
  TOTAL_TOPICS_PER_LEVEL,
  PromotionStatus,
} from '@/lib/levelPromotion';

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:        '#F4F3FA',
  card:      '#FFFFFF',
  navy:      '#16153A',
  navyLight: '#9896B8',
  ghost:     'rgba(22,21,58,0.06)',
  border:    'rgba(22,21,58,0.08)',
  green:     '#3D8800',
  greenLight:'#F0FFD9',
};

const LEVEL_COLOR: Record<string, string> = {
  Novice:   '#D97706',
  Inter:    '#7C3AED',
  Advanced: '#0F766E',
};

const RARITY_COLORS: Record<string, string> = {
  common:    '#22C55E',
  rare:      '#3B82F6',
  epic:      '#A855F7',
  legendary: '#EAB308',
};

const MEDAL_COLORS = ['#EAB308', '#9CA3AF', '#B45309'];

type Level = 'Novice' | 'Inter' | 'Advanced';

interface RecentActivity {
  type: string;
  xp: number;
  timestamp: Date;
}

interface TopEntry {
  userId: string;
  totalXp: number;
  name: string;
}

interface AchievementWithCategory extends Achievement {
  category: string;
  code: string; // achievement_type — used to match against catalog
}

interface StatsData {
  streak: number;
  freshTotalXP: number;
  recentActivity: RecentActivity[];
  achievements: AchievementWithCategory[];
  rank: number;
  top3: TopEntry[];
  trailDone: number;
  loading: boolean;
  error: string | null;
}

function AchievementIcon({ category, rarity, size = 20 }: { category: string; rarity: string; size?: number }) {
  const color = rarity === 'locked' ? 'rgba(22,21,58,0.22)' : (RARITY_COLORS[rarity] ?? '#22C55E');
  switch (category) {
    case 'xp':
    case 'xp_milestone': return <Lightning     size={size} color={color} weight="fill" />;
    case 'streak':       return <Fire          size={size} color={color} weight="fill" />;
    case 'audio':        return <Microphone    size={size} color={color} weight="fill" />;
    case 'grammar':
    case 'text':         return <PencilLine    size={size} color={color} weight="fill" />;
    case 'learn':        return <GraduationCap size={size} color={color} weight="fill" />;
    case 'habit':        return <Sun           size={size} color={color} weight="fill" />;
    case 'consistency':  return <CalendarCheck size={size} color={color} weight="fill" />;
    default:             return <Star          size={size} color={color} weight="fill" />;
  }
}

// ── Screen ─────────────────────────────────────────────────────────────────────
export default function StatsScreen() {
  const params = useLocalSearchParams<{
    sessionXP: string;
    totalXP:   string;
    userId:    string;
    userLevel: string;
    userName:  string;
  }>();

  const totalXP   = Number(params.totalXP   ?? 0);
  const userId    = params.userId   ?? '';
  const userLevel = (params.userLevel ?? 'Inter') as Level;
  const userName  = params.userName  ?? '';

  const isPortuguese = userLevel === 'Novice';
  const accent       = LEVEL_COLOR[userLevel] ?? C.navy;

  const [promotionStatus, setPromotionStatus] = useState<PromotionStatus | null>(null);
  const [badgeModal, setBadgeModal] = useState<{ catalog: CatalogEntry; earnedAt?: Date } | null>(null);
  const [data, setData] = useState<StatsData>({
    streak: 0, freshTotalXP: totalXP,
    recentActivity: [], achievements: [],
    rank: 0, top3: [], trailDone: 0,
    loading: true, error: null,
  });

  useEffect(() => { if (userId) loadData(); }, [userId]);

  const loadData = async () => {
    if (!userId) return;
    setData(prev => ({ ...prev, loading: true, error: null }));
    try {
      // Labels alinhados ao novo layout (Free Chat, Grammar, Pronunciation, etc).
      const typeLabels: Record<string, string> = {
        text_message:      'Free Chat',
        audio_message:     isPortuguese ? 'Free Chat (voz)' : 'Free Chat (voice)',
        grammar:           isPortuguese ? 'Gramática'       : 'Grammar',
        grammar_message:   isPortuguese ? 'Gramática'       : 'Grammar',
        pronunciation:     isPortuguese ? 'Pronúncia'       : 'Pronunciation',
        live_voice:        'Live Voice',
        learn_exercise:    isPortuguese ? 'Trilha'          : 'Learning Trail',
        sr_review:         isPortuguese ? 'Revisão'         : 'SR Review',
        vocab_review:      isPortuguese ? 'Vocabulário'     : 'Vocabulary',
        image_recognition: isPortuguese ? 'Reconhecimento'  : 'Recognition',
      };
      const getLabel = (type: string) => {
        if (type.startsWith('mission_reward_')) return isPortuguese ? 'Missão Concluída' : 'Mission Complete';
        if (type.startsWith('weekly_reward_'))  return isPortuguese ? 'Recompensa Semanal' : 'Weekly Reward';
        return typeLabels[type] ?? (isPortuguese ? 'Prática' : 'Practice');
      };

      const [statsRes, historyRes, achievementsRes, learnProgressRes, levelUsersRes] = await Promise.all([
        supabase.from('charlotte_progress')
          .select('streak_days,total_xp')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase.from('charlotte_practices')
          .select('practice_type,xp_earned,created_at')
          .eq('user_id', userId)
          .not('practice_type', 'like', 'achievement_reward_%')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('user_achievements')
          .select('id,achievement_type,achievement_name,achievement_description,xp_bonus,rarity,category,earned_at')
          .eq('user_id', userId)
          .order('earned_at', { ascending: false })
          .limit(4),
        supabase.from('learn_progress')
          .select('completed')
          .eq('user_id', userId)
          .eq('level', userLevel)
          .maybeSingle(),
        supabase.from('charlotte_users')
          .select('id')
          .eq('charlotte_level', userLevel),
      ]);

      const freshTotalXP = statsRes.data?.total_xp ?? totalXP;
      const completedCount = (learnProgressRes.data?.completed ?? []).length;

      // IDs of all users in the same level — used to scope ranking
      const levelUserIds = (levelUsersRes.data ?? []).map((u: any) => u.id as string);

      const [rankRes, top3Res] = await Promise.all([
        levelUserIds.length > 0
          ? supabase.from('charlotte_progress')
              .select('user_id', { count: 'exact', head: true })
              .in('user_id', levelUserIds)
              .gt('total_xp', freshTotalXP)
          : Promise.resolve({ count: 0 }),
        levelUserIds.length > 0
          ? supabase.from('charlotte_progress')
              .select('user_id,total_xp')
              .in('user_id', levelUserIds)
              .order('total_xp', { ascending: false })
              .limit(3)
          : Promise.resolve({ data: [] }),
      ]);

      const userRank = ((rankRes as any).count ?? 0) + 1;

      const recentActivity: RecentActivity[] = (historyRes.data ?? []).map((p: any) => ({
        type: getLabel(p.practice_type),
        xp: p.xp_earned ?? 0,
        timestamp: new Date(p.created_at),
      }));

      const achievements: AchievementWithCategory[] = (achievementsRes.data ?? []).map((a: any) => ({
        id: a.id,
        code: a.achievement_type ?? '',
        type: 'general',
        title: a.achievement_name ?? 'Achievement',
        description: a.achievement_description ?? '',
        xpBonus: a.xp_bonus ?? 0,
        rarity: (a.rarity ?? 'common') as Achievement['rarity'],
        icon: '',
        earnedAt: new Date(a.earned_at),
        category: a.category ?? 'general',
      }));

      const top3Raw = ((top3Res as any).data ?? []).map((r: any) => ({
        userId: r.user_id,
        totalXp: r.total_xp ?? 0,
      }));

      // Fetch names for top3 users
      const top3UserIds = top3Raw.map((e: any) => e.userId);
      const { data: top3Users } = top3UserIds.length > 0
        ? await supabase.from('charlotte_users').select('id, name').in('id', top3UserIds)
        : { data: [] };
      const nameMap: Record<string, string> = {};
      (top3Users ?? []).forEach((u: any) => { nameMap[u.id] = u.name ?? ''; });

      const top3: TopEntry[] = top3Raw.map((e: any) => ({
        ...e,
        name: nameMap[e.userId] ?? '',
      }));

      setData({
        streak: statsRes.data?.streak_days ?? 0,
        freshTotalXP,
        recentActivity,
        achievements,
        rank: userRank,
        top3,
        trailDone: completedCount,
        loading: false,
        error: null,
      });

      const status = await checkLevelPromotion(userId, userLevel, completedCount);
      setPromotionStatus(status);
    } catch {
      setData(prev => ({ ...prev, loading: false, error: 'Error loading data' }));
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const displayXP            = data.freshTotalXP;
  const promotionXPThreshold = PROMOTION_XP_THRESHOLD[userLevel] ?? 9999;
  const trailTotal           = promotionStatus?.totalTopics ?? TOTAL_TOPICS_PER_LEVEL[userLevel] ?? 0;
  const trailDone            = promotionStatus?.completedTopics ?? data.trailDone;
  const trailPct             = trailTotal > 0 ? Math.min(100, (trailDone / trailTotal) * 100) : 0;
  const xpPct                = Math.min(100, (displayXP / promotionXPThreshold) * 100);
  const nextLevelName        = NEXT_LEVEL[userLevel];

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (data.loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top', 'left', 'right', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
          <ActivityIndicator size="large" color={C.navy} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, height: 52,
        backgroundColor: C.card,
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={22} color={C.navy} weight="bold" />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <AppText style={{ fontSize: 9, fontWeight: '700', color: C.navyLight, textTransform: 'uppercase', letterSpacing: 1 }}>
            CHARLOTTE
          </AppText>
          <AppText style={{ fontSize: 18, fontWeight: '800', color: C.navy, letterSpacing: -0.3 }}>
            {isPortuguese ? 'Seu Progresso' : 'Your Progress'}
          </AppText>
        </View>

        <TouchableOpacity
          onPress={() => {
            if (data.streak > 0) shareStreak(data.streak, isPortuguese);
            else shareXP(displayXP, isPortuguese);
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ShareNetwork size={20} color={C.navyLight} weight="regular" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
      >

        {/* ── Hero block ───────────────────────────────────────────────────── */}
        <View style={{
          marginHorizontal: 16, borderRadius: 20,
          paddingHorizontal: 20, paddingVertical: 14,
          backgroundColor: accent, marginBottom: 24,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: 'rgba(255,255,255,0.15)',
              paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
            }}>
              <Fire size={13} color="#FFFFFF" weight="fill" />
              <AppText style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                {data.streak}d
              </AppText>
            </View>

            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: 'rgba(255,255,255,0.15)',
              paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
            }}>
              <Lightning size={13} color="#FFFFFF" weight="fill" />
              <AppText style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                {displayXP.toLocaleString()} XP
              </AppText>
            </View>

            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: 'rgba(255,255,255,0.15)',
              paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
            }}>
              <Trophy size={13} color="#FFFFFF" weight="fill" />
              <AppText style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                {data.rank > 0 ? `#${data.rank}` : '--'}
              </AppText>
            </View>
          </View>

          <View style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20,
          }}>
            <AppText style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
              {userLevel}
            </AppText>
          </View>
        </View>

        {/* ── Section: Progresso ───────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
          <AppText style={{ fontSize: 18, fontWeight: '800', color: C.navy }}>
            {isPortuguese ? 'Progresso' : 'Progress'}
          </AppText>
        </View>

        <View style={{
          backgroundColor: C.card, borderRadius: 20, padding: 16,
          marginHorizontal: 16, marginBottom: 24,
        }}>
          {/* Trail */}
          <View style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <BookOpenText size={13} color={C.navyLight} weight="bold" />
                <AppText style={{ fontSize: 12, fontWeight: '700', color: C.navy }}>
                  {isPortuguese ? 'Trilha de Aprendizado' : 'Learning Trail'}
                </AppText>
              </View>
              <AppText style={{
                fontSize: 12, fontWeight: '700',
                color: trailDone >= trailTotal && trailTotal > 0 ? C.green : C.navyLight,
              }}>
                {trailDone}/{trailTotal}
              </AppText>
            </View>
            <View style={{ height: 5, backgroundColor: C.ghost, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{
                width: `${trailPct}%` as `${number}%`, height: '100%',
                backgroundColor: trailDone >= trailTotal && trailTotal > 0 ? C.green : accent,
                borderRadius: 3,
              }} />
            </View>
          </View>

          {/* XP */}
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Lightning size={13} color={C.navyLight} weight="fill" />
                <AppText style={{ fontSize: 12, fontWeight: '700', color: C.navy }}>XP</AppText>
              </View>
              <AppText style={{
                fontSize: 12, fontWeight: '700',
                color: displayXP >= promotionXPThreshold ? C.green : C.navyLight,
              }}>
                {displayXP.toLocaleString()}/{promotionXPThreshold.toLocaleString()}
              </AppText>
            </View>
            <View style={{ height: 5, backgroundColor: C.ghost, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{
                width: `${xpPct}%` as `${number}%`, height: '100%',
                backgroundColor: displayXP >= promotionXPThreshold ? C.green : accent,
                borderRadius: 3,
              }} />
            </View>
          </View>

          {promotionStatus?.eligible && nextLevelName && (
            <View style={{
              marginTop: 14, backgroundColor: C.greenLight, borderRadius: 12,
              padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8,
            }}>
              <Star size={13} color={C.green} weight="fill" />
              <AppText style={{ color: C.green, fontSize: 12, fontWeight: '700', flex: 1 }}>
                {isPortuguese
                  ? `Pronto para o nível ${nextLevelName}!`
                  : `Ready for ${nextLevelName} level!`}
              </AppText>
            </View>
          )}
        </View>

        {/* ── Section: Conquistas ──────────────────────────────────────────── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, marginBottom: 12,
        }}>
          <AppText style={{ fontSize: 18, fontWeight: '800', color: C.navy }}>
            {isPortuguese ? 'Conquistas' : 'Achievements'}
          </AppText>
          <TouchableOpacity
            onPress={() => router.push({
              pathname: '/(app)/achievements' as any,
              params: { userId, userLevel, userName },
            })}
          >
            <CaretRight size={18} color={C.navyLight} weight="bold" />
          </TouchableOpacity>
        </View>

        {(() => {
          const levelCatalog = getBadgesForLevel(userLevel);
          const earnedMap: Record<string, AchievementWithCategory> = {};
          data.achievements.forEach(a => { earnedMap[a.code] = a; });
          const earnedCodes = new Set(data.achievements.map(a => a.code));
          const shownEarned = data.achievements.slice(0, 4);
          const lockedPreview = levelCatalog
            .filter(a => !earnedCodes.has(a.code))
            .slice(0, Math.max(0, 4 - shownEarned.length));
          const allBadges = [
            ...shownEarned.map(a => ({ type: 'earned' as const, ach: a })),
            ...lockedPreview.map(c => ({ type: 'locked' as const, cat: c })),
          ];
          return (
            <View style={{
              flexDirection: 'row', paddingHorizontal: 16,
              marginBottom: 24, gap: 8,
            }}>
              {allBadges.map((item, i) => {
                if (item.type === 'earned') {
                  const ach = item.ach;
                  const rc = RARITY_COLORS[ach.rarity] ?? '#22C55E';
                  const cat = levelCatalog.find(c => c.code === ach.code);
                  return (
                    <TouchableOpacity
                      key={ach.id ?? i}
                      activeOpacity={0.7}
                      onPress={() => cat && setBadgeModal({ catalog: cat, earnedAt: ach.earnedAt })}
                      style={{ flex: 1, alignItems: 'center' }}
                    >
                      <View style={{
                        width: 52, height: 52, borderRadius: 26,
                        backgroundColor: rc + '20',
                        alignItems: 'center', justifyContent: 'center',
                        marginBottom: 6,
                      }}>
                        <AchievementIcon category={ach.category} rarity={ach.rarity} size={24} />
                      </View>
                      <AppText style={{
                        fontSize: 10, fontWeight: '600', color: C.navy,
                        textAlign: 'center',
                      }} numberOfLines={2}>
                        {cat ? (isPortuguese ? cat.title : (cat.titleEN ?? cat.title)) : ach.title}
                      </AppText>
                    </TouchableOpacity>
                  );
                } else {
                  const cat = item.cat;
                  return (
                    <TouchableOpacity
                      key={cat.code}
                      activeOpacity={0.7}
                      onPress={() => setBadgeModal({ catalog: cat })}
                      style={{ flex: 1, alignItems: 'center' }}
                    >
                      <View style={{
                        width: 52, height: 52, borderRadius: 26,
                        backgroundColor: C.ghost,
                        alignItems: 'center', justifyContent: 'center',
                        marginBottom: 6,
                      }}>
                        <AchievementIcon category={cat.category} rarity="locked" size={24} />
                      </View>
                      <AppText style={{
                        fontSize: 10, fontWeight: '600', color: C.navyLight,
                        textAlign: 'center',
                      }} numberOfLines={2}>
                        {isPortuguese ? cat.title : (cat.titleEN ?? cat.title)}
                      </AppText>
                    </TouchableOpacity>
                  );
                }
              })}
            </View>
          );
        })()}

        {/* ── Section: Ranking ─────────────────────────────────────────────── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, marginBottom: 12,
        }}>
          <AppText style={{ fontSize: 18, fontWeight: '800', color: C.navy }}>
            Ranking
          </AppText>
          <TouchableOpacity
            onPress={() => router.push({
              pathname: '/(app)/leaderboard' as any,
              params: { userId, userLevel, userName },
            })}
          >
            <CaretRight size={18} color={C.navyLight} weight="bold" />
          </TouchableOpacity>
        </View>

        <View style={{
          backgroundColor: C.card, borderRadius: 20, padding: 16,
          marginHorizontal: 16, marginBottom: 24,
        }}>
          {data.top3.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Trophy size={32} color={C.navyLight} weight="fill" />
              <AppText style={{ color: C.navyLight, fontSize: 13, fontWeight: '500', marginTop: 8 }}>
                {isPortuguese ? 'Nenhum dado disponível' : 'No data available'}
              </AppText>
            </View>
          ) : (
            <>
              {data.top3.map((entry, i) => {
                const isUser = entry.userId === userId;
                return (
                  <View
                    key={entry.userId + String(i)}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingVertical: 10,
                      borderBottomWidth: i < data.top3.length - 1 ? 1 : 0,
                      borderBottomColor: C.border,
                      backgroundColor: isUser ? accent + '1A' : 'transparent',
                      borderRadius: isUser ? 10 : 0,
                      paddingHorizontal: isUser ? 8 : 0,
                    }}
                  >
                    <Medal size={18} color={MEDAL_COLORS[i] ?? C.navyLight} weight="fill" />
                    <AppText style={{
                      flex: 1, fontSize: 13,
                      fontWeight: isUser ? '800' : '600',
                      color: isUser ? accent : C.navy,
                      marginLeft: 10,
                    }}>
                      {isUser ? (userName || 'You') : (entry.name ? entry.name.split(' ')[0] : `#${i + 1}`)}
                    </AppText>
                    <AppText style={{
                      fontSize: 13, fontWeight: '700',
                      color: isUser ? accent : C.navyLight,
                    }}>
                      {entry.totalXp.toLocaleString()} XP
                    </AppText>
                  </View>
                );
              })}

              {!data.top3.some(e => e.userId === userId) && (
                <>
                  <View style={{ height: 1, backgroundColor: C.border, marginVertical: 4 }} />
                  <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingVertical: 10, paddingHorizontal: 8,
                    backgroundColor: accent + '1A', borderRadius: 10,
                  }}>
                    <AppText style={{ fontSize: 13, fontWeight: '700', color: accent, width: 28 }}>
                      #{data.rank}
                    </AppText>
                    <AppText style={{ flex: 1, fontSize: 13, fontWeight: '800', color: accent, marginLeft: 2 }}>
                      {userName || 'You'}
                    </AppText>
                    <AppText style={{ fontSize: 13, fontWeight: '700', color: accent }}>
                      {displayXP.toLocaleString()} XP
                    </AppText>
                  </View>
                </>
              )}
            </>
          )}
        </View>

        {/* ── Section: Atividade Recente ───────────────────────────────────── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, marginBottom: 12,
        }}>
          <AppText style={{ fontSize: 18, fontWeight: '800', color: C.navy }}>
            {isPortuguese ? 'Atividade Recente' : 'Recent Activity'}
          </AppText>
          <TouchableOpacity
            onPress={() => router.push({
              pathname: '/(app)/activity' as any,
              params: { userId, userLevel, userName },
            })}
          >
            <CaretRight size={18} color={C.navyLight} weight="bold" />
          </TouchableOpacity>
        </View>

        <View style={{
          backgroundColor: C.card, borderRadius: 20, padding: 16,
          marginHorizontal: 16, marginBottom: 8,
        }}>
          {data.recentActivity.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <RocketLaunch size={32} color={C.navyLight} weight="fill" />
              <AppText style={{ color: C.navyLight, fontSize: 13, fontWeight: '500', marginTop: 10 }}>
                {isPortuguese ? 'Nenhuma atividade ainda' : 'No activity yet'}
              </AppText>
            </View>
          ) : (
            data.recentActivity.map((a, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingVertical: 10,
                  borderBottomWidth: i < data.recentActivity.length - 1 ? 1 : 0,
                  borderBottomColor: C.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <AppText style={{ color: C.navy, fontSize: 13, fontWeight: '600' }}>
                    {a.type}
                  </AppText>
                  <AppText style={{ color: C.navyLight, fontSize: 11, fontWeight: '500', marginTop: 2 }}>
                    {a.timestamp.toLocaleDateString([], { day: '2-digit', month: 'short' })}
                    {' · '}
                    {a.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </AppText>
                </View>
                <View style={{
                  backgroundColor: C.greenLight, paddingHorizontal: 10,
                  paddingVertical: 4, borderRadius: 8,
                }}>
                  <AppText style={{ color: C.green, fontSize: 12, fontWeight: '800' }}>
                    +{a.xp}
                  </AppText>
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>

      {/* ── Badge modal ───────────────────────────────────────────────────── */}
      {badgeModal && (() => {
        const { catalog: cat, earnedAt } = badgeModal;
        const isEarned = !!earnedAt;
        const rc = RARITY_COLORS[cat.rarity] ?? '#22C55E';
        const howToEarn = isPortuguese ? cat.howToEarnPT : cat.howToEarnEN;
        const RARITY_LABEL: Record<string, string> = {
          common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary',
        };
        return (
          <Modal visible transparent animationType="fade" onRequestClose={() => setBadgeModal(null)}>
            <Pressable
              style={{ flex: 1, backgroundColor: 'rgba(22,21,58,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
              onPress={() => setBadgeModal(null)}
            >
              <Pressable onPress={e => e.stopPropagation()}>
                <View style={{ backgroundColor: C.card, borderRadius: 24, padding: 24, width: '100%', alignItems: 'center' }}>
                  <TouchableOpacity
                    onPress={() => setBadgeModal(null)}
                    style={{ position: 'absolute', top: 16, right: 16 }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={18} color={C.navyLight} weight="bold" />
                  </TouchableOpacity>

                  <View style={{
                    width: 72, height: 72, borderRadius: 36,
                    backgroundColor: isEarned ? rc + '20' : C.ghost,
                    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
                  }}>
                    <AchievementIcon category={cat.category} rarity={isEarned ? cat.rarity : 'locked'} size={34} />
                  </View>

                  <View style={{
                    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
                    backgroundColor: isEarned ? rc + '18' : C.ghost, marginBottom: 8,
                  }}>
                    <AppText style={{ fontSize: 10, fontWeight: '700', color: isEarned ? rc : C.navyLight, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      {RARITY_LABEL[cat.rarity] ?? cat.rarity}
                    </AppText>
                  </View>

                  <AppText style={{ fontSize: 17, fontWeight: '800', color: C.navy, textAlign: 'center', marginBottom: 10 }}>
                    {isPortuguese ? cat.title : (cat.titleEN ?? cat.title)}
                  </AppText>

                  <View style={{ width: '100%', height: 1, backgroundColor: C.border, marginBottom: 14 }} />

                  <View style={{ alignItems: 'center', paddingHorizontal: 8, marginBottom: isEarned ? 14 : 0 }}>
                    {isEarned
                      ? <CheckCircle size={20} color={C.green} weight="fill" style={{ marginBottom: 6 }} />
                      : <Lock size={20} color={C.navyLight} weight="bold" style={{ marginBottom: 6 }} />
                    }
                    <AppText style={{ fontSize: 13, fontWeight: '500', color: C.navy, textAlign: 'center', lineHeight: 20 }}>
                      {howToEarn}
                    </AppText>
                  </View>

                  {isEarned && earnedAt && (
                    <View style={{
                      alignSelf: 'stretch',
                      backgroundColor: C.greenLight, borderRadius: 12,
                      paddingHorizontal: 14, paddingVertical: 10,
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                      <CheckCircle size={15} color={C.green} weight="fill" style={{ flexShrink: 0 }} />
                      <AppText style={{ fontSize: 12, fontWeight: '700', color: C.green, flexShrink: 1, textAlign: 'center' }}>
                        {(isPortuguese ? 'Conquistado em ' : 'Earned on ') + earnedAt.toLocaleDateString(isPortuguese ? 'pt-BR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </AppText>
                    </View>
                  )}
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        );
      })()}
    </SafeAreaView>
  );
}
