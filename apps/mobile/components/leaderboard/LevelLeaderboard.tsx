import React from 'react';
import { View, FlatList, ActivityIndicator } from 'react-native';
import { Trophy, Medal, MedalMilitary, TrendUp } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { supabase } from '@/lib/supabase';

const C = {
  navy:      '#16131F',
  navyMid:   '#4D4858',
  navyLight: '#8A8494',
  border:    'rgba(22,19,31,0.07)',
  bg:        '#FAF7F0',
  green:     '#DCFF4A',
  greenDark: '#08804A',
  greenBg:   'rgba(220,255,74,0.1)',
  greenBorder: 'rgba(220,255,74,0.3)',
  rowBg:     'rgba(22,19,31,0.03)',
};

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  totalXP: number;
  levelNumber: number;
  currentStreak: number;
  position: number;
  avatarColor: string;
}

interface LevelLeaderboardProps {
  userLevel: 'Novice' | 'Inter' | 'Advanced';
  userId?: string;
  userName?: string;
  refreshTrigger?: number;
}

const AVATAR_COLORS = ['#DCFF4A', '#60a5fa', '#ff4f8b', '#fb923c', '#a78bfa'];
const PODIUM_ICONS: React.ReactNode[] = [
  <Trophy key="1" size={22} color="#facc15" weight="fill" />,
  <Medal key="2" size={20} color="#9ca3af" weight="fill" />,
  <MedalMilitary key="3" size={20} color="#fb923c" weight="fill" />,
];

function generateAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const UserAvatar: React.FC<{ entry: LeaderboardEntry; size?: number; isCurrentUser?: boolean }> = ({
  entry, size = 36, isCurrentUser = false,
}) => (
  <View style={{
    width: size, height: size, borderRadius: size / 2,
    backgroundColor: entry.avatarColor,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: isCurrentUser ? 2 : 0,
    borderColor: C.green,
  }}>
    <AppText style={{ color: '#16131F', fontWeight: '800', fontSize: size * 0.38 }}>
      {entry.displayName.charAt(0).toUpperCase()}
    </AppText>
  </View>
);

/** Format a full name to "First L." style used in leaderboard display names */
function toDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

