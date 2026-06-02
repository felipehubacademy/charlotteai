# Module M07 — Precise quantifiers

> **Level**: Inter (B1)
> **Block**: B1 Block
> **Units**: 5 (I01–I05)
> **Theme**: Refined quantifiers (a few, a little, plenty of, hardly any, several, most)
> **Module goal**: Student uses precise quantifiers for countable/uncountable nouns.
> **Connects to**: M08 (Relative clauses).

## Module chunks introduced (~20)

- a few (countable, "some") / a little (uncountable)
- few (countable, "almost none") / little (uncountable, "almost none")
- plenty of (lots, no shortage)
- hardly any (almost zero)
- several (3+, countable)
- most + plural / most of + the + plural

---

## Unit I01 — A few or a little?

> **Sub-CEFR**: B1 | **Grammar focus**: a few (countable) vs a little (uncountable)
> **Markers**: [denso]
> **Real-life context**: You quantify your possessions, time, friends.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "I have _____ friends in NYC."
   **Options**: a few / a little / few
   **Answer**: a few
   **Explanation**: "A few + plural countable" = some (positive).

2. **multiple_choice** — "She has _____ time today."
   **Options**: a little / a few / little
   **Answer**: a little
   **Explanation**: "A little + uncountable" = some (positive).

3. **word_bank** — "We need _____ sugar."
   **Choices**: a little / a few / many / a / some little
   **Answer**: a little
   **Explanation**: "Sugar" uncountable → "a little".

4. **word_bank** — "He has _____ books."
   **Choices**: a few / a little / much / a / some few
   **Answer**: a few
   **Explanation**: "Books" countable plural → "a few".

5. **fill_gap** — "I have _____ money on me."
   **Hint**: small amount (uncountable)
   **Answer**: a little
   **Explanation**: "Money" uncountable → "a little".

6. **fill_gap** — "She invited _____ friends."
   **Hint**: small number (countable)
   **Answer**: a few
   **Explanation**: "Friends" countable → "a few".

7. **fill_gap** — "Add _____ salt."
   **Hint**: uncountable
   **Answer**: a little
   **Explanation**: "Salt" uncountable → "a little".

8. **fix_error** — "I have a few money."
   **Hint**: money is uncountable
   **Answer**: I have a little money.
   **Explanation**: "Money" uncountable → "a little".

9. **fix_error** — "She has a little books."
   **Hint**: books is countable plural
   **Answer**: She has a few books.
   **Explanation**: "Books" countable plural → "a few".

10. **read_answer**
    **Passage**: "I have a few friends and a little time. She has a few books and a little patience."
    **Question**: What does the speaker have a little of?
    **Answer**: time
    **Explanation**: The text says "a little time".

### 2. Listening/Speaking (5 phrases)

1. **"I have a few friends in NYC."** — a few countable
2. **"She has a little time today."** — a little uncountable
3. **"We need a little sugar."** — a little
4. **"He has a few books."** — a few
5. **"Add a little salt."** — recipe

### 3. Role-play

**Cenário**: Charlotte asks about your resources — friends, time, money.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 180s
**Opening line**: "How much time and how many friends do you have?"

**Sub-objectives** (3):

1. **id**: 1
   **label_pt**: "Quantidade contável (a few)"
   **label_en**: "Countable quantity"
   **hidden_prompt**: "user uses 'I have a few + plural'"
   **hint_pt**: "I have a few close friends."
   **hint_en**: "I have a few close friends."

2. **id**: 2
   **label_pt**: "Quantidade incontável (a little)"
   **label_en**: "Uncountable quantity"
   **hidden_prompt**: "user uses 'I have a little + uncountable'"
   **hint_pt**: "I have a little time."
   **hint_en**: "I have a little time."

3. **id**: 3
   **label_pt**: "Mais um quantificador"
   **label_en**: "One more quantifier"
   **hidden_prompt**: "user uses a few or a little correctly"
   **hint_pt**: "I have a little money."
   **hint_en**: "I have a little money."

**Closing cue**: Charlotte closes with "Quantities clear!" when obj_3 hits.

**Suggested flow** (6 turns):

