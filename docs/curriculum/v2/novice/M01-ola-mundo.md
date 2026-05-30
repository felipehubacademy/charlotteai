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

> **Sub-CEFR**: A1 | **Grammar focus**: Greetings & survival chunks | **Markers**: —
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
   **Hint**: Resposta educada após "I'm fine"
   **Answer**: thank you
   **Explanation**: "I'm fine, thank you" é a resposta educada padrão. Em conversa casual também se usa "I'm fine, thanks".

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
   **Hint**: Ordem do auxiliar em perguntas
   **Answer**: How are you?
   **Explanation**: Em perguntas em inglês, o auxiliar "are" vem antes do sujeito "you". Por isso é "How are you?" e não "How you are?".

10. **read_answer**
    **Passage**: "Ana: Good morning! How are you, Tom? Tom: I'm fine, thank you! And you? Ana: I'm great!"
    **Question**: Como Tom está? (responda em inglês com uma palavra)
    **Answer**: fine
    **Explanation**: Tom diz "I'm fine, thank you" — "fine" significa bem/ótimo em inglês.

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

2. **id**: 2
   **label_pt**: "Dizer como você está"
   **label_en**: "Say how you are"
   **hidden_prompt**: "user says any positive state (fine/good/great/ok/well)"
   **hint_pt**: "I'm fine!"
   **hint_en**: "I'm fine!"

3. **id**: 3
   **label_pt**: "Aceitar o café"
   **label_en**: "Accept the coffee"
   **hidden_prompt**: "user accepts the invitation (yes/sure/please/of course)"
   **hint_pt**: "Yes, please!"
   **hint_en**: "Yes, please!"

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

> **Sub-CEFR**: A1 | **Grammar focus**: Verb To Be (I am) + name + age | **Markers**: [denso]
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
   **Explanation**: "I'm" é a contração de "I am". Ao se apresentar, você diz "I'm John" (sou o John). Bem mais comum que "I am John".

5. **fill_gap** — "I am _____ Brazil."
   **Hint**: Preposição de origem
   **Answer**: from
   **Explanation**: "I'm from Brazil" = "Eu sou do Brasil". A preposição "from" indica origem em inglês.

6. **fill_gap** — "Her name _____ Maria."
   **Hint**: Verbo "to be" para terceira pessoa
   **Answer**: is
   **Explanation**: "Her name" é como "she" — terceira pessoa do singular. O verbo "to be" fica "is".

7. **fill_gap** — "Hi! _____ is my friend Tom."
   **Hint**: Apresentando alguém (perto de você)
   **Answer**: This
   **Explanation**: "This is + pessoa" é a forma padrão de apresentar alguém. "This is my friend Tom" = "Este é meu amigo Tom".

8. **fix_error** — "I are a student."
   **Hint**: Verbo "to be" com "I"
   **Answer**: I am a student.
   **Explanation**: Com "I" sempre se usa "am", nunca "are". A frase correta é "I am a student" (ou contraído: "I'm a student").

9. **fix_error** — "My name am Ana."
   **Hint**: "My name" é terceira pessoa
   **Answer**: My name is Ana.
   **Explanation**: "My name" funciona como "it" ou "she/he" — terceira pessoa do singular. O verbo "to be" fica "is", não "am".

10. **read_answer**
    **Passage**: "Hi! My name is Sarah. I am 30 years old, and I am from New York. Nice to meet you!"
    **Question**: How old is Sarah? (answer with a number)
    **Answer**: 30
    **Explanation**: Sarah diz "I am 30 years old". A idade dela é 30.

### 2. Listening/Speaking (5 phrases)

1. **"My name is Felipe."** — apresentando seu nome
2. **"I'm 25 years old."** — sua idade
3. **"I'm from Brazil."** — sua origem
4. **"This is my friend Tom."** — apresentando alguém
5. **"Nice to meet you, Felipe."** — resposta ao se apresentar

### 3. Role-play

