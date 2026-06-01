# Module M15 — O que fiz ontem

> **Level**: Novice (A2)
> **Block**: A2 Block
> **Units**: 5 (N01–N05)
> **Theme**: Passado simples — verbos regulares (-ed)
> **Module goal**: Aluno sai sabendo formar e pronunciar past simple regular (-ed com sons /t/, /d/, /id/) pra contar ações cotidianas passadas.
> **Connects to**: M16 (Histórias simples) — depois de verbos regulares, aprende os irregulares mais comuns.

## Module chunks introduced (~30)

- worked / played / watched / cleaned / called / opened
- studied / cried / tried (y → ied)
- stopped / planned (dobra consoante)
- arrived / lived / liked (e + d)
- pronúncia /t/ (worked, watched), /d/ (played, lived), /id/ (visited, wanted)
- yesterday / last week / X ago
- I worked / She worked (sem -s no passado)

---

## Unit N01 — Trabalhei ontem

> **Sub-CEFR**: A2 | **Grammar focus**: Past simple regular -ed (basic)
> **Markers**: [denso]
> **Real-life context**: Você conta ações simples que fez ontem ou semana passada.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "I _____ yesterday."
   **Options**: worked / work / working
   **Answer**: worked
   **Explanation**: Past simple regular: verbo + ed. "Work" → "worked".

2. **multiple_choice** — "She _____ TV last night."
   **Options**: watched / watch / watches
   **Answer**: watched
   **Explanation**: "Watch" + ed = "watched" (note pronúncia /watcht/, terminação /t/).

3. **word_bank** — "We _____ in the park."
   **Choices**: played / play / playing / plays
   **Answer**: played
   **Explanation**: "Play" → "played". Note: 3ª pessoa não muda no passado ("She played", "He played" — todos com -ed).

4. **word_bank** — "He _____ his car."
   **Choices**: cleaned / clean / cleaning / cleans
   **Answer**: cleaned
   **Explanation**: "Clean" → "cleaned". Verbo regular + ed.

5. **fill_gap** — "I _____ my friend yesterday."
   **Hint**: Passado de "call"
   **Answer**: called
   **Explanation**: "Called" — call + ed. Som /d/.

6. **fill_gap** — "They _____ the door."
   **Hint**: Passado de "open"
   **Answer**: opened
   **Explanation**: "Opened" — open + ed.

7. **fill_gap** — "She _____ a lot last week."
   **Hint**: Passado de "study" (y → ied)
   **Answer**: studied
   **Explanation**: Verbos em -y após consoante: y → ied. "Study" → "studied".

8. **fix_error** — "She worked last night?"
   **Hint**: Past simple question needs auxiliar
   **Answer**: Did she work last night?
   **Explanation**: Past simple pergunta: "Did + sujeito + verbo base". "Did she work?", não "She worked?" (que é afirmativa).

9. **fix_error** — "He studyed English."
   **Hint**: y após consoante vira ied
   **Answer**: He studied English.
   **Explanation**: "Study" → "studied" (y → ied), não "studyed". Regra de spelling.

10. **read_answer**
    **Passage**: "Yesterday I worked all day. Then I watched a movie and called my sister. We played a game online."
    **Question**: What did the speaker watch?
    **Answer**: a movie
    **Explanation**: O texto diz "Then I watched a movie".

### 2. Listening/Speaking (5 phrases)

1. **"I worked yesterday."** — basic -ed past
2. **"She watched a movie."** — 3rd person past
3. **"We played in the park."** — plural past
4. **"He cleaned his room."** — -ed pronunciation /d/
5. **"I studied English last week."** — -ied irregular spelling

### 3. Role-play

**Cenário**: Charlotte pergunta o que você fez ontem usando past simple regular.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 90s
**Opening line**: "What did you do yesterday?"

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer uma ação que você fez ontem (verbo + ed)"
   **label_en**: "Say one thing you did"
   **hidden_prompt**: "user states past action with 'I + verb-ed' (worked, played, watched, etc.)"
   **hint_pt**: "I worked yesterday."
   **hint_en**: "I worked yesterday."

