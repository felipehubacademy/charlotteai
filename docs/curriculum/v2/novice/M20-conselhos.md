# Module M20 — Conselhos

> **Level**: Novice (A2)
> **Block**: A2 Block
> **Units**: 5 (N01–N05)
> **Theme**: Should/shouldn't + have to/don't have to
> **Module goal**: Aluno sai sabendo dar conselhos com should/shouldn't e falar de obrigações com have to/don't have to.
> **Connects to**: M21 (Se isso, então aquilo) — depois de conselhos, aprende condicionais reais.

## Module chunks introduced (~25)

- You should / She should / He should
- You shouldn't / She shouldn't
- I should + base / She should + base
- Should I...? / Should she...?
- I have to / You have to / She has to
- I don't have to / She doesn't have to
- Do I have to...? / Does she have to...?
- You should see a doctor / You should study more
- I have to work / She has to leave
- need to / don't need to

---

## Unit N01 — Você deveria descansar

> **Sub-CEFR**: A2 | **Grammar focus**: Should/shouldn't for advice | **Tense**: MODAL · should
> **Markers**: —
> **Real-life context**: Você dá e recebe conselhos sobre saúde, estudo, vida.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "You _____ see a doctor."
   **Options**: should / shouldn't / will
   **Answer**: should
   **Explanation**: "Should" = deveria. Aconselhamento positivo: "You should see a doctor".

2. **multiple_choice** — "She _____ work so much."
   **Options**: shouldn't / wouldn't / didn't
   **Answer**: shouldn't
   **Explanation**: "Shouldn't / Should not" = não deveria. Aconselhamento negativo.

3. **word_bank** — "We _____ help her."
   **Choices**: should / are / do / will
   **Answer**: should
   **Explanation**: "We should help" = nós deveríamos ajudar.

4. **word_bank** — "He _____ eat junk food."
   **Choices**: shouldn't / can't / doesn't / didn't
   **Answer**: shouldn't
   **Explanation**: "He shouldn't / should not eat junk food" = ele não deveria.

5. **fill_gap** — "You _____ study more."
   **Hint**: Conselho positivo
   **Answer**: should
   **Explanation**: "You should study" = você deveria estudar.

6. **fill_gap** — "She _____ stay up late."
   **Hint**: Conselho negativo
   **Answer**: shouldn't
   **Explanation**: "She shouldn't / should not stay up late" = ela não deveria ficar acordada.

7. **fill_gap** — "I think you _____ try yoga."
   **Hint**: Conselho com "I think"
   **Answer**: should
   **Explanation**: "I think you should try" = acho que você deveria tentar.

8. **fix_error** — "She shoulds rest."
   **Hint**: Should não muda na 3ª pessoa
   **Answer**: She should rest.
   **Explanation**: Modal "should" não leva -s na 3ª pessoa. "She should", não "She shoulds".

9. **fix_error** — "You should to see a doctor."
   **Hint**: Sem "to" após should
   **Answer**: You should see a doctor.
   **Explanation**: Modal + base, sem "to": "should see", não "should to see".

10. **read_answer**
    **Passage**: "I think you should rest more. You shouldn't work so late. We should all take breaks."
    **Question**: O que a pessoa não deveria fazer?
    **Answer**: work so late
    **Accepts**: work late
    **Explanation**: O texto diz "You shouldn't / should not work so late".

### 2. Listening/Speaking (5 phrases)

1. **"You should see a doctor."** — health advice
2. **"She shouldn't work so much."** — negative advice
3. **"We should help her."** — group advice
4. **"You should study more."** — study advice
5. **"He shouldn't eat junk food."** — diet advice

### 3. Role-play

**Cenário**: Charlotte conta um problema — você dá conselho.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 90s
**Opening line**: "I'm tired and stressed. What should I do?"

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Dar conselho positivo (should)"
   **label_en**: "Give positive advice (should)"
   **hidden_prompt**: "user gives advice with 'You should + base'"
   **hint_pt**: "You should rest."
   **hint_en**: "You should rest."

