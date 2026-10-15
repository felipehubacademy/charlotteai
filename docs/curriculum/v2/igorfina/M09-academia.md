# Module M09 — Academia

> **Level**: Manual do F#did@ (A1)
> **Block**: A1 Block
> **Units**: 5 (F41–F45)
> **Theme**: Treinar na academia em viagem: falar com o personal, séries e repetições, partes do corpo, exercícios e cansaço
> **Module goal**: Aluno sai usando o vocabulário de academia (gym, trainer, diet, meal, weight, sets, reps), as partes do corpo, os nomes dos exercícios e expressões de cansaço, e entende "How tall are you?".
> **Connects to**: M08 (Situações do dia a dia) e M10 (Viagem sem grana).

> Trilha do Igorfina. Os tópicos F42 e F44 são com a imitação do astro do basquete
> (`persona_outfit: igorfina_hoops`). Bodybuilding (o esporte) × bodybuilder (o atleta).
> Pronúncia: "muscle" (MÂ-ssol, o "c" é mudo).

## Module chunks introduced (~40)

- gym / trainer / personal trainer
- bodybuilding (o esporte) / bodybuilder (o atleta)
- diet / meal / protein
- weight / How much do you weigh?
- How tall are you? / I'm 1.75 (one seventy-five).
- lift / lift weights
- three sets of eight reps
- How many reps?
- tired / exhausted
- I'm exhausted!
- muscle (pronúncia)
- biceps / triceps / forearms / abs / chest / back
- shoulders / calves / glutes / lower back
- bench press / squat / row / curl
- shoulder press / lateral raise
- push / pull
- Can I use this machine?
- Are you using this?
- Let's go, one more rep!

---

## Unit F41 — Gym, trainer, diet

> **Sub-CEFR**: A1 | **Grammar focus**: Vocabulário de academia + perguntas pessoais: How tall are you? / How much do you weigh? | **Markers**: [denso] [qform] | **Tense**: PRESENTE · simple
> **Real-life context**: Você se matricula numa academia em Miami e conversa com o personal na primeira aula.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "I go to the _____ every morning."
   **Options**: gym / academy / gymnasium of
   **Answer**: gym
   **Explanation**: Academia de musculação é "gym". "Academy" é outra coisa (escola, instituição). Dica do Igor: nunca diga "I go to the academy" querendo dizer academia.

2. **multiple_choice** — "My _____ says I need to eat more protein."
   **Options**: trainer / train / training
   **Answer**: trainer
   **Explanation**: "Trainer" (ou "personal trainer") é o personal. "Training" é o treino.

3. **word_bank** — "How _____ are you? I'm 1.80."
   **Choices**: tall / high / big / long
   **Answer**: tall
   **Explanation**: Altura de pessoa: "How tall are you?". "High" é para coisas (montanha, prédio).

4. **word_bank** — "He's a _____. He does bodybuilding competitions."
   **Choices**: bodybuilder / bodybuilding / body build / builder body
   **Answer**: bodybuilder
   **Explanation**: "Bodybuilding" é o esporte; "bodybuilder" é o atleta.

5. **fill_gap** — "I'm on a _____. No pizza for me!"
   **Hint**: Dieta
   **Answer**: diet
   **Explanation**: "I'm on a diet" = estou de dieta.

6. **fill_gap** — "I eat five _____ a day."
   **Hint**: Refeições
   **Answer**: meals
   **Explanation**: "Meal" = refeição. "Five meals a day" = cinco refeições por dia.

7. **fill_gap** — "How much do you _____? Around 80 kilos."
   **Hint**: Pesar (verbo)
   **Answer**: weigh
   **Explanation**: "How much do you weigh?" = quanto você pesa? "Weight" (com t) é o peso, o substantivo.

8. **fix_error** — "I go to the academy every day to lift weights."
   **Hint**: Academia de musculação tem outro nome
   **Answer**: I go to the gym every day to lift weights.
   **Explanation**: Para musculação, sempre "gym".

9. **fix_error** — "How high are you?"
   **Hint**: Altura de pessoa usa outra palavra
   **Answer**: How tall are you?
   **Explanation**: "How tall are you?" para pessoas. "How high are you?" soa como outra coisa, ha!

10. **read_answer**
    **Passage**: "Trainer: Welcome to the gym! How tall are you? Igor: I'm 1.78. Trainer: And your diet? Igor: I eat four meals a day, a lot of protein."
    **Question**: Quantas refeições o Igor faz por dia? (responda em inglês)
    **Answer**: Four meals
    **Explanation**: "I eat four meals a day" = como quatro refeições por dia.

### 2. Listening/Speaking (5 phrases)

Igorfina fala (voz do Igor). Aluno repete; a pronúncia é avaliada.

1. **"I go to the gym every morning."** — rotina de treino
2. **"My trainer says I need more protein."** — falar do personal
3. **"How tall are you? I'm one seventy-five."** — altura
4. **"I'm on a diet, no pizza for me!"** — dieta
5. **"I eat five meals a day, my friend."** — refeições

### 3. Role-play

**Cenário**: Primeira aula na academia. O Igorfina é o personal trainer e faz perguntas para montar seu treino.
**Tipo**: Live Voice
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Time budget**: 90s
**Opening line**: "Welcome to the gym! I'm your trainer today. How tall are you?"