2. **id**: 2
   **label_pt**: "Dizer outra ação"
   **label_en**: "Say another action"
   **hidden_prompt**: "user says another 'I + verb-ed'"
   **hint_pt**: "I watched a movie."
   **hint_en**: "I watched a movie."

3. **id**: 3
   **label_pt**: "Dizer o que alguém fez (3ª pessoa)"
   **label_en**: "Say what someone else did"
   **hidden_prompt**: "user says 'He/She + verb-ed' (no -s in past)"
   **hint_pt**: "She studied for hours."
   **hint_en**: "She studied for hours."

**Closing cue**: Charlotte fecha com "Productive day!" quando obj_3 baterem.

**Suggested flow** (referencial, 6 turnos):

1. **Charlotte**: "What did you do yesterday?"
2. **Student**: ~"I worked yesterday."
3. **Charlotte**: "And after?"
4. **Student**: ~"I watched a movie."
5. **Charlotte**: "Anyone else doing stuff?"
6. **Student**: ~"She studied for hours."
7. **Charlotte**: "Productive day!"

**Evaluation focus**:
- -ed adicionado ao verbo
- Spelling: studied (y→ied)
- Sem -s na 3ª pessoa no passado

### 4. Guided Chat

**Cenário**: Charlotte conversa sobre suas ações de ontem.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "Charlotte explora suas ações de ontem. Pratica verbos regulares no passado."
**Opening message**: "Tell me three things you did yesterday."

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Primeira ação (verb-ed)"
   **label_en**: "First action"
   **hidden_prompt**: "user states 'I + verb-ed'"
   **hint_pt**: "I worked."
   **hint_en**: "I worked."

2. **id**: 2
   **label_pt**: "Segunda ação (verb-ed)"
   **label_en**: "Second action"
   **hidden_prompt**: "user states another 'I + verb-ed'"
   **hint_pt**: "I called my sister."
   **hint_en**: "I called my sister."

3. **id**: 3
   **label_pt**: "Perguntar à Charlotte"
   **label_en**: "Ask Charlotte"
   **hidden_prompt**: "user asks 'How about you?' or 'What did you do?'"
   **hint_pt**: "How about you?"
   **hint_en**: "How about you?"

**Closing cue**: Charlotte encerra com "Yesterday recap done!" quando obj_3 baterem.

**Script** (referencial, 7 turnos):

1. **Charlotte**: "Tell me three things you did yesterday."
2. **Student**: "I worked."
3. **Charlotte**: "And then?"
4. **Student**: "I called my sister."
5. **Charlotte**: "Sweet."
6. **Student**: "How about you?"
7. **Charlotte**: "I cleaned my place. Yesterday recap done!"

> N01 chat = LLM puro.

---

## Unit N02 — Liguei, cheguei, parei

> **Sub-CEFR**: A2 | **Grammar focus**: Past simple regular — spelling rules (e+d, double consonant, y→ied)
> **Markers**: —
> **Real-life context**: Você usa verbos com regras especiais de spelling no passado.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "I _____ the door."
   **Options**: closed / closd / closeed
   **Answer**: closed
   **Explanation**: Verbos terminados em -e mudo: apenas + d. "Close" → "closed", não "closeed".

2. **multiple_choice** — "She _____ at the airport."
   **Options**: arrived / arrive / arrives
   **Answer**: arrived
   **Explanation**: "Arrive" + d = "arrived". Termina em -e, só adiciona -d.

3. **word_bank** — "We _____ the car at the corner."
   **Choices**: stopped / stoped / stops / stopping
   **Answer**: stopped
   **Explanation**: "Stop" dobra o p antes de -ed: "stopped". Regra: consoante-vogal-consoante dobra final.

4. **word_bank** — "He _____ a new job."
   **Choices**: planned / planed / planing / plans
   **Answer**: planned
   **Explanation**: "Plan" dobra o n: "planned". Mesma regra de "stop → stopped".

