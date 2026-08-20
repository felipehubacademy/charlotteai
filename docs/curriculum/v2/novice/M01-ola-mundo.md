# Module M01 — Olá, mundo

> **Level**: Novice (A1)
> **Block**: A1 Block
> **Units**: 5 (N01–N05)
> **Theme**: Primeiros encontros e saudações
> **Module goal**: Aluno sai sabendo se apresentar, perguntar como alguém está, dar nome/idade/origem, falar como se sente e se despedir em situações cotidianas.
> **Connects to**: M02 (Pessoas ao meu redor) — após saber se apresentar, aprende a apresentar outras pessoas.

## Module chunks introduced (~35)

- Hi! / Hello! / Hey!
- How are you?
- I'm fine, thanks
- Nice to meet you
- See you later / See you soon / See you tomorrow
- Good morning / Good afternoon / Good evening / Good night
- Where are you from?
- I'm from + place
- What's your name?
- My name is + name
- This is + person
- How old are you?
- I'm + age + years old
- I'm happy / tired / busy / hungry / excited
- How are you feeling?
- Take care
- Have a nice day
- Have a good weekend
- Bye for now
- Long time no see
- And you?
- Doing well
- Not bad
- I'm great

---

## Unit N01 — Oi! Tudo bem?

> **Sub-CEFR**: A1 | **Grammar focus**: Greetings & survival chunks | **Markers**: — | **Tense**: EXPRESSÕES
> **Real-life context**: Você esbarra com alguém conhecido na rua e cumprimenta.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "_____ to meet you!"
   **Options**: Nice / Good / Happy
   **Answer**: Nice
   **Explanation**: "Nice to meet you" é a saudação padrão ao conhecer alguém pela primeira vez. "Good to meet you" também existe mas é menos comum.

2. **multiple_choice** — "How _____ you today?"
   **Options**: are / is / am
   **Answer**: are
   **Explanation**: "How are you?" usa "are" porque o sujeito é "you" (segunda pessoa). É a forma do verbo "to be" com "you".

3. **word_bank** — "Good _____, everyone!"
   **Choices**: morning / night / noon / lunch
   **Answer**: morning
   **Explanation**: "Good morning" é a saudação da manhã (até por volta do meio-dia). "Good night" é só para se despedir antes de dormir, não para cumprimentar.

4. **word_bank** — "See you _____!"
   **Choices**: later / after / next / before
   **Answer**: later
   **Explanation**: "See you later" é uma despedida informal muito comum. Significa "até mais tarde" ou simplesmente "até mais".

5. **fill_gap** — "A: How are you? B: I'm fine, _____."
   **Hint**: Resposta educada após "I'm fine" (forma curta ou completa)
   **Answer**: thank you
   **Accepts**: thanks / thanks a lot / thank you so much
   **Explanation**: "Thank you" é a forma educada padrão. Em conversa casual, "Thanks" funciona igual — ambas valem. Em inglês falado, "Thanks" é até mais frequente.

6. **fill_gap** — "_____ morning! How are you?"
   **Hint**: Saudação da manhã
   **Answer**: Good
   **Explanation**: "Good morning" é a saudação usada da manhã até o meio-dia. Depois disso, vira "Good afternoon".

7. **fill_gap** — "A: Goodbye! B: _____ you later!"
   **Hint**: Despedida informal comum
   **Answer**: See
   **Explanation**: "See you later" é uma forma muito informal de dizer tchau. Entre amigos e colegas próximos.

8. **fix_error** — "Good meet you!"
   **Hint**: Frase padrão ao conhecer alguém
   **Answer**: Nice to meet you!
   **Explanation**: A frase correta é "Nice to meet you" — "Good meet you" não existe em inglês. Note também o "to" entre "Nice" e "meet".

9. **fix_error** — "How you are?"
   **Hint**: Em perguntas, o verbo "to be" vem antes do sujeito
   **Answer**: How are you?
   **Explanation**: Em perguntas em inglês, o auxiliar "are" vem antes do sujeito "you". Por isso é "How are you?" e não "How you are?".

10. **read_answer**
    **Passage**: "Ana: Good morning! How are you, Tom? Tom: I'm fine, thank you! And you? Ana: I'm great!"
    **Question**: Como Tom está? (responda em inglês com uma palavra)
    **Answer**: fine
    **Explanation**: Tom diz "I'm / I am fine, thank you" — "fine" significa bem/ótimo em inglês.

### 2. Listening/Speaking (5 phrases)

Charlotte fala via ElevenLabs (Rachel). Aluno repete; Azure Speech avalia pronúncia.

