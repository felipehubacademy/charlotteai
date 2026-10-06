import React, { useEffect, useState } from 'react';
import {
  View, TouchableOpacity, ScrollView, StatusBar,
  ActivityIndicator, Modal, Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft, Trophy, Lightning, Fire, Star,
  Microphone, PencilLine, GraduationCap, Sun, CalendarCheck, X, CheckCircle, Lock,
} from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import { supabase } from '@/lib/supabase';
import { getBadgesForLevel, CatalogEntry } from '@/lib/achievementsCatalog';

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:        '#FAF7F0',
  card:      '#FFFFFF',
  navy:      '#16131F',
  navyMid:   '#4D4858',
  navyLight: '#8A8494',
  ghost:     'rgba(22,19,31,0.06)',
  border:    'rgba(22,19,31,0.10)',
  green:     '#5C7300',
  greenLight:'#F8FFE0',
};

const RARITY_COLORS: Record<string, string> = {
  common:    '#22C55E',
  rare:      '#3B82F6',
  epic:      '#A855F7',
  legendary: '#EAB308',
};

const RARITY_LABEL: Record<string, string> = {
  common:    'Common',
  rare:      'Rare',
  epic:      'Epic',
  legendary: 'Legendary',
};

type Level = 'Novice' | 'Inter' | 'Advanced';

interface EarnedAchievement {
  id:          string;
  code:        string;
  title:       string;
  description: string;
  xpBonus:     number;
  rarity:      string;
  category:    string;
  earnedAt:    Date;
}

interface ModalBadge {
  catalog:  CatalogEntry;
  earned:   EarnedAchievement | null;
}