2. **id**: 2
   **label_pt**: "Dar conselho negativo (shouldn't)"
   **label_en**: "Give negative advice (shouldn't)"
   **hidden_prompt**: "user advises against with 'You shouldn't + base'"
   **hint_pt**: "You shouldn't work so much."
   **hint_en**: "You shouldn't work so much."

3. **id**: 3
   **label_pt**: "Mais um conselho"
   **label_en**: "One more advice"
   **hidden_prompt**: "user gives another advice with should/shouldn't"
   **hint_pt**: "You should take a vacation."
   **hint_en**: "You should take a vacation."

**Closing cue**: Charlotte fecha com "Wise advice!" quando obj_3 baterem.

**Suggested flow** (referencial, 6 turnos):

1. **Charlotte**: "I'm tired and stressed. What should I do?"
2. **Student**: ~"You should rest."
3. **Charlotte**: "I have a lot of work though."
4. **Student**: ~"You shouldn't work so much."
5. **Charlotte**: "Anything else?"
6. **Student**: ~"You should take a vacation."
7. **Charlotte**: "Wise advice!"

**Evaluation focus**:
- Should + base (sem to)
- Shouldn't pra negativo
- Sem -s na 3ª pessoa

### 4. Guided Chat

**Cenário**: Charlotte pede conselho de saúde/estudo/vida.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "Charlotte abre chat pedindo conselho. Pratica should/shouldn't."
**Opening message**: "I want to learn English faster. Any advice?"

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Dar conselho positivo"
   **label_en**: "Give positive advice"
   **hidden_prompt**: "user uses 'You should + base'"
   **hint_pt**: "You should practice every day."
   **hint_en**: "You should practice every day."

2. **id**: 2
   **label_pt**: "Dar conselho negativo"
   **label_en**: "Give negative advice"
   **hidden_prompt**: "user uses 'You shouldn't + base'"
   **hint_pt**: "You shouldn't translate everything."
   **hint_en**: "You shouldn't translate everything."

3. **id**: 3
   **label_pt**: "Perguntar à Charlotte se ela tem outras dicas"
   **label_en**: "Ask Charlotte for more tips"
   **hidden_prompt**: "user asks 'What should I + base?' or 'Any other tips?'"
   **hint_pt**: "What should I do too?"
   **hint_en**: "What should I do too?"

**Closing cue**: Charlotte encerra com "Great advice exchange!" quando obj_3 baterem.

**Script** (referencial, 7 turnos):

1. **Charlotte**: "I want to learn English faster. Any advice?"
2. **Student**: "You should practice every day."
3. **Charlotte**: "Good. Anything to avoid?"
4. **Student**: "You shouldn't translate everything."
5. **Charlotte**: "Smart!"
6. **Student**: "What should I do too?"
7. **Charlotte**: "Talk to natives! Great advice exchange!"

> N01 chat = LLM puro.

---

## Unit N02 — Tenho que trabalhar

> **Sub-CEFR**: A2 | **Grammar focus**: Have to / has to (obrigação) | **Tense**: MODAL · have to
> **Markers**: [denso]
> **Real-life context**: Você fala de obrigações no trabalho, escola, casa.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "I _____ work tomorrow."
   **Options**: have to / has to / am to
   **Answer**: have to
   **Explanation**: "Have to" pra obrigação. Com I/you/we/they: "have to + base".

2. **multiple_choice** — "She _____ leave early."
   **Options**: has to / have to / is to
   **Answer**: has to
   **Explanation**: "She has to" — 3ª pessoa usa "has to". Mesmo padrão do present simple.

3. **word_bank** — "We _____ study for the exam."
   **Choices**: have to / has to / are to / will
   **Answer**: have to
   **Explanation**: "We have to" — plural usa "have to".

