// scripts/test-call-novice.ts — garante a rampa de inglês do Novice nas ligações (Charlotte e TODO
// personagem da Família, inclusive os futuros: lê FAMILY_AGENTS). Simula conversas de aluno
// iniciante em texto, no MESMO modelo de cada ligação:
//   Charlotte: o modelo de voz da OpenAI em modo texto (mesmo prompt de lib/live-voice-rules);
//   Família: o LLM configurado no agente de voz (lido da API), com o prompt de lib/family-call.
// Confere a regra:
//   turnos 3 a 5: resposta em português terminando com UMA pergunta curta em inglês (+ tradução);
//   turno 6+: se o aluno já responde em inglês, pode subir o inglês; se responde em português, segue igual;
//   nenhuma frase misturando português e inglês.
// Rodar ao mudar a regra do Novice ou ao criar personagem novo (custa centavos de API):
//   cd apps/web && set -a && . ../../.env.local && set +a && npx tsx --tsconfig tsconfig.json scripts/test-call-novice.ts [rodadas]
import { SYSTEM_PROMPTS } from '../lib/live-voice-rules';
import { FAMILY_AGENTS, buildCallSession } from '../lib/family-call';

const RUNS = Number(process.argv[2]) || 3;
const NAME = 'Felipe';
// Aluno que só responde em português, e aluno que começa a responder em inglês.
const SCRIPTS: Record<string, string[]> = {
  'responde em português': ['Tudo bem, e você?', 'Pode ser, vamos!', 'Hoje eu trabalhei muito.', 'Eu sou designer.', 'Eu gosto de pizza.', 'Eu moro em São Paulo.'],
  'passa a responder em inglês': ['Tudo bem, e você?', 'Vamos sim!', 'Eu trabalhei muito hoje.', 'I am a designer.', 'I like pizza and coffee.', 'I live in São Paulo.'],
  // O turno 2 tem que reagir ao que o aluno disse (não "Tudo bem comigo também!" para "Tô pronto").
  'responde "tô pronto"': ['Tô pronto!', 'Bora!', 'Hoje eu trabalhei muito.', 'Eu sou designer.', 'Eu gosto de pizza.', 'Eu moro em São Paulo.'],
};
// Personagens da Família: no turno 6 o app manda a imitação (mesma nota do FamilyCallModal no Novice).
const IMPRESSION_NOTE = 'IMPRESSION TIME: make your next reply your president impression, the whole reply wrapped in <President>...</President>, still answering what the student says. Keep EVERY level and language rule of a normal reply (beginner: ONE short catchphrase of the impression in English, max 5 words, then Portuguese, ending with ONE short English question plus its translation in parentheses) and at most TWO short sentences. Right after it, go back to your normal voice.';
const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// Idioma de cada frase, marcado por um modelo de IA (lista de palavras não dá conta de
// "Trabalhou bastante, hein?" ou de nomes como "São Paulo"). Tradução entre parênteses e exemplo
// entre aspas não contam; nomes próprios e palavras emprestadas (pizza, designer) não definem idioma.
type Lang = 'pt' | 'en' | 'mixed';
async function classify(reply: string): Promise<{ text: string; lang: Lang }[]> {
  const clean = reply.replace(/\([^)]*\)/g, ' ').replace(/["“”][^"“”]*["“”]/g, '"…"').trim();
  if (!clean) return [];
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: 'gpt-4.1', temperature: 0, response_format: { type: 'json_object' }, messages: [
      { role: 'system', content: 'Split the text into sentences and label each one: "pt" (Portuguese), "en" (English) or "mixed" (a sentence that mixes Portuguese and English words, e.g. "You worked muito?" or "Como foi seu dia today?"). Proper names (São Paulo, Felipe) and loanwords common in Brazilian Portuguese (pizza, designer, show, ok, legal) do not make a sentence mixed. A Portuguese sentence that explains or translates an English word (\"Busy quer dizer movimentada\", \"Morning é manhã\", \"crowded = lotado\") is \"pt\", not mixed. Single-word interjections count as a sentence too. Reply JSON: {"sentences":[{"text":"...","lang":"pt|en|mixed"}]}' },
      { role: 'user', content: clean },
    ] }),
  });
  const j = await r.json();
  try { return JSON.parse(j.choices[0].message.content).sentences ?? []; } catch { return []; }
}
const ptShareOf = (sents: { text: string; lang: Lang }[]) => {
  const n = (t: string) => t.split(/\s+/).filter(Boolean).length;
  const tot = sents.reduce((a, s) => a + n(s.text), 0);
  return tot ? Math.round((sents.filter(s => s.lang === 'pt').reduce((a, s) => a + n(s.text), 0) / tot) * 100) : 0;
};