**Sub-objectives** (2 objetivos):

1. **id**: 1
   **label_pt**: "Dizer sua altura"
   **label_en**: "Say your height"
   **hidden_prompt**: "user states a height: 'I'm 1.75', 'I'm one seventy-five', 'about five ten' — any number counts — must be in English"
   **hint_pt**: "I'm one seventy-five."
   **hint_en**: "I'm one seventy-five."
   **example_pass**: I'm one seventy-five. | I'm 1.80. | About five foot ten.
   **example_fail**: Tall (no number) | Um e setenta (Portuguese) | Yes (no height)

2. **id**: 2
   **label_pt**: "Falar da sua alimentação"
   **label_en**: "Talk about your diet"
   **hidden_prompt**: "user describes eating with diet/meals: 'I eat three meals a day', 'I'm on a diet', 'I eat a lot of protein' — must be in English"
   **hint_pt**: "I eat three meals a day."
   **hint_en**: "I eat three meals a day."
   **example_pass**: I eat three meals a day. | I'm on a diet. | I eat a lot of protein.
   **example_fail**: Food (bare word) | Como bem (Portuguese) | Yes (no info)

**Closing cue**: Igorfina fecha com "Perfect! Let's build your plan. Ready to lift?" quando obj_2 bater.

**Suggested flow** (referencial, 4 turnos):

1. **Student**: ~"I'm one seventy-five."
2. **Igorfina**: "Great. And your diet? How many meals a day?"
3. **Student**: ~"I eat three meals a day."
4. **Igorfina**: "Perfect! Let's build your plan. Ready to lift?"

**Evaluation focus**:
- "How tall are you?" e números
- Vocabulário de academia (gym, diet, meals)

### 4. Guided Chat

**Cenário**: O Igorfina, seu amigo, quer te levar para a academia do hotel e pergunta da sua rotina pelo chat.
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Intro (em PT)**: "O Igorfina quer treinar com você. Conte sua rotina usando o vocabulário de academia."
**Opening message**: "Gym tomorrow at 7? Do you go to the gym in Brazil?"

**Sub-objectives** (3 objetivos):

1. **id**: 1
   **label_pt**: "Contar sua rotina de academia"
   **label_en**: "Tell your gym routine"
   **hidden_prompt**: "user describes gym habits: 'I go to the gym three times a week', 'yes, I go every day', 'not much' — must be in English"
   **hint_pt**: "I go to the gym three times a week."
   **hint_en**: "I go to the gym three times a week."
   **example_pass**: I go to the gym three times a week. | Yes, every day! | I go sometimes.
   **example_fail**: Academia (Portuguese) | I go to the academy (wrong word) | Yes (no info)

2. **id**: 2
   **label_pt**: "Perguntar se ele tem personal"
   **label_en**: "Ask if he has a trainer"
   **hidden_prompt**: "user asks about a trainer: 'do you have a trainer?', 'do you have a personal trainer?' — must be in English"
   **hint_pt**: "Do you have a trainer?"
   **hint_en**: "Do you have a trainer?"
   **example_pass**: Do you have a trainer? | Do you have a personal trainer? | Who is your trainer?
   **example_fail**: Personal? (bare word) | Tem personal? (Portuguese) | I have (no question)

3. **id**: 3
   **label_pt**: "Topar o treino"
   **label_en**: "Agree to train"
   **hidden_prompt**: "user agrees: 'I'm in!', 'let's go!', 'see you at seven!' — must be in English"
   **hint_pt**: "I'm in! See you at seven."
   **hint_en**: "I'm in! See you at seven."
   **example_pass**: I'm in! See you at seven. | Let's go! | Count me in!
   **example_fail**: Bora (Portuguese) | Maybe (unclear) | Nah (rejection)

**Closing cue**: Igorfina encerra com "Seven a.m., no excuses, ha! Bring water!" quando obj_3 bater.

**Script** (referencial, 6 turnos):

1. **Igorfina**: "Gym tomorrow at 7? Do you go to the gym in Brazil?"
2. **Student**: "I go to the gym three times a week."
3. **Igorfina**: "Nice! I train every day."
4. **Student**: "Do you have a trainer?"
5. **Igorfina**: "Yes, but tomorrow I'm YOUR trainer, ha!"
6. **Student**: "I'm in! See you at seven."
7. **Igorfina**: "Seven a.m., no excuses, ha! Bring water!"

---

## Unit F42 — Three sets of eight reps

> **Sub-CEFR**: A1 | **Grammar focus**: Séries e repetições: sets / reps / How many...? / one more rep | **Markers**: [denso] [qform] | **Tense**: EXPRESSÕES
> **Real-life context**: O Igorfina, imitando um astro do basquete, é seu parceiro de treino e conta as séries com muita energia.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "Do three _____ of eight reps."
   **Options**: sets / series / groups of
   **Answer**: sets
   **Explanation**: "Set" = série. Frase do curso: "three sets of eight reps" = três séries de oito repetições. Nada de "series" aqui.

2. **multiple_choice** — "How many _____? Ten?"
   **Options**: reps / repeats / repetitions of
   **Answer**: reps
   **Explanation**: "Reps" é a forma curta de "repetitions": repetições. "How many reps?" = quantas repetições?

