# Module M01 — As 11 palavras que salvam

> **Level**: Manual do F#did@ (A1)
> **Block**: A1 Block
> **Units**: 5 (F01–F05)
> **Theme**: Sobreviver na viagem com 11 palavras: chamar a atenção, pedir ajuda, perguntar a hora e o caminho, dizer do que precisa
> **Module goal**: Aluno sai sabendo abordar um desconhecido, pedir ajuda com educação, perguntar a hora, achar o transporte e dizer para onde precisa ir, juntando as 11 palavras em frases prontas.
> **Connects to**: M02 (Visto, imigração e dinheiro) — depois de se virar na rua, encara o oficial da imigração.

> Trilha do Igorfina, baseada no curso do Igor. Toda interação é com o Igorfina
> (`voiced_by: igorfina`, `persona: Igorfina`). Explicações em PT-BR, curtas e com a
> "dica do Igor". Público: quem não fala inglês e vai viajar.

## Module chunks introduced (~30)

- Hello! / Hi!
- Sorry!
- Excuse me
- Excuse me? (não entendi, repete?)
- Thank you / Thanks
- Thank you so much
- Please
- Can you help me?
- Can you help me, please?
- Do you know...?
- Do you know where...?
- What time is it?
- What time does it open?
- What time does the bus leave?
- Where is the...?
- Where are the...?
- Where is the subway?
- Where is the bus stop?
- Where are the taxis?
- the subway / the bus / a taxi / the ferry boat
- transportation
- I need...
- I need help
- I need to go to...
- I need to go to the airport
- I need a taxi
- Hello, excuse me, can you help me, please?
- Do you know what time it is?
- Excuse me, do you know where the subway is?
- Thank you so much!

---

## Unit F01 — Hello, sorry, excuse me

> **Sub-CEFR**: A1 | **Grammar focus**: Survival chunks: Hello / Sorry / Excuse me | **Markers**: — | **Tense**: EXPRESSÕES
> **Real-life context**: Você chega em Nova York, precisa falar com um desconhecido na rua e esbarra em alguém no caminho.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "_____! Can you help me?"
   **Options**: Hello / Sorry / Thanks
   **Answer**: Hello
   **Explanation**: Para começar a conversa com alguém, o primeiro passo é cumprimentar: "Hello". Dica do Igor: um "Hello" com sorriso abre qualquer porta.

2. **multiple_choice** — "Oops! _____! Are you OK?"
   **Options**: Sorry / Hello / Please
   **Answer**: Sorry
   **Explanation**: Esbarrou em alguém? "Sorry!" é o "desculpa!" na hora. Curto e resolve.

3. **word_bank** — "_____ me, where is the subway?"
   **Choices**: Excuse / Sorry / Hello / Thank
   **Answer**: Excuse
   **Explanation**: "Excuse me" é o "com licença" para chamar a atenção de um desconhecido antes de perguntar algo.

4. **word_bank** — "_____, I don't understand."
   **Choices**: Sorry / Hello / Please / Thanks
   **Answer**: Sorry
   **Explanation**: "Sorry, I don't understand" é a frase salva-vidas quando você não entendeu. Ninguém fica bravo com isso.

5. **fill_gap** — "_____ me? Can you repeat, please?"
   **Hint**: Com licença / como é? (quando não entendeu)
   **Answer**: Excuse
   **Explanation**: "Excuse me?" com tom de pergunta quer dizer "como é? não entendi". Serve para pedir que a pessoa repita.

6. **fill_gap** — "_____! My name is Lucas."
   **Hint**: Cumprimento (forma curta ou completa)
   **Answer**: Hello
   **Accepts**: Hi / Hey
   **Explanation**: "Hello", "Hi" e "Hey" são cumprimentos. "Hi" e "Hey" são mais informais, ótimos para o dia a dia.

7. **fill_gap** — "_____, can I get through? I'm late!"
   **Hint**: Com licença (para passar pelas pessoas)
   **Answer**: Excuse me
   **Explanation**: Para pedir passagem no metrô lotado, diga "Excuse me". "Sorry" é para pedir desculpas depois de esbarrar em alguém.

8. **fix_error** — "Excuse, where is the bus?"
   **Hint**: A expressão de "com licença" tem duas palavras
   **Answer**: Excuse me, where is the bus?
   **Explanation**: Sozinho, "excuse" fica incompleto. A expressão é sempre "Excuse me".

9. **fix_error** — "Sorry me!"
   **Hint**: Para pedir desculpas basta uma palavra
   **Answer**: Sorry!
   **Explanation**: "Sorry" já é o pedido de desculpas completo. "Sorry me" não existe; quem leva o "me" é o "excuse".

10. **read_answer**
    **Passage**: "Igor: Excuse me! Woman: Yes? Igor: Sorry, I'm lost. Where is the subway?"
    **Question**: Qual frase o Igor usou para chamar a atenção da mulher? (responda em inglês)
    **Answer**: Excuse me
    **Explanation**: Ele abriu com "Excuse me!" para chamar a atenção, e depois usou "Sorry" para se desculpar por incomodar.

### 2. Listening/Speaking (5 phrases)

Igorfina fala (voz do Igor). Aluno repete; a pronúncia é avaliada.