// ── Modelos ────────────────────────────────────────────────────────────────
type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

// Tempos até a primeira palavra de cada resposta (ms): é o que a voz espera para começar a falar.
const LATENCIES: number[] = [];
let TOTAL_PROBLEMS = 0;
async function chat(model: string, msgs: Msg[]): Promise<string> {
  // FAMILY_EFFORT=none|minimal: raciocínio desligado nos modelos que pensam antes de responder.
  const effort = process.env.FAMILY_EFFORT;
  const t0 = Date.now();
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model, messages: msgs, stream: true, ...(effort ? { reasoning_effort: effort } : { temperature: 0.7 }) }),
  });
  if (!r.ok || !r.body) throw new Error(`${model}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  let out = ''; let first = 0; let buf = '';
  const reader = r.body.getReader(); const dec = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n'); buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
      try {
        const d = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content;
        if (d) { if (!first) first = Date.now() - t0; out += d; }
      } catch { /* pedaço incompleto */ }
    }
  }
  if (first) LATENCIES.push(first);
  return out;
}

// Modelo de voz da OpenAI (o da ligação da Charlotte) em modo texto, via WebSocket.
async function realtime(model: string, msgs: Msg[]): Promise<string> {
  for (let i = 0; i < 3; i++) { const t = await realtimeOnce(model, msgs); if (t) return t; }
  return '';
}
async function realtimeOnce(model: string, msgs: Msg[]): Promise<string> {
  const WS = (globalThis as any).WebSocket;
  const ws = new WS(`wss://api.openai.com/v1/realtime?model=${model}`, { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } });
  return await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => { ws.close(); reject(new Error('realtime timeout')); }, 30000);
    ws.onerror = (e: any) => { clearTimeout(timer); reject(new Error(`realtime ws: ${e?.message ?? 'erro'}`)); };
    ws.onmessage = (ev: any) => {
      const m = JSON.parse(String(ev.data));
      if (m.type === 'session.created') {
        const system = msgs.find(x => x.role === 'system')!.content;
        ws.send(JSON.stringify({ type: 'session.update', session: { type: 'realtime', model, output_modalities: ['text'], instructions: system, max_output_tokens: 500 } }));
      } else if (m.type === 'session.updated') {
        for (const x of msgs.filter(y => y.role !== 'system')) {
          ws.send(JSON.stringify({ type: 'conversation.item.create', item: { type: 'message', role: x.role,
            content: [{ type: x.role === 'user' ? 'input_text' : 'output_text', text: x.content }] } }));
        }
        ws.send(JSON.stringify({ type: 'response.create' }));
      } else if (m.type === 'response.done') {
        clearTimeout(timer); ws.close();
        const out = (m.response?.output ?? []).flatMap((o: any) => o.content ?? []).map((c: any) => c.text ?? c.transcript ?? '').join(' ').trim();
        resolve(out);
      } else if (m.type === 'error') {
        clearTimeout(timer); ws.close(); reject(new Error(`realtime: ${m.error?.message}`));
      }
    };
  });
}

async function agentModel(agentId: string): Promise<string> {
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY ?? '' } });
    const j = await r.json();
    return j?.conversation_config?.agent?.prompt?.llm || 'gpt-4.1-mini';
  } catch { return 'gpt-4.1-mini'; }
}

// ── Casos: Charlotte + cada personagem da Família ──────────────────────────
interface Case { who: string; model: string; send: (msgs: Msg[]) => Promise<string>; setup: () => { system: string; first: string } }

async function cases(): Promise<Case[]> {
  // Mesmo modelo e mesma montagem do prompt da ligação da Charlotte no app (LiveVoiceModal).
  const out: Case[] = [{
    who: 'Charlotte', model: 'gpt-realtime-2', send: m => realtime('gpt-realtime-2', m),
    setup: () => {
      const first = `Alô, ${NAME}! Tudo bem?`;
      return { first, system: SYSTEM_PROMPTS.Novice.replace(/\{NAME\}/g, NAME).replace('{GREETING}', first) };
    },
  }];
  for (const [id, agentId] of Object.entries(FAMILY_AGENTS)) {
    // FAMILY_MODEL=... testa outro modelo no lugar do configurado no agente (para comparar).
    const model = process.env.FAMILY_MODEL || await agentModel(agentId);
    out.push({
      who: id, model, send: m => chat(model, m),
      setup: () => {
        const s = buildCallSession({ characterId: id, level: 'Novice', name: NAME })!;
        return { first: s.firstMessage, system: s.prompt.replace('{GREETING}', s.firstMessage) };
      },
    });
  }
  return out;
}