const LevelLeaderboard: React.FC<LevelLeaderboardProps> = ({ userLevel, userId, userName, refreshTrigger = 0 }) => {
  const isPortuguese = userLevel === 'Novice';
  const [entries, setEntries]   = React.useState<LeaderboardEntry[]>([]);
  const [loading, setLoading]   = React.useState(true);
  const [error, setError]       = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);

  React.useEffect(() => { loadLeaderboard(); }, [userLevel, userId, refreshTrigger]);

  const loadLeaderboard = async () => {
    setLoading(true); setError(null);
    try {
      const { data: rows, error: err } = await supabase
        .from('charlotte_leaderboard_cache')
        .select('user_id,display_name,total_xp')
        .eq('user_level', userLevel)
        .order('total_xp', { ascending: false })
        .limit(50);

      if (err) throw err;

      let allRows: any[] = rows ?? [];

      // If current user is missing from cache, fetch their progress and inject them
      if (userId && !allRows.find((r: any) => r.user_id === userId)) {
        const { data: myProg } = await supabase
          .from('charlotte_progress')
          .select('total_xp')
          .eq('user_id', userId)
          .maybeSingle();

        if (myProg != null) {
          const myDisplayName = userName ? toDisplayName(userName) : (isPortuguese ? 'Você' : 'You');
          allRows = [
            ...allRows,
            { user_id: userId, display_name: myDisplayName, total_xp: myProg.total_xp ?? 0 },
          ].sort((a, b) => (b.total_xp ?? 0) - (a.total_xp ?? 0));
        }
      }

      setEntries(allRows.map((row: any, i: number) => ({
        userId:        row.user_id,
        displayName:   row.display_name || 'Anonymous',
        totalXP:       row.total_xp ?? 0,
        levelNumber:   Math.floor(Math.sqrt((row.total_xp ?? 0) / 50)) + 1,
        currentStreak: 0,
        position:      i + 1,    // real rank from total_xp DESC order
        avatarColor:   generateAvatarColor(row.display_name || 'x'),
      })));
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e.message ?? 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
      <ActivityIndicator color={C.navy} />
    </View>
  );

  if (error) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
      <AppText style={{ color: C.navyLight, fontSize: 14 }}>{error}</AppText>
    </View>
  );

  const topThree = entries.slice(0, 3);
  const rest     = entries.slice(3);
  const myEntry  = entries.find(e => e.userId === userId);
  const myIsOutside = myEntry && myEntry.position > 50;

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 2 }}>
        <View>
          <AppText style={{ color: C.navy, fontWeight: '800', fontSize: 16 }}>{userLevel} Leaderboard</AppText>
          <AppText style={{ color: C.navyLight, fontSize: 13, marginTop: 1 }}>
            {entries.length} {isPortuguese ? 'estudantes ativos' : 'active learners'}
          </AppText>
        </View>
        <TrendUp size={22} color={C.navyLight} weight="bold" />
      </View>

      {/* Podium — top 3 */}
      {topThree.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
          {([1, 0, 2] as const).map((idx) => {
            const entry = topThree[idx];
            if (!entry) return <View key={idx} style={{ width: 88 }} />;
            const isFirst    = idx === 0;
            const podiumH    = isFirst ? 80 : 60;
            const avatarSize = isFirst ? 44 : 36;
            const isMe       = entry.userId === userId;
            return (
              <View key={entry.userId} style={{ alignItems: 'center', width: 88 }}>
                <UserAvatar entry={entry} size={avatarSize} isCurrentUser={isMe} />
                <View style={{
                  height: podiumH, marginTop: 8, width: '100%',
                  backgroundColor: C.bg,
                  borderWidth: 1, borderColor: C.border,
                  borderRadius: 10,
                  alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
                }}>
                  {PODIUM_ICONS[idx]}
                  <AppText style={{ color: C.navy, fontWeight: '800', fontSize: 12 }}>#{entry.position}</AppText>
                  <AppText style={{ color: C.navyLight, fontSize: 11 }}>{entry.totalXP.toLocaleString()}</AppText>
                </View>
                <AppText style={{
                  fontSize: 11, marginTop: 4, textAlign: 'center',
                  color: isMe ? C.greenDark : C.navyMid,
                  fontWeight: isMe ? '700' : '400',
                }} numberOfLines={1}>
                  {entry.displayName}
                </AppText>
              </View>
            );
          })}
        </View>
      )}

      {/* Positions 4+ */}
      {rest.length > 0 && (
        <FlatList
          data={rest}
          keyExtractor={item => item.userId}
          renderItem={({ item }) => {
            const isMe = item.userId === userId;
            return (
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 12, paddingVertical: 10,
                borderRadius: 10, marginBottom: 4,
                backgroundColor: isMe ? C.greenBg : C.rowBg,
                borderWidth: isMe ? 1 : 0,
                borderColor: C.greenBorder,
              }}>
                <AppText style={{ width: 28, textAlign: 'center', color: C.navyLight, fontSize: 13, fontWeight: '600' }}>
                  #{item.position}
                </AppText>
                <View style={{ marginLeft: 10 }}>
                  <UserAvatar entry={item} size={32} isCurrentUser={isMe} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <AppText style={{ fontSize: 13, fontWeight: '600', color: isMe ? C.greenDark : C.navy }} numberOfLines={1}>
                    {item.displayName}
                  </AppText>
                  <AppText style={{ fontSize: 11, color: C.navyLight, marginTop: 1 }}>
                    {item.totalXP.toLocaleString()} XP
                  </AppText>
                </View>
              </View>
            );
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* My position outside top 50 */}
      {myIsOutside && myEntry && (
        <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border }}>
          <AppText style={{ color: C.navyLight, fontSize: 12, marginBottom: 8 }}>
            {isPortuguese ? 'Sua posição:' : 'Your position:'}
          </AppText>
          <View style={{
            flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10,
            backgroundColor: C.greenBg, borderWidth: 1, borderColor: C.greenBorder,
          }}>
            <AppText style={{ width: 28, textAlign: 'center', color: C.greenDark, fontSize: 13, fontWeight: '700' }}>
              #{myEntry.position}
            </AppText>
            <View style={{ marginLeft: 10 }}>
              <UserAvatar entry={myEntry} size={32} isCurrentUser />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <AppText style={{ color: C.greenDark, fontSize: 13, fontWeight: '700' }}>{myEntry.displayName}</AppText>
              <AppText style={{ fontSize: 11, color: C.navyLight, marginTop: 1 }}>{myEntry.totalXP.toLocaleString()} XP</AppText>
            </View>
          </View>
        </View>
      )}

      {lastUpdated && (
        <AppText style={{ color: C.navyLight, fontSize: 11, textAlign: 'center', marginTop: 12, paddingBottom: 8, opacity: 0.6 }}>
          {isPortuguese ? 'Atualizado' : 'Updated'}{' '}
          {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </AppText>
      )}
    </View>
  );
};

export default LevelLeaderboard;
