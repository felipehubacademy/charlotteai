# Authoring Guide — Charlotte Curriculum v2

> **Propósito**: este doc é o briefing completo pra escrever conteúdo de
> qualquer módulo/unidade. Leia ele uma vez no início, e consulte sempre que
> escrever uma nova unidade. Contém tudo: estrutura, templates exatos,
> convenções, regras de qualidade, padrões de objective, e validação final.

---

## DOCS QUE VOCÊ DEVE CONHECER ANTES DE COMEÇAR

| Doc | Pra quê |
|---|---|
| `AUTHORING-GUIDE.md` (este) | Briefing completo de como escrever |
| `STYLE-GUIDE.md` | Voz da Charlotte, persona, tom, lexical approach (chunks) |
| `TEMPLATE.md` | Esqueleto exato de um módulo |
| `grammar-progression.md` | O que pode/não pode usar em cada módulo + repetição de pontos críticos |
| `INDEX.md` | Status de cada módulo (todo/in-progress/done) |
| `novice/M01-ola-mundo.md` | **Gold standard** — copie a estrutura daqui |

---

## ESTRUTURA GERAL

### Hierarquia

```
Curriculum
├─ Novice  (110 unidades, 22 módulos, blocos A1 [M01-M11] e A2 [M12-M22])
├─ Inter   (110 unidades, 22 módulos, blocos B1 [I01-I11] e B2 [I12-I22])
└─ Advanced (110 unidades, 22 módulos, blocos C1 [A01-A11] e C2 [A12-A22])
```

### 1 arquivo markdown = 1 módulo

Caminho: `docs/curriculum/v2/{level}/M{NN}-{slug}.md` (Novice) ou
`docs/curriculum/v2/{level}/{ID}-{slug}.md` (Inter usa `I##`, Advanced usa `A##`).

Exemplo: `docs/curriculum/v2/novice/M03-familia-e-amigos.md`

### Cada módulo tem 5 unidades

IDs: `N01..N05` (Novice), `I01..I05` per módulo (Inter), `A01..A05` (Advanced).
(O prefixo letra indica o nível — não o módulo.)

### Cada unidade tem 4 atividades

| # | Atividade | Tem objective? | Spec |
|---|---|---|---|
| 1 | Grammar | ❌ | 10 ex (Novice/Inter) ou 5 (Advanced) |
| 2 | Listening/Speaking | ❌ | 5 frases (6-12 palavras cada) |
| 3 | Role-play | ✅ | Voz, com objectives (qty por gradiente) |
| 4 | Guided Chat | ✅ | Texto, com objectives (qty por gradiente) |

---

## DECISÕES GLOBAIS (NÃO NEGOCIÁVEIS)

1. **Charlotte-only**: TODA interação é com Charlotte. **Sem cast (Ana, Tom,
   Maria, Lucas, Sarah).** Sempre `voiced_by: charlotte`, `persona: Charlotte`.
2. **Persona outfit FIXO em `charlotte_casual`** (por enquanto). Não
   inventar `charlotte_office`, `charlotte_cafe`, `charlotte_park`, etc. —
   só temos 1 asset gráfico hoje (`charlotte-avatar.png`). Slugs novos
   caem em fallback genérico e quebram a consistência visual. Quando
   tivermos um set de avatares por outfit, esta regra muda; até lá:
   **sempre `persona_outfit: charlotte_casual`** em role-play e chat.
   O cenário (cafeteria, escritório, parque) vai no `scenario` em prosa,
   não no slug do outfit.
3. **Idioma de explicações**:
   - Novice: PT-BR (acentos PERFEITOS — sem cedilha esquecida, sem til omitido)
   - Inter: English simples
   - Advanced: English natural
4. **Sem emojis** em arquivos de conteúdo (per `feedback_no_emojis.md`).
5. **Sem URLs falsas**.
6. **Charlotte conhece o aluno** — o sistema injeta `user_name` no prompt.
   Nada de "What's your name?" / "How old are you?" como objective real.
   Se quiser ensinar esse padrão sintático, frame como simulação: "Imagine
   you're meeting someone at a party — practice introducing yourself."

---

## TEMPLATE DE MÓDULO (cabeçalho)