1. **"Hi! How are you?"** — saudação informal padrão
2. **"Good morning, everyone!"** — saudação formal de manhã (em grupo)
3. **"Nice to meet you."** — ao conhecer alguém novo
4. **"I'm fine, thank you."** — resposta educada
5. **"See you later!"** — despedida casual entre amigos

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
   **hidden_prompt**: "user says any positive state (good/fine/great/ok/well)"
   **hint_pt**: "I'm good!"
   **hint_en**: "I'm good!"
   **example_pass**: I'm good! | I'm fine, thanks. | Great, and you?
   **example_fail**: Yes (no state) | Hello (greeting, not a state) | I'm sad (negative state)

**Closing cue**: Charlotte fecha com "Great! Nice to see you. Talk to you later!" quando obj_1 baterem.

**Suggested flow** (referencial, 2 turnos):

1. **Student**: ~"I'm good!"
2. **Charlotte**: "Great! Nice to see you. Talk to you later!"

**Evaluation focus**:
- Aluno responde com algum estado positivo
- Pronúncia clara de "I'm good" / "Good"

#### Scripted (POC v1)

> Modo scripted (audio pré-gerado em CDN + classificador client-side de intent).
> Quando a unit tem este bloco, o cliente NÃO chama o LLM — fluxo determinístico
> pra garantir fidelidade pedagógica. Se nenhum padrão matchar após 2 tentativas
> no mesmo objective, cai pro modo LLM como fallback.

> N01 usa LLM puro (sem scripted). Base-da-base = 1 objetivo, 1 troca.
> Apos primeira fala do aluno, sessao encerra: acerto → card sucesso |
> erro → card "Quase!" com a resposta esperada + botao Refazer.

### 4. Guided Chat

**Cenário**: Charlotte te cumprimenta na segunda de manhã pelo chat.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "É segunda de manhã e a Charlotte te cumprimenta. Responde ela."
**Opening message**: "Good morning!"

**Sub-objectives** (POC base-da-base: 3 objetivos, todos 1-2 palavras):

1. **id**: 1
   **label_pt**: "Cumprimentar de manhã"
   **label_en**: "Greet back"
   **hidden_prompt**: "user greets back with 'good morning', 'morning', 'hi', 'hello' or similar"
   **hint_pt**: "Good morning!"
   **hint_en**: "Good morning!"
   **example_pass**: Good morning! | Morning! | Hi, Charlotte!
   **example_fail**: Good (incomplete) | Yes (no greeting) | Goodbye (wrong intent)

2. **id**: 2
   **label_pt**: "Dizer como você está"
   **label_en**: "Say how you are"
   **hidden_prompt**: "user says any positive state (fine/good/great/ok/well)"
   **hint_pt**: "I'm fine!"
   **hint_en**: "I'm fine!"
   **example_pass**: I'm fine! | I'm great, thanks. | Good, and you?
   **example_fail**: Fine (no subject + verb) | Yes (no state) | I'm sad (negative state)

3. **id**: 3
   **label_pt**: "Aceitar o café"
   **label_en**: "Accept the coffee"
   **hidden_prompt**: "user accepts the invitation (yes/sure/please/of course)"
   **hint_pt**: "Yes, please!"
   **hint_en**: "Yes, please!"
   **example_pass**: Yes, please! | Sure! | Of course, thanks!
   **example_fail**: No, thanks (rejection) | Coffee (bare noun) | Maybe later (not an acceptance)

**Closing cue**: Charlotte encerra com "Awesome, see you later!" quando obj_3 baterem.

**Script** (referencial, 6 turnos):

1. **Charlotte**: "Good morning!"
2. **Student**: "Good morning!" (or "Morning!")
3. **Charlotte**: "How are you?"
4. **Student**: "I'm fine!"
5. **Charlotte**: "Coffee?"
6. **Student**: "Yes, please!"
7. **Charlotte**: "Awesome, see you later!"

> N01 chat = LLM puro. Scaffold "Escreva:" aparece via hint_pt da
> objective pendente (cada um dos 3 objetivos vai destacando o próximo
> chunk esperado conforme aluno avança).

---

## Unit N02 — Meu nome é...

> **Sub-CEFR**: A1 | **Grammar focus**: Verb To Be (I am) + name + age | **Markers**: [denso] | **Tense**: PRESENTE · to be
> **Real-life context**: Primeiro dia em uma turma ou evento. Você se apresenta.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "_____ am Felipe."
   **Options**: I / He / We
   **Answer**: I
   **Explanation**: "Am" é a forma do verbo "to be" que vai SEMPRE com "I" (eu). Nunca "He am" ou "We am".

2. **multiple_choice** — "I _____ 25 years old."
   **Options**: am / is / are
   **Answer**: am
   **Explanation**: Com "I", o verbo "to be" é sempre "am". A frase quer dizer "Eu tenho 25 anos" — em inglês usa-se "to be" para idade, não "to have".

