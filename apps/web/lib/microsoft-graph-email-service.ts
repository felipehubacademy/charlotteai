// lib/microsoft-graph-email-service.ts
// Envia emails via Microsoft Graph API usando client credentials (server-to-server).
// Envio: a caixa charlotte@hubacademybr.com envia como a caixa compartilhada
// noreply@queizy.com (nome "Queizy", sem licença), com permissão "Enviar como"
// dada no Exchange. Leitura do suporte: caixa da Charlotte, que recebe contato@
// e suporte@queizy.com. Devoluções (NDRs) são lidas nas duas caixas.

const TENANT_ID     = process.env.AZURE_TENANT_ID!;
const CLIENT_ID     = process.env.AZURE_CLIENT_ID!;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET!;
const INBOX_EMAIL   = 'charlotte@hubacademybr.com'; // caixa que envia (como noreply) e que o suporte lê
const SENDER_EMAIL  = process.env.EMAIL_SENDER_ADDRESS || 'noreply@queizy.com'; // remetente (caixa compartilhada)
const FROM_NAME     = process.env.EMAIL_SENDER_NAME || 'Queizy';
const REPLY_TO      = 'contato@queizy.com';
// Reserva: apelido da própria caixa da Charlotte (envio por apelido ligado).
// Usado só se o "Enviar como" noreply@ for negado pelo Exchange.
const FALLBACK_FROM = 'contato@queizy.com';

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
//
// Reserva (13/11/2026, depois de 18 h de queda do Exchange da Microsoft): e-mails ESSENCIAIS
// (login e senha, boas-vindas, acesso depois da compra, avisos da assinatura, convites, resposta do
// suporte) passam a sair pelo serviço reserva quando a Microsoft falha por indisponibilidade
// (5xx, 429, demora ou erro de rede). Campanhas em massa NÃO usam o reserva: o plano dele é pequeno
// (cerca de 100 por dia, dividido com o site da Hub) e massa por lá prejudicaria a reputação.
// Recusa de verdade (destinatário inválido etc.) também não muda de caminho.
// Liga sozinho quando RESEND_API_KEY existe; o remetente continua noreply@queizy.com (domínio
// verificado no reserva com DKIM próprio, sem mexer nos registros da Microsoft).

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** E-mail essencial: se a Microsoft estiver fora, sai pelo serviço reserva. */
  essential?: boolean;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Depois de uma falha de indisponibilidade, os essenciais vão direto pelo reserva por 10 min,
// sem esperar a Microsoft de novo (na queda de 12/11 cada tentativa levava ~20 s até o erro, e o
// hook de e-mail do login tem só alguns segundos). Vale por instância da função; basta para não
// empilhar esperas.
const GRAPH_PAUSE_MS = 10 * 60_000;
// Essencial espera a Microsoft no máximo isto antes de ir para o reserva.
const ESSENTIAL_GRAPH_TIMEOUT_MS = 4_000;
let graphPausedUntil = 0;

type GraphResult = 'ok' | 'down' | 'rejected';

export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  const canFallback = !!opts.essential && !!process.env.RESEND_API_KEY;

  if (canFallback && Date.now() < graphPausedUntil) {
    return sendViaFallback(opts, 'Microsoft em pausa após falha recente');
  }

  const r = await sendViaGraph(opts, canFallback);
  if (r === 'ok') return true;
  if (r === 'down') {
    graphPausedUntil = Date.now() + GRAPH_PAUSE_MS;
    if (canFallback) return sendViaFallback(opts, 'Microsoft indisponível');
  }
  return false;
}