1. **"Excuse me, one question, please."** — abordar um desconhecido na rua
2. **"Sorry, I don't understand. Again, please?"** — quando não entendeu nada
3. **"Excuse me, I need to get off here."** — pedir passagem no metrô lotado
4. **"Oh, sorry! Are you OK, my friend?"** — depois de esbarrar em alguém
5. **"Excuse me? Can you repeat that, please?"** — pedir para a pessoa repetir

### 3. Role-play

**Cenário**: Você está em Nova York, perdido na calçada. O Igorfina faz o papel de um morador apressado. Chame a atenção dele antes de perguntar qualquer coisa.
**Tipo**: Live Voice
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Time budget**: 90s
**Opening line**: "Hey, I'm in a hurry here. What's up?"

**Sub-objectives** (base: 1 objetivo):

1. **id**: 1
   **label_pt**: "Chamar a atenção com educação"
   **label_en**: "Get his attention politely"
   **hidden_prompt**: "user gets attention politely with 'excuse me', 'hello', 'hi' or 'sorry' (alone or before a question) — must be in English"
   **hint_pt**: "Excuse me!"
   **hint_en**: "Excuse me!"
   **example_pass**: Excuse me! | Hello, excuse me. | Sorry, excuse me, one question.
   **example_fail**: Hey you! (rude) | Com licença (Portuguese) | Where? (no polite opener)

**Closing cue**: Igorfina fecha com "Oh, OK, sure! How can I help you?" quando obj_1 bater.

**Suggested flow** (referencial, 2 turnos):

1. **Student**: ~"Excuse me!"
2. **Igorfina**: "Oh, OK, sure! How can I help you?"

**Evaluation focus**:
- Aluno usa "Excuse me" (ou "Hello"/"Sorry") para abrir a conversa
- Pronúncia do "excuse" (ex-KIUZ)

### 4. Guided Chat

**Cenário**: No albergue, o Igorfina manda mensagem no chat do quarto por engano. Responda com educação.
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Intro (em PT)**: "O Igorfina está no albergue com você e manda mensagem no chat do quarto. Responda com as palavras que salvam."
**Opening message**: "Hello! Sorry, wrong chat... are you in room 12?"

**Sub-objectives** (base: 2 objetivos):

1. **id**: 1
   **label_pt**: "Cumprimentar de volta"
   **label_en**: "Greet back"
   **hidden_prompt**: "user greets back with 'hello', 'hi', 'hey' or similar — must be in English"
   **hint_pt**: "Hello!"
   **hint_en**: "Hello!"
   **example_pass**: Hello! | Hi! | Hey, hello!
   **example_fail**: Oi (Portuguese) | Yes (no greeting) | Bye (wrong intent)

2. **id**: 2
   **label_pt**: "Dizer que não entendeu"
   **label_en**: "Say you don't understand"
   **hidden_prompt**: "user says they don't understand or asks to repeat, e.g. 'sorry, I don't understand', 'excuse me?', 'again, please?' — must be in English"
   **hint_pt**: "Sorry, I don't understand."
   **hint_en**: "Sorry, I don't understand."
   **example_pass**: Sorry, I don't understand. | Excuse me? | Sorry? Again, please.
   **example_fail**: Room 12 (does not express confusion) | Não entendi (Portuguese) | OK (no request)

**Closing cue**: Igorfina encerra com "Ha! No problem, my friend. Wrong chat. Sorry!" quando obj_2 bater.

**Script** (referencial, 4 turnos):

1. **Igorfina**: "Hello! Sorry, wrong chat... are you in room 12?"
2. **Student**: "Hello!"
3. **Igorfina**: "Room twelve? One, two?"
4. **Student**: "Sorry, I don't understand."
5. **Igorfina**: "Ha! No problem, my friend. Wrong chat. Sorry!"

---

## Unit F02 — Please, thank you e "Can you help me?"

> **Sub-CEFR**: A1 | **Grammar focus**: Pedido educado: Can you + verbo + please | **Markers**: [qform] | **Tense**: EXPRESSÕES
> **Real-life context**: Você precisa pedir ajuda a alguém na estação e agradecer depois.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "Can you help me, _____?"
   **Options**: please / sorry / hello
   **Answer**: please
   **Explanation**: "Please" é o "por favor". No fim do pedido, deixa tudo mais educado: "Can you help me, please?".

2. **multiple_choice** — "A: Here is your ticket. B: _____ you!"
   **Options**: Thank / Please / Sorry
   **Answer**: Thank
   **Explanation**: "Thank you" é o "obrigado". Recebeu algo ou uma ajuda? "Thank you!".

3. **word_bank** — "_____ you help me, please?"
   **Choices**: Can / Is / Do / Are
   **Answer**: Can
   **Explanation**: "Can you...?" é o jeito mais simples de pedir algo: "você pode...?". Depois vem o verbo: "Can you help me?".

4. **word_bank** — "Thank you so _____!"
   **Choices**: much / many / very / more
   **Answer**: much
   **Explanation**: "Thank you so much" é o "muito obrigado". Dica do Igor: a gente diz "so much", nunca "so many" aqui.

