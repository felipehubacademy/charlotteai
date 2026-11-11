# Queizy — instruções para agentes

Monorepo do Queizy (app de inglês com IA): `apps/mobile` (React Native/Expo), `apps/web` (Next.js: site, /admin e APIs),
`supabase/migrations` (banco). As regras completas do projeto estão em `CLAUDE.md`; esta é a parte que vale para revisão.

## Review guidelines

Revise em português do Brasil. Priorize o que quebra produção, perde dinheiro ou expõe dados.

- **Português:** todo texto em português visível ao aluno (app, e-mail, push, site, mensagens de erro) tem acentuação e
  cedilha corretas. Texto sem acento é erro (P1).
- **Sem emojis** em arquivos do projeto (exceção: texto de push).
- **Fornecedores:** texto público não cita nome de fornecedor de tecnologia (usar "inteligência artificial",
  "infraestrutura em nuvem" etc.). Exceção: a tela de consentimento de IA (`apps/mobile/app/(app)/ai-consent.tsx`) e a
  seção 6 da política de privacidade, que nomeiam os serviços de IA por exigência da Apple.
- **Banco (Supabase/PostgREST):** leitura para em 1.000 linhas e `.in()` com mais de ~600 ids dá erro 400. Leituras grandes
  usam `apps/web/lib/db-batch` (`readAll`/`readIn`). Leitura que pode passar de 1.000 linhas sem paginação é P1.
- **XP:** tipo novo de prática que dá XP precisa entrar no guard `charlotte.guard_practice_insert` (migration nova).
- **Pushes e e-mails em massa:** envio só por funções em fatias, com trava de repetição; envio que pode disparar duas vezes
  para a mesma pessoa é P1.
- **Assinaturas:** RevenueCat é a fonte da verdade das lojas; cancelamento do site passa por `apps/web/lib/site-subscription.ts`.
- **Idioma:** conteúdo pedagógico em inglês não muda por idioma; o resto da interface do app segue o idioma do aparelho
  (`systemIsPt`).
- **Segurança:** rotas do /admin exigem `requireAdmin`; nada de chave de serviço ou segredo no app ou no navegador.
- Não aponte estilo, nomes ou preferências sem impacto (P3 ou menos).
