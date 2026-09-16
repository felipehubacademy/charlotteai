export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * app/api/cron/support-email/route.ts
 * Varredura (diária) da caixa de suporte: lê o que chegou em suporte@, roda o
 * agente e auto-responde (whitelist) ou escala pra um atendente. Idempotente
 * via graph_message_id. Auth por x-admin-secret (ou ?secret=).
 */
import { NextRequest, NextResponse } from 'next/server';
import { listInboxMessages, sendEmail as graphSendEmail, InboxMessage } from '@/lib/microsoft-graph-email-service';
import { runSupportAgent } from '@/lib/support-agent';
import {
  findUserContext, isMessageProcessed, upsertConversation, logMessage,
  setConversationStatus, escalate,
} from '@/lib/support-service';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? '';
const SUPPORT_ADDR = (process.env.SUPPORT_INBOX ?? 'suporte@hubacademybr.com').toLowerCase();
const SELF = 'charlotte@hubacademybr.com';

function checkAuth(req: NextRequest) {
  const auth = req.headers.get('x-admin-secret') ?? req.nextUrl.searchParams.get('secret') ?? '';
  return ADMIN_SECRET && auth === ADMIN_SECRET;
}

function isNoise(m: InboxMessage): boolean {
  const from = m.from;
  if (!from || from === SELF) return true;
  if (from.includes('postmaster') || from.includes('microsoftexchange')) return true;
  const subj = m.subject.toLowerCase();
  if (/out of office|automatic reply|resposta autom|ausência|aus[eê]ncia|f[ée]rias|vacation|não é possível entregar|nao e possivel entregar|undeliverable/.test(subj)) return true;
  // só o que foi endereçado ao suporte
  if (!m.to.includes(SUPPORT_ADDR)) return true;
  return false;
}

function replyHtml(text: string): string {
  const safe = text.replace(/</g, '&lt;').replace(/\n/g, '<br>');
  return `<div style="font-family:-apple-system,Arial,sans-serif;color:#1d1d1f;font-size:15px;line-height:1.6;">${safe}
    <p style="margin-top:20px;color:#86868b;font-size:12px;">Charlotte — Hub Academy Ltda</p></div>`;
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: any = {}; try { body = await req.json(); } catch {}
  const since: string = body?.since || new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  let msgs: InboxMessage[];
  try { msgs = await listInboxMessages(since, 100); }
  catch (e) { return NextResponse.json({ error: `Falha ao ler a caixa: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 }); }

  let processed = 0, autoResolved = 0, escalated = 0, skipped = 0;
  const details: any[] = [];

  for (const m of msgs) {
    if (isNoise(m)) { skipped++; continue; }
    if (await isMessageProcessed(m.id)) { skipped++; continue; }
    processed++;

    const context = await findUserContext(m.from);
    const convId = await upsertConversation({
      channel: 'email', externalId: m.conversationId || m.from, contact: m.from, subject: m.subject,
    });
    const userText = `${m.subject}\n\n${m.bodyText}`.trim().slice(0, 4000);
    await logMessage({ conversationId: convId, direction: 'in', author: 'user', body: userText, graphMessageId: m.id });

    const decision = await runSupportAgent({ userText, context });

    if (decision.autoSend) {
      await graphSendEmail({ to: m.from, subject: `Re: ${m.subject}`, html: replyHtml(decision.reply) });
      await logMessage({ conversationId: convId, direction: 'out', author: 'agent', body: decision.reply, intent: decision.intent, autoSent: true });
      await setConversationStatus(convId, 'auto_resolved');
      autoResolved++;
      details.push({ from: m.from, intent: decision.intent, action: 'auto' });
    } else {
      const holding = 'Olá! Recebemos sua mensagem e um de nossos atendentes vai te responder em breve. Obrigado pela paciência.';
      await graphSendEmail({ to: m.from, subject: `Re: ${m.subject}`, html: replyHtml(holding) });
      await logMessage({ conversationId: convId, direction: 'out', author: 'agent', body: holding, intent: decision.intent, autoSent: true });
      const r = await escalate({
        conversationId: convId, contact: m.from, channel: 'email', intent: decision.intent,
        userText, reason: decision.reason, userContext: context,
      });
      escalated++;
      details.push({ from: m.from, intent: decision.intent, action: 'escalate', assignedTo: r.assignedTo });
    }
  }

  return NextResponse.json({ ok: true, since, scanned: msgs.length, processed, autoResolved, escalated, skipped, details });
}