5. **fill_gap** — "Can you _____ me, please?"
   **Hint**: Verbo "ajudar"
   **Answer**: help
   **Explanation**: "Help" é ajudar. "Can you help me?" é a pergunta que mais salva em viagem.

6. **fill_gap** — "A: Thank you! B: You're _____."
   **Hint**: Resposta ao "thank you" (de nada)
   **Answer**: welcome
   **Explanation**: "You're welcome" é o "de nada". Você vai ouvir muito; também aparece como "No problem".

7. **fill_gap** — "_____, can you help me? I'm lost."
   **Hint**: Com licença (para chamar a atenção)
   **Answer**: Excuse me
   **Explanation**: Combinação campeã: "Excuse me" para chamar a atenção e "Can you help me?" para pedir ajuda.

8. **fix_error** — "You can help me, please?"
   **Hint**: Em perguntas, o "can" vem antes de "you"
   **Answer**: Can you help me, please?
   **Explanation**: Na pergunta, o "can" vai para a frente: "Can you...?". "You can..." é afirmação ("você pode").

9. **fix_error** — "Thank you very much much!"
   **Hint**: Basta um "much"
   **Answer**: Thank you very much!
   **Explanation**: "Thank you very much" ou "Thank you so much": um "much" só. Repetir não deixa mais educado.

10. **read_answer**
    **Passage**: "Igor: Excuse me, can you help me, please? Man: Sure! Igor: Where is the bus stop? Man: It's right there. Igor: Thank you so much!"
    **Question**: O homem ajudou o Igor? Que palavra ele usou para dizer que sim? (responda em inglês)
    **Answer**: Sure
    **Explanation**: "Sure!" quer dizer "claro!". É a resposta mais comum quando alguém aceita ajudar.

### 2. Listening/Speaking (5 phrases)

Igorfina fala (voz do Igor). Aluno repete; a pronúncia é avaliada.

1. **"Excuse me, can you help me, please?"** — pedir ajuda a um desconhecido
2. **"Thank you so much for your help!"** — agradecer de verdade
3. **"Can you help me with my bag, please?"** — pedir ajuda com a mala
4. **"Please, can you speak more slowly?"** — pedir para falar devagar
5. **"No problem, thank you very much!"** — fechar a conversa com educação

### 3. Role-play

**Cenário**: Você está na estação de trem com uma mala pesada. O Igorfina faz o papel de um funcionário da estação. Peça ajuda e agradeça.
**Tipo**: Live Voice
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Time budget**: 90s
**Opening line**: "Hi there! You look a little lost. Everything OK?"

**Sub-objectives** (2 objetivos):

1. **id**: 1
   **label_pt**: "Pedir ajuda com educação"
   **label_en**: "Ask for help politely"
   **hidden_prompt**: "user asks for help, e.g. 'can you help me?', 'can you help me, please?', 'I need help, please' — must be in English"
   **hint_pt**: "Can you help me, please?"
   **hint_en**: "Can you help me, please?"
   **example_pass**: Can you help me, please? | Can you help me? | I need help, please.
   **example_fail**: Help (bare word, no request) | Me ajuda (Portuguese) | Yes (no request)

2. **id**: 2
   **label_pt**: "Agradecer a ajuda"
   **label_en**: "Thank him"
   **hidden_prompt**: "user thanks him: 'thank you', 'thanks', 'thank you so much', 'thanks a lot' — must be in English"
   **hint_pt**: "Thank you so much!"
   **hint_en**: "Thank you so much!"
   **example_pass**: Thank you so much! | Thanks! | Thank you very much.
   **example_fail**: OK (no thanks) | Obrigado (Portuguese) | Please (wrong intent)

**Closing cue**: Igorfina fecha com "You're welcome! Have a great trip!" quando obj_2 bater.

**Suggested flow** (referencial, 4 turnos):

1. **Student**: ~"Can you help me, please?"
2. **Igorfina**: "Sure! Let me take your bag. Here you go!"
3. **Student**: ~"Thank you so much!"
4. **Igorfina**: "You're welcome! Have a great trip!"

**Evaluation focus**:
- Aluno faz o pedido com "Can you help me" (+ "please")
- Agradece com "Thank you" / "Thanks"

### 4. Guided Chat

**Cenário**: O Igorfina está no balcão de informações do aeroporto, atendendo pelo chat do terminal. Peça ajuda e agradeça.
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Intro (em PT)**: "Você chegou ao aeroporto e o atendimento é pelo chat. O Igorfina está atendendo. Peça ajuda e agradeça no final."
**Opening message**: "Hello! Welcome to JFK. How can I help you?"

**Sub-objectives** (3 objetivos):

1. **id**: 1
   **label_pt**: "Cumprimentar"
   **label_en**: "Say hello"
   **hidden_prompt**: "user greets: 'hello', 'hi', 'good morning' or similar — must be in English"
   **hint_pt**: "Hi!"
   **hint_en**: "Hi!"
   **example_pass**: Hi! | Hello! | Hello, good morning.
   **example_fail**: Oi (Portuguese) | Help (no greeting) | Bye (wrong intent)