1. **Charlotte**: "How much time and how many friends do you have?"
2. **Student**: ~"I have a few close friends."
3. **Charlotte**: "Time?"
4. **Student**: ~"I have a little time."
5. **Charlotte**: "Resources?"
6. **Student**: ~"I have a little money."
7. **Charlotte**: "Quantities clear!"

**Evaluation focus**:
- A few + countable plural
- A little + uncountable
- No mixing

### 4. Guided Chat

**Cenário**: Charlotte asks about your kitchen ingredients.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em EN)**: "Charlotte asks about your kitchen. Practice 'a few/a little'."
**Opening message**: "What do you have in your kitchen right now?"

**Sub-objectives** (3):

1. **id**: 1
   **label_pt**: "Item contável"
   **label_en**: "Countable item"
   **hidden_prompt**: "user uses 'a few + plural noun'"
   **hint_pt**: "I have a few apples."
   **hint_en**: "I have a few apples."

2. **id**: 2
   **label_pt**: "Item incontável"
   **label_en**: "Uncountable item"
   **hidden_prompt**: "user uses 'a little + uncountable'"
   **hint_pt**: "I have a little milk."
   **hint_en**: "I have a little milk."

3. **id**: 3
   **label_pt**: "Perguntar à Charlotte"
   **label_en**: "Ask Charlotte"
   **hidden_prompt**: "user asks Charlotte what she has"
   **hint_pt**: "What do you have?"
   **hint_en**: "What do you have?"

**Closing cue**: Charlotte closes with "Pantry inventory!" when obj_3 hits.

**Script** (7 turns):

1. **Charlotte**: "What do you have in your kitchen right now?"
2. **Student**: "I have a few apples."
3. **Charlotte**: "Drinks?"
4. **Student**: "I have a little milk."
5. **Charlotte**: "Nice."
6. **Student**: "What do you have?"
7. **Charlotte**: "A few eggs and a little bread. Pantry inventory!"

> I01 chat = LLM puro.

---

## Unit I02 — Few vs a few (subtle)

> **Sub-CEFR**: B1 | **Grammar focus**: few/little (almost none) vs a few/a little (some)
> **Markers**: [denso]
> **Real-life context**: You express positive (have some) vs negative (have almost none).

### 1. Grammar (10 exercises)

1. **multiple_choice** — "I have _____ friends — I feel lonely." (negative)
   **Options**: few / a few / many
   **Answer**: few
   **Explanation**: "Few" (without "a") = almost none. Negative meaning.

2. **multiple_choice** — "I have _____ friends — we hang out often." (positive)
   **Options**: a few / few / many
   **Answer**: a few
   **Explanation**: "A few" = some, positive.

3. **word_bank** — "She has _____ patience for nonsense." (very little)
   **Choices**: little / a little / less / a few
   **Answer**: little
   **Explanation**: "Little" (no "a") = almost none. Negative.

4. **word_bank** — "There's _____ hope left." (negative, almost none)
   **Choices**: little / a little / hardly / less
   **Answer**: little
   **Explanation**: "Little hope" — almost no hope.

5. **fill_gap** — "I have _____ money — I can't help." (almost none)
   **Hint**: negative quantifier
   **Answer**: little
   **Explanation**: "Little money" = almost no money.

6. **fill_gap** — "I have _____ time, but I'll help." (some)
   **Hint**: positive quantifier
   **Answer**: a little
   **Explanation**: "A little time" = some time.

7. **fill_gap** — "_____ people came to the party." (very few, negative)
   **Hint**: countable, negative meaning
   **Answer**: Few
   **Explanation**: "Few people" — almost none came.

8. **fix_error** — "I have few friends and I feel happy." (Means almost none — feels off)
   **Hint**: Use "a few" for positive
   **Answer**: I have a few friends and I feel happy.
   **Explanation**: "A few" = positive (some). "Few" = negative.

9. **fix_error** — "She has a little patience for delays." (Means some — but context suggests none)
   **Hint**: For negative meaning, use "little"
   **Answer**: She has little patience for delays.
   **Explanation**: "Little" without "a" = negative (almost none).

