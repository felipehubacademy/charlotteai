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

export function storeBadges(appStoreUrl = 'https://apps.apple.com/app/id6760943273', playUrl = 'https://play.google.com/store/apps/details?id=com.hubacademy.charlotte'): string {
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
  const first = (opts.name ?? '').trim().split(/\s+/)[0];
  const ola = first ? `Olá, ${first}!` : 'Olá!';
  // Para quem já usava o app como Charlotte: aqui faz sentido contar a mudança de nome.
  const subject = 'A Charlotte agora é Queizy';
  const unsubscribe = opts.unsubscribeUrl
    ? `<p style="margin:12px 0 0;font-size:12px;color:#8A8494;line-height:1.7;">Não quer mais receber novidades? <a href="${opts.unsubscribeUrl}" style="color:#8A8494;text-decoration:underline;">Descadastrar</a>.</p>`
    : '';
  const html = base(`
    ${h1('Do queizy ao crazy.')}
    ${p(`${ola}<br>O app em que você pratica inglês agora se chama <strong style="color:#16131F;">Queizy</strong>, com cara nova e muita novidade. A Charlotte continua lá, como sua tutora.`)}
    ${features([
      '<strong style="color:#16131F;">Trilha nova</strong>, do seu nível: Gramática, Listening &amp; Speaking, Role-play e Guided Chat em cada tópico',
      '<strong style="color:#16131F;">Correção no fim de cada conversa</strong>, com o jeito certo de falar e o porquê',
      '<strong style="color:#16131F;">Estude junto</strong>: ache amigos pelo nome ou @, cutuque e disputem competições',
      '<strong style="color:#16131F;">Minha evolução</strong>: o que você já domina, o que vale treinar e um resumo da Charlotte toda semana',
      'Sua conta, seu progresso e sua assinatura continuam iguais',
    ])}
    ${p('Atualize o app pela loja para ver tudo isso.')}
    ${storeBadges(appStore, playStore)}
  `, unsubscribe);
  return { subject, html };
}

// ── 6b. A Família Queizy cresceu (campanha: chegada do Igorfina e do Manual do F#did@) ──────

export function familyGrowsTemplate(opts: { name?: string | null; unsubscribeUrl?: string }) {
  const appStore  = 'https://apps.apple.com/app/id6760943273';
  const playStore = 'https://play.google.com/store/apps/details?id=com.hubacademy.charlotte';
  const first = (opts.name ?? '').trim().split(/\s+/)[0];
  const ola = first ? `Olá, ${first}!` : 'Olá!';
  const subject = 'A Família Queizy está crescendo';
  const unsubscribe = opts.unsubscribeUrl
    ? `<p style="margin:12px 0 0;font-size:12px;color:#8A8494;line-height:1.7;">Não quer mais receber novidades? <a href="${opts.unsubscribeUrl}" style="color:#8A8494;text-decoration:underline;">Descadastrar</a>.</p>`
    : '';
  const avatar = (src: string, alt: string) =>
    `<td style="padding:0 6px;" valign="middle"><img src="${src}" alt="${alt}" width="72" height="72" style="display:block;border:0;width:72px;height:72px;border-radius:36px;" /></td>`;
  const html = base(`
    <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;"><tr>
      ${avatar('https://queizy.com/images/charlotte-avatar.png', 'Charlotte')}
      ${avatar('https://queizy.com/images/igorfina-avatar.png', 'Igorfina')}
    </tr></table>
    ${h1('Chegou gente nova na Família.')}
    ${p(`${ola}<br>A Charlotte continua sua tutora, mas agora tem companhia: o <strong style="color:#16131F;">Igorfina</strong>, comediante e imitador, entrou para a Família Queizy. E ele chegou com uma trilha só dele.`)}
    ${features([
      '<strong style="color:#16131F;">Manual do F#did@</strong>: inglês de sobrevivência para o dia a dia e para viajar. São 10 módulos e 50 tópicos, cada um com Gramática, Listening &amp; Speaking, Role-play e Guided Chat',
      '<strong style="color:#16131F;">Imitações</strong>: em alguns tópicos ele vira o presidente exagerado ou o astro do basquete do começo ao fim',
      '<strong style="color:#16131F;">Converse com ele</strong> quando quiser: Practice &gt; Free Chat &gt; Conversar com',
      'Para abrir a trilha: Perfil &gt; Família Queizy &gt; Igorfina &gt; Ver trilha',
    ])}
    ${p('E a Família não para por aí: vem mais gente por aí. Abra o app e venha conhecer.')}
    ${storeBadges(appStore, playStore)}
  `, unsubscribe);
  return { subject, html };
}

// ── 6c. Carrinho abandonado (assinatura pelo site): 3 lembretes ──────────────────────

