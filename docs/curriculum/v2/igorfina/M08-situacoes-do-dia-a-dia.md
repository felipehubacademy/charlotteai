# Module M08 — Situações do dia a dia

> **Level**: Manual do F#did@ (A1)
> **Block**: A1 Block
> **Units**: 5 (F36–F40)
> **Theme**: Restaurante, mercado, barbearia, dinheiro e pedir informação na rua
> **Module goal**: Aluno sai pedindo comida ("I would like..."), respondendo "What flavor?", achando produtos no mercado ("Aisle number three"), cortando o cabelo, falando de preço em "bucks" e pedindo informação a um policial.
> **Connects to**: M07 (In, out, on, off...) e M09 (Academia).

> Trilha do Igorfina. O tópico F38 (barbearia) é com a imitação do astro do basquete
> (`persona_outfit: igorfina_hoops`).

## Module chunks introduced (~35)

- I would like mixed eggs, a milkshake and a waffle.
- What flavor? / Chocolate, please.
- For here or to go?
- Can I get the check, please?
- May I help you?
- I'd like milk, some snacks and ham.
- Where can I find the bread?
- Aisle number three.
- I'd like a haircut.
- Pretty low on the sides, not much on the top.
- Just a trim, please.
- How much is it?
- It's 20 bucks.
- Keep the change.
- Hi, officer. I'm kind of lost.
- I'm from Brazil.
- I need to go to the museum.
- Would you help me?
- Go straight. / Turn left. / Turn right.
- It's two blocks from here.

---

## Unit F36 — No restaurante: I would like...

> **Sub-CEFR**: A1 | **Grammar focus**: Pedir comida: I would like... / What flavor? / For here or to go? | **Markers**: [denso] | **Tense**: EXPRESSÕES · would like
> **Real-life context**: Café da manhã num diner americano: pedir, escolher sabor e pedir a conta.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "I _____ like mixed eggs and a waffle, please."
   **Options**: would / will / do
   **Answer**: would
   **Explanation**: "I would like" (ou "I'd like") = eu gostaria. Frase do curso: "I would like mixed eggs, a milkshake and a waffle".

2. **multiple_choice** — "A: A milkshake? What _____? B: Chocolate, please."
   **Options**: flavor / taste / color
   **Answer**: flavor
   **Explanation**: "What flavor?" = qual sabor? Pergunta clássica para milkshake, sorvete, refrigerante.

3. **word_bank** — "For here or to _____?"
   **Choices**: go / take / leave / bring
   **Answer**: go
   **Explanation**: "For here or to go?" = para comer aqui ou para viagem? Resposta: "For here" ou "To go".

4. **word_bank** — "Can I get the _____, please?"
   **Choices**: check / count / bill of / note
   **Answer**: check
   **Explanation**: "The check" = a conta (nos Estados Unidos). "Can I get the check, please?".