10. **read_answer**
    **Passage**: "I have few friends but a few good ones. She has little time but a little energy. We make it work."
    **Question**: How many good friends does the speaker have?
    **Answer**: a few
    **Accepts**: a few good ones
    **Explanation**: The text says "a few good ones".

### 2. Listening/Speaking (5 phrases)

1. **"I have few friends."** — negative few
2. **"I have a few friends."** — positive a few
3. **"She has little patience."** — negative little
4. **"There's little hope."** — negative
5. **"Few people came."** — negative

### 3. Role-play

**Cenário**: Charlotte distinguishes positive vs negative quantities.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 180s
**Opening line**: "Tell me using 'few' for negative and 'a few' for positive."

**Sub-objectives** (3):

1. **id**: 1
   **label_pt**: "Few negativo"
   **label_en**: "Few negative"
   **hidden_prompt**: "user uses 'few + plural' meaning almost none"
   **hint_pt**: "I have few options."
   **hint_en**: "I have few options."

2. **id**: 2
   **label_pt**: "A few positivo"
   **label_en**: "A few positive"
   **hidden_prompt**: "user uses 'a few + plural' meaning some"
   **hint_pt**: "I have a few hobbies."
   **hint_en**: "I have a few hobbies."

3. **id**: 3
   **label_pt**: "Little ou a little"
   **label_en**: "Little or a little"
   **hidden_prompt**: "user uses 'little' or 'a little' with uncountable"
   **hint_pt**: "I have little time."
   **hint_en**: "I have little time."

**Closing cue**: Charlotte closes with "Subtle quantifier!" when obj_3 hits.

**Suggested flow** (6 turns):

1. **Charlotte**: "Tell me using 'few' for negative and 'a few' for positive."
2. **Student**: ~"I have few options."
3. **Charlotte**: "Positive?"
4. **Student**: ~"I have a few hobbies."
5. **Charlotte**: "Time?"
6. **Student**: ~"I have little time."
7. **Charlotte**: "Subtle quantifier!"

**Evaluation focus**:
- Few/little = negative
- A few/a little = positive
- Context awareness

### 4. Guided Chat

**Cenário**: Charlotte chats about life balance.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em EN)**: "Charlotte explores subtle quantifiers."
**Opening message**: "Tell me: little or a little?"

**Sub-objectives** (3):

1. **id**: 1
   **label_pt**: "Algo negativo"
   **label_en**: "Negative"
   **hidden_prompt**: "user uses 'few/little' (negative)"
   **hint_pt**: "I have little patience today."
   **hint_en**: "I have little patience today."

2. **id**: 2
   **label_pt**: "Algo positivo"
   **label_en**: "Positive"
   **hidden_prompt**: "user uses 'a few/a little' (positive)"
   **hint_pt**: "I have a few free hours."
   **hint_en**: "I have a few free hours."

3. **id**: 3
   **label_pt**: "Perguntar à Charlotte"
   **label_en**: "Ask Charlotte"
   **hidden_prompt**: "user asks 'How about you?'"
   **hint_pt**: "How about you?"
   **hint_en**: "How about you?"

**Closing cue**: Charlotte closes with "Glass half full or empty!" when obj_3 hits.

**Script** (7 turns):

1. **Charlotte**: "Tell me: little or a little?"
2. **Student**: "I have little patience today."
3. **Charlotte**: "Rough day."
4. **Student**: "I have a few free hours."
5. **Charlotte**: "Lucky."
6. **Student**: "How about you?"
7. **Charlotte**: "Few naps but a little energy. Glass half full or empty!"

> I02 chat = LLM puro.

---

## Unit I03 — Plenty of, hardly any

> **Sub-CEFR**: B1 | **Grammar focus**: plenty of (lots) vs hardly any (almost zero)
> **Markers**: —
> **Real-life context**: You express abundance or scarcity.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "We have _____ time."
   **Options**: plenty of / hardly any / a few of
   **Answer**: plenty of
   **Explanation**: "Plenty of" = lots, abundance. With both countable and uncountable.

2. **multiple_choice** — "There's _____ food left."
   **Options**: hardly any / plenty of / a few
   **Answer**: hardly any
   **Explanation**: "Hardly any" = almost none. Negative.

