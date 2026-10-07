// HeaderLogo — logo horizontal do Queizy (balão + "queizy" com o z em raio)
// no canto direito dos headers das tabs. Imagem gerada do mesmo desenho do
// manual da marca (1x/2x/3x), então não depende da fonte carregada.

import React from 'react';
import { Image } from 'react-native';

export function HeaderLogo({ height = 20 }: { height?: number }) {
  // Acima de 24pt usa o arquivo grande (até 44pt nítido em 3x).
  const source = height > 24 ? require('@/assets/logo-lockup.png') : require('@/assets/logo-header.png');
  return (
    <Image
      source={source}
      style={{ height, width: Math.round(height * 86 / 20) }}
      resizeMode="contain"
      accessibilityLabel="Queizy"
    />
  );
}
