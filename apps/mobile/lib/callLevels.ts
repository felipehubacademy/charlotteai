// lib/callLevels.ts — volume real das duas pontas de uma ligação (aluno e personagem), 0..1, para a
// onda e o anel do avatar reagirem à voz. Lê as estatísticas do WebRTC a cada 90 ms:
//   personagem: 'inbound-rtp' de áudio; aluno: 'media-source' (ou 'outbound-rtp') de áudio.
// No react-native-webrtc o campo audioLevel vem sempre 0, então o volume sai da energia:
//   RMS = sqrt(ΔtotalAudioEnergy / ΔtotalSamplesDuration).
// Serve para qualquer ligação: quem usa passa uma função que devolve os relatórios de estatística.
import { useEffect, useRef } from 'react';

type Report = Map<string, any> | { forEach: (cb: (r: any) => void) => void };

export interface CallLevels {
  remote: React.MutableRefObject<number>;
  local: React.MutableRefObject<number>;
}

export function useCallLevels(active: boolean, getReports: () => Promise<Report[]>): CallLevels {
  const remote = useRef(0);
  const local = useRef(0);
  const prev = useRef<Record<string, { e: number; d: number }>>({});

  useEffect(() => {
    if (!active) { remote.current = 0; local.current = 0; prev.current = {}; return; }
    let alive = true;
    const iv = setInterval(async () => {
      try {
        const reports = await getReports();
        if (!alive) return;
        let r = 0; let l = 0;
        for (const rep of reports) {
          rep.forEach((s: any) => {
            if (s.kind !== 'audio' && s.mediaType !== 'audio') return;
            const isRemote = s.type === 'inbound-rtp';
            const isLocal = s.type === 'media-source' || s.type === 'outbound-rtp';
            if (!isRemote && !isLocal) return;
            let lvl = typeof s.audioLevel === 'number' && s.audioLevel > 0 ? s.audioLevel : 0;
            if (typeof s.totalAudioEnergy === 'number' && typeof s.totalSamplesDuration === 'number') {
              const key = `${s.type}:${s.id}`;
              const p = prev.current[key];
              if (p) {
                const dE = s.totalAudioEnergy - p.e; const dD = s.totalSamplesDuration - p.d;
                if (dD > 0 && dE >= 0) lvl = Math.max(lvl, Math.sqrt(dE / dD));
              }
              prev.current[key] = { e: s.totalAudioEnergy, d: s.totalSamplesDuration };
            }
            if (isRemote) r = Math.max(r, lvl); else l = Math.max(l, lvl);
          });
        }
        // Suaviza e estica a faixa típica de fala (0,03–0,3) para 0..1.
        const shape = (v: number) => Math.min(1, Math.sqrt(v) * 1.5);
        remote.current = remote.current * 0.45 + shape(r) * 0.55;
        local.current = local.current * 0.45 + shape(l) * 0.55;
      } catch { /* estatística indisponível neste instante */ }
    }, 90);
    return () => { alive = false; clearInterval(iv); };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  return { remote, local };
}
