// QueizyWave — a onda da marca (queizy → crazy) como barra de progresso.
// O trecho concluído é uma linha reta verde (o "crazy"); o que falta é a onda
// torta rosa (o "queizy"). Ocupa a largura do container.

import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const PINK  = '#FF4F8B';
const GREEN = '#08804A';

interface Props {
  /** 0..1 */
  progress: number;
  height?: number;
  strokeWidth?: number;
  doneColor?: string;
  todoColor?: string;
}

export function QueizyWave({
  progress, height = 22, strokeWidth = 5, doneColor = GREEN, todoColor = PINK,
}: Props) {
  const [width, setWidth] = useState(0);
  const p = Math.max(0, Math.min(1, progress));
  const pad = strokeWidth / 2;
  const mid = height / 2;
  const amp = height / 2 - pad - 1;
  const step = 14; // meia onda — picos abertos, como no ícone

  let wave = '';
  const x0 = pad + (width - 2 * pad) * p;
  if (width > 0 && p < 1) {
    wave = `M${x0.toFixed(1)} ${mid}`;
    let x = x0;
    let up = true;
    while (x + step <= width - pad) {
      wave += ` Q${(x + step / 2).toFixed(1)} ${(up ? mid - amp : mid + amp).toFixed(1)} ${(x + step).toFixed(1)} ${mid}`;
      x += step;
      up = !up;
    }
  }

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {wave !== '' && (
            <Path d={wave} stroke={todoColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          )}
          {p > 0 && (
            <Path d={`M${pad} ${mid} H${x0.toFixed(1)}`} stroke={doneColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          )}
        </Svg>
      )}
    </View>
  );
}
