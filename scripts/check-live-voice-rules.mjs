#!/usr/bin/env node
// Confere que as regras por nível da ligação da Charlotte (app) e a cópia do servidor, base das
// ligações da Família Queizy, são idênticas. Falha (exit 1) se divergirem.
import fs from 'node:fs';
const pick = (file) => {
  const s = fs.readFileSync(file, 'utf8');
  const i = s.indexOf("SYSTEM_PROMPTS: Record<'Novice' | 'Inter' | 'Advanced', string> = {");
  if (i < 0) throw new Error(`SYSTEM_PROMPTS não encontrado em ${file}`);
  return s.slice(i, s.indexOf('\n};\n', i));
};
const app = pick('apps/mobile/components/voice/LiveVoiceModal.tsx');
const web = pick('apps/web/lib/live-voice-rules.ts');
if (app !== web) {
  console.error('As regras da ligação da Charlotte mudaram no app e não na cópia do servidor (apps/web/lib/live-voice-rules.ts). Copie o SYSTEM_PROMPTS igual.');
  process.exit(1);
}
console.log('Regras da ligação iguais no app e no servidor.');
