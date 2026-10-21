// lib/otaDiagnostics.ts — diagnóstico da atualização automática (OTA), uma vez por abertura do app.
//
// Em 2026-10-21 boa parte dos alunos das versões 2.0.0 e 2.0.1 abria sempre com o código da loja, mesmo
// abrindo o app várias vezes. Este evento (ota_status em charlotte_analytics_events) mostra por quê:
//   embedded    abriu com o código da loja (sem atualização aplicada)
//   emergency   a atualização baixada falhou ao abrir e o app voltou para o código da loja (reason = motivo)
//   launch_ms   quanto a abertura esperou pela atualização
//   errors      últimos erros do expo-updates nas últimas 24 h (download, verificação, etc.)
import * as Updates from 'expo-updates';
import { track } from './analytics';
import { Application } from './nativeOptional';

let sent = false;

export async function reportOtaStatus(): Promise<void> {
  if (sent || __DEV__ || !Updates.isEnabled) return;
  sent = true;
  try {
    let errors: string | null = null;
    let errCount = 0;
    try {
      const logs = await Updates.readLogEntriesAsync(24 * 3600_000);
      const bad = logs.filter(l => l.level === 'error' || l.level === 'fatal');
      errCount = bad.length;
      if (bad.length) errors = bad.slice(-5).map(l => `${l.code}: ${l.message}`.slice(0, 160)).join(' | ');
    } catch {}
    track('ota_status', {
      store_version: Application?.nativeApplicationVersion ?? null,
      embedded: Updates.isEmbeddedLaunch,
      emergency: Updates.isEmergencyLaunch,
      reason: Updates.emergencyLaunchReason ?? null,
      launch_ms: Updates.launchDuration ?? null,
      update_id: Updates.updateId ?? null,
      update_created: Updates.createdAt ? Updates.createdAt.toISOString() : null,
      err_count: errCount,
      errors,
    });
  } catch {}
}