3. **word_bank** — "She has _____ friends."
   **Choices**: plenty of / hardly any / a few of / much
   **Answer**: plenty of
   **Explanation**: "Plenty of friends" — lots.

4. **word_bank** — "He has _____ free time."
   **Choices**: hardly any / plenty / many of / much of
   **Answer**: hardly any
   **Explanation**: "Hardly any free time" — almost none.

5. **fill_gap** — "I have _____ books to read this summer."
   **Hint**: lots
   **Answer**: plenty of
   **Explanation**: "Plenty of books" — abundance.

6. **fill_gap** — "There's _____ rain this year."
   **Hint**: almost none
   **Answer**: hardly any
   **Explanation**: "Hardly any rain" — scarcity.

7. **fill_gap** — "We had _____ visitors yesterday."
   **Hint**: very few
   **Answer**: hardly any
   **Explanation**: "Hardly any visitors" — almost no one came.

8. **fix_error** — "I have plenty time."
   **Hint**: needs "of"
   **Answer**: I have plenty of time.
   **Explanation**: "Plenty OF + noun" — "of" required.

9. **fix_error** — "There's hardly anything food."
   **Hint**: "hardly any" alone with noun
   **Answer**: There's hardly any food.
   **Explanation**: "Hardly any + noun" — no extra "thing".

10. **read_answer**
    **Passage**: "We have plenty of food but hardly any drinks. There's plenty of time but hardly any money."
    **Question**: What's scarce?
    **Answer**: drinks and money
    **Accepts**: drinks / money
    **Explanation**: "Hardly any drinks" and "hardly any money" — both scarce.

### 2. Listening/Speaking (5 phrases)

1. **"We have plenty of time."** — plenty of
2. **"There's hardly any food."** — hardly any
3. **"She has plenty of friends."** — plenty of
4. **"He has hardly any free time."** — hardly any
5. **"I have plenty of work."** — plenty of

### 3. Role-play

**Cenário**: Charlotte asks about your resources — abundance vs scarcity.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 180s
**Opening line**: "What do you have plenty of? And hardly any of?"

**Sub-objectives** (3):

1. **id**: 1
   **label_pt**: "Abundância (plenty of)"
   **label_en**: "Abundance"
   **hidden_prompt**: "user uses 'I have plenty of + noun'"
   **hint_pt**: "I have plenty of books."
   **hint_en**: "I have plenty of books."

2. **id**: 2
   **label_pt**: "Escassez (hardly any)"
   **label_en**: "Scarcity"
   **hidden_prompt**: "user uses 'I have hardly any + noun'"
   **hint_pt**: "I have hardly any free time."
   **hint_en**: "I have hardly any free time."

3. **id**: 3
   **label_pt**: "Mais um quantificador"
   **label_en**: "One more"
   **hidden_prompt**: "user uses another plenty of or hardly any"
   **hint_pt**: "We have plenty of work."
   **hint_en**: "We have plenty of work."

**Closing cue**: Charlotte closes with "Balance check!" when obj_3 hits.

**Suggested flow** (6 turns):

1. **Charlotte**: "What do you have plenty of? And hardly any of?"
2. **Student**: ~"I have plenty of books."
3. **Charlotte**: "Scarce?"
4. **Student**: ~"I have hardly any free time."
5. **Charlotte**: "Common."
6. **Student**: ~"We have plenty of work."
7. **Charlotte**: "Balance check!"

**Evaluation focus**:
- Plenty of + noun (with "of")
- Hardly any + noun
- Right context for each

### 4. Guided Chat

**Cenário**: Charlotte chats about resources.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em EN)**: "Charlotte explores resources. Practice plenty of / hardly any."
**Opening message**: "What's in abundance in your life right now?"

**Sub-objectives** (3):

1. **id**: 1
   **label_pt**: "Abundância"
   **label_en**: "Abundance"
   **hidden_prompt**: "user uses 'plenty of'"
   **hint_pt**: "Plenty of work."
   **hint_en**: "Plenty of work."

