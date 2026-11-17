# Pré-Novice: proposta de desenho

Status: **proposta para aprovação do Felipe**. Nada do app nem do banco foi alterado.
Data: 17/11/2026.

---

## 0. Resumo em 6 linhas

1. O iniciante absoluto cai direto no exercício 1 do Novice (N01, Gramática) **antes** de qualquer escolha de nível: 82% das contas novas nunca fazem o teste de nível.
2. O N01 cobra antes de ensinar: o 1º exercício já é "_____ to meet you!", sem apresentar a palavra. Nada avisa que dá para tocar na palavra para ver a tradução.
3. Proposta: um bloco **Pré-Novice** ("Primeiros passos") com 10 tópicos curtos. Ele ensina primeiro com cartões de palavra (ouvir, ver a tradução) e só depois pede para escolher, nunca para digitar no começo. O uso do app é ensinado dentro do 1º tópico.
4. Encaminhamento: uma pergunta no onboarding ("Quanto inglês você já sabe?") e a opção "Começar do zero" no teste de nível passam a levar ao Pré-Novice. O teste ganha a opção "Não sei" e um corte novo.
5. O nível do aluno continua `Novice` no banco. O Pré-Novice é uma trilha à parte, que fica no topo da trilha do Novice, como já se faz com a trilha do Igorfina. Isso evita mexer em CHECK do banco, conquistas, pushes, e-mails e métricas por nível.
6. Sai por **OTA**, sem build nativo. Precisa de 1 migration pequena (uma coluna) e de ajustes no web. Esforço estimado: de 9 a 13 dias de trabalho, sendo metade conteúdo.

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

Ao terminar, o aluno:

1. sabe usar a lição: tocar na palavra para ver a tradução, ouvir o som, falar no microfone, pedir ajuda;
2. reconhece de ouvido e fala cerca de 80 palavras e expressões de sobrevivência: cumprimentos, por favor e obrigado, sim e não, números de 0 a 20, cores, família, comida e bebida, dias;
3. diz 6 frases-modelo sobre si: "Hi, I'm Ana.", "I'm from Brazil.", "I'm 25.", "I'm fine, thanks.", "I want water, please.", "See you tomorrow!";
4. chega ao N01 do Novice já tendo visto todas as palavras que o N01 cobra.

Não é objetivo ensinar gramática por nome. Nenhuma explicação usa "sujeito", "verbo to be" ou "auxiliar".

### 2.2 Princípios

- **Ensinar, depois pedir.** Cada palavra nova aparece primeiro num cartão (inglês, tradução, áudio). Só depois vem uma pergunta, e a pergunta usa apenas palavras já mostradas.
- **Reconhecer antes de produzir.** A ordem é ouvir e tocar, depois escolher, depois montar a frase, depois falar e, por último, digitar uma palavra. Nada de digitar nos tópicos 1 a 5.
- **Poucas opções.** Escolhas com 2 ou 3 alternativas, distratores bem diferentes entre si e nenhuma pegadinha.
- **Português como apoio em todo lugar.** Instruções, explicações e contexto em português simples, de no máximo 2 linhas. O inglês é o conteúdo. Para aparelho em inglês, a regra é a mesma do Novice: a interface segue o idioma do aparelho, e o conteúdo pedagógico não muda.
- **Lições curtas.** De 6 a 8 passos por atividade, cerca de 3 minutos cada e cerca de 12 minutos por tópico, com as 4 atividades.
- **Tom.** A Charlotte acolhe e comemora: "Você acabou de falar sua primeira frase em inglês!". Nada de "fácil" nem de "básico demais".

### 2.3 Currículo: 2 blocos, 10 tópicos

Os tópicos seguem o modelo atual de unidade, com 4 atividades: Gramática, Listening & Speaking, Role-play e Guided Chat. Assim a trilha, o progresso (`learn_history_v2`) e a degustação continuam funcionando. No Pré-Novice, a 1ª atividade aparece como **"Palavras"** em vez de "Gramática" (só muda o rótulo).

