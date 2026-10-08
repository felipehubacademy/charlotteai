import React from 'react';
import { TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'phosphor-react-native';
import { router } from 'expo-router';
import * as Haptics from '@/lib/hapticsGated';

interface VocabFABProps {
  bottom?: number;
  right?: number;
  initialTerm?: string;
  color?: string;
}

export const VocabFAB = React.forwardRef<any, VocabFABProps>(
  function VocabFAB({ bottom = 0, right = 20, initialTerm, color = '#08804A' }, ref) {
    const insets = useSafeAreaInsets();

    const open = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const params: Record<string, string> = { source: 'manual' };
      if (initialTerm) params.term = initialTerm;
      router.push({ pathname: '/(app)/add-word', params });
    };

    return (
      <TouchableOpacity
        ref={ref}
        onPress={open}
        activeOpacity={0.82}
        style={{
          position: 'absolute',
          right,
          bottom: insets.bottom + bottom + 16,
          width: 50,
          height: 50,
          borderRadius: 25,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          ...Platform.select({
            ios:     { shadowColor: color, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
            android: { elevation: 8 },
          }),
        }}
      >
        <Plus size={22} color="#FFFFFF" weight="bold" />
      </TouchableOpacity>
    );
  },
);