2. **id**: 2
   **label_pt**: "Pedir ajuda"
   **label_en**: "Ask for help"
   **hidden_prompt**: "user asks for help: 'can you help me?', 'can you help me, please?', 'I need help' — must be in English"
   **hint_pt**: "Can you help me, please?"
   **hint_en**: "Can you help me, please?"
   **example_pass**: Can you help me, please? | Can you help me? | I need help, please.
   **example_fail**: Help (bare word) | Ajuda (Portuguese) | Yes (no request)

3. **id**: 3
   **label_pt**: "Agradecer"
   **label_en**: "Say thank you"
   **hidden_prompt**: "user thanks: 'thank you', 'thanks', 'thank you so much' — must be in English"
   **hint_pt**: "Thank you so much!"
   **hint_en**: "Thank you so much!"
   **example_pass**: Thank you so much! | Thanks a lot! | Thank you!
   **example_fail**: OK (no thanks) | Valeu (Portuguese) | Please (wrong intent)

**Closing cue**: Igorfina encerra com "You're welcome! Enjoy New York!" quando obj_3 bater.

**Script** (referencial, 6 turnos):

1. **Igorfina**: "Hello! Welcome to JFK. How can I help you?"
2. **Student**: "Hi!"
3. **Igorfina**: "Hi! What do you need?"
4. **Student**: "Can you help me, please?"
5. **Igorfina**: "Of course! The taxis are on the left. Easy!"
6. **Student**: "Thank you so much!"
7. **Igorfina**: "You're welcome! Enjoy New York!"

---

## Unit F03 — Do you know...? What time...?

> **Sub-CEFR**: A1 | **Grammar focus**: Perguntas prontas: Do you know + what time / where | **Markers**: [qform] | **Tense**: PRESENTE · simple
> **Real-life context**: Você está sem bateria no celular e precisa saber a hora e o horário do ônibus.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "What _____ is it?"
   **Options**: time / hour / clock
   **Answer**: time
   **Explanation**: Para perguntar a hora, diga "What time is it?". Dica do Igor: nada de "What hour"; é sempre "time".

2. **multiple_choice** — "_____ you know what time it is?"
   **Options**: Do / Are / Is
   **Answer**: Do
   **Explanation**: "Do you know...?" é "você sabe...?". Abre um monte de perguntas: "Do you know what time it is?".

3. **word_bank** — "What time does the bus _____?"
   **Choices**: leave / leaves / leaving / left
   **Answer**: leave
   **Explanation**: Depois de "does", o verbo fica na forma básica: "What time does the bus leave?" (a que horas o ônibus sai?).

4. **word_bank** — "Do you _____ where the museum is?"
   **Choices**: know / no / now / knows
   **Answer**: know
   **Explanation**: "Know" é saber. O "k" é mudo: soa como "nou". Não confunda com "now" (agora).

5. **fill_gap** — "Excuse me, what _____ is it?"
   **Hint**: Palavra para "hora/horário" nessa pergunta
   **Answer**: time
   **Explanation**: "What time is it?" é a pergunta completa. O "Excuse me" na frente deixa tudo educado.

6. **fill_gap** — "_____ you know what time it is?"
   **Hint**: Auxiliar da pergunta "você sabe...?"
   **Answer**: Do
   **Explanation**: Em perguntas com "know", o "Do" vem na frente: "Do you know...?".

7. **fill_gap** — "What time does the store _____?"
   **Hint**: Verbo "abrir"
   **Answer**: open
   **Explanation**: "What time does it open?" pergunta a que horas abre. O contrário é "close" (fechar).

8. **fix_error** — "What time it is?"
   **Hint**: Em pergunta direta, o "is" vem antes do "it"
   **Answer**: What time is it?
   **Explanation**: Pergunta direta: "What time is it?". Mas com "Do you know" a ordem muda: "Do you know what time it is?".

9. **fix_error** — "You know where is the bus?"
   **Hint**: Comece com "Do" e, depois de "where", use "the bus is"
   **Answer**: Do you know where the bus is?
   **Explanation**: Com "Do you know where...", a ordem fica "where the bus is". Parece estranho, mas é assim que o nativo fala.

10. **read_answer**
    **Passage**: "Igor: Excuse me, do you know what time it is? Woman: Sure, it's ten o'clock. Igor: And what time does the bus leave? Woman: At ten thirty."
    **Question**: A que horas sai o ônibus? (responda em inglês, como a mulher disse)
    **Answer**: At ten thirty
    **Explanation**: Ela disse "At ten thirty", ou seja, às dez e meia. "O'clock" é só para hora cheia: "ten o'clock".

### 2. Listening/Speaking (5 phrases)

Igorfina fala (voz do Igor). Aluno repete; a pronúncia é avaliada.

1. **"Excuse me, do you know what time it is?"** — perguntar a hora a alguém
2. **"What time does the next bus leave?"** — saber o horário do ônibus
3. **"Do you know where the museum is?"** — perguntar onde fica um lugar
4. **"What time does the store open, please?"** — saber quando a loja abre
5. **"It's ten o'clock. Thank you so much!"** — repetir a hora e agradecer

### 3. Role-play

**Cenário**: Seu celular morreu e você precisa pegar o ônibus. O Igorfina faz o papel de uma pessoa no ponto de ônibus. Pergunte a hora e o horário do ônibus.
**Tipo**: Live Voice
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Time budget**: 90s
**Opening line**: "Hey! Waiting for the bus too?"

