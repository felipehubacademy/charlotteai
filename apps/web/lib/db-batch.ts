// lib/db-batch.ts — leitura do banco sem as duas armadilhas da API (PostgREST), que já pararam pushes sem aviso:
// - lista grande de ids em .in() estoura o tamanho do endereço (acima de ~600 ids o banco responde 400);
// - toda leitura para em 1.000 linhas, sem aviso.
// readAll lê página por página até a última linha; readIn manda os ids em lotes de 200. As duas lançam erro
// (nunca devolvem "vazio" quando a consulta falhou). `build` precisa de ordem estável (.order por coluna única)
// para as páginas não pularem nem repetirem linhas.
export const IN_CHUNK = 200;
export const PAGE = 1000;

export type OnReadError = (label: string, message: string) => Promise<void> | void;

/** Todas as linhas da consulta, página por página. */
export async function readAll<T = any>(label: string, build: () => any, onError?: OnReadError): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ;) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) {
      await onError?.(label, error.message);
      throw new Error(`[${label}] ${error.message}`);
    }
    const rows = (data ?? []) as T[];
    if (!rows.length) return out;
    out.push(...rows);
    from += rows.length;
  }
}

/** Todas as linhas para uma lista de ids, com os ids em lotes. */
export async function readIn<T = any>(label: string, ids: readonly string[], build: (chunk: string[]) => any, onError?: OnReadError): Promise<T[]> {
  const out: T[] = [];
  const uniq = [...new Set(ids)];
  for (let i = 0; i < uniq.length; i += IN_CHUNK) {
    const chunk = uniq.slice(i, i + IN_CHUNK);
    out.push(...await readAll<T>(label, () => build(chunk), onError));
  }
  return out;
}

/** Escrita (update/delete) com lista de ids em lotes. Lança no primeiro erro. */
export async function writeIn(label: string, ids: readonly string[], run: (chunk: string[]) => PromiseLike<{ error: { message: string } | null }>): Promise<void> {
  const uniq = [...new Set(ids)];
  for (let i = 0; i < uniq.length; i += IN_CHUNK) {
    const { error } = await run(uniq.slice(i, i + IN_CHUNK));
    if (error) throw new Error(`[${label}] ${error.message}`);
  }
}
