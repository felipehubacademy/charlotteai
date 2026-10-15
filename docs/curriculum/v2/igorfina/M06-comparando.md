# Module M06 — Comparando: melhor, pior, o maior

> **Level**: Manual do F#did@ (A1)
> **Block**: A1 Block
> **Units**: 5 (F26–F30)
> **Theme**: Comparar lugares, preços e distâncias na viagem: mais rápido, melhor, o pior, o mais caro, o mais longe
> **Module goal**: Aluno sai comparando com "-er than / more ... than / less ... than" e usando superlativos ("the best", "the worst", "the most expensive", "the farthest") em situações de viagem.
> **Connects to**: M05 (Could, would, should...) e M07 (In, out, on, off...).

> Trilha do Igorfina. Os tópicos F27, F28 e F30 são com a imitação do presidente
> (`persona_outfit: igorfina_president`), que vive de superlativos ("the best", "tremendous").
> Exemplos originais com jogadores e políticos foram trocados por genéricos.

## Module chunks introduced (~30)

- faster than / slower than
- bigger than / smaller than
- cheaper than
- better than / the best
- worse than / the worst
- more expensive than / the most expensive
- more famous than / the most famous
- less expensive than / the least expensive
- farther than / the farthest
- Japan is farther than Portugal from Brazil.
- Today is the worst day I've had in a long time.
- This sweater is less expensive than the other one.
- I ran even farther today.
- the best pizza in town
- the most beautiful view
- Which one is better?
- It's the best!

---

## Unit F26 — Faster than, bigger than

> **Sub-CEFR**: A1 | **Grammar focus**: Comparativo de adjetivos curtos: adjetivo + -er + than | **Markers**: [denso] | **Tense**: PRESENTE · comparativo
> **Real-life context**: Você escolhe entre metrô, ônibus e táxi comparando qual é mais rápido e mais barato.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "The subway is _____ than the bus."
   **Options**: faster / more fast / fastest
   **Answer**: faster
   **Explanation**: Adjetivo curto (fast) ganha "-er" + "than": "faster than" = mais rápido que. Dica do Igor: "than" é o "do que" da comparação.

2. **multiple_choice** — "The bus is _____ than the taxi."
   **Options**: cheaper / more cheap / cheapest
   **Answer**: cheaper
   **Explanation**: "Cheap" (barato) vira "cheaper than" = mais barato que.

3. **word_bank** — "New York is _____ than Boston."
   **Choices**: bigger / biger / more big / big
   **Answer**: bigger
   **Explanation**: "Big" vira "bigger": quando a palavra termina em consoante-vogal-consoante, dobra a última letra (big → bigger, hot → hotter).

4. **word_bank** — "The walk is _____ than the bus. It takes an hour!"
   **Choices**: slower / slowest / more slow / slow
   **Answer**: slower
   **Explanation**: "Slow" (devagar) vira "slower than" = mais devagar que.

5. **fill_gap** — "My room is _____ than your room."
   **Hint**: Menor (small + er)
   **Answer**: smaller
   **Explanation**: "Small" vira "smaller than". Só colocar "-er".

6. **fill_gap** — "The taxi is faster _____ the bus."
   **Hint**: Do que
   **Answer**: than
   **Explanation**: "Than" liga as duas coisas comparadas. Não confunda com "then" (então).

7. **fill_gap** — "Today is _____ than yesterday. 35 degrees!"
   **Hint**: Mais quente (hot + er)
   **Answer**: hotter
   **Explanation**: "Hot" vira "hotter" (dobra o "t"). "Today is hotter than yesterday."

8. **fix_error** — "The subway is more fast than the bus."
   **Hint**: Adjetivo curto não usa "more"
   **Answer**: The subway is faster than the bus.
   **Explanation**: Com adjetivo curto, é "-er": "faster". "More" é para adjetivos longos (vem na F28).

9. **fix_error** — "The bus is cheaper then the taxi."
   **Hint**: Na comparação é "than", não "then"
   **Answer**: The bus is cheaper than the taxi.
   **Explanation**: "Than" compara; "then" é "então / depois". Erro comum até de nativo na escrita.

10. **read_answer**
    **Passage**: "Igor: The taxi is faster than the subway, but the subway is cheaper. The bus is the slowest, but it has the best view!"
    **Question**: Qual é mais barato: o táxi ou o metrô? (responda em inglês)
    **Answer**: The subway
    **Explanation**: "The subway is cheaper": o metrô é mais barato. O táxi ganha em velocidade (faster).

### 2. Listening/Speaking (5 phrases)

Igorfina fala (voz do Igor). Aluno repete; a pronúncia é avaliada.

1. **"The subway is faster than the bus."** — comparar velocidade
2. **"The bus is cheaper than a taxi."** — comparar preço
3. **"New York is bigger than my city."** — comparar tamanho
4. **"Today is hotter than yesterday, wow!"** — comparar o tempo
5. **"My room is smaller than your room."** — comparar quartos

### 3. Role-play

**Cenário**: Você precisa chegar a um show. O Igorfina, como funcionário do hotel, explica as opções; compare e escolha.
**Tipo**: Live Voice
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Time budget**: 90s
**Opening line**: "You can take the bus, the subway or a taxi. What do you want?"

**Sub-objectives** (2 objetivos):

