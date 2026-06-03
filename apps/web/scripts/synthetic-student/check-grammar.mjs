// Port do checkGrammar do learn-session.tsx (apps/mobile). Mesma logica,
// pra sintetic student validar respostas localmente sem precisar do app.

function normalise(s) {
  return s.trim().toLowerCase().replace(/[''']/g, "'").replace(/\s+/g, ' ');
}

function expandContractions(s) {
  return s
    // Negativas
    .replace(/won't/g, 'will not')
    .replace(/can't/g, 'cannot')
    .replace(/shan't/g, 'shall not')
    .replace(/ain't/g, 'is not')
    .replace(/n't/g, ' not')
    // 've
    .replace(/i've/g, 'i have').replace(/you've/g, 'you have')
    .replace(/we've/g, 'we have').replace(/they've/g, 'they have')
    .replace(/who've/g, 'who have')
    // 'm
    .replace(/i'm/g, 'i am')
    // 're
    .replace(/you're/g, 'you are').replace(/we're/g, 'we are')
    .replace(/they're/g, 'they are').replace(/who're/g, 'who are')
    // 's (= is, default)
    .replace(/he's/g, 'he is').replace(/she's/g, 'she is').replace(/it's/g, 'it is')
    .replace(/that's/g, 'that is').replace(/there's/g, 'there is')
    .replace(/here's/g, 'here is').replace(/what's/g, 'what is')
    .replace(/who's/g, 'who is').replace(/where's/g, 'where is')
    .replace(/how's/g, 'how is').replace(/let's/g, 'let us')
    // 'll (= will)
    .replace(/i'll/g, 'i will').replace(/you'll/g, 'you will')
    .replace(/he'll/g, 'he will').replace(/she'll/g, 'she will')
    .replace(/it'll/g, 'it will').replace(/we'll/g, 'we will')
    .replace(/they'll/g, 'they will').replace(/that'll/g, 'that will')
    // 'd (= would, default)
    .replace(/i'd/g, 'i would').replace(/you'd/g, 'you would')
    .replace(/he'd/g, 'he would').replace(/she'd/g, 'she would')
    .replace(/it'd/g, 'it would').replace(/we'd/g, 'we would')
    .replace(/they'd/g, 'they would');
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
