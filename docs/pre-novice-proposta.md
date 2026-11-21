# Pré-Novice: proposta de desenho

Status: **proposta para aprovação do Felipe, versão 2**. Nada do app nem do banco foi alterado.
Versão 1: 17/11/2026. Versão 2: 21/11/2026, com as correções da avaliação pedagógica ([docs/pre-novice-avaliacao-pedagogica.md](pre-novice-avaliacao-pedagogica.md)).

---

## O que mudou da versão 1 para a 2

A arquitetura técnica não mudou: o nível continua `Novice` no banco, o Pré-Novice é um id de currículo à parte e a entrega sai por OTA. O que mudou foi conteúdo, sons, revisão e medição.

1. **Tópicos:** entram "Não entendi!" (frases para quando não se entende), "De onde você é?", "Como se escreve?" (alfabeto) e preços. Saem cores como tópico próprio e números de 11 a 20 isolados. O telefone passa a ser a âncora dos números de 0 a 10.
2. **Dois erros do PN01 corrigidos:** o par "hi x high" (palavras que soam iguais, sem resposta certa) virou "hi x I", e a dica do h foi invertida para a versão certa: "o h se pronuncia, é um sopro; em português ele é mudo".
3. **Sons do dia pela facilidade de ser entendido:** saem o "w" e o segundo "th"; entram o r do inglês, a consoante final sem vogal extra ("good", não "gudi") e mais treino de i curto x i longo.
4. **O microfone não avalia o som.** O som do dia é treinado só pela escuta. A fala usa frases de 2 a 4 palavras, aceita variantes e aprova na 2ª tentativa.
5. **Revisão entre tópicos:** cada tópico, a partir do PN02, começa com um aquecimento de 2 ou 3 passos com palavras dos tópicos anteriores.
6. **Fala a partir do português:** passos "Como se diz obrigado? Fale." desde o PN02, e o aluno passa a perguntar algo à Charlotte desde o PN03.
7. **Primeira vitória em até 90 segundos,** lembrete do dia 2 com o próximo tópico e pedido de lembrete depois da 1ª vitória.
8. **Reencaminhamento nos dois sentidos** e "Não sei dizer" levando a uma checagem de 3 perguntas.
9. **Medição com grupo de controle:** 10% a 20% de quem responde "Nada" segue para o N01 como hoje, para comparar.
10. **Bloqueio só no P1;** o P2 fica recomendado, aberto ao lado do Novice.

O esforço sobe de 9 a 13 dias para **de 13 a 17 dias**. A fase 1 enxuta sobe de cerca de 5 para **cerca de 8 dias** (seção 6).

---

## 0. Resumo em 6 linhas

1. O iniciante absoluto cai direto no exercício 1 do Novice (N01, Gramática) **antes** de qualquer escolha de nível: 82% das contas novas nunca fazem o teste de nível.
2. O N01 cobra antes de ensinar: o 1º exercício já é "_____ to meet you!", sem apresentar a palavra. Nada avisa que dá para tocar na palavra para ver a tradução.
3. Proposta: um bloco **Pré-Novice** ("Primeiros passos") com 10 tópicos curtos. Ele ensina primeiro com cartões de palavra (ouvir, ver a tradução), revisa os tópicos anteriores no começo de cada tópico, só depois pede para escolher e nunca pede para digitar no começo. O P1 ensina o que o aluno precisa para a primeira conversa com a Charlotte, incluindo pedir para repetir e falar devagar.
4. Encaminhamento: uma pergunta no onboarding ("Quanto inglês você já sabe?") e a opção "Começar do zero" no teste de nível passam a levar ao Pré-Novice, com gatilhos para corrigir quem escolheu errado nos dois sentidos.
5. O nível do aluno continua `Novice` no banco. O Pré-Novice é uma trilha à parte, que fica no topo da trilha do Novice, como já se faz com a trilha do Igorfina. Isso evita mexer em CHECK do banco, conquistas, pushes, e-mails e métricas por nível.
6. Sai por **OTA**, sem build nativo, com 1 migration pequena e ajustes no web. Lança com grupo de controle e medida do que o aluno lembra no dia 3 e no dia 5.

---

## 1. Diagnóstico

### 1.1 O caminho real de uma conta nova hoje

1. Cadastro, depois o `charlotte-intro`, com 3 passos: oi pelo nome, ritmo do dia e plano dos 7 dias. Não há nenhuma pergunta sobre nível. Se a conta está sem nível, ele é gravado como `Novice` (`charlotte-intro.tsx:347,428`).
2. Aviso de IA, depois **direto para a 1ª lição**: `firstLessonRoute()` em `lib/welcome.ts:103` abre a Gramática do N01, cortada nos 5 primeiros exercícios (`FIRST_ACTIVITY_EXERCISES = 5`, `learn-session.tsx:254`).
3. O teste de nível só é oferecido **depois** da 1ª atividade concluída, num aviso na tela inicial. Na degustação, ele volta no fim do tópico do dia (`(tabs)/index.tsx:249-300`).

Ou seja, quem nunca viu inglês encontra o Novice antes de ter qualquer chance de dizer que não sabe nada.

### 1.2 Números (banco de produção, só leitura, últimos 60 dias)

| Dado | Valor |
|---|---|
| Contas novas | 1.957 |
| Fizeram o teste de nível | 344 (17,6%), sendo 200 Novice, 107 Inter e 37 Advanced |
| Nunca fizeram o teste | 1.613 (82%), todas no Novice |
| Começaram a Gramática do N01 | 1.070 (55% das contas) |
| Concluíram Gramática, L&S, Role-play e Chat do N01 | 1.041, 728, 643 e 606 |

A maior perda do 1º tópico acontece entre a Gramática e o Listening & Speaking: 30% saem nesse ponto.

Erro na 1ª tentativa, Gramática do N01 (`learn_attempts`, desde 20/10):

