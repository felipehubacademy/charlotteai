import React from 'react';
import { View, Dimensions } from 'react-native';
import { AppText } from '@/components/ui/Text';

export interface TooltipAnchor {
  x:     number;
  y:     number;
  width: number;
}

interface Props {
  text:           string;
  anchor:         TooltipAnchor;
  width?:         number;
  containerWidth?: number;
  arrowDirection?: 'up' | 'down';
}

const ARROW_SIZE = 7;

export function TooltipBalloon({
  text,
  anchor,
  width           = 160,
  containerWidth,
  arrowDirection  = 'down',
}: Props) {
  const cw = containerWidth ?? Dimensions.get('window').width;

  let left = anchor.x + anchor.width / 2 - width / 2;
  left = Math.max(8, Math.min(left, cw - width - 8));

  const arrowLeft = Math.max(
    8,
    Math.min(anchor.x + anchor.width / 2 - left - ARROW_SIZE, width - ARROW_SIZE * 2 - 8),
  );

  const top = arrowDirection === 'down'
    ? anchor.y - 48 - ARROW_SIZE
    : anchor.y + anchor.width;

  return (
    <View
      pointerEvents="none"
      style={{
        position:        'absolute',
        left, top, width,
        backgroundColor: '#16153A',
        borderRadius:    10,
        paddingHorizontal: 10,
        paddingVertical:   9,
        shadowColor:     '#000',
        shadowOpacity:   0.25,
        shadowRadius:    8,
        shadowOffset:    { width: 0, height: 3 },
        elevation:       8,
      }}
    >
      <AppText
        style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700', textAlign: 'center' }}
      >
        {text}
      </AppText>
      <View
        style={{
          position: 'absolute',
          ...(arrowDirection === 'down'
            ? { bottom: -ARROW_SIZE, borderTopWidth: ARROW_SIZE, borderTopColor: '#16153A' }
            : { top:    -ARROW_SIZE, borderBottomWidth: ARROW_SIZE, borderBottomColor: '#16153A' }),
          left: arrowLeft,
          width: 0, height: 0,
          borderLeftWidth:  ARROW_SIZE,
          borderRightWidth: ARROW_SIZE,
          borderLeftColor:  'transparent',
          borderRightColor: 'transparent',
        }}
      />
    </View>
  );
}