**Cenário**: Primeiro dia de um curso de inglês presencial. A professora pediu para cada aluno se apresentar para a turma.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Teacher (professora do curso)
**Persona outfit**: `charlotte_teacher_classroom`
**Time budget**: 180s
**Opening line**: "Welcome, everyone! Let's go around the room. Tell us your name, where you're from, and one thing about you."

**Sub-objectives**:

1. **id**: 1
   **label_pt**: "Dizer seu nome"
   **label_en**: "Say your name"
   **hidden_prompt**: "user states their name using 'I'm' or 'my name is'"
   **hint_pt**: "Tenta 'Hi, I'm [seu nome]' ou 'My name is [nome]'"
   **hint_en**: "Try 'Hi, I'm [your name]' or 'My name is [name]'"

2. **id**: 2
   **label_pt**: "Dizer de onde você é"
   **label_en**: "Say where you're from"
   **hidden_prompt**: "user states their origin using 'I'm from + place'"
   **hint_pt**: "Use 'I'm from + cidade ou país', tipo 'I'm from Brazil'"
   **hint_en**: "Use 'I'm from + city or country', like 'I'm from Brazil'"

3. **id**: 3
   **label_pt**: "Dizer sua idade"
   **label_en**: "Say your age"
   **hidden_prompt**: "user states their age using 'I'm + number + years old' or 'I'm + number'"
   **hint_pt**: "Em inglês a idade vai com 'to be': 'I'm 25 years old'"
   **hint_en**: "Age uses 'to be': 'I'm 25 years old'"

4. **id**: 4
   **label_pt**: "Compartilhar uma coisa que você gosta"
   **label_en**: "Share one thing you like"
   **hidden_prompt**: "user mentions something they like with 'I like + noun'"
   **hint_pt**: "'I like + coisa', tipo 'I like music' ou 'I like coffee'"
   **hint_en**: "'I like + thing', like 'I like music' or 'I like coffee'"

**Closing cue**: Teacher fecha com "Wonderful! Welcome to the class!" quando os 4 objetivos baterem.

**Suggested flow** (referencial, 5 turnos):

1. **Student**: ~"Hi, my name is [nome]. I'm from Brazil."
2. **Teacher**: "Lovely! And how old are you?"
3. **Student**: ~"I'm [idade] years old."
4. **Teacher**: "Great! Tell us one thing you like."
5. **Student**: ~"I like music." / "I like coffee."
6. **Teacher**: "Wonderful! Welcome to the class!"

**Evaluation focus**:
- Uso correto de "I am" / "I'm"
- Pronúncia de "name", "from", "old"
- Naturalidade ao encadear nome → origem → idade

### 4. Guided Chat

**Cenário**: Você acabou de adicionar Tom no WhatsApp (vocês se conheceram numa festa).
**Voiced by**: `charlie`
**Persona**: Tom (colega de trabalho)
**Persona outfit**: `tom_party_evening`
**Intro (em PT)**: "Você adicionou o Tom no WhatsApp ontem (conheceu ele numa festa). Hoje manda a primeira mensagem se apresentando direito."
**Opening message**: "Hey! Sorry, who's this? I added a few people last night."

**Sub-objectives**:

1. **id**: 1
   **label_pt**: "Se identificar e dar contexto de onde se conheceram"
   **label_en**: "Identify yourself and remind where you met"
   **hidden_prompt**: "user gives their name AND references the party/where they met"
   **hint_pt**: "Tenta 'Hi Tom, I'm [nome]. We met at the party yesterday'"
   **hint_en**: "Try 'Hi Tom, I'm [name]. We met at the party yesterday'"

2. **id**: 2
   **label_pt**: "Dizer de onde você é"
   **label_en**: "Say where you're from"
   **hidden_prompt**: "user states their origin using 'I'm from + place'"
   **hint_pt**: "'I'm from [cidade], Brazil'"
   **hint_en**: "'I'm from [city], Brazil'"

3. **id**: 3
   **label_pt**: "Dizer sua idade"
   **label_en**: "Say your age"
   **hidden_prompt**: "user states their age using 'I'm + number + years old'"
   **hint_pt**: "'I'm 25 years old'"
   **hint_en**: "'I'm 25 years old'"

