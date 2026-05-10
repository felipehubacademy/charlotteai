// app/(app)/pronunciation.tsx
// Redirect legado — rota foi unificada em (tabs)/practice?mode=pronunciation.

import { Redirect } from 'expo-router';

export default function PronunciationRedirect() {
  return <Redirect href={{ pathname: '/(app)/(tabs)/practice', params: { mode: 'pronunciation' } }} />;
}