| # | Exercício | Tipo | Erro |
|---|---|---|---|
| 1 | `_____ to meet you!` (Nice) | escolha | 9% |
| 2 | `How _____ you today?` (are) | escolha | 8% |
| 3 | `Good _____, everyone!` (morning) | banco de palavras | **29%** |
| 4 | `See you _____!` (later) | banco de palavras | 15% |
| 5 | `I'm fine, _____.` (thank you) | banco de palavras | **27%** |
| 6 | `_____ morning!` (Good) | digitar | 4% |
| 7 | `_____ you later!` (See) | digitar | 12% |
| 8 | `Good meet you!` → reescrever | corrigir o erro | **57%** |
| 9 | `How you are?` → reescrever | corrigir o erro | **34%** |
| 10 | Diálogo + pergunta, resposta digitada | ler e responder | **34%** |

Leitura dos números: a média esconde o iniciante absoluto. Quem conhece "thank you" e "good morning" passa sem esforço. Quem não conhece erra no banco de palavras, que tem 4 opções e nenhuma ensinada antes. Nos exercícios de digitar e reescrever, o erro passa de 30%. As saídas no meio da lição concentram-se nos exercícios 2 e 5 (28 e 36 saídas registradas). A amostra é pequena porque esse registro começou em 20/10.

Limite dos dados: não dá para separar quem "não sabe nada" de quem só se distraiu, porque o app nunca pergunta. Essa é mais uma razão para a pergunta do onboarding (seção 3.1), que também passa a medir quantos se declaram iniciantes absolutos.

### 1.3 Onde o 1º tópico do Novice pressupõe conhecimento

| Ponto | Onde | Por que trava o iniciante absoluto |
|---|---|---|
| Cobra antes de ensinar | `novice/M01.json`, N01 grammar[0..] | Todos os exercícios são de resposta. Não existe passo que apresente a palavra, o som e a tradução antes da pergunta. |
| Toque para traduzir é invisível | `TranslatableText.tsx` | A palavra só tem um sublinhado pontilhado. Não há aviso nem demonstração, e o aluno descobre sozinho, como no depoimento. O balão mostra a tradução, mas **não toca o som** da palavra. |
| Instruções e explicações pressupõem gramática | `explanation` do N01 | Termos como "segunda pessoa", "verbo to be", "auxiliar antes do sujeito" e "sujeito". |
| Digitar em inglês cedo demais | N01 ex. 6-10 | `fill_gap`, `fix_error` e `read_answer` exigem escrever palavras e frases que o aluno nunca viu escritas. |
| "Corrigir o erro" pressupõe saber o certo | N01 ex. 8-9 | O aluno precisa identificar o que está errado numa língua que não conhece. |
| Banco de palavras com distratores parecidos | N01 ex. 3-5 | "morning/night/noon/lunch" e "thank you/please/sorry/welcome": sem vocabulário, a escolha vira chute. |
| L&S pede para repetir frases inteiras | N01 L&S | "Good morning, everyone!" logo de saída, sem trabalhar os sons isolados (h, th, r). "Hi! How are you?" tem 25% de erro. |
| Role-play e Chat livres | N01 roleplay/guided_chat | São avaliados por IA e o Chat exige digitar em inglês. Há "Need a hand?" com dica, mas o aluno precisa saber que ela existe. |
| Nenhum "eu não sei nada" | `charlotte-intro.tsx`, `placement-test.tsx` | O onboarding não pergunta o nível. No teste, "Começar do zero" leva ao **Novice** (`handleSkipToNovice`, :364). |

O que já ajuda e será reaproveitado:

- a mensagem "Sua primeira lição! Errar faz parte..." (`learn-session.tsx:1671`)
- o botão "Me ajuda" e a correção binária do Novice no L&S (70%)
- o "Ouvir" em exercícios de escolha (`listen`)
- o Chat roteirizado (`scripted`, já implementado em `guided-chat-exercise.tsx` via `lib/scriptedRunner`)
- os tipos antigos de pronúncia ainda suportados pela tela de sessão: `minimal_pairs`, `listen_write` e `sentence_stress` (`learn-session.tsx:436-710`)

---

## 2. A proposta: Pré-Novice ("Primeiros passos")

### 2.1 Objetivos

Ao terminar o P1 (5 tópicos, os 5 dias da degustação), o aluno:

1. sabe usar a lição: tocar na palavra para ver a tradução e ouvir o som, falar no microfone, pedir ajuda;
2. sobrevive à primeira conversa com a Charlotte: cumprimenta, diz o nome, pergunta o nome dela, diz como está, agradece e, quando não entende, pede para repetir ou falar devagar.

Ao terminar o P2 (mais 5 tópicos, recomendados), o aluno também:

3. **reconhece** de ouvido cerca de 80 a 100 palavras e expressões e **fala** cerca de 25 expressões prontas;
4. diz frases-modelo sobre si: "Hi, I'm Ana.", "I'm from Brazil.", "I'm 25.", "I'm fine, thanks.", "My phone number is...", "Can I have a coffee, please?", e soletra o próprio nome;
5. chega ao N01 do Novice já tendo visto todas as palavras que o N01 cobra, de modo que o N01 vira quase todo revisão.

Não é objetivo ensinar gramática por nome. Nenhuma explicação usa "sujeito", "verbo to be" ou "auxiliar". A promessa é de reconhecimento amplo e fala curta: 2 horas de conteúdo não formam 80 palavras de uso ativo.

### 2.2 Princípios

