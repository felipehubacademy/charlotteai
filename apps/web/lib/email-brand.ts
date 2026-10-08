// lib/email-brand.ts
// Peças visuais dos e-mails do Queizy: logo no topo, fundo papel, botão Volt
// com texto Tinta. Usado pelos e-mails de conta (Supabase), de ciclo de vida
// e de campanha. Charlotte aparece só como a tutora, nunca como o produto.

export const SITE = 'https://queizy.com';
export const LOGO_URL = `${SITE}/images/queizy-logo.png`;
export const SMART_LINK = 'https://queizy.com/open?mode=invite';

const INK = '#16131F';
const MID = '#4D4858';
const LIGHT = '#8A8494';
const PAPER = '#FAF7F0';
const VOLT = '#DCFF4A';

export function base(content: string, footerExtra = ''): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
</head>
<body style="margin:0;padding:0;background:${PAPER};font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;color:${INK};-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="${PAPER}" style="background:${PAPER};">
    <tr><td align="center" style="padding:40px 20px 56px;">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
        <tr>
          <td align="center" style="padding-bottom:28px;">
            <img src="${LOGO_URL}" height="32" alt="Queizy" style="display:block;height:32px;border:0;" />
          </td>
        </tr>
        <tr>
          <td bgcolor="#FFFFFF" style="background:#FFFFFF;border-radius:24px;padding:36px 28px;">${content}</td>
        </tr>
        <tr>
          <td align="center" style="padding-top:24px;">
            <p style="margin:0;font-size:12px;color:${LIGHT};line-height:1.7;">
              Queizy &mdash; Do queizy ao crazy.<br>
              Hub Academy Ltda &middot; <a href="mailto:contato@queizy.com" style="color:${LIGHT};">contato@queizy.com</a>
            </p>
            ${footerExtra}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function h1(text: string): string {
  return `<p style="margin:0 0 16px;font-size:28px;font-weight:800;color:${INK};line-height:1.15;text-align:center;letter-spacing:-0.5px;">${text}</p>`;
}

export function p(text: string, centered = true): string {
  return `<p style="margin:0 0 16px;font-size:16px;color:${MID};line-height:1.6;text-align:${centered ? 'center' : 'left'};">${text}</p>`;
}

export function meta(rows: { label: string; value: string }[]): string {
  const rowsHtml = rows.map(r =>
    `<tr>
      <td style="padding:12px 0;font-size:14px;color:${LIGHT};border-bottom:1px solid #F0EDE6;width:150px;">${r.label}</td>
      <td style="padding:12px 0;font-size:14px;color:${INK};border-bottom:1px solid #F0EDE6;font-weight:600;">${r.value}</td>
    </tr>`).join('');
  return `<table cellpadding="0" cellspacing="0" style="width:100%;margin:24px 0;">${rowsHtml}</table>`;
}

export function btn(text: string, url: string): string {
  // bgcolor + -webkit-text-fill-color evitam que o modo escuro do Gmail
  // inverta as cores do botão.
  return `<table cellpadding="0" cellspacing="0" style="margin:28px auto 0;text-align:center;">
    <tr>
      <td align="center" bgcolor="${VOLT}" style="background:${VOLT};border-radius:980px;">
        <a href="${url}" style="display:inline-block;padding:15px 34px;font-size:15px;font-weight:800;color:${INK};-webkit-text-fill-color:${INK};background-color:${VOLT};text-decoration:none;border-radius:980px;">${text}</a>
      </td>
    </tr>
  </table>`;
}

export function note(text: string): string {
  return `<p style="margin:24px 0 0;font-size:13px;color:${LIGHT};line-height:1.6;text-align:center;">${text}</p>`;
}

export function features(items: string[]): string {
  const lis = items.map(i => `<li style="margin:0 0 12px;padding-left:4px;">${i}</li>`).join('');
  return `<ul style="margin:20px auto;padding:0 0 0 22px;max-width:400px;font-size:15px;color:${MID};line-height:1.55;text-align:left;">${lis}</ul>`;
}