**Closing cue**: Tom encerra com "Cool, nice to officially meet you! Talk soon." quando os 3 objetivos baterem.
**Recap (PT)**: "Excelente! Você usou os blocos básicos da apresentação: 'I'm + nome', 'I'm from + lugar', 'I'm + idade + years old'. Esses três chunks juntos já te permitem se apresentar em qualquer lugar do mundo."

**Script** (referencial, 6 turnos):

1. **Student** (expected): "Hi Tom! I'm [nome]. We met at the party yesterday."
   *Se aluno escrever só "Hi Tom":* Tom: "Hey! Sorry, lots of new faces last night — can you remind me who you are? 'We met at the party' would help."

2. **Tom**: "Oh right! Good to hear from you. Where are you from again?"

3. **Student** (expected): "I'm from [cidade], Brazil."

4. **Tom**: "Nice — I'm from California. How old are you, if I may ask?"

5. **Student** (expected): "I'm [idade] years old."

6. **Tom**: "Cool, nice to officially meet you! Talk soon."

---

## Unit N03 — De onde você é?

> **Sub-CEFR**: A1 | **Grammar focus**: To Be: questions + nationalities/countries | **Markers**: [qform]
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
    **Question**: Where is Anna from?
    **Answer**: Italy
    **Explanation**: O texto diz "Anna is from Italy". Note que ela MORA em Roma, mas é DE Itália.

### 2. Listening/Speaking (5 phrases)

1. **"Where are you from?"** — pergunta padrão de origem
2. **"I'm from São Paulo, Brazil."** — resposta completa
3. **"Are you Brazilian?"** — checando nacionalidade
4. **"Yes, I am."** — resposta afirmativa curta
5. **"No, I'm not. I'm Portuguese."** — corrigindo

### 3. Role-play

**Cenário**: Você está esperando no portão de embarque do aeroporto. Outro passageiro puxa conversa enquanto vocês aguardam.
**Tipo**: Live Voice
**Voiced by**: `charlie`
**Persona**: Passenger (passageiro no aeroporto)
**Persona outfit**: `charlie_passenger_airport`
**Time budget**: 180s
**Opening line**: "Hi! Are you waiting for the São Paulo flight too?"

**Sub-objectives**:

1. **id**: 1
   **label_pt**: "Confirmar e devolver a pergunta sobre o destino"
   **label_en**: "Confirm and ask about their destination too"
   **hidden_prompt**: "user confirms they're on the same flight AND asks something back about the other person's trip/destination"
   **hint_pt**: "Tenta 'Yes, I am. Are you going to São Paulo too?'"
   **hint_en**: "Try 'Yes, I am. Are you going to São Paulo too?'"

2. **id**: 2
   **label_pt**: "Dizer de onde você é"
   **label_en**: "Say where you're from"
   **hidden_prompt**: "user states their origin using 'I'm from + place'"
   **hint_pt**: "'I'm from [cidade]. And you?' — devolve a pergunta também"
   **hint_en**: "'I'm from [city]. And you?' — return the question"

3. **id**: 3
   **label_pt**: "Dizer se está viajando a trabalho, férias ou outro motivo"
   **label_en**: "Say if you're traveling for work, vacation, or another reason"
   **hidden_prompt**: "user mentions the purpose of the trip (vacation, work, visiting family, going home)"
   **hint_pt**: "Algo simples: 'I'm visiting family' ou 'No, I'm going home'"
   **hint_en**: "Keep it simple: 'I'm visiting family' or 'No, I'm going home'"

**Closing cue**: Passenger encerra com "Have a great trip!" quando os 3 objetivos baterem.

**Suggested flow** (referencial, 5 turnos):

1. **Student**: ~"Yes, I am. Are you going to São Paulo too?"
2. **Passenger**: "Yes! I'm going for work. Where are you from?"
3. **Student**: ~"I'm from [cidade]. And you?"
4. **Passenger**: "I'm from Lisbon. Are you on vacation?"
5. **Student**: ~"No, I'm going home." / "Yes, I'm visiting family."
6. **Passenger**: "Have a great trip!"

