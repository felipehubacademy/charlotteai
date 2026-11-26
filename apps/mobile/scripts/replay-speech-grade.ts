// Reaplica o corretor novo em tentativas reais (JSON exportado de learn_attempts) e compara com o antigo.
// Rodar: npx sucrase-node scripts/replay-speech-grade.ts <arquivo.json>
import { readFileSync } from 'fs';
import { gradeSpeech, decideTake, SPEECH_PASS_PCT } from '../lib/speechGrade';

type Row = { level: string; expected: string; answer: string | null; alternatives: string[] | null; score: string | null; passed: boolean | null };
const rows: Row[] = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const noviceLike = (l: string) => /novice|igorfina/i.test(l);
const out = { total: 0, oldPass: 0, newPass: 0, saved: 0, lost: 0, retry: 0, oldFailEmpty: 0 };
const savedEx: string[] = []; const lostEx: string[] = []; const retryEx: string[] = [];
for (const r of rows) {
  out.total++;
  const alts = r.alternatives?.length ? r.alternatives : r.answer ? [r.answer] : [];
  const novice = noviceLike(r.level);
  const g = gradeSpeech(alts, r.expected);
  const res = decideTake(g, { passPct: novice ? 70 : SPEECH_PASS_PCT, closePct: novice ? null : 50, retriesSoFar: 0 });
  const oldP = !!r.passed;
  if (oldP) out.oldPass++;
  if (res === 'pass') out.newPass++;
  if (res === 'retry') { out.retry++; if (!oldP && alts.length && retryEx.length < 15) retryEx.push(`"${alts[0]}" -> "${r.expected}"`); }
  if (!oldP && !alts.length) out.oldFailEmpty++;
  if (!oldP && res === 'pass') { out.saved++; if (savedEx.length < 40) savedEx.push(`${Math.round(g.percent)}% "${alts[0]}" -> "${r.expected}"`); }
  if (oldP && res !== 'pass') { out.lost++; if (lostEx.length < 40) lostEx.push(`${res} ${Math.round(g.percent)}% "${alts[0]}" -> "${r.expected}" [${r.level}]`); }
}
console.log(out);
console.log('\nSALVAS (antigo reprovou, novo aprova):'); savedEx.forEach(x => console.log(' ', x));
console.log('\nPERDIDAS (antigo aprovou, novo não):'); lostEx.forEach(x => console.log(' ', x));
console.log('\nREPETIR em vez de reprovar (com fala):'); retryEx.forEach(x => console.log(' ', x));
