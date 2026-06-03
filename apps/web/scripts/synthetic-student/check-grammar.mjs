// Port do checkGrammar do learn-session.tsx (apps/mobile). Mesma logica,
// pra sintetic student validar respostas localmente sem precisar do app.

function normalise(s) {
  return s.trim().toLowerCase().replace(/[''']/g, "'").replace(/\s+/g, ' ');
}

function expandContractions(s) {
  return s
    .replace(/won't/g, 'will not')
    .replace(/can't/g, 'cannot')
    .replace(/n't/g, ' not')
    .replace(/i've/g, 'i have')
    .replace(/you've/g, 'you have')
    .replace(/we've/g, 'we have')
    .replace(/they've/g, 'they have')
    .replace(/he's/g, 'he has')
    .replace(/she's/g, 'she has')
    .replace(/it's/g, 'it has')
    .replace(/i'm/g, 'i am')
    .replace(/you're/g, 'you are')
    .replace(/we're/g, 'we are')
    .replace(/they're/g, 'they are');
}

export function checkGrammar(ex, answer) {
  const u = normalise(answer);
  const c = normalise(ex.answer);
  if (u === c) return true;
  if (ex.accepts) {
    const lenient = ex.type === 'read_answer' || ex.type === 'fix_error' || ex.type === 'fill_gap';
    for (const a of ex.accepts) {
      const na = normalise(a);
      if (na === u) return true;
      if (lenient && (u.includes(na) || na.includes(u))) return true;
    }
  }
  if (ex.type === 'multiple_choice' || ex.type === 'word_bank' || ex.type === 'word_order') return false;

  // Aceita contracao OU forma separada SEMPRE.
  if (ex.type === 'fill_gap') {
    if (u.includes(c)) return true;
    const uExp = expandContractions(u);
    const cExp = expandContractions(c);
    if (uExp === cExp || uExp.includes(cExp)) return true;
    return false;
  }
  if (ex.type === 'fix_error') {
    if (u.includes(c) || c.includes(u)) return true;
    const uExp = expandContractions(u);
    const cExp = expandContractions(c);
    if (uExp.includes(cExp) || cExp.includes(uExp)) return true;
    return false;
  }
  if (ex.type === 'read_answer') {
    const cExp = expandContractions(c);
    const uExp = expandContractions(u);
    const words = cExp.split(' ').filter(w => w.length > 2);
    return words.length > 0 && words.filter(w => uExp.includes(w)).length >= Math.ceil(words.length * 0.6);
  }
  return false;
}