**Evaluation focus**:
- Uso correto de "Are you...?" e "I'm from..."
- Reciprocidade: aluno também faz perguntas, não só responde
- Pronúncia natural de "Where are you from?"

### 4. Guided Chat

**Cenário**: Você baixou um app de troca de idiomas (tipo Tandem, HelloTalk) e fala com Sarah, de Nova York, pela primeira vez.
**Voiced by**: `charlotte`
**Persona**: Sarah (amiga de troca de idiomas, NYC)
**Persona outfit**: `sarah_home_videocall`
**Intro (em PT)**: "Você abriu um app de troca de idiomas e a Sarah, de NY, te mandou um 'Hi!'. Puxa conversa e descobre quem ela é (origem, nacionalidade, idade)."
**Opening message**: "Hi! So nice to match with a Brazilian!"

**Sub-objectives**:

1. **id**: 1
   **label_pt**: "Perguntar de onde Sarah é"
   **label_en**: "Ask where Sarah is from"
   **hidden_prompt**: "user asks 'where are you from' or similar origin question"
   **hint_pt**: "'Where are you from?' — pergunta padrão de origem"
   **hint_en**: "'Where are you from?' — standard origin question"

2. **id**: 2
   **label_pt**: "Perguntar a nacionalidade dela"
   **label_en**: "Ask about her nationality"
   **hidden_prompt**: "user asks about nationality with 'Are you + nationality' (e.g., 'Are you American?')"
   **hint_pt**: "Cuidado: país = 'America', nacionalidade = 'American'. Tenta 'Are you American?'"
   **hint_en**: "Careful: country = 'America', nationality = 'American'. Try 'Are you American?'"

3. **id**: 3
   **label_pt**: "Perguntar a idade dela"
   **label_en**: "Ask her age"
   **hidden_prompt**: "user asks 'how old are you' or similar age question"
   **hint_pt**: "'How old are you?' é a pergunta padrão"
   **hint_en**: "'How old are you?' is the standard question"

**Closing cue**: Sarah fecha com "Cool! Let's keep practicing." quando os 3 objetivos baterem.
**Recap (PT)**: "Ótimo! Você usou três chunks-chave: 'Where are you from?', 'Are you + nacionalidade?', 'How old are you?'. Note que país e nacionalidade são palavras diferentes: 'Brazil' (país) vs 'Brazilian' (nacionalidade), 'America' (país) vs 'American' (nacionalidade)."

**Script** (referencial, 6 turnos):

1. **Student** (expected): "Hi Sarah! I'm [nome]. Where are you from?"

2. **Sarah**: "Hey! I'm from New York. And you?"

3. **Student** (expected): "I'm from Brazil. Are you American?"
   *Se aluno escrever "Are you America?":* Sarah: "Almost! The country is 'America', but the NATIONALITY is 'American'. Want to try again?"

4. **Sarah**: "Yes, I am. Are you Brazilian?"

5. **Student** (expected): "Yes, I am. How old are you?"

6. **Sarah**: "I'm 28. And you?"

---

## Unit N04 — Como você se sente?

