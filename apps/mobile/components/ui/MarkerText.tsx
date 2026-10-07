// MarkerText — texto com marca-texto Volt "de caneta": faixa cobrindo só a
// metade de baixo de cada linha, com pontas arredondadas, atrás das letras.
// As faixas são desenhadas por linha a partir de onTextLayout, então
// funcionam também quando o texto quebra.

import React, { useState } from 'react';
import { View, TextLayoutLine, TextStyle, StyleProp } from 'react-native';
import { AppText } from './Text';

interface Props {
  children: string;
  style?: StyleProp<TextStyle>;
  display?: boolean;
  color?: string;
}

export function MarkerText({ children, style, display, color = '#DCFF4A' }: Props) {
  const [lines, setLines] = useState<TextLayoutLine[]>([]);
  return (
    <View>
      {lines.map((l, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: l.x - 3,
            width: l.width + 6,
            top: l.y + l.height * 0.34,
            height: l.height * 0.42,
            borderRadius: 6,
            backgroundColor: color,
          }}
        />
      ))}
      <AppText
        display={display}
        style={style}
        onTextLayout={(e) => setLines(e.nativeEvent.lines)}
      >
        {children}
      </AppText>
    </View>
  );
}