1. **id**: 1
   **label_pt**: "Perguntar qual é mais rápido"
   **label_en**: "Ask which is faster"
   **hidden_prompt**: "user asks a comparison question: 'which is faster?', 'is the subway faster than the bus?', 'which one is cheaper?' — must be in English"
   **hint_pt**: "Which is faster?"
   **hint_en**: "Which is faster?"
   **example_pass**: Which is faster? | Is the subway faster than the bus? | Which one is cheaper?
   **example_fail**: Fast? (bare word) | Qual é mais rápido? (Portuguese) | Subway (no question)

2. **id**: 2
   **label_pt**: "Escolher comparando"
   **label_en**: "Choose with a comparison"
   **hidden_prompt**: "user chooses and justifies with a comparative (-er than): 'the subway, it's faster', 'I'll take the bus, it's cheaper', 'the subway is faster than the taxi' — must be in English"
   **hint_pt**: "I'll take the subway, it's faster."
   **hint_en**: "I'll take the subway, it's faster."
   **example_pass**: I'll take the subway, it's faster. | The bus, it's cheaper. | The subway is faster than the taxi.
   **example_fail**: Subway (no comparison) | O metrô (Portuguese) | The subway is more fast (wrong form)

**Closing cue**: Igorfina fecha com "Smart choice! Faster and cheaper. Enjoy the show!" quando obj_2 bater.

**Suggested flow** (referencial, 4 turnos):

1. **Student**: ~"Which is faster?"
2. **Igorfina**: "The subway. Twenty minutes. The taxi is slower with traffic."
3. **Student**: ~"I'll take the subway, it's faster."
4. **Igorfina**: "Smart choice! Faster and cheaper. Enjoy the show!"

**Evaluation focus**:
- Adjetivo curto + "-er" + "than"
- Justificar a escolha com uma comparação

### 4. Guided Chat

**Cenário**: Você e o Igorfina comparam as cidades da viagem pelo chat.
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Intro (em PT)**: "Compare as cidades com o Igorfina usando -er than."
**Opening message**: "Miami or New York? Tell me the truth!"

**Sub-objectives** (3 objetivos):

1. **id**: 1
   **label_pt**: "Comparar o tamanho"
   **label_en**: "Compare the size"
   **hidden_prompt**: "user compares with -er than: 'New York is bigger than Miami', 'Miami is smaller' — must be in English"
   **hint_pt**: "New York is bigger than Miami."
   **hint_en**: "New York is bigger than Miami."
   **example_pass**: New York is bigger than Miami. | Miami is smaller. | NYC is bigger.
   **example_fail**: Big (bare word) | NY é maior (Portuguese) | New York is more big (wrong form)

2. **id**: 2
   **label_pt**: "Comparar o calor"
   **label_en**: "Compare the heat"
   **hidden_prompt**: "user compares temperature with -er than: 'Miami is hotter than New York', 'New York is colder' — must be in English"
   **hint_pt**: "Miami is hotter than New York."
   **hint_en**: "Miami is hotter than New York."
   **example_pass**: Miami is hotter than New York. | New York is colder. | Miami is warmer.
   **example_fail**: Hot (bare word) | Miami é mais quente (Portuguese) | Miami is more hot (wrong form)

3. **id**: 3
   **label_pt**: "Dizer qual você prefere"
   **label_en**: "Say which you prefer"
   **hidden_prompt**: "user states a preference: 'I prefer Miami', 'I'd rather go to New York', 'Miami is better for me' — must be in English"
   **hint_pt**: "I prefer Miami."
   **hint_en**: "I prefer Miami."
   **example_pass**: I prefer Miami. | I'd rather go to New York. | Miami is better for me.
   **example_fail**: Miami (bare word) | Prefiro Miami (Portuguese) | Both (no preference)

**Closing cue**: Igorfina encerra com "Beach person, I knew it! Sunscreen, my friend!" quando obj_3 bater.

**Script** (referencial, 6 turnos):

1. **Igorfina**: "Miami or New York? Tell me the truth!"
2. **Student**: "New York is bigger than Miami."
3. **Igorfina**: "True! And the weather?"
4. **Student**: "Miami is hotter than New York."
5. **Igorfina**: "Way hotter. So which one?"
6. **Student**: "I prefer Miami."
7. **Igorfina**: "Beach person, I knew it! Sunscreen, my friend!"

---

## Unit F27 — The best, the worst (com o presidente)

> **Sub-CEFR**: A1 | **Grammar focus**: Irregulares: good → better → the best; bad → worse → the worst | **Markers**: [denso] | **Tense**: PRESENTE · superlativo
> **Real-life context**: O Igorfina imita um presidente exagerado que acha tudo "o melhor do mundo". Você entra no jogo comparando e elegendo o melhor e o pior.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "This pizza is _____ than the pizza in my hotel."
   **Options**: better / gooder / more good
   **Answer**: better
   **Explanation**: "Good" é irregular: good → better → the best. "Better than" = melhor que. "Gooder" não existe.

2. **multiple_choice** — "This is _____ pizza in New York!"
   **Options**: the best / the better / best of
   **Answer**: the best
   **Explanation**: "The best" = o melhor (de todos). Superlativo sempre com "the". Dica do Igor: o presidente fala "the best" a cada três palavras.

3. **word_bank** — "The traffic today is _____ than yesterday."
   **Choices**: worse / badder / worst / more bad
   **Answer**: worse
   **Explanation**: "Bad" também é irregular: bad → worse → the worst. "Worse than" = pior que.

