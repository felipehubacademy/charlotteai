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

// ── 6b2. Atualize o app (campanha: quem ainda não está na versão mais recente das lojas) ──────

export function appUpdateTemplate(opts: { name?: string | null; unsubscribeUrl?: string }) {
  const appStore  = 'https://apps.apple.com/app/id6760943273';
  const playStore = 'https://play.google.com/store/apps/details?id=com.hubacademy.charlotte';
  const first = (opts.name ?? '').trim().split(/\s+/)[0];
  const ola = first ? `Olá, ${first}!` : 'Olá!';
  const subject = 'Tem versão nova do Queizy nas lojas';
  const unsubscribe = opts.unsubscribeUrl
    ? `<p style="margin:12px 0 0;font-size:12px;color:#8A8494;line-height:1.7;">Não quer mais receber novidades? <a href="${opts.unsubscribeUrl}" style="color:#8A8494;text-decoration:underline;">Descadastrar</a>.</p>`
    : '';
  const html = base(`
    ${h1('Atualize o seu Queizy.')}
    ${p(`${ola}<br>Saiu uma versão nova do app na App Store e na Google Play, com correções e melhorias de estabilidade. O seu aparelho ainda está com uma versão anterior.`)}
    ${p('Atualize pela loja para tudo funcionar direitinho. Sua conta, seu progresso e sua assinatura continuam iguais.')}
    ${storeBadges(appStore, playStore)}
    ${p('Já atualizou? Então está tudo certo, pode ignorar este e-mail.')}
  `, unsubscribe);
  return { subject, html };
}

