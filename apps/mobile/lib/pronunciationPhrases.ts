// Frases de pronunciation hardcoded por nível. Foco em:
// - Novice: vocabulário de sobrevivência (greetings, intro, comida, dia-a-dia).
//   Frases curtas (3-7 palavras), sons-âncora claros.
// - Inter: estrutura completa, contexto cotidiano (trabalho, estudos, planos).
// - Advanced: nuances, intonação, conectivos, expressões idiomáticas.
//
// Sorteio sem repetição imediata via SecureStore (last_phrase_id_${level}).

export type PronunciationLevel = 'Novice' | 'Inter' | 'Advanced';

export interface PronunciationPhrase {
  id:   string;
  text: string;
  hint?: string;        // opcional, em PT pra Novice
}

export const PRONUNCIATION_PHRASES: Record<PronunciationLevel, PronunciationPhrase[]> = {
  Novice: [
    // Cumprimentos / apresentação
    { id: 'n01', text: 'Hello, how are you?',           hint: 'Olá, como você está?' },
    { id: 'n02', text: 'My name is Felipe.',            hint: 'Meu nome é Felipe.' },
    { id: 'n03', text: 'Nice to meet you.',             hint: 'Prazer em conhecer você.' },
    { id: 'n04', text: 'I am from Brazil.',             hint: 'Eu sou do Brasil.' },
    { id: 'n05', text: 'I live in São Paulo.',          hint: 'Eu moro em São Paulo.' },
    { id: 'n06', text: 'Good morning, everyone.',       hint: 'Bom dia, pessoal.' },
    { id: 'n07', text: 'See you tomorrow.',             hint: 'Até amanhã.' },
    { id: 'n08', text: 'Have a great day.',             hint: 'Tenha um ótimo dia.' },

    // Comida / dia-a-dia
    { id: 'n09', text: 'I would like a coffee, please.',  hint: 'Eu gostaria de um café, por favor.' },
    { id: 'n10', text: 'The food is very good.',          hint: 'A comida está muito boa.' },
    { id: 'n11', text: 'Can I have the menu?',            hint: 'Posso ver o cardápio?' },
    { id: 'n12', text: 'I am hungry.',                    hint: 'Estou com fome.' },
    { id: 'n13', text: 'I drink water every day.',        hint: 'Eu bebo água todos os dias.' },

    // Família / vida
    { id: 'n14', text: 'I have two brothers.',            hint: 'Eu tenho dois irmãos.' },
    { id: 'n15', text: 'My family is big.',               hint: 'Minha família é grande.' },
    { id: 'n16', text: 'I love my dog.',                  hint: 'Eu amo meu cachorro.' },

    // Trabalho / estudos
    { id: 'n17', text: 'I work in an office.',            hint: 'Eu trabalho em um escritório.' },
    { id: 'n18', text: 'I study English every week.',     hint: 'Eu estudo inglês toda semana.' },
    { id: 'n19', text: 'I am a student.',                 hint: 'Eu sou estudante.' },

    // Tempo / clima
    { id: 'n20', text: 'It is sunny today.',              hint: 'Está ensolarado hoje.' },
    { id: 'n21', text: 'I like the rain.',                hint: 'Eu gosto da chuva.' },
    { id: 'n22', text: 'It is cold outside.',             hint: 'Está frio lá fora.' },

    // Sentimentos / preferências
    { id: 'n23', text: 'I am happy today.',               hint: 'Eu estou feliz hoje.' },
    { id: 'n24', text: 'I love music.',                   hint: 'Eu amo música.' },
    { id: 'n25', text: 'I want to learn English.',        hint: 'Eu quero aprender inglês.' },
    { id: 'n26', text: 'My favorite color is blue.',      hint: 'Minha cor favorita é azul.' },

    // Tempo / ação cotidiana
    { id: 'n27', text: 'What time is it?',                hint: 'Que horas são?' },
    { id: 'n28', text: 'I wake up at seven.',             hint: 'Eu acordo às sete.' },
    { id: 'n29', text: 'I go to bed at ten.',             hint: 'Eu vou dormir às dez.' },
    { id: 'n30', text: 'I read a book before sleeping.',  hint: 'Eu leio um livro antes de dormir.' },

    // Lugares
    { id: 'n31', text: 'I go to the park on Sundays.',    hint: 'Eu vou ao parque aos domingos.' },
    { id: 'n32', text: 'The store is near my house.',     hint: 'A loja é perto da minha casa.' },
    { id: 'n33', text: 'I take the bus to work.',         hint: 'Eu pego o ônibus para o trabalho.' },

    // Ajuda / pedidos
    { id: 'n34', text: 'Can you help me, please?',        hint: 'Você pode me ajudar, por favor?' },
    { id: 'n35', text: 'I do not understand.',            hint: 'Eu não entendo.' },
    { id: 'n36', text: 'Could you repeat that?',          hint: 'Você pode repetir?' },
    { id: 'n37', text: 'How do you say this in English?', hint: 'Como se diz isso em inglês?' },

    // Compras / dinheiro
    { id: 'n38', text: 'How much is this?',               hint: 'Quanto custa isso?' },
    { id: 'n39', text: 'I will pay with my card.',        hint: 'Eu vou pagar com meu cartão.' },

    // Hobbies / fim de semana
    { id: 'n40', text: 'I like to watch movies.',         hint: 'Eu gosto de assistir filmes.' },
    { id: 'n41', text: 'On weekends, I see my friends.',  hint: 'Nos fins de semana, eu vejo meus amigos.' },
    { id: 'n42', text: 'I play soccer on Saturdays.',     hint: 'Eu jogo futebol aos sábados.' },
    { id: 'n43', text: 'I love to travel.',               hint: 'Eu amo viajar.' },

    // Saúde / sentimentos
    { id: 'n44', text: 'I am a little tired.',            hint: 'Estou um pouco cansado.' },
    { id: 'n45', text: 'I feel great today.',             hint: 'Estou me sentindo ótimo hoje.' },

    // Sons-âncora frequentes pra brasileiros
    { id: 'n46', text: 'The thirsty thief thought twice.',         hint: 'TH inicial — som difícil.' },
    { id: 'n47', text: 'She sells seashells by the seashore.',     hint: 'Som de SH e S.' },
    { id: 'n48', text: 'Three free trees.',                        hint: 'TH vs TR vs FR.' },
    { id: 'n49', text: 'I would like a glass of water.',           hint: 'WOULD + LIKE + WATER.' },
    { id: 'n50', text: 'The weather is very nice.',                hint: 'WEATHER — TH final.' },
  ],

  Inter: [
    { id: 'i01', text: "I've been working from home for two years now." },
    { id: 'i02', text: "Could you tell me how to get to the nearest subway?" },
    { id: 'i03', text: "I usually grab a coffee on my way to the office." },
    { id: 'i04', text: "We're planning a trip to Argentina next month." },
    { id: 'i05', text: "I was supposed to call you yesterday. Sorry about that." },
    { id: 'i06', text: "She's been studying English for almost three years." },
    { id: 'i07', text: "I'd rather stay home tonight if that's okay." },
    { id: 'i08', text: "What did you think about the meeting this morning?" },
    { id: 'i09', text: "I have to finish this report before five o'clock." },
    { id: 'i10', text: "Let me know if you need anything else." },
    { id: 'i11', text: "I'm thinking about taking a course in design." },
    { id: 'i12', text: "She always remembers everyone's birthday." },
    { id: 'i13', text: "We had dinner at an Italian restaurant downtown." },
    { id: 'i14', text: "He's going to visit his parents this weekend." },
    { id: 'i15', text: "I haven't seen that movie yet, but I want to." },
    { id: 'i16', text: "The traffic was terrible on the way here." },
    { id: 'i17', text: "Do you mind if I ask you a personal question?" },
    { id: 'i18', text: "I'm trying to eat healthier and exercise more." },
    { id: 'i19', text: "We could meet up for lunch sometime next week." },
    { id: 'i20', text: "She gave me really good advice about my career." },
    { id: 'i21', text: "I forgot to bring my charger to the office." },
    { id: 'i22', text: "It's been raining all morning here in São Paulo." },
    { id: 'i23', text: "The presentation went better than I expected." },
    { id: 'i24', text: "I think we should leave a little earlier this time." },
    { id: 'i25', text: "He told me he's moving to a new apartment soon." },
    { id: 'i26', text: "I bought a new pair of shoes for the wedding." },
    { id: 'i27', text: "We've been friends since we were kids." },
    { id: 'i28', text: "Could you do me a favor and pick up some milk?" },
    { id: 'i29', text: "I really enjoyed the workshop you recommended." },
    { id: 'i30', text: "She speaks three languages fluently." },
    { id: 'i31', text: "I'm trying to learn how to cook Italian food." },
    { id: 'i32', text: "We should probably check the weather before going out." },
    { id: 'i33', text: "I haven't decided what I want to do tomorrow." },
    { id: 'i34', text: "The hotel had an amazing view of the beach." },
    { id: 'i35', text: "He's been really stressed out about the deadline." },
    { id: 'i36', text: "I prefer working in the morning when it's quiet." },
    { id: 'i37', text: "Can you give me a hand with these boxes?" },
    { id: 'i38', text: "We ended up staying at the party until midnight." },
    { id: 'i39', text: "I bumped into an old friend at the supermarket." },
    { id: 'i40', text: "She's expecting a baby in March." },
    { id: 'i41', text: "I've been meaning to call you for weeks." },
    { id: 'i42', text: "The new restaurant on the corner is really good." },
    { id: 'i43', text: "I had to wake up early to catch the flight." },
    { id: 'i44', text: "We're thinking about adopting a dog." },
    { id: 'i45', text: "She knows a lot about photography and design." },
    { id: 'i46', text: "I left my keys somewhere in the living room." },
    { id: 'i47', text: "He didn't show up for the meeting yesterday." },
    { id: 'i48', text: "We need to figure out the budget by Friday." },
    { id: 'i49', text: "I always forget to charge my phone overnight." },
    { id: 'i50', text: "Let's grab a beer after work this Friday." },
  ],

  Advanced: [
    { id: 'a01', text: "Honestly, I hadn't given it much thought until you brought it up." },
    { id: 'a02', text: "She has an uncanny ability to read between the lines." },
    { id: 'a03', text: "If I'd known about the deadline, I would've started earlier." },
    { id: 'a04', text: "The whole thing turned out to be a complete misunderstanding." },
    { id: 'a05', text: "I'm not entirely convinced that's the best approach." },
    { id: 'a06', text: "He has a tendency to overcomplicate even the simplest tasks." },
    { id: 'a07', text: "It's worth mentioning that the regulations have changed recently." },
    { id: 'a08', text: "She managed to pull off the presentation despite the technical issues." },
    { id: 'a09', text: "Looking back, I should've trusted my gut feeling on that one." },
    { id: 'a10', text: "The implications of this decision could be far-reaching." },
    { id: 'a11', text: "I tend to avoid those kinds of conversations whenever possible." },
    { id: 'a12', text: "It dawned on me that we'd been approaching the problem all wrong." },
    { id: 'a13', text: "Their feedback was constructive without being dismissive." },
    { id: 'a14', text: "There's a fine line between being thorough and being obsessive." },
    { id: 'a15', text: "I'd rather we hash this out now than let it linger." },
    { id: 'a16', text: "The negotiations dragged on for what felt like an eternity." },
    { id: 'a17', text: "She struck just the right balance between firm and approachable." },
    { id: 'a18', text: "I can't help but wonder if there's more to the story." },
    { id: 'a19', text: "He's notoriously difficult to pin down for a meeting." },
    { id: 'a20', text: "The whole concept hinges on a few key assumptions." },
    { id: 'a21', text: "It boils down to whether we're willing to take the risk." },
    { id: 'a22', text: "I'd appreciate it if you could give me a heads-up next time." },
    { id: 'a23', text: "Their argument falls apart under closer scrutiny." },
    { id: 'a24', text: "She didn't mince words when she gave her honest opinion." },
    { id: 'a25', text: "We're going to have to play it by ear and see what happens." },
    { id: 'a26', text: "The proposal was met with a lukewarm response, to say the least." },
    { id: 'a27', text: "I've been mulling it over for a while and I'm still on the fence." },
    { id: 'a28', text: "He's always been the kind of person who calls a spade a spade." },
    { id: 'a29', text: "It's a tricky situation, but I think we can navigate it." },
    { id: 'a30', text: "Their performance has been steadily improving over the quarter." },
    { id: 'a31', text: "I made it crystal clear that I wouldn't tolerate that behavior." },
    { id: 'a32', text: "The deal hangs in the balance until the board signs off." },
    { id: 'a33', text: "She has a knack for spotting talent before anyone else does." },
    { id: 'a34', text: "I'd hate to put you on the spot, but what's your take?" },
    { id: 'a35', text: "It's only a matter of time before someone catches on." },
    { id: 'a36', text: "We need to nip this in the bud before it gets out of hand." },
    { id: 'a37', text: "He gave a long-winded explanation that didn't really answer the question." },
    { id: 'a38', text: "I'm cautiously optimistic about how things are shaping up." },
    { id: 'a39', text: "The whole thing felt like a wild goose chase from the start." },
    { id: 'a40', text: "She has an impeccable eye for detail." },
    { id: 'a41', text: "It's not the outcome we were hoping for, but it's manageable." },
    { id: 'a42', text: "I'd be remiss if I didn't mention how much you've helped." },
    { id: 'a43', text: "The argument carries some weight, but it's not airtight." },
    { id: 'a44', text: "Let's not jump to conclusions before hearing both sides." },
    { id: 'a45', text: "She handled the situation with remarkable poise." },
    { id: 'a46', text: "I can see where you're coming from, but I'd push back on that." },
    { id: 'a47', text: "The strategy is sound in theory, but execution will be tough." },
    { id: 'a48', text: "He's got a sharp tongue but a soft heart." },
    { id: 'a49', text: "I tend to take everything they say with a grain of salt." },
    { id: 'a50', text: "It's worth a shot, even if the odds aren't great." },
  ],
};

/**
 * Sorteia uma frase aleatória, evitando o último ID usado.
 * Recebe `lastId` (do SecureStore via caller) pra garantir não-repetição imediata.
 */
export function pickPhrase(level: PronunciationLevel, lastId?: string | null): PronunciationPhrase {
  const pool = PRONUNCIATION_PHRASES[level];
  const candidates = lastId ? pool.filter(p => p.id !== lastId) : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
