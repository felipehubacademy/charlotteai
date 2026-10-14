// lib/systemLang.ts
// Idioma dos AVISOS DE SISTEMA e do FLUXO DE COMPRA — segue o idioma do
// APARELHO, não o nível de inglês do usuário.
//
// Regra do projeto:
//   - Conteúdo de APRENDIZADO (lições, exercícios, feedback pedagógico) segue o
//     NÍVEL: Novice = PT-BR, Inter/Advanced = English. (continua com o isPt de
//     level === 'Novice' nas telas de conteúdo)
//   - Avisos de SISTEMA e transacionais (paywall, compra, limites, erros,
//     alertas, chrome de UI) seguem o IDIOMA DO DEVICE. É o que este helper dá.
//
// OTA-safe: NÃO usa expo-localization (módulo nativo ausente no binário atual —
// quebraria por OTA). Lê o locale pelos módulos core do RN (presentes em todo
// build) e cai no Intl como reforço.

import { NativeModules, Platform, DevSettings } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Updates from 'expo-updates';

// Escolha do aluno em Perfil > Idioma do app: 'auto' (padrão, segue o aparelho), 'pt' ou 'en'.
const LANG_PREF_KEY = 'app_lang_pref';
export type AppLangPref = 'auto' | 'pt' | 'en';

function readLangPref(): AppLangPref {
  try {
    const v = SecureStore.getItem(LANG_PREF_KEY); // leitura síncrona: o idioma é decidido na abertura do app
    return v === 'pt' || v === 'en' ? v : 'auto';
  } catch { return 'auto'; }
}

/** Preferência atual (para mostrar no Perfil). */
export const appLangPref: AppLangPref = readLangPref();

/** Grava a escolha e reinicia o app para aplicar em todas as telas. */
export async function setAppLangPref(pref: AppLangPref): Promise<void> {
  if (pref === 'auto') await SecureStore.deleteItemAsync(LANG_PREF_KEY).catch(() => {});
  else await SecureStore.setItemAsync(LANG_PREF_KEY, pref).catch(() => {});
  try { await Updates.reloadAsync(); } catch { DevSettings.reload(); }
}

function rawDeviceLocale(): string {
  // 1) Módulos nativos core do RN (sempre presentes).
  try {
    if (Platform.OS === 'ios') {
      const s = NativeModules.SettingsManager?.settings;
      const fromSettings = s?.AppleLocale || (Array.isArray(s?.AppleLanguages) ? s.AppleLanguages[0] : undefined);
      if (fromSettings) return String(fromSettings);
    } else {
      const fromI18n = NativeModules.I18nManager?.localeIdentifier;
      if (fromI18n) return String(fromI18n);
    }
  } catch { /* segue pro fallback */ }

  // 2) Reforço: Intl (Hermes tem Intl no SDK 54).
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale;
    if (loc) return String(loc);
  } catch { /* segue */ }

  return '';
}

/** Idioma do aparelho: 'pt' quando está em português; caso contrário 'en'. */
export function getDeviceLang(): 'pt' | 'en' {
  const loc = rawDeviceLocale().toLowerCase().replace('_', '-');
  return loc.startsWith('pt') ? 'pt' : 'en';
}

/** Idioma do app: a escolha do Perfil, ou o do aparelho no automático. */
export function getSystemLang(): 'pt' | 'en' {
  return appLangPref === 'auto' ? getDeviceLang() : appLangPref;
}

/** Atalho: true quando o idioma de sistema é português. */
export const systemIsPt: boolean = getSystemLang() === 'pt';

/** Hook (o idioma do device não muda em runtime; retorna o valor estável). */
export function useSystemIsPt(): boolean {
  return systemIsPt;
}