5. **fill_gap** — "I _____ all morning."
   **Hint**: Passado de "cry" (y após consoante)
   **Answer**: cried
   **Explanation**: "Cry" → "cried" (y → ied). Mesma regra de "try → tried".

6. **fill_gap** — "She _____ to the store."
   **Hint**: Passado de "walk"
   **Answer**: walked
   **Explanation**: "Walk" → "walked" (regular básico).

7. **fill_gap** — "They _____ a great movie."
   **Hint**: Passado de "enjoy"
   **Answer**: enjoyed
   **Explanation**: "Enjoy" → "enjoyed". Verbos em vogal + y mantêm y: "enjoyed", "played", "stayed".

8. **fix_error** — "He stoped the car."
   **Hint**: Stop dobra consoante
   **Answer**: He stopped the car.
   **Explanation**: "Stop" → "stopped" (dobra o p). "Stoped" com 1 p é erro.

9. **fix_error** — "She tryed to call me."
   **Hint**: y após consoante vira ied
   **Answer**: She tried to call me.
   **Explanation**: "Try" → "tried" (y → ied). "Tryed" não existe.

10. **read_answer**
    **Passage**: "I planned a trip last week. I stopped at the bakery and tried a new bread. I enjoyed the day."
    **Question**: What did the speaker try?
    **Answer**: a new bread
    **Explanation**: O texto diz "tried a new bread".

### 2. Listening/Speaking (5 phrases)

1. **"I closed the door."** — e + d
2. **"She arrived late."** — arrive + d
3. **"We stopped at the corner."** — stop + ped
4. **"He planned a trip."** — plan + ned
5. **"I tried it."** — try → tried

### 3. Role-play

**Cenário**: Charlotte pede pra você contar ações usando verbos com spelling especial.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 90s
**Opening line**: "Tell me three actions — try, stop, plan, arrive, close..."

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Usar verbo com -e (e + d)"
   **label_en**: "Use verb with -e (+d)"
   **hidden_prompt**: "user uses verb ending in -e: 'I arrived/closed/lived/liked + ...'"
   **hint_pt**: "I arrived late."
   **hint_en**: "I arrived late."

2. **id**: 2
   **label_pt**: "Usar verbo que dobra consoante (stop, plan, etc.)"
   **label_en**: "Use double-consonant verb"
   **hidden_prompt**: "user uses doubled consonant verb: 'I stopped/planned + ...'"
   **hint_pt**: "I stopped at the store."
   **hint_en**: "I stopped at the store."

3. **id**: 3
   **label_pt**: "Usar verbo y → ied (try, cry, study)"
   **label_en**: "Use y→ied verb"
   **hidden_prompt**: "user uses y→ied verb: 'I tried/cried/studied + ...'"
   **hint_pt**: "I tried a new dish."
   **hint_en**: "I tried a new dish."

**Closing cue**: Charlotte fecha com "All spelling tricks covered!" quando obj_3 baterem.

**Suggested flow** (referencial, 6 turnos):

1. **Charlotte**: "Tell me three actions — try, stop, plan, arrive, close..."
2. **Student**: ~"I arrived late."
3. **Charlotte**: "Doubled consonant?"
4. **Student**: ~"I stopped at the store."
5. **Charlotte**: "y→ied?"
6. **Student**: ~"I tried a new dish."
7. **Charlotte**: "All spelling tricks covered!"

**Evaluation focus**:
- Spelling regular -ed
- Spelling double consonant
- Spelling y→ied

### 4. Guided Chat

**Cenário**: Charlotte conversa sobre ações específicas com spelling especial.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "Charlotte pede ações com spelling especial. Pratica e+d, dobra consoante, y→ied."
**Opening message**: "What did you try last week?"

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer o que você tentou"
   **label_en**: "Say what you tried"
   **hidden_prompt**: "user says 'I tried + noun'"
   **hint_pt**: "I tried sushi."
   **hint_en**: "I tried sushi."

