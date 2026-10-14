// lib/support-faq-translate.ts — versão em inglês das perguntas da FAQ que aparecem no app.
import { aiFetch } from '@/lib/ai-models';
// Usa o glossário de rótulos do app (gerado do código por scripts/support-faq-ui.mjs) para
// que telas e botões saiam com o nome que o aluno vê no celular em inglês.
import glossary from './app-ui-glossary.json';
import { logOpenAIUsage } from './openai-usage';

const GLOSSARY = glossary as Record<string, string>;

export interface FaqTexts { section: string; question: string; answer: string }

export async function translateFaqToEnglish(pt: FaqTexts): Promise<FaqTexts | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const text = `${pt.section}\n${pt.question}\n${pt.answer}`;
  // Só os rótulos que aparecem no texto (mais longos primeiro).
  const terms = Object.keys(GLOSSARY).filter(k => k.length >= 3 && text.includes(k)).sort((a, b) => b.length - a.length).slice(0, 80);
  const res = await aiFetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini', temperature: 0.1, response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `Translate this help-center entry of the Queizy app (English learning app; the tutor is called Charlotte) from Brazilian Portuguese to natural, concise English.
Keep the line breaks, numbering and the " > " navigation paths. Keep prices in reais as written (e.g. "R$ 29,90" becomes "R$ 29.90").
App screen and button names MUST use exactly these English labels (Portuguese → English):
${terms.map(t => `${t} → ${GLOSSARY[t]}`).join('\n') || '(none)'}
iPhone and Android system menus: use their English names (Ajustes → Settings, Configurações → Settings).
Reply only with JSON: {"section": "...", "question": "...", "answer": "..."}` },
        { role: 'user', content: JSON.stringify(pt) },
      ],
    }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (json.usage) logOpenAIUsage({ endpoint: 'support-faq-translate', model: 'gpt-4o-mini', promptTokens: json.usage.prompt_tokens, completionTokens: json.usage.completion_tokens, totalTokens: json.usage.total_tokens });
  try {
    const j = JSON.parse(json.choices?.[0]?.message?.content ?? '{}');
    if (!j.question || !j.answer) return null;
    return { section: String(j.section || pt.section), question: String(j.question), answer: String(j.answer) };
  } catch { return null; }
}