3. **word_bank** — "My name _____ Ana."
   **Choices**: is / am / are / be
   **Answer**: is
   **Explanation**: "My name" é terceira pessoa do singular (como "he" ou "she"), então usa "is". "My name is Ana" = "Meu nome é Ana".

4. **word_bank** — "Hello, _____ John."
   **Choices**: I'm / You're / He's / She's
   **Answer**: I'm
   **Explanation**: "I'm / I am" é a contração de "I am". Ao se apresentar, você diz "I'm / I am John" (sou o John). Bem mais comum que "I am John".

5. **fill_gap** — "I am _____ Brazil."
   **Hint**: Preposição de origem
   **Answer**: from
   **Explanation**: "I'm / I am from Brazil" = "Eu sou do Brasil". A preposição "from" indica origem em inglês.

6. **fill_gap** — "Her name _____ Maria."
   **Hint**: Verbo "to be" para terceira pessoa
   **Answer**: is
   **Explanation**: "Her name" é como "she" — terceira pessoa do singular. O verbo "to be" fica "is".

7. **fill_gap** — "Hi! _____ is my friend Tom."
   **Hint**: Use "This" (começa com T) — quando apresenta alguém perto de você, igual "Este é..." em português
   **Answer**: This
   **Explanation**: "This is + pessoa" = "Este é + pessoa". Use "This" pra apresentar alguém que está perto de você. Memoriza esse chunk: "This is my friend ___" funciona pra qualquer nome.

8. **fix_error** — "I are a student."
   **Hint**: Verbo "to be" com "I"
   **Answer**: I am a student.
   **Explanation**: Com "I" sempre se usa "am", nunca "are". A frase correta é "I am a student" (ou contraído: "I'm / I am a student").

9. **fix_error** — "My name am Ana."
   **Hint**: "My name" é terceira pessoa
   **Answer**: My name is Ana.
   **Explanation**: "My name" funciona como "it" ou "she/he" — terceira pessoa do singular. O verbo "to be" fica "is", não "am".

10. **read_answer**
    **Passage**: "Hi! My name is Sarah. I am 30 years old, and I am from New York. Nice to meet you!"
    **Question**: Quantos anos Sarah tem? (responda com um número)
    **Answer**: 30
    **Explanation**: Sarah diz "I am 30 years old". A idade dela é 30.

### 2. Listening/Speaking (5 phrases)

1. **"My name is Felipe."** — apresentando seu nome
2. **"I'm 25 years old."** — sua idade
3. **"I'm from Brazil."** — sua origem
4. **"This is my friend Tom."** — apresentando alguém
5. **"Nice to meet you, Felipe."** — resposta ao se apresentar

### 3. Role-play

**Cenário**: Charlotte propõe uma simulação rápida pra você praticar se apresentar como se acabassem de se conhecer.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 90s
**Opening line**: "Let's practice. Pretend we just met — tell me your name."

**Sub-objectives** (POC base-da-base: 1 objetivo apenas):

1. **id**: 1
   **label_pt**: "Se apresentar pelo nome"
   **label_en**: "Introduce yourself by name"
   **hidden_prompt**: "user introduces themselves using 'I'm + name' or 'my name is + name' — any name counts, the structure is what matters"
   **hint_pt**: "I'm Felipe!"
   **hint_en**: "I'm Felipe!"
   **example_pass**: I'm Felipe! | My name is Ana. | Hi, I'm Tom.
   **example_fail**: Felipe (bare name) | Hello (greeting only) | Nice to meet you (no name given)

**Closing cue**: Charlotte fecha com "Nice to meet you! Great intro." quando obj_1 baterem.

**Suggested flow** (referencial, 2 turnos):

1. **Student**: ~"I'm Felipe!"
2. **Charlotte**: "Nice to meet you! Great intro."

**Evaluation focus**:
- Aluno usa "I'm + nome" ou "My name is + nome"
- Pronúncia clara de "I'm"

### 4. Guided Chat

**Cenário**: Charlotte simula uma apresentação completa por chat — como se vocês estivessem se conhecendo num app.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "Vamos praticar uma apresentação completa por texto. Charlotte puxa como se vocês acabassem de se conhecer num app."
**Opening message**: "Hey! Tell me about yourself."

**Sub-objectives** (POC base-da-base: 3 objetivos, todos curtos):

1. **id**: 1
   **label_pt**: "Se apresentar pelo nome"
   **label_en**: "Say your name"
   **hidden_prompt**: "user introduces themselves with 'I'm + name' or 'my name is + name'"
   **hint_pt**: "I'm Felipe!"
   **hint_en**: "I'm Felipe!"
   **example_pass**: I'm Felipe! | My name is Ana. | Hi, I'm Tom.
   **example_fail**: Felipe (bare name) | Hello (greeting only) | I am (incomplete)