> **Sub-CEFR**: A1 | **Grammar focus**: Feelings chunks (I'm + emotion adjective) | **Markers**: —
> **Real-life context**: Uma amiga te encontra e parece estar triste. Você quer saber o que aconteceu.

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
   **Hint**: Para perguntar sentimento, há duas formas
   **Answer**: How are you feeling?
   **Explanation**: A forma correta usa "to be" + verbo no -ing: "How are you feeling?" — não "How feels you?". Outra forma comum: "How do you feel?".

10. **read_answer**
    **Passage**: "Tom: Hey Ana, are you okay? You look down. Ana: I'm tired and a bit stressed. Work is crazy this week."
    **Question**: How does Ana feel? (give one word)
    **Answer**: tired
    **Explanation**: Ana diz "I'm tired and a bit stressed". A primeira palavra que descreve ela é "tired" (cansada).

### 2. Listening/Speaking (5 phrases)

1. **"I'm so happy today!"** — sentimento positivo intenso
2. **"She's really tired."** — descrevendo terceiro
3. **"Are you hungry?"** — perguntando sobre fome
4. **"I'm a bit busy right now."** — recusa educada
5. **"How are you feeling?"** — pergunta empática

### 3. Role-play

**Cenário**: Sua amiga Ana parece triste no almoço de sábado. Você quer saber o que aconteceu.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Ana (melhor amiga, tom baixo/desanimada)
**Persona outfit**: `ana_casual_weekend`
**Time budget**: 180s
**Opening line** (tom baixo): "Hey... sorry, I'm not in a great mood today."

**Sub-objectives**:

1. **id**: 1
   **label_pt**: "Perguntar com empatia o que aconteceu"
   **label_en**: "Ask with empathy what happened"
   **hidden_prompt**: "user asks an empathetic question like 'are you okay', 'what's wrong', 'what happened'"
   **hint_pt**: "Tenta 'Oh no, what's wrong? Are you okay?'"
   **hint_en**: "Try 'Oh no, what's wrong? Are you okay?'"

2. **id**: 2
   **label_pt**: "Demonstrar que está ouvindo / sentir junto"
   **label_en**: "Show you're listening / show empathy"
   **hidden_prompt**: "user shows empathy with 'I'm sorry to hear that', 'that sounds rough', or similar"
   **hint_pt**: "'I'm sorry to hear that' é o chunk padrão de empatia"
   **hint_en**: "'I'm sorry to hear that' is the standard empathy chunk"

3. **id**: 3
   **label_pt**: "Oferecer apoio ou um plano para animá-la"
   **label_en**: "Offer support or a plan to cheer her up"
   **hidden_prompt**: "user offers support, suggests doing something together, or says 'take care'"
   **hint_pt**: "Algo tipo 'Take care of yourself' ou 'Want to do something fun later?'"
   **hint_en**: "Something like 'Take care of yourself' or 'Want to do something fun later?'"

**Closing cue**: Ana fecha com "That would be nice. Thank you." quando os 3 objetivos baterem.

**Suggested flow** (referencial, 5 turnos):

1. **Student**: ~"Oh no, what's wrong? Are you okay?"
2. **Ana**: "I'm just really tired. Work is crazy."
3. **Student**: ~"I'm sorry to hear that. Are you sleeping well?"
4. **Ana**: "Not really. I'm stressed."
5. **Student**: ~"Take care of yourself. Want to do something fun later?"
6. **Ana**: "That would be nice. Thank you."

**Evaluation focus**:
- Uso de chunks de empatia: "I'm sorry to hear", "Are you okay?", "Take care"
- Tom: caloroso, não invasivo
- Variação: aluno não fica preso em "Are you sad?" — varia entre "tired/stressed/down"

### 4. Guided Chat

**Cenário**: É sexta de manhã no escritório. Você cumprimenta Maria, sua chefe, e pergunta como ela está.
**Voiced by**: `charlotte`
**Persona**: Maria (chefe, tom profissional educado)
**Persona outfit**: `maria_office_formal`
**Intro (em PT)**: "Sexta de manhã, você esbarra com a Maria (sua chefe) no corredor. Cumprimenta ela e troca um papo rápido. Lembra: ela é sua chefe, então tom educado."
**Opening message**: "Morning! Good to see you — Friday at last."

**Sub-objectives**:

1. **id**: 1
   **label_pt**: "Cumprimentar Maria com saudação de manhã apropriada"
   **label_en**: "Greet Maria with an appropriate morning greeting"
   **hidden_prompt**: "user uses 'good morning' (formal/polite) and addresses her by name"
   **hint_pt**: "Como ela é sua chefe, 'Good morning, Maria!' soa mais educado que só 'Hi'"
   **hint_en**: "She's your boss — 'Good morning, Maria!' is more polite than 'Hi'"

2. **id**: 2
   **label_pt**: "Responder como você está com pelo menos um adjetivo de sentimento"
   **label_en**: "Answer how you are using at least one feeling adjective"
   **hidden_prompt**: "user answers with 'I'm + feeling adjective' (tired, busy, excited, good) — not just a one-word reply"
   **hint_pt**: "Em vez de só 'I'm good', adiciona algo: 'a bit tired' ou 'excited for the weekend'"
   **hint_en**: "Instead of just 'I'm good', add something: 'a bit tired' or 'excited for the weekend'"

3. **id**: 3
   **label_pt**: "Devolver a pergunta com tom educado"
   **label_en**: "Ask her back politely"
   **hidden_prompt**: "user returns the question with 'how about you', 'and you', or 'how are you'"
   **hint_pt**: "'How about you?' funciona ótimo num tom mais profissional"
   **hint_en**: "'How about you?' works great in a professional tone"

**Closing cue**: Maria fecha com "Great. See you in the meeting!" quando os 3 objetivos baterem.
**Recap (PT)**: "Boa! Você usou os chunks 'I'm + adjetivo' (tired, excited, ready) que são a base para falar sobre como você está. Note como adicionar mais informação ('a bit tired but excited') deixa a conversa mais natural e calorosa, em vez de um 'I'm good' frio."

**Script** (referencial, 6 turnos):

1. **Student** (expected): "Good morning, Maria! How are you?"

2. **Maria**: "Good morning! I'm doing well, thanks. How about you?"

3. **Student** (expected): "I'm good, thanks. A bit tired but excited for the weekend."
   *Se aluno escrever só "I'm good":* Maria: "Glad to hear. Anything in particular going on today?"

4. **Maria**: "Same here! Are you ready for the meeting at 10?"

5. **Student** (expected): "Yes, I'm ready."

6. **Maria**: "Great. See you in there!"

---

## Unit N05 — Tchau, até mais

> **Sub-CEFR**: A1 | **Grammar focus**: Goodbye chunks | **Markers**: —
> **Real-life context**: Você está saindo da academia, do trabalho, ou de um encontro casual.

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
   **Answer**: nice (ou great, good)
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
    **Question**: What does Tom say at the end? (give 2 words)
    **Answer**: Take care
    **Explanation**: Tom termina com "Take care!" — uma despedida calorosa após o jantar.

### 2. Listening/Speaking (5 phrases)

1. **"See you tomorrow!"** — despedida com encontro próximo
2. **"Have a nice day!"** — despedida educada padrão
3. **"Take care!"** — despedida calorosa
4. **"Goodbye, see you soon!"** — despedida formal + esperança de reencontro
5. **"Bye for now!"** — informal, próximo encontro indefinido

### 3. Role-play

**Cenário**: Você está saindo da academia depois do treino. Encontra Tom, um colega de academia, na porta.
**Tipo**: Live Voice
**Voiced by**: `charlie`
**Persona**: Tom (colega de academia)
**Persona outfit**: `tom_gym_workout`
**Time budget**: 180s
**Opening line**: "Hey, leaving already?"

**Sub-objectives**:

1. **id**: 1
   **label_pt**: "Comentar como foi o treino"
   **label_en**: "Comment on the workout"
   **hidden_prompt**: "user shares something about their workout state (tired, good, tough) — not just 'yes'"
   **hint_pt**: "Algo tipo 'Yeah, I'm exhausted!' ou 'Great workout today!'"
   **hint_en**: "Try 'Yeah, I'm exhausted!' or 'Great workout today!'"

2. **id**: 2
   **label_pt**: "Combinar de se ver de novo (próximo treino)"
   **label_en**: "Agree to meet again (next workout)"
   **hidden_prompt**: "user agrees to meet again or proposes a time ('see you tomorrow', 'same time', 'sure')"
   **hint_pt**: "'Sure! See you tomorrow' fecha bem"
   **hint_en**: "'Sure! See you tomorrow' closes it nicely"

3. **id**: 3
   **label_pt**: "Se despedir com tom caloroso"
   **label_en**: "Say goodbye with a warm tone"
   **hidden_prompt**: "user uses a warm goodbye like 'take care', 'you too', or 'have a good one' — not just 'bye'"
   **hint_pt**: "'Take care!' ou 'You too!' soa muito melhor que só 'Bye'"
   **hint_en**: "'Take care!' or 'You too!' sounds much better than just 'Bye'"

**Closing cue**: Tom encerra com "Take care, see you tomorrow!" quando os 3 objetivos baterem.

**Suggested flow** (referencial, 4 turnos):

1. **Student**: ~"Yeah, I'm exhausted! How was your workout?"
2. **Tom**: "Tough but good. Same time tomorrow?"
3. **Student**: ~"Sure! See you tomorrow."
4. **Tom**: "Take care!"
5. **Student**: ~"You too. Bye!"

**Evaluation focus**:
- Uso natural de "See you tomorrow", "Take care", "You too"
- Não usar só "Bye" (curto demais para fim de conversa)
- Pronúncia de "tomorrow" (acento na segunda sílaba)

### 4. Guided Chat

**Cenário**: Você termina uma vídeo-chamada com Sarah, sua amiga em NY. A chamada durou uma hora e foi ótima.
**Voiced by**: `charlotte`
**Persona**: Sarah (amiga em NYC, após uma vídeo-call boa)
**Persona outfit**: `sarah_home_videocall`
**Intro (em PT)**: "Você acabou de ter uma vídeo-chamada longa e gostosa com a Sarah. Hora de se despedir — termina a conversa com carinho, não só um 'bye'."
**Opening message**: "Wow, it's been over an hour already!"

**Sub-objectives**:

1. **id**: 1
   **label_pt**: "Sinalizar que precisa ir e fechar a interação com carinho"
   **label_en**: "Signal you need to go and close warmly"
   **hidden_prompt**: "user signals they need to leave AND uses a warm closing like 'it was great talking to you' (not just 'bye')"
   **hint_pt**: "Algo como 'I have to go now. It was great talking to you!'"
   **hint_en**: "Something like 'I have to go now. It was great talking to you!'"

2. **id**: 2
   **label_pt**: "Desejar um bom dia (ou bom resto do dia)"
   **label_en**: "Wish her a good day"
   **hidden_prompt**: "user wishes Sarah a good day/weekend with 'have a great day', 'have a nice weekend', etc."
   **hint_pt**: "'Have a great day!' ou 'Have a nice weekend!'"
   **hint_en**: "'Have a great day!' or 'Have a nice weekend!'"

3. **id**: 3
   **label_pt**: "Encerrar com um 'take care' ou variação calorosa"
   **label_en**: "Sign off with 'take care' or a warm variant"
   **hidden_prompt**: "user closes with 'take care', 'you too', 'talk soon', or similar warm sign-off"
   **hint_pt**: "'Take care!' é o final caloroso clássico"
   **hint_en**: "'Take care!' is the classic warm sign-off"

**Closing cue**: Sarah fecha com "Take care! Talk soon." quando os 3 objetivos baterem.
**Recap (PT)**: "Perfeito! Você usou três níveis de despedida calorosa: 'It was great talking to you' (fecha a interação), 'Have a great day' (desejo positivo) e 'Take care' (cuidado consigo). Em inglês, despedidas longas demonstram afeto — não tenha medo de encadear vários chunks no fim."

**Script** (referencial, 5 turnos):

1. **Student** (expected): "Okay, I have to go now. It was great talking to you!"
   *Se aluno escrever só "Bye":* Sarah: "Aww, just 'bye'? We had such a good chat — give me something warmer, like 'it was great talking to you'."

2. **Sarah**: "Same here! Let's talk again soon."

3. **Student** (expected): "Definitely. Have a great day!"

4. **Sarah**: "You too! Take care."

5. **Student** (expected): "Take care. Bye!"

---

## Cross-unit consolidation

Ao terminar M01, o aluno deve usar naturalmente:
- Saudação por horário (good morning/afternoon/evening)
- Apresentação completa (name + age + origin)
- Pergunta de origem (Where are you from?) e resposta com nacionalidade
- Expressão de sentimento (I'm + adjective)
- Despedida calorosa (Take care, See you, Have a nice day)

Esses chunks formam o **kit de sobrevivência** para qualquer interação social básica em inglês.
