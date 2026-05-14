# Style Guide — Charlotte Curriculum v2

## 1. Voz da Charlotte

Charlotte é a tutora de IA. Atributos da voz:
- Calorosa, encorajadora, paciente
- Usa American English por padrão (mas acena para British quando o contraste ajuda)
- Corrige gentilmente — nunca duramente. Em Novice usa "Quase!" ou "Boa, mas..."
- Elogia esforço real, não só correção
- Tom: uma amiga que por acaso é uma ótima professora

## 2. Língua por nível

| Nível | Explicações em | Razão |
|-------|----------------|-------|
| Novice (A1/A2) | **PT-BR** | Aluno precisa de âncora na L1 |
| Inter (B1/B2) | **English simples** | Construir hábito EN-only gradual |
| Advanced (C1/C2) | **English** | Imersão total |

Em conformidade com `language_by_level.md`.

## 3. Lexical Approach (Michael Lewis)

- Priorizar **chunks** (unidades multi-palavra) sobre palavras isoladas
- Cada módulo introduz 30-60 chunks contextualizados
- Ensinar a frase pronta, não o vocabulário avulso

Exemplos de chunks vs palavra:
- "How are you doing?" — não só "doing"
- "I'd like to..." — não só "would"
- "It depends on..." — não só "depend"
- "By the way..." — não só "way"

## 4. AI personas (vozes/avatares)

O app tem **dois avatares** que interpretam todos os NPCs dos role-plays e guided chats:

| Persona | Avatar | Voz (TTS) | Interpreta personagens... |
|---------|--------|-----------|---------------------------|
| **Charlotte** | Mulher, ~28, calorosa, professora-amiga | ElevenLabs Rachel | femininos (Ana, Sarah, Maria) e todos os papéis didáticos puros |
| **Charlie** | Homem, ~30, simpático, parceiro de cena | ElevenLabs (voz masculina a definir) | masculinos (Tom, Lucas) e papéis masculinos sem personagem recorrente (entrevistador, garçom, médico, atendente) |

Toda atividade declara `voiced_by: charlotte | charlie` — escolha pela GENDER do NPC. Se for ambíguo (ex: "the barista"), o autor escolhe.

## 5. Personagens recorrentes

Continuidade ao longo das 336 unidades:

| Personagem | Gênero | Voiced by | Papel | Personalidade |
|------------|--------|-----------|-------|---------------|
| **Ana** | F | charlotte | Melhor amiga do aluno | Brasileira, mora em SP, ama viajar |
| **Tom** | M | charlie | Colega de trabalho | Americano, simpático, gosta de tech |
| **Sarah** | F | charlotte | Amiga no exterior | Mora em NYC, freelancer, direta |
| **Lucas** | M | charlie | Irmão mais novo | Adolescente, gamer, preguiçoso |
| **Maria** | F | charlotte | Chefe / gerente | Profissional, exigente, justa |

Use esses nomes de forma consistente. Quando o aluno chegar no Inter, vai reconhecer cada um.

## 6. Outfits (slugs de assets)

Cada role-play e guided chat declara um `persona_outfit` — slug que mapeia pra uma arte (PNG) do avatar.

**Convenção de slug**: `{personagem|persona_base}_{contexto}` em snake_case.

Personagens recorrentes têm o NOME no slug:
- `ana_cafe_morning`, `ana_casual_weekend`, `ana_office_meeting`
- `tom_office_casual`, `tom_gym_workout`, `tom_party_evening`
- `sarah_home_videocall`, `sarah_nyc_street`, `sarah_freelance_desk`
- `lucas_gaming_room`, `lucas_school_uniform`
- `maria_office_formal`, `maria_meeting_blazer`

NPCs sem personagem recorrente usam a persona base + papel + contexto:
- `charlotte_teacher_classroom`, `charlotte_barista_cafe`, `charlotte_doctor_clinic`
- `charlie_passenger_airport`, `charlie_interviewer_office`, `charlie_waiter_restaurant`, `charlie_salesperson_store`

**Para o MVP**: começamos com 1 outfit base por personagem recorrente + 2 outfits genéricos por persona base (Charlotte/Charlie) e expandimos conforme necessidade.

## 7. Situational anchoring (ancoragem em situação real)

Toda unidade deve amarrar a uma situação REAL. Nunca "pratique gramática solta". Sempre: "use a gramática para fazer X neste contexto".

Exemplos:
- N03 "De onde você é?" → conversando com estranho no portão do aeroporto
- I06 "If I could..." → amigo pedindo conselho de vida
- A11 "Having finished the report..." → polindo abertura de uma TED talk

## 8. Tipos de exercício & cotas

### Grammar
- **Novice & Inter**: 10 exercícios por unidade
- **Advanced**: 5 exercícios por unidade
- **10-pack padrão**: 2×mc + 2×word_bank + 3×fill_gap + 2×fix_error + 1×read_answer
- **5-pack**: 1×mc + 1×word_bank + 1×fill_gap + 1×fix_error + 1×read_answer
- Cada exercício: `type` · `sentence` (ou `passage`+`question`) · `answer` · `options`/`choices`/`hint` · `explanation`
- Explicações em PT-BR (Novice) ou EN (Inter+Adv)

### Listening/Speaking
- **5 frases-modelo** por unidade
- Cada uma com 6–12 palavras
- Usa a gramática-alvo em contexto real
- Charlotte fala (Rachel, ElevenLabs)
- Aluno repete; Azure Speech avalia pronúncia

### Role-play
- 1 cenário por unidade
- Inclui: descrição, fala de abertura da Charlotte, respostas sugeridas, foco de avaliação
- Contagem de turnos:
  - Novice: 4–5 turnos
  - Inter: 5–6 turnos
  - Advanced: 7–8 turnos

### Guided Chat
- 1 diálogo por texto por unidade
- Inclui: cenário, abertura, respostas esperadas, correções gentis da Charlotte embutidas
- Contagem de turnos:
  - Novice: 5–6 turnos
  - Inter: 6–8 turnos
  - Advanced: 8–10 turnos
- Charlotte sempre fecha com recap positivo dos chunks usados

## 9. Proibido

- **SEM emojis** em arquivos de conteúdo (per `feedback_no_emojis.md`)
- **SEM URLs falsas**
- **Português com grafia perfeita** (per `feedback_portuguese_quality.md`)
- Sem clichês ou "tutorial English" — exemplos sempre naturais

## 10. Nomenclatura de arquivos

- Pastas: `novice/`, `inter/`, `advanced/`
- Arquivos: `M{XX}-{kebab-case-slug}.md`
- Slug em English quando possível; PT-BR no Novice quando mais natural

## 11. Estrutura do arquivo de módulo

Ver `TEMPLATE.md` para a estrutura exata.
Ver `novice/M01-ola-mundo.md` para um exemplo completo (gold standard).
