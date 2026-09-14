// lib/appVersion.ts
// Campos de versao do app reportados ao banco no app open (Nivel 1: via OTA, sem
// modulo nativo). Lidos de expo-constants/expo-updates, ja embarcados no binario.
//
//   app_version     -> versao declarada no bundle (ex. "1.1.0")
//   runtime_version -> runtime do binario (ex. "2.0.0"); discrimina binario novo vs antigo
//   ota_update_id   -> id do bundle OTA carregado; null = bundle embarcado da loja
//   app_platform    -> 'ios' | 'android'
//
// Tudo em try/catch: nunca lanca. Em Expo Go / dev os campos de Updates podem vir
// nulos — aceitavel, o objetivo e medir producao.

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

export interface AppVersionFields {
  app_version: string | null;
  runtime_version: string | null;
  ota_update_id: string | null;
  app_platform: string;
}

export function getAppVersionFields(): AppVersionFields {
  let app_version: string | null = null;
  let runtime_version: string | null = null;
  let ota_update_id: string | null = null;

  try {
    app_version = Constants.expoConfig?.version ?? null;
  } catch {}
  try {
    runtime_version = (Updates.runtimeVersion as string | null) ?? null;
  } catch {}
  try {
    // Embarcado (bundle da loja) => updateId null. OTA carregado => id do update.
    ota_update_id = Updates.isEmbeddedLaunch ? null : (Updates.updateId ?? null);
  } catch {}

  return {
    app_version,
    runtime_version,
    ota_update_id,
    app_platform: Platform.OS,
  };
}
