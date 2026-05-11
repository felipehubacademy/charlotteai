// Abre links HTTPS dentro do app (in-app browser) — padrão Duolingo/Twitter:
// SFSafariViewController no iOS, Chrome Custom Tabs no Android. User volta
// pro app com swipe down ou botão X, sem perder contexto.
//
// Fallback pra Linking.openURL caso o módulo nativo do expo-web-browser nao
// esteja linkado (acontece em OTA que precede o rebuild nativo que adicionou
// a dep). Garante que nada quebra na transicao OTA → build.
//
// NÃO usar pra mailto:, tel:, ou deep links de outros apps — usar Linking
// direto pra esses.

import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

export async function openLink(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url);
  }
}
