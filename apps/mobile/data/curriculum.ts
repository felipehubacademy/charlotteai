// ─────────────────────────────────────────────────────────────────────────────
// Charlotte Learning Curriculum
// Structured trails: Novice (A1/A2) · Inter (B1/B2) · Advanced (C1/C2)
//
// Grammar quota:  Novice 10/topic  |  Inter 10/topic  |  Advanced 5/topic
// Pron quota:     Novice 0/topic   |  Inter 5/topic   |  Advanced 10/topic
//
// Sequence (10-exercise topic): mc mc wb wb fill fill fill fix fix read
// Sequence (5-exercise topic):  mc wb fill fix read
// ─────────────────────────────────────────────────────────────────────────────

export type GrammarExType = 'multiple_choice' | 'word_bank' | 'fill_gap' | 'fix_error' | 'read_answer' | 'word_order' | 'short_write';
export type PronExType    = 'repeat' | 'listen_write' | 'minimal_pairs' | 'sentence_stress';

export interface GrammarEx {
  type:        GrammarExType;
  sentence?:   string;
  passage?:    string;
  question?:   string;
  answer:      string;
  options?:    string[];   // multiple_choice: [correct, wrong1, wrong2]
  choices?:    string[];   // word_bank: [correct, d1, d2, d3]
  hint?:       string;
  explanation: string;
  // word_order
  context_pt?:    string;   // Portuguese context shown to student
  words?:         string[]; // the correct words (component will shuffle them)
  // short_write
  prompt?:        string;   // the writing prompt/instruction
  example_answer?: string;  // model answer shown after submission
}

export interface PronStep {
  type:  PronExType;
  text?: string;
  focus: string;
  // minimal_pairs
  word1?:   string;
  word2?:   string;
  target?:  'word1' | 'word2';  // which word Charlotte plays
  // sentence_stress
  stressed_word?: string;       // the correctly stressed word
}

export interface Topic {
  title:         string;
  grammar:       GrammarEx[];
  pronunciation: PronStep[];
}

export interface Module {
  title:  string;
  topics: Topic[];
}

export type TrailLevel = 'Novice' | 'Inter' | 'Advanced';

// ─────────────────────────────────────────────────────────────────────────────
// NOVICE — A1 / A2  (50 units across 11 modules)
// Grammar: 10 per topic | Pronunciation: 0 per topic
// ─────────────────────────────────────────────────────────────────────────────

const NOVICE_MODULES: Module[] = [
  // ── Module 1 — Survival & Identity ──────────────────────────────────────
  {
    title: 'Survival & Identity',
    topics: [
      {
        title: 'Greetings & survival chunks',
        pronunciation: [],
        grammar: [
          // mc × 2
          { type: 'multiple_choice', sentence: '_____ to meet you!',                       answer: 'Nice',       options: ['Nice', 'Good', 'Happy'],            explanation: '"Nice to meet you" é a saudação padrão em inglês ao conhecer alguém pela primeira vez.' },
          { type: 'multiple_choice', sentence: 'How _____ you today?',                     answer: 'are',        options: ['are', 'is', 'am'],                  explanation: '"How are you?" usa "are" porque o sujeito é "you" (segunda pessoa).' },
          // wb × 2
          { type: 'word_bank', sentence: 'Good _____, everyone!',                          answer: 'morning',    choices: ['morning', 'night', 'noon', 'lunch'], explanation: '"Good morning" é usado como saudação pela manhã.' },
          { type: 'word_bank', sentence: 'See you _____!',                                 answer: 'later',      choices: ['later', 'soon', 'after', 'next'],    explanation: '"See you later" é uma despedida informal muito comum.' },
          // fill × 3
          { type: 'fill_gap', sentence: 'A: How are you? B: I\'m fine, _____.',            answer: 'thank you',  hint: 'Resposta educada após "I\'m fine"',      explanation: '"I\'m fine, thank you" é a resposta educada padrão para "How are you?".' },
          { type: 'fill_gap', sentence: '_____ morning! How are you?',                     answer: 'Good',       hint: 'Saudação da manhã',                     explanation: '"Good morning" é a saudação usada da manhã até o meio-dia.' },
          { type: 'fill_gap', sentence: 'A: Goodbye! B: _____ you later!',                 answer: 'See',        hint: 'Despedida informal comum',              explanation: '"See you later" é uma forma informal de dizer tchau.' },
          // fix × 2
          { type: 'fix_error', sentence: 'Good meet you!',                                 answer: 'Nice to meet you!',     hint: 'Frase padrão ao conhecer alguém', explanation: 'A frase correta é "Nice to meet you!" — "Good meet you" não existe em inglês.' },
          { type: 'fix_error', sentence: 'How you are?',                                   answer: 'How are you?',          hint: 'Ordem do auxiliar nas perguntas', explanation: 'Em perguntas em inglês, o auxiliar vem antes do sujeito: "How are you?"' },
          // read × 1  (simplified for Novice — short dialogue, single-word answer)
          { type: 'read_answer', passage: 'Ana: Good morning! How are you?\nTom: I\'m fine, thank you! And you?\nAna: Great!', question: 'Como Tom está? (em inglês)', answer: 'fine', explanation: 'Tom diz "I\'m fine" — "fine" significa bem/ótimo em inglês.' },
          // word_order × 1
          { type: 'word_order', context_pt: 'Monte a saudação em inglês:', words: ['morning', 'Good', 'you', 'are', 'How'], answer: 'Good morning How are you', explanation: '"Good morning" é bom dia. "How are you?" é como vai você.' },
        ],
      },
      {
        title: 'Subject pronouns + Verb To Be — affirmative',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: '_____ am a student.',                      answer: 'I',          options: ['I', 'He', 'We'],                    explanation: '"Am" é usado apenas com o pronome "I" (eu) — primeira pessoa do singular.' },
          { type: 'multiple_choice', sentence: 'She _____ my teacher.',                    answer: 'is',         options: ['is', 'am', 'are'],                  explanation: '"Is" é usado com a terceira pessoa do singular: he (ele), she (ela), it (isso).' },
          { type: 'word_bank', sentence: 'They _____ from Brazil.',                        answer: 'are',        choices: ['are', 'is', 'am', 'be'],            explanation: '"Are" é usado com sujeitos no plural: they (eles), we (nós), you (você/vocês).' },
          { type: 'word_bank', sentence: 'He _____ a doctor.',                             answer: 'is',         choices: ['is', 'are', 'am', 'be'],            explanation: '"Is" é usado com he (ele), she (ela) e it (isso/ele/ela para coisas).' },
          { type: 'fill_gap', sentence: 'I _____ 25 years old.',                           answer: 'am',         hint: 'Verbo "to be" com "I"',                 explanation: '"Am" é a forma do verbo "to be" usada com "I" (eu).' },
          { type: 'fill_gap', sentence: 'You _____ very kind.',                            answer: 'are',        hint: 'Verbo "to be" com "you"',               explanation: '"Are" é a forma do verbo "to be" usada com "you" (você).' },
          { type: 'fill_gap', sentence: 'We _____ friends.',                               answer: 'are',        hint: 'Verbo "to be" com "we"',                explanation: '"Are" é usado com "we" (nós), "you" (vocês) e "they" (eles).' },
          { type: 'fix_error', sentence: 'He am a student.',                               answer: 'He is a student.',              hint: '"He" usa "is", não "am"',       explanation: '"He" (ele) exige "is", não "am". Somente "I" usa "am".' },
          { type: 'fix_error', sentence: 'They is from Japan.',                            answer: 'They are from Japan.',          hint: '"They" usa "are", não "is"',    explanation: '"They" (eles) exige "are", não "is".' },
          { type: 'read_answer', passage: 'My name is Sofia. I am 22. My brother is Carlos. He is 25.', question: 'Quantos anos tem Carlos? (número)', answer: '25', explanation: 'O texto diz "He is 25" — Carlos tem 25 anos.' },
        ],
      },
      {
        title: 'Verb To Be — negative & short answers',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'I _____ tired today.',                     answer: "am not",     options: ["am not", "is not", "are not"],       explanation: '"Am not" é a forma negativa do verbo "to be" com "I". Não existe "amn\'t" em inglês.' },
          { type: 'multiple_choice', sentence: 'A: Are you hungry? B: No, I ___.',         answer: "am not",     options: ["am not", "isn't", "aren't"],         explanation: 'Resposta negativa curta para "Are you...?" é "No, I\'m not" ou "No, I am not".' },
          { type: 'word_bank', sentence: 'She _____ at home right now.',                   answer: "isn't",      choices: ["isn't", "aren't", "am not", "not is"], explanation: '"Isn\'t" = "is not" — usado na negativa com he/she/it.' },
          { type: 'word_bank', sentence: 'We _____ ready yet.',                            answer: "aren't",     choices: ["aren't", "isn't", "am not", "not are"], explanation: '"Aren\'t" = "are not" — usado na negativa com we/you/they.' },
          { type: 'fill_gap', sentence: 'He _____ (not) happy about the result.',          answer: "isn't",      hint: 'Negativa contraída com he',              explanation: '"Isn\'t" é a forma contraída de "is not", usada com he/she/it.' },
          { type: 'fill_gap', sentence: 'A: Is she a nurse? B: No, she ___.',              answer: "isn't",      hint: 'Resposta negativa curta para "Is she?"', explanation: 'Resposta negativa curta: "No, she isn\'t" (ou "No, she\'s not").' },
          { type: 'fill_gap', sentence: 'They _____ (not) from the United States.',        answer: "aren't",     hint: 'Negativa contraída com they',            explanation: '"Aren\'t" = "are not" — para negativas com we/you/they.' },
          { type: 'fix_error', sentence: 'I amn\'t a teacher.',                            answer: "I'm not a teacher.",            hint: 'Não existe "amn\'t" em inglês',  explanation: 'Não existe "amn\'t" em inglês. A negativa correta é "I\'m not" ou "I am not".' },
          { type: 'fix_error', sentence: 'She not is my sister.',                          answer: "She isn't my sister.",          hint: 'Ordem do "not" na negativa',     explanation: 'Na negativa, "not" vem após o verbo "to be": "She is not" → "She isn\'t".' },
          { type: 'read_answer', passage: 'Marco is Italian but he isn\'t from Rome. He\'s from Milan. His parents are in Canada now.', question: 'Marco é de Roma? (yes/no)', answer: 'no', explanation: 'O texto diz "he isn\'t from Rome" — Marco não é de Roma.' },
        ],
      },
      {
        title: 'Verb To Be — questions',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: '_____ she your sister?',                   answer: 'Is',         options: ['Is', 'Are', 'Am'],                  explanation: 'Perguntas com he/she/it usam "Is" no início: "Is she...?"' },
          { type: 'multiple_choice', sentence: '_____ you from Brazil?',                   answer: 'Are',        options: ['Are', 'Is', 'Am'],                  explanation: 'Perguntas com you/we/they usam "Are": "Are you...?"' },
          { type: 'word_bank', sentence: '_____ they students?',                           answer: 'Are',        choices: ['Are', 'Is', 'Am', 'Be'],            explanation: '"Are" é usado em perguntas com "they" (eles).' },
          { type: 'word_bank', sentence: '_____ he at work today?',                        answer: 'Is',         choices: ['Is', 'Are', 'Am', 'Be'],            explanation: '"Is" é usado em perguntas com "he" (ele).' },
          { type: 'fill_gap', sentence: '_____ I late for the meeting?',                   answer: 'Am',         hint: 'Pergunta com "I"',                      explanation: '"Am" é usado em perguntas com "I": "Am I late?"' },
          { type: 'fill_gap', sentence: '_____ you ready to start?',                       answer: 'Are',        hint: 'Pergunta com "you"',                    explanation: '"Are" é usado em perguntas com "you" (você).' },
          { type: 'fill_gap', sentence: 'A: _____ she a doctor? B: Yes, she is.',          answer: 'Is',         hint: 'Pergunta com "she"',                    explanation: '"Is" inicia perguntas sim/não com she/he/it.' },
          { type: 'fix_error', sentence: 'Are she your teacher?',                          answer: 'Is she your teacher?',          hint: '"She" usa "is", não "are"',     explanation: '"She" (ela) exige "Is" em perguntas, não "Are".' },
          { type: 'fix_error', sentence: 'Is you happy?',                                  answer: 'Are you happy?',               hint: '"You" usa "are", não "is"',     explanation: '"You" (você) exige "Are" em perguntas, não "Is".' },
          { type: 'read_answer', passage: 'A: Is this your bag? B: No, it isn\'t. A: Are these your keys? B: Yes, they are!', question: 'As chaves são dela? (yes/no)', answer: 'yes', explanation: 'Ela responde "Yes, they are!" — as chaves são dela.' },
        ],
      },
    ],
  },

  // ── Module 2 — Nouns, Articles & Pronouns ───────────────────────────────
  {
    title: 'Nouns, Articles & Pronouns',
    topics: [
      // ── Topic 1 — Nouns: singular & plural ──────────────────────────────
      {
        title: 'Nouns — singular & plural + spelling rules',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'I have two _____ at home.',                         answer: 'cats',      options: ['cats', 'cates', 'caties'],             explanation: 'A maioria dos substantivos forma o plural adicionando -s: cat → cats.' },
          { type: 'multiple_choice', sentence: 'She put the books in three _____ .',                answer: 'boxes',     options: ['boxes', 'boxs', 'boxies'],             explanation: 'Substantivos terminados em -x formam o plural com -es: box → boxes.' },
          { type: 'word_bank',       sentence: 'The _____ are playing in the park.',                answer: 'children',  choices: ['children', 'childs', 'childrens', 'peoples'], explanation: '"Children" é o plural irregular de "child" (criança).' },
          { type: 'word_bank',       sentence: 'There are five _____ in our class.',                answer: 'women',     choices: ['women', 'womans', 'wifes', 'womens'],  explanation: '"Women" é o plural irregular de "woman". Não se usa "womans".' },
          { type: 'fill_gap',        sentence: 'He has three _____ (brother).',                     answer: 'brothers',  hint: 'Plural regular — adicione -s',             explanation: 'Substantivos regulares formam o plural com -s: brother → brothers.' },
          { type: 'fill_gap',        sentence: 'We saw two _____ (fox) in the garden.',             answer: 'foxes',     hint: 'Termina em -x → adicione -es',             explanation: 'Substantivos terminados em -x, -sh, -ch formam o plural com -es: fox → foxes.' },
          { type: 'fill_gap',        sentence: 'There are many _____ (city) in Brazil.',            answer: 'cities',    hint: 'Consoante + y → troque y por i e adicione -es', explanation: 'Quando o substantivo termina em consoante + y, o plural é: -ies. city → cities.' },
          { type: 'fix_error',       sentence: 'I bought three book at the store.',                 answer: 'I bought three books at the store.',    hint: 'Plural de "book"',           explanation: '"Three" indica plural — use "books", não "book".' },
          { type: 'fix_error',       sentence: 'There are two mans in the office.',                 answer: 'There are two men in the office.',      hint: 'Plural irregular de "man"',  explanation: 'O plural de "man" é "men", não "mans".' },
          { type: 'read_answer',     passage: 'Maria has a big family. She has two brothers and three sisters. Her mother is a doctor and her father is a teacher. They have a dog and two cats at home.', question: 'How many pets does Maria\'s family have?', answer: 'three', explanation: 'A família tem 1 cachorro e 2 gatos — três animais de estimação no total.' },
        ],
      },

      // ── Topic 2 — Articles: a / an / the ────────────────────────────────
      {
        title: 'Articles — a / an / the',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'She is _____ engineer.',                            answer: 'an',        options: ['an', 'a', 'the'],                      explanation: 'Use "an" antes de palavras que começam com som de vogal: an engineer.' },
          { type: 'multiple_choice', sentence: 'I saw _____ film last night. _____ film was great!', answer: 'a / The',  options: ['a / The', 'the / A', 'a / A'],         explanation: 'Primeira menção: "a film". Segunda menção (já conhecido): "The film".' },
          { type: 'word_bank',       sentence: 'Can you pass me _____ salt, please?',              answer: 'the',       choices: ['the', 'a', 'an', 'some'],              explanation: 'Usamos "the" quando o objeto é específico e conhecido pelos dois — há só um saleiro na mesa.' },
          { type: 'word_bank',       sentence: 'He wants to be _____ doctor one day.',             answer: 'a',         choices: ['a', 'an', 'the', '—'],                 explanation: 'Use "a" antes de profissões que começam com som de consoante: a doctor.' },
          { type: 'fill_gap',        sentence: 'I have _____ idea!',                               answer: 'an',        hint: '"Idea" começa com som de vogal',            explanation: '"Idea" começa com som de vogal /aɪ/, então usamos "an": an idea.' },
          { type: 'fill_gap',        sentence: 'She lives on _____ second floor.',                 answer: 'the',       hint: 'Andar específico de um prédio',             explanation: 'Usamos "the" com posições específicas: the second floor, the first row.' },
          { type: 'fill_gap',        sentence: 'I play _____ tennis every Saturday.',              answer: '',          hint: 'Esportes não usam artigo em inglês',       explanation: 'Em inglês, esportes não usam artigo: I play tennis (não "the tennis").' },
          { type: 'fix_error',       sentence: 'She is a best student in the class.',              answer: 'She is the best student in the class.', hint: 'Superlativo usa "the"', explanation: 'Com superlativos (best, worst, tallest), sempre use "the".' },
          { type: 'fix_error',       sentence: 'I had an breakfast this morning.',                 answer: 'I had breakfast this morning.',          hint: 'Refeições não usam artigo', explanation: 'Refeições (breakfast, lunch, dinner) não usam artigo em inglês.' },
          { type: 'read_answer',     passage: 'Jake has a dog and a cat. The dog is called Rex and the cat is called Luna. He takes the dog for a walk every morning before breakfast.', question: 'What is the dog\'s name?', answer: 'Rex', explanation: 'O texto diz: "The dog is called Rex."' },
        ],
      },

      // ── Topic 3 — Demonstratives ─────────────────────────────────────────
      {
        title: 'Demonstratives (this, that, these, those)',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: '_____ book here is really interesting.',            answer: 'This',      options: ['This', 'That', 'These'],               explanation: '"This" refere-se a algo singular e próximo (aqui perto de você).' },
          { type: 'multiple_choice', sentence: '_____ shoes over there are too expensive.',         answer: 'Those',     options: ['Those', 'These', 'That'],              explanation: '"Those" refere-se a algo plural e distante (longe de você).' },
          { type: 'word_bank',       sentence: '_____ is my friend Ana.',                           answer: 'This',      choices: ['This', 'These', 'That', 'Those'],      explanation: '"This is..." é usado para apresentar alguém que está do seu lado.' },
          { type: 'word_bank',       sentence: 'Look at _____ clouds! It\'s going to rain.',       answer: 'those',     choices: ['those', 'these', 'that', 'this'],      explanation: '"Those" é usado para coisas plurais e distantes — nuvens no céu, longe.' },
          { type: 'fill_gap',        sentence: '_____ is my pen. Don\'t take it!',                 answer: 'This',      hint: 'Singular, próximo (na minha mão)',          explanation: '"This" = este/esta — singular e próximo de quem fala.' },
          { type: 'fill_gap',        sentence: '_____ people over there are my colleagues.',       answer: 'Those',     hint: 'Plural, distante',                          explanation: '"Those" = aqueles/aquelas — plural e distante de quem fala.' },
          { type: 'fill_gap',        sentence: 'A: What\'s _____? B: It\'s my new phone.',         answer: 'that',      hint: 'Singular, distante de quem pergunta',       explanation: '"That" = aquele/aquela/isso — singular e distante de quem fala.' },
          { type: 'fix_error',       sentence: 'These is a great idea!',                           answer: 'This is a great idea!',                   hint: '"Idea" é singular', explanation: '"Idea" é singular — use "This", não "These" (que é plural).' },
          { type: 'fix_error',       sentence: 'I love those song!',                               answer: 'I love that song!',                        hint: '"Song" é singular', explanation: '"Song" é singular — use "that" (singular distante), não "those" (plural).' },
          { type: 'read_answer',     passage: 'Sarah is at a shoe store. She points to some red shoes near her and says: "I\'d like to try these." Then she points to some blue boots on a shelf far away and says: "And those too, please."', question: 'Which shoes are far from Sarah?', answer: 'the blue boots', explanation: 'Sarah usa "those" para os sapatos distantes — as botas azuis na prateleira.' },
        ],
      },

      // ── Topic 4 — Possessives ─────────────────────────────────────────────
      {
        title: 'Possessives — my, your, his, her + possessive \'s',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'That is _____ car. It\'s new.',                    answer: 'his',       options: ['his', 'her', 'their'],                 explanation: '"His" indica posse masculina (dele). Use "his" quando o dono é um homem.' },
          { type: 'multiple_choice', sentence: 'Anna loves _____ job.',                            answer: 'her',       options: ['her', 'his', 'its'],                   explanation: '"Her" indica posse feminina (dela). Anna é mulher, então usamos "her job".' },
          { type: 'word_bank',       sentence: 'Is this _____ bag or mine?',                       answer: 'your',      choices: ['your', 'my', 'his', 'our'],            explanation: '"Your" significa "seu/sua" (de você). Usado para falar com a pessoa diretamente.' },
          { type: 'word_bank',       sentence: 'The dog wags _____ tail when it\'s happy.',        answer: 'its',       choices: ['its', 'his', 'their', 'her'],          explanation: '"Its" indica posse de coisa/animal (sem gênero). Diferente de "it\'s" (it is).' },
          { type: 'fill_gap',        sentence: 'We love _____ new apartment.',                     answer: 'our',       hint: 'Posse de "we" (nós)',                       explanation: '"Our" significa "nosso/nossa" — indica posse do grupo (we).' },
          { type: 'fill_gap',        sentence: 'This is Tom\'s guitar. _____ guitar is beautiful.', answer: 'His',      hint: 'Tom é masculino',                          explanation: 'Tom é masculino — usamos "His guitar" para não repetir "Tom\'s guitar".' },
          { type: 'fill_gap',        sentence: 'That\'s _____ house over there — the blue one.',   answer: 'their',     hint: 'Posse de "they" (eles/elas)',               explanation: '"Their" significa "deles/delas" — indica posse do grupo (they).' },
          { type: 'fix_error',       sentence: 'She forgot her\'s keys at home.',                  answer: 'She forgot her keys at home.',             hint: '"Her" já indica posse — não precisa de apóstrofo', explanation: '"Her" é adjetivo possessivo — não existe "her\'s". Correto: her keys.' },
          { type: 'fix_error',       sentence: 'That is the bag of Maria.',                        answer: 'That is Maria\'s bag.',                    hint: 'Use possessivo com apóstrofo -\'s',         explanation: 'Em inglês, posse é expressa com \'s: Maria\'s bag (não "the bag of Maria").' },
          { type: 'read_answer',     passage: 'Pedro has a sister called Lucia. Lucia\'s husband is called Mark. Mark is a teacher and his school is near their house. Pedro visits his sister every weekend.', question: 'What is Mark\'s job?', answer: 'teacher', explanation: 'O texto diz: "Mark is a teacher."' },
        ],
      },

      // ── Topic 5 — Object pronouns ─────────────────────────────────────────
      {
        title: 'Object pronouns (me, you, him, her, it, us, them)',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'Can you help _____? I don\'t understand this.',    answer: 'me',        options: ['me', 'I', 'my'],                       explanation: '"Me" é o pronome objeto de "I". Após verbos, usamos "me", não "I".' },
          { type: 'multiple_choice', sentence: 'I saw Ana yesterday. I called _____ after school.', answer: 'her',      options: ['her', 'she', 'hers'],                  explanation: '"Her" é o pronome objeto de "she". Após verbos, usamos "her", não "she".' },
          { type: 'word_bank',       sentence: 'The teacher explained the lesson to _____ .',      answer: 'us',        choices: ['us', 'we', 'our', 'ours'],             explanation: '"Us" é o pronome objeto de "we". Após preposições e verbos, usamos "us".' },
          { type: 'word_bank',       sentence: 'I don\'t know _____ . Who is he?',                 answer: 'him',       choices: ['him', 'he', 'his', 'himself'],          explanation: '"Him" é o pronome objeto de "he". Use "him" após verbos e preposições.' },
          { type: 'fill_gap',        sentence: 'I love this song. I listen to _____ every day.',   answer: 'it',        hint: 'Pronome objeto de "it" (coisa)',            explanation: '"It" funciona tanto como sujeito quanto como objeto quando se refere a coisas.' },
          { type: 'fill_gap',        sentence: 'Where are the kids? I can\'t find _____.',         answer: 'them',      hint: 'Pronome objeto de "they" (plural)',          explanation: '"Them" é o pronome objeto de "they". Use após verbos para plural.' },
          { type: 'fill_gap',        sentence: 'My parents are great. I really love _____ .',      answer: 'them',      hint: 'Pronome para mais de uma pessoa',           explanation: '"Them" = eles/elas como objeto. I love them = Eu os amo.' },
          { type: 'fix_error',       sentence: 'She gave the present to he.',                      answer: 'She gave the present to him.',             hint: 'Após preposição, use pronome objeto',  explanation: 'Após preposições (to, for, with…), use pronome objeto: "him", não "he".' },
          { type: 'fix_error',       sentence: 'Can you call she tonight?',                        answer: 'Can you call her tonight?',                hint: 'Pronome objeto após verbo',            explanation: 'Após verbos, use pronome objeto: "her" (não "she"). Call her = ligue para ela.' },
          { type: 'read_answer',     passage: 'Tom has a new neighbour called Lisa. He met her last week. She seems very friendly. Tom invited her to his birthday party and she said she would bring her boyfriend with her.', question: 'Who did Tom invite to his party?', answer: 'Lisa', explanation: 'O texto diz: "Tom invited her to his birthday party" — "her" refere-se à Lisa.' },
        ],
      },
    ],
  },

  // ── Module 3 — Present Simple ────────────────────────────────────────────
  {
    title: 'Present Simple',
    topics: [
      // ── Topic 1 — Verb To Be: full review ────────────────────────────────
      {
        title: 'Verb To Be — full review + real-life expressions',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'What _____ your name?',                           answer: 'is',        options: ['is', 'are', 'am'],                  explanation: '"What is your name?" — use "is" em perguntas com sujeito singular (your name).' },
          { type: 'multiple_choice', sentence: 'I _____ not ready yet.',                           answer: 'am',        options: ['am', 'is', 'are'],                  explanation: '"I am not" é a negativa de "I am". Contrações: I\'m not.' },
          { type: 'word_bank',       sentence: 'Where _____ you from?',                            answer: 'are',       choices: ['are', 'is', 'am', 'be'],            explanation: '"Where are you from?" é a pergunta padrão para saber a origem de alguém.' },
          { type: 'word_bank',       sentence: 'My parents _____ from São Paulo.',                 answer: 'are',       choices: ['are', 'is', 'am', 'be'],            explanation: '"My parents" é plural, então usamos "are".' },
          { type: 'fill_gap',        sentence: 'A: _____ you a nurse? B: No, I\'m a teacher.',     answer: 'Are',       hint: 'Pergunta com "you"',                    explanation: 'Perguntas sim/não com "you" começam com "Are": "Are you a nurse?"' },
          { type: 'fill_gap',        sentence: 'It _____ very cold today.',                        answer: 'is',        hint: '"It" usa "is"',                         explanation: '"It is" (ou "It\'s") descreve o clima, temperatura e situações gerais.' },
          { type: 'fill_gap',        sentence: 'A: How _____ they? B: They\'re great!',            answer: 'are',       hint: '"They" usa "are"',                      explanation: '"How are they?" — use "are" com "they" (eles/elas).' },
          { type: 'fix_error',       sentence: 'She are a good student.',                          answer: 'She is a good student.',              hint: '"She" usa "is"',       explanation: '"She" (ela) sempre usa "is", nunca "are".' },
          { type: 'fix_error',       sentence: 'My brother and I is hungry.',                      answer: 'My brother and I are hungry.',         hint: 'Dois sujeitos = plural',  explanation: '"My brother and I" são dois sujeitos — use o verbo no plural: "are".' },
          { type: 'read_answer',     passage: 'Hi! My name is Clara. I\'m 20 years old and I\'m a student. My parents are both doctors. We are a happy family.', question: 'What do Clara\'s parents do? (profissão em inglês)', answer: 'doctors', explanation: 'O texto diz: "My parents are both doctors."' },
        ],
      },

      // ── Topic 2 — Present Simple affirmative ─────────────────────────────
      {
        title: 'Present Simple — affirmative (I/you/we/they)',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'I _____ coffee every morning.',                    answer: 'drink',     options: ['drink', 'drinks', 'drinking'],       explanation: 'Com "I", usamos a forma base do verbo no Present Simple: drink (sem -s).' },
          { type: 'multiple_choice', sentence: 'We _____ English at school.',                       answer: 'study',     options: ['study', 'studies', 'studying'],      explanation: 'Com "we" (nós), o verbo fica na forma base: study (sem -s).' },
          { type: 'word_bank',       sentence: 'They _____ in a big house.',                        answer: 'live',      choices: ['live', 'lives', 'living', 'lived'],  explanation: 'Com "they" (eles), use a forma base do verbo: live (sem -s).' },
          { type: 'word_bank',       sentence: 'You _____ very well!',                              answer: 'cook',      choices: ['cook', 'cooks', 'cooking', 'cooked'], explanation: 'Com "you" (você/vocês), o verbo fica na forma base: cook (sem -s).' },
          { type: 'fill_gap',        sentence: 'I _____ (work) at a hospital.',                     answer: 'work',      hint: 'Forma base com "I"',                    explanation: 'Present Simple com "I": use a forma base do verbo sem alterações.' },
          { type: 'fill_gap',        sentence: 'We _____ (eat) dinner at 7 pm.',                    answer: 'eat',       hint: 'Forma base com "we"',                   explanation: 'Com "we", o verbo fica na forma base: eat.' },
          { type: 'fill_gap',        sentence: 'They _____ (go) to the gym three times a week.',    answer: 'go',        hint: 'Forma base com "they"',                 explanation: 'Com "they", o verbo fica na forma base: go.' },
          { type: 'fix_error',       sentence: 'I speaks English and Portuguese.',                   answer: 'I speak English and Portuguese.',          hint: '"I" não usa -s',       explanation: 'Com "I", o verbo não recebe -s no Present Simple: speak (não speaks).' },
          { type: 'fix_error',       sentence: 'We lives near the beach.',                          answer: 'We live near the beach.',                 hint: '"We" não usa -s',      explanation: 'Com "we" (nós), o verbo não recebe -s: live (não lives).' },
          { type: 'read_answer',     passage: 'Ana and her sister live in Rio. They work in the same company. Every day, they wake up at 7, eat breakfast together, and go to work by bus.', question: 'How do Ana and her sister get to work?', answer: 'by bus', explanation: 'O texto diz: "they go to work by bus."' },
        ],
      },

      // ── Topic 3 — Third person singular ──────────────────────────────────
      {
        title: 'Present Simple — third person singular (-s / -es / -ies)',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'She _____ to school by bike.',                     answer: 'goes',      options: ['goes', 'go', 'gos'],                explanation: '"Go" na terceira pessoa (he/she/it) vira "goes" — verbos terminados em -o recebem -es.' },
          { type: 'multiple_choice', sentence: 'He _____ the guitar really well.',                  answer: 'plays',     options: ['plays', 'playes', 'play'],           explanation: 'Verbos terminados em vogal + y recebem apenas -s: play → plays.' },
          { type: 'word_bank',       sentence: 'She _____ her teeth twice a day.',                  answer: 'brushes',   choices: ['brushes', 'brush', 'brushs', 'brusies'], explanation: 'Verbos terminados em -sh recebem -es na terceira pessoa: brush → brushes.' },
          { type: 'word_bank',       sentence: 'He _____ in Barcelona.',                            answer: 'lives',     choices: ['lives', 'live', 'livies', 'liveies'], explanation: 'Verbos terminados em -e recebem apenas -s: live → lives.' },
          { type: 'fill_gap',        sentence: 'She _____ (study) English every evening.',          answer: 'studies',   hint: 'Consoante + y → troque y por i e adicione -es', explanation: 'Verbos terminados em consoante + y: troque y por i e adicione -es. study → studies.' },
          { type: 'fill_gap',        sentence: 'He _____ (watch) TV after dinner.',                 answer: 'watches',   hint: 'Verbo terminado em -ch → adicione -es',   explanation: 'Verbos terminados em -ch recebem -es: watch → watches.' },
          { type: 'fill_gap',        sentence: 'It _____ (rain) a lot in winter here.',             answer: 'rains',     hint: 'Verbo regular + s',                     explanation: 'A maioria dos verbos recebe apenas -s na terceira pessoa: rain → rains.' },
          { type: 'fix_error',       sentence: 'He go to work by car.',                             answer: 'He goes to work by car.',                 hint: '"He" + go → terceira pessoa',  explanation: 'Com "he" (ele), o verbo "go" vira "goes" no Present Simple.' },
          { type: 'fix_error',       sentence: 'She studys Spanish at university.',                  answer: 'She studies Spanish at university.',      hint: 'Consoante + y → troque y por i + es', explanation: '"Study" termina em consoante + y, então vira "studies" (não "studys").' },
          { type: 'read_answer',     passage: 'Lucas works at a bakery. He wakes up at 5 am every day. He makes fresh bread and pastries in the morning. He finishes work at 2 pm and then goes to the gym.', question: 'What time does Lucas finish work?', answer: '2 pm', explanation: 'O texto diz: "He finishes work at 2 pm."' },
        ],
      },

      // ── Topic 4 — Present Simple negative ────────────────────────────────
      {
        title: "Present Simple — negative (don't / doesn't)",
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'I _____ like spicy food.',                         answer: "don't",     options: ["don't", "doesn't", "not"],          explanation: '"Don\'t" (do not) é o auxiliar negativo para I/you/we/they no Present Simple.' },
          { type: 'multiple_choice', sentence: 'She _____ speak French.',                           answer: "doesn't",   options: ["doesn't", "don't", "isn't"],        explanation: '"Doesn\'t" (does not) é o auxiliar negativo para he/she/it no Present Simple.' },
          { type: 'word_bank',       sentence: 'They _____ eat meat.',                              answer: "don't",     choices: ["don't", "doesn't", "isn't", "aren't"], explanation: 'Com "they" (eles), use "don\'t" na negativa do Present Simple.' },
          { type: 'word_bank',       sentence: 'He _____ drive to work.',                           answer: "doesn't",   choices: ["doesn't", "don't", "isn't", "not"],  explanation: 'Com "he" (ele), use "doesn\'t" na negativa. O verbo principal fica na forma base.' },
          { type: 'fill_gap',        sentence: 'I _____ (not) understand this question.',           answer: "don't",     hint: '"I" usa "don\'t"',                      explanation: '"Don\'t" é a forma negativa para "I" no Present Simple.' },
          { type: 'fill_gap',        sentence: 'She _____ (not) live here anymore.',                answer: "doesn't",   hint: '"She" usa "doesn\'t"',                  explanation: '"Doesn\'t" é a forma negativa para "she". Note: o verbo volta à forma base (live, não lives).' },
          { type: 'fill_gap',        sentence: 'We _____ (not) have class on Sundays.',             answer: "don't",     hint: '"We" usa "don\'t"',                     explanation: '"Don\'t" é a forma negativa para "we". Note: have (não has) depois de don\'t.' },
          { type: 'fix_error',       sentence: 'She don\'t like cold weather.',                     answer: "She doesn't like cold weather.",          hint: '"She" usa "doesn\'t"',         explanation: '"She" (ela) exige "doesn\'t" na negativa, não "don\'t".' },
          { type: 'fix_error',       sentence: 'He doesn\'t wants coffee.',                         answer: "He doesn't want coffee.",                 hint: 'Após "doesn\'t", verbo na forma base', explanation: 'Depois de "doesn\'t", o verbo fica na forma base: want (não wants).' },
          { type: 'read_answer',     passage: 'Ben is vegetarian. He doesn\'t eat meat or fish. He doesn\'t drink alcohol either. His sister is different — she eats everything and drinks wine sometimes.', question: 'Does Ben drink alcohol? (yes/no)', answer: 'no', explanation: 'O texto diz: "He doesn\'t drink alcohol" — Ben não bebe álcool.' },
        ],
      },

      // ── Topic 5 — Present Simple yes/no questions ─────────────────────────
      {
        title: 'Present Simple — yes/no questions (Do/Does)',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: '_____ you like pizza?',                             answer: 'Do',        options: ['Do', 'Does', 'Are'],                explanation: '"Do" inicia perguntas sim/não com I/you/we/they no Present Simple.' },
          { type: 'multiple_choice', sentence: '_____ she work on weekends?',                       answer: 'Does',      options: ['Does', 'Do', 'Is'],                 explanation: '"Does" inicia perguntas com he/she/it no Present Simple.' },
          { type: 'word_bank',       sentence: '_____ they have a car?',                            answer: 'Do',        choices: ['Do', 'Does', 'Is', 'Are'],          explanation: '"Do" é usado em perguntas com "they" (eles).' },
          { type: 'word_bank',       sentence: '_____ he play football?',                           answer: 'Does',      choices: ['Does', 'Do', 'Is', 'Has'],          explanation: '"Does" é usado em perguntas com "he" (ele). O verbo fica na forma base: play (não plays).' },
          { type: 'fill_gap',        sentence: '_____ you speak English?',                          answer: 'Do',        hint: 'Pergunta com "you"',                    explanation: 'Perguntas sim/não com "you" começam com "Do": "Do you speak English?"' },
          { type: 'fill_gap',        sentence: 'A: _____ she have a sister? B: Yes, she does.',     answer: 'Does',      hint: 'Pergunta com "she"',                    explanation: '"Does she have…?" é a pergunta correta. Note: "have" (não has) depois de Does.' },
          { type: 'fill_gap',        sentence: 'A: Do they live here? B: No, they _____.',          answer: "don't",     hint: 'Resposta negativa curta com "they"',     explanation: 'Resposta negativa curta: "No, they don\'t."' },
          { type: 'fix_error',       sentence: 'Does she goes to school by bus?',                   answer: 'Does she go to school by bus?',            hint: 'Após "Does", verbo na forma base', explanation: 'Depois de "Does", o verbo fica na forma base: go (não goes).' },
          { type: 'fix_error',       sentence: 'Do he like this music?',                            answer: 'Does he like this music?',                 hint: '"He" usa "Does"',             explanation: '"He" (ele) exige "Does" em perguntas, não "Do".' },
          { type: 'read_answer',     passage: 'Interviewer: Do you speak any other languages? Mia: Yes, I speak Spanish and a little Italian. Interviewer: Does your partner speak Spanish too? Mia: No, he doesn\'t. He speaks German.', question: 'Does Mia\'s partner speak Spanish? (yes/no)', answer: 'no', explanation: 'Mia diz: "No, he doesn\'t." Ele não fala espanhol.' },
        ],
      },

      // ── Topic 6 — WH- questions ───────────────────────────────────────────
      {
        title: 'WH- questions — what, who, where, when, why, how',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: '_____ do you live?',                                answer: 'Where',     options: ['Where', 'When', 'What'],            explanation: '"Where" pergunta sobre lugar ou localização: "Where do you live? — In São Paulo."' },
          { type: 'multiple_choice', sentence: '_____ does she study?',                             answer: 'What',      options: ['What', 'Who', 'How'],               explanation: '"What" pergunta sobre coisas ou matéria: "What does she study? — English."' },
          { type: 'word_bank',       sentence: '_____ do you go to the gym?',                       answer: 'When',      choices: ['When', 'Why', 'Who', 'Where'],      explanation: '"When" pergunta sobre tempo/horário: "When do you go? — On Mondays."' },
          { type: 'word_bank',       sentence: '_____ does that word mean?',                        answer: 'What',      choices: ['What', 'Who', 'Why', 'How'],        explanation: '"What does...mean?" é a pergunta padrão para saber o significado de uma palavra.' },
          { type: 'fill_gap',        sentence: '_____ do you usually eat lunch?',                   answer: 'Where',     hint: 'Pergunta sobre lugar',                  explanation: '"Where" é usado para perguntar sobre locais: "Where do you eat lunch? — At home."' },
          { type: 'fill_gap',        sentence: '_____ does she look so sad?',                       answer: 'Why',       hint: 'Pergunta sobre motivo/razão',           explanation: '"Why" pergunta a razão ou motivo: "Why does she look sad? — Because she\'s tired."' },
          { type: 'fill_gap',        sentence: '_____ do you go to work? — By car.',                answer: 'How',       hint: 'Pergunta sobre maneira ou meio',        explanation: '"How" pergunta sobre como algo acontece. "How do you go? — By car."' },
          { type: 'fix_error',       sentence: 'What she does for a living?',                       answer: 'What does she do for a living?',           hint: 'Auxiliar "does" antes do sujeito',    explanation: 'Perguntas com WH- + auxiliar: "What does she do?" (does vem antes do sujeito).' },
          { type: 'fix_error',       sentence: 'Where does he lives?',                              answer: 'Where does he live?',                      hint: 'Após "does", verbo na forma base',    explanation: 'Depois de "does", o verbo fica na forma base: live (não lives).' },
          { type: 'read_answer',     passage: 'A: What do you do? B: I\'m a nurse. A: Where do you work? B: At City Hospital. A: How do you get there? B: I take the subway. It takes about 30 minutes.', question: 'How long does the journey take?', answer: '30 minutes', explanation: 'O texto diz: "It takes about 30 minutes."' },
        ],
      },

      // ── Topic 7 — Frequency adverbs ──────────────────────────────────────
      {
        title: 'Frequency adverbs (always, usually, often…)',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'I _____ brush my teeth before bed.',                answer: 'always',    options: ['always', 'never', 'sometimes'],      explanation: '"Always" significa sempre — indica uma ação que acontece 100% das vezes.' },
          { type: 'multiple_choice', sentence: 'She _____ late for class. It\'s a problem.',         answer: 'is always', options: ['is always', 'always is', 'always'],   explanation: 'Com o verbo "to be", o advérbio vem depois do verbo: "She is always late."' },
          { type: 'word_bank',       sentence: 'He _____ drinks coffee in the morning.',             answer: 'usually',   choices: ['usually', 'always', 'never', 'yet'], explanation: '"Usually" significa geralmente — ação frequente mas não sempre.' },
          { type: 'word_bank',       sentence: 'I _____ eat breakfast. I\'m always in a hurry!',    answer: 'never',     choices: ['never', 'always', 'often', 'usually'], explanation: '"Never" significa nunca — ação que não acontece.' },
          { type: 'fill_gap',        sentence: 'We _____ go to the cinema on Fridays.',              answer: 'often',     hint: 'Frequente, mas não sempre',             explanation: '"Often" significa frequentemente — mais que "sometimes" mas menos que "usually".' },
          { type: 'fill_gap',        sentence: 'I _____ forget to call my mom. It\'s terrible!',    answer: 'always',    hint: 'Acontece 100% das vezes',               explanation: '"Always" = sempre. Quando algo acontece todo o tempo sem exceção.' },
          { type: 'fill_gap',        sentence: 'She _____ takes the bus, but today she drove.',      answer: 'usually',   hint: 'Geralmente, mas não hoje',              explanation: '"Usually" = geralmente. Indica o hábito normal que hoje foi diferente.' },
          { type: 'fix_error',       sentence: 'He goes always to bed late.',                        answer: 'He always goes to bed late.',              hint: 'Posição do advérbio antes do verbo principal', explanation: 'Com verbos principais, o advérbio de frequência vem antes do verbo: always goes.' },
          { type: 'fix_error',       sentence: 'I sometimes am nervous before exams.',               answer: 'I am sometimes nervous before exams.',     hint: '"To be" → advérbio depois do verbo',          explanation: 'Com o verbo "to be", o advérbio vem depois: "I am sometimes nervous."' },
          { type: 'read_answer',     passage: 'Pedro usually wakes up at 7 am. He never skips breakfast. He sometimes goes jogging before work. He is always at his desk by 9 am.', question: 'Does Pedro ever skip breakfast? (yes/no)', answer: 'no', explanation: 'O texto diz: "He never skips breakfast." — Pedro nunca pula o café.' },
        ],
      },
    ],
  },

  // ── Module 4 — Time, Place & Chunks ─────────────────────────────────────
  {
    title: 'Time, Place & Chunks',
    topics: [
      // ── Topic 1 — Numbers, dates & time ──────────────────────────────────
      {
        title: 'Numbers, dates & time',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'The meeting is _____ 3 o\'clock.',                  answer: 'at',        options: ['at', 'in', 'on'],                   explanation: 'Use "at" com horas específicas: at 3 o\'clock, at noon, at midnight.' },
          { type: 'multiple_choice', sentence: 'Today is _____ March 15th.',                         answer: 'the',       options: ['the', 'a', 'on'],                   explanation: 'Datas em inglês: "March 15th" ou "the 15th of March". "The" indica a data ordinal.' },
          { type: 'word_bank',       sentence: 'She was born in _____.',                             answer: '1995',      choices: ['1995', 'the 1995', 'at 1995', 'on 1995'], explanation: 'Anos em inglês não usam artigo: she was born in 1995.' },
          { type: 'word_bank',       sentence: 'What time is it? It\'s _____ past two.',             answer: 'quarter',   choices: ['quarter', 'half', 'three', 'five'],  explanation: '"Quarter past two" = 2:15. "Quarter" em inglês equivale a 15 minutos.' },
          { type: 'fill_gap',        sentence: 'The class starts _____ 8:30 am.',                    answer: 'at',        hint: 'Hora específica → preposição correta',   explanation: '"At" é usado antes de horas específicas: at 8:30 am.' },
          { type: 'fill_gap',        sentence: 'My birthday is _____ June.',                         answer: 'in',        hint: 'Mês → preposição correta',              explanation: '"In" é usado antes de meses e anos: in June, in 2025.' },
          { type: 'fill_gap',        sentence: 'The party is _____ Saturday, July 12th.',            answer: 'on',        hint: 'Dia da semana e data → preposição correta', explanation: '"On" é usado antes de dias da semana e datas específicas: on Saturday.' },
          { type: 'fix_error',       sentence: 'The store opens in 9 am.',                           answer: 'The store opens at 9 am.',                 hint: 'Hora específica usa "at"',    explanation: '"At" é a preposição correta para horas: at 9 am (não "in").' },
          { type: 'fix_error',       sentence: 'I was born on 1998.',                                answer: 'I was born in 1998.',                      hint: 'Ano usa "in"',                explanation: '"In" é a preposição correta para anos: in 1998 (não "on").' },
          { type: 'read_answer',     passage: 'The library opens at 9 am and closes at 8 pm on weekdays. On Saturdays, it opens at 10 am and closes at 5 pm. It is closed on Sundays.', question: 'What time does the library open on Saturdays?', answer: '10 am', explanation: 'O texto diz: "On Saturdays, it opens at 10 am."' },
        ],
      },

      // ── Topic 2 — Prepositions of time ────────────────────────────────────
      {
        title: 'Prepositions of time — at, on, in',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'I always wake up early _____ the morning.',          answer: 'in',        options: ['in', 'at', 'on'],                   explanation: '"In the morning/afternoon/evening" — use "in" com partes do dia.' },
          { type: 'multiple_choice', sentence: 'The flight departs _____ midnight.',                  answer: 'at',        options: ['at', 'in', 'on'],                   explanation: '"At midnight", "at noon", "at night" — expressões de tempo fixas com "at".' },
          { type: 'word_bank',       sentence: 'She studies _____ the weekend.',                     answer: 'at',        choices: ['at', 'in', 'on', 'by'],             explanation: '"At the weekend" é a expressão britânica. Em inglês americano: "on the weekend".' },
          { type: 'word_bank',       sentence: 'We have English class _____ Mondays.',               answer: 'on',        choices: ['on', 'in', 'at', 'by'],             explanation: '"On" é usado com dias da semana: on Monday, on Fridays.' },
          { type: 'fill_gap',        sentence: 'My exam is _____ December.',                         answer: 'in',        hint: 'Mês',                                   explanation: '"In" é usado com meses: in December, in March.' },
          { type: 'fill_gap',        sentence: 'The concert is _____ Friday night.',                 answer: 'on',        hint: 'Dia específico da semana',              explanation: '"On" é usado com dias da semana e datas: on Friday night.' },
          { type: 'fill_gap',        sentence: 'I was born _____ 2000.',                             answer: 'in',        hint: 'Ano',                                   explanation: '"In" é usado com anos: in 2000, in 1995.' },
          { type: 'fix_error',       sentence: 'The train arrives in 7:45 pm.',                      answer: 'The train arrives at 7:45 pm.',            hint: 'Hora → "at"',            explanation: '"At" é a preposição correta para horas: at 7:45 pm.' },
          { type: 'fix_error',       sentence: 'They got married on summer.',                         answer: 'They got married in summer.',              hint: 'Estação do ano → "in"',   explanation: '"In" é usado com estações do ano: in summer, in winter.' },
          { type: 'read_answer',     passage: 'Maria has a busy schedule. She works in the morning and goes to college in the afternoon. On Wednesdays, she has volleyball training at 7 pm. In December, she always takes two weeks off.', question: 'What does Maria do on Wednesdays at 7 pm?', answer: 'volleyball training', explanation: 'O texto diz: "On Wednesdays, she has volleyball training at 7 pm."' },
        ],
      },

      // ── Topic 3 — Prepositions of place ──────────────────────────────────
      {
        title: 'Prepositions of place — in, on, at, next to, behind…',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'The cat is _____ the box.',                          answer: 'in',        options: ['in', 'on', 'at'],                   explanation: '"In" indica que algo está dentro de um espaço fechado ou contêiner.' },
          { type: 'multiple_choice', sentence: 'Your keys are _____ the table.',                     answer: 'on',        choices: ['on', 'in', 'at'],                   explanation: '"On" indica que algo está em cima de uma superfície: on the table, on the shelf.' },
          { type: 'word_bank',       sentence: 'I\'ll meet you _____ the airport.',                  answer: 'at',        choices: ['at', 'in', 'on', 'by'],             explanation: '"At" é usado com pontos de encontro e locais específicos: at the airport, at school.' },
          { type: 'word_bank',       sentence: 'The bank is _____ the supermarket and the café.',    answer: 'between',   choices: ['between', 'next to', 'behind', 'in front of'], explanation: '"Between" indica posição entre dois lugares ou objetos.' },
          { type: 'fill_gap',        sentence: 'The dog is hiding _____ the sofa.',                  answer: 'behind',    hint: 'Atrás de algo',                         explanation: '"Behind" = atrás de. The dog is behind the sofa.' },
          { type: 'fill_gap',        sentence: 'The pharmacy is _____ the bakery. (ao lado)',        answer: 'next to',   hint: 'Ao lado de',                           explanation: '"Next to" = ao lado de. The pharmacy is next to the bakery.' },
          { type: 'fill_gap',        sentence: 'She lives _____ the second floor.',                  answer: 'on',        hint: 'Andar de um prédio',                    explanation: '"On" é usado com andares de prédio: on the second floor.' },
          { type: 'fix_error',       sentence: 'He works in the city centre, on Baker Street.',      answer: 'He works in the city centre, on Baker Street.',   hint: 'Esta frase está correta', explanation: '"In the city centre" e "on Baker Street" estão corretos — "in" para área, "on" para rua.' },
          { type: 'fix_error',       sentence: 'The hospital is in the corner.',                     answer: 'The hospital is on the corner.',           hint: 'Esquina → "on" ou "at"', explanation: '"On the corner" ou "at the corner" — não "in the corner" para localizações na esquina.' },
          { type: 'read_answer',     passage: 'The café is on Green Street, next to the post office. It is opposite the park. There is a car park behind the café. The entrance is at the front, on the corner.', question: 'What is next to the café?', answer: 'the post office', explanation: 'O texto diz: "next to the post office."' },
        ],
      },

      // ── Topic 4 — Common verb collocations ───────────────────────────────
      {
        title: 'Common verb collocations — daily life chunks',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'She _____ a shower every morning.',                  answer: 'takes',     options: ['takes', 'makes', 'does'],            explanation: '"Take a shower" é uma colocação fixa em inglês. Não se usa "make" ou "do".' },
          { type: 'multiple_choice', sentence: 'Can you _____ me a favour?',                         answer: 'do',        options: ['do', 'make', 'take'],               explanation: '"Do someone a favour" é a colocação correta — não "make a favour".' },
          { type: 'word_bank',       sentence: 'He _____ a mistake in the test.',                    answer: 'made',      choices: ['made', 'did', 'took', 'had'],       explanation: '"Make a mistake" é a colocação correta. Não se usa "do a mistake".' },
          { type: 'word_bank',       sentence: 'I need to _____ the dishes after dinner.',           answer: 'do',        choices: ['do', 'make', 'take', 'wash'],       explanation: '"Do the dishes" = lavar a louça. Uma colocação fixa do cotidiano.' },
          { type: 'fill_gap',        sentence: 'Don\'t _____ noise! The baby is sleeping.',          answer: 'make',      hint: '"Make" + noise (barulho)',               explanation: '"Make noise" é a colocação correta para fazer barulho.' },
          { type: 'fill_gap',        sentence: 'She _____ her homework before dinner.',              answer: 'does',      hint: '"Do" + homework (tarefa)',              explanation: '"Do your homework" é a colocação fixa para fazer a tarefa de casa.' },
          { type: 'fill_gap',        sentence: 'He _____ a photo of the sunset.',                    answer: 'took',      hint: '"Take" + photo (foto)',                 explanation: '"Take a photo" é a colocação correta. Não se usa "make" ou "do".' },
          { type: 'fix_error',       sentence: 'She made her best to help us.',                      answer: 'She did her best to help us.',             hint: '"Do your best" = dar o seu melhor',  explanation: '"Do your best" é a expressão fixa. Não se usa "make your best".' },
          { type: 'fix_error',       sentence: 'Can I do a suggestion?',                             answer: 'Can I make a suggestion?',                hint: '"Make" + suggestion',      explanation: '"Make a suggestion" é a colocação correta. Não se usa "do a suggestion".' },
          { type: 'read_answer',     passage: 'Every morning, Tom makes breakfast, takes a quick shower, and does his homework before school. He always does his best in every test and never makes excuses when he makes a mistake.', question: 'What does Tom do before school?', answer: 'makes breakfast, takes a shower, does homework', explanation: 'O texto diz: "makes breakfast, takes a quick shower, and does his homework before school."' },
        ],
      },
    ],
  },

  // ── Module 5 — Quantifiers & Ability ────────────────────────────────────
  {
    title: 'Quantifiers & Ability',
    topics: [
      // ── Topic 1 — There is / There are ───────────────────────────────────
      {
        title: 'There is / There are + some / any',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: '_____ a book on the table.',                        answer: 'There is',  options: ['There is', 'There are', 'It is'],    explanation: '"There is" é usado com substantivos singulares: there is a book.' },
          { type: 'multiple_choice', sentence: '_____ some eggs in the fridge.',                    answer: 'There are', options: ['There are', 'There is', 'They are'],  explanation: '"There are" é usado com substantivos plurais: there are some eggs.' },
          { type: 'word_bank',       sentence: 'Is there _____ milk in the fridge?',               answer: 'any',       choices: ['any', 'some', 'a', 'the'],           explanation: '"Any" é usado em perguntas e frases negativas com incontáveis: is there any milk?' },
          { type: 'word_bank',       sentence: 'There are _____ chairs in the room.',               answer: 'some',      choices: ['some', 'any', 'a', 'much'],          explanation: '"Some" é usado em frases afirmativas: there are some chairs.' },
          { type: 'fill_gap',        sentence: '_____ a supermarket near here?',                    answer: 'Is there',  hint: 'Pergunta com substantivo singular',       explanation: '"Is there" é a pergunta com singular. "Is there a supermarket near here?"' },
          { type: 'fill_gap',        sentence: '_____ any buses on Sundays?',                       answer: 'Are there', hint: 'Pergunta com plural',                    explanation: '"Are there" é a pergunta com plural: "Are there any buses on Sundays?"' },
          { type: 'fill_gap',        sentence: 'There _____ (not) any bread left.',                 answer: "isn't",     hint: 'Negativa com singular incontável',        explanation: '"There isn\'t any bread" — negativa com substantivo incontável singular.' },
          { type: 'fix_error',       sentence: 'There is some students in the classroom.',          answer: 'There are some students in the classroom.', hint: '"Students" é plural', explanation: '"Students" é plural — use "There are", não "There is".' },
          { type: 'fix_error',       sentence: 'Is there some water in the bottle?',                answer: 'Is there any water in the bottle?',  hint: 'Pergunta = "any"',   explanation: 'Em perguntas, usamos "any" (não "some"): Is there any water?' },
          { type: 'read_answer',     passage: 'In my neighbourhood, there is a park and a small café. There are two supermarkets and some restaurants. There isn\'t a cinema, but there are some art galleries.', question: 'Is there a cinema in the neighbourhood? (yes/no)', answer: 'no', explanation: 'O texto diz: "There isn\'t a cinema."' },
        ],
      },

      // ── Topic 2 — Quantifiers ─────────────────────────────────────────────
      {
        title: 'Quantifiers — a lot of, many, much, a few, a little',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'I don\'t have _____ time right now.',               answer: 'much',      options: ['much', 'many', 'a few'],             explanation: '"Much" é usado com substantivos incontáveis (não plurais): much time, much money.' },
          { type: 'multiple_choice', sentence: 'She has _____ friends in the city.',                 answer: 'many',      options: ['many', 'much', 'a little'],          explanation: '"Many" é usado com substantivos contáveis no plural: many friends, many books.' },
          { type: 'word_bank',       sentence: 'I need _____ more time to finish.',                 answer: 'a little',  choices: ['a little', 'a few', 'many', 'much'], explanation: '"A little" = um pouco — usado com substantivos incontáveis: a little time, a little money.' },
          { type: 'word_bank',       sentence: 'There are _____ people in the queue.',              answer: 'a lot of',  choices: ['a lot of', 'much', 'a little', 'a few'], explanation: '"A lot of" pode ser usado com contáveis e incontáveis: a lot of people, a lot of water.' },
          { type: 'fill_gap',        sentence: 'I have _____ dollars left — just 5.',               answer: 'a few',     hint: 'Pouco quantidade — plural contável',      explanation: '"A few" = alguns poucos — usado com substantivos contáveis no plural.' },
          { type: 'fill_gap',        sentence: 'Do you have _____ money for the bus?',              answer: 'any',       hint: 'Pergunta sobre quantidade incontável',    explanation: '"Any" é usado em perguntas: Do you have any money?' },
          { type: 'fill_gap',        sentence: 'There is _____ sugar in the bowl — add more.',     answer: 'a little',  hint: 'Uma pequena quantidade de algo incontável', explanation: '"A little sugar" = um pouco de açúcar. Usado com incontáveis em sentido positivo.' },
          { type: 'fix_error',       sentence: 'I drink much coffees every day.',                   answer: 'I drink a lot of coffee every day.',       hint: '"Coffee" é incontável — não pluraliza', explanation: '"Coffee" é incontável — não tem plural. Use "a lot of coffee".' },
          { type: 'fix_error',       sentence: 'She has much friends at school.',                   answer: 'She has many friends at school.',          hint: '"Friends" é plural contável',          explanation: '"Friends" é contável no plural — use "many", não "much".' },
          { type: 'read_answer',     passage: 'The recipe needs a little salt, a lot of tomatoes, a few cloves of garlic, and much patience! It\'s easy, but it takes a lot of time.', question: 'How much garlic does the recipe need?', answer: 'a few cloves', explanation: 'O texto diz: "a few cloves of garlic."' },
        ],
      },

      // ── Topic 3 — How much / How many ────────────────────────────────────
      {
        title: 'WH- questions — how much / how many + review',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: '_____ water do you drink per day?',                 answer: 'How much',  options: ['How much', 'How many', 'How often'],  explanation: '"How much" é usado com incontáveis: How much water? How much time?' },
          { type: 'multiple_choice', sentence: '_____ people are coming to the party?',             answer: 'How many',  options: ['How many', 'How much', 'How often'],  explanation: '"How many" é usado com contáveis no plural: How many people? How many books?' },
          { type: 'word_bank',       sentence: '_____ languages do you speak?',                     answer: 'How many',  choices: ['How many', 'How much', 'How often', 'How long'], explanation: '"Languages" é contável e plural — use "How many languages?"' },
          { type: 'word_bank',       sentence: '_____ does this cost?',                             answer: 'How much',  choices: ['How much', 'How many', 'What', 'How'], explanation: '"How much does this cost?" é a pergunta padrão para perguntar o preço.' },
          { type: 'fill_gap',        sentence: '_____ sugar should I add?',                         answer: 'How much',  hint: 'Sugar é incontável',                     explanation: '"Sugar" é incontável — use "How much sugar?"' },
          { type: 'fill_gap',        sentence: '_____ students are in the class?',                  answer: 'How many',  hint: 'Students é plural contável',             explanation: '"Students" é contável e plural — use "How many students?"' },
          { type: 'fill_gap',        sentence: '_____ does it take to get there?',                  answer: 'How long',  hint: 'Pergunta sobre duração de tempo',        explanation: '"How long does it take?" pergunta a duração — quanto tempo leva.' },
          { type: 'fix_error',       sentence: 'How many money do you have?',                       answer: 'How much money do you have?',              hint: '"Money" é incontável',      explanation: '"Money" é incontável — use "How much money?" (não "How many money").' },
          { type: 'fix_error',       sentence: 'How much brothers do you have?',                    answer: 'How many brothers do you have?',           hint: '"Brothers" é plural contável', explanation: '"Brothers" é contável no plural — use "How many brothers?" (não "How much").' },
          { type: 'read_answer',     passage: 'A: How many hours do you work per week? B: About 40 hours. A: And how much do you earn? B: I earn around R$3,000 per month. A: How long have you been in this job? B: Almost two years.', question: 'How much does person B earn per month?', answer: 'R$3,000', explanation: 'O texto diz: "I earn around R$3,000 per month."' },
        ],
      },

      // ── Topic 4 — Can / can't ─────────────────────────────────────────────
      {
        title: "Can / can't — ability, possibility & permission",
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'She _____ speak three languages.',                   answer: 'can',       options: ['can', 'cans', 'could'],              explanation: '"Can" é um modal — não muda com he/she/it. Sempre "she can", nunca "she cans".' },
          { type: 'multiple_choice', sentence: '_____ I use your phone for a moment?',               answer: 'Can',       options: ['Can', 'Do', 'Am'],                  explanation: '"Can I...?" é usado para pedir permissão de forma educada e informal.' },
          { type: 'word_bank',       sentence: 'I\'m sorry, you _____ enter without a ticket.',     answer: "can't",     choices: ["can't", "don't", "not can", "aren't"], explanation: '"Can\'t" = cannot — indica que algo não é permitido ou possível.' },
          { type: 'word_bank',       sentence: 'He _____ swim, but he\'s learning.',                answer: "can't",     choices: ["can't", "doesn't", "isn't", "won't"], explanation: '"He can\'t swim" indica falta de habilidade — ele não sabe nadar.' },
          { type: 'fill_gap',        sentence: '_____ you help me with this?',                       answer: 'Can',       hint: 'Pedido de ajuda',                        explanation: '"Can you help me?" é um pedido informal e educado de ajuda.' },
          { type: 'fill_gap',        sentence: 'She _____ drive — she\'s only 15.',                  answer: "can't",     hint: 'Impossibilidade (não tem idade)',         explanation: '"Can\'t" indica impossibilidade: ela não pode dirigir porque tem apenas 15 anos.' },
          { type: 'fill_gap',        sentence: 'I _____ hear you! The music is too loud.',           answer: "can't",     hint: 'Impossibilidade no momento',             explanation: '"Can\'t hear" indica impossibilidade no momento: o barulho impede de ouvir.' },
          { type: 'fix_error',       sentence: 'She cans play the piano very well.',                 answer: 'She can play the piano very well.',        hint: '"Can" não muda com he/she/it',  explanation: '"Can" é modal e nunca recebe -s: she can (nunca "she cans").' },
          { type: 'fix_error',       sentence: 'Can you to help me?',                                answer: 'Can you help me?',                         hint: 'Modal + forma base (sem "to")', explanation: 'Depois de modais como "can", o verbo fica na forma base sem "to": can help (não "can to help").' },
          { type: 'read_answer',     passage: 'Miguel is very talented. He can speak English and Spanish. He can play the guitar and the drums. However, he can\'t draw at all, and he can\'t cook. He always burns everything!', question: 'Can Miguel cook? (yes/no)', answer: 'no', explanation: 'O texto diz: "he can\'t cook." — Miguel não sabe cozinhar.' },
        ],
      },
    ],
  },

  // ── Module 6 — Present Continuous ───────────────────────────────────────
  {
    title: 'Present Continuous',
    topics: [
      // ── Topic 1 — Present Continuous affirmative & negative ───────────────
      {
        title: 'Present Continuous — affirmative & negative',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'She _____ a book right now.',                       answer: 'is reading', options: ['is reading', 'reads', 'reading'],    explanation: '"Is reading" = Present Continuous. Usado para ações em andamento agora.' },
          { type: 'multiple_choice', sentence: 'They _____ football at the moment.',                 answer: "aren't playing", options: ["aren't playing", "don't play", "not playing"], explanation: '"Aren\'t playing" = negativa do Present Continuous com "they".' },
          { type: 'word_bank',       sentence: 'I _____ my homework right now.',                    answer: "am doing",  choices: ["am doing", "do", "doing", "does"],    explanation: '"Am doing" = I + am + verbo-ing. Ação em andamento neste momento.' },
          { type: 'word_bank',       sentence: 'He _____ on the phone. Don\'t disturb him.',        answer: "is talking", choices: ["is talking", "talks", "talk", "are talking"], explanation: '"Is talking" = he + is + verbo-ing. Ação acontecendo agora.' },
          { type: 'fill_gap',        sentence: 'We _____ (have) dinner at the moment.',              answer: "are having", hint: '"We" + Present Continuous',              explanation: '"Are having" = we + are + verbo-ing. Ação em andamento agora.' },
          { type: 'fill_gap',        sentence: 'It _____ (rain) outside. Bring an umbrella!',        answer: "is raining", hint: '"It" + Present Continuous',             explanation: '"Is raining" = it + is + verbo-ing. Chovendo neste exato momento.' },
          { type: 'fill_gap',        sentence: 'She _____ (not/listen) — she\'s on her phone.',     answer: "isn't listening", hint: 'Negativa com "she"',               explanation: '"Isn\'t listening" = she + is not + verbo-ing. Negativa do Present Continuous.' },
          { type: 'fix_error',       sentence: 'He is play video games right now.',                  answer: 'He is playing video games right now.',    hint: 'is + verbo + -ing',   explanation: 'Present Continuous = is/am/are + verbo-ING: "is playing" (não "is play").' },
          { type: 'fix_error',       sentence: 'They are not study right now.',                      answer: 'They are not studying right now.',         hint: 'are + verbo + -ing',  explanation: 'Present Continuous negativo: are + not + verbo-ING: "not studying".' },
          { type: 'read_answer',     passage: 'It\'s 8 pm. Dad is cooking dinner in the kitchen. Mum is reading a book on the sofa. The kids are doing their homework. Nobody is watching TV tonight.', question: 'What is Dad doing?', answer: 'cooking dinner', explanation: 'O texto diz: "Dad is cooking dinner in the kitchen."' },
        ],
      },

      // ── Topic 2 — Present Continuous questions ────────────────────────────
      {
        title: 'Present Continuous — questions',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: '_____ you studying English now?',                    answer: 'Are',       options: ['Are', 'Do', 'Is'],                  explanation: 'Perguntas do Present Continuous: "Are" para I/you/we/they.' },
          { type: 'multiple_choice', sentence: 'What _____ she doing?',                              answer: 'is',        options: ['is', 'are', 'does'],                explanation: '"What is she doing?" — "is" para perguntas com he/she/it.' },
          { type: 'word_bank',       sentence: '_____ it raining outside?',                          answer: 'Is',        choices: ['Is', 'Are', 'Does', 'Do'],           explanation: '"Is it raining?" — pergunta do Present Continuous com "it".' },
          { type: 'word_bank',       sentence: 'Where _____ they going?',                            answer: 'are',       choices: ['are', 'is', 'do', 'does'],           explanation: '"Where are they going?" — "are" para perguntas com "they".' },
          { type: 'fill_gap',        sentence: 'Why _____ he crying?',                               answer: 'is',        hint: '"He" usa "is" no Present Continuous',    explanation: '"Why is he crying?" — "is" para perguntas com he/she/it.' },
          { type: 'fill_gap',        sentence: 'A: _____ you listening to me? B: Yes, I am.',        answer: 'Are',       hint: '"You" usa "are"',                        explanation: '"Are you listening?" — pergunta do Present Continuous com "you".' },
          { type: 'fill_gap',        sentence: 'What _____ you cooking? It smells amazing!',         answer: 'are',       hint: 'WH- + verbo auxiliar + sujeito',         explanation: '"What are you cooking?" — forma correta da pergunta WH- no Present Continuous.' },
          { type: 'fix_error',       sentence: 'Is they coming to the party?',                       answer: 'Are they coming to the party?',            hint: '"They" usa "are"',          explanation: '"They" usa "are", não "is": "Are they coming to the party?"' },
          { type: 'fix_error',       sentence: 'What she is doing right now?',                       answer: 'What is she doing right now?',             hint: 'O auxiliar vem antes do sujeito', explanation: 'Em perguntas com WH-, o auxiliar vem antes do sujeito: "What is she doing?"' },
          { type: 'read_answer',     passage: 'A: Are you coming to lunch? B: No, I\'m working. A: What are you working on? B: I\'m writing a report. A: Is your colleague helping you? B: No, she\'s at a meeting.', question: 'What is the colleague doing?', answer: 'at a meeting', explanation: 'O texto diz: "she\'s at a meeting."' },
        ],
      },

      // ── Topic 3 — Present Simple vs. Present Continuous ──────────────────
      {
        title: 'Present Simple vs. Present Continuous',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'I _____ coffee every morning. (hábito)',             answer: 'drink',     options: ['drink', 'am drinking', 'drinks'],    explanation: 'Hábitos e rotinas usam o Present Simple: "I drink coffee every morning."' },
          { type: 'multiple_choice', sentence: 'Shh! The baby _____ right now.',                     answer: 'is sleeping', options: ['is sleeping', 'sleeps', 'sleep'],  explanation: 'Ação em andamento agora: Present Continuous. "The baby is sleeping right now."' },
          { type: 'word_bank',       sentence: 'She _____ to work by bike today — her car is broken.', answer: 'is cycling', choices: ['is cycling', 'cycles', 'cycle', 'cycling'], explanation: 'Ação temporária e atual: Present Continuous. Hoje ela está de bicicleta (diferente do normal).' },
          { type: 'word_bank',       sentence: 'He _____ in the city centre. (residência permanente)', answer: 'lives',   choices: ['lives', 'is living', 'live', 'is lives'], explanation: 'Situação permanente: Present Simple. "He lives in the city centre."' },
          { type: 'fill_gap',        sentence: 'I _____ (not understand) what you mean.',             answer: "don't understand", hint: 'Estado mental — não usa Continuous', explanation: 'Verbos de estado (understand, know, like, want) não usam Present Continuous.' },
          { type: 'fill_gap',        sentence: 'Look! They _____ (dance) in the street!',             answer: "are dancing", hint: 'Ação visível acontecendo agora',       explanation: '"Look!" indica ação em andamento agora — use Present Continuous.' },
          { type: 'fill_gap',        sentence: 'She usually _____ (take) the subway, but today she _____ (drive).', answer: 'takes / is driving', hint: 'Hábito vs. ação atual', explanation: 'Hábito = Present Simple (takes). Ação de hoje (diferente do hábito) = Present Continuous (is driving).' },
          { type: 'fix_error',       sentence: 'I am knowing the answer.',                           answer: 'I know the answer.',                      hint: '"Know" é verbo de estado',   explanation: '"Know" é um verbo de estado — não usa Present Continuous. Use Present Simple: "I know."' },
          { type: 'fix_error',       sentence: 'She is go to the gym every day.',                    answer: 'She goes to the gym every day.',           hint: 'Rotina diária = Present Simple', explanation: 'Rotinas e hábitos usam Present Simple. "Goes" (não "is going") para hábito diário.' },
          { type: 'read_answer',     passage: 'Clara normally works in an office, but this week she is working from home. She usually wakes up at 7 am, but today she is still sleeping at 9 am. Her cat is sitting on her laptop right now.', question: 'Where is Clara working this week?', answer: 'from home', explanation: 'O texto diz: "this week she is working from home."' },
        ],
      },
    ],
  },

  // ── Module 7 — Adjectives & Comparison ──────────────────────────────────
  {
    title: 'Adjectives & Comparison',
    topics: [
      // ── Topic 1 — Adjectives: description + order ─────────────────────────
      {
        title: 'Adjectives — description + order',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'She has _____ eyes.',                                answer: 'beautiful blue', options: ['beautiful blue', 'blue beautiful', 'beauty blue'], explanation: 'Em inglês, a ordem dos adjetivos é: opinião + cor. "Beautiful blue eyes" (não "blue beautiful").' },
          { type: 'multiple_choice', sentence: 'They live in a _____ house.',                         answer: 'big old',   options: ['big old', 'old big', 'oldly big'],   explanation: 'Ordem correta: tamanho + idade. "A big old house" (tamanho antes da idade).' },
          { type: 'word_bank',       sentence: 'He bought a _____ car.',                              answer: 'fast red',  choices: ['fast red', 'red fast', 'fastly red', 'redding fast'], explanation: 'Ordem: opinião/qualidade + cor. "A fast red car" (qualidade antes da cor).' },
          { type: 'word_bank',       sentence: 'She\'s a _____ teacher.',                             answer: 'great',     choices: ['great', 'greatly', 'greating', 'greatful'], explanation: 'Adjetivos em inglês não mudam com o gênero do substantivo: "a great teacher" sempre.' },
          { type: 'fill_gap',        sentence: 'This is a _____ (interest) film.',                    answer: 'interesting', hint: 'Adjetivo derivado de verbo + -ing',     explanation: '"Interesting" é o adjetivo correto. "-Ing adjectives" descrevem o que provoca emoção.' },
          { type: 'fill_gap',        sentence: 'I\'m _____ (bore) — there\'s nothing to do!',        answer: 'bored',     hint: 'Adjetivo que descreve como a pessoa se sente', explanation: '"Bored" = entediado. "-Ed adjectives" descrevem como a pessoa se sente.' },
          { type: 'fill_gap',        sentence: 'What a _____ (sun) day! Let\'s go to the beach.',    answer: 'sunny',     hint: 'Adjetivo derivado de substantivo + y',  explanation: '"Sunny" = ensolarado. Muitos adjetivos se formam adicionando -y ao substantivo.' },
          { type: 'fix_error',       sentence: 'She is a tall and beautifull woman.',                 answer: 'She is a tall and beautiful woman.',       hint: 'Verifique a ortografia de "beautiful"', explanation: 'A grafia correta é "beautiful" (não "beautifull").' },
          { type: 'fix_error',       sentence: 'I feel very tiredly today.',                          answer: 'I feel very tired today.',                 hint: 'Após "feel", use adjetivo (não advérbio)', explanation: 'Após verbos de ligação como "feel", use adjetivo: "tired" (não o advérbio "tiredly").' },
          { type: 'read_answer',     passage: 'My new apartment is small but cosy. It has a beautiful view of the river. The walls are white and the furniture is modern. I love my new neighbourhood — it\'s lively and safe.', question: 'How is the neighbourhood described?', answer: 'lively and safe', explanation: 'O texto diz: "it\'s lively and safe."' },
        ],
      },

      // ── Topic 2 — Comparative adjectives ─────────────────────────────────
      {
        title: 'Comparative adjectives (-er / more + than)',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'Brazil is _____ Portugal.',                           answer: 'bigger than', options: ['bigger than', 'more big than', 'biggest than'], explanation: 'Adjetivos curtos (1-2 sílabas) formam o comparativo com -er + than: big → bigger than.' },
          { type: 'multiple_choice', sentence: 'This exercise is _____ the last one.',                answer: 'more difficult than', options: ['more difficult than', 'difficulter than', 'difficult than'], explanation: 'Adjetivos longos (3+ sílabas) formam o comparativo com "more + adjetivo + than".' },
          { type: 'word_bank',       sentence: 'She is _____ her brother.',                           answer: 'taller than', choices: ['taller than', 'more tall than', 'tall than', 'tallest'], explanation: '"Tall" é curto — comparativo: taller than. (Não "more tall").' },
          { type: 'word_bank',       sentence: 'This film is _____ the book.',                        answer: 'more interesting than', choices: ['more interesting than', 'interestinger than', 'most interesting', 'interesting than'], explanation: '"Interesting" (4 sílabas) = more interesting than. Nunca "interestinger".' },
          { type: 'fill_gap',        sentence: 'January is _____ (cold) than March here.',            answer: 'colder',    hint: 'Comparativo de adjetivo curto',           explanation: '"Cold" → comparativo: colder. Janeiro é mais frio que março.' },
          { type: 'fill_gap',        sentence: 'This book is _____ (expensive) than that one.',       answer: 'more expensive', hint: 'Comparativo de adjetivo longo',          explanation: '"Expensive" (3 sílabas) → more expensive. Nunca "expensiver".' },
          { type: 'fill_gap',        sentence: 'My new phone is _____ (good) than the old one.',      answer: 'better',    hint: 'Comparativo irregular de "good"',          explanation: '"Good" tem comparativo irregular: better (não "more good" ou "gooder").' },
          { type: 'fix_error',       sentence: 'London is more big than Dublin.',                     answer: 'London is bigger than Dublin.',            hint: '"Big" é curto — use -er',     explanation: '"Big" é um adjetivo curto — comparativo: bigger. "More big" está errado.' },
          { type: 'fix_error',       sentence: 'This is more easy than I thought.',                   answer: 'This is easier than I thought.',           hint: '"Easy" → comparativo com regra de -y', explanation: 'Adjetivos terminados em consoante + y: troque y por i e adicione -er. easy → easier.' },
          { type: 'read_answer',     passage: 'Leo compared two apartments. The first one is bigger and cheaper, but the second is more modern and more comfortable. The first is closer to work, but the second has a better view.', question: 'Which apartment is more comfortable?', answer: 'the second', explanation: 'O texto diz: "the second is more modern and more comfortable."' },
        ],
      },

      // ── Topic 3 — Superlative adjectives ─────────────────────────────────
      {
        title: 'Superlative adjectives (the -est / the most)',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'Mount Everest is _____ mountain in the world.',       answer: 'the highest', options: ['the highest', 'the most high', 'higher'], explanation: 'Adjetivos curtos formam o superlativo com "the + -est": high → the highest.' },
          { type: 'multiple_choice', sentence: 'That was _____ film I\'ve ever seen.',                answer: 'the most boring', options: ['the most boring', 'the boringest', 'most boring'], explanation: 'Adjetivos longos formam o superlativo com "the most + adjetivo": the most boring.' },
          { type: 'word_bank',       sentence: 'She is _____ student in the class.',                  answer: 'the best',  choices: ['the best', 'the most good', 'the goodest', 'better'], explanation: '"Good" tem superlativo irregular: the best (não "the most good" ou "the goodest").' },
          { type: 'word_bank',       sentence: 'This is _____ day of my life!',                       answer: 'the worst', choices: ['the worst', 'the most bad', 'the baddest', 'worse'], explanation: '"Bad" tem superlativo irregular: the worst (não "the most bad").' },
          { type: 'fill_gap',        sentence: 'It was _____ (hot) day of the year.',                 answer: 'the hottest', hint: 'CVC → dobre a consoante final + -est',   explanation: '"Hot" (CVC: consoante-vogal-consoante) → dobra o t: the hottest.' },
          { type: 'fill_gap',        sentence: 'He is _____ (popular) person in the office.',         answer: 'the most popular', hint: 'Adjetivo longo → "the most"',          explanation: '"Popular" (3 sílabas) → superlativo: the most popular.' },
          { type: 'fill_gap',        sentence: 'This is _____ (easy) exercise in the book.',          answer: 'the easiest', hint: 'Consoante + y → the + i + est',           explanation: 'easy → the easiest. Consoante + y: troque y por i e adicione -est.' },
          { type: 'fix_error',       sentence: 'This is the most cheap restaurant in town.',          answer: 'This is the cheapest restaurant in town.', hint: '"Cheap" é curto — use -est', explanation: '"Cheap" (1 sílaba) = adjetivo curto → the cheapest (não "the most cheap").' },
          { type: 'fix_error',       sentence: 'She is the most tall girl in the team.',              answer: 'She is the tallest girl in the team.',    hint: '"Tall" é curto — use -est',  explanation: '"Tall" (1 sílaba) → the tallest. Não se usa "the most tall".' },
          { type: 'read_answer',     passage: 'The Amazon is the largest river in the world. Brazil has the most biodiverse ecosystem on the planet. São Paulo is the most populated city in South America and one of the busiest in the world.', question: 'What is the Amazon described as?', answer: 'the largest river in the world', explanation: 'O texto diz: "The Amazon is the largest river in the world."' },
        ],
      },
    ],
  },

  // ── Module 8 — Past Simple ───────────────────────────────────────────────
  {
    title: 'Past Simple',
    topics: [
      // ── Topic 1 — Past Simple: was / were ────────────────────────────────
      {
        title: 'Past Simple — verb To Be (was / were)',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'Yesterday I _____ very tired.',                      answer: 'was',       options: ['was', 'were', 'am'],                 explanation: '"Was" é o passado de "is/am" — usado com I, he, she, it.' },
          { type: 'multiple_choice', sentence: 'They _____ at the beach last weekend.',               answer: 'were',      options: ['were', 'was', 'are'],               explanation: '"Were" é o passado de "are" — usado com you, we, they.' },
          { type: 'word_bank',       sentence: 'The weather _____ perfect last summer.',              answer: 'was',       choices: ['was', 'were', 'is', 'be'],           explanation: '"The weather" é singular → "was" (passado de "is").' },
          { type: 'word_bank',       sentence: 'We _____ happy about the result.',                    answer: 'were',      choices: ['were', 'was', 'are', 'be'],          explanation: '"We" (plural) → "were" no passado.' },
          { type: 'fill_gap',        sentence: 'He _____ (not) at the party last night.',             answer: "wasn't",    hint: 'Negativa no passado com he',             explanation: '"Wasn\'t" = was not — negativa do passado com he/she/it/I.' },
          { type: 'fill_gap',        sentence: 'A: _____ you at school yesterday? B: Yes, I was.',   answer: 'Were',      hint: 'Pergunta no passado com "you"',           explanation: '"Were you...?" é a pergunta do passado com "you".' },
          { type: 'fill_gap',        sentence: 'The children _____ (not) quiet during the film.',     answer: "weren't",   hint: 'Negativa no passado com plural',          explanation: '"Weren\'t" = were not — negativa do passado com we/you/they.' },
          { type: 'fix_error',       sentence: 'He were very nervous before the exam.',               answer: 'He was very nervous before the exam.',    hint: '"He" usa "was" no passado',  explanation: '"He" (singular) usa "was" no passado, não "were".' },
          { type: 'fix_error',       sentence: 'They was late for the meeting.',                      answer: 'They were late for the meeting.',          hint: '"They" usa "were" no passado', explanation: '"They" (plural) usa "were" no passado, não "was".' },
          { type: 'read_answer',     passage: 'Last Saturday, Ana and her friends were at a theme park. The weather wasn\'t great, but they were happy. Ana was scared on the roller coaster. Her friends were brave!', question: 'How did Ana feel on the roller coaster?', answer: 'scared', explanation: 'O texto diz: "Ana was scared on the roller coaster."' },
        ],
      },

      // ── Topic 2 — Past Simple: regular verbs ─────────────────────────────
      {
        title: 'Past Simple — regular verbs',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'She _____ dinner at 7 pm yesterday.',                answer: 'cooked',    options: ['cooked', 'cook', 'cooks'],            explanation: 'Verbos regulares formam o passado simples adicionando -ed: cook → cooked.' },
          { type: 'multiple_choice', sentence: 'I _____ my keys this morning.',                       answer: 'dropped',   options: ['dropped', 'droped', 'drop'],          explanation: 'Verbos CVC (consoante-vogal-consoante): dobre a consoante final + -ed: drop → dropped.' },
          { type: 'word_bank',       sentence: 'They _____ to music all night.',                      answer: 'listened',  choices: ['listened', 'listen', 'listened to', 'listenings'], explanation: 'listen → listened. Verbo regular: adicione -ed.' },
          { type: 'word_bank',       sentence: 'He _____ English for two years.',                     answer: 'studied',   choices: ['studied', 'studyed', 'study', 'studying'], explanation: 'Verbos terminados em consoante + y: troque y por i e adicione -ed: study → studied.' },
          { type: 'fill_gap',        sentence: 'I _____ (walk) to school this morning.',              answer: 'walked',    hint: 'Regular: + -ed',                         explanation: 'walk → walked. Verbo regular: adicione -ed.' },
          { type: 'fill_gap',        sentence: 'She _____ (dance) until midnight.',                   answer: 'danced',    hint: 'Termina em -e: adicione apenas -d',       explanation: 'Verbos terminados em -e silencioso: adicione apenas -d. dance → danced.' },
          { type: 'fill_gap',        sentence: 'We _____ (stop) at a café on the way.',               answer: 'stopped',   hint: 'CVC: dobre a consoante + -ed',            explanation: '"Stop" termina em CVC → dobre o p: stopped.' },
          { type: 'fix_error',       sentence: 'She goed to the market yesterday.',                   answer: 'She went to the market yesterday.',        hint: '"Go" é irregular no passado',  explanation: '"Go" é irregular — passado: "went" (não "goed").' },
          { type: 'fix_error',       sentence: 'I cryed during the film.',                            answer: 'I cried during the film.',                 hint: 'Consoante + y → ied',          explanation: '"Cry" termina em consoante + y → troque y por i + ed: cried (não "cryed").' },
          { type: 'read_answer',     passage: 'Last Sunday, Pedro woke up late, cooked a big breakfast, and called his mum. In the afternoon, he cleaned his apartment and watched a football match on TV. He relaxed all day!', question: 'What did Pedro do in the afternoon?', answer: 'cleaned his apartment and watched a football match', explanation: 'O texto diz: "he cleaned his apartment and watched a football match on TV."' },
        ],
      },

      // ── Topic 3 — Past Simple: irregular verbs Set 1 ─────────────────────
      {
        title: 'Past Simple — irregular verbs Set 1',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'I _____ a great film last night.',                    answer: 'saw',       options: ['saw', 'seed', 'seen'],               explanation: '"See" é irregular — passado simples: saw. (Não "seed" ou "seen" que é particípio).' },
          { type: 'multiple_choice', sentence: 'She _____ a new dress for the party.',                answer: 'bought',    options: ['bought', 'buyed', 'buyed'],           explanation: '"Buy" é irregular — passado simples: bought.' },
          { type: 'word_bank',       sentence: 'He _____ the bus to school this morning.',            answer: 'took',      choices: ['took', 'taked', 'taken', 'takes'],    explanation: '"Take" é irregular — passado simples: took.' },
          { type: 'word_bank',       sentence: 'We _____ lunch together at noon.',                    answer: 'had',       choices: ['had', 'haved', 'have', 'has'],        explanation: '"Have" é irregular — passado simples: had.' },
          { type: 'fill_gap',        sentence: 'She _____ (come) home very late yesterday.',          answer: 'came',      hint: 'Irregular: come → ?',                    explanation: '"Come" é irregular — passado simples: came.' },
          { type: 'fill_gap',        sentence: 'I _____ (know) the answer immediately.',              answer: 'knew',      hint: 'Irregular: know → ?',                    explanation: '"Know" é irregular — passado simples: knew.' },
          { type: 'fill_gap',        sentence: 'They _____ (go) to the beach last Saturday.',         answer: 'went',      hint: 'Irregular: go → ?',                      explanation: '"Go" é irregular — passado simples: went.' },
          { type: 'fix_error',       sentence: 'I gived her a birthday present.',                     answer: 'I gave her a birthday present.',           hint: '"Give" é irregular',          explanation: '"Give" é irregular — passado simples: gave (não "gived").' },
          { type: 'fix_error',       sentence: 'He thinked about it for a long time.',                answer: 'He thought about it for a long time.',     hint: '"Think" é irregular',          explanation: '"Think" é irregular — passado simples: thought (não "thinked").' },
          { type: 'read_answer',     passage: 'Last year, Camila took a trip to Europe. She went to Paris, Rome, and Barcelona. She saw many famous landmarks and ate amazing food. She spent three weeks travelling and came back exhausted but happy.', question: 'How long did Camila travel for?', answer: 'three weeks', explanation: 'O texto diz: "She spent three weeks travelling."' },
        ],
      },

      // ── Topic 4 — Past Simple: irregular verbs Set 2 ─────────────────────
      {
        title: 'Past Simple — irregular verbs Set 2',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'She _____ very fast and won the race.',               answer: 'ran',       options: ['ran', 'runned', 'run'],              explanation: '"Run" é irregular — passado simples: ran.' },
          { type: 'multiple_choice', sentence: 'I _____ him at the party last Friday.',               answer: 'met',       options: ['met', 'meeted', 'meet'],             explanation: '"Meet" é irregular — passado simples: met.' },
          { type: 'word_bank',       sentence: 'He _____ the guitar at the concert.',                 answer: 'played',    choices: ['played', 'plaid', 'play', 'plaied'],  explanation: '"Play" é regular — passado simples: played (+ed).' },
          { type: 'word_bank',       sentence: 'They _____ a great time at the wedding.',             answer: 'had',       choices: ['had', 'have', 'haved', 'has'],        explanation: '"Have a great time" no passado: had a great time.' },
          { type: 'fill_gap',        sentence: 'I _____ (write) a letter to my friend.',              answer: 'wrote',     hint: 'Irregular: write → ?',                   explanation: '"Write" é irregular — passado simples: wrote.' },
          { type: 'fill_gap',        sentence: 'She _____ (find) her lost keys under the sofa.',      answer: 'found',     hint: 'Irregular: find → ?',                    explanation: '"Find" é irregular — passado simples: found.' },
          { type: 'fill_gap',        sentence: 'He _____ (tell) me the news yesterday.',              answer: 'told',      hint: 'Irregular: tell → ?',                    explanation: '"Tell" é irregular — passado simples: told.' },
          { type: 'fix_error',       sentence: 'She weared a beautiful dress to the party.',          answer: 'She wore a beautiful dress to the party.', hint: '"Wear" é irregular',           explanation: '"Wear" é irregular — passado simples: wore (não "weared").' },
          { type: 'fix_error',       sentence: 'They singed a great song at the concert.',            answer: 'They sang a great song at the concert.',   hint: '"Sing" é irregular',           explanation: '"Sing" é irregular — passado simples: sang (não "singed").' },
          { type: 'read_answer',     passage: 'Yesterday Tom woke up early and made coffee. He read the news on his phone and then drove to work. At the office, he spoke to his boss and wrote three reports. He left work at 6 pm and met his friend for dinner.', question: 'How did Tom get to work?', answer: 'drove', explanation: 'O texto diz: "then drove to work."' },
        ],
      },

      // ── Topic 5 — Past Simple: questions ─────────────────────────────────
      {
        title: 'Past Simple — questions (Did + base form)',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: '_____ you go to the cinema last night?',              answer: 'Did',       options: ['Did', 'Was', 'Do'],                  explanation: '"Did" é o auxiliar para perguntas no Past Simple. Sempre seguido de verbo na forma base.' },
          { type: 'multiple_choice', sentence: 'What time _____ she arrive?',                         answer: 'did',       options: ['did', 'was', 'does'],               explanation: '"What time did she arrive?" — "did" é o auxiliar do Past Simple em perguntas.' },
          { type: 'word_bank',       sentence: '_____ they enjoy the film?',                          answer: 'Did',       choices: ['Did', 'Was', 'Were', 'Do'],          explanation: '"Did they enjoy?" — perguntas Past Simple usam "Did" para todos os sujeitos.' },
          { type: 'word_bank',       sentence: 'Where _____ you go on holiday?',                      answer: 'did',       choices: ['did', 'were', 'was', 'do'],          explanation: '"Where did you go?" — WH- + did + sujeito + verbo base.' },
          { type: 'fill_gap',        sentence: 'A: _____ he call you? B: No, he didn\'t.',            answer: 'Did',       hint: 'Pergunta Past Simple',                   explanation: '"Did he call you?" — pergunta Past Simple. Resposta negativa: "No, he didn\'t."' },
          { type: 'fill_gap',        sentence: 'A: Did she _____ (like) the gift? B: Yes, she did.', answer: 'like',      hint: 'Após "did", verbo na forma base',         explanation: 'Após "did", o verbo fica na forma base: like (não "liked").' },
          { type: 'fill_gap',        sentence: 'Why _____ you leave early yesterday?',                answer: 'did',       hint: 'WH- + auxiliar Past Simple',             explanation: '"Why did you leave?" — WH- + did + sujeito + verbo base.' },
          { type: 'fix_error',       sentence: 'Did she went to the party?',                          answer: 'Did she go to the party?',                 hint: 'Após "did", verbo na forma base', explanation: 'Depois de "did", o verbo fica na forma base: go (não "went").' },
          { type: 'fix_error',       sentence: 'What did he said to you?',                            answer: 'What did he say to you?',                  hint: 'Após "did", verbo na forma base', explanation: 'Depois de "did", o verbo fica na forma base: say (não "said").' },
          { type: 'read_answer',     passage: 'A: Did you have a good weekend? B: Yes, it was great! A: What did you do? B: I went to a concert and then had dinner with friends. A: Did you enjoy the concert? B: Loved it! The band played all their best songs.', question: 'What did person B do after the concert?', answer: 'had dinner with friends', explanation: 'O texto diz: "I went to a concert and then had dinner with friends."' },
        ],
      },
    ],
  },

  // ── Module 9 — Past Continuous & Obligation ──────────────────────────────
  {
    title: 'Past Continuous & Obligation',
    topics: [
      // ── Topic 1 — Past Continuous ─────────────────────────────────────────
      {
        title: 'Past Continuous — affirmative, negative & questions',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'At 8 pm, she _____ her favourite show.',              answer: 'was watching', options: ['was watching', 'watched', 'watches'], explanation: '"Was watching" = Past Continuous. Ação em andamento em um momento específico do passado.' },
          { type: 'multiple_choice', sentence: 'They _____ when the teacher arrived.',                answer: 'were talking', options: ['were talking', 'talked', 'were talk'],  explanation: '"Were talking" = Past Continuous com "they". Ação em andamento quando algo aconteceu.' },
          { type: 'word_bank',       sentence: 'I _____ at 10 pm — I was exhausted.',                answer: "was sleeping", choices: ["was sleeping", "slept", "sleep", "sleeping"], explanation: '"Was sleeping" = I + was + verbo-ing. Ação em andamento no passado.' },
          { type: 'word_bank',       sentence: 'He _____ a shower when the phone rang.',              answer: "was having",  choices: ["was having", "had", "have", "having"], explanation: '"Was having" = Past Continuous. Ação em andamento quando o telefone tocou.' },
          { type: 'fill_gap',        sentence: 'We _____ (not/work) yesterday — it was a holiday.',  answer: "weren't working", hint: 'Negativa Past Continuous com "we"',    explanation: '"Weren\'t working" = were not + working. Negativa do Past Continuous.' },
          { type: 'fill_gap',        sentence: '_____ she _____ (listen) to music?',                  answer: 'Was / listening', hint: 'Pergunta Past Continuous com "she"',  explanation: '"Was she listening?" — pergunta do Past Continuous com she/he/it.' },
          { type: 'fill_gap',        sentence: 'It _____ (snow) all night.',                          answer: "was snowing", hint: '"It" + Past Continuous',                 explanation: '"Was snowing" = it + was + verbo-ing. Descrevendo o clima no passado.' },
          { type: 'fix_error',       sentence: 'I were sleeping when you called.',                    answer: 'I was sleeping when you called.',          hint: '"I" usa "was" no passado',   explanation: '"I" (primeira pessoa) usa "was" no Past Continuous, não "were".' },
          { type: 'fix_error',       sentence: 'They was watching TV all evening.',                   answer: 'They were watching TV all evening.',       hint: '"They" usa "were"',           explanation: '"They" usa "were" no passado, não "was".' },
          { type: 'read_answer',     passage: 'At 6 pm yesterday, the whole family was busy. Dad was cooking in the kitchen. Mum was reading emails. The twins were doing homework, and the dog was sleeping in its basket.', question: 'What was dad doing at 6 pm?', answer: 'cooking', explanation: 'O texto diz: "Dad was cooking in the kitchen."' },
        ],
      },

      // ── Topic 2 — Past Continuous: while / when ───────────────────────────
      {
        title: 'Past Continuous — while / when clauses',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'I _____ TV when she called.',                         answer: 'was watching', options: ['was watching', 'watched', 'watch'],  explanation: '"Was watching" (ação em andamento) + "when she called" (ação que interrompeu).' },
          { type: 'multiple_choice', sentence: 'While he _____, it started to rain.',                  answer: 'was driving', options: ['was driving', 'drove', 'drives'],     explanation: '"While he was driving" = ação em andamento que foi interrompida ou ocorreu em paralelo.' },
          { type: 'word_bank',       sentence: 'She fell asleep _____ she was reading.',               answer: 'while',     choices: ['while', 'when', 'during', 'as soon'],  explanation: '"While" é usado com verbos — indica duas ações simultâneas. "While she was reading."' },
          { type: 'word_bank',       sentence: 'He dropped his phone _____ he was running.',           answer: 'while',     choices: ['while', 'when', 'as', 'after'],       explanation: '"While he was running" = ação em andamento durante a qual algo aconteceu.' },
          { type: 'fill_gap',        sentence: 'While they _____ (eat), the lights went out.',         answer: "were eating", hint: 'Past Continuous após "while"',            explanation: '"While they were eating" = ação em andamento. "The lights went out" = interrupção.' },
          { type: 'fill_gap',        sentence: 'I _____ (meet) him when I _____ (work) in Rio.',      answer: 'met / was working', hint: 'Passado simples (evento) + Continuous (contexto)', explanation: '"Met" = evento único no passado. "Was working" = contexto/situação em andamento.' },
          { type: 'fill_gap',        sentence: 'She _____ (check) her phone _____ the teacher was talking.', answer: 'was checking / while', hint: '"While" + ação em andamento',  explanation: '"She was checking her phone while the teacher was talking." — duas ações simultâneas.' },
          { type: 'fix_error',       sentence: 'While I walked home, it started raining.',            answer: 'While I was walking home, it started raining.', hint: '"While" + Past Continuous',  explanation: '"While" indica ação em andamento → Past Continuous: "While I was walking."' },
          { type: 'fix_error',       sentence: 'He was hurting his leg when he played football.',      answer: 'He hurt his leg when he was playing football.', hint: 'Evento = Past Simple; contexto = Continuous', explanation: '"Hurt his leg" = evento (Past Simple). "Was playing" = contexto em andamento (Continuous).' },
          { type: 'read_answer',     passage: 'While Marco was cooking dinner, his wife was setting the table. Their daughter was doing her homework when her friend called. While they were having dinner, the dog kept barking at the window.', question: 'What was Marco\'s wife doing while he cooked?', answer: 'setting the table', explanation: 'O texto diz: "his wife was setting the table."' },
        ],
      },

      // ── Topic 3 — Have to / don't have to ────────────────────────────────
      {
        title: "Have to / don't have to (obligation)",
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'You _____ a passport to travel abroad.',              answer: 'have to',   options: ['have to', 'must', 'need'],            explanation: '"Have to" indica obrigação externa (regra ou necessidade). Use com I/you/we/they.' },
          { type: 'multiple_choice', sentence: 'She _____ wear a uniform at her new job.',             answer: 'has to',    options: ['has to', 'have to', 'must to'],       explanation: '"Has to" é a forma de "have to" para he/she/it na terceira pessoa.' },
          { type: 'word_bank',       sentence: 'We _____ be here on Sunday. It\'s our day off.',      answer: "don't have to", choices: ["don't have to", "must not", "have to", "must"], explanation: '"Don\'t have to" = não é obrigação (é opcional). Diferente de "must not" (proibição).' },
          { type: 'word_bank',       sentence: 'He _____ work overtime this weekend.',                 answer: "doesn't have to", choices: ["doesn't have to", "don't have to", "mustn't", "hasn't to"], explanation: '"Doesn\'t have to" = não é obrigação para he/she/it. Ele pode, mas não precisa.' },
          { type: 'fill_gap',        sentence: 'Students _____ (have to) arrive before 8 am.',        answer: 'have to',   hint: 'Obrigação com "students" (plural)',        explanation: '"Have to" com sujeito plural: "Students have to arrive before 8 am."' },
          { type: 'fill_gap',        sentence: 'She _____ (not/have to) cook — her husband loves it.', answer: "doesn't have to", hint: 'Sem obrigação para "she"',            explanation: '"Doesn\'t have to" = não é necessário. Ela não precisa cozinhar.' },
          { type: 'fill_gap',        sentence: '_____ I _____ (have to) bring anything to the party?', answer: 'Do / have to', hint: 'Pergunta com "have to"',               explanation: '"Do I have to bring anything?" — pergunta sobre obrigação com I.' },
          { type: 'fix_error',       sentence: 'She have to finish the report today.',                 answer: 'She has to finish the report today.',      hint: '"She" usa "has to"',          explanation: '"She" (terceira pessoa singular) usa "has to", não "have to".' },
          { type: 'fix_error',       sentence: 'You must to study more.',                              answer: 'You must study more.',                     hint: '"Must" não usa "to"',          explanation: '"Must" é um modal — não usa "to". Correto: "You must study more."' },
          { type: 'read_answer',     passage: 'At Marina\'s company, employees have to arrive by 9 am. They don\'t have to wear formal clothes on Fridays. The managers have to attend a weekly meeting on Mondays. Interns don\'t have to travel, but they have to complete all assigned tasks.', question: 'Do employees have to wear formal clothes on Fridays? (yes/no)', answer: 'no', explanation: 'O texto diz: "They don\'t have to wear formal clothes on Fridays."' },
        ],
      },

      // ── Topic 4 — Should / shouldn't ─────────────────────────────────────
      {
        title: "Should / shouldn't (advice)",
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'You look tired. You _____ go to bed.',                answer: 'should',    options: ['should', 'must', 'have to'],          explanation: '"Should" dá conselho ou sugestão: "You should go to bed" = minha recomendação.' },
          { type: 'multiple_choice', sentence: 'You _____ smoke — it\'s terrible for your health.',   answer: "shouldn't", options: ["shouldn't", "mustn't", "don't have to"], explanation: '"Shouldn\'t" = conselho negativo: não é uma boa ideia fumar.' },
          { type: 'word_bank',       sentence: 'She _____ eat more vegetables.',                       answer: 'should',    choices: ['should', 'has to', 'must to', 'will'], explanation: '"Should" é conselho/recomendação — mais suave que "must" ou "have to".' },
          { type: 'word_bank',       sentence: 'He _____ drive so fast in the rain.',                  answer: "shouldn't", choices: ["shouldn't", "mustn't", "doesn't have to", "can't"], explanation: '"Shouldn\'t drive so fast" = conselho negativo: não é uma boa ideia.' },
          { type: 'fill_gap',        sentence: 'You _____ drink 8 glasses of water per day.',          answer: 'should',    hint: 'Conselho de saúde',                      explanation: '"Should" = conselho ou recomendação: beber água é bom para você.' },
          { type: 'fill_gap',        sentence: 'We _____ (not) waste food — people are hungry.',      answer: "shouldn't", hint: 'Conselho negativo com "we"',              explanation: '"Shouldn\'t" = conselho negativo. Desperdiçar comida não é uma boa ideia.' },
          { type: 'fill_gap',        sentence: '_____ I call her or send a message?',                  answer: 'Should',    hint: 'Pedindo conselho/sugestão',               explanation: '"Should I...?" é uma pergunta para pedir conselho ou opinião.' },
          { type: 'fix_error',       sentence: 'He shoulds exercise more.',                            answer: 'He should exercise more.',                hint: '"Should" não muda com he/she/it', explanation: '"Should" é modal e não recebe -s. Sempre "he should" (nunca "shoulds").' },
          { type: 'fix_error',       sentence: 'You should to eat less sugar.',                        answer: 'You should eat less sugar.',               hint: 'Modal + forma base (sem "to")', explanation: 'Depois de modais como "should", o verbo fica na forma base sem "to": should eat.' },
          { type: 'read_answer',     passage: 'Doctor\'s advice: You should eat more fruit and vegetables every day. You shouldn\'t skip breakfast. You should exercise for at least 30 minutes, three times a week. You shouldn\'t stay up past midnight. Sleep is essential.', question: 'How often should the patient exercise?', answer: 'three times a week', explanation: 'O texto diz: "exercise for at least 30 minutes, three times a week."' },
        ],
      },
    ],
  },

  // ── Module 10 — Future & First Conditionals ──────────────────────────────
  {
    title: 'Future & First Conditionals',
    topics: [
      // ── Topic 1 — Articles: the / zero article ────────────────────────────
      {
        title: 'Articles — the / zero article revisited',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'I love _____ music.',                                 answer: '—',         options: ['—', 'the', 'a'],                    explanation: 'Conceitos gerais e abstratos (music, love, life) não usam artigo: "I love music."' },
          { type: 'multiple_choice', sentence: '_____ sun rises in the east.',                        answer: 'The',       options: ['The', 'A', '—'],                    explanation: '"The sun" — só existe um sol. Usamos "the" com coisas únicas no universo.' },
          { type: 'word_bank',       sentence: 'She plays _____ piano beautifully.',                  answer: 'the',       choices: ['the', 'a', 'an', '—'],               explanation: '"Play the piano/the guitar" — instrumentos musicais usam "the".' },
          { type: 'word_bank',       sentence: '_____ breakfast is the most important meal.',         answer: '—',         choices: ['—', 'The', 'A', 'An'],               explanation: 'Refeições (breakfast, lunch, dinner) não usam artigo: "Breakfast is important."' },
          { type: 'fill_gap',        sentence: 'I go to _____ school by bus every day.',              answer: '—',         hint: 'Instituição — finalidade principal',      explanation: '"Go to school" = ir à escola (finalidade — estudar). Sem artigo neste sentido.' },
          { type: 'fill_gap',        sentence: 'I visited _____ school where my dad used to teach.',  answer: 'the',       hint: 'Escola específica',                       explanation: '"The school where my dad used to teach" = escola específica e identificada. Usa "the".' },
          { type: 'fill_gap',        sentence: 'She dreams of travelling _____ world one day.',       answer: 'the',       hint: 'Existe só um mundo',                      explanation: '"Travel the world" = único e específico. Use "the".' },
          { type: 'fix_error',       sentence: 'The life is too short to be unhappy.',                answer: 'Life is too short to be unhappy.',         hint: 'Conceito geral — sem artigo',  explanation: '"Life" como conceito geral não usa artigo: "Life is too short."' },
          { type: 'fix_error',       sentence: 'I play a guitar in a band.',                          answer: 'I play the guitar in a band.',             hint: 'Instrumento musical usa "the"',  explanation: '"Play the guitar" — instrumentos musicais usam "the". Não "a guitar".' },
          { type: 'read_answer',     passage: 'The Amazon river is the longest river in South America. People around the world know Brazil for its music, football, and natural beauty. Many tourists visit the country every year to see the natural wonders.', question: 'What is Brazil known for internationally?', answer: 'music, football, and natural beauty', explanation: 'O texto diz: "People around the world know Brazil for its music, football, and natural beauty."' },
        ],
      },

      // ── Topic 2 — Going to ────────────────────────────────────────────────
      {
        title: 'Going to — future plans & intentions',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'I _____ visit my grandparents this weekend.',         answer: 'am going to', options: ['am going to', 'will', 'going to'],   explanation: '"Am going to" expressa plano ou intenção já decidida: "I am going to visit."' },
          { type: 'multiple_choice', sentence: 'Look at those clouds! It _____ rain.',                answer: "is going to", options: ["is going to", "will", "rains"],      explanation: '"Is going to rain" = evidência visual indica que algo vai acontecer em breve.' },
          { type: 'word_bank',       sentence: 'They _____ move to a new apartment next month.',      answer: "are going to", choices: ["are going to", "will to", "going to", "will going to"], explanation: '"Are going to" = plano decidido para o futuro. "They are going to move."' },
          { type: 'word_bank',       sentence: 'He _____ study medicine at university.',              answer: "is going to", choices: ["is going to", "are going to", "will to", "going"], explanation: '"Is going to" = plano/intenção de he/she/it.' },
          { type: 'fill_gap',        sentence: 'We _____ (go) camping in July.',                      answer: "are going to go", hint: '"We" + going to + verbo base',          explanation: '"We are going to go camping in July." — plano já decidido.' },
          { type: 'fill_gap',        sentence: 'A: She _____ (not/come) to the party. B: Why not?',  answer: "isn't going to come", hint: 'Negativa de "going to" com she',        explanation: '"Isn\'t going to come" = plano negativo. Ela não vai vir.' },
          { type: 'fill_gap',        sentence: '_____ you _____ (travel) abroad this year?',          answer: 'Are / going to', hint: 'Pergunta com going to',                  explanation: '"Are you going to travel abroad this year?" — pergunta sobre planos.' },
          { type: 'fix_error',       sentence: 'She going to call you later.',                        answer: 'She is going to call you later.',          hint: 'Não esqueça o verbo "to be"', explanation: '"Going to" sempre precisa do verbo "to be": she IS going to call.' },
          { type: 'fix_error',       sentence: 'We are going to moved to a bigger house.',            answer: 'We are going to move to a bigger house.',  hint: 'Após "going to", verbo na forma base', explanation: 'Após "going to", o verbo fica na forma base: move (não "moved").' },
          { type: 'read_answer',     passage: 'Lisa has lots of plans for the summer. She\'s going to take a Portuguese course, visit her cousin in Portugal, and start learning how to cook. She isn\'t going to work in August — she wants to rest.', question: 'Is Lisa going to work in August? (yes/no)', answer: 'no', explanation: 'O texto diz: "She isn\'t going to work in August."' },
        ],
      },

      // ── Topic 3 — Will ────────────────────────────────────────────────────
      {
        title: 'Will — predictions & spontaneous decisions',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'I think it _____ tomorrow.',                          answer: "will rain", options: ["will rain", "is going to rain", "rains"], explanation: '"Will" é usado para previsões baseadas em opinião pessoal ou crença: "I think it will rain."' },
          { type: 'multiple_choice', sentence: 'A: The phone is ringing. B: I _____ get it!',         answer: "I'll",      options: ["I'll", "I'm going to", "I'm"],       explanation: '"I\'ll get it" = decisão espontânea (feita no momento de falar). Não "going to".' },
          { type: 'word_bank',       sentence: 'Don\'t worry — everything _____ fine.',               answer: "will be",   choices: ["will be", "is going to be", "going to", "will being"], explanation: '"Will be" = previsão otimista/promessa. "Don\'t worry, it will be fine."' },
          { type: 'word_bank',       sentence: 'I promise I _____ you.',                              answer: "won't forget", choices: ["won't forget", "will not forgetting", "don't forget", "will forgot"], explanation: '"Won\'t forget" = will not + forma base. Promessa negativa.' },
          { type: 'fill_gap',        sentence: 'A: I\'m hungry. B: I _____ (make) you a sandwich.',  answer: "I'll make", hint: 'Decisão espontânea no momento',           explanation: '"I\'ll make you a sandwich" = decisão feita no momento de falar.' },
          { type: 'fill_gap',        sentence: 'Scientists think robots _____ (do) most jobs by 2050.', answer: "will do", hint: 'Previsão para o futuro distante',           explanation: '"Will do" = previsão futura baseada em opinião. "Robots will do most jobs."' },
          { type: 'fill_gap',        sentence: '_____ you help me carry this? It\'s heavy!',          answer: "Will",      hint: 'Pedido educado usando "will"',            explanation: '"Will you help me?" = pedido educado usando "will".' },
          { type: 'fix_error',       sentence: 'She will comes to the party.',                        answer: 'She will come to the party.',              hint: 'Após "will", verbo na forma base', explanation: 'Após "will", o verbo fica na forma base: come (não "comes").' },
          { type: 'fix_error',       sentence: 'I will to call you later.',                           answer: "I'll call you later.",                     hint: '"Will" não usa "to"',           explanation: '"Will" é modal — não usa "to". Correto: "I\'ll call you later."' },
          { type: 'read_answer',     passage: 'Forecast for the week: Monday will be sunny and warm. On Tuesday, there will be some clouds but no rain. Wednesday will bring heavy rain. By the weekend, temperatures will drop significantly.', question: 'What will the weather be like on Monday?', answer: 'sunny and warm', explanation: 'O texto diz: "Monday will be sunny and warm."' },
        ],
      },

      // ── Topic 4 — Going to vs. Will ──────────────────────────────────────
      {
        title: 'Going to vs. Will',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'A: What are your plans for summer? B: I _____ travel to Europe.', answer: "I'm going to", options: ["I'm going to", "I'll", "I'm"], explanation: '"Going to" para planos já decididos antes do momento de falar.' },
          { type: 'multiple_choice', sentence: 'A: The printer is broken. B: I _____ call IT now.',   answer: "I'll",      options: ["I'll", "I'm going to", "I'm"],       explanation: '"Will" para decisões espontâneas feitas no momento de falar.' },
          { type: 'word_bank',       sentence: 'Look! She _____ fall — the road is icy!',              answer: "is going to fall", choices: ["is going to fall", "will fall", "falls", "will to fall"], explanation: '"Going to" quando há evidência clara de que algo vai acontecer em breve.' },
          { type: 'word_bank',       sentence: 'I think Brazil _____ win the next World Cup.',         answer: "will win",  choices: ["will win", "is going to win", "going to win", "wins"], explanation: '"Will" para previsões baseadas em opinião pessoal.' },
          { type: 'fill_gap',        sentence: 'I\'ve already booked the tickets. We _____ (fly) in July.', answer: "are going to fly", hint: 'Plano já confirmado',               explanation: '"Going to fly" — plano já decidido e confirmado (passagens compradas).' },
          { type: 'fill_gap',        sentence: 'A: Can you help? B: Sure, I _____ (do) it right now.', answer: "I'll do", hint: 'Decisão tomada agora para ajudar',           explanation: '"I\'ll do it" = decisão espontânea feita no momento de responder.' },
          { type: 'fill_gap',        sentence: 'He\'s been training hard. He _____ (win) the race.',   answer: "is going to win", hint: 'Evidência presente → previsão com "going to"', explanation: '"Going to win" — há evidência (treinamento intenso) que indica resultado provável.' },
          { type: 'fix_error',       sentence: 'A: The phone is ringing! B: I\'m going to answer it.',  answer: "A: The phone is ringing! B: I'll answer it.", hint: 'Decisão espontânea = will', explanation: 'Decisão feita no momento = "will/\'ll". "Going to" é para planos anteriores.' },
          { type: 'fix_error',       sentence: 'I already bought tickets. I think I\'ll go to the concert.',  answer: 'I already bought tickets. I\'m going to go to the concert.', hint: 'Plano decidido = going to', explanation: 'Com ingressos comprados, o plano já está decidido: "I\'m going to go to the concert."' },
          { type: 'read_answer',     passage: 'Tom: I\'m going to start a new job next Monday — everything is confirmed. His friend: Great! I\'ll come and celebrate with you this weekend then — how about Saturday? Tom: Sure! I think it will be a great year.', question: 'When does Tom start his new job?', answer: 'next Monday', explanation: 'O texto diz: "I\'m going to start a new job next Monday."' },
        ],
      },

      // ── Topic 5 — Zero + First Conditional ───────────────────────────────
      {
        title: 'Zero Conditional + First Conditional (intro)',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'If you heat water to 100°C, it _____.',               answer: 'boils',     options: ['boils', 'will boil', 'boiled'],       explanation: 'Zero Conditional: fact/truth. If + present → present. "If you heat water, it boils."' },
          { type: 'multiple_choice', sentence: 'If it rains tomorrow, I _____ my umbrella.',           answer: "I'll bring", options: ["I'll bring", "bring", "I brought"],  explanation: 'First Conditional: possível futuro. If + present → will. "If it rains, I\'ll bring..."' },
          { type: 'word_bank',       sentence: 'If you study hard, you _____ the exam.',               answer: "will pass", choices: ["will pass", "pass", "passed", "passing"], explanation: 'First Conditional: resultado provável no futuro. If + present → will + base.' },
          { type: 'word_bank',       sentence: 'Plants die if they _____ water.',                      answer: "don't get", choices: ["don't get", "won't get", "didn't get", "get"], explanation: 'Zero Conditional: fato geral. If + present → present (afirmativo ou negativo).' },
          { type: 'fill_gap',        sentence: 'If she _____ (be) late, the boss will be angry.',      answer: 'is',        hint: 'First Conditional: if-clause no presente',   explanation: 'First Conditional: a cláusula "if" usa o presente simples.' },
          { type: 'fill_gap',        sentence: 'If you touch that, it _____ (burn) you.',              answer: 'will burn', hint: 'Resultado provável = will + base',         explanation: 'First Conditional: resultado provável = "will burn". If you touch it → result.' },
          { type: 'fill_gap',        sentence: 'If water freezes, it _____ (turn) into ice.',          answer: 'turns',     hint: 'Zero Conditional: verdade científica',    explanation: 'Zero Conditional: fato científico universal → use present simple em ambas as cláusulas.' },
          { type: 'fix_error',       sentence: 'If it will rain, I will stay home.',                   answer: 'If it rains, I will stay home.',           hint: 'If-clause usa presente (não will)',  explanation: 'Na cláusula "if" do First Conditional, usamos presente simples (não "will").' },
          { type: 'fix_error',       sentence: 'If you pressed the button, the door opens.',           answer: 'If you press the button, the door opens.',  hint: 'Zero Conditional — ambas no presente', explanation: 'Zero Conditional usa presente em ambas as cláusulas: "press / opens."' },
          { type: 'read_answer',     passage: 'There are two main types of conditional in English. The Zero Conditional states facts: "If you mix blue and yellow, you get green." The First Conditional describes possible future results: "If you study tonight, you will pass the exam." The main difference is whether we are stating facts or possible outcomes.', question: 'What does the First Conditional describe?', answer: 'possible future results', explanation: 'O texto diz: "The First Conditional describes possible future results."' },
        ],
      },
    ],
  },

  // ── Module 11 — Connectors, Movement & Vocabulary ───────────────────────
  {
    title: 'Connectors, Movement & Vocabulary',
    topics: [
      // ── Topic 1 — Conjunctions ────────────────────────────────────────────
      {
        title: 'Conjunctions (and, but, or, so, because, although)',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'I was tired, _____ I went to bed early.',             answer: 'so',        options: ['so', 'but', 'because'],              explanation: '"So" indica resultado ou consequência: "I was tired, so I went to bed early."' },
          { type: 'multiple_choice', sentence: 'She loves coffee _____ she can\'t drink it at night.', answer: 'but',      options: ['but', 'and', 'so'],                  explanation: '"But" indica contraste ou contradição: "She loves coffee but can\'t drink it at night."' },
          { type: 'word_bank',       sentence: 'I missed the bus _____ I was late for work.',          answer: 'because',   choices: ['because', 'so', 'but', 'although'],   explanation: '"Because" indica a causa ou motivo: "I missed the bus because I woke up late."' },
          { type: 'word_bank',       sentence: 'You can have tea _____ coffee — which do you prefer?', answer: 'or',       choices: ['or', 'and', 'but', 'so'],            explanation: '"Or" é usado para dar opções ou alternativas.' },
          { type: 'fill_gap',        sentence: 'She studied hard _____ she failed the exam.',          answer: 'but',       hint: 'Contraste inesperado',                   explanation: '"But" indica contraste — ela estudou, mas mesmo assim reprovou.' },
          { type: 'fill_gap',        sentence: 'He didn\'t eat _____ he wasn\'t hungry.',              answer: 'because',   hint: 'Motivo/razão',                          explanation: '"Because" indica a razão: "He didn\'t eat because he wasn\'t hungry."' },
          { type: 'fill_gap',        sentence: '_____ it was raining, we still went for a walk.',      answer: 'Although',  hint: 'Concessão — apesar de',                 explanation: '"Although" = apesar de. Indica contraste surpreendente no início da frase.' },
          { type: 'fix_error',       sentence: 'I like tea and coffee, but I prefer tea.',              answer: 'I like tea and coffee, but I prefer tea.', hint: 'Esta frase está correta', explanation: 'A frase está correta: "and" une dois substantivos, "but" introduz contraste.' },
          { type: 'fix_error',       sentence: 'She was tired, because she rested.',                   answer: 'She was tired, so she rested.',            hint: '"Because" = causa; "so" = resultado',  explanation: '"So" indica resultado. "Because" indicaria que o cansaço era a causa do descanso (faz mais sentido com "so").' },
          { type: 'read_answer',     passage: 'Tom wanted to go to the gym, but he was too tired. He decided to rest because he had worked all day. Although he felt guilty, he stayed home and watched TV. He fell asleep early, so he woke up refreshed the next morning.', question: 'Why did Tom decide to rest?', answer: 'because he had worked all day', explanation: 'O texto diz: "He decided to rest because he had worked all day."' },
        ],
      },

      // ── Topic 2 — Prepositions of movement + phrasal verbs intro ──────────
      {
        title: 'Prepositions of movement + phrasal verbs intro',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'She ran _____ the finish line.',                       answer: 'across',    options: ['across', 'through', 'along'],        explanation: '"Across" = atravessar (de um lado ao outro de uma superfície).' },
          { type: 'multiple_choice', sentence: 'The train goes _____ the tunnel.',                     answer: 'through',   options: ['through', 'across', 'over'],         explanation: '"Through" = passar por dentro de algo (de um lado ao outro de um espaço fechado).' },
          { type: 'word_bank',       sentence: 'He climbed _____ the fence.',                          answer: 'over',      choices: ['over', 'through', 'across', 'into'],  explanation: '"Over" = passar por cima de algo.' },
          { type: 'word_bank',       sentence: 'The dog ran _____ the house.',                         answer: 'into',      choices: ['into', 'out of', 'over', 'through'],   explanation: '"Into" = movimento para dentro de um lugar.' },
          { type: 'fill_gap',        sentence: 'Walk _____ the bridge and turn right.',                 answer: 'across',    hint: 'Atravessar (ponte, rua)',                explanation: '"Across" = de um lado ao outro. "Walk across the bridge."' },
          { type: 'fill_gap',        sentence: 'The cat jumped _____ the table.',                      answer: 'onto',      hint: 'Movimento para cima de uma superfície',  explanation: '"Onto" = movimento para cima de uma superfície. "Jumped onto the table."' },
          { type: 'fill_gap',        sentence: 'Can you _____ (turn off) the lights please?',           answer: 'turn off',  hint: 'Phrasal verb: desligar',                explanation: '"Turn off" = desligar. "Turn off the lights." Um dos phrasal verbs mais comuns.' },
          { type: 'fix_error',       sentence: 'She ran through the bridge quickly.',                   answer: 'She ran across the bridge quickly.',       hint: 'Atravessar = "across"',    explanation: '"Across" = atravessar de um lado ao outro. "Through" é para espaços fechados.' },
          { type: 'fix_error',       sentence: 'Please turn up the TV — it\'s too loud.',               answer: 'Please turn down the TV — it\'s too loud.', hint: '"Turn down" = baixar volume',  explanation: '"Turn down" = baixar volume. "Turn up" = aumentar volume. Aqui precisa-se "turn down".' },
          { type: 'read_answer',     passage: 'To get to the park: Go along Main Street, walk across the bridge over the river, then go through the gates. Turn left and walk up the hill. The café is at the top.', question: 'What is at the top of the hill?', answer: 'the café', explanation: 'O texto diz: "The café is at the top."' },
        ],
      },

      // ── Topic 3 — Subject questions ───────────────────────────────────────
      {
        title: 'Subject questions (Who made this? What happened?)',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: '_____ lives next door to you?',                        answer: 'Who',       options: ['Who', 'Whom', 'What'],               explanation: '"Who" pergunta sobre pessoas quando o WH-word é o sujeito da frase.' },
          { type: 'multiple_choice', sentence: '_____ happened at the party?',                          answer: 'What',      options: ['What', 'Who', 'Which'],              explanation: '"What happened?" = pergunta de sujeito sobre um evento. Não usa auxiliar.' },
          { type: 'word_bank',       sentence: '_____ made this delicious cake?',                       answer: 'Who',       choices: ['Who', 'Whom', 'Whose', 'Which'],      explanation: '"Who made this cake?" — sujeito da pergunta. Não usa "did": "Who made" (não "Who did make").' },
          { type: 'word_bank',       sentence: '_____ caused the accident?',                            answer: 'What',      choices: ['What', 'Who', 'Why', 'How'],          explanation: '"What caused the accident?" — sujeito "what" sem auxiliar.' },
          { type: 'fill_gap',        sentence: '_____ called you so late last night?',                  answer: 'Who',       hint: 'Sujeito da pergunta = pessoa',           explanation: '"Who called you?" — "who" é o sujeito. Não precisa de "did".' },
          { type: 'fill_gap',        sentence: '_____ is happening in there? It\'s very noisy!',        answer: 'What',      hint: 'Pergunta sobre evento/situação',          explanation: '"What is happening?" — pergunta de sujeito sobre uma situação.' },
          { type: 'fill_gap',        sentence: '_____ gave you that idea?',                             answer: 'Who',       hint: 'Sujeito (pessoa) da pergunta',            explanation: '"Who gave you that idea?" — "who" é o sujeito. Sem auxiliar.' },
          { type: 'fix_error',       sentence: 'Who did call you?',                                     answer: 'Who called you?',                          hint: 'Pergunta de sujeito — sem auxiliar', explanation: 'Perguntas de sujeito com "who/what" não usam auxiliar "did": "Who called you?"' },
          { type: 'fix_error',       sentence: 'What did happen at school?',                            answer: 'What happened at school?',                 hint: '"What happened" — sem "did"',         explanation: '"What happened?" — pergunta de sujeito. Não usa auxiliar "did".' },
          { type: 'read_answer',     passage: 'Police report: At 9 pm, someone broke into the bakery on Oak Street. A neighbour heard a loud noise and called the police. The police arrived quickly. Nothing was stolen. The owner will speak to detectives tomorrow.', question: 'Who called the police?', answer: 'a neighbour', explanation: 'O texto diz: "A neighbour heard a loud noise and called the police."' },
        ],
      },

      // ── Topic 4 — Vocabulary: travel, shopping & technology ──────────────
      {
        title: 'Vocabulary chunks — travel, shopping & technology',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'Can I _____ a single ticket to London, please?',       answer: 'have',      options: ['have', 'take', 'get'],               explanation: '"Can I have a ticket?" é a expressão mais natural para comprar uma passagem.' },
          { type: 'multiple_choice', sentence: 'How _____ is it from here to the airport?',             answer: 'far',       options: ['far', 'long', 'much'],               explanation: '"How far" pergunta sobre distância. "How far is it?" = Qual a distância?' },
          { type: 'word_bank',       sentence: 'Excuse me, where is the _____ (guichê)?',              answer: 'check-in',  choices: ['check-in', 'check out', 'departure', 'arrival'], explanation: '"Check-in" = guichê/processo de registro para voo ou hotel.' },
          { type: 'word_bank',       sentence: 'This phone is out of _____ — I need to charge it.',    answer: 'battery',   choices: ['battery', 'signal', 'memory', 'data'],  explanation: '"Out of battery" = sem bateria. "I need to charge it" = preciso carregar.' },
          { type: 'fill_gap',        sentence: 'I need to _____ the bill — can I pay by card?',        answer: 'pay',       hint: '"Pay the bill" = pagar a conta',          explanation: '"Pay the bill" é a expressão para pagar a conta em inglês.' },
          { type: 'fill_gap',        sentence: 'My phone is _____ — I can\'t make calls.',              answer: 'out of signal', hint: 'Sem sinal de celular',                explanation: '"Out of signal" = sem sinal. Não consigo fazer ligações.' },
          { type: 'fill_gap',        sentence: 'Can I try this _____ ? I want to see if it fits.',     answer: 'on',        hint: 'Phrasal verb: experimentar roupa',        explanation: '"Try on" = experimentar roupa. "Can I try this on?" = Posso experimentar isso?' },
          { type: 'fix_error',       sentence: 'I want to book a travel to Italy.',                    answer: 'I want to book a trip to Italy.',          hint: '"Trip" ou "holiday" — não "travel"',  explanation: '"Travel" é verbo ou substantivo incontável. Para viagem específica, use "trip" ou "holiday".' },
          { type: 'fix_error',       sentence: 'My phone has no battery — it\'s dead.',                answer: 'My phone has no battery — it\'s dead.',    hint: 'Esta frase está correta',  explanation: '"My phone has no battery, it\'s dead" é completamente correto e natural em inglês.' },
          { type: 'read_answer',     passage: 'At the airport: "Excuse me, where is the check-in for flight BR204?" "It\'s at counter 12. You should hurry — boarding starts in 30 minutes." "Thank you! Can I also charge my phone somewhere? It\'s almost dead."', question: 'When does boarding start?', answer: 'in 30 minutes', explanation: 'O texto diz: "boarding starts in 30 minutes."' },
        ],
      },

      // ── Topic 5 — Vocabulary: home, work & relationships ─────────────────
      {
        title: 'Vocabulary chunks — home, work & relationships',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'They _____ up last year after 5 years together.',      answer: 'broke',     options: ['broke', 'split', 'finished'],         explanation: '"Break up" = separar-se. Past: broke up. "They broke up last year."' },
          { type: 'multiple_choice', sentence: 'She _____ promoted to manager last month.',             answer: 'was',       options: ['was', 'got', 'has'],                  explanation: '"Was promoted" = passiva formal de "to promote". Também: "got promoted" é igualmente correto.' },
          { type: 'word_bank',       sentence: 'He _____ a good impression at the interview.',          answer: 'made',      choices: ['made', 'did', 'gave', 'had'],         explanation: '"Make a good impression" é a colocação correta — não "do" ou "give".' },
          { type: 'word_bank',       sentence: 'My parents _____ up when I was 10.',                    answer: 'split',     choices: ['split', 'broke', 'separated', 'divided'], explanation: '"Split up" = separar-se. Intercambiável com "break up" em muitos contextos.' },
          { type: 'fill_gap',        sentence: 'Can you _____ (take) care of my plants while I\'m away?', answer: 'take',   hint: '"Take care of" = cuidar de',            explanation: '"Take care of" = cuidar de. "Can you take care of my plants?"' },
          { type: 'fill_gap',        sentence: 'We need to _____ a decision about the new office.',     answer: 'make',      hint: '"Make a decision" = decidir',            explanation: '"Make a decision" é a colocação correta. Não "do a decision".' },
          { type: 'fill_gap',        sentence: 'He got _____ with his neighbours — they argue all the time.', answer: "fed up", hint: '"Fed up with" = farto/cansado de',      explanation: '"Get fed up with" = ficar farto ou cansado de. Muito comum em inglês informal.' },
          { type: 'fix_error',       sentence: 'She did a great impression at the interview.',           answer: 'She made a great impression at the interview.', hint: '"Make an impression" = causar impressão', explanation: '"Make an impression" é a colocação correta. Não "do an impression".' },
          { type: 'fix_error',       sentence: 'Can you look the children while I go out?',             answer: 'Can you look after the children while I go out?', hint: '"Look after" = cuidar de',  explanation: '"Look after" = cuidar de. "Look" sozinho não tem esse significado.' },
          { type: 'read_answer',     passage: 'Ana started a new job last month. She made a great impression on her boss and got along well with her colleagues. She has to take care of many different tasks, but she loves the challenge. She feels at home in the new company.', question: 'How does Ana feel in her new company?', answer: 'at home', explanation: 'O texto diz: "She feels at home in the new company."' },
        ],
      },

      // ── Topic 6 — Novice Review ───────────────────────────────────────────
      {
        title: 'Novice Module Review — consolidação A1/A2',
        pronunciation: [],
        grammar: [
          { type: 'multiple_choice', sentence: 'She _____ TV when I called her.',                      answer: 'was watching', options: ['was watching', 'watched', 'watch'],  explanation: 'Past Continuous: ação em andamento no passado. "She was watching TV when I called."' },
          { type: 'multiple_choice', sentence: 'If it _____ tomorrow, we\'ll cancel the trip.',        answer: 'rains',     options: ['rains', 'will rain', 'rained'],       explanation: 'First Conditional: "if" + present simple → will. "If it rains, we\'ll cancel."' },
          { type: 'word_bank',       sentence: 'She _____ go to bed early because she has an exam.',   answer: 'should',    choices: ['should', 'must to', 'have', 'going to'], explanation: '"Should" = conselho. Ela deveria dormir cedo por causa do exame.' },
          { type: 'word_bank',       sentence: 'There _____ many people at the concert last night.',    answer: 'were',      choices: ['were', 'was', 'are', 'is'],           explanation: '"Were" = passado de "are" — para plural no passado.' },
          { type: 'fill_gap',        sentence: 'He _____ (not/have to) work on Sundays.',               answer: "doesn't have to", hint: 'Sem obrigação com "he"',             explanation: '"Doesn\'t have to" = não é obrigação para he/she/it.' },
          { type: 'fill_gap',        sentence: 'I _____ (go) to the gym three times a week. (hábito)', answer: 'go',        hint: 'Hábito recorrente = Present Simple',      explanation: 'Hábitos usam Present Simple: "I go to the gym three times a week."' },
          { type: 'fill_gap',        sentence: 'She is _____ (tall) her sister.',                       answer: 'taller than', hint: 'Comparativo de adjetivo curto',          explanation: '"Taller than" = comparativo de "tall" — adjetivo curto + -er + than.' },
          { type: 'fix_error',       sentence: 'He don\'t know the answer.',                            answer: "He doesn't know the answer.",             hint: '"He" usa "doesn\'t"',         explanation: '"He" (terceira pessoa singular) usa "doesn\'t" na negativa.' },
          { type: 'fix_error',       sentence: 'What she doing right now?',                             answer: 'What is she doing right now?',             hint: 'Precisa do auxiliar "is"',    explanation: 'Present Continuous: sempre precisa do verbo "to be". "What is she doing?"' },
          { type: 'read_answer',     passage: 'Paulo has been studying English for two years. He usually studies in the evenings. Last night, he was doing exercises when his phone rang. He\'s going to take an English exam next month. If he passes, he\'ll apply for a job at an international company.', question: 'What will Paulo do if he passes the exam?', answer: 'apply for a job at an international company', explanation: 'O texto diz: "If he passes, he\'ll apply for a job at an international company."' },
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// INTER — B1 / B2  (70 units across 11 modules)
// Grammar: 10 per topic | Pronunciation: 5 per topic
// ─────────────────────────────────────────────────────────────────────────────

const INTER_MODULES: Module[] = [
  // ── Module 1 — Present Perfect ──────────────────────────────────────────
  {
    title: 'Present Perfect',
    topics: [
      {
        title: 'Present Perfect — affirmative & negative',
        pronunciation: [
          { type: 'repeat',       text: 'I have just finished the report.',          focus: 'reduction of "have" → "ve"' },
          { type: 'listen_write', text: 'She has never been to London.',              focus: 'weak form of "has"' },
          { type: 'repeat',       text: 'They have already eaten dinner.',            focus: '"already" stress placement' },
          { type: 'listen_write', text: 'We haven\'t decided yet.',                  focus: 'negative contraction' },
          { type: 'repeat',       text: 'He has worked here for five years.',        focus: 'weak form reduction in connected speech' },
          { type: 'minimal_pairs', word1: 'ship', word2: 'sheep', target: 'word2', focus: '/ɪ/ vs /iː/ — short vs long vowel' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'She _____ (visit) Paris three times.',            answer: 'has visited',      options: ['has visited', 'visited', 'have visited'],       explanation: '"Has visited" is the present perfect with third person singular (she).' },
          { type: 'multiple_choice', sentence: 'I _____ (not finish) my homework yet.',           answer: "haven't finished", options: ["haven't finished", "didn't finish", "hasn't finished"], explanation: '"Haven\'t finished" is the present perfect negative for "I".' },
          { type: 'word_bank', sentence: 'They _____ just arrived from the airport.',             answer: 'have',             choices: ['have', 'has', 'had', 'are'],                    explanation: '"Have" is used in present perfect with they/we/you/I.' },
          { type: 'word_bank', sentence: 'He _____ already read that book.',                      answer: 'has',              choices: ['has', 'have', 'had', 'is'],                     explanation: '"Has" is used in present perfect with he/she/it.' },
          { type: 'fill_gap', sentence: 'I _____ (live) in this city for ten years.',             answer: 'have lived',       hint: 'Present perfect: have/has + past participle',       explanation: '"Have lived" = present perfect showing an action from past continuing to now.' },
          { type: 'fill_gap', sentence: 'She _____ (not call) me back yet.',                      answer: "hasn't called",    hint: 'Present perfect negative for she',                  explanation: '"Hasn\'t called" = "has not called" — present perfect negative for she.' },
          { type: 'fill_gap', sentence: 'We _____ (already book) the hotel.',                     answer: 'have already booked', hint: '"Already" goes between have and past participle', explanation: '"Have already booked" — "already" comes between "have" and the past participle.' },
          { type: 'fix_error', sentence: 'I have went to that restaurant before.',                answer: 'I have been to that restaurant before.',  hint: 'Past participle of "go"',         explanation: 'The past participle of "go" is "been" in the expression "have been to" (visited).' },
          { type: 'fix_error', sentence: 'She has finish her presentation.',                      answer: 'She has finished her presentation.',       hint: 'Past participle needed',         explanation: 'The present perfect uses the past participle: finish → finished.' },
          { type: 'read_answer', passage: 'The company has expanded rapidly over the past decade. It has opened offices in six countries and has hired over 500 new employees. The CEO has stated that further growth is planned.', question: 'How many countries does the company have offices in?', answer: 'six', explanation: 'The passage says "it has opened offices in six countries".' },
          { type: 'short_write', prompt: 'Write a sentence using the Present Perfect to describe something you have done recently.', example_answer: 'I have just finished reading a great book.', answer: '', hint: 'Use: have/has + past participle', explanation: 'The Present Perfect connects a past action to the present. "Just" means very recently.' },
        ],
      },
      {
        title: 'Present Perfect — yes/no questions + short answers',
        pronunciation: [
          { type: 'repeat',       text: 'Have you ever tried sushi?',                focus: 'weak form of "have"' },
          { type: 'listen_write', text: 'Has she called the office yet?',             focus: 'weak form of "has"' },
          { type: 'repeat',       text: 'Have they finished the project?',            focus: 'question intonation' },
          { type: 'listen_write', text: 'Yes, I have. No, I haven\'t.',               focus: 'short answer rhythm' },
          { type: 'repeat',       text: 'Has he spoken to the manager?',             focus: 'weak forms in questions' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: '_____ you ever been to New York?',                answer: 'Have',             options: ['Have', 'Has', 'Did'],                          explanation: 'Present perfect yes/no questions start with "Have" for I/you/we/they.' },
          { type: 'multiple_choice', sentence: 'A: Has she finished? B: Yes, ___.',               answer: 'she has',          options: ['she has', 'she have', 'she did'],              explanation: 'Short positive answer for "Has she...?" is "Yes, she has".' },
          { type: 'word_bank', sentence: '_____ they received our email?',                        answer: 'Have',             choices: ['Have', 'Has', 'Did', 'Are'],                   explanation: '"Have" is used in present perfect questions with they/we/you/I.' },
          { type: 'word_bank', sentence: '_____ he ever lived abroad?',                           answer: 'Has',              choices: ['Has', 'Have', 'Did', 'Was'],                   explanation: '"Has" is used in present perfect questions with he/she/it.' },
          { type: 'fill_gap', sentence: '_____ you ever eaten frog\'s legs?',                     answer: 'Have',             hint: 'Present perfect question with "you"',              explanation: '"Have" begins present perfect questions for I/you/we/they.' },
          { type: 'fill_gap', sentence: 'A: _____ she met the new director? B: No, she hasn\'t.', answer: 'Has',              hint: 'Present perfect question with "she"',              explanation: '"Has" begins present perfect questions for he/she/it.' },
          { type: 'fill_gap', sentence: 'A: Have you seen the news? B: Yes, I _____.',            answer: 'have',             hint: 'Short positive answer',                           explanation: 'Short positive answer for "Have you...?" is "Yes, I have".' },
          { type: 'fix_error', sentence: 'Has you spoken to him yet?',                            answer: 'Have you spoken to him yet?',              hint: '"You" uses "have" not "has"',   explanation: '"You" takes "have" in all forms. "Has" is only for he/she/it.' },
          { type: 'fix_error', sentence: 'Have she finished the report?',                         answer: 'Has she finished the report?',             hint: '"She" uses "has" not "have"',   explanation: '"She" requires "has" in the present perfect.' },
          { type: 'read_answer', passage: 'The interviewer asked Sarah several questions. "Have you worked in a team before?" "Yes, I have," said Sarah. "Have you ever managed a project?" "No, I haven\'t, but I\'d love to learn."', question: 'Has Sarah managed a project before?', answer: 'no', explanation: 'Sarah answers "No, I haven\'t" when asked about managing a project.' },
        ],
      },
      {
        title: 'Present Perfect — WH- questions + ever/never/already/yet',
        pronunciation: [
          { type: 'repeat',       text: 'How long have you been here?',              focus: 'weak form "have" + "been"' },
          { type: 'listen_write', text: 'I\'ve never seen anything like this before.', focus: '"never" stress + contraction' },
          { type: 'repeat',       text: 'Where have you been all day?',              focus: 'question intonation' },
          { type: 'listen_write', text: 'I haven\'t finished it yet.',               focus: '"yet" at end of sentence' },
          { type: 'repeat',       text: 'She\'s already left the building.',         focus: '"already" placement + contraction' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'How long _____ you known him?',                   answer: 'have',             options: ['have', 'has', 'did'],                          explanation: '"How long have you...?" is the present perfect form for asking about duration.' },
          { type: 'multiple_choice', sentence: 'I\'ve _____ been to that museum before.',         answer: 'never',            options: ['never', 'yet', 'already'],                    explanation: '"Never" is used with present perfect to say something has not happened at any time.' },
          { type: 'word_bank', sentence: 'Have you _____ visited a foreign country?',             answer: 'ever',             choices: ['ever', 'never', 'already', 'yet'],             explanation: '"Ever" is used in questions to ask about any point in someone\'s life.' },
          { type: 'word_bank', sentence: 'She has _____ answered the email.',                     answer: 'already',          choices: ['already', 'yet', 'ever', 'never'],             explanation: '"Already" shows the action is complete, often sooner than expected.' },
          { type: 'fill_gap', sentence: 'I have _____ (never) eaten raw fish.',                   answer: 'never',            hint: 'Negative life experience',                        explanation: '"Never" with present perfect expresses zero experience of something.' },
          { type: 'fill_gap', sentence: 'We haven\'t received the package _____.',                answer: 'yet',              hint: 'Not completed, used at end of sentence',          explanation: '"Yet" is used at the end of negative sentences to mean "up to now".' },
          { type: 'fill_gap', sentence: '_____ long has she been learning English?',              answer: 'How',              hint: 'WH- question word for duration',                  explanation: '"How long" asks about the duration of an action in the present perfect.' },
          { type: 'fix_error', sentence: 'I have yet finished my lunch.',                         answer: 'I haven\'t finished my lunch yet.',        hint: '"Yet" position in negatives',  explanation: '"Yet" goes at the end of negative sentences: "I haven\'t finished yet".' },
          { type: 'fix_error', sentence: 'Have you ever went to Spain?',                          answer: 'Have you ever been to Spain?',             hint: 'Past participle of go',        explanation: 'The correct past participle for "go" in this context is "been": "been to Spain".' },
          { type: 'read_answer', passage: 'Mark has travelled extensively. He\'s already visited 40 countries. He\'s never been to Antarctica, but he\'s recently been to Iceland. He\'s been travelling for over ten years now.', question: 'How long has Mark been travelling?', answer: 'ten years', explanation: 'The passage says "he\'s been travelling for over ten years now".' },
        ],
      },
      {
        title: 'Present Perfect vs. Past Simple — Part 1',
        pronunciation: [
          { type: 'repeat',       text: 'I went to Paris last year.',                focus: 'past simple, finished time' },
          { type: 'listen_write', text: 'I\'ve been to Paris twice.',                focus: 'present perfect, life experience' },
          { type: 'repeat',       text: 'She finished the report an hour ago.',      focus: '"ago" + past simple' },
          { type: 'listen_write', text: 'She has just finished the report.',         focus: '"just" + present perfect' },
          { type: 'repeat',       text: 'Did you see the game last night?',          focus: 'past simple question' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'I _____ (see) that film last week.',              answer: 'saw',              options: ['saw', 'have seen', 'seen'],                    explanation: '"Last week" is a finished time reference → use past simple "saw".' },
          { type: 'multiple_choice', sentence: 'She _____ (live) in Rome for two years now.',    answer: 'has lived',        options: ['has lived', 'lived', 'is living'],             explanation: '"For two years now" continues to the present → use present perfect.' },
          { type: 'word_bank', sentence: 'We _____ this film already. Let\'s watch something else.', answer: 'have seen',   choices: ['have seen', 'saw', 'see', 'seen'],             explanation: 'No specific past time mentioned + result relevant now → present perfect.' },
          { type: 'word_bank', sentence: 'He _____ the book in 2019.',                           answer: 'wrote',            choices: ['wrote', 'has written', 'write', 'writing'],    explanation: '"In 2019" is a specific finished time → use past simple.' },
          { type: 'fill_gap', sentence: 'I _____ (meet) her at a conference last year.',         answer: 'met',              hint: '"Last year" = finished past time',                 explanation: '"Last year" signals a finished action → past simple "met".' },
          { type: 'fill_gap', sentence: 'They _____ (open) three new branches so far.',          answer: 'have opened',      hint: '"So far" = up to now (present perfect)',           explanation: '"So far" means up to now — use present perfect "have opened".' },
          { type: 'fill_gap', sentence: 'She _____ (just arrive). She is taking off her coat.',  answer: 'has just arrived', hint: '"Just" + action with present result',              explanation: '"Has just arrived" — present result visible now → present perfect.' },
          { type: 'fix_error', sentence: 'I have seen him yesterday.',                           answer: 'I saw him yesterday.',                    hint: '"Yesterday" = finished time',  explanation: '"Yesterday" is a specific past time → use past simple "saw", not present perfect.' },
          { type: 'fix_error', sentence: 'Did you ever try sushi?',                              answer: 'Have you ever tried sushi?',              hint: '"Ever" = life experience → perfect', explanation: '"Ever" in a life experience question requires the present perfect "Have you ever tried?".' },
          { type: 'read_answer', passage: 'James Bond has appeared in 25 films. The first film came out in 1962. In recent years, Daniel Craig has played the role. He played Bond in five films before stepping down.', question: 'How many films has James Bond appeared in?', answer: '25', explanation: 'The passage says "James Bond has appeared in 25 films".' },
        ],
      },
      {
        title: 'Present Perfect vs. Past Simple — Part 2 (for/since/how long)',
        pronunciation: [
          { type: 'repeat',       text: 'I\'ve been waiting for two hours.',         focus: 'present perfect continuous' },
          { type: 'listen_write', text: 'She has worked here since 2019.',           focus: '"since" + point in time' },
          { type: 'repeat',       text: 'How long have you known each other?',       focus: 'question intonation' },
          { type: 'listen_write', text: 'They\'ve been friends for fifteen years.',  focus: 'contraction + "for"' },
          { type: 'repeat',       text: 'He hasn\'t slept since Tuesday.',           focus: '"since" + day reference' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'She has been a doctor _____ 2010.',              answer: 'since',            options: ['since', 'for', 'ago'],                        explanation: '"Since" is used with a specific point in time (2010, Monday, childhood).' },
          { type: 'multiple_choice', sentence: 'I haven\'t seen him _____ three months.',        answer: 'for',              options: ['for', 'since', 'during'],                     explanation: '"For" is used with a duration/period of time (three months, a year, a long time).' },
          { type: 'word_bank', sentence: 'We\'ve been together _____ five years.',               answer: 'for',              choices: ['for', 'since', 'ago', 'during'],              explanation: '"For" + duration (five years, two hours, a long time).' },
          { type: 'word_bank', sentence: 'He has lived here _____ he was a child.',              answer: 'since',            choices: ['since', 'for', 'ago', 'while'],               explanation: '"Since" + point in time or event (since he was a child).' },
          { type: 'fill_gap', sentence: 'How _____ have you been learning English?',             answer: 'long',             hint: '"How _____ have you...?" asks about duration',    explanation: '"How long" asks about the duration of an action up to the present.' },
          { type: 'fill_gap', sentence: 'I\'ve known her _____ we were at university together.', answer: 'since',            hint: 'Specific past moment → since',                   explanation: '"Since we were at university" = a point in the past → use "since".' },
          { type: 'fill_gap', sentence: 'They haven\'t spoken _____ almost a year.',             answer: 'for',              hint: 'Period of time → for',                           explanation: '"For almost a year" is a duration → use "for".' },
          { type: 'fix_error', sentence: 'I know her since many years.',                         answer: 'I have known her for many years.',        hint: 'Duration needs "for" + perfect tense', explanation: 'Duration with "many years" needs "for" and the present perfect: "have known".' },
          { type: 'fix_error', sentence: 'She works here since 2018.',                           answer: 'She has worked here since 2018.',          hint: '"Since" requires present perfect',  explanation: '"Since" with present relevance requires the present perfect "has worked".' },
          { type: 'read_answer', passage: 'Dr Chen has been head of the department for eight years. She joined the university in 2016 after working in industry since 2008. She hasn\'t taken a holiday for two years.', question: 'When did Dr Chen start working in industry?', answer: '2008', explanation: 'The passage says she worked "in industry since 2008".' },
        ],
      },
      {
        title: 'Present Perfect Continuous',
        pronunciation: [
          { type: 'repeat',       text: 'I\'ve been waiting for you all morning.',   focus: 'contraction + "been"' },
          { type: 'listen_write', text: 'She\'s been studying for three hours.',      focus: '"been" + gerund rhythm' },
          { type: 'repeat',       text: 'How long have you been working here?',      focus: 'question with perfect continuous' },
          { type: 'listen_write', text: 'They\'ve been arguing all evening.',         focus: 'contraction + continuous' },
          { type: 'repeat',       text: 'It has been raining since this morning.',   focus: '"has been" + -ing' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'She _____ (study) all day. She looks tired.',    answer: 'has been studying', options: ['has been studying', 'has studied', 'was studying'], explanation: 'Present perfect continuous shows an ongoing activity with a result visible now.' },
          { type: 'multiple_choice', sentence: 'How long _____ you _____ for the bus?',         answer: 'have / been waiting', options: ['have / been waiting', 'did / wait', 'are / waiting'], explanation: '"How long have you been waiting?" — present perfect continuous for ongoing action.' },
          { type: 'word_bank', sentence: 'It _____ been raining all week.',                      answer: 'has',              choices: ['has', 'have', 'had', 'is'],                   explanation: '"Has been raining" — it/he/she takes "has" in present perfect continuous.' },
          { type: 'word_bank', sentence: 'We _____ been waiting for an hour.',                   answer: 'have',             choices: ['have', 'has', 'had', 'are'],                  explanation: '"Have been waiting" — we/you/they/I take "have" in present perfect continuous.' },
          { type: 'fill_gap', sentence: 'I _____ (work) on this project since Monday.',          answer: 'have been working', hint: 'Ongoing activity from a past point',              explanation: '"Have been working" shows the activity started in the past and is still continuing.' },
          { type: 'fill_gap', sentence: 'You look exhausted. _____ you sleeping enough?',        answer: 'Have you been',    hint: 'Question form of present perfect continuous',    explanation: '"Have you been sleeping enough?" — questions formed with "have/has + subject + been + -ing".' },
          { type: 'fill_gap', sentence: 'Sorry I\'m late. I _____ (look) for parking.',          answer: 'have been looking', hint: 'Explains present situation with ongoing past action', explanation: '"Have been looking" — explains why you are late (recent continuous activity).' },
          { type: 'fix_error', sentence: 'She has been work here for five years.',               answer: 'She has been working here for five years.', hint: 'Continuous = been + -ing',  explanation: 'Present perfect continuous uses "been + -ing": "has been working".' },
          { type: 'fix_error', sentence: 'How long have you been knew her?',                     answer: 'How long have you known her?',             hint: 'Stative verbs don\'t use continuous', explanation: '"Know" is a stative verb and cannot be used in continuous forms. Use "have known".' },
          { type: 'read_answer', passage: 'The construction team has been working on the bridge for over a year. They have been dealing with several unexpected problems including flooding and a shortage of materials. Completion is now expected next spring.', question: 'What unexpected problems have they faced?', answer: 'flooding and shortage of materials', explanation: 'The passage mentions "flooding and a shortage of materials" as unexpected problems.' },
        ],
      },
    ],
  },

  // ── Module 2 — Past Perfect & Narrative Tenses ──────────────────────────
  {
    title: 'Past Perfect & Narrative Tenses',
    topics: [
      {
        title: 'Past Perfect — affirmative, negative & questions',
        pronunciation: [
          { type: 'repeat',       text: 'By the time she arrived, everyone had left.',    focus: '"had" weak form in connected speech' },
          { type: 'listen_write', text: 'I hadn\'t seen that film before last week.',      focus: 'negative contraction "hadn\'t"' },
          { type: 'repeat',       text: 'Had you ever been to Japan before the trip?',    focus: 'question intonation rising' },
          { type: 'listen_write', text: 'She had already finished when he called.',       focus: '"already" stress in past perfect' },
          { type: 'repeat',       text: 'They hadn\'t eaten for hours.',                  focus: 'weak form "had" + negative' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'When I arrived, she _____ (leave) already.', answer: 'had already left', options: ['had already left', 'already left', 'has left'], explanation: '"Had already left" = past perfect. The leaving happened before the arriving.' },
          { type: 'multiple_choice', sentence: '_____ you ever eaten sushi before visiting Japan?', answer: 'Had', options: ['Had', 'Have', 'Did'], explanation: 'Past perfect question: "Had you ever...?" asks about an experience before another past event.' },
          { type: 'word_bank', sentence: 'I _____ already seen that film, so I suggested something else.', answer: 'had', choices: ['had', 'have', 'has', 'was'], explanation: '"Had seen" — past perfect for an action completed before another past action.' },
          { type: 'word_bank', sentence: 'She _____ never visited a foreign country before that trip.', answer: 'had', choices: ['had', 'have', 'hasn\'t', 'didn\'t'], explanation: '"Had never visited" = past perfect negative — she had zero experience before that moment.' },
          { type: 'fill_gap', sentence: 'By 9 pm, they _____ (finish) all the food.',    answer: 'had finished',    hint: 'Completed by a point in past time',         explanation: '"Had finished" = past perfect. By 9 pm (past deadline), the action was complete.' },
          { type: 'fill_gap', sentence: 'She _____ (not study) for the test, so she failed.', answer: "hadn't studied", hint: 'Past perfect negative',                    explanation: '"Hadn\'t studied" = past perfect negative. Not studying caused the failure.' },
          { type: 'fill_gap', sentence: '_____ he _____ (work) there before the new manager arrived?', answer: 'Had / worked', hint: 'Past perfect question',              explanation: '"Had he worked there before...?" — past perfect question about a prior experience.' },
          { type: 'fix_error', sentence: 'When we got there, the film already started.', answer: 'When we got there, the film had already started.', hint: 'Prior action needs past perfect', explanation: '"Had already started" = past perfect. The film starting came before "we got there".' },
          { type: 'fix_error', sentence: 'She has never met him before that day.', answer: 'She had never met him before that day.', hint: '"Before that day" = past reference point', explanation: '"Had never met" — before a past reference point, use past perfect, not present perfect.' },
          { type: 'read_answer', passage: 'When the investigators arrived at the scene, the suspect had already fled. He had taken most of his belongings and had left a note. The neighbours confirmed they hadn\'t heard anything unusual.', question: 'What had the suspect taken?', answer: 'most of his belongings', explanation: 'The passage says "He had taken most of his belongings".' },
        ],
      },
      {
        title: 'Past Perfect — before / after / when / by the time',
        pronunciation: [
          { type: 'repeat',       text: 'Before she arrived, we had set up everything.',  focus: '"before" + past perfect stress' },
          { type: 'listen_write', text: 'By the time help came, the damage was done.',    focus: '"by the time" + past perfect rhythm' },
          { type: 'repeat',       text: 'After he had left, we found the keys.',           focus: '"after" clause linking' },
          { type: 'listen_write', text: 'When I got home, the party had already started.', focus: '"when" + past perfect' },
          { type: 'repeat',       text: 'She hadn\'t realised the mistake until later.',   focus: '"until" + past perfect negative' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'By the time I _____ the station, the train had left.', answer: 'reached', options: ['reached', 'had reached', 'reach'], explanation: 'After "by the time", use past simple for the later action; past perfect for the earlier one.' },
          { type: 'multiple_choice', sentence: 'After she _____ (eat), she felt much better.', answer: 'had eaten', options: ['had eaten', 'ate', 'has eaten'], explanation: '"After she had eaten" — the eating came first. "Had eaten" = past perfect for the earlier event.' },
          { type: 'word_bank', sentence: 'Before he _____, he made sure all windows were locked.', answer: 'left', choices: ['left', 'had left', 'leaves', 'was leaving'], explanation: '"Before he left" — the main clause uses past perfect for the action before. "Left" = past simple for the later action.' },
          { type: 'word_bank', sentence: 'When I woke up, it _____ already stopped raining.', answer: 'had', choices: ['had', 'has', 'was', 'did'], explanation: '"It had already stopped raining" — past perfect. The rain stopping came before waking up.' },
          { type: 'fill_gap', sentence: 'By the time the doctor arrived, the patient _____ (recover) slightly.', answer: 'had recovered', hint: 'Earlier action = past perfect', explanation: '"Had recovered" — by the time of the doctor\'s arrival, the recovery had already begun.' },
          { type: 'fill_gap', sentence: 'She felt relieved _____ she had passed the exam.', answer: 'after', hint: 'Connector for an action that came first', explanation: '"After she had passed" — "after" introduces the prior event (in past perfect).' },
          { type: 'fill_gap', sentence: 'He _____ (not/hear) the news before I told him.', answer: "hadn't heard", hint: 'Past perfect negative before another past event', explanation: '"Hadn\'t heard" = past perfect negative. He had no information before that moment.' },
          { type: 'fix_error', sentence: 'She had called the police before she has left the building.', answer: 'She had called the police before she left the building.', hint: '"Before" + past simple for the later event', explanation: 'After "before", use past simple for the reference point: "before she left".' },
          { type: 'fix_error', sentence: 'By the time they had arrived, the show ended.', answer: 'By the time they arrived, the show had ended.', hint: 'Past perfect for the earlier (prior) action', explanation: '"By the time they arrived" uses past simple. The earlier action "had ended" uses past perfect.' },
          { type: 'read_answer', passage: 'When the guests arrived at the hotel, they discovered that the booking had been cancelled. The receptionist explained that someone had accidentally made a duplicate reservation. By the time the manager arrived, the guests had already waited for 45 minutes.', question: 'How long had the guests waited by the time the manager arrived?', answer: '45 minutes', explanation: 'The passage says the guests "had already waited for 45 minutes".' },
        ],
      },
      {
        title: 'Past Perfect vs. Past Simple',
        pronunciation: [
          { type: 'repeat',       text: 'He ate the cake that she had baked.',           focus: 'tense contrast in one sentence' },
          { type: 'listen_write', text: 'I went to bed after I had finished the report.', focus: '"after" clause with past perfect' },
          { type: 'repeat',       text: 'She didn\'t know he had already left.',          focus: 'embedded past perfect' },
          { type: 'listen_write', text: 'When he arrived, the room was a mess.',          focus: 'two past simples — simultaneous' },
          { type: 'repeat',       text: 'By the time I understood, it was too late.',    focus: '"by the time" structure' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'When I _____ (get) home, I realised I _____ (leave) my keys at work.', answer: 'got / had left', options: ['got / had left', 'had got / left', 'got / left'], explanation: '"Got" = past simple (what happened). "Had left" = past perfect (prior action that caused the problem).' },
          { type: 'multiple_choice', sentence: 'She _____ (open) the letter and _____ (start) to read it.', answer: 'opened / started', options: ['opened / started', 'had opened / started', 'opened / had started'], explanation: 'Two sequential actions, one right after the other → both past simple. No time gap needing past perfect.' },
          { type: 'word_bank', sentence: 'I told her what _____ happened at the meeting.', answer: 'had', choices: ['had', 'has', 'was', 'did'], explanation: '"What had happened" = embedded past perfect. Reporting a past event that preceded the telling.' },
          { type: 'word_bank', sentence: 'We _____ to the restaurant several times before it closed.', answer: 'had been', choices: ['had been', 'went', 'have been', 'were'], explanation: '"Had been" = past perfect. Multiple past visits before the restaurant closed (another past event).' },
          { type: 'fill_gap', sentence: 'He _____ (know) her for years before they finally got married.', answer: 'had known', hint: 'Duration before another past event', explanation: '"Had known" = past perfect for the duration leading up to the marriage.' },
          { type: 'fill_gap', sentence: 'I _____ (wake) up, _____ (get) dressed and _____ (leave) quickly.', answer: 'woke / got / left', hint: 'Sequential rapid actions = past simple', explanation: 'Quick consecutive actions in the past use past simple, not past perfect.' },
          { type: 'fill_gap', sentence: 'She was upset because she _____ (lose) her wallet.', answer: 'had lost', hint: 'Reason for past emotion = prior event', explanation: '"Had lost" = past perfect. The losing happened before and caused the present-past upset.' },
          { type: 'fix_error', sentence: 'I had woken up, had dressed and had left quickly.', answer: 'I woke up, got dressed and left quickly.', hint: 'Quick sequential actions = past simple', explanation: 'Rapid sequential narrative actions use past simple, not past perfect.' },
          { type: 'fix_error', sentence: 'When she arrived, I already left.', answer: 'When she arrived, I had already left.', hint: 'Leaving came before arriving', explanation: '"Had already left" = past perfect. Leaving happened before (was complete when) she arrived.' },
          { type: 'read_answer', passage: 'The film was set in 1940s Paris. The detective had been following the suspect for weeks when he finally made his move. The suspect had stolen the painting three years earlier. By the time the police understood what had happened, the suspect had vanished again.', question: 'When had the suspect stolen the painting?', answer: 'three years earlier', explanation: 'The passage says "The suspect had stolen the painting three years earlier".' },
        ],
      },
      {
        title: 'Narrative tenses — integrated practice',
        pronunciation: [
          { type: 'repeat',       text: 'She was walking home when suddenly it started to rain.', focus: 'narrative rhythm — past continuous + simple' },
          { type: 'listen_write', text: 'He had barely sat down when the phone rang.',     focus: '"barely had" + past simple' },
          { type: 'repeat',       text: 'The lights went out while they were having dinner.', focus: 'interruption structure' },
          { type: 'listen_write', text: 'Nobody knew that the letter had already been opened.', focus: 'embedded past perfect passive' },
          { type: 'repeat',       text: 'I had just closed my eyes when I heard the noise.',  focus: '"had just" + interruption' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'While she _____ (talk) on the phone, someone knocked at the door.', answer: 'was talking', options: ['was talking', 'talked', 'had talked'], explanation: '"Was talking" = past continuous for the background activity; "knocked" = past simple for the interruption.' },
          { type: 'multiple_choice', sentence: 'He _____ (enter) the room and _____ (sit) down quietly.', answer: 'entered / sat', options: ['entered / sat', 'was entering / sat', 'had entered / was sitting'], explanation: 'Sequential narrative actions with no overlap use past simple for both.' },
          { type: 'word_bank', sentence: 'The detective noticed the window _____ been broken from the outside.', answer: 'had', choices: ['had', 'has', 'was', 'did'], explanation: '"Had been broken" = past perfect passive. The window was broken before the detective noticed.' },
          { type: 'word_bank', sentence: 'It _____ raining when they finally left the building.', answer: 'was still', choices: ['was still', 'had', 'still was', 'still had'], explanation: '"Was still raining" = past continuous for an ongoing background condition at that moment.' },
          { type: 'fill_gap', sentence: 'She _____ (not/expect) to see him there, so she was shocked.', answer: "hadn't expected", hint: 'Past perfect negative — she had no expectation before the moment', explanation: '"Hadn\'t expected" = past perfect. She had no expectation before seeing him.' },
          { type: 'fill_gap', sentence: 'As they _____ (leave), he realised he _____ (forget) his bag.', answer: 'were leaving / had forgotten', hint: 'Ongoing action + earlier oversight', explanation: '"Were leaving" = past continuous. "Had forgotten" = past perfect (the forgetting happened before). ' },
          { type: 'fill_gap', sentence: 'Suddenly, the lights _____ (go) out and everyone _____ (gasp).', answer: 'went / gasped', hint: 'Two sudden sequential events = past simple', explanation: 'Sudden sequential events in a story use past simple: "went out" then "gasped".' },
          { type: 'fix_error', sentence: 'She has been walking for hours before she found the exit.', answer: 'She had been walking for hours before she found the exit.', hint: 'Past perfect continuous — before a past reference point', explanation: '"Had been walking" = past perfect continuous. The walking preceded the past reference point.' },
          { type: 'fix_error', sentence: 'The meeting was starting when I was arriving at the office.', answer: 'The meeting was starting when I arrived at the office.', hint: 'Interruption = past simple', explanation: '"When I arrived" = the interrupting action. Use past simple for interruptions, not past continuous.' },
          { type: 'read_answer', passage: 'It was a quiet evening. Maria was reading in the garden when she heard a strange noise. She had never heard anything like it before. She stood up and walked towards the gate. As she got closer, she realised a fox had been trapped under the fence.', question: 'What had happened to the fox?', answer: 'it had been trapped under the fence', explanation: 'The passage says "a fox had been trapped under the fence".' },
        ],
      },
      {
        title: 'Used to + Would — past habits & states',
        pronunciation: [
          { type: 'repeat',       text: 'I used to play football every Saturday.',        focus: '"used to" — /juːst tə/ in connected speech' },
          { type: 'listen_write', text: 'We would walk to school in those days.',          focus: '"would" + base verb for past habit' },
          { type: 'repeat',       text: 'She didn\'t use to like vegetables.',             focus: 'negative form — "didn\'t use to"' },
          { type: 'listen_write', text: 'Did you use to live near here?',                  focus: 'question form of "used to"' },
          { type: 'repeat',       text: 'He would always bring flowers when he visited.',  focus: '"would" for repeated past action' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'She _____ smoke, but she quit five years ago.', answer: 'used to', options: ['used to', 'would', 'was used to'], explanation: '"Used to smoke" describes a past habit/state that no longer exists.' },
          { type: 'multiple_choice', sentence: 'When we were children, we _____ climb that old tree every summer.', answer: 'would', options: ['would', 'used to', 'did use to'], explanation: '"Would climb" describes a repeated past action (habit). Both "would" and "used to" are possible here for repeated actions.' },
          { type: 'word_bank', sentence: 'I _____ use to like spicy food, but now I love it.', answer: "didn't", choices: ["didn't", "wouldn't", "used to not", "wasn't"], explanation: '"Didn\'t use to" is the standard negative form of "used to".' },
          { type: 'word_bank', sentence: '_____ you use to have a dog when you were young?', answer: 'Did', choices: ['Did', 'Used', 'Were', 'Would'], explanation: '"Did you use to...?" is the correct question form of "used to".' },
          { type: 'fill_gap', sentence: 'He _____ (use to) be very shy, but he\'s very confident now.', answer: 'used to', hint: 'Past state that has changed', explanation: '"Used to be shy" — a past state no longer true. "Used to" is used for past states.' },
          { type: 'fill_gap', sentence: 'Every evening, my grandfather _____ (would) sit by the fire and tell stories.', answer: 'would', hint: '"Would" for a repeated past routine', explanation: '"Would sit and tell stories" — "would" describes a repeated past routine (habit).' },
          { type: 'fill_gap', sentence: 'She _____ (not/use to) wake up early, but her new job changed that.', answer: "didn't use to", hint: 'Negative past habit', explanation: '"Didn\'t use to wake up early" — standard negative form of "used to".' },
          { type: 'fix_error', sentence: 'I use to play the piano when I was at school.', answer: 'I used to play the piano when I was at school.', hint: '"Used to" (not "use to") in affirmative', explanation: 'In affirmative sentences, the correct form is "used to" (with -d).' },
          { type: 'fix_error', sentence: 'She used to go to the gym, but now she doesn\'t use to.', answer: "She used to go to the gym, but now she doesn't.", hint: '"Used to" is not used for present habits', explanation: '"Used to" only describes past habits. For the present, say "she doesn\'t (go)" — no "used to".' },
          { type: 'read_answer', passage: 'My grandmother used to make bread every Sunday morning. We would all gather in the kitchen as children — the smell was incredible. She didn\'t use to measure anything precisely; she just knew. She would hum old songs while she worked. I miss those mornings.', question: 'What would the grandmother do while she worked?', answer: 'hum old songs', explanation: 'The passage says "She would hum old songs while she worked".' },
        ],
      },
    ],
  },

  // ── Module 3 — Modal Verbs ───────────────────────────────────────────────
  {
    title: 'Modal Verbs',
    topics: [
      {
        title: 'Ability — can, could, be able to',
        pronunciation: [
          { type: 'repeat',       text: 'She could speak three languages by the age of ten.', focus: '"could" for past ability' },
          { type: 'listen_write', text: 'I wasn\'t able to attend the meeting yesterday.',    focus: '"wasn\'t able to" rhythm' },
          { type: 'repeat',       text: 'Will you be able to finish it by Friday?',           focus: '"be able to" in future' },
          { type: 'listen_write', text: 'He can\'t have been the one — he was abroad.',       focus: '"can\'t have" for past deduction' },
          { type: 'repeat',       text: 'I could barely hear him over the noise.',            focus: '"could barely" — hedged ability' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'She _____ swim when she was three years old.', answer: 'could', options: ['could', 'can', 'was able to'], explanation: '"Could" describes a general ability in the past (not a single occasion).' },
          { type: 'multiple_choice', sentence: 'He _____ finish the marathon despite the heat.', answer: 'was able to', options: ['was able to', 'could', 'can'], explanation: '"Was able to" = successfully achieved a specific action on one occasion (not general past ability).' },
          { type: 'word_bank', sentence: 'They _____ able to reschedule the flight at the last minute.', answer: 'were', choices: ['were', 'could', 'can', 'had'], explanation: '"Were able to" = past ability on a specific occasion. A form of "be able to".' },
          { type: 'word_bank', sentence: 'Will you _____ able to join us for dinner?', answer: 'be', choices: ['be', 'can', 'could', 'have'], explanation: '"Will you be able to...?" — future ability uses "be able to" after "will".' },
          { type: 'fill_gap', sentence: 'I _____ (not/can) open the jar — it was too tight.', answer: "couldn't", hint: 'Past inability', explanation: '"Couldn\'t" = could not. Past inability for a general or specific situation.' },
          { type: 'fill_gap', sentence: 'She _____ (be able to) solve the puzzle after an hour.', answer: 'was able to', hint: 'Specific success on one occasion', explanation: '"Was able to solve" = she succeeded on this one occasion.' },
          { type: 'fill_gap', sentence: 'He _____ play chess by the time he was six.', answer: 'could', hint: 'General past ability', explanation: '"Could play" = general ability he had in the past.' },
          { type: 'fix_error', sentence: 'I can\'t come to your party last night.', answer: "I couldn't come to your party last night.", hint: '"Last night" = past', explanation: '"Last night" indicates past → use "couldn\'t" (past form of "can\'t").' },
          { type: 'fix_error', sentence: 'She was able to swim when she was a child.', answer: 'She could swim when she was a child.', hint: 'General past ability = "could"', explanation: 'For general past ability (not a specific occasion), "could" is more natural than "was able to".' },
          { type: 'read_answer', passage: 'As a child, Elena could paint remarkably well. By ten, she was able to sell her first picture at a school fair. She couldn\'t understand why people paid so much, but she was delighted. She has been able to make a living from her art ever since.', question: 'What happened at the school fair?', answer: 'she was able to sell her first picture', explanation: 'The passage says "she was able to sell her first picture at a school fair".' },
        ],
      },
      {
        title: 'Permission & requests',
        pronunciation: [
          { type: 'repeat',       text: 'Could I possibly take a look at your notes?',      focus: '"Could I possibly" — polite request' },
          { type: 'listen_write', text: 'Would you mind closing the window?',                focus: '"Would you mind + -ing" structure' },
          { type: 'repeat',       text: 'May I ask who\'s calling, please?',                focus: '"May I" formal permission' },
          { type: 'listen_write', text: 'Do you think you could help me with this?',        focus: 'indirect polite request' },
          { type: 'repeat',       text: 'I was wondering if I could leave a bit early.',   focus: 'tentative request intonation' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: '_____ you mind waiting for a few minutes?', answer: 'Would', options: ['Would', 'Could', 'May'], explanation: '"Would you mind + -ing?" is a polite way to make a request.' },
          { type: 'multiple_choice', sentence: '_____ I borrow your pen, please?', answer: 'Can / Could / May', options: ['Can / Could / May', 'Should', 'Must'], explanation: '"Can I...?", "Could I...?" and "May I...?" all request permission. "May" is most formal.' },
          { type: 'word_bank', sentence: 'Do you _____ you could give me a hand?', answer: 'think', choices: ['think', 'mind', 'know', 'say'], explanation: '"Do you think you could...?" is an indirect and very polite way to make a request.' },
          { type: 'word_bank', sentence: 'I was _____ if you could check this for me.', answer: 'wondering', choices: ['wondering', 'thinking', 'asking', 'saying'], explanation: '"I was wondering if you could..." is a tentative, polite request structure.' },
          { type: 'fill_gap', sentence: 'Would you mind _____ (open) the door for me?', answer: 'opening', hint: '"Would you mind" + -ing', explanation: '"Would you mind" is always followed by a gerund (-ing form).' },
          { type: 'fill_gap', sentence: '_____ I make a suggestion? I think there\'s a better approach.', answer: 'May', hint: 'Formal permission request', explanation: '"May I make a suggestion?" — "May I" is formal and polite.' },
          { type: 'fill_gap', sentence: 'Could you _____ (speak) a little more slowly, please?', answer: 'speak', hint: '"Could you" + base form', explanation: '"Could you speak more slowly?" — "could you" + base verb for a polite request.' },
          { type: 'fix_error', sentence: 'Would you mind to help me with this?', answer: 'Would you mind helping me with this?', hint: '"Mind" + gerund, not infinitive', explanation: '"Would you mind" is followed by a gerund: "helping" (not "to help").' },
          { type: 'fix_error', sentence: 'Can I to use your phone?', answer: 'Can I use your phone?', hint: '"Can" + base form, no "to"', explanation: 'Modal verbs (can, could, may) are followed by the base form without "to".' },
          { type: 'read_answer', passage: 'At the office: "Excuse me, could I possibly reschedule our meeting? I was wondering if Thursday would work instead. Would you mind checking your diary?" "Not at all — let me see. Yes, Thursday at 3 pm works perfectly."', question: 'What day does the person suggest instead?', answer: 'Thursday', explanation: 'The person asks "if Thursday would work instead".' },
        ],
      },
      {
        title: 'Obligation & necessity',
        pronunciation: [
          { type: 'repeat',       text: 'You must submit your application by Friday.',       focus: '"must" for strong obligation' },
          { type: 'listen_write', text: 'Employees don\'t have to wear a uniform here.',    focus: '"don\'t have to" — no obligation' },
          { type: 'repeat',       text: 'You mustn\'t use your phone during the exam.',     focus: '"mustn\'t" — prohibition' },
          { type: 'listen_write', text: 'She needs to see a doctor as soon as possible.',   focus: '"needs to" — strong necessity' },
          { type: 'repeat',       text: 'Passengers must fasten their seatbelts.',          focus: 'obligation notice register' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'You _____ tell anyone — it\'s top secret.', answer: "mustn't", options: ["mustn't", "don't have to", "needn't"], explanation: '"Mustn\'t" = prohibition — it is not allowed. Very different from "don\'t have to" (no obligation).' },
          { type: 'multiple_choice', sentence: 'It\'s optional. You _____ come if you don\'t want to.', answer: "don't have to", options: ["don't have to", "mustn't", "needn't to"], explanation: '"Don\'t have to" = no obligation. You can choose.' },
          { type: 'word_bank', sentence: 'All visitors _____ sign in at reception.', answer: 'must', choices: ['must', 'should', 'might', 'could'], explanation: '"Must" expresses a strong rule or obligation, often from an authority.' },
          { type: 'word_bank', sentence: 'You _____ have to worry — I\'ll sort it out.', answer: "don't", choices: ["don't", "mustn't", "can't", "won't"], explanation: '"Don\'t have to" reassures someone there is no obligation or need to worry.' },
          { type: 'fill_gap', sentence: 'Students _____ (must) complete all assignments on time.', answer: 'must', hint: 'Strong obligation in academic context', explanation: '"Must complete" = strong rule or obligation imposed by an institution.' },
          { type: 'fill_gap', sentence: 'You _____ (not need to) pay — it\'s free entry today.', answer: "don't need to", hint: 'No necessity — it\'s free', explanation: '"Don\'t need to pay" = it is not necessary. The same as "don\'t have to".' },
          { type: 'fill_gap', sentence: 'Staff _____ (mustn\'t) share their login credentials with anyone.', answer: "mustn't", hint: 'Prohibition — not allowed', explanation: '"Mustn\'t share" = prohibition. This is not allowed under any circumstances.' },
          { type: 'fix_error', sentence: 'You don\'t must park here.', answer: "You mustn't park here.", hint: '"Mustn\'t" for prohibition', explanation: '"Mustn\'t" is the correct modal for prohibition. "Don\'t must" does not exist.' },
          { type: 'fix_error', sentence: 'She must to call the client today.', answer: 'She must call the client today.', hint: '"Must" + base form, no "to"', explanation: '"Must" is a modal — followed by the base verb without "to".' },
          { type: 'read_answer', passage: 'Company security policy: All employees must wear their ID badge at all times. You mustn\'t share your access code with anyone. You don\'t have to bring your own equipment, as we provide everything needed. Visitors must sign in at the front desk.', question: 'Do employees have to bring their own equipment?', answer: 'no', explanation: 'The policy says "You don\'t have to bring your own equipment".' },
        ],
      },
      {
        title: "Deduction & certainty (must, can't, could)",
        pronunciation: [
          { type: 'repeat',       text: 'She must be exhausted after such a long journey.', focus: '"must" for deduction — stress on "must"' },
          { type: 'listen_write', text: 'He can\'t be serious — that\'s impossible.',       focus: '"can\'t be" for negative deduction' },
          { type: 'repeat',       text: 'They could be stuck in traffic right now.',        focus: '"could" for possibility/speculation' },
          { type: 'listen_write', text: 'It might be locked — try the back door.',          focus: '"might be" for weaker possibility' },
          { type: 'repeat',       text: 'You must have been very worried about her.',       focus: '"must have been" — past deduction' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'She won the competition for the third time — she _____ be incredibly talented.', answer: 'must', options: ['must', "can't", 'might'], explanation: '"Must be" = logical deduction based on evidence. Winning three times → she must be talented.' },
          { type: 'multiple_choice', sentence: 'He looks exactly like his father — they _____ be brothers.', answer: 'must', options: ['must', "can't", 'should'], explanation: '"Must be" = strong deduction. The visual evidence makes it almost certain.' },
          { type: 'word_bank', sentence: 'That _____ be right — the numbers don\'t add up.', answer: "can't", choices: ["can't", "mustn't", "mightn't", "needn't"], explanation: '"Can\'t be right" = logical impossibility/negative deduction based on the evidence.' },
          { type: 'word_bank', sentence: 'She\'s not answering — she _____ be sleeping.', answer: 'might / could', choices: ['might / could', 'must', "can't", 'should'], explanation: '"Might/Could be sleeping" = possibility (not certainty). She might be asleep.' },
          { type: 'fill_gap', sentence: 'He\'s been awake for 30 hours. He _____ be exhausted.', answer: 'must', hint: 'Strong logical deduction', explanation: '"Must be exhausted" = near-certain deduction based on clear evidence (30 hours awake).' },
          { type: 'fill_gap', sentence: 'She grew up in Tokyo, so she _____ speak some Japanese.', answer: 'must', hint: 'Logical conclusion from fact', explanation: '"Must speak" = logical conclusion. Growing up in Tokyo → she must know some Japanese.' },
          { type: 'fill_gap', sentence: 'That _____ be true — I saw it happen myself.', answer: "can't", hint: 'Negative logical deduction', explanation: '"Can\'t be true" — the speaker has direct evidence that contradicts the claim.' },
          { type: 'fix_error', sentence: 'She must to be at least 40 years old.', answer: 'She must be at least 40 years old.', hint: '"Must" + base form, no "to"', explanation: '"Must" is a modal — use the base verb without "to": "must be".' },
          { type: 'fix_error', sentence: 'He can\'t to know the answer — he wasn\'t there.', answer: "He can't know the answer — he wasn't there.", hint: '"Can\'t" + base form, no "to"', explanation: '"Can\'t" is a modal — followed by the base verb without "to": "can\'t know".' },
          { type: 'read_answer', passage: 'The restaurant is completely full on a Tuesday evening, the food smells amazing and there is a queue outside. "This must be a very popular place," said Julia. "And look at those prices — it can\'t be cheap." "It could be a special event," suggested her friend.', question: 'What does Julia deduce about the restaurant?', answer: 'it must be a very popular place / it can\'t be cheap', explanation: 'Julia deduces: "This must be a very popular place" and "it can\'t be cheap".' },
        ],
      },
    ],
  },

  // ── Module 4 — Conditionals ──────────────────────────────────────────────
  {
    title: 'Conditionals',
    topics: [
      {
        title: 'Second Conditional — Part 1',
        pronunciation: [
          { type: 'repeat',       text: 'If I had more time, I would learn another language.', focus: '"would" weak form /wəd/' },
          { type: 'listen_write', text: 'What would you do if you won the lottery?',           focus: 'question intonation, "would"' },
          { type: 'repeat',       text: 'If she were the manager, things would be different.', focus: '"were" in second conditional' },
          { type: 'listen_write', text: 'I wouldn\'t accept the job if they didn\'t pay well.', focus: 'negative second conditional' },
          { type: 'repeat',       text: 'He\'d travel more if he could afford it.',            focus: 'contraction "he\'d" = "he would"' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'If I _____ a car, I would drive to work.', answer: 'had', options: ['had', 'have', 'would have'], explanation: 'Second conditional: if + past simple → would + base form. "Had" is the past simple of "have".' },
          { type: 'multiple_choice', sentence: 'She _____ travel more if she had more money.', answer: 'would', options: ['would', 'will', 'did'], explanation: '"Would travel" is the result clause in a second conditional (hypothetical).' },
          { type: 'word_bank', sentence: 'What _____ you do if you found a wallet on the street?', answer: 'would', choices: ['would', 'will', 'did', 'could'], explanation: '"What would you do if...?" — second conditional question about a hypothetical situation.' },
          { type: 'word_bank', sentence: 'If he _____ more exercise, he\'d feel better.', answer: 'did', choices: ['did', 'does', 'would do', 'has done'], explanation: '"Did more exercise" = past simple in the if-clause of the second conditional.' },
          { type: 'fill_gap', sentence: 'If I _____ (be) you, I\'d apologise immediately.', answer: 'were', hint: '"Were" is used in second conditional for all subjects', explanation: '"If I were you" — "were" is correct for all subjects in the second conditional if-clause.' },
          { type: 'fill_gap', sentence: 'He _____ (accept) if they offered him the job.', answer: 'would accept', hint: 'Result clause of second conditional', explanation: '"Would accept" = result clause. Hypothetical future situation.' },
          { type: 'fill_gap', sentence: 'If they _____ (not/live) so far away, we\'d visit more often.', answer: "didn't live", hint: 'Negative if-clause in second conditional', explanation: '"Didn\'t live" = negative past simple in the if-clause.' },
          { type: 'fix_error', sentence: 'If I will have a million pounds, I\'d buy a house.', answer: "If I had a million pounds, I'd buy a house.", hint: 'If-clause of second conditional uses past simple, not "will"', explanation: 'The if-clause of the second conditional uses past simple (had), not "will have".' },
          { type: 'fix_error', sentence: 'If she was more experienced, she would get the job.', answer: 'If she were more experienced, she would get the job.', hint: '"Were" preferred in second conditional if-clause', explanation: 'In formal second conditional, "were" is preferred for all subjects: "If she were..."' },
          { type: 'read_answer', passage: 'If the company offered me a promotion, I would definitely accept. I\'d move to a different city if necessary. If I worked in management, I would focus on improving communication. My colleagues say they would support me if I applied.', question: 'What would the writer focus on if they worked in management?', answer: 'improving communication', explanation: 'The passage says "I would focus on improving communication".' },
        ],
      },
      {
        title: 'Second Conditional — Part 2 + Wish',
        pronunciation: [
          { type: 'repeat',       text: 'I wish I lived closer to the city centre.',       focus: '"wish" + past simple for present wish' },
          { type: 'listen_write', text: 'If only it weren\'t so cold outside!',             focus: '"if only" + past simple' },
          { type: 'repeat',       text: 'I wish I could drive — it would make life easier.', focus: '"wish I could" structure' },
          { type: 'listen_write', text: 'She wishes she knew the answer.',                  focus: '"wishes" third person + past simple' },
          { type: 'repeat',       text: 'If only they would stop making that noise!',       focus: '"if only...would" for irritation' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'I wish I _____ more time to practise.', answer: 'had', options: ['had', 'have', 'would have'], explanation: '"Wish + past simple" expresses a present wish for something different from reality. "I wish I had more time".' },
          { type: 'multiple_choice', sentence: 'She wishes she _____ play the piano.', answer: 'could', options: ['could', 'can', 'would'], explanation: '"Wish + could" expresses a wish for an ability you don\'t currently have.' },
          { type: 'word_bank', sentence: 'If only he _____ stop interrupting!', answer: 'would', choices: ['would', 'did', 'could', 'might'], explanation: '"If only + would" expresses annoyance about someone\'s behaviour.' },
          { type: 'word_bank', sentence: 'I wish it _____ warmer. I hate winter.', answer: 'were', choices: ['were', 'was', 'would be', 'is'], explanation: '"I wish it were warmer" — "were" is preferred in formal/written second conditional wish.' },
          { type: 'fill_gap', sentence: 'I wish I _____ (speak) Spanish fluently.', answer: 'could speak', hint: '"Wish I could" for a desired ability', explanation: '"I wish I could speak Spanish" = I want this ability but don\'t have it.' },
          { type: 'fill_gap', sentence: 'If only she _____ (not/work) so late every day.', answer: "didn't work", hint: '"If only" + negative past simple', explanation: '"If only she didn\'t work so late" = wish for a change in her current behaviour.' },
          { type: 'fill_gap', sentence: 'He wishes he _____ (live) near the sea.', answer: 'lived', hint: '"Wish + past simple" for present wish', explanation: '"He wishes he lived near the sea" = present wish, reality is different.' },
          { type: 'fix_error', sentence: 'I wish I would be taller.', answer: 'I wish I were taller.', hint: '"Wish" for state uses past simple/were, not "would"', explanation: 'For wishes about unchangeable states or descriptions, use "wish + were/past simple" — not "would".' },
          { type: 'fix_error', sentence: 'She wish she knows the answer.', answer: 'She wishes she knew the answer.', hint: '"Wish" = third person "wishes"; past simple for the wish', explanation: 'Third person: "she wishes" (not "wish"). Past simple in the wish clause: "knew".' },
          { type: 'read_answer', passage: 'Tom is stuck in traffic. He wishes he had taken the train. If only the traffic moved faster! He also wishes he lived closer to the office. "If I had a bicycle, I could avoid all this," he thinks.', question: 'What does Tom wish he had taken?', answer: 'the train', explanation: 'Tom "wishes he had taken the train".' },
        ],
      },
      {
        title: 'Third Conditional — Part 1',
        pronunciation: [
          { type: 'repeat',       text: 'If you had told me, I would have helped you.',    focus: '"would have" — /wədəv/ in connected speech' },
          { type: 'listen_write', text: 'She wouldn\'t have passed if she hadn\'t studied.', focus: 'negative third conditional' },
          { type: 'repeat',       text: 'What would you have done in my situation?',       focus: 'question form, rising intonation' },
          { type: 'listen_write', text: 'He would have arrived on time if the train hadn\'t been delayed.', focus: 'complex third conditional sentence' },
          { type: 'repeat',       text: 'I wouldn\'t have believed it if I hadn\'t seen it myself.', focus: '"if" clause at the end' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'If she _____ (study) harder, she would have passed.', answer: 'had studied', options: ['had studied', 'studied', 'would have studied'], explanation: 'Third conditional if-clause: "had + past participle". Refers to an unreal past situation.' },
          { type: 'multiple_choice', sentence: 'We wouldn\'t have missed the flight if we _____ earlier.', answer: 'had left', options: ['had left', 'left', 'would have left'], explanation: '"Had left" = past perfect in the if-clause of the third conditional.' },
          { type: 'word_bank', sentence: 'They _____ come to the party if they had known about it.', answer: 'would have', choices: ['would have', 'had', 'could', 'will'], explanation: '"Would have come" = result clause of the third conditional. The past perfect shows it was hypothetical.' },
          { type: 'word_bank', sentence: 'If he _____ on time, none of this would have happened.', answer: 'had arrived', choices: ['had arrived', 'arrived', 'would arrive', 'was arriving'], explanation: '"Had arrived" = past perfect in the if-clause. Third conditional = impossible past situation.' },
          { type: 'fill_gap', sentence: 'I _____ (buy) that car if I had saved enough money.', answer: 'would have bought', hint: 'Result clause of third conditional', explanation: '"Would have bought" = the hypothetical result if the condition had been met.' },
          { type: 'fill_gap', sentence: 'If you _____ (call) me, I would have come immediately.', answer: 'had called', hint: 'If-clause: had + past participle', explanation: '"Had called" = past perfect. Third conditional if-clause.' },
          { type: 'fill_gap', sentence: 'She _____ (not/get) lost if she had checked the map.', answer: "wouldn't have got", hint: 'Negative result clause', explanation: '"Wouldn\'t have got lost" = negative result. She got lost because she didn\'t check the map.' },
          { type: 'fix_error', sentence: 'If he would have known, he would have told us.', answer: 'If he had known, he would have told us.', hint: '"Would have" cannot appear in the if-clause', explanation: 'In the third conditional if-clause, use "had + past participle" — not "would have".' },
          { type: 'fix_error', sentence: 'We would have win if the referee had been fair.', answer: 'We would have won if the referee had been fair.', hint: '"Would have" + past participle', explanation: 'After "would have", use the past participle: "won" (not "win").' },
          { type: 'read_answer', passage: 'The project failed. If the team had communicated better, they would have identified the problem earlier. If they had asked for help sooner, the manager would have been able to provide resources. The company has since changed its procedures.', question: 'What would have happened if the team had communicated better?', answer: 'they would have identified the problem earlier', explanation: 'The passage says "they would have identified the problem earlier".' },
        ],
      },
      {
        title: 'Third Conditional — Part 2 + Wish (past)',
        pronunciation: [
          { type: 'repeat',       text: 'I wish I had studied medicine instead.',          focus: '"wish + had + past participle" — past regret' },
          { type: 'listen_write', text: 'If only she hadn\'t said that!',                  focus: '"if only + past perfect" — regret' },
          { type: 'repeat',       text: 'He wishes he had taken the other job.',           focus: '"wishes he had" — third person past wish' },
          { type: 'listen_write', text: 'If only we had left earlier, we wouldn\'t be late.', focus: '"if only" + third conditional' },
          { type: 'repeat',       text: 'She regrets not having invested in that company.',  focus: 'regret + perfect gerund' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'I wish I _____ (take) that opportunity when I had the chance.', answer: 'had taken', options: ['had taken', 'took', 'would take'], explanation: '"Wish + past perfect" expresses regret about a past action or missed opportunity.' },
          { type: 'multiple_choice', sentence: 'She wishes she _____ (be) kinder to him.', answer: 'had been', options: ['had been', 'were', 'was'], explanation: '"Wish + had been" = regret about past behaviour that cannot be changed.' },
          { type: 'word_bank', sentence: 'If only I _____ said something sooner!', answer: 'had', choices: ['had', 'would have', 'did', 'could have'], explanation: '"If only I had said" = past regret using "if only + past perfect".' },
          { type: 'word_bank', sentence: 'He wishes he _____ drunk so much at the party.', answer: "hadn't", choices: ["hadn't", "hasn't", "didn't", "wouldn't"], explanation: '"Wishes he hadn\'t drunk" = regret about a past action. Past perfect negative.' },
          { type: 'fill_gap', sentence: 'I wish I _____ (not/spend) all my money so quickly.', answer: "hadn't spent", hint: '"Wish + past perfect negative" for past regret', explanation: '"Hadn\'t spent" = past perfect negative. Expressing regret about a past action.' },
          { type: 'fill_gap', sentence: 'If only she _____ (listen) to my advice!', answer: 'had listened', hint: '"If only + past perfect"', explanation: '"Had listened" = past perfect. If only = strong wish/regret about the past.' },
          { type: 'fill_gap', sentence: 'He regrets _____ (not/apply) for that job.', answer: 'not having applied', hint: 'Regret + perfect gerund', explanation: '"Regrets not having applied" — "regret + perfect gerund (-ing)" for past regret.' },
          { type: 'fix_error', sentence: 'I wish I didn\'t eat so much at the party.', answer: "I wish I hadn't eaten so much at the party.", hint: '"Wish" for past = had + past participle', explanation: 'For past regrets, use "wish + past perfect": "I wish I hadn\'t eaten so much".' },
          { type: 'fix_error', sentence: 'She wishes she would have applied for the scholarship.', answer: 'She wishes she had applied for the scholarship.', hint: '"Wish" for past regret = had + past participle', explanation: '"Wish" for past regret uses "had + past participle", not "would have".' },
          { type: 'read_answer', passage: 'Sarah looks back on her university years. She wishes she had spent more time studying. If only she had joined more clubs and made more connections. She also wishes she hadn\'t wasted so much time watching TV. "If I had worked harder, things might be different now," she says.', question: 'What does Sarah wish she hadn\'t done?', answer: 'wasted so much time watching TV', explanation: 'Sarah "wishes she hadn\'t wasted so much time watching TV".' },
        ],
      },
      {
        title: 'Conditionals — full review Zero→Third + unless',
        pronunciation: [
          { type: 'repeat',       text: 'Unless you hurry, you\'ll miss the train.',       focus: '"unless" = if not, stress on "unless"' },
          { type: 'listen_write', text: 'I\'ll help you as long as you promise to try.',   focus: '"as long as" conditional connector' },
          { type: 'repeat',       text: 'Providing that you apply on time, you will be considered.', focus: '"providing that" formal connector' },
          { type: 'listen_write', text: 'Even if it rains, we\'re going ahead with the event.', focus: '"even if" — concessive conditional' },
          { type: 'repeat',       text: 'If only I had taken a different path in life.',   focus: '"if only" + past perfect — strong regret' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: '_____ you are on time, you won\'t be allowed in.', answer: 'Unless', options: ['Unless', 'If', 'Even if'], explanation: '"Unless" = "if not". "Unless you are on time" = "if you are not on time".' },
          { type: 'multiple_choice', sentence: 'If water reaches 100°C, it _____. (fact)', answer: 'boils', options: ['boils', 'will boil', 'would boil'], explanation: 'Zero conditional: universal fact. If + present → present.' },
          { type: 'word_bank', sentence: 'If he had more experience, he _____ get the job.', answer: 'might', choices: ['might', 'will', 'would have', 'had'], explanation: '"Might get" is a softer alternative to "would get" in the second conditional.' },
          { type: 'word_bank', sentence: 'I\'ll lend you the car _____ long as you return it by Sunday.', answer: 'as', choices: ['as', 'so', 'unless', 'even'], explanation: '"As long as" = on condition that. A conditional connector like "if".' },
          { type: 'fill_gap', sentence: '_____ you leave your number, I\'ll call you back. (First conditional)', answer: 'If', hint: 'Standard conditional opener for possible future', explanation: '"If you leave your number" = first conditional. Real future possibility.' },
          { type: 'fill_gap', sentence: 'She _____ (pass) if she had revised properly. (Third conditional)', answer: 'would have passed', hint: 'Unreal past result', explanation: '"Would have passed" = result clause of the third conditional.' },
          { type: 'fill_gap', sentence: '_____ if she apologises, I won\'t forgive her. (Concession)', answer: 'Even', hint: '"Even if" = regardless of the condition', explanation: '"Even if she apologises" = regardless of whether she apologises or not.' },
          { type: 'fix_error', sentence: 'Unless you don\'t hurry up, we\'ll be late.', answer: 'Unless you hurry up, we\'ll be late.', hint: '"Unless" already contains the negative meaning', explanation: '"Unless" = "if not". Adding "don\'t" creates a double negative. "Unless you hurry" is correct.' },
          { type: 'fix_error', sentence: 'If I would study abroad, my English would improve.', answer: 'If I studied abroad, my English would improve.', hint: 'Second conditional if-clause = past simple', explanation: 'Second conditional if-clause uses past simple (studied), not "would".' },
          { type: 'read_answer', passage: 'Conditional structures in English express different degrees of reality. Zero conditionals state facts. First conditionals describe real possibilities. Second conditionals imagine unreal present or future situations. Third conditionals reflect on what could have been different in the past. "Unless", "as long as", and "provided that" are alternative ways to introduce conditions.', question: 'What do third conditionals reflect on?', answer: 'what could have been different in the past', explanation: 'The passage says third conditionals "reflect on what could have been different in the past".' },
        ],
      },
    ],
  },

  // ── Module 5 — Passive Voice ─────────────────────────────────────────────
  {
    title: 'Passive Voice',
    topics: [
      {
        title: 'Passive — Present Simple & Past Simple',
        pronunciation: [
          { type: 'repeat',       text: 'English is spoken in over 50 countries.',        focus: '"is spoken" — passive rhythm' },
          { type: 'listen_write', text: 'The report was written by the research team.',   focus: '"was written by" — passive agent' },
          { type: 'repeat',       text: 'Thousands of books are published every year.',   focus: 'present simple passive plural' },
          { type: 'listen_write', text: 'The suspect was arrested last night.',            focus: 'past simple passive — no agent' },
          { type: 'repeat',       text: 'Coffee is grown in many tropical countries.',    focus: 'passive for general facts' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'The Eiffel Tower _____ (build) in 1889.', answer: 'was built', options: ['was built', 'built', 'is built'], explanation: '"Was built" = past simple passive. Subject (Tower) received the action of building.' },
          { type: 'multiple_choice', sentence: 'These cars _____ (make) in Germany.', answer: 'are made', options: ['are made', 'make', 'were made'], explanation: '"Are made" = present simple passive. Describing a current fact about where the cars are produced.' },
          { type: 'word_bank', sentence: 'The criminal _____ caught by the police yesterday.', answer: 'was', choices: ['was', 'is', 'were', 'has been'], explanation: '"Was caught" = past simple passive for a single past event.' },
          { type: 'word_bank', sentence: 'Mistakes _____ sometimes made in a hurry.', answer: 'are', choices: ['are', 'were', 'were being', 'have been'], explanation: '"Are made" = present simple passive for a general truth/habit.' },
          { type: 'fill_gap', sentence: 'The letter _____ (write) by the director himself.', answer: 'was written', hint: 'Past passive + agent (by)', explanation: '"Was written by" = past simple passive. The letter received the action.' },
          { type: 'fill_gap', sentence: 'Millions of tonnes of plastic _____ (produce) every year.', answer: 'are produced', hint: 'Present passive for ongoing fact', explanation: '"Are produced" = present simple passive. An ongoing global fact.' },
          { type: 'fill_gap', sentence: 'The injured player _____ (carry) off the field by the medical team.', answer: 'was carried', hint: 'Past passive for a specific event', explanation: '"Was carried off" = past simple passive. The player received the action.' },
          { type: 'fix_error', sentence: 'This book was wrote by a famous author.', answer: 'This book was written by a famous author.', hint: 'Past participle of "write"', explanation: 'Past participle of "write" is "written", not "wrote".' },
          { type: 'fix_error', sentence: 'The results are announce every Friday.', answer: 'The results are announced every Friday.', hint: 'Passive needs "be + past participle"', explanation: '"Announced" is the past participle of "announce". Passive = are + announced.' },
          { type: 'read_answer', passage: 'The new bridge was designed by a team of engineers from three different countries. It is considered one of the most impressive structures in the region. The project was completed in two years. It is now used by thousands of commuters every day.', question: 'Who designed the bridge?', answer: 'a team of engineers from three different countries', explanation: 'The passage says "it was designed by a team of engineers from three different countries".' },
        ],
      },
      {
        title: 'Passive — other tenses (continuous, perfect, future, modal)',
        pronunciation: [
          { type: 'repeat',       text: 'The building is being renovated at the moment.', focus: 'present continuous passive' },
          { type: 'listen_write', text: 'The results have been published online.',        focus: 'present perfect passive' },
          { type: 'repeat',       text: 'The project will be completed by December.',     focus: 'future passive with "will"' },
          { type: 'listen_write', text: 'The form must be signed by both parties.',       focus: 'modal passive — "must be"' },
          { type: 'repeat',       text: 'The issue is being investigated as we speak.',   focus: 'ongoing passive process' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'The new hospital _____ (build) right now.', answer: 'is being built', options: ['is being built', 'is built', 'has been built'], explanation: '"Is being built" = present continuous passive. An action in progress now.' },
          { type: 'multiple_choice', sentence: 'The package _____ (deliver) yet.', answer: "hasn't been delivered", options: ["hasn't been delivered", "hasn't delivered", "isn't delivered"], explanation: '"Hasn\'t been delivered" = present perfect passive negative.' },
          { type: 'word_bank', sentence: 'The winner _____ announced at the end of the evening.', answer: 'will be', choices: ['will be', 'is being', 'has been', 'was'], explanation: '"Will be announced" = future passive. Announcement expected to happen.' },
          { type: 'word_bank', sentence: 'All applications must _____ submitted by midnight.', answer: 'be', choices: ['be', 'have', 'been', 'being'], explanation: '"Must be submitted" = modal passive. The rule requires submission by midnight.' },
          { type: 'fill_gap', sentence: 'The report _____ (review) by the board next week.', answer: 'will be reviewed', hint: 'Future passive', explanation: '"Will be reviewed" = future passive. The review will happen next week.' },
          { type: 'fill_gap', sentence: 'The road _____ (repair) since last Monday.', answer: 'has been being repaired', hint: 'Present perfect continuous passive — ongoing since a point in past', explanation: '"Has been being repaired" = present perfect continuous passive. Ongoing action from Monday.' },
          { type: 'fill_gap', sentence: 'The decision _____ (take) only by senior management.', answer: 'can be taken', hint: 'Modal + passive for a rule', explanation: '"Can be taken" = modal passive. Only senior management has this authority.' },
          { type: 'fix_error', sentence: 'The film will been released in June.', answer: 'The film will be released in June.', hint: '"Will" + be + past participle', explanation: 'Future passive: "will + be + past participle". "Will been" is incorrect.' },
          { type: 'fix_error', sentence: 'The office is being clean by the staff.', answer: 'The office is being cleaned by the staff.', hint: 'Present continuous passive needs past participle', explanation: 'Present continuous passive: "is being + past participle". "Clean" → "cleaned".' },
          { type: 'read_answer', passage: 'A new metro line is being planned for the city. It will be funded by the government and is expected to be completed by 2030. Currently, several surveys have been carried out. When it is opened, it should be used by over a million passengers per day.', question: 'When is the metro line expected to be completed?', answer: '2030', explanation: 'The passage says it is "expected to be completed by 2030".' },
        ],
      },
      {
        title: 'Passive — questions + when to use',
        pronunciation: [
          { type: 'repeat',       text: 'Where was this photograph taken?',              focus: 'passive question — rising intonation' },
          { type: 'listen_write', text: 'Has the contract been signed yet?',              focus: 'present perfect passive question' },
          { type: 'repeat',       text: 'When will the results be announced?',            focus: 'future passive WH- question' },
          { type: 'listen_write', text: 'Why wasn\'t the error reported immediately?',   focus: 'past passive question — negative' },
          { type: 'repeat',       text: 'Who was the novel written by?',                 focus: 'agent as WH- focus in passive question' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'When _____ the new policy _____ (introduce)?', answer: 'was / introduced', options: ['was / introduced', 'did / introduce', 'is / introduced'], explanation: 'Past passive question: when + was + subject + past participle.' },
          { type: 'multiple_choice', sentence: '_____ the results _____ (publish) yet?', answer: 'Have / been published', options: ['Have / been published', 'Did / published', 'Are / published'], explanation: 'Present perfect passive question: have/has + subject + been + past participle.' },
          { type: 'word_bank', sentence: 'Where _____ those shoes _____ ?', answer: 'were / made', choices: ['were / made', 'did / make', 'are / made', 'have / been made'], explanation: '"Where were they made?" = past simple passive question.' },
          { type: 'word_bank', sentence: 'Who _____ the accident _____ by?', answer: 'was / caused', choices: ['was / caused', 'did / cause', 'is / caused', 'has been / caused'], explanation: '"Who was it caused by?" — asking about the agent in a past passive question.' },
          { type: 'fill_gap', sentence: '_____ the concert _____ (cancel) due to bad weather?', answer: 'Was / cancelled', hint: 'Past passive yes/no question', explanation: '"Was the concert cancelled?" = past simple passive yes/no question.' },
          { type: 'fill_gap', sentence: 'When _____ the new office _____ (open)?', answer: 'will / be opened', hint: 'Future passive WH- question', explanation: '"When will it be opened?" = future passive question.' },
          { type: 'fill_gap', sentence: 'By whom _____ the symphony _____ (compose)?', answer: 'was / composed', hint: 'Formal passive question with "by whom"', explanation: '"By whom was it composed?" = formal passive question about the agent.' },
          { type: 'fix_error', sentence: 'When did the project was completed?', answer: 'When was the project completed?', hint: 'Passive question: when + was + subject + past participle', explanation: 'Passive question does not use "did". Correct: "When was the project completed?"' },
          { type: 'fix_error', sentence: 'Has the form been filling out yet?', answer: 'Has the form been filled out yet?', hint: 'Past participle needed after "been"', explanation: '"Fill out" → past participle "filled out". Passive: "has been filled out".' },
          { type: 'read_answer', passage: 'The passive voice is used in English when the action is more important than who does it, when the agent is unknown, or when we want to be impersonal. For example, in news reports, scientific writing, and official notices. "The suspect was arrested" focuses on the event, not on who made the arrest.', question: 'Give one reason to use the passive voice.', answer: 'when the action is more important than who does it / agent is unknown / to be impersonal', explanation: 'The passage gives three reasons: action more important, agent unknown, or to be impersonal.' },
        ],
      },
    ],
  },

  // ── Module 6 — Reported Speech ───────────────────────────────────────────
  {
    title: 'Reported Speech',
    topics: [
      {
        title: 'Reported Speech — statements (backshift rules)',
        pronunciation: [
          { type: 'repeat',       text: 'She said she was feeling much better.',          focus: 'backshift — am → was' },
          { type: 'listen_write', text: 'He told me he had already sent the email.',      focus: '"told me" + past perfect' },
          { type: 'repeat',       text: 'They said they would call us the next day.',     focus: '"will" → "would" in reported speech' },
          { type: 'listen_write', text: 'She mentioned that she hadn\'t slept well.',     focus: '"hadn\'t" in backshift context' },
          { type: 'repeat',       text: 'He said he had been working on it all night.',  focus: '"has been" → "had been" backshift' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: '"I am tired." She said she _____ tired.', answer: 'was', options: ['was', 'is', 'had been'], explanation: 'Backshift: present simple "am" → past simple "was" in reported speech.' },
          { type: 'multiple_choice', sentence: '"We will call you." They said they _____ call us.', answer: 'would', options: ['would', 'will', 'should'], explanation: 'Backshift: "will" → "would" in reported speech.' },
          { type: 'word_bank', sentence: '"I have finished." He told me he _____ finished.', answer: 'had', choices: ['had', 'have', 'has', 'was'], explanation: 'Backshift: present perfect "have finished" → past perfect "had finished".' },
          { type: 'word_bank', sentence: '"I can\'t come." She said she _____ come.', answer: "couldn't", choices: ["couldn't", "can't", "won't", "wasn't"], explanation: 'Backshift: "can\'t" → "couldn\'t" in reported speech.' },
          { type: 'fill_gap', sentence: '"I am leaving tomorrow." He said he _____ (leave) the next day.', answer: 'was leaving', hint: 'Backshift: present continuous → past continuous', explanation: '"Am leaving" (present continuous) → "was leaving" (past continuous) in reported speech.' },
          { type: 'fill_gap', sentence: '"We live in Milan." They told us they _____ (live) in Milan.', answer: 'lived', hint: 'Backshift: present simple → past simple', explanation: '"Live" (present simple) → "lived" (past simple) in reported speech.' },
          { type: 'fill_gap', sentence: '"She had already left." He said she _____ (leave) already.', answer: 'had already left', hint: 'Past perfect stays past perfect in backshift', explanation: 'Past perfect "had left" does not change in reported speech — it stays "had left".' },
          { type: 'fix_error', sentence: 'He said that he is going to resign.', answer: 'He said that he was going to resign.', hint: 'Backshift: "is going to" → "was going to"', explanation: '"Is going to" → "was going to" in reported speech (backshift).' },
          { type: 'fix_error', sentence: 'She told me that she will call me later.', answer: 'She told me that she would call me later.', hint: '"Will" → "would" in reported speech', explanation: '"Will call" → "would call" when backshifting in reported speech.' },
          { type: 'read_answer', passage: '"I haven\'t been able to sleep," she admitted. "I\'ve been thinking about the presentation all night. I will be ready by tomorrow morning, I promise." Later, she told her manager that she hadn\'t been able to sleep and that she had been thinking about the presentation. She said she would be ready by the following morning.', question: 'What did she say she would be ready by?', answer: 'the following morning', explanation: 'In reported speech, she said "she would be ready by the following morning".' },
        ],
      },
      {
        title: 'Reported Speech — questions / indirect questions',
        pronunciation: [
          { type: 'repeat',       text: 'She asked me where I had been.',                focus: 'indirect question — statement word order' },
          { type: 'listen_write', text: 'He wanted to know if I had enjoyed the film.',  focus: '"if" in yes/no indirect questions' },
          { type: 'repeat',       text: 'They asked us what we were planning to do.',    focus: 'WH- indirect question structure' },
          { type: 'listen_write', text: 'I asked whether she had received my message.',  focus: '"whether" for indirect yes/no question' },
          { type: 'repeat',       text: 'He couldn\'t tell us how long it would take.', focus: 'embedded indirect question' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: '"Where do you live?" She asked me where I _____.', answer: 'lived', options: ['lived', 'did live', 'do live'], explanation: 'Indirect questions use statement word order + backshift. "Do you live" → "I lived".' },
          { type: 'multiple_choice', sentence: '"Are you happy?" He asked me _____ I was happy.', answer: 'if', options: ['if', 'whether', 'that'], explanation: '"If" or "whether" introduces a reported yes/no question.' },
          { type: 'word_bank', sentence: 'She asked us _____ we had seen the film.', answer: 'whether', choices: ['whether', 'if', 'what', 'that'], explanation: '"Whether" introduces reported yes/no questions. Interchangeable with "if" here.' },
          { type: 'word_bank', sentence: 'He wanted to know _____ I was feeling better.', answer: 'if', choices: ['if', 'whether', 'that', 'when'], explanation: '"If" introduces a reported yes/no question. "Did you feel better?" → "if I was feeling better".' },
          { type: 'fill_gap', sentence: '"What time does the train leave?" She asked what time the train _____ (leave).', answer: 'left', hint: 'WH- indirect question + backshift', explanation: '"Leaves" → "left" (backshift). Indirect question uses statement word order.' },
          { type: 'fill_gap', sentence: '"Have you finished?" He asked _____ I had finished.', answer: 'if / whether', hint: 'Yes/no question reported with "if" or "whether"', explanation: '"If" or "whether" introduces a reported yes/no question.' },
          { type: 'fill_gap', sentence: '"Why are you late?" She wanted to know why I _____ (be) late.', answer: 'was', hint: 'Backshift in reported WH- question', explanation: '"Why are you late?" → "why I was late". "Am" → "was" (backshift).' },
          { type: 'fix_error', sentence: 'He asked me where did I work.', answer: 'He asked me where I worked.', hint: 'Indirect questions use statement order (no inversion)', explanation: 'Indirect questions do not invert subject and auxiliary: "where I worked" (not "where did I work").' },
          { type: 'fix_error', sentence: 'She asked that I was ready.', answer: 'She asked if I was ready.', hint: '"Ask" + yes/no question uses "if/whether"', explanation: 'For reported yes/no questions, use "if" or "whether", not "that".' },
          { type: 'read_answer', passage: 'At the job interview, the manager asked the candidate what experience she had, whether she had worked in a team before, and how she would handle conflict. The candidate was also asked if she had any questions. She asked what the company culture was like and when a decision would be made.', question: 'What did the candidate ask about?', answer: 'the company culture and when a decision would be made', explanation: 'She asked "what the company culture was like and when a decision would be made".' },
        ],
      },
      {
        title: 'Reported Speech — commands + reporting verbs',
        pronunciation: [
          { type: 'repeat',       text: 'He told her not to worry about the deadline.',  focus: '"told + not to" for negative command' },
          { type: 'listen_write', text: 'She advised him to see a doctor immediately.',  focus: '"advised + to" reporting verb' },
          { type: 'repeat',       text: 'The manager warned us not to be late again.',   focus: '"warned + not to"' },
          { type: 'listen_write', text: 'They asked us to submit our reports by Friday.', focus: '"asked + to" for reported request' },
          { type: 'repeat',       text: 'She reminded me to bring my passport.',          focus: '"reminded + to" for reminder' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: '"Please sit down." He told me _____ down.', answer: 'to sit', options: ['to sit', 'sit', 'that I sit'], explanation: 'Reported commands: tell + object + to + base form. "Please sit" → "told me to sit".' },
          { type: 'multiple_choice', sentence: '"Don\'t be late." She told him _____ late.', answer: 'not to be', options: ['not to be', 'to not be', 'don\'t be'], explanation: 'Reported negative commands: tell + object + not to + base form.' },
          { type: 'word_bank', sentence: 'The doctor _____ me to get more rest.', answer: 'advised', choices: ['advised', 'told', 'said', 'asked'], explanation: '"Advised someone to" = gave advice. A reporting verb followed by object + to + infinitive.' },
          { type: 'word_bank', sentence: 'She _____ me not to mention it to anyone.', answer: 'warned', choices: ['warned', 'told', 'said', 'asked'], explanation: '"Warned someone not to" = cautioned about a negative consequence.' },
          { type: 'fill_gap', sentence: '"Remember to lock the door." He reminded me _____ (lock) the door.', answer: 'to lock', hint: '"Remind" + object + to + infinitive', explanation: '"Reminded me to lock" — "remind" is followed by object + to + infinitive.' },
          { type: 'fill_gap', sentence: '"Don\'t touch that button." She warned him _____ (not/touch) that button.', answer: 'not to touch', hint: 'Reported negative command', explanation: '"Warned him not to touch" — reported negative command: not to + base form.' },
          { type: 'fill_gap', sentence: '"Could you close the window?" She asked him _____ (close) the window.', answer: 'to close', hint: 'Polite request → reported as "asked + to"', explanation: '"Asked him to close" — polite requests are reported with "ask + object + to".' },
          { type: 'fix_error', sentence: 'He said me to call him back.', answer: 'He told me to call him back.', hint: '"Say" doesn\'t take an object before "to"', explanation: '"Say" cannot take an indirect object before "to". Use "tell": "He told me to call him back".' },
          { type: 'fix_error', sentence: 'She advised him not taking the job.', answer: 'She advised him not to take the job.', hint: '"Advise" + object + not to + infinitive', explanation: '"Advise someone not to" + infinitive: "not to take" (not "not taking").' },
          { type: 'read_answer', passage: 'The coach told the players to warm up properly. He warned them not to underestimate the opposition. He advised them to stay focused and encouraged them to trust their training. Before they left, he reminded them to get enough sleep the night before the match.', question: 'What did the coach warn the players not to do?', answer: 'underestimate the opposition', explanation: 'The coach "warned them not to underestimate the opposition".' },
        ],
      },
    ],
  },

  // ── Module 7 — Clauses & Verb Patterns ──────────────────────────────────
  {
    title: 'Clauses & Verb Patterns',
    topics: [
      {
        title: 'Relative clauses — defining',
        pronunciation: [
          { type: 'repeat',       text: 'The woman who lives next door is a doctor.',    focus: '"who" for people in defining clauses' },
          { type: 'listen_write', text: 'This is the book that changed my life.',         focus: '"that" in a defining relative clause' },
          { type: 'repeat',       text: 'The city where I grew up no longer exists.',    focus: '"where" for place in relative clause' },
          { type: 'listen_write', text: 'He\'s the man whose car was stolen.',           focus: '"whose" for possession' },
          { type: 'repeat',       text: 'The day when I met her is unforgettable.',      focus: '"when" for time reference' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'She\'s the person _____ helped me find the job.', answer: 'who', options: ['who', 'which', 'whose'], explanation: '"Who" introduces a defining relative clause referring to a person.' },
          { type: 'multiple_choice', sentence: 'This is the company _____ I have always wanted to work for.', answer: 'that / which', options: ['that / which', 'who', 'whose'], explanation: '"That" or "which" refers to things/organisations in defining relative clauses.' },
          { type: 'word_bank', sentence: 'The film _____ we saw last night was brilliant.', answer: 'that', choices: ['that', 'who', 'whose', 'where'], explanation: '"That" (or "which") introduces a defining relative clause about a film (thing).' },
          { type: 'word_bank', sentence: 'The man _____ daughter won the competition is very proud.', answer: 'whose', choices: ['whose', 'who', 'that', 'which'], explanation: '"Whose" shows possession in a relative clause — "the man whose daughter".' },
          { type: 'fill_gap', sentence: 'This is the restaurant _____ we had our first date.', answer: 'where', hint: '"Where" for a place', explanation: '"Where" introduces a relative clause referring to a place — "the restaurant where we..."' },
          { type: 'fill_gap', sentence: 'The book _____ I recommended is now a bestseller.', answer: 'that / which', hint: '"That" or "which" for things', explanation: '"That" or "which" can introduce defining relative clauses about things.' },
          { type: 'fill_gap', sentence: 'That\'s the student _____ essay won the prize.', answer: 'whose', hint: '"Whose" for possession', explanation: '"Whose essay" shows the student owns the essay. "Whose" = of whom/which.' },
          { type: 'fix_error', sentence: 'The woman which called me was very polite.', answer: 'The woman who called me was very polite.', hint: '"Who" for people, not "which"', explanation: '"Who" refers to people in relative clauses. "Which" is for things.' },
          { type: 'fix_error', sentence: 'He\'s the doctor who I trust his judgement.', answer: 'He\'s the doctor whose judgement I trust.', hint: '"Whose" for possession', explanation: '"Whose judgement" is correct. "Who I trust his judgement" is redundant.' },
          { type: 'read_answer', passage: 'The Nobel Prize is awarded to individuals who have made outstanding contributions to science, literature, or peace. The prize, which was established by Alfred Nobel, is one of the most prestigious awards in the world. Nobel was a Swedish chemist whose fortune funded the prizes.', question: 'Who established the Nobel Prize?', answer: 'Alfred Nobel', explanation: 'The passage says "the prize, which was established by Alfred Nobel".' },
        ],
      },
      {
        title: 'Relative clauses — non-defining',
        pronunciation: [
          { type: 'repeat',       text: 'My sister, who lives in London, is visiting next week.', focus: 'commas + "who" — extra information' },
          { type: 'listen_write', text: 'Paris, which is the capital of France, is beautiful.', focus: '"which" in non-defining clause' },
          { type: 'repeat',       text: 'My boss, whose name I always forget, called yesterday.', focus: '"whose" in non-defining clause' },
          { type: 'listen_write', text: 'The meeting, which lasted four hours, was very productive.', focus: 'non-defining clause with event' },
          { type: 'repeat',       text: 'He gave me some advice, which I found very useful.',  focus: '"which" referring back to whole clause' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'My mother, _____ is a nurse, works night shifts.', answer: 'who', options: ['who', 'that', 'which'], explanation: 'Non-defining relative clauses use "who" for people. "That" cannot be used in non-defining clauses.' },
          { type: 'multiple_choice', sentence: 'She passed the exam, _____ surprised everyone.', answer: 'which', options: ['which', 'that', 'what'], explanation: '"Which" can refer to the whole previous idea/clause in a non-defining relative clause.' },
          { type: 'word_bank', sentence: 'The conference, _____ took place in Vienna, was very successful.', answer: 'which', choices: ['which', 'that', 'who', 'when'], explanation: '"Which" refers to things/events in non-defining relative clauses (not "that").' },
          { type: 'word_bank', sentence: 'My colleague Sarah, _____ husband is a chef, loves food.', answer: 'whose', choices: ['whose', 'who', 'which', 'that'], explanation: '"Whose husband" — non-defining relative clause showing possession.' },
          { type: 'fill_gap', sentence: 'The Colosseum, _____ is in Rome, attracts millions of visitors.', answer: 'which', hint: '"Which" for things/places in non-defining clauses', explanation: '"Which is in Rome" = non-defining relative clause about a place. Use "which", not "that".' },
          { type: 'fill_gap', sentence: 'Tom, _____ I\'ve known for twenty years, is my best friend.', answer: 'whom / who', hint: '"Who/whom" for people in non-defining clauses', explanation: '"Whom I\'ve known" (formal) or "who I\'ve known" — both correct for non-defining clauses about people.' },
          { type: 'fill_gap', sentence: 'She offered me the job, _____ I immediately accepted.', answer: 'which', hint: '"Which" referring to the previous statement', explanation: '"Which I immediately accepted" — "which" refers back to the whole offer.' },
          { type: 'fix_error', sentence: 'My car, that needs a service, is at the garage.', answer: 'My car, which needs a service, is at the garage.', hint: '"That" cannot be used in non-defining relative clauses', explanation: '"That" is not used in non-defining relative clauses (set off by commas). Use "which".' },
          { type: 'fix_error', sentence: 'Brazil, where I visited last year, is amazing.', answer: 'Brazil, which I visited last year, is amazing.', hint: '"Where" is for places of location, not visits', explanation: '"Where" is used for places where things happen/exist. For visiting, use "which I visited".' },
          { type: 'read_answer', passage: 'Sir David Attenborough, who is now in his nineties, has presented wildlife documentaries for decades. His series Planet Earth, which was produced by the BBC, is one of the most-watched nature programmes in history. Attenborough, whose voice is instantly recognisable, continues to advocate for the environment.', question: 'Who produced Planet Earth?', answer: 'the BBC', explanation: 'The passage says "Planet Earth, which was produced by the BBC".' },
        ],
      },
      {
        title: 'Gerunds vs. Infinitives — Part 1',
        pronunciation: [
          { type: 'repeat',       text: 'I enjoy swimming in the sea in summer.',        focus: '"enjoy" always takes gerund' },
          { type: 'listen_write', text: 'She decided to study abroad after graduation.',  focus: '"decided to" + infinitive' },
          { type: 'repeat',       text: 'They suggested going to the cinema.',           focus: '"suggest" + gerund' },
          { type: 'listen_write', text: 'He managed to finish on time despite the delays.', focus: '"managed to" + infinitive' },
          { type: 'repeat',       text: 'I can\'t imagine living anywhere else.',         focus: '"can\'t imagine" + gerund' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'She enjoys _____ (read) in the evening.', answer: 'reading', options: ['reading', 'to read', 'read'], explanation: '"Enjoy" is always followed by the gerund (-ing form).' },
          { type: 'multiple_choice', sentence: 'He decided _____ (apply) for the position.', answer: 'to apply', options: ['to apply', 'applying', 'apply'], explanation: '"Decide" is followed by the infinitive (to + base form).' },
          { type: 'word_bank', sentence: 'I can\'t afford _____ a new car right now.', answer: 'to buy', choices: ['to buy', 'buying', 'buy', 'bought'], explanation: '"Afford" is followed by the infinitive: "can\'t afford to buy".' },
          { type: 'word_bank', sentence: 'We considered _____ our holiday to next month.', answer: 'postponing', choices: ['postponing', 'to postpone', 'postpone', 'postponed'], explanation: '"Consider" is followed by the gerund: "considered postponing".' },
          { type: 'fill_gap', sentence: 'She suggested _____ (have) dinner at the new Italian restaurant.', answer: 'having', hint: '"Suggest" + gerund', explanation: '"Suggest" is always followed by a gerund: "suggested having dinner".' },
          { type: 'fill_gap', sentence: 'He managed _____ (solve) the problem without any help.', answer: 'to solve', hint: '"Manage" + infinitive', explanation: '"Manage to" = succeed in doing something. Followed by infinitive.' },
          { type: 'fill_gap', sentence: 'I don\'t mind _____ (wait) if you\'re not ready.', answer: 'waiting', hint: '"Mind" + gerund', explanation: '"Don\'t mind" = have no objection to. Always followed by gerund.' },
          { type: 'fix_error', sentence: 'They finished to prepare the presentation.', answer: 'They finished preparing the presentation.', hint: '"Finish" + gerund', explanation: '"Finish" is always followed by the gerund: "finished preparing".' },
          { type: 'fix_error', sentence: 'She promised helping me with the project.', answer: 'She promised to help me with the project.', hint: '"Promise" + infinitive', explanation: '"Promise" is followed by the infinitive: "promised to help".' },
          { type: 'read_answer', passage: 'Common verbs followed by gerunds include: enjoy, suggest, consider, avoid, imagine, mind, finish, practise, keep and admit. Common verbs followed by infinitives include: want, decide, hope, manage, promise, refuse, agree, afford and expect. Learning which is which is important for fluency.', question: 'Name two verbs from the passage that are followed by gerunds.', answer: 'enjoy / suggest / consider / avoid / imagine / mind / finish / practise / keep / admit (any two)', explanation: 'The passage lists enjoy, suggest, consider, avoid, imagine, mind, finish, practise, keep and admit.' },
        ],
      },
      {
        title: 'Gerunds vs. Infinitives — Part 2 (stop, remember, try…)',
        pronunciation: [
          { type: 'repeat',       text: 'I stopped to buy some milk on the way home.',  focus: '"stop to" = pause in order to do' },
          { type: 'listen_write', text: 'She stopped eating sugar three months ago.',   focus: '"stop + gerund" = quit the habit' },
          { type: 'repeat',       text: 'Remember to call your mother tonight.',         focus: '"remember to" = don\'t forget' },
          { type: 'listen_write', text: 'I remember meeting him at the conference.',    focus: '"remember + gerund" = recollection' },
          { type: 'repeat',       text: 'Try to finish it before lunch if you can.',    focus: '"try to" = make an attempt' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'She stopped _____ (smoke) two years ago.', answer: 'smoking', options: ['smoking', 'to smoke', 'smoke'], explanation: '"Stop + gerund" = quit the activity. She stopped smoking = she quit the habit.' },
          { type: 'multiple_choice', sentence: 'On his way to the meeting, he stopped _____ a coffee.', answer: 'to get', options: ['to get', 'getting', 'get'], explanation: '"Stop + infinitive" = pause in order to do something else.' },
          { type: 'word_bank', sentence: 'Remember _____ the form before you leave.', answer: 'to sign', choices: ['to sign', 'signing', 'sign', 'signed'], explanation: '"Remember + infinitive" = don\'t forget to do something (future action).' },
          { type: 'word_bank', sentence: 'I remember _____ her somewhere before.', answer: 'seeing', choices: ['seeing', 'to see', 'see', 'to have seen'], explanation: '"Remember + gerund" = recall a past event. "I remember seeing her" = I recall the experience.' },
          { type: 'fill_gap', sentence: 'Try _____ (arrive) on time — first impressions matter.', answer: 'to arrive', hint: '"Try to" = make an attempt', explanation: '"Try to arrive" = make an effort to arrive on time.' },
          { type: 'fill_gap', sentence: 'I tried _____ (open) the window but it was stuck.', answer: 'to open', hint: '"Try to" = attempt (but may fail)', explanation: '"Tried to open" = made an attempt. Implies possible failure.' },
          { type: 'fill_gap', sentence: 'He regrets _____ (not/study) harder at school.', answer: 'not having studied', hint: '"Regret" for past event = gerund (perfect)', explanation: '"Regret + gerund" = feel sorry about a past action. "Not having studied" = perfect gerund.' },
          { type: 'fix_error', sentence: 'Don\'t forget calling the dentist tomorrow.', answer: "Don't forget to call the dentist tomorrow.", hint: '"Forget" for future tasks = infinitive', explanation: '"Forget + infinitive" = don\'t fail to do a future task. "Forget + gerund" = fail to remember a past event.' },
          { type: 'fix_error', sentence: 'I\'ll never forget to meet my hero.', answer: "I'll never forget meeting my hero.", hint: '"Forget + gerund" = will always remember a past experience', explanation: '"Forget + gerund" = fail to remember a past experience. "I\'ll never forget meeting" = a memorable past event.' },
          { type: 'read_answer', passage: 'Some verbs change meaning depending on whether they are followed by a gerund or an infinitive. "Stop smoking" means to quit the habit; "stop to smoke" means to pause in order to have a cigarette. "Remember to call" means don\'t forget; "remember calling" means you recall a past event. "Try to" means attempt; "try + -ing" means experiment with a solution.', question: 'What does "remember calling" mean?', answer: 'you recall a past event / you remember that you called', explanation: 'The passage says "remember calling" means "you recall a past event".' },
        ],
      },
    ],
  },

  // ── Module 8 — Fluência B1 ───────────────────────────────────────────────
  {
    title: 'Fluency B1',
    topics: [
      {
        title: 'Phrasal verbs — Set 1 (top 25 essentials)',
        pronunciation: [
          { type: 'repeat',       text: 'I need to look into this matter further.',      focus: '"look into" = investigate' },
          { type: 'listen_write', text: 'She gave up smoking last year.',                 focus: '"give up" = stop/quit' },
          { type: 'repeat',       text: 'They called off the meeting at the last minute.', focus: '"call off" = cancel' },
          { type: 'listen_write', text: 'I came across an old photo album in the attic.', focus: '"come across" = find by chance' },
          { type: 'repeat',       text: 'He turned down the offer without hesitation.',  focus: '"turn down" = refuse/reject' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'She _____ (give up) her job to travel the world.', answer: 'gave up', options: ['gave up', 'gave in', 'gave away'], explanation: '"Give up" = quit/stop doing something. "She gave up her job."' },
          { type: 'multiple_choice', sentence: 'He _____ (look up) the word in the dictionary.', answer: 'looked up', options: ['looked up', 'looked into', 'looked after'], explanation: '"Look up" = search for information (in dictionary, online, etc.).' },
          { type: 'word_bank', sentence: 'The fire alarm _____ in the middle of the meeting.', answer: 'went off', choices: ['went off', 'went out', 'went on', 'went away'], explanation: '"Go off" = (alarm) starts ringing/sounding.' },
          { type: 'word_bank', sentence: 'I need to _____ this problem — it keeps happening.', answer: 'deal with', choices: ['deal with', 'look for', 'take on', 'go over'], explanation: '"Deal with" = handle or address a problem.' },
          { type: 'fill_gap', sentence: 'She _____ (come across) an interesting article about language learning.', answer: 'came across', hint: '"Come across" = find unexpectedly', explanation: '"Come across" = encounter or find something unexpectedly.' },
          { type: 'fill_gap', sentence: 'The company has decided to _____ (call off) the product launch.', answer: 'call off', hint: '"Call off" = cancel', explanation: '"Call off" = cancel an event or plan.' },
          { type: 'fill_gap', sentence: 'He _____ (turn down) the job offer because the salary was too low.', answer: 'turned down', hint: '"Turn down" = refuse', explanation: '"Turn down" = reject/refuse an offer.' },
          { type: 'fix_error', sentence: 'She looked the word up on the internet the meaning.', answer: 'She looked up the meaning of the word on the internet.', hint: '"Look up" = search; word order matters', explanation: '"Look up the meaning" is the natural word order. The object goes between or after "look up".' },
          { type: 'fix_error', sentence: 'He gave up to smoke for health reasons.', answer: 'He gave up smoking for health reasons.', hint: '"Give up" + gerund, not infinitive', explanation: '"Give up" is followed by a gerund (smoking), not an infinitive.' },
          { type: 'read_answer', passage: 'Phrasal verbs are an essential part of everyday English. Native speakers use them constantly in conversation. You can pick up phrasal verbs by reading, watching TV shows, and keeping a vocabulary notebook. Don\'t give up — once you get used to them, they become much easier.', question: 'How does the passage suggest you can learn phrasal verbs?', answer: 'reading, watching TV shows, keeping a vocabulary notebook', explanation: 'The passage says "You can pick up phrasal verbs by reading, watching TV shows, and keeping a vocabulary notebook".' },
        ],
      },
      {
        title: 'Discourse markers — contrast, addition, cause & result',
        pronunciation: [
          { type: 'repeat',       text: 'However, the results were disappointing.',       focus: '"However" — contrast marker, initial position' },
          { type: 'listen_write', text: 'Furthermore, the cost has increased significantly.', focus: '"Furthermore" = addition marker' },
          { type: 'repeat',       text: 'As a result, we had to change our plans.',       focus: '"As a result" — cause-effect' },
          { type: 'listen_write', text: 'In spite of this, the team remained positive.',  focus: '"In spite of this" — concession' },
          { type: 'repeat',       text: 'In addition to this, the new system saves time.', focus: '"In addition to this" — addition' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'She was tired. _____, she finished the report.', answer: 'Nevertheless', options: ['Nevertheless', 'Therefore', 'Furthermore'], explanation: '"Nevertheless" = despite this. Introduces contrast after a negative point.' },
          { type: 'multiple_choice', sentence: 'He didn\'t study. _____, he failed the exam.', answer: 'As a result', options: ['As a result', 'However', 'In addition'], explanation: '"As a result" introduces a consequence or effect.' },
          { type: 'word_bank', sentence: '_____ being expensive, the car is also unreliable.', answer: 'Apart from', choices: ['Apart from', 'In spite of', 'Despite', 'As well as'], explanation: '"Apart from" = in addition to (negative sense). "Apart from being expensive, it\'s also unreliable."' },
          { type: 'word_bank', sentence: 'The plan is risky. _____, the potential rewards are huge.', answer: 'On the other hand', choices: ['On the other hand', 'As a result', 'Furthermore', 'Therefore'], explanation: '"On the other hand" introduces a contrasting point or perspective.' },
          { type: 'fill_gap', sentence: 'She works long hours. _____, she still finds time to exercise.', answer: 'Nevertheless', hint: 'Contrast — unexpected outcome', explanation: '"Nevertheless" = despite what was mentioned. Surprising positive outcome.' },
          { type: 'fill_gap', sentence: 'Prices have risen _____ increased demand from consumers.', answer: 'due to', hint: 'Cause expressed with a noun phrase', explanation: '"Due to" introduces a cause followed by a noun phrase.' },
          { type: 'fill_gap', sentence: '_____ her lack of experience, she performed remarkably well.', answer: 'Despite', hint: 'Concession with noun phrase', explanation: '"Despite" + noun phrase = in spite of. "Despite her lack of experience".' },
          { type: 'fix_error', sentence: 'The project was delayed. However, it was finished eventually however.', answer: 'The project was delayed. However, it was finished eventually.', hint: '"However" should appear only once', explanation: '"However" should appear once, either at the start or mid-sentence (with commas), not at both positions.' },
          { type: 'fix_error', sentence: 'Despite of the rain, we enjoyed the picnic.', answer: 'Despite the rain, we enjoyed the picnic.', hint: '"Despite" does not take "of"', explanation: '"Despite" is not followed by "of". "In spite of" takes "of", but "despite" does not.' },
          { type: 'read_answer', passage: 'Discourse markers help organise ideas and signal relationships between them. "However" and "nevertheless" signal contrast. "Furthermore" and "in addition" add information. "As a result" and "therefore" show consequences. "Despite" and "in spite of" introduce concessions. Using a variety of connectors makes writing more sophisticated.', question: 'Name one discourse marker used to show consequences.', answer: '"As a result" or "therefore"', explanation: 'The passage says "As a result" and "therefore" show consequences.' },
        ],
      },
      {
        title: 'Future forms — integrative review',
        pronunciation: [
          { type: 'repeat',       text: 'I\'m meeting Sarah for lunch tomorrow.',        focus: 'present continuous for arranged future' },
          { type: 'listen_write', text: 'The train leaves at 9:15 — don\'t be late.',   focus: 'present simple for scheduled future' },
          { type: 'repeat',       text: 'By this time next week, I\'ll be on holiday.', focus: 'future continuous "will be + -ing"' },
          { type: 'listen_write', text: 'I\'m going to apply for the scholarship.',      focus: '"going to" for intention' },
          { type: 'repeat',       text: 'I think she\'ll do brilliantly in the exam.',  focus: '"will" for prediction/opinion' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'The match _____ at 8 pm. It\'s in the schedule.', answer: 'starts', options: ['starts', 'will start', 'is starting'], explanation: 'Present simple for scheduled/timetabled future events: "The match starts at 8 pm".' },
          { type: 'multiple_choice', sentence: 'Look at those dark clouds! It _____ rain.', answer: "is going to", options: ["is going to", "will", "shall"], explanation: '"Going to" = prediction based on clear visual evidence (dark clouds).' },
          { type: 'word_bank', sentence: 'I _____ my sister at the airport tomorrow. It\'s all arranged.', answer: "am meeting", choices: ["am meeting", "meet", "will meet", "going to meet"], explanation: 'Present continuous for a fixed personal arrangement: "I am meeting my sister".' },
          { type: 'word_bank', sentence: 'A: The phone is ringing! B: I _____ get it!', answer: "I'll", choices: ["I'll", "I'm going to", "I'm", "I should"], explanation: '"I\'ll get it" = spontaneous decision made in the moment. Use "will" for this.' },
          { type: 'fill_gap', sentence: 'I\'ve already bought the tickets. We _____ (see) the show on Friday.', answer: "are going to see", hint: 'Pre-arranged plan = "going to"', explanation: '"Going to see" — the plan was made in advance (tickets already bought).' },
          { type: 'fill_gap', sentence: 'I think renewable energy _____ (replace) fossil fuels eventually.', answer: "will replace", hint: 'Opinion-based prediction = "will"', explanation: '"Will replace" = prediction based on personal opinion ("I think").' },
          { type: 'fill_gap', sentence: 'The flight _____ (arrive) at 6:40 am according to the website.', answer: "arrives", hint: 'Timetabled schedule = present simple', explanation: 'Scheduled arrivals/departures use present simple: "arrives at 6:40 am".' },
          { type: 'fix_error', sentence: 'I will meet Tom for coffee at 3 pm — we planned it yesterday.', answer: "I'm meeting Tom for coffee at 3 pm — we planned it yesterday.", hint: 'Fixed arrangement = present continuous', explanation: 'Pre-arranged personal plans use present continuous: "I\'m meeting Tom".' },
          { type: 'fix_error', sentence: 'A: I\'m cold. B: I\'m going to close the window.', answer: "A: I'm cold. B: I'll close the window.", hint: 'Spontaneous offer = "will"', explanation: 'Spontaneous decisions/offers use "will/\'ll", not "going to".' },
          { type: 'read_answer', passage: 'English has several future forms. "Will" is used for predictions based on opinion, promises, and spontaneous decisions. "Going to" describes intentions and predictions with evidence. The present continuous describes arranged future events. The present simple is used for scheduled events. Each form has its own context.', question: 'Which future form describes arranged future events?', answer: 'present continuous', explanation: 'The passage says "The present continuous describes arranged future events".' },
        ],
      },
      {
        title: 'Future Continuous + Future Perfect',
        pronunciation: [
          { type: 'repeat',       text: 'This time tomorrow, I\'ll be flying over the Atlantic.', focus: '"will be + -ing" = future continuous' },
          { type: 'listen_write', text: 'By the time you arrive, I\'ll have cooked dinner.', focus: '"will have + past participle" = future perfect' },
          { type: 'repeat',       text: 'She\'ll be presenting at the conference all day.', focus: 'future continuous for ongoing future activity' },
          { type: 'listen_write', text: 'They\'ll have finished the project by next Friday.', focus: '"will have finished" — future perfect' },
          { type: 'repeat',       text: 'Will you still be working when I get back?',     focus: 'future continuous question' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'At this time next Monday, she _____ in New York.', answer: "will be working", options: ["will be working", "will have worked", "will work"], explanation: '"Will be working" = future continuous. An activity in progress at a specific future time.' },
          { type: 'multiple_choice', sentence: 'By Friday, they _____ the contract.', answer: "will have signed", options: ["will have signed", "will be signing", "will sign"], explanation: '"Will have signed" = future perfect. The action will be complete before Friday.' },
          { type: 'word_bank', sentence: 'By the time you wake up, I _____ already left.', answer: "will have", choices: ["will have", "will be", "would have", "will"], explanation: '"Will have left" = future perfect. Completed before a specific future moment.' },
          { type: 'word_bank', sentence: 'I\'ll be having my lunch meeting _____ you call.', answer: "when", choices: ["when", "by", "after", "before"], explanation: '"When you call" = the future continuous action will be in progress at that moment.' },
          { type: 'fill_gap', sentence: 'In ten years, electric cars _____ (replace) most petrol vehicles.', answer: "will have replaced", hint: 'Completed action by a future point', explanation: '"Will have replaced" = future perfect. By 10 years from now, the replacement will be complete.' },
          { type: 'fill_gap', sentence: 'Don\'t call at 7 pm — she _____ (have) her guitar lesson.', answer: "will be having", hint: 'Ongoing activity at a specific future time', explanation: '"Will be having" = future continuous. An activity in progress at that future moment.' },
          { type: 'fill_gap', sentence: 'By the time she retires, she _____ (teach) for 35 years.', answer: "will have taught", hint: 'Duration completed by a future point', explanation: '"Will have taught" = future perfect. Completed duration of 35 years by retirement.' },
          { type: 'fix_error', sentence: 'By next year, we will finish this project.', answer: 'By next year, we will have finished this project.', hint: '"By + future time" signals future perfect', explanation: '"By next year" = completion before a future deadline → future perfect "will have finished".' },
          { type: 'fix_error', sentence: 'At noon tomorrow she will work in the garden.', answer: 'At noon tomorrow she will be working in the garden.', hint: '"At this time" + ongoing activity = future continuous', explanation: '"At noon tomorrow" with an ongoing activity = future continuous: "will be working".' },
          { type: 'read_answer', passage: 'The future continuous describes an action in progress at a specific time in the future: "I\'ll be driving home at 6 pm." The future perfect describes an action completed before a specific future time: "I\'ll have arrived by 7 pm." The key difference is whether the action is ongoing or completed.', question: 'What is the key difference between the future continuous and future perfect?', answer: 'continuous = ongoing; perfect = completed', explanation: 'The passage says "the key difference is whether the action is ongoing or completed".' },
        ],
      },
      {
        title: 'Question tags',
        pronunciation: [
          { type: 'repeat',       text: 'It\'s a beautiful day, isn\'t it?',              focus: 'positive statement → negative tag' },
          { type: 'listen_write', text: 'You haven\'t met her before, have you?',          focus: 'negative statement → positive tag' },
          { type: 'repeat',       text: 'She should be here by now, shouldn\'t she?',    focus: 'modal in main clause → tag' },
          { type: 'listen_write', text: 'Let\'s take a break, shall we?',                 focus: '"shall we" special tag' },
          { type: 'repeat',       text: 'You\'d never do that, would you?',               focus: '"would you" tag with "\'d"' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'It\'s a long way from here, _____?', answer: "isn't it", options: ["isn't it", "is it", "doesn't it"], explanation: 'Positive statement + negative tag. "It is" → "isn\'t it?" tag.' },
          { type: 'multiple_choice', sentence: 'He can\'t swim, _____?', answer: 'can he', options: ['can he', "can't he", "does he"], explanation: 'Negative statement + positive tag. "Can\'t" → positive "can he?".' },
          { type: 'word_bank', sentence: 'You haven\'t been here before, _____ ?', answer: 'have you', choices: ['have you', "haven't you", 'do you', 'did you'], explanation: '"Haven\'t been" (negative perfect) → positive tag "have you?".' },
          { type: 'word_bank', sentence: 'Let\'s take a short break, _____ ?', answer: 'shall we', choices: ['shall we', "shouldn't we", 'will we', "won't we"], explanation: '"Let\'s" always uses the special tag "shall we?".' },
          { type: 'fill_gap', sentence: 'She works in marketing, _____ (question tag)?', answer: "doesn't she", hint: 'Present simple affirmative → negative tag', explanation: '"Works" (present simple) → tag: "doesn\'t she?".' },
          { type: 'fill_gap', sentence: 'You were at the meeting yesterday, _____ (question tag)?', answer: "weren't you", hint: 'Was/were affirmative → negative tag', explanation: '"Were" (affirmative) → negative tag: "weren\'t you?".' },
          { type: 'fill_gap', sentence: 'Nobody called while I was out, _____ (question tag)?', answer: 'did they', hint: '"Nobody" = negative → positive tag', explanation: 'Negative words (nobody, nothing, never) use a positive tag. "Nobody called" → "did they?".' },
          { type: 'fix_error', sentence: 'You are coming tonight, are you?', answer: "You are coming tonight, aren't you?", hint: 'Affirmative = negative tag', explanation: 'Positive statement → negative tag. "Are coming" → "aren\'t you?" not "are you?".' },
          { type: 'fix_error', sentence: 'He can drive, doesn\'t he?', answer: "He can drive, can't he?", hint: 'Tag must match the auxiliary in the main clause', explanation: 'The tag uses the same auxiliary as the main clause. "Can" → "can\'t he?" (not "doesn\'t").' },
          { type: 'read_answer', passage: 'Question tags are used in English to check information or invite agreement. A positive statement takes a negative tag, and a negative statement takes a positive tag. The tag always uses the same auxiliary verb as the main clause. Rising intonation means you are genuinely asking; falling intonation means you expect agreement.', question: 'What does rising intonation on a question tag indicate?', answer: 'you are genuinely asking (not sure of the answer)', explanation: 'The passage says "rising intonation means you are genuinely asking".' },
        ],
      },
      {
        title: 'Emphasis — so, such, too, enough',
        pronunciation: [
          { type: 'repeat',       text: 'It was such a beautiful sunset.',               focus: '"such a" + adjective + noun' },
          { type: 'listen_write', text: 'I was so tired that I fell asleep immediately.', focus: '"so + adj + that" — result clause' },
          { type: 'repeat',       text: 'The bag was too heavy to carry alone.',          focus: '"too + adj + to infinitive"' },
          { type: 'listen_write', text: 'She\'s good enough to compete professionally.',  focus: '"adj + enough + to infinitive"' },
          { type: 'repeat',       text: 'He speaks so quickly that it\'s hard to follow.', focus: '"so" with adverbs' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'It was _____ an exciting match!', answer: 'such', options: ['such', 'so', 'too'], explanation: '"Such" comes before "a/an + adjective + noun": "such an exciting match".' },
          { type: 'multiple_choice', sentence: 'The film was _____ boring that I fell asleep.', answer: 'so', options: ['so', 'such', 'too'], explanation: '"So" comes directly before an adjective or adverb: "so boring that...".' },
          { type: 'word_bank', sentence: 'There were _____ many people that we couldn\'t get in.', answer: 'so', choices: ['so', 'such', 'too', 'very'], explanation: '"So many" + countable noun or "so much" + uncountable noun.' },
          { type: 'word_bank', sentence: 'She isn\'t old _____ to vote yet.', answer: 'enough', choices: ['enough', 'too', 'so', 'very'], explanation: '"Old enough to vote" — "enough" comes after adjectives and before "to + infinitive".' },
          { type: 'fill_gap', sentence: 'The coffee is _____ (too) hot to drink right now.', answer: 'too', hint: '"Too" = more than the acceptable amount', explanation: '"Too hot to drink" — "too" means the quantity/degree is more than enough for a purpose.' },
          { type: 'fill_gap', sentence: 'He didn\'t run fast _____ (enough) to qualify.', answer: 'enough', hint: '"Enough" after adverbs', explanation: '"Fast enough to qualify" — "enough" follows adverbs and adjectives.' },
          { type: 'fill_gap', sentence: 'It was _____ (such) a long journey that we were exhausted.', answer: 'such', hint: '"Such" + article + noun phrase', explanation: '"Such a long journey" — "such" before "a/an + adjective + noun".' },
          { type: 'fix_error', sentence: 'She is so a talented musician.', answer: 'She is such a talented musician.', hint: '"Such" before "a/an + adjective + noun"', explanation: '"Such" (not "so") precedes "a/an + adjective + noun": "such a talented musician".' },
          { type: 'fix_error', sentence: 'The test was too enough difficult for everyone.', answer: 'The test was too difficult for everyone.', hint: '"Too" and "enough" are not used together', explanation: '"Too" and "enough" are not combined. "Too difficult" = more difficult than desired.' },
          { type: 'read_answer', passage: 'The audience was so impressed that they gave a standing ovation. It was such an emotional performance that many people cried. The hall was too small to contain everyone who wanted to attend. Fortunately, the seats were comfortable enough to sit in for the full three hours.', question: 'Why did people cry?', answer: 'it was such an emotional performance', explanation: 'The passage says "It was such an emotional performance that many people cried".' },
        ],
      },
      {
        title: 'Prepositions in collocations',
        pronunciation: [
          { type: 'repeat',       text: 'I\'m not very good at maths.',                  focus: '"good at" — adjective + preposition' },
          { type: 'listen_write', text: 'She\'s interested in marine biology.',           focus: '"interested in" collocation' },
          { type: 'repeat',       text: 'He\'s responsible for managing the team.',       focus: '"responsible for" collocation' },
          { type: 'listen_write', text: 'I\'m looking forward to the holiday.',           focus: '"looking forward to" — phrasal collocation' },
          { type: 'repeat',       text: 'They were disappointed with the result.',        focus: '"disappointed with/by" collocation' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'She is very good _____ languages.', answer: 'at', options: ['at', 'in', 'with'], explanation: '"Good at" = collocation for skill/ability. "She is good at languages".' },
          { type: 'multiple_choice', sentence: 'He\'s been waiting _____ a reply for two weeks.', answer: 'for', options: ['for', 'since', 'on'], explanation: '"Wait for" = to expect something. "Waiting for a reply".' },
          { type: 'word_bank', sentence: 'She\'s very passionate _____ environmental issues.', answer: 'about', choices: ['about', 'for', 'with', 'of'], explanation: '"Passionate about" = collocated adjective + preposition.' },
          { type: 'word_bank', sentence: 'I\'m not familiar _____ that software.', answer: 'with', choices: ['with', 'to', 'of', 'about'], explanation: '"Familiar with" = know about/have experience of. "I\'m not familiar with it".' },
          { type: 'fill_gap', sentence: 'She\'s been interested _____ astronomy since she was a child.', answer: 'in', hint: '"Interested in" — preposition + noun/gerund', explanation: '"Interested in" = standard preposition collocation with this adjective.' },
          { type: 'fill_gap', sentence: 'He\'s responsible _____ managing all client accounts.', answer: 'for', hint: '"Responsible for" — standard preposition', explanation: '"Responsible for" = in charge of. Always followed by "for".' },
          { type: 'fill_gap', sentence: 'I\'m looking forward _____ (meet) you next week.', answer: 'to meeting', hint: '"Look forward to" + gerund', explanation: '"Looking forward to meeting" — "to" here is a preposition, so use gerund.' },
          { type: 'fix_error', sentence: 'She is worried of making a mistake in front of everyone.', answer: 'She is worried about making a mistake in front of everyone.', hint: '"Worried about" not "worried of"', explanation: '"Worried about" = standard preposition collocation. "Worried of" does not exist.' },
          { type: 'fix_error', sentence: 'He depends of his parents for financial support.', answer: 'He depends on his parents for financial support.', hint: '"Depend on" not "depend of"', explanation: '"Depend on" = to rely on. The preposition is "on", not "of".' },
          { type: 'read_answer', passage: 'Preposition collocations must be learnt as fixed phrases. Common patterns include: good/bad at (skills), interested/bored in (topics), responsible for (duties), dependent on (support), worried/happy/excited about (situations), and familiar/disappointed with (experiences). Building a bank of these collocations will significantly improve accuracy.', question: 'What preposition follows "responsible"?', answer: 'for', explanation: 'The passage lists "responsible for (duties)".' },
        ],
      },
      {
        title: 'Vocabulary chunks — feelings, health & lifestyle',
        pronunciation: [
          { type: 'repeat',       text: 'I\'m absolutely exhausted after that workout.',  focus: '"absolutely" + extreme adjective' },
          { type: 'listen_write', text: 'She\'s been feeling under the weather lately.',  focus: '"under the weather" = not well' },
          { type: 'repeat',       text: 'He\'s on a strict diet to lower his cholesterol.', focus: '"on a diet" + health collocation' },
          { type: 'listen_write', text: 'I try to cut down on sugar and processed food.',  focus: '"cut down on" = reduce' },
          { type: 'repeat',       text: 'She takes everything in her stride.',             focus: '"take in your stride" = handle calmly' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'She\'s been _____ the weather — she has a cold.', answer: 'under', options: ['under', 'below', 'beneath'], explanation: '"Under the weather" = idiom meaning feeling slightly unwell.' },
          { type: 'multiple_choice', sentence: 'He decided to _____ smoking as a New Year\'s resolution.', answer: 'give up', options: ['give up', 'cut down', 'take up'], explanation: '"Give up smoking" = quit completely. "Cut down" means reduce, not stop.' },
          { type: 'word_bank', sentence: 'I need to _____ on caffeine — I\'m drinking too much coffee.', answer: 'cut down', choices: ['cut down', 'give up', 'take up', 'carry on'], explanation: '"Cut down on" = reduce the amount (not stop completely).' },
          { type: 'word_bank', sentence: 'After the accident, she took a long time to fully _____.',  answer: 'recover', choices: ['recover', 'restore', 'regain', 'return'], explanation: '"Recover from" = get better after an illness or setback.' },
          { type: 'fill_gap', sentence: 'He\'s _____ excellent physical shape — he trains every day.', answer: 'in', hint: '"In shape" = collocation for physical fitness', explanation: '"In shape" = physically fit. Also: "out of shape" = not fit.' },
          { type: 'fill_gap', sentence: 'She felt completely burned _____ after the project.', answer: 'out', hint: '"Burned out" = exhausted from overwork', explanation: '"Burned out" = feeling exhausted and depleted after intense work.' },
          { type: 'fill_gap', sentence: 'I try to _____ a healthy work-life balance.', answer: 'maintain', hint: '"Maintain" = keep something going', explanation: '"Maintain a healthy work-life balance" = standard collocation.' },
          { type: 'fix_error', sentence: 'He\'s in a really good wellbeing today.', answer: "He's in a really good mood today.", hint: '"In a good mood" = feeling happy', explanation: '"In a good mood" is the correct collocation. "Wellbeing" is not used with "in a good".' },
          { type: 'fix_error', sentence: 'She takes up exercise to keep herself on shape.', answer: 'She takes up exercise to keep herself in shape.', hint: '"In shape" not "on shape"', explanation: '"Keep in shape" = maintain fitness. The preposition is "in", not "on".' },
          { type: 'read_answer', passage: 'A healthy lifestyle involves more than just physical fitness. It includes eating a balanced diet, getting enough sleep, managing stress effectively, and maintaining strong social connections. Regular exercise can boost mood and energy levels. Taking breaks at work can prevent burnout and improve overall wellbeing.', question: 'What does the passage say can prevent burnout?', answer: 'taking breaks at work', explanation: 'The passage says "Taking breaks at work can prevent burnout".' },
        ],
      },
      {
        title: 'Vocabulary chunks — work, business & finance',
        pronunciation: [
          { type: 'repeat',       text: 'She was promoted to senior manager last year.',  focus: '"promoted to" — career collocations' },
          { type: 'listen_write', text: 'The company is looking to expand into new markets.', focus: '"expand into" business language' },
          { type: 'repeat',       text: 'We need to cut costs to stay competitive.',      focus: '"cut costs" business collocation' },
          { type: 'listen_write', text: 'He handed in his notice after ten years.',       focus: '"hand in notice" = resign' },
          { type: 'repeat',       text: 'The deal fell through at the last minute.',      focus: '"fall through" = fail/not happen' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'She _____ in her notice after the salary dispute.', answer: 'handed', options: ['handed', 'gave', 'put'], explanation: '"Hand in your notice" = formally notify your employer that you\'re leaving.' },
          { type: 'multiple_choice', sentence: 'The company is looking to _____ into the Asian market.', answer: 'expand', options: ['expand', 'extend', 'enlarge'], explanation: '"Expand into a market" = enter and grow in a new market. Standard business collocation.' },
          { type: 'word_bank', sentence: 'The deal _____ through because of legal complications.', answer: 'fell', choices: ['fell', 'broke', 'went', 'came'], explanation: '"Fall through" = a deal or plan fails to happen.' },
          { type: 'word_bank', sentence: 'She was _____ responsible for a team of 20 people.', answer: 'made', choices: ['made', 'given', 'appointed', 'put'], explanation: '"Made responsible for" = given responsibility over something.' },
          { type: 'fill_gap', sentence: 'The company needs to _____ costs to remain profitable.', answer: 'cut', hint: '"Cut costs" = reduce expenses', explanation: '"Cut costs" = reduce spending. Standard business expression.' },
          { type: 'fill_gap', sentence: 'She was _____ (appoint) as CEO after the merger.', answer: 'appointed', hint: '"Appointed as" — formal career term', explanation: '"Appointed as CEO" = formally given the role.' },
          { type: 'fill_gap', sentence: 'The project is _____ budget — we need to find savings.', answer: 'over', hint: '"Over budget" = spending more than planned', explanation: '"Over budget" = spending more than the allocated amount. Also: "under budget" = below.' },
          { type: 'fix_error', sentence: 'He took the decision to leave the company after ten years.', answer: 'He made the decision to leave the company after ten years.', hint: '"Make a decision" not "take"', explanation: '"Make a decision" is the correct collocation in English (not "take a decision").' },
          { type: 'fix_error', sentence: 'The company did a profit of €2 million last year.', answer: 'The company made a profit of €2 million last year.', hint: '"Make a profit" not "do a profit"', explanation: '"Make a profit" = correct collocation. "Do a profit" does not exist.' },
          { type: 'read_answer', passage: 'The quarterly report showed that the company had increased revenue by 15%. However, costs had also risen sharply, so the profit margin remained under pressure. The board decided to cut overheads and expand into two new European markets. They were confident the deal with a German partner would not fall through.', question: 'By how much did the company increase revenue?', answer: '15%', explanation: 'The passage says the company "had increased revenue by 15%".' },
        ],
      },
      {
        title: 'B1 Review — consolidation',
        pronunciation: [
          { type: 'repeat',       text: 'If I had known, I would have told you earlier.',  focus: 'Third conditional — connected speech' },
          { type: 'listen_write', text: 'She said she had been waiting for over an hour.', focus: 'Reported speech + past perfect continuous' },
          { type: 'repeat',       text: 'The report must have been written by the director himself.', focus: 'Passive + modal deduction' },
          { type: 'listen_write', text: 'I wish I had taken up a sport when I was younger.', focus: '"Wish" + past perfect' },
          { type: 'repeat',       text: 'The film, which was set in 1920s Paris, won three Oscars.', focus: 'Non-defining relative clause' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'She _____ (move) to London next month — she\'s already found a flat.', answer: "is moving", options: ["is moving", "will move", "moves"], explanation: 'Pre-arranged plan = present continuous for future. Flat already found = it\'s fixed.' },
          { type: 'multiple_choice', sentence: 'He asked me _____ I had enjoyed the film.', answer: 'if', options: ['if', 'that', 'which'], explanation: '"If" introduces a reported yes/no question.' },
          { type: 'word_bank', sentence: 'I _____ used to enjoy flying, but now I dread it.', answer: 'didn\'t', choices: ["didn't", "don't", "haven't", "wasn't"], explanation: '"Didn\'t use to enjoy" = negative past habit with "used to".' },
          { type: 'word_bank', sentence: 'By 2030, scientists _____ developed a cure.', answer: "will have", choices: ["will have", "will be", "would have", "have"], explanation: '"Will have developed" = future perfect. Completed by 2030.' },
          { type: 'fill_gap', sentence: 'It was _____ (such) a long conference that everyone was exhausted.', answer: 'such', hint: '"Such" + article + adjective + noun', explanation: '"Such a long conference" — "such" before "a/an + adjective + noun".' },
          { type: 'fill_gap', sentence: 'The manager warned them _____ (not/be) late again.', answer: 'not to be', hint: '"Warn" + object + not to + infinitive', explanation: '"Warned them not to be late" = reported negative command.' },
          { type: 'fill_gap', sentence: 'The contract _____ (sign) by both parties before noon.', answer: 'must be signed', hint: 'Modal passive for a rule', explanation: '"Must be signed" = modal passive. Obligation for the contract.' },
          { type: 'fix_error', sentence: 'Despite of working hard, she didn\'t get the promotion.', answer: 'Despite working hard, she didn\'t get the promotion.', hint: '"Despite" does not take "of"', explanation: '"Despite" does not use "of". "In spite of" uses "of", but "despite" does not.' },
          { type: 'fix_error', sentence: 'She asked me where did I come from.', answer: 'She asked me where I came from.', hint: 'Indirect questions use statement word order', explanation: 'Indirect questions use statement word order: "where I came from" (not "where did I come from").' },
          { type: 'read_answer', passage: 'Maria has been learning English for five years. If she had started earlier, she would probably be fluent by now. She said she had always wanted to live abroad. She\'s moving to Dublin next year — she\'s already secured a job there. She wishes she had practised speaking more during her classes.', question: 'Where is Maria moving next year?', answer: 'Dublin', explanation: 'The passage says "She\'s moving to Dublin next year".' },
        ],
      },
    ],
  },

  // ── Module 9 — Mixed Conditionals & Past Modals ──────────────────────────
  {
    title: 'Mixed Conditionals & Past Modals',
    topics: [
      {
        title: 'Mixed Conditionals — Part 1 (past → present)',
        pronunciation: [
          { type: 'repeat',       text: 'If I had studied medicine, I\'d be a doctor now.', focus: 'past condition → present result' },
          { type: 'listen_write', text: 'She wouldn\'t be struggling if she had saved more.', focus: 'negative present result from past' },
          { type: 'repeat',       text: 'If he hadn\'t missed the flight, he\'d be here now.', focus: '"hadn\'t" + past participle + present result' },
          { type: 'listen_write', text: 'They would be richer if they had invested earlier.', focus: 'result clause + condition' },
          { type: 'repeat',       text: 'If she had accepted that offer, her life would be different.', focus: 'full mixed conditional sentence' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'If I had taken that job, I _____ in New York now.', answer: "would be living", options: ["would be living", "would have lived", "had lived"], explanation: 'Mixed conditional: past condition (had taken) → present result (would be living now).' },
          { type: 'multiple_choice', sentence: 'She _____ fluent in Spanish if she had spent a year abroad.', answer: "would be", options: ["would be", "would have been", "had been"], explanation: '"Would be fluent" = present result of an unreal past condition.' },
          { type: 'word_bank', sentence: 'If he hadn\'t missed the train, he _____ here by now.', answer: "would be", choices: ["would be", "would have been", "had been", "will be"], explanation: '"Would be here now" = present result. The past condition is "hadn\'t missed".' },
          { type: 'word_bank', sentence: 'They _____ struggling financially if they had saved more.', answer: "wouldn't be", choices: ["wouldn't be", "wouldn't have been", "hadn't been", "won't be"], explanation: 'Negative present result: "wouldn\'t be struggling" from past condition.' },
          { type: 'fill_gap', sentence: 'If she had studied harder at school, she _____ (be) in a better job now.', answer: "would be", hint: 'Mixed conditional: past cause → present state', explanation: '"Would be" = present result. The past condition is "had studied harder".' },
          { type: 'fill_gap', sentence: 'He _____ (not/be) in debt now if he hadn\'t spent so carelessly.', answer: "wouldn't be", hint: 'Negative present result', explanation: '"Wouldn\'t be in debt" = present situation reversed by a different past action.' },
          { type: 'fill_gap', sentence: 'If I _____ (take) that scholarship, my career would be very different now.', answer: "had taken", hint: 'Past perfect in the if-clause', explanation: '"Had taken" = past perfect in the if-clause. Mixed conditional: past → present.' },
          { type: 'fix_error', sentence: 'If he had won the competition, he would be famous now.', answer: 'If he had won the competition, he would be famous now.', hint: 'This sentence is correct', explanation: 'This is a correctly formed mixed conditional: past condition + present result.' },
          { type: 'fix_error', sentence: 'If she had accepted the job, she would have been rich now.', answer: 'If she had accepted the job, she would be rich now.', hint: 'Present result uses "would be", not "would have been"', explanation: '"Would be rich now" = present state (not past). Mixed conditional uses "would be" for the present result.' },
          { type: 'read_answer', passage: 'Mixed conditionals combine different time frames. The most common type uses a past condition to describe a present or current result. For example: "If she hadn\'t emigrated, she wouldn\'t be working in London now." The past condition (hadn\'t emigrated) explains the current situation (working in London).', question: 'What does the most common mixed conditional combine?', answer: 'a past condition with a present result', explanation: 'The passage says it uses "a past condition to describe a present or current result".' },
        ],
      },
      {
        title: 'Mixed Conditionals — Part 2 + Wish & If Only',
        pronunciation: [
          { type: 'repeat',       text: 'If I were braver, I would have spoken up.',    focus: 'present condition → past result' },
          { type: 'listen_write', text: 'If only she had a better memory, she wouldn\'t have forgotten.', focus: 'mixed "if only" — present state + past result' },
          { type: 'repeat',       text: 'I wish I had said something at the time.',      focus: '"wish" + past perfect — past regret' },
          { type: 'listen_write', text: 'If he were more confident, he would have applied.', focus: '"were" for hypothetical present state' },
          { type: 'repeat',       text: 'If only I knew then what I know now.',          focus: '"if only" + second conditional' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'If I _____ (be) taller, I would have become a basketball player.', answer: 'were', options: ['were', 'had been', 'was'], explanation: 'Present condition (I am not tall) → past result. "If I were taller" = present hypothetical.' },
          { type: 'multiple_choice', sentence: 'She wishes she _____ taken more photos during the trip.', answer: 'had', options: ['had', 'would have', 'was'], explanation: '"Wish + past perfect" = regret about a past action or missed opportunity.' },
          { type: 'word_bank', sentence: 'If he _____ more patient, he wouldn\'t have lost his temper.', answer: 'were', choices: ['were', 'had been', 'was', 'would be'], explanation: 'Present state condition → past result. "If he were more patient" = hypothetical present state.' },
          { type: 'word_bank', sentence: 'I wish I _____ what I know now when I started.', answer: 'had known', choices: ['had known', 'knew', 'would have known', 'know'], explanation: '"I wish I had known then" = regret about knowledge not available in the past.' },
          { type: 'fill_gap', sentence: 'If only she _____ (be) more decisive, she would have taken the opportunity.', answer: 'were', hint: 'Present hypothetical state → past missed result', explanation: '"If only she were more decisive" = present state (hypothetical). Mixed type.' },
          { type: 'fill_gap', sentence: 'He wishes he _____ (not/say) that — it caused so much damage.', answer: "hadn't said", hint: '"Wish" + past perfect negative', explanation: '"Hadn\'t said" = past perfect negative. Regret about a past action.' },
          { type: 'fill_gap', sentence: 'If I _____ (have) a better memory, I wouldn\'t have forgotten our anniversary.', answer: 'had', hint: 'Present hypothetical state in second conditional', explanation: '"If I had a better memory" (second conditional) → "wouldn\'t have forgotten" (third result).' },
          { type: 'fix_error', sentence: 'If he had been more organised, he won\'t miss the deadline.', answer: "If he were more organised, he wouldn't have missed the deadline.", hint: 'Mixed conditional — present state → past result', explanation: '"Were more organised" (present hypothetical) → "wouldn\'t have missed" (past result).' },
          { type: 'fix_error', sentence: 'She wished she knows the answer back then.', answer: 'She wishes she had known the answer back then.', hint: '"Wish" for past = past perfect; third person "wishes"', explanation: '"Wishes" (present), and "had known" (past perfect for past regret).' },
          { type: 'read_answer', passage: 'Mixed conditionals can also combine a present hypothetical condition with a past result: "If I were fluent in Chinese, I would have accepted the job in Shanghai." This tells us the speaker\'s current limitation (not fluent) explains why they didn\'t accept a past opportunity.', question: 'What does the example sentence tell us about the speaker?', answer: 'they are not fluent in Chinese / they didn\'t accept the job in Shanghai', explanation: 'The speaker is "not fluent in Chinese" (current) so they "didn\'t accept the job" (past result).' },
        ],
      },
      {
        title: 'Modal verbs — past speculation (must have, might have…)',
        pronunciation: [
          { type: 'repeat',       text: 'He must have left already — his car\'s gone.',  focus: '"must have" — strong past deduction' },
          { type: 'listen_write', text: 'She might have forgotten about the appointment.', focus: '"might have" — past possibility' },
          { type: 'repeat',       text: 'They can\'t have received our message yet.',    focus: '"can\'t have" — negative past deduction' },
          { type: 'listen_write', text: 'He could have taken the wrong turn somewhere.', focus: '"could have" — past possibility' },
          { type: 'repeat',       text: 'You should have warned me — I had no idea.',   focus: '"should have" — past criticism' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'She looks exhausted. She _____ been working all night.', answer: 'must have', options: ['must have', 'might have', "can't have"], explanation: '"Must have been working" = strong logical deduction based on evidence (she looks exhausted).' },
          { type: 'multiple_choice', sentence: 'That _____ been him — he was in a meeting all morning.', answer: "can't have", options: ["can't have", 'must have', 'might have'], explanation: '"Can\'t have been" = logical impossibility based on fact (he was in a meeting).' },
          { type: 'word_bank', sentence: 'She _____ forgotten — she wrote it in her diary.', answer: "can't have", choices: ["can't have", "must have", "might have", "should have"], explanation: '"Can\'t have forgotten" = impossible. She wrote it down, so she should remember.' },
          { type: 'word_bank', sentence: 'I _____ told him yesterday, but I\'m not sure.', answer: 'might have', choices: ['might have', 'must have', "can't have", 'should have'], explanation: '"Might have told him" = past possibility with uncertainty.' },
          { type: 'fill_gap', sentence: 'They _____ (must/arrive) — the lights are on.', answer: 'must have arrived', hint: '"Must have" = strong past deduction from evidence', explanation: '"Must have arrived" = logical deduction. The lights being on = evidence they\'re home.' },
          { type: 'fill_gap', sentence: 'He _____ (could/take) the wrong train — that\'s why he\'s late.', answer: 'could have taken', hint: '"Could have" = possible past explanation', explanation: '"Could have taken" = one possible explanation for why he is late.' },
          { type: 'fill_gap', sentence: 'You _____ (should/call) me earlier — I had no idea.', answer: 'should have called', hint: '"Should have" = criticism of a past omission', explanation: '"Should have called" = past criticism. You didn\'t call, but you were expected to.' },
          { type: 'fix_error', sentence: 'She must have forgot her phone — it\'s still here.', answer: "She must have forgotten her phone — it's still here.", hint: '"Must have" + past participle', explanation: '"Must have forgotten" = past participle of "forget" is "forgotten".' },
          { type: 'fix_error', sentence: 'He should have told us. Now we don\'t can change anything.', answer: "He should have told us. Now we can't change anything.", hint: '"Can\'t" = simple modal present; not "don\'t can"', explanation: 'The correct negative form is "can\'t", not "don\'t can".' },
          { type: 'read_answer', passage: 'She didn\'t answer the phone during the meeting. Her colleague wondered: "She must have turned it off — she always does that. Or she might have left it in the car. She can\'t have forgotten to charge it — she was using it this morning. She could have just been too busy to answer."', question: 'What does the colleague say is impossible?', answer: 'she can\'t have forgotten to charge it', explanation: 'The colleague says "she can\'t have forgotten to charge it — she was using it this morning".' },
        ],
      },
      {
        title: 'Modal verbs — past speculation extended practice',
        pronunciation: [
          { type: 'repeat',       text: 'They may have misunderstood the instructions.',  focus: '"may have" — formal past possibility' },
          { type: 'listen_write', text: 'She needn\'t have rushed — there was plenty of time.', focus: '"needn\'t have" = unnecessary past action' },
          { type: 'repeat',       text: 'I ought to have double-checked my work.',        focus: '"ought to have" = past criticism' },
          { type: 'listen_write', text: 'He would have known — he was there at the time.', focus: '"would have known" — past deduction' },
          { type: 'repeat',       text: 'You needn\'t have bought anything — we had enough.', focus: '"needn\'t have" in context' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'You _____ bought flowers — we already had some.', answer: "needn't have", options: ["needn't have", "shouldn't have", "mustn't have"], explanation: '"Needn\'t have bought" = you did something that was unnecessary (flowers weren\'t needed).' },
          { type: 'multiple_choice', sentence: 'I _____ apologised sooner — I feel terrible about it.', answer: 'should have', options: ['should have', "needn't have", 'might have'], explanation: '"Should have apologised sooner" = past criticism of an omission. You regret not doing it.' },
          { type: 'word_bank', sentence: 'They _____ misread the timetable — that would explain why they missed the train.', answer: 'may have', choices: ['may have', 'should have', "needn't have", 'must have'], explanation: '"May have misread" = a possible (though not certain) explanation.' },
          { type: 'word_bank', sentence: 'I _____ known better — I\'ve made that mistake before.', answer: 'should have', choices: ['should have', 'might have', "needn't have", 'must have'], explanation: '"Should have known better" = self-criticism about a past decision or mistake.' },
          { type: 'fill_gap', sentence: 'She _____ (needn\'t have/bring) so much food — there was more than enough.', answer: "needn't have brought", hint: '"Needn\'t have" = unnecessary past action', explanation: '"Needn\'t have brought" = she brought food, but it wasn\'t necessary.' },
          { type: 'fill_gap', sentence: 'You _____ (ought to/tell) her the truth from the start.', answer: 'ought to have told', hint: '"Ought to have" = past obligation not fulfilled', explanation: '"Ought to have told" = criticism or regret about not doing something.' },
          { type: 'fill_gap', sentence: 'He _____ (may/take) the shortcut — that\'s why he arrived first.', answer: 'may have taken', hint: '"May have" = possible past explanation', explanation: '"May have taken" = a possible explanation (less certain than "must have").' },
          { type: 'fix_error', sentence: 'She needn\'t have study so much — it was an easy test.', answer: "She needn't have studied so much — it was an easy test.", hint: '"Needn\'t have" + past participle', explanation: '"Needn\'t have studied" = past participle after "have". "Study" → "studied".' },
          { type: 'fix_error', sentence: 'I ought to have been more careful. I should.', answer: "I ought to have been more careful.", hint: '"Should" cannot replace "ought to" in this short form', explanation: '"Ought to have" does not use a short form. The sentence is complete as it stands.' },
          { type: 'read_answer', passage: 'After the product launch failed, the team reviewed what had happened. "We should have done more market research," said the manager. "I ought to have listened to the client feedback earlier." "We needn\'t have rushed — we could have waited another quarter." "There may have been too many changes at the last minute."', question: 'What does the manager say they ought to have done?', answer: 'listened to the client feedback earlier', explanation: 'The manager says "I ought to have listened to the client feedback earlier".' },
        ],
      },
    ],
  },

  // ── Module 10 — Estruturas Avançadas B2 ─────────────────────────────────
  {
    title: 'Advanced Structures B2',
    topics: [
      {
        title: 'Causative — have / get something done',
        pronunciation: [
          { type: 'repeat',       text: 'I\'m having my car serviced tomorrow.',          focus: '"have + object + past participle" = causative' },
          { type: 'listen_write', text: 'She got her hair cut at a new salon.',            focus: '"get + object + past participle"' },
          { type: 'repeat',       text: 'We\'re having the whole house repainted next week.', focus: 'causative with "having"' },
          { type: 'listen_write', text: 'He needs to get his eyes tested soon.',           focus: '"get...tested" — causative with need' },
          { type: 'repeat',       text: 'Have you had your laptop repaired yet?',         focus: 'causative in perfect tense question' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'She _____ her nails done every two weeks.', answer: 'has', options: ['has', 'gets', 'makes'], explanation: '"Has her nails done" = causative "have". She arranges for someone else to do it.' },
          { type: 'multiple_choice', sentence: 'I need to _____ my passport photo taken before I apply.', answer: 'get', options: ['get', 'have', 'make'], explanation: 'Both "have" and "get" work in causative. "Get" is more informal.' },
          { type: 'word_bank', sentence: 'They\'re going to _____ the roof repaired before winter.', answer: 'have', choices: ['have', 'get', 'make', 'do'], explanation: '"Have the roof repaired" = causative. They arrange for someone to repair it.' },
          { type: 'word_bank', sentence: 'She _____ her watch stolen at the market.', answer: 'had', choices: ['had', 'got', 'made', 'was'], explanation: '"Had her watch stolen" = negative causative — something bad happened to her.' },
          { type: 'fill_gap', sentence: 'I\'m going to _____ (have) my hair cut before the interview.', answer: 'have', hint: '"Have + object + past participle" = causative', explanation: '"Have my hair cut" = arrange for a hairdresser to cut it.' },
          { type: 'fill_gap', sentence: 'He _____ (have) his teeth checked twice a year.', answer: 'has', hint: 'Third person causative "have"', explanation: '"Has his teeth checked" = he arranges regular dental check-ups.' },
          { type: 'fill_gap', sentence: 'She _____ (get) her apartment painted last month.', answer: 'got', hint: '"Get" = informal causative', explanation: '"Got her apartment painted" = she arranged for someone to paint it (informal).' },
          { type: 'fix_error', sentence: 'I need to have my car to repair.', answer: 'I need to have my car repaired.', hint: 'Causative: have + object + past participle', explanation: 'Causative structure: "have + object + past participle". "Repaired" not "to repair".' },
          { type: 'fix_error', sentence: 'She made her dress dry-cleaned.', answer: 'She had her dress dry-cleaned.', hint: '"Make" cannot be used as causative in this context', explanation: '"Make" doesn\'t form the causative here. Use "had/got her dress dry-cleaned".' },
          { type: 'read_answer', passage: 'The causative structure "have/get something done" means you arrange for someone else to do something for you. "I had my car serviced" (someone else did it). It can also describe negative experiences: "He had his bike stolen." This is different from "I serviced my car" (I did it myself).', question: 'What is the difference between "I washed my car" and "I had my car washed"?', answer: '"I washed it" means I did it myself; "had it washed" means someone else did it', explanation: 'The passage explains "causative means you arrange for someone else to do something for you".' },
        ],
      },
      {
        title: 'Advanced passive — It is said that… / He is believed to…',
        pronunciation: [
          { type: 'repeat',       text: 'It is believed that the decision will be reversed.', focus: 'impersonal passive reporting' },
          { type: 'listen_write', text: 'The suspect is thought to have fled the country.', focus: 'personal passive + infinitive' },
          { type: 'repeat',       text: 'It has been reported that talks are ongoing.',    focus: '"It has been reported that" — news register' },
          { type: 'listen_write', text: 'The site is said to date back 2,000 years.',      focus: '"is said to" + infinitive' },
          { type: 'repeat',       text: 'He is known to be extremely meticulous.',         focus: '"is known to be" — personal passive' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'It _____ that negotiations are progressing well.', answer: 'is reported', options: ['is reported', 'reports', 'is reporting'], explanation: '"It is reported that" = impersonal passive for reporting facts/news.' },
          { type: 'multiple_choice', sentence: 'The company _____ to be in financial difficulty.', answer: 'is thought', options: ['is thought', 'thinks', 'is thinking'], explanation: '"Is thought to be" = personal passive with reporting verb + infinitive.' },
          { type: 'word_bank', sentence: 'It _____ believed that the treasure was never found.', answer: 'is', choices: ['is', 'was', 'has been', 'had been'], explanation: '"It is believed that" — present impersonal passive for current belief.' },
          { type: 'word_bank', sentence: 'The ruins _____ to date back to the Bronze Age.', answer: 'are said', choices: ['are said', 'say', 'is said', 'have said'], explanation: '"Are said to date back" — personal passive plural form with "are said".' },
          { type: 'fill_gap', sentence: 'The CEO _____ (is/expect) to resign within the week.', answer: 'is expected', hint: 'Personal passive with expectation', explanation: '"Is expected to resign" = people expect the CEO to resign.' },
          { type: 'fill_gap', sentence: 'It _____ (is/allege) that the funds were misused.', answer: 'is alleged', hint: 'Impersonal passive reporting', explanation: '"It is alleged that" = reported but not proven. Common in legal/news contexts.' },
          { type: 'fill_gap', sentence: 'She _____ (is/know) to be a highly skilled negotiator.', answer: 'is known', hint: '"Known to be" — personal passive', explanation: '"Is known to be" = people know this to be true.' },
          { type: 'fix_error', sentence: 'It is said that the painting is stolen years ago.', answer: 'It is said that the painting was stolen years ago.', hint: '"Years ago" = past tense in the clause', explanation: '"Was stolen years ago" — past tense in the that-clause because of "years ago".' },
          { type: 'fix_error', sentence: 'The minister believes to have lied about the figures.', answer: 'The minister is believed to have lied about the figures.', hint: '"Is believed to" — passive form', explanation: '"Is believed to have lied" = passive structure. Not "believes to have lied".' },
          { type: 'read_answer', passage: 'In formal and journalistic English, impersonal passive structures are commonly used: "It is said that...", "It has been reported that...", "It is believed that...". These forms are used when the source of information is general, unknown, or unimportant. Personal passive structures ("He is said to be...", "She is believed to...") are also common.', question: 'When are impersonal passive structures typically used?', answer: 'when the source of information is general, unknown, or unimportant', explanation: 'The passage says these are used "when the source of information is general, unknown, or unimportant".' },
        ],
      },
      {
        title: 'Cleft sentences',
        pronunciation: [
          { type: 'repeat',       text: 'It was the timing that caused the problem.',     focus: '"It was...that" — cleft for emphasis' },
          { type: 'listen_write', text: 'What I find most challenging is public speaking.', focus: '"What I find...is" — wh-cleft' },
          { type: 'repeat',       text: 'It was John who first suggested the idea.',       focus: '"It was + person + who"' },
          { type: 'listen_write', text: 'What she really needs is more time.',             focus: '"What she needs is" — wh-cleft' },
          { type: 'repeat',       text: 'It\'s the quality of the work that counts.',     focus: '"It\'s...that counts" — present cleft' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'It _____ the noise that kept me awake.', answer: 'was', options: ['was', 'is', 'were'], explanation: '"It was...that" is the standard cleft sentence to emphasise a past noun phrase.' },
          { type: 'multiple_choice', sentence: '_____ I need is a good rest.', answer: 'What', options: ['What', 'That', 'It'], explanation: '"What I need is" — wh-cleft. "What" introduces the subject clause.' },
          { type: 'word_bank', sentence: 'It was _____ helped me pass the exam — not luck.', answer: 'hard work that', choices: ['hard work that', 'that hard work', 'hard work which', 'hard work'], explanation: '"It was hard work that helped me" = cleft for emphasis on the cause.' },
          { type: 'word_bank', sentence: '_____ surprised me most was his calmness.', answer: 'What', choices: ['What', 'That', 'Which', 'It'], explanation: '"What surprised me most was" = wh-cleft structure.' },
          { type: 'fill_gap', sentence: 'It _____ (be) the delay that caused all the problems.', answer: 'was', hint: '"It was...that" — cleft sentence structure', explanation: '"It was the delay that caused all the problems" — emphasises the cause.' },
          { type: 'fill_gap', sentence: '_____ the data shows is a steady improvement.', answer: 'What', hint: '"What...shows is" — wh-cleft', explanation: '"What the data shows is" = wh-cleft for emphasis on findings.' },
          { type: 'fill_gap', sentence: 'It was _____ (she) who broke the news to the family.', answer: 'she', hint: '"It was + pronoun + who"', explanation: '"It was she who broke the news" = cleft sentence emphasising who did the action.' },
          { type: 'fix_error', sentence: 'What I need it is more information.', answer: 'What I need is more information.', hint: 'No "it" in a wh-cleft structure', explanation: '"What I need is more information" — no "it" is needed in a wh-cleft.' },
          { type: 'fix_error', sentence: 'It was the manager who did resigned first.', answer: 'It was the manager who resigned first.', hint: '"Resigned" = past simple, no "did"', explanation: 'In the relative clause of a cleft, use the regular past tense: "who resigned" (no "did").' },
          { type: 'read_answer', passage: 'Cleft sentences are used to emphasise a particular element. "It-clefts" (It was John who called) highlight a noun phrase. "What-clefts" (What I need is rest) highlight a verb phrase or complement. Both structures make writing and speech more emphatic and dynamic.', question: 'What does a "what-cleft" highlight?', answer: 'a verb phrase or complement', explanation: 'The passage says "What-clefts" highlight "a verb phrase or complement".' },
        ],
      },
      {
        title: 'Advanced relative clauses — reduced + whom/of which',
        pronunciation: [
          { type: 'repeat',       text: 'The man interviewed for the post was highly qualified.', focus: 'reduced relative clause — past participle' },
          { type: 'listen_write', text: 'The woman working at the desk is the manager.',  focus: 'reduced relative — present participle' },
          { type: 'repeat',       text: 'The report, much of which I had read, was fascinating.', focus: '"of which" in formal relative clauses' },
          { type: 'listen_write', text: 'The person to whom this was addressed has moved.', focus: 'formal "whom" as object' },
          { type: 'repeat',       text: 'The issues raised by the panel were addressed.', focus: 'passive reduced relative clause' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'The documents _____ on the table belong to me.', answer: 'left', options: ['left', 'leaving', 'which left'], explanation: '"Left on the table" = reduced relative clause (past participle). = "which were left on the table".' },
          { type: 'multiple_choice', sentence: 'The woman _____ at the front desk is the supervisor.', answer: 'sitting', options: ['sitting', 'sat', 'who sitting'], explanation: '"Sitting at the front desk" = reduced relative clause (present participle). Active, ongoing action.' },
          { type: 'word_bank', sentence: 'The project, _____ of which was completed on time, won an award.', answer: 'most', choices: ['most', 'many', 'much', 'some'], explanation: '"Most of which was completed on time" = quantifier + "of which" in a non-defining clause.' },
          { type: 'word_bank', sentence: 'The person to _____ I spoke was extremely helpful.', answer: 'whom', choices: ['whom', 'who', 'which', 'that'], explanation: '"To whom I spoke" = formal usage of "whom" as the object of a preposition.' },
          { type: 'fill_gap', sentence: 'The letter _____ (send) last week hasn\'t arrived yet.', answer: 'sent', hint: 'Past participle = reduced relative clause', explanation: '"Sent last week" = reduced relative clause, replacing "which was sent last week".' },
          { type: 'fill_gap', sentence: 'She is the director _____ department was restructured.', answer: 'whose', hint: '"Whose" for possession in relative clauses', explanation: '"Whose department" = possession. Relative pronoun "whose".' },
          { type: 'fill_gap', sentence: 'These are the results, _____ of which I found surprising.', answer: 'many', hint: 'Quantifier + "of which" in non-defining clause', explanation: '"Many of which" = most results. Quantifier + "of which" in non-defining relative clause.' },
          { type: 'fix_error', sentence: 'The man whom lives next door is a lawyer.', answer: 'The man who lives next door is a lawyer.', hint: '"Who" for subject; "whom" for object', explanation: '"Who lives next door" — "who" is the subject of the relative clause. "Whom" is object only.' },
          { type: 'fix_error', sentence: 'The letters sending to the wrong address were lost.', answer: 'The letters sent to the wrong address were lost.', hint: 'Passive reduced relative = past participle', explanation: '"Sent to the wrong address" = past participle (passive reduced relative clause).' },
          { type: 'read_answer', passage: 'In formal written English, relative clauses can be reduced. "The book which was written in 1920" becomes "The book written in 1920". Active participles replace subject relative clauses: "The man who works here" becomes "The man working here". Prepositional relatives use "of which" and "of whom" for formal effect.', question: 'How can "The man who works here" be reduced?', answer: '"The man working here"', explanation: 'The passage says it becomes "The man working here" (present participle reduction).' },
        ],
      },
      {
        title: 'Stative verbs — extended list',
        pronunciation: [
          { type: 'repeat',       text: 'I don\'t understand what you\'re trying to say.', focus: '"understand" — stative, not used in continuous' },
          { type: 'listen_write', text: 'She owns three properties in the city centre.', focus: '"own" = stative possession verb' },
          { type: 'repeat',       text: 'He seems to be getting better at it.',           focus: '"seem" — stative appearance verb' },
          { type: 'listen_write', text: 'This meat smells a bit strange to me.',          focus: '"smell" — stative perception' },
          { type: 'repeat',       text: 'I\'ve been thinking about your proposal.',       focus: '"think" used in continuous (= consider)' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'I _____ you — can you say that again?', answer: "don't understand", options: ["don't understand", "am not understanding", "haven't understood"], explanation: '"Understand" is a stative verb — not used in the continuous form.' },
          { type: 'multiple_choice', sentence: 'She _____ a villa in Tuscany.', answer: 'owns', options: ['owns', 'is owning', 'has been owning'], explanation: '"Own" is a stative verb of possession — always simple, never continuous.' },
          { type: 'word_bank', sentence: 'This sauce _____ delicious — what\'s in it?', answer: 'tastes', choices: ['tastes', 'is tasting', 'has tasted', 'was tasting'], explanation: '"Taste" as a linking verb (= has a flavour) is stative.' },
          { type: 'word_bank', sentence: 'He _____ about whether to accept the offer.', answer: 'is thinking', choices: ['is thinking', 'thinks', 'has been thinking', 'thought'], explanation: '"Think" in the sense of considering/deliberating can use the continuous form.' },
          { type: 'fill_gap', sentence: 'This material _____ (feel) very soft.', answer: 'feels', hint: '"Feel" as a linking verb = stative', explanation: '"Feels very soft" — linking verb "feel" (describing texture) is stative.' },
          { type: 'fill_gap', sentence: 'I _____ (think) you\'re absolutely right about this.', answer: 'think', hint: '"Think" = opinion/belief → stative', explanation: '"Think" meaning "believe/have an opinion" is stative — not used in continuous.' },
          { type: 'fill_gap', sentence: 'She _____ (seem) to be enjoying the course.', answer: 'seems', hint: '"Seem" is always stative', explanation: '"Seem" is always stative — always uses simple form.' },
          { type: 'fix_error', sentence: 'I am knowing the answer to that question.', answer: 'I know the answer to that question.', hint: '"Know" = stative — not used in continuous', explanation: '"Know" is a stative verb — never used in continuous form.' },
          { type: 'fix_error', sentence: 'She is having a big house in the countryside.', answer: 'She has a big house in the countryside.', hint: '"Have" for possession = stative', explanation: '"Have" for possession is stative — use simple form. "Have" for activities can be continuous.' },
          { type: 'read_answer', passage: 'Stative verbs describe states rather than actions. They include verbs of: perception (hear, see, smell, taste, feel), mental state (know, believe, understand, remember, forget), emotion (love, hate, prefer, want), possession (have, own, belong, contain), and appearance (seem, appear, look). Some verbs (think, have, taste) can be stative or dynamic depending on meaning.', question: 'Give an example of a stative verb of mental state.', answer: 'know / believe / understand / remember / forget (any one)', explanation: 'The passage lists: know, believe, understand, remember, forget as stative verbs of mental state.' },
        ],
      },
      {
        title: 'Articles — advanced + zero article',
        pronunciation: [
          { type: 'repeat',       text: 'She plays the violin and the piano.',            focus: '"the" with musical instruments' },
          { type: 'listen_write', text: 'Life is full of unexpected surprises.',           focus: 'zero article for abstract concepts' },
          { type: 'repeat',       text: 'The rich often struggle to understand the poor.', focus: '"the" with adjectives as a group' },
          { type: 'listen_write', text: 'He was sent to prison for fraud.',               focus: '"to prison" — no article for institutions' },
          { type: 'repeat',       text: 'The Internet has changed the way we communicate.', focus: '"the Internet" — proper article use' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'She works as _____ engineer for a tech company.', answer: 'an', options: ['an', 'a', 'the'], explanation: '"An engineer" — profession without "the" when not referring to a specific one. "An" before vowel sound.' },
          { type: 'multiple_choice', sentence: '_____ elderly need more support in cold winters.', answer: 'The', options: ['The', 'A', '—'], explanation: '"The elderly" = "the" + adjective refers to a whole group of people.' },
          { type: 'word_bank', sentence: 'After university, she went straight into _____ teaching.', answer: '—', choices: ['—', 'the', 'a', 'an'], explanation: 'Zero article: entering a profession in general. "She went into teaching."' },
          { type: 'word_bank', sentence: 'He was the first person to climb _____ Mount Everest.', answer: '—', choices: ['—', 'the', 'a', 'an'], explanation: 'Most named mountains do not take an article: "Mount Everest" (not "the Mount Everest").' },
          { type: 'fill_gap', sentence: '_____ rich and _____ poor live side by side in this area.', answer: 'The / the', hint: '"The" + adjective = whole group', explanation: '"The rich" and "the poor" refer to all rich and all poor people as a category.' },
          { type: 'fill_gap', sentence: 'He was taken to _____ hospital after the accident.', answer: '—', hint: 'No article when referring to function, not specific place', explanation: '"Taken to hospital" (British English) — no article when referring to the function, not a specific hospital.' },
          { type: 'fill_gap', sentence: 'She plays _____ guitar in a band.', answer: 'the', hint: '"The" with musical instruments', explanation: '"Play the guitar" — musical instruments take "the".' },
          { type: 'fix_error', sentence: 'The life is too short to waste on regrets.', answer: 'Life is too short to waste on regrets.', hint: 'Abstract concept = zero article', explanation: '"Life" as an abstract concept does not take an article: "Life is too short".' },
          { type: 'fix_error', sentence: 'He is best student in our group.', answer: 'He is the best student in our group.', hint: 'Superlatives require "the"', explanation: '"The best" — superlatives always take "the".' },
          { type: 'read_answer', passage: 'The zero article (no article) is used with abstract concepts (love, freedom), most proper nouns (Mount Everest, Lake Baikal), languages (English, Spanish), meals (breakfast, lunch), means of transport (by car, on foot), and with institutions when referring to their purpose (go to school, in hospital).', question: 'Give one example of when the zero article is used according to the passage.', answer: 'abstract concepts / proper nouns / languages / meals / transport / institutions by purpose (any one)', explanation: 'The passage lists: abstract concepts, proper nouns, languages, meals, transport, institutions.' },
        ],
      },
      {
        title: 'Advanced prepositions — collocations',
        pronunciation: [
          { type: 'repeat',       text: 'She has a tendency to underestimate obstacles.',  focus: '"tendency to" — preposition collocation' },
          { type: 'listen_write', text: 'He acted in accordance with company policy.',    focus: '"in accordance with" — formal' },
          { type: 'repeat',       text: 'She was appointed in spite of her lack of experience.', focus: '"in spite of" — contrast preposition' },
          { type: 'listen_write', text: 'The project was completed ahead of schedule.',   focus: '"ahead of schedule" — collocation' },
          { type: 'repeat',       text: 'In view of the circumstances, we must act quickly.', focus: '"in view of" — formal connector' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'She has a tendency _____ procrastinate when under pressure.', answer: 'to', options: ['to', 'for', 'of'], explanation: '"Have a tendency to" = collocation. Always followed by an infinitive.' },
          { type: 'multiple_choice', sentence: 'The decision was made _____ the interests of the public.', answer: 'in', options: ['in', 'for', 'to'], explanation: '"In the interests of" = formal preposition phrase meaning "for the benefit of".' },
          { type: 'word_bank', sentence: 'He resigned _____ favour of a younger candidate.', answer: 'in', choices: ['in', 'for', 'at', 'on'], explanation: '"In favour of" = supporting or preferring. "He resigned in favour of a younger candidate".' },
          { type: 'word_bank', sentence: 'The team finished ahead _____ schedule.', answer: 'of', choices: ['of', 'to', 'from', 'in'], explanation: '"Ahead of schedule" = earlier than planned. Fixed preposition collocation.' },
          { type: 'fill_gap', sentence: 'They acted _____ accordance with the regulations.', answer: 'in', hint: '"In accordance with" — formal', explanation: '"In accordance with" = following/complying with rules or standards.' },
          { type: 'fill_gap', sentence: 'She was successful _____ spite of all the setbacks.', answer: 'in', hint: '"In spite of" = despite', explanation: '"In spite of" = despite. Introduces a concession.' },
          { type: 'fill_gap', sentence: 'The project was cancelled _____ view of the rising costs.', answer: 'in', hint: '"In view of" = because of', explanation: '"In view of" = given/because of. Formal cause-reason phrase.' },
          { type: 'fix_error', sentence: 'She left the company on favour of a better opportunity.', answer: 'She left the company in favour of a better opportunity.', hint: '"In favour of" not "on"', explanation: '"In favour of" is the correct preposition phrase. "On favour of" does not exist.' },
          { type: 'fix_error', sentence: 'He has a talent at solving complex problems.', answer: 'He has a talent for solving complex problems.', hint: '"Talent for" not "talent at"', explanation: '"Talent for" is the correct collocation. "Good at" but "talent for".' },
          { type: 'read_answer', passage: 'Advanced preposition collocations are fixed phrases that cannot be changed. Examples include: "in accordance with", "in view of", "in spite of", "on behalf of", "in favour of", "ahead of schedule", "with regard to", and "in the light of". These phrases are common in formal writing and academic contexts.', question: 'In what contexts are these advanced preposition phrases most common?', answer: 'formal writing and academic contexts', explanation: 'The passage says they are "common in formal writing and academic contexts".' },
        ],
      },
      {
        title: 'Phrasal verbs — Set 2 (top 25 intermediate)',
        pronunciation: [
          { type: 'repeat',       text: 'I\'ve taken on too much work this month.',       focus: '"take on" = accept responsibility' },
          { type: 'listen_write', text: 'He eventually came round to our way of thinking.', focus: '"come round to" = be persuaded' },
          { type: 'repeat',       text: 'The board voted to back down on the proposal.',  focus: '"back down" = withdraw/surrender' },
          { type: 'listen_write', text: 'She\'s been putting off making a decision.',     focus: '"put off" = delay' },
          { type: 'repeat',       text: 'I can\'t get through to him — he never listens.', focus: '"get through to" = communicate effectively' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'She _____ (put off) making the difficult phone call.', answer: 'has been putting off', options: ['has been putting off', 'put off', 'is put off'], explanation: '"Put off" = delay/postpone. "Has been putting off" = ongoing delay.' },
          { type: 'multiple_choice', sentence: 'After much debate, he _____ (back down) on his demands.', answer: 'backed down', options: ['backed down', 'backed off', 'backed out'], explanation: '"Back down" = withdraw a position or demand.' },
          { type: 'word_bank', sentence: 'We need to _____ this issue — it\'s becoming serious.', answer: 'face up to', choices: ['face up to', 'deal out', 'see through', 'make out'], explanation: '"Face up to" = confront and accept a difficult situation.' },
          { type: 'word_bank', sentence: 'I can\'t _____ why she made that decision.', answer: 'figure out', choices: ['figure out', 'work on', 'look after', 'take over'], explanation: '"Figure out" = understand or find the solution to something.' },
          { type: 'fill_gap', sentence: 'She _____ (take on) the project even though she was already busy.', answer: 'took on', hint: '"Take on" = accept a responsibility', explanation: '"Took on" = accepted the additional work/responsibility.' },
          { type: 'fill_gap', sentence: 'He finally _____ (come round to) our point of view.', answer: 'came round to', hint: '"Come round to" = change opinion and agree', explanation: '"Came round to" = he was persuaded and now agrees with us.' },
          { type: 'fill_gap', sentence: 'She _____ (carry out) extensive research before writing the report.', answer: 'carried out', hint: '"Carry out" = perform/conduct', explanation: '"Carried out research" = conducted/performed research.' },
          { type: 'fix_error', sentence: 'I can\'t make head or tail about what she said.', answer: "I can't make head or tail of what she said.", hint: '"Make head or tail of" = understand', explanation: '"Make head or tail of" = understand. The preposition is "of", not "about".' },
          { type: 'fix_error', sentence: 'He pointed it the mistake in my report.', answer: 'He pointed out the mistake in my report.', hint: '"Point out" = draw attention to something', explanation: '"Point out" = identify and draw attention to something. Not "pointed it the mistake".' },
          { type: 'read_answer', passage: 'Understanding phrasal verbs is crucial for B2 fluency. "Take on" means accept responsibility; "back down" means withdraw a position; "face up to" means confront something difficult; "figure out" means understand; "put off" means delay; "carry out" means perform or conduct. These verbs are common in business, news, and everyday contexts.', question: 'What does "face up to" mean?', answer: 'confront something difficult', explanation: 'The passage says "face up to" means "confront something difficult".' },
        ],
      },
      {
        title: 'Gerunds & Infinitives — advanced',
        pronunciation: [
          { type: 'repeat',       text: 'It\'s no use complaining — nothing will change.',  focus: '"It\'s no use + gerund"' },
          { type: 'listen_write', text: 'He was too proud to admit he was wrong.',         focus: '"too + adj + to infinitive"' },
          { type: 'repeat',       text: 'She can\'t help laughing every time she hears it.', focus: '"can\'t help + gerund"' },
          { type: 'listen_write', text: 'It\'s worth taking a second look at this clause.', focus: '"worth + gerund"' },
          { type: 'repeat',       text: 'There\'s no point arguing about it now.',          focus: '"no point in + gerund"' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'It\'s no use _____ (argue) — he won\'t change his mind.', answer: 'arguing', options: ['arguing', 'to argue', 'argue'], explanation: '"It\'s no use + gerund" = arguing won\'t achieve anything.' },
          { type: 'multiple_choice', sentence: 'She can\'t help _____ (laugh) when she\'s nervous.', answer: 'laughing', options: ['laughing', 'to laugh', 'laugh'], explanation: '"Can\'t help + gerund" = can\'t stop doing something involuntary.' },
          { type: 'word_bank', sentence: 'It\'s worth _____ the terms of the contract carefully.', answer: 'reading', choices: ['reading', 'to read', 'read', 'having read'], explanation: '"Worth + gerund" = it is valuable to read. "Worth reading".' },
          { type: 'word_bank', sentence: 'There\'s no point _____ if she won\'t listen.', answer: 'trying', choices: ['trying', 'to try', 'try', 'having tried'], explanation: '"There\'s no point + gerund" = trying will not achieve anything.' },
          { type: 'fill_gap', sentence: 'He admitted _____ (take) the money without permission.', answer: 'taking / having taken', hint: '"Admit" + gerund (or perfect gerund for prior event)', explanation: '"Admit taking" or "admit having taken" — both valid. Perfect gerund emphasises the action was prior.' },
          { type: 'fill_gap', sentence: 'She denied _____ (know) anything about the decision.', answer: 'knowing', hint: '"Deny" + gerund', explanation: '"Deny knowing" = she claims she had no knowledge.' },
          { type: 'fill_gap', sentence: 'I would hate _____ (be) in that situation.', answer: 'to be', hint: '"Hate" can take infinitive for hypothetical situations', explanation: '"Would hate to be" — with "would", "hate/like/love" take the infinitive for hypothetical situations.' },
          { type: 'fix_error', sentence: 'It was worth to wait — the show was amazing.', answer: 'It was worth waiting — the show was amazing.', hint: '"Worth" + gerund, not infinitive', explanation: '"Worth" is always followed by a gerund: "worth waiting".' },
          { type: 'fix_error', sentence: 'She can\'t help to worry about everything.', answer: "She can't help worrying about everything.", hint: '"Can\'t help" + gerund', explanation: '"Can\'t help" is always followed by a gerund: "can\'t help worrying".' },
          { type: 'read_answer', passage: 'Certain structures in English always require gerunds: "worth", "no use", "no point in", "can\'t help", "risk". Others require infinitives: "too...to", "enough...to". Some verbs change meaning with gerund or infinitive: "remember doing" = recall a past event; "remember to do" = don\'t forget a future task.', question: 'Name one structure that always requires a gerund.', answer: 'worth / no use / no point in / can\'t help / risk (any one)', explanation: 'The passage lists: worth, no use, no point in, can\'t help, risk.' },
        ],
      },
      {
        title: 'Reported Speech — advanced + complex reporting verbs',
        pronunciation: [
          { type: 'repeat',       text: 'He insisted that the meeting be held immediately.',  focus: '"insisted that" + subjunctive' },
          { type: 'listen_write', text: 'She admitted having made a serious error.',         focus: '"admitted + perfect gerund"' },
          { type: 'repeat',       text: 'The judge ruled that the evidence was inadmissible.', focus: '"ruled that" — formal reporting verb' },
          { type: 'listen_write', text: 'They urged the company to reconsider its decision.', focus: '"urged + object + to infinitive"' },
          { type: 'repeat',       text: 'He denied ever having met the suspect.',            focus: '"denied ever having"' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'She admitted _____ the report without checking the facts.', answer: 'having sent', options: ['having sent', 'to send', 'sending'], explanation: '"Admit + having + past participle" = confessing to a past action.' },
          { type: 'multiple_choice', sentence: 'He insisted that the decision _____ immediately.', answer: 'be reconsidered', options: ['be reconsidered', 'was reconsidered', 'should be reconsidered'], explanation: '"Insist that" + subjunctive (base form) in formal English: "be reconsidered".' },
          { type: 'word_bank', sentence: 'The lawyer argued that the evidence _____ been tampered with.', answer: 'had', choices: ['had', 'has', 'was', 'would have'], explanation: '"Argued that the evidence had been tampered with" = past perfect in reported speech after past reporting verb.' },
          { type: 'word_bank', sentence: 'She threatened _____ legal action if the payment was delayed.', answer: 'to take', choices: ['to take', 'taking', 'take', 'having taken'], explanation: '"Threaten to" = announce intention to do something negative. Always infinitive.' },
          { type: 'fill_gap', sentence: 'He denied _____ (steal) anything from the office.', answer: 'having stolen', hint: '"Deny" + perfect gerund for completed past action', explanation: '"Deny having stolen" = past completed action. Perfect gerund emphasises prior event.' },
          { type: 'fill_gap', sentence: 'The board recommended that the policy _____ (change).', answer: 'be changed', hint: '"Recommend that" + subjunctive base form', explanation: '"Recommended that the policy be changed" = formal subjunctive after "recommend that".' },
          { type: 'fill_gap', sentence: 'She urged her team _____ (submit) the proposal by noon.', answer: 'to submit', hint: '"Urge" + object + infinitive', explanation: '"Urged her team to submit" = strongly encouraged. "Urge + object + to" structure.' },
          { type: 'fix_error', sentence: 'She claimed to have not made any mistakes.', answer: 'She claimed to have made no mistakes.', hint: 'Negation of perfect infinitive', explanation: 'Correct form: "claimed to have made no mistakes." "To not have" is also acceptable but less natural.' },
          { type: 'fix_error', sentence: 'He suggested to review the contract again.', answer: 'He suggested reviewing the contract again.', hint: '"Suggest" + gerund, not infinitive', explanation: '"Suggest" is always followed by a gerund or "that" clause: "suggested reviewing".' },
          { type: 'read_answer', passage: 'Complex reporting verbs carry specific meanings and take different grammatical patterns. "Urge/encourage/invite/persuade" take "object + to + infinitive". "Admit/deny/recall/suggest" take gerunds. "Insist/recommend/propose" can take "that + subjunctive". Using varied reporting verbs makes your writing richer and more precise.', question: 'Name one verb that can be followed by "that + subjunctive".', answer: 'insist / recommend / propose (any one)', explanation: 'The passage lists insist, recommend, and propose as verbs followed by "that + subjunctive".' },
        ],
      },
      {
        title: 'Comparison — advanced structures',
        pronunciation: [
          { type: 'repeat',       text: 'The longer you wait, the harder it gets.',       focus: 'double comparative structure' },
          { type: 'listen_write', text: 'She\'s not nearly as experienced as her colleague.', focus: '"not nearly as...as" — strong negative comparison' },
          { type: 'repeat',       text: 'This is by far the most challenging project I\'ve done.', focus: '"by far the most" — emphatic superlative' },
          { type: 'listen_write', text: 'The results were nowhere near as good as expected.', focus: '"nowhere near as...as"' },
          { type: 'repeat',       text: 'It was twice as expensive as the original estimate.', focus: '"twice as...as" — multiple comparison' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'The _____ you practise, the _____ you improve.', answer: 'more / faster', options: ['more / faster', 'most / fastest', 'much / fast'], explanation: 'Double comparative: "The more... the faster..." — parallel comparative structure.' },
          { type: 'multiple_choice', sentence: 'She\'s not _____ experienced as her manager.', answer: 'nearly as', options: ['nearly as', 'quite as', 'half as'], explanation: '"Not nearly as experienced as" = she is significantly less experienced.' },
          { type: 'word_bank', sentence: 'This is _____ the most complex case I\'ve handled.', answer: 'by far', choices: ['by far', 'much', 'even', 'quite'], explanation: '"By far the most complex" = emphatic superlative. Emphasises a significant gap.' },
          { type: 'word_bank', sentence: 'Costs were _____ as high as the previous year.', answer: 'twice', choices: ['twice', 'double', 'two times', 'two'], explanation: '"Twice as high as" = comparative multiple. "Three times as high" uses the same structure.' },
          { type: 'fill_gap', sentence: 'The situation is getting _____ worse.', answer: 'worse and', hint: 'Repeated comparative for increasing degree', explanation: '"Worse and worse" = a situation that is increasingly bad.' },
          { type: 'fill_gap', sentence: 'Her performance was _____ as impressive as last year.', answer: 'nowhere near as', hint: '"Nowhere near as" = far from equal', explanation: '"Nowhere near as impressive as" = it was far less impressive. Strong negative comparison.' },
          { type: 'fill_gap', sentence: '_____ sooner we act, _____ better chance we have.', answer: 'The / the', hint: 'Double comparative with "the...the"', explanation: '"The sooner... the better" — double comparative for cause-and-effect progression.' },
          { type: 'fix_error', sentence: 'He is far more talented as his brother.', answer: 'He is far more talented than his brother.', hint: 'Comparatives use "than", not "as"', explanation: 'Comparative structures use "than": "more talented than his brother".' },
          { type: 'fix_error', sentence: 'She works as twice hard as her colleagues.', answer: 'She works twice as hard as her colleagues.', hint: '"Twice as + adjective + as"', explanation: '"Twice as hard as" — the multiple goes before "as": "twice as hard".' },
          { type: 'read_answer', passage: 'Advanced comparison structures include: double comparatives ("The more you read, the more you know"), emphatic superlatives ("by far the best"), multiples ("three times as fast as"), and negative comparisons ("not nearly as simple as it sounds"). These structures add precision and emphasis to descriptions and arguments.', question: 'What is an example of an emphatic superlative from the passage?', answer: '"by far the best"', explanation: 'The passage gives "by far the best" as an example of an emphatic superlative.' },
        ],
      },
    ],
  },

  // ── Module 11 — Sofisticação B2 ──────────────────────────────────────────
  {
    title: 'Sophistication B2',
    topics: [
      {
        title: 'Hypothesis & speculation',
        grammar: [
          { type: 'multiple_choice', sentence: 'She _____ be at home — her car is in the driveway.', answer: 'must', options: ['must', 'should', 'might'], explanation: '"Must" expresses near-certain deduction based on evidence.' },
          { type: 'multiple_choice', sentence: 'He _____ have left already — I can\'t reach him.', answer: 'may', options: ['may', 'must', 'will'], explanation: '"May have" speculates about a past action with uncertainty.' },
          { type: 'word_bank', sentence: 'Suppose you _____ win the lottery — what would you do?', answer: 'were to', choices: ['were to', 'would', 'could', 'had'], explanation: '"Suppose you were to" introduces a hypothetical scenario formally.' },
          { type: 'word_bank', sentence: 'What if the flight _____ cancelled? Do you have a backup plan?', answer: 'were', choices: ['were', 'is', 'was', 'will be'], explanation: '"What if the flight were cancelled" uses the past subjunctive for hypothetical situations.' },
          { type: 'fill_gap', sentence: 'Imagine _____ (live) without the internet for a week.', answer: 'living', hint: 'Gerund after "imagine"', explanation: '"Imagine living" — "imagine" is followed by a gerund to introduce hypothetical scenarios.' },
          { type: 'fill_gap', sentence: 'She could _____ (miss) the meeting — she looked confused.', answer: 'have missed', hint: 'Modal + have + past participle for past speculation', explanation: '"Could have missed" speculates about a past possibility.' },
          { type: 'fill_gap', sentence: 'Assuming _____ (be) right, what should we do next?', answer: 'I am', hint: '"Assuming" introduces a hypothesis', explanation: '"Assuming I am right" — "assuming" introduces a conditional hypothesis.' },
          { type: 'fix_error', sentence: 'Suppose she would come — what would you say to her?', answer: 'Suppose she came — what would you say to her?', hint: 'After "suppose", use past simple for hypotheticals', explanation: 'Hypothetical "suppose" takes the past simple: "Suppose she came…"' },
          { type: 'fix_error', sentence: 'They might had left before we arrived.', answer: 'They might have left before we arrived.', hint: 'Modal + have + past participle', explanation: '"Might have left" is the correct form — "had" is incorrect after "might".' },
          { type: 'read_answer', passage: 'Speculation and hypothesis are central to academic and professional discourse. We use modals like "could", "might" and "may" to express degrees of certainty about the present or past. Phrases like "suppose", "assuming", "what if" and "imagine" introduce hypothetical scenarios. These structures allow speakers to explore possibilities without asserting facts.', question: 'What phrases are mentioned for introducing hypothetical scenarios?', answer: 'suppose, assuming, what if, imagine', explanation: 'The passage lists "suppose", "assuming", "what if" and "imagine" as hypothesis introducers.' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'She must be home — her lights are on.', focus: 'deduction modal stress' },
          { type: 'listen_write', text: 'What if we had taken a different route?', focus: '"what if" hypothetical intonation' },
          { type: 'repeat', text: 'Suppose you were offered the job — would you take it?', focus: '"Suppose" + hypothetical' },
          { type: 'minimal_pairs', word1: 'might', word2: 'right', target: 'word1', focus: 'initial /m/ vs /r/' },
          { type: 'sentence_stress', text: 'She could have told us about the change.', stressed_word: 'could', focus: 'modal speculation carries emphasis' },
        ],
      },
      {
        title: 'Inversion — negative fronted intro',
        grammar: [
          { type: 'multiple_choice', sentence: 'Never _____ such a difficult decision in my career.', answer: 'have I faced', options: ['have I faced', 'I have faced', 'faced I'], explanation: 'After "never" at the start, invert: auxiliary + subject.' },
          { type: 'multiple_choice', sentence: 'Rarely _____ the committee reach a decision so quickly.', answer: 'does', options: ['does', 'do', 'did'], explanation: '"Rarely does" — inversion after a negative adverb; "the committee" is singular so "does".' },
          { type: 'word_bank', sentence: 'Not only _____ late, but he also forgot the documents.', answer: 'was he', choices: ['was he', 'he was', 'were he', 'he were'], explanation: '"Not only was he late" — invert after "not only" with past simple.' },
          { type: 'word_bank', sentence: 'Seldom _____ I read a book that moved me so deeply.', answer: 'have', choices: ['have', 'had', 'do', 'did'], explanation: '"Seldom have I read" — present perfect inversion after negative adverb.' },
          { type: 'fill_gap', sentence: 'Under no circumstances _____ you share this password.', answer: 'should', hint: 'Inversion after "under no circumstances"', explanation: '"Under no circumstances should you" — strong prohibition with inversion.' },
          { type: 'fill_gap', sentence: 'At no point _____ the data been compromised.', answer: 'has', hint: 'Present perfect inversion', explanation: '"At no point has the data been compromised" — inversion with present perfect.' },
          { type: 'fill_gap', sentence: 'Little _____ we know what the future would bring.', answer: 'did', hint: 'Past simple inversion after "little"', explanation: '"Little did we know" — classic inversion with "little" for dramatic effect.' },
          { type: 'fix_error', sentence: 'Hardly I had sat down when the phone rang.', answer: 'Hardly had I sat down when the phone rang.', hint: 'Inversion after "hardly"', explanation: '"Hardly had I sat down" — inversion required: auxiliary before subject.' },
          { type: 'fix_error', sentence: 'No sooner she had arrived than the problems started.', answer: 'No sooner had she arrived than the problems started.', hint: '"No sooner had + subject"', explanation: '"No sooner had she arrived" — inversion required after "no sooner".' },
          { type: 'read_answer', passage: 'Fronted negative adverbials trigger subject-auxiliary inversion in English. Expressions such as "never", "rarely", "seldom", "at no point", "under no circumstances", "not only" and "no sooner" all require this structure. This is common in formal writing and gives the sentence a dramatic or emphatic tone.', question: 'What grammatical effect do fronted negative adverbials trigger?', answer: 'subject-auxiliary inversion', explanation: 'The passage states they "trigger subject-auxiliary inversion".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'Never have I seen such a stunning performance.', focus: 'inversion + emphatic stress on "Never"' },
          { type: 'listen_write', text: 'Rarely does she make the same mistake twice.', focus: '"Rarely does" inversion rhythm' },
          { type: 'repeat', text: 'Not only did he arrive late, but he left early too.', focus: '"Not only did" falling intonation' },
          { type: 'minimal_pairs', word1: 'rarely', word2: 'barely', target: 'word1', focus: '/r/ vs /b/ initial consonant' },
          { type: 'sentence_stress', text: 'Under no circumstances should you open that file.', stressed_word: 'no', focus: '"No" in prohibition carries maximum stress' },
        ],
      },
      {
        title: 'Vocabulary chunks — idioms Set 1',
        grammar: [
          { type: 'multiple_choice', sentence: 'The project is finally _____ — we\'ll finish by Friday.', answer: 'on track', options: ['on track', 'in line', 'at pace'], explanation: '"On track" means progressing as planned and on schedule.' },
          { type: 'multiple_choice', sentence: 'Let\'s not beat around the bush — what do you really mean?', answer: 'avoid the subject', options: ['avoid the subject', 'be aggressive', 'work harder'], explanation: '"Beat around the bush" means to avoid saying something directly.' },
          { type: 'word_bank', sentence: 'She has a _____ for languages — she picks them up incredibly fast.', answer: 'knack', choices: ['knack', 'taste', 'trick', 'habit'], explanation: '"A knack for something" means a natural talent or skill.' },
          { type: 'word_bank', sentence: 'The new manager really hit the ground _____ on her first week.', answer: 'running', choices: ['running', 'working', 'going', 'moving'], explanation: '"Hit the ground running" means to start something quickly and with great energy.' },
          { type: 'fill_gap', sentence: 'I\'m in _____ water after missing the deadline.', answer: 'hot', hint: 'In ___ water = in trouble', explanation: '"In hot water" is an idiom meaning in trouble or in a difficult situation.' },
          { type: 'fill_gap', sentence: 'We need to take this decision with a _____ of salt.', answer: 'pinch', hint: 'A _____ of salt = be sceptical', explanation: '"Take with a pinch of salt" means to be sceptical or not fully believe something.' },
          { type: 'fill_gap', sentence: 'After months of disagreement, they finally buried the _____.', answer: 'hatchet', hint: 'Bury the _____ = make peace', explanation: '"Bury the hatchet" means to end a conflict and make peace.' },
          { type: 'fix_error', sentence: 'Let\'s cut to the pursue and talk about the real issue.', answer: 'Let\'s cut to the chase and talk about the real issue.', hint: '"Cut to the chase" = get to the point', explanation: 'The idiom is "cut to the chase" — meaning get to the point directly.' },
          { type: 'fix_error', sentence: 'She has been burning the midnight candle to finish the report.', answer: 'She has been burning the midnight oil to finish the report.', hint: 'Burning the midnight _____ = working late', explanation: 'The correct idiom is "burning the midnight oil" — working very late into the night.' },
          { type: 'read_answer', passage: 'Idioms are fixed expressions whose meaning cannot be determined from the individual words. "Hit the ground running", "in hot water", "bury the hatchet" and "take with a pinch of salt" are all common English idioms. Learning them in context helps learners use them naturally in conversation and understand native speakers more easily.', question: 'Why is it important to learn idioms in context?', answer: 'to use them naturally and understand native speakers', explanation: 'The passage says context helps learners "use them naturally in conversation and understand native speakers".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'Let\'s cut to the chase and get started.', focus: 'idiom rhythm, connected speech' },
          { type: 'listen_write', text: 'She hit the ground running from day one.', focus: '"hit the ground running" stress pattern' },
          { type: 'repeat', text: 'We should take that report with a pinch of salt.', focus: 'natural intonation across a full idiom' },
          { type: 'minimal_pairs', word1: 'chase', word2: 'case', target: 'word1', focus: '/tʃ/ vs /k/ initial consonant' },
          { type: 'sentence_stress', text: 'I was completely in the dark about the changes.', stressed_word: 'dark', focus: 'idiom focus word carries main stress' },
        ],
      },
      {
        title: 'Vocabulary chunks — collocations: environment & society',
        grammar: [
          { type: 'multiple_choice', sentence: 'Governments must _____ action to reduce carbon emissions.', answer: 'take', options: ['take', 'make', 'do'], explanation: '"Take action" is a fixed collocation meaning to act on something.' },
          { type: 'multiple_choice', sentence: 'The charity aims to _____ poverty in rural communities.', answer: 'alleviate', options: ['alleviate', 'reduce', 'cut'], explanation: '"Alleviate poverty" is a strong collocation common in formal/academic writing.' },
          { type: 'word_bank', sentence: 'Rising temperatures pose a serious _____ to biodiversity.', answer: 'threat', choices: ['threat', 'risk', 'danger', 'harm'], explanation: '"Pose a threat to" is a fixed collocation in environmental discourse.' },
          { type: 'word_bank', sentence: 'The new policy aims to _____ social inequality.', answer: 'address', choices: ['address', 'solve', 'fix', 'deal'], explanation: '"Address inequality" is the standard collocation — more formal than "fix" or "deal with".' },
          { type: 'fill_gap', sentence: 'The industrial sector must _____ its carbon footprint significantly.', answer: 'reduce', hint: 'Common verb + "carbon footprint"', explanation: '"Reduce its carbon footprint" is the standard collocation.' },
          { type: 'fill_gap', sentence: 'Many species are under _____ as a result of habitat destruction.', answer: 'threat', hint: '"Under _____" = in danger', explanation: '"Under threat" is a fixed phrase meaning in danger of harm or extinction.' },
          { type: 'fill_gap', sentence: 'Renewable energy can help to _____ climate change.', answer: 'combat', hint: 'Verb meaning to fight against', explanation: '"Combat climate change" is the standard collocation — not "fight" or "beat".' },
          { type: 'fix_error', sentence: 'We must make efforts for tackling pollution in urban areas.', answer: 'We must make efforts to tackle pollution in urban areas.', hint: '"Make efforts to + infinitive"', explanation: '"Make efforts to tackle" — "to + infinitive" follows "efforts", not a preposition.' },
          { type: 'fix_error', sentence: 'The government has raised awareness of the problem of global warming.', answer: 'The government has raised awareness about the problem of global warming.', hint: '"Raise awareness about something"', explanation: '"Raise awareness about" is the standard preposition in this collocation.' },
          { type: 'read_answer', passage: 'Environmental collocations are essential in academic and journalistic writing. Common ones include "combat climate change", "reduce carbon emissions", "pose a threat to biodiversity", and "raise awareness about environmental issues". Using these phrases correctly signals fluency and familiarity with the topic at an advanced level.', question: 'What does correct use of collocations signal in writing?', answer: 'fluency and familiarity with the topic', explanation: 'The passage says it "signals fluency and familiarity with the topic at an advanced level".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'We need to reduce our carbon footprint urgently.', focus: 'collocation rhythm: "carbon footprint"' },
          { type: 'listen_write', text: 'Climate change poses a serious threat to global stability.', focus: '"poses a threat to" connected speech' },
          { type: 'repeat', text: 'The government must take action to address social inequality.', focus: 'formal sentence prosody' },
          { type: 'minimal_pairs', word1: 'threat', word2: 'thread', target: 'word1', focus: '/θret/ vs /θred/ — final consonant' },
          { type: 'sentence_stress', text: 'Biodiversity is under serious threat from deforestation.', stressed_word: 'serious', focus: 'adjective intensifier carries main stress' },
        ],
      },
      {
        title: 'Concession clauses',
        grammar: [
          { type: 'multiple_choice', sentence: '_____ the poor weather, the event was a great success.', answer: 'Despite', options: ['Despite', 'Although', 'Even though'], explanation: '"Despite" is followed by a noun phrase, not a clause.' },
          { type: 'multiple_choice', sentence: '_____ she was tired, she stayed to finish the report.', answer: 'Although', options: ['Although', 'Despite', 'In spite'], explanation: '"Although" is a conjunction followed by a full clause.' },
          { type: 'word_bank', sentence: 'The film received positive reviews _____ its low budget.', answer: 'in spite of', choices: ['in spite of', 'although', 'even so', 'however'], explanation: '"In spite of" + noun phrase expresses concession.' },
          { type: 'word_bank', sentence: 'The plan is risky. _____, we decided to proceed.', answer: 'Nevertheless', choices: ['Nevertheless', 'Although', 'Despite', 'In spite of'], explanation: '"Nevertheless" is an adverb that begins a new sentence to show contrast.' },
          { type: 'fill_gap', sentence: 'Tired _____ he was, he continued to work until midnight.', answer: 'as', hint: '"___ as he was" = concession with inversion', explanation: '"Tired as he was" = although he was tired — "as" here introduces a concessive clause with inversion.' },
          { type: 'fill_gap', sentence: '_____ all their efforts, the team failed to win.', answer: 'Despite', hint: 'Followed by a noun phrase', explanation: '"Despite all their efforts" — "despite" before a noun phrase.' },
          { type: 'fill_gap', sentence: '_____ it was raining heavily, the match continued.', answer: 'Even though', hint: 'Stronger form of "although"', explanation: '"Even though" introduces a concession with more emphasis than "although".' },
          { type: 'fix_error', sentence: 'Despite she was ill, she came to work.', answer: 'Despite being ill, she came to work.', hint: '"Despite" cannot be followed by a clause — use a noun/gerund', explanation: '"Despite" must be followed by a noun or gerund: "Despite being ill…"' },
          { type: 'fix_error', sentence: 'Although the bad weather, we had a fantastic time.', answer: 'Despite the bad weather, we had a fantastic time.', hint: '"Although" needs a clause; "despite" needs a noun phrase', explanation: '"Although" requires a clause. Before a noun phrase, use "despite" or "in spite of".' },
          { type: 'read_answer', passage: 'Concession clauses acknowledge an opposing idea before asserting the main point. "Although", "even though" and "while" introduce concessive clauses. "Despite" and "in spite of" are followed by noun phrases or gerunds. Adverbs like "nevertheless", "however" and "even so" link sentences and show concession. Mastering these makes arguments more nuanced.', question: 'What is the difference between "although" and "despite"?', answer: '"although" introduces a clause; "despite" is followed by a noun/gerund', explanation: 'The passage explains "although…even though" take clauses; "despite/in spite of" take noun phrases.' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'Despite the heavy rain, the concert went ahead as planned.', focus: '"Despite" — falling intonation on main clause' },
          { type: 'listen_write', text: 'Although she was nervous, her presentation was excellent.', focus: '"Although" clause rhythm' },
          { type: 'repeat', text: 'The project was delayed; nevertheless, it was completed on time.', focus: 'adverb "nevertheless" — sentence break intonation' },
          { type: 'minimal_pairs', word1: 'though', word2: 'through', target: 'word1', focus: '/ðoʊ/ vs /θruː/ — vowel distinction' },
          { type: 'sentence_stress', text: 'Even though he tried his best, the result was disappointing.', stressed_word: 'Even', focus: '"Even though" — "even" receives contrastive stress' },
        ],
      },
      {
        title: 'Emphasis & focus structures',
        grammar: [
          { type: 'multiple_choice', sentence: 'What I really enjoy _____ the challenge of solving problems.', answer: 'is', options: ['is', 'are', 'was'], explanation: 'In a "what"-cleft sentence, "is" links "what I enjoy" to the complement.' },
          { type: 'multiple_choice', sentence: 'It _____ the timing that caused all the problems.', answer: 'was', options: ['was', 'is', 'were'], explanation: '"It was...that" is the standard cleft structure for emphasis in the past.' },
          { type: 'word_bank', sentence: 'I _____ think this is the best option available to us.', answer: 'do', choices: ['do', 'really', 'must', 'very'], explanation: 'Adding "do" before the verb (I do think) adds emphatic assertion.' },
          { type: 'word_bank', sentence: '_____ she did was ignore every piece of advice we gave her.', answer: 'What', choices: ['What', 'That', 'Which', 'How'], explanation: '"What she did was ignore…" — a what-cleft to emphasise the action.' },
          { type: 'fill_gap', sentence: 'The _____ I care about is the quality, not the speed.', answer: 'thing', hint: '"The _____ that…" focus structure', explanation: '"The thing I care about is the quality" — focusing structure using "the thing".' },
          { type: 'fill_gap', sentence: 'It _____ John who found the solution first.', answer: 'was', hint: 'Cleft sentence', explanation: '"It was John who found…" — cleft sentence to identify and emphasise John.' },
          { type: 'fill_gap', sentence: 'She _____ apologise. (emphasise she did)', answer: 'did', hint: 'Add "do/did" before the main verb for emphasis', explanation: '"She did apologise" — emphatic "did" asserts the truth of the action.' },
          { type: 'fix_error', sentence: 'What she needs it is more time to think.', answer: 'What she needs is more time to think.', hint: 'No extra "it" in a what-cleft', explanation: '"What she needs is…" — no "it" after the "what"-cleft subject.' },
          { type: 'fix_error', sentence: 'It were the deadlines that caused the most stress.', answer: 'It was the deadlines that caused the most stress.', hint: '"It was...that" — always "was"', explanation: '"It was the deadlines that…" — the cleft always uses "it was" regardless of the noun.' },
          { type: 'read_answer', passage: 'Emphasis structures highlight specific parts of a sentence. Cleft sentences ("It was…that", "What…is") focus attention on one element. Emphatic "do/did" adds assertion. Fronting moves a word or phrase to the beginning for dramatic effect: "This solution, I cannot accept." Understanding these structures helps produce fluent, expressive English.', question: 'What does fronting achieve in a sentence?', answer: 'dramatic effect / highlights one element', explanation: 'The passage says fronting "moves a word or phrase to the beginning for dramatic effect".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'It was the last chapter that made the book so powerful.', focus: '"It was...that" — nuclear stress on focused element' },
          { type: 'listen_write', text: 'What I really want is a clear answer.', focus: '"What I want is" — emphasis on focused noun' },
          { type: 'repeat', text: 'I do believe this is the right decision.', focus: 'emphatic "do" — strong stress' },
          { type: 'minimal_pairs', word1: 'fact', word2: 'fast', target: 'word1', focus: '/fækt/ vs /fæst/ — final consonant cluster' },
          { type: 'sentence_stress', text: 'It was her dedication that made all the difference.', stressed_word: 'dedication', focus: 'cleft sentence — focused element receives main stress' },
        ],
      },
      {
        title: 'Present Perfect — review & distinctions B2',
        grammar: [
          { type: 'multiple_choice', sentence: 'She _____ three books this year.', answer: 'has written', options: ['has written', 'wrote', 'had written'], explanation: '"This year" is still in progress — use present perfect, not past simple.' },
          { type: 'multiple_choice', sentence: 'I _____ to Tokyo twice in my life.', answer: 'have been', options: ['have been', 'went', 'had been'], explanation: '"In my life" signals a life experience — present perfect with "ever/twice".' },
          { type: 'word_bank', sentence: 'They _____ just _____ the report. You can read it now.', answer: 'have / finished', choices: ['have', 'has', 'finished', 'finish', 'had'], explanation: '"Have just finished" — present perfect with "just" for a very recent completed action.' },
          { type: 'word_bank', sentence: 'By the time she arrived, we _____ _____ waiting for an hour.', answer: 'had / been', choices: ['had', 'have', 'been', 'was', 'were'], explanation: '"Had been waiting" — past perfect continuous for an ongoing action that preceded a past event.' },
          { type: 'fill_gap', sentence: 'It\'s the first time I _____ (eat) sushi.', answer: 'have eaten', hint: '"First time I have ___"', explanation: '"It\'s the first time I have eaten" — present perfect after "first/second time".' },
          { type: 'fill_gap', sentence: 'She _____ (live) in Paris for ten years. She still lives there.', answer: 'has lived', hint: 'Action that started in the past and continues now', explanation: '"Has lived" — present perfect with "for" when the action is still ongoing.' },
          { type: 'fill_gap', sentence: 'They _____ (not decide) yet whether to accept the offer.', answer: 'haven\'t decided', hint: 'Present perfect negative', explanation: '"Haven\'t decided yet" — present perfect with "yet" for an action not completed so far.' },
          { type: 'fix_error', sentence: 'I have seen that film last week.', answer: 'I saw that film last week.', hint: '"Last week" = definite past time', explanation: '"Last week" is a definite past time reference — use past simple, not present perfect.' },
          { type: 'fix_error', sentence: 'She has never went to Australia.', answer: 'She has never been to Australia.', hint: 'Present perfect of "go" for experience is "been"', explanation: '"Has never been" — the present perfect of "go" for experience uses "been", not "went".' },
          { type: 'read_answer', passage: 'The present perfect connects the past to the present. We use it for experiences ("I have been to Spain"), recent news ("The president has resigned"), actions in an unfinished time period ("She has written three emails today"), and ongoing situations ("They have lived here for years"). In contrast, the past simple is used for completed events at a specific past time.', question: 'When do we use the past simple instead of the present perfect?', answer: 'for completed events at a specific past time', explanation: 'The passage says "the past simple is used for completed events at a specific past time".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'I\'ve already told you the answer twice.', focus: '"I\'ve" contraction — weak form' },
          { type: 'listen_write', text: 'She has never been to South America before.', focus: '"has never been" — weak "has" in connected speech' },
          { type: 'repeat', text: 'We haven\'t decided yet what to do next.', focus: '"haven\'t" — negative contraction clarity' },
          { type: 'minimal_pairs', word1: 'since', word2: 'sense', target: 'word1', focus: '/sɪns/ vs /sɛns/ — vowel difference' },
          { type: 'sentence_stress', text: 'She has been working here for fifteen years.', stressed_word: 'fifteen', focus: 'time expressions carry strong stress' },
        ],
      },
      {
        title: 'Conditionals — B2 review + formal alternatives',
        grammar: [
          { type: 'multiple_choice', sentence: 'If I _____ more time, I would study Italian.', answer: 'had', options: ['had', 'have', 'would have'], explanation: 'Second conditional: "if + past simple, would + base form" for unlikely/hypothetical present.' },
          { type: 'multiple_choice', sentence: 'If she _____ called, I would have answered.', answer: 'had', options: ['had', 'would have', 'has'], explanation: 'Third conditional: "if + past perfect, would have + past participle" for unreal past.' },
          { type: 'word_bank', sentence: '_____ you have any questions, please contact our team.', answer: 'Should', choices: ['Should', 'Would', 'Had', 'Were'], explanation: '"Should you have" = "If you have" — formal alternative to the first conditional.' },
          { type: 'word_bank', sentence: '_____ I known earlier, I would have acted immediately.', answer: 'Had', choices: ['Had', 'Have', 'Should', 'Were'], explanation: '"Had I known" = "If I had known" — formal inverted third conditional.' },
          { type: 'fill_gap', sentence: 'Unless you _____ (work) harder, you will fail the exam.', answer: 'work', hint: '"Unless" = "if not"', explanation: '"Unless you work harder" = "If you don\'t work harder" — "unless" takes the present simple.' },
          { type: 'fill_gap', sentence: '_____ she _____ to accept, we would begin immediately.', answer: 'Were / to agree', hint: 'Formal second conditional with inversion', explanation: '"Were she to agree" = "If she were to agree" — formal inverted second conditional.' },
          { type: 'fill_gap', sentence: 'Provided that you _____ (submit) the form, we\'ll process it today.', answer: 'submit', hint: '"Provided that" + present simple', explanation: '"Provided that you submit" — "provided that" introduces a real condition like "if".' },
          { type: 'fix_error', sentence: 'If I would know the answer, I would tell you.', answer: 'If I knew the answer, I would tell you.', hint: 'No "would" in the if-clause', explanation: 'Second conditional: "if + past simple" — never "would" in the if-clause.' },
          { type: 'fix_error', sentence: 'Had she not would resign, we could have kept her.', answer: 'Had she not resigned, we could have kept her.', hint: 'Inverted third conditional: Had + subject + past participle', explanation: '"Had she not resigned" — inverted third conditional takes past participle, no "would".' },
          { type: 'read_answer', passage: 'B2 learners should be comfortable with all conditional types and their formal alternatives. "Should you need assistance" replaces "If you need assistance." "Had we known" replaces "If we had known." "Were she to agree" replaces "If she were to agree." These formal inversions are common in professional emails, reports and formal speeches.', question: 'In which contexts are formal conditional inversions commonly used?', answer: 'professional emails, reports and formal speeches', explanation: 'The passage says they are "common in professional emails, reports and formal speeches".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'If I had studied harder, I would have passed the exam.', focus: 'third conditional rhythm' },
          { type: 'listen_write', text: 'Should you require assistance, please do not hesitate to call.', focus: 'formal inversion — falling intonation' },
          { type: 'repeat', text: 'Were she to apply, we would be delighted to interview her.', focus: '"Were she to" — formal conditional stress' },
          { type: 'minimal_pairs', word1: 'would', word2: 'wood', target: 'word1', focus: '/wʊd/ — identical sounds, different meaning' },
          { type: 'sentence_stress', text: 'Had we known about the problem, we would have acted sooner.', stressed_word: 'known', focus: 'main verb in if-clause carries stress in inverted conditional' },
        ],
      },
      {
        title: 'Passive voice — complete review',
        grammar: [
          { type: 'multiple_choice', sentence: 'The report _____ submitted by the team last night.', answer: 'was', options: ['was', 'is', 'were'], explanation: 'Simple past passive: "was + past participle". Subject is singular.' },
          { type: 'multiple_choice', sentence: 'The new system _____ being tested by engineers at the moment.', answer: 'is', options: ['is', 'was', 'has been'], explanation: 'Present continuous passive: "is being + past participle".' },
          { type: 'word_bank', sentence: 'The contract _____ _____ by the lawyers before signing.', answer: 'will be / reviewed', choices: ['will be', 'would be', 'reviewed', 'reviewing', 'review'], explanation: '"Will be reviewed" — future simple passive.' },
          { type: 'word_bank', sentence: 'The mistake _____ _____ earlier if someone had checked the data.', answer: 'would have been / caught', choices: ['would have been', 'will have been', 'caught', 'catch', 'catching'], explanation: '"Would have been caught" — third conditional passive.' },
          { type: 'fill_gap', sentence: 'The suspects _____ (question) by the police right now.', answer: 'are being questioned', hint: 'Present continuous passive', explanation: '"Are being questioned" — present continuous passive with "by".' },
          { type: 'fill_gap', sentence: 'The results _____ (not yet / announce) officially.', answer: 'have not yet been announced', hint: 'Present perfect passive', explanation: '"Have not yet been announced" — present perfect passive with "yet".' },
          { type: 'fill_gap', sentence: 'It _____ (report) that the CEO will resign next week.', answer: 'is reported', hint: 'Impersonal passive structure', explanation: '"It is reported that" — impersonal passive used in journalism and formal language.' },
          { type: 'fix_error', sentence: 'The cake was being made by my mother since the morning.', answer: 'The cake has been being made by my mother since the morning.', hint: 'For ongoing action since a point in time, use present perfect passive', explanation: '"Has been being made" — present perfect passive continuous for an ongoing action since a point.' },
          { type: 'fix_error', sentence: 'The book is written in 1954 by Ernest Hemingway.', answer: 'The book was written in 1954 by Ernest Hemingway.', hint: '"In 1954" = specific past time', explanation: 'A specific past year requires past simple: "was written".' },
          { type: 'read_answer', passage: 'The passive voice is used in English to focus on the action or its result rather than the agent. It appears frequently in formal writing, academic texts and journalism. All tenses can be made passive: "is written", "was written", "has been written", "will be written", "is being written". The agent can be omitted when unknown or unimportant.', question: 'When can the agent be omitted in a passive sentence?', answer: 'when unknown or unimportant', explanation: 'The passage says "the agent can be omitted when unknown or unimportant".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'The letter was written and sent on Monday.', focus: 'past passive rhythm' },
          { type: 'listen_write', text: 'The new building is being constructed near the centre.', focus: 'continuous passive — "is being" connected' },
          { type: 'repeat', text: 'It has been reported that the prices will rise soon.', focus: 'impersonal passive — formal falling intonation' },
          { type: 'minimal_pairs', word1: 'written', word2: 'ridden', target: 'word1', focus: '/ˈrɪt.ən/ vs /ˈrɪd.ən/ — medial consonant' },
          { type: 'sentence_stress', text: 'The results will be announced at the end of the meeting.', stressed_word: 'announced', focus: 'main verb in passive receives primary stress' },
        ],
      },
      {
        title: 'Reported Speech — complete review',
        grammar: [
          { type: 'multiple_choice', sentence: 'She said she _____ be late. (original: "I will be late")', answer: 'would', options: ['would', 'will', 'should'], explanation: 'Backshift: "will" → "would" in reported speech.' },
          { type: 'multiple_choice', sentence: 'He told me he _____ already eaten. (original: "I have already eaten")', answer: 'had', options: ['had', 'has', 'was'], explanation: 'Backshift: present perfect "have eaten" → past perfect "had eaten".' },
          { type: 'word_bank', sentence: 'She asked me _____ I had finished the project.', answer: 'whether', choices: ['whether', 'if', 'whether/if', 'that', 'what'], explanation: '"Whether" (or "if") is used to report yes/no questions. Both are correct.' },
          { type: 'word_bank', sentence: 'He advised me _____ the contract carefully before signing.', answer: 'to read', choices: ['to read', 'read', 'reading', 'that I read'], explanation: '"Advised me to read" — reporting verbs like "advise" are followed by "object + to infinitive".' },
          { type: 'fill_gap', sentence: '"Don\'t leave." → He told me _____ leave.', answer: 'not to', hint: '"Don\'t" becomes "not to" in reported speech', explanation: 'Reported imperative: "He told me not to leave".' },
          { type: 'fill_gap', sentence: '"Where did you go last night?" → She asked me _____ I had gone the night before.', answer: 'where', hint: 'Report the question word', explanation: '"She asked me where I had gone" — wh-question becomes embedded with normal word order.' },
          { type: 'fill_gap', sentence: 'He denied _____ (steal) the documents.', answer: 'stealing', hint: '"Deny" + gerund', explanation: '"Denied stealing" — "deny" takes a gerund, not an infinitive.' },
          { type: 'fix_error', sentence: 'She said me that she was tired.', answer: 'She told me that she was tired.', hint: '"Say" vs "tell": "tell" needs an object', explanation: '"Tell" requires an indirect object (me): "told me". "Say" does not: "She said she was tired."' },
          { type: 'fix_error', sentence: 'He asked where was she going.', answer: 'He asked where she was going.', hint: 'Reported questions use normal (statement) word order', explanation: 'In reported questions, word order is subject + verb: "where she was going" — no inversion.' },
          { type: 'read_answer', passage: 'Reported speech requires us to shift tenses and change pronouns and time expressions. "I will call you tomorrow" becomes "She said she would call me the next day." Reporting verbs like "explain", "admit", "deny", "promise", "warn" and "advise" follow different patterns and can take a that-clause, a gerund or a to-infinitive. B2 learners should know these patterns well.', question: 'What do B2 learners need to know about reporting verbs?', answer: 'the patterns they follow (that-clause, gerund, to-infinitive)', explanation: 'The passage says they "can take a that-clause, a gerund or a to-infinitive" — patterns B2 learners should know.' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'She told me she would be there by nine.', focus: '"would" — weak form in connected speech' },
          { type: 'listen_write', text: 'He asked whether I had finished the assignment.', focus: '"whether" — clear articulation' },
          { type: 'repeat', text: 'They admitted having made a serious mistake.', focus: '"admitted having" — gerund reporting structure' },
          { type: 'minimal_pairs', word1: 'said', word2: 'sad', target: 'word1', focus: '/sɛd/ vs /sæd/ — vowel length' },
          { type: 'sentence_stress', text: 'She warned me not to trust everything I read online.', stressed_word: 'not', focus: '"not" in negative reported command receives strong stress' },
        ],
      },
      {
        title: 'Modal verbs — complete system review',
        grammar: [
          { type: 'multiple_choice', sentence: 'You _____ submit the form — it\'s optional.', answer: 'don\'t have to', options: ["don't have to", "mustn't", "shouldn't"], explanation: '"Don\'t have to" = not obligatory. "Mustn\'t" = prohibited.' },
          { type: 'multiple_choice', sentence: 'He _____ pass the exam — he prepared for months.', answer: 'should', options: ['should', 'must', 'would'], explanation: '"Should" = expectation based on reason. Not as strong as "must".' },
          { type: 'word_bank', sentence: 'You _____ smoke in here — it\'s strictly prohibited.', answer: 'mustn\'t', choices: ["mustn't", "don't have to", "shouldn't", "needn't"], explanation: '"Mustn\'t" = strong prohibition. Very different from "don\'t have to".' },
          { type: 'word_bank', sentence: 'I _____ have taken a taxi — the walk wasn\'t that far.', answer: 'needn\'t have', choices: ["needn't have", "shouldn't have", "couldn't have", "mustn't have"], explanation: '"Needn\'t have" = did something unnecessary. The action happened but was not needed.' },
          { type: 'fill_gap', sentence: 'She _____ (be) the new manager — she fits the description perfectly.', answer: 'must be', hint: 'Strong present deduction', explanation: '"Must be" = logical deduction from evidence.' },
          { type: 'fill_gap', sentence: 'He _____ (know) about it — he was there the whole time.', answer: 'must have known', hint: 'Strong past deduction', explanation: '"Must have known" = past deduction based on logical reasoning.' },
          { type: 'fill_gap', sentence: 'They _____ (should) apologise — it was clearly their fault.', answer: 'should have apologised', hint: 'Criticism of a past omission', explanation: '"Should have apologised" = past obligation not fulfilled — criticism.' },
          { type: 'fix_error', sentence: 'She could have to leave early because she was ill.', answer: 'She had to leave early because she was ill.', hint: '"Could have to" is not a valid form', explanation: '"Had to" is the past of "must" for obligation. "Could have to" is not grammatical.' },
          { type: 'fix_error', sentence: 'You mustn\'t to bring your ID to the event.', answer: 'You must bring your ID to the event.', hint: 'No "to" after modal verbs', explanation: 'Modal verbs are followed by the bare infinitive (no "to"): "must bring", not "must to bring".' },
          { type: 'read_answer', passage: 'Modal verbs express a range of meanings: obligation (must, have to), prohibition (mustn\'t), permission (can, may), ability (can, could), advice (should, ought to), possibility (might, could), deduction (must, can\'t) and past criticism (should have, ought to have, needn\'t have). Mastery of the full system — including their past forms — is essential at B2.', question: 'What past form is used for past criticism?', answer: 'should have, ought to have, needn\'t have', explanation: 'The passage lists "should have, ought to have, needn\'t have" as past criticism forms.' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'You must have been exhausted after that journey.', focus: '"must have been" — weak reduction' },
          { type: 'listen_write', text: 'She should have told us about the change in plan.', focus: '"should have" — contracted pronunciation' },
          { type: 'repeat', text: 'You don\'t have to come if you\'re not feeling well.', focus: '"don\'t have to" — clear contrast with "mustn\'t"' },
          { type: 'minimal_pairs', word1: 'can', word2: 'can\'t', target: 'word2', focus: '/kæn/ vs /kɑːnt/ — vowel length distinguishes affirmative from negative' },
          { type: 'sentence_stress', text: 'He needn\'t have worried — everything went perfectly.', stressed_word: 'needn\'t', focus: '"needn\'t have" — modal receives contrastive stress' },
        ],
      },
      {
        title: 'Vocabulary chunks — idioms Set 2',
        grammar: [
          { type: 'multiple_choice', sentence: 'After years of rivalry, they finally _____ the hatchet.', answer: 'buried', options: ['buried', 'hid', 'threw'], explanation: '"Bury the hatchet" = to make peace after a conflict.' },
          { type: 'multiple_choice', sentence: 'The new CEO hit the _____ running on her first day.', answer: 'ground', options: ['ground', 'floor', 'base'], explanation: '"Hit the ground running" = to start quickly with energy and enthusiasm.' },
          { type: 'word_bank', sentence: 'Don\'t _____ the boat — we\'re finally making progress.', answer: 'rock', choices: ['rock', 'sink', 'tip', 'flip'], explanation: '"Rock the boat" = to upset a stable situation or cause trouble.' },
          { type: 'word_bank', sentence: 'She was on _____ nine when she got the promotion.', answer: 'cloud', choices: ['cloud', 'air', 'top', 'sky'], explanation: '"On cloud nine" = extremely happy.' },
          { type: 'fill_gap', sentence: 'He always goes the extra _____ for his clients.', answer: 'mile', hint: '"Go the extra _____" = do more than expected', explanation: '"Go the extra mile" = to put in extra effort beyond what is required.' },
          { type: 'fill_gap', sentence: 'I\'m in two _____ about accepting the new job offer.', answer: 'minds', hint: 'In two _____ = undecided', explanation: '"In two minds" = undecided, unsure which option to choose.' },
          { type: 'fill_gap', sentence: 'She got the job against all _____ — no one expected it.', answer: 'odds', hint: 'Against all _____ = despite low probability', explanation: '"Against all odds" = despite the probability being against you.' },
          { type: 'fix_error', sentence: 'He\'s been burning the midnight oil candle to finish the project.', answer: 'He\'s been burning the midnight oil to finish the project.', hint: 'The idiom is "burning the midnight oil"', explanation: '"Burning the midnight oil" — no extra word "candle". It means working very late.' },
          { type: 'fix_error', sentence: 'Let\'s not jump into conclusions before we have all the facts.', answer: 'Let\'s not jump to conclusions before we have all the facts.', hint: '"Jump ___ conclusions" — correct preposition', explanation: '"Jump to conclusions" — the correct preposition is "to", not "into".' },
          { type: 'read_answer', passage: 'Fixed idioms must be learned as complete units. Changing even one word destroys the meaning. "Hit the ground running", "on cloud nine", "go the extra mile", "against all odds" and "in two minds" are all examples of idioms that appear frequently in both spoken and written English at B2 level. Learners who master them sound significantly more natural and fluent.', question: 'Why must idioms be learned as complete units?', answer: 'changing even one word destroys the meaning', explanation: 'The passage states "Changing even one word destroys the meaning".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'She was on cloud nine after receiving the award.', focus: '"cloud nine" — stress on "nine"' },
          { type: 'listen_write', text: 'He always goes the extra mile for his students.', focus: '"extra mile" — connected speech, natural rhythm' },
          { type: 'repeat', text: 'Against all odds, they managed to win the championship.', focus: '"against all odds" — contrastive stress' },
          { type: 'minimal_pairs', word1: 'mile', word2: 'mild', target: 'word1', focus: '/maɪl/ vs /maɪld/ — final consonant' },
          { type: 'sentence_stress', text: 'I\'m in two minds about taking on this new project.', stressed_word: 'minds', focus: '"minds" carries idiomatic stress in "in two minds"' },
        ],
      },
      {
        title: 'Academic & formal register',
        grammar: [
          { type: 'multiple_choice', sentence: 'The study _____ that further research is needed.', answer: 'suggests', options: ['suggests', 'says', 'tells'], explanation: '"Suggests" is the standard academic verb for reporting findings — more formal than "says".' },
          { type: 'multiple_choice', sentence: 'The data _____ a clear upward trend in sales.', answer: 'indicates', options: ['indicates', 'shows', 'points'], explanation: '"Indicates" is a more formal and precise verb than "shows" in academic writing.' },
          { type: 'word_bank', sentence: 'The committee has _____ to address the issue formally.', answer: 'undertaken', choices: ['undertaken', 'tried', 'decided', 'wanted'], explanation: '"Undertaken to" = formally committed to doing something — very formal register.' },
          { type: 'word_bank', sentence: 'This report _____ the key findings of the two-year study.', answer: 'outlines', choices: ['outlines', 'tells', 'talks about', 'says'], explanation: '"Outlines" is the formal academic verb for summarising or presenting key points.' },
          { type: 'fill_gap', sentence: 'The results _____ (demonstrate) a statistically significant improvement.', answer: 'demonstrate', hint: 'Formal verb for "show"', explanation: '"Demonstrate" is more precise and formal than "show" in academic contexts.' },
          { type: 'fill_gap', sentence: '_____ to the findings, the current approach is insufficient.', answer: 'According', hint: '"_____ to the findings"', explanation: '"According to the findings" — formal way to reference a source.' },
          { type: 'fill_gap', sentence: 'The government _____ (implement) a series of new regulations.', answer: 'has implemented', hint: 'Recent past action with present relevance — formal', explanation: '"Has implemented" — present perfect for recent actions in formal/journalistic writing.' },
          { type: 'fix_error', sentence: 'The research shows us that the method is not good.', answer: 'The research demonstrates that the method is ineffective.', hint: 'Replace informal vocabulary with formal alternatives', explanation: 'Academic writing uses "demonstrates" (not "shows us") and "ineffective" (not "not good").' },
          { type: 'fix_error', sentence: 'In conclusion, I think the policy is bad for the economy.', answer: 'In conclusion, the policy appears to have an adverse effect on the economy.', hint: 'Avoid "I think" in academic writing; use hedging and formal vocabulary', explanation: 'Academic writing avoids "I think" and uses hedging ("appears to") and formal vocabulary ("adverse effect").' },
          { type: 'read_answer', passage: 'Academic register is characterised by formal vocabulary, impersonal structures and hedging language. Writers avoid contractions, colloquialisms and personal opinions expressed directly. Passive constructions and nominalisations are preferred. Hedging expressions like "it appears that", "the data suggests" and "there is evidence to indicate" are used to express claims cautiously.', question: 'What hedging expressions are mentioned in the passage?', answer: '"it appears that", "the data suggests", "there is evidence to indicate"', explanation: 'The passage lists these three as hedging expressions used in academic writing.' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'The data suggests a significant correlation between the two variables.', focus: 'academic sentence rhythm and formal vocabulary' },
          { type: 'listen_write', text: 'According to the findings, the current approach is insufficient.', focus: '"According to" — sentence opener intonation' },
          { type: 'repeat', text: 'The committee has undertaken to review the existing framework.', focus: 'formal passive-like structure — measured pace' },
          { type: 'minimal_pairs', word1: 'evidence', word2: 'evident', target: 'word1', focus: '/ˈɛv.ɪ.dəns/ vs /ˈɛv.ɪ.dənt/ — suffix difference' },
          { type: 'sentence_stress', text: 'The results demonstrate a clear and consistent improvement.', stressed_word: 'demonstrate', focus: 'main verb in academic clause receives primary stress' },
        ],
      },
      {
        title: 'Cause & effect language',
        grammar: [
          { type: 'multiple_choice', sentence: 'The delay was _____ a miscommunication between teams.', answer: 'due to', options: ['due to', 'because', 'since'], explanation: '"Due to" + noun phrase expresses cause. "Because" requires a clause.' },
          { type: 'multiple_choice', sentence: '_____ the bad weather, the match was postponed.', answer: 'As a result of', options: ['As a result of', 'Therefore', 'Because'], explanation: '"As a result of" + noun phrase. "Therefore" starts a new clause.' },
          { type: 'word_bank', sentence: 'The project was completed on time; _____, the client was satisfied.', answer: 'consequently', choices: ['consequently', 'because', 'due to', 'although'], explanation: '"Consequently" = as a result — links two clauses to show effect.' },
          { type: 'word_bank', sentence: 'She missed the meeting _____ to a family emergency.', answer: 'owing', choices: ['owing', 'because', 'due', 'since'], explanation: '"Owing to" = because of — followed by a noun phrase.' },
          { type: 'fill_gap', sentence: 'The fire _____ (cause) significant damage to the building.', answer: 'caused', hint: 'Simple past active causal verb', explanation: '"Caused" — direct causal verb in simple past.' },
          { type: 'fill_gap', sentence: 'Higher temperatures _____ (lead) to an increase in wildfires.', answer: 'lead', hint: 'Present causal relationship', explanation: '"Lead to" is a common causal verb/expression in academic and formal writing.' },
          { type: 'fill_gap', sentence: 'The economic crisis _____ (result) in widespread unemployment.', answer: 'resulted', hint: '"Result in" = cause an effect', explanation: '"Resulted in" — "result in" is followed by the effect, not the cause.' },
          { type: 'fix_error', sentence: 'Because of she was late, the meeting started without her.', answer: 'Because she was late, the meeting started without her.', hint: '"Because of" + noun; "because" + clause', explanation: '"Because of" requires a noun phrase. "Because" requires a clause: "Because she was late…"' },
          { type: 'fix_error', sentence: 'The accident was resulted in three injuries.', answer: 'The accident resulted in three injuries.', hint: '"Result in" is not a passive construction', explanation: '"Result in" is an active verb phrase. It cannot be used in passive: "The accident resulted in…"' },
          { type: 'read_answer', passage: 'Cause and effect language is essential for academic and analytical writing. Causal prepositions include "due to", "owing to", "as a result of" and "because of" — all followed by noun phrases. Causal conjunctions "because", "since" and "as" introduce clauses. Connectives like "therefore", "consequently" and "hence" link sentences to show effect. Verbs such as "cause", "lead to", "result in" and "trigger" are also key.', question: 'Which causal connectives are used to link sentences and show effect?', answer: 'therefore, consequently, hence', explanation: 'The passage lists "therefore", "consequently" and "hence" as connectives that show effect.' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'The delay was due to a miscommunication between departments.', focus: '"due to" — natural stress in causal phrase' },
          { type: 'listen_write', text: 'As a result of the strike, all flights were cancelled.', focus: '"As a result of" — falling intonation' },
          { type: 'repeat', text: 'Rising costs led to a significant drop in consumer spending.', focus: '"led to" — causal verb in connected speech' },
          { type: 'minimal_pairs', word1: 'cause', word2: 'course', target: 'word1', focus: '/kɔːz/ vs /kɔːs/ — final consonant' },
          { type: 'sentence_stress', text: 'Consequently, the entire project had to be rescheduled.', stressed_word: 'Consequently', focus: 'connective adverb at start — receives strong stress' },
        ],
      },
      {
        title: 'Intermediate Module Review — B1/B2 consolidation',
        grammar: [
          { type: 'multiple_choice', sentence: 'She _____ (study) English for five years and she\'s very fluent now.', answer: 'has been studying', options: ['has been studying', 'has studied', 'is studying'], explanation: '"Has been studying" — present perfect continuous for an ongoing action with a visible present result.' },
          { type: 'multiple_choice', sentence: 'If they _____ (invest) more, the company would be thriving today.', answer: 'had invested', options: ['had invested', 'would invest', 'invested'], explanation: 'Mixed conditional: third conditional "if-clause" with second conditional result — "had invested".' },
          { type: 'word_bank', sentence: 'Not only _____ she speak French, but she also reads classical Latin.', answer: 'does', choices: ['does', 'is', 'has', 'do'], explanation: '"Not only does she speak" — inversion after fronted "not only".' },
          { type: 'word_bank', sentence: 'It _____ been reported that the company will merge with a competitor.', answer: 'has', choices: ['has', 'is', 'was', 'had'], explanation: '"It has been reported" — present perfect passive impersonal structure.' },
          { type: 'fill_gap', sentence: 'The results _____ (publish) before the end of the month.', answer: 'will be published', hint: 'Future passive', explanation: '"Will be published" — future simple passive.' },
          { type: 'fill_gap', sentence: 'Despite _____ (work) hard, he didn\'t get promoted.', answer: 'working', hint: '"Despite" + gerund', explanation: '"Despite working hard" — "despite" requires a gerund, not a clause.' },
          { type: 'fill_gap', sentence: 'She asked me _____ I had received the email.', answer: 'whether', hint: 'Report a yes/no question', explanation: '"Whether" (or "if") introduces a reported yes/no question.' },
          { type: 'fix_error', sentence: 'The data suggests that further researches are needed.', answer: 'The data suggests that further research is needed.', hint: '"Research" is uncountable', explanation: '"Research" is an uncountable noun — never "researches". "Further research is needed."' },
          { type: 'fix_error', sentence: 'Although the difficulties, she completed the course.', answer: 'Despite the difficulties, she completed the course.', hint: '"Although" needs a clause; "despite" takes a noun phrase', explanation: '"Despite the difficulties" — before a noun phrase, use "despite", not "although".' },
          { type: 'read_answer', passage: 'This module has covered the key B1/B2 grammar structures: passive voice across all tenses, conditionals and their formal inversions, reported speech with backshift, modal verbs for deduction and criticism, present perfect distinctions, concession clauses, emphasis structures, idioms and collocations, and academic register. Regular review of these ensures that intermediate learners build the accuracy and fluency needed to reach B2.', question: 'What is the purpose of reviewing these structures at B2 level?', answer: 'to build accuracy and fluency', explanation: 'The passage says "regular review ensures that learners build the accuracy and fluency needed to reach B2".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'Despite working long hours, she never complained once.', focus: 'concession structure — natural rhythm' },
          { type: 'listen_write', text: 'Not only did he pass, but he got the highest score in the class.', focus: 'inversion + contrast — emphatic delivery' },
          { type: 'repeat', text: 'The report will be published before the end of this quarter.', focus: 'future passive — formal sentence rhythm' },
          { type: 'repeat', text: 'She has been studying English for years, and her progress has been remarkable.', focus: 'sustained fluency across a complex sentence' },
          { type: 'sentence_stress', text: 'It has been reported that the company will undergo major changes.', stressed_word: 'reported', focus: 'impersonal passive — reporting verb receives nuclear stress' },
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ADVANCED — C1 / C2  (40 units across 4 modules)
// Grammar: 5 per topic | Pronunciation: 10 per topic
// ─────────────────────────────────────────────────────────────────────────────

const ADVANCED_MODULES: Module[] = [
  // ── Module 1 — Estruturas Formais & Complexas C1 ─────────────────────────
  {
    title: 'Formal & Complex Structures C1',
    topics: [
      {
        title: 'Advanced inversion — negative adverbials',
        pronunciation: [
          { type: 'repeat',       text: 'Never have I seen such dedication.',                   focus: 'inversion stress pattern' },
          { type: 'listen_write', text: 'Seldom does she make an error.',                       focus: 'inversion with "seldom"' },
          { type: 'repeat',       text: 'Not only did he apologise, but he also offered to help.', focus: 'complex inversion rhythm' },
          { type: 'listen_write', text: 'Rarely have we encountered such a challenge.',         focus: '"Rarely" inversion' },
          { type: 'repeat',       text: 'Under no circumstances should you sign that document.', focus: 'formal inversion' },
          { type: 'listen_write', text: 'At no point was the data compromised.',                focus: 'inversion with "at no point"' },
          { type: 'repeat',       text: 'No sooner had she arrived than the meeting began.',    focus: '"No sooner...than" inversion' },
          { type: 'listen_write', text: 'Little did they know what was about to happen.',       focus: '"Little did" inversion' },
          { type: 'repeat',       text: 'Barely had he finished speaking when the questions started.', focus: '"Barely had" rhythm' },
          { type: 'listen_write', text: 'Only then did we realise the magnitude of the problem.', focus: '"Only then did" structure' },
          { type: 'repeat',      text: 'Never have I seen such remarkable dedication.',      focus: 'inversion stress pattern and rhythm' },
          { type: 'sentence_stress', text: 'I have never been to Japan before.', stressed_word: 'never', focus: 'negative adverbs carry strong stress' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'Never _____ seen such a remarkable performance.',      answer: 'have I',       options: ['have I', 'I have', 'I had'],               explanation: 'After "never" at the start of a sentence, invert subject and auxiliary: "Never have I seen…"' },
          { type: 'word_bank', sentence: 'Not only _____ he late, but he forgot his notes too.',       answer: 'was',          choices: ['was', 'is', 'were', 'did'],                explanation: 'After "Not only" with a past verb, invert: "Not only was he late…" (was comes before he).' },
          { type: 'fill_gap', sentence: 'Rarely _____ the committee agree so quickly.',                answer: 'does',         hint: 'Invert subject + auxiliary after "Rarely"',    explanation: 'Inversion after "Rarely": auxiliary (does) comes before the subject.' },
          { type: 'fix_error', sentence: 'Under no circumstances you should reveal this information.',  answer: 'Under no circumstances should you reveal this information.', hint: 'Inversion required after "under no circumstances"', explanation: '"Under no circumstances" at the start requires inversion: should comes before you.' },
          { type: 'read_answer', passage: 'Seldom does a film capture both critical and popular acclaim simultaneously. Never before had the studio faced such a difficult decision. Rarely have audiences been so divided in their opinions.', question: 'What grammatical structure is used consistently in this passage?', answer: 'inversion', explanation: 'All three sentences use inversion after negative adverbials (seldom, never before, rarely).' },
        ],
      },
      {
        title: 'Advanced conditionals — inversion + implied',
        pronunciation: [
          { type: 'repeat',       text: 'Had I known earlier, I would have acted differently.',    focus: 'inverted third conditional' },
          { type: 'listen_write', text: 'Were she to resign, the company would face a crisis.',    focus: '"Were...to" formal conditional' },
          { type: 'repeat',       text: 'Should you require assistance, do not hesitate to call.', focus: 'formal "should" conditional' },
          { type: 'listen_write', text: 'Had it not been for your help, we would have failed.',    focus: '"Had it not been for"' },
          { type: 'repeat',       text: 'But for his intervention, the situation could have worsened.', focus: '"But for" + conditional' },
          { type: 'listen_write', text: 'Were I in your position, I would do the same.',           focus: '"Were I" formal inversion' },
          { type: 'repeat',       text: 'Had they invested earlier, they would now be wealthy.',   focus: 'mixed conditional with inversion' },
          { type: 'listen_write', text: 'Should the need arise, please contact me immediately.',   focus: 'formal "should" opening' },
          { type: 'repeat',       text: 'Without your guidance, I would never have succeeded.',    focus: '"Without" implied conditional' },
          { type: 'listen_write', text: 'Had she not persisted, the project would have collapsed.', focus: 'inverted negative third conditional' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: '_____ I known the truth, I would have told you.',       answer: 'Had',          options: ['Had', 'Have', 'If'],                       explanation: '"Had I known…" is the inverted third conditional — "had" replaces "if I had".' },
          { type: 'word_bank', sentence: '_____ she to accept the offer, it would change everything.',  answer: 'Were',         choices: ['Were', 'Was', 'Should', 'Had'],             explanation: '"Were she to accept…" is a formal inverted second conditional using "were".' },
          { type: 'fill_gap', sentence: '_____ you have any questions, feel free to contact us.',       answer: 'Should',       hint: 'Formal inversion for polite conditional',     explanation: '"Should you have any questions" = "If you have any questions" — formal inverted first conditional.' },
          { type: 'fix_error', sentence: 'Had she not would resign, we could have kept her.',           answer: 'Had she not resigned, we could have kept her.', hint: 'Inverted third conditional structure', explanation: 'Inverted third conditional: "Had + subject + past participle" — no "would" in the if-clause.' },
          { type: 'read_answer', passage: '"Were the board to reject this proposal, we would need to seek alternative funding," stated the CFO. "Had we prepared better projections, the outcome might have been different." The team noted the use of formal inverted conditionals throughout the report.', question: 'What does the CFO suggest would happen if the board rejects the proposal?', answer: 'seek alternative funding', explanation: 'The CFO says "we would need to seek alternative funding".' },
        ],
      },
      {
        title: 'Advanced modals — full nuance',
        pronunciation: [
          { type: 'repeat',       text: 'She must have been exhausted after the journey.',         focus: 'deduction: "must have been"' },
          { type: 'listen_write', text: 'He can\'t have forgotten — he wrote it down himself.',    focus: 'negative deduction: "can\'t have"' },
          { type: 'repeat',       text: 'They might well have left by the time we arrive.',        focus: '"might well have" nuance' },
          { type: 'listen_write', text: 'You needn\'t have worried — everything went perfectly.',  focus: 'past criticism: "needn\'t have"' },
          { type: 'repeat',       text: 'The report should have been submitted last Friday.',      focus: 'past obligation not fulfilled' },
          { type: 'listen_write', text: 'I could have been a professional musician.',             focus: 'unrealised past ability' },
          { type: 'repeat',       text: 'You ought to have checked the details more carefully.',  focus: '"ought to have" past criticism' },
          { type: 'listen_write', text: 'It may well be that the delay was intentional.',         focus: '"may well be" hedging' },
          { type: 'repeat',       text: 'She would have known — she was there at the time.',      focus: '"would have known" deduction' },
          { type: 'listen_write', text: 'He need not have taken such drastic measures.',          focus: 'formal "need not have"' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'The lights are off. They _____ gone home.',              answer: 'must have',    options: ['must have', 'should have', 'might have'],  explanation: '"Must have gone" expresses a logical deduction based on evidence (lights off = they left).' },
          { type: 'word_bank', sentence: 'You _____ worried so much — it all worked out fine.',          answer: 'needn\'t have', choices: ["needn't have", "shouldn't have", "mustn't have", "couldn't have"], explanation: '"Needn\'t have + past participle" = you did something unnecessarily.' },
          { type: 'fill_gap', sentence: 'She _____ (ought) told us about the change in plans.',          answer: 'ought to have told', hint: '"Ought to have" = criticism of past action', explanation: '"Ought to have told us" criticises a past omission — something she should have done.' },
          { type: 'fix_error', sentence: 'He must have forget his keys — they\'re still on the table.',  answer: 'He must have forgotten his keys — they\'re still on the table.', hint: 'Past participle after "must have"', explanation: '"Must have" requires the past participle: "must have forgotten".' },
          { type: 'read_answer', passage: 'The investigation report concluded that the error could have been avoided. The team should have double-checked the data. They might have been under pressure, but that needn\'t have compromised the result. They ought to have followed protocol more carefully.', question: 'What does the report say the team should have done?', answer: 'double-checked the data', explanation: 'The report says "the team should have double-checked the data".' },
        ],
      },
      {
        title: 'Nominalisation',
        pronunciation: [
          { type: 'repeat',       text: 'The sudden collapse of the negotiations surprised everyone.', focus: 'noun phrase + formal register' },
          { type: 'listen_write', text: 'Her refusal to comment added to the speculation.',           focus: 'nominalisation + connected speech' },
          { type: 'repeat',       text: 'The implementation of the new policy took several months.',  focus: 'formal noun phrase rhythm' },
          { type: 'listen_write', text: 'There was a significant deterioration in relations.',        focus: 'academic vocabulary' },
          { type: 'repeat',       text: 'The achievement of these goals requires sustained effort.',  focus: 'formal structure' },
          { type: 'listen_write', text: 'An investigation into the failure was launched immediately.', focus: 'formal passive-like structure' },
          { type: 'repeat',       text: 'The introduction of stricter regulations is expected.',      focus: 'academic register' },
          { type: 'listen_write', text: 'His insistence on accuracy led to the discovery.',          focus: 'nominalisations in sequence' },
          { type: 'repeat',       text: 'There was a marked improvement in performance.',            focus: 'collocations with nominalisations' },
          { type: 'listen_write', text: 'The continuation of this trend remains uncertain.',         focus: 'abstract noun + formal verb' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'We need to discuss the _____ of a new strategy. (implement)', answer: 'implementation', options: ['implementation', 'implementing', 'implemented'], explanation: '"Implementation" is the nominalised form of "implement" — a noun derived from a verb.' },
          { type: 'word_bank', sentence: 'The _____ of the project took the whole team by surprise.',  answer: 'failure',       choices: ['failure', 'failing', 'failed', 'fail'],    explanation: '"Failure" (noun) is the nominalised form of "fail". Formal writing prefers noun phrases.' },
          { type: 'fill_gap', sentence: 'There was a dramatic _____ (increase) in costs last year.',   answer: 'increase',     hint: 'Use the noun form, not the verb',              explanation: '"Increase" works as a noun here: "a dramatic increase in costs".' },
          { type: 'fix_error', sentence: 'The fail of the system caused major disruption.',            answer: 'The failure of the system caused major disruption.', hint: '"Fail" is a verb; use the noun form', explanation: '"Fail" is a verb. The noun form is "failure": "the failure of the system".' },
          { type: 'read_answer', passage: 'Academic and formal writing often prefers nominalisations over verbs. Instead of "the scientists discovered", formal writing uses "the discovery by the scientists". This creates a more impersonal and authoritative tone. The development, implementation, and evaluation of ideas are all examples of this style.', question: 'What effect does nominalisation create in formal writing?', answer: 'impersonal and authoritative tone', explanation: 'The passage says nominalisation "creates a more impersonal and authoritative tone".' },
        ],
      },
      {
        title: 'Cleft sentences — advanced use',
        pronunciation: [
          { type: 'repeat',       text: 'It was the unexpected twist that made the film so memorable.', focus: '"It was...that" stress' },
          { type: 'listen_write', text: 'What I find most challenging is public speaking.',            focus: '"What I..." cleft structure' },
          { type: 'repeat',       text: 'It is the quality of the work that matters, not the speed.', focus: 'contrastive cleft' },
          { type: 'listen_write', text: 'What he really needs is more time to prepare.',              focus: '"What he needs is" rhythm' },
          { type: 'repeat',       text: 'It was only then that she realised the mistake.',            focus: '"It was only then that"' },
          { type: 'listen_write', text: 'What surprised me most was her confidence.',                 focus: '"What...was" cleft' },
          { type: 'repeat',       text: 'It was John who first raised the issue in the meeting.',     focus: 'identifying cleft' },
          { type: 'listen_write', text: 'The thing that concerns me is the lack of transparency.',    focus: '"The thing that" structure' },
          { type: 'repeat',       text: 'What the data shows is a clear upward trend.',              focus: 'academic cleft sentence' },
          { type: 'listen_write', text: 'It was her perseverance that ultimately led to success.',    focus: 'emphatic cleft' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'It _____ the timing that caused the problem.',          answer: 'was',          options: ['was', 'is', 'were'],                       explanation: '"It was...that" is the standard cleft sentence structure to emphasise a noun phrase.' },
          { type: 'word_bank', sentence: '_____ I need is a clear answer.',                             answer: 'What',         choices: ['What', 'That', 'Which', 'Who'],             explanation: '"What I need is…" — "what"-cleft sentences emphasise the subject or object.' },
          { type: 'fill_gap', sentence: 'It _____ Sarah who found the error in the report.',            answer: 'was',          hint: '"It was + noun/pronoun + who/that"',           explanation: '"It was Sarah who found…" uses a cleft sentence to identify and emphasise Sarah.' },
          { type: 'fix_error', sentence: 'What I need it is more support from my team.',               answer: 'What I need is more support from my team.',     hint: 'No "it" in a what-cleft', explanation: '"What I need is…" — there is no extra "it" in a what-cleft sentence.' },
          { type: 'read_answer', passage: 'What makes English grammar particularly complex is not the vocabulary but the subtle differences in meaning between similar structures. It is the context that determines which form is correct. What learners often overlook is the importance of register.', question: 'According to the passage, what do learners often overlook?', answer: 'the importance of register', explanation: 'The passage says "What learners often overlook is the importance of register".' },
        ],
      },
      {
        title: 'Advanced passive — complex structures C1',
        pronunciation: [
          { type: 'repeat',       text: 'The decision is believed to have been made in secret.',       focus: 'passive infinitive perfect' },
          { type: 'listen_write', text: 'It is reported that negotiations are ongoing.',               focus: '"It is reported that" structure' },
          { type: 'repeat',       text: 'The contract is said to have been signed last week.',         focus: '"said to have been" passive' },
          { type: 'listen_write', text: 'She was thought to be the most qualified candidate.',         focus: 'personal passive construction' },
          { type: 'repeat',       text: 'The findings are expected to be released shortly.',           focus: 'passive with infinitive' },
          { type: 'listen_write', text: 'It has been alleged that the funds were misused.',            focus: '"It has been alleged" structure' },
          { type: 'repeat',       text: 'The proposal is understood to have significant support.',     focus: 'formal passive' },
          { type: 'listen_write', text: 'He was known to be extremely precise in his work.',          focus: 'personal passive with infinitive' },
          { type: 'repeat',       text: 'The results are known to vary depending on conditions.',     focus: 'passive + infinitive' },
          { type: 'listen_write', text: 'It is widely believed that the economy will recover.',       focus: 'formal impersonal passive' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'It _____ that the CEO plans to resign.',               answer: 'is rumoured',  options: ['is rumoured', 'rumours', 'was rumoured to'], explanation: '"It is rumoured that…" is an impersonal passive reporting structure.' },
          { type: 'word_bank', sentence: 'The suspect _____ to have left the country.',                answer: 'is believed',  choices: ['is believed', 'believes', 'believed', 'is believing'], explanation: '"Is believed to have" — personal passive with a perfect infinitive to show prior action.' },
          { type: 'fill_gap', sentence: 'The new policy _____ (expect) to come into effect next month.', answer: 'is expected', hint: 'Passive + infinitive structure',             explanation: '"Is expected to" — passive construction showing external expectation.' },
          { type: 'fix_error', sentence: 'It is reported the minister resigned yesterday.',            answer: 'It is reported that the minister resigned yesterday.', hint: '"It is reported" needs "that"', explanation: 'The impersonal passive "It is reported" must be followed by "that".' },
          { type: 'read_answer', passage: 'The company is alleged to have violated environmental regulations. It is believed that the violations occurred over several years. The management is said to have been aware of the problem. It has been reported that a full investigation will be launched.', question: 'Over what period are the violations believed to have occurred?', answer: 'several years', explanation: 'The passage states "the violations occurred over several years".' },
        ],
      },
      {
        title: 'Subjunctive — formal grammar',
        pronunciation: [
          { type: 'repeat',       text: 'It is essential that every member be present.',              focus: 'formal subjunctive "be"' },
          { type: 'listen_write', text: 'The committee recommends that he submit his report early.',   focus: 'subjunctive after "recommend"' },
          { type: 'repeat',       text: 'It was vital that the decision remain confidential.',         focus: 'past subjunctive form' },
          { type: 'listen_write', text: 'We suggest that she take a different approach.',              focus: 'subjunctive after "suggest"' },
          { type: 'repeat',       text: 'It is imperative that this procedure be followed exactly.',  focus: 'formal imperative subjunctive' },
          { type: 'listen_write', text: 'The rules require that each candidate sign a declaration.',   focus: 'subjunctive after "require"' },
          { type: 'repeat',       text: 'It is important that she be informed of the changes.',       focus: 'present subjunctive "be"' },
          { type: 'listen_write', text: 'I insist that he attend the meeting in person.',              focus: '"insist that" + base form' },
          { type: 'repeat',       text: 'It is crucial that the findings remain unpublished for now.', focus: 'subjunctive in formal context' },
          { type: 'listen_write', text: 'The doctor advised that the patient rest for a week.',        focus: 'subjunctive after "advise"' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'It is essential that every delegate _____ the session.',  answer: 'attend',      options: ['attend', 'attends', 'attended'],           explanation: 'The formal subjunctive uses the base form of the verb (attend, not attends) after expressions like "it is essential that".' },
          { type: 'word_bank', sentence: 'The policy requires that all staff _____ a security badge.',    answer: 'wear',        choices: ['wear', 'wears', 'wearing', 'wore'],        explanation: 'After "require that", use the base form (subjunctive): "wear", not "wears".' },
          { type: 'fill_gap', sentence: 'I recommend that he _____ (be) more careful with his words.',   answer: 'be',          hint: 'Formal subjunctive: base form of "to be"',    explanation: 'The subjunctive form of "to be" is "be" (not "is" or "was"): "I recommend that he be…"' },
          { type: 'fix_error', sentence: 'It is vital that she attends the conference.',                  answer: 'It is vital that she attend the conference.',   hint: 'Subjunctive = base form', explanation: 'After "it is vital that", the subjunctive uses the base form: "attend" (not "attends").' },
          { type: 'read_answer', passage: 'In formal English, the subjunctive mood is still used after certain verbs and expressions. We say "It is important that he be on time" and "The rules require that she submit the form." The base form is used regardless of the subject. This contrasts with informal English, which often uses "is" or "submits" instead.', question: 'What form of the verb is used in the formal subjunctive?', answer: 'base form', explanation: 'The passage says "the base form is used regardless of the subject".' },
        ],
      },
      {
        title: 'Ellipsis & substitution',
        pronunciation: [
          { type: 'repeat',       text: 'A: Are you coming? B: I hope so.',                           focus: 'substitution with "so"' },
          { type: 'listen_write', text: 'She said she\'d finish it, and she did.',                    focus: 'ellipsis + auxiliary' },
          { type: 'repeat',       text: 'I\'d love to, but I really can\'t.',                         focus: 'ellipsis of main verb' },
          { type: 'listen_write', text: 'Neither have I. Neither do I.',                              focus: '"neither" as substitution' },
          { type: 'repeat',       text: 'A: Did you like it? B: I thought so.',                       focus: '"thought so" substitution' },
          { type: 'listen_write', text: 'He was asked to leave and he did so immediately.',           focus: '"do so" formal substitution' },
          { type: 'repeat',       text: 'A: Is she qualified? B: I believe so.',                     focus: '"believe so" response' },
          { type: 'listen_write', text: 'I\'d rather not, if that\'s alright with you.',              focus: 'ellipsis of main verb + clause' },
          { type: 'repeat',       text: 'Some students passed; others didn\'t.',                     focus: 'ellipsis in contrast' },
          { type: 'listen_write', text: 'She could have told us, but chose not to.',                 focus: 'infinitive ellipsis' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'A: Will it rain tomorrow? B: I think ___.',            answer: 'so',           options: ['so', 'it', 'that'],                        explanation: '"I think so" uses "so" to substitute for the whole clause "it will rain tomorrow".' },
          { type: 'word_bank', sentence: 'He finished the report, and _____ did she.',                 answer: 'so',           choices: ['so', 'neither', 'nor', 'too'],             explanation: '"So did she" = she also finished. "So + auxiliary + subject" for positive agreement.' },
          { type: 'fill_gap', sentence: 'A: Are you going to apply? B: I\'d love _____, but I\'m not sure I\'m qualified.', answer: 'to', hint: 'Infinitive ellipsis: "I\'d love to"', explanation: '"I\'d love to" — the main verb "apply" is omitted, leaving just the "to" (infinitive ellipsis).' },
          { type: 'fix_error', sentence: 'A: Has she called back? B: I don\'t believe it.',           answer: 'A: Has she called back? B: I don\'t believe so.', hint: '"So" substitutes for the clause', explanation: '"I don\'t believe so" = "I don\'t believe she has called back". Use "so" for clause substitution.' },
          { type: 'read_answer', passage: 'Ellipsis removes words that are understood from context. "Some attended the meeting; others didn\'t" omits "attend the meeting". Substitution replaces words with "so", "do so", "one", etc. "I hope so" substitutes for a full clause. Both devices make language more fluent and natural.', question: 'What word is omitted in "Some attended the meeting; others didn\'t"?', answer: 'attend the meeting', explanation: 'The passage explains that "attend the meeting" is omitted after "didn\'t".' },
        ],
      },
      {
        title: 'Discourse coherence — cohesion & textual reference',
        pronunciation: [
          { type: 'repeat',       text: 'Furthermore, the results suggest a positive trend.',          focus: 'discourse marker stress' },
          { type: 'listen_write', text: 'Nevertheless, the challenges remain significant.',           focus: '"Nevertheless" formal contrast' },
          { type: 'repeat',       text: 'The former refers to speed; the latter to accuracy.',         focus: '"former/latter" rhythm' },
          { type: 'listen_write', text: 'This, in turn, led to a series of complications.',           focus: '"in turn" discourse phrase' },
          { type: 'repeat',       text: 'Notwithstanding these concerns, progress has been made.',    focus: 'formal concession' },
          { type: 'listen_write', text: 'In this regard, the committee has taken several steps.',     focus: '"In this regard" formal connector' },
          { type: 'repeat',       text: 'The aforementioned factors contributed to the outcome.',     focus: 'formal reference word' },
          { type: 'listen_write', text: 'Consequently, a new approach was adopted.',                  focus: '"Consequently" cause-effect' },
          { type: 'repeat',       text: 'With this in mind, we propose the following measures.',      focus: 'discourse phrase + intonation' },
          { type: 'listen_write', text: 'To this end, additional resources have been allocated.',     focus: '"To this end" formal purpose' },
        ],
        grammar: [
          { type: 'multiple_choice', sentence: 'The report identified two risks. _____, neither had been previously documented.', answer: 'Furthermore',   options: ['Furthermore', 'However', 'Therefore'],    explanation: '"Furthermore" adds information that reinforces or extends the previous point.' },
          { type: 'word_bank', sentence: 'The plan failed. _____, the team remained optimistic.',      answer: 'Nevertheless', choices: ['Nevertheless', 'Furthermore', 'Therefore', 'Similarly'], explanation: '"Nevertheless" introduces a contrast — despite the failure, something positive followed.' },
          { type: 'fill_gap', sentence: 'Speed and accuracy are both important. The _____ can be improved with practice; the _____ requires experience.', answer: 'former / latter', hint: 'First item = former; second = latter', explanation: '"Former" refers to the first item mentioned (speed); "latter" to the second (accuracy).' },
          { type: 'fix_error', sentence: 'The results were positive. In this regard, the team was disappointed.',  answer: 'The results were positive. Nevertheless, the team was disappointed.', hint: 'Wrong discourse connector — contrast needed', explanation: '"In this regard" is used to refer back to a topic, not to introduce contrast. Use "Nevertheless".' },
          { type: 'read_answer', passage: 'Coherent writing uses reference and discourse markers to connect ideas. Pronouns like "this" and "it" refer back to earlier content. Connectors like "furthermore" and "however" signal the relationship between ideas. Without these devices, text becomes fragmented and difficult to follow.', question: 'What happens to text without coherence devices?', answer: 'fragmented and difficult to follow', explanation: 'The passage says "text becomes fragmented and difficult to follow".' },
        ],
      },
    ],
  },

  // ── Module 2 — Vocabulário & Registro C1 ─────────────────────────────────
  {
    title: 'Vocabulary & Register C1',
    topics: [
      {
        title: 'Phrasal verbs Set 3 + collocations C1',
        grammar: [
          { type: 'multiple_choice', sentence: 'She decided to _____ the offer and accepted a different position.', answer: 'turn down', options: ['turn down', 'turn off', 'turn out'], explanation: '"Turn down" = to refuse or reject an offer.' },
          { type: 'word_bank', sentence: 'The meeting was _____ until next week due to the CEO\'s absence.', answer: 'put off', choices: ['put off', 'put out', 'put on', 'put forward'], explanation: '"Put off" = to postpone or delay something.' },
          { type: 'fill_gap', sentence: 'It took him a while to _____ the shock of losing his job.', answer: 'get over', hint: '"_____ the shock" = recover from it', explanation: '"Get over" = to recover from something difficult or upsetting.' },
          { type: 'fix_error', sentence: 'We need to come up a solution before the deadline.', answer: 'We need to come up with a solution before the deadline.', hint: '"Come up with" — preposition required', explanation: '"Come up with" (not "come up") means to think of or produce an idea or solution.' },
          { type: 'read_answer', passage: 'C1 collocations include patterns like "make a concerted effort", "draw a distinction", "reach a consensus", "bear in mind", "take into account", and "come to terms with". These fixed phrases occur frequently in academic writing, business communication and formal speech. Learners at C1 are expected to use them accurately and naturally, rather than relying on simple verb-noun combinations.', question: 'Which collocation means "to accept a difficult situation"?', answer: 'come to terms with', explanation: '"Come to terms with" means to accept or begin to deal with a difficult situation.' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'She turned down the offer without hesitation.', focus: '"turned down" — particle receives light stress' },
          { type: 'listen_write', text: 'We need to come up with a long-term solution to this problem.', focus: '"come up with" — three-part phrasal verb rhythm' },
          { type: 'repeat', text: 'It took him months to get over the disappointment.', focus: '"get over" — connected speech' },
          { type: 'listen_write', text: 'The launch was put off until further notice.', focus: '"put off" — passive phrasal verb' },
          { type: 'repeat', text: 'We should take into account all the stakeholders\' concerns.', focus: '"take into account" — formal collocation rhythm' },
          { type: 'listen_write', text: 'They finally came to terms with the outcome of the negotiation.', focus: '"come to terms with" — multi-word collocation' },
          { type: 'repeat', text: 'She made a concerted effort to improve her public speaking.', focus: '"concerted effort" — adjective-noun collocation stress' },
          { type: 'listen_write', text: 'We must bear in mind the constraints of the budget.', focus: '"bear in mind" — formal idiomatic stress' },
          { type: 'repeat', text: 'The committee decided to put off the vote and come up with a more comprehensive proposal.', focus: 'complex sentence — multiple phrasal verbs in connected speech' },
          { type: 'sentence_stress', text: 'You need to take into account the long-term consequences.', stressed_word: 'long-term', focus: 'modifier before key noun receives strong stress' },
        ],
      },
      {
        title: 'Idioms & fixed expressions Set 3',
        grammar: [
          { type: 'multiple_choice', sentence: 'The new assistant is a fast learner — she\'s really taken to the _____ quickly.', answer: 'ropes', options: ['ropes', 'wheel', 'ground'], explanation: '"Learn the ropes" = to learn how to do a job or activity.' },
          { type: 'word_bank', sentence: 'His explanation was so long-winded — he really beat _____ the bush.', answer: 'around', choices: ['around', 'about', 'above', 'across'], explanation: '"Beat around the bush" = to avoid getting to the main point.' },
          { type: 'fill_gap', sentence: 'The manager is very _____ the mark — she always knows exactly what to say.', answer: 'on', hint: '"On the mark" = accurate / exactly right', explanation: '"On the mark" = accurate and precise, saying or doing exactly the right thing.' },
          { type: 'fix_error', sentence: 'She bit off more that she could chew by taking on three projects at once.', answer: 'She bit off more than she could chew by taking on three projects at once.', hint: '"bite off more than you can chew"', explanation: '"Bite off more than you can chew" = to take on more than you can handle. Correct: "than".' },
          { type: 'read_answer', passage: 'Fixed expressions are a hallmark of advanced English fluency. "The tip of the iceberg", "a blessing in disguise", "once in a blue moon", "the devil is in the details" and "bite off more than you can chew" are idioms that native speakers use regularly. Understanding and using them appropriately — including knowing their connotation and register — marks C1 competence.', question: 'What does "a blessing in disguise" mean?', answer: 'something that seems bad at first but turns out to be good', explanation: '"A blessing in disguise" = something that appears negative but has a positive outcome.' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'She finally learned the ropes after her third week on the job.', focus: '"learned the ropes" — idiom in connected speech' },
          { type: 'listen_write', text: 'Don\'t beat around the bush — just tell me what you really think.', focus: '"beat around the bush" — multi-word idiom rhythm' },
          { type: 'repeat', text: 'That was just the tip of the iceberg.', focus: '"tip of the iceberg" — stress on "tip" and "iceberg"' },
          { type: 'listen_write', text: 'He bit off more than he could chew by accepting all three projects.', focus: '"bit off more than he could chew" — complex idiom' },
          { type: 'repeat', text: 'Losing that job turned out to be a blessing in disguise.', focus: '"blessing in disguise" — contrastive stress' },
          { type: 'listen_write', text: 'Once in a blue moon, you get a chance like this — don\'t waste it.', focus: '"once in a blue moon" — idiom at sentence start' },
          { type: 'repeat', text: 'The devil is in the details, and this contract is no exception.', focus: '"the devil is in the details" — declarative idiom intonation' },
          { type: 'listen_write', text: 'She was right on the mark with her assessment of the situation.', focus: '"on the mark" — phrasal adjective use' },
          { type: 'repeat', text: 'What seemed like a setback turned out to be a blessing in disguise — now I can see the bigger picture.', focus: 'natural fluency across extended idiomatic speech' },
          { type: 'sentence_stress', text: 'We can\'t ignore the fact that this is just the tip of the iceberg.', stressed_word: 'tip', focus: '"tip" is the key noun in the idiom and receives focus' },
        ],
      },
      {
        title: 'Hedging & tentative language',
        grammar: [
          { type: 'multiple_choice', sentence: 'The results _____ suggest a link between diet and mood.', answer: 'would appear to', options: ['would appear to', 'definitely', 'clearly'], explanation: '"Would appear to" is a hedging phrase that makes the claim tentative and cautious.' },
          { type: 'word_bank', sentence: 'There _____ be a connection between the two events, though it remains unclear.', answer: 'may well', choices: ['may well', 'must', 'will', 'should'], explanation: '"May well be" = is quite possibly — hedging with modal + "well" for extra tentativeness.' },
          { type: 'fill_gap', sentence: 'It _____ (seem) that the policy has had some unintended consequences.', answer: 'seems', hint: '"It seems that" = tentative observation', explanation: '"It seems that" — a classic hedging structure that avoids asserting something as a definite fact.' },
          { type: 'fix_error', sentence: 'The evidence clearly proves without doubt that the method works.', answer: 'The evidence suggests that the method may be effective.', hint: 'Academic writing uses cautious hedging', explanation: 'Strong claims like "clearly proves without doubt" are inappropriate in academic writing. Use "suggests" and "may be".' },
          { type: 'read_answer', passage: 'Hedging is the use of tentative language to avoid overstating claims. Common hedges include "it appears that", "there seems to be", "the data suggests", "might", "may well", "tends to", "is likely to" and "would appear to". Hedging is expected in academic writing, scientific reports and professional communication. It signals intellectual caution and awareness of limitations.', question: 'Why is hedging expected in academic writing?', answer: 'it signals intellectual caution and awareness of limitations', explanation: 'The passage states hedging "signals intellectual caution and awareness of limitations".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'There seems to be a connection between these two variables.', focus: '"seems to be" — tentative rising intonation' },
          { type: 'listen_write', text: 'The data would appear to support this hypothesis.', focus: '"would appear to" — formal hedging delivery' },
          { type: 'repeat', text: 'It may well be that the results are affected by external factors.', focus: '"may well be" — hedging with modal' },
          { type: 'listen_write', text: 'This tends to suggest a pattern rather than a definitive conclusion.', focus: '"tends to suggest" — moderate hedging rhythm' },
          { type: 'repeat', text: 'There is some evidence to indicate that the approach is promising.', focus: '"some evidence to indicate" — cautious academic phrasing' },
          { type: 'listen_write', text: 'The findings are likely to be influenced by sampling bias.', focus: '"likely to be" — passive hedging structure' },
          { type: 'repeat', text: 'It appears that further investigation is needed before drawing conclusions.', focus: '"It appears that" — sentence-opening hedge' },
          { type: 'listen_write', text: 'Preliminary results suggest the treatment might have a positive effect.', focus: '"suggest…might" — double hedge' },
          { type: 'repeat', text: 'The data seems to indicate a trend, though it would be premature to draw any firm conclusions at this stage.', focus: 'sustained hedging in extended academic discourse' },
          { type: 'sentence_stress', text: 'There seems to be a significant, though not conclusive, correlation.', stressed_word: 'seems', focus: '"seems" is the hedging verb — receives nuclear stress in cautious claims' },
        ],
      },
      {
        title: 'Cause & effect — advanced collocations',
        grammar: [
          { type: 'multiple_choice', sentence: 'The policy change _____ a dramatic increase in applications.', answer: 'gave rise to', options: ['gave rise to', 'resulted from', 'due to'], explanation: '"Gave rise to" = caused or led to something — advanced causal collocation.' },
          { type: 'word_bank', sentence: 'The accident _____ from a failure to follow safety protocols.', answer: 'stemmed', choices: ['stemmed', 'resulted', 'arose', 'derived'], explanation: '"Stemmed from" = originated from / was caused by.' },
          { type: 'fill_gap', sentence: 'The outbreak was _____ (attribute) to contaminated water supplies.', answer: 'attributed', hint: '"be attributed to" = caused by', explanation: '"Attributed to" — a formal causal structure meaning "caused by" or "linked to".' },
          { type: 'fix_error', sentence: 'The collapse of the bridge was resulted from poor maintenance.', answer: 'The collapse of the bridge resulted from poor maintenance.', hint: '"Result from" is active, not passive', explanation: '"Resulted from" is the active form. It cannot be used in passive: "was resulted from" is incorrect.' },
          { type: 'read_answer', passage: 'Advanced cause-and-effect collocations include: "give rise to", "stem from", "be attributed to", "be a consequence of", "pave the way for", "trigger", "underpin", "bring about" and "account for". These expressions carry more precision and formality than simple "cause" or "because of". Mastery of them is a strong marker of C1 competence in written English.', question: 'Name three advanced causal collocations mentioned in the passage.', answer: 'give rise to, stem from, be attributed to (or others listed)', explanation: 'The passage lists: "give rise to", "stem from", "be attributed to", "pave the way for", "trigger", "underpin", "bring about" and "account for".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'The new policy gave rise to a wave of protests across the country.', focus: '"gave rise to" — three-word collocation rhythm' },
          { type: 'listen_write', text: 'The crisis stemmed from a series of poor management decisions.', focus: '"stemmed from" — connected speech' },
          { type: 'repeat', text: 'The failure was attributed to a breakdown in communication.', focus: '"attributed to" — formal passive stress' },
          { type: 'listen_write', text: 'These changes have brought about a significant shift in public opinion.', focus: '"brought about" — phrasal verb collocation' },
          { type: 'repeat', text: 'The research findings paved the way for a new approach to treatment.', focus: '"paved the way for" — idiomatic causal phrase' },
          { type: 'listen_write', text: 'How do you account for the sharp rise in unemployment?', focus: '"account for" — question intonation' },
          { type: 'repeat', text: 'Globalisation has been a key factor underpinning these economic changes.', focus: '"underpinning" — participial phrase, formal' },
          { type: 'listen_write', text: 'The trigger for the conflict was a disputed election result.', focus: '"trigger for" — noun use of "trigger"' },
          { type: 'repeat', text: 'The economic downturn, which stemmed from poor regulation, gave rise to widespread inequality and paved the way for significant political change.', focus: 'complex sentence — multiple causal collocations in flow' },
          { type: 'sentence_stress', text: 'This phenomenon can largely be attributed to climate change.', stressed_word: 'attributed', focus: '"attributed" is the key causal verb — receives primary stress' },
        ],
      },
      {
        title: 'Lexical collocations C1 — Academic Word List',
        grammar: [
          { type: 'multiple_choice', sentence: 'The study sought to _____ the relationship between sleep and productivity.', answer: 'examine', options: ['examine', 'look', 'watch'], explanation: '"Examine" is the precise academic verb for studying a relationship — from the Academic Word List.' },
          { type: 'word_bank', sentence: 'The researchers _____ a series of controlled experiments over two years.', answer: 'conducted', choices: ['conducted', 'did', 'made', 'performed'], explanation: '"Conducted experiments" — the standard academic collocation. Not "did" or "made".' },
          { type: 'fill_gap', sentence: 'The report _____ (highlight) the key challenges facing the sector.', answer: 'highlights', hint: '"_____ challenges" — formal academic verb', explanation: '"Highlights" is the standard AWL verb for drawing attention to key points.' },
          { type: 'fix_error', sentence: 'The researchers made a conclusion that further testing was needed.', answer: 'The researchers reached a conclusion that further testing was needed.', hint: '"Reach a conclusion" — not "make"', explanation: '"Reach a conclusion" is the fixed collocation. "Draw a conclusion" also works. "Make" does not.' },
          { type: 'read_answer', passage: 'The Academic Word List (AWL) contains high-frequency words used in academic texts. Key AWL collocations include: "conduct research", "analyse data", "draw a conclusion", "examine evidence", "assess the impact", "identify trends", "highlight challenges" and "establish a framework". C1 learners should recognise and produce these collocations naturally in both reading and writing tasks.', question: 'What does the AWL contain?', answer: 'high-frequency words used in academic texts', explanation: 'The passage says "The Academic Word List contains high-frequency words used in academic texts".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'The study sought to examine the relationship between variables.', focus: '"sought to examine" — formal verb pair rhythm' },
          { type: 'listen_write', text: 'They conducted a series of experiments over a three-year period.', focus: '"conducted a series of" — AWL collocation in connected speech' },
          { type: 'repeat', text: 'We need to assess the impact of the new regulations carefully.', focus: '"assess the impact" — formal collocation stress' },
          { type: 'listen_write', text: 'The data enables us to draw a number of key conclusions.', focus: '"draw conclusions" — academic phrasing' },
          { type: 'repeat', text: 'Researchers have identified a significant trend in the data.', focus: '"identified a trend" — AWL verb + noun' },
          { type: 'listen_write', text: 'This framework will help us to analyse the findings more effectively.', focus: '"analyse the findings" — academic rhythm' },
          { type: 'repeat', text: 'The report highlights the need for a more integrated approach.', focus: '"highlights the need for" — formal recommendation structure' },
          { type: 'listen_write', text: 'These results contribute to a broader understanding of the phenomenon.', focus: '"contribute to a broader understanding" — extended AWL phrase' },
          { type: 'repeat', text: 'The study examined the extent to which the intervention influenced outcomes, conducting a comprehensive analysis of the data collected over two years.', focus: 'academic sentence — sustained formal register' },
          { type: 'sentence_stress', text: 'The evidence strongly suggests that intervention is urgently needed.', stressed_word: 'urgently', focus: 'adverb intensifier receives contrastive stress in academic claims' },
        ],
      },
      {
        title: 'Register variation — formal vs. informal vs. academic',
        grammar: [
          { type: 'multiple_choice', sentence: 'Which sentence uses the most formal register? A: "I want to say thanks for coming." B: "I wish to express my gratitude for your attendance." C: "Cheers for showing up!"', answer: 'B', options: ['A', 'B', 'C'], explanation: 'Option B uses formal vocabulary ("wish to express", "gratitude", "attendance") appropriate for formal writing or speeches.' },
          { type: 'word_bank', sentence: 'The chairperson _____ the committee to begin the formal proceedings.', answer: 'invited', choices: ['invited', 'told', 'asked', 'said'], explanation: '"Invited" is the most formal verb for this context — appropriate for committee/business language.' },
          { type: 'fill_gap', sentence: 'We regret to inform you that your application has been _____ (turn down — formal).', answer: 'unsuccessful', hint: 'Formal alternative to "turned down"', explanation: '"Unsuccessful" is the formal register equivalent of "turned down" in official correspondence.' },
          { type: 'fix_error', sentence: 'The proposal is dead in the water due to a lack of financial support. (Make this academic)', answer: 'The proposal lacks viability owing to insufficient financial support.', hint: 'Replace idiom with formal/academic language', explanation: 'Academic register avoids idioms like "dead in the water". Use "lacks viability" and "owing to insufficient".' },
          { type: 'read_answer', passage: 'Register refers to the level of formality appropriate to a context. Informal language uses contractions, slang and direct expressions. Formal language is more complex and polite. Academic language combines formality with precision, hedging and passivisation. At C1, learners must shift registers fluently — writing a business email, an essay and a text message all require different choices.', question: 'What are the three registers discussed in the passage?', answer: 'informal, formal, and academic', explanation: 'The passage discusses informal, formal and academic registers and their key features.' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'I wish to express my sincere gratitude for your kind assistance.', focus: 'formal register — slow, deliberate pacing' },
          { type: 'listen_write', text: 'Cheers for coming — really glad you could make it!', focus: 'informal register — fast, natural connected speech' },
          { type: 'repeat', text: 'The data suggests that further investigation may be warranted.', focus: 'academic register — hedging, measured intonation' },
          { type: 'listen_write', text: 'Would you be so kind as to forward the relevant documentation?', focus: 'very formal request — rising polite intonation' },
          { type: 'repeat', text: 'The committee was unable to reach a consensus on the proposed amendments.', focus: 'formal committee language — neutral, declarative' },
          { type: 'listen_write', text: 'We\'re not sure yet — let\'s talk about it later, yeah?', focus: 'informal hedging — casual falling intonation' },
          { type: 'repeat', text: 'The findings indicate a statistically significant correlation between the variables.', focus: 'academic — sustained even tempo, technical vocabulary' },
          { type: 'listen_write', text: 'Please do not hesitate to contact us should you require further information.', focus: 'formal correspondence — standard business phrasing' },
          { type: 'repeat', text: 'We are pleased to inform you that your application has been successful, and we look forward to welcoming you to the team.', focus: 'formal business letter — professional pace and intonation' },
          { type: 'sentence_stress', text: 'I wish to formally object to the terms outlined in the agreement.', stressed_word: 'formally', focus: '"formally" emphasises the register of the objection' },
        ],
      },
    ],
  },

  // ── Module 3 — Gramática Integrada C1 ────────────────────────────────────
  {
    title: 'Integrated Grammar C1',
    topics: [
      {
        title: 'Advanced question formation — indirect & rhetorical',
        grammar: [
          { type: 'multiple_choice', sentence: 'Could you tell me _____ the manager is available?', answer: 'whether', options: ['whether', 'if whether', 'would'], explanation: '"Could you tell me whether…" — indirect yes/no question with "whether".' },
          { type: 'word_bank', sentence: 'I was wondering _____ you might be able to help me.', answer: 'whether', choices: ['whether', 'that', 'what', 'when'], explanation: '"I was wondering whether" — polite indirect question structure.' },
          { type: 'fill_gap', sentence: 'Do you have any idea _____ this meeting will end?', answer: 'when', hint: 'Indirect question with question word', explanation: '"Do you have any idea when…" — indirect question uses normal word order.' },
          { type: 'fix_error', sentence: 'Can you tell me where is the nearest station?', answer: 'Can you tell me where the nearest station is?', hint: 'Indirect questions use statement word order', explanation: 'Indirect questions do not invert: "where the nearest station is" (not "where is").' },
          { type: 'read_answer', passage: 'Indirect questions are used to be polite or to soften a request. They are introduced by phrases like "Could you tell me…", "I was wondering…", "Do you know…" and "I\'d like to know…". After these openers, the word order is the same as a statement — no inversion. Rhetorical questions do not expect an answer: "What could be more important than that?" They are used for emphasis and persuasion.', question: 'What is the purpose of rhetorical questions?', answer: 'emphasis and persuasion', explanation: 'The passage says rhetorical questions "are used for emphasis and persuasion".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'Could you tell me where the nearest exit is?', focus: 'indirect question — falling intonation (not rising)' },
          { type: 'listen_write', text: 'I was wondering whether you\'d be available on Tuesday.', focus: '"I was wondering whether" — polite, measured delivery' },
          { type: 'repeat', text: 'Would you happen to know what time the flight departs?', focus: '"Would you happen to know" — very polite opener rhythm' },
          { type: 'listen_write', text: 'Do you have any idea how long this process normally takes?', focus: '"any idea how long" — connected speech' },
          { type: 'repeat', text: 'What could be more important than the safety of our team?', focus: 'rhetorical question — emphatic rising-falling intonation' },
          { type: 'listen_write', text: 'I\'d like to know why the deadline was changed without notice.', focus: '"I\'d like to know why" — formal complaint register' },
          { type: 'repeat', text: 'Are we seriously going to ignore what has just happened here?', focus: 'rhetorical question — strong emphasis and frustration' },
          { type: 'listen_write', text: 'Could you clarify what exactly you mean by "on time"?', focus: '"what exactly" — clarification request, formal' },
          { type: 'repeat', text: 'I was wondering if you could help me understand what went wrong and whether there is anything we can do to prevent it in future.', focus: 'complex indirect question — sustained formal register' },
          { type: 'sentence_stress', text: 'Could you please explain why this decision was made?', stressed_word: 'why', focus: 'question word receives main stress in indirect question' },
        ],
      },
      {
        title: 'Aspect review — perfect tenses in context C1',
        grammar: [
          { type: 'multiple_choice', sentence: 'By the time she retires, she _____ the company for 35 years.', answer: 'will have served', options: ['will have served', 'has served', 'will serve'], explanation: '"Will have served" = future perfect — an action completed before a future point.' },
          { type: 'word_bank', sentence: 'She _____ _____ for three hours before she found the answer.', answer: 'had / been searching', choices: ['had', 'has', 'been searching', 'searched', 'searching'], explanation: '"Had been searching" — past perfect continuous for an ongoing action before a past point.' },
          { type: 'fill_gap', sentence: 'By next year, they _____ (complete) the entire restoration project.', answer: 'will have completed', hint: 'Future perfect for action complete before a future point', explanation: '"Will have completed" = future perfect, showing completion before "next year".' },
          { type: 'fix_error', sentence: 'I have been living here since ten years.', answer: 'I have been living here for ten years.', hint: '"For" for duration; "since" for a point in time', explanation: '"For" is used with a period of time (ten years); "since" is used with a point in time (2015).' },
          { type: 'read_answer', passage: 'C1 learners need to distinguish between aspect (the shape of the action) and tense (its time frame). The present perfect simple focuses on completion or experience; the present perfect continuous emphasises duration or ongoing relevance. The past perfect shows a sequence in the past. The future perfect shows completion before a future point. All four forms can interact within a single text, so recognising which applies requires careful attention to context.', question: 'What does the future perfect show?', answer: 'completion before a future point', explanation: 'The passage states "The future perfect shows completion before a future point".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'By next month, she will have been working here for a decade.', focus: 'future perfect continuous — long sentence prosody' },
          { type: 'listen_write', text: 'They had already left by the time we arrived at the venue.', focus: 'past perfect — "had already" weak forms' },
          { type: 'repeat', text: 'She has been studying this topic for over three years now.', focus: 'present perfect continuous — "has been" connected' },
          { type: 'listen_write', text: 'By the time the report is due, we will have gathered all the data.', focus: 'future perfect — "will have gathered" contraction' },
          { type: 'repeat', text: 'He had been waiting for an answer when the news finally arrived.', focus: '"had been waiting" — narrative rhythm' },
          { type: 'listen_write', text: 'I\'ve been meaning to call you for weeks — I\'m sorry.', focus: '"I\'ve been meaning to" — informal perfect continuous' },
          { type: 'repeat', text: 'The project will have been running for five years in March.', focus: 'future perfect passive continuous — complex aspect' },
          { type: 'listen_write', text: 'How long have you been working in this field?', focus: 'question with present perfect continuous' },
          { type: 'repeat', text: 'By the time the course ends, she will have completed over 200 hours of study and will have developed a thorough understanding of the subject.', focus: 'sustained future perfect in planning language' },
          { type: 'sentence_stress', text: 'She had been hoping for a promotion, but it never came.', stressed_word: 'hoping', focus: 'continuous aspect — main verb receives emotional stress' },
        ],
      },
      {
        title: 'Gerunds & Infinitives — mastery C1',
        grammar: [
          { type: 'multiple_choice', sentence: 'She regrets _____ the opportunity when she had the chance.', answer: 'not taking', options: ['not taking', 'not to take', 'to not take'], explanation: '"Regret + gerund" = regret something you did (or didn\'t do) in the past.' },
          { type: 'word_bank', sentence: 'I remember _____ this place as a child — it hasn\'t changed at all.', answer: 'visiting', choices: ['visiting', 'to visit', 'visit', 'having visited'], explanation: '"Remember + gerund" = recall a past experience that happened.' },
          { type: 'fill_gap', sentence: 'She stopped _____ (smoke) after her doctor\'s warning.', answer: 'smoking', hint: '"Stop + gerund" = quit the activity', explanation: '"Stopped smoking" = she quit. "Stopped to smoke" would mean she stopped in order to smoke.' },
          { type: 'fix_error', sentence: 'He tried to working harder but still couldn\'t finish on time.', answer: 'He tried working harder but still couldn\'t finish on time.', hint: '"Try + gerund" = experiment; "try + infinitive" = attempt', explanation: '"Tried working" = experimented with working harder. "Try to work" = made an effort to work.' },
          { type: 'read_answer', passage: 'Several verbs in English change meaning depending on whether they are followed by a gerund or an infinitive. "Remember doing" = recall a past event; "remember to do" = have a task in mind for the future. "Regret doing" = feel sorry about a past action; "regret to do" = feel sorry while doing it now (formal). "Stop doing" = quit; "stop to do" = pause in order to do something. "Try doing" = experiment; "try to do" = make an effort. C1 learners must master these contrasts.', question: 'What is the difference between "regret doing" and "regret to do"?', answer: '"regret doing" = feel sorry about a past action; "regret to do" = feel sorry while doing something now (formal)', explanation: 'The passage explains both meanings of "regret" depending on gerund vs infinitive.' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'She regrets not taking the opportunity when it was offered.', focus: '"regrets not taking" — gerund cluster, connected speech' },
          { type: 'listen_write', text: 'I remember visiting this city as a child — it was very different then.', focus: '"remember visiting" — vivid memory delivery' },
          { type: 'repeat', text: 'He tried exercising every morning, but found it hard to sustain.', focus: '"tried exercising" — experiment meaning, rising-falling' },
          { type: 'listen_write', text: 'We regret to inform you that your application was unsuccessful.', focus: '"regret to inform" — formal register, falling tone' },
          { type: 'repeat', text: 'She stopped to think before answering the difficult question.', focus: '"stopped to think" — infinitive of purpose meaning' },
          { type: 'listen_write', text: 'Please remember to submit the form before the end of the month.', focus: '"remember to submit" — future task reminder' },
          { type: 'repeat', text: 'I\'ll never forget hearing that piece of music for the first time.', focus: '"forget hearing" — memorable experience, emotional delivery' },
          { type: 'listen_write', text: 'He went on to explain the reasoning behind the decision.', focus: '"went on to explain" — continuation infinitive' },
          { type: 'repeat', text: 'She remembered locking the door, but when she tried checking again, she realised she had forgotten to take the key.', focus: 'multiple gerund/infinitive contrasts in a single sentence' },
          { type: 'sentence_stress', text: 'I regret not telling him the truth when I had the chance.', stressed_word: 'truth', focus: '"truth" as the key regretted thing — receives emotional nuclear stress' },
        ],
      },
      {
        title: 'Participle clauses (Having finished… / Feeling nervous…)',
        grammar: [
          { type: 'multiple_choice', sentence: '_____ the report, she submitted it to the board.', answer: 'Having completed', options: ['Having completed', 'Completing', 'Having been complete'], explanation: '"Having completed" = perfect participle clause — action completed before the main verb.' },
          { type: 'word_bank', sentence: '_____ clearly nervous, the candidate delivered an impressive presentation.', answer: 'Feeling', choices: ['Feeling', 'Having felt', 'Felt', 'Being felt'], explanation: '"Feeling nervous" — present participle clause describing the subject\'s state.' },
          { type: 'fill_gap', sentence: '_____ (not understand) the question, she asked for clarification.', answer: 'Not understanding', hint: 'Negative present participle clause', explanation: '"Not understanding the question" — negative participle clause, same subject as main clause.' },
          { type: 'fix_error', sentence: 'Walking down the street, a car splashed me with water.', answer: 'Walking down the street, I was splashed by a car.', hint: 'Participle clause must share subject with main clause', explanation: 'Dangling participle — "walking" must refer to the subject of the main clause ("I"), not the car.' },
          { type: 'read_answer', passage: 'Participle clauses condense information and create a more sophisticated writing style. Present participle clauses ("Feeling confused, she asked for help") show simultaneous or background actions. Perfect participle clauses ("Having finished the work, he left") show an action completed before the main verb. The subject of the participle clause must always match the subject of the main clause — otherwise a "dangling participle" error occurs.', question: 'What error occurs when the subjects don\'t match?', answer: 'dangling participle', explanation: 'The passage says the error is called a "dangling participle".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'Having finished the report, she submitted it immediately.', focus: 'perfect participle clause — initial rhythm' },
          { type: 'listen_write', text: 'Feeling uncertain, he paused before answering the question.', focus: 'present participle clause — slight pause before main clause' },
          { type: 'repeat', text: 'Not fully understanding the instructions, she made several errors.', focus: 'negative participle clause — stress on "Not"' },
          { type: 'listen_write', text: 'Impressed by her work, the manager offered her a promotion.', focus: 'past participle clause — formal passive-like structure' },
          { type: 'repeat', text: 'Having been warned repeatedly, he had no excuse for the delay.', focus: 'perfect passive participle clause — emphasis on consequence' },
          { type: 'listen_write', text: 'Realising the mistake, she immediately called her supervisor.', focus: '"Realising" — present participle + connected main clause' },
          { type: 'repeat', text: 'Driven by ambition, she worked tirelessly to achieve her goal.', focus: 'past participle clause describing motivation' },
          { type: 'listen_write', text: 'Having spent years abroad, she speaks English with remarkable fluency.', focus: '"Having spent" — perfect participle, causal meaning' },
          { type: 'repeat', text: 'Having reviewed all the evidence carefully, the jury reached a unanimous verdict, feeling confident in their decision.', focus: 'two participle clauses in one sentence — sustained rhythm' },
          { type: 'sentence_stress', text: 'Not knowing what to say, she simply smiled and nodded.', stressed_word: 'knowing', focus: '"knowing" — main verb in participle clause receives stress' },
        ],
      },
      {
        title: 'Advanced verb patterns',
        grammar: [
          { type: 'multiple_choice', sentence: 'The manager insisted _____ the team leader being present.', answer: 'on', options: ['on', 'that', 'to'], explanation: '"Insist on + gerund" — when followed by an object, use "on + object + gerund".' },
          { type: 'word_bank', sentence: 'She accused him _____ leaking confidential information.', answer: 'of', choices: ['of', 'for', 'with', 'at'], explanation: '"Accuse someone of doing something" — fixed preposition pattern.' },
          { type: 'fill_gap', sentence: 'They succeeded _____ (negotiate) a favourable settlement.', answer: 'in negotiating', hint: '"Succeed in + gerund"', explanation: '"Succeed in negotiating" — "succeed" requires "in + gerund", not an infinitive.' },
          { type: 'fix_error', sentence: 'I look forward to meet you at the conference next week.', answer: 'I look forward to meeting you at the conference next week.', hint: '"Look forward to + gerund" — "to" here is a preposition', explanation: '"Look forward to" — "to" is a preposition, so it requires a gerund: "to meeting".' },
          { type: 'read_answer', passage: 'Many English verb patterns involve fixed prepositions before gerunds. "Succeed in doing", "insist on doing", "accuse of doing", "congratulate on doing", "prevent from doing", "object to doing", "look forward to doing" and "depend on doing" are all C1 patterns. A common error is using an infinitive after "to" in these phrases. The key is recognising that "to" is a preposition here, not part of the infinitive.', question: 'Why is a gerund required after "look forward to"?', answer: 'because "to" is a preposition, not part of the infinitive', explanation: 'The passage says the key is "recognising that \'to\' is a preposition here, not part of the infinitive".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'I really look forward to hearing your thoughts on this.', focus: '"look forward to hearing" — "to" as preposition, natural flow' },
          { type: 'listen_write', text: 'She accused him of deliberately withholding the information.', focus: '"accused him of" — preposition in verb pattern' },
          { type: 'repeat', text: 'They eventually succeeded in resolving the dispute amicably.', focus: '"succeeded in resolving" — formal register, measured pace' },
          { type: 'listen_write', text: 'He insisted on being present during the entire process.', focus: '"insisted on being" — gerund after preposition' },
          { type: 'repeat', text: 'Nothing will prevent us from achieving our goals.', focus: '"prevent from achieving" — verb + preposition + gerund' },
          { type: 'listen_write', text: 'She congratulated him on winning the award.', focus: '"congratulated on winning" — short, clear pattern' },
          { type: 'repeat', text: 'The team objects to being left out of the decision-making process.', focus: '"objects to being left out" — complex gerund object' },
          { type: 'listen_write', text: 'Whether we succeed depends entirely on how well we prepare.', focus: '"depends on how well" — preposition + clause' },
          { type: 'repeat', text: 'She insisted on having all the details before agreeing to proceed, as she had been accused of overlooking important information in the past.', focus: 'multiple verb patterns in connected discourse' },
          { type: 'sentence_stress', text: 'The outcome will depend on every team member doing their part.', stressed_word: 'every', focus: '"every" emphasises collective responsibility — receives contrastive stress' },
        ],
      },
      {
        title: 'Idioms & collocations — fluency in production',
        grammar: [
          { type: 'multiple_choice', sentence: 'The new policy has really _____ the cat among the pigeons.', answer: 'set', options: ['set', 'put', 'placed'], explanation: '"Set the cat among the pigeons" = to cause trouble or controversy. "Set" is the correct verb.' },
          { type: 'word_bank', sentence: 'After months of negotiation, both sides finally _____ common ground.', answer: 'found', choices: ['found', 'reached', 'made', 'got'], explanation: '"Find common ground" = reach agreement — the fixed collocating verb is "find".' },
          { type: 'fill_gap', sentence: 'The new CEO came out of left _____ — nobody expected the appointment.', answer: 'field', hint: '"Out of left _____" = unexpected', explanation: '"Out of left field" = completely unexpected — an idiom from baseball.' },
          { type: 'fix_error', sentence: 'She plays a pivotal role on the success of this project.', answer: 'She plays a pivotal role in the success of this project.', hint: '"Play a role in" — preposition', explanation: '"Play a role in" is the correct collocation — the preposition is "in", not "on".' },
          { type: 'read_answer', passage: 'Producing idioms and collocations naturally requires extensive exposure and practice. At C1, learners should not just recognise fixed expressions but use them spontaneously in speech and writing. Collocations like "play a pivotal role", "raise a concern", "find common ground" and "take a stand" sound natural because native speakers have internalised them. Replacing one word in a collocation — even with a synonym — often sounds unnatural.', question: 'What happens if you replace a word in a collocation with a synonym?', answer: 'it sounds unnatural', explanation: 'The passage says replacing a word "even with a synonym — often sounds unnatural".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'The announcement really set the cat among the pigeons.', focus: '"set the cat among the pigeons" — stress on "set" and "pigeons"' },
          { type: 'listen_write', text: 'After long negotiations, both sides managed to find common ground.', focus: '"find common ground" — connected speech, diplomatic tone' },
          { type: 'repeat', text: 'His decision came completely out of left field.', focus: '"out of left field" — falling intonation, surprise' },
          { type: 'listen_write', text: 'She plays a pivotal role in shaping the company\'s strategy.', focus: '"plays a pivotal role in" — collocation rhythm' },
          { type: 'repeat', text: 'We need to raise some serious concerns about the timeline.', focus: '"raise concerns" — formal advisory tone' },
          { type: 'listen_write', text: 'It\'s time to take a stand and say what we really believe.', focus: '"take a stand" — emphatic, persuasive delivery' },
          { type: 'repeat', text: 'The proposal fell flat despite months of careful preparation.', focus: '"fell flat" — concise idiom, falling intonation' },
          { type: 'listen_write', text: 'He always manages to hit the nail on the head with his feedback.', focus: '"hit the nail on the head" — accurate idiom, natural rhythm' },
          { type: 'repeat', text: 'She plays a pivotal role in the team, consistently finding common ground and helping others take a stand when it matters most.', focus: 'multiple collocations in natural speech flow' },
          { type: 'sentence_stress', text: 'We need to address this issue before it spirals out of control.', stressed_word: 'spirals', focus: 'key verb receives dramatic stress in warning tone' },
        ],
      },
      {
        title: 'Concession & contrast — advanced',
        grammar: [
          { type: 'multiple_choice', sentence: '_____ hard he tries, he never seems to achieve his targets.', answer: 'However', options: ['However', 'Although', 'Despite'], explanation: '"However hard he tries" = "No matter how hard he tries" — concession with an adjective/adverb.' },
          { type: 'word_bank', sentence: 'Clever _____ she is, she still struggles with time management.', answer: 'as', choices: ['as', 'though', 'but', 'despite'], explanation: '"Clever as she is" = "Although she is clever" — inverted concession structure: adjective + "as" + subject + verb.' },
          { type: 'fill_gap', sentence: '_____ (while) acknowledging the risks, they decided to proceed.', answer: 'While', hint: '"_____ acknowledging" = a concessive participle clause', explanation: '"While acknowledging the risks" = even though they acknowledged the risks — concessive clause.' },
          { type: 'fix_error', sentence: 'Much as we tried hard, we couldn\'t reach an agreement.', answer: 'Much as we tried, we couldn\'t reach an agreement.', hint: '"Much as" already conveys the effort — no "hard" needed', explanation: '"Much as we tried" is the correct form — "much as" already carries the concessive force; "hard" is redundant.' },
          { type: 'read_answer', passage: 'Advanced concession structures include: "however + adjective/adverb + subject + verb" (However difficult it may be, we must try), "adjective + as + subject + verb" (Strange as it seems, it works), "much as" (Much as I admire her, I disagree), and "while/whilst + participle clause" (While acknowledging the challenges, the report is optimistic). These are characteristic of C1 writing and formal speech, and are more nuanced than simple "although".', question: 'What structure does "Strange as it seems, it works" use?', answer: 'adjective + as + subject + verb', explanation: 'The passage explains this is the "adjective + as + subject + verb" inverted concession structure.' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'However difficult the challenge, we are committed to finding a solution.', focus: '"However difficult" — concessive opener, falling intonation' },
          { type: 'listen_write', text: 'Strange as it may seem, the simplest solution was often the best.', focus: '"Strange as it may seem" — inverted concession rhythm' },
          { type: 'repeat', text: 'Much as I respect her opinion, I have to disagree on this occasion.', focus: '"Much as I respect" — formal concession, deliberate pacing' },
          { type: 'listen_write', text: 'While acknowledging the limitations, the authors remain cautiously optimistic.', focus: '"While acknowledging" — participial concession' },
          { type: 'repeat', text: 'Tired though she was, she stayed to finish the final draft.', focus: '"Tired though she was" — inverted adjective concession' },
          { type: 'listen_write', text: 'However unpopular the decision, it was clearly the right one to make.', focus: '"However unpopular" — concessive with evaluative adjective' },
          { type: 'repeat', text: 'For all its flaws, the proposal contains some genuinely innovative ideas.', focus: '"For all its flaws" — concessive prepositional phrase' },
          { type: 'listen_write', text: 'Brilliant as he was, his career was marked by poor personal decisions.', focus: '"Brilliant as he was" — historical evaluation' },
          { type: 'repeat', text: 'Much as the team tried to meet the deadline, unforeseen complications, however minor they seemed initially, eventually caused significant delays.', focus: 'nested concession clauses — C1 complexity' },
          { type: 'sentence_stress', text: 'However convincing his argument, the evidence simply does not support it.', stressed_word: 'simply', focus: '"simply" as an emphatic adverb — strong contrastive stress' },
        ],
      },
      {
        title: 'Articles — edge cases & C1 mastery',
        grammar: [
          { type: 'multiple_choice', sentence: 'She plays _____ piano at a professional level.', answer: 'the', options: ['the', 'a', '—'], explanation: '"Play the piano/guitar/violin" — musical instruments use "the".' },
          { type: 'word_bank', sentence: '_____ life is full of unexpected twists and turns.', answer: '—', choices: ['—', 'The', 'A', 'Some'], explanation: 'No article before abstract nouns used in a general sense: "Life is full of…"' },
          { type: 'fill_gap', sentence: 'She was appointed _____ director of the company last month.', answer: '—', hint: 'Unique role/title after "appoint/elect/become" — no article', explanation: 'No article with unique job titles used predicatively: "was appointed director" (not "a director").' },
          { type: 'fix_error', sentence: 'The honesty is the best policy in all situations.', answer: 'Honesty is the best policy in all situations.', hint: 'Abstract noun in general sense — no "the"', explanation: '"Honesty" used generally takes no article: "Honesty is the best policy."' },
          { type: 'read_answer', passage: 'Articles are one of the most complex features of English. General rules: "a/an" for singular countable nouns (first mention or general class), "the" for specific or previously mentioned nouns, and zero article for plural or uncountable nouns in a general sense. Edge cases include: instruments (play the piano), unique titles (was elected president), and abstract concepts used generally (Life is short; Love is complicated). C1 mastery means handling all these without hesitation.', question: 'What article is used with musical instruments?', answer: '"the"', explanation: 'The passage states instruments use "the": "play the piano".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'She plays the violin in a professional orchestra.', focus: '"the violin" — definite article with instrument' },
          { type: 'listen_write', text: 'Life is too short to spend it worrying about small things.', focus: 'zero article — general abstract noun' },
          { type: 'repeat', text: 'He was elected president for a second consecutive term.', focus: '"elected president" — unique title, no article' },
          { type: 'listen_write', text: 'The internet has transformed the way we communicate.', focus: '"The internet" — unique entity takes definite article' },
          { type: 'repeat', text: 'Love and trust are the foundations of any lasting relationship.', focus: 'zero article + "the" contrast in same sentence' },
          { type: 'listen_write', text: 'The sun rises in the east and sets in the west.', focus: '"the sun", "the east", "the west" — definite article with unique entities' },
          { type: 'repeat', text: 'She is an expert in the field of renewable energy.', focus: '"an expert", "the field" — contrastive article use' },
          { type: 'listen_write', text: 'He has a gift for languages — he picked up Mandarin in under a year.', focus: '"a gift for" — indefinite article in idiom' },
          { type: 'repeat', text: 'The data suggests that a significant proportion of the population has never used the internet for educational purposes.', focus: 'multiple article choices in one academic sentence' },
          { type: 'sentence_stress', text: 'The difference between a policy and the policy matters enormously here.', stressed_word: 'the', focus: '"the" vs "a" — article distinction receives contrastive stress' },
        ],
      },
      {
        title: 'Vocabulary — connotation, register & nuance',
        grammar: [
          { type: 'multiple_choice', sentence: 'Which word has a more positive connotation? She is _____. A: stubborn B: determined C: pig-headed', answer: 'B', options: ['A', 'B', 'C'], explanation: '"Determined" is positive; "stubborn" is neutral-negative; "pig-headed" is very informal and negative.' },
          { type: 'word_bank', sentence: 'The politician was _____ in deflecting the journalist\'s questions. (positive spin)', answer: 'adept', choices: ['adept', 'slippery', 'sneaky', 'calculating'], explanation: '"Adept at deflecting" = skilled — positive connotation. "Slippery" would be negative.' },
          { type: 'fill_gap', sentence: 'She is _____ (thrifty — positive) with money; she never wastes it.', answer: 'thrifty', hint: 'Positive word for careful with money', explanation: '"Thrifty" has a positive connotation (careful/smart with money). "Stingy" is the negative equivalent.' },
          { type: 'fix_error', sentence: 'He is very economic — he never spends more than necessary.', answer: 'He is very economical — he never spends more than necessary.', hint: '"Economic" relates to the economy; "economical" means not wasteful', explanation: '"Economical" = not wasteful. "Economic" relates to the economy or is about financial matters generally.' },
          { type: 'read_answer', passage: 'Words that appear to have the same meaning can carry very different connotations. "Slim" and "skinny" both describe low body weight, but "slim" is positive while "skinny" can imply unhealthily thin. "Thrifty" and "stingy" both describe careful spending, but with opposite connotations. C1 learners must go beyond denotation (dictionary meaning) to understand connotation (emotional tone) and choose words that fit the register and context precisely.', question: 'What is the difference between denotation and connotation?', answer: 'denotation is dictionary meaning; connotation is emotional tone', explanation: 'The passage defines denotation as "dictionary meaning" and connotation as "emotional tone".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'She is determined to succeed — nothing will stop her.', focus: '"determined" — positive connotation, strong confident delivery' },
          { type: 'listen_write', text: 'He was surprisingly thrifty, always finding ways to save money.', focus: '"thrifty" — positive framing, warm tone' },
          { type: 'repeat', text: 'The politician was adept at avoiding direct answers.', focus: '"adept" — neutral positive, measured delivery' },
          { type: 'listen_write', text: 'She is slim and elegant — always dressed impeccably.', focus: '"slim" — positive connotation, admiring tone' },
          { type: 'repeat', text: 'His bold decision turned out to be a masterstroke.', focus: '"bold" and "masterstroke" — positive connotations, rising intonation' },
          { type: 'listen_write', text: 'The report described the approach as innovative rather than risky.', focus: 'connotation contrast — "innovative" vs "risky"' },
          { type: 'repeat', text: 'What some call stubbornness, others might call conviction.', focus: 'two connotations of the same trait — contrastive delivery' },
          { type: 'listen_write', text: 'She\'s frugal in her spending, which is why she\'s so financially secure.', focus: '"frugal" — formal positive synonym for thrifty' },
          { type: 'repeat', text: 'Whether you call it determination or stubbornness often depends on whether the outcome was successful.', focus: 'connotation argument — complex sentence with contrasting lexis' },
          { type: 'sentence_stress', text: 'He\'s not stubborn — he\'s principled. There\'s a significant difference.', stressed_word: 'principled', focus: 'positive reframing — "principled" receives contrastive nuclear stress' },
        ],
      },
      {
        title: 'C1 Review — full integration',
        grammar: [
          { type: 'multiple_choice', sentence: 'Had the negotiations _____ earlier, we would not be in this situation.', answer: 'been concluded', options: ['been concluded', 'concluded', 'conclude'], explanation: 'Inverted third conditional passive: "Had the negotiations been concluded" = "If the negotiations had been concluded".' },
          { type: 'word_bank', sentence: 'What the data _____ is a clear and consistent pattern of improvement.', answer: 'reveals', choices: ['reveals', 'show', 'telling', 'is revealing'], explanation: '"What the data reveals is…" — what-cleft sentence in present simple for formal analysis.' },
          { type: 'fill_gap', sentence: 'She was _____ (appoint) director after demonstrating exceptional leadership.', answer: 'appointed', hint: 'Passive with unique title (no article)', explanation: '"Was appointed director" — passive voice with a unique title takes no article.' },
          { type: 'fix_error', sentence: 'Despite of the challenges, the team succeeded in delivering the project.', answer: 'Despite the challenges, the team succeeded in delivering the project.', hint: '"Despite" does not take "of"', explanation: '"Despite" is followed directly by a noun/gerund — no "of". "In spite of" takes "of".' },
          { type: 'read_answer', passage: 'C1 competence means integrating grammar, vocabulary and discourse seamlessly. A C1 writer can use inversion for emphasis, nominalisation for formality, hedging for caution, and sophisticated concession structures to acknowledge counterarguments — all within a single piece of writing. Collocations and idioms are used naturally, register is controlled, and tense and aspect distinctions are precise. This module has reviewed the complete C1 grammar system.', question: 'What does C1 competence involve beyond grammar?', answer: 'vocabulary, discourse, register control, collocations, idioms', explanation: 'The passage says C1 involves "grammar, vocabulary and discourse seamlessly" — including register, collocations and idioms.' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'Had the report been submitted on time, the decision would have been different.', focus: 'inverted third conditional passive — complex sentence' },
          { type: 'listen_write', text: 'What the evidence reveals is a deeply troubling pattern of neglect.', focus: '"What the evidence reveals is" — what-cleft, formal delivery' },
          { type: 'repeat', text: 'Despite the significant challenges, the project was delivered within budget.', focus: '"Despite" — concession opener, formal rhythm' },
          { type: 'listen_write', text: 'She was appointed chief executive after a rigorous selection process.', focus: '"appointed chief executive" — unique title, passive' },
          { type: 'repeat', text: 'The data would appear to suggest that intervention at an early stage is most effective.', focus: 'hedging in complex formal sentence' },
          { type: 'listen_write', text: 'Having reviewed all available evidence, the panel reached a unanimous verdict.', focus: 'perfect participle clause + formal main clause' },
          { type: 'repeat', text: 'Skilled as she is, even she admits that the task is enormously complex.', focus: '"Skilled as she is" — inverted concession + emphasis' },
          { type: 'listen_write', text: 'The committee has undertaken to publish its findings before the end of the quarter.', focus: '"undertaken to publish" — formal verb pattern' },
          { type: 'repeat', text: 'Having conducted a comprehensive review of the evidence, the board concluded that, while certain challenges remain, the overall trajectory is encouraging.', focus: 'C1 integrated sentence — participle clause, concession, hedging' },
          { type: 'sentence_stress', text: 'It was the quality of the communication, not the strategy itself, that determined the outcome.', stressed_word: 'communication', focus: '"It was...that" cleft — focused element receives primary nuclear stress' },
        ],
      },
    ],
  },

  // ── Module 4 — Fluência Nativa C2 ────────────────────────────────────────
  {
    title: 'Native Fluency C2',
    topics: [
      {
        title: 'Inversion — full mastery & rhetorical use',
        grammar: [
          { type: 'multiple_choice', sentence: 'So _____ the situation that the entire board resigned.', answer: 'serious was', options: ['serious was', 'was serious', 'serious had been'], explanation: '"So + adjective + was + subject" — inversion after "so" for emphasis: "So serious was the situation…"' },
          { type: 'word_bank', sentence: 'Such _____ the pressure that she collapsed after the presentation.', answer: 'was', choices: ['was', 'is', 'were', 'has been'], explanation: '"Such was the pressure" — inversion after "such" for dramatic emphasis.' },
          { type: 'fill_gap', sentence: 'Only by working _____ a team can we hope to succeed.', answer: 'as', hint: '"Only by + gerund + …" — inversion in main clause', explanation: '"Only by working as a team can we hope to succeed" — inversion in main clause after "only by".' },
          { type: 'fix_error', sentence: 'So dedicated she was that she worked through three consecutive nights.', answer: 'So dedicated was she that she worked through three consecutive nights.', hint: '"So + adjective + was/were + subject + that"', explanation: '"So dedicated was she that…" — inversion: adjective, then auxiliary, then subject.' },
          { type: 'read_answer', passage: 'Full C2 inversion mastery includes: fronted negatives (Never have I…), "so + adj + aux + subject + that" (So great was the demand that…), "such + aux + subject" (Such was his talent that…), "only by/when/if" (Only by working together can we…), and rhetorical inversion in formal speeches. These structures are used not just grammatically but for deliberate stylistic and persuasive effect.', question: 'What is the structure after "so" in emphatic inversion?', answer: 'so + adjective + auxiliary + subject + that', explanation: 'The passage gives the pattern: "So great was the demand that…" = so + adj + aux + subject + that.' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'So convinced was she that she refused to consider any alternatives.', focus: '"So convinced was she" — dramatic stress on "So"' },
          { type: 'listen_write', text: 'Such was the scale of the disaster that aid workers struggled to cope.', focus: '"Such was" — formal declarative intonation' },
          { type: 'repeat', text: 'Only by investing in education can a society truly progress.', focus: '"Only by" — rhetorical inversion, falling intonation' },
          { type: 'listen_write', text: 'Not since the financial crisis of 2008 have markets seen such volatility.', focus: '"Not since" — fronted time expression + inversion' },
          { type: 'repeat', text: 'Rarely in history has a decision carried such far-reaching consequences.', focus: '"Rarely in history has" — formal historical assertion' },
          { type: 'listen_write', text: 'So profound was the impact that it changed the course of history.', focus: '"So profound was the impact" — emphatic structure rhythm' },
          { type: 'repeat', text: 'Under no circumstances should this information be shared publicly.', focus: '"Under no circumstances" — strong prohibition inversion' },
          { type: 'listen_write', text: 'Such is the complexity of the issue that no simple solution exists.', focus: '"Such is the complexity" — present tense inversion' },
          { type: 'repeat', text: 'Never before in living memory has the world faced such a combination of interconnected crises, each amplifying the other.', focus: 'sustained formal rhetorical inversion — C2 complexity' },
          { type: 'sentence_stress', text: 'So compelling was her argument that even her critics had to concede.', stressed_word: 'compelling', focus: '"compelling" as the adjective in focus position — primary nuclear stress' },
        ],
      },
      {
        title: 'Advanced subjunctive & formal grammar C2',
        grammar: [
          { type: 'multiple_choice', sentence: 'The treaty requires that each signatory _____ its commitments.', answer: 'honour', options: ['honour', 'honours', 'honoured'], explanation: 'Formal subjunctive: base form (honour, not honours) after "requires that".' },
          { type: 'word_bank', sentence: 'It is imperative that the investigation _____ impartial at all times.', answer: 'remain', choices: ['remain', 'remains', 'remained', 'remaining'], explanation: '"It is imperative that + base form" — subjunctive: "remain" (not "remains").' },
          { type: 'fill_gap', sentence: 'God _____ (save) the Queen! (traditional subjunctive wish)', answer: 'save', hint: 'Optative subjunctive: base form as a wish', explanation: '"God save the Queen" — an optative subjunctive expressing a wish, using the base form.' },
          { type: 'fix_error', sentence: 'Were it not for her intervention, the project would of collapsed.', answer: 'Were it not for her intervention, the project would have collapsed.', hint: '"Would have" — not "would of"', explanation: '"Would have collapsed" — "would of" is a very common error; the correct form is always "would have".' },
          { type: 'read_answer', passage: 'At C2, the subjunctive is used not only in formal writing but also in set phrases and optative expressions. The "mandative subjunctive" (after verbs like require, insist, propose, recommend) uses the base form regardless of the subject. The "formulaic subjunctive" appears in fixed phrases: "Be that as it may", "Far be it from me to…", "Suffice it to say…", "Come what may". These are markers of an exceptionally high level of formal English.', question: 'Name two formulaic subjunctive phrases from the passage.', answer: '"Be that as it may" and "Come what may" (or others)', explanation: 'The passage lists: "Be that as it may", "Far be it from me to…", "Suffice it to say…", "Come what may".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'It is essential that every participant be given an equal opportunity.', focus: 'mandative subjunctive — formal, even delivery' },
          { type: 'listen_write', text: 'Be that as it may, we must still adhere to the agreed procedures.', focus: '"Be that as it may" — fixed phrase, measured pace' },
          { type: 'repeat', text: 'Come what may, we are committed to completing this project.', focus: '"Come what may" — dramatic, resolute delivery' },
          { type: 'listen_write', text: 'Suffice it to say that the outcome was far from satisfactory.', focus: '"Suffice it to say" — formal hedge opener' },
          { type: 'repeat', text: 'The committee insists that the proposal be reviewed before any vote is taken.', focus: '"insists that" + subjunctive — formal request' },
          { type: 'listen_write', text: 'Far be it from me to criticise, but this plan has serious flaws.', focus: '"Far be it from me" — polite but firm intonation' },
          { type: 'repeat', text: 'Were it not for the team\'s dedication, this project would have failed.', focus: '"Were it not for" — inverted concessive condition' },
          { type: 'listen_write', text: 'God save this institution from poor governance and short-term thinking.', focus: 'optative subjunctive — formal wish' },
          { type: 'repeat', text: 'Be that as it may, the policy requires that all parties honour their commitments, come what may.', focus: 'two subjunctive forms in one sentence — C2 fluency' },
          { type: 'sentence_stress', text: 'It is imperative that this matter be resolved before the summit.', stressed_word: 'imperative', focus: '"imperative" carries the mandate — primary stress' },
        ],
      },
      {
        title: 'Conditional sentences — C2 mastery',
        grammar: [
          { type: 'multiple_choice', sentence: 'But for her quick thinking, the situation _____ catastrophic.', answer: 'would have been', options: ['would have been', 'would be', 'could be'], explanation: '"But for + noun phrase" = "if it had not been for" — triggers third conditional result.' },
          { type: 'word_bank', sentence: 'If only they _____ listened to the warnings sooner.', answer: 'had', choices: ['had', 'would have', 'have', 'did'], explanation: '"If only + past perfect" = regret about a past situation.' },
          { type: 'fill_gap', sentence: 'I wish I _____ (know) the answer — unfortunately, I don\'t.', answer: 'knew', hint: '"I wish + past simple" for present impossibility', explanation: '"I wish I knew" = I don\'t know — "wish" + past simple for an impossible/unlikely present wish.' },
          { type: 'fix_error', sentence: 'Supposing you would have unlimited resources, what would you build?', answer: 'Supposing you had unlimited resources, what would you build?', hint: '"Supposing" + past simple for hypothesis', explanation: '"Supposing you had" — after "supposing", use past simple for hypothetical conditions, not "would have".' },
          { type: 'read_answer', passage: 'C2 conditional mastery includes: "but for" + noun phrase (But for his courage, they would have failed), "if only" + past perfect (If only we had acted sooner), "I wish" + past simple or past perfect, mixed conditionals across time frames, formal inversions (Had, Were, Should), and implied conditions without "if" (A lesser person would have given up). Recognising and producing all these demonstrates near-native grammatical control.', question: 'What structure follows "but for" in a conditional?', answer: 'a noun phrase, with a third conditional result clause', explanation: '"But for + noun phrase" triggers a third conditional result: "would have + past participle".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'But for her intervention, the entire project would have collapsed.', focus: '"But for" — conditional opener, falling main clause' },
          { type: 'listen_write', text: 'If only we had acted sooner — we might have avoided this mess entirely.', focus: '"If only" — regret intonation, falling-rising' },
          { type: 'repeat', text: 'I wish I could give you a more definitive answer right now.', focus: '"I wish I could" — polite regret, formal' },
          { type: 'listen_write', text: 'A lesser team would have given up long before reaching this point.', focus: 'implied conditional without "if"' },
          { type: 'repeat', text: 'Supposing you had to make the decision today — what would you choose?', focus: '"Supposing" — hypothetical opener, rising intonation' },
          { type: 'listen_write', text: 'Had we invested in the infrastructure earlier, these problems could have been avoided.', focus: 'inverted third conditional — measured formal delivery' },
          { type: 'repeat', text: 'Were the evidence to be challenged, the entire case could fall apart.', focus: '"Were…to" — formal second conditional inversion' },
          { type: 'listen_write', text: 'If only the original plans had been followed, we wouldn\'t be in this situation.', focus: '"If only + past perfect" — extended regret clause' },
          { type: 'repeat', text: 'But for the team\'s extraordinary resilience, and had the leadership not intervened at a critical moment, the outcome would have been entirely different.', focus: 'two conditional structures in one complex sentence' },
          { type: 'sentence_stress', text: 'If only they had listened — everything could have been so different.', stressed_word: 'listened', focus: '"listened" carries the regretted action — emotional nuclear stress' },
        ],
      },
      {
        title: 'Perfect tenses — advanced & nuanced use C2',
        grammar: [
          { type: 'multiple_choice', sentence: 'By the time the investigation concludes, it _____ nearly three years.', answer: 'will have taken', options: ['will have taken', 'will take', 'has taken'], explanation: '"Will have taken" — future perfect for a duration that will be complete before a future point.' },
          { type: 'word_bank', sentence: 'She is the most talented student I _____ _____ in thirty years of teaching.', answer: 'have / encountered', choices: ['have', 'had', 'encountered', 'encounter', 'was encountering'], explanation: '"Have encountered" — present perfect for the most extreme experience in a lifetime period.' },
          { type: 'fill_gap', sentence: 'He _____ (intend) to call you — something urgent came up at the last minute.', answer: 'had been intending', hint: 'Past perfect continuous for an intention disrupted', explanation: '"Had been intending" — past perfect continuous shows an ongoing intention before it was interrupted.' },
          { type: 'fix_error', sentence: 'This is the first occasion when I have been witnessing such a phenomenon.', answer: 'This is the first occasion on which I have witnessed such a phenomenon.', hint: 'First occasion — present perfect simple, not continuous; use "on which"', explanation: '"Have witnessed" — after "the first occasion on which", use present perfect simple, not continuous.' },
          { type: 'read_answer', passage: 'At C2, perfect tenses are used with full aspectual awareness. The present perfect can signal: experience (I have been to Japan), recent news (She has resigned), continuity (He has worked here for years), and superlative contexts (the most impressive event I have witnessed). The past perfect continuous signals an ongoing past action that preceded or was interrupted. The future perfect expresses completion before a future reference point. Subtle choices between simple and continuous forms convey meaning precisely.', question: 'What does the past perfect continuous signal?', answer: 'an ongoing past action that preceded or was interrupted', explanation: 'The passage says it "signals an ongoing past action that preceded or was interrupted".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'By March, she will have been leading this team for a decade.', focus: 'future perfect continuous — complex aspect in context' },
          { type: 'listen_write', text: 'This is the most innovative project I have ever been part of.', focus: '"have ever been" — superlative + present perfect' },
          { type: 'repeat', text: 'He had been working on the proposal for weeks before it was rejected.', focus: '"had been working" — past perfect continuous, narrative' },
          { type: 'listen_write', text: 'They will have submitted all the paperwork before the deadline.', focus: '"will have submitted" — future perfect, confident' },
          { type: 'repeat', text: 'I\'ve been meaning to follow up on this for days — I apologise for the delay.', focus: '"I\'ve been meaning to" — informal perfect continuous, apologetic' },
          { type: 'listen_write', text: 'She has long been regarded as one of the foremost experts in the field.', focus: '"has long been regarded" — passive perfect with adverb' },
          { type: 'repeat', text: 'By the time we arrive, they will have been waiting for over two hours.', focus: 'future perfect continuous — sympathy for ongoing wait' },
          { type: 'listen_write', text: 'He had never so much as considered the possibility before that moment.', focus: '"had never so much as considered" — emphatic negative past perfect' },
          { type: 'repeat', text: 'She had been working tirelessly for months, and by the time the study was complete, she will have invested over a thousand hours into the research.', focus: 'past perfect continuous + future perfect in one context' },
          { type: 'sentence_stress', text: 'I have been trying to reach you all week — is everything alright?', stressed_word: 'all', focus: '"all week" — duration intensifier receives contrastive stress' },
        ],
      },
      {
        title: 'Discourse markers C2 — sophisticated argumentation',
        grammar: [
          { type: 'multiple_choice', sentence: 'The evidence is compelling. _____, one must acknowledge the limitations of the study.', answer: 'Notwithstanding this', options: ['Notwithstanding this', 'Nevertheless', 'Even so'], explanation: '"Notwithstanding this" = formal concession — acknowledging the previous point while introducing a qualification.' },
          { type: 'word_bank', sentence: '_____, the report may have underestimated the scale of the problem.', answer: 'That said', choices: ['That said', 'Having said', 'Despite this', 'All the same'], explanation: '"That said" = informal-to-formal transition phrase meaning "however" or "bearing in mind what was just said".' },
          { type: 'fill_gap', sentence: 'The proposal is ambitious _____ (admittedly); _____ (however), it is the boldest plan we have seen.', answer: 'admittedly / however', hint: 'Two discourse markers: one concedes, one pivots', explanation: '"Admittedly" concedes a point; "however" pivots to the main argument.' },
          { type: 'fix_error', sentence: 'On the contrary, the data supports the hypothesis. On the contrary, further testing is advisable.', answer: 'On the one hand, the data supports the hypothesis. On the other hand, further testing is advisable.', hint: '"On the contrary" is for disagreement, not balanced comparison', explanation: '"On the one hand… on the other hand" for balanced comparison. "On the contrary" contradicts a previous statement.' },
          { type: 'read_answer', passage: 'Sophisticated argumentation at C2 uses a wide range of discourse markers to control the flow of ideas. Markers of concession: "admittedly", "granted", "notwithstanding", "that said", "be that as it may". Markers of consequence: "hence", "thereby", "as a result", "it follows that". Markers of elaboration: "in this regard", "with respect to", "insofar as", "to the extent that". Precision in choosing the right marker is a hallmark of C2 written proficiency.', question: 'Name two discourse markers of concession from the passage.', answer: 'admittedly, granted (also: notwithstanding, that said, be that as it may)', explanation: 'The passage lists "admittedly", "granted", "notwithstanding", "that said", "be that as it may".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'Admittedly, the results are impressive — but the sample size is very small.', focus: '"Admittedly" — concession opener, slight pause after' },
          { type: 'listen_write', text: 'That said, the overall trajectory remains cautiously positive.', focus: '"That said" — informal-formal pivot, falling intonation' },
          { type: 'repeat', text: 'Notwithstanding the difficulties, the project has achieved remarkable results.', focus: '"Notwithstanding" — formal concession, formal rhythm' },
          { type: 'listen_write', text: 'It follows that any intervention must be proportionate and targeted.', focus: '"It follows that" — logical consequence, formal' },
          { type: 'repeat', text: 'Insofar as the data is reliable, it suggests a positive trend.', focus: '"Insofar as" — formal qualification, measured delivery' },
          { type: 'listen_write', text: 'To the extent that we can generalise, the findings are encouraging.', focus: '"To the extent that" — hedging discourse marker' },
          { type: 'repeat', text: 'Granted, the evidence is limited. However, the implications are significant.', focus: '"Granted" + "However" — two-part concession structure' },
          { type: 'listen_write', text: 'Be that as it may, the core argument remains valid and well-supported.', focus: '"Be that as it may" — formal subjunctive phrase, steady delivery' },
          { type: 'repeat', text: 'Admittedly, the methodology has limitations; notwithstanding these concerns, the findings represent a significant contribution to the field.', focus: 'two formal concession markers in sequence — C2 sophistication' },
          { type: 'sentence_stress', text: 'Hence, the committee recommends a full and independent review of the process.', stressed_word: 'Hence', focus: '"Hence" as logical conclusion marker — receives strong initial stress' },
        ],
      },
      {
        title: 'Idioms, proverbs & cultural references',
        grammar: [
          { type: 'multiple_choice', sentence: '"Don\'t count your chickens before they hatch" means don\'t _____.', answer: 'assume success before it happens', options: ['assume success before it happens', 'be cruel to animals', 'rush through your work'], explanation: 'This proverb warns against assuming a positive outcome before it has actually occurred.' },
          { type: 'word_bank', sentence: '"The writing is on the _____" means the outcome is already clear.', answer: 'wall', choices: ['wall', 'board', 'door', 'ceiling'], explanation: '"The writing is on the wall" — the outcome, often negative, is already obvious.' },
          { type: 'fill_gap', sentence: '"Every cloud has a silver _____" — there\'s always something positive in a bad situation.', answer: 'lining', hint: 'Common English proverb', explanation: '"Every cloud has a silver lining" = even in bad situations, there is something positive.' },
          { type: 'fix_error', sentence: '"The proof of the pudding is in the eating" is a saying that means the look of something tells you everything about it.', answer: '"The proof of the pudding is in the eating" means you can only judge something by trying or testing it.', hint: 'The proverb is about trying, not appearance', explanation: 'The proverb means you can only evaluate something by experiencing it — not by how it looks.' },
          { type: 'read_answer', passage: 'Proverbs and cultural references are deeply embedded in English communication. Understanding them requires cultural knowledge, not just language knowledge. Proverbs like "The early bird catches the worm", "Actions speak louder than words" and "Don\'t judge a book by its cover" appear in everyday speech, journalism and literature. Literary and historical allusions — references to Shakespeare, the Bible, Greek mythology — are also common at C2 level. These add depth and texture to communication.', question: 'What knowledge is needed to understand proverbs?', answer: 'cultural knowledge, not just language knowledge', explanation: 'The passage says understanding them "requires cultural knowledge, not just language knowledge".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'Every cloud has a silver lining — even this setback has taught us something valuable.', focus: 'proverb rhythm — natural, unhurried pace' },
          { type: 'listen_write', text: 'Don\'t count your chickens — we still have three rounds left.', focus: 'shortened proverb — casual, conversational' },
          { type: 'repeat', text: 'The writing is on the wall — it\'s time to rethink the entire strategy.', focus: '"writing on the wall" — serious, deliberate delivery' },
          { type: 'listen_write', text: 'Actions speak louder than words — show me, don\'t tell me.', focus: 'proverb + imperative — direct, emphatic' },
          { type: 'repeat', text: 'As Shakespeare put it: "All that glitters is not gold."', focus: 'literary quotation — measured, slightly elevated register' },
          { type: 'listen_write', text: 'The early bird catches the worm — and she was always first in the office.', focus: 'proverb + narrative application' },
          { type: 'repeat', text: 'Don\'t judge a book by its cover — he turned out to be remarkably talented.', focus: 'proverb + result clause' },
          { type: 'listen_write', text: 'It\'s a Pyrrhic victory — we won the battle but lost the war.', focus: '"Pyrrhic victory" — classical allusion, formal' },
          { type: 'repeat', text: 'Actions speak louder than words, and as every cloud has a silver lining, we should see this challenge as an opportunity to prove what we\'re capable of.', focus: 'two proverbs in sustained fluent speech' },
          { type: 'sentence_stress', text: 'Don\'t judge a book by its cover — appearances can be deeply misleading.', stressed_word: 'deeply', focus: 'intensifier "deeply" reinforces the proverb\'s message — stressed' },
        ],
      },
      {
        title: 'Advanced word formation',
        grammar: [
          { type: 'multiple_choice', sentence: 'Her _____ (predict) ability to anticipate problems impressed the board.', answer: 'uncanny', options: ['uncanny', 'unpredictable', 'unpredicted'], explanation: '"Uncanny" = strangely accurate or beyond what is normal. It modifies "ability".' },
          { type: 'word_bank', sentence: 'The plan was completely _____ — no one had anticipated such a move.', answer: 'unprecedented', choices: ['unprecedented', 'unpresented', 'unexpected', 'unconsidered'], explanation: '"Unprecedented" = never happened or existed before — an important C2 vocabulary item.' },
          { type: 'fill_gap', sentence: 'The merger led to significant _____ (restructure) of the entire organisation.', answer: 'restructuring', hint: 'Verb → noun form', explanation: '"Restructuring" — the gerund/noun form of "restructure"; a common nominalised form in business English.' },
          { type: 'fix_error', sentence: 'The policy was largely ineffect due to poor implementation.', answer: 'The policy was largely ineffective due to poor implementation.', hint: '"Ineffect" is not a word — the correct adjective is "ineffective"', explanation: '"Ineffective" = not producing the desired effect. "Ineffect" does not exist as a word.' },
          { type: 'read_answer', passage: 'Word formation in English involves prefixes, suffixes and compounding. Key prefixes: "un-" (undo), "mis-" (misunderstand), "dis-" (disagree), "over-" (overestimate), "under-" (underperform), "re-" (restructure). Key suffixes: "-tion/-sion" (action), "-ity" (clarity), "-ness" (awareness), "-ment" (achievement), "-ise/-ize" (prioritise), "-ous" (prestigious). Compound adjectives: "thought-provoking", "ground-breaking", "far-reaching", "well-established". C2 learners use these productively and accurately.', question: 'Name three compound adjectives mentioned in the passage.', answer: 'thought-provoking, ground-breaking, far-reaching (also: well-established)', explanation: 'The passage lists "thought-provoking", "ground-breaking", "far-reaching" and "well-established".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'This is a truly ground-breaking development in the field.', focus: '"ground-breaking" — compound adjective stress on first element' },
          { type: 'listen_write', text: 'The decision had far-reaching consequences for the entire sector.', focus: '"far-reaching" — compound adjective rhythm' },
          { type: 'repeat', text: 'Her thought-provoking analysis challenged assumptions we had held for years.', focus: '"thought-provoking" — three-syllable compound, clear articulation' },
          { type: 'listen_write', text: 'The unprecedented scale of the crisis demanded an immediate response.', focus: '"unprecedented" — five syllables, stress on second: un-PREC-e-den-ted' },
          { type: 'repeat', text: 'The restructuring of the division was handled with remarkable efficiency.', focus: '"restructuring" — gerund as noun, formal register' },
          { type: 'listen_write', text: 'A well-established body of evidence supports this conclusion.', focus: '"well-established" — compound adjective before noun, even stress' },
          { type: 'repeat', text: 'The mismanagement of resources led to a complete breakdown of trust.', focus: '"mismanagement" — prefix "mis-" + stress pattern' },
          { type: 'listen_write', text: 'Her overconfidence ultimately proved to be her greatest weakness.', focus: '"overconfidence" — "over-" prefix, nominalisation' },
          { type: 'repeat', text: 'This ground-breaking and far-reaching proposal represents an unprecedented opportunity to fundamentally restructure the way we approach the issue.', focus: 'multiple word formation types in one formal sentence' },
          { type: 'sentence_stress', text: 'The underperformance of the team was directly attributable to poor planning.', stressed_word: 'underperformance', focus: '"underperformance" — compound noun in subject position, nuclear stress' },
        ],
      },
      {
        title: 'Irony, understatement & hyperbole',
        grammar: [
          { type: 'multiple_choice', sentence: '"That went well," she said after the disastrous presentation. This is an example of _____.', answer: 'irony', options: ['irony', 'understatement', 'hyperbole'], explanation: 'Irony = saying the opposite of what you mean. The presentation was disastrous, but she says "well".' },
          { type: 'word_bank', sentence: '"It was not exactly our finest hour," said the manager after losing by 10 goals. This is _____.', answer: 'understatement', choices: ['understatement', 'irony', 'hyperbole', 'litotes'], explanation: 'Understatement = expressing something as less than it is. "Not exactly our finest hour" is a massive understatement.' },
          { type: 'fill_gap', sentence: '"I\'ve told you a _____ times!" — using "million" exaggerates for effect.', answer: 'million', hint: 'An exaggerated large number = hyperbole', explanation: '"A million times" is hyperbole — deliberate exaggeration for emphasis.' },
          { type: 'fix_error', sentence: '"It\'s not the worst idea ever" is a form of overstatement.', answer: '"It\'s not the worst idea ever" is a form of understatement (or litotes).', hint: '"Not the worst" = double negative = saying something positive minimally', explanation: '"Not the worst idea ever" uses a double negative to express moderate approval — this is litotes (a type of understatement), not overstatement.' },
          { type: 'read_answer', passage: 'Irony, understatement and hyperbole are rhetorical devices central to native English humour, criticism and persuasion. Irony says the opposite of what is meant: "What a brilliant idea" (when it is terrible). Understatement deliberately minimises: "It was a bit unfortunate" (for a disaster). Hyperbole deliberately exaggerates: "I\'ve been waiting for an eternity." Litotes is understatement using double negatives: "Not bad at all" = good. Mastery of these devices is a key C2 marker.', question: 'What is litotes?', answer: 'understatement using double negatives', explanation: 'The passage defines litotes as "understatement using double negatives".' },
        ],
        pronunciation: [
          { type: 'repeat', text: '"That went well," she said with a straight face.', focus: 'irony — flat, deadpan delivery; stress on "well" with falling tone' },
          { type: 'listen_write', text: 'It was not exactly our finest hour — we lost by four goals.', focus: 'understatement — dry, measured delivery' },
          { type: 'repeat', text: 'I\'ve told you a million times — please don\'t do that.', focus: 'hyperbole — slightly exaggerated, frustrated tone' },
          { type: 'listen_write', text: 'The results were, shall we say, less than impressive.', focus: 'understatement with hedging — raised eyebrow intonation' },
          { type: 'repeat', text: 'Brilliant — absolutely brilliant. That\'s the worst plan I\'ve ever heard.', focus: 'heavy irony — contrast between words and meaning' },
          { type: 'listen_write', text: 'She\'s not entirely without talent — she can be surprisingly effective.', focus: 'litotes — double negative praise, measured tone' },
          { type: 'repeat', text: 'I\'m absolutely starving — I haven\'t eaten since this morning.', focus: 'casual hyperbole — natural, energetic delivery' },
          { type: 'listen_write', text: 'He was, one might say, a tad overenthusiastic about the proposal.', focus: 'understatement + hedging = sophisticated British irony' },
          { type: 'repeat', text: '"So the meeting went well?" "Brilliantly — half the team walked out and no agreement was reached." This is sarcasm deployed through understatement and irony.', focus: 'irony + understatement in dialogue — natural native speed' },
          { type: 'sentence_stress', text: 'Not bad at all — in fact, I think it\'s rather impressive.', stressed_word: 'rather', focus: '"rather" as a litotes intensifier — British understatement stress' },
        ],
      },
      {
        title: 'Authentic text analysis — register & style',
        grammar: [
          { type: 'multiple_choice', sentence: 'A text that uses passive voice, nominalisation and hedging is most likely _____ in register.', answer: 'academic', options: ['academic', 'informal', 'journalistic'], explanation: 'Academic writing is characterised by passive voice, nominalisation, and hedging to create an objective, formal tone.' },
          { type: 'word_bank', sentence: '"The probe has _____ yet another cover-up" — this comes from a _____ article.', answer: 'uncovered / tabloid', choices: ['uncovered', 'revealed', 'tabloid', 'academic', 'emotive'], explanation: '"The probe has uncovered" + "yet another cover-up" uses dramatic, emotive language typical of tabloid journalism.' },
          { type: 'fill_gap', sentence: 'A text that uses contractions, slang and first person throughout is written in _____ register.', answer: 'informal', hint: 'Contractions + slang + first person', explanation: 'Informal register uses contractions ("I\'ve"), slang and frequent first-person references.' },
          { type: 'fix_error', sentence: 'The use of short, punchy sentences and emotional language are characteristics of academic writing.', answer: 'The use of short, punchy sentences and emotional language are characteristics of tabloid journalism.', hint: 'These features are typical of popular journalism, not academic writing', explanation: '"Short, punchy sentences" and "emotional language" are features of tabloid/popular journalism — not academic writing.' },
          { type: 'read_answer', passage: 'Analysing register means identifying the choices a writer makes about vocabulary, syntax, tone and purpose. Academic writing: passive, hedging, nominalisation, technical vocabulary. Broadsheet journalism: formal but accessible, neutral tone, complex sentences. Tabloid journalism: short sentences, emotive vocabulary, sensationalism. Literary prose: figurative language, rhythm, ambiguity. Legal writing: precise, formulaic, passive. Being able to identify and imitate these styles is a key C2 skill.', question: 'What distinguishes broadsheet journalism from tabloid journalism?', answer: 'broadsheet is formal, neutral, complex; tabloid is emotive, short sentences, sensational', explanation: 'The passage describes broadsheet as "formal but accessible, neutral tone, complex sentences" and tabloid as "short sentences, emotive vocabulary, sensationalism".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'The investigation has revealed a pattern of systematic mismanagement. (broadsheet)', focus: 'formal journalistic delivery — neutral, measured, authoritative' },
          { type: 'listen_write', text: 'SHOCK PROBE UNCOVERS YET ANOTHER COVER-UP! (tabloid style — read aloud)', focus: 'tabloid style — emphatic, dramatic stress pattern' },
          { type: 'repeat', text: 'It would appear that the implementation of the new framework has yielded mixed results. (academic)', focus: 'academic register — hedging, formal pacing' },
          { type: 'listen_write', text: 'I\'m telling you, this whole thing\'s an absolute disaster. (informal)', focus: 'informal register — contracted, fast, emotional' },
          { type: 'repeat', text: 'The party hereinafter referred to as the Purchaser shall bear all costs. (legal)', focus: 'legal register — formulaic, slow and deliberate' },
          { type: 'listen_write', text: 'She stood at the edge, the wind pulling at her coat, wondering if she had the courage to go back. (literary)', focus: 'literary prose — evocative, rhythmic, varied pace' },
          { type: 'repeat', text: 'Pursuant to the terms of the agreement, all parties hereby consent to arbitration. (formal/legal)', focus: 'legal formulaic language — even, precise delivery' },
          { type: 'listen_write', text: 'The evidence strongly suggests that immediate regulatory intervention is warranted. (academic)', focus: 'academic register — hedging + recommendation' },
          { type: 'repeat', text: 'The data, whilst indicative of a positive trend, must be interpreted with caution, as the sample size remains insufficient to permit definitive conclusions.', focus: 'full academic sentence — C2 register fluency' },
          { type: 'sentence_stress', text: 'The register you choose says as much about you as the words themselves.', stressed_word: 'choose', focus: '"choose" emphasises agency in register selection — active stress' },
        ],
      },
      {
        title: 'Lexical density & precision',
        grammar: [
          { type: 'multiple_choice', sentence: 'Which is more lexically dense? A: "We got a lot of good results." B: "The intervention produced significant and consistent improvements."', answer: 'B', options: ['A', 'B', 'same'], explanation: 'Option B uses precise academic vocabulary ("intervention", "significant", "consistent", "improvements") — higher lexical density.' },
          { type: 'word_bank', sentence: 'The report _____ the key findings of the three-year longitudinal study.', answer: 'summarises', choices: ['summarises', 'talks about', 'goes over', 'mentions'], explanation: '"Summarises" is precise and formal — more lexically dense than "talks about" or "goes over".' },
          { type: 'fill_gap', sentence: 'She gave a _____ (concise + clear) explanation of a very complex topic.', answer: 'lucid', hint: 'One formal adjective meaning "clear and easy to understand"', explanation: '"Lucid" = clear and easy to understand — precise formal vocabulary.' },
          { type: 'fix_error', sentence: 'The thing about the plan is that it is not good because of too many problems.', answer: 'The plan is fundamentally flawed due to a multitude of inherent problems.', hint: 'Use precise vocabulary — avoid vague language', explanation: '"Fundamentally flawed due to a multitude of inherent problems" replaces vague language with precise, lexically dense alternatives.' },
          { type: 'read_answer', passage: 'Lexical density refers to the ratio of content words (nouns, verbs, adjectives, adverbs) to total words. Academic texts have high lexical density; casual speech has lower density. Precision means choosing the exact word for the exact meaning: "lucid" not "clear", "deteriorate" not "get worse", "alleviate" not "help with", "commence" not "start". C2 writers select vocabulary for both accuracy and register, using a wide range to avoid repetition and express subtle distinctions.', question: 'What is lexical density?', answer: 'the ratio of content words to total words', explanation: 'The passage defines it as "the ratio of content words (nouns, verbs, adjectives, adverbs) to total words".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'The intervention produced significant and measurable improvements across all indicators.', focus: 'high lexical density — precise academic vocabulary, measured pacing' },
          { type: 'listen_write', text: 'Her lucid explanation made a highly complex concept immediately accessible.', focus: '"lucid" — formal adjective, clear articulation' },
          { type: 'repeat', text: 'The situation has deteriorated significantly since the last assessment.', focus: '"deteriorated" — precise verb, formal, natural' },
          { type: 'listen_write', text: 'The measures taken have done little to alleviate the underlying structural issues.', focus: '"alleviate the underlying structural issues" — academic phrase flow' },
          { type: 'repeat', text: 'The proceedings will commence at precisely nine o\'clock tomorrow morning.', focus: '"commence" — formal register, precise delivery' },
          { type: 'listen_write', text: 'This document constitutes the entire agreement between the parties.', focus: '"constitutes" — legal/formal verb precision' },
          { type: 'repeat', text: 'The nuanced distinction between these two concepts is often overlooked by students.', focus: '"nuanced distinction" — dense academic noun phrase' },
          { type: 'listen_write', text: 'A comprehensive and rigorous evaluation of the programme is now overdue.', focus: '"comprehensive and rigorous evaluation" — dense noun phrase' },
          { type: 'repeat', text: 'The initiative has yielded demonstrably positive outcomes in terms of both efficiency and stakeholder satisfaction, notwithstanding certain implementation challenges.', focus: 'maximum lexical density — C2 academic production' },
          { type: 'sentence_stress', text: 'The distinction between "reduce" and "alleviate" is subtle but significant.', stressed_word: 'subtle', focus: '"subtle" describing the distinction — precision in vocabulary carries stress' },
        ],
      },
      {
        title: 'Coherence in long-form production',
        grammar: [
          { type: 'multiple_choice', sentence: 'Which device creates cohesion? A: using the same word repeatedly B: using synonyms and pronouns to refer back C: starting every sentence with "Also"', answer: 'B', options: ['A', 'B', 'C'], explanation: 'Synonyms and reference pronouns create cohesion by linking ideas without repetition. Over-relying on "Also" is poor style.' },
          { type: 'word_bank', sentence: 'The research team published their findings. _____ paper attracted international attention.', answer: 'The', choices: ['The', 'This', 'Their', 'One'], explanation: '"This paper" or "The paper" — anaphoric reference (referring back to "findings") creates cohesion.' },
          { type: 'fill_gap', sentence: 'The experiment failed to produce the expected results. _____ (this fact), the team decided to redesign the protocol.', answer: 'In light of this', hint: 'A phrase linking cause to consequence', explanation: '"In light of this" = given this fact — a cohesive device linking consequence to cause.' },
          { type: 'fix_error', sentence: 'First, the company expanded. Secondly, the company hired new staff. Thirdly, the company opened new offices. This is repetitive.', answer: 'First, the company expanded. It then hired new staff before opening new offices across the country.', hint: 'Use pronouns and varied connectors to avoid repetition', explanation: 'Replace "the company" with "It" and restructure to avoid repetition — cohesion requires reference variation.' },
          { type: 'read_answer', passage: 'Coherence in long-form writing depends on: clear topic sentences, logical paragraph order, cohesive devices (pronouns, synonyms, demonstratives, discourse markers), consistent register and avoiding redundancy. A coherent text guides the reader effortlessly through the argument. C2 writers plan their texts, use varied sentence structures, control pacing, and ensure that each paragraph relates clearly to the overall thesis.', question: 'What does C2 coherence require beyond grammar?', answer: 'planning, varied structure, pacing, and clear relation of each paragraph to the thesis', explanation: 'The passage says C2 writers "plan their texts, use varied sentence structures, control pacing, and ensure that each paragraph relates clearly to the overall thesis".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'The findings were surprising. In light of this, the team revised their entire approach.', focus: '"In light of this" — cohesive connector, natural pause' },
          { type: 'listen_write', text: 'The policy was introduced in 2020. Since then, it has been revised on three separate occasions.', focus: '"Since then" — time reference connector, anaphora' },
          { type: 'repeat', text: 'The company expanded rapidly. This growth, however, came at a considerable cost.', focus: '"This growth" — demonstrative reference, concessive contrast' },
          { type: 'listen_write', text: 'The argument is compelling. Nevertheless, several questions remain unanswered.', focus: '"Nevertheless" — concession connector, deliberate pacing' },
          { type: 'repeat', text: 'What emerges from this analysis is a need for urgent and sustained investment.', focus: '"What emerges" — what-cleft summary statement' },
          { type: 'listen_write', text: 'To summarise: the evidence supports the hypothesis, but further research is essential.', focus: '"To summarise" — topic closer, deliberate falling intonation' },
          { type: 'repeat', text: 'The former strategy prioritised speed; the latter focused on quality. Both have merit.', focus: '"former / latter" — anaphoric contrast pair' },
          { type: 'listen_write', text: 'These findings, taken together, point to a clear and consistent pattern.', focus: '"taken together" — additive phrase, formal register' },
          { type: 'repeat', text: 'The data strongly suggests that the intervention was effective. This conclusion, however, must be tempered by the limitations of the study design, which are discussed in the following section.', focus: 'two-sentence academic discourse — cohesion, hedging, forward reference' },
          { type: 'sentence_stress', text: 'What the evidence ultimately reveals is a more complex picture than previously assumed.', stressed_word: 'ultimately', focus: '"ultimately" emphasises the conclusion — receives stress before the what-cleft payload' },
        ],
      },
      {
        title: 'Spoken grammar — features of fluent speech',
        grammar: [
          { type: 'multiple_choice', sentence: 'Which feature is typical of fluent spoken English? A: "I am going to go to the shops." B: "I\'m gonna pop to the shops." C: "I shall proceed to the retail establishment."', answer: 'B', options: ['A', 'B', 'C'], explanation: 'Fluent informal spoken English uses contractions ("I\'m"), informal vocabulary ("pop") and reduced forms ("gonna").' },
          { type: 'word_bank', sentence: '"You know what, I was going to say something, but, you know, it\'s kind of irrelevant now." The underlined phrases are _____.', answer: 'fillers', choices: ['fillers', 'discourse markers', 'hedges', 'errors'], explanation: '"You know what", "you know" and "kind of" are fillers — used to fill pauses and maintain conversational flow.' },
          { type: 'fill_gap', sentence: '"The thing is, right, I had no idea that was going to happen." "The thing is, right" is a _____ used to introduce a key point.', answer: 'discourse marker', hint: 'A conversational phrase that signals what is coming', explanation: '"The thing is" = conversational discourse marker introducing an important point. "Right" adds informality.' },
          { type: 'fix_error', sentence: 'In a job interview, you should say: "Yeah, so basically I\'m like really into my work, you know?"', answer: 'In a job interview, you should say: "I am genuinely passionate about my work and committed to professional development."', hint: 'Spoken features are inappropriate in formal contexts', explanation: 'Fillers like "yeah", "basically", "like" and "you know" are inappropriate in formal professional contexts.' },
          { type: 'read_answer', passage: 'Fluent spoken English has features that differ significantly from written grammar. These include: reduced forms and contractions (gonna, wanna, I\'d), fillers (you know, I mean, sort of, like, basically), discourse markers (anyway, right, so, the thing is), ellipsis (Coming? for Are you coming?), tails (It\'s good, this place), and vague language (stuff, things, whatever). C2 speakers are able to use these naturally in informal contexts while switching to formal grammar when required.', question: 'What does "ellipsis" mean in spoken grammar?', answer: 'leaving out words understood from context (e.g. "Coming?" instead of "Are you coming?")', explanation: 'The passage gives the example: "Coming? for Are you coming?" — ellipsis omits the subject and auxiliary.' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'I\'m gonna pop to the shops — won\'t be long.', focus: '"gonna" + "won\'t" — natural informal reduction' },
          { type: 'listen_write', text: 'You know, the thing is, I\'m not sure it\'s the right time for this.', focus: 'fillers + discourse marker — natural conversational rhythm' },
          { type: 'repeat', text: 'So basically what happened was, she called me at like midnight, right?', focus: 'spoken narrative features — fillers, informal delivery' },
          { type: 'listen_write', text: 'I\'d love to, but, I mean, it\'s a bit tricky at the moment.', focus: '"I\'d love to" + ellipsis + filler — regret register' },
          { type: 'repeat', text: 'Right, so where were we? Oh yeah — the deadline.', focus: '"Right, so" — discourse marker, returning to topic' },
          { type: 'listen_write', text: 'She\'s really good at that sort of thing, actually.', focus: '"sort of thing", "actually" — vague language + tail' },
          { type: 'repeat', text: 'It\'s a great place, this restaurant. We should come back.', focus: 'tail construction — "this restaurant" after predicate' },
          { type: 'listen_write', text: 'I mean, it\'s not the end of the world, is it?', focus: '"I mean" + tag question — conversational reassurance' },
          { type: 'repeat', text: 'So basically, the thing is, I tried to explain it — you know, in a way that made sense — but, honestly, I\'m not sure it landed.', focus: 'dense spoken grammar features — maximum natural fluency' },
          { type: 'sentence_stress', text: 'It\'s good, this idea — really good, actually.', stressed_word: 'really', focus: '"really" as spoken intensifier — receives emphatic stress in tails and informal speech' },
        ],
      },
      {
        title: 'Modal verbs — C2 nuance & stylistic use',
        grammar: [
          { type: 'multiple_choice', sentence: '"Will you stop doing that!" Here "will" expresses _____.', answer: 'annoyance at a habit', options: ['annoyance at a habit', 'a future intention', 'a polite request'], explanation: '"Will you stop doing that!" uses "will" to express irritation at a repeated behaviour, not future or politeness.' },
          { type: 'word_bank', sentence: 'He _____ spend hours staring out of the window as a child.', answer: 'would', choices: ['would', 'could', 'used to', 'should'], explanation: '"Would" (for habit/character): "He would spend hours…" — a characteristic past behaviour, often with affection or nostalgia.' },
          { type: 'fill_gap', sentence: 'You _____ (may as well) come — there\'s nothing else to do.', answer: 'may as well', hint: '"May as well" = there is no reason not to', explanation: '"May as well" = there is no strong reason not to do something — a nuanced modal expression.' },
          { type: 'fix_error', sentence: 'She shall have been informed of the decision. (incorrect use)', answer: 'She should have been informed of the decision.', hint: '"Shall have" is not used for past obligation/criticism', explanation: '"Should have been informed" = past obligation not fulfilled. "Shall have" is not the correct form here.' },
          { type: 'read_answer', passage: 'At C2, modal verbs are used for stylistic effect beyond their basic meanings. "Will" expresses: certainty (That will be the postman), habit (He will always arrive late), irritation (She will leave her keys everywhere). "Would" expresses: characteristic behaviour (She would sit by the window), soft requests (Would you mind?), past refusal (He wouldn\'t speak to anyone). "May" and "might" in formal contexts signal highly tentative possibility. Mastery means choosing modals not just for grammar but for register and nuance.', question: 'What does "will" express in "He will always arrive late"?', answer: 'a habit (often irritating)', explanation: 'The passage explains "will" for "habit (He will always arrive late)".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'That will be the delivery — I\'ll get it.', focus: '"will" for certainty — falling declarative intonation' },
          { type: 'listen_write', text: 'She would just sit and read for hours on end — it was wonderful.', focus: '"would" for nostalgic past habit — warm, reflective tone' },
          { type: 'repeat', text: 'Will you please stop interrupting? I\'m trying to concentrate.', focus: '"will you stop" — annoyance intonation — rising then falling sharply' },
          { type: 'listen_write', text: 'You may as well come along — we\'ll have more fun with you there.', focus: '"may as well" — casual suggestion, warm tone' },
          { type: 'repeat', text: 'He wouldn\'t say a word to anyone after the argument — for days.', focus: '"wouldn\'t" — past refusal, stubborn emphasis' },
          { type: 'listen_write', text: 'Would you happen to know where I might find a good coffee around here?', focus: '"would you happen to" + "might" — double politeness hedging' },
          { type: 'repeat', text: 'She might conceivably have made a different choice under different circumstances.', focus: '"might conceivably" — maximum hedging + modal' },
          { type: 'listen_write', text: 'That should have been flagged at the very first review meeting.', focus: '"should have been" — passive past criticism' },
          { type: 'repeat', text: 'She would always know exactly what to say — and would say it at precisely the right moment. Will was something she simply had.', focus: '"would" for character description — literary nostalgic register' },
          { type: 'sentence_stress', text: 'You might just find that this is exactly what you\'ve been looking for.', stressed_word: 'just', focus: '"just" as a tentative softener — carries light but meaningful stress' },
        ],
      },
      {
        title: 'Passive & impersonal structures — C2 mastery',
        grammar: [
          { type: 'multiple_choice', sentence: 'It _____ that the merger had been planned for years.', answer: 'transpired', options: ['transpired', 'is said', 'appeared'], explanation: '"It transpired that" = it came to light / was discovered — a formal impersonal structure.' },
          { type: 'word_bank', sentence: 'The decision is _____ to have been taken at the highest level.', answer: 'understood', choices: ['understood', 'known', 'believed', 'thought'], explanation: '"Is understood to have been taken" — personal passive with perfect infinitive for distant formal reporting.' },
          { type: 'fill_gap', sentence: 'Much _____ (make) of the prime minister\'s surprise resignation.', answer: 'has been made', hint: 'Impersonal passive: "much has been made of"', explanation: '"Much has been made of" = people have greatly discussed — an impersonal passive structure.' },
          { type: 'fix_error', sentence: 'It was took for granted that the project would succeed.', answer: 'It was taken for granted that the project would succeed.', hint: '"Take for granted" — past participle is "taken"', explanation: '"Taken for granted" — the past participle of "take" is "taken", not "took".' },
          { type: 'read_answer', passage: 'C2 passive mastery includes a range of impersonal and complex structures. "It transpired that…" (it emerged). "It has emerged that…" (recently discovered). "It is widely held that…" (general belief). "Much has been made of…" (greatly discussed). "It remains to be seen whether…" (future uncertainty). "The issue has been glossed over…" (avoided superficially). "She is reported to have left the country." These structures give writing authority, distance and precision typical of the highest levels of English.', question: 'What does "it remains to be seen whether" express?', answer: 'future uncertainty', explanation: 'The passage defines it as expressing "future uncertainty".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'It transpired that the documents had been altered before submission.', focus: '"It transpired that" — formal revelatory structure, falling intonation' },
          { type: 'listen_write', text: 'The decision is understood to have been made under considerable pressure.', focus: '"is understood to have been made" — complex passive, measured' },
          { type: 'repeat', text: 'Much has been made of the apparent contradictions in her testimony.', focus: '"Much has been made of" — impersonal passive, formal' },
          { type: 'listen_write', text: 'It remains to be seen whether the new policy will achieve its intended effects.', focus: '"It remains to be seen" — formal uncertainty hedge' },
          { type: 'repeat', text: 'She is reported to have resigned from her position late last night.', focus: '"is reported to have" — journalistic personal passive' },
          { type: 'listen_write', text: 'It is widely held that a diverse workforce leads to greater innovation.', focus: '"It is widely held that" — formal general belief structure' },
          { type: 'repeat', text: 'The issue has been repeatedly glossed over in previous administrations.', focus: '"glossed over" — phrasal verb in passive, formal criticism' },
          { type: 'listen_write', text: 'It has emerged that the company was aware of the risks months in advance.', focus: '"It has emerged that" — recent discovery, journalistic' },
          { type: 'repeat', text: 'It transpired that the agreement, which had long been held to be legally binding, had in fact never been formally ratified by all parties.', focus: 'complex impersonal passive — extended C2 formal sentence' },
          { type: 'sentence_stress', text: 'It remains to be seen whether the measures taken will prove sufficient.', stressed_word: 'remains', focus: '"remains" carries the epistemic uncertainty — primary nuclear stress' },
        ],
      },
      {
        title: 'Advanced Final Review',
        grammar: [
          { type: 'multiple_choice', sentence: 'So _____ the response that the organisers extended the registration deadline.', answer: 'overwhelming was', options: ['overwhelming was', 'was overwhelming', 'overwhelmed was'], explanation: '"So overwhelming was the response" — emphatic inversion after "so + adjective".' },
          { type: 'word_bank', sentence: '_____ it from me to criticise, but this plan requires significant revision.', answer: 'Far be', choices: ['Far be', 'Far is', 'Far was', 'Far has been'], explanation: '"Far be it from me to…" — formulaic subjunctive expressing reluctance to criticise.' },
          { type: 'fill_gap', sentence: 'The proposal, _____ (admittedly) ambitious, represents the boldest step we have taken in years.', answer: 'admittedly', hint: 'Concession adverb within the clause', explanation: '"Admittedly ambitious" — "admittedly" inserted as a concession within the sentence.' },
          { type: 'fix_error', sentence: 'Having been completed the survey, the findings were analysed by the team.', answer: 'Having completed the survey, the team analysed the findings.', hint: 'Participle clause subject must match main clause', explanation: '"Having completed the survey, the team analysed…" — the participle and main clause must share the same subject.' },
          { type: 'read_answer', passage: 'C2 is the highest level of English on the Common European Framework of Reference (CEFR). At this level, a speaker can express themselves spontaneously, fluently and precisely, differentiating finer shades of meaning even in the most complex situations. This final review has integrated inversion, subjunctive, impersonal passives, conditionals, modal nuance, spoken grammar, word formation, rhetorical devices, lexical density and discourse coherence — the complete system of advanced English. Congratulations on reaching this level.', question: 'What can a C2 speaker do according to the CEFR?', answer: 'express themselves spontaneously, fluently and precisely, differentiating finer shades of meaning', explanation: 'The passage states C2 speakers can "express themselves spontaneously, fluently and precisely, differentiating finer shades of meaning".' },
        ],
        pronunciation: [
          { type: 'repeat', text: 'So overwhelming was the response that the event was extended by popular demand.', focus: 'emphatic inversion — "So overwhelming was" — climactic delivery' },
          { type: 'listen_write', text: 'Far be it from me to suggest otherwise, but the figures do not add up.', focus: '"Far be it from me" — polite but firm, formal register' },
          { type: 'repeat', text: 'Having reviewed all the evidence, the panel reached a clear and unanimous conclusion.', focus: 'perfect participle opener — formal, deliberate' },
          { type: 'listen_write', text: 'Admittedly complex, the proposal nevertheless represents a significant step forward.', focus: '"Admittedly" + concession — mid-register academic tone' },
          { type: 'repeat', text: 'It transpired that the original plan, however well-intentioned, was fundamentally flawed.', focus: 'impersonal passive + concession — complex formal sentence' },
          { type: 'listen_write', text: 'Much as I admire her work, I cannot in good conscience endorse this particular approach.', focus: '"Much as I admire" — polite disagreement, formal' },
          { type: 'repeat', text: 'Were this evidence to be disregarded, the entire argument would collapse.', focus: '"Were this to be" — formal inverted conditional, measured' },
          { type: 'listen_write', text: 'Such is the complexity of the issue that no single solution could ever suffice.', focus: '"Such is the complexity" — emphatic inversion, formal conclusion' },
          { type: 'repeat', text: 'So profound has been the impact of this research that it has fundamentally changed the way we understand the relationship between language, thought and identity.', focus: 'C2 synthesis sentence — inversion, perfect, complexity — maximum fluency' },
          { type: 'sentence_stress', text: 'What this journey has demonstrated, above all, is that mastery is never final — it is always becoming.', stressed_word: 'becoming', focus: '"becoming" as the final word — philosophical, open-ended — receives maximum emphasis' },
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CURRICULUM export
// ─────────────────────────────────────────────────────────────────────────────

export const CURRICULUM: Record<TrailLevel, Module[]> = {
  Novice:   NOVICE_MODULES,
  Inter:    INTER_MODULES,
  Advanced: ADVANCED_MODULES,
};

// ── Helper: grammar quota per level ─────────────────────────────────────────
export const GRAMMAR_QUOTA: Record<TrailLevel, number> = {
  Novice:   10,
  Inter:    10,
  Advanced: 5,
};

// ── Helper: pron quota per level ─────────────────────────────────────────────
export const PRON_QUOTA: Record<TrailLevel, number> = {
  Novice:   0,
  Inter:    5,
  Advanced: 10,
};

// ── Helper: get topic safely ──────────────────────────────────────────────────
export function getTopic(level: TrailLevel, moduleIdx: number, topicIdx: number): Topic | null {
  const mod = CURRICULUM[level]?.[moduleIdx];
  if (!mod) return null;
  return mod.topics[topicIdx] ?? null;
}

// ── Helper: total topics across all modules ───────────────────────────────────
export function totalTopics(level: TrailLevel): number {
  return CURRICULUM[level].reduce((acc, mod) => acc + mod.topics.length, 0);
}

// ── Helper: topic has content ────────────────────────────────────────────────
export function topicHasContent(level: TrailLevel, moduleIdx: number, topicIdx: number): boolean {
  const topic = getTopic(level, moduleIdx, topicIdx);
  if (!topic) return false;
  return topic.grammar.length > 0 || topic.pronunciation.length > 0;
}