2. **id**: 2
   **label_pt**: "Dizer onde você parou ou planejou"
   **label_en**: "Say where you stopped/planned"
   **hidden_prompt**: "user uses 'I stopped/planned + ...'"
   **hint_pt**: "I stopped at the market."
   **hint_en**: "I stopped at the market."

3. **id**: 3
   **label_pt**: "Perguntar à Charlotte"
   **label_en**: "Ask Charlotte"
   **hidden_prompt**: "user asks 'How about you?' or 'What did you try?'"
   **hint_pt**: "How about you?"
   **hint_en**: "How about you?"

**Closing cue**: Charlotte encerra com "Spelled it right!" quando obj_3 baterem.

**Script** (referencial, 7 turnos):

1. **Charlotte**: "What did you try last week?"
2. **Student**: "I tried sushi."
3. **Charlotte**: "Nice!"
4. **Student**: "I stopped at the market."
5. **Charlotte**: "Productive."
6. **Student**: "How about you?"
7. **Charlotte**: "I tried yoga. Spelled it right!"

> N02 chat = LLM puro.

---

## Unit N03 — Quando isso aconteceu?

> **Sub-CEFR**: A2 | **Grammar focus**: Past simple regular with time markers
> **Markers**: —
> **Real-life context**: Você ancora ações passadas em pontos específicos do tempo.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "I _____ the gym last night."
   **Options**: visited / visit / visiting
   **Answer**: visited
   **Explanation**: "Visit" → "visited". Note: pronúncia /id/ (visit-id).

2. **multiple_choice** — "We _____ home at six."
   **Options**: returned / return / returns
   **Answer**: returned
   **Explanation**: "Return" → "returned". Past simple regular.

3. **word_bank** — "She _____ the bus this morning."
   **Choices**: missed / miss / misses / missing
   **Answer**: missed
   **Explanation**: "Miss" → "missed". Past regular.

4. **word_bank** — "He _____ his report."
   **Choices**: finished / finish / finishs / finishing
   **Answer**: finished
   **Explanation**: "Finish" → "finished". Pronúncia /t/ (após sons surdos).

5. **fill_gap** — "I _____ a great song yesterday."
   **Hint**: Passado de "discover"
   **Answer**: discovered
   **Explanation**: "Discover" → "discovered". Regular -ed.

6. **fill_gap** — "She _____ a beautiful painting."
   **Hint**: Passado de "paint"
   **Answer**: painted
   **Explanation**: "Paint" → "painted". Pronúncia /id/ (verbos terminados em -t ou -d).

7. **fill_gap** — "We _____ the lights at midnight."
   **Hint**: Passado de "turn off"
   **Answer**: turned off
   **Explanation**: Phrasal verb: "turn off" → "turned off". Passado + partícula.

8. **fix_error** — "I worked yesterday last week."
   **Hint**: Dois time markers iguais
   **Answer**: I worked yesterday.
   **Explanation**: Não combina "yesterday" + "last week" — escolha um. Yesterday = ontem; last week = semana passada.

9. **fix_error** — "He visit me last week."
   **Hint**: Verbo precisa de -ed no passado
   **Answer**: He visited me last week.
   **Explanation**: "Visit" no passado é "visited". Sem -ed seria present simple.

10. **read_answer**
    **Passage**: "I visited my grandparents last weekend. We talked for hours. Then we cooked together and laughed a lot."
    **Question**: When did the speaker visit grandparents?
    **Answer**: last weekend
    **Explanation**: O texto diz "last weekend".

### 2. Listening/Speaking (5 phrases)

1. **"I visited the gym last night."** — visit
2. **"She missed the bus."** — miss
3. **"We returned home at six."** — return
4. **"He finished his report."** — finish
5. **"They painted the house."** — paint /id/

### 3. Role-play

**Cenário**: Charlotte quer detalhes de quando as ações aconteceram.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 90s
**Opening line**: "Three actions and when — go!"

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer uma ação + 'yesterday'"
   **label_en**: "Say action + yesterday"
   **hidden_prompt**: "user uses 'I + verb-ed + yesterday'"
   **hint_pt**: "I visited my friend yesterday."
   **hint_en**: "I visited my friend yesterday."