- **Ensinar, depois pedir.** Cada palavra nova aparece primeiro num cartão (inglês, tradução, áudio). Só depois vem uma pergunta, e a pergunta usa apenas palavras já mostradas.
- **Reconhecer antes de produzir, mas falar desde o 1º dia.** A ordem é ouvir e tocar, depois escolher, depois montar a frase, depois falar e, por último, digitar uma palavra. Nada de digitar nos tópicos 1 a 5. A partir do PN02 entram passos de fala a partir do português ("Como se diz **obrigado**? Fale."), porque é falando que se aprende a falar.
- **Revisar o que já passou.** A partir do PN02, cada tópico começa com um aquecimento de 2 ou 3 passos com palavras dos tópicos anteriores. Com 1 tópico por dia, isso vira revisão espaçada de verdade.
- **Poucas opções.** 2 opções só na 1ª cobrança de uma palavra; a partir da 2ª, 3 opções. Distratores bem diferentes entre si e nenhuma pegadinha.
- **Grupos de palavras pequenos e dentro de uma situação.** No máximo 3 ou 4 itens do mesmo grupo (números, família) por atividade, sempre dentro de uma tarefa (dizer um telefone, pedir um café). Palavras parecidas do mesmo grupo aprendidas juntas se confundem.
- **Português como apoio, e cada vez menos.** Instruções, explicações e contexto em português simples, de no máximo 2 linhas, lidas em voz alta pela Charlotte. No P1 a tradução aparece no cartão e na 1ª vez; a partir do P2 ela fica escondida por padrão e aparece ao toque. Para aparelho em inglês, a regra é a mesma do Novice: a interface segue o idioma do aparelho, e o conteúdo pedagógico não muda.
- **Sem jargão.** Nada de "pares mínimos", "entonação", "plural" ou "fonema" na tela. Diz-se "Ouça e toque na palavra que você ouviu", "a voz sobe no fim".
- **Transcrição em português só como dica pontual.** Vale "em yes, o y soa como i", porque o som existe no português. Nunca para os sons de contraste (vogais, r, th), e nada de alfabeto fonético. Escrever "rélou" para "hello" ensinaria que o r do português vale o h do inglês.
- **O microfone confere a frase, não o som.** O reconhecimento no aparelho funciona como ditado: devolve palavras, não sons. Por isso o som do dia é treinado só pela escuta, e a tela nunca diz que a Charlotte "avaliou seu th".
- **Lições curtas e uma vitória cedo.** De 6 a 8 passos por atividade, cerca de 3 minutos cada e cerca de 12 minutos por tópico, com as 4 atividades. A 1ª comemoração chega em até 90 segundos.
- **Tom.** A Charlotte acolhe e comemora: "Você acabou de falar sua primeira frase em inglês!". Nada de "fácil" nem de "básico demais".

### 2.3 Currículo: 2 blocos, 10 tópicos

Os tópicos seguem o modelo atual de unidade, com 4 atividades: Gramática, Listening & Speaking, Role-play e Guided Chat. Assim a trilha, o progresso (`learn_history_v2`) e a degustação continuam funcionando. No Pré-Novice, a 1ª atividade aparece como **"Palavras"** em vez de "Gramática" (só muda o rótulo).

**Bloco P1, Primeiros passos** (os 5 dias da degustação; obrigatório para quem vem do zero)

| Tópico | Título | Conteúdo | Som do dia (ou dica) |
|---|---|---|---|
| PN01 | Oi! | hi, hello, bye, yes, no, OK. **Como usar a lição** (tocar, ouvir, falar). | Dica: o h do começo se pronuncia. Escuta: hi x I |
| PN02 | Por favor e obrigado | please, thank you / thanks, sorry, excuse me, you're welcome | O th de thank you, só para reconhecer (dizer com t ou f ainda é entendido) |
| PN03 | Meu nome é... | I'm + nome, my name is, what's your name?, nice to meet you, and you? O aluno pergunta o nome da Charlotte. | i curto x i longo (it / eat) |
| PN04 | Não entendi! | Sorry?, again, please, slowly, please, I don't understand, I don't know | A voz sobe no fim de "Sorry?" (só ouvir) |
| PN05 | Tudo bem? | how are you?, good, fine, great, tired, happy, and you? | Fim da palavra sem vogal extra ("good", não "gudi"; "I'm" de boca fechada) |

**Bloco P2, Palavras do dia a dia** (recomendado, aberto ao lado do Novice)

| Tópico | Título | Conteúdo | Som do dia (ou dica) |
|---|---|---|---|
| PN06 | Números e telefone | zero / oh a ten, what's your phone number?, it's..., o telefone dito dígito por dígito | O r do inglês (three, four): a língua não encosta no céu da boca |
| PN07 | De onde você é? | where are you from?, I'm from Brazil, alguns países, I live in... | i curto x i longo de novo (live x leave) |
| PN08 | Como se escreve? | alfabeto com foco nas letras que enganam o brasileiro (a, e, i, g, j, h, r, w, y); how do you spell it?; soletrar o nome | Nomes das letras que enganam (e x i, g x j) |
| PN09 | Família e coisas | mom, dad, brother, sister, friend, this is my...; what's this?, it's a phone / bag / key | Plural sem vogal extra (keys, bags) |
| PN10 | Comer, beber e pagar | water, coffee, bread, can I have..., please?, how much is it?, 11 a 20 e dezenas até 100; revisão geral | thirteen x thirty (onde cai a força) e revisão dos sons |

Notas de conteúdo:

- **PN04 entra na degustação de propósito:** é o que o aluno precisa antes de conversar mais com a Charlotte. O dia 5 continua terminando em "Tudo bem?", a 1ª conversa completa, que já usa as frases do PN04.
- **Números até 100 no PN10:** viabilizam "I'm 25" e preços. Os números de 0 a 10 ficam no PN06, ancorados no telefone, não na idade.
- **Nota contra um erro clássico:** no PN10, um aviso curto em português: "Para dizer a idade, o inglês usa I'm 25, e não I have 25 years."
- **Momento "você já sabe muito inglês":** no PN01 ou no PN02, um passo só de reconhecimento com palavras que o brasileiro já usa (OK, hotel, pizza, internet, show), para baixar a ansiedade.
- **Ficam de fora do Pré-Novice:** cores (voltam como vocabulário dentro de "coisas" ou mais adiante no Novice) e dias da semana (N01 ou um tópico opcional "Hoje e amanhã" depois).
- **Sons:** o "w" sai porque o português já tem esse som ("quando", "água"). O th aparece num só tópico e só para reconhecer. A entonação de pergunta fica como passo de ouvir, porque o ditado do aparelho não mede entonação.

### 2.4 Atividades por tópico

