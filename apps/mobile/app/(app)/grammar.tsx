// app/(app)/grammar.tsx
// Redirect legado — rota foi unificada em (tabs)/practice?mode=grammar.

import { Redirect } from 'expo-router';

export default function GrammarRedirect() {
  return <Redirect href={{ pathname: '/(app)/(tabs)/practice', params: { mode: 'grammar' } }} />;
}
