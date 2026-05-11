// Abre links HTTPS dentro do app (in-app browser) — padrão Duolingo/Twitter:
// SFSafariViewController no iOS, Chrome Custom Tabs no Android. User volta
// pro app com swipe down ou botão X, sem perder contexto.
//
// IMPORTANTE: expo-web-browser é módulo nativo. Em OTA que precede o rebuild
// que adicionou a dep, o módulo NÃO está linkado no binário. Por isso o
// import é DINÂMICO (lazy), executado dentro da função — se falhar, cai no
// fallback Linking.openURL sem crashar o app.
//
// NÃO usar pra mailto:, tel:, ou deep links de outros apps — usar Linking
// direto pra esses.

import { Linking } from 'react-native';

export async function openLink(url: string): Promise<void> {
  try {
    const WebBrowser = await import('expo-web-browser');
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url);
  }
}