2. **id**: 2
   **label_pt**: "Dizer sua idade"
   **label_en**: "Say your age"
   **hidden_prompt**: "user states their age using 'I'm + number + years old' or just 'I'm + number'"
   **hint_pt**: "I'm 25 years old."
   **hint_en**: "I'm 25 years old."
   **example_pass**: I'm 25 years old. | I'm 30. | I am 18 years old.
   **example_fail**: 25 (bare number) | Years old (no number/subject) | I have 25 years (wrong verb — translation from PT)

3. **id**: 3
   **label_pt**: "Dizer de onde você é"
   **label_en**: "Say where you're from"
   **hidden_prompt**: "user states origin using 'I'm from + place'"
   **hint_pt**: "I'm from Brazil."
   **hint_en**: "I'm from Brazil."
   **example_pass**: I'm from Brazil.
   **example_fail**: Brazil (bare place) | I'm Brazilian (nationality, not origin structure) | From Brazil (no subject + verb)

**Closing cue**: Charlotte encerra com "Nice — great to meet you!" quando obj_3 baterem.

**Script** (referencial, 7 turnos):

1. **Charlotte**: "Hey! Tell me about yourself."
2. **Student**: "I'm Felipe!"
3. **Charlotte**: "Nice! How old are you?"
4. **Student**: "I'm 25 years old."
5. **Charlotte**: "Cool! Where are you from?"
6. **Student**: "I'm from Brazil."
7. **Charlotte**: "Nice — great to meet you!"

> N02 chat = LLM puro. Scaffold aparece via hint_pt da objective pendente (1 → 2 → 3).

---

## Unit N03 — De onde você é?

> **Sub-CEFR**: A1 | **Grammar focus**: To Be: questions + nationalities/countries | **Markers**: [qform] | **Tense**: PRESENTE · to be · pergunta
> **Real-life context**: Conversando com um estranho no portão de embarque do aeroporto.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "Where _____ you from?"
   **Options**: are / is / am
   **Answer**: are
   **Explanation**: "Where are you from?" é a pergunta padrão. "You" sempre usa "are".

2. **multiple_choice** — "_____ she Italian?"
   **Options**: Is / Are / Am
   **Answer**: Is
   **Explanation**: Em perguntas com "she/he/it", o verbo "to be" vira "is" e vem antes do sujeito.

3. **word_bank** — "_____ they Brazilian?"
   **Choices**: Are / Is / Am / Do
   **Answer**: Are
   **Explanation**: Plurais (they/we/you) usam "are". A inversão sujeito-verbo faz "Are they...?".

4. **word_bank** — "I'm from _____."
   **Choices**: Brazil / Brazilian / Brazil's / The Brazil
   **Answer**: Brazil
   **Explanation**: Após "from" vem o NOME DO PAÍS, não o adjetivo. "Brazilian" é a nacionalidade (eu sou brasileiro). "Brazil" é o país.

5. **fill_gap** — "Where _____ Sarah from?"
   **Hint**: Verbo "to be" para terceira pessoa
   **Answer**: is
   **Explanation**: Sarah é "she", então o verbo é "is". A pergunta vira "Where is Sarah from?".

6. **fill_gap** — "He is _____ the United States."
   **Hint**: Preposição de origem
   **Answer**: from
   **Explanation**: "From" indica origem. Note que países como United States, UK, Philippines levam "the" antes do nome.

7. **fill_gap** — "_____ you Brazilian?"
   **Hint**: Pergunta com "you"
   **Answer**: Are
   **Explanation**: Pergunta de sim/não em inglês inverte o verbo: "Are you...?" em vez de "You are...".

8. **fix_error** — "You are from where?"
   **Hint**: Ordem da pergunta WH
   **Answer**: Where are you from?
   **Explanation**: Em perguntas WH-, a estrutura é: WH-word + auxiliar + sujeito. "Where are you from?" — não "You are from where?".

9. **fix_error** — "Is they French?"
   **Hint**: "They" é plural
   **Answer**: Are they French?
   **Explanation**: "They" é plural, então usa "are", não "is". "Are they French?".

10. **read_answer**
    **Passage**: "I have two friends abroad. Anna is from Italy and she lives in Rome. Lucas is from Brazil but lives in Lisbon."
    **Question**: De onde Anna é?
    **Answer**: Italy
    **Explanation**: O texto diz "Anna is from Italy". Note que ela MORA em Roma, mas é DE Itália.

### 2. Listening/Speaking (5 phrases)