**Sub-objectives** (2 objetivos):

1. **id**: 1
   **label_pt**: "Perguntar a hora"
   **label_en**: "Ask the time"
   **hidden_prompt**: "user asks the time: 'what time is it?', 'do you know what time it is?' — must be in English"
   **hint_pt**: "Do you know what time it is?"
   **hint_en**: "Do you know what time it is?"
   **example_pass**: Do you know what time it is? | What time is it? | Excuse me, what time is it?
   **example_fail**: Time? (bare word) | Que horas são? (Portuguese) | Yes (no question)

2. **id**: 2
   **label_pt**: "Perguntar quando o ônibus sai"
   **label_en**: "Ask when the bus leaves"
   **hidden_prompt**: "user asks when the bus leaves/comes: 'what time does the bus leave?', 'what time is the bus?', 'when is the next bus?' — must be in English"
   **hint_pt**: "What time does the bus leave?"
   **hint_en**: "What time does the bus leave?"
   **example_pass**: What time does the bus leave? | What time is the next bus? | When is the bus?
   **example_fail**: Bus? (bare word) | Thank you (no question) | Que horas o ônibus sai? (Portuguese)

**Closing cue**: Igorfina fecha com "At ten thirty. Five more minutes, relax!" quando obj_2 bater.

**Suggested flow** (referencial, 4 turnos):

1. **Student**: ~"Do you know what time it is?"
2. **Igorfina**: "It's ten twenty-five."
3. **Student**: ~"What time does the bus leave?"
4. **Igorfina**: "At ten thirty. Five more minutes, relax!"

**Evaluation focus**:
- Aluno usa "What time...?" ou "Do you know what time it is?"
- Ordem certa da pergunta ("does the bus leave")

### 4. Guided Chat

**Cenário**: O Igorfina trabalha numa loja e responde pelo chat do site. Você quer saber a hora em que a loja abre e onde ela fica.
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Intro (em PT)**: "Você quer comprar um tênis numa loja em Nova York. O Igorfina responde no chat da loja."
**Opening message**: "Hi! Welcome to Big Apple Sneakers. Questions? I'm here!"

**Sub-objectives** (3 objetivos):

1. **id**: 1
   **label_pt**: "Perguntar quando a loja abre"
   **label_en**: "Ask when it opens"
   **hidden_prompt**: "user asks the opening time: 'what time does the store open?', 'what time do you open?', 'when do you open?' — must be in English"
   **hint_pt**: "What time does the store open?"
   **hint_en**: "What time does the store open?"
   **example_pass**: What time does the store open? | What time do you open? | When does it open?
   **example_fail**: Open? (bare word) | Que horas abre? (Portuguese) | Hi (no question)

2. **id**: 2
   **label_pt**: "Perguntar onde fica a loja"
   **label_en**: "Ask where the store is"
   **hidden_prompt**: "user asks the location: 'where is the store?', 'do you know where...', 'where are you?' — must be in English"
   **hint_pt**: "Where is the store?"
   **hint_en**: "Where is the store?"
   **example_pass**: Where is the store? | Where are you? | Do you know where the store is?
   **example_fail**: Store (bare word) | Onde fica? (Portuguese) | OK (no question)

3. **id**: 3
   **label_pt**: "Agradecer"
   **label_en**: "Say thank you"
   **hidden_prompt**: "user thanks: 'thank you', 'thanks', 'thank you so much' — must be in English"
   **hint_pt**: "Thank you so much!"
   **hint_en**: "Thank you so much!"
   **example_pass**: Thank you so much! | Thanks! | Thank you very much.
   **example_fail**: OK (no thanks) | Obrigado (Portuguese) | Bye (no thanks)

**Closing cue**: Igorfina encerra com "You're welcome! See you at nine!" quando obj_3 bater.

**Script** (referencial, 6 turnos):

1. **Igorfina**: "Hi! Welcome to Big Apple Sneakers. Questions? I'm here!"
2. **Student**: "What time does the store open?"
3. **Igorfina**: "We open at nine o'clock."
4. **Student**: "Where is the store?"
5. **Igorfina**: "On Fifth Avenue, next to the park."
6. **Student**: "Thank you so much!"
7. **Igorfina**: "You're welcome! See you at nine!"

---

## Unit F04 — Where is the subway? Where are the taxis?

> **Sub-CEFR**: A1 | **Grammar focus**: Where is (singular) × Where are (plural) + transportation | **Markers**: [qform] [denso] | **Tense**: PRESENTE · to be
> **Real-life context**: Você sai do aeroporto e precisa achar o metrô, o ônibus ou um táxi.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "Where _____ the subway?"
   **Options**: is / are / am
   **Answer**: is
   **Explanation**: Uma coisa só (o metrô) pede "is": "Where is the subway?". Dica do Igor: subway, igual à lanchonete, é o metrô.

2. **multiple_choice** — "Where _____ the taxis?"
   **Options**: are / is / am
   **Answer**: are
   **Explanation**: Mais de uma coisa (os táxis) pede "are": "Where are the taxis?".