| Atividade | Como fica no Pré-Novice | Reaproveita | Novo |
|---|---|---|---|
| **Palavras** (slot `grammar`) | A partir do PN02, **aquecimento** de 2 ou 3 passos com palavras dos tópicos anteriores (escolha ou fala a partir do português). Depois, 2 a 4 cartões novos, intercalados com `multiple_choice` + `listen` (2 opções na 1ª cobrança, 3 depois), `word_bank` com 3 opções e `word_order` com `context_pt` (de 2 a 4 palavras). A partir do PN02, 1 ou 2 passos "Como se diz...? Fale." A partir do PN06, no máximo 1 `fill_gap` de 1 palavra por tópico. **Sem** `fix_error`, `read_answer` ou `short_write`. | `multiple_choice`, `word_bank`, `word_order`, `listen`, "Me ajuda", correção binária, passo de fala com reconhecimento | passo **`learn_card`** (cartão de palavra: inglês grande, tradução, botão de ouvir e "Entendi"); marca `warmup` nos passos de aquecimento, escritos à mão no conteúdo de cada tópico |
| **Listening & Speaking** | 3 frases curtas de 2 a 4 palavras para repetir ("Hi, Charlotte!", não "Hi!" sozinho), com o modelo tocando **antes** da fala. Aceita variantes, aprova na 2ª tentativa. Depois, um passo de escuta do "som do dia" com **6 rodadas curtas e 2 vozes** (a Charlotte e um personagem da Família), sem microfone. | passo `repeat` com áudio pronto e reconhecimento no aparelho, `minimal_pairs` (tela antiga) | o compilador e o `adapter.ts` passam a aceitar `type` no L&S da v2 (hoje tudo vira `repeat`); `minimal_pairs` com várias rodadas e 2 vozes; lista de variantes aceitas por frase |
| **Role-play** | 1 turno: a personagem fala, a frase que o aluno deve dizer aparece na tela (inglês + português) e o aluno fala. É o modo `scripted: simple_speak`, que já está no `types.ts`. A partir do PN03, o aluno também **pergunta** algo à Charlotte ("And you?", "What's your name?", "What's this?"). | tela de role-play, objetivos, "Need a hand?" | ligar o `simple_speak` no `roleplay-exercise.tsx` (hoje só o Chat usa o roteirizado) |
| **Guided Chat** | Roteirizado (`scripted: conversation`), de 2 a 3 trocas. A resposta esperada aparece como **sugestão tocável**, e o aluno pode tocar para enviar ou digitar. A partir do PN04, as sugestões incluem "Sorry?" e "Slowly, please" quando a Charlotte fala algo novo. | `scriptedRunner`, `expected_student_response` | botão de sugestão "toque para enviar" abaixo da bolha |

Alterações transversais na sessão, valendo só no Pré-Novice e todas em JavaScript:

- **Treino do toque no PN01:** o 1º cartão pede "Toque na palavra **hello** para ver o que significa". O passo só avança depois do toque. Uma vez no PN01, mais uma lembrança no 1º exercício do PN02.
- **Som no balão de tradução:** ao tocar a palavra, o balão mostra a tradução **e toca o áudio** da palavra. Vale para todos os níveis Novice-like, porque responde diretamente ao depoimento do aluno.
- **Erro com ajuda imediata:** no 2º erro do mesmo passo, a resposta certa aparece com áudio e o aluno segue sem perder o passo. Isso já acontece no L&S com "Ouvir de novo", e passaria a valer também em Palavras.
- **Instruções lidas em voz alta** pela Charlotte, com áudio pronto (não gerado na hora).
- **Comemoração precoce:** depois do 3º passo do PN01, "Você já entende 2 palavras em inglês!".
- **Sem corte de 5 exercícios** na 1ª lição do Pré-Novice, porque os tópicos já são curtos.
- **Registro do reconhecimento de fala:** cada frase do `repeat` grava a transcrição e se foi aceita, para calibrar as variantes e medir quantas vezes o app reprova uma fala certa.
- **Desejável, fora da fase 1:** botão "Ouvir minha voz" ao lado de "Ouvir de novo", se o reconhecimento já guardar o áudio da fala; e "Ouvir devagar" opcional, gerado com pausas entre as palavras, e não esticado.

### 2.5 Encaixe na trilha

- O Pré-Novice aparece na trilha do Novice como um bloco **acima do M01**, chamado "Primeiros passos", com os 10 tópicos.
- Quem entrou "do zero" (seção 3) segue em ordem do PN01 ao PN05. **A cascata do N01 depende só do PN05** para esses alunos. O P2 (PN06 a PN10) aparece aberto e recomendado ("Recomendado antes do Novice"), sem bloquear o N01. No cabeçalho do bloco há o botão **"Já sei isso"** (mini-teste da seção 3.3), que libera o N01 na hora.
- Os outros alunos do Novice veem o bloco recolhido como **"Revisar o básico"**, opcional e todo aberto, sem bloquear nada. Quem já está no meio do Novice não é afetado.

Motivo do bloqueio só no P1: 10 tópicos a 1 por dia somariam 10 dias antes do N01, numa degustação que converte no dia 5. As 2 horas do Pré-Novice são uma rampa, não um nível.

### 2.6 Encaixe na degustação de 5 dias

- `tasteDays.ts` não muda: continua 1 tópico novo por dia, por 5 dias.
- Para quem entrou do zero, a ordem da degustação (`tasteOrder` em `TrailContent.tsx:474`) passa a ser **PN01 a PN05**, exatamente o bloco P1. O dia 5 termina com "Tudo bem?", que é a 1ª conversa completa do aluno.
- Progresso visível "Dia 1 de 5" e meta clara na 1ª tela do PN01: "5 dias, 1 passo por dia, uns 10 minutos".
- O convite ao teste de nível no fim do tópico do dia (`handleTasteTopicDone`) **não aparece** para quem entrou do zero, porque ele já disse que não sabe nada. No lugar, ao fim do PN05, vem "Você completou os primeiros passos!" e, em seguida, a oferta de sempre, com o progresso: "você já pode começar o Novice".
- A "atividade extra" da oferta (`tasteNext`) passa a ser o PN do dia seguinte. A lógica atual já faz isso.
- **Lembrete do dia 2 na fase 1**, não como opcional: o pedido de permissão de notificação vem **depois** da 1ª vitória do PN01, e o lembrete do dia seguinte cita o próximo tópico ("Amanhã: Por favor e obrigado"). Hoje o lembrete da degustação cita o tópico do dia; ele passa a ler o título do PN para quem vem do zero.

---

## 3. Encaminhamento e teste de nível

### 3.1 Pergunta no onboarding (o caminho principal)

