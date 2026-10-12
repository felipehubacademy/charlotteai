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
`Os botões, avisos e menus seguem o idioma do celular (português ou inglês). O conteúdo das aulas e dos exercícios é sempre em inglês, porque é o que o aluno está aprendendo. Para ver os menus em português, o idioma do aparelho precisa estar em português.` },

  // ── Guia do app (onde fica cada coisa) ───────────────────────────────────
  { section: 'Guia do app', question: 'Como navegar no app (barra de baixo)?', answer:
`A barra de baixo tem 5 ícones, sem nome escrito:
1. Casinha: Início (trilha de estudos).
2. Telefone: Live Voice (ligar para a Charlotte).
3. Raio: Practice (conversa por texto, gramática e pronúncia).
4. Bloco de notas: Vocabulário.
5. Sua foto (ou o avatar): Perfil.` },
  { section: 'Guia do app', question: 'Onde vejo meu XP, minha sequência e minha posição no ranking?', answer:
`No topo das telas principais há três pílulas: o fogo laranja é a sequência (dias seguidos estudando), o raio verde é o XP total e o troféu é a posição no ranking do seu nível.
Tocando nas pílulas abre a tela "Seu progresso", com o XP total, o XP ganho hoje ("+X hoje"), os dias seguidos, a posição no ranking, as conquistas, as metas e o ranking completo.` },
  { section: 'Guia do app', question: 'Como ganho XP?', answer:
`Ganha XP quem estuda: concluindo atividades da trilha (Gramática, Listening & Speaking, Role-play e Guided Chat), conversando no Practice e cumprindo as metas. A meta de hoje e o desafio da semana pagam XP extra quando concluídos (cada meta paga uma vez por período). O XP soma no total, na sequência e no ranking.` },
  { section: 'Guia do app', question: 'Onde vejo meu nível?', answer:
`Na tela Início, o cartão da trilha mostra o nome do nível (Novice, Intermediate ou Advanced), quantos módulos tem e o percentual concluído. Em "Seu progresso" (tocando nas pílulas do topo) aparece "Rumo ao" próximo nível.
O seletor no cartão da trilha permite espiar a trilha de outros níveis (pré-visualização), sem mudar o seu nível.
Para refazer o teste de nível: Perfil > Conta > Refazer teste de nível (o resultado substitui o nível atual).` },
  { section: 'Guia do app', question: 'Como funciona a trilha de estudos?', answer:
`A trilha fica na tela Início. Ela é dividida em módulos e unidades; cada unidade tem atividades de Gramática, Listening & Speaking, Role-play e Guided Chat. Cada atividade concluída destrava a próxima, e cada unidade completa destrava a seguinte.
Para concluir é preciso atingir o mínimo mostrado na atividade (por exemplo "precisa 70%"). Atividades já feitas podem ser refeitas pelo botão "Refazer". Ao completar o nível, o app oferece a passagem para o próximo.` },
  { section: 'Guia do app', question: 'Como ligo para a Charlotte (Live Voice)?', answer:
`Toque no ícone de telefone na barra de baixo e depois em "Conversar com a Charlotte". Na primeira vez o celular pede permissão para usar o microfone: é preciso permitir.
Na mesma tela ficam os minutos restantes do mês, "Ver chamadas anteriores" (com resumo e transcrição de cada conversa) e "Ajuda".` },
  { section: 'Guia do app', question: 'Quantos minutos de Live Voice eu tenho?', answer:
`Os minutos são por mês: 5 minutos no teste grátis e 20 minutos no Premium (e nas contas institucionais). Eles renovam no dia 1º de cada mês.
Quando acabam, aparece "Seu tempo acabou este mês". Quem está no teste pode assinar o Premium; quem já assina pode comprar pacotes de minutos extras em "Comprar minutos" ou "Ver pacotes de minutos". Minutos extras comprados não vencem no fim do mês.
Convidar alguém em "Estudar junto" também dá minutos de Live Voice para os dois.` },
  { section: 'Guia do app', question: 'O que tem no Practice?', answer:
`No ícone de raio ficam três modos: Free Chat (conversa livre com a Charlotte por texto ou segurando o microfone para falar), Gramática e Pronúncia. "Trocar de modo" alterna entre eles.
Também ficam lá as "Conversas anteriores", "Minhas correções" (os erros corrigidos pela Charlotte) e "Meu histórico".
Na Pronúncia, segure o botão do microfone enquanto fala uma frase em inglês; a Charlotte avalia a pronúncia.` },
  { section: 'Guia do app', question: 'Como funciona o Vocabulário?', answer:
`No ícone de bloco de notas ficam a "Palavra do dia" e "Sua coleção". Dá para incluir palavras em "Adicionar palavra" e ouvir a pronúncia normal ou devagar.
O app agenda as revisões: quando há palavras para revisar aparece "Revisar hoje". Cada palavra mostra o estado: Nova, Aprendendo ou Dominada.` },
  { section: 'Guia do app', question: 'Onde ficam as metas e o desafio da semana?', answer:
`Na tela "Seu progresso" (tocando nas pílulas de fogo, raio e troféu no topo), na parte "Metas": "Meta de hoje" e "Desafio da semana". Cada uma paga XP extra quando concluída.` },
  { section: 'Guia do app', question: 'Como estudar com amigos (Estudar junto)?', answer:
`Em Perfil > Você no Queizy > Estudar junto (ou em "Seu progresso") dá para procurar amigos pelo nome ou pelo @ e convidar pessoas. Quem convida e quem entra ganham minutos de Live Voice.
Pedidos de amizade e convites recebidos aparecem numa linha na tela Início. Para aparecer na busca, a opção "Aparecer na busca" precisa estar ligada em Perfil > Preferências.` },
  { section: 'Guia do app', question: 'O que tem no Perfil?', answer:
`Perfil (sua foto na barra de baixo):
- Conta: Alterar senha e Refazer teste de nível.
- Preferências: Sons, Vibração, Voz da Charlotte e Aparecer na busca.
- Assinatura: situação da assinatura, Gerenciar assinatura e Restaurar compras.
- Você no Queizy: Minha evolução e Estudar junto.
- Ajuda: Ajuda e suporte.
- Política de Privacidade, Termos de Uso e Sobre.
- Sessão: Sair da conta e Excluir minha conta.` },
  { section: 'Guia do app', question: 'Onde vejo minha evolução?', answer:
`Em Perfil > Você no Queizy > Minha evolução (ou "Ver minha evolução" na tela Início). Mostra o que você já domina e o que vale treinar, com base nas atividades feitas.` },

  // ── Problemas comuns ─────────────────────────────────────────────────────
  { section: 'Problemas comuns', question: 'Não vejo meu XP ou o XP não somou', answer:
`O XP total fica no raio verde, no topo das telas principais; tocando nele aparece também o XP de hoje.
Se uma atividade não somou: a atividade da trilha só conta quando é concluída com o mínimo pedido. A atualização pode levar alguns segundos; fechar e abrir o app de novo costuma resolver. Confira também se está na conta certa (mesmo e-mail do cadastro).
Se ainda assim o XP estiver errado, um atendente verifica a conta.` },
  { section: 'Problemas comuns', question: 'Não consigo ligar para a Charlotte (Live Voice)', answer:
`Passo a passo:
1. Microfone: o app precisa de permissão. iPhone: Ajustes > Queizy > Microfone. Android: Configurações > Apps > Queizy > Permissões > Microfone.
2. Minutos: se aparecer "Seu tempo acabou este mês" ou "Limite mensal atingido", os minutos do mês acabaram. Eles voltam no dia 1º; antes disso, dá para assinar o Premium (teste grátis) ou comprar minutos extras (assinantes).
3. Internet: use Wi-Fi ou 4G estável.
4. Atualize o app na App Store ou no Google Play e feche e abra de novo.
5. Sem som: tire o fone Bluetooth ou cabo e confira o volume do celular.
Se continuar sem funcionar depois disso, um atendente analisa (ajuda informar o modelo do celular).` },
  { section: 'Problemas comuns', question: 'A pronúncia diz que não entendeu o que eu falei', answer:
`Segure o botão do microfone durante toda a frase e solte só no fim. Fale perto do celular, num lugar silencioso. Fones Bluetooth podem atrapalhar o reconhecimento: no iPhone, prefira o microfone do próprio aparelho. Confira também a permissão de microfone do app.` },
  { section: 'Problemas comuns', question: 'Não acho uma tela ou função', answer:
`Use o guia da barra de baixo: casinha (Início e trilha), telefone (Live Voice), raio (Practice), bloco de notas (Vocabulário) e sua foto (Perfil). XP, sequência, ranking e metas ficam em "Seu progresso", tocando nas pílulas do topo. Se a função procurada não existir no app, isso é registrado como sugestão para a equipe.` },
  { section: 'Problemas comuns', question: 'O app travou ou deu erro', answer:
`Atualize o app na loja, feche-o por completo e abra de novo. Confira a internet. Se o erro continuar, um atendente analisa; ajuda informar o que estava fazendo, a mensagem que apareceu e o modelo do celular.` },

  // ── Planos e assinatura ──────────────────────────────────────────────────
  { section: 'Planos e assinatura', question: 'Quais são os planos e preços?', answer:
`Teste grátis de 7 dias ao começar, sem cartão de crédito. Depois: Plano Mensal R$ 29,90/mês e Plano Anual R$ 199,90/ano (equivale a cerca de R$ 16,66/mês).
Os valores exatos e a compra ficam na tela de assinatura dentro do app (no teste grátis, a pílula verde "Xd grátis" no topo abre os planos). A cobrança é feita pela App Store (iPhone) ou pelo Google Play (Android).` },
  { section: 'Planos e assinatura', question: 'Como cancelar a assinatura?', answer:
`O cancelamento é feito na loja (a Apple e o Google gerenciam a assinatura):
- iPhone: Ajustes > seu nome > Assinaturas > Queizy (pode aparecer como Charlotte em versões antigas) > Cancelar assinatura.
- Android: Google Play > foto de perfil > Pagamentos e assinaturas > Assinaturas > Queizy (pode aparecer como Charlotte) > Cancelar.
- No app: Perfil > Assinatura > Gerenciar assinatura abre essa tela da loja.
Ao cancelar, o acesso continua até o fim do período já pago.` },
  { section: 'Planos e assinatura', question: 'Como pedir reembolso?', answer:
`Reembolsos são feitos pela loja, não pela Hub Academy:
- iPhone: pelo site reportaproblem.apple.com.
- Android: pela ajuda do Google Play (pedir reembolso), dentro do prazo do Google.
Casos específicos de cobrança ou reembolso são encaminhados a um atendente.` },
  { section: 'Planos e assinatura', question: 'Assinei, mas o app continua bloqueado', answer:
`Use Perfil > Assinatura > Restaurar compras, logado na mesma conta da App Store ou do Google Play usada na compra. Se aparecer "Assinatura vinculada a outra conta", a compra foi feita com outro login do Queizy; um atendente ajuda a resolver.` },

  // ── Conta e acesso ───────────────────────────────────────────────────────
  { section: 'Conta e acesso', question: 'Como redefinir a senha?', answer:
`Na tela de login, toque em "Esqueci minha senha", informe o e-mail do cadastro e siga o link enviado. Logado, dá para trocar em Perfil > Conta > Alterar senha. O suporte também pode enviar um e-mail de redefinição para o e-mail cadastrado.` },
  { section: 'Conta e acesso', question: 'Não consigo entrar na conta', answer:
`Confirme que está usando o mesmo e-mail do cadastro e tente redefinir a senha. Se assinou e o acesso não liberou, use Perfil > Assinatura > Restaurar compras.` },
  { section: 'Conta e acesso', question: 'Como excluir a conta?', answer:
`Perfil > Sessão > Excluir minha conta. É permanente: apaga a conta e os dados. Excluir a conta não cancela a assinatura na loja; cancele antes pela App Store ou pelo Google Play. Pedidos de exclusão pelo suporte são confirmados por um atendente.` },

  // ── Contato ──────────────────────────────────────────────────────────────
  { section: 'Contato', question: 'Como falar com o suporte?', answer:
`No app: Perfil > Ajuda > Ajuda e suporte. Pelo WhatsApp: (11) 5199-5992. Por e-mail: suporte@queizy.com.` },
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