2. **id**: 2
   **label_pt**: "Dizer ação + 'last week'"
   **label_en**: "Say action + last week"
   **hidden_prompt**: "user uses 'I + verb-ed + last week/month'"
   **hint_pt**: "I traveled last week."
   **hint_en**: "I traveled last week."

3. **id**: 3
   **label_pt**: "Dizer ação + 'ago'"
   **label_en**: "Say action + ago"
   **hidden_prompt**: "user uses 'I + verb-ed + X ago'"
   **hint_pt**: "I called her two days ago."
   **hint_en**: "I called her two days ago."

**Closing cue**: Charlotte fecha com "Time-anchored!" quando obj_3 baterem.

**Suggested flow** (referencial, 6 turnos):

1. **Charlotte**: "Three actions and when — go!"
2. **Student**: ~"I visited my friend yesterday."
3. **Charlotte**: "Last week?"
4. **Student**: ~"I traveled last week."
5. **Charlotte**: "Two days ago?"
6. **Student**: ~"I called her two days ago."
7. **Charlotte**: "Time-anchored!"

**Evaluation focus**:
- Verb-ed correto
- Time marker no fim
- Concordância sem -s

### 4. Guided Chat

**Cenário**: Charlotte conversa sobre eventos recentes da sua vida.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "Charlotte explora ações recentes. Pratica verb-ed + time markers."
**Opening message**: "What did you do last weekend?"

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer o que fez no fim de semana"
   **label_en**: "Say what you did last weekend"
   **hidden_prompt**: "user uses 'I + verb-ed + last weekend'"
   **hint_pt**: "I visited my parents last weekend."
   **hint_en**: "I visited my parents last weekend."

2. **id**: 2
   **label_pt**: "Dizer outra ação recente"
   **label_en**: "Say another recent action"
   **hidden_prompt**: "user uses another past action with time marker"
   **hint_pt**: "I cleaned my house yesterday."
   **hint_en**: "I cleaned my house yesterday."

3. **id**: 3
   **label_pt**: "Perguntar à Charlotte"
   **label_en**: "Ask Charlotte"
   **hidden_prompt**: "user asks 'How about you?'"
   **hint_pt**: "How about you?"
   **hint_en**: "How about you?"

**Closing cue**: Charlotte encerra com "Past activities mapped!" quando obj_3 baterem.

**Script** (referencial, 7 turnos):

1. **Charlotte**: "What did you do last weekend?"
2. **Student**: "I visited my parents last weekend."
3. **Charlotte**: "Sweet."
4. **Student**: "I cleaned my house yesterday."
5. **Charlotte**: "Productive."
6. **Student**: "How about you?"
7. **Charlotte**: "I traveled to NYC. Past activities mapped!"

> N03 chat = LLM puro.

---

## Unit N04 — Pronúncia do -ed

> **Sub-CEFR**: A2 | **Grammar focus**: -ed pronunciation rules (/t/, /d/, /id/)
> **Markers**: —
> **Real-life context**: Você pronuncia -ed corretamente — /t/, /d/, /id/ — em diferentes verbos.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "How is 'worked' pronounced?"
   **Options**: /workt/ / /workd/ / /workid/
   **Answer**: /workt/
   **Explanation**: Após som SURDO (k, p, s, f, sh, ch), -ed soa /t/. "Worked" = /workt/.

2. **multiple_choice** — "How is 'played' pronounced?"
   **Options**: /playd/ / /playt/ / /playid/
   **Answer**: /playd/
   **Explanation**: Após som SONORO (vogais, l, n, m, r, g), -ed soa /d/. "Played" = /playd/.

3. **word_bank** — "Which is /id/? 'visited' / 'walked' / 'played' / 'closed'"
   **Choices**: visited / walked / played / closed
   **Answer**: visited
   **Explanation**: Após /t/ ou /d/, -ed soa /id/ (extra syllable). "Visit-ed" = /vIz-It-Id/.