```markdown
# Module M{NN} — {Título do módulo}

> **Level**: Novice (A1) | Novice (A2) | Inter (B1) | Inter (B2) | Advanced (C1) | Advanced (C2)
> **Block**: A1 Block | A2 Block | B1 Block | B2 Block | C1 Block | C2 Block
> **Units**: 5 (N01–N05)
> **Theme**: {tema mãe do módulo — 1 frase}
> **Module goal**: {o que o aluno sai sabendo fazer — 1-2 frases}
> **Connects to**: M{NN-1} ou M{NN+1}

## Module chunks introduced (~30)

- chunk 1
- chunk 2
- ...

## Unit N01 — {Título}
[... 4 atividades ...]

## Unit N02 — {Título}
[... 4 atividades ...]

## Unit N03 — {Título}
[... 4 atividades ...]

## Unit N04 — {Título}
[... 4 atividades ...]

## Unit N05 — {Título}
[... 4 atividades ...]
```

---

## TEMPLATE DE UNIDADE (header)

```markdown
## Unit N01 — {Título lexical (ex: "Oi! Tudo bem?")}

> **Sub-CEFR**: A1 | **Grammar focus**: {tópico gramatical específico}
> **Markers**: [denso] [qform] [review]
> **Real-life context**: {situação concreta — 1 frase}
```

---

## TEMPLATE DE GRAMMAR (atividade 1)

10 exercícios pra Novice/Inter (5 pra Advanced). Sequência padrão:
**2× mc + 2× word_bank + 3× fill_gap + 2× fix_error + 1× read_answer**

Sequência reduzida (5 ex Advanced): **1× mc + 1× word_bank + 1× fill_gap + 1× fix_error + 1× read_answer**

### Tipos válidos

| Tipo | Campos obrigatórios |
|---|---|
| `multiple_choice` | sentence, options[3], answer, explanation |
| `word_bank` | sentence, choices[4], answer, explanation |
| `fill_gap` | sentence, hint, answer, explanation |
| `fix_error` | sentence (com erro), hint, answer (corrigido), explanation |
| `read_answer` | passage (2-4 sentences), question, answer, explanation |
| `word_order` | context_pt, words[] (embaralhadas), answer, explanation |
| `short_write` | prompt, example_answer, explanation |

### Formato

```markdown
### 1. Grammar (10 exercises)

1. **multiple_choice** — "Hi, ___ are you?"
   **Options**: ["how", "what", "where"]
   **Answer**: how
   **Explanation**: Em inglês, "how" pergunta sobre estado. "How are you?" é o cumprimento padrão. (PT em Novice; EN em Inter/Adv)

2. **word_bank** — "Good _____, everyone!"
   **Choices**: ["morning", "night", "lunch", "noon"]
   **Answer**: morning
   **Explanation**: ...

[... continua até 10 ...]
```

---

## TEMPLATE DE LISTENING/SPEAKING (atividade 2)

5 frases. Cada uma com:
- `text`: a frase exata (6-12 palavras)
- `context`: contexto curto em PT explicando quando se usa

```markdown
### 2. Listening/Speaking (5 phrases)

Charlotte fala (Rachel via ElevenLabs ou coral via OpenAI). Aluno repete.
Azure Speech avalia pronúncia.

1. **"Hi! How are you?"** — *saudação informal padrão*
2. **"Good morning, everyone!"** — *cumprimento de manhã em grupo*
3. **"I'm fine, thanks. And you?"** — *resposta padrão a "how are you?"*
4. **"Nice to meet you!"** — *ao conhecer alguém pela primeira vez*
5. **"See you later!"** — *despedida casual*
```

---

## TEMPLATE DE ROLE-PLAY (atividade 3)

```markdown
### 3. Role-play

**Cenário**: {situação concreta em PT, 1-2 frases. Quem está com você, onde,
o que está acontecendo.}
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`  *(ou contextual: `charlotte_office`, `charlotte_cafe`)*
**Time budget**: 90s Novice · 180s Inter · 300s Advanced
**Opening line**: "{primeira fala dela em EN — bem simples no Novice}"

**Sub-objectives** (qty por gradiente):

1. **id**: 1
   **label_pt**: "{ação esperada em PT, curta e clara — vira o item do checklist}"
   **label_en**: "{idem em EN}"
   **hidden_prompt**: "{condição EN que o LLM avalia pra marcar objective met — descrição precisa do que aluno tem que falar}"
   **hint_pt**: "{frase EXATA que aluno deve falar — vira o scaffold dark tooltip}"
   **hint_en**: "{mesma frase EN — sempre EM INGLÊS, é o que aluno fala}"

2. **id**: 2
   [... idem ...]

