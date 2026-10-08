// lib/nativeOptional.ts
// Módulos nativos que entraram no binário 2.1.0 (compartilhar imagem,
// área de transferência, referrer da loja). Carregados com proteção: num
// binário sem eles (dev client antigo, simulador desatualizado) o import
// direto derruba o app na abertura. Aqui viram null e o recurso cai para a
// versão sem nativo (compartilhar texto, digitar o código).

/* eslint-disable @typescript-eslint/no-var-requires */

function optional<T>(load: () => T): T | null {
  try { return load(); } catch { return null; }
}

export const ViewShot = optional(() => require('react-native-view-shot') as typeof import('react-native-view-shot'));
export const Sharing = optional(() => require('expo-sharing') as typeof import('expo-sharing'));
export const Clipboard = optional(() => require('expo-clipboard') as typeof import('expo-clipboard'));
export const Application = optional(() => require('expo-application') as typeof import('expo-application'));

/** Dá para gerar e compartilhar o card como imagem neste binário. */
export const canShareImage = !!(ViewShot && Sharing);
