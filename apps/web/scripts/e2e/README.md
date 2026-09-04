# Charlotte AI — Suíte de teste E2E

Objetivo: máxima cobertura automatizável antes de submeter às lojas. O teto real
de um app RN com IAP + voz é ~70-75% por robô; o resto (nativo) fica num checklist
manual curto. Ver a tabela no fim.

## Como rodar

```bash
# Tier 1A — smoke de todas as rotas de API (contra prod)
node apps/web/scripts/e2e/api-smoke.mjs           # completo
node apps/web/scripts/e2e/api-smoke.mjs --quick   # menos casos, sem TTS

# Tier 1B.1 — regras de acesso/gating (unitario, instantaneo)
node apps/web/scripts/e2e/access-rules.test.mjs

# Tier 1B.2 — streak + fuso (SQL, contra o banco linkado)
supabase db query --linked < apps/web/scripts/e2e/streak-rules.test.sql

# Synthetic Student — guided chat / role-play (cobertura de conteudo)
node apps/web/scripts/synthetic-student/run-guided-chats.mjs --level=Novice
```

## Estado

| Tier | O que cobre | Status |
|---|---|---|
| **1A** API smoke | 26 casos nas rotas de IA/conteudo (greeting, learn-grammar, translate, vocabulary, tts, exercise-help, etc.) — valid=200+shape, edge=gracioso, zero 5xx | ✅ 26/26 saudavel |
| **1B.1** hasAccess | 16 cenarios de gating de assinatura (grace, active, cancelled, expired, trial, institucional) | ✅ 16/16 |
| **1B.2** streak/fuso | data local por fuso (o bug corrigido) + CASE do streak | ✅ 7/7 |
| Synthetic | guided chat + role-play com judge | ✅ Novice 99 / Inter 99 / Advanced 95 |
| **1C** revisao visual | screenshot de cada tela × tamanhos × light/dark → revisao de layout/contraste/PT-EN/emoji | ⏳ requer build de simulador |
| **2** navegacao | percorrer fluxos de texto (first access, trilha, exercicios, perfil, paywall render) | ⏳ requer build de simulador |

## O que NÃO é robotizável (checklist manual — TestFlight/device)

Toca OS nativo, fora do alcance de robô:

- [ ] **Compra IAP** — sheet Apple + Face ID + sandbox (a compra em si)
- [x] **Cancelamento** — validado em sandbox 2026-09-04 (cancela → mantem acesso → webhook)
- [ ] **Live Voice** — WebRTC + audio + rede real
- [ ] **Pronuncia / L&S** — precisa de mic real (fala)
- [ ] **Push notifications** — entrega via APNs/FCM em device real
- [ ] **Speech recognition on-device** — mic real

## Manutenção

- `access-rules.test.mjs` espelha `hasAccess` em `AuthProvider.tsx` — se a logica mudar la, atualizar aqui.
- `streak-rules.test.sql` espelha o CASE do trigger `rn_on_practice_insert`.
- `api-smoke.mjs` — ao adicionar rota, adicionar um caso valido + um edge.