(async () => {
  let failures = 0;
  // ONLY=igorfina testa só esse caso (Charlotte = ligação da Charlotte).
  for (const c of (await cases()).filter(x => !process.env.ONLY || x.who === process.env.ONLY)) {
    for (const [label, script] of Object.entries(SCRIPTS)) {
      const shares: number[][] = [];
      const problems: string[] = [];
      for (let run = 0; run < RUNS; run++) {
        const { system, first } = c.setup();
        const msgs: Msg[] = [{ role: 'system', content: system }, { role: 'assistant', content: first }];
        const row: number[] = [];
        for (let i = 0; i < script.length; i++) {
          msgs.push({ role: 'user', content: script[i] });
          const impressionTurn = c.who !== 'Charlotte' && i + 2 === 6;
          if (impressionTurn) msgs.push({ role: 'system', content: IMPRESSION_NOTE });
          const raw = await c.send(msgs);
          if (impressionTurn) msgs.splice(msgs.length - 2, 2, msgs[msgs.length - 2]); // a nota não fica no histórico
          const reply = raw.replace(/<\/?[A-Za-z]+>/g, '');
          msgs.push({ role: 'assistant', content: reply });
          const turn = i + 2; // o turno 1 é a abertura
          const sents = await classify(reply);
          if (turn === 2 && label.includes('pronto') && /tudo bem comigo/i.test(reply)) problems.push(`T2 frase pronta sem ligar com a resposta: "${reply}"`);
          if (impressionTurn && !/<[A-Za-z]+>/.test(raw)) problems.push(`T6 não fez a imitação pedida: "${reply}"`);
          if (impressionTurn && sents.length > 4) problems.push(`T6 imitação longa (${sents.length} frases): "${reply}"`);
          // Pergunta repetida: a mesma pergunta em português antes do inglês e de novo na tradução.
          const trans = [...reply.matchAll(/\(([^)]*\?)\)/g)].map(m => norm(m[1]));
          const outside = reply.replace(/\([^)]*\)/g, ' ');
          const ptQs = (outside.match(/[^.!?]*\?/g) ?? []).map(norm).filter(Boolean);
          if (trans.some(t => t && ptQs.includes(t))) problems.push(`T${turn} pergunta repetida em português: "${reply}"`);
          row.push(ptShareOf(sents));
          const mixed = sents.filter(x => x.lang === 'mixed');
          if (mixed.length) problems.push(`T${turn} frase misturada: "${mixed[0].text}"`);
          // Turnos 3 a 5, e depois enquanto o aluno responde em português: português + UMA frase em inglês.
          const studentPt = /(^|\s)(eu|você|vamos|tudo|sim|pode|hoje|gosto|moro|sou|trabalhei)(\s|[.,!?]|$)/i.test(script[i]);
          if ((turn >= 3 && turn <= 5) || (turn >= 6 && studentPt)) {
            const en = sents.filter(x => x.lang === 'en').length;
            const pt = sents.some(x => x.lang === 'pt');
            if (!pt && studentPt) problems.push(`T${turn} sem português (aluno respondeu em português): "${reply}"`);
            if (en === 0) problems.push(`T${turn} sem a pergunta em inglês: "${reply}"`);
            // Na imitação, o bordão curto em inglês é permitido além da pergunta.
            if (en > (impressionTurn ? 2 : 1) && studentPt) problems.push(`T${turn} inglês demais para o aluno que responde em português: "${reply}"`);
          }
          if (!reply) problems.push(`T${turn} resposta vazia`);
          if (run === 0) console.log(`  [${c.who} · ${label}] T${turn}: ${reply}`);
        }
        shares.push(row);
      }
      TOTAL_PROBLEMS += problems.length;
      const ok = problems.length === 0;
      if (!ok) failures++;
      console.log(`${ok ? 'OK  ' : 'FALHA'} ${c.who} (${c.model}) · aluno ${label} · % português T2..T7: ${shares.map(r => r.join('/')).join('  |  ')}`);
      problems.slice(0, 6).forEach(p => console.log(`      - ${p}`));
    }
  }
  if (LATENCIES.length) {
    const v = [...LATENCIES].sort((x, y) => x - y);
    const q = (p: number) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
    console.log(`PROBLEMAS no total: ${TOTAL_PROBLEMS}`);
    console.log(`TEMPO até a 1ª palavra (${v.length} respostas): mediana ${q(0.5)} ms · 90% abaixo de ${q(0.9)} ms`);
  }
  console.log(failures ? `\n${failures} caso(s) com problema.` : '\nRampa do Novice OK em todas as ligações.');
  process.exit(failures ? 1 : 0);
})();