4. **word_bank** — "Today is _____ day I've had in a long time."
   **Choices**: the worst / the worse / worst of / bad
   **Answer**: the worst
   **Explanation**: Frase do curso: "Today is the worst day I've had in a long time" = hoje é o pior dia que tive em muito tempo.

5. **fill_gap** — "Folks, this hotel is _____ best hotel. Believe me."
   **Hint**: Artigo que vem antes do superlativo
   **Answer**: the
   **Explanation**: Superlativo pede "the": "the best", "the worst", "the biggest".

6. **fill_gap** — "My English is _____ than last year!"
   **Hint**: Melhor (comparativo de good)
   **Answer**: better
   **Explanation**: "My English is better than last year" = meu inglês está melhor que no ano passado. Frase para se orgulhar.

7. **fill_gap** — "This is the _____ coffee ever. I can't drink it!"
   **Hint**: O pior (superlativo de bad)
   **Answer**: worst
   **Explanation**: "The worst coffee ever" = o pior café da vida. "Ever" reforça: de todos os tempos.

8. **fix_error** — "This is the most good pizza."
   **Hint**: "Good" tem superlativo irregular
   **Answer**: This is the best pizza.
   **Explanation**: Nada de "most good": o superlativo de "good" é "the best".

9. **fix_error** — "Today is more bad than yesterday."
   **Hint**: "Bad" tem comparativo irregular
   **Answer**: Today is worse than yesterday.
   **Explanation**: "Bad" → "worse". "More bad" e "badder" não existem (fora de música).

10. **read_answer**
    **Passage**: "Igor (as the president): Folks, this burger is tremendous. The best burger. Better than any burger. The fries? The worst. Terrible fries. Sad!"
    **Question**: O que é "the worst" para o presidente? (responda em inglês)
    **Answer**: The fries
    **Explanation**: Ele achou o hambúrguer "the best" e as batatas "the worst". Repare: "better than" para comparar dois, "the best / the worst" para o extremo.

### 2. Listening/Speaking (5 phrases)

Igorfina fala no estilo do presidente (imitação). Aluno repete; a pronúncia é avaliada.

1. **"This is the best pizza in New York!"** — eleger o melhor
2. **"My English is better than last year."** — comparar com orgulho
3. **"Today is the worst day of my trip."** — reclamar do dia
4. **"The traffic is worse than yesterday."** — comparar o pior
5. **"Believe me, this is the best city ever!"** — exagerar como o presidente

### 3. Role-play

**Cenário**: Numa lanchonete, o Igorfina imita um presidente exagerado que quer saber sua opinião sobre a comida. Entre no jogo: compare e eleja o melhor.
**Tipo**: Live Voice
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_president`
**Time budget**: 90s
**Opening line**: "Folks, this burger. Tremendous. The best burger. Do you like it?"

**Sub-objectives** (2 objetivos):

1. **id**: 1
   **label_pt**: "Eleger o melhor"
   **label_en**: "Name the best"
   **hidden_prompt**: "user uses a superlative with the best: 'it's the best burger', 'this is the best!', 'the best burger ever' — must be in English"
   **hint_pt**: "It's the best burger!"
   **hint_en**: "It's the best burger!"
   **example_pass**: It's the best burger! | This is the best! | The best burger ever!
   **example_fail**: Good (no superlative) | É o melhor (Portuguese) | It's the most good (wrong form)

2. **id**: 2
   **label_pt**: "Comparar com outra comida"
   **label_en**: "Compare with another food"
   **hidden_prompt**: "user compares with better/worse than: 'it's better than the pizza', 'the fries are worse than the burger' — must be in English"
   **hint_pt**: "It's better than the pizza."
   **hint_en**: "It's better than the pizza."
   **example_pass**: It's better than the pizza. | The fries are worse than the burger. | Better than my mom's burger!
   **example_fail**: Better (bare word) | Melhor que a pizza (Portuguese) | More good than (wrong form)

**Closing cue**: Igorfina fecha com "Tremendous answer! Nobody compares better than you. Believe me!" quando obj_2 bater.

**Suggested flow** (referencial, 4 turnos):

1. **Student**: ~"It's the best burger!"
2. **Igorfina**: "The best! And the pizza? Many people say the pizza..."
3. **Student**: ~"It's better than the pizza."
4. **Igorfina**: "Tremendous answer! Nobody compares better than you. Believe me!"

**Evaluation focus**:
- Irregulares: better / the best, worse / the worst
- "The" antes do superlativo

### 4. Guided Chat

**Cenário**: O Igorfina, no personagem do presidente, pede no chat sua avaliação da viagem: o melhor e o pior.
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_president`
**Intro (em PT)**: "O 'presidente' quer um relatório da viagem. Diga o melhor e o pior."
**Opening message**: "Folks, I need a report. A tremendous report. What was the best part of your trip?"