3. **word_bank** — "Excuse me, where is the bus _____?"
   **Choices**: stop / station / road / car
   **Answer**: stop
   **Explanation**: "Bus stop" é o ponto de ônibus. "Bus station" é a rodoviária, um lugar bem maior.

4. **word_bank** — "Where is the _____ boat to the Statue of Liberty?"
   **Choices**: ferry / subway / taxi / bus
   **Answer**: ferry
   **Explanation**: "Ferry" (ou "ferry boat") é a balsa. Em Nova York, ela leva até a Estátua da Liberdade.

5. **fill_gap** — "Where _____ the bathrooms?"
   **Hint**: Banheiros = plural
   **Answer**: are
   **Explanation**: "Bathrooms" está no plural, então "Where are the bathrooms?". Se for um só: "Where is the bathroom?".

6. **fill_gap** — "Where is the _____? I need the train."
   **Hint**: Metrô em inglês americano
   **Answer**: subway
   **Accepts**: metro
   **Explanation**: Nos Estados Unidos, metrô é "subway". Em outros países você também vai ouvir "metro" ou "underground".

7. **fill_gap** — "Excuse me, _____ is the taxi stand?"
   **Hint**: Palavra de pergunta para lugar (onde)
   **Answer**: where
   **Explanation**: "Where" pergunta lugar: onde. "Taxi stand" é o ponto de táxi.

8. **fix_error** — "Where is the taxis?"
   **Hint**: "Taxis" está no plural
   **Answer**: Where are the taxis?
   **Explanation**: Plural pede "are". Regra rápida: uma coisa, "is"; várias, "are".

9. **fix_error** — "Where the subway is?"
   **Hint**: Em pergunta direta, o "is" vem logo depois do "where"
   **Answer**: Where is the subway?
   **Explanation**: Pergunta direta: "Where is the subway?". Só com "Do you know" a ordem muda: "Do you know where the subway is?".

10. **read_answer**
    **Passage**: "Igor: Excuse me, where are the taxis? Officer: The taxis are outside, on the right. The subway is downstairs."
    **Question**: Onde ficam os táxis? (responda em inglês, como o policial disse)
    **Answer**: Outside, on the right
    **Explanation**: "Outside, on the right" é lá fora, à direita. E o metrô está "downstairs", no andar de baixo.

### 2. Listening/Speaking (5 phrases)

Igorfina fala (voz do Igor). Aluno repete; a pronúncia é avaliada.

1. **"Excuse me, where is the subway station?"** — achar o metrô
2. **"Excuse me, where are the taxis, please?"** — achar o ponto de táxi
3. **"Where is the bus stop for downtown?"** — achar o ônibus para o centro
4. **"Do you know where the ferry boat is?"** — achar a balsa
5. **"Where is the nearest bathroom, please?"** — achar o banheiro mais perto

### 3. Role-play

**Cenário**: Você saiu do aeroporto JFK. O Igorfina faz o papel de um guarda simpático. Pergunte onde ficam o metrô e os táxis.
**Tipo**: Live Voice
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Time budget**: 90s
**Opening line**: "Welcome to New York! Need some help?"

**Sub-objectives** (2 objetivos):

1. **id**: 1
   **label_pt**: "Perguntar onde fica o metrô"
   **label_en**: "Ask where the subway is"
   **hidden_prompt**: "user asks where the subway is: 'where is the subway?', 'where is the subway station?', 'do you know where the subway is?' — must be in English"
   **hint_pt**: "Where is the subway?"
   **hint_en**: "Where is the subway?"
   **example_pass**: Where is the subway? | Where is the subway station? | Excuse me, where is the metro?
   **example_fail**: Subway (bare word) | Onde é o metrô? (Portuguese) | Yes (no question)

2. **id**: 2
   **label_pt**: "Perguntar onde estão os táxis"
   **label_en**: "Ask where the taxis are"
   **hidden_prompt**: "user asks where the taxis are, plural or singular accepted: 'where are the taxis?', 'where is the taxi stand?', 'where can I get a taxi?' — must be in English"
   **hint_pt**: "Where are the taxis?"
   **hint_en**: "Where are the taxis?"
   **example_pass**: Where are the taxis? | Where is the taxi stand? | And the taxis?
   **example_fail**: Taxi (bare word) | Cadê os táxis? (Portuguese) | Thank you (no question)

**Closing cue**: Igorfina fecha com "Outside, on the right. Yellow cars, you can't miss them!" quando obj_2 bater.

**Suggested flow** (referencial, 4 turnos):

1. **Student**: ~"Where is the subway?"
2. **Igorfina**: "Take the AirTrain. It's downstairs."
3. **Student**: ~"Where are the taxis?"
4. **Igorfina**: "Outside, on the right. Yellow cars, you can't miss them!"

**Evaluation focus**:
- "Where is" com uma coisa, "Where are" com várias
- Vocabulário de transporte: subway, taxi

### 4. Guided Chat

**Cenário**: Você quer visitar a Estátua da Liberdade. O Igorfina, seu amigo que mora em Nova York, ajuda pelo chat.
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Intro (em PT)**: "Você quer ir até a Estátua da Liberdade. Pergunte ao Igorfina como chegar, usando where is e where are."
**Opening message**: "So, Statue of Liberty today? Great idea, my friend!"