**Closing cue**: {frase referencial que Charlotte usa pra fechar — LLM tem
liberdade de adaptar e fazer 1 follow-up natural}

**Suggested flow** (referencial, NÃO rigoroso):

1. **Charlotte**: "{primeira fala}"
2. **Student**: ~"{resposta esperada}"
3. **Charlotte**: "{próxima fala}"
[...]

**Evaluation focus**:
- {bullet 1: que chunks/grammar o aluno deve usar}
- {bullet 2: pronúncia ou naturalidade}
```

---

## TEMPLATE DE GUIDED CHAT (atividade 4)

```markdown
### 4. Guided Chat

**Cenário**: {situação em PT, diferente do role-play. Por que conversa por texto.}
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "{setup mostrado ao aluno antes do chat começar — 1-2 frases}"
**Opening message**: "{primeira mensagem dela}"

**Sub-objectives** (qty por gradiente):

1. **id**: 1
   **label_pt**: "..."
   **label_en**: "..."
   **hidden_prompt**: "..."
   **hint_pt**: "..."
   **hint_en**: "..."

2. **id**: 2
   [...]

**Closing cue**: {referencial}

**Script** (referencial, NÃO rigoroso):

1. **Charlotte**: "{abertura}"
2. **Student**: "{esperado}"
3. **Charlotte**: "{follow-up}"
[...]
```

> **NÃO incluir** `**Recap (PT)**` — removemos do card de conclusão (muita
> info pra início do Novice). Cards ficam clean com checkmarks + stats.

---

## GRADIENTE DE OBJECTIVES POR MÓDULO

| Módulo | Role-play (voz) | Chat (texto) |
|---|---|---|
| **M01** | **1 obj** | **2-3 obj** (texto é mais fácil) |
| **M02** | 2 obj | 3 obj |
| **M03+** | 3 obj | 3-4 obj |
| **I01+** (Inter) | 3 obj | 3-4 obj |
| **A01+** (Advanced) | 3-4 obj | 4-5 obj |

**Justificativa**: voz é mais difícil que texto (pronúncia + escutar +
formar). Chat tolera mais objetivos no mesmo tempo de sessão.

---

## REGRAS ESPECÍFICAS PRA OBJECTIVES (CRÍTICO)

Este é o ponto mais sensível. Errar aqui quebra a UX.

### 1. `label_pt` / `label_en` (visível ao aluno como checklist)

- **Ação clara, no infinitivo ou imperativa**: "Responder como você está",
  "Aceitar o convite", "Explicar por que sumiu"
- **Curta** (3-6 palavras em PT)
- **Não revela a resposta exata** — descreve a INTENÇÃO, não as palavras

✅ "Responder como você está"
❌ "Dizer 'I'm fine, thanks'"

### 2. `hidden_prompt` (apenas o LLM vê)

- **Inglês**, descrição precisa da condição
- Lista **variações aceitáveis** quando útil
- Define o que conta e o que não conta

✅ "user says any positive state (good/fine/great/ok/well) — bare word counts"
✅ "user accepts the invitation (yes/sure/please/of course) — even 1 word"
❌ "user responds nicely" (muito vago)
❌ "user says 'I'm fine, thanks'" (muito rígido — não tolera variação)

### 3. `hint_pt` / `hint_en` (vira scaffold dark tooltip)

- **FRASE EXATA que o aluno deve falar/escrever**
- Sempre em **INGLÊS** (é o que o aluno produz)
- `hint_pt` e `hint_en` podem ser **idênticos** (é a mesma frase EN)
- **Curtos** — 1-5 palavras pro Novice base, até 8 palavras pro Inter

✅ hint_pt: "I'm good!"
✅ hint_pt: "Yes, please!"
✅ hint_pt: "Good morning!"
❌ hint_pt: "Tenta 'I'm good!'" (não escreve "Tenta")
❌ hint_pt: "Responder como você está" (isso é o label, não o hint)

### 4. Quantidade e progressão dentro da unidade

- Os objectives **devem fluir naturalmente em ORDEM** (1 → 2 → 3)
- Cada obj é uma micro-conquista. Aluno bate obj 1 → Charlotte responde
  com algo que leva pro obj 2 → aluno bate obj 2 → etc
- Não criar obj que pulam contexto. Ex: se obj 1 é "cumprimentar" e obj 3
  é "aceitar café", o obj 2 deve ser uma ponte natural (ex: "dizer como
  está" — entre o cumprimento e o convite)

### 5. Objectives no NOVICE: regra de ouro

- **Frase target curta** (1-5 palavras)
- **Sem present perfect, condicionais, idiomas, phrasal verbs avançados**
- **Sem perguntar nome/idade/básicos** (Charlotte conhece o aluno)
- **Cada objective ensina UM chunk isolado, repetível, reutilizável**

### Exemplo COMPLETO (N01 M01 — referência gold)

```markdown
### 3. Role-play