**Bloco P1, Primeiros passos** (casa com os 5 dias da degustação)

| Tópico | Título | Conteúdo | Som do dia |
|---|---|---|---|
| PN01 | Oi! | hi, hello, bye, yes, no, OK. **Como usar a lição** (tocar, ouvir, falar). | o "h" de hi/hello (não é "r") |
| PN02 | Por favor e obrigado | please, thank you / thanks, sorry, excuse me, you're welcome | o "th" de thank you |
| PN03 | Meu nome é... | I'm + nome, my name is, what's your name?, nice to meet you | i curto x i longo (it / eat) |
| PN04 | Números de 0 a 10 | zero a ten, how old are you?, I'm + número | o "r" de three / four |
| PN05 | Tudo bem? | how are you?, good, fine, great, tired, and you? | a entonação de pergunta |

**Bloco P2, Palavras do dia a dia**

| Tópico | Título | Conteúdo | Som do dia |
|---|---|---|---|
| PN06 | Números de 11 a 20 | eleven a twenty, phone number | thirteen x thirty |
| PN07 | Cores e coisas | red, blue, green, black, white; this is a..., it's... | o "s" do plural |
| PN08 | Minha família | mom, dad, brother, sister, friend; this is my... | o "th" de this / brother |
| PN09 | Comer e beber | water, coffee, bread, I want..., please, can I have...? | o "w" de water / want |
| PN10 | Hoje e amanhã | today, tomorrow, morning, night, good morning / good night, see you tomorrow; revisão geral | revisão dos sons |

Os sons entram em todos os tópicos por meio de um passo de pares mínimos ou de "ouça e escolha". Não há um tópico só de fonética, que seria abstrato demais para quem está começando.

### 2.4 Atividades por tópico

| Atividade | Como fica no Pré-Novice | Reaproveita | Novo |
|---|---|---|---|
| **Palavras** (slot `grammar`) | 2 a 4 cartões novos, intercalados com `multiple_choice` + `listen`, com 2 ou 3 opções. Depois `word_bank` com 3 opções e `word_order` com `context_pt` (de 2 a 4 palavras). A partir do PN06, no máximo 1 `fill_gap` de 1 palavra por tópico. **Sem** `fix_error`, `read_answer` ou `short_write`. | `multiple_choice`, `word_bank`, `word_order`, `listen`, "Me ajuda", correção binária | passo **`learn_card`** (cartão de palavra: inglês grande, tradução, botão de ouvir e "Entendi") |
| **Listening & Speaking** | 3 frases curtas de no máximo 4 palavras para repetir, mais 1 passo de pares mínimos, do "som do dia". | passo `repeat` com áudio pronto e reconhecimento no aparelho, `minimal_pairs` (tela antiga) | o compilador e o `adapter.ts` passam a aceitar `type` no L&S da v2 (hoje tudo vira `repeat`) |
| **Role-play** | 1 turno: a personagem fala, a frase que o aluno deve dizer aparece na tela (inglês + português) e o aluno fala. É o modo `scripted: simple_speak`, que já está no `types.ts`. | tela de role-play, objetivos, "Need a hand?" | ligar o `simple_speak` no `roleplay-exercise.tsx` (hoje só o Chat usa o roteirizado) |
| **Guided Chat** | Roteirizado (`scripted: conversation`), de 2 a 3 trocas. A resposta esperada aparece como **sugestão tocável**, e o aluno pode tocar para enviar ou digitar. | `scriptedRunner`, `expected_student_response` | botão de sugestão "toque para enviar" abaixo da bolha |

Alterações transversais na sessão, valendo só no Pré-Novice e todas em JavaScript:

- **Treino do toque no PN01:** o 1º cartão pede "Toque na palavra **hello** para ver o que significa". O passo só avança depois do toque. Uma vez no PN01, mais uma lembrança no 1º exercício do PN02.
- **Som no balão de tradução:** ao tocar a palavra, o balão mostra a tradução **e toca o áudio** da palavra. Vale para todos os níveis Novice-like, porque responde diretamente ao depoimento do aluno.
- **Erro com ajuda imediata:** no 2º erro do mesmo passo, a resposta certa aparece com áudio e o aluno segue sem perder o passo. Isso já acontece no L&S com "Ouvir de novo", e passaria a valer também em Palavras.
- **Sem corte de 5 exercícios** na 1ª lição do Pré-Novice, porque os tópicos já são curtos.

