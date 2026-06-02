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

export function promotionVideoLocalPath(toLevel: string): string {
  return `${FileSystem.documentDirectory}promotion-videos/${toLevel}.mp4`;
}

/** Retorna URI usavel (local se ja baixou, remoto como fallback). */
export async function getPromotionVideoUri(toLevel: string): Promise<string | null> {
  const remote = PROMOTION_VIDEO_REMOTE[toLevel];
  if (!remote) return null;
  const local = promotionVideoLocalPath(toLevel);
  try {
    const info = await FileSystem.getInfoAsync(local);
    if (info.exists && info.size && info.size > 0) return local;
  } catch {}
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
        // Ja existe e tem tamanho — pular
        const info = await FileSystem.getInfoAsync(local);
        if (info.exists && info.size && info.size > 0) return;

        // Garante diretorio
        const dir = `${FileSystem.documentDirectory}promotion-videos/`;
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});

        // Download em background
        const res = await FileSystem.downloadAsync(remote, local);
        if (cancelled) return;
        if (res.status !== 200) {
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
