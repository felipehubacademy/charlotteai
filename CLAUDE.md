# Charlotte AI — Regras do projeto

## REGRA ABSOLUTA #1 — Português SEMPRE com acentuação correta

**NUNCA, JAMAIS escreva português sem acentuação correta. Sem exceção.**

Vale para TUDO que sai em português, em QUALQUER lugar do projeto:
- código e strings de UI
- push notifications
- emails
- títulos, subtítulos, copy de marketing
- mensagens de erro
- qualquer texto voltado ao usuário

Os arquivos são UTF-8 e todos os canais (Expo, Microsoft Graph, o app) entregam
acento normalmente. **Não existe motivo técnico para "simplificar" ou remover
acento.** Na menor dúvida sobre uma palavra, pare e confira a acentuação.

Acentos e cedilha obrigatórios: á é í ó ú â ê ô ã õ à ç.
Exemplos: "versão" (não "versao"), "já" (não "ja"), "está" (não "esta"),
"disponível" (não "disponivel"), "você", "prática", "pronúncia", "correção".

## REGRA #2 — Emojis proibidos (NÃO confundir com a #1)

Não usar emojis em arquivos do projeto — usar ícones SVG ou símbolos de texto.
**Isto é sobre emojis, não sobre acentos.** Emojis são proibidos; acentos são
OBRIGATÓRIOS. São coisas diferentes — nunca troque uma pela outra.

## Email — infra do projeto

O envio de email do projeto usa **Microsoft Graph (Office 365)** via
`apps/web/lib/microsoft-graph-email-service.ts` (`sendEmail({to, subject, html})`),
com as env vars `AZURE_TENANT_ID` / `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET`.
É o que os fluxos de auth usam (reset de senha, confirmação de signup, welcome,
via o Send Email Hook do Supabase em `/api/auth/send-email`).

**Reserva (desde 2026-11-13):** se a Microsoft ficar indisponível (5xx, 429, demora), e-mails
marcados `essential: true` em `sendEmail` saem pelo Resend, com o mesmo remetente
noreply@queizy.com (domínio verificado no Resend, região São Paulo; chave `RESEND_API_KEY`).
Essenciais: login e senha (hook), boas-vindas, acesso depois da compra, avisos da assinatura,
convites e resposta do suporte (`isEssentialKind` na fila `email_outbox`). Campanhas em massa
**nunca** usam o reserva (plano grátis, ~100/dia, dividido com o site da Hub). Ao usar o reserva,
a administração recebe um alerta no /admin (1 por hora).

`apps/web/lib/simple-email-service.ts` é um caminho legado — **não usar** para envios novos.

## REGRA — Mudou tela ou botão do app? Atualize a FAQ do suporte na mesma tarefa

A IA do suporte (e-mail e WhatsApp) e a tela "Ajuda e suporte" do app respondem com
a FAQ da tabela `support_faq` (editável em /admin/suporte → aba "FAQ da IA"). Ela cita
nomes exatos de telas, botões e caminhos ("Seu progresso", Perfil > Conta > ...).

Sempre que uma mudança em `apps/mobile` criar, renomear, mover ou remover tela, aba,
botão, menu ou fluxo que o aluno usa:
1. Atualize as perguntas afetadas da FAQ (no /admin ou via SQL em `support_faq`),
   e crie pergunta nova para função nova. Se a pergunta aparece no app (`show_in_app`),
   regenere o inglês (salvar pelo /admin faz isso sozinho).
2. Mantenha `SUPPORT_FAQ_SEED` em `apps/web/lib/support-faq.ts` coerente (é a reserva).
3. Rode `node scripts/support-faq-ui.mjs glossary` se mudou texto de interface e
   `node scripts/support-faq-ui.mjs check` para conferir.

O workflow `.github/workflows/support-faq-check.yml` roda o check a cada push em
`apps/mobile` e diariamente; se falhar, corrija a FAQ antes de seguir.

## Revisão do Codex nos PRs (autorizada pelo Felipe em 2026-11-11)

O Codex (GitHub) revisa sozinho todo PR aberto neste repositório; regras de revisão em `AGENTS.md`.

**Quando usar PR:** mudanças em pagamentos, assinaturas, banco/migrations, pushes e e-mails em massa, IA do suporte
e mudanças grandes. Ajustes de texto, de tela e urgências podem ir direto na `main`, como antes.

**Fluxo:**
1. Branch a partir da `main` atualizada, commit e `gh pr create`.
2. `node scripts/codex-review.mjs <número do PR>` (espera ~5 min). Timeout: comentar `@codex review` e rodar de novo.
3. Achados: **P0 e P1** corrigir no PR, enviar e comentar `@codex review` para nova revisão; **P2** corrigir se fizer
   sentido agora, senão anotar no PR o porquê; **P3+** ignorar.
4. **Codex sem achados P0/P1 (ou todos corrigidos e revisados de novo): fazer o merge sozinho** (`gh pr merge N --squash`),
   sem pedir confirmação ao Felipe, e conferir o build da `main` na Vercel.

PRs e outras branches não geram build de prévia na Vercel (`apps/web/scripts/vercel-ignore.sh`); só a `main` builda.