2. **id**: 2
   **label_pt**: "Escassez"
   **label_en**: "Scarcity"
   **hidden_prompt**: "user uses 'hardly any'"
   **hint_pt**: "Hardly any sleep."
   **hint_en**: "Hardly any sleep."

3. **id**: 3
   **label_pt**: "Perguntar à Charlotte"
   **label_en**: "Ask Charlotte"
   **hidden_prompt**: "user asks 'How about you?'"
   **hint_pt**: "How about you?"
   **hint_en**: "How about you?"

**Closing cue**: Charlotte closes with "Life snapshot!" when obj_3 hits.

**Script** (7 turns):

1. **Charlotte**: "What's in abundance in your life right now?"
2. **Student**: "Plenty of work."
3. **Charlotte**: "Scarce?"
4. **Student**: "Hardly any sleep."
5. **Charlotte**: "Common pairing."
6. **Student**: "How about you?"
7. **Charlotte**: "Plenty of books, hardly any quiet. Life snapshot!"

> I03 chat = LLM puro.

---

## Unit I04 — Several, most

> **Sub-CEFR**: B1 | **Grammar focus**: several (3+) and most (majority)
> **Markers**: —
> **Real-life context**: You quantify with precision — several vs most.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "I have _____ books on this topic."
   **Options**: several / a little / much
   **Answer**: several
   **Explanation**: "Several + countable plural" = more than 2 or 3.

2. **multiple_choice** — "_____ people agree with him."
   **Options**: Most / Several / A little
   **Answer**: Most
   **Explanation**: "Most + plural" = majority.

3. **word_bank** — "She visited _____ countries."
   **Choices**: several / a little / much / hardly any
   **Answer**: several
   **Explanation**: "Several countries" — countable plural.

4. **word_bank** — "_____ of the students passed."
   **Choices**: Most / Several / Few of / Much of
   **Answer**: Most
   **Explanation**: "Most of the + plural" = majority of a specific group.

5. **fill_gap** — "There are _____ ways to do this."
   **Hint**: more than a few (3+)
   **Answer**: several
   **Explanation**: "Several ways" — multiple options.

6. **fill_gap** — "_____ people like coffee."
   **Hint**: majority
   **Answer**: Most
   **Explanation**: "Most people" — general majority.

7. **fill_gap** — "_____ of my friends live abroad."
   **Hint**: majority of specific group
   **Answer**: Most
   **Explanation**: "Most of + the/my + plural".

8. **fix_error** — "I have several time."
   **Hint**: several = countable
   **Answer**: I have plenty of time.
   **Accepts**: a lot of time
   **Explanation**: "Several" only with countable. For uncountable use "plenty of" or "a lot of".

9. **fix_error** — "Most of people like pizza."
   **Hint**: Most + plural (without "of")
   **Answer**: Most people like pizza.
   **Explanation**: "Most + general plural" (no "of"). "Most of the/my/specific" with "of".

10. **read_answer**
    **Passage**: "I have several books on history. Most of my friends like to read. Most people prefer fiction over non-fiction."
    **Question**: What do most people prefer?
    **Answer**: fiction
    **Accepts**: fiction over non-fiction
    **Explanation**: The text says "Most people prefer fiction".

### 2. Listening/Speaking (5 phrases)

1. **"I have several books on this topic."** — several
2. **"Most people agree with him."** — most general
3. **"She visited several countries."** — several
4. **"Most of the students passed."** — most of the
5. **"There are several ways to do this."** — several options

### 3. Role-play

**Cenário**: Charlotte asks about your collections and majorities.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 180s
**Opening line**: "Tell me using 'several' and 'most'."

**Sub-objectives** (3):

1. **id**: 1
   **label_pt**: "Algo com several"
   **label_en**: "Something with several"
   **hidden_prompt**: "user uses 'several + plural'"
   **hint_pt**: "I have several hobbies."
   **hint_en**: "I have several hobbies."

2. **id**: 2
   **label_pt**: "Algo com 'most + plural'"
   **label_en**: "Most + general plural"
   **hidden_prompt**: "user uses 'Most + general plural'"
   **hint_pt**: "Most people drink coffee."
   **hint_en**: "Most people drink coffee."

