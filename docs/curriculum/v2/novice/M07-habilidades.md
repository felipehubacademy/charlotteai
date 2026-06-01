# Module M07 — Habilidades

> **Level**: Novice (A1)
> **Block**: A1 Block
> **Units**: 5 (N01–N05)
> **Theme**: O que sei fazer — habilidades, talentos, capacidades
> **Module goal**: Aluno sai sabendo dizer o que pode/sabe fazer com can (positivo, negativo, perguntas), descrever habilidades suas e de outros.
> **Connects to**: M08 (Gostos) — depois de saber o que pode fazer, fala do que gosta.

## Module chunks introduced (~35)

- I can / you can / he can / she can / we can / they can
- I can't (cannot) / he can't
- Can you...? / Can she...?
- Yes, I can. / No, I can't.
- What can you do?
- speak / play / cook / drive / swim / dance / sing
- ride a bike / paint / draw
- I can speak + language
- She can play + instrument/sport
- play the piano / play soccer
- cook well / drive a car
- a little / very well / not really

---

## Unit N01 — Eu sei nadar

> **Sub-CEFR**: A1 | **Grammar focus**: Can (positive) — habilidades próprias
> **Markers**: —
> **Real-life context**: Você conta o que sabe fazer — esportes, idiomas, habilidades práticas.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "I _____ swim."
   **Options**: can / cans / am can
   **Answer**: can
   **Explanation**: "Can" é modal — não muda com pessoa. "I can", "she can", "they can" — sempre igual. Sem -s na 3ª pessoa.

2. **multiple_choice** — "She _____ play the piano."
   **Options**: can / cans / can to
   **Answer**: can
   **Explanation**: "She can play" — modal can não leva -s. Verbo principal na forma base (sem "to"): "can play", não "can to play".

3. **word_bank** — "He _____ speak three languages."
   **Choices**: can / cans / is can / has can
   **Answer**: can
   **Explanation**: "He can speak" — modal can é igual em todas as pessoas. Sem auxiliar adicional.

4. **word_bank** — "We _____ cook Italian food."
   **Choices**: can / can to / cans / are can
   **Answer**: can
   **Explanation**: "We can cook" — can + verbo base. Sem "to" após can.

5. **fill_gap** — "I _____ drive a car."
   **Hint**: Verbo modal de habilidade
   **Answer**: can
   **Explanation**: "I can drive" — habilidade. Note: "I drive" significa "eu dirijo (frequente)"; "I can drive" significa "eu sei dirigir / sou capaz".

6. **fill_gap** — "My sister _____ dance very well."
   **Hint**: Verbo de habilidade (forma única)
   **Answer**: can
   **Explanation**: "My sister can dance" — can para qualquer pessoa, sem mudança.

7. **fill_gap** — "They _____ play soccer."
   **Hint**: Modal "saber/poder fazer"
   **Answer**: can
   **Explanation**: "They can play" — plural usa can igual: forma única.

8. **fix_error** — "She cans speak English."
   **Hint**: Can não muda na 3ª pessoa
   **Answer**: She can speak English.
   **Explanation**: Can é modal — NÃO leva -s na 3ª pessoa. "She can speak", não "She cans speak". Esta é a regra mais importante dos modais.

9. **fix_error** — "I can to swim."
   **Hint**: Sem "to" entre can e verbo
   **Answer**: I can swim.
   **Explanation**: Após can, verbo na forma base SEM "to": "I can swim", não "I can to swim". Modais não usam "to".

10. **read_answer**
    **Passage**: "I can speak English and Portuguese. My brother can play the guitar. We can both cook well."
    **Question**: What can the brother play?
    **Answer**: the guitar
    **Explanation**: O texto diz "My brother can play the guitar".

### 2. Listening/Speaking (5 phrases)

1. **"I can swim."** — habilidade básica
2. **"I can speak English."** — idioma
3. **"She can play the piano."** — instrumento
4. **"We can cook Italian food."** — culinária
5. **"He can drive very well."** — habilidade + advérbio

### 3. Role-play

**Cenário**: Charlotte quer saber o que você sabe fazer — habilidades suas.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 90s
**Opening line**: "Tell me three things you can do!"

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer uma habilidade sua (com 'I can')"
   **label_en**: "Say one ability"
   **hidden_prompt**: "user states an ability with 'I can + verb base' (swim, cook, drive, speak, dance, sing, play, etc.)"
   **hint_pt**: "I can swim."
   **hint_en**: "I can swim."

