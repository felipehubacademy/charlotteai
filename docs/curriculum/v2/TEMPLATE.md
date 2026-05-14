# Module File Template

> Use este formato para todo arquivo de módulo.
> Para ver um exemplo completo, leia `novice/M01-ola-mundo.md` (gold standard).

---

## Cabeçalho do módulo

```markdown
# Module M{XX} — {Título lexical/temático}

> **Level**: Novice (A1) | Inter (B1) | Advanced (C1) etc.
> **Block**: A1 Block | A2 Block | B1 Block | B2 Block | C1 Block | C2 Block
> **Units**: N (N{XX}–N{XX})
> **Theme**: {tema-mãe do módulo}
> **Module goal**: {o que o aluno sai sabendo fazer}
> **Connects to**: M{XX+1} ou M{anterior}
```

---

## Chunks do módulo

Lista de 30–60 chunks introduzidos no módulo, no topo do arquivo:

```markdown
## Module chunks introduced (~30)

- chunk 1
- chunk 2
- ...
```

---

## Estrutura de cada unidade (repetir N vezes)

```markdown
## Unit N{XX} — {Título lexical}

> **Sub-CEFR**: A1 | **Grammar focus**: {tópico gramatical} | **Markers**: [denso] [qform]
> **Real-life context**: {situação concreta}

### 1. Grammar (10 exercises | 5 for Advanced)

1. **{exercise_type}** — "{sentence}"
   **Options/Choices/Hint**: ...
   **Answer**: ...
   **Explanation**: {em PT no Novice; EN em Inter/Adv}

[... repetir até 10 (ou 5 no Advanced) ...]

### 2. Listening/Speaking (5 phrases)

Charlotte fala via ElevenLabs (Rachel). Aluno repete; Azure Speech avalia.

1. **"frase"** — *uso/contexto*
2. ...

### 3. Role-play

**Cenário**: {situação concreta com personagem recorrente quando possível}
**Tipo**: Live Voice
**Voiced by**: `charlotte` | `charlie`  *(qual avatar/voz interpreta o NPC — Charlotte para mulheres, Charlie para homens)*
**Persona**: {nome do personagem na cena, ex: Ana / Tom / "the barista"}
**Persona outfit**: `{slug do asset}`  *(ex: `ana_cafe_morning`, `tom_office_casual`)*
**Time budget**: `180s` Novice · `300s` Inter · `540s` Advanced
**Opening line**: "{primeira fala do NPC}"

**Sub-objectives** (visíveis pro aluno como checklist; `hidden_prompt` vai pro system prompt, não pra UI):

1. **id**: 1
   **label_pt**: "{rótulo curto e claro no checklist em PT}"
   **label_en**: "{idem em EN}"
   **hidden_prompt**: "{condição que o LLM avalia pra emitir `[OBJECTIVE_MET:1]`}"
   **hint_pt**: "{dica curta usada pelo botão Need a hand?, em PT — Novice}"
   **hint_en**: "{idem em EN — Inter; Advanced não usa hint}"

2. **id**: 2
   [...mesmo formato...]

3. **id**: 3
   [...]

**Closing cue**: "{frase que sinaliza fim natural do role-play — Charlotte fecha em personagem quando todos os objetivos batem}"

**Suggested flow** (referencial, não rigoroso — {4–5 turnos Novice, 5–6 Inter, 7–8 Advanced}):
1. **Student**: ~"{resposta esperada}"
2. **NPC**: "{resposta}"
3. ...

**Evaluation focus**: {chunks-alvo, gramática-alvo, naturalidade}

### 4. Guided Chat

**Cenário**: {situação concreta diferente do role-play}
**Voiced by**: `charlotte` | `charlie`
**Persona**: {nome do NPC ou "Charlotte tutora" se for didático puro}
**Persona outfit**: `{slug}`
**Intro (PT na Novice / EN no Inter+)**: "{contexto + primeira pergunta antes do role começar}"
**Opening message** (já em personagem): "{primeira mensagem do NPC no chat}"

**Sub-objectives** (mesma estrutura do role-play):

1. **id**: 1
   **label_pt**: "..."
   **label_en**: "..."
   **hidden_prompt**: "..."
   **hint_pt**: "..."
   **hint_en**: "..."

2. [...]

**Closing cue**: "{frase de fechamento que dispara fim da sessão}"
**Recap (PT na Novice / EN no Inter+)**: "{recap positivo dos chunks usados — mostrado no card de resultado}"

**Script** (referencial — {5–6 turnos Novice, 6–8 Inter, 8–10 Advanced}):

1. **Student** (expected): "{resposta esperada}"
   *Se aluno escrever {variação comum}*: NPC: "{correção gentil}"

2. **NPC**: "{próxima fala}"

[...]
```

---

## Tipos de exercício de gramática válidos

| Tipo | Campos obrigatórios | Notas |
|------|---------------------|-------|
| `multiple_choice` | sentence, options[3], answer, explanation | options: [correct, wrong1, wrong2] |
| `word_bank` | sentence, choices[4], answer, explanation | choices: [correct, d1, d2, d3] |
| `fill_gap` | sentence, hint, answer, explanation | hint = 1 linha em PT/EN |
| `fix_error` | sentence (com erro), hint, answer (corrigido), explanation | |
| `read_answer` | passage, question, answer, explanation | passage 2-4 sentences |
| `word_order` | context_pt, words[], answer, explanation | words será embaralhado pelo app |
| `short_write` | prompt, example_answer, explanation | open-ended |

## Sequência sugerida (10-pack)

mc, mc, word_bank, word_bank, fill_gap, fill_gap, fill_gap, fix_error, fix_error, read_answer

## Sequência sugerida (5-pack)

mc, word_bank, fill_gap, fix_error, read_answer

---

## Checklist antes de marcar `done` no INDEX.md

- [ ] Cabeçalho do módulo completo
- [ ] Lista de chunks introduzidos
- [ ] Todas as N unidades com 4 atividades cada
- [ ] Cada Grammar com 10 (ou 5) exercícios completos
- [ ] Cada L/S com 5 frases
- [ ] Cada Role-play com: voiced_by, persona, persona_outfit, time_budget, opening, **3–6 objectives explícitos** com hidden_prompt e hints, closing cue, suggested flow, evaluation focus
- [ ] Cada Guided Chat com: voiced_by, persona, persona_outfit, intro, opening message, **3–6 objectives explícitos**, closing cue, recap, script
- [ ] `voiced_by` = `charlotte` para personagens femininos / `charlie` para masculinos
- [ ] `persona_outfit` segue slug snake_case (ex: `ana_cafe_morning`, `tom_office_casual`)
- [ ] Recap positivo no final do chat
- [ ] Personagens recorrentes usados quando possível
- [ ] Sem emojis (forbidden)
- [ ] Português perfeito (acentos, cedilhas) no Novice
- [ ] Status atualizado no `INDEX.md`
