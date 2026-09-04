// E2E — teste unitario das regras de acesso (gating de assinatura).
//
// Espelha EXATAMENTE a logica de `hasAccess` em
// apps/mobile/components/auth/AuthProvider.tsx (bloco `const hasAccess`).
// Se a logica mudar la, atualizar aqui — este teste trava o contrato e
// pega regressoes (ex: o bug do status 'cancelled' que mostrava "Sem acesso").
//
// Uso: node apps/web/scripts/e2e/access-rules.test.mjs

// ── Porta da logica (mantida em sync com AuthProvider.tsx) ─────────
function hasAccess(profile, now = new Date()) {
  if (!profile) return false;
  if (profile.is_institutional) return true;
  const noSub = !profile.subscription_status || profile.subscription_status === 'none';
  if (noSub) return true;
  if (!profile.is_active) return false;
  if (profile.subscription_status === 'active' || profile.subscription_status === 'cancelled') {
    if (profile.subscription_expires_at && new Date(profile.subscription_expires_at) < now) return false;
    return true;
  }
  if (profile.subscription_status === 'trial') {
    if (!profile.trial_ends_at) return false;
    return new Date(profile.trial_ends_at) > now;
  }
  return false;
}

const NOW = new Date('2026-09-04T12:00:00Z');
const FUTURE = '2026-09-10T00:00:00Z';
const PAST = '2026-09-01T00:00:00Z';

// ── Cenarios: [nome, profile, esperado] ───────────────────────────
const CASES = [
  ['null profile → sem acesso', null, false],
  ['institucional (status irrelevante) → acesso', { is_institutional: true, subscription_status: 'expired', is_active: false }, true],
  ['novo usuario status none → grace', { subscription_status: 'none', is_active: false }, true],
  ['novo usuario status null → grace', { subscription_status: null, is_active: false }, true],
  ['active + is_active + expira no futuro → acesso', { subscription_status: 'active', is_active: true, subscription_expires_at: FUTURE }, true],
  ['active mas is_active=false → sem acesso', { subscription_status: 'active', is_active: false, subscription_expires_at: FUTURE }, false],
  ['active mas expires_at no passado → sem acesso (defesa local)', { subscription_status: 'active', is_active: true, subscription_expires_at: PAST }, false],
  ['cancelled + is_active + futuro → acesso (mantem ate expirar)', { subscription_status: 'cancelled', is_active: true, subscription_expires_at: FUTURE }, true],
  ['cancelled + expires no passado → sem acesso', { subscription_status: 'cancelled', is_active: true, subscription_expires_at: PAST }, false],
  ['cancelled sem expires_at → acesso (fallback lenient, webhook EXPIRATION fecha)', { subscription_status: 'cancelled', is_active: true, subscription_expires_at: null }, true],
  ['expired → sem acesso', { subscription_status: 'expired', is_active: false }, false],
  ['expired mas is_active=true (inconsistente) → sem acesso', { subscription_status: 'expired', is_active: true }, false],
  ['trial + trial_ends futuro → acesso', { subscription_status: 'trial', is_active: true, trial_ends_at: FUTURE }, true],
  ['trial + trial_ends passado → sem acesso', { subscription_status: 'trial', is_active: true, trial_ends_at: PAST }, false],
  ['trial sem trial_ends_at → sem acesso', { subscription_status: 'trial', is_active: true, trial_ends_at: null }, false],
  ['status desconhecido → sem acesso', { subscription_status: 'weird', is_active: true }, false],
];

let pass = 0, fail = 0;
console.log('# Access Rules — teste unitario de hasAccess\n');
for (const [name, profile, expected] of CASES) {
  const got = hasAccess(profile, NOW);
  const ok = got === expected;
  if (ok) pass++; else fail++;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}  → esperado ${expected}, obtido ${got}`);
}
console.log(`\n## Resumo: ${pass} PASS · ${fail} FAIL  (de ${CASES.length})`);
process.exit(fail > 0 ? 1 : 0);
