# Module M02 — Meu mundo

> **Level**: Novice (A1)
> **Block**: A1 Block
> **Units**: 5 (N01–N05)
> **Theme**: Informações pessoais expandidas — números, idades, países, nacionalidades, apresentação completa
> **Module goal**: Aluno sai sabendo dizer idade exata, número de telefone/quarto/andar, de que país é, qual é sua nacionalidade, e fazer uma apresentação completa integrando tudo de M01 + M02.
> **Connects to**: M03 (Família e amigos) — depois de saber se apresentar, aprende a falar das pessoas próximas.

## Module chunks introduced (~40)

- one, two, three, four, five (1-5)
- six, seven, eight, nine, ten (6-10)
- eleven, twelve, thirteen, fourteen, fifteen (11-15)
- sixteen, seventeen, eighteen, nineteen, twenty (16-20)
- twenty-five, thirty, forty, fifty, sixty, seventy, eighty, ninety, one hundred
- twenty-one, thirty-five, forty-seven (compounds com hífen)
- I'm + number + years old
- Floor + number / Room + number
- It's + number + dollars
- My number is + digits
- Brazil, Argentina, the United States, Japan, China, France, Germany, Italy, Spain, Mexico, Canada, Australia, Portugal, the UK
- I'm from + country
- Brazilian, American, British, French, German, Italian, Spanish, Japanese, Chinese, Portuguese, Mexican, Argentinian, Australian
- I'm + nationality
- What's your nationality?
- Where are you from? (revisão de M01)

---

## Unit N01 — De 1 a 20

> **Sub-CEFR**: A1 | **Grammar focus**: Numbers 1-20 chunks + ages with "I am"
> **Markers**: —
> **Real-life context**: Você precisa dizer sua idade, número do quarto do hotel, ou andar do prédio.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "How do you spell 5?"
   **Options**: five / fife / fivve
   **Answer**: five
   **Explanation**: O número 5 em inglês é "five". Pronúncia: /faɪv/. Atenção: tem "v", não "f" no final.

2. **multiple_choice** — "I am _____ years old."
   **Options**: ten / tenth / tens
   **Answer**: ten
   **Explanation**: "Ten" (10) é o número cardinal. "Tenth" é "décimo" (ordinal, usado para datas/ranking). Para idade usamos o cardinal.

3. **word_bank** — "Room number _____."
   **Choices**: twelve / twin / twenty / twice
   **Answer**: twelve
   **Explanation**: "Twelve" = 12. "Twin" = gêmeo (não é número). "Twenty" = 20. "Twice" = duas vezes.

4. **word_bank** — "My number is _____."
   **Choices**: seventeen / seventy / seven / sixteen
   **Answer**: seventeen
   **Explanation**: "Seventeen" = 17. "Seventy" = 70. "Seven" = 7. Cuidado com a confusão -teen (17) vs -ty (70) — stress muda.

5. **fill_gap** — "I am _____ years old."
   **Hint**: Número 18 por extenso
   **Answer**: eighteen
   **Explanation**: 18 = "eighteen". Atenção: tem "gh" silencioso (escrito mas não pronunciado).

6. **fill_gap** — "She is _____ years old."
   **Hint**: Número 11 por extenso
   **Answer**: eleven
   **Explanation**: 11 = "eleven". Único formato — não segue o padrão -teen como 13-19.

7. **fill_gap** — "My phone number is _____."
   **Hint**: Número 9 por extenso
   **Answer**: nine
   **Explanation**: 9 = "nine". Som parecido com "none" (nenhum) mas significado totalmente diferente. Pronúncia: /naɪn/.

8. **fix_error** — "I'm tween years old."
   **Hint**: 12 em inglês não segue padrão -teen
   **Answer**: I'm twelve years old.
   **Explanation**: 12 = "twelve", não "tween". "Tween" é gíria para "pré-adolescente" — não é número. Os números 11 e 12 têm formato único.

9. **fix_error** — "She is sixt years old."
   **Hint**: 16 em inglês
   **Answer**: She is sixteen years old.
   **Explanation**: 16 = "sixteen" (six + teen). "Sixt" não existe como palavra independente.

10. **read_answer**
    **Passage**: "Hi! I am Mark. I am fifteen years old. My room is twelve."
    **Question**: How old is Mark? (give a number)
    **Answer**: 15
    **Explanation**: Mark says "I am fifteen years old". Fifteen = 15.

### 2. Listening/Speaking (5 phrases)

Charlotte fala via ElevenLabs (Rachel). Aluno repete; Azure Speech avalia pronúncia.

1. **"I am eighteen years old."** — declarando idade adolescente
2. **"My phone number is five five five."** — soletrando dígitos
3. **"Floor twelve, please."** — pedindo andar no elevador
4. **"Room sixteen."** — referenciando quarto de hotel
5. **"Page nineteen."** — referenciando página de livro

