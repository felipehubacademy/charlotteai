// lib/supabase-email-templates.ts
// E-mails de conta (confirmação, senha, link de acesso, troca de e-mail),
// enviados pelo Send Email Hook do Supabase via Microsoft Graph.
// Visual em lib/email-brand.ts.

import { base, h1, p, btn, note } from '@/lib/email-brand';

// Subject: Confirme seu email — Queizy
export const confirmSignup = base(`
  ${h1('Confirme seu email.')}
  ${p('Clique no bot&atilde;o abaixo para confirmar seu endere&ccedil;o de email e ativar sua conta no Queizy.')}
  ${btn('Confirmar email', '{{ .ConfirmationURL }}')}
  ${note('Se voc&ecirc; n&atilde;o criou uma conta no Queizy, ignore este email.')}
`);

// ── 2. Reset password ─────────────────────────────────────────────────────────
// Subject: Redefinição de senha — Queizy
export const resetPassword = base(`
  ${h1('Redefini&ccedil;&atilde;o<br>de senha.')}
  ${p('Recebemos uma solicita&ccedil;&atilde;o para redefinir a senha da sua conta Queizy.')}
  ${btn('Criar nova senha', '{{ .ConfirmationURL }}')}
  ${note('Este link expira em <strong>1 hora</strong>.<br>Se voc&ecirc; n&atilde;o solicitou, ignore este email &mdash; sua senha permanece a mesma.')}
`);

// ── 3. Magic link ─────────────────────────────────────────────────────────────
// Subject: Seu link de acesso — Queizy
export const magicLink = base(`
  ${h1('Seu link de acesso.')}
  ${p('Clique abaixo para entrar no Queizy.<br>O link expira em 1 hora.')}
  ${btn('Entrar no Queizy', '{{ .ConfirmationURL }}')}
  ${note('Se voc&ecirc; n&atilde;o solicitou este link, ignore este email.')}
`);

// ── 4. Email change ───────────────────────────────────────────────────────────
// Subject: Confirme seu novo email — Queizy
export const emailChange = base(`
  ${h1('Confirme seu novo email.')}
  ${p('Clique abaixo para confirmar a troca do seu endere&ccedil;o de email no Queizy.')}
  ${btn('Confirmar novo email', '{{ .ConfirmationURL }}')}
  ${note('Se voc&ecirc; n&atilde;o solicitou esta altera&ccedil;&atilde;o, entre em contato com a equipe Hub Academy imediatamente.')}
`);

// ── Export como strings prontas para colar no Supabase ────────────────────────
export const SUPABASE_TEMPLATES = {
  confirmSignup: {
    subject: 'Confirme seu email \u2014 Queizy',
    html: confirmSignup,
  },
  resetPassword: {
    subject: 'Redefini\u00e7\u00e3o de senha \u2014 Queizy',
    html: resetPassword,
  },
  magicLink: {
    subject: 'Seu link de acesso \u2014 Queizy',
    html: magicLink,
  },
  emailChange: {
    subject: 'Confirme seu novo email \u2014 Queizy',
    html: emailChange,
  },
};