3. **word_bank** — "Come on! One more _____!"
   **Choices**: rep / set of / repeat / time of
   **Answer**: rep
   **Explanation**: "One more rep!" = mais uma! O grito do parceiro de treino.

4. **word_bank** — "I _____ weights four times a week."
   **Choices**: lift / lifts / lifting / up
   **Answer**: lift
   **Explanation**: "Lift weights" = levantar peso, fazer musculação.

5. **fill_gap** — "Let's do four _____ of twelve."
   **Hint**: Séries
   **Answer**: sets
   **Explanation**: "Four sets of twelve" = quatro séries de doze.

6. **fill_gap** — "How _____ sets do we do?"
   **Hint**: Quantas (para coisas contáveis)
   **Answer**: many
   **Explanation**: Sets são contáveis: "How many sets?". Lembra do M02: "how much" para dinheiro, "how many" para o que se conta.

7. **fill_gap** — "Can I _____ this machine?"
   **Hint**: Usar
   **Answer**: use
   **Explanation**: "Can I use this machine?" = posso usar esse aparelho? Pergunta educada na academia.

8. **fix_error** — "Three series of eight repetitions."
   **Hint**: Em inglês de academia, série é outra palavra
   **Answer**: Three sets of eight reps.
   **Explanation**: "Sets" e "reps" são as palavras de academia. "Series" é série de TV.

9. **fix_error** — "How much reps?"
   **Hint**: Reps são contáveis
   **Answer**: How many reps?
   **Explanation**: "Many" com coisas contáveis: reps, sets, days.

10. **read_answer**
    **Passage**: "Igor (as the hoops star): Yo! Three sets of eight reps. Let's go! ... That's six. Come on, champ, two more reps! We locked in!"
    **Question**: Quantas repetições por série o Igor pediu? (responda em inglês)
    **Answer**: Eight reps
    **Explanation**: "Three sets of eight reps": oito repetições em cada uma das três séries.

### 2. Listening/Speaking (5 phrases)

Igorfina fala no estilo do astro do basquete (imitação). Aluno repete; a pronúncia é avaliada.

1. **"Three sets of eight reps, let's go!"** — montar o treino
2. **"How many reps do we do today?"** — perguntar repetições
3. **"Come on, one more rep, you got this!"** — motivar
4. **"Can I use this machine, please?"** — pedir o aparelho
5. **"I lift weights four times a week."** — rotina

### 3. Role-play

**Cenário**: Na academia do hotel, o Igorfina imita um astro do basquete e vira seu parceiro de treino. Combinem as séries e repetições.
**Tipo**: Live Voice
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_hoops`
**Time budget**: 90s
**Opening line**: "Yo, champ! Leg day! You ready to work?"

**Sub-objectives** (2 objetivos):

1. **id**: 1
   **label_pt**: "Perguntar quantas séries"
   **label_en**: "Ask how many sets"
   **hidden_prompt**: "user asks about sets or reps: 'how many sets?', 'how many reps do we do?' — must be in English"
   **hint_pt**: "How many sets do we do?"
   **hint_en**: "How many sets do we do?"
   **example_pass**: How many sets do we do? | How many reps? | How many sets?
   **example_fail**: Sets? (bare word) | Quantas séries? (Portuguese) | How much sets (wrong form)

2. **id**: 2
   **label_pt**: "Confirmar o treino"
   **label_en**: "Confirm the workout"
   **hidden_prompt**: "user repeats or confirms the plan with sets/reps: 'three sets of eight reps, let's go!', 'OK, three sets of eight' — must be in English"
   **hint_pt**: "Three sets of eight reps, let's go!"
   **hint_en**: "Three sets of eight reps, let's go!"
   **example_pass**: Three sets of eight reps, let's go! | OK, three sets of eight. | Let's go, four sets!
   **example_fail**: Três séries (Portuguese) | OK (no plan) | Eight (bare number)

**Closing cue**: Igorfina fecha com "That's championship work ethic! We locked in, let's go!" quando obj_2 bater.

**Suggested flow** (referencial, 4 turnos):

1. **Student**: ~"How many sets do we do?"
2. **Igorfina**: "Three sets of eight reps. Squats first!"
3. **Student**: ~"Three sets of eight reps, let's go!"
4. **Igorfina**: "That's championship work ethic! We locked in, let's go!"

**Evaluation focus**:
- "sets" e "reps" no lugar de "series" e "repetitions"
- "How many...?" com coisas contáveis

### 4. Guided Chat

**Cenário**: O Igorfina (no personagem do astro do basquete) manda pelo chat o treino de amanhã e você ajusta.
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_hoops`
**Intro (em PT)**: "O 'astro do basquete' montou seu treino. Converse com ele sobre séries e repetições."
**Opening message**: "Tomorrow: bench press, five sets of twelve reps. You ready, champ?"

**Sub-objectives** (3 objetivos):