3. **id**: 3
   **label_pt**: "Algo com 'most of the/my'"
   **label_en**: "Most of the/my"
   **hidden_prompt**: "user uses 'Most of the/my + plural'"
   **hint_pt**: "Most of my friends live in São Paulo."
   **hint_en**: "Most of my friends live in São Paulo."

**Closing cue**: Charlotte closes with "Precise quantities!" when obj_3 hits.

**Suggested flow** (6 turns):

1. **Charlotte**: "Tell me using 'several' and 'most'."
2. **Student**: ~"I have several hobbies."
3. **Charlotte**: "Majority?"
4. **Student**: ~"Most people drink coffee."
5. **Charlotte**: "Specific?"
6. **Student**: ~"Most of my friends live in São Paulo."
7. **Charlotte**: "Precise quantities!"

**Evaluation focus**:
- Several for 3+ countable
- Most + general plural
- Most of the/my + specific

### 4. Guided Chat

**Cenário**: Charlotte chats about preferences in groups.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em EN)**: "Charlotte explores patterns. Practice several / most."
**Opening message**: "What do most of your friends do?"

**Sub-objectives** (3):

1. **id**: 1
   **label_pt**: "Most of my friends"
   **label_en**: "Most of my friends"
   **hidden_prompt**: "user uses 'Most of my friends + verb'"
   **hint_pt**: "Most of my friends work in tech."
   **hint_en**: "Most of my friends work in tech."

2. **id**: 2
   **label_pt**: "Several de algo"
   **label_en**: "Several of something"
   **hidden_prompt**: "user uses 'several + plural'"
   **hint_pt**: "Several of them play soccer."
   **hint_en**: "Several of them play soccer."

3. **id**: 3
   **label_pt**: "Perguntar à Charlotte"
   **label_en**: "Ask Charlotte"
   **hidden_prompt**: "user asks 'How about your friends?'"
   **hint_pt**: "How about yours?"
   **hint_en**: "How about yours?"

**Closing cue**: Charlotte closes with "Group patterns!" when obj_3 hits.

**Script** (7 turns):

1. **Charlotte**: "What do most of your friends do?"
2. **Student**: "Most of my friends work in tech."
3. **Charlotte**: "Common."
4. **Student**: "Several of them play soccer."
5. **Charlotte**: "Cool."
6. **Student**: "How about yours?"
7. **Charlotte**: "Most teach, several travel. Group patterns!"

> I04 chat = LLM puro.

---

## Unit I05 — Quantifiers integrated

> **Sub-CEFR**: B1 | **Grammar focus**: Integration of refined quantifiers
> **Markers**: —
> **Real-life context**: You use different quantifiers in one description.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "I have _____ time today."
   **Options**: a little / a few / plenty of / hardly any
   **Answer**: a little (any of these correct, but a little for "some, small amount")
   **Explanation**: "A little" with uncountable.

2. **multiple_choice** — "She has _____ close friends."
   **Options**: several / a little / much
   **Answer**: several
   **Explanation**: "Several + plural".

3. **word_bank** — "We have _____ work today."
   **Choices**: plenty of / a few / several / many of
   **Answer**: plenty of
   **Explanation**: "Plenty of work" — abundance.

4. **word_bank** — "_____ people enjoy traveling."
   **Choices**: Most / Several of / A few of / Much
   **Answer**: Most
   **Explanation**: "Most people" — general majority.

5. **fill_gap** — "There's _____ food in the fridge."
   **Hint**: small amount
   **Answer**: a little
   **Accepts**: some
   **Explanation**: "A little food" — small positive amount.

6. **fill_gap** — "_____ of my coworkers are friendly."
   **Hint**: majority of specific
   **Answer**: Most
   **Explanation**: "Most of my coworkers".

7. **fill_gap** — "I have _____ patience for delays today."
   **Hint**: negative (almost none)
   **Answer**: little
   **Accepts**: hardly any
   **Explanation**: "Little patience" or "hardly any patience".

8. **fix_error** — "I have a little books."
   **Hint**: books is countable
   **Answer**: I have a few books.
   **Explanation**: Books countable → "a few".

