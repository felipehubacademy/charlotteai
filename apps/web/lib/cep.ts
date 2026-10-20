// lib/cep.ts — endereço a partir do CEP (base pública dos Correios). Usado no formulário de assinar
// (preenche rua, bairro e cidade sozinho) e no servidor (código da cidade que o checkout exige).
export interface CepInfo { cep: string; street: string; district: string; city: string; uf: string; ibge: number }

export async function lookupCep(raw: string): Promise<CepInfo | null> {
  const cep = raw.replace(/\D/g, '');
  if (cep.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const j = await r.json() as { erro?: unknown; logradouro?: string; bairro?: string; localidade?: string; uf?: string; ibge?: string };
    if (j.erro || !j.ibge) return null;
    return { cep, street: j.logradouro ?? '', district: j.bairro ?? '', city: j.localidade ?? '', uf: j.uf ?? '', ibge: Number(j.ibge) };
  } catch {
    return null;
  }
}