### 2.5 Encaixe na trilha

- O Pré-Novice aparece na trilha do Novice como um bloco **acima do M01**, chamado "Primeiros passos", com os 10 tópicos.
- Quem entrou "do zero" (seção 3) segue em ordem: PN01 até PN10 e depois N01. A cascata do N01 passa a depender do PN10 só para esses alunos. No cabeçalho do bloco há o botão **"Já sei isso"** (mini-teste da seção 3.3), que libera o N01 na hora.
- Os outros alunos do Novice veem o bloco recolhido como **"Revisar o básico"**, opcional e todo aberto, sem bloquear nada. Quem já está no meio do Novice não é afetado.

### 2.6 Encaixe na degustação de 5 dias

- `tasteDays.ts` não muda: continua 1 tópico novo por dia, por 5 dias.
- Para quem entrou do zero, a ordem da degustação (`tasteOrder` em `TrailContent.tsx:474`) passa a ser **PN01 a PN05**, exatamente o bloco P1. O dia 5 termina com "Tudo bem?", que é a 1ª conversa completa do aluno.
- O convite ao teste de nível no fim do tópico do dia (`handleTasteTopicDone`) **não aparece** para quem entrou do zero, porque ele já disse que não sabe nada. No lugar, ao fim do PN05, vem "Você completou os primeiros passos!" e, em seguida, a oferta de sempre, com o progresso: "faltam 5 tópicos para começar o Novice".
- A "atividade extra" da oferta (`tasteNext`) passa a ser o PN do dia seguinte. A lógica atual já faz isso.

---

## 3. Encaminhamento e teste de nível

### 3.1 Pergunta no onboarding (o caminho principal)

Como 82% das contas nunca fazem o teste, o encaminhamento precisa acontecer **antes da 1ª lição**. A proposta é um passo novo no `charlotte-intro`, entre "oi pelo nome" e "ritmo do dia":

> **Quanto inglês você já sabe?**
> - Nada, estou começando do zero → Pré-Novice (PN01 é a 1ª lição)
> - Sei umas palavras (oi, obrigado, números) → Novice (N01, como hoje)
> - Já consigo conversar um pouco → teste de nível agora (`placement-test?direct=1`); ao terminar, vem a 1ª lição do nível que der
> - Não sei dizer → Novice, como hoje (o convite ao teste continua depois da 1ª atividade)

O passo grava `charlotte_users.start_from_zero = true` na 1ª opção e envia o evento `onboarding_level_answer`. "Pular" o onboarding continua levando ao Novice. `firstLessonRoute()` passa a abrir o PN01 quando `start_from_zero` for verdadeiro.

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

- **Normal:** concluiu as 4 atividades do PN10. Aparece "Você está pronto para o Novice!", reaproveitando o `PromotionModal`, sem vídeo novo. `start_from_zero` vira `false` e o N01 abre. Como o nível no banco já é `Novice`, não há troca de nível. O `usePromotion` não é afetado, porque conta só as linhas com `level = 'Novice'`.
- **Atalho "Já sei isso"**, no cabeçalho do bloco: um mini-teste com as 5 perguntas do Bloco 1 do teste de nível. Com 4 acertos ou mais, `start_from_zero = false` e o N01 é liberado. Com menos, o aluno continua no bloco, com a mensagem "Vamos mais um pouco juntos".
- **Refazer o teste de nível** (Perfil) continua funcionando. Se o resultado for Novice ou acima, `start_from_zero` vira `false`.

---

## 4. Tópico de exemplo completo: PN01 "Oi!"

Escrito no formato do compilador (`docs/curriculum/v2/prenovice/M01-primeiros-passos.md`). Abaixo está o conteúdo em forma legível.

