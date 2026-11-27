// lib/html-escape.ts — texto do usuário (nome, @, motivo, contexto) dentro de HTML de e-mail.
// Sem isso, um nome como <a href=...> virava link no e-mail enviado pelo Queizy.
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