1. **"Where are you from?"** — pergunta padrão de origem
2. **"I'm from São Paulo, Brazil."** — resposta completa
3. **"Are you Brazilian?"** — checando nacionalidade
4. **"Yes, I am."** — resposta afirmativa curta
5. **"No, I'm not. I'm Portuguese."** — corrigindo

### 3. Role-play

**Cenário**: Charlotte simula um passageiro no portão de embarque que puxa uma conversa enquanto vocês esperam.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 90s
**Opening line**: "Hi! Are you on the São Paulo flight too? Where are you from?"

**Sub-objectives** (POC base-da-base: 1 objetivo apenas):

1. **id**: 1
   **label_pt**: "Dizer de onde você é"
   **label_en**: "Say where you're from"
   **hidden_prompt**: "user states their origin using 'I'm from + place' — city or country both count"
   **hint_pt**: "I'm from Brazil!"
   **hint_en**: "I'm from Brazil!"
   **example_pass**: I'm from Brazil!
   **example_fail**: Brazil (bare place) | I'm Brazilian (nationality, not origin structure) | From Brazil (no subject + verb)

**Closing cue**: Charlotte fecha com "Cool! Have a great flight." quando obj_1 baterem.

**Suggested flow** (referencial, 2 turnos):

1. **Student**: ~"I'm from Brazil!"
2. **Charlotte**: "Cool! Have a great flight."

**Evaluation focus**:
- Aluno usa "I'm from + lugar"
- Pronúncia clara de "from"

### 4. Guided Chat

**Cenário**: Charlotte simula uma conversa num app de troca de idiomas — vocês acabaram de fazer match.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "Charlotte simula um match num app de idiomas. Pratica dizer de onde você é e devolver a pergunta."
**Opening message**: "Hey! Nice to match. Where are you from?"

**Sub-objectives** (POC base-da-base: 3 objetivos, todos curtos):

1. **id**: 1
   **label_pt**: "Dizer de onde você é"
   **label_en**: "Say where you're from"
   **hidden_prompt**: "user states origin with 'I'm from + place'"
   **hint_pt**: "I'm from Brazil."
   **hint_en**: "I'm from Brazil."
   **example_pass**: I'm from Brazil.
   **example_fail**: Brazil (bare place) | I'm Brazilian (nationality, not origin) | From Brazil (no subject + verb)

2. **id**: 2
   **label_pt**: "Dizer sua nacionalidade"
   **label_en**: "Say your nationality"
   **hidden_prompt**: "user states nationality with 'I'm + nationality adjective' (e.g., 'I'm Brazilian', 'I'm Portuguese')"
   **hint_pt**: "I'm Brazilian."
   **hint_en**: "I'm Brazilian."
   **example_pass**: I'm Brazilian. | I am Portuguese. | Yes, I'm Brazilian.
   **example_fail**: Brazilian (bare adjective) | I'm from Brazil (origin, not nationality structure) | Brazil (bare country)

3. **id**: 3
   **label_pt**: "Perguntar de onde Charlotte é"
   **label_en**: "Ask where Charlotte is from"
   **hidden_prompt**: "user asks Charlotte where she's from, using present 'to be' question (Where are you from?) or short tag ('And you?')"
   **hint_pt**: "Where are you from?"
   **hint_en**: "Where are you from?"
   **example_pass**: Where are you from? | And you? | How about you?
   **example_fail**: I'm from Brazil (statement) | Yes (single word) | Where were you from? (wrong tense) | Where do you live? (off-intent)

**Closing cue**: Charlotte encerra com "Awesome! Talk soon." quando obj_3 baterem.

**Script** (referencial, 7 turnos):

1. **Charlotte**: "Hey! Nice to match. Where are you from?"
2. **Student**: "I'm from Brazil."
3. **Charlotte**: "Cool! Are you Brazilian?"
4. **Student**: "I'm Brazilian."
5. **Charlotte**: "First time chatting with someone from Brazil."
6. **Student**: "Where are you from?"
7. **Charlotte**: "I'm from New York. Awesome — talk soon!"

> N03 chat = LLM puro. Scaffold aparece via hint_pt da objective pendente.

---

## Unit N04 — Como você se sente?

