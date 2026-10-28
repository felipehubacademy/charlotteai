// lib/support-faq.ts
// Base de conhecimento do suporte do Queizy. É o material que o agente consulta
// para responder — NÃO deve inventar nada fora daqui. A versão viva fica na tabela
// support_faq (editável no /admin, aba FAQ); esta lista é a semente da tabela e a
// reserva se o banco não responder. Manter em PT-BR com acentuação correta (ver
// CLAUDE.md) e atualizar quando o produto mudar (nomes de telas e botões iguais aos do app).
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export interface FaqEntry { section: string; question: string; answer: string; sort?: number }

export const SUPPORT_FAQ_SEED: FaqEntry[] = [
  // ── Sobre o app ──────────────────────────────────────────────────────────
  { section: 'Sobre o app', question: 'O que é o Queizy?', answer:
`O Queizy (antes chamado Charlotte AI) é um app para aprender e praticar inglês com IA, da Hub Academy. A tutora dentro do app se chama Charlotte.
Recursos: trilha de estudos do básico ao avançado (Novice, Intermediate e Advanced), Live Voice (conversa por voz em tempo real com a Charlotte), Practice (conversa por texto, gramática e pronúncia) e Vocabulário com revisão.` },
  { section: 'Sobre o app', question: 'Em que idioma fica o app?', answer:
`Os botões, avisos e menus seguem o idioma do celular (português ou inglês), mas dá para escolher em Perfil > Idioma do app: Automático (do celular), Português ou English. O app reinicia no idioma escolhido.
O conteúdo das lições segue o nível: o inglês dos exercícios é sempre em inglês; as explicações são em português na Novice e em inglês no Inter e no Advanced.` },
  { section: 'Sobre o app', question: 'O app funciona sem internet?', answer:
`Não. O Queizy precisa de internet: as conversas, as correções e as vozes da Charlotte e do Igorfina são geradas na hora. Para o Live Voice, use Wi-Fi ou 4G estável.` },
  { section: 'Sobre o app', question: 'Tem versão para iPad ou tablet?', answer:
`Não. O Queizy foi feito para celular (iPhone e Android) e não tem versão própria para iPad ou tablet.` },
  { section: 'Sobre o app', question: 'Como atualizar o app?', answer:
`Quando sai uma versão nova, aparece o aviso "Tem versão nova do Queizy" no topo da tela inicial, com o botão "Atualizar", que abre a loja (App Store no iPhone, Google Play no Android). Também dá para atualizar direto pela loja: procure Queizy e toque em Atualizar.
O X fecha o aviso; ele volta em alguns dias até você atualizar. Sua conta, seu progresso e sua assinatura continuam iguais.` },

  // ── Guia do app (onde fica cada coisa) ───────────────────────────────────
  { section: 'Guia do app', question: 'Como navegar no app (barra de baixo)?', answer:
`A barra de baixo tem 5 ícones, sem nome escrito:
1. Casinha: tela inicial (trilha de estudos).
2. Telefone: Live Voice (ligar para a Charlotte).
3. Raio: Practice (conversa por texto, gramática e pronúncia).
4. Bloco de notas: Vocabulário.
5. Sua foto (ou o avatar): Perfil.` },
  { section: 'Guia do app', question: 'Onde vejo meu XP, minha sequência e minha posição no ranking?', answer:
`No topo das telas principais há três pílulas: o fogo laranja é a sequência (dias seguidos estudando), o raio verde é o XP total e o troféu é a posição no ranking do seu nível.
Tocando nas pílulas abre a tela "Seu progresso", com o XP total, o XP ganho hoje ("+X hoje"), os dias seguidos, a posição no ranking, as conquistas, as metas e o ranking completo.
O ranking completo tem duas abas: "Semana", com o XP desde segunda (zera toda segunda às 0h, horário de Brasília), e "Geral", com o XP total. Quem fica em 1º lugar, no Geral ou na semana, ganha uma comemoração no app e um card para compartilhar nas redes.` },
  { section: 'Guia do app', question: 'Como ganho XP?', answer:
`Ganha XP quem estuda: concluindo atividades da trilha (Gramática, Listening & Speaking, Role-play e Guided Chat), mandando mensagens no Practice (Free Chat por texto ou áudio, e Gramática), revisando palavras no Vocabulário e cumprindo as metas. As missões do dia e o desafio da semana pagam XP extra quando concluídos (cada um paga uma vez por período). O XP soma no total, na sequência e no ranking.` },
  { section: 'Guia do app', question: 'Onde vejo meu nível?', answer:
`Na tela inicial, o cartão da trilha mostra o nome do nível (Novice, Intermediate ou Advanced), quantos módulos tem e o percentual concluído. Em "Seu progresso" (tocando nas pílulas do topo) aparece "Rumo ao" próximo nível.
O seletor no cartão da trilha permite espiar a trilha de outros níveis (pré-visualização), sem mudar o seu nível.
Para fazer o teste de nível: Perfil > Conta > Fazer teste de nível (aparece como Refazer teste de nível depois da primeira vez; o resultado substitui o nível atual). O teste faz parte do plano.` },
  { section: 'Guia do app', question: 'Como funciona a trilha de estudos?', answer:
`A trilha fica na tela inicial. Ela é dividida em módulos, e cada módulo em tópicos. Cada tópico tem 4 atividades: Gramática, Listening & Speaking, Role-play e Guided Chat. Cada atividade concluída destrava a próxima, e cada tópico completo (as 4 atividades) destrava o seguinte. O cartão da trilha mostra quantos tópicos você já concluiu.
Para concluir uma atividade é preciso atingir o mínimo mostrado nela (por exemplo "precisa 70%"). A primeira atividade de Gramática do nível é mais curta (5 exercícios) e é concluída com qualquer nota. Atividades já feitas podem ser refeitas pelo botão "Refazer". Ao completar o nível, o app oferece a passagem para o próximo.` },
  { section: 'Guia do app', question: 'Como faço uma ligação (Live Voice)?', answer:
`Toque no ícone de telefone na barra de baixo e depois em "Conversar com" (o botão mostra o nome de quem atende). A ligação é com quem estiver escolhido na Família Queizy: a Charlotte ou o Igorfina (Perfil > Você no Queizy > Família Queizy). Na primeira vez o celular pede permissão para usar o microfone: é preciso permitir.
Durante a ligação, o selo mostra quem está falando e "Pode falar" quando é a sua vez; a linha embaixo da foto mexe com a sua voz. O botão de legenda (CC) liga e desliga a transcrição na tela; tocando na fala de quem atende, aparece a tradução em português. Os botões de baixo silenciam o microfone, desligam e trocam entre alto-falante e fone.
Se ninguém falar por um tempo, aparece "Ainda está aí?" e a ligação pausa sozinha (o tempo para de contar); toque em "Retomar" para continuar de onde parou. Quando os minutos do mês estão acabando, aparece quanto falta e quem atende se despede antes de a ligação cair.
Os minutos restantes do mês aparecem no cartão "Seu tempo este mês". No ícone de relógio ficam as "Conversas anteriores", com resumo e transcrição de cada ligação (com a Charlotte e com o Igorfina).` },
  { section: 'Guia do app', question: 'Quantos minutos de Live Voice eu tenho?', answer:
`Na degustação (conta nova, ainda sem assinatura) são 3 minutos, uma vez só. Com assinatura, os minutos são por mês: 5 minutos durante os 7 dias grátis e 20 minutos no Premium. Eles renovam no dia 1º de cada mês.
Para ver quantos restam, não precisa ligar: toque no ícone de telefone na barra de baixo; o cartão "Seu tempo este mês" mostra os minutos, logo acima do botão "Conversar com a Charlotte" (esse botão já inicia a chamada).
Quando acabam, aparece "Seu tempo acabou este mês". Quem está na degustação ou nos 7 dias grátis pode assinar o Premium; quem já assina pode comprar pacotes de minutos extras em "Comprar minutos" ou "Ver pacotes de minutos". Minutos extras comprados não vencem no fim do mês.
Com assinatura, também dá para ganhar minutos extras em "Estudar junto": quando uma conta nova aceita o seu convite, cada um ganha 5 minutos; e quem vence uma Competição ganha 5 minutos. Na degustação, os minutos extras ficam guardados e passam a valer quando você assina.` },
  { section: 'Guia do app', question: 'O que tem no Practice?', answer:
`No ícone de raio ficam três modos: Free Chat (conversa livre por texto ou segurando o microfone para falar, com quem estiver escolhido na Família), Gramática e Pronúncia. "Trocar de modo" alterna entre eles.
No Free Chat, a conversa nova começa com quem está escolhido na Família, e "Conversar com" troca só aquela conversa: a Charlotte ou o Igorfina (veja "O que é a Família Queizy?").
No menu ⋯ de cada modo: no Free Chat, "Nova conversa" e "Conversas anteriores"; na Gramática, "Minhas correções" (os erros corrigidos pela Charlotte); na Pronúncia, "Meu histórico". Em todos, "Como funciona".
Na Pronúncia, segure o botão do microfone enquanto fala uma frase em inglês; a Charlotte avalia a pronúncia.` },
  { section: 'Guia do app', question: 'Como funciona o Vocabulário?', answer:
`No ícone de bloco de notas ficam a "Palavra do dia" e "Sua coleção". Dá para incluir palavras em "Adicionar palavra" e ouvir a pronúncia normal ou devagar.
O app agenda as revisões: quando há palavras para revisar aparece "Revisar hoje". Cada palavra mostra o estado: Nova, Aprendendo ou Dominada.` },
  { section: 'Guia do app', question: 'Como reporto um problema num exercício?', answer:
`Em todo exercício (trilha, Role-play, Guided Chat, Practice, teste de nível e revisão de vocabulário) tem uma bandeira no topo da tela. Toque nela, escolha o que aconteceu (por exemplo, "Minha resposta estava certa" ou "O app não entendeu minha fala"), escreva mais se quiser e toque em "Enviar".
O reporte chega para a equipe junto com o exercício e a sua resposta, e a gente corrige o que for preciso.` },
  { section: 'Guia do app', question: 'O que é a Família Queizy?', answer:
`A Família Queizy reúne os personagens do app: a Charlotte (sua tutora) e o Igorfina, comediante e imitador. São personagens do Queizy: as respostas e as vozes deles são geradas por IA, na hora. As imitações do Igorfina também são personagens, não pessoas de verdade; quando ele imita, aparece o selo com o nome da imitação.
- Para escolher quem te acompanha: no primeiro acesso, o app pergunta "Quem vai te acompanhar?" (o Igorfina já vem marcado; conta nova começa com ele). Para trocar depois, toque na foto ao lado da saudação, na tela inicial, ou vá em Perfil > Você no Queizy > Família Queizy e toque no cartão (o escolhido fica com o selo "Escolhido"). Quem está escolhido fala com você na tela inicial, atende quando você liga (ícone de telefone) e começa as conversas novas do Free Chat.
- No Free Chat, "Conversar com" troca com quem é aquela conversa. Cada conversa continua com quem ela foi começada.
- O Igorfina tem uma trilha própria, o Manual do F#did@ (veja "O que é o Manual do F#did@?"). Ela aparece no cartão da trilha da tela inicial quando ele está escolhido, e no cartão dele na Família, em "Ver trilha".
A trilha principal, a Gramática, a Pronúncia e o suporte são com a Charlotte.` },
  { section: 'Guia do app', question: 'Posso ligar para o Igorfina?', answer:
`Pode. Escolha o Igorfina na Família (Perfil > Você no Queizy > Família Queizy, toque no cartão dele) e depois toque no ícone de telefone na barra de baixo e em "Conversar com o Igorfina". É uma ligação de voz em tempo real, com a voz dele e, de vez em quando, uma imitação (o selo com o nome da imitação aparece na tela).
Ele adapta a conversa ao seu nível, pode puxar o assunto do tópico que você está estudando e lembra do que vocês conversaram nas últimas ligações. Os minutos saem da mesma cota de ligação do mês ("Seu tempo este mês"). Cada ligação fica em "Conversas anteriores" (ícone de relógio), com resumo e transcrição; só o texto é guardado, sem áudio, e dá para apagar.` },
  { section: 'Guia do app', question: 'O que é o Manual do F#did@?', answer:
`É a trilha do Igorfina, da Família Queizy: inglês de sobrevivência para o dia a dia, viagem e situações reais, com o humor e as imitações dele.
- São 10 módulos e 50 tópicos. Cada tópico tem as mesmas 4 atividades da trilha principal: Gramática, Listening & Speaking, Role-play e Guided Chat, com o Igorfina no lugar da Charlotte. As explicações são em português.
- Em alguns tópicos ele faz uma imitação a atividade toda; o cartão do tópico mostra o selo com o nome da imitação (por exemplo, "Presidente" ou "Astro do basquete").
- Onde fica: na tela inicial, no cartão da trilha, quando o Igorfina está escolhido na Família (Perfil > Você no Queizy > Família Queizy), ou direto na tela Família, em "Ver trilha".
- Os tópicos abrem em ordem, como na trilha principal. O progresso é separado: fazer o Manual não avança a sua trilha de nível.
- Antes de assinar, o Manual entra na degustação: no primeiro dia, um tópico especial ("SEU TÓPICO GRÁTIS"), com as 4 atividades liberadas em qualquer ordem, e a cada dia seguinte, até o 5º, mais um tópico, a partir do começo do Manual; os outros aparecem com cadeado e fazem parte da assinatura. Tocar num deles abre a tela de assinatura; para seguir no tópico grátis, toque em "Continuar na degustação".` },
  { section: 'Guia do app', question: 'Os áudios das conversas ficam salvos?', answer:
`Sim. No Free Chat, os áudios que você grava e as respostas faladas ficam salvos por 90 dias: ao reabrir a conversa em "Conversas anteriores", dá para ouvir de novo. Depois de 90 dias o áudio é apagado e a mensagem fica só com o texto. Conversas de antes dessa mudança mostram apenas o texto.` },
  { section: 'Guia do app', question: 'Onde ficam as metas e o desafio da semana?', answer:
`Na tela "Seu progresso" (tocando nas pílulas de fogo, raio e troféu no topo), na parte "Metas". Ali ficam o "XP de hoje", as 3 missões do dia e o "Desafio da semana". Cada missão diz o que fazer e onde, e tocar nela leva direto ao lugar. O aviso do desafio da semana que chega no celular também abre essa tela.` },
  { section: 'Guia do app', question: 'Como funcionam as missões do dia e o desafio da semana?', answer:
`Todo dia você recebe 3 missões novas: uma da trilha (por exemplo, concluir atividades ou fazer um Role-play), uma de prática extra (no Practice ou no Vocabulário) e uma de constância (ganhar XP no dia ou manter a sequência). O desafio da semana vai de segunda a domingo e vale mais XP. As missões mudam todo dia e as metas seguem o seu nível.
O XP entra sozinho: depois de cumprir, ao voltar para a tela inicial (ou abrir "Metas") aparece o aviso "Missão concluída". Com as 3 do dia feitas tem comemoração, e ao concluir o desafio da semana dá para compartilhar o card. Cada missão paga uma vez.` },
  { section: 'Guia do app', question: 'Como estudar com amigos (Estudar junto)?', answer:
`Fica em Perfil > Você no Queizy > Estudar junto (ou em "Seu progresso"):
- "Encontrar amigos": busca pelo nome, sobrenome ou @. A pessoa recebe o pedido e, ao aceitar, vocês viram amigos de estudo.
- "Convidar amigos": manda o seu código de convite. Quando uma conta nova entra pelo convite (até 14 dias depois do cadastro, em "Recebeu um convite?"), cada um ganha 5 minutos de Live Voice.
- "Competições": desafie amigos por 24 horas ou 7 dias (quem faz mais XP, quem pratica mais ou quem acerta mais na trilha). Quem vencer ganha 5 minutos de Live Voice. Recebeu o link de uma competição? Com o app instalado, ao tocar no link você já entra na disputa e aparece a tela "Você entrou na competição"; sem o app, baixe, crie a conta e você entra logo depois do cadastro. Para sair de uma competição em andamento, toque no "⋮" no topo do cartão dela e em "Sair da competição"; se sobrar só uma pessoa, a competição é encerrada sem vencedor.
Pedidos de amizade e convites recebidos aparecem numa linha na tela inicial. Para os amigos te acharem, a opção "Aparecer na busca" precisa estar ligada em Perfil > Preferências.` },
  { section: 'Guia do app', question: 'Como coloco minha foto no perfil?', answer:
`No Perfil, toque na sua foto (ou no círculo sem foto) e escolha "Escolher da galeria" ou "Tirar uma foto"; depois arraste ou use os botões para ajustar o enquadramento e salve. A foto aparece no ranking, nas Conquistas recentes e no Estudar junto. Ao colocar a primeira foto, você ganha a conquista "Cara do Queizy" (+100 XP). Para trocar, é só repetir o caminho.` },
  { section: 'Guia do app', question: 'O que tem no Perfil?', answer:
`Perfil (sua foto na barra de baixo):
- Conta: Alterar senha e Fazer teste de nível (Refazer teste de nível, depois da primeira vez).
- Preferências: Sons, Vibração, Voz da Charlotte, Aparecer na busca, Horário do lembrete e Idioma do app.
- Assinatura: situação da assinatura, Gerenciar assinatura e Restaurar compras.
- Você no Queizy: Minha evolução, Estudar junto e Família Queizy.
- Ajuda: Ajuda e suporte.
- Política de Privacidade, Termos de Uso e Sobre.
- Sessão: Sair da conta e Excluir minha conta.` },
  { section: 'Guia do app', question: 'Como mudo o idioma do app?', answer:
`Em Perfil > Idioma do app, escolha Automático (do celular), Português ou English. O app reinicia e passa a mostrar as telas e os avisos no idioma escolhido.
O conteúdo das lições continua no idioma do seu nível: na Novice as explicações são em português; no Inter e no Advanced, em inglês.` },
  { section: 'Guia do app', question: 'Como mudo o horário do lembrete?', answer:
`Em Perfil > Horário do lembrete, escolha "No horário em que costumo estudar", que é o padrão, ou "Em um horário fixo" e ajuste a hora no + e no − (das 9h às 20h). O horário vale para o lembrete diário de praticar, no fuso do seu celular.
Os avisos do Queizy só chegam entre 9h e 21h. Para não receber nenhum aviso, desative as notificações do Queizy nos ajustes do celular.
Na degustação, depois do tópico grátis do dia, o cartão "Tópico de hoje concluído!" na tela inicial também leva a essa tela.` },
  { section: 'Guia do app', question: 'Onde vejo minha evolução?', answer:
`Em Perfil > Você no Queizy > Minha evolução (ou "Ver minha evolução" na tela inicial). Mostra o que você já domina e o que vale treinar, com base nas atividades feitas.` },

  // ── Problemas comuns ─────────────────────────────────────────────────────
  { section: 'Problemas comuns', question: 'Não vejo meu XP ou o XP não somou', answer:
`O XP total fica no raio verde, no topo das telas principais; tocando nele aparece também o XP de hoje.
Se uma atividade não somou: a atividade da trilha só conta quando é concluída com o mínimo pedido. A atualização pode levar alguns segundos; fechar e abrir o app de novo costuma resolver. Confira também se está na conta certa (mesmo e-mail do cadastro).
Se ainda assim o XP estiver errado, um atendente verifica a conta.` },
  { section: 'Problemas comuns', question: 'Não consigo fazer a ligação (Live Voice)', answer:
`Passo a passo:
1. Microfone: o app precisa de permissão. iPhone: Ajustes > Queizy > Microfone. Android: Configurações > Apps > Queizy > Permissões > Microfone.
2. Minutos: se aparecer "Seu tempo acabou este mês" ou "Limite mensal atingido", os minutos do mês acabaram. Eles voltam no dia 1º; antes disso, dá para assinar o Premium (teste grátis) ou comprar minutos extras (assinantes).
3. Internet: use Wi-Fi ou 4G estável.
4. Atualize o app na App Store ou no Google Play e feche e abra de novo.
5. Sem som: tire o fone Bluetooth ou cabo e confira o volume do celular.
Se continuar sem funcionar depois disso, um atendente analisa (ajuda informar o modelo do celular).` },
  { section: 'Problemas comuns', question: 'A pronúncia diz que não entendeu o que eu falei', answer:
`Segure o botão do microfone durante toda a frase e solte só no fim. Fale perto do celular, num lugar silencioso. Fones Bluetooth podem atrapalhar o reconhecimento: no iPhone, prefira o microfone do próprio aparelho.
Depois de cada tentativa o app mostra o que entendeu e, se faltou alguma palavra, "Faltou: ...". Errando duas vezes a mesma frase, aparece "Ouvir a frase de novo". Números (por extenso ou em algarismos), contrações ("I'm" ou "I am"), "gonna"/"going to" e grafia britânica ou americana contam igual. Se ainda assim não der, dá para tocar em "Pular".
Na primeira atividade de fala, o botão aparece apagado com o balão "Toque aqui para liberar o microfone": toque uma vez e permita. Se aparecer o aviso de que o Queizy está sem acesso ao microfone (ou "Microfone bloqueado"), toque em "Abrir Ajustes" e libere o microfone. Se o reconhecimento de voz do celular falhar, o app avisa e passa a conferir pela internet na próxima tentativa.` },
  { section: 'Problemas comuns', question: 'Não acho uma tela ou função', answer:
`Use o guia da barra de baixo: casinha (tela inicial e trilha), telefone (Live Voice), raio (Practice), bloco de notas (Vocabulário) e sua foto (Perfil). XP, sequência, ranking e metas ficam em "Seu progresso", tocando nas pílulas do topo. Se a função procurada não existir no app, isso é registrado como sugestão para a equipe.` },
  { section: 'Problemas comuns', question: 'O app travou ou deu erro', answer:
`Atualize o app na loja, feche-o por completo e abra de novo. Confira a internet. Se o erro continuar, um atendente analisa; ajuda informar o que estava fazendo, a mensagem que apareceu e o modelo do celular.` },

  // ── Planos e assinatura ──────────────────────────────────────────────────
  { section: 'Planos e assinatura', question: 'Quais são os planos e preços?', answer:
`Ao criar a conta, você experimenta de graça por 5 dias: a cada dia libera um tópico novo da trilha em cada um dos 3 níveis (com Gramática, Listening & Speaking, Role-play e Guided Chat), mensagens no Practice (10 no primeiro dia e mais 5 a cada dia seguinte) e 3 minutos de Live Voice (uma vez só). Para continuar: Plano Mensal R$ 29,99/mês e Plano Anual R$ 199,99/ano (equivale a cerca de R$ 16,67/mês). O teste de nível também faz parte do plano.
A degustação dura 5 dias: o que já foi liberado continua disponível depois, mas não libera mais nada. No Perfil aparece em que dia você está ("Degustação · dia 2 de 5"). Ao terminar o tópico do dia, a tela de assinatura abre com a opção de seguir agora ou esperar o tópico do dia seguinte. Durante a degustação, o que faz parte do plano aparece com cadeado. Ao tocar nele (ou em "Fazer teste de nível"), a tela de assinatura abre e você pode fechar no X ou em "Continuar na degustação" e seguir usando o que é grátis.
Dá para assinar de dois jeitos:
- No app, pela loja: App Store (iPhone) ou Google Play (Android), com 7 dias grátis para quem nunca assinou. Para começar os 7 dias, a loja pede uma forma de pagamento cadastrada na conta Apple ou Google (no site, o cartão de crédito). A cobrança só começa ao fim dos 7 dias; se cancelar na loja antes disso, não paga nada.
- Pelo site, em queizy.com/assinar: Mensal no cartão de crédito, Anual no cartão de crédito à vista ou Anual no Pix à vista (veja "Como funciona a assinatura pelo site?").` },
  { section: 'Planos e assinatura', question: 'Como funciona a assinatura pelo site?', answer:
`Em queizy.com/assinar você escolhe o plano e a forma de pagamento e informa nome, e-mail, CPF, celular e CEP. Depois conclui o pagamento numa página segura de pagamento, onde só falta o cartão (ou aparece o Pix).
- Mensal no cartão de crédito: renova todo mês. Tem 7 dias grátis para quem nunca assinou; a primeira cobrança é feita ao fim dos 7 dias.
- Anual no cartão de crédito à vista: 7 dias grátis para quem nunca assinou, depois uma cobrança única de R$ 199,99, com renovação automática a cada ano.
- Anual no Pix à vista: paga na hora e libera 12 meses de acesso. Não renova sozinho, porque o Pix não tem cobrança automática. Não tem os 7 dias grátis, mas dá para pedir reembolso em até 7 dias do pagamento (veja a pergunta sobre reembolso).
Nos planos no cartão, se cancelar a assinatura antes do fim dos 7 dias grátis (Perfil > Assinatura > Gerenciar assinatura > Cancelar assinatura), não paga nada.
Formas de pagamento: cartão de crédito ou Pix (o Pix só no Anual). Não aceitamos boleto.
Não há parcelamento: quem prefere pagar aos poucos pode escolher o Mensal.
Entre no app com o mesmo e-mail informado no site: é nessa conta que o acesso é liberado.` },
  { section: 'Planos e assinatura', question: 'Tenho um cupom ou código de desconto. Onde uso?', answer:
`Cupons e códigos de desconto, inclusive o código de um parceiro do Queizy, valem só na assinatura pelo site: em queizy.com/assinar, escreva o código no campo de cupom antes de continuar. Quem entra pelo link de um parceiro já encontra o código preenchido.
Por quanto tempo o desconto vale depende da campanha: só na primeira cobrança, em algumas cobranças ou em todas. Depois das cobranças com desconto, a assinatura volta sozinha ao preço normal. Se tiver dúvida, um atendente confirma.
Cupom e desconto de parceiro não se somam: vale o maior.
Não é possível usar cupom na assinatura pela App Store ou pelo Google Play.
Se o código não for aceito, confira a grafia e se ele está valendo (cupons de campanha têm data para começar e para terminar); se continuar, um atendente ajuda.` },
  { section: 'Planos e assinatura', question: 'Assinei no iPhone. Funciona no Android (e vice-versa)?', answer:
`Sim. A assinatura fica na sua conta do Queizy: entrando com o mesmo e-mail e senha, ela vale no iPhone e no Android, seja qual for a loja em que você assinou (e também vale a assinatura feita pelo site).
Cancelar, trocar de plano ou pedir reembolso continua sendo na loja onde você assinou: assinatura da App Store, pela Apple (num iPhone, iPad ou Mac, em Ajustes > seu nome > Assinaturas, ou em reportaproblem.apple.com para reembolso); assinatura do Google Play, pelo Google Play (também pelo navegador, em play.google.com/store/account/subscriptions, com a mesma conta Google da compra).
Se você tocar em Perfil > Assinatura > Gerenciar assinatura no aparelho da outra loja, o app mostra um aviso com esse caminho.` },
  { section: 'Planos e assinatura', question: 'Assinei pelo site com o e-mail errado. E agora?', answer:
`Logo depois do pagamento, a tela de confirmação do site mostra o e-mail da compra. Se ele estiver errado, toque em "Corrigir", escreva o e-mail certo e salve: mandamos para ele o link para criar a senha.
Se você já saiu dessa tela, fale com o suporte (suporte@queizy.com ou WhatsApp) mandando o e-mail certo, o e-mail que foi digitado na compra (mesmo errado), o nome completo usado no pagamento e, se pagou no cartão, só os 4 últimos dígitos dele. Conferimos a compra e corrigimos na hora.
A correção vale para contas criadas pela compra que ainda não foram usadas no app, em até 30 dias. Se o e-mail certo já tiver uma conta no Queizy, um atendente junta as duas.` },
  { section: 'Planos e assinatura', question: 'Como cancelar a assinatura?', answer:
`O cancelamento é feito na loja (a Apple e o Google gerenciam a assinatura):
- iPhone: Ajustes > seu nome > Assinaturas > Queizy (pode aparecer como Charlotte em versões antigas) > Cancelar assinatura.
- Android: Google Play > foto de perfil > Pagamentos e assinaturas > Assinaturas > Queizy (pode aparecer como Charlotte) > Cancelar.
- No app: Perfil > Assinatura > Gerenciar assinatura abre essa tela da loja.
- Assinou numa loja e está usando o app na outra (por exemplo, assinou no iPhone e agora usa um Android)? O Gerenciar assinatura mostra um aviso explicando onde cancelar: assinatura da App Store, num iPhone, iPad ou Mac (Ajustes > seu nome > Assinaturas); assinatura do Google Play, pelo navegador em play.google.com/store/account/subscriptions, com a mesma conta Google da compra.
- Assinou pelo site (queizy.com/assinar)? Cancele no app em Perfil > Assinatura > Gerenciar assinatura > Cancelar renovação. Durante os 7 dias grátis, o botão se chama Cancelar assinatura: nada é cobrado e você continua usando até o fim do teste.
Ao cancelar, o acesso continua até o fim do período já pago.` },
  { section: 'Planos e assinatura', question: 'Como pedir reembolso?', answer:
`Depende de onde você assinou:
- Pelo site (queizy.com): em até 7 dias do pagamento, no app, em Perfil > Assinatura > Gerenciar assinatura > Pedir reembolso, ou por e-mail em suporte@queizy.com. No Pix o valor volta em instantes; no cartão, o estorno aparece na fatura (até duas faturas). Durante os 7 dias grátis nada foi cobrado, então não há reembolso: para não ser cobrado, cancele em Gerenciar assinatura > Cancelar assinatura. A tela mostra até quando dá para pedir o reembolso.
- iPhone (App Store): pelo site reportaproblem.apple.com.
- Android (Google Play): pela ajuda do Google Play (pedir reembolso), dentro do prazo do Google.
Casos específicos de cobrança ou reembolso são encaminhados a um atendente.` },
  { section: 'Planos e assinatura', question: 'Assinei, mas o app continua bloqueado', answer:
`Depende de onde você assinou:
- Pela App Store ou pelo Google Play: use Perfil > Assinatura > Restaurar compras, logado na mesma conta da loja usada na compra. Se aparecer "Assinatura vinculada a outra conta", a compra foi feita com outro login do Queizy; um atendente ajuda a resolver.
- Pelo site (queizy.com/assinar): o acesso é liberado na conta do e-mail informado no site, logo depois que o pagamento é confirmado (no Pix, em instantes). Confira se você entrou no app com esse mesmo e-mail (ele aparece em Perfil, logo abaixo do nome) e feche e abra o app. "Restaurar compras" não vale para compras feitas no site.
Se continuar bloqueado, um atendente confere o pagamento.` },

  // ── Conta e acesso ───────────────────────────────────────────────────────
  { section: 'Conta e acesso', question: 'Como redefinir a senha?', answer:
`Na tela de login, toque em "Esqueceu sua senha?", informe o e-mail do cadastro e siga o link enviado. Logado, dá para trocar em Perfil > Conta > Alterar senha. O suporte também pode enviar um e-mail de redefinição para o e-mail cadastrado.` },
  { section: 'Conta e acesso', question: 'Não consigo entrar na conta', answer:
`O Queizy entra com e-mail e senha (não há entrada com Apple ou Google). Confirme que está usando o mesmo e-mail do cadastro e tente redefinir a senha em "Esqueceu sua senha?".
O e-mail de redefinição chega de noreply@queizy.com em alguns minutos; se não aparecer, confira as pastas de spam e lixo eletrônico. Se ainda assim não chegar, o suporte pode enviar de novo para o e-mail cadastrado.
Se assinou e o acesso não liberou, veja a pergunta sobre o app bloqueado depois de assinar.
A mesma conta funciona em mais de um celular, iPhone ou Android: entre com o mesmo e-mail e senha, e o progresso é o mesmo em todos.` },
  { section: 'Conta e acesso', question: 'Como excluir a conta?', answer:
`Perfil > Sessão > Excluir minha conta. É permanente: apaga a conta e os dados. Excluir a conta não cancela a assinatura na loja; cancele antes pela App Store ou pelo Google Play. Pedidos de exclusão pelo suporte são confirmados por um atendente.` },

  // ── Contato ──────────────────────────────────────────────────────────────
  { section: 'Contato', question: 'Como falar com o suporte?', answer:
`No app: Perfil > Ajuda > Ajuda e suporte. Lá ficam "Conversar com o suporte" (chat aqui no app, com resposta na hora; se precisar, a equipe do Queizy responde no mesmo chat e o aluno recebe um aviso) e "Falar no WhatsApp" (abre o WhatsApp do suporte já com um código que identifica a conta na hora).
Também pelo WhatsApp (11) 5199-5992 e pelo e-mail suporte@queizy.com.` },
];

