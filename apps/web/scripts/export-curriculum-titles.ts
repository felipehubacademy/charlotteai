// Gera lib/curriculum-titles.json (títulos de módulos e tópicos da trilha)
// a partir do currículo do app. Rodar de novo quando o currículo mudar:
//   npx -y tsx apps/web/scripts/export-curriculum-titles.ts
import { writeFileSync } from 'fs';
import { join } from 'path';
import { CURRICULUM } from '../../mobile/data/curriculum';

const out: Record<string, { title: string; topics: string[] }[]> = {};
for (const [level, modules] of Object.entries(CURRICULUM)) {
  out[level] = modules.map(m => ({ title: m.title, topics: m.topics.map(t => t.title) }));
}
writeFileSync(join(__dirname, '../lib/curriculum-titles.json'), JSON.stringify(out, null, 1) + '\n');
console.log(Object.entries(out).map(([l, m]) => `${l}: ${m.length} módulos`).join(' · '));
