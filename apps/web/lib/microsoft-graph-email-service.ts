// lib/microsoft-graph-email-service.ts
// Envia emails via Microsoft Graph API usando client credentials (server-to-server).
// Remetente: charlotte@hubacademybr.com (alias de hub@hubacademybr.com)

const TENANT_ID     = process.env.AZURE_TENANT_ID!;
const CLIENT_ID     = process.env.AZURE_CLIENT_ID!;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET!;
const FROM_EMAIL    = 'charlotte@hubacademybr.com';
const FROM_NAME     = 'Charlotte';

// ── Token cache (in-memory, valido por ~1h) ───────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;

  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope:         'https://graph.microsoft.com/.default',
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph token error: ${res.status} — ${err}`);
  }

  const json = await res.json();
  cachedToken    = json.access_token;
  tokenExpiresAt = Date.now() + json.expires_in * 1000;
  return cachedToken!;
}

// ── Send ──────────────────────────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  const payload = {
    message: {
      subject: opts.subject,
      body: { contentType: 'HTML', content: opts.html },
      toRecipients: [{ emailAddress: { address: opts.to } }],
      from: { emailAddress: { address: FROM_EMAIL, name: FROM_NAME } },
    },
    saveToSentItems: false,
  };

  // Retry curto e LIMITADO: este envio roda dentro do Send Email Hook do
  // Supabase, que tem timeout de poucos segundos — backoff longo estoura o
  // timeout de qualquer forma. Então: refresh de token no 401 e 1-2 retentativas
  // curtas em 429/503 (só honra Retry-After quando <= 2s). Throttling sustentado
  // do O365 continua sendo problema de capacidade/limite, não de retry.
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const token = await getAccessToken();
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/users/${FROM_EMAIL}/sendMail`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        console.log(`[Graph] Email enviado para ${opts.to} — "${opts.subject}"`);
        return true;
      }

      const status = res.status;
      const errText = await res.text();

      // Token stale/invalido -> limpa cache e tenta de novo na hora.
      if (status === 401 && attempt < MAX_ATTEMPTS) {
        cachedToken = null;
        tokenExpiresAt = 0;
        console.warn(`[Graph] sendMail 401 (attempt ${attempt}) — refazendo token`);
        continue;
      }

      // Throttling / indisponibilidade transitoria -> backoff curto.
      if ((status === 429 || status === 503) && attempt < MAX_ATTEMPTS) {
        const retryAfterSec = Number(res.headers.get('retry-after')) || 0;
        const waitMs = retryAfterSec > 0 && retryAfterSec <= 2
          ? retryAfterSec * 1000
          : Math.min(500 * attempt, 1500);
        console.warn(`[Graph] sendMail ${status} (attempt ${attempt}) — retry em ${waitMs}ms`);
        await sleep(waitMs);
        continue;
      }

      console.error('[Graph] sendMail error:', status, errText);
      return false;
    } catch (e) {
      if (attempt < MAX_ATTEMPTS) {
        await sleep(Math.min(500 * attempt, 1500));
        continue;
      }
      console.error('[Graph] sendEmail exception:', e);
      return false;
    }
  }
  return false;
}

// ── Leitura de bounces (NDRs) da caixa da Charlotte ────────────────────────────
// Le mensagens recentes de "postmaster/Microsoft Exchange" (falha de entrega) e
// devolve todos os emails achados no corpo. Requer permissao Mail.Read no app.
export async function listBounceRecipients(sinceIso: string): Promise<{ scanned: number; emails: string[] }> {
  const token = await getAccessToken();
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(FROM_EMAIL)}/messages`
    + `?$select=subject,from,receivedDateTime,body&$top=200`
    + `&$filter=${encodeURIComponent(`receivedDateTime ge ${sinceIso}`)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Graph read ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const msgs: any[] = json.value ?? [];
  const RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = new Set<string>();
  for (const m of msgs) {
    const from = (m.from?.emailAddress?.address ?? '').toLowerCase();
    const subj = (m.subject ?? '').toLowerCase();
    const isNdr = from.includes('postmaster') || from.includes('microsoftexchange')
      || subj.startsWith('undeliverable') || subj.includes('possível entregar') || subj.includes('possivel entregar');
    if (!isNdr) continue;
    const body: string = m.body?.content ?? '';
    for (const e of body.match(RE) ?? []) emails.add(e.toLowerCase());
  }
  return { scanned: msgs.length, emails: [...emails] };
}

// ── Leitura de mensagens da caixa (suporte) ────────────────────────────────────
export interface InboxMessage {
  id: string;
  conversationId: string | null;
  from: string;
  fromName: string | null;
  to: string[];
  subject: string;
  bodyPreview: string;
  bodyText: string;
  receivedDateTime: string;
}

export async function listInboxMessages(sinceIso: string, top = 100): Promise<InboxMessage[]> {
  const token = await getAccessToken();
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(FROM_EMAIL)}/messages`
    + `?$select=id,conversationId,from,toRecipients,subject,bodyPreview,body,receivedDateTime`
    + `&$top=${top}&$orderby=receivedDateTime desc`
    + `&$filter=${encodeURIComponent(`receivedDateTime ge ${sinceIso}`)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.body-content-type="text"' },
  });
  if (!res.ok) throw new Error(`Graph read ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return (json.value ?? []).map((m: any) => ({
    id: m.id,
    conversationId: m.conversationId ?? null,
    from: (m.from?.emailAddress?.address ?? '').toLowerCase(),
    fromName: m.from?.emailAddress?.name ?? null,
    to: (m.toRecipients ?? []).map((r: any) => (r.emailAddress?.address ?? '').toLowerCase()),
    subject: m.subject ?? '',
    bodyPreview: m.bodyPreview ?? '',
    bodyText: m.body?.content ?? m.bodyPreview ?? '',
    receivedDateTime: m.receivedDateTime ?? '',
  })) as InboxMessage[];
}
