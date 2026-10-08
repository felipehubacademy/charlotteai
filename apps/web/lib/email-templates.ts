// lib/email-templates.ts
// Templates HTML dos e-mails do Queizy (visual em lib/email-brand.ts).

import { base, h1, p, meta, btn, note, features, SMART_LINK } from '@/lib/email-brand';

// ── 1. Convite institucional ───────────────────────────────────────────────────

export function inviteTemplate(opts: {
  name: string;
  email: string;
  tempPassword: string;
}) {
  const subject = `Seu acesso ao Queizy est\u00e1 pronto`;
  const html = base(`
    ${h1(`Ol&aacute;, ${opts.name}.`)}
    ${p(`A equipe criou seu acesso ao Queizy.<br>Voc&ecirc; j&aacute; pode entrar e come&ccedil;ar a praticar ingl&ecirc;s com a Charlotte, sua tutora.`)}
    ${meta([
      { label: 'Email', value: opts.email },
      { label: 'Senha tempor&aacute;ria', value: `<code style="font-family:monospace;background:#f5f5f7;padding:2px 8px;border-radius:4px;">${opts.tempPassword}</code>` },
    ])}
    ${p(`No primeiro acesso voc&ecirc; ser&aacute; solicitado<br>a criar uma nova senha.`)}
    ${btn('Entrar no Queizy', SMART_LINK)}
    ${note(`D&uacute;vidas? Responda este e-mail ou escreva para contato@queizy.com.`)}
  `);
  return { subject, html };
}

// ── 2. Boas-vindas subscriber ──────────────────────────────────────────────────

export function welcomeSubscriberTemplate(opts: {
  name: string;
  level: string;
  trialEndsAt: string;
}) {
  const subject = `Bem-vindo ao Queizy, ${opts.name}`;
  const html = base(`
    ${h1(`Bem-vindo, ${opts.name}.`)}
    ${p(`Seu teste gratuito est&aacute; ativo.<br>Voc&ecirc; tem <strong style="color:#16131F;">7 dias de acesso completo</strong> para praticar ingl&ecirc;s.`)}
    ${meta([
      { label: 'N&iacute;vel', value: opts.level },
      { label: 'Acesso gratuito at&eacute;', value: opts.trialEndsAt },
    ])}
    ${btn('Come&ccedil;ar agora', SMART_LINK)}
    ${note(`Converse com a Charlotte, fa&ccedil;a li&ccedil;&otilde;es<br>e acompanhe seu progresso.`)}
  `);
  return { subject, html };
}

// ── 3. Redefinicao de senha ────────────────────────────────────────────────────

export function resetPasswordTemplate(opts: {
  name: string;
  resetUrl: string;
}) {
  const subject = `Redefini\u00e7\u00e3o de senha \u2014 Queizy`;
  const html = base(`
    ${h1(`Redefini&ccedil;&atilde;o<br>de senha`)}
    ${p(`Ol&aacute;, ${opts.name}. Recebemos uma solicita&ccedil;&atilde;o para<br>redefinir a senha da sua conta Queizy.`)}
    ${btn('Criar nova senha', opts.resetUrl)}
    ${note(`Este link expira em <strong>1 hora</strong>.<br>Se voc&ecirc; n&atilde;o solicitou, ignore este email &mdash; sua senha permanece a mesma.`)}
  `);
  return { subject, html };
}

// ── 4. Trial expirando ─────────────────────────────────────────────────────────

export function trialExpiringTemplate(opts: {
  name: string;
  expiresAt: string;
}) {
  const subject = `Seu acesso gratuito expira em 2 dias`;
  const html = base(`
    ${h1(`Seu per&iacute;odo gratuito<br>est&aacute; acabando.`)}
    ${p(`Ol&aacute;, ${opts.name}. Seu acesso gratuito expira em <strong style="color:#16131F;">${opts.expiresAt}</strong>.<br>Assine agora para continuar praticando.`)}
    ${btn('Assinar o Queizy', SMART_LINK)}
    ${note(`D&uacute;vidas? Responda este e-mail ou escreva para contato@queizy.com.`)}
  `);
  return { subject, html };
}

// ── 5. Assinatura encerrada ────────────────────────────────────────────────────

export function subscriptionExpiredTemplate(opts: {
  name: string;
}) {
  const subject = `Sua assinatura do Queizy foi encerrada`;
  const html = base(`
    ${h1(`Sentimos sua falta,<br>${opts.name}.`)}
    ${p(`Sua assinatura foi encerrada e o acesso ao app foi suspenso.<br>Seu hist&oacute;rico de progresso fica salvo.`)}
    ${btn('Reativar acesso', SMART_LINK)}
    ${note(`A Charlotte est&aacute; aqui quando voc&ecirc; quiser voltar.`)}
  `);
  return { subject, html };
}

// ── Helpers extras: lista de novidades + badges das lojas ──────────────────────

function storeBadges(appStoreUrl: string, playUrl: string): string {
  // Badges recortados justos (mesma altura visual); larguras proporcionais.
  const APP  = 'https://queizy.com/images/store-badges/app-store-badge.png';
  const PLAY = 'https://queizy.com/images/store-badges/google-play-badge.png';
  return `<table cellpadding="0" cellspacing="0" style="margin:32px auto 0;"><tr>
    <td style="padding:0 5px;" valign="middle">
      <a href="${appStoreUrl}"><img src="${APP}" alt="Baixar na App Store" width="132" height="44" style="display:block;border:0;height:44px;width:132px;" /></a>
    </td>
    <td style="padding:0 5px;" valign="middle">
      <a href="${playUrl}"><img src="${PLAY}" alt="Dispon&iacute;vel no Google Play" width="148" height="44" style="display:block;border:0;height:44px;width:148px;" /></a>
    </td>
  </tr></table>`;
}

// ── 6. Nova versão disponível (release update) ─────────────────────────────────

export function releaseUpdateTemplate(opts: { name?: string | null; unsubscribeUrl?: string }) {
  const appStore  = 'https://apps.apple.com/app/id6760943273';
  const playStore = 'https://play.google.com/store/apps/details?id=com.hubacademy.charlotte';
  const ola = opts.name ? `Olá, ${opts.name}!` : 'Olá!';
  const subject = 'A Charlotte agora é Queizy';
  const unsubscribe = opts.unsubscribeUrl
    ? `<p style="margin:12px 0 0;font-size:12px;color:#8A8494;line-height:1.7;">Não quer mais receber novidades? <a href="${opts.unsubscribeUrl}" style="color:#8A8494;text-decoration:underline;">Descadastrar</a>.</p>`
    : '';
  const html = base(`
    ${h1('Do queizy ao crazy.')}
    ${p(`${ola}<br>O app que você usa para praticar inglês mudou de nome: agora ele se chama <strong style="color:#16131F;">Queizy</strong>. A Charlotte continua lá, como sua tutora.`)}
    ${features([
      '<strong style="color:#16131F;">Cara nova</strong>, mais leve e direta, do início ao fim',
      'Seu <strong style="color:#16131F;">histórico de correções</strong> e a evolução da sua pronúncia, para ver o quanto você já avançou',
      'Conversas com <strong style="color:#16131F;">título</strong>, para retomar de onde parou',
      'Metas, conquistas e ranking reunidos na tela de progresso',
      'Sua conta, seu progresso e sua assinatura continuam iguais',
    ])}
    ${p('Atualize o app para ver tudo isso.')}
    ${storeBadges(appStore, playStore)}
  `, unsubscribe);
  return { subject, html };
}
