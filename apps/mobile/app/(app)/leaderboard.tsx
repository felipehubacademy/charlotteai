import React, { useEffect, useState } from 'react';
import {
  View, TouchableOpacity, FlatList, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Medal, Trophy } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { supabase } from '@/lib/supabase';
import { LEVEL_ACCENT } from '@/lib/levelColors';

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:       '#FAF7F0',
  card:     '#FFFFFF',
  navy:     '#16131F',
  navyMid:  '#4D4858',
  navyLight:'#8A8494',
  border:   'rgba(22,19,31,0.10)',
  green:    '#DCFF4A',
};

const MEDAL_COLORS = ['#D97706', '#64748B', '#B45309'];

const LEVEL_COLOR = LEVEL_ACCENT;

type Level = 'Novice' | 'Inter' | 'Advanced';

interface LeaderboardEntry {
  userId: string;
  totalXp: number;
  name: string;
  rank: number;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  userEntry: LeaderboardEntry | null;
  loading: boolean;
  error: string | null;
}

// ── Screen ─────────────────────────────────────────────────────────────────────
export default function LeaderboardScreen() {
  const params = useLocalSearchParams<{
    userId:    string;
    userLevel: string;
    userName:  string;
  }>();

  const userId    = params.userId    ?? '';
  const userLevel = (params.userLevel ?? 'Inter') as Level;
  const userName  = params.userName  ?? '';
  const accent    = LEVEL_COLOR[userLevel] ?? C.navy;

  const [data, setData] = useState<LeaderboardData>({
    entries: [], userEntry: null, loading: true, error: null,
  });

  useEffect(() => { if (userId) loadData(); }, [userId]);

  const loadData = async () => {
    if (!userId) return;
    setData(prev => ({ ...prev, loading: true, error: null }));
    try {
      // Fetch all user IDs in the same level to scope the ranking
      const { data: levelUsers } = await supabase
        .from('charlotte_users')
        .select('id')
        .eq('charlotte_level', userLevel);

      const levelUserIds = (levelUsers ?? []).map((u: any) => u.id as string);

      if (levelUserIds.length === 0) {
        setData({ entries: [], userEntry: null, loading: false, error: null });
        return;
      }

      // Fetch top 20 from charlotte_progress filtered by level
      const { data: progressRows, error: progressError } = await supabase
        .from('charlotte_progress')
        .select('user_id, total_xp')
        .in('user_id', levelUserIds)
        .order('total_xp', { ascending: false })
        .limit(20);

      if (progressError) throw progressError;

      const rawRows = progressRows ?? [];
      const userIds = rawRows.map((r: any) => r.user_id);

      // Fetch names for all users in the list
      const { data: usersRows } = userIds.length > 0
        ? await supabase.from('charlotte_users').select('id, name').in('id', userIds)
        : { data: [] };

      const nameMap: Record<string, string> = {};
      (usersRows ?? []).forEach((u: any) => { nameMap[u.id] = u.name ?? ''; });

      const entries: LeaderboardEntry[] = rawRows.map((r: any, i: number) => ({
        userId: r.user_id,
        totalXp: r.total_xp ?? 0,
        name: nameMap[r.user_id] ?? '',
        rank: i + 1,
      }));

      // Check if current user is in top 20
      const userInTop = entries.find(e => e.userId === userId) ?? null;

      let userEntry: LeaderboardEntry | null = userInTop;

      if (!userInTop) {
        // Fetch current user's rank and XP within their level
        const { data: userProgress } = await supabase
          .from('charlotte_progress')
          .select('total_xp')
          .eq('user_id', userId)
          .maybeSingle();

        const userXp = userProgress?.total_xp ?? 0;

        const { count: rankCount } = await supabase
          .from('charlotte_progress')
          .select('user_id', { count: 'exact', head: true })
          .in('user_id', levelUserIds)
          .gt('total_xp', userXp);

        userEntry = {
          userId,
          totalXp: userXp,
          name: userName,
          rank: (rankCount ?? 0) + 1,
        };
      }

      setData({ entries, userEntry, loading: false, error: null });
    } catch {
      setData(prev => ({ ...prev, loading: false, error: 'Error loading ranking' }));
    }
  };

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

  // ── Render helpers ────────────────────────────────────────────────────────────
  const renderEntry = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const isUser  = item.userId === userId;
    const isTop3  = item.rank <= 3;
    const medalColor = MEDAL_COLORS[item.rank - 1] ?? C.navyLight;

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 16,
          backgroundColor: isUser ? accent + '1A' : C.card,
          borderBottomWidth: index < data.entries.length - 1 ? 1 : 0,
          borderBottomColor: C.border,
          borderRadius: isUser ? 12 : 0,
          marginHorizontal: isUser ? 0 : 0,
        }}
      >
        {/* Rank icon */}
        <View style={{ width: 32, alignItems: 'center', justifyContent: 'center' }}>
          {isTop3 ? (
            <Medal size={20} color={medalColor} weight="fill" />
          ) : (
            <AppText style={{
              fontSize: 13, fontWeight: '700',
              color: isUser ? accent : C.navyLight,
            }}>
              #{item.rank}
            </AppText>
          )}
        </View>

        {/* Name */}
        <AppText style={{
          flex: 1,
          fontSize: 14,
          fontWeight: isUser ? '800' : '600',
          color: isUser ? accent : C.navy,
          marginLeft: 10,
        }}>
          {isUser
            ? (userName ? userName.split(' ')[0] : 'You')
            : (item.name ? item.name.split(' ')[0] : `User ${item.rank}`)}
        </AppText>

        {/* XP badge */}
        <View style={{
          backgroundColor: isUser ? accent + '26' : 'rgba(22,19,31,0.06)',
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 8,
        }}>
          <AppText style={{
            fontSize: 12,
            fontWeight: '800',
            color: isUser ? accent : C.navyMid,
          }}>
            {item.totalXp.toLocaleString()} XP
          </AppText>
        </View>
      </View>
    );
  };

  const isUserInTop20 = data.entries.some(e => e.userId === userId);

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
            Ranking {userLevel}
          </AppText>
        </View>

        {/* Spacer to balance layout */}
        <View style={{ width: 22 }} />
      </View>

      {/* List */}
      {data.entries.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
          <Trophy size={48} color={C.navyLight} weight="fill" />
          <AppText style={{ color: C.navy, fontSize: 15, fontWeight: '800', marginTop: 16, textAlign: 'center' }}>
            No ranking data yet
          </AppText>
        </View>
      ) : (
        <FlatList
          data={data.entries}
          keyExtractor={(item) => item.userId}
          renderItem={renderEntry}
          style={{ flex: 1, backgroundColor: C.bg }}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListHeaderComponent={
            <View style={{
              marginHorizontal: 16, marginTop: 16, marginBottom: 8,
              backgroundColor: C.card, borderRadius: 20, padding: 16,
              flexDirection: 'row', alignItems: 'center', gap: 12,
            }}>
              <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: '#D9770620', alignItems: 'center', justifyContent: 'center',
              }}>
                <Trophy size={22} color="#D97706" weight="fill" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={{ fontSize: 22, fontWeight: '800', color: C.navy }}>
                  {data.userEntry ? `#${data.userEntry.rank}` : '--'}
                </AppText>
                <AppText style={{ fontSize: 12, fontWeight: '600', color: C.navyLight }}>
                  your position
                </AppText>
              </View>
              <AppText style={{ fontSize: 13, fontWeight: '700', color: C.navyMid }}>
                Top {data.entries.length}
              </AppText>
            </View>
          }
          ListFooterComponent={
            !isUserInTop20 && data.userEntry ? (
              <View style={{ marginHorizontal: 16, marginTop: 8 }}>
                <View style={{ height: 1, backgroundColor: C.border, marginVertical: 4 }} />
                {renderEntry({ item: data.userEntry, index: -1 })}
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
