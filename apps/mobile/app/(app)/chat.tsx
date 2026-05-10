// app/(app)/chat.tsx
// Redirect legado — rota foi unificada em (tabs)/practice?mode=chat.
// Mantém deep links e notificações antigas funcionando.

import { Redirect } from 'expo-router';

export default function ChatRedirect() {
  return <Redirect href={{ pathname: '/(app)/(tabs)/practice', params: { mode: 'chat' } }} />;
}