1. **id**: 1
   **label_pt**: "Reagir ao treino puxado"
   **label_en**: "React to the hard workout"
   **hidden_prompt**: "user reacts with surprise/slang: 'no way!', 'for real?', 'that's a lot!' — must be in English"
   **hint_pt**: "No way! That's a lot!"
   **hint_en**: "No way! That's a lot!"
   **example_pass**: No way! That's a lot! | For real? | That's crazy, bro!
   **example_fail**: Muito (Portuguese) | OK (no reaction) | Yes (flat)

2. **id**: 2
   **label_pt**: "Propor menos repetições"
   **label_en**: "Suggest fewer reps"
   **hidden_prompt**: "user suggests a different plan with sets/reps: 'can we do three sets of eight?', 'three sets of ten, please' — must be in English"
   **hint_pt**: "Can we do three sets of eight?"
   **hint_en**: "Can we do three sets of eight?"
   **example_pass**: Can we do three sets of eight? | Three sets of ten, please. | How about four sets of eight?
   **example_fail**: Menos (Portuguese) | Less (too vague) | Eight (bare number)

3. **id**: 3
   **label_pt**: "Topar e motivar"
   **label_en**: "Agree and hype him"
   **hidden_prompt**: "user agrees with energy: 'let's go!', 'we got this!', 'I'm in, let's go!' — must be in English"
   **hint_pt**: "Deal! Let's go!"
   **hint_en**: "Deal! Let's go!"
   **example_pass**: Deal! Let's go! | We got this! | I'm in, let's go!
   **example_fail**: Bora (Portuguese) | OK (flat) | Maybe (unclear)

**Closing cue**: Igorfina encerra com "Three sets of eight, championship style! See you at the gym, champ!" quando obj_3 bater.

**Script** (referencial, 6 turnos):

1. **Igorfina**: "Tomorrow: bench press, five sets of twelve reps. You ready, champ?"
2. **Student**: "No way! That's a lot!"
3. **Igorfina**: "Ha! Too much? What do you want?"
4. **Student**: "Can we do three sets of eight?"
5. **Igorfina**: "OK, OK. Rookie mode. Deal?"
6. **Student**: "Deal! Let's go!"
7. **Igorfina**: "Three sets of eight, championship style! See you at the gym, champ!"

---

## Unit F43 — Partes do corpo: chest, back, abs

> **Sub-CEFR**: A1 | **Grammar focus**: Partes do corpo para treino: biceps, triceps, forearms, abs, chest, back, shoulders, calves, glutes, lower back + "my ... hurts" | **Markers**: [denso] | **Tense**: PRESENTE · simple
> **Real-life context**: Você combina o que vai treinar e explica uma dor para o personal.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "Today is _____ day: bench press and push-ups."
   **Options**: chest / chess / chair
   **Answer**: chest
   **Explanation**: "Chest" = peito. "Chess" é xadrez, ha! Supino (bench press) trabalha o peito.

2. **multiple_choice** — "My _____ hurts. I can't do squats today."
   **Options**: lower back / low back of / down back
   **Answer**: lower back
   **Explanation**: "Lower back" = lombar. "My lower back hurts" = minha lombar está doendo.

3. **word_bank** — "Crunches are for your _____."
   **Choices**: abs / arms / calves / back
   **Answer**: abs
   **Explanation**: "Abs" = abdômen (forma curta de "abdominals"). Abdominais trabalham o "abs".

4. **word_bank** — "Curls work your _____."
   **Choices**: biceps / calves / glutes / chest
   **Answer**: biceps
   **Explanation**: Rosca (curl) trabalha o bíceps. "Biceps" já termina em "s", mesmo sendo um músculo.

5. **fill_gap** — "Calf raises are for your _____."
   **Hint**: Panturrilhas (plural de calf)
   **Answer**: calves
   **Explanation**: "Calf" (uma panturrilha) vira "calves" no plural.

6. **fill_gap** — "Shoulder press works your _____."
   **Hint**: Ombros
   **Answer**: shoulders
   **Explanation**: "Shoulders" = ombros. O nome do exercício já entrega.

7. **fill_gap** — "My _____ hurts after the run." (perna, parte de trás: panturrilha)
   **Hint**: Panturrilha (singular)
   **Answer**: calf
   **Explanation**: "My calf hurts" = minha panturrilha dói. Com "my ... hurts", singular.

8. **fix_error** — "My back of down hurts."
   **Hint**: Lombar é "lower back"
   **Answer**: My lower back hurts.
   **Explanation**: Lombar = "lower back". Tradução palavra por palavra não funciona aqui.

9. **fix_error** — "Today I train my chess."
   **Hint**: Peito é outra palavra (parecida!)
   **Answer**: Today I train my chest.
   **Explanation**: "Chest" (peito) × "chess" (xadrez). Uma letra de diferença, sentido totalmente outro.

10. **read_answer**
    **Passage**: "Trainer: What do you want to train today? Igor: Back and biceps. But my shoulder hurts a little. Trainer: OK, no shoulder press today."
    **Question**: O que dói no Igor? (responda em inglês)
    **Answer**: His shoulder
    **Explanation**: "My shoulder hurts a little" = meu ombro dói um pouco. Por isso nada de shoulder press.

### 2. Listening/Speaking (5 phrases)

Igorfina fala (voz do Igor). Aluno repete; a pronúncia é avaliada.

