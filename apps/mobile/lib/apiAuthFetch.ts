// lib/apiAuthFetch.ts — todo pedido do app ao nosso servidor leva a prova de login (Authorization: Bearer).
// O servidor (apps/web/middleware.ts) recusa com 401 { error: 'account_not_found' } quando a conta não existe mais
// (apagada pelo /admin, por exemplo): aí o app sai da conta e volta ao login. Instalado uma vez no _layout.
import Constants from 'expo-constants';
import { supabase } from './supabase';

const API_HOSTS = new Set(
  [Constants.expoConfig?.extra?.apiBaseUrl as string | undefined, 'https://queizy.com', 'https://www.queizy.com', 'https://charlotte.hubacademybr.com']
    .filter(Boolean).map(u => { try { return new URL(u!).host; } catch { return ''; } }).filter(Boolean),
);

let installed = false;
let signingOut = false;

export function installApiAuthFetch(): void {
  if (installed) return;
  installed = true;
  const original = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    let host = '';
    try { host = new URL(url).host; } catch {}
    if (!API_HOSTS.has(host)) return original(input, init);

    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (!headers.has('Authorization')) {
      const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const token = data.session?.access_token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }
    const res = await original(input, { ...init, headers });
    if (res.status === 401 && !signingOut) {
      const body = await res.clone().json().catch(() => null) as { error?: string } | null;
      if (body?.error === 'account_not_found') {
        signingOut = true;
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        signingOut = false;
      }
    }
    return res;
  };
}
