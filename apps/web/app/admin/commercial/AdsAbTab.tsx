'use client';
// Aba "Anúncios A/B" do Comercial: gera os dois links de cada campanha (site x lojas) e compara os lados.
// Lado loja: cliques no /baixar por celular (as instalações aparecem em App Store Connect › Campanhas e no
// Play Console, pelo nome da campanha). Lado site: visitas com utm, checkouts, testes iniciados e cobranças.
import { useCallback, useEffect, useState } from 'react';
import { Copy, Check, RefreshCw } from 'lucide-react';

interface AdRow { campaign: string; clicks: number; ios: number; android: number; desktop: number; visits: number; checkouts: number; started: number; charged: number; revenue: number }

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function CopyLine({ label, url }: { label: string; url: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--s2)', borderRadius: 10 }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</div>
      </div>
      <button className="adm-btn-sm ghost" onClick={() => { navigator.clipboard.writeText(url).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); }); }}>
        {ok ? <Check size={13} /> : <Copy size={13} />} {ok ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  );
}

export function AdsAbTab() {
  const [name, setName] = useState('');
  const [days, setDays] = useState(14);
  const [rows, setRows] = useState<AdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const c = slug(name);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/commercial?view=ads&days=${days}`);
      const j = await r.json();
      setRows(j.ads ?? []);
    } finally { setLoading(false); }
  }, [days]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="adm-body">
      <div className="adm-panel" style={{ marginBottom: 16 }}>
        <div className="adm-panel-hdr"><span className="adm-panel-title">Links da campanha</span></div>
        <div className="adm-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.5 }}>
            Dê um nome à campanha (o mesmo do Gerenciador de Anúncios) e use um link em cada conjunto de anúncios.
            O nome aparece também em App Store Connect › Campanhas e no Play Console.
          </div>
          <input className="adm-input" placeholder="Nome da campanha, por exemplo: igor-reels-out" value={name} onChange={e => setName(e.target.value)} />
          {c && <>
            <CopyLine label="Lado A · site" url={`https://queizy.com/?utm_source=meta&utm_medium=ads&utm_campaign=${c}-site`} />
            <CopyLine label="Lado B · lojas (iPhone e Android)" url={`https://queizy.com/baixar?c=${c}-loja`} />
          </>}
        </div>
      </div>

      <div className="adm-panel">
        <div className="adm-panel-hdr">
          <span className="adm-panel-title">Resultado por campanha</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select className="adm-select-ghost" value={days} onChange={e => setDays(Number(e.target.value))}>
              {[1, 7, 14, 30, 90].map(d => <option key={d} value={d}>{d === 1 ? 'Últimas 24 h' : `Últimos ${d} dias`}</option>)}
            </select>
            <button className="adm-btn-sm ghost" onClick={load}><RefreshCw size={13} /> Atualizar</button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="adm-table">
            <thead>
              <tr>
                <th>Campanha</th>
                <th style={{ textAlign: 'right' }}>Cliques p/ loja</th>
                <th style={{ textAlign: 'right' }}>iPhone · Android · PC</th>
                <th style={{ textAlign: 'right' }}>Visitas no site</th>
                <th style={{ textAlign: 'right' }}>Checkouts</th>
                <th style={{ textAlign: 'right' }}>Teste/assinatura</th>
                <th style={{ textAlign: 'right' }}>Cobrados</th>
                <th style={{ textAlign: 'right' }}>Receita</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--t3)', padding: 24 }}>Carregando…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--t3)', padding: 24 }}>Nenhum clique ou visita de anúncio no período.</td></tr>
              ) : rows.map(r => (
                <tr key={r.campaign}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{r.campaign}</td>
                  <td style={{ textAlign: 'right' }}><span className="num">{r.clicks || '—'}</span></td>
                  <td style={{ textAlign: 'right', color: 'var(--t3)', fontSize: 12.5 }}>{r.clicks ? `${r.ios} · ${r.android} · ${r.desktop}` : '—'}</td>
                  <td style={{ textAlign: 'right' }}><span className="num">{r.visits || '—'}</span></td>
                  <td style={{ textAlign: 'right' }}><span className="num">{r.checkouts || '—'}</span></td>
                  <td style={{ textAlign: 'right' }}><span className="num">{r.started || '—'}</span></td>
                  <td style={{ textAlign: 'right' }}><span className="num">{r.charged || '—'}</span></td>
                  <td style={{ textAlign: 'right' }}><span className="num">{r.revenue ? brl(r.revenue) : '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--t3)', lineHeight: 1.5 }}>
          Lado loja: a instalação acontece na loja e não chega aqui. Para comparar, use os cliques daqui e as instalações da
          campanha em App Store Connect › Análise › Campanhas e no Play Console. Lado site: a compra fica ligada à campanha
          por 30 dias depois da visita.
        </div>
      </div>
    </div>
  );
}