Como 82% das contas nunca fazem o teste, o encaminhamento precisa acontecer **antes da 1ª lição**. A proposta é um passo novo no `charlotte-intro`, entre "oi pelo nome" e "ritmo do dia":

> **Quanto inglês você já sabe?**
> - Nada, estou começando do zero → Pré-Novice (PN01 é a 1ª lição)
> - Sei umas palavras (oi, obrigado, números) → Novice (N01, como hoje)
> - Já consigo conversar um pouco → teste de nível agora (`placement-test?direct=1`); ao terminar, vem a 1ª lição do nível que der
> - Não sei dizer → **checagem rápida de 3 perguntas com áudio** (ouvir "thank you" e escolher a tradução, por exemplo). Com 0 ou 1 acerto, Pré-Novice; com 2 ou 3, Novice.

O passo grava a resposta em `charlotte_users.onboarding_level_answer`, grava `start_from_zero = true` quando o aluno vai para o Pré-Novice e envia o evento `onboarding_level_answer`. "Pular" o onboarding continua levando ao Novice. `firstLessonRoute()` passa a abrir o PN01 quando `start_from_zero` for verdadeiro.

As opções são concretas ("oi, obrigado, números") de propósito: iniciantes tendem a superestimar o próprio nível, e exemplos concretos reduzem esse erro. A seção 3.4 cobre quem escolher errado mesmo assim.

**Grupo de controle:** de quem responde "Nada", uma parte sorteada (10% a 20%, a definir) vai para o N01 como hoje, com `prenovice_group = 'controle'`; os demais ficam com `prenovice_group = 'prenovice'`. O sorteio dura algumas semanas, até a comparação da seção 5.3 ter resposta, e depois todos vão para o Pré-Novice.

### 3.2 Mudanças no teste de nível

1. **"Começar do zero"** (IntroScreen e aviso da tela inicial) passa a levar ao **Pré-Novice**: grava `start_from_zero = true`, `charlotte_level = 'Novice'` e `placement_test_done = true`. Hoje leva ao N01.
2. **Opção "Não sei"** em todas as perguntas do Bloco 1. Conta como erro, mas evita o chute: com 4 alternativas, o chute puro acerta 3 de 5 em cerca de 10% das vezes.
3. **Link "Não sei nada de inglês"** visível durante o Bloco 1: sai na hora para o Pré-Novice.
4. **Novo corte no Bloco 1** (5 perguntas):
   - de 0 a 2 acertos: **Pré-Novice** (`start_from_zero = true`);
   - 3 acertos: **Novice**, com o bloco "Primeiros passos" sugerido no resultado ("Quer revisar o básico antes?"), mas sem bloqueio;
   - 4 ou 5 acertos: segue para o Bloco 2, como hoje.
5. **Tela de resultado** com um cartão novo, "Primeiros passos", com o mesmo padrão dos atuais (`LEVEL_META`), em português e em inglês.

### 3.3 Como sair do Pré-Novice para o Novice

- **Normal:** concluiu as 4 atividades do PN05. Aparece "Você está pronto para o Novice!", reaproveitando o `PromotionModal`, sem vídeo novo. `start_from_zero` vira `false` e o N01 abre, com o P2 recomendado ao lado. Como o nível no banco já é `Novice`, não há troca de nível. O `usePromotion` não é afetado, porque conta só as linhas com `level = 'Novice'`.
- **Atalho "Já sei isso"**, no cabeçalho do bloco: um mini-teste com as 5 perguntas do Bloco 1 do teste de nível. Com 4 acertos ou mais, `start_from_zero = false` e o N01 é liberado. Com menos, o aluno continua no bloco, com a mensagem "Vamos mais um pouco juntos".
- **Refazer o teste de nível** (Perfil) continua funcionando. Se o resultado for Novice ou acima, `start_from_zero` vira `false`.

### 3.4 Reencaminhamento nos dois sentidos

A escolha do onboarding é uma autoavaliação, e ela erra. Dois gatilhos corrigem isso sem depender de o aluno achar um botão:

- **Foi para o Novice e não estava pronto:** quem escolheu "Sei umas palavras" ou "Não sei dizer" e errou na 1ª tentativa 2 ou mais dos 5 primeiros exercícios do N01, ou saiu no meio da 1ª lição, vê na próxima abertura: "Quer começar pelos Primeiros passos? São 5 dias curtos e você volta para cá depois." Aceitar grava `start_from_zero = true`. O aviso aparece uma vez só.
- **Foi para o Pré-Novice e já sabia:** quem acertou de primeira quase tudo no PN01 e no PN02 (no máximo 1 erro por tópico) vê o "Já sei isso" oferecido no fim do PN02, em vez de precisar achá-lo no cabeçalho do bloco.

---

## 4. Tópico de exemplo completo: PN01 "Oi!"

Escrito no formato do compilador (`docs/curriculum/v2/prenovice/M01-primeiros-passos.md`). Abaixo está o conteúdo em forma legível.

**Contexto (`real_life_context`):** "Você encontra alguém e quer dizer oi e tchau em inglês."
**Objetivo:** dizer hi, hello e bye, responder yes, no e OK, e saber usar a lição.

Mudanças em relação à versão 1: comemoração no passo 3; o passo 3 usa só palavras já apresentadas (antes oferecia bye antes do cartão de bye); 2 opções só na 1ª cobrança; a transcrição "iés" virou dica de leitura; o L&S usa frases curtas com o nome em vez de palavras soltas e o modelo toca antes da fala; o par "hi x high", que não tem resposta certa, virou "hi x I", com 2 vozes; e a dica do h foi corrigida.

### 4.1 Palavras (8 passos, cerca de 3 min)