2. **id**: 2
   **label_pt**: "Dizer outra habilidade"
   **label_en**: "Say another ability"
   **hidden_prompt**: "user states another ability with 'I can + verb base'"
   **hint_pt**: "I can cook Italian food."
   **hint_en**: "I can cook Italian food."

3. **id**: 3
   **label_pt**: "Dizer uma habilidade de alguém próximo (com 'can')"
   **label_en**: "Say someone else's ability"
   **hidden_prompt**: "user states someone else's ability with 'He/She/My brother/etc. can + verb base'"
   **hint_pt**: "My sister can dance very well."
   **hint_en**: "My sister can dance very well."

**Closing cue**: Charlotte fecha com "Talented!" quando obj_3 baterem.

**Suggested flow** (referencial, 6 turnos):

1. **Charlotte**: "Tell me three things you can do!"
2. **Student**: ~"I can swim."
3. **Charlotte**: "Cool! What else?"
4. **Student**: ~"I can cook Italian food."
5. **Charlotte**: "Nice. Anyone in your family with talents?"
6. **Student**: ~"My sister can dance very well."
7. **Charlotte**: "Talented!"

**Evaluation focus**:
- "I can + verbo base" (sem to, sem -s)
- Variedade de habilidades
- Extensão pra 3ª pessoa também

### 4. Guided Chat

**Cenário**: Charlotte conversa sobre habilidades suas e de família.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "Charlotte quer saber o que você sabe fazer. Pratica 'I can + verbo' e habilidades de outras pessoas."
**Opening message**: "Hey! What can you do?"

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer uma habilidade sua"
   **label_en**: "Say your ability"
   **hidden_prompt**: "user states ability with 'I can + verb base'"
   **hint_pt**: "I can speak English."
   **hint_en**: "I can speak English."

2. **id**: 2
   **label_pt**: "Dizer outra habilidade ou idioma"
   **label_en**: "Say another ability or language"
   **hidden_prompt**: "user states another ability with 'I can + verb base'"
   **hint_pt**: "I can play soccer."
   **hint_en**: "I can play soccer."

3. **id**: 3
   **label_pt**: "Perguntar à Charlotte o que ela sabe fazer"
   **label_en**: "Ask Charlotte what she can do"
   **hidden_prompt**: "user asks 'What can you do?' or 'How about you?' or 'Can you + verb?'"
   **hint_pt**: "What can you do?"
   **hint_en**: "What can you do?"

**Closing cue**: Charlotte encerra com "We've got skills!" quando obj_3 baterem.

**Script** (referencial, 7 turnos):

1. **Charlotte**: "Hey! What can you do?"
2. **Student**: "I can speak English."
3. **Charlotte**: "Nice. Anything else?"
4. **Student**: "I can play soccer."
5. **Charlotte**: "Cool."
6. **Student**: "What can you do?"
7. **Charlotte**: "I can sing. We've got skills!"

> N01 chat = LLM puro.

---

## Unit N02 — Eu não sei fazer isso

> **Sub-CEFR**: A1 | **Grammar focus**: Can't (cannot) — limitações honestas
> **Markers**: —
> **Real-life context**: Você reconhece o que NÃO sabe fazer ainda — habilidades que faltam.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "I _____ swim well."
   **Options**: can't / don't can / no can
   **Answer**: can't
   **Explanation**: Negativa de "can" é "can't" (cannot). "I can't swim" = "Eu não sei nadar". Pronúncia: /kænt/ (americano) ou /kɑːnt/ (britânico).

2. **multiple_choice** — "She _____ drive a car."
   **Options**: can't / doesn't can / no can
   **Answer**: can't
   **Explanation**: "She can't drive" — negativa de can é can't pra todas as pessoas. Sem -s, sem auxiliar.

3. **word_bank** — "We _____ speak Japanese."
   **Choices**: can't / don't can / aren't can / no can
   **Answer**: can't
   **Explanation**: "We can't speak" — can't é a única forma negativa de can.

