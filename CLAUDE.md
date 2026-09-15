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

`apps/web/lib/simple-email-service.ts` (Resend) é um caminho legado/NÃO
configurado em produção — **não usar** para envios novos; prefira o Microsoft Graph.