4. **word_bank** — "Which is /t/? 'finished' / 'lived' / 'arrived' / 'opened'"
   **Choices**: finished / lived / arrived / opened
   **Answer**: finished
   **Explanation**: "Finished" termina em /sh/ (surdo) → /t/. "Finish-t" = /fIn-Isht/.

5. **fill_gap** — "'Worked' sounds like /work_/."
   **Hint**: Som após consoante surda
   **Answer**: t
   **Explanation**: /k/ é surdo → -ed soa /t/. "Worked" = /workt/.

6. **fill_gap** — "'Played' sounds like /play_/."
   **Hint**: Som após vogal/sonora
   **Answer**: d
   **Explanation**: /eɪ/ (vogal) é sonoro → -ed soa /d/. "Played" = /pleId/.

7. **fill_gap** — "'Wanted' sounds like /want_d/."
   **Hint**: Som após /t/ ou /d/
   **Answer**: i
**Accepts**: id
   **Explanation**: Verbo termina em /t/ → -ed soa /id/, criando sílaba extra: "want-Id" = /wAnt-Id/.

8. **fix_error** — "I pronounced 'visited' as /vIzId/."
   **Hint**: -ed após /t/ pede sílaba extra
   **Answer**: I pronounced 'visited' as /vIz-Itid/.
   **Explanation**: "Visited" tem 3 sílabas: vis-it-ed (/vIz-It-Id/). O -ed forma sílaba extra após /t/ ou /d/.

9. **fix_error** — "I said 'worked' with /id/."
   **Hint**: Verbos em som surdo (k, p, s, etc.) usam /t/
   **Answer**: I said 'worked' with /t/.
   **Explanation**: "Worked" tem som /k/ (surdo) → -ed = /t/. Não /id/. Pronuncia /workt/, uma sílaba.

10. **read_answer**
    **Passage**: "Yesterday I worked /workt/, watched /watcht/ a movie, and called /kAld/ my friend. Then I visited /vIzItId/ my parents."
    **Question**: Which verb has the /id/ sound?
    **Answer**: visited
    **Explanation**: "Visited" termina em /id/ (3 sílabas). Os outros são /t/ ou /d/ (2 sílabas).

### 2. Listening/Speaking (5 phrases)

1. **"I worked yesterday."** — /t/ sound (work)
2. **"She played in the park."** — /d/ sound (play)
3. **"He visited his uncle."** — /id/ sound (visit)
4. **"They watched TV all night."** — /t/ (watch)
5. **"I painted the wall."** — /id/ (paint)

### 3. Role-play

**Cenário**: Charlotte pratica pronúncia de -ed com você.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 90s
**Opening line**: "Let's practice -ed sounds. Say a verb with /t/."

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Falar um verbo com som /t/"
   **label_en**: "Say a /t/ verb"
   **hidden_prompt**: "user says a past tense verb ending in voiceless consonant (worked, watched, finished, asked, etc.)"
   **hint_pt**: "I worked."
   **hint_en**: "I worked."

2. **id**: 2
   **label_pt**: "Falar um verbo com som /d/"
   **label_en**: "Say a /d/ verb"
   **hidden_prompt**: "user says a past tense verb ending in voiced sound (played, lived, called, opened, etc.)"
   **hint_pt**: "I played soccer."
   **hint_en**: "I played soccer."

3. **id**: 3
   **label_pt**: "Falar um verbo com som /id/"
   **label_en**: "Say a /id/ verb"
   **hidden_prompt**: "user says a past tense verb ending in /id/ (visited, painted, wanted, started, ended)"
   **hint_pt**: "I visited my friend."
   **hint_en**: "I visited my friend."

**Closing cue**: Charlotte fecha com "All three sounds covered!" quando obj_3 baterem.

**Suggested flow** (referencial, 6 turnos):