9. **fix_error** — "Most of people like pizza."
   **Hint**: Most + general plural (no "of")
   **Answer**: Most people like pizza.
   **Explanation**: "Most people" (without of the/my).

10. **read_answer**
    **Passage**: "I have a few good friends, several hobbies, plenty of work, but hardly any free time. Most of my time goes to family."
    **Question**: What does the speaker have plenty of?
    **Answer**: work
    **Explanation**: The text says "plenty of work".

### 2. Listening/Speaking (5 phrases)

1. **"I have a little time."** — a little
2. **"She has several friends."** — several
3. **"We have plenty of work."** — plenty of
4. **"Most people enjoy travel."** — most
5. **"I have hardly any patience."** — hardly any

### 3. Role-play

**Cenário**: Charlotte asks for a quantifier-rich description of your life.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 180s
**Opening line**: "Describe your life using different quantifiers."

**Sub-objectives** (3):

1. **id**: 1
   **label_pt**: "Quantificador positivo (a few/a little/plenty of)"
   **label_en**: "Positive quantifier"
   **hidden_prompt**: "user uses a few/a little/plenty of"
   **hint_pt**: "I have plenty of work."
   **hint_en**: "I have plenty of work."

2. **id**: 2
   **label_pt**: "Quantificador negativo (few/little/hardly any)"
   **label_en**: "Negative quantifier"
   **hidden_prompt**: "user uses few/little/hardly any"
   **hint_pt**: "I have hardly any time."
   **hint_en**: "I have hardly any time."

3. **id**: 3
   **label_pt**: "Most ou several"
   **label_en**: "Most or several"
   **hidden_prompt**: "user uses 'most + plural' or 'several + plural'"
   **hint_pt**: "Most of my friends live abroad."
   **hint_en**: "Most of my friends live abroad."

**Closing cue**: Charlotte closes with "Quantifier rich!" when obj_3 hits.

**Suggested flow** (6 turns):

1. **Charlotte**: "Describe your life using different quantifiers."
2. **Student**: ~"I have plenty of work."
3. **Charlotte**: "Scarce?"
4. **Student**: ~"I have hardly any time."
5. **Charlotte**: "Majority?"
6. **Student**: ~"Most of my friends live abroad."
7. **Charlotte**: "Quantifier rich!"

**Evaluation focus**:
- Variety of quantifiers
- Correct countable/uncountable
- Right meaning (positive/negative)

### 4. Guided Chat

**Cenário**: Charlotte invites a quantified comparison of life.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em EN)**: "Charlotte asks for a quantifier mix. Use several types."
**Opening message**: "Use 3 different quantifiers in your reply."

**Sub-objectives** (3):

1. **id**: 1
   **label_pt**: "Primeiro quantificador"
   **label_en**: "First quantifier"
   **hidden_prompt**: "user uses a quantifier (plenty of/a few/several)"
   **hint_pt**: "I have several books."
   **hint_en**: "I have several books."

2. **id**: 2
   **label_pt**: "Segundo quantificador"
   **label_en**: "Second quantifier"
   **hidden_prompt**: "user uses another quantifier"
   **hint_pt**: "Most people are kind."
   **hint_en**: "Most people are kind."

3. **id**: 3
   **label_pt**: "Terceiro quantificador"
   **label_en**: "Third quantifier"
   **hidden_prompt**: "user uses one more quantifier"
   **hint_pt**: "I have hardly any free time."
   **hint_en**: "I have hardly any free time."

**Closing cue**: Charlotte closes with "Quantifier feast!" when obj_3 hits.

**Script** (7 turns):

1. **Charlotte**: "Use 3 different quantifiers in your reply."
2. **Student**: "I have several books."
3. **Charlotte**: "Two more!"
4. **Student**: "Most people are kind."
5. **Charlotte**: "Agreed."
6. **Student**: "I have hardly any free time."
7. **Charlotte**: "Quantifier feast!"

> I05 chat = LLM puro.

---

## Cross-unit consolidation

After M07:
- a few/a little (positive countable/uncountable)
- few/little (negative)
- plenty of (abundance)
- hardly any (scarcity)
- several (3+)
- most + general plural / most of the/my + specific

Next: M08 relative clauses defining.