### 3. Role-play

**Cenário**: Charlotte propõe um quiz rápido de números — você diz sua idade e mais um número (andar, quarto, ou favorito).
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 90s
**Opening line**: "Quick number drill! How old are you?"

**Sub-objectives** (M02 gradiente: 2 objetivos):

1. **id**: 1
   **label_pt**: "Dizer sua idade com 'I am + número + years old'"
   **label_en**: "Say your age with 'I am + number + years old'"
   **hidden_prompt**: "user states an age using 'I am' or 'I'm' + a number (any number 1-100) + 'years old' — number can be digit or spelled out"
   **hint_pt**: "I'm twenty years old!"
   **hint_en**: "I'm twenty years old!"

2. **id**: 2
   **label_pt**: "Dizer outro número de contexto (andar, quarto, ou favorito)"
   **label_en**: "Say another number (floor, room, or favorite)"
   **hidden_prompt**: "user states another number with chunks like 'floor + number', 'room + number', 'my favorite number is + number', or 'it's + number' — any number 1-20 counts"
   **hint_pt**: "Floor twelve."
   **hint_en**: "Floor twelve."

**Closing cue**: Charlotte fecha com "Nice! You got the numbers down." quando obj_2 baterem.

**Suggested flow** (referencial, 4 turnos):

1. **Charlotte**: "Quick number drill! How old are you?"
2. **Student**: ~"I'm twenty years old."
3. **Charlotte**: "Nice. And what floor do you live on?"
4. **Student**: ~"Floor twelve."
5. **Charlotte**: "Nice! You got the numbers down."

