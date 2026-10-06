import { View, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { CaretLeft } from 'phosphor-react-native';
import { AppText } from '@/components/ui/Text';
import CharlotteAvatar from '@/components/ui/CharlotteAvatar';
import AnimatedXPBadge from '@/components/ui/AnimatedXPBadge';

const C = {
  bg:        '#FFFFFF',
  navy:      '#16131F',
  navyMid:   '#4D4858',
  navyLight: '#8A8494',
  border:    'rgba(22,19,31,0.08)',
  green:     '#22C55E',
  orange:    '#F97316',
  greenDark: '#5C7300',
  gold:      '#EAB308',
};

interface ChatHeaderProps {
  mode?: 'grammar' | 'pronunciation' | 'chat';
  showBack?: boolean;
  totalXP?: number;
  sessionXP?: number;
  streak?: number;
  rank?: number | null;
  onXPCounterClick?: () => void;
  // kept for API compatibility
  onLiveVoicePress?: () => void;
  userName?: string;
  userLevel?: string;
  onLogout?: () => void;
  onHelpPress?: () => void;
}

export default function ChatHeader({
  showBack = false,
  totalXP = 0,
  onXPCounterClick,
}: ChatHeaderProps) {
  return (
    <View style={{
      height: 56,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.bg,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      ...Platform.select({ android: { elevation: 2 } }),
    }}>

      {/* ── Left: back + Charlotte ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
        {showBack && (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.iconBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <CaretLeft size={20} color={C.navy} weight="bold" />
          </TouchableOpacity>
        )}
        <CharlotteAvatar size="sm" showStatus isOnline />
        <View>
          <AppText style={{ color: C.navy, fontWeight: '700', fontSize: 14 }}>Charlotte</AppText>
          <AppText style={{ color: C.green, fontSize: 11, fontWeight: '600' }}>online</AppText>
        </View>
      </View>

      {/* ── Right: XP pill only (streak & rank reserved for Home) ── */}
      <TouchableOpacity
        onPress={onXPCounterClick}
        activeOpacity={onXPCounterClick ? 0.7 : 1}
        style={{ flexDirection: 'row', alignItems: 'center' }}
      >
        {/* XP — animated count-up + floating toast */}
        <AnimatedXPBadge xp={totalXP} iconSize={13} fontSize={12} padH={8} padV={4} />
      </TouchableOpacity>
    </View>
  );
}

const styles = {
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};