export function formatFaq(entries: FaqEntry[]): string {
  const bySection = new Map<string, FaqEntry[]>();
  for (const e of entries) {
    if (!bySection.has(e.section)) bySection.set(e.section, []);
    bySection.get(e.section)!.push(e);
  }
  const parts = ['# FAQ Queizy (fonte de verdade do suporte)'];
  for (const [section, list] of bySection) {
    parts.push(`\n## ${section}`);
    for (const e of list) parts.push(`### ${e.question}\n${e.answer}`);
  }
  return parts.join('\n');
}

// Reserva estática (mesmo formato da tabela).
export const SUPPORT_FAQ = formatFaq(SUPPORT_FAQ_SEED);

// Cache curto: o agente roda a cada mensagem; edições no /admin valem em até 1 min.
let cache: { at: number; text: string; questions: string[] } | null = null;
const TTL = 60_000;

export function invalidateFaqCache() { cache = null; }

/** FAQ ativa do banco (tabela support_faq); cai para a semente se o banco falhar ou estiver vazio. */
export async function getSupportFaq(): Promise<{ text: string; questions: string[] }> {
  if (cache && Date.now() - cache.at < TTL) return cache;
  let entries: FaqEntry[] = SUPPORT_FAQ_SEED;
  try {
    const { data, error } = await getSupabaseAdmin().from('support_faq')
      .select('section, question, answer, sort').eq('is_active', true)
      .order('sort', { ascending: true }).order('created_at', { ascending: true });
    if (!error && data?.length) entries = data as FaqEntry[];
  } catch { /* reserva */ }
  cache = { at: Date.now(), text: formatFaq(entries), questions: entries.map(e => e.question) };
  return cache;
}
