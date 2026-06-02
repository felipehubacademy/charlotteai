// usePromotionVideoPrefetch — baixa o video de promocao do nivel atual
// pro disco local antes do PromotionModal precisar. Quando aluno entra
// na ultima atividade do ultimo modulo, comeca download em background.
// Quando promocao dispara, modal usa URI local (play instantaneo).
//
// Cache persiste em FileSystem.documentDirectory entre sessoes.

import { useEffect } from 'react';
import * as FileSystem from 'expo-file-system/legacy';

const PROMOTION_VIDEO_REMOTE: Record<string, string> = {
  Inter:    'https://fnvjibzreepubageztoi.supabase.co/storage/v1/object/public/promotion-videos/novice-to-inter.mp4',
  // Advanced: pendente
};

// Module-level Set: rastreia quais niveis ja terminaram de baixar nesta
// sessao. Permite resolucao SINCRONA na hora do modal abrir.
const downloadedLevels = new Set<string>();

export function promotionVideoLocalPath(toLevel: string): string {
  return `${FileSystem.documentDirectory}promotion-videos/${toLevel}.mp4`;
}

/**
 * Sincrono: retorna a URI a usar AGORA. Se ja baixamos nesta sessao,
 * retorna o path local. Caso contrario, retorna o URL remoto (com buffer).
 * SEM filesystem check async — usado direto no render.
 */
export function resolvePromotionVideoUriSync(toLevel: string): string | null {
  const remote = PROMOTION_VIDEO_REMOTE[toLevel];
  if (!remote) return null;
  if (downloadedLevels.has(toLevel)) {
    return promotionVideoLocalPath(toLevel);
  }
  return remote;
}

/** Baixa em background se ainda nao baixado. Idempotente. */
export function usePromotionVideoPrefetch(toLevel: string | null, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled || !toLevel) return;
    const remote = PROMOTION_VIDEO_REMOTE[toLevel];
    if (!remote) return;

    let cancelled = false;
    (async () => {
      const local = promotionVideoLocalPath(toLevel);
      try {
        // Ja existe e tem tamanho — registra no Set sync e pula
        const info = await FileSystem.getInfoAsync(local);
        if (info.exists && info.size && info.size > 0) {
          downloadedLevels.add(toLevel);
          return;
        }

        // Garante diretorio
        const dir = `${FileSystem.documentDirectory}promotion-videos/`;
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});

        // Download em background
        const res = await FileSystem.downloadAsync(remote, local);
        if (cancelled) return;
        if (res.status === 200) {
          downloadedLevels.add(toLevel);
        } else {
          // Limpa download parcial pra retentar depois
          try { await FileSystem.deleteAsync(local, { idempotent: true }); } catch {}
        }
      } catch (e) {
        console.warn('[usePromotionVideoPrefetch] download failed', e);
      }
    })();

    return () => { cancelled = true; };
  }, [toLevel, enabled]);
}
