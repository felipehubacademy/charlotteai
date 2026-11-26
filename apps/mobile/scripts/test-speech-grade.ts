// Testes do corretor da fala (lib/speechGrade). Rodar: npx sucrase-node scripts/test-speech-grade.ts
import { gradeSpeech, decideTake, SPEECH_PASS_PCT } from '../lib/speechGrade';

type Expect = 'pass' | 'retry' | 'fail';
const cases: [string, string, Expect][] = [
  // pedidos do relatório
  ["What's up, bro? Long time no see!", 'Whatsup, bro? Long time no see', 'pass'],
  ['Good morning, everyone!', 'God morning, everyone', 'pass'],
  ['Nice to meet you, Felipe.', 'Nice to meet you Philip', 'pass'],
  ['Excuse me, can you help me?', '', 'retry'],
  ['Excuse me, can you help me?', 'Excuse me, can you', 'retry'],
  ['Hi! How are you?', "I'm fine thank you", 'fail'],
  // casos reais dos relatórios
  ["What's up, bro? Long time no see!", 'WhatsApp bro what time no see', 'pass'],
  ['The temperature is thirty degrees.', 'The temperature is 30°', 'pass'],
  ['I was studying at 8pm.', 'I was studying at 8 PM', 'pass'],
  ['I used to play soccer.', 'I use it to play soccer', 'pass'],
  ['Nice to meet you, Felipe.', 'Nice to meet Philip', 'pass'],
  ['Good morning, everyone!', 'Good morning', 'retry'],
  ['Floor twelve, please.', 'Floor 12', 'retry'],
  ["I'm from Brazil.", 'Im from Brasil', 'pass'],
  // tem que continuar reprovando
  ["They weren't playing soccer.", 'They were playing soccer', 'fail'],
  ["We weren't talking.", 'We were talking', 'fail'],
  ['They were playing soccer.', 'They are playing soccer', 'fail'],
  ["No worries, bro. It's all good.", "Novosibirsk, it's our goods", 'fail'],
  ['Hi! How are you?', "I'm good, and you", 'fail'],
  ['Good morning, everyone!', 'Goji Boli', 'fail'],
  ["I'm 25 years old.", "I'm 20", 'fail'],
  ['See you later!', 'Sarah later', 'fail'],
  ['Is he reading?', 'Is he weeding', 'fail'],
  ["No worries, bro. It's all good.", "No worries bro it's all good", 'pass'],
  ['Do you know what time it is?', 'Do you know what time is it', 'pass'],
  ['Excuse me, can you help me?', 'Excuse me, can you he', 'retry'],
];
let bad = 0;
for (const [target, said, want] of cases) {
  const g = gradeSpeech(said ? [said] : [], target);
  const got = decideTake(g, { passPct: SPEECH_PASS_PCT, closePct: null, retriesSoFar: 0 });
  const gotSimple = got === 'close' ? 'fail' : got;
  const ok = gotSimple === want;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${want.padEnd(5)} got ${got.padEnd(5)} ${Math.round(g.percent)}%${g.cutOff ? ' cut' : ''}${g.negationMismatch ? ' neg' : ''}  "${said}" -> "${target}"`);
}
// Depois de 2 pedidos de repetir, vazio/cortado vira erro.
const third = decideTake(gradeSpeech([], 'Hi! How are you?'), { passPct: 80, closePct: null, retriesSoFar: 2 });
console.log(`${third === 'fail' ? 'ok  ' : 'FAIL'} 3rd empty take -> ${third}`); if (third !== 'fail') bad++;
console.log(bad ? `\n${bad} falha(s)` : '\ntodos ok');
process.exit(bad ? 1 : 0);