// ── 6b. Campanha de volta (degustação que parou no 1º dia): "O que te fez parar?" ───────
// Cada opção é um link de 1 toque (lib/winback.ts) que grava a resposta e credita 5 min de ligação.
export function winbackTemplate(opts: { name?: string | null; unsubscribeUrl?: string; answerUrls?: { label: string; url: string }[] }) {
  const first = (opts.name ?? '').trim().split(/\s+/)[0];
  const ola = first ? `Oi, ${first}!` : 'Oi!';
  const subject = 'Seu tópico grátis de hoje já está liberado';
  const unsubscribe = opts.unsubscribeUrl
    ? `<p style="margin:12px 0 0;font-size:12px;color:#8A8494;line-height:1.7;">Não quer mais receber novidades? <a href="${opts.unsubscribeUrl}" style="color:#8A8494;text-decoration:underline;">Descadastrar</a>.</p>`
    : '';
  const options = (opts.answerUrls ?? []).map(o =>
    `<tr><td style="padding:0 0 8px;"><a href="${o.url}" style="display:block;background:#F4F1EA;border:1px solid #E8E4DA;border-radius:14px;padding:13px 16px;font-size:15px;font-weight:700;color:#16131F;-webkit-text-fill-color:#16131F;text-decoration:none;text-align:left;">${o.label}</a></td></tr>`).join('');
  const html = base(`
    ${h1('Tem tópico novo te esperando.')}
    ${p(`${ola}<br>Mudamos a degustação do Queizy: agora são <strong style="color:#16131F;">5 dias com 1 tópico novo grátis por dia</strong>. O seu de hoje já está liberado na trilha.`)}
    ${btn('Fazer o tópico de hoje', SMART_LINK)}
    ${p('<strong style="color:#16131F;">Uma pergunta rápida:</strong> o que te fez parar depois do primeiro dia? Toque em uma opção e ganhe <strong style="color:#16131F;">5 minutos de ligação por voz</strong> para treinar a conversa.')}
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:400px;margin:8px auto 0;">${options}</table>
    ${note('Sua resposta ajuda a gente a deixar o Queizy melhor para você.')}
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

// ── Avisos da assinatura pelo site (tudo com a marca Queizy; o processador não manda nada ao aluno) ──

const PLAN_NAME = (plan: 'monthly' | 'annual') => (plan === 'monthly' ? 'Plano Mensal' : 'Plano Anual');
const firstName = (name?: string | null) => (name ?? '').trim().split(/\s+/)[0];
const MANAGE_PATH = 'Perfil &gt; Assinatura &gt; Gerenciar assinatura';

/** 2 dias antes da 1ª cobrança do teste grátis. */
export function webTrialEndingTemplate(opts: { name?: string | null; plan: 'monthly' | 'annual'; chargeDate: string; trialEnd: string; value: string }) {
  const first = firstName(opts.name);
  const planName = PLAN_NAME(opts.plan);
  const subject = `Seu teste grátis do Queizy termina em ${opts.trialEnd}`;
  const html = base(`
    ${h1(first ? `${first}, seu teste grátis está acabando` : 'Seu teste grátis está acabando')}
    ${p(`Seus dias grátis do ${planName} vão até <strong style="color:#16131F;">${opts.trialEnd}</strong>. Em ${opts.chargeDate}, a assinatura começa e fazemos a primeira cobrança no cartão.`)}
    ${meta([
      { label: 'Plano', value: planName },
      { label: 'Primeira cobrança', value: opts.chargeDate },
      { label: 'Valor', value: `${opts.value}${opts.plan === 'monthly' ? ' por mês' : ' por ano'}` },
    ])}
    ${p('Quer continuar estudando? Não precisa fazer nada.')}
    ${p(`Prefere não continuar? Cancele até ${opts.trialEnd} no app, em ${MANAGE_PATH} &gt; Cancelar assinatura, e nada será cobrado.`)}
    ${btn('Abrir o Queizy', SMART_LINK)}
    ${note('Dúvidas? É só responder este e-mail.')}
  `);
  return { subject, html };
}

/** Cobrança aprovada (1ª depois do teste grátis e renovações). */
export function webPaymentReceiptTemplate(opts: { name?: string | null; plan: 'monthly' | 'annual'; method: string | null; value: string; paidAt: string; nextCharge: string | null; accessUntil: string | null; refundUntil: string | null }) {
  const first = firstName(opts.name);
  const planName = PLAN_NAME(opts.plan);
  const pay = opts.method === 'annual_pix' ? 'Pix' : 'Cartão de crédito';
  const subject = `Recebemos o pagamento do seu ${planName}`;
  const rows = [
    { label: 'Plano', value: planName },
    { label: 'Valor', value: opts.value },
    { label: 'Pagamento', value: `${pay}, em ${opts.paidAt}` },
  ];
  if (opts.nextCharge) rows.push({ label: 'Próxima cobrança', value: opts.nextCharge });
  else if (opts.accessUntil) rows.push({ label: 'Acesso até', value: opts.accessUntil });
  const html = base(`
    ${h1(first ? `Tudo certo, ${first}!` : 'Pagamento confirmado')}
    ${p(`Recebemos o pagamento do seu ${planName}. Seu acesso ao Queizy continua liberado.`)}
    ${meta(rows)}
    ${opts.refundUntil ? note(`Mudou de ideia? Você pode pedir o reembolso até ${opts.refundUntil} no app, em ${MANAGE_PATH} &gt; Pedir reembolso.`) : ''}
    ${note('Dúvidas? É só responder este e-mail.')}
  `);
  return { subject, html };
}

/** Cobrança do cartão recusada (renovação ou 1ª depois do teste). */
export function webPaymentFailedTemplate(opts: { name?: string | null; plan: 'monthly' | 'annual'; value: string; accessUntil: string | null }) {
  const first = firstName(opts.name);
  const planName = PLAN_NAME(opts.plan);
  const subject = 'Não conseguimos cobrar a sua assinatura do Queizy';
  const html = base(`
    ${h1(first ? `${first}, a cobrança não passou` : 'A cobrança não passou')}
    ${p(`Tentamos cobrar ${opts.value} do seu ${planName}, mas o cartão recusou. Isso costuma acontecer por falta de limite, cartão vencido ou bloqueio do banco.`)}
    ${p(`Confira o cartão com o seu banco e responda este e-mail: a gente te ajuda a regularizar ou trocar o cartão.${opts.accessUntil ? ` Seu acesso continua até ${opts.accessUntil}.` : ''}`)}
    ${btn('Falar com o suporte', 'mailto:suporte@queizy.com?subject=Cobran%C3%A7a%20da%20assinatura')}
    ${note('Se preferir, assine de novo em queizy.com/assinar com o mesmo e-mail: o acesso continua na mesma conta.')}
  `);
  return { subject, html };
}

/** Assinatura cancelada (pelo app ou pelo suporte). */
export function webCancelledTemplate(opts: { name?: string | null; plan: 'monthly' | 'annual'; inTrial: boolean; accessUntil: string | null }) {
  const first = firstName(opts.name);
  const planName = PLAN_NAME(opts.plan);
  const subject = 'Sua assinatura do Queizy foi cancelada';
  const status = opts.inTrial
    ? `Você estava no teste grátis e nada foi cobrado. Nada será cobrado daqui para a frente.${opts.accessUntil ? ` Você continua usando o Queizy até ${opts.accessUntil}.` : ''}`
    : `Não haverá novas cobranças.${opts.accessUntil ? ` Seu acesso continua até ${opts.accessUntil}.` : ''}`;
  const html = base(`
    ${h1(first ? `${first}, sua assinatura foi cancelada` : 'Sua assinatura foi cancelada')}
    ${p(`Confirmamos o cancelamento do seu ${planName}. ${status}`)}
    ${p('Sentiremos sua falta. Se quiser voltar, é só assinar de novo com o mesmo e-mail: seu progresso continua salvo.')}
    ${btn('Assinar de novo', 'https://queizy.com/assinar')}
    ${note('Não foi você que cancelou? Responda este e-mail.')}
  `);
  return { subject, html };
}

/** Reembolso feito (ou pedido registrado, quando o processador não devolveu na hora). */
export function webRefundTemplate(opts: { name?: string | null; plan: 'monthly' | 'annual'; method: string | null; value: string; queued: boolean }) {
  const first = firstName(opts.name);
  const planName = PLAN_NAME(opts.plan);
  const isPix = opts.method === 'annual_pix';
  const subject = opts.queued ? 'Recebemos seu pedido de reembolso' : 'Seu reembolso foi feito';
  const how = isPix
    ? 'O valor volta para a mesma conta do Pix em instantes.'
    : 'O estorno aparece na fatura do cartão em até duas faturas, conforme o seu banco.';
  const html = base(`
    ${h1(opts.queued ? (first ? `${first}, recebemos seu pedido` : 'Recebemos seu pedido') : (first ? `${first}, seu reembolso foi feito` : 'Seu reembolso foi feito'))}
    ${p(opts.queued
      ? `Registramos o pedido de reembolso do seu ${planName}. Devolvemos o valor em até 2 dias úteis e avisamos por e-mail quando sair.`
      : `Devolvemos o pagamento do seu ${planName}. ${how}`)}
    ${meta([
      { label: 'Plano', value: planName },
      { label: 'Valor', value: opts.value },
      { label: 'Forma', value: isPix ? 'Pix' : 'Cartão de crédito' },
    ])}
    ${p(opts.queued ? 'Enquanto isso, seu acesso continua.' : 'Seu acesso ao Queizy foi encerrado e não haverá novas cobranças. Seu progresso continua salvo, se quiser voltar.')}
    ${opts.queued ? '' : btn('Assinar de novo', 'https://queizy.com/assinar')}
    ${note('Dúvidas? É só responder este e-mail.')}
  `);
  return { subject, html };
}

/** Ajuda de acesso: aluno que assinou pelo site e não conseguiu entrar (ex.: link de senha que falhou do nosso lado).
 *  Tom de acompanhamento pessoal, com o passo a passo. `when` = "ontem" / "hoje" / "no dia 21/10". */
export function accessHelpTemplate(opts: { name?: string | null; email: string; when: string; passwordUrl: string }) {
  const first = firstName(opts.name);
  const subject = first ? `${first}, vimos que você ainda não conseguiu entrar no Queizy` : 'Vimos que você ainda não conseguiu entrar no Queizy';
  const steps = [
    'Toque no botão <strong style="color:#16131F;">Criar minha senha</strong>, aqui embaixo. Vai abrir uma página do Queizy: digite a senha que quiser duas vezes e toque em "Salvar senha".',
    'Se ainda não tiver o app, baixe o Queizy na App Store ou no Google Play.',
    `Abra o app, toque em "Entrar" e use este e-mail (<strong style="color:#16131F;">${opts.email}</strong>) com a senha que você acabou de criar.`,
  ].map((s, i) => `<li style="margin:0 0 12px;padding-left:4px;"><strong style="color:#16131F;">${i + 1}.</strong> ${s}</li>`).join('');
  const html = base(`
    ${h1(first ? `Oi, ${first}!` : 'Oi!')}
    ${p(`Aqui é a equipe do Queizy. Estamos acompanhando de perto quem acabou de chegar e notamos que você assinou ${opts.when}, mas ainda não conseguiu entrar no app.`)}
    ${p('Descobrimos que o link de criar a senha não funcionava bem em alguns celulares e computadores, então o problema muito provavelmente foi do nosso lado. Já corrigimos, e pedimos desculpas pelo transtorno.')}
    ${p('Para entrar, são só 3 passos:')}
    <ul style="margin:8px auto 8px;padding:0;max-width:420px;font-size:15px;color:#3A3546;line-height:1.55;text-align:left;list-style:none;">${steps}</ul>
    ${btn('Criar minha senha', opts.passwordUrl)}
    ${storeBadges()}
    ${note('Se travar em qualquer passo, é só responder este e-mail que a gente te ajuda na hora.<br>Um abraço, Equipe Queizy')}
  `);
  return { subject, html };
}

/** Convite para a gestão (/admin): papel, o que a pessoa acessa e o link para criar a senha. */
export function adminInviteTemplate(opts: { name?: string | null; email: string; roleLabel: string; roleDesc: string; areas: string[]; passwordUrl: string }) {
  const first = firstName(opts.name);
  const subject = `${first ? `${first}, você` : 'Você'} recebeu acesso à gestão do Queizy`;
  const html = base(`
    ${h1(first ? `Oi, ${first}!` : 'Oi!')}
    ${p(`Você recebeu acesso à gestão do Queizy como <strong style="color:#16131F;">${opts.roleLabel}</strong>. ${opts.roleDesc}`)}
    ${p('O que você vai poder fazer:')}
    ${features(opts.areas)}
    ${p(`Para entrar, crie a sua senha no botão abaixo e depois acesse <strong style="color:#16131F;">queizy.com/admin</strong> com este e-mail (<strong style="color:#16131F;">${opts.email}</strong>) e a senha que criou.`)}
    ${btn('Criar minha senha', opts.passwordUrl)}
    ${note('O link vale por pouco tempo. Se ele expirar, a própria página deixa pedir um novo.<br>Se você já tem senha no Queizy, pode ignorar o botão e entrar direto em queizy.com/admin.')}
  `);
  return { subject, html };
}

/** Aviso para quem convidou: a pessoa aceitou o convite (primeiro acesso à gestão). */
export function adminAcceptedTemplate(opts: { inviterName?: string | null; memberName?: string | null; memberEmail: string; roleLabel: string }) {
  const first = firstName(opts.inviterName);
  const who = opts.memberName?.trim() || opts.memberEmail;
  const subject = `${who} aceitou o convite para a gestão do Queizy`;
  const html = base(`
    ${h1(first ? `Oi, ${first}!` : 'Oi!')}
    ${p(`<strong style="color:#16131F;">${who}</strong> (${opts.memberEmail}) aceitou o seu convite e acabou de entrar na gestão do Queizy como <strong style="color:#16131F;">${opts.roleLabel}</strong>.`)}
    ${btn('Ver a equipe', 'https://queizy.com/admin/team')}
    ${note('Para mudar o nível de acesso ou desativar a pessoa, use a tela Equipe no /admin.')}
  `);
  return { subject, html };
}

// ── Teste antigo (sem cartão) terminou: passa para a degustação ───────────────

export function legacyTrialEndedTemplate(opts: { name?: string | null; activities: number; xp: number }) {
  const first = (opts.name ?? '').trim().split(/\s+/)[0];
  const subject = 'Seu teste terminou, mas você ainda tem 7 dias grátis';
  const did = opts.activities > 0
    ? `Nos últimos dias você concluiu <strong style="color:#16131F;">${opts.activities} ${opts.activities === 1 ? 'atividade' : 'atividades'}</strong> e ganhou <strong style="color:#16131F;">${opts.xp.toLocaleString('pt-BR')} XP</strong>.`
    : 'Seu teste de 7 dias terminou.';
  const html = base(`
    ${h1(`${first ? `${first}, seu` : 'Seu'} teste terminou.<br>Mas ainda tem mais.`)}
    ${p(`${did} Na loja do seu celular você ainda tem <strong style="color:#16131F;">7 dias grátis</strong> para seguir com tudo: a trilha inteira, a conversa com a Charlotte e as ligações. Se cancelar antes do fim dos 7 dias, não paga nada.`)}
    ${btn('Começar os 7 dias grátis', SMART_LINK)}
    ${p(`Prefere ir com calma? Você continua na degustação: um tópico novo da trilha por dia, por 5 dias.`)}
    ${note('Dúvidas? Responda este e-mail ou escreva para contato@queizy.com.')}
  `);
  return { subject, html };
}
