// emailValidation — validação forte de e-mail no cliente (benchmark de signup):
// formato + correção de typo ("você quis dizer @gmail.com?") + bloqueio de
// domínio descartável. Pega a maioria dos e-mails inválidos NA ORIGEM, sem
// depender do usuário clicar num link de confirmação.

// Formato prático (não RFC-completo, mas cobre o mundo real sem falsos negativos).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmailFormat(email: string): boolean {
  const e = email.trim();
  if (!e || e.length > 254) return false;
  if (!EMAIL_RE.test(e)) return false;
  // sem pontos duplos, sem começar/terminar com ponto na parte local
  const [local, domain] = e.split('@');
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false;
  return true;
}

// Domínios populares (foco BR) pra correção de typo.
const POPULAR_DOMAINS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com',
  'live.com', 'msn.com', 'me.com', 'aol.com',
  'hotmail.com.br', 'outlook.com.br', 'yahoo.com.br', 'live.com.br',
  'bol.com.br', 'uol.com.br', 'terra.com.br', 'globo.com', 'ig.com.br',
  'protonmail.com', 'proton.me',
];

// TLD typos comuns -> correto.
const TLD_FIXES: Record<string, string> = {
  'con': 'com', 'cim': 'com', 'cinm': 'com', 'ocm': 'com', 'comm': 'com',
  'cmo': 'com', 'xom': 'com', 'vom': 'com', 'co': 'com', 'om': 'com', 'cm': 'com',
  'net.br': 'com.br', 'con.br': 'com.br', 'cm.br': 'com.br',
};

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'yopmail.com', 'guerrillamail.com', '10minutemail.com',
  'tempmail.com', 'temp-mail.org', 'throwawaymail.com', 'trashmail.com',
  'getnada.com', 'sharklasers.com', 'maildrop.cc', 'fakeinbox.com',
  'dispostable.com', 'mintemail.com', 'mailnesia.com', 'discard.email',
  'tempmailo.com', 'moakt.com', 'mohmal.com', 'emailondeck.com',
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1];
  return !!domain && DISPOSABLE_DOMAINS.has(domain);
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const prev = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,        // deleção
        prev[j - 1] + 1,    // inserção
        diag + (a[i - 1] === b[j - 1] ? 0 : 1), // substituição
      );
      diag = tmp;
    }
  }
  return prev[n];
}

/**
 * Sugere correção de typo no domínio. Retorna o e-mail corrigido, ou null se
 * já parece certo (ou se não há palpite bom). Ex.: "ana@gmial.com" -> "ana@gmail.com".
 */
export function suggestEmailCorrection(email: string): string | null {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf('@');
  if (at <= 0 || at === e.length - 1) return null;
  const local  = email.trim().slice(0, at); // preserva caixa do local
  let domain   = e.slice(at + 1);
  if (!domain.includes('.')) return null;

  // 1) Conserto de TLD (ex.: gmail.con -> gmail.com)
  const firstDot = domain.indexOf('.');
  const sld = domain.slice(0, firstDot);
  const tld = domain.slice(firstDot + 1);
  if (TLD_FIXES[tld]) domain = `${sld}.${TLD_FIXES[tld]}`;

  // Já é um domínio popular exato? nada a sugerir.
  if (POPULAR_DOMAINS.includes(domain)) {
    return domain === e.slice(at + 1) ? null : `${local}@${domain}`;
  }

  // 2) Domínio mais próximo por distância de edição.
  let best: string | null = null;
  let bestDist = Infinity;
  for (const cand of POPULAR_DOMAINS) {
    const d = levenshtein(domain, cand);
    if (d < bestDist) { bestDist = d; best = cand; }
  }
  // Limiar: aceita correção só se estiver perto (<=2) e o domínio não for já curto/diferente demais.
  if (best && bestDist > 0 && bestDist <= 2 && Math.abs(best.length - domain.length) <= 2) {
    return `${local}@${best}`;
  }

  // 3) Se só o TLD foi consertado, sugere isso.
  if (domain !== e.slice(at + 1)) return `${local}@${domain}`;

  return null;
}
