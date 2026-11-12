#!/bin/sh
# Ignored Build Step da Vercel: sair 0 = pula o build; sair 1 = builda.
# Só a main gera deploy (PRs e outras branches não geram prévia, para economizar builds).
[ "$VERCEL_GIT_COMMIT_REF" != "main" ] && exit 0
# Na main: pula se nada de apps/web mudou desde o último deploy.
[ -n "$VERCEL_GIT_PREVIOUS_SHA" ] && [ "$VERCEL_GIT_PREVIOUS_SHA" != "$VERCEL_GIT_COMMIT_SHA" ] \
  && git cat-file -e "$VERCEL_GIT_PREVIOUS_SHA" 2>/dev/null \
  && git diff --quiet "$VERCEL_GIT_PREVIOUS_SHA" HEAD -- . && exit 0
exit 1
