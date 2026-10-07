// HeaderLogo — logo horizontal do Queizy (balão + "queizy" com o z em raio)
// no canto direito dos headers das tabs. Imagem gerada do mesmo desenho do
// manual da marca (1x/2x/3x), então não depende da fonte carregada.

import React from 'react';
import { Image } from 'react-native';

export function HeaderLogo({ height = 20 }: { height?: number }) {
  return (
    <Image
      source={require('@/assets/logo-header.png')}
      style={{ height, width: Math.round(height * 86 / 20) }}
      resizeMode="contain"
      accessibilityLabel="Queizy"
    />
  );
}