**Evaluation focus**:
- Aluno usa "I'm + número + years old" pra idade
- Aluno usa outro chunk com número (floor/room/it's)
- Pronúncia clara de números (-teen vs -ty)

### 4. Guided Chat

**Cenário**: Charlotte abre um chat de quiz de números — você pratica três tipos diferentes de número em contexto.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "Quiz rápido de números pelo chat. Charlotte vai puxar três contextos diferentes — idade, andar/quarto, e favorito."
**Opening message**: "Quick quiz — how old are you?"

**Sub-objectives** (M02 gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer sua idade"
   **label_en**: "Say your age"
   **hidden_prompt**: "user states age with 'I'm + number + years old' or just 'I'm + number'"
   **hint_pt**: "I'm twenty years old."
   **hint_en**: "I'm twenty years old."

2. **id**: 2
   **label_pt**: "Dizer um andar ou número de quarto"
   **label_en**: "Say a floor or room number"
   **hidden_prompt**: "user states a floor or room number with 'floor + number', 'room + number', or 'it's floor/room + number'"
   **hint_pt**: "Floor five."
   **hint_en**: "Floor five."

3. **id**: 3
   **label_pt**: "Dizer seu número favorito"
   **label_en**: "Say your favorite number"
   **hidden_prompt**: "user states a favorite number with 'My favorite number is + number' or 'It's + number'"
   **hint_pt**: "My favorite number is seven."
   **hint_en**: "My favorite number is seven."

**Closing cue**: Charlotte encerra com "Awesome — numbers locked in!" quando obj_3 baterem.

**Script** (referencial, 7 turnos):

1. **Charlotte**: "Quick quiz — how old are you?"
2. **Student**: "I'm twenty years old."
3. **Charlotte**: "Nice! What floor do you live on?"
4. **Student**: "Floor five."
5. **Charlotte**: "Cool. What's your favorite number?"
6. **Student**: "My favorite number is seven."
7. **Charlotte**: "Awesome — numbers locked in!"

> N01 chat = LLM puro. Scaffold aparece via hint_pt da objective pendente (1 → 2 → 3).

---

## Unit N02 — De 20 a 100

> **Sub-CEFR**: A1 | **Grammar focus**: Numbers 20-100 com hífen (twenty-five) + ages adultas
> **Markers**: —
> **Real-life context**: Você precisa dizer sua idade adulta, um preço maior, ou uma temperatura.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "_____ minutes left!"
   **Options**: thirty / thirteen / thirsty
   **Answer**: thirty
   **Explanation**: "Thirty" = 30. "Thirteen" = 13. "Thirsty" = com sede (totalmente diferente). Atenção: stress muda — "THIR-teen" vs "THIR-ty".

2. **multiple_choice** — "I am _____ years old."
   **Options**: twenty-five / twenty five / twentyfive
   **Answer**: twenty-five
   **Explanation**: 25 = "twenty-five" (COM hífen). É a forma padrão para números compostos 21-99: dezena-unidade. Sem hífen ou colado é erro.

3. **word_bank** — "She is _____ years old."
   **Choices**: forty / fourty / fortee / forteen
   **Answer**: forty
   **Explanation**: 40 = "forty" — NÃO tem "u" no meio. É um dos números mais erradamente escritos. Cuidado: "four" (4) tem "u", mas "forty" não.

4. **word_bank** — "My grandma is _____."
   **Choices**: ninety / nine / ninetee / ninth
   **Answer**: ninety
   **Explanation**: "Ninety" = 90. "Nine" = 9. "Ninth" = 9º. Para idade idosa: "She is ninety years old".

5. **fill_gap** — "I am _____ years old."
   **Hint**: 35 por extenso
   **Answer**: thirty-five
   **Explanation**: 35 = "thirty-five" (com hífen entre dezena e unidade). Mesma regra: 21=twenty-one, 47=forty-seven, 99=ninety-nine.

6. **fill_gap** — "The temperature is _____ degrees."
   **Hint**: 100 por extenso
   **Answer**: one hundred
   **Explanation**: 100 = "one hundred" ou "a hundred". Para 101-199: "one hundred and one", "one hundred and two", etc.

7. **fill_gap** — "It's _____ dollars."
   **Hint**: 50 por extenso
   **Answer**: fifty
   **Explanation**: 50 = "fifty". Atenção: NÃO é "fivety". Diferente de "fifteen" (15) — fifty é 50.

8. **fix_error** — "I am twenty five years old."
   **Hint**: Falta o hífen no número composto
   **Answer**: I am twenty-five years old.
   **Explanation**: Números compostos 21-99 levam hífen: twenty-one, thirty-five, ninety-nine. Sem hífen é considerado erro de escrita.

9. **fix_error** — "She is fivety years old."
   **Hint**: 50 em inglês
   **Answer**: She is fifty years old.
   **Explanation**: 50 = "fifty", não "fivety". A escrita não segue exatamente o padrão "five + ty" — virou "fifty" por evolução da língua.

10. **read_answer**
    **Passage**: "Tom is twenty-three years old. Mary is fifty. Mike is eighty-five."
    **Question**: How old is Mike? (give a number)
    **Answer**: 85
    **Explanation**: The text says "Mike is eighty-five". 85 = 80 + 5 = eighty-five.

### 2. Listening/Speaking (5 phrases)

1. **"I am twenty-five years old."** — idade adulta padrão
2. **"She is fifty."** — resposta curta de idade
3. **"It's one hundred dollars."** — preço alto
4. **"The temperature is thirty degrees."** — clima
5. **"He is thirty-three."** — idade comum, número composto

### 3. Role-play

**Cenário**: Charlotte simula um quiz de números maiores — você responde com sua idade adulta e algum preço ou temperatura.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 90s
**Opening line**: "Bigger numbers now. How old are you?"

**Sub-objectives** (M02 gradiente: 2 objetivos):

1. **id**: 1
   **label_pt**: "Dizer sua idade com número entre 20 e 100"
   **label_en**: "Say your age (number between 20 and 100)"
   **hidden_prompt**: "user states an age using 'I'm + number + years old' with a number between 20 and 100 (digit or spelled out, with or without hyphen)"
   **hint_pt**: "I'm thirty years old!"
   **hint_en**: "I'm thirty years old!"

2. **id**: 2
   **label_pt**: "Dizer um preço ou temperatura (número grande)"
   **label_en**: "Say a price or temperature (big number)"
   **hidden_prompt**: "user states a price or temperature with 'it's + number + dollars' or 'it's + number + degrees' — number above 20"
   **hint_pt**: "It's fifty dollars."
   **hint_en**: "It's fifty dollars."

**Closing cue**: Charlotte fecha com "Great! Big numbers under control." quando obj_2 baterem.

**Suggested flow** (referencial, 4 turnos):

1. **Charlotte**: "Bigger numbers now. How old are you?"
2. **Student**: ~"I'm thirty years old."
3. **Charlotte**: "Got it. Quick — what's the price of your favorite coffee?"
4. **Student**: ~"It's five dollars." (ou outro número)
5. **Charlotte**: "Great! Big numbers under control."

**Evaluation focus**:
- Aluno usa "I'm + número grande + years old"
- Aluno usa "It's + número + dollars/degrees"
- Pronúncia correta de números compostos (-teen vs -ty)

### 4. Guided Chat

**Cenário**: Charlotte puxa um chat sobre números maiores — idade, preço, temperatura.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "Charlotte abre um chat sobre números maiores. Pratica idade adulta, preço, e temperatura."
**Opening message**: "Numbers chat! How old are you?"

**Sub-objectives** (M02 gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer sua idade"
   **label_en**: "Say your age"
   **hidden_prompt**: "user states age with 'I'm + number + years old' or 'I am + number' — number 20+"
   **hint_pt**: "I'm twenty-five."
   **hint_en**: "I'm twenty-five."

2. **id**: 2
   **label_pt**: "Dizer um preço"
   **label_en**: "Say a price"
   **hidden_prompt**: "user states a price with 'it's + number + dollars' or just 'number + dollars'"
   **hint_pt**: "It's fifty dollars."
   **hint_en**: "It's fifty dollars."

3. **id**: 3
   **label_pt**: "Dizer a temperatura agora"
   **label_en**: "Say the current temperature"
   **hidden_prompt**: "user states a temperature with 'it's + number + degrees' or 'the temperature is + number'"
   **hint_pt**: "It's thirty degrees."
   **hint_en**: "It's thirty degrees."

**Closing cue**: Charlotte encerra com "Numbers mastered. Nice!" quando obj_3 baterem.

**Script** (referencial, 7 turnos):

1. **Charlotte**: "Numbers chat! How old are you?"
2. **Student**: "I'm twenty-five."
3. **Charlotte**: "Cool. What's the price of a coffee where you are?"
4. **Student**: "It's fifty dollars."
5. **Charlotte**: "Nice. And the temperature today?"
6. **Student**: "It's thirty degrees."
7. **Charlotte**: "Numbers mastered. Nice!"

> N02 chat = LLM puro. Scaffold aparece via hint_pt da objective pendente.

---

## Unit N03 — Países do mundo

> **Sub-CEFR**: A1 | **Grammar focus**: Country names + "I'm from + country" + países que levam "the"
> **Markers**: —
> **Real-life context**: Você está numa conferência internacional e troca de onde cada um é.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "I'm from _____."
   **Options**: Brazil / Brazilian / Brazilianish
   **Answer**: Brazil
   **Explanation**: "From" é seguido pelo nome do PAÍS, não da nacionalidade. País = "Brazil". Nacionalidade = "Brazilian" (vem em N04).

2. **multiple_choice** — "She is from _____."
   **Options**: Japan / Japanese / Japaneser
   **Answer**: Japan
   **Explanation**: "From + país" — "She is from Japan". A nacionalidade ("Japanese") usaria "She is Japanese" sem "from".

3. **word_bank** — "He is from the _____."
   **Choices**: United States / America / USA / States
   **Answer**: United States
   **Explanation**: "The United States" leva "the" antes. "USA" também funciona como abreviação. "America" é coloquial. "States" é gíria entre americanos.

4. **word_bank** — "We are from _____."
   **Choices**: Argentina / Argentinian / Argentineous / Argentine
   **Answer**: Argentina
   **Explanation**: País = "Argentina". Nacionalidade = "Argentinian". "Argentine" também existe mas é menos comum em fala cotidiana.

5. **fill_gap** — "I'm from _____."
   **Hint**: País asiático cuja capital é Tokyo
   **Answer**: Japan
   **Explanation**: "Japan" é o país. Nacionalidade: "Japanese". Não confundir — "I'm from Japan" (país) vs "I'm Japanese" (nacionalidade).

6. **fill_gap** — "She is from _____."
   **Hint**: País europeu, capital Paris
   **Answer**: France
   **Explanation**: "France" é o país. Nacionalidade: "French". Capital: Paris. Note que aqui o foco é o país, não a capital.

7. **fill_gap** — "We are from _____."
   **Hint**: País dos cangurus, no hemisfério sul
   **Answer**: Australia
   **Explanation**: "Australia" é o país do canguru. Nacionalidade: "Australian". País grande, ilha-continente.

8. **fix_error** — "I am from the Brazil."
   **Hint**: "Brazil" não leva artigo
   **Answer**: I am from Brazil.
   **Explanation**: A maioria dos países NÃO leva "the" antes. Exceções: the United States, the UK, the Netherlands, the Philippines. Brazil sozinho — "from Brazil".

9. **fix_error** — "He is from Japan country."
   **Hint**: "Country" é desnecessário
   **Answer**: He is from Japan.
   **Explanation**: Não se diz "from Japan country" em inglês — só o nome do país basta. A estrutura é "from + country name", sem repetir "country".

10. **read_answer**
    **Passage**: "Anna is from Italy. Lucas is from Brazil. Maria is from Spain. They are all friends."
    **Question**: Where is Lucas from?
    **Answer**: Brazil
    **Explanation**: The text says "Lucas is from Brazil". Lucas comes from Brazil.

### 2. Listening/Speaking (5 phrases)

1. **"I'm from Brazil."** — chunk de origem mais comum
2. **"She is from Japan."** — terceira pessoa, país sem "the"
3. **"He is from the United States."** — país que leva "the"
4. **"We are from Argentina."** — plural, país sul-americano
5. **"They are from France and Italy."** — múltiplos países

### 3. Role-play

**Cenário**: Charlotte simula um colega numa conferência internacional — vocês trocam rápido de onde cada um é.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 90s
**Opening line**: "Hi! Quick intro — where are you from?"

**Sub-objectives** (M02 gradiente: 2 objetivos):

1. **id**: 1
   **label_pt**: "Dizer de onde você é (país)"
   **label_en**: "Say where you're from (country)"
   **hidden_prompt**: "user states origin with 'I'm from + country name' — any country counts, must be a country (not just a city or 'here')"
   **hint_pt**: "I'm from Brazil!"
   **hint_en**: "I'm from Brazil!"

2. **id**: 2
   **label_pt**: "Perguntar de onde Charlotte é"
   **label_en**: "Ask where Charlotte is from"
   **hidden_prompt**: "user asks Charlotte's origin with 'where are you from', 'and you', 'how about you', or similar"
   **hint_pt**: "Where are you from?"
   **hint_en**: "Where are you from?"

**Closing cue**: Charlotte fecha com "Nice meeting you! Have a great conference." quando obj_2 baterem.

**Suggested flow** (referencial, 4 turnos):

1. **Charlotte**: "Hi! Quick intro — where are you from?"
2. **Student**: ~"I'm from Brazil!"
3. **Charlotte**: "Cool! Nice to meet you."
4. **Student**: ~"Where are you from?"
5. **Charlotte**: "I'm from the United States. Nice meeting you! Have a great conference."

**Evaluation focus**:
- Aluno usa "I'm from + país"
- Aluno devolve a pergunta com "Where are you from?" ou "And you?"
- Pronúncia clara de nomes de países

### 4. Guided Chat

**Cenário**: Charlotte simula um conhecido novo num evento — vocês trocam países e comentam.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "Charlotte simula um conhecido novo no chat. Pratica dizer seu país, perguntar o dela, e comentar."
**Opening message**: "Hey! Where are you from?"

**Sub-objectives** (M02 gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer de onde você é (país)"
   **label_en**: "Say where you're from"
   **hidden_prompt**: "user states origin with 'I'm from + country name'"
   **hint_pt**: "I'm from Brazil."
   **hint_en**: "I'm from Brazil."

2. **id**: 2
   **label_pt**: "Perguntar de onde Charlotte é"
   **label_en**: "Ask Charlotte's origin"
   **hidden_prompt**: "user asks Charlotte where she's from with 'where are you from', 'and you', or similar"
   **hint_pt**: "Where are you from?"
   **hint_en**: "Where are you from?"

3. **id**: 3
   **label_pt**: "Comentar positivamente sobre o país de Charlotte"
   **label_en**: "React positively to Charlotte's country"
   **hidden_prompt**: "user reacts positively to Charlotte's country with 'cool', 'nice', 'I love + country', 'awesome', or similar"
   **hint_pt**: "I love New York!"
   **hint_en**: "I love New York!"

**Closing cue**: Charlotte encerra com "Same! Nice chatting." quando obj_3 baterem.

**Script** (referencial, 7 turnos):

1. **Charlotte**: "Hey! Where are you from?"
2. **Student**: "I'm from Brazil."
3. **Charlotte**: "Cool! I'm from the United States."
4. **Student**: "Where are you from?"
5. **Charlotte**: "I'm from New York."
6. **Student**: "I love New York!"
7. **Charlotte**: "Same! Nice chatting."

> N03 chat = LLM puro. Scaffold aparece via hint_pt da objective pendente.

---

## Unit N04 — Nacionalidades

> **Sub-CEFR**: A1 | **Grammar focus**: Nationality adjectives — "I'm + nationality"
> **Markers**: [denso]
> **Real-life context**: Você precisa explicar sua nacionalidade vs país de origem (confusão típica).

### 1. Grammar (10 exercises)

1. **multiple_choice** — "I am _____."
   **Options**: Brazilian / Brazil / Brazilianian
   **Answer**: Brazilian
   **Explanation**: "Brazilian" é a nacionalidade (adjetivo). "Brazil" é o país. "I am Brazilian" = "Eu sou brasileiro/brasileira". Não confundir com "I am from Brazil" (origem).

2. **multiple_choice** — "She is _____."
   **Options**: American / America / Americaner
   **Answer**: American
   **Explanation**: "American" = americano/a (nacionalidade). "America" = país (EUA). Estrutura: "She is American" (nacionalidade) ou "She is from America" (origem).

3. **word_bank** — "They are _____."
   **Choices**: Japanese / Japan / Japaneser / Japanian
   **Answer**: Japanese
   **Explanation**: "Japanese" funciona como adjetivo E substantivo. "They are Japanese" — gente do Japão. Não muda no plural (não tem "Japaneses").

4. **word_bank** — "He is _____."
   **Choices**: French / France / Frenchian / Franze
   **Answer**: French
   **Explanation**: "French" = francês/francesa (nacionalidade e também o idioma). "France" = França. "He is French" / "He is from France".

5. **fill_gap** — "My friend is _____."
   **Hint**: Nacionalidade de alguém da Itália
   **Answer**: Italian
   **Explanation**: "Italian" = italiano/a. Funciona como nacionalidade e como idioma. "Italy" = país.

6. **fill_gap** — "We are _____."
   **Hint**: Nacionalidade do Brasil
   **Answer**: Brazilian
   **Explanation**: "Brazilian" = brasileiro/a. Estrutura: "We are Brazilian" (nacionalidade) ou "We are from Brazil" (origem).

7. **fill_gap** — "Are you _____?"
   **Hint**: Nacionalidade do Reino Unido (UK)
   **Answer**: British
   **Explanation**: "British" = britânico/a (cobre Inglaterra, Escócia, País de Gales, Irlanda do Norte). "English" é específico da Inglaterra. UK inteiro = "British".

8. **fix_error** — "I am Brazil."
   **Hint**: "I am" pede nacionalidade, não país
   **Answer**: I am Brazilian.
   **Explanation**: "I am" + nacionalidade (Brazilian). "I am from" + país (Brazil). Confundir os dois é o erro mais comum. Você É brasileiro, você É DE Brasil.

9. **fix_error** — "She is Americaner."
   **Hint**: Nacionalidade dos EUA
   **Answer**: She is American.
   **Explanation**: A nacionalidade dos EUA é "American" — não "Americaner" nem "Americanian". Termina em "-an" (igual a Mexican, Canadian, Australian).

10. **read_answer**
    **Passage**: "My new team: John is American. Yuki is Japanese. Sofia is Italian."
    **Question**: What nationality is Sofia?
    **Answer**: Italian
    **Explanation**: The text says "Sofia is Italian". Sofia's nationality is Italian.

### 2. Listening/Speaking (5 phrases)

1. **"I am Brazilian."** — declarando nacionalidade
2. **"She is American."** — terceira pessoa, nacionalidade comum
3. **"They are Japanese."** — plural, "Japanese" não muda
4. **"He is British."** — nacionalidade UK
5. **"We are not Italian. We are Spanish."** — distinguindo nacionalidades

### 3. Role-play

**Cenário**: Charlotte propõe uma simulação rápida — pratica dizer nacionalidade vs país.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 90s
**Opening line**: "Quick practice — what's your nationality?"

**Sub-objectives** (M02 gradiente: 2 objetivos):

1. **id**: 1
   **label_pt**: "Dizer sua nacionalidade"
   **label_en**: "Say your nationality"
   **hidden_prompt**: "user states nationality with 'I'm + nationality adjective' (e.g., 'I'm Brazilian', 'I'm Portuguese', 'I'm American')"
   **hint_pt**: "I'm Brazilian!"
   **hint_en**: "I'm Brazilian!"

2. **id**: 2
   **label_pt**: "Dizer de onde você é (país) — distinguir do anterior"
   **label_en**: "Say where you're from (country)"
   **hidden_prompt**: "user states origin with 'I'm from + country name' — must be country, not nationality (Brazil not Brazilian)"
   **hint_pt**: "I'm from Brazil."
   **hint_en**: "I'm from Brazil."

**Closing cue**: Charlotte fecha com "Nice! You got nationality vs country down." quando obj_2 baterem.

**Suggested flow** (referencial, 4 turnos):

1. **Charlotte**: "Quick practice — what's your nationality?"
2. **Student**: ~"I'm Brazilian!"
3. **Charlotte**: "Got it. And where are you from?"
4. **Student**: ~"I'm from Brazil."
5. **Charlotte**: "Nice! You got nationality vs country down."

**Evaluation focus**:
- Aluno usa adjetivo de nacionalidade ("I'm Brazilian") sem "from"
- Aluno usa nome de país com "from" ("I'm from Brazil")
- Distinção clara entre adjetivo e país

### 4. Guided Chat

**Cenário**: Charlotte simula apresentações num grupo internacional — você trocas nacionalidade, país e pergunta a dela.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "Charlotte simula apresentações num grupo online. Pratica nacionalidade vs país e devolva a pergunta."
**Opening message**: "Quick intro round — what's your nationality?"

**Sub-objectives** (M02 gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer sua nacionalidade"
   **label_en**: "Say your nationality"
   **hidden_prompt**: "user states nationality with 'I'm + nationality adjective'"
   **hint_pt**: "I'm Brazilian."
   **hint_en**: "I'm Brazilian."

2. **id**: 2
   **label_pt**: "Dizer de onde você é (país)"
   **label_en**: "Say where you're from (country)"
   **hidden_prompt**: "user states origin with 'I'm from + country'"
   **hint_pt**: "I'm from Brazil."
   **hint_en**: "I'm from Brazil."

3. **id**: 3
   **label_pt**: "Perguntar a nacionalidade de Charlotte"
   **label_en**: "Ask Charlotte's nationality"
   **hidden_prompt**: "user asks Charlotte's nationality with 'are you + nationality', 'what's your nationality', 'and you', or 'how about you'"
   **hint_pt**: "Are you American?"
   **hint_en**: "Are you American?"

**Closing cue**: Charlotte encerra com "Cool! Great intro round." quando obj_3 baterem.

**Script** (referencial, 7 turnos):

1. **Charlotte**: "Quick intro round — what's your nationality?"
2. **Student**: "I'm Brazilian."
3. **Charlotte**: "Nice! And where are you from?"
4. **Student**: "I'm from Brazil."
5. **Charlotte**: "Got it."
6. **Student**: "Are you American?"
7. **Charlotte**: "Yes, I am. Cool! Great intro round."

> N04 chat = LLM puro. Scaffold aparece via hint_pt da objective pendente.

---

## Unit N05 — Meu cartão de visitas

> **Sub-CEFR**: A1 | **Grammar focus**: Apresentação completa integrada — name + age + origin + nationality
> **Markers**: —
> **Real-life context**: Você está se apresentando completo numa reunião de equipe ou evento profissional.

### 1. Grammar (10 exercises)

1. **multiple_choice** — "I'm _____. I'm from São Paulo, Brazil."
   **Options**: Brazilian / Brazil / Brazilians
   **Answer**: Brazilian
   **Explanation**: Nacionalidade = adjetivo (Brazilian). País = nome próprio (Brazil). Esta frase combina ambos: "I'm Brazilian, I'm from São Paulo, Brazil".

2. **multiple_choice** — "_____ is twenty-five years old."
   **Options**: She / Her / Hers
   **Answer**: She
   **Explanation**: "She" é o sujeito (ela). "Her" é objeto/possessivo. Para construir frase sobre idade: "She is X years old", com "She" como sujeito.

3. **word_bank** — "Hi, _____ Felipe. I'm from Brazil."
   **Choices**: I'm / I am / My / Me
   **Answer**: I'm
   **Explanation**: "I'm" é a contração de "I am" — forma padrão pra se apresentar. "My" é possessivo (My name is...). "Me" é pronome objeto.

4. **word_bank** — "She is thirty years old. She is _____."
   **Choices**: Spanish / Spain / Spainian / Spanishly
   **Answer**: Spanish
   **Explanation**: "Spanish" = nacionalidade espanhola. "Spain" = país. Para "she is + adjetivo de nacionalidade", usa "Spanish".

5. **fill_gap** — "I am twenty-five years _____."
   **Hint**: Palavra que segue a idade
   **Answer**: old
   **Explanation**: "Years old" é a expressão fixa de idade. "I am 25 years old". Não se diz "I am 25 years" sozinho — precisa do "old".

6. **fill_gap** — "He is _____ Argentina. He is Argentinian."
   **Hint**: Preposição de origem (país)
   **Answer**: from
   **Explanation**: "From" indica origem. País após "from": "from Argentina". Nacionalidade direto: "He is Argentinian" (sem "from").

7. **fill_gap** — "_____ name is Felipe."
   **Hint**: Possessivo de primeira pessoa
   **Answer**: My
   **Explanation**: "My" = meu/minha. "My name is Felipe" = "Meu nome é Felipe". É um chunk fixo de apresentação.

8. **fix_error** — "I'm from Brazilian."
   **Hint**: Após "from" vem país, não nacionalidade
   **Answer**: I'm from Brazil.
   **Explanation**: "From + país" (Brazil). "Be + nacionalidade" (Brazilian). Misturar é o erro mais clássico: "from Brazilian" não existe — sempre "from + nome do país".

9. **fix_error** — "She is from the Brazil."
   **Hint**: "Brazil" não leva "the"
   **Answer**: She is from Brazil.
   **Explanation**: A maioria dos países não leva "the" — Brazil, Japan, France, Italy. Exceções poucas: the United States, the UK, the Netherlands, the Philippines.

10. **read_answer**
    **Passage**: "Hello! My name is Ana. I'm twenty-six years old. I'm from São Paulo, Brazil. I'm Brazilian. Nice to meet you!"
    **Question**: What is Ana's nationality?
    **Answer**: Brazilian
    **Explanation**: Ana says "I'm Brazilian". Her nationality is "Brazilian" (the adjective).

### 2. Listening/Speaking (5 phrases)

1. **"Hi, my name is Felipe."** — abertura de apresentação
2. **"I'm twenty-five years old."** — idade
3. **"I'm from São Paulo, Brazil."** — origem (cidade + país)
4. **"I'm Brazilian."** — nacionalidade
5. **"Nice to meet you!"** — fechamento de apresentação

### 3. Role-play

**Cenário**: Charlotte simula um colega numa reunião de equipe — você faz uma apresentação completa.
**Tipo**: Live Voice
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Time budget**: 90s
**Opening line**: "Welcome to the team! Tell me about yourself."

**Sub-objectives** (M02 gradiente: 2 objetivos):

1. **id**: 1
   **label_pt**: "Dizer nome e idade juntos"
   **label_en**: "Say name and age together"
   **hidden_prompt**: "user introduces themselves with both name AND age — uses 'I'm + name' or 'my name is + name' AND 'I'm + number + years old' (or 'I'm + number')"
   **hint_pt**: "I'm Felipe and I'm twenty-five."
   **hint_en**: "I'm Felipe and I'm twenty-five."

2. **id**: 2
   **label_pt**: "Dizer origem e nacionalidade juntas"
   **label_en**: "Say origin and nationality together"
   **hidden_prompt**: "user states origin AND nationality — uses 'I'm from + country' AND 'I'm + nationality adjective'"
   **hint_pt**: "I'm from Brazil. I'm Brazilian."
   **hint_en**: "I'm from Brazil. I'm Brazilian."

**Closing cue**: Charlotte fecha com "Awesome intro. Great to have you on the team!" quando obj_2 baterem.

**Suggested flow** (referencial, 4 turnos):

1. **Charlotte**: "Welcome to the team! Tell me about yourself."
2. **Student**: ~"I'm Felipe and I'm twenty-five."
3. **Charlotte**: "Nice! And where are you from?"
4. **Student**: ~"I'm from Brazil. I'm Brazilian."
5. **Charlotte**: "Awesome intro. Great to have you on the team!"

**Evaluation focus**:
- Aluno combina nome + idade numa única fala
- Aluno combina país + nacionalidade numa única fala
- Distinção mantida: "from + country" e "be + nationality"

### 4. Guided Chat

**Cenário**: Charlotte simula uma apresentação por chat de um pequeno grupo profissional — você faz uma apresentação completa em 3 partes.
**Voiced by**: `charlotte`
**Persona**: Charlotte
**Persona outfit**: `charlotte_casual`
**Intro (em PT)**: "Charlotte simula uma apresentação de equipe pelo chat. Pratica nome+idade, origem+nacionalidade, e um fechamento caloroso."
**Opening message**: "Hi! Welcome to the group — tell us about yourself."

**Sub-objectives** (M02 gradiente: 3 objetivos):

1. **id**: 1
   **label_pt**: "Dizer nome e idade"
   **label_en**: "Say name and age"
   **hidden_prompt**: "user states name AND age in the same or adjacent messages with 'I'm + name' and 'I'm + number + years old'"
   **hint_pt**: "I'm Felipe, twenty-five."
   **hint_en**: "I'm Felipe, twenty-five."

2. **id**: 2
   **label_pt**: "Dizer origem e nacionalidade"
   **label_en**: "Say origin and nationality"
   **hidden_prompt**: "user states origin AND nationality with 'I'm from + country' and 'I'm + nationality'"
   **hint_pt**: "I'm from Brazil, I'm Brazilian."
   **hint_en**: "I'm from Brazil, I'm Brazilian."

3. **id**: 3
   **label_pt**: "Fechar a apresentação com gentileza"
   **label_en**: "Close the intro warmly"
   **hidden_prompt**: "user closes the intro with a warm closing AFTER stating name/origin: 'happy to be here', 'glad to meet you all', 'thanks for the welcome', 'nice to meet you too', or similar. Must come AFTER the name + origin objectives."
   **hint_pt**: "Happy to be here!"
   **hint_en**: "Happy to be here!"

**Closing cue**: Charlotte encerra com "Same here! Welcome to the team." quando obj_3 baterem.

**Script** (referencial, 7 turnos):

1. **Charlotte**: "Hi! Welcome to the group — tell us about yourself."
2. **Student**: "I'm Felipe, twenty-five."
3. **Charlotte**: "Nice! Where are you from?"
4. **Student**: "I'm from Brazil, I'm Brazilian."
5. **Charlotte**: "Cool! Glad to have you."
6. **Student**: "Nice to meet you!"
7. **Charlotte**: "Same here! Welcome to the team."

> N05 chat = LLM puro. Scaffold aparece via hint_pt da objective pendente.

---

## Cross-unit consolidation

Ao terminar M02, o aluno deve usar naturalmente:
- Números 1-100 em chunks (idade, andar, quarto, preço, temperatura)
- Nome de pelo menos 10 países (Brazil, the United States, Japan, France, Italy, Spain, Germany, Argentina, Mexico, the UK)
- Pelo menos 10 nacionalidades (Brazilian, American, Japanese, French, Italian, Spanish, German, Argentinian, Mexican, British)
- Distinção clara: "I'm from + country" vs "I'm + nationality"
- Apresentação completa em 4 partes: nome + idade + país + nacionalidade

Esses chunks expandem a fundação de M01 e preparam o aluno para falar de outras pessoas (família, amigos) em M03.