4. **word_bank** — "He _____ go to the doctor."
   **Choices**: has to / have to / had to / is to
   **Answer**: has to
   **Explanation**: He → "has to". 3ª pessoa singular.

5. **fill_gap** — "I _____ finish this report."
   **Hint**: Obrigação com I
   **Answer**: have to
   **Explanation**: "I have to finish" — obrigação.

6. **fill_gap** — "Lucas _____ wear a uniform."
   **Hint**: Obrigação com nome (he)
   **Answer**: has to
   **Explanation**: Lucas = he → "has to".

7. **fill_gap** — "They _____ wake up early."
   **Hint**: Obrigação plural
   **Answer**: have to
   **Explanation**: "They have to" — plural.

8. **fix_error** — "She have to work late."
   **Hint**: 3ª pessoa
   **Answer**: She has to work late.
   **Explanation**: She → "has to", não "have to". 3ª pessoa singular.

9. **fix_error** — "I has to study."
   **Hint**: I não usa "has"
   **Answer**: I have to study.
   **Explanation**: Com I sempre "have", não "has".

10. **read_answer**
    **Passage**: "I have to work tomorrow. My sister has to study for an exam. We all have to wake up early."
    **Question**: O que a irmã tem que fazer?
    **Answer**: study
    **Accepts**: study for an exam
    **Explanation**: O texto diz "My sister has to study for an exam".

### 2. Listening/Speaking (5 phrases)

1. **"I have to work tomorrow."** — own obligation
2. **"She has to leave early."** — 3rd person
3. **"We have to study."** — plural
4. **"He has to go to the doctor."** — 3rd
5. **"They have to wake up early."** — plural

### 3. Role-play

**Cenário**: Charlotte pergunta o que você tem que fazer essa semana.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 90s
**Opening line**: "What do you have to do this week?"

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer uma obrigação sua"
   **label_en**: "Say one obligation"
   **hidden_prompt**: "user states obligation with 'I have to + base'"
   **hint_pt**: "I have to work."
   **hint_en**: "I have to work."

2. **id**: 2
   **label_pt**: "Outra obrigação"
   **label_en**: "Another obligation"
   **hidden_prompt**: "user uses another 'I have to + base'"
   **hint_pt**: "I have to finish a report."
   **hint_en**: "I have to finish a report."

3. **id**: 3
   **label_pt**: "Obrigação de alguém da família (has to)"
   **label_en**: "Family member's obligation"
   **hidden_prompt**: "user uses 'He/She has to + base'"
   **hint_pt**: "My sister has to study."
   **hint_en**: "My sister has to study."

**Closing cue**: Charlotte fecha com "Busy week!" quando obj_3 baterem.

**Suggested flow** (referencial, 6 turnos):

1. **Charlotte**: "What do you have to do this week?"
2. **Student**: ~"I have to work."
3. **Charlotte**: "And?"
4. **Student**: ~"I have to finish a report."
5. **Charlotte**: "Anyone else?"
6. **Student**: ~"My sister has to study."
7. **Charlotte**: "Busy week!"

**Evaluation focus**:
- have to / has to por pessoa
- Verbo base após to
- Sem -s no verbo principal

### 4. Guided Chat

**Cenário**: Charlotte conversa sobre cronograma de obrigações.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "Charlotte abre chat sobre obrigações da semana. Pratica have to / has to."
**Opening message**: "What do you have to do today?"

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer obrigação"
   **label_en**: "Say obligation"
   **hidden_prompt**: "user uses 'I have to + base'"
   **hint_pt**: "I have to clean my room."
   **hint_en**: "I have to clean my room."

2. **id**: 2
   **label_pt**: "Outra obrigação"
   **label_en**: "Another obligation"
   **hidden_prompt**: "user uses another 'I have to + base'"
   **hint_pt**: "I have to cook dinner."
   **hint_en**: "I have to cook dinner."