> **Sub-CEFR**: A1 | **Grammar focus**: Feelings chunks (I'm + emotion adjective) | **Markers**: — | **Tense**: PRESENTE · to be
> **Real-life context**: Charlotte te chama pra um check-in. Pratica dizer como você se sente além de "good".

### 1. Grammar (10 exercises)

1. **multiple_choice** — "I'm _____ today. My dog is sick."
   **Options**: sad / happy / hungry
   **Answer**: sad
   **Explanation**: "Sad" (triste) é o sentimento adequado quando algo ruim acontece. "Happy" seria oposto, e "hungry" (com fome) não cabe aqui.

2. **multiple_choice** — "She _____ tired after work."
   **Options**: is / are / am
   **Answer**: is
   **Explanation**: "She" usa "is". "She is tired" = "Ela está cansada".

3. **word_bank** — "I'm _____ to see you!"
   **Choices**: happy / sad / tired / busy
   **Answer**: happy
   **Explanation**: "Happy to see you" = "feliz em te ver". É um chunk fixo de saudação calorosa.

4. **word_bank** — "He's _____ for the trip."
   **Choices**: excited / tired / hungry / busy
   **Answer**: excited
   **Explanation**: "Excited for/about" = animado, empolgado. Combinação natural com "trip" (viagem).

5. **fill_gap** — "I'm _____ hungry. Let's eat."
   **Hint**: Intensificador (muito, tão)
   **Answer**: so
   **Explanation**: "So + adjetivo" intensifica: "so hungry" = "com muita fome". Também pode usar "really hungry".

6. **fill_gap** — "_____ are you feeling today?"
   **Hint**: Pergunta sobre como (não onde, não quando)
   **Answer**: How
   **Explanation**: "How are you feeling?" pergunta sobre estado emocional/físico. É mais íntimo que "How are you?".

7. **fill_gap** — "She is _____ today. Lots of meetings."
   **Hint**: Estado de quem tem muita coisa pra fazer
   **Answer**: busy
   **Explanation**: "Busy" = ocupado. "She is busy today" é resposta natural quando alguém tem muito trabalho.

8. **fix_error** — "I tired am."
   **Hint**: Ordem da frase
   **Answer**: I am tired.
   **Explanation**: A ordem em inglês é: sujeito + verbo + complemento. "I am tired" — não "I tired am" (que seria a ordem do PT-BR às vezes).

9. **fix_error** — "How feels you?"
   **Hint**: Use "to be" + verbo no -ing ("How are you ___ing?")
   **Answer**: How are you feeling?
   **Explanation**: A forma correta usa "to be" + verbo no -ing: "How are you feeling?" — não "How feels you?". Outra forma comum: "How do you feel?".

10. **read_answer**
    **Passage**: "Tom: Hey Ana, are you okay? You look down. Ana: I'm tired and a bit stressed. Work is crazy this week."
    **Question**: Como Ana se sente? (dê uma palavra)
    **Answer**: tired
    **Explanation**: Ana diz "I'm / I am tired and a bit stressed". A primeira palavra que descreve ela é "tired" (cansada).

### 2. Listening/Speaking (5 phrases)

1. **"I'm so happy today!"** — sentimento positivo intenso
2. **"She's really tired."** — descrevendo terceiro
3. **"Are you hungry?"** — perguntando sobre fome
4. **"I'm a bit busy right now."** — recusa educada
5. **"How are you feeling?"** — pergunta empática

### 3. Role-play

**Cenário**: Charlotte abre um check-in rápido e quer saber como você está hoje — de verdade, não só "good".
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 90s
**Opening line**: "Hey! Quick check-in — how are you feeling today?"

**Sub-objectives** (POC base-da-base: 1 objetivo apenas):

1. **id**: 1
   **label_pt**: "Dizer como você se sente com um adjetivo"
   **label_en**: "Say how you feel with an adjective"
   **hidden_prompt**: "user describes feeling with 'I'm + adjective' beyond just 'good' or 'fine' — tired/happy/busy/excited/stressed/hungry all count"
   **hint_pt**: "I'm tired!"
   **hint_en**: "I'm tired!"
   **example_pass**: I'm tired! | I'm so happy today. | I'm a bit stressed.
   **example_fail**: Tired (bare adjective) | I'm good (too generic — not beyond 'good') | Yes (no adjective)

**Closing cue**: Charlotte fecha com "Thanks for sharing. Take care!" quando obj_1 baterem.

**Suggested flow** (referencial, 2 turnos):

1. **Student**: ~"I'm tired!"
2. **Charlotte**: "Thanks for sharing. Take care!"

**Evaluation focus**:
- Aluno usa "I'm + adjetivo" além de "good" ou "fine"
- Pronúncia clara do adjetivo escolhido

### 4. Guided Chat

**Cenário**: Charlotte puxa um chat rápido pra trocar como cada uma está se sentindo hoje.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "Charlotte abre um chat curto. Pratica falar como se sente, devolver a pergunta, e reagir com empatia."
**Opening message**: "Hey! How are you feeling today?"

**Sub-objectives** (POC base-da-base: 3 objetivos, todos curtos):

1. **id**: 1
   **label_pt**: "Dizer como se sente com um adjetivo"
   **label_en**: "Say how you feel with an adjective"
   **hidden_prompt**: "user describes feeling with 'I'm + adjective' (tired/busy/excited/happy/stressed) — must be more than just 'good'"
   **hint_pt**: "I'm tired."
   **hint_en**: "I'm tired."
   **example_pass**: I'm tired. | I'm so happy today. | I'm a bit stressed.
   **example_fail**: Tired (bare adjective) | I'm good (too generic) | Yes (no adjective)

2. **id**: 2
   **label_pt**: "Devolver a pergunta"
   **label_en**: "Ask back"
   **hidden_prompt**: "user asks Charlotte back about how she's feeling, using a tag question ('And you?', 'How about you?') or full present question ('How are you feeling?')"
   **hint_pt**: "And you?"
   **hint_en**: "And you?"
   **example_pass**: And you? | How about you? | How are you feeling?
   **example_fail**: I'm tired (statement) | Yeah (single word) | And you were? (wrong tense) | What's your name? (off-intent)

3. **id**: 3
   **label_pt**: "Reagir com empatia"
   **label_en**: "React with empathy"
   **hidden_prompt**: "user reacts to Charlotte's reply with empathy ('I'm sorry to hear', 'oh nice', 'glad to hear', 'that's great')"
   **hint_pt**: "I'm sorry to hear that."
   **hint_en**: "I'm sorry to hear that."
   **example_pass**: I'm sorry to hear that. | Oh, that's tough. | Glad to hear!
   **example_fail**: Ok (no empathy) | Yes (no reaction) | Bye (off-intent)

**Closing cue**: Charlotte encerra com "Thanks! Talk to you later." quando obj_3 baterem.

**Script** (referencial, 7 turnos):

1. **Charlotte**: "Hey! How are you feeling today?"
2. **Student**: "I'm tired."
3. **Charlotte**: "Oh, why's that?"
4. **Student**: "And you?"
5. **Charlotte**: "Honestly, a bit stressed — busy week."
6. **Student**: "I'm sorry to hear that."
7. **Charlotte**: "Thanks! Talk to you later."

> N04 chat = LLM puro. Scaffold aparece via hint_pt da objective pendente.

---

## Unit N05 — Tchau, até mais

> **Sub-CEFR**: A1 | **Grammar focus**: Goodbye chunks | **Markers**: — | **Tense**: EXPRESSÕES
> **Real-life context**: Você está terminando uma aula ou conversa e quer se despedir com carinho.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "_____ tomorrow!"
   **Options**: See you / Hello / Welcome
   **Answer**: See you
   **Explanation**: "See you tomorrow" é despedida específica para quando você vai ver a pessoa amanhã. "Hello" é saudação, não despedida.

2. **multiple_choice** — "Have a _____ weekend!"
   **Options**: great / sad / busy
   **Answer**: great
   **Explanation**: "Have a great weekend" é o desejo padrão na sexta-feira. "Great", "good" ou "nice" — todos funcionam. "Sad" ou "busy" seriam estranhos.

3. **word_bank** — "_____ care!"
   **Choices**: Take / Have / Make / Do
   **Answer**: Take
   **Explanation**: "Take care" é uma despedida calorosa que significa "se cuida". É um chunk fixo — você não diz "Have care" ou "Make care".

4. **word_bank** — "See you _____."
   **Choices**: soon / often / quickly / always
   **Answer**: soon
   **Explanation**: "See you soon" = "te vejo em breve". Despedida calorosa quando vocês vão se ver de novo logo.

5. **fill_gap** — "Goodbye! Have a _____ day."
   **Hint**: Adjetivo positivo
   **Answer**: nice
   **Explanation**: "Have a nice day" é despedida educada padrão. Também aceita "good day", "great day".

6. **fill_gap** — "_____ you next week!"
   **Hint**: Despedida com referência temporal
   **Answer**: See
   **Explanation**: "See you next week" = "te vejo semana que vem". Padrão para combinar próximo encontro.

7. **fill_gap** — "_____ care of yourself."
   **Hint**: Cuidado consigo mesmo
   **Answer**: Take
   **Explanation**: "Take care of yourself" é mais longa que só "Take care" — usada quando a pessoa está doente, estressada, ou em momento delicado.

8. **fix_error** — "See later you!"
   **Hint**: Ordem das palavras
   **Answer**: See you later!
   **Explanation**: A ordem correta é "See you later" — pronome "you" vem antes de "later".

9. **fix_error** — "Take of care!"
   **Hint**: "Take care" é chunk fixo
   **Answer**: Take care!
   **Explanation**: "Take care" é uma expressão fixa, sem "of". "Take CARE of yourself" leva "of" só nessa versão longa.

10. **read_answer**
    **Passage**: "Ana: This dinner was lovely! Thank you for inviting me. Tom: My pleasure! Drive safely. Take care!"
    **Question**: O que Tom diz no final? (dê 2 palavras)
    **Answer**: Take care
    **Explanation**: Tom termina com "Take care!" — uma despedida calorosa após o jantar.

### 2. Listening/Speaking (5 phrases)

1. **"See you tomorrow!"** — despedida com encontro próximo
2. **"Have a nice day!"** — despedida educada padrão
3. **"Take care!"** — despedida calorosa
4. **"Goodbye, see you soon!"** — despedida formal + esperança de reencontro
5. **"Bye for now!"** — informal, próximo encontro indefinido

### 3. Role-play

**Cenário**: Vocês terminaram uma aula. Charlotte se despede e você responde com um chunk caloroso (não só "bye").
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 90s
**Opening line**: "Alright, that's it for today. Have a great rest of your day!"

**Sub-objectives** (POC base-da-base: 1 objetivo apenas):

1. **id**: 1
   **label_pt**: "Se despedir com um chunk caloroso (não só 'bye')"
   **label_en**: "Say goodbye warmly (not just 'bye')"
   **hidden_prompt**: "user says a warm goodbye like 'see you later', 'take care', 'have a good one', 'thanks bye', 'see you' — anything beyond just 'bye'"
   **hint_pt**: "See you later!"
   **hint_en**: "See you later!"
   **example_pass**: See you later! | Take care! | Thanks, bye!
   **example_fail**: Bye (just 'bye' — too cold) | Hi (greeting) | Ok (no closing chunk)

**Closing cue**: Charlotte fecha com "Take care! See you next time." quando obj_1 baterem.

**Suggested flow** (referencial, 2 turnos):

1. **Student**: ~"See you later!"
2. **Charlotte**: "Take care! See you next time."

**Evaluation focus**:
- Aluno usa chunk caloroso além de só "bye"
- Pronúncia clara de "see you" ou "take care"

### 4. Guided Chat

**Cenário**: Vocês tiveram uma conversa boa por chat e está na hora de encerrar. Pratica fechar com várias camadas, não só "bye".
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "A conversa tá indo bem mas Charlotte precisa ir. Pratica encerrar com várias camadas de despedida calorosa."
**Opening message**: "Hey, I gotta go now."

**Sub-objectives** (POC base-da-base: 3 objetivos, todos curtos):

1. **id**: 1
   **label_pt**: "Sinalizar que foi bom conversar"
   **label_en**: "Say it was nice talking"
   **hidden_prompt**: "user signals it was good talking with 'it was great talking', 'nice talking', 'good chat', or similar"
   **hint_pt**: "It was great talking!"
   **hint_en**: "It was great talking!"
   **example_pass**: It was great talking! | Nice talking to you. | Good chat!
   **example_fail**: Great (bare adjective) | Bye (no signal) | Thanks (no closing meta-comment)

2. **id**: 2
   **label_pt**: "Desejar um bom dia"
   **label_en**: "Wish a good day"
   **hidden_prompt**: "user wishes Charlotte a good day or weekend ('have a great day', 'have a nice weekend')"
   **hint_pt**: "Have a great day!"
   **hint_en**: "Have a great day!"
   **example_pass**: Have a great day! | Have a nice weekend! | Have a good one!
   **example_fail**: Great day (missing 'have a') | Good (bare adjective) | Bye (no wish)

3. **id**: 3
   **label_pt**: "Encerrar com 'take care' ou variação calorosa"
   **label_en**: "Sign off with 'take care'"
   **hidden_prompt**: "user closes with 'take care', 'you too', 'talk soon', or similar warm sign-off"
   **hint_pt**: "Take care!"
   **hint_en**: "Take care!"
   **example_pass**: Take care! | You too! | Talk soon!
   **example_fail**: Bye (too cold) | Ok (no warm sign-off) | Care (incomplete)

**Closing cue**: Charlotte encerra com "Bye for now! Take care." quando obj_3 baterem.

**Script** (referencial, 7 turnos):

1. **Charlotte**: "Hey, I gotta go now."
2. **Student**: "It was great talking!"
3. **Charlotte**: "Same here. Let's chat again soon."
4. **Student**: "Have a great day!"
5. **Charlotte**: "You too!"
6. **Student**: "Take care!"
7. **Charlotte**: "Bye for now! Take care."

> N05 chat = LLM puro. Scaffold aparece via hint_pt da objective pendente.

---

## Cross-unit consolidation

Ao terminar M01, o aluno deve usar naturalmente:
- Saudação por horário (good morning/afternoon/evening)
- Apresentação completa (name + age + origin)
- Pergunta de origem (Where are you from?) e resposta com nacionalidade
- Expressão de sentimento (I'm + adjective)
- Despedida calorosa (Take care, See you, Have a nice day)

Esses chunks formam o **kit de sobrevivência** para qualquer interação social básica em inglês.