1. **"Today is chest day, bench press first."** — escolher o treino
2. **"My lower back hurts a little today."** — explicar uma dor
3. **"Curls are great for your biceps."** — exercício e músculo
4. **"I train back and biceps on Monday."** — rotina por músculo
5. **"My muscles are so tired after the gym."** — pronúncia de "muscle"

### 3. Role-play

**Cenário**: O Igorfina é o personal e pergunta o que você quer treinar. Explique e conte uma dor.
**Tipo**: Live Voice
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Time budget**: 90s
**Opening line**: "Good morning! What do you want to train today?"

**Sub-objectives** (2 objetivos):

1. **id**: 1
   **label_pt**: "Dizer o que quer treinar"
   **label_en**: "Say what you want to train"
   **hidden_prompt**: "user names body parts to train: 'chest and triceps', 'I want to train my back', 'legs today' — must be in English"
   **hint_pt**: "Chest and triceps, please."
   **hint_en**: "Chest and triceps, please."
   **example_pass**: Chest and triceps, please. | I want to train my back. | Legs and glutes today.
   **example_fail**: Peito (Portuguese) | Everything (too vague) | Chess (wrong word)

2. **id**: 2
   **label_pt**: "Contar uma dor"
   **label_en**: "Tell a pain"
   **hidden_prompt**: "user says a body part hurts: 'my lower back hurts', 'my shoulder hurts a little' — must be in English"
   **hint_pt**: "My lower back hurts a little."
   **hint_en**: "My lower back hurts a little."
   **example_pass**: My lower back hurts a little. | My shoulder hurts. | My knee hurts today.
   **example_fail**: Dor (Portuguese) | Hurt (bare word) | I'm fine (no pain)

**Closing cue**: Igorfina fecha com "OK! Chest and triceps, nothing for the lower back today. Let's go!" quando obj_2 bater.

**Suggested flow** (referencial, 4 turnos):

1. **Student**: ~"Chest and triceps, please."
2. **Igorfina**: "Great! Anything hurting?"
3. **Student**: ~"My lower back hurts a little."
4. **Igorfina**: "OK! Chest and triceps, nothing for the lower back today. Let's go!"

**Evaluation focus**:
- Nomes das partes do corpo
- "My ... hurts" para explicar dor

### 4. Guided Chat

**Cenário**: Depois do treino, o Igorfina pergunta pelo chat como você está e o que treinou.
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Intro (em PT)**: "Conte ao Igorfina o que treinou e o que está doendo, com as partes do corpo."
**Opening message**: "How was the gym? What did you train?"