5. **fill_gap** — "I'd _____ a coffee with milk."
   **Hint**: Gostaria (I'd ___)
   **Answer**: like
   **Explanation**: "I'd like a coffee" = eu gostaria de um café.

6. **fill_gap** — "A: What flavor? B: _____, please."
   **Hint**: Um sabor (ex.: chocolate, morango, baunilha)
   **Answer**: Chocolate
   **Accepts**: Strawberry / Vanilla / chocolate / strawberry / vanilla
   **Explanation**: Responda só com o sabor + "please": "Chocolate, please". Também vale strawberry (morango) e vanilla (baunilha).

7. **fill_gap** — "Can I get the check, _____?"
   **Hint**: Por favor
   **Answer**: please
   **Explanation**: "Please" deixa o pedido educado. Dica do Igor: nos EUA, a gorjeta (tip) costuma ser de 15 a 20%.

8. **fix_error** — "I want eggs." (para o garçom)
   **Hint**: Use a forma educada de pedir
   **Answer**: I would like eggs, please.
   **Explanation**: "I want" soa seco. "I would like..., please" é o jeito educado.

9. **fix_error** — "Can I get the count, please?"
   **Hint**: "Conta" de restaurante é outra palavra
   **Answer**: Can I get the check, please?
   **Explanation**: "Count" é contar. A conta do restaurante é "the check" (nos EUA) ou "the bill".

10. **read_answer**
    **Passage**: "Waitress: Good morning! What can I get you? Igor: I would like mixed eggs, a milkshake and a waffle. Waitress: What flavor for the milkshake? Igor: Strawberry, please."
    **Question**: Qual sabor de milkshake o Igor pediu? (responda em inglês)
    **Answer**: Strawberry
    **Explanation**: "Strawberry, please" = morango, por favor.

### 2. Listening/Speaking (5 phrases)

Igorfina fala (voz do Igor). Aluno repete; a pronúncia é avaliada.

1. **"I would like mixed eggs and a waffle."** — pedir o café da manhã
2. **"A chocolate milkshake, please. Thank you!"** — escolher o sabor
3. **"For here, please. We're eating inside."** — comer no local
4. **"Can I get the check, please?"** — pedir a conta
5. **"I'd like a coffee with milk, no sugar."** — pedir café do seu jeito

### 3. Role-play

**Cenário**: Num diner de Nova York, o Igorfina é o garçom. Peça o café da manhã e escolha o sabor do milkshake.
**Tipo**: Live Voice
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Time budget**: 90s
**Opening line**: "Good morning, welcome to Joe's Diner! What can I get you?"

**Sub-objectives** (2 objetivos):

1. **id**: 1
   **label_pt**: "Fazer o pedido"
   **label_en**: "Order your food"
   **hidden_prompt**: "user orders politely with would like / I'd like / can I get: 'I would like eggs and a waffle', 'I'd like pancakes' — must be in English"
   **hint_pt**: "I would like eggs and a waffle."
   **hint_en**: "I would like eggs and a waffle."
   **example_pass**: I would like eggs and a waffle. | I'd like pancakes, please. | Can I get eggs and toast?
   **example_fail**: Eggs (bare word) | Quero ovos (Portuguese) | I want eggs (rude)

2. **id**: 2
   **label_pt**: "Escolher o sabor"
   **label_en**: "Choose the flavor"
   **hidden_prompt**: "user picks a flavor: 'chocolate, please', 'strawberry', 'vanilla, please' — must be in English"
   **hint_pt**: "Chocolate, please."
   **hint_en**: "Chocolate, please."
   **example_pass**: Chocolate, please. | Strawberry! | Vanilla, please.
   **example_fail**: Morango (Portuguese) | Qualquer um (Portuguese) | Yes (no flavor)

**Closing cue**: Igorfina fecha com "Great choice! Coming right up, my friend!" quando obj_2 bater.

**Suggested flow** (referencial, 4 turnos):

1. **Student**: ~"I would like eggs and a waffle."
2. **Igorfina**: "Sure! And a milkshake? What flavor?"
3. **Student**: ~"Chocolate, please."
4. **Igorfina**: "Great choice! Coming right up, my friend!"

**Evaluation focus**:
- "I would like" no lugar de "I want"
- Responder "What flavor?" com o sabor

### 4. Guided Chat

**Cenário**: Você pede comida por um aplicativo, e o Igorfina é o atendente do restaurante no chat.
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Intro (em PT)**: "Peça sua comida pelo chat com o Igorfina, o atendente do restaurante."
**Opening message**: "Hi! Joe's Diner here. What would you like today?"

**Sub-objectives** (3 objetivos):

1. **id**: 1
   **label_pt**: "Fazer o pedido"
   **label_en**: "Place your order"
   **hidden_prompt**: "user orders with would like / I'd like: 'I would like a burger and fries', 'I'd like a pizza' — must be in English"
   **hint_pt**: "I would like a burger and fries."
   **hint_en**: "I would like a burger and fries."
   **example_pass**: I would like a burger and fries. | I'd like a pizza, please. | Can I get a burger?
   **example_fail**: Burger (bare word) | Quero um hambúrguer (Portuguese) | I want (rude)

2. **id**: 2
   **label_pt**: "Escolher para viagem"
   **label_en**: "Say it's to go"
   **hidden_prompt**: "user answers for here or to go: 'to go, please', 'for here' — must be in English"
   **hint_pt**: "To go, please."
   **hint_en**: "To go, please."
   **example_pass**: To go, please. | For here! | To go, thanks.
   **example_fail**: Viagem (Portuguese) | Yes (no answer) | Go (unclear)

3. **id**: 3
   **label_pt**: "Perguntar o preço"
   **label_en**: "Ask the price"
   **hidden_prompt**: "user asks the price: 'how much is it?', 'how much?', 'what's the total?' — must be in English"
   **hint_pt**: "How much is it?"
   **hint_en**: "How much is it?"
   **example_pass**: How much is it? | How much? | What's the total?
   **example_fail**: Price (bare word) | Quanto é? (Portuguese) | OK (no question)

**Closing cue**: Igorfina encerra com "Fifteen bucks! Your order is ready in ten minutes. Enjoy!" quando obj_3 bater.

**Script** (referencial, 6 turnos):

1. **Igorfina**: "Hi! Joe's Diner here. What would you like today?"
2. **Student**: "I would like a burger and fries."
3. **Igorfina**: "Perfect. For here or to go?"
4. **Student**: "To go, please."
5. **Igorfina**: "Got it. Anything else?"
6. **Student**: "How much is it?"
7. **Igorfina**: "Fifteen bucks! Your order is ready in ten minutes. Enjoy!"

---

## Unit F37 — No mercado: Aisle number three

> **Sub-CEFR**: A1 | **Grammar focus**: May I help you? / I'd like... / Where can I find...? / aisle + número | **Markers**: [qform] | **Tense**: EXPRESSÕES
> **Real-life context**: Você vai ao supermercado comprar o café da manhã do quarto e precisa achar os produtos.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "_____ I help you?"
   **Options**: May / Do / Am
   **Answer**: May
   **Explanation**: "May I help you?" = posso ajudar? É a frase do funcionário. Você responde: "Yes, please!".

2. **multiple_choice** — "Where can I _____ the bread?"
   **Options**: find / see of / look
   **Answer**: find
   **Explanation**: "Where can I find...?" = onde eu encontro...? Ótima para mercado e loja.

3. **word_bank** — "The milk is in _____ number three."
   **Choices**: aisle / street / line / room
   **Answer**: aisle
   **Explanation**: "Aisle" (pronúncia: "ail") é o corredor do mercado. "Aisle number three" = corredor três.

4. **word_bank** — "I'd like milk, some _____ and ham."
   **Choices**: snacks / snack of / snackes / snacking
   **Answer**: snacks
   **Explanation**: Frase do curso: "I'd like milk, some snacks and ham". "Snacks" = salgadinhos, lanchinhos.

5. **fill_gap** — "Excuse me, where can I find the _____? I need eggs."
   **Hint**: Ovos
   **Answer**: eggs
   **Explanation**: "Where can I find the eggs?" = onde ficam os ovos?

6. **fill_gap** — "A: May I help you? B: Yes, _____! I'm looking for ham."
   **Hint**: Por favor
   **Answer**: please
   **Accepts**: sure
   **Explanation**: "Yes, please!" é a resposta educada a uma oferta de ajuda.

7. **fill_gap** — "The snacks are in aisle number _____." (5)
   **Hint**: Cinco em inglês
   **Answer**: five
   **Explanation**: Números de corredor: "aisle one, two, three, four, five...".

8. **fix_error** — "Where I can find the bread?"
   **Hint**: Na pergunta, "can" vem antes de "I"
   **Answer**: Where can I find the bread?
   **Explanation**: Ordem da pergunta: "Where can I...?".

9. **fix_error** — "The milk is in the corridor three."
   **Hint**: Corredor de mercado tem nome próprio
   **Answer**: The milk is in aisle three.
   **Explanation**: Em mercado se usa "aisle". "Corridor" é corredor de prédio, hotel, hospital.

10. **read_answer**
    **Passage**: "Clerk: May I help you? Igor: Yes, please! Where can I find the ham? Clerk: Aisle number three, next to the cheese."
    **Question**: O que fica ao lado do presunto? (responda em inglês)
    **Answer**: The cheese
    **Explanation**: "Aisle number three, next to the cheese" = corredor três, do lado do queijo.

### 2. Listening/Speaking (5 phrases)

Igorfina fala (voz do Igor). Aluno repete; a pronúncia é avaliada.

1. **"Excuse me, where can I find the bread?"** — achar um produto
2. **"I'd like milk, some snacks and ham."** — dizer o que quer
3. **"Yes, please! I'm looking for eggs."** — aceitar ajuda
4. **"The milk is in aisle number three."** — entender o corredor
5. **"Thank you! And where are the snacks?"** — perguntar mais

### 3. Role-play

**Cenário**: No supermercado, o Igorfina é o funcionário que oferece ajuda. Pergunte onde estão os produtos.
**Tipo**: Live Voice
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Time budget**: 90s
**Opening line**: "Hi there! May I help you?"

**Sub-objectives** (2 objetivos):

1. **id**: 1
   **label_pt**: "Aceitar e dizer o que procura"
   **label_en**: "Say what you're looking for"
   **hidden_prompt**: "user accepts help and says what they need: 'yes, please! I'm looking for milk', 'I'd like some bread' — must be in English"
   **hint_pt**: "Yes, please! I'm looking for milk."
   **hint_en**: "Yes, please! I'm looking for milk."
   **example_pass**: Yes, please! I'm looking for milk. | I'd like some bread. | I need eggs, please.
   **example_fail**: Milk (bare word) | Procuro leite (Portuguese) | Yes (no item)

2. **id**: 2
   **label_pt**: "Perguntar onde fica outro produto"
   **label_en**: "Ask where another item is"
   **hidden_prompt**: "user asks where to find something: 'where can I find the snacks?', 'where are the snacks?' — must be in English"
   **hint_pt**: "Where can I find the snacks?"
   **hint_en**: "Where can I find the snacks?"
   **example_pass**: Where can I find the snacks? | Where are the snacks? | And the bread, where is it?
   **example_fail**: Snacks? (bare word) | Onde ficam os salgadinhos? (Portuguese) | I like snacks (no question)

**Closing cue**: Igorfina fecha com "Aisle number five! The good ones are on the top shelf, ha!" quando obj_2 bater.

**Suggested flow** (referencial, 4 turnos):

1. **Student**: ~"Yes, please! I'm looking for milk."
2. **Igorfina**: "Milk is in aisle number three. Anything else?"
3. **Student**: ~"Where can I find the snacks?"
4. **Igorfina**: "Aisle number five! The good ones are on the top shelf, ha!"

**Evaluation focus**:
- "Where can I find...?" na ordem certa
- Entender "aisle" + número

### 4. Guided Chat

**Cenário**: O Igorfina está no mercado e manda mensagem para saber o que comprar para o quarto.
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Intro (em PT)**: "O Igorfina está no mercado. Diga o que você quer e ajude a achar os produtos."
**Opening message**: "I'm at the supermarket! What do you need?"

**Sub-objectives** (3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer o que você quer"
   **label_en**: "Say what you'd like"
   **hidden_prompt**: "user lists items with I'd like / I need: 'I'd like milk and bread', 'I need some snacks' — must be in English"
   **hint_pt**: "I'd like milk and bread."
   **hint_en**: "I'd like milk and bread."
   **example_pass**: I'd like milk and bread. | I need some snacks. | Milk, bread and ham, please.
   **example_fail**: Leite e pão (Portuguese) | Food (too vague) | Yes (no items)

2. **id**: 2
   **label_pt**: "Sugerir perguntar ao funcionário"
   **label_en**: "Suggest asking a clerk"
   **hidden_prompt**: "user suggests asking: 'ask the clerk where the bread is', 'ask: where can I find the bread?' — must be in English"
   **hint_pt**: "Ask the clerk where the bread is."
   **hint_en**: "Ask the clerk where the bread is."
   **example_pass**: Ask the clerk where the bread is. | Ask someone where the bread is. | Ask: where can I find the bread?
   **example_fail**: Pergunta pra alguém (Portuguese) | Bread (bare word) | I don't know (no suggestion)

3. **id**: 3
   **label_pt**: "Agradecer"
   **label_en**: "Say thank you"
   **hidden_prompt**: "user thanks: 'thanks, my friend!', 'thank you!', 'thanks a lot' — must be in English"
   **hint_pt**: "Thanks, my friend!"
   **hint_en**: "Thanks, my friend!"
   **example_pass**: Thanks, my friend! | Thank you! | Thanks a lot!
   **example_fail**: Valeu (Portuguese) | OK (no thanks) | Bye (no thanks)

**Closing cue**: Igorfina encerra com "Aisle three, found it! Breakfast is on me tomorrow!" quando obj_3 bater.

**Script** (referencial, 6 turnos):

1. **Igorfina**: "I'm at the supermarket! What do you need?"
2. **Student**: "I'd like milk and bread."
3. **Igorfina**: "OK, milk is here. I can't find the bread!"
4. **Student**: "Ask the clerk where the bread is."
5. **Igorfina**: "Good idea, I'll ask the clerk."
6. **Student**: "Thanks, my friend!"
7. **Igorfina**: "Aisle three, found it! Breakfast is on me tomorrow!"

---

## Unit F38 — Na barbearia

> **Sub-CEFR**: A1 | **Grammar focus**: Pedir corte de cabelo: I'd like a haircut / low on the sides / not much on the top / just a trim | **Markers**: [denso] | **Tense**: EXPRESSÕES
> **Real-life context**: Numa barbearia de bairro, o barbeiro (o Igorfina imitando um astro do basquete) quer deixar você "pronto para o jogo".

### 1. Grammar (10 exercises)

1. **multiple_choice** — "Hi! I'd like a _____, please."
   **Options**: haircut / hair cut of / cutting
   **Answer**: haircut
   **Explanation**: "Haircut" = corte de cabelo. "I'd like a haircut" é como você começa na barbearia.

2. **multiple_choice** — "Pretty low on the _____, not much on the top."
   **Options**: sides / side of / sided
   **Answer**: sides
   **Explanation**: Frase do curso: "Pretty low on the sides, not much on the top" = bem baixo dos lados, pouco em cima.

3. **word_bank** — "Not much on the _____, please."
   **Choices**: top / up / head / over
   **Answer**: top
   **Explanation**: "On the top" = em cima (da cabeça). "Not much on the top" = tirar pouco em cima.

4. **word_bank** — "Just a _____, please. Not too short."
   **Choices**: trim / cut off / small / short
   **Answer**: trim
   **Explanation**: "Just a trim" = só aparar. Para quem não quer mudar muito.

5. **fill_gap** — "Pretty _____ on the sides, please."
   **Hint**: Baixo (curto)
   **Answer**: low
   **Accepts**: short
   **Explanation**: "Low" ou "short" nos lados = bem curto. Barbeiro americano entende os dois.

6. **fill_gap** — "Can you _____ the beard too?"
   **Hint**: Aparar
   **Answer**: trim
   **Explanation**: "Trim the beard" = aparar a barba.

7. **fill_gap** — "A: How much? B: It's 25 _____."
   **Hint**: Gíria para dólares
   **Answer**: bucks
   **Explanation**: "Bucks" = dólares, na gíria. "25 bucks" = 25 dólares.

8. **fix_error** — "I'd like to cut my hair." (para o barbeiro)
   **Hint**: Quem corta é o barbeiro; peça "a haircut"
   **Answer**: I'd like a haircut.
   **Explanation**: "I'd like to cut my hair" soa como se você mesmo fosse cortar. Na barbearia: "I'd like a haircut".

9. **fix_error** — "Pretty low in the sides."
   **Hint**: Nos lados usa outra preposição
   **Answer**: Pretty low on the sides.
   **Explanation**: "On the sides", "on the top". Lado e topo são superfícies: "on".

10. **read_answer**
    **Passage**: "Barber: What can I do for you, champ? Igor: I'd like a haircut. Pretty low on the sides, not much on the top. And trim the beard, please."
    **Question**: O que o Igor pediu além do corte? (responda em inglês)
    **Answer**: Trim the beard
    **Explanation**: "And trim the beard, please" = e aparar a barba, por favor.

### 2. Listening/Speaking (5 phrases)

Igorfina fala no estilo do astro do basquete (imitação). Aluno repete; a pronúncia é avaliada.

1. **"Hi! I'd like a haircut, please."** — começar o pedido
2. **"Pretty low on the sides, not much on the top."** — explicar o corte
3. **"Just a trim, please, not too short."** — só aparar
4. **"Can you trim the beard too?"** — barba
5. **"It looks great! How much is it?"** — gostar e pagar

### 3. Role-play

**Cenário**: Na barbearia, o barbeiro é o Igorfina imitando um astro do basquete, que quer te deixar "com corte de campeão". Explique o corte que você quer.
**Tipo**: Live Voice
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_hoops`
**Time budget**: 90s
**Opening line**: "Yo, champ! Sit down. What are we doing today?"

**Sub-objectives** (3 objetivos):

1. **id**: 1
   **label_pt**: "Pedir um corte"
   **label_en**: "Ask for a haircut"
   **hidden_prompt**: "user asks for a haircut: 'I'd like a haircut', 'a haircut, please', 'can I get a haircut?' — must be in English"
   **hint_pt**: "I'd like a haircut."
   **hint_en**: "I'd like a haircut."
   **example_pass**: I'd like a haircut. | A haircut, please. | Can I get a haircut?
   **example_fail**: Cut (bare word) | Quero cortar o cabelo (Portuguese) | I'd like to cut my hair (wrong meaning)

2. **id**: 2
   **label_pt**: "Explicar como quer"
   **label_en**: "Explain the style"
   **hidden_prompt**: "user describes the cut: 'pretty low on the sides, not much on the top', 'short on the sides', 'just a trim' — must be in English"
   **hint_pt**: "Low on the sides, not much on the top."
   **hint_en**: "Low on the sides, not much on the top."
   **example_pass**: Low on the sides, not much on the top. | Short on the sides, please. | Just a trim.
   **example_fail**: Curto dos lados (Portuguese) | Short (too vague) | Whatever (no style)

3. **id**: 3
   **label_pt**: "Perguntar o preço"
   **label_en**: "Ask the price"
   **hidden_prompt**: "user asks the price: 'how much is it?', 'how much?' — must be in English"
   **hint_pt**: "How much is it?"
   **hint_en**: "How much is it?"
   **example_pass**: How much is it? | How much? | How much do I owe you?
   **example_fail**: Quanto é? (Portuguese) | Money (bare word) | OK (no question)

**Closing cue**: Igorfina fecha com "Twenty-five bucks, champ. Championship haircut, you're locked in!" quando obj_3 bater.

**Suggested flow** (referencial, 6 turnos):

1. **Student**: ~"I'd like a haircut."
2. **Igorfina**: "Let's go! How do you want it?"
3. **Student**: ~"Low on the sides, not much on the top."
4. **Igorfina**: "Clean. Done! Look at you, ready for the finals."
5. **Student**: ~"How much is it?"
6. **Igorfina**: "Twenty-five bucks, champ. Championship haircut, you're locked in!"

**Evaluation focus**:
- "I'd like a haircut" e a descrição "on the sides / on the top"
- Perguntar o preço no final

### 4. Guided Chat

**Cenário**: Você marca horário na barbearia pelo chat, e o Igorfina (no personagem do astro do basquete) responde.
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_hoops`
**Intro (em PT)**: "Marque o corte pelo chat com o barbeiro 'astro do basquete'."
**Opening message**: "Yo! Fresh Cuts barbershop. You need a haircut, champ?"

**Sub-objectives** (3 objetivos):

1. **id**: 1
   **label_pt**: "Pedir um horário"
   **label_en**: "Ask for an appointment"
   **hidden_prompt**: "user asks for a time slot: 'can I get a haircut tomorrow?', 'do you have time at five?', 'I'd like a haircut today' — must be in English"
   **hint_pt**: "Can I get a haircut tomorrow?"
   **hint_en**: "Can I get a haircut tomorrow?"
   **example_pass**: Can I get a haircut tomorrow? | Do you have time at five? | I'd like a haircut today.
   **example_fail**: Tomorrow (bare word) | Amanhã tem horário? (Portuguese) | Yes (no request)

2. **id**: 2
   **label_pt**: "Dizer o corte"
   **label_en**: "Describe the cut"
   **hidden_prompt**: "user describes the cut: 'just a trim', 'low on the sides', 'not much on the top' — must be in English"
   **hint_pt**: "Just a trim, please."
   **hint_en**: "Just a trim, please."
   **example_pass**: Just a trim, please. | Low on the sides. | Not much on the top.
   **example_fail**: Só aparar (Portuguese) | Hair (bare word) | Normal (too vague)

3. **id**: 3
   **label_pt**: "Confirmar o horário"
   **label_en**: "Confirm the time"
   **hidden_prompt**: "user confirms: 'perfect, see you at five!', 'OK, see you tomorrow!', 'deal!' — must be in English"
   **hint_pt**: "Perfect, see you at five!"
   **hint_en**: "Perfect, see you at five!"
   **example_pass**: Perfect, see you at five! | OK, see you tomorrow! | Deal!
   **example_fail**: Fechado (Portuguese) | OK? (unclear) | Maybe (no confirmation)

**Closing cue**: Igorfina encerra com "Locked in, champ! Tomorrow at five, championship cut!" quando obj_3 bater.

**Script** (referencial, 6 turnos):

1. **Igorfina**: "Yo! Fresh Cuts barbershop. You need a haircut, champ?"
2. **Student**: "Can I get a haircut tomorrow?"
3. **Igorfina**: "Tomorrow at five. What are we doing?"
4. **Student**: "Just a trim, please."
5. **Igorfina**: "Easy. Five o'clock works?"
6. **Student**: "Perfect, see you at five!"
7. **Igorfina**: "Locked in, champ! Tomorrow at five, championship cut!"

---

## Unit F39 — Dinheiro: How much? 20 bucks

> **Sub-CEFR**: A1 | **Grammar focus**: Preço: How much is it? / It's ... bucks / Keep the change / Can I pay by card? | **Markers**: [qform] [denso] | **Tense**: EXPRESSÕES
> **Real-life context**: Você paga um táxi, compra uma lembrancinha na rua e negocia o troco.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "Excuse me, how _____ is this hat?"
   **Options**: much / many / long
   **Answer**: much
   **Explanation**: Preço: "How much is it?" = quanto custa? Revisão do M02 ("how much money").

2. **multiple_choice** — "It's twenty _____." (gíria para dólares)
   **Options**: bucks / bocks / books
   **Answer**: bucks
   **Explanation**: "Bucks" = dólares na gíria. "Twenty bucks" = vinte dólares. Dica do Igor: você vai ouvir mais "bucks" que "dollars" na rua.

3. **word_bank** — "Here's thirty. Keep the _____."
   **Choices**: change / money / rest / coins
   **Answer**: change
   **Explanation**: "Keep the change" = pode ficar com o troco. Comum com taxista e garçom.

4. **word_bank** — "Can I pay _____ card?"
   **Choices**: by / with of / in / on
   **Answer**: by
   **Explanation**: "Pay by card" = pagar no cartão. Também se ouve "pay with a card".

5. **fill_gap** — "How much _____ it?"
   **Hint**: Verbo "to be" (é)
   **Answer**: is
   **Explanation**: "How much is it?" ou "How much is this?".

6. **fill_gap** — "The taxi is fifteen _____." (dólares, na gíria)
   **Hint**: Gíria para dólares
   **Answer**: bucks
   **Accepts**: dollars
   **Explanation**: "Fifteen bucks" = quinze dólares. "Dollars" também vale.

7. **fill_gap** — "Do you have _____ for a twenty?"
   **Hint**: Troco
   **Answer**: change
   **Explanation**: "Do you have change for a twenty?" = você tem troco para vinte?

8. **fix_error** — "How much costs this?"
   **Hint**: Use "How much is..."
   **Answer**: How much is this?
   **Explanation**: Em inglês a pergunta mais simples é "How much is this?". "How much does this cost?" também está certo.

9. **fix_error** — "Keep the troco."
   **Hint**: Troco em inglês
   **Answer**: Keep the change.
   **Explanation**: "Change" = troco. A frase inteira: "Keep the change".

10. **read_answer**
    **Passage**: "Driver: That's eighteen bucks. Igor: Here's twenty. Keep the change! Driver: Thanks, man! Have a good one."
    **Question**: Quanto foi a corrida? (responda em inglês)
    **Answer**: Eighteen bucks
    **Explanation**: "That's eighteen bucks" = dezoito dólares. O Igor deu vinte e deixou o troco.

### 2. Listening/Speaking (5 phrases)

Igorfina fala (voz do Igor). Aluno repete; a pronúncia é avaliada.

1. **"Excuse me, how much is this hat?"** — perguntar preço
2. **"It's twenty bucks? OK, I'll take it!"** — aceitar o preço
3. **"Here's thirty, keep the change."** — deixar o troco
4. **"Can I pay by card, please?"** — pagar no cartão
5. **"Do you have change for a twenty?"** — pedir troco

### 3. Role-play

**Cenário**: Numa barraquinha de rua em Nova York, o Igorfina vende bonés e camisetas. Pergunte o preço e pague.
**Tipo**: Live Voice
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Time budget**: 90s
**Opening line**: "Hey! New York caps! Best prices on the street!"

**Sub-objectives** (2 objetivos):

1. **id**: 1
   **label_pt**: "Perguntar o preço"
   **label_en**: "Ask the price"
   **hidden_prompt**: "user asks the price: 'how much is this cap?', 'how much is it?', 'how much?' — must be in English"
   **hint_pt**: "How much is this cap?"
   **hint_en**: "How much is this cap?"
   **example_pass**: How much is this cap? | How much is it? | How much for the cap?
   **example_fail**: Quanto custa? (Portuguese) | Cap (bare word) | Expensive (no question)

2. **id**: 2
   **label_pt**: "Pagar e deixar o troco"
   **label_en**: "Pay and keep the change"
   **hidden_prompt**: "user pays and offers change: 'here's twenty, keep the change', 'keep the change' — must be in English"
   **hint_pt**: "Here's twenty, keep the change."
   **hint_en**: "Here's twenty, keep the change."
   **example_pass**: Here's twenty, keep the change. | Keep the change! | Here you go, keep the change.
   **example_fail**: Fica com o troco (Portuguese) | Money (bare word) | OK (no payment)

**Closing cue**: Igorfina fecha com "Thanks, my friend! You look like a real New Yorker now!" quando obj_2 bater.

**Suggested flow** (referencial, 4 turnos):

1. **Student**: ~"How much is this cap?"
2. **Igorfina**: "Eighteen bucks. Special price for you!"
3. **Student**: ~"Here's twenty, keep the change."
4. **Igorfina**: "Thanks, my friend! You look like a real New Yorker now!"

**Evaluation focus**:
- "How much is...?" e entender "bucks"
- "Keep the change"

### 4. Guided Chat

**Cenário**: O Igorfina organiza a vaquinha do jantar do grupo no chat e precisa saber quanto cada um gastou.
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Intro (em PT)**: "Ajude o Igorfina a fechar as contas do jantar. Use bucks e how much."
**Opening message**: "Dinner math time! How much was your taxi?"

**Sub-objectives** (3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer quanto foi o táxi"
   **label_en**: "Say the taxi price"
   **hidden_prompt**: "user states an amount with bucks/dollars: 'it was twenty bucks', 'fifteen dollars' — must be in English"
   **hint_pt**: "It was twenty bucks."
   **hint_en**: "It was twenty bucks."
   **example_pass**: It was twenty bucks. | Fifteen dollars. | About 20 bucks.
   **example_fail**: Vinte (Portuguese) | Money (no amount) | Cheap (no amount)

2. **id**: 2
   **label_pt**: "Perguntar quanto você deve"
   **label_en**: "Ask how much you owe"
   **hidden_prompt**: "user asks how much they owe/pay: 'how much do I owe you?', 'how much is my part?', 'how much do I pay?' — must be in English"
   **hint_pt**: "How much do I owe you?"
   **hint_en**: "How much do I owe you?"
   **example_pass**: How much do I owe you? | How much is my part? | How much do I pay?
   **example_fail**: Quanto eu te devo? (Portuguese) | Pay (bare word) | OK (no question)

3. **id**: 3
   **label_pt**: "Perguntar como pagar"
   **label_en**: "Ask how to pay"
   **hidden_prompt**: "user asks about payment method: 'can I pay by card?', 'can I send it by app?', 'can I pay you later?' — must be in English"
   **hint_pt**: "Can I pay by card?"
   **hint_en**: "Can I pay by card?"
   **example_pass**: Can I pay by card? | Can I send it by app? | Can I pay you later?
   **example_fail**: Posso pagar no cartão? (Portuguese) | Card (bare word) | OK (no question)

**Closing cue**: Igorfina encerra com "Card is fine! Thirty bucks each, dinner math done, ha!" quando obj_3 bater.

**Script** (referencial, 6 turnos):

1. **Igorfina**: "Dinner math time! How much was your taxi?"
2. **Student**: "It was twenty bucks."
3. **Igorfina**: "OK. Dinner was one hundred and twenty for four."
4. **Student**: "How much do I owe you?"
5. **Igorfina**: "Thirty bucks."
6. **Student**: "Can I pay by card?"
7. **Igorfina**: "Card is fine! Thirty bucks each, dinner math done, ha!"

---

## Unit F40 — Pedindo informação: Hi, officer, I'm kind of lost

> **Sub-CEFR**: A1 | **Grammar focus**: Pedir e entender direções: I'm kind of lost / I need to go to... / go straight / turn left / turn right / blocks | **Markers**: [review] [qform] | **Tense**: EXPRESSÕES
> **Real-life context**: Você se perde e pede ajuda a um policial na rua, como no exemplo do curso.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "Hi, officer. I'm _____ of lost."
   **Options**: kind / type / sort to
   **Answer**: kind
   **Explanation**: "I'm kind of lost" = estou meio perdido. Frase do curso: "Hi, officer. I'm kind of lost, I'm from Brazil. I need to go to the museum. Would you help me?".

2. **multiple_choice** — "Go _____ for two blocks."
   **Options**: straight / strait / right on
   **Answer**: straight
   **Explanation**: "Go straight" = siga reto. "Two blocks" = dois quarteirões.

3. **word_bank** — "Then turn _____ on Fifth Avenue."
   **Choices**: left / lefts / leaving / lift
   **Answer**: left
   **Explanation**: "Turn left" = vire à esquerda. "Turn right" = vire à direita.

4. **word_bank** — "The museum is two _____ from here."
   **Choices**: blocks / streets of / squares / blocos
   **Answer**: blocks
   **Explanation**: "Block" = quarteirão. Nos EUA, distância na cidade se mede em blocos: "two blocks from here".

5. **fill_gap** — "I _____ to go to the museum. Would you help me?"
   **Hint**: Preciso
   **Answer**: need
   **Explanation**: "I need to go to..." Revisão do M01.

6. **fill_gap** — "_____ you help me, please?"
   **Hint**: Você ajudaria...? (educado)
   **Answer**: Would
   **Accepts**: Could / Can
   **Explanation**: "Would you help me?" é bem educado, como no curso. "Could" e "Can" também funcionam.

7. **fill_gap** — "Turn _____ at the bank, and it's on your left."
   **Hint**: Direita
   **Answer**: right
   **Explanation**: "Turn right" = vire à direita. "On your left" = do seu lado esquerdo.

8. **fix_error** — "I'm kind lost."
   **Hint**: Falta o "of"
   **Answer**: I'm kind of lost.
   **Explanation**: "Kind of" é o bloco: "meio", "um pouco".

9. **fix_error** — "Go straight two quarters."
   **Hint**: Quarteirão nos EUA é outra palavra
   **Answer**: Go straight two blocks.
   **Explanation**: "Quarter" é um quarto (ou moeda de 25 centavos). Quarteirão é "block".

10. **read_answer**
    **Passage**: "Igor: Hi, officer. I'm kind of lost, I'm from Brazil. I need to go to the museum. Would you help me? Officer: Sure! Go straight two blocks and turn left. It's next to the park."
    **Question**: Depois de seguir dois quarteirões, para que lado o Igor deve virar? (responda em inglês)
    **Answer**: Left
    **Explanation**: "Go straight two blocks and turn left" = siga dois quarteirões e vire à esquerda.

### 2. Listening/Speaking (5 phrases)

Igorfina fala (voz do Igor). Aluno repete; a pronúncia é avaliada.

1. **"Hi, officer. I'm kind of lost."** — começar o pedido de ajuda
2. **"I'm from Brazil. I need to go to the museum."** — explicar a situação
3. **"Would you help me, please?"** — pedir com educação
4. **"Go straight two blocks and turn left."** — entender a direção
5. **"Turn right at the bank? Thank you so much!"** — confirmar e agradecer

### 3. Role-play

**Cenário**: Você se perdeu em Manhattan. O Igorfina faz o papel do policial na esquina. Peça ajuda como no exemplo do curso.
**Tipo**: Live Voice
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Time budget**: 120s
**Opening line**: "Hello there. Can I help you with something?"

**Sub-objectives** (3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer que está perdido"
   **label_en**: "Say you're lost"
   **hidden_prompt**: "user says they are lost: 'I'm kind of lost', 'I'm lost', 'sorry, I'm a little lost' — must be in English"
   **hint_pt**: "Hi, officer. I'm kind of lost."
   **hint_en**: "Hi, officer. I'm kind of lost."
   **example_pass**: Hi, officer. I'm kind of lost. | I'm lost. | Sorry, I'm a little lost.
   **example_fail**: Lost (bare word) | Tô perdido (Portuguese) | Help (bare word)

2. **id**: 2
   **label_pt**: "Dizer para onde precisa ir"
   **label_en**: "Say where you need to go"
   **hidden_prompt**: "user states the destination with need to go: 'I need to go to the museum', 'I need to go to Central Park' — must be in English"
   **hint_pt**: "I need to go to the museum."
   **hint_en**: "I need to go to the museum."
   **example_pass**: I need to go to the museum. | I need to go to Central Park. | I need to get to the station.
   **example_fail**: Museum (bare word) | Preciso ir no museu (Portuguese) | I go museum (incomplete)

3. **id**: 3
   **label_pt**: "Confirmar a direção"
   **label_en**: "Confirm the directions"
   **hidden_prompt**: "user repeats/confirms directions: 'straight two blocks and turn left?', 'so, turn left?', 'go straight and turn left, right?' — must be in English"
   **hint_pt**: "Two blocks and turn left?"
   **hint_en**: "Two blocks and turn left?"
   **example_pass**: Two blocks and turn left? | So I go straight and turn left? | Turn left at the bank, right?
   **example_fail**: Left (bare word) | Esquerda? (Portuguese) | OK (no confirmation)

**Closing cue**: Igorfina fecha com "Exactly! You can't miss it. Enjoy the museum!" quando obj_3 bater.

**Suggested flow** (referencial, 6 turnos):

1. **Student**: ~"Hi, officer. I'm kind of lost."
2. **Igorfina**: "No problem. Where do you need to go?"
3. **Student**: ~"I need to go to the museum."
4. **Igorfina**: "Go straight two blocks and turn left."
5. **Student**: ~"Two blocks and turn left?"
6. **Igorfina**: "Exactly! You can't miss it. Enjoy the museum!"

**Evaluation focus**:
- A frase do curso ("I'm kind of lost... I need to go to...")
- Confirmar a direção repetindo

### 4. Guided Chat

**Cenário**: Um amigo (o Igorfina) vai do hotel até o restaurante e pede, pelo chat, que você explique o caminho.
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Intro (em PT)**: "Agora é você quem dá a direção. Explique o caminho com go straight, turn left e turn right."
**Opening message**: "I'm leaving the hotel now. How do I get to the restaurant?"

**Sub-objectives** (3 objetivos):

1. **id**: 1
   **label_pt**: "Mandar seguir reto"
   **label_en**: "Tell him to go straight"
   **hidden_prompt**: "user gives directions with go straight + distance: 'go straight two blocks', 'go straight for three blocks' — must be in English"
   **hint_pt**: "Go straight two blocks."
   **hint_en**: "Go straight two blocks."
   **example_pass**: Go straight two blocks. | Go straight for three blocks. | Walk straight two blocks.
   **example_fail**: Reto (Portuguese) | Straight (bare word) | Walk (unclear)

2. **id**: 2
   **label_pt**: "Mandar virar"
   **label_en**: "Tell him to turn"
   **hidden_prompt**: "user gives a turn: 'turn right at the bank', 'then turn left' — must be in English"
   **hint_pt**: "Then turn right at the bank."
   **hint_en**: "Then turn right at the bank."
   **example_pass**: Then turn right at the bank. | Turn left on Fifth Avenue. | Turn right.
   **example_fail**: Direita (Portuguese) | Right (bare word) | Go (unclear)

3. **id**: 3
   **label_pt**: "Dizer onde fica"
   **label_en**: "Say where it is"
   **hidden_prompt**: "user says where the restaurant is with a place preposition: 'it's next to the cinema', 'it's on your left' — must be in English"
   **hint_pt**: "It's next to the cinema."
   **hint_en**: "It's next to the cinema."
   **example_pass**: It's next to the cinema. | It's on your left. | It's between the bank and the park.
   **example_fail**: Cinema (bare word) | Do lado do cinema (Portuguese) | There (unclear)

**Closing cue**: Igorfina encerra com "Straight, right, next to the cinema. Easy! See you in ten!" quando obj_3 bater.

**Script** (referencial, 6 turnos):

1. **Igorfina**: "I'm leaving the hotel now. How do I get to the restaurant?"
2. **Student**: "Go straight two blocks."
3. **Igorfina**: "OK, two blocks. Then?"
4. **Student**: "Then turn right at the bank."
5. **Igorfina**: "Got it. And the restaurant?"
6. **Student**: "It's next to the cinema."
7. **Igorfina**: "Straight, right, next to the cinema. Easy! See you in ten!"