**Contexto (`real_life_context`):** "Você encontra alguém e quer dizer oi e tchau em inglês."
**Objetivo:** dizer hi, hello e bye, responder yes, no e OK, e saber usar a lição.

### 4.1 Palavras (8 passos, cerca de 3 min)

| # | Tipo | Conteúdo | Resposta | Apoio em português |
|---|---|---|---|---|
| 1 | `learn_card` (treino do toque) | **hello** (botão de ouvir). Instrução: "Toque na palavra **hello** para ver o que significa." | O aluno toca e o balão mostra "olá" com o áudio. Só então aparece "Entendi". | "Sempre que uma palavra tiver esse sublinhado pontilhado, toque nela: você vê a tradução e ouve o som." |
| 2 | `learn_card` | **hi**, que é "oi". Áudio. | Entendi | "Hi e hello querem dizer quase a mesma coisa. Hi é mais informal, para amigos." |
| 3 | `multiple_choice` + `listen: "hi"` | "Ouça e escolha o que você ouviu." Opções: hi / bye | hi | "Você ouviu hi: oi." |
| 4 | `learn_card` | **bye**, que é "tchau". Áudio. | Entendi | "Bye é tchau. Também se diz goodbye." |
| 5 | `multiple_choice` | "Como se diz **tchau** em inglês?" Opções: bye / hi / yes | bye | "Bye é tchau. Hi é oi." |
| 6 | `learn_card` | **yes** = sim · **no** = não · **OK** = tá bom. Três botões de ouvir. | Entendi | "Repare no som: yes soa como "iés"." |
| 7 | `multiple_choice` + `listen: "no"` | "Ouça e escolha." Opções: yes / no | no | "Você ouviu no: não." |
| 8 | `word_order` | `context_pt`: "Oi! Tchau!". Palavras: Hi! / Bye! | Hi! Bye! | "Primeiro o oi, depois o tchau. Você montou sua primeira frase em inglês!" |

No erro, a explicação em português de no máximo 2 linhas aparece com o áudio da resposta certa. No 2º erro do mesmo passo, a resposta é mostrada e o aluno segue.

### 4.2 Listening & Speaking (4 passos)

| # | Tipo | Texto | Contexto mostrado |
|---|---|---|---|
| 1 | `repeat` | Hi! | "Oi, para amigos." |
| 2 | `repeat` | Hello! | "Olá. O h tem som de ar, não de r." |
| 3 | `repeat` | Bye! | "Tchau." |
| 4 | `minimal_pairs` | hi x high (alvo: hi) | "Ouça e toque na palavra que a Charlotte disse." |

Antes do 1º passo, a tela de introdução do L&S (que já existe) ganha uma linha: "Segure o botão do microfone, fale e solte."

### 4.3 Role-play (`scripted: simple_speak`, cerca de 1 min)

- **Cena (pt):** "A Charlotte acabou de chegar. Diga oi para ela!"
- **Charlotte (áudio):** "Hi! I'm Charlotte."
- **O que dizer (na tela):** **Hi, Charlotte!** — "Oi, Charlotte!"
- **Passa se:** a fala tiver hi ou hello. O nome é opcional.
- **Fecho:** "Great! Bye for now!", seguido de "Você acabou de falar inglês com a Charlotte!"

### 4.4 Guided Chat (`scripted: conversation`, 2 trocas)

| Turno | Charlotte | Sugestão tocável (inglês + português) | Aceita |
|---|---|---|---|
| 1 | Hello! | **Hi!** — "Oi!" | hi, hello, hey |
| 2 | Are you OK? | **Yes!** — "Sim!" | yes, yeah, OK, I'm OK |
| Fecho | Great! Bye! | **Bye!** — "Tchau!" | bye, goodbye, see you |