**Sub-objectives** (3 objetivos):

1. **id**: 1
   **label_pt**: "Perguntar onde fica a balsa"
   **label_en**: "Ask where the ferry is"
   **hidden_prompt**: "user asks where the ferry/boat is: 'where is the ferry?', 'where is the ferry boat?', 'where is the boat?' — must be in English"
   **hint_pt**: "Where is the ferry?"
   **hint_en**: "Where is the ferry?"
   **example_pass**: Where is the ferry? | Where is the ferry boat? | Do you know where the ferry is?
   **example_fail**: Ferry (bare word) | Onde fica a balsa? (Portuguese) | Yes (no question)

2. **id**: 2
   **label_pt**: "Perguntar onde fica o metrô"
   **label_en**: "Ask where the subway is"
   **hidden_prompt**: "user asks where the subway/station is: 'where is the subway?', 'where is the station?' — must be in English"
   **hint_pt**: "Where is the subway?"
   **hint_en**: "Where is the subway?"
   **example_pass**: Where is the subway? | Where is the subway station? | And the subway?
   **example_fail**: Subway (bare word) | Metrô? (Portuguese) | OK (no question)

3. **id**: 3
   **label_pt**: "Agradecer"
   **label_en**: "Say thank you"
   **hidden_prompt**: "user thanks: 'thank you', 'thanks', 'thank you so much' — must be in English"
   **hint_pt**: "Thank you so much!"
   **hint_en**: "Thank you so much!"
   **example_pass**: Thank you so much! | Thanks, my friend! | Thank you!
   **example_fail**: OK (no thanks) | Valeu (Portuguese) | Bye (no thanks)

**Closing cue**: Igorfina encerra com "You're welcome! Send me a selfie with the Statue!" quando obj_3 bater.

**Script** (referencial, 6 turnos):

1. **Igorfina**: "So, Statue of Liberty today? Great idea, my friend!"
2. **Student**: "Where is the ferry?"
3. **Igorfina**: "The ferry is at Battery Park, downtown."
4. **Student**: "Where is the subway?"
5. **Igorfina**: "Take the 1 train to South Ferry. Easy!"
6. **Student**: "Thank you so much!"
7. **Igorfina**: "You're welcome! Send me a selfie with the Statue!"

---

## Unit F05 — I need... (juntando as 11 palavras)

> **Sub-CEFR**: A1 | **Grammar focus**: I need + coisa / I need to + verbo; combinações das 11 palavras | **Markers**: [review] [denso] | **Tense**: PRESENTE · simple
> **Real-life context**: Você precisa ir ao aeroporto às pressas e junta tudo o que aprendeu numa frase só.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "I _____ a taxi, please."
   **Options**: need / needs / needing
   **Answer**: need
   **Explanation**: "I need" é "eu preciso". Dica do Igor: é a palavra que mais se usa viajando. "I need a taxi", "I need water", "I need help".

2. **multiple_choice** — "I need _____ go to the airport."
   **Options**: to / for / at
   **Answer**: to
   **Explanation**: Antes de um verbo (go, buy, find), use "need to": "I need to go to the airport".

3. **word_bank** — "I need to go _____ the hotel."
   **Choices**: to / in / on / at
   **Answer**: to
   **Explanation**: "Go to" é "ir para". "I need to go to the hotel" = preciso ir para o hotel.

4. **word_bank** — "Excuse me, I need _____. Can you help me?"
   **Choices**: help / helps / helping / helped
   **Answer**: help
   **Explanation**: "I need help" é o pedido de ajuda mais direto que existe. Simples e todo mundo entende.

5. **fill_gap** — "I _____ to go to the airport. Where are the taxis?"
   **Hint**: Verbo "precisar"
   **Answer**: need
   **Explanation**: "I need to go to..." é o jeito mais fácil de dizer para onde você precisa ir.

6. **fill_gap** — "Hello, _____ me, can you help me, please?"
   **Hint**: A expressão de "com licença"
   **Answer**: excuse
   **Explanation**: A combinação completa do Igor: "Hello, excuse me, can you help me, please?". Educada e impossível de não entender.

7. **fill_gap** — "Excuse me, do you know _____ the subway is?"
   **Hint**: Palavra de pergunta para lugar
   **Answer**: where
   **Explanation**: "Do you know where the subway is?" junta duas palavras que salvam: "Do you know" e "where".

8. **fix_error** — "I need go to the airport."
   **Hint**: Falta o "to" antes do verbo "go"
   **Answer**: I need to go to the airport.
   **Explanation**: Com verbo, é "need to": "I need to go". Sem verbo, vai direto: "I need a taxi".

9. **fix_error** — "I am need a taxi."
   **Hint**: "Need" já é o verbo; não precisa de "am"
   **Answer**: I need a taxi.
   **Explanation**: "I need" já diz "eu preciso". O "am" sobra. Erro clássico de quem traduz palavra por palavra.

10. **read_answer**
    **Passage**: "Igor: Hello, excuse me, can you help me, please? I need to go to the airport. Driver: Sure, get in! Igor: Thank you so much!"
    **Question**: Para onde o Igor precisa ir? (responda em inglês)
    **Answer**: To the airport
    **Explanation**: Ele disse "I need to go to the airport", ou seja, precisa ir para o aeroporto.

