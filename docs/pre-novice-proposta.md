# Pré-Novice ("Primeiros passos"): proposta

Status: **versão 3, com as decisões do Felipe de 21/11/2026**. Nada do app nem do banco foi alterado.
Histórico: a versão 1 (17/11) e a versão 2 (21/11, com a avaliação pedagógica) estão no git desta branch. A avaliação completa está em [pre-novice-avaliacao-pedagogica.md](pre-novice-avaliacao-pedagogica.md) e o PN01 detalhado em [pre-novice/PN01-oi.md](pre-novice/PN01-oi.md).

---

## 1. Por que

- O iniciante absoluto cai direto no N01 do Novice, que cobra antes de ensinar. O 1º exercício já é "_____ to meet you!", e nada avisa que dá para tocar na palavra para ver a tradução.
- Erro na 1ª tentativa no N01 (produção, desde 20/10): 29% e 27% no banco de palavras, 57% em "corrigir o erro" e 34% em ler e responder. 30% saem entre a Gramática e o Listening & Speaking do N01.
- Nenhuma tela pergunta quanto inglês o aluno sabe antes da 1ª lição. Só 15% das contas novas fazem o teste de nível (226 de 1.537 nos últimos 30 dias).

## 2. O que entra: 10 unidades em 2 blocos, acima do M01 do Novice

**Bloco 1, obrigatório para quem vem do zero** (são os 5 dias da degustação)

| Unidade | Conteúdo |
|---|---|
| PN01 Oi! | hi, hello, bye, yes, no, OK e como usar a lição |
| PN02 Por favor e obrigado | please, thank you, sorry, excuse me, you're welcome |
| PN03 Meu nome é... | I'm..., my name is..., what's your name?, nice to meet you, and you? |
| PN04 Não entendi! | Sorry?, again, please, slowly, please, I don't understand, I don't know |
| PN05 Tudo bem? | how are you?, good, fine, great, tired, happy |

**Bloco 2, recomendado, sem bloquear o Novice**

| Unidade | Conteúdo |
|---|---|
| PN06 Números e telefone | 0 a 10, telefone dito número por número |
| PN07 De onde você é? | where are you from?, I'm from Brazil, I live in... |
| PN08 Como se escreve? | alfabeto (as letras que confundem o brasileiro), how do you spell it? |
| PN09 Família e coisas | mom, dad, brother, sister, this is my..., what's this? |
| PN10 Comer, beber e pagar | water, coffee, can I have...?, how much is it?, números de 11 a 100 |

**Passagem para o Novice:** o que o Pré-Novice ensina volta no M01 a M03 ("Oi! Tudo bem?", "Meu nome é...", "De onde você é?", "De 1 a 20", "Família e amigos"). Quem sai do Pré-Novice reencontra as mesmas palavras em frases maiores, como revisão.

## 3. Formato de cada unidade

| | Bloco 1 (PN01 a PN05) | Bloco 2 (PN06 a PN10) | Novice |
|---|---|---|---|
| Aula em motion interativa | Sim, conta como atividade e dá XP | Sim, conta como atividade e dá XP | Como hoje (beta) |
| Palavras (exercício) | Sim, termina com 1 fala curta para a Charlotte | Sim | Gramática |
| Listening & Speaking | Não | Sim | Sim |
| Role-play e Guided Chat | Não | Não | Sim |
| Tempo por unidade | 4 a 5 min | 6 a 8 min | como hoje |

**Regras do conteúdo** (da avaliação pedagógica):

- **A aula ensina antes de cobrar.** A Charlotte é a anfitriã e o Igor a 2ª voz. As imitações do Igor entram onde couber, sem nome real, marca, logo ou bordão político.
- **Palavras, sem digitar no bloco 1:**
  - cartão de palavra antes de qualquer pergunta;
  - escolhas com 2 opções na 1ª vez e 3 depois;
  - resposta mostrada no 2º erro;
  - instruções lidas em voz alta.
- **Revisão:** a partir do PN02, cada unidade começa com 2 ou 3 passos de revisão das anteriores.
- **Fala:**
  - frases de 2 a 4 palavras;
  - aceita variações e aprova na 2ª tentativa;
  - a tela nunca promete avaliar o som, porque o microfone confere a frase, não a pronúncia;
  - o som do dia é treinado só pela escuta.
- **Primeira vitória:** acontece em até 30 segundos, na 1ª pausa da aula do PN01.

## 4. Como o aluno chega e sai

- **Onboarding:** passo novo no `charlotte-intro`, "Quanto inglês você já sabe?".
  - "Nada" leva ao PN01.
  - "Sei umas palavras" leva ao N01.
  - "Já converso um pouco" leva ao teste de nível.
  - "Não sei dizer" leva a uma checagem de 3 perguntas com áudio.
- **Teste de nível:**
  - "Começar do zero" passa a levar ao Pré-Novice;
  - as perguntas do 1º bloco ganham a opção "Não sei";
  - quem acerta de 0 a 2 nesse bloco vai para o Pré-Novice.