async function sendViaGraph(opts: SendEmailOptions, fastFail: boolean): Promise<GraphResult> {
  let fromAddress = SENDER_EMAIL;
  const payload = {
    message: {
      subject: opts.subject,
      body: { contentType: 'HTML', content: opts.html },
      toRecipients: [{ emailAddress: { address: opts.to } }],
      from: { emailAddress: { address: SENDER_EMAIL, name: FROM_NAME } },
      replyTo: [{ emailAddress: { address: REPLY_TO, name: FROM_NAME } }],
    },
    saveToSentItems: false,
  };

  // Retry curto e LIMITADO: este envio roda dentro do Send Email Hook do
  // Supabase, que tem timeout de poucos segundos — backoff longo estoura o
  // timeout de qualquer forma. Então: refresh de token no 401 e 1-2 retentativas
  // curtas em 429/503 (só honra Retry-After quando <= 2s). Throttling sustentado
  // do O365 continua sendo problema de capacidade/limite, não de retry.
  // Com reserva disponível (fastFail), indisponibilidade não tenta de novo: vai direto para o reserva.
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const signal = fastFail ? AbortSignal.timeout(ESSENTIAL_GRAPH_TIMEOUT_MS) : undefined;
      const token = await getAccessToken();
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/users/${INBOX_EMAIL}/sendMail`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal,
        }
      );

      if (res.ok) {
        console.log(`[Graph] Email enviado para ${opts.to} — "${opts.subject}"`);
        return 'ok';
      }

      const status = res.status;
      const errText = await res.text();

      // "Enviar como" negado (permissão ainda propagando ou removida):
      // reenvia pelo apelido da própria caixa para o e-mail não se perder.
      if (status === 403 && errText.includes('ErrorSendAsDenied') && fromAddress !== FALLBACK_FROM) {
        console.warn(`[Graph] Enviar como ${fromAddress} negado — usando ${FALLBACK_FROM}`);
        fromAddress = FALLBACK_FROM;
        payload.message.from = { emailAddress: { address: FALLBACK_FROM, name: FROM_NAME } };
        attempt--;
        continue;
      }

      // Token stale/invalido -> limpa cache e tenta de novo na hora.
      if (status === 401 && attempt < MAX_ATTEMPTS) {
        cachedToken = null;
        tokenExpiresAt = 0;
        console.warn(`[Graph] sendMail 401 (attempt ${attempt}) — refazendo token`);
        continue;
      }

      const unavailable = status === 429 || status >= 500;

      // Throttling / indisponibilidade transitoria -> backoff curto (só sem reserva).
      if (!fastFail && (status === 429 || status === 503) && attempt < MAX_ATTEMPTS) {
        const retryAfterSec = Number(res.headers.get('retry-after')) || 0;
        const waitMs = retryAfterSec > 0 && retryAfterSec <= 2
          ? retryAfterSec * 1000
          : Math.min(500 * attempt, 1500);
        console.warn(`[Graph] sendMail ${status} (attempt ${attempt}) — retry em ${waitMs}ms`);
        await sleep(waitMs);
        continue;
      }

      console.error('[Graph] sendMail error:', status, errText);
      return unavailable ? 'down' : 'rejected';
    } catch (e) {
      if (!fastFail && attempt < MAX_ATTEMPTS) {
        await sleep(Math.min(500 * attempt, 1500));
        continue;
      }
      console.error('[Graph] sendEmail exception:', e);
      return 'down';
    }
  }
  return 'down';
}

// ── Reserva ───────────────────────────────────────────────────────────────────

let fallbackClient: import('resend').Resend | null = null;

async function sendViaFallback(opts: SendEmailOptions, reason: string): Promise<boolean> {
  try {
    if (!fallbackClient) {
      const { Resend } = await import('resend');
      fallbackClient = new Resend(process.env.RESEND_API_KEY);
    }
    const { error } = await fallbackClient.emails.send({
      from: `${FROM_NAME} <${SENDER_EMAIL}>`,
      to: opts.to,
      replyTo: REPLY_TO,
      subject: opts.subject,
      html: opts.html,
      ...(opts.text ? { text: opts.text } : {}),
    });
    if (error) {
      console.error(`[EmailReserva] erro ao enviar para ${opts.to}:`, error.name, error.message);
      return false;
    }
    console.warn(`[EmailReserva] Email enviado pelo reserva (${reason}) para ${opts.to} — "${opts.subject}"`);
    await alertFallbackInUse(reason);
    return true;
  } catch (e) {
    console.error('[EmailReserva] exception:', e);
    return false;
  }
}

// Avisa a administração (push do /admin, não depende de e-mail) no máximo 1 vez por hora.
let lastFallbackAlertAt = 0;
async function alertFallbackInUse(reason: string): Promise<void> {
  if (Date.now() - lastFallbackAlertAt < 60 * 60_000) return;
  lastFallbackAlertAt = Date.now();
  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase-admin');
    const supabase = getSupabaseAdmin();
    const { count } = await supabase.from('ops_alerts').select('id', { count: 'exact', head: true })
      .eq('kind', 'email_fallback').gte('created_at', new Date(Date.now() - 60 * 60_000).toISOString());
    if ((count ?? 0) > 0) return;
    const message = `O envio de e-mail da Microsoft falhou (${reason}). E-mails essenciais (login, senha, boas-vindas, compra) estão saindo pelo serviço reserva; campanhas esperam a Microsoft voltar.`;
    await supabase.from('ops_alerts').insert({ kind: 'email_fallback', message, sent_email: false, sent_whatsapp: false } as never);
    const { notifyAdmins } = await import('@/lib/admin-push');
    await notifyAdmins({ title: 'E-mail no serviço reserva', body: message, url: '/admin', tag: 'email_fallback', category: 'emails' });
  } catch (e) {
    console.error('[EmailReserva] alerta falhou:', e);
  }
}

// ── Leitura de bounces (NDRs) das caixas de envio e do suporte ────────────────
// Le mensagens recentes de "postmaster/Microsoft Exchange" (falha de entrega) e
// devolve todos os emails achados no corpo. Requer permissao Mail.Read no app.
export async function listBounceRecipients(sinceIso: string): Promise<{ scanned: number; emails: string[] }> {
  const token = await getAccessToken();
  const msgs: any[] = [];
  for (const box of [...new Set([SENDER_EMAIL, INBOX_EMAIL])]) {
    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(box)}/messages`
      + `?$select=subject,from,receivedDateTime,body&$top=200`
      + `&$filter=${encodeURIComponent(`receivedDateTime ge ${sinceIso}`)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Graph read ${box} ${res.status}: ${await res.text()}`);
    msgs.push(...((await res.json()).value ?? []));
  }
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
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(INBOX_EMAIL)}/messages`
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