**Cenário**: Charlotte te encontra e cumprimenta. Responde ela.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 90s
**Opening line**: "Hi! How are you?"

**Sub-objectives** (POC base-da-base: 1 objetivo apenas):

1. **id**: 1
   **label_pt**: "Responder como você está"
   **label_en**: "Say how you're doing"
   **hidden_prompt**: "user says any positive state (good/fine/great/ok/well) — bare word counts"
   **hint_pt**: "I'm good!"
   **hint_en**: "I'm good!"

**Closing cue**: Charlotte fecha com "Great! Nice to see you. Talk to you later!" quando obj_1 baterem.

**Suggested flow** (referencial, 2 turnos):

1. **Student**: ~"I'm good!"
2. **Charlotte**: "Great! Nice to see you. Talk to you later!"

**Evaluation focus**:
- Aluno responde com algum estado positivo
- Pronúncia clara de "I'm good" / "Good"
```

---

## REGRAS DE COERÊNCIA CURRICULAR

### Dentro da unidade (4 atividades casam)

As 4 atividades da unidade (Grammar, L&S, Role-play, Chat) compartilham:
- **Mesmo vocabulário-alvo** (puxado do pool de chunks do módulo)
- **Mesmo padrão gramatical foco** (declarado no header da unit)
- **Mesmo universo temático** (se a unit é sobre saudações, todas as 4
  atividades giram em torno disso)

### Dentro do módulo (5 unidades casam)

As 5 unidades exploram subtemas do **tema mãe do módulo**:
- M01 (saudações) → N01 cumprimento, N02 apresentação, N03 origem, N04 sentimentos, N05 despedida
- M03 (família) → N01 família próxima, N02 família estendida, N03 onde moram, N04 o que fazem, N05 contar a alguém sobre família

### Entre módulos (progressão sem pular)

- **Grammar**: consultar `grammar-progression.md` — usar SÓ estruturas de
  M01 até módulo atual
- **Vocab**: pode reaproveitar vocab de módulos anteriores; introduzir
  vocab novo no pool do módulo
- **Pontos críticos**: garantir que pontos como artigos, 3ª pessoa -s,
  phrasal verbs, etc., reapareçam em módulos múltiplos (ver mapa de
  recorrência em `grammar-progression.md`)

---

## CHECKLIST FINAL (antes de marcar módulo como `done` no INDEX.md)

### Cabeçalho do módulo
- [ ] Level, Block, Units, Theme, Goal, Connects to preenchidos
- [ ] Lista de 30-60 chunks introduzidos no topo

### Cada uma das 5 unidades
- [ ] Header: Sub-CEFR, Grammar focus, Markers, Real-life context
- [ ] **Grammar**: 10 exercícios (5 se Advanced), sequência padrão (mc/word_bank/fill_gap/fix_error/read_answer)
- [ ] **L&S**: 5 frases (6-12 palavras), cada uma com context
- [ ] **Role-play**: voiced_by/persona/outfit/time_budget/opening_line/objectives (qty por gradiente)/closing_cue/suggested_flow/evaluation_focus
- [ ] **Guided Chat**: idem + intro_pt/opening_message/script (sem recap)

### Objectives (role-play + chat)
- [ ] Quantidade bate com gradiente do módulo
- [ ] label_pt/en descrevem ação, não a resposta exata
- [ ] hidden_prompt em EN, com variações aceitáveis
- [ ] hint_pt = hint_en = frase exata em inglês (curta)
- [ ] Fluxo natural: obj 1 → 2 → 3 (cada um abre o próximo)

### Coerência
- [ ] As 4 atividades de cada unit usam mesmo vocab/grammar foco
- [ ] As 5 unidades exploram subtemas do mesmo tema mãe
- [ ] Grammar usa SÓ estruturas permitidas até o módulo atual (`grammar-progression.md`)
- [ ] Vocab puxa do pool de chunks do módulo (+ acumulado anterior)
- [ ] Se a unit ataca um ponto crítico (lista de 18), garantir recorrência futura

### Qualidade
- [ ] **Sem emojis** em nenhum lugar
- [ ] **PT-BR com acentos PERFEITOS** (Novice): "você", "está", "não", "também", "três", "atenção", "está", "país"
- [ ] **Charlotte sempre** (nunca Ana, Tom, etc.)
- [ ] **Sem perguntar nome/idade** (Charlotte conhece)
- [ ] **Voz robotic-friendly no Novice**: NPCs respondem com 1 pergunta curta,
      sem volunteering info que ninguém pediu
- [ ] **Rejeitar PT no objective**: já está nos prompts API, mas no
      `hidden_prompt` reforce: "must be in English"

### INDEX
- [ ] Status do módulo atualizado em `INDEX.md`

---

## FLUXO TÉCNICO (já existe, não precisa pensar)

1. **Backend prompts** (`/api/roleplay/turn`, `/api/guided-chat/turn`):
   - Já têm regra PT rejection
   - Já têm regra Novice robotic reply (NPC = 1 pergunta curta sem volunteering)
   - Já recebem `user_name` e usam pra Charlotte chamar aluno pelo nome
   - Já têm sequential flow Novice (pursue first pending objective)
   - Já têm closing natural (celebra + follow-up question)

2. **Mobile**:
   - Scaffold dark tooltip lê `hint_pt`/`hint_en` da objective pendente
   - Result card mostra "Você falou: [transcript]" + checkmarks + score
   - Se erra: card mostra "A resposta era: [hint_en]" + botão Refazer

3. **Compilação + wiring no app (100% auto)**:
   - `cd apps/mobile && node scripts/compile-curriculum-v2.mjs`
   - O script faz TUDO numa rodada:
     a) parseia o markdown → gera JSON em `apps/mobile/data/curriculum-v2/{level}/{Mxx}.json`
     b) atualiza `manifest.json`
     c) **regenera `apps/mobile/lib/curriculum-v2/loader.ts`** com `require()`
        literal pra cada módulo compilado (Metro exige path literal —
        por isso precisa ser gerado, não dinâmico)
   - Resultado: assim que o módulo compila sem erro, o trail já vê e
     renderiza ele. Zero edição manual em loader, registro, ou UI.
   - Tem que rodar SEMPRE que terminar um módulo (ou alterar um existente).

4. **UI / Trail**:
   - Títulos de módulo, unidade, scenario, persona, objectives, exercícios,
     phrases — TUDO renderiza do JSON. Você só escreve markdown.
   - Não há nada pra mexer em código React/TSX pra cada novo módulo.

5. **Áudio L&S pré-gerado (CDN)** — workflow do mantenedor (não da Curriculum session):
   - Curriculum session só escreve o markdown. Não precisa pensar em áudio.
   - Quando um lote de módulos for compilado, o mantenedor roda:
     ```
     node apps/mobile/scripts/generate-ls-audio.mjs --dry-run
     node apps/mobile/scripts/generate-ls-audio.mjs
     node apps/mobile/scripts/compile-curriculum-v2.mjs   # restampa audio_url no JSON
     ```
   - Áudio é gerado uma vez via OpenAI TTS (coral/flac), subido pro bucket
     `curriculum-audio/ls/` no Supabase Storage. Hash do texto = chave estável,
     então mesma phrase em units diferentes reusa o mesmo arquivo.
   - Mobile prefere o CDN URL; se faltar (phrase nova ainda não gerada),
     cai automaticamente em `/api/tts`. Sem quebrar nada.
   - Custo: ~$0.015/1k chars, gerado UMA vez por phrase. Trivial.

---

## QUANDO TIVER DÚVIDA

- **Estrutura de markdown**: olha `M01-ola-mundo.md` (gold standard)
- **Estilo Charlotte**: olha `STYLE-GUIDE.md`
- **Grammar permitida no módulo X**: olha `grammar-progression.md`
- **Ponto crítico a repetir**: olha mapa de recorrência em `grammar-progression.md`

---

## STATUS ATUAL (29 mai 2026)

- ✅ M01 N01 completa e validada em TestFlight (gold standard)
- ⬜ M01 N02-N05 — falta refinar (mesmo padrão de N01)
- ⬜ M02-M22 (Novice) — falta tudo
- ⬜ I01-I22 (Inter) — falta tudo
- ⬜ A01-A22 (Advanced) — falta tudo

Próximo passo recomendado: finalizar M01 inteiro (N02-N05) seguindo
exatamente o padrão de N01. Aí abrir M02 e seguir adiante.