- **Saída:** ao concluir o PN05, o N01 abre e o bloco 2 fica recomendado ao lado. O botão "Já sei isso" tem um mini-teste que libera o N01 na hora.
- **Correção de rota, nos dois sentidos:**
  - quem foi para o N01 e errou 2 ou mais dos 5 primeiros exercícios recebe a oferta dos Primeiros passos;
  - quem acerta tudo no PN01 e no PN02 recebe a oferta do "Já sei isso".
- **Degustação:** do dia 1 ao 5, a ordem é PN01 a PN05.
  - Sem convite ao teste de nível.
  - Lembrete do dia 2 com o nome da próxima unidade.
  - Pedido de notificação depois da 1ª vitória.
- **Conquista "Primeiros passos":** ao concluir o bloco 1.
- **Nome visível:** "Primeiros passos". O nível do aluno continua aparecendo como Novice.

## 5. Decisões técnicas

- **Nível no banco continua `Novice`.** O Pré-Novice é um id de currículo à parte (`PreNovice`, como o `Igorfina`). Assim não se mexe no CHECK de nível, nas conquistas, nos pushes, nos e-mails, no ranking nem na promoção para o Inter.
- **1 migration:**
  - colunas `start_from_zero`, `onboarding_level_answer` e `prenovice_group` em `charlotte_users`;
  - tipo `aula` no guard de XP: 10 XP por pausa acertada de primeira, teto 10 e nada ao rever.
- **Unidade com 2 ou 3 atividades:** a liberação da unidade seguinte, o "tópico do dia concluído" da degustação e o progresso da trilha passam a contar as atividades que a unidade tem, e não sempre 4.
- **Aula fora da chave beta, só no Pré-Novice.** O vídeo do PN01 é baixado durante o onboarding. Se a aula não carregar, o aluno segue para Palavras, e a aula conta como concluída, sem XP.
- **Som no balão de tradução** para todo o Novice e o Igorfina.
- **XP do cartão de palavra:** zero.
- **Sai por OTA**, sem build nativo. A migration e o deploy web vão antes. A implementação vai em PR, com revisão do Codex.

## 6. Medição

- **Grupo de controle:** 15% de quem responde "Nada" vai para o N01 como hoje, por 4 semanas ou até cerca de 200 alunos por grupo, o que vier depois.
- **No /admin, comparando com o controle:**
  - respostas do onboarding;
  - retenção nos dias 1, 3 e 7 e conversão da degustação;
  - conclusão da aula e de Palavras;
  - erro na 1ª tentativa por passo;
  - acerto na revisão do dia 3 e do dia 5, que mede o que o aluno lembra;
  - erro no N01 de quem fez o Pré-Novice;
  - quantas falas certas o microfone reprova;
  - uso da correção de rota e do "Já sei isso".

## 7. Estimativa (refeita para o formato da versão 3)

Saíram o role-play roteirizado e a sugestão tocável no Chat. Entraram a integração da aula como atividade e a regra de unidade com 2 ou 3 atividades.

| Parte | Dias |
|---|---|
| Conteúdo de Palavras das 10 unidades (com revisão e fala final) e L&S do bloco 2 | 2,5 a 3 |
| Compilador e tipos (cartão de palavra, revisão, fala em Palavras, `PreNovice`, bug do `extractLevel`, tipos no L&S) | 1 a 1,5 |
| Sessão (cartão, treino do toque, som no balão, resposta no 2º erro, instruções lidas, passo de fala, registro do microfone) | 2 |
| Aula no app (fora da beta, conta como atividade, XP, download do PN01, plano B sem internet) | 1 a 1,5 |
| Unidade com 2 ou 3 atividades (liberação, degustação, progresso) | 1 |
| Onboarding, checagem de 3 perguntas, controle, teste de nível, trilha, degustação, correção de rota | 2 a 2,5 |
| Web (APIs, /admin), migration, lembrete do dia 2, conquista, FAQ do suporte | 1,5 a 2 |
| Testes no Samsung e no simulador iOS | 1 |
| **Total no app e no conteúdo** | **de 12 a 14,5 dias** |
| Aulas em motion (10), em paralelo, com o agente de motion e a aprovação do Felipe | de 6 a 9 dias |

**Fase 1, de cerca de 9 a 11 dias:**
- **Entra:** o bloco 1 inteiro (5 aulas e Palavras), o onboarding com o grupo de controle, o "Começar do zero", a degustação, o lembrete do dia 2, a conquista e as métricas.
- **Fica para a fase 2:** o bloco 2, o "Já sei isso", a correção de rota automática e o resto do teste de nível.
- **As 5 aulas do bloco 1 andam em paralelo** e precisam estar prontas antes da OTA.

## 8. Ainda em aberto

- ~~Fatia que faz o teste de nível~~ **Fechado (conferido em 21/11/2026):**
  - Nos últimos 30 dias, 226 de 1.537 contas novas fizeram o teste de nível, ou 15%.
  - O app não sugere o teste ao longo da trilha. O convite aparece só em dois momentos: uma vez, depois da 1ª atividade, e no fim do tópico da degustação.
  - Desde 16/11, 29 alunos viram esse convite e 9 aceitaram (31%).
  - Conclusão: o teste de nível não alcança o iniciante a tempo, e a pergunta no onboarding continua necessária.
- A aprovação do roteiro e dos quadros da aula do PN01, que o agente de motion vai apresentar ao Felipe.