export function cartRecoveryTemplate(opts: {
  stage: 1 | 2 | 3; name?: string | null; plan: 'monthly' | 'annual'; trialDays: number;
  coupon?: { code: string; pct: number; firstOnly: boolean } | null; unsubscribeUrl?: string;
}) {
  const first = (opts.name ?? '').trim().split(/\s+/)[0];
  const ola = first ? `Oi, ${first}!` : 'Oi!';
  const plano = opts.plan === 'monthly' ? 'mensal' : 'anual';
  const url = `https://queizy.com/assinar?plano=${plano}&utm_source=email&utm_medium=carrinho&utm_campaign=etapa${opts.stage}${opts.stage === 3 && opts.coupon ? `&cupom=${encodeURIComponent(opts.coupon.code)}` : ''}`;
  const unsubscribe = opts.unsubscribeUrl
    ? `<p style="margin:12px 0 0;font-size:12px;color:#8A8494;line-height:1.7;">Não quer mais receber novidades? <a href="${opts.unsubscribeUrl}" style="color:#8A8494;text-decoration:underline;">Descadastrar</a>.</p>`
    : '';
  const trial = opts.trialDays > 0 ? `Começa com <strong style="color:#16131F;">${opts.trialDays} dias grátis</strong> e você cancela quando quiser.` : 'Você cancela quando quiser.';
  let subject: string; let body: string;
  if (opts.stage === 1) {
    subject = 'Faltou pouco para começar no Queizy';
    body = `${h1('Faltou pouco.')}
      ${p(`${ola}<br>Você começou a assinatura do Queizy, mas o pagamento não foi concluído. Se foi só uma pausa, dá para terminar em um minuto.`)}
      ${p(trial)}
      ${btn('Terminar minha assinatura', url)}
      ${note('Se teve algum problema no pagamento, é só responder este e-mail que a gente ajuda.')}`;
  } else if (opts.stage === 2) {
    subject = 'A Charlotte ainda está te esperando';
    body = `${h1('Seu inglês de verdade começa aqui.')}
      ${p(`${ola}<br>Ficou alguma dúvida? Olha o que vem na assinatura do Queizy:`)}
      ${features([
        '<strong style="color:#16131F;">Conversa de verdade</strong> com a Charlotte, por texto ou voz, com correção na hora',
        '<strong style="color:#16131F;">Trilha do seu nível</strong>: Gramática, Listening &amp; Speaking, Role-play e Guided Chat',
        '<strong style="color:#16131F;">Família Queizy</strong>: o Igorfina e a trilha dele, o Manual do F#did@',
        'No site, o Anual também sai no <strong style="color:#16131F;">Pix</strong>; e você cancela quando quiser',
      ])}
      ${btn('Quero começar', url)}`;
  } else {
    subject = opts.coupon ? `Um presente para você começar: ${opts.coupon.pct}% de desconto` : 'Última chamada para começar no Queizy';
    body = `${h1(opts.coupon ? `${opts.coupon.pct}% de desconto para você.` : 'Ainda dá tempo.')}
      ${p(`${ola}<br>${opts.coupon
        ? `Separamos um desconto para você começar: use o cupom <strong style="color:#16131F;">${opts.coupon.code}</strong> e ganhe ${opts.coupon.pct}% ${opts.coupon.firstOnly ? 'na primeira cobrança' : 'na assinatura'}. Ele já vai aplicado pelo botão abaixo.`
        : 'Esta é a última mensagem sobre a sua assinatura. Do queizy ao crazy: a gente vai junto até o seu inglês sair natural.'}`)}
      ${p(trial)}
      ${btn(opts.coupon ? 'Usar meu desconto' : 'Assinar agora', url)}`;
  }
  return { subject, html: base(body, unsubscribe) };
}

// ── 7. Assinatura pelo site (Asaas) ativa ──────────────────────────────────────

export function webSubscriptionWelcomeTemplate(opts: {
  name?: string | null;
  email: string;
  plan: 'monthly' | 'annual';
  trialDays: number;
  passwordUrl: string;
}) {
  const first = (opts.name ?? '').trim().split(/\s+/)[0];
  const planName = opts.plan === 'monthly' ? 'Plano Mensal' : 'Plano Anual';
  const subject = first ? `${first}, bem-vindo à Família Queizy` : 'Bem-vindo à Família Queizy';
  const status = opts.trialDays > 0
    ? `Seus <strong style="color:#16131F;">${opts.trialDays} dias grátis</strong> do ${planName} começaram. A primeira cobrança no cartão é só no ${opts.trialDays + 1}º dia; se cancelar antes, não paga nada.`
    : `Seu <strong style="color:#16131F;">${planName}</strong> está ativo.`;
  const refund = opts.trialDays > 0
    ? ''
    : note('Não gostou? Em até 7 dias, peça o reembolso no app (Perfil &gt; Assinatura &gt; Gerenciar assinatura &gt; Pedir reembolso) ou respondendo este e-mail.');
  const html = base(`
    ${h1(first ? `Bem-vindo à Família Queizy, ${first}!` : 'Bem-vindo à Família Queizy!')}
    ${p('Agora é com você: conversa de verdade, correção na hora e zero vergonha de errar. A Charlotte já está te esperando.')}
    ${p(status)}
    ${meta([
      { label: 'Plano', value: planName },
      { label: 'Entre no app com', value: opts.email },
    ])}
    ${p('Ainda não tem senha? Crie agora e entre no app com este e-mail.')}
    ${btn('Criar minha senha', opts.passwordUrl)}
    ${storeBadges()}
    ${refund}
    ${note('Dúvidas? É só responder este e-mail.')}
  `);
  return { subject, html };
}
