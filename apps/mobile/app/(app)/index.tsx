// app/(app)/index.tsx
// Old home foi removido — todos os usuarios do runtime 2.0.0+ caem no
// tab navigator novo (/(app)/(tabs)). Builds antigos da App Store (1.0.0)
// continuam usando o binario congelado com o old home intacto (OTAs nao
// chegam la pq sao por runtimeVersion).

import React from 'react';
import { Redirect } from 'expo-router';

export default function HomeScreen() {
  return <Redirect href="/(app)/(tabs)" />;
}