| # | Tipo | Conteúdo | Resposta | Apoio em português |
|---|---|---|---|---|
| 1 | `learn_card` (treino do toque) | **hello**, com áudio automático. Instrução: "Toque na palavra **hello** para ver o que significa." | O aluno toca e o balão mostra "olá" com o áudio. Só então aparece "Entendi". | "Sempre que uma palavra tiver esse sublinhado pontilhado, toque nela: você vê a tradução e ouve o som." |
| 2 | `learn_card` | **hi**, que é "oi", com áudio automático. | Entendi | "Hi e hello querem dizer quase a mesma coisa. Hi é mais informal. O h do começo se pronuncia: é um sopro leve." |
| 3 | `multiple_choice` + `listen: "hi"` | "Ouça e escolha o que você ouviu." Opções: hi / hello (as duas já apresentadas) | hi | "Você ouviu hi: oi." Em seguida: **"Você já entende 2 palavras em inglês!"** |
| 4 | `learn_card` | **bye**, que é "tchau", com áudio automático. | Entendi | "Bye é tchau. Também se diz goodbye. Termina no som de 'ai', sem 'ê' no fim." |
| 5 | `multiple_choice` | "Como se diz **tchau** em inglês?" Opções: bye / hi / hello | bye | "Bye é tchau. Hi e hello são oi." |
| 6 | `learn_card` | **yes** = sim · **no** = não · **OK** = tá bom. Três botões de ouvir. | Entendi | "Dica de leitura: em yes, o y soa como i." |
| 7 | `multiple_choice` + `listen: "no"` | "Ouça e escolha." Opções: yes / no (2 na 1ª cobrança; 3 nas revisões seguintes) | no | "Você ouviu no: não." |
| 8 | `word_order` | `context_pt`: "Oi! Tchau!". Palavras: Hi! / Bye! | Hi! Bye! | "Primeiro o oi, depois o tchau. Você montou sua primeira frase em inglês!" |

No erro, a explicação em português de no máximo 2 linhas aparece com o áudio da resposta certa. No 2º erro do mesmo passo, a resposta é mostrada e o aluno segue. As instruções também são lidas em voz alta.

O PN01 não tem aquecimento, porque é o primeiro. O aquecimento do PN02 será, por exemplo: "Ouça e escolha: hi / bye" e "Como se diz **sim**? Fale."

### 4.2 Listening & Speaking (4 passos)

| # | Tipo | Texto | Contexto mostrado |
|---|---|---|---|
| 1 | `repeat` (modelo toca antes) | Hi, Charlotte! | "Oi, Charlotte! Ouça e repita." |
| 2 | `repeat` (modelo toca antes) | Hello, Charlotte! | "Olá, Charlotte! O h do começo se pronuncia: um sopro leve. Em português o h é mudo; em inglês, não." |
| 3 | `repeat` (modelo toca antes) | Bye, Charlotte! | "Tchau, Charlotte! Sem 'ê' no fim do bye." |
| 4 | `minimal_pairs` (6 rodadas curtas, 2 vozes) | hi x I (o alvo varia a cada rodada) | "Ouça e toque na palavra que você ouviu. Uma tem o sopro do h, a outra não." Depois de cada resposta, tocam as duas palavras. |

Antes do 1º passo, a tela de introdução do L&S (que já existe) ganha uma linha: "Segure o botão do microfone, fale e solte." Os passos 1 a 3 aceitam "hi", "hey" e "hello" como variantes, o nome é opcional e a fala é aprovada na 2ª tentativa. O passo 4 não usa o microfone, então não depende do reconhecimento de fala.

### 4.3 Role-play (`scripted: simple_speak`, cerca de 1 min)

- **Cena (pt):** "A Charlotte acabou de chegar. Diga oi para ela!"
- **Charlotte (áudio):** "Hi! I'm Charlotte."
- **O que dizer (na tela):** **Hi, Charlotte!** — "Oi, Charlotte!"
- **Passa se:** a fala tiver hi, hey ou hello. O nome é opcional.
- **Fecho:** "Great! Bye for now!", seguido de "Você acabou de falar inglês com a Charlotte!"

### 4.4 Guided Chat (`scripted: conversation`, 2 trocas)

| Turno | Charlotte | Sugestão tocável (inglês + português) | Aceita |
|---|---|---|---|
| 1 | Hello! | **Hi!** — "Oi!" | hi, hello, hey |
| 2 | Are you OK? | **Yes!** — "Sim!" | yes, yeah, OK, I'm OK |
| Fecho | Great! Bye! | **Bye!** — "Tchau!" | bye, goodbye, see you |

**Resumo (`recap_pt`):** "Hoje você aprendeu: hi, hello, bye, yes, no e OK. E aprendeu a tocar nas palavras para ver a tradução e ouvir o som."

---

## 5. Impactos

### 5.1 Decisão de arquitetura: nível no banco continua `Novice`

O Pré-Novice vira um **id de currículo** (`PreNovice`, pasta `data/curriculum-v2/prenovice`) gravado só em `learn_history_v2.level`, como já é feito com o `Igorfina`. Para todo o resto, o aluno é Novice.

Por que não um nível novo de verdade em `charlotte_level`:

- o CHECK de `charlotte_level` (`apps/web/supabase/migrations/035_charlotte_schema.sql:23`) só aceita Novice, Inter e Advanced;
- as conquistas são sorteadas por nível, e um aluno PreNovice ficaria sem conquistas;
- o idioma dos pushes cai em inglês para nível desconhecido (`expo-notification-service.ts:826`), assim como a ligação da Família (`api/family-call/session/route.ts:45`);
- o /admin, o ranking semanal e os e-mails usam a lista fixa de 3 níveis.

Como nível separado, seriam umas 40 mudanças espalhadas. Com o id de currículo, ficam por volta de 15, quase todas pontuais.

Também não serve pôr os tópicos como módulos dentro do Novice (por exemplo, `M00`): o `usePromotion` exige **todas** as unidades do Novice concluídas para promover ao Inter, e isso travaria quem já está no Novice.

### 5.2 Lista de impactos