3. **id**: 3
   **label_pt**: "Perguntar à Charlotte"
   **label_en**: "Ask Charlotte"
   **hidden_prompt**: "user asks 'How about you?'"
   **hint_pt**: "How about you?"
   **hint_en**: "How about you?"

**Closing cue**: Charlotte encerra com "Long to-do list!" quando obj_3 baterem.

**Script** (referencial, 7 turnos):

1. **Charlotte**: "What do you have to do today?"
2. **Student**: "I have to clean my room."
3. **Charlotte**: "Then?"
4. **Student**: "I have to cook dinner."
5. **Charlotte**: "Productive."
6. **Student**: "How about you?"
7. **Charlotte**: "I have to teach three classes. Long to-do list!"

> N02 chat = LLM puro.

---

## Unit N03 — Não preciso fazer isso

> **Sub-CEFR**: A2 | **Grammar focus**: Don't have to / doesn't have to (absence of obligation) | **Tense**: MODAL · have to · negative
> **Markers**: —
> **Real-life context**: Você esclarece que algo é OPCIONAL — não é obrigado a fazer.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "I _____ have to work on Sundays."
   **Options**: don't / doesn't / wasn't
   **Answer**: don't
   **Explanation**: Negativa: "don't / do not have to" = não precisa. Com I/you/we/they.

2. **multiple_choice** — "She _____ have to come."
   **Options**: doesn't / don't / wasn't
   **Answer**: doesn't
   **Explanation**: 3ª pessoa: "doesn't / does not have to".

3. **word_bank** — "We _____ have to pay anything."
   **Choices**: don't / doesn't / aren't / isn't
   **Answer**: don't
   **Explanation**: "We don't / do not have to" — plural.

4. **word_bank** — "He _____ have to wear a tie."
   **Choices**: doesn't / don't / isn't / can't
   **Answer**: doesn't
   **Explanation**: "He doesn't / does not have to" — 3ª pessoa.

5. **fill_gap** — "I _____ have to study tonight."
   **Hint**: Negativa de "have to" com I
   **Answer**: don't
   **Explanation**: "I don't / do not have to" — ausência de obrigação.

6. **fill_gap** — "She _____ have to wake up early."
   **Hint**: Negativa de "has to"
   **Answer**: doesn't
   **Explanation**: "She doesn't / does not have to" — 3ª pessoa.

7. **fill_gap** — "You _____ have to come if you don't want."
   **Hint**: Negativa do "have to"
   **Answer**: don't
   **Explanation**: "You don't / do not have to come" — opcional.

8. **fix_error** — "She don't have to work."
   **Hint**: 3ª pessoa usa "doesn't"
   **Answer**: She doesn't have to work.
   **Explanation**: She → "doesn't / does not", não "don't / do not".

9. **fix_error** — "I doesn't have to go."
   **Hint**: I usa "don't"
   **Answer**: I don't have to go.
   **Explanation**: Com I sempre "don't / do not", não "doesn't / does not".

10. **read_answer**
    **Passage**: "I don't have to work tomorrow — it's my day off. She doesn't have to come if she's busy. We don't have to do anything special."
    **Question**: Por que o narrador não precisa trabalhar amanhã?
    **Answer**: it's my day off
    **Accepts**: day off
    **Explanation**: O texto diz "it's / it is my day off".

### 2. Listening/Speaking (5 phrases)

1. **"I don't have to work on Sundays."** — own absence
2. **"She doesn't have to come."** — 3rd person absence
3. **"We don't have to pay."** — plural absence
4. **"He doesn't have to wear a tie."** — 3rd
5. **"You don't have to come if you don't want."** — invitation flexibility

### 3. Role-play