**Resumo (`recap_pt`):** "Hoje você aprendeu: hi, hello, bye, yes, no e OK. E aprendeu a tocar nas palavras para ver a tradução."

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
| **Banco** | 1 migration: `charlotte_users.start_from_zero boolean not null default false`. Nenhum CHECK muda. | nova migration |
| **XP (guard)** | **Sem mudança**: os tipos continuam `learn_exercise`, `roleplay` e `guided_chat`. O `learn_card` não grava XP. Se o Felipe quiser XP no cartão, precisa entrar no guard. | `20261029203000_lock_xp_writes.sql` |
| **learn_history_v2** | Linhas com `level = 'PreNovice'`. A coluna é texto livre, então nada muda. | — |
| **Promoção** | Não afeta Novice para Inter. A saída do Pré-Novice é só o modal e a troca da flag. | `usePromotion.ts`, `PromotionModal` |
| **Teste de nível** | Opção "Não sei", corte novo, link de saída, cartão de resultado, "Começar do zero" levando ao Pré-Novice. | `placement-test.tsx` |
| **Onboarding** | Passo "Quanto inglês você já sabe?" e `firstLessonRoute` levando ao PN01. | `charlotte-intro.tsx`, `lib/welcome.ts` |
| **Trilha** | Bloco "Primeiros passos" acima do M01, cascata do N01 condicionada à flag, `tasteOrder` do PN01 ao PN05 e convite ao teste suprimido para quem veio do zero. | `TrailContent.tsx`, `(tabs)/index.tsx` |
| **Sessão** | Passo `learn_card`, treino do toque, som no balão de tradução, revelar a resposta no 2º erro, sem corte de 5 na 1ª lição. `isNoviceLike` inclui PreNovice. | `learn-session.tsx`, `TranslatableText.tsx` |
| **Role-play e Chat** | Ligar o `simple_speak` no role-play e a sugestão tocável no Chat. | `roleplay-exercise.tsx`, `guided-chat-exercise.tsx` |
| **Tipos e loader** | `Level` ganha `PreNovice`, mapeado para `Novice` em `LEVEL_TO_TRAIL` e com ordem 0 em `LEVEL_ORDER`. `trailVocab` e `useLearnProgressV2` também mudam. | `lib/curriculum-v2/*`, `hooks/useLearnProgressV2.ts`, `lib/trailVocab.ts` |
| **Scripts de conteúdo** | Compilar com `--level=prenovice`. **Bug a corrigir:** `extractLevel` usa `/Novice/i`, que também casa com "PreNovice" (`compile-curriculum-v2.mjs:603-607`). O L&S passa a aceitar `type` (`minimal_pairs`). Áudios entram em `generate-ls-audio.mjs` (`PER_LEVEL`) e vocabulário em `generate-trail-vocab.mjs`. | `scripts/` |
| **Web, APIs de exercício** | Mapear `PreNovice` para `Novice` (como já é feito com o Igorfina) e acrescentar uma instrução de "frases de até 4 palavras" no "Me ajuda". | `api/roleplay/turn`, `api/guided-chat/turn`, `api/exercise-help`, `lib/levels.ts` |
| **/admin** | Aprendizado: incluir `PreNovice` em `LEVELS` e em `curriculum-v2-titles.json`. Métricas: "começaram do zero" (contagem e funil PN01 a PN10 até N01) e as respostas do onboarding. Usuários: selo "do zero". | `admin/learning`, `admin/metrics`, `lib/learning-v2.ts` |
| **Pushes e e-mails** | **Sem mudança obrigatória**, porque o nível continua Novice (português e textos atuais). Fica como opcional um lembrete do dia na degustação, que hoje cita o tópico do dia e passaria a citar o PN. | — |
| **FAQ do suporte** | Atualizar "O que é o Queizy?" (mencionar os Primeiros passos), "Onde vejo meu nível?" (Começar do zero e Já sei isso) e "O que tem no Perfil?". Perguntas novas: "Nunca estudei inglês. Por onde começo?" e "Como vejo a tradução e o som de uma palavra?". Tudo no `support_faq`, no `SUPPORT_FAQ_SEED`, no inglês, no `glossary` e no `check`. | `apps/web/lib/support-faq.ts`, /admin/suporte |
| **Build** | **Só OTA**, sem módulo nativo novo. O conteúdo vai no pacote JS. A migration e o deploy web precisam sair **antes** da OTA. | — |
| **Teste no aparelho** | Samsung e simulador iOS: onboarding do zero, PN01 inteiro (toque, microfone, role-play, chat), degustação dia 1 a 5 (mudando a data da conta de teste) e "Já sei isso". | regra de toda OTA |