| Área | Impacto | Onde |
|---|---|---|
| **Banco** | 1 migration com 3 colunas em `charlotte_users`: `start_from_zero boolean not null default false`, `onboarding_level_answer text` e `prenovice_group text` (controle ou Pré-Novice). Nenhum CHECK muda. | nova migration |
| **XP (guard)** | **1 tipo novo, `aula`** (decisão do Felipe em 21/11: a aula é interativa e dá XP): 10 XP por pausa acertada de primeira, teto `when 'aula' then 10` no guard, sem XP ao rever. Migration aplicada antes da OTA. Os exercícios seguem `learn_exercise`, sem mudança. O `learn_card` não grava XP. Detalhes em `docs/pre-novice/PN01-oi.md`, seção 4. | `20261029203000_lock_xp_writes.sql` + migration nova |
| **learn_history_v2** | Linhas com `level = 'PreNovice'`. A coluna é texto livre, então nada muda. | — |
| **Promoção** | Não afeta Novice para Inter. A saída do Pré-Novice (no PN05) é só o modal e a troca da flag. | `usePromotion.ts`, `PromotionModal` |
| **Teste de nível** | Opção "Não sei", corte novo, link de saída, cartão de resultado, "Começar do zero" levando ao Pré-Novice. | `placement-test.tsx` |
| **Onboarding** | Passo "Quanto inglês você já sabe?", checagem de 3 perguntas para "Não sei dizer", sorteio do grupo de controle e `firstLessonRoute` levando ao PN01. | `charlotte-intro.tsx`, `lib/welcome.ts` |
| **Trilha** | Bloco "Primeiros passos" acima do M01, cascata do N01 condicionada ao PN05 para quem vem do zero, P2 aberto e recomendado, `tasteOrder` do PN01 ao PN05, convite ao teste suprimido para quem veio do zero, "Dia 1 de 5", aviso de reencaminhamento e "Já sei isso" oferecido no fim do PN02. | `TrailContent.tsx`, `(tabs)/index.tsx` |
| **Sessão** | Passo `learn_card`, aquecimento, fala a partir do português, treino do toque, som no balão de tradução, revelar a resposta no 2º erro, instruções lidas em voz alta, comemoração no passo 3, sem corte de 5 na 1ª lição, aceite de variantes e na 2ª tentativa no `repeat`, registro da transcrição. `isNoviceLike` inclui PreNovice. | `learn-session.tsx`, `TranslatableText.tsx` |
| **Role-play e Chat** | Ligar o `simple_speak` no role-play e a sugestão tocável no Chat. | `roleplay-exercise.tsx`, `guided-chat-exercise.tsx` |
| **Tipos e loader** | `Level` ganha `PreNovice`, mapeado para `Novice` em `LEVEL_TO_TRAIL` e com ordem 0 em `LEVEL_ORDER`. `trailVocab` e `useLearnProgressV2` também mudam. | `lib/curriculum-v2/*`, `hooks/useLearnProgressV2.ts`, `lib/trailVocab.ts` |
| **Scripts de conteúdo** | Compilar com `--level=prenovice`. **Bug a corrigir:** `extractLevel` usa `/Novice/i`, que também casa com "PreNovice" (`compile-curriculum-v2.mjs:603-607`). O L&S passa a aceitar `type` (`minimal_pairs` com rodadas e 2 vozes) e variantes aceitas; Palavras passa a aceitar `learn_card` e a marca `warmup`. Áudios (frases, cartões, instruções lidas, 2 vozes nos pares) entram em `generate-ls-audio.mjs` (`PER_LEVEL`) e vocabulário em `generate-trail-vocab.mjs`. | `scripts/` |
| **Web, APIs de exercício** | Mapear `PreNovice` para `Novice` (como já é feito com o Igorfina) e acrescentar uma instrução de "frases de até 4 palavras" no "Me ajuda". | `api/roleplay/turn`, `api/guided-chat/turn`, `api/exercise-help`, `lib/levels.ts` |
| **/admin** | Aprendizado: incluir `PreNovice` em `LEVELS` e em `curriculum-v2-titles.json`. Métricas: as da seção 5.3, com o Pré-Novice comparado ao grupo de controle. Usuários: selo "do zero". | `admin/learning`, `admin/metrics`, `lib/learning-v2.ts` |
| **Pushes e e-mails** | O nível continua Novice, então idioma e textos atuais seguem valendo. **Na fase 1:** o lembrete da degustação passa a citar o título do PN do dia seguinte para quem vem do zero, e o pedido de permissão de notificação vem depois da 1ª vitória. | cron do lembrete da degustação, `charlotte-intro.tsx` |
| **FAQ do suporte** | Atualizar "O que é o Queizy?" (mencionar os Primeiros passos), "Onde vejo meu nível?" (Começar do zero e Já sei isso) e "O que tem no Perfil?". Perguntas novas: "Nunca estudei inglês. Por onde começo?" e "Como vejo a tradução e o som de uma palavra?". Tudo no `support_faq`, no `SUPPORT_FAQ_SEED`, no inglês, no `glossary` e no `check`. | `apps/web/lib/support-faq.ts`, /admin/suporte |
| **Build** | **Só OTA**, sem módulo nativo novo. O conteúdo vai no pacote JS. A migration e o deploy web precisam sair **antes** da OTA. | — |
| **Teste no aparelho** | Samsung e simulador iOS: onboarding do zero e "Não sei dizer", PN01 inteiro (toque, microfone, role-play, chat), degustação dia 1 a 5 (mudando a data da conta de teste), lembrete do dia 2, os dois gatilhos de reencaminhamento e "Já sei isso". | regra de toda OTA |

### 5.3 Como medir se funcionou

Sem grupo de comparação, o Pré-Novice pode parecer melhor sem ser. Por isso a fase 1 já sai com o grupo de controle da seção 3.1 e com estas métricas no /admin. Os alvos são pontos de partida, não números da literatura; a referência é o funil atual do N01.

| Métrica | Como medir | Alvo sugerido |
|---|---|---|
| Respostas do onboarding | Evento `onboarding_level_answer` | Linha de base: quantos se declaram do zero |
| Retenção D1, D3 e D7 e conversão da degustação | Pré-Novice x controle | Pré-Novice acima do controle |
| Conclusão das 4 atividades do PN01 e tempo | `learn_history_v2` | Perda entre "Palavras" e L&S abaixo dos 30% atuais do N01 |
| Tempo até a 1ª comemoração | Evento no passo 3 do PN01 | Até 90 segundos |
| Erro na 1ª tentativa por passo do P1 | `learn_attempts` | Investigar passo acima de 15% a 20% |
| **O que o aluno lembra** | Acerto nos itens do PN01 no aquecimento do dia 3 e do dia 5 | Medida de aprendizagem, não de conclusão |
| Desempenho no N01 de quem fez o Pré-Novice | Erro na 1ª tentativa nos exercícios 3, 5, 8 e 9 do N01 | Abaixo de 29%, 27%, 57% e 34% |
| Reconhecimento de fala | Transcrição e aceite por frase do `repeat` | Calibrar variantes; medir quantas falas certas são reprovadas |
| Reencaminhamento | % de "Sei umas palavras" que disparam o gatilho do N01; uso e aprovação do "Já sei isso" | Mede quanto a autoavaliação erra para cada lado |
| Saída do Pré-Novice | % que chega ao N01 em até 7 dias; % que faz o P2 | Funil PN01 a PN10 até o N01 |

