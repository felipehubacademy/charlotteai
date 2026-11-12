// lib/apple-signin.ts
// "Continuar com a Apple": ao excluir a conta, a Apple exige desfazer o vínculo do app com o Apple ID
// (guideline 5.1.1(v)). O app manda um authorizationCode novo; aqui trocamos por um refresh_token e
// pedimos a revogação.
//
// Precisa de uma chave "Sign in with Apple" (.p8) do Apple Developer, em variáveis de ambiente:
//   APPLE_SIWA_KEY_ID, APPLE_SIWA_PRIVATE_KEY (conteúdo do .p8; \n literal é aceito)
// Sem elas, a revogação é pulada (a exclusão da conta segue normalmente) e o log avisa.

import { createPrivateKey, sign } from 'crypto';

const APPLE = 'https://appleid.apple.com';
// Login nativo no iPhone: o "client_id" é o bundle id do app.
const CLIENT_ID = 'com.hubacademy.charlotte';
// Team ID da Hub Academy no Apple Developer (público, o mesmo do apple-app-site-association).
const TEAM_ID = 'S3BGJ3648D';

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function clientSecret(): string | null {
  const teamId = TEAM_ID;
  const keyId = process.env.APPLE_SIWA_KEY_ID;
  const pem = process.env.APPLE_SIWA_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!teamId || !keyId || !pem) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const payload = b64url(JSON.stringify({ iss: teamId, iat: now, exp: now + 300, aud: APPLE, sub: CLIENT_ID }));
  const data = `${header}.${payload}`;
  // ES256 em JWT = assinatura r||s (ieee-p1363), não DER.
  const sig = sign('sha256', Buffer.from(data), { key: createPrivateKey(pem), dsaEncoding: 'ieee-p1363' });
  return `${data}.${b64url(sig)}`;
}

/** Revoga o vínculo com a Apple. Devolve true se a Apple confirmou; nunca lança. */
export async function revokeAppleAuthorization(authorizationCode: string): Promise<boolean> {
  try {
    const secret = clientSecret();
    if (!secret) {
      console.warn('[apple-signin] revogação pulada: faltam APPLE_SIWA_KEY_ID / APPLE_SIWA_PRIVATE_KEY');
      return false;
    }
    const tokenRes = await fetch(`${APPLE}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: secret, code: authorizationCode, grant_type: 'authorization_code' }),
    });
    const tokens = await tokenRes.json().catch(() => ({})) as { refresh_token?: string; access_token?: string; error?: string };
    const token = tokens.refresh_token ?? tokens.access_token;
    if (!token) {
      console.warn('[apple-signin] troca do código falhou:', tokenRes.status, tokens.error ?? '');
      return false;
    }
    const revokeRes = await fetch(`${APPLE}/auth/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID, client_secret: secret, token,
        token_type_hint: tokens.refresh_token ? 'refresh_token' : 'access_token',
      }),
    });
    if (!revokeRes.ok) console.warn('[apple-signin] revogação falhou:', revokeRes.status);
    return revokeRes.ok;
  } catch (e: any) {
    console.warn('[apple-signin] erro na revogação:', e?.message);
    return false;
  }
}