---

## 6. Esforço estimado

| Parte | Dias |
|---|---|
| Conteúdo: 10 tópicos (Markdown no padrão do `AUTHORING-GUIDE`), revisão pedagógica e de acentuação | 3 a 4 |
| Áudios (L&S, cartões, falas roteirizadas) e vocabulário | 0,5 a 1 |
| Compilador e tipos (`learn_card`, `type` no L&S, PreNovice, bug do `extractLevel`) | 1 |
| Sessão (cartão, treino do toque, som no balão, revelar no 2º erro) | 1,5 a 2 |
| Role-play `simple_speak` e sugestão tocável no Chat | 1 a 1,5 |
| Onboarding, teste de nível, trilha e degustação | 1,5 a 2 |
| Web (APIs, /admin), migration e FAQ | 1 |
| Testes no Samsung e no simulador iOS e ajustes | 1 |
| **Total** | **de 9 a 13 dias** |

Se o Felipe quiser validar antes de produzir tudo, dá para fazer uma **fase 1 enxuta** de cerca de 5 dias: só o bloco P1 (PN01 a PN05, que cobre a degustação), a pergunta do onboarding e o "Começar do zero". A segunda metade (P2, "Já sei isso" e o teste de nível completo) viria depois de medir o funil.

Pela regra do CLAUDE.md, a implementação vai em PR (banco, migration e degustação), com revisão do Codex.

---

## 7. Perguntas em aberto para o Felipe

1. **Nome visível:** "Primeiros passos", "Pré-Novice" ou "Do zero"? A sugestão é "Primeiros passos" na trilha, sem sigla, e o nível do aluno continua aparecendo como Novice.
2. **Tamanho:** 10 tópicos (P1 + P2) ou só os 5 do P1 numa primeira versão?
3. **Bloqueio:** quem vem do zero precisa terminar os 10 tópicos para abrir o N01, ou só o P1 (e o P2 fica opcional, ao lado do Novice)?
4. **Pergunta no onboarding:** ok acrescentar um passo ao `charlotte-intro` (que hoje tem 3)? A alternativa é perguntar só no teste de nível, que alcança apenas 18% das contas.
5. **Quem faz a 1ª lição:** a Charlotte em tudo, ou já apresentar o personagem da Família escolhido? A sugestão é a Charlotte, que é a anfitriã.
6. **XP do cartão de palavra:** zero (sem mexer no guard) ou um valor pequeno (exige uma migration no guard)?
7. **Som no balão de tradução** para todos os níveis Novice-like, incluindo o Novice e o Igorfina? A sugestão é sim, porque responde direto ao depoimento.
8. **Conquistas:** vale criar uma conquista "Primeiros passos" ao concluir o bloco? Seria uma linha nova no catálogo, com nível Novice.

---

## 8. O que precisa de aprovação

- [ ] Arquitetura: nível continua `Novice` no banco; o Pré-Novice é um id de currículo à parte, mais a flag `start_from_zero` (1 migration).
- [ ] Currículo: os 10 tópicos da seção 2.3 e o padrão do PN01 (seção 4), incluindo o cartão `learn_card` e o "sem digitar" no P1.
- [ ] Encaminhamento: a pergunta no onboarding, "Começar do zero" levando ao Pré-Novice, a opção "Não sei" e o corte de 0 a 2 acertos no Bloco 1.
- [ ] Degustação: PN01 a PN05 como os 5 dias de quem vem do zero, sem o convite ao teste.
- [ ] Escopo de entrega: tudo de uma vez (de 9 a 13 dias) ou fase 1 enxuta (cerca de 5 dias).
- [ ] Respostas às perguntas da seção 7.
