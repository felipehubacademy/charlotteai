# Aulas em motion graphics

Aulas curtas em vídeo, uma por tópico da trilha, com a Charlotte como anfitriã e pausas interativas.
Fase de teste: nada disto está no app. O processo completo está no agente
[`.claude/agents/aula-motion.md`](../../../.claude/agents/aula-motion.md).

| Aula | Tópico | Duração | mp4 | Protótipo |
|---|---|---|---|---|
| [novice-01](novice-01/roteiro.md) | Novice N01 "Oi! Tudo bem?" | 90 s, 3 pausas | 4,3 MB | [link](https://claude.ai/artifact/3apHvU6orfnW6Tvy6xGsG7) (privado) |

## Custo por aula (piloto novice-01)

| Item | Uso | Custo |
|---|---|---|
| Voz da Charlotte (15 falas + 6 correções) | modelo de áudio barato, 21 chamadas, todas certas na 1ª | US$ 0,043 |
| Voz do Igorfina (3 falas) | 91 créditos do plano de voz (multilingual v2) | US$ 0,007 no preço de API |
| Montagem do vídeo | Chromium + ffmpeg locais, ~10 min no Mac | sem custo |
| **Total de voz** | | **cerca de US$ 0,05 e 91 créditos** |

- Créditos: o plano Creator tem cerca de 100 mil créditos por mês; uma aula usa menos de 0,1% deles. Mesmo com o dobro
  de falas de personagem, uma aula fica em 100 a 200 créditos.
- As vozes são geradas uma vez e guardadas em `<aula>/audio/` com o custo em `manifest.json`. Refazer o vídeo
  não gera voz de novo; mudar uma fala refaz só ela.
- O custo que pesa é o tempo de produção (roteiro, ajuste da cena e revisão), não a voz.

## Como entraria no app (proposta para discutir)

- **Onde:** dentro do tópico, como primeiro item ("Aula · 1:30") antes do Grammar, sem travar a progressão
  (quem pular segue normalmente). Também serve para a degustação: liberar a aula do 1º tópico e pedir uma
  nota ao final ("Essa aula te ajudou?").
- **Formato:** um mp4 vertical 720x1280 (H.264, ~4 a 5 MB por 90 s) + `aula.json` e `timings.json`
  (alguns KB) + 6 correções em mp3 (~20 KB cada). As perguntas não são "gravadas" como botão: o player
  nativo pausa no tempo da pausa e desenha o cartão por cima, como no protótipo. O vídeo também funciona
  sozinho (mostra a pergunta e depois a resposta).
- **Player:** `expo-video` já está no app; a fala usa o reconhecimento no aparelho que o Listening & Speaking
  já usa (`expo-speech-recognition`). Dá para lançar por OTA, sem build nativo.
- **Hospedagem:** Storage do Supabase com CDN, como os áudios da trilha (`curriculum-audio`). Não entra no
  pacote do app: 100 aulas seriam ~450 MB.
- **Offline:** ao abrir o tópico (ou no Wi-Fi, a aula do próximo tópico), baixar o mp4 e as correções com
  `expo-file-system` para o cache do app e tocar do arquivo local. Sem internet e sem cache, mostrar a aula
  como indisponível e deixar seguir para o Grammar.
- **XP e histórico:** se a aula der XP, o tipo novo precisa entrar no guard `charlotte.guard_practice_insert`
  (nova migration) e o resultado das pausas pode ir para o histórico de evolução. Decidir antes de lançar.
- **FAQ do suporte:** item novo de tela no app exige atualizar a `support_faq` na mesma tarefa.