**Sub-objectives** (3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer o que treinou"
   **label_en**: "Say what you trained"
   **hidden_prompt**: "user names what they trained: 'I trained back and biceps', 'legs and abs', 'chest day' — must be in English"
   **hint_pt**: "I trained back and biceps."
   **hint_en**: "I trained back and biceps."
   **example_pass**: I trained back and biceps. | Legs and abs. | Chest day!
   **example_fail**: Costas (Portuguese) | Gym (too vague) | Everything (too vague)

2. **id**: 2
   **label_pt**: "Contar o que está doendo"
   **label_en**: "Say what hurts"
   **hidden_prompt**: "user says a body part hurts: 'my arms hurt', 'my calves hurt so much' — must be in English"
   **hint_pt**: "My arms hurt, ha!"
   **hint_en**: "My arms hurt, ha!"
   **example_pass**: My arms hurt, ha! | My calves hurt so much. | My back hurts a little.
   **example_fail**: Tudo dói (Portuguese) | Pain (bare word) | Bad (unclear)

3. **id**: 3
   **label_pt**: "Perguntar o que ele treinou"
   **label_en**: "Ask what he trained"
   **hidden_prompt**: "user asks him: 'what did you train?', 'and you?', 'what about you?' — must be in English"
   **hint_pt**: "What did you train?"
   **hint_en**: "What did you train?"
   **example_pass**: What did you train? | And you? | What about you?
   **example_fail**: E você? (Portuguese) | You? (unclear) | Cool (no question)

**Closing cue**: Igorfina encerra com "Shoulders and abs! Tomorrow we both cry, ha!" quando obj_3 bater.

**Script** (referencial, 6 turnos):

1. **Igorfina**: "How was the gym? What did you train?"
2. **Student**: "I trained back and biceps."
3. **Igorfina**: "Nice! Feeling it?"
4. **Student**: "My arms hurt, ha!"
5. **Igorfina**: "That means it worked!"
6. **Student**: "What did you train?"
7. **Igorfina**: "Shoulders and abs! Tomorrow we both cry, ha!"

---

## Unit F44 — Bench press, squat, push e pull

> **Sub-CEFR**: A1 | **Grammar focus**: Nomes dos exercícios + push / pull + pedir o aparelho: Are you using this? | **Markers**: [denso] [qform] | **Tense**: PRESENTE · continuous
> **Real-life context**: A academia está cheia. Você precisa dividir o aparelho e o Igorfina, imitando o astro do basquete, explica os exercícios.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "_____ you using this bench?"
   **Options**: Are / Do / Is
   **Answer**: Are
   **Explanation**: "Are you using this?" = você está usando isso? A pergunta educada para pedir o aparelho na academia lotada.

2. **multiple_choice** — "A squat works your _____."
   **Options**: legs / arms / chest
   **Answer**: legs
   **Explanation**: "Squat" = agachamento. Trabalha pernas e glúteos.

3. **word_bank** — "Bench _____ is my favorite chest exercise."
   **Choices**: press / push / pull / lift
   **Answer**: press
   **Explanation**: "Bench press" = supino. Um dos exercícios mais famosos da academia.

4. **word_bank** — "Rows are a _____ exercise. You bring the weight to you."
   **Choices**: pull / push / press / squat
   **Answer**: pull
   **Explanation**: "Pull" = puxar. Remada (row) é exercício de puxar. "Push" = empurrar (supino, flexão).

5. **fill_gap** — "Can I work _____ with you?"
   **Hint**: Revezar (work ___)
   **Answer**: in
   **Explanation**: "Can I work in?" = posso revezar com você? Gíria de academia: fazer suas séries no intervalo do outro.

6. **fill_gap** — "Lateral _____ are for your shoulders."
   **Hint**: Elevação (raises)
   **Answer**: raises
   **Explanation**: "Lateral raises" = elevação lateral. Ombros.

7. **fill_gap** — "Push-ups are a _____ exercise."
   **Hint**: Empurrar
   **Answer**: push
   **Explanation**: Flexão empurra o chão: "push". O nome já entrega.

8. **fix_error** — "You are using this bench?"
   **Hint**: Na pergunta, "are" vem antes de "you"
   **Answer**: Are you using this bench?
   **Explanation**: Pergunta com "are": inverte a ordem.

9. **fix_error** — "Squat works my arms."
   **Hint**: Agachamento trabalha outra parte
   **Answer**: Squat works my legs.
   **Explanation**: Squat = pernas (e glúteos). Curl é que trabalha braço.

10. **read_answer**
    **Passage**: "Igor (as the hoops star): Yo, are you using this bench? Guy: Two more sets. Igor: Can I work in? Guy: Sure, go ahead! Igor: That's teamwork, let's go!"
    **Question**: Quantas séries faltavam para o outro rapaz? (responda em inglês)
    **Answer**: Two more sets
    **Explanation**: "Two more sets" = mais duas séries. E ele deixou o Igor revezar ("Sure, go ahead!").

### 2. Listening/Speaking (5 phrases)

Igorfina fala no estilo do astro do basquete (imitação). Aluno repete; a pronúncia é avaliada.

1. **"Excuse me, are you using this bench?"** — pedir o aparelho
2. **"Can I work in with you, bro?"** — revezar
3. **"Squats today, legs and glutes, let's go!"** — exercício do dia
4. **"Rows are a pull, push-ups are a push."** — push e pull
5. **"Bench press is my favorite exercise."** — exercício favorito

### 3. Role-play

**Cenário**: A academia está lotada. O Igorfina (imitando o astro do basquete) está no banco de supino que você quer usar.
**Tipo**: Live Voice
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_hoops`
**Time budget**: 90s
**Opening line**: "Yo! Big day at the gym, huh? Everybody's here!"

**Sub-objectives** (2 objetivos):

1. **id**: 1
   **label_pt**: "Perguntar se ele está usando"
   **label_en**: "Ask if he's using it"
   **hidden_prompt**: "user asks if he is using the equipment: 'are you using this bench?', 'are you using this?' — must be in English"
   **hint_pt**: "Are you using this bench?"
   **hint_en**: "Are you using this bench?"
   **example_pass**: Are you using this bench? | Are you using this? | Excuse me, are you using the bench?
   **example_fail**: Bench? (bare word) | Tá usando? (Portuguese) | You using? (incomplete)

2. **id**: 2
   **label_pt**: "Pedir para revezar"
   **label_en**: "Ask to work in"
   **hidden_prompt**: "user asks to share/alternate: 'can I work in?', 'can I work in with you?', 'can we share?' — must be in English"
   **hint_pt**: "Can I work in with you?"
   **hint_en**: "Can I work in with you?"
   **example_pass**: Can I work in with you? | Can I work in? | Can we share the bench?
   **example_fail**: Revezar (Portuguese) | Share (bare word) | Give me (rude)

**Closing cue**: Igorfina fecha com "Of course, champ! Teamwork makes the dream work. Your set!" quando obj_2 bater.

**Suggested flow** (referencial, 4 turnos):

1. **Student**: ~"Are you using this bench?"
2. **Igorfina**: "Yeah, two more sets. Bench press, chest day!"
3. **Student**: ~"Can I work in with you?"
4. **Igorfina**: "Of course, champ! Teamwork makes the dream work. Your set!"

**Evaluation focus**:
- "Are you using...?" na ordem de pergunta
- Nomes dos exercícios

### 4. Guided Chat

**Cenário**: O Igorfina (no personagem do astro do basquete) monta pelo chat um treino de "push day" e "pull day" com você.
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_hoops`
**Intro (em PT)**: "Monte com o 'astro do basquete' o treino de push e pull, com os nomes dos exercícios."
**Opening message**: "Champ, we split it: push day and pull day. Name a push exercise!"

**Sub-objectives** (3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer um exercício de empurrar"
   **label_en**: "Name a push exercise"
   **hidden_prompt**: "user names a push exercise: 'bench press', 'push-ups', 'shoulder press' — must be in English"
   **hint_pt**: "Bench press!"
   **hint_en**: "Bench press!"
   **example_pass**: Bench press! | Push-ups. | Shoulder press.
   **example_fail**: Supino (Portuguese) | Squat (legs, not an upper-body push) | Row (it's a pull)

2. **id**: 2
   **label_pt**: "Dizer um exercício de puxar"
   **label_en**: "Name a pull exercise"
   **hidden_prompt**: "user names a pull exercise: 'rows', 'pull-ups', 'curls' — must be in English"
   **hint_pt**: "Rows!"
   **hint_en**: "Rows!"
   **example_pass**: Rows! | Pull-ups. | Curls.
   **example_fail**: Remada (Portuguese) | Bench press (it's a push) | Push-ups (it's a push)

3. **id**: 3
   **label_pt**: "Perguntar quantas séries"
   **label_en**: "Ask how many sets"
   **hidden_prompt**: "user asks about sets/reps: 'how many sets?', 'how many reps for each?' — must be in English"
   **hint_pt**: "How many sets?"
   **hint_en**: "How many sets?"
   **example_pass**: How many sets? | How many reps for each? | How many sets of each?
   **example_fail**: Quantas? (Portuguese) | How much sets (wrong form) | Sets (bare word)

**Closing cue**: Igorfina encerra com "Three sets of ten each. Push, pull, championship! Let's go!" quando obj_3 bater.

**Script** (referencial, 6 turnos):

1. **Igorfina**: "Champ, we split it: push day and pull day. Name a push exercise!"
2. **Student**: "Bench press!"
3. **Igorfina**: "That's it! Now a pull exercise."
4. **Student**: "Rows!"
5. **Igorfina**: "Clean! You know the game."
6. **Student**: "How many sets?"
7. **Igorfina**: "Three sets of ten each. Push, pull, championship! Let's go!"

---

## Unit F45 — I'm exhausted! (juntando tudo)

> **Sub-CEFR**: A1 | **Grammar focus**: Cansaço (tired / exhausted) + revisão do módulo | **Markers**: [review] | **Tense**: PRESENTE · PASSADO (chunks)
> **Real-life context**: Depois do treino mais pesado da viagem, você conta como foi e combina o próximo.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "After the gym I'm so _____."
   **Options**: tired / tiring / tire
   **Answer**: tired
   **Explanation**: "Tired" = cansado. "Tiring" é o que cansa: "The workout was tiring".

2. **multiple_choice** — "I'm _____! I can't walk!" (muito, muito cansado)
   **Options**: exhausted / exhausting / exhaust
   **Answer**: exhausted
   **Explanation**: "Exhausted" = exausto, mais forte que "tired".

3. **word_bank** — "We did four _____ of ten."
   **Choices**: sets / reps of / series / groups
   **Answer**: sets
   **Explanation**: "Four sets of ten". Revisão da F42.

4. **word_bank** — "My _____ hurt after the squats."
   **Choices**: legs / arms / chest / shoulders
   **Answer**: legs
   **Explanation**: Squat trabalha perna: "My legs hurt". Revisão da F43 e F44.

5. **fill_gap** — "That workout was so _____. I need a nap!"
   **Hint**: Cansativo (o que cansa)
   **Answer**: tiring
   **Accepts**: exhausting / hard
   **Explanation**: "Tiring" = cansativo. A pessoa fica "tired"; o treino é "tiring".

6. **fill_gap** — "I go to the _____ five days a week."
   **Hint**: Academia
   **Answer**: gym
   **Explanation**: Revisão da F41: academia = "gym".

7. **fill_gap** — "Are you _____ this machine?"
   **Hint**: Usando (use + ing)
   **Answer**: using
   **Explanation**: Revisão da F44: "Are you using this?".

8. **fix_error** — "I'm very tiring after the gym."
   **Hint**: A pessoa fica "cansada", não "cansativa"
   **Answer**: I'm very tired after the gym.
   **Explanation**: "I'm tiring" seria "eu sou cansativo", ha! A pessoa é "tired".

9. **fix_error** — "Three series of eight."
   **Hint**: Na academia é "sets"
   **Answer**: Three sets of eight.
   **Explanation**: "Sets", sempre. Revisão da F42.

10. **read_answer**
    **Passage**: "Igor: Leg day, five sets of squats. I'm exhausted! My legs hurt so much. Tomorrow: chest. Are you in?"
    **Question**: O que o Igor vai treinar amanhã? (responda em inglês)
    **Answer**: Chest
    **Explanation**: "Tomorrow: chest" = amanhã, peito. E hoje ele está "exhausted" depois do treino de pernas.

### 2. Listening/Speaking (5 phrases)

Igorfina fala (voz do Igor). Aluno repete; a pronúncia é avaliada.

1. **"I'm exhausted, that workout was so tiring!"** — muito cansado
2. **"We did four sets of ten squats."** — contar o treino
3. **"My legs hurt so much today, ha!"** — dor depois do treino
4. **"Tomorrow is chest day. Are you in?"** — próximo treino
5. **"My muscles need a rest day, my friend."** — pedir descanso

### 3. Role-play

**Cenário**: Saindo da academia, o Igorfina quer saber como foi e já quer marcar o próximo treino.
**Tipo**: Live Voice
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Time budget**: 120s
**Opening line**: "So? How was the workout?"

**Sub-objectives** (3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer como você está"
   **label_en**: "Say how you feel"
   **hidden_prompt**: "user says they are tired/exhausted: 'I'm exhausted!', 'I'm so tired' — must be in English"
   **hint_pt**: "I'm exhausted!"
   **hint_en**: "I'm exhausted!"
   **example_pass**: I'm exhausted! | I'm so tired. | I'm super tired, ha!
   **example_fail**: Cansado (Portuguese) | I'm tiring (wrong form) | Good (no feeling)

2. **id**: 2
   **label_pt**: "Contar o treino"
   **label_en**: "Tell the workout"
   **hidden_prompt**: "user describes the workout with sets/reps or exercises: 'four sets of squats', 'we did bench press and rows' — must be in English"
   **hint_pt**: "Four sets of ten squats."
   **hint_en**: "Four sets of ten squats."
   **example_pass**: Four sets of ten squats. | We did bench press and rows. | Three sets of eight, leg day.
   **example_fail**: Agachamento (Portuguese) | Gym (too vague) | A lot (no details)

3. **id**: 3
   **label_pt**: "Responder sobre o próximo treino"
   **label_en**: "Answer about the next workout"
   **hidden_prompt**: "user answers with in/out or a plan: 'I'm in!', 'count me in', 'I need a rest day, I'm out' — must be in English"
   **hint_pt**: "I'm in, but after a rest day!"
   **hint_en**: "I'm in, but after a rest day!"
   **example_pass**: I'm in, but after a rest day! | Count me in! | I'm out tomorrow, I need rest.
   **example_fail**: Talvez (Portuguese) | Maybe (unclear) | OK (no answer)

**Closing cue**: Igorfina fecha com "Fair! Rest day, then chest day. You're a machine, my friend!" quando obj_3 bater.

**Suggested flow** (referencial, 6 turnos):

1. **Student**: ~"I'm exhausted!"
2. **Igorfina**: "Ha! What did you do?"
3. **Student**: ~"Four sets of ten squats."
4. **Igorfina**: "Leg day, respect! Chest tomorrow?"
5. **Student**: ~"I'm in, but after a rest day!"
6. **Igorfina**: "Fair! Rest day, then chest day. You're a machine, my friend!"

**Evaluation focus**:
- tired / exhausted (e não "tiring" para a pessoa)
- Revisão de sets, reps e exercícios

### 4. Guided Chat

**Cenário**: Você manda para o Igorfina o resumo da semana de treinos da viagem.
**Voiced by**: `igorfina`
**Persona**: Igorfina
**Persona outfit**: `igorfina_casual`
**Intro (em PT)**: "Conte ao Igorfina a sua semana de academia usando tudo do módulo."
**Opening message**: "One week of gym on vacation! How do you feel?"

**Sub-objectives** (3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer como se sente"
   **label_en**: "Say how you feel"
   **hidden_prompt**: "user describes feeling: 'I'm exhausted but happy', 'tired but strong', 'I feel great' — must be in English"
   **hint_pt**: "I'm exhausted but happy!"
   **hint_en**: "I'm exhausted but happy!"
   **example_pass**: I'm exhausted but happy! | Tired but strong. | I feel great!
   **example_fail**: Cansado (Portuguese) | I'm tiring (wrong form) | OK (flat)

2. **id**: 2
   **label_pt**: "Dizer o treino favorito"
   **label_en**: "Say your favorite workout"
   **hidden_prompt**: "user names a favorite exercise or day: 'bench press is my favorite', 'I love leg day' — must be in English"
   **hint_pt**: "Bench press is my favorite."
   **hint_en**: "Bench press is my favorite."
   **example_pass**: Bench press is my favorite. | I love leg day! | Rows are the best.
   **example_fail**: Supino (Portuguese) | Gym (too vague) | Everything (too vague)

3. **id**: 3
   **label_pt**: "Dizer o que dói"
   **label_en**: "Say what hurts"
   **hidden_prompt**: "user says a body part hurts: 'my shoulders hurt', 'my calves hurt a lot' — must be in English"
   **hint_pt**: "My shoulders hurt a lot, ha!"
   **hint_en**: "My shoulders hurt a lot, ha!"
   **example_pass**: My shoulders hurt a lot, ha! | My calves hurt. | My whole body hurts!
   **example_fail**: Tudo dói (Portuguese) | Pain (bare word) | Bad (unclear)

**Closing cue**: Igorfina encerra com "That's the price of glory! Rest, eat, and back on Monday!" quando obj_3 bater.

**Script** (referencial, 6 turnos):

1. **Igorfina**: "One week of gym on vacation! How do you feel?"
2. **Student**: "I'm exhausted but happy!"
3. **Igorfina**: "Ha! Favorite exercise?"
4. **Student**: "Bench press is my favorite."
5. **Igorfina**: "Classic. Anything hurting?"
6. **Student**: "My shoulders hurt a lot, ha!"
7. **Igorfina**: "That's the price of glory! Rest, eat, and back on Monday!"