**Sub-objectives** (3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer a melhor parte"
   **label_en**: "Say the best part"
   **hidden_prompt**: "user names the best part with the best: 'the best part was the beach', 'the best was the food' — must be in English"
   **hint_pt**: "The best part was the beach."
   **hint_en**: "The best part was the beach."
   **example_pass**: The best part was the beach. | The best was the food! | The beach was the best.
   **example_fail**: Beach (bare word) | O melhor foi a praia (Portuguese) | Good beach (no superlative)

2. **id**: 2
   **label_pt**: "Dizer a pior parte"
   **label_en**: "Say the worst part"
   **hidden_prompt**: "user names the worst part with the worst: 'the worst part was the traffic', 'the worst was the rain' — must be in English"
   **hint_pt**: "The worst part was the traffic."
   **hint_en**: "The worst part was the traffic."
   **example_pass**: The worst part was the traffic. | The worst was the rain. | The airport was the worst.
   **example_fail**: Traffic (bare word) | O pior foi o trânsito (Portuguese) | Bad traffic (no superlative)

3. **id**: 3
   **label_pt**: "Comparar com a viagem anterior"
   **label_en**: "Compare with your last trip"
   **hidden_prompt**: "user compares with better/worse than: 'it was better than my last trip', 'this trip was better than last year' — must be in English"
   **hint_pt**: "It was better than my last trip."
   **hint_en**: "It was better than my last trip."
   **example_pass**: It was better than my last trip. | This trip was better than last year. | Worse than Paris, ha!
   **example_fail**: Better (bare word) | Foi melhor (Portuguese) | More good (wrong form)

**Closing cue**: Igorfina encerra com "The best report. Incredible report. You're hired, believe me!" quando obj_3 bater.

**Script** (referencial, 6 turnos):

1. **Igorfina**: "Folks, I need a report. A tremendous report. What was the best part of your trip?"
2. **Student**: "The best part was the beach."
3. **Igorfina**: "Beautiful. And the worst? Be honest."
4. **Student**: "The worst part was the traffic."
5. **Igorfina**: "Terrible traffic. Sad! Better than your last trip?"
6. **Student**: "It was better than my last trip."
7. **Igorfina**: "The best report. Incredible report. You're hired, believe me!"

---

## Unit F28 — More expensive, the most famous (com o presidente)

> **Sub-CEFR**: A1 | **Grammar focus**: Adjetivos longos: more ... than / the most ... | **Markers**: [denso] | **Tense**: PRESENTE · comparativo e superlativo
> **Real-life context**: Numa loja chique, o Igorfina imita um presidente exagerado mostrando "o relógio mais caro do mundo". Você compara preços e fama.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "This watch is _____ than that one."
   **Options**: more expensive / expensiver / most expensive
   **Answer**: more expensive
   **Explanation**: Adjetivo longo (expensive) usa "more ... than": "more expensive than" = mais caro que. Nada de "expensiver".

2. **multiple_choice** — "This is _____ restaurant in the city."
   **Options**: the most famous / the famousest / most famous of
   **Answer**: the most famous
   **Explanation**: Superlativo de adjetivo longo: "the most + adjetivo". "The most famous" = o mais famoso.

3. **word_bank** — "The hotel by the beach is _____ beautiful than the hotel downtown."
   **Choices**: more / most / much / very
   **Answer**: more
   **Explanation**: "More beautiful than" = mais bonito que. "Beautiful" é longo, então vai "more".

4. **word_bank** — "Folks, this is the _____ expensive car. The most!"
   **Choices**: most / more / much / many
   **Answer**: most
   **Explanation**: "The most expensive" = o mais caro (de todos).

5. **fill_gap** — "The museum is _____ interesting than the mall."
   **Hint**: Mais (para adjetivo longo)
   **Answer**: more
   **Explanation**: "More interesting than" = mais interessante que.

6. **fill_gap** — "Times Square is the most _____ place in New York."
   **Hint**: Famoso
   **Answer**: famous
   **Explanation**: "The most famous place" = o lugar mais famoso.

7. **fill_gap** — "This bag is more expensive _____ my car, ha!"
   **Hint**: Do que
   **Answer**: than
   **Explanation**: "More expensive than" — o "than" de sempre na comparação.

8. **fix_error** — "This watch is expensiver than that one."
   **Hint**: Adjetivo longo não ganha "-er"
   **Answer**: This watch is more expensive than that one.
   **Explanation**: Regra rápida: palavra curta, "-er" (cheaper); palavra longa, "more" (more expensive).

9. **fix_error** — "This is the more famous museum."
   **Hint**: Superlativo é "the most"
   **Answer**: This is the most famous museum.
   **Explanation**: "The more" não funciona aqui; para o extremo, "the most".

10. **read_answer**
    **Passage**: "Igor (as the president): This watch? The most expensive watch. More expensive than a house. Many people say it's the most beautiful watch in the world."
    **Question**: Segundo o presidente, o relógio é mais caro que o quê? (responda em inglês)
    **Answer**: A house
    **Explanation**: "More expensive than a house" = mais caro que uma casa. E ainda "the most expensive" e "the most beautiful" na mesma fala.

### 2. Listening/Speaking (5 phrases)

Igorfina fala no estilo do presidente (imitação). Aluno repete; a pronúncia é avaliada.

1. **"This watch is more expensive than my car!"** — comparar preço
2. **"This is the most famous place in town."** — o mais famoso
3. **"The beach hotel is more beautiful."** — comparar beleza
4. **"It's the most expensive restaurant here."** — o mais caro
5. **"The museum is more interesting than the mall."** — comparar passeios

### 3. Role-play

**Cenário**: Numa loja de luxo, o Igorfina imita um presidente vendedor que só oferece "o mais caro". Compare e peça algo mais barato.
**Tipo**: Live Voice
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_president`
**Time budget**: 90s
**Opening line**: "Folks, welcome to my store. The most beautiful store. Want the most expensive watch?"

**Sub-objectives** (2 objetivos):

1. **id**: 1
   **label_pt**: "Comparar o preço"
   **label_en**: "Compare the price"
   **hidden_prompt**: "user compares price with more ... than: 'it's more expensive than my car', 'this one is more expensive' — must be in English"
   **hint_pt**: "It's more expensive than my car!"
   **hint_en**: "It's more expensive than my car!"
   **example_pass**: It's more expensive than my car! | This one is more expensive. | More expensive than my house, ha!
   **example_fail**: Expensive (bare word) | Mais caro que meu carro (Portuguese) | Expensiver (wrong form)

2. **id**: 2
   **label_pt**: "Pedir algo mais barato"
   **label_en**: "Ask for something cheaper"
   **hidden_prompt**: "user asks for a cheaper option: 'do you have something cheaper?', 'can I see a cheaper one?', 'something less expensive, please' — must be in English"
   **hint_pt**: "Do you have something cheaper?"
   **hint_en**: "Do you have something cheaper?"
   **example_pass**: Do you have something cheaper? | Can I see a cheaper one? | Something less expensive, please.
   **example_fail**: Cheap (bare word) | Tem mais barato? (Portuguese) | No (no request)

**Closing cue**: Igorfina fecha com "Cheaper? Smart. The smartest customer. Here, the best cheap watch!" quando obj_2 bater.

**Suggested flow** (referencial, 4 turnos):

1. **Student**: ~"It's more expensive than my car!"
2. **Igorfina**: "Of course! The most expensive. Do you want it?"
3. **Student**: ~"Do you have something cheaper?"
4. **Igorfina**: "Cheaper? Smart. The smartest customer. Here, the best cheap watch!"

**Evaluation focus**:
- "More ... than" com adjetivo longo, "-er" com curto (cheaper)
- Pedido educado de alternativa

### 4. Guided Chat

**Cenário**: O Igorfina, no personagem do presidente, quer que você escolha o restaurante do jantar comparando opções.
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_president`
**Intro (em PT)**: "O 'presidente' quer um jantar incrível. Compare os restaurantes com more e the most."
**Opening message**: "Folks, dinner tonight. The most famous restaurant or the most beautiful? Your call."

**Sub-objectives** (3 objetivos):

1. **id**: 1
   **label_pt**: "Perguntar qual é mais caro"
   **label_en**: "Ask which is more expensive"
   **hidden_prompt**: "user asks a comparison question: 'which one is more expensive?', 'is the famous one more expensive?' — must be in English"
   **hint_pt**: "Which one is more expensive?"
   **hint_en**: "Which one is more expensive?"
   **example_pass**: Which one is more expensive? | Is the famous one more expensive? | Which is cheaper?
   **example_fail**: Price? (bare word) | Qual é mais caro? (Portuguese) | Expensive (no question)

2. **id**: 2
   **label_pt**: "Comparar a vista"
   **label_en**: "Compare the view"
   **hidden_prompt**: "user compares with more ... than: 'the rooftop is more beautiful', 'the view is more beautiful than the food' — must be in English"
   **hint_pt**: "The rooftop is more beautiful."
   **hint_en**: "The rooftop is more beautiful."
   **example_pass**: The rooftop is more beautiful. | The view is more beautiful than the other place. | The beautiful one is more romantic.
   **example_fail**: Beautiful (bare word) | O terraço é mais bonito (Portuguese) | Beautifuller (wrong form)

3. **id**: 3
   **label_pt**: "Escolher o restaurante"
   **label_en**: "Choose the restaurant"
   **hidden_prompt**: "user chooses using a superlative or a preference: 'let's go to the most beautiful one', 'I'd rather go to the cheaper one', 'the most famous, please' — must be in English"
   **hint_pt**: "Let's go to the most beautiful one."
   **hint_en**: "Let's go to the most beautiful one."
   **example_pass**: Let's go to the most beautiful one. | I'd rather go to the cheaper one. | The most famous, please!
   **example_fail**: That one (unclear) | Vamos no bonito (Portuguese) | Both (no choice)

**Closing cue**: Igorfina encerra com "Tremendous choice. The most beautiful dinner. Table for two!" quando obj_3 bater.

**Script** (referencial, 6 turnos):

1. **Igorfina**: "Folks, dinner tonight. The most famous restaurant or the most beautiful? Your call."
2. **Student**: "Which one is more expensive?"
3. **Igorfina**: "The famous one. Very expensive. The most!"
4. **Student**: "The rooftop is more beautiful."
5. **Igorfina**: "Incredible rooftop. So?"
6. **Student**: "Let's go to the most beautiful one."
7. **Igorfina**: "Tremendous choice. The most beautiful dinner. Table for two!"

---

## Unit F29 — Less expensive, farther

> **Sub-CEFR**: A1 | **Grammar focus**: Menos: less ... than / the least ...; distância: far → farther → the farthest | **Markers**: [denso] | **Tense**: PRESENTE · comparativo
> **Real-life context**: Você compara roupas numa loja de outlet e a distância entre lugares para planejar o dia.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "This sweater is _____ expensive than the other one."
   **Options**: less / fewer / lesser
   **Answer**: less
   **Explanation**: Frase do curso: "This sweater is less expensive than the other one" = esse suéter é menos caro que o outro. "Less ... than" = menos ... que.

2. **multiple_choice** — "Japan is _____ than Portugal from Brazil."
   **Options**: farther / farer / more far
   **Answer**: farther
   **Explanation**: "Far" (longe) é irregular: far → farther → the farthest. "Japan is farther than Portugal" = o Japão é mais longe que Portugal.

3. **word_bank** — "This is the _____ expensive store in the mall."
   **Choices**: least / less / little / lowest
   **Answer**: least
   **Explanation**: "The least expensive" = o menos caro (de todos). É o superlativo de "less".

4. **word_bank** — "The airport is the _____ place from the hotel."
   **Choices**: farthest / farther / farest / most far
   **Answer**: farthest
   **Explanation**: "The farthest" = o mais longe. "Farest" e "most far" não existem.

5. **fill_gap** — "I ran even _____ today. Ten kilometers!"
   **Hint**: Mais longe (comparativo de far)
   **Answer**: farther
   **Accepts**: further
   **Explanation**: Frase do curso: "I ran even farther today" = corri ainda mais longe hoje. "Further" também é aceito.

6. **fill_gap** — "The outlet is _____ expensive than the store in Manhattan."
   **Hint**: Menos
   **Answer**: less
   **Explanation**: "Less expensive than" = menos caro que. Outlet é para isso, ha!

7. **fill_gap** — "Is the beach _____ than the museum?"
   **Hint**: Mais longe
   **Answer**: farther
   **Accepts**: further
   **Explanation**: "Is the beach farther than the museum?" = a praia é mais longe que o museu?

8. **fix_error** — "Japan is more far than Portugal."
   **Hint**: "Far" tem forma própria
   **Answer**: Japan is farther than Portugal.
   **Explanation**: "Far" → "farther". Nada de "more far".

9. **fix_error** — "This is the less expensive hotel."
   **Hint**: Superlativo de "less" é outro
   **Answer**: This is the least expensive hotel.
   **Explanation**: "The least" = o menos (de todos). "The less" não se usa assim.

10. **read_answer**
    **Passage**: "Igor: The outlet is farther than the mall, but it's less expensive. The mall is closer, but it's the most expensive place in town."
    **Question**: Qual é menos caro: o outlet ou o shopping? (responda em inglês)
    **Answer**: The outlet
    **Explanation**: "The outlet ... is less expensive": o outlet é menos caro, apesar de mais longe (farther).

### 2. Listening/Speaking (5 phrases)

Igorfina fala (voz do Igor). Aluno repete; a pronúncia é avaliada.

1. **"This sweater is less expensive than the other one."** — comparar para menos
2. **"Japan is farther than Portugal from Brazil."** — comparar distância
3. **"I ran even farther today, ten kilometers!"** — contar uma conquista
4. **"This is the least expensive store here."** — achar o mais barato
5. **"Is the beach farther than the museum?"** — perguntar distância

### 3. Role-play

**Cenário**: No outlet, o Igorfina é o vendedor. Compare as duas jaquetas e escolha a menos cara.
**Tipo**: Live Voice
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Time budget**: 90s
**Opening line**: "Hey! The black jacket or the blue jacket? Both are great!"

**Sub-objectives** (2 objetivos):

1. **id**: 1
   **label_pt**: "Perguntar qual é menos cara"
   **label_en**: "Ask which is less expensive"
   **hidden_prompt**: "user asks which is cheaper/less expensive: 'which one is less expensive?', 'which is cheaper?' — must be in English"
   **hint_pt**: "Which one is less expensive?"
   **hint_en**: "Which one is less expensive?"
   **example_pass**: Which one is less expensive? | Which is cheaper? | Is the blue one less expensive?
   **example_fail**: Price? (bare word) | Qual é mais barata? (Portuguese) | Blue (no question)

2. **id**: 2
   **label_pt**: "Escolher a jaqueta comparando"
   **label_en**: "Choose with a comparison"
   **hidden_prompt**: "user chooses and justifies with less/least or -er: 'the blue one, it's less expensive', 'I'll take the cheaper one', 'the least expensive, please' — must be in English"
   **hint_pt**: "The blue one, it's less expensive."
   **hint_en**: "The blue one, it's less expensive."
   **example_pass**: The blue one, it's less expensive. | I'll take the cheaper one. | The least expensive, please.
   **example_fail**: Blue (no comparison) | A azul (Portuguese) | The cheap one (no comparison)

**Closing cue**: Igorfina fecha com "Great eye! Same style, less money. Smart shopping!" quando obj_2 bater.

**Suggested flow** (referencial, 4 turnos):

1. **Student**: ~"Which one is less expensive?"
2. **Igorfina**: "The blue one. Forty bucks. The black one is sixty."
3. **Student**: ~"The blue one, it's less expensive."
4. **Igorfina**: "Great eye! Same style, less money. Smart shopping!"

**Evaluation focus**:
- "Less ... than" e "the least"
- "Farther" para distância

### 4. Guided Chat

**Cenário**: O Igorfina ajuda você a montar o roteiro do dia pelo chat, comparando distâncias.
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Intro (em PT)**: "Monte o roteiro com o Igorfina comparando distâncias com farther e the farthest."
**Opening message**: "Beach, museum and outlet today. Where do we go first?"

**Sub-objectives** (3 objetivos):

1. **id**: 1
   **label_pt**: "Perguntar o que é mais longe"
   **label_en**: "Ask what's farther"
   **hidden_prompt**: "user asks about distance with farther/farthest: 'which one is the farthest?', 'is the beach farther than the museum?' — must be in English"
   **hint_pt**: "Which one is the farthest?"
   **hint_en**: "Which one is the farthest?"
   **example_pass**: Which one is the farthest? | Is the beach farther than the museum? | What's the farthest place?
   **example_fail**: Far? (bare word) | Qual é mais longe? (Portuguese) | Beach (no question)

2. **id**: 2
   **label_pt**: "Sugerir começar pelo mais perto"
   **label_en**: "Suggest starting closer"
   **hidden_prompt**: "user suggests starting with the closest one: 'let's go to the museum first, it's closer', 'the closest first' — must be in English"
   **hint_pt**: "Let's go to the museum first, it's closer."
   **hint_en**: "Let's go to the museum first, it's closer."
   **example_pass**: Let's go to the museum first, it's closer. | The closest first! | Museum first, it's nearer.
   **example_fail**: Museum (bare word) | Primeiro o museu (Portuguese) | First (unclear)

3. **id**: 3
   **label_pt**: "Comentar o preço do outlet"
   **label_en**: "Comment on the outlet price"
   **hidden_prompt**: "user compares price with less ... than or cheaper: 'the outlet is less expensive', 'it's cheaper than the mall' — must be in English"
   **hint_pt**: "The outlet is less expensive."
   **hint_en**: "The outlet is less expensive."
   **example_pass**: The outlet is less expensive. | It's cheaper than the mall. | Less expensive than Manhattan!
   **example_fail**: Cheap (bare word) | É mais barato (Portuguese) | Expensive (wrong idea)

**Closing cue**: Igorfina encerra com "Perfect plan! Museum, beach, and shopping last. Let's go!" quando obj_3 bater.

**Script** (referencial, 6 turnos):

1. **Igorfina**: "Beach, museum and outlet today. Where do we go first?"
2. **Student**: "Which one is the farthest?"
3. **Igorfina**: "The outlet. One hour by bus."
4. **Student**: "Let's go to the museum first, it's closer."
5. **Igorfina**: "Good idea. Why go to the outlet anyway?"
6. **Student**: "The outlet is less expensive."
7. **Igorfina**: "Perfect plan! Museum, beach, and shopping last. Let's go!"

---

## Unit F30 — O melhor hotel da cidade: juntando tudo (com o presidente)

> **Sub-CEFR**: A1 | **Grammar focus**: Revisão: -er than / more ... than / less ... than / the best / the worst / the most / the farthest | **Markers**: [review] | **Tense**: PRESENTE · comparativo e superlativo
> **Real-life context**: O Igorfina imita um presidente exagerado que é dono de dois hotéis e quer que você escolha. Compare tudo e decida.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "Hotel A is _____ than Hotel B."
   **Options**: cheaper / more cheap / cheapest
   **Answer**: cheaper
   **Explanation**: Adjetivo curto: "-er". Revisão da F26.

2. **multiple_choice** — "Hotel B has _____ view in the city."
   **Options**: the best / the better / best
   **Answer**: the best
   **Explanation**: Irregular: good → better → the best. Revisão da F27.

3. **word_bank** — "Hotel B is _____ expensive than Hotel A."
   **Choices**: more / most / less of / much
   **Answer**: more
   **Explanation**: Adjetivo longo: "more expensive than". Revisão da F28.

4. **word_bank** — "Hotel A is the _____ from the beach."
   **Choices**: farthest / farther / farest / most far
   **Answer**: farthest
   **Explanation**: "The farthest" = o mais longe. Revisão da F29.

5. **fill_gap** — "The pool in Hotel B is _____ than the pool in Hotel A."
   **Hint**: Maior (big + er)
   **Answer**: bigger
   **Explanation**: "Big" → "bigger" (dobra o "g").

6. **fill_gap** — "The breakfast in Hotel A is the _____. Cold eggs!"
   **Hint**: O pior
   **Answer**: worst
   **Explanation**: "The worst" = o pior. Irregular de "bad".

7. **fill_gap** — "Hotel A is less expensive, but Hotel B is _____ beautiful."
   **Hint**: Mais (adjetivo longo)
   **Answer**: more
   **Explanation**: "More beautiful" para adjetivo longo.

8. **fix_error** — "Hotel B is the most good hotel."
   **Hint**: Superlativo irregular de "good"
   **Answer**: Hotel B is the best hotel.
   **Explanation**: "The best", nunca "the most good".

9. **fix_error** — "Hotel A is more cheap than Hotel B."
   **Hint**: Adjetivo curto usa "-er"
   **Answer**: Hotel A is cheaper than Hotel B.
   **Explanation**: "Cheap" é curto: "cheaper".

10. **read_answer**
    **Passage**: "Igor (as the president): Hotel B, folks. The most beautiful hotel. Bigger pool, better view, the best breakfast. More expensive? Yes. But the best things are expensive. Believe me."
    **Question**: Qual hotel é mais caro, segundo o presidente? (responda em inglês)
    **Answer**: Hotel B
    **Explanation**: Ele admite "More expensive? Yes." sobre o Hotel B, e defende com "bigger", "better" e "the best".

### 2. Listening/Speaking (5 phrases)

Igorfina fala no estilo do presidente (imitação). Aluno repete; a pronúncia é avaliada.

1. **"Hotel A is cheaper than Hotel B."** — comparar preço
2. **"Hotel B has the best view in the city."** — o melhor
3. **"The pool is bigger and more beautiful."** — comparar duas coisas
4. **"The breakfast was the worst, cold eggs!"** — o pior
5. **"The beach is farther from Hotel A."** — comparar distância

### 3. Role-play

**Cenário**: O Igorfina imita um presidente dono de dois hotéis e quer que você escolha um. Compare e decida.
**Tipo**: Live Voice
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_president`
**Time budget**: 120s
**Opening line**: "Folks, two hotels. Both mine. Both tremendous. Which one do you want?"

**Sub-objectives** (3 objetivos):

1. **id**: 1
   **label_pt**: "Perguntar qual é mais barato"
   **label_en**: "Ask which is cheaper"
   **hidden_prompt**: "user asks a price comparison: 'which one is cheaper?', 'which is less expensive?', 'is Hotel A cheaper?' — must be in English"
   **hint_pt**: "Which one is cheaper?"
   **hint_en**: "Which one is cheaper?"
   **example_pass**: Which one is cheaper? | Which is less expensive? | Is Hotel A cheaper?
   **example_fail**: Price? (bare word) | Qual é mais barato? (Portuguese) | Cheap (no question)

2. **id**: 2
   **label_pt**: "Comparar os dois hotéis"
   **label_en**: "Compare the two hotels"
   **hidden_prompt**: "user compares using a comparative: 'Hotel B is more beautiful', 'the pool is bigger', 'Hotel A is farther from the beach' — must be in English"
   **hint_pt**: "Hotel B is more beautiful."
   **hint_en**: "Hotel B is more beautiful."
   **example_pass**: Hotel B is more beautiful. | The pool is bigger in Hotel B. | Hotel A is farther from the beach.
   **example_fail**: Beautiful (bare word) | O B é mais bonito (Portuguese) | More beautifuller (wrong form)

3. **id**: 3
   **label_pt**: "Escolher com um superlativo"
   **label_en**: "Choose with a superlative"
   **hidden_prompt**: "user decides using a superlative: 'I'll take Hotel B, it has the best view', 'Hotel A, the least expensive', 'the best one, Hotel B' — must be in English"
   **hint_pt**: "Hotel B, it has the best view."
   **hint_en**: "Hotel B, it has the best view."
   **example_pass**: Hotel B, it has the best view. | Hotel A, the least expensive. | I'll take the best one!
   **example_fail**: B (bare letter) | Fico com o B (Portuguese) | The most good (wrong form)

**Closing cue**: Igorfina fecha com "Tremendous decision! The best guest in the best hotel. Believe me!" quando obj_3 bater.

**Suggested flow** (referencial, 6 turnos):

1. **Student**: ~"Which one is cheaper?"
2. **Igorfina**: "Hotel A. Cheaper, but far from the beach. Sad!"
3. **Student**: ~"Hotel B is more beautiful."
4. **Igorfina**: "So beautiful. The most beautiful. So, decision?"
5. **Student**: ~"Hotel B, it has the best view."
6. **Igorfina**: "Tremendous decision! The best guest in the best hotel. Believe me!"

**Evaluation focus**:
- Escolher a forma certa (-er / more / irregular)
- Superlativo com "the" para decidir

### 4. Guided Chat

**Cenário**: Depois da viagem, o Igorfina (no personagem do presidente) pede sua avaliação dos dois hotéis no chat.
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_president`
**Intro (em PT)**: "Avalie os hotéis do 'presidente' comparando tudo o que aprendeu no módulo."
**Opening message**: "Folks, review time. Hotel A or Hotel B? Tell me everything."

**Sub-objectives** (3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer o melhor do hotel"
   **label_en**: "Say the best thing"
   **hidden_prompt**: "user names the best thing with the best: 'the best thing was the pool', 'Hotel B had the best breakfast' — must be in English"
   **hint_pt**: "The best thing was the pool."
   **hint_en**: "The best thing was the pool."
   **example_pass**: The best thing was the pool. | Hotel B had the best breakfast. | The view was the best!
   **example_fail**: Pool (bare word) | O melhor foi a piscina (Portuguese) | Good pool (no superlative)

2. **id**: 2
   **label_pt**: "Dizer o pior do hotel"
   **label_en**: "Say the worst thing"
   **hidden_prompt**: "user names the worst thing with the worst: 'the worst thing was the wifi', 'the breakfast in Hotel A was the worst' — must be in English"
   **hint_pt**: "The worst thing was the wifi."
   **hint_en**: "The worst thing was the wifi."
   **example_pass**: The worst thing was the wifi. | The breakfast in Hotel A was the worst. | The worst was the noise.
   **example_fail**: Wifi (bare word) | O pior foi o wifi (Portuguese) | Bad wifi (no superlative)

3. **id**: 3
   **label_pt**: "Comparar com outro hotel"
   **label_en**: "Compare with another hotel"
   **hidden_prompt**: "user compares with a comparative: 'Hotel B is better than Hotel A', 'it's more expensive but better' — must be in English"
   **hint_pt**: "Hotel B is better than Hotel A."
   **hint_en**: "Hotel B is better than Hotel A."
   **example_pass**: Hotel B is better than Hotel A. | It's more expensive but better. | Hotel A is cheaper than B.
   **example_fail**: Better (bare word) | O B é melhor (Portuguese) | More good (wrong form)

**Closing cue**: Igorfina encerra com "Incredible review. The best review. Five stars for you, believe me!" quando obj_3 bater.

**Script** (referencial, 6 turnos):

1. **Igorfina**: "Folks, review time. Hotel A or Hotel B? Tell me everything."
2. **Student**: "The best thing was the pool."
3. **Igorfina**: "Tremendous pool. And the worst?"
4. **Student**: "The worst thing was the wifi."
5. **Igorfina**: "Sad! We're fixing it. Final verdict?"
6. **Student**: "Hotel B is better than Hotel A."
7. **Igorfina**: "Incredible review. The best review. Five stars for you, believe me!"