---

## 6. Esforço estimado

| Parte | Dias |
|---|---|
| Conteúdo: 10 tópicos com aquecimentos (Markdown no padrão do `AUTHORING-GUIDE`), revisão pedagógica e de acentuação | 3,5 a 4 |
| Áudios (L&S, cartões, falas roteirizadas, instruções lidas, pares com 2 vozes) e vocabulário | 1 a 1,5 |
| Compilador e tipos (`learn_card`, `warmup`, `type` e variantes no L&S, PreNovice, bug do `extractLevel`) | 1 a 1,5 |
| Sessão (cartão, aquecimento, treino do toque, som no balão, revelar no 2º erro, instruções lidas, comemoração, aceite no `repeat`, registro da transcrição) | 2 a 2,5 |
| Role-play `simple_speak` e sugestão tocável no Chat | 1 a 1,5 |
| Onboarding (com checagem de 3 perguntas e controle), teste de nível, trilha, degustação e gatilhos de reencaminhamento | 2 a 2,5 |
| Web (APIs, /admin com métricas e controle), migration, lembrete do dia 2 e FAQ | 1,5 a 2 |
| Testes no Samsung e no simulador iOS e ajustes | 1 |
| **Total** | **de 13 a 17 dias** |

O aumento em relação à versão 1 (de 9 a 13 dias) vem de aquecimento, pares com 2 vozes, instruções lidas, checagem de 3 perguntas, reencaminhamento, métricas com controle e lembrete do dia 2.

**Fase 1 enxuta, de cerca de 8 dias:** o bloco P1 (PN01 a PN05, que cobre a degustação) com todas as correções pedagógicas, a pergunta do onboarding com o controle, o "Começar do zero", o lembrete do dia 2 e as métricas. Ficam para a fase 2, depois de medir o funil: o P2, o "Já sei isso", o reencaminhamento automático, o teste de nível completo, "Ouvir minha voz" e "Ouvir devagar".

Pela regra do CLAUDE.md, a implementação vai em PR (banco, migration e degustação), com revisão do Codex.

---

## 7. Perguntas em aberto para o Felipe

Da versão 1, com a recomendação atualizada:

1. **Nome visível:** "Primeiros passos", "Pré-Novice" ou "Do zero"? A sugestão é "Primeiros passos" na trilha, sem sigla, e o nível do aluno continua aparecendo como Novice.
2. **Tamanho:** 10 tópicos (P1 + P2) ou só os 5 do P1 numa primeira versão? A sugestão é a fase 1 só com o P1.
3. **Bloqueio:** a recomendação agora é **bloquear só o P1** (PN01 a PN05) e deixar o P2 recomendado. Ok?
4. **Pergunta no onboarding:** ok acrescentar um passo ao `charlotte-intro` (que hoje tem 3)? A alternativa é perguntar só no teste de nível, que alcança apenas 18% das contas.
5. **Quem faz a 1ª lição:** a Charlotte em tudo, ou já apresentar o personagem da Família escolhido? A sugestão é a Charlotte, que é a anfitriã. O personagem da Família entra como 2ª voz nos treinos de escuta.
6. **XP do cartão de palavra:** zero (sem mexer no guard) ou um valor pequeno (exige uma migration no guard)?
7. **Som no balão de tradução** para todos os níveis Novice-like, incluindo o Novice e o Igorfina? A sugestão é sim, porque responde direto ao depoimento.
8. **Conquistas:** a sugestão agora é **sim**, uma conquista "Primeiros passos" ao concluir o P1. Seria uma linha nova no catálogo, com nível Novice.

Novas na versão 2:

9. **Grupo de controle:** ok mandar de 10% a 20% de quem responde "Nada" para o N01 como hoje, por algumas semanas? Qual fatia?
10. **Ordem das atividades no dia 1:** o momento que diferencia o Queizy é falar com a Charlotte e ser entendido. Vale trazer o role-play para logo depois de "Palavras" no PN01, com o pedido de microfone logo antes, e considerar o dia 1 cumprido com essas duas atividades (L&S e Chat como "continuar")? Mexe na ordem padrão das 4 atividades e na regra de "tópico do dia concluído" da degustação.
11. **Esforço:** a fase 1 enxuta passou de cerca de 5 para cerca de 8 dias. Ok?

---

## 8. O que precisa de aprovação

- [ ] Arquitetura: nível continua `Novice` no banco; o Pré-Novice é um id de currículo à parte, mais as colunas `start_from_zero`, `onboarding_level_answer` e `prenovice_group` (1 migration).
- [ ] Currículo: os 10 tópicos revisados da seção 2.3 (com "Não entendi!" no P1) e o PN01 corrigido (seção 4), incluindo o cartão `learn_card`, o aquecimento e o "sem digitar" no P1.
- [ ] Sons: o som do dia treinado só pela escuta, com a lista nova (sem o "w" e com um só th), e o microfone conferindo a frase, não o som.
- [ ] Encaminhamento: a pergunta no onboarding, a checagem de 3 perguntas para "Não sei dizer", "Começar do zero" levando ao Pré-Novice, a opção "Não sei" e o corte de 0 a 2 acertos no Bloco 1.
- [ ] Degustação: PN01 a PN05 como os 5 dias de quem vem do zero, sem o convite ao teste, com o lembrete do dia 2 e a saída para o Novice no fim do PN05.
- [ ] Medição: o grupo de controle e as métricas da seção 5.3 já na fase 1.
- [ ] Escopo de entrega: tudo de uma vez (de 13 a 17 dias) ou fase 1 enxuta (cerca de 8 dias).
- [ ] Respostas às perguntas da seção 7.