4. **word_bank** — "He _____ cook at all."
   **Choices**: can't / doesn't can / cannot to / no can
   **Answer**: can't
   **Explanation**: "He can't cook at all" = "Ele não sabe cozinhar nada". "At all" intensifica a negação.

5. **fill_gap** — "I _____ ride a bike."
   **Hint**: Negativa de can
   **Answer**: can't
   **Explanation**: "I can't ride a bike" = "Não sei andar de bicicleta". Forma contraída de "cannot".

6. **fill_gap** — "My father _____ sing — he's terrible at it."
   **Hint**: Negativa de can (3ª pessoa também usa can't)
   **Answer**: can't
   **Explanation**: "My father can't sing" — mesmo na 3ª pessoa singular, can't.

7. **fill_gap** — "Sorry, I _____ help you right now."
   **Hint**: Negativa polida com can
   **Answer**: can't
   **Explanation**: "I can't help" — usado pra recusar polidamente. Comum em contextos sociais.

8. **fix_error** — "She doesn't can drive."
   **Hint**: Negativa de can não usa doesn't
   **Answer**: She can't drive.
   **Explanation**: Modais formam negativa direta com "not" (contraído: -n't). NÃO usa doesn't/don't. "She can't drive", nunca "She doesn't can".

9. **fix_error** — "I no can swim."
   **Hint**: Forma da negativa em inglês
   **Answer**: I can't swim.
   **Explanation**: "No can" é influência do português. A negativa correta é "can't" (cannot). Forma fixa.

10. **read_answer**
    **Passage**: "I can swim but I can't dive. My friend can speak French but she can't write it well. We can both ride a bike."
    **Question**: What can the friend NOT do well?
    **Answer**: write (or "write French")
    **Explanation**: O texto diz "she can't write it well".

### 2. Listening/Speaking (5 phrases)

1. **"I can't swim well."** — limitação
2. **"She can't drive yet."** — limitação + tempo
3. **"We can't speak French."** — idioma que não sabe
4. **"He can't sing at all."** — limitação total
5. **"Sorry, I can't help right now."** — recusa polida

### 3. Role-play

**Cenário**: Charlotte pergunta sobre coisas que você AINDA não sabe fazer ou nunca aprendeu.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 90s
**Opening line**: "What's something you can't do yet?"

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer algo que você não sabe fazer"
   **label_en**: "Say one thing you can't do"
   **hidden_prompt**: "user states inability with 'I can't + verb base'"
   **hint_pt**: "I can't ride a bike."
   **hint_en**: "I can't ride a bike."

2. **id**: 2
   **label_pt**: "Dizer outra limitação sua"
   **label_en**: "Say another limitation"
   **hidden_prompt**: "user states another inability with 'I can't + verb base'"
   **hint_pt**: "I can't speak French."
   **hint_en**: "I can't speak French."

3. **id**: 3
   **label_pt**: "Dizer algo que alguém da família não sabe fazer"
   **label_en**: "Say a family member's limitation"
   **hidden_prompt**: "user states someone else's inability with 'He/She can't + verb base'"
   **hint_pt**: "My father can't cook."
   **hint_en**: "My father can't cook."

**Closing cue**: Charlotte fecha com "Honest! Room to grow." quando obj_3 baterem.

**Suggested flow** (referencial, 6 turnos):

1. **Charlotte**: "What's something you can't do yet?"
2. **Student**: ~"I can't ride a bike."
3. **Charlotte**: "Yet! What else?"
4. **Student**: ~"I can't speak French."
5. **Charlotte**: "Family limitations?"
6. **Student**: ~"My father can't cook."
7. **Charlotte**: "Honest! Room to grow."

**Evaluation focus**:
- can't sem auxiliar extra (não "doesn't can")
- Sem influência do PT ("no can")
- Verbo base após can't

### 4. Guided Chat

**Cenário**: Charlotte conversa sobre limites honestos — o que vocês não sabem fazer.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "Charlotte abre um chat sobre coisas que vocês ainda não sabem fazer. Pratica can't."
**Opening message**: "Be honest — what can't you do?"

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer algo que você não sabe fazer"
   **label_en**: "Say one limitation"
   **hidden_prompt**: "user says 'I can't + verb base'"
   **hint_pt**: "I can't dance."
   **hint_en**: "I can't dance."

2. **id**: 2
   **label_pt**: "Dizer algo que alguém próximo não sabe"
   **label_en**: "Say someone's limitation"
   **hidden_prompt**: "user says 'He/She can't + verb base'"
   **hint_pt**: "My brother can't sing."
   **hint_en**: "My brother can't sing."

3. **id**: 3
   **label_pt**: "Perguntar à Charlotte"
   **label_en**: "Ask Charlotte"
   **hidden_prompt**: "user asks 'What can't you do?' or 'How about you?'"
   **hint_pt**: "How about you?"
   **hint_en**: "How about you?"

**Closing cue**: Charlotte encerra com "Same boat!" quando obj_3 baterem.

**Script** (referencial, 7 turnos):

1. **Charlotte**: "Be honest — what can't you do?"
2. **Student**: "I can't dance."
3. **Charlotte**: "We can practice! Family?"
4. **Student**: "My brother can't sing."
5. **Charlotte**: "Ha."
6. **Student**: "How about you?"
7. **Charlotte**: "I can't drive. Same boat!"

> N02 chat = LLM puro.

---

## Unit N03 — Você sabe nadar?

> **Sub-CEFR**: A1 | **Grammar focus**: Can questions (Can you...? Can she...?)
> **Markers**: [qform]
> **Real-life context**: Você pergunta a Charlotte e outros sobre habilidades — pode levar você a pedir ajuda ou descobrir talentos.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "_____ you swim?"
   **Options**: Can / Do / Are
   **Answer**: Can
   **Explanation**: Pergunta com can: "Can + sujeito + verbo base?". "Can you swim?" — inversão direta.

2. **multiple_choice** — "_____ she speak Portuguese?"
   **Options**: Can / Does / Is
   **Answer**: Can
   **Explanation**: "Can she speak?" — para habilidades usa "Can", não "Does". 3ª pessoa também usa "Can".

3. **word_bank** — "_____ they play soccer?"
   **Choices**: Can / Do / Are / Have
   **Answer**: Can
   **Explanation**: "Can they play?" — pergunta de habilidade com qualquer pessoa usa Can.

4. **word_bank** — "_____ you help me, please?"
   **Choices**: Can / Do / Are / Have
   **Answer**: Can
   **Explanation**: "Can you help?" — chunk fixo pra pedir ajuda polidamente.

5. **fill_gap** — "_____ you cook Italian food?"
   **Hint**: Modal de habilidade em pergunta
   **Answer**: Can
   **Explanation**: "Can you cook?" — pergunta direta sobre habilidade.

6. **fill_gap** — "_____ your sister drive?"
   **Hint**: Pergunta sobre habilidade da irmã
   **Answer**: Can
   **Explanation**: "Can your sister drive?" — 3ª pessoa também usa Can. Sem alterações.

7. **fill_gap** — "Yes, I _____." (responda a "Can you swim?")
   **Hint**: Resposta curta afirmativa
   **Answer**: can
   **Explanation**: "Yes, I can" — resposta curta. Repete o auxiliar (can), não o verbo principal.

8. **fix_error** — "Do you can swim?"
   **Hint**: Can não precisa de "do"
   **Answer**: Can you swim?
   **Explanation**: Modais formam pergunta por inversão direta — sem "do/does". "Can you swim?", não "Do you can swim?". Erro comum.

9. **fix_error** — "Can she swims?"
   **Hint**: Após can, verbo na forma base
   **Answer**: Can she swim?
   **Explanation**: Após Can, verbo SEMPRE forma base. "Can she swim?", não "Can she swims?".

10. **read_answer**
    **Passage**: "Q: Can you swim? A: Yes, I can. Q: Can your brother cook? A: No, he can't. He only makes sandwiches."
    **Question**: What can the brother make?
    **Answer**: sandwiches
    **Explanation**: O texto diz "He only makes sandwiches".

### 2. Listening/Speaking (5 phrases)

1. **"Can you swim?"** — pergunta direta
2. **"Can she speak Portuguese?"** — 3ª pessoa
3. **"Can you help me?"** — pedido polido
4. **"Yes, I can."** — short answer afirmativa
5. **"No, I can't."** — short answer negativa

### 3. Role-play

**Cenário**: Charlotte propõe um quiz de habilidades — você pergunta sobre habilidades dela.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 90s
**Opening line**: "Quiz time! Ask me three things — can I do them?"

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Perguntar à Charlotte se ela sabe nadar/cozinhar/etc."
   **label_en**: "Ask Charlotte about an ability"
   **hidden_prompt**: "user asks 'Can you + verb base?' to Charlotte"
   **hint_pt**: "Can you swim?"
   **hint_en**: "Can you swim?"

2. **id**: 2
   **label_pt**: "Perguntar outra habilidade"
   **label_en**: "Ask another ability"
   **hidden_prompt**: "user asks another 'Can you + verb base?'"
   **hint_pt**: "Can you cook?"
   **hint_en**: "Can you cook?"

3. **id**: 3
   **label_pt**: "Perguntar sobre habilidade de outra pessoa (Can she/he...?)"
   **label_en**: "Ask about someone else's ability"
   **hidden_prompt**: "user asks 'Can + 3rd person + verb base?'"
   **hint_pt**: "Can your friend dance?"
   **hint_en**: "Can your friend dance?"

**Closing cue**: Charlotte fecha com "Fun quiz!" quando obj_3 baterem.

**Suggested flow** (referencial, 6 turnos):

1. **Charlotte**: "Quiz time! Ask me three things — can I do them?"
2. **Student**: ~"Can you swim?"
3. **Charlotte**: "Yes, I can!"
4. **Student**: ~"Can you cook?"
5. **Charlotte**: "A little."
6. **Student**: ~"Can your friend dance?"
7. **Charlotte**: "Yes, she can. Fun quiz!"

**Evaluation focus**:
- Inversão direta: Can + sujeito + verbo base
- Sem "do/does" antes de can
- Verbo base após can

### 4. Guided Chat

**Cenário**: Charlotte abre quiz de habilidades por chat.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "Charlotte propõe quiz rápido. Pratica perguntas com Can."
**Opening message**: "Quiz! Ask me what I can do."

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Perguntar uma habilidade"
   **label_en**: "Ask one ability"
   **hidden_prompt**: "user asks 'Can you + verb base?'"
   **hint_pt**: "Can you sing?"
   **hint_en**: "Can you sing?"

2. **id**: 2
   **label_pt**: "Perguntar idiomas"
   **label_en**: "Ask about languages"
   **hidden_prompt**: "user asks 'Can you speak + language?'"
   **hint_pt**: "Can you speak Spanish?"
   **hint_en**: "Can you speak Spanish?"

3. **id**: 3
   **label_pt**: "Perguntar sobre alguém de Charlotte"
   **label_en**: "Ask about someone Charlotte knows"
   **hidden_prompt**: "user asks 'Can + 3rd person + verb base?'"
   **hint_pt**: "Can your sister cook?"
   **hint_en**: "Can your sister cook?"

**Closing cue**: Charlotte encerra com "Loved the quiz!" quando obj_3 baterem.

**Script** (referencial, 7 turnos):

1. **Charlotte**: "Quiz! Ask me what I can do."
2. **Student**: "Can you sing?"
3. **Charlotte**: "Yes, badly!"
4. **Student**: "Can you speak Spanish?"
5. **Charlotte**: "A little."
6. **Student**: "Can your sister cook?"
7. **Charlotte**: "Yes, amazingly. Loved the quiz!"

> N03 chat = LLM puro.

---

## Unit N04 — Idiomas e talentos

> **Sub-CEFR**: A1 | **Grammar focus**: Can + speak/play + languages and instruments/sports
> **Markers**: —
> **Real-life context**: Você descreve habilidades específicas — idiomas que fala, instrumentos que toca, esportes que pratica.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "I can _____ three languages."
   **Options**: speak / talk / say
   **Answer**: speak
   **Explanation**: "Speak + language" é o chunk fixo: "speak English", "speak Portuguese". "Talk" usa "to" (talk to someone). "Say" precisa de objeto.

2. **multiple_choice** — "She can play _____ guitar."
   **Options**: the / a / an
   **Answer**: the
   **Explanation**: Com INSTRUMENTOS musicais sempre "the": play THE guitar, play THE piano. Diferente de esportes: play soccer (sem the).

3. **word_bank** — "He can play _____."
   **Choices**: soccer / the soccer / a soccer / soccers
   **Answer**: soccer
   **Explanation**: ESPORTES sem artigo: "play soccer", "play tennis". Note diferença com instrumentos (play the piano).

4. **word_bank** — "We can speak _____."
   **Choices**: English / the English / a English / English language
   **Answer**: English
   **Explanation**: IDIOMAS sem artigo: "speak English", "speak French". Não "the English" (a menos que se refira aos britânicos).

5. **fill_gap** — "I can play the _____ very well."
   **Hint**: Instrumento musical
   **Answer**: piano
   **Explanation**: "Play the piano" — chunk com "the" obrigatório pra instrumentos musicais. Exemplo: play the guitar, play the violin.

6. **fill_gap** — "She can speak French and _____."
   **Hint**: Idioma (qualquer um)
   **Answer**: Spanish
**Accepts**: English / German / French / Italian
   **Explanation**: Idiomas após "speak" — sem artigo. "Spanish", "English", "German".

7. **fill_gap** — "We can play _____ on Saturdays."
   **Hint**: Esporte ou jogo
   **Answer**: soccer
**Accepts**: tennis / basketball / volleyball
   **Explanation**: "Play + esporte" sem artigo. "Play soccer", "play tennis", "play basketball".

8. **fix_error** — "I can play piano."
   **Hint**: Falta artigo antes do instrumento
   **Answer**: I can play the piano.
   **Explanation**: Instrumentos musicais SEMPRE com "the" após "play": "play THE piano", "play THE guitar". Esportes, ao contrário, sem the.

9. **fix_error** — "She can speak the English."
   **Hint**: Idiomas não levam artigo
   **Answer**: She can speak English.
   **Explanation**: Idiomas SEM artigo: "speak English", "speak Portuguese". "The English" só se refere aos ingleses (povo).

10. **read_answer**
    **Passage**: "I can speak two languages: English and Italian. My brother can play the guitar. My sister can play tennis very well."
    **Question**: What can the sister play?
    **Answer**: tennis
    **Explanation**: O texto diz "My sister can play tennis very well".

### 2. Listening/Speaking (5 phrases)

1. **"I can speak English."** — idioma
2. **"She can play the piano."** — instrumento com "the"
3. **"He can play soccer."** — esporte sem artigo
4. **"We can speak two languages."** — number + languages
5. **"My friend can play the guitar."** — 3rd person + instrument

### 3. Role-play

**Cenário**: Charlotte quer descobrir suas habilidades em idiomas, esportes e música.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 90s
**Opening line**: "Languages, sports, music — what can you do?"

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer um idioma que você fala"
   **label_en**: "Say a language you can speak"
   **hidden_prompt**: "user states a language with 'I can speak + language' (no article)"
   **hint_pt**: "I can speak English."
   **hint_en**: "I can speak English."

2. **id**: 2
   **label_pt**: "Dizer um esporte ou instrumento que você toca/pratica"
   **label_en**: "Say a sport or instrument"
   **hidden_prompt**: "user states 'I can play + sport' (no article) or 'I can play the + instrument' (with article)"
   **hint_pt**: "I can play soccer."
   **hint_en**: "I can play soccer."

3. **id**: 3
   **label_pt**: "Dizer outra habilidade"
   **label_en**: "Say another ability"
   **hidden_prompt**: "user states another ability with 'I can + verb base' (cook, dance, sing, draw, etc.)"
   **hint_pt**: "I can cook well."
   **hint_en**: "I can cook well."

**Closing cue**: Charlotte fecha com "Talented!" quando obj_3 baterem.

**Suggested flow** (referencial, 6 turnos):

1. **Charlotte**: "Languages, sports, music — what can you do?"
2. **Student**: ~"I can speak English."
3. **Charlotte**: "Cool. Sport or instrument?"
4. **Student**: ~"I can play soccer."
5. **Charlotte**: "Anything else?"
6. **Student**: ~"I can cook well."
7. **Charlotte**: "Talented!"

**Evaluation focus**:
- Idiomas sem artigo
- Esportes sem artigo, instrumentos com "the"
- "I can + verbo base"

### 4. Guided Chat

**Cenário**: Charlotte conversa sobre talentos — idiomas, música, esporte.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "Charlotte quer trocar talentos. Pratica idiomas (sem the), instrumentos (com the) e esportes (sem the)."
**Opening message**: "Talents chat! What languages can you speak?"

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer um idioma que você fala"
   **label_en**: "Say a language"
   **hidden_prompt**: "user states 'I can speak + language' (no article)"
   **hint_pt**: "I can speak Portuguese."
   **hint_en**: "I can speak Portuguese."

2. **id**: 2
   **label_pt**: "Dizer um instrumento ou esporte"
   **label_en**: "Say an instrument or sport"
   **hidden_prompt**: "user states 'I can play + sport' or 'I can play the + instrument'"
   **hint_pt**: "I can play the piano."
   **hint_en**: "I can play the piano."

3. **id**: 3
   **label_pt**: "Perguntar à Charlotte"
   **label_en**: "Ask Charlotte"
   **hidden_prompt**: "user asks Charlotte 'Can you + verb' or 'What can you do?' or 'How about you?'"
   **hint_pt**: "How about you?"
   **hint_en**: "How about you?"

**Closing cue**: Charlotte encerra com "Awesome skills!" quando obj_3 baterem.

**Script** (referencial, 7 turnos):

1. **Charlotte**: "Talents chat! What languages can you speak?"
2. **Student**: "I can speak Portuguese."
3. **Charlotte**: "Cool. Instrument or sport?"
4. **Student**: "I can play the piano."
5. **Charlotte**: "Nice."
6. **Student**: "How about you?"
7. **Charlotte**: "I can play tennis. Awesome skills!"

> N04 chat = LLM puro.

---

## Unit N05 — Tudo que sei e não sei

> **Sub-CEFR**: A1 | **Grammar focus**: Integration of can/can't (positive/negative/question)
> **Markers**: —
> **Real-life context**: Você apresenta um retrato honesto das suas habilidades — o que sabe, o que não sabe, e descobre sobre o outro.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "I _____ swim but I _____ dive."
   **Options**: can/can't / can't/can / can/can
   **Answer**: can/can't
   **Explanation**: Contraste: positiva + negativa. "I can swim but I can't dive" = "Sei nadar mas não sei mergulhar".

2. **multiple_choice** — "She _____ speak Italian."
   **Options**: can / cans / can to
   **Answer**: can
   **Explanation**: Can não muda na 3ª pessoa. "She can speak", não "She cans speak".

3. **word_bank** — "_____ you cook well?"
   **Choices**: Can / Do / Are / Have
   **Answer**: Can
   **Explanation**: Pergunta de habilidade com Can. "Can you cook?".

4. **word_bank** — "He _____ play the piano very well."
   **Choices**: can / cans / is able / has
   **Answer**: can
   **Explanation**: "He can play" — modal can igual em todas as pessoas, verbo base.

5. **fill_gap** — "I _____ drive yet."
   **Hint**: Negativa de can
   **Answer**: can't
   **Explanation**: "I can't drive yet" = "Ainda não sei dirigir". "Yet" indica que vai aprender no futuro.

6. **fill_gap** — "_____ your sister speak French?"
   **Hint**: Pergunta sobre habilidade
   **Answer**: Can
   **Explanation**: Pergunta de habilidade: "Can + sujeito + verbo base?". "Can your sister speak French?".

7. **fill_gap** — "We _____ both play the guitar."
   **Hint**: Modal de habilidade positivo
   **Answer**: can
   **Explanation**: "We can both play" — ambos podem. "Can" igual pra qualquer pessoa.

8. **fix_error** — "She cans speak Japanese."
   **Hint**: Can não leva -s
   **Answer**: She can speak Japanese.
   **Explanation**: Modais NÃO levam -s na 3ª pessoa. "She can", nunca "She cans".

9. **fix_error** — "Do you can drive?"
   **Hint**: Can não precisa de "do"
   **Answer**: Can you drive?
   **Explanation**: Modais formam pergunta por inversão direta — sem "do/does". "Can you drive?", não "Do you can drive?".

10. **read_answer**
    **Passage**: "I can speak English very well. I can't speak French at all. My friend can play three instruments — the piano, the guitar, and the violin."
    **Question**: How many instruments can the friend play?
    **Answer**: three
    **Explanation**: O texto diz "My friend can play three instruments".

### 2. Listening/Speaking (5 phrases)

1. **"I can speak English very well."** — positiva + intensifier
2. **"I can't speak French at all."** — negativa + intensifier
3. **"Can you cook?"** — pergunta
4. **"She can play three instruments."** — 3rd person + número
5. **"My friend can dance but I can't."** — contraste pessoas

### 3. Role-play

**Cenário**: Charlotte propõe um retrato completo das habilidades — o que sabe, o que não sabe, e pergunta dela.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 90s
**Opening line**: "Tell me what you can do, what you can't, and ask me too."

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer algo que sabe fazer (positiva)"
   **label_en**: "Say what you can do"
   **hidden_prompt**: "user states ability with 'I can + verb base'"
   **hint_pt**: "I can speak English."
   **hint_en**: "I can speak English."

2. **id**: 2
   **label_pt**: "Dizer algo que não sabe fazer (negativa)"
   **label_en**: "Say what you can't do"
   **hidden_prompt**: "user states inability with 'I can't + verb base'"
   **hint_pt**: "I can't play the piano."
   **hint_en**: "I can't play the piano."

3. **id**: 3
   **label_pt**: "Perguntar à Charlotte uma habilidade"
   **label_en**: "Ask Charlotte about an ability"
   **hidden_prompt**: "user asks 'Can you + verb base?' to Charlotte"
   **hint_pt**: "Can you sing?"
   **hint_en**: "Can you sing?"

**Closing cue**: Charlotte fecha com "What a portrait!" quando obj_3 baterem.

**Suggested flow** (referencial, 6 turnos):

1. **Charlotte**: "Tell me what you can do, what you can't, and ask me too."
2. **Student**: ~"I can speak English."
3. **Charlotte**: "Cool. Anything you can't?"
4. **Student**: ~"I can't play the piano."
5. **Charlotte**: "Ask me!"
6. **Student**: ~"Can you sing?"
7. **Charlotte**: "Yes, badly. What a portrait!"

**Evaluation focus**:
- Positiva, negativa e pergunta integradas
- Variedade de habilidades
- Formas corretas (sem -s, sem to, sem do/does)

### 4. Guided Chat

**Cenário**: Charlotte abre chat completo sobre habilidades — você compartilha tudo.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "Charlotte quer um retrato completo das suas habilidades — positiva, negativa, e devolva a pergunta."
**Opening message**: "Skills check! What can you do, what can't you?"

**Sub-objectives** (M03+ gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer algo que sabe"
   **label_en**: "Say something you can do"
   **hidden_prompt**: "user states 'I can + verb base'"
   **hint_pt**: "I can swim."
   **hint_en**: "I can swim."

2. **id**: 2
   **label_pt**: "Dizer algo que não sabe"
   **label_en**: "Say something you can't do"
   **hidden_prompt**: "user states 'I can't + verb base'"
   **hint_pt**: "I can't drive."
   **hint_en**: "I can't drive."

3. **id**: 3
   **label_pt**: "Perguntar à Charlotte"
   **label_en**: "Ask Charlotte"
   **hidden_prompt**: "user asks 'Can you + verb?' to Charlotte"
   **hint_pt**: "Can you cook?"
   **hint_en**: "Can you cook?"

**Closing cue**: Charlotte encerra com "Skill swap complete!" quando obj_3 baterem.

**Script** (referencial, 7 turnos):

1. **Charlotte**: "Skills check! What can you do, what can't you?"
2. **Student**: "I can swim."
3. **Charlotte**: "Nice. Limitation?"
4. **Student**: "I can't drive."
5. **Charlotte**: "Yet!"
6. **Student**: "Can you cook?"
7. **Charlotte**: "A little. Skill swap complete!"

> N05 chat = LLM puro.

---

## Cross-unit consolidation

Ao terminar M07, o aluno deve usar naturalmente:
- Can (positivo) — mesma forma pra todas as pessoas, sem -s
- Can't (negativo) — sem don't/doesn't
- Can questions — inversão direta, sem do/does
- Verbo base após can/can't (sem "to", sem -s)
- Idiomas sem artigo: speak English
- Instrumentos com "the": play the piano
- Esportes sem artigo: play soccer
- Short answers: Yes, I can / No, I can't

Esses chunks abrem M08 (Gostos), onde o aluno aprende a falar do que gosta de fazer — like/love/hate + verb-ing.