1. **Charlotte**: "Let's practice -ed sounds. Say a verb with /t/."
2. **Student**: ~"I worked."
3. **Charlotte**: "Now /d/."
4. **Student**: ~"I played soccer."
5. **Charlotte**: "And /id/?"
6. **Student**: ~"I visited my friend."
7. **Charlotte**: "All three sounds covered!"

**Evaluation focus**:
- Pronúncia correta dos 3 sons -ed
- Diferenciação clara
- Sílaba extra em /id/

### 4. Guided Chat

**Cenário**: Charlotte conversa sobre o último fim de semana.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "Charlotte abre chat sobre o último fim de semana. Pratica pronúncia mental dos sons -ed."
**Opening message**: "What did you do last weekend?"

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer ação principal"
   **label_en**: "Say main action"
   **hidden_prompt**: "user states past action with -ed verb"
   **hint_pt**: "I visited friends."
   **hint_en**: "I visited friends."

2. **id**: 2
   **label_pt**: "Dizer outra ação"
   **label_en**: "Say another action"
   **hidden_prompt**: "user states another -ed past action"
   **hint_pt**: "We watched a movie."
   **hint_en**: "We watched a movie."

3. **id**: 3
   **label_pt**: "Perguntar à Charlotte"
   **label_en**: "Ask Charlotte"
   **hidden_prompt**: "user asks 'How about you?'"
   **hint_pt**: "How about you?"
   **hint_en**: "How about you?"

**Closing cue**: Charlotte encerra com "Weekend done!" quando obj_3 baterem.

**Script** (referencial, 7 turnos):

1. **Charlotte**: "What did you do last weekend?"
2. **Student**: "I visited friends."
3. **Charlotte**: "Cool."
4. **Student**: "We watched a movie."
5. **Charlotte**: "Which one?"
6. **Student**: "How about you?"
7. **Charlotte**: "I painted my kitchen. Weekend done!"

> N04 chat = LLM puro.

---

## Unit N05 — Meu dia ontem

> **Sub-CEFR**: A2 | **Grammar focus**: Integration past simple regular
> **Markers**: —
> **Real-life context**: Você narra um dia completo passado usando verbos regulares.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "I _____ at six yesterday."
   **Options**: started / start / starts
   **Answer**: started
   **Explanation**: "Start" → "started" (regular -ed). Past simple.

2. **multiple_choice** — "She _____ a lot last night."
   **Options**: cooked / cook / cooks
   **Answer**: cooked
   **Explanation**: "Cook" → "cooked" (regular).

3. **word_bank** — "We _____ dinner at eight."
   **Choices**: finished / finish / finishs / finishing
   **Answer**: finished
   **Explanation**: "Finish" → "finished" (-sh + ed).

4. **word_bank** — "He _____ the door at nine."
   **Choices**: locked / lock / locks / locking
   **Answer**: locked
   **Explanation**: "Lock" → "locked". Past regular.

5. **fill_gap** — "I _____ my room yesterday."
   **Hint**: Passado de "clean"
   **Answer**: cleaned
   **Explanation**: "Cleaned" — clean + ed.

6. **fill_gap** — "She _____ for the test all week."
   **Hint**: Passado de "study"
   **Answer**: studied
   **Explanation**: "Studied" — y → ied.

7. **fill_gap** — "They _____ at the party."
   **Hint**: Passado de "arrive"
   **Answer**: arrived
   **Explanation**: "Arrived" — arrive + d (e mudo + d).

8. **fix_error** — "I cooked breakfast and watch TV."
   **Hint**: Concordância de tempos
   **Answer**: I cooked breakfast and watched TV.
   **Explanation**: Frase no passado, ambos verbos no passado. "Watched" também.

9. **fix_error** — "She workd late."
   **Hint**: Spelling de work no passado
   **Answer**: She worked late.
   **Explanation**: "Worked" — work + ed. "Workd" sem o e é erro de spelling.

10. **read_answer**
    **Passage**: "I started work at eight. I worked all morning. At noon I called my friend. We talked for an hour. Then I returned to my desk."
    **Question**: What time did the speaker start work?
    **Answer**: eight
    **Explanation**: O texto diz "I started work at eight".

