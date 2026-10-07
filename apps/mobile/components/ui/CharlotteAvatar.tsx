import React from 'react';
import { View, Image, TouchableOpacity } from 'react-native';
import { AppText } from '@/components/ui/Text';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

interface CharlotteAvatarProps {
  size?: AvatarSize;
  showStatus?: boolean;
  isOnline?: boolean;
  animate?: boolean;
  onPress?: () => void;
}

const SIZES: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
  xxl: 96,
};

const STATUS_SIZES: Record<AvatarSize, number> = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
  xxl: 18,
};

export default function CharlotteAvatar({
  size = 'md',
  showStatus = false,
  isOnline = false,
  onPress,
}: CharlotteAvatarProps) {
  const [imageError, setImageError] = React.useState(false);
  const px = SIZES[size];
  const statusPx = STATUS_SIZES[size];

  const avatar = (
    <View style={{ width: px, height: px }} className="relative">
      <View
        style={{
          width: px, height: px, borderRadius: px / 2,
          overflow: 'hidden',
          backgroundColor: '#16131F',
        }}
      >
        {!imageError ? (
          <Image
            source={require('@/assets/charlotte-avatar.png')}
            style={{ width: px, height: px }}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View
            style={{ width: px, height: px, borderRadius: px / 2 }}
            className="bg-primary items-center justify-center"
          >
            <AppText
              style={{ fontSize: px * 0.4, color: '#000', fontWeight: 'bold' }}
            >
              C
            </AppText>
          </View>
        )}
      </View>

      {showStatus && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: statusPx,
            height: statusPx,
            borderRadius: statusPx / 2,
            borderWidth: 2,
            borderColor: '#FFFFFF',
            backgroundColor: isOnline ? '#22C55E' : '#6B7280',
          }}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {avatar}
      </TouchableOpacity>
    );
  }

  return avatar;
}