### 2. Listening/Speaking (5 phrases)

Igorfina fala (voz do Igor). Aluno repete; a pronúncia é avaliada.

1. **"Hello, excuse me, can you help me, please?"** — a combinação completa do Igor
2. **"I need to go to the airport, please."** — dizer para onde precisa ir
3. **"Excuse me, do you know where the subway is?"** — perguntar o caminho com educação
4. **"I need a taxi. Where are the taxis?"** — achar um táxi às pressas
5. **"Do you know what time it is? Thank you!"** — perguntar a hora e agradecer

### 3. Role-play

**Cenário**: Você está atrasado para o voo de volta. O Igorfina faz o papel de um motorista de táxi parado na rua. Diga do que precisa e para onde quer ir.
**Tipo**: Live Voice
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Time budget**: 90s
**Opening line**: "Taxi! Where to, my friend?"

**Sub-objectives** (2 objetivos):

1. **id**: 1
   **label_pt**: "Dizer para onde precisa ir"
   **label_en**: "Say where you need to go"
   **hidden_prompt**: "user says the destination with need/to: 'I need to go to the airport', 'to the airport, please', 'airport, please' (destination + please also counts) — must be in English"
   **hint_pt**: "I need to go to the airport."
   **hint_en**: "I need to go to the airport."
   **example_pass**: I need to go to the airport. | To the airport, please. | JFK airport, please.
   **example_fail**: Airport (bare word, no please) | Aeroporto (Portuguese) | Yes (no destination)

2. **id**: 2
   **label_pt**: "Perguntar a hora"
   **label_en**: "Ask the time"
   **hidden_prompt**: "user asks the time: 'what time is it?', 'do you know what time it is?' — must be in English"
   **hint_pt**: "Do you know what time it is?"
   **hint_en**: "Do you know what time it is?"
   **example_pass**: Do you know what time it is? | What time is it? | What time is it now?
   **example_fail**: Time (bare word) | Que horas são? (Portuguese) | Thank you (no question)

**Closing cue**: Igorfina fecha com "It's five o'clock. Relax, we're gonna make it!" quando obj_2 bater.

**Suggested flow** (referencial, 4 turnos):

1. **Student**: ~"I need to go to the airport."
2. **Igorfina**: "JFK? OK, let's go! Fasten your seat belt."
3. **Student**: ~"Do you know what time it is?"
4. **Igorfina**: "It's five o'clock. Relax, we're gonna make it!"

**Evaluation focus**:
- "I need to go to..." com o "to" antes do verbo
- Revisão das 11 palavras ("what time", "please", "thank you")

### 4. Guided Chat

**Cenário**: O Igorfina é o recepcionista do hotel e atende pelo chat do quarto. Você precisa de um táxi para o aeroporto amanhã cedo.
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Intro (em PT)**: "Seu voo é amanhã cedo. Fale com o Igorfina, da recepção do hotel, e use as 11 palavras que salvam."
**Opening message**: "Good evening! Front desk here. What do you need?"

**Sub-objectives** (3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer do que precisa"
   **label_en**: "Say what you need"
   **hidden_prompt**: "user says they need a taxi/cab: 'I need a taxi', 'I need a taxi, please', 'a taxi, please' — must be in English"
   **hint_pt**: "I need a taxi, please."
   **hint_en**: "I need a taxi, please."
   **example_pass**: I need a taxi, please. | I need a taxi. | A taxi, please.
   **example_fail**: Taxi (bare word) | Preciso de táxi (Portuguese) | Hello (no need stated)

2. **id**: 2
   **label_pt**: "Dizer para onde vai"
   **label_en**: "Say where you're going"
   **hidden_prompt**: "user states the destination: 'I need to go to the airport', 'to the airport', 'airport, please' — must be in English"
   **hint_pt**: "I need to go to the airport."
   **hint_en**: "I need to go to the airport."
   **example_pass**: I need to go to the airport. | To the airport, please. | The airport.
   **example_fail**: Tomorrow (no destination) | Aeroporto (Portuguese) | OK (no destination)

3. **id**: 3
   **label_pt**: "Agradecer"
   **label_en**: "Say thank you"
   **hidden_prompt**: "user thanks: 'thank you', 'thanks', 'thank you so much' — must be in English"
   **hint_pt**: "Thank you so much!"
   **hint_en**: "Thank you so much!"
   **example_pass**: Thank you so much! | Thanks! | Thank you very much!
   **example_fail**: OK (no thanks) | Obrigado (Portuguese) | Bye (no thanks)

**Closing cue**: Igorfina encerra com "You're welcome! Taxi at six. Safe flight, my friend!" quando obj_3 bater.

**Script** (referencial, 6 turnos):

1. **Igorfina**: "Good evening! Front desk here. What do you need?"
2. **Student**: "I need a taxi, please."
3. **Igorfina**: "Sure! Where to?"
4. **Student**: "I need to go to the airport."
5. **Igorfina**: "OK, the taxi is at six o'clock, at the door."
6. **Student**: "Thank you so much!"
7. **Igorfina**: "You're welcome! Taxi at six. Safe flight, my friend!"