**Cenário**: Charlotte assume coisas que você tem que fazer — você esclarece quando é opcional.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 90s
**Opening line**: "I bet you have to work on Sundays!"

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Esclarecer que NÃO precisa (I don't have to)"
   **label_en**: "Clarify you don't have to"
   **hidden_prompt**: "user uses 'I don't have to + base'"
   **hint_pt**: "No, I don't have to work."
   **hint_en**: "No, I don't have to work."

2. **id**: 2
   **label_pt**: "Outra coisa que não precisa fazer"
   **label_en**: "Another thing you don't have to do"
   **hidden_prompt**: "user uses another 'I don't have to + base'"
   **hint_pt**: "I don't have to wake up early."
   **hint_en**: "I don't have to wake up early."

3. **id**: 3
   **label_pt**: "Alguém da família que não precisa"
   **label_en**: "Family member's absence"
   **hidden_prompt**: "user uses 'He/She doesn't have to + base'"
   **hint_pt**: "My sister doesn't have to come."
   **hint_en**: "My sister doesn't have to come."

**Closing cue**: Charlotte fecha com "Freedom acknowledged!" quando obj_3 baterem.

**Suggested flow** (referencial, 6 turnos):

1. **Charlotte**: "I bet you have to work on Sundays!"
2. **Student**: ~"No, I don't have to work."
3. **Charlotte**: "Wake up early though?"
4. **Student**: ~"I don't have to wake up early."
5. **Charlotte**: "Family obligations?"
6. **Student**: ~"My sister doesn't have to come."
7. **Charlotte**: "Freedom acknowledged!"

**Evaluation focus**:
- don't / doesn't have to
- Sem "haven't to"
- 3ª pessoa correta

### 4. Guided Chat

**Cenário**: Charlotte conversa sobre o que é opcional na sua vida.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "Charlotte explora o que é opcional. Pratica don't have to / doesn't have to."
**Opening message**: "What don't you have to do on weekends?"

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Algo que você não precisa fazer"
   **label_en**: "Something you don't have to do"
   **hidden_prompt**: "user uses 'I don't have to + base'"
   **hint_pt**: "I don't have to set alarms."
   **hint_en**: "I don't have to set alarms."

2. **id**: 2
   **label_pt**: "Outra coisa opcional"
   **label_en**: "Another optional thing"
   **hidden_prompt**: "user uses another 'I don't have to'"
   **hint_pt**: "I don't have to cook."
   **hint_en**: "I don't have to cook."

3. **id**: 3
   **label_pt**: "Perguntar à Charlotte"
   **label_en**: "Ask Charlotte"
   **hidden_prompt**: "user asks 'How about you?'"
   **hint_pt**: "How about you?"
   **hint_en**: "How about you?"

**Closing cue**: Charlotte encerra com "Weekend freedom!" quando obj_3 baterem.

**Script** (referencial, 7 turnos):

1. **Charlotte**: "What don't you have to do on weekends?"
2. **Student**: "I don't have to set alarms."
3. **Charlotte**: "Heaven!"
4. **Student**: "I don't have to cook."
5. **Charlotte**: "Order in!"
6. **Student**: "How about you?"
7. **Charlotte**: "I don't have to answer emails. Weekend freedom!"

> N03 chat = LLM puro.

---

## Unit N04 — Devo ir? Tenho que ir?

> **Sub-CEFR**: A2 | **Grammar focus**: Questions with should / have to | **Tense**: MODAL · should · question
> **Markers**: [qform]
> **Real-life context**: Você pede conselho ou esclarece obrigações.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "_____ I see a doctor?"
   **Options**: Should / Do / Will
   **Answer**: Should
   **Explanation**: "Should I + base?" — pedido de conselho.

2. **multiple_choice** — "_____ she leave early?"
   **Options**: Should / Does / Will
   **Answer**: Should
   **Explanation**: "Should she leave?" — pedido de conselho em 3ª pessoa. Should não muda.

3. **word_bank** — "_____ I have to bring my passport?"
   **Choices**: Do / Are / Will / Have
   **Answer**: Do
   **Explanation**: "Do I have to + base?" — pergunta sobre obrigação. Usa "do".

4. **word_bank** — "_____ she have to study tonight?"
   **Choices**: Does / Do / Is / Has
   **Answer**: Does
   **Explanation**: "Does she have to?" — 3ª pessoa pergunta com "does".

5. **fill_gap** — "_____ I help you?"
   **Hint**: Oferta com should
   **Answer**: Should
   **Explanation**: "Should I help you?" — oferta polida.

6. **fill_gap** — "_____ he take a taxi or walk?"
   **Hint**: Conselho 3ª pessoa
   **Answer**: Should
   **Explanation**: "Should he take a taxi?" — pedido de conselho sobre ele.

7. **fill_gap** — "_____ I have to wear a tie?"
   **Hint**: Pergunta sobre obrigação com I
   **Answer**: Do
   **Explanation**: "Do I have to?" — "Have to" usa do/does em perguntas.

8. **fix_error** — "Do you should come?"
   **Hint**: Should não usa "do"
   **Answer**: Should you come?
   **Explanation**: Modal "should" forma pergunta por inversão direta — sem "do".

9. **fix_error** — "Has she have to leave?"
   **Hint**: Pergunta com "have to" usa do/does
   **Answer**: Does she have to leave?
   **Explanation**: Have to pergunta com do/does, não "has". "Does she have to?".

10. **read_answer**
    **Passage**: "Q: Should I call her? A: Yes, you should. Q: Do I have to bring my passport? A: No, you don't have to."
    **Question**: A pessoa precisa trazer o passaporte?
    **Answer**: no
    **Accepts**: doesn't have to
    **Explanation**: The text says "No, you don't / do not have to".

### 2. Listening/Speaking (5 phrases)

1. **"Should I see a doctor?"** — advice request
2. **"Should she leave early?"** — 3rd person
3. **"Do I have to bring my passport?"** — obligation Q
4. **"Does she have to study tonight?"** — 3rd person
5. **"Should I help you?"** — polite offer

### 3. Role-play

**Cenário**: Charlotte responde dúvidas suas — você pergunta com should/have to.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 90s
**Opening line**: "Ask me about advice or obligations!"

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Pedir conselho com 'Should I'"
   **label_en**: "Ask for advice with 'Should I'"
   **hidden_prompt**: "user asks 'Should I + base?'"
   **hint_pt**: "Should I see a doctor?"
   **hint_en**: "Should I see a doctor?"

2. **id**: 2
   **label_pt**: "Perguntar obrigação com 'Do I have to'"
   **label_en**: "Ask obligation with 'Do I have to'"
   **hidden_prompt**: "user asks 'Do I have to + base?'"
   **hint_pt**: "Do I have to bring my ID?"
   **hint_en**: "Do I have to bring my ID?"

3. **id**: 3
   **label_pt**: "Outra pergunta should/have to"
   **label_en**: "Another should/have to Q"
   **hidden_prompt**: "user asks another should or have to question"
   **hint_pt**: "Should I call her?"
   **hint_en**: "Should I call her?"

**Closing cue**: Charlotte fecha com "All questions covered!" quando obj_3 baterem.

**Suggested flow** (referencial, 6 turnos):

1. **Charlotte**: "Ask me about advice or obligations!"
2. **Student**: ~"Should I see a doctor?"
3. **Charlotte**: "Yes, if you feel bad."
4. **Student**: ~"Do I have to bring my ID?"
5. **Charlotte**: "Yes, always."
6. **Student**: ~"Should I call her?"
7. **Charlotte**: "Yes! All questions covered!"

**Evaluation focus**:
- Should + sujeito + base (sem do)
- Do/Does + sujeito + have to + base
- Inversão correta

### 4. Guided Chat

**Cenário**: Charlotte responde a dúvidas práticas.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "Charlotte responde dúvidas. Pratica Should I e Do I have to questions."
**Opening message**: "I'm your advisor — ask me anything."

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Pedir conselho"
   **label_en**: "Ask advice"
   **hidden_prompt**: "user asks 'Should I + base?'"
   **hint_pt**: "Should I take a vacation?"
   **hint_en**: "Should I take a vacation?"

2. **id**: 2
   **label_pt**: "Perguntar obrigação"
   **label_en**: "Ask obligation"
   **hidden_prompt**: "user asks 'Do I have to + base?'"
   **hint_pt**: "Do I have to study every day?"
   **hint_en**: "Do I have to study every day?"

3. **id**: 3
   **label_pt**: "Mais uma pergunta"
   **label_en**: "One more"
   **hidden_prompt**: "user asks another should/have to question"
   **hint_pt**: "Should I learn another language?"
   **hint_en**: "Should I learn another language?"

**Closing cue**: Charlotte encerra com "Advisor session done!" quando obj_3 baterem.

**Script** (referencial, 7 turnos):

1. **Charlotte**: "I'm your advisor — ask me anything."
2. **Student**: "Should I take a vacation?"
3. **Charlotte**: "Definitely."
4. **Student**: "Do I have to study every day?"
5. **Charlotte**: "Almost — most days."
6. **Student**: "Should I learn another language?"
7. **Charlotte**: "Yes! Advisor session done!"

> N03 chat = LLM puro.

---

## Unit N05 — Dever, precisar, sugerir

> **Sub-CEFR**: A2 | **Grammar focus**: Integration should + have to + need to | **Tense**: MODAL · should
> **Markers**: —
> **Real-life context**: Você combina os três modais pra falar de vida real — obrigações fortes, conselhos, necessidades.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "You _____ rest more — it's a suggestion."
   **Options**: should / have to / need to
   **Answer**: should
   **Explanation**: "Should" = sugestão/conselho leve. "Have to" e "need to" são mais fortes.

2. **multiple_choice** — "I _____ work — it's my job."
   **Options**: have to / should / can
   **Answer**: have to
   **Explanation**: "Have to" = obrigação externa forte. Trabalho = obrigação.

3. **word_bank** — "You _____ go if you don't want."
   **Choices**: don't have to / shouldn't / can't / mustn't
   **Answer**: don't have to
   **Explanation**: "Don't / Do not have to" = não precisa, opcional. "Shouldn't / Should not" = não deveria (conselho).

4. **word_bank** — "She _____ buy groceries — we're out of milk."
   **Choices**: needs to / has to / should / will
   **Answer**: needs to
   **Explanation**: "Needs to" = precisa. Outras opções também funcionam mas "needs to" é mais natural pra necessidade prática.

5. **fill_gap** — "I _____ see a doctor about this."
   **Hint**: Conselho leve
   **Answer**: should
   **Explanation**: "I should see" — sugestão suave. "Have to" seria mais forte.

6. **fill_gap** — "She _____ leave at 7 — strict company rule."
   **Hint**: Obrigação forte
   **Answer**: has to
   **Explanation**: "She has to leave" — obrigação imposta.

7. **fill_gap** — "We _____ buy more bread."
   **Hint**: Necessidade prática
   **Answer**: need to
   **Explanation**: "We need to buy" — necessidade. "Need to" é o mais comum pra coisas práticas.

8. **fix_error** — "You should to study."
   **Hint**: Sem "to" após should
   **Answer**: You should study.
   **Explanation**: Modal + base, sem "to": "should study".

9. **fix_error** — "She have to leave."
   **Hint**: 3ª pessoa
   **Answer**: She has to leave.
   **Explanation**: She → "has to".

10. **read_answer**
    **Passage**: "You should rest. I have to work tomorrow. We need to buy more milk. She doesn't have to come if she's busy."
    **Question**: O que o narrador tem que fazer amanhã?
    **Answer**: work
    **Explanation**: O texto diz "I have to work tomorrow".

### 2. Listening/Speaking (5 phrases)

1. **"You should rest more."** — should (advice)
2. **"I have to work tomorrow."** — have to (obligation)
3. **"We need to buy bread."** — need to (necessity)
4. **"She doesn't have to come."** — don't have to (optional)
5. **"You shouldn't worry so much."** — shouldn't (negative advice)

### 3. Role-play

**Cenário**: Charlotte conta sua semana — você dá conselho, fala obrigações e necessidades.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 90s
**Opening line**: "My week is crazy — what should I do?"

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Dar conselho com should"
   **label_en**: "Give advice with should"
   **hidden_prompt**: "user gives advice with 'You should + base'"
   **hint_pt**: "You should rest."
   **hint_en**: "You should rest."

2. **id**: 2
   **label_pt**: "Mencionar obrigação sua (have to)"
   **label_en**: "Mention your obligation (have to)"
   **hidden_prompt**: "user uses 'I have to + base'"
   **hint_pt**: "I have to study too."
   **hint_en**: "I have to study too."

3. **id**: 3
   **label_pt**: "Mencionar necessidade (need to)"
   **label_en**: "Mention a need (need to)"
   **hidden_prompt**: "user uses 'We need to + base' or 'I need to + base'"
   **hint_pt**: "We need to take breaks."
   **hint_en**: "We need to take breaks."

**Closing cue**: Charlotte fecha com "Three modals mastered!" quando obj_3 baterem.

**Suggested flow** (referencial, 6 turnos):

1. **Charlotte**: "My week is crazy — what should I do?"
2. **Student**: ~"You should rest."
3. **Charlotte**: "But I have so much work."
4. **Student**: ~"I have to study too."
5. **Charlotte**: "Misery loves company. What now?"
6. **Student**: ~"We need to take breaks."
7. **Charlotte**: "Three modals mastered!"

**Evaluation focus**:
- Should pra conselho
- Have to pra obrigação
- Need to pra necessidade

### 4. Guided Chat

**Cenário**: Charlotte abre chat de planejamento — você integra os três.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "Charlotte abre chat de vida real. Integra should / have to / need to."
**Opening message**: "Tell me what's on your plate this week."

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Mencionar obrigação"
   **label_en**: "Mention obligation"
   **hidden_prompt**: "user uses 'I have to + base'"
   **hint_pt**: "I have to finish a report."
   **hint_en**: "I have to finish a report."

2. **id**: 2
   **label_pt**: "Mencionar necessidade"
   **label_en**: "Mention necessity"
   **hidden_prompt**: "user uses 'I need to + base'"
   **hint_pt**: "I need to call my doctor."
   **hint_en**: "I need to call my doctor."

3. **id**: 3
   **label_pt**: "Dar conselho à Charlotte"
   **label_en**: "Give Charlotte advice"
   **hidden_prompt**: "user uses 'You should + base' for Charlotte"
   **hint_pt**: "You should take time off."
   **hint_en**: "You should take time off."

**Closing cue**: Charlotte encerra com "Real-life talk!" quando obj_3 baterem.

**Script** (referencial, 7 turnos):

1. **Charlotte**: "Tell me what's on your plate this week."
2. **Student**: "I have to finish a report."
3. **Charlotte**: "Tough. Anything else?"
4. **Student**: "I need to call my doctor."
5. **Charlotte**: "Practical."
6. **Student**: "You should take time off."
7. **Charlotte**: "Maybe! Real-life talk!"

> N04 chat = LLM puro.

---

## Cross-unit consolidation

Ao terminar M20, o aluno deve usar naturalmente:
- should / shouldn't (conselho leve)
- have to / has to (obrigação forte)
- don't have to / doesn't have to (ausência de obrigação)
- need to (necessidade prática)
- Should I...? / Do I have to...? (perguntas)
- Diferenciar grau: should (sugestão) < need to < have to (obrigação)

Esses chunks abrem M21 — condicional real com if.
