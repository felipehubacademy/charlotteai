// lib/support-faq.ts
// Base de conhecimento do suporte da Charlotte. É o material que o agente
// consulta para responder — NÃO deve inventar nada fora daqui. Manter em PT-BR
// com acentuação correta (ver CLAUDE.md). Atualizar quando o produto mudar.

export const SUPPORT_FAQ = `
# FAQ Charlotte AI (fonte de verdade do suporte)

## Sobre o app
A Charlotte é um app para aprender e praticar inglês com uma IA. Recursos:
- Live Voice: conversa por voz em tempo real com a Charlotte.
- Trilha de estudos (Learning Trail): do básico ao avançado, no seu ritmo.
- Practice: gramática, pronúncia e chat por texto.
- Níveis: Novice (iniciante, interface em português), Inter e Advanced.

## Planos e preços
- Teste grátis de 7 dias ao começar.
- Plano Mensal: R$ 29,90/mês.
- Plano Anual: R$ 199,90/ano (equivale a ~R$ 16,66/mês).
- Os valores exatos e a compra ficam na tela de assinatura (paywall) dentro do app.
- A cobrança é feita pela App Store (iPhone) ou Google Play (Android).

## Como cancelar a assinatura
O cancelamento é feito na própria loja (a Apple e o Google gerenciam a assinatura):
- iPhone: Ajustes > seu nome > Assinaturas > Charlotte > Cancelar assinatura.
- Android: Google Play > foto de perfil > Pagamentos e assinaturas > Assinaturas > Charlotte > Cancelar.
- No app, em Perfil, também há "Gerenciar assinatura", que abre essa tela da loja.
- Importante: ao cancelar, você MANTÉM o acesso até o fim do período já pago; não perde na hora.

## Reembolso
Reembolsos são processados pela loja, não pela Hub Academy:
- iPhone: reportamos o site reportaproblem.apple.com para solicitar reembolso à Apple.
- Android: pelo Google Play (ajuda do Google Play > pedir reembolso), dentro do prazo do Google.
- Casos específicos de cobrança/reembolso devem ser encaminhados a um atendente humano.

## Redefinir senha
Na tela de login, toque em "Esqueci minha senha", informe o email e siga o link enviado.
O suporte também pode disparar um email de redefinição para o email cadastrado.

## Não consigo entrar / acessar
- Confirme que está usando o mesmo email do cadastro.
- Tente redefinir a senha.
- Se assinou mas o acesso não liberou, use "Restaurar compra" no Perfil (mesma conta da loja usada na compra).

## Restaurar compra
Perfil > Restaurar compra. Precisa estar logado na mesma conta da App Store/Google Play usada na compra.

## Excluir conta
Perfil > Excluir minha conta. É permanente (apaga conta e dados). Pedidos de exclusão devem ser confirmados por um atendente humano.

## Contato
Email de suporte: charlotte@hubacademybr.com. Também há atendimento por WhatsApp.
`.trim();