### 2. Listening/Speaking (5 phrases)

1. **"I started work at eight."** — start
2. **"She cooked dinner."** — cook
3. **"We finished at nine."** — finish
4. **"He cleaned the kitchen."** — clean
5. **"They arrived early."** — arrive

### 3. Role-play

**Cenário**: Charlotte pede pra você narrar três coisas que fez ontem.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 90s
**Opening line**: "Walk me through yesterday — three actions."

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Primeira ação de ontem"
   **label_en**: "First action yesterday"
   **hidden_prompt**: "user states 'I + verb-ed + (time)' for morning/start"
   **hint_pt**: "I worked all morning."
   **hint_en**: "I worked all morning."

2. **id**: 2
   **label_pt**: "Segunda ação"
   **label_en**: "Second action"
   **hidden_prompt**: "user states another 'I + verb-ed' for afternoon/middle"
   **hint_pt**: "I called my mother."
   **hint_en**: "I called my mother."

3. **id**: 3
   **label_pt**: "Terceira ação"
   **label_en**: "Third action"
   **hidden_prompt**: "user states another 'I + verb-ed' for evening/end"
   **hint_pt**: "I cooked dinner."
   **hint_en**: "I cooked dinner."

**Closing cue**: Charlotte fecha com "Full day captured!" quando obj_3 baterem.

**Suggested flow** (referencial, 6 turnos):

1. **Charlotte**: "Walk me through yesterday — three actions."
2. **Student**: ~"I worked all morning."
3. **Charlotte**: "Lunch?"
4. **Student**: ~"I called my mother."
5. **Charlotte**: "Evening?"
6. **Student**: ~"I cooked dinner."
7. **Charlotte**: "Full day captured!"

**Evaluation focus**:
- Sequência narrativa
- -ed em todos os verbos
- Variedade de ações

### 4. Guided Chat

**Cenário**: Charlotte conversa sobre o que cada uma fez de ontem.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "Charlotte abre chat sobre ontem. Integra past simple regular completo."
**Opening message**: "Quick recap — what did you do yesterday?"

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer ação do começo do dia"
   **label_en**: "Say morning action"
   **hidden_prompt**: "user uses 'I + verb-ed' for morning action"
   **hint_pt**: "I worked."
   **hint_en**: "I worked."

2. **id**: 2
   **label_pt**: "Dizer ação à tarde/noite"
   **label_en**: "Say afternoon/evening action"
   **hidden_prompt**: "user uses another 'I + verb-ed'"
   **hint_pt**: "I watched a movie."
   **hint_en**: "I watched a movie."

3. **id**: 3
   **label_pt**: "Perguntar à Charlotte"
   **label_en**: "Ask Charlotte"
   **hidden_prompt**: "user asks 'How about you?'"
   **hint_pt**: "How about you?"
   **hint_en**: "How about you?"

**Closing cue**: Charlotte encerra com "Yesterday on the books!" quando obj_3 baterem.

**Script** (referencial, 7 turnos):

1. **Charlotte**: "Quick recap — what did you do yesterday?"
2. **Student**: "I worked."
3. **Charlotte**: "Long day?"
4. **Student**: "I watched a movie."
5. **Charlotte**: "Which one?"
6. **Student**: "How about you?"
7. **Charlotte**: "Cooked and studied. Yesterday on the books!"

> N05 chat = LLM puro.

---

## Cross-unit consolidation

Ao terminar M15, o aluno deve usar naturalmente:
- Past simple regular: verb + ed (worked, watched, cleaned)
- Spelling rules: e + d (arrived), dobra consoante (stopped), y → ied (studied)
- Pronúncia: /t/ (worked), /d/ (played), /id/ (visited)
- Time markers: yesterday, last week, ago, in YEAR
- Sem -s na 3ª pessoa no passado (she worked, não she workeds)

Esses chunks abrem M16 (Histórias simples) com verbos irregulares mais comuns.