function AchievementIcon({ category, rarity, size = 22 }: { category: string; rarity: string; size?: number }) {
  const color = rarity === 'locked' ? 'rgba(22,19,31,0.22)' : (RARITY_COLORS[rarity] ?? '#22C55E');
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
export default function AchievementsScreen() {
  const params = useLocalSearchParams<{
    userId:    string;
    userLevel: string;
    userName:  string;
  }>();

  const userId       = params.userId    ?? '';
  const userLevel    = (params.userLevel ?? 'Inter') as Level;
  const isPortuguese = userLevel === 'Novice';

  const [earned, setEarned]       = useState<EarnedAchievement[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState<ModalBadge | null>(null);

  const catalog = getBadgesForLevel(userLevel); // 30 badges
  const insets  = useSafeAreaInsets();

  useEffect(() => { if (userId) loadData(); }, [userId]);

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from('user_achievements')
        .select('id,achievement_type,achievement_name,achievement_description,xp_bonus,rarity,category,earned_at')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;

      setEarned((rows ?? []).map((a: any) => ({
        id:          a.id,
        code:        a.achievement_type ?? '',
        title:       a.achievement_name ?? 'Achievement',
        description: a.achievement_description ?? '',
        xpBonus:     a.xp_bonus ?? 0,
        rarity:      a.rarity ?? 'common',
        category:    a.category ?? 'general',
        earnedAt:    new Date(a.earned_at),
      })));
    } catch {
      // silent — show catalog anyway
    } finally {
      setLoading(false);
    }
  };

  const earnedMap: Record<string, EarnedAchievement> = {};
  earned.forEach(a => { earnedMap[a.code] = a; });

  const openModal = (cat: CatalogEntry) => {
    setModal({ catalog: cat, earned: earnedMap[cat.code] ?? null });
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top', 'left', 'right', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
          <ActivityIndicator size="large" color={C.navy} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Badge modal ───────────────────────────────────────────────────────────────
  const BadgeModal = () => {
    if (!modal) return null;
    const { catalog: cat, earned: ach } = modal;
    const isEarned = ach !== null;
    const rc = RARITY_COLORS[cat.rarity] ?? '#22C55E';
    const howToEarn = isPortuguese ? cat.howToEarnPT : cat.howToEarnEN;

    return (
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={() => setModal(null)}
      >
        <Pressable
          style={{
            flex: 1, backgroundColor: 'rgba(22,19,31,0.55)',
            alignItems: 'center', justifyContent: 'center',
            paddingHorizontal: 32,
          }}
          onPress={() => setModal(null)}
        >
          <Pressable onPress={e => e.stopPropagation()}>
            <View style={{
              backgroundColor: C.card, borderRadius: 24,
              padding: 24, width: '100%', alignItems: 'center',
            }}>
              {/* Close */}
              <TouchableOpacity
                onPress={() => setModal(null)}
                style={{ position: 'absolute', top: 16, right: 16 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color={C.navyLight} weight="bold" />
              </TouchableOpacity>

              {/* Icon */}
              <View style={{
                width: 72, height: 72, borderRadius: 36,
                backgroundColor: isEarned ? rc + '20' : C.ghost,
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 14,
              }}>
                <AchievementIcon
                  category={cat.category}
                  rarity={isEarned ? cat.rarity : 'locked'}
                  size={34}
                />
              </View>

              {/* Rarity pill */}
              <View style={{
                paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
                backgroundColor: isEarned ? rc + '18' : C.ghost,
                marginBottom: 8,
              }}>
                <AppText style={{
                  fontSize: 10, fontWeight: '700',
                  color: isEarned ? rc : C.navyLight,
                  textTransform: 'uppercase', letterSpacing: 0.8,
                }}>
                  {RARITY_LABEL[cat.rarity] ?? cat.rarity}
                </AppText>
              </View>

              {/* Title */}
              <AppText style={{
                fontSize: 17, fontWeight: '800', color: C.navy,
                textAlign: 'center', marginBottom: 10,
              }}>
                {isPortuguese ? cat.title : (cat.titleEN ?? cat.title)}
              </AppText>

              {/* Divider */}
              <View style={{ width: '100%', height: 1, backgroundColor: C.border, marginBottom: 14 }} />

              {/* XP reward */}
              {cat.xpReward > 0 && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: isEarned ? C.greenLight : C.ghost,
                  borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
                  marginBottom: 14,
                }}>
                  <Lightning size={14} color={isEarned ? C.green : C.navyLight} weight="fill" />
                  <AppText style={{ fontSize: 13, fontWeight: '800', color: isEarned ? C.green : C.navyLight }}>
                    +{cat.xpReward} XP
                  </AppText>
                  <AppText style={{ fontSize: 12, fontWeight: '500', color: isEarned ? C.green : C.navyLight }}>
                    {isEarned
                      ? (isPortuguese ? 'bônus recebido' : 'bonus received')
                      : (isPortuguese ? 'ao conquistar' : 'upon earning')}
                  </AppText>
                </View>
              )}

              {/* How to earn */}
              <View style={{ alignItems: 'center', paddingHorizontal: 8, marginBottom: isEarned ? 14 : 0 }}>
                {isEarned
                  ? <CheckCircle size={20} color={C.green} weight="fill" style={{ marginBottom: 6 }} />
                  : <Lock size={20} color={C.navyLight} weight="bold" style={{ marginBottom: 6 }} />
                }
                <AppText style={{
                  fontSize: 13, fontWeight: '500',
                  color: isEarned ? C.navyMid : C.navy,
                  textAlign: 'center', lineHeight: 20,
                }}>
                  {howToEarn}
                </AppText>
              </View>

              {/* Earned date */}
              {isEarned && (
                <View style={{
                  alignSelf: 'stretch',
                  backgroundColor: C.greenLight, borderRadius: 12,
                  paddingHorizontal: 14, paddingVertical: 10,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <CheckCircle size={15} color={C.green} weight="fill" style={{ flexShrink: 0 }} />
                  <AppText style={{ fontSize: 12, fontWeight: '700', color: C.green, flexShrink: 1, textAlign: 'center' }}>
                    {(isPortuguese ? 'Conquistado em ' : 'Earned on ') + ach.earnedAt.toLocaleDateString(isPortuguese ? 'pt-BR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </AppText>
                </View>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, height: 52, backgroundColor: C.card,
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
            {isPortuguese ? 'Conquistas' : 'Achievements'}
          </AppText>
        </View>

        <View style={{ width: 22 }} />
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: Math.max(insets.bottom + 32, 80) }}
      >
        {/* Summary bar */}
        <View style={{
          marginHorizontal: 16, marginBottom: 24,
          backgroundColor: C.card, borderRadius: 20, padding: 16,
          flexDirection: 'row', alignItems: 'center', gap: 12,
        }}>
          <View style={{
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: '#EAB30820', alignItems: 'center', justifyContent: 'center',
          }}>
            <Trophy size={22} color="#EAB308" weight="fill" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={{ fontSize: 22, fontWeight: '800', color: C.navy }}>
              {earned.length}
            </AppText>
            <AppText style={{ fontSize: 12, fontWeight: '600', color: C.navyLight }}>
              {isPortuguese
                ? `de ${catalog.length} conquistas desbloqueadas`
                : `of ${catalog.length} achievements unlocked`}
            </AppText>
          </View>
          <View style={{
            backgroundColor: C.ghost, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
          }}>
            <AppText style={{ fontSize: 12, fontWeight: '700', color: C.navyMid }}>
              {userLevel}
            </AppText>
          </View>
        </View>

        {/* Full catalog grid */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <AppText style={{ fontSize: 18, fontWeight: '800', color: C.navy }}>
            {isPortuguese ? 'Todas as Conquistas' : 'All Achievements'}
          </AppText>
        </View>

        <View style={{
          flexDirection: 'row', flexWrap: 'wrap',
          paddingHorizontal: 8, rowGap: 20, marginBottom: 24,
          justifyContent: 'space-around',
        }}>
          {catalog.map(cat => {
            const isEarned = !!earnedMap[cat.code];
            const rc = RARITY_COLORS[cat.rarity] ?? '#22C55E';
            return (
              <TouchableOpacity
                key={cat.code}
                activeOpacity={0.7}
                onPress={() => openModal(cat)}
                style={{ width: 84, alignItems: 'center' }}
              >
                {/* Medal + XP bubble wrapper */}
                <View style={{ width: 52, marginBottom: 6, position: 'relative' }}>
                  <View style={{
                    width: 52, height: 52, borderRadius: 26,
                    backgroundColor: isEarned ? rc + '20' : C.ghost,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <AchievementIcon
                      category={cat.category}
                      rarity={isEarned ? cat.rarity : 'locked'}
                      size={24}
                    />
                  </View>
                  {/* XP bubble — Mickey ear style */}
                  {cat.xpReward > 0 && (
                    <View style={{
                      position: 'absolute', top: -7, right: -10,
                      backgroundColor: isEarned ? rc : C.navyLight,
                      borderRadius: 10, paddingHorizontal: 4, paddingVertical: 2,
                      minWidth: 26, alignItems: 'center',
                      borderWidth: 1.5, borderColor: C.bg,
                    }}>
                      <AppText style={{ fontSize: 9, fontWeight: '800', color: '#FFF' }}>
                        +{cat.xpReward}
                      </AppText>
                    </View>
                  )}
                </View>
                <AppText style={{
                  fontSize: 10, fontWeight: '600',
                  color: isEarned ? C.navy : C.navyLight,
                  textAlign: 'center',
                }} numberOfLines={2}>
                  {isPortuguese ? cat.title : (cat.titleEN ?? cat.title)}
                </AppText>
                {isEarned && (
                  <View style={{
                    marginTop: 3, width: 8, height: 8, borderRadius: 4,
                    backgroundColor: rc,
                  }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ paddingHorizontal: 20, alignItems: 'center' }}>
          <AppText style={{ fontSize: 12, fontWeight: '500', color: C.navyLight, textAlign: 'center' }}>
            {isPortuguese
              ? 'Toque em qualquer conquista para ver como ganhar.'
              : 'Tap any achievement to see how to earn it.'}
          </AppText>
        </View>
      </ScrollView>

      <BadgeModal />
    </SafeAreaView>
  );
}
