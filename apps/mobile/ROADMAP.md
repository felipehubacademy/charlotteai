# Charlotte AI — Roadmap

> Última atualização: Setembro 2026 | Build atual: **112 (TestFlight)** · v1.1.0 · runtimeVersion 2.0.0
> Status geral: **pronto para produção** — em validação final no TestFlight antes de submeter às lojas.

---

## Visão geral

Aplicativo de aprendizado de inglês com IA para falantes de português brasileiro.
Três níveis: **Novice (A1/A2) → Inter (B1/B2) → Advanced (C1/C2)**

**Loop principal:** Learn (estrutura) → Practice (aplicação livre) → conversa (guided chat / role-play / Live Voice) → próximo módulo

---

## Estado atual

| Item | Status |
|---|---|
| Plataforma | iOS (TestFlight, build 112) |
| Android | Configurado; build de produção ainda não submetido |
| App Store (produção) | ⏳ não submetido — pré-lançamento |
| Google Play | ⏳ não submetido |
| Versão | **1.1.0** (build 112) · `autoIncrement` + `appVersionSource: remote` |
| Monetização | **RevenueCat integrado e validado end-to-end** |
| Layout | `new_layout` oficial (6 tabs) — gate removido |
| Crash reporting | Sentry ativo (setUser + DSN + sourcemaps OTA) |

---

## ✅ Implementado

### Infraestrutura
- Supabase: auth, perfis, progresso, leaderboard, achievements, practices, `learn_history_v2`
- Placement test (define nível inicial)
- Notificações push (expo-notifications, FCM V1, crons cron-job.org)
- Sentry (crash reporting nativo + JS, sourcemaps OTA)
- CI/CD: push no `main` dispara Vercel + EAS OTA automaticamente
- Streaks/resets diários e mensais **timezone-aware** (trigger server-side usa o fuso do usuário; fallback America/Sao_Paulo)

### Monetização — RevenueCat (COMPLETO)
- SDK `react-native-purchases` 9.15.1 · entitlement **`Premium`** · produtos mensal/anual (7-day trial)
- Paywall (`PaywallModal`) — abre ao expirar acesso ou tocar feature bloqueada
- **Webhook RevenueCat → Supabase** (`/api/webhooks/revenuecat`) deployado, secret configurado — mapeia INITIAL_PURCHASE/RENEWAL/UNCANCELLATION→active, CANCELLATION→cancelled (mantém acesso até expirar), EXPIRATION/REFUND/BILLING_ISSUE→expired; pula institucionais
- Sync client-side no foreground (defesa contra cache stale do RC via `latestExpirationDate`)
- **Restore purchases** + **Manage subscription** (`showManageSubscriptions`) no Perfil
- `hasAccess` com tripla defesa (webhook + sync + check local de `expires_at`)
- Cancelamento **validado em sandbox** (2026-09-04): cancelar mantém acesso até fim do período; rótulo "Active · cancelling"
- Subscription status: `trial / active / cancelled / expired / institutional / none`

### Home Screen
- Greeting por IA (GPT-4o-mini) — PT-BR para Novice, EN para Inter/Advanced (cache 2h)
- XP ring diário + streak + rank no leaderboard
- Missões diárias rotativas (3/dia)
- Dica do dia por nível (EN + tradução PT para Novice)
- FAB "ir para tópico ativo" com fallback robusto por nível

### Novice Experience (diferenciada)
- UI inteiramente em PT-BR (labels, botões, placeholders, saudações)
- `TranslatableText`: sublinhado âmbar + tooltip por palavra
- Dicionário EN→PT (350+ palavras + phrasal verbs)
- Fluxo linear: scaffold é sugestão, não regra

### Curriculum v2 — Learn (trilha)
- **Novice: 24 módulos · Inter: 23 · Advanced: 24** (compilado MD→JSON via `scripts/compile-curriculum-v2.mjs`)
- Objetivos com `hint_en`, `examples_pass`/`examples_fail`, tense subtitle (PASSADO · to be)
- Mini-aulas por módulo (karaoke TTS, slides, cores por nível)
- Exercícios: Fill the Gap, Fix the Error, Read & Answer, Multiple Choice, True/False, Word Order, Word Bank, Short Write
- Pronúncia (trilha, L&S): repeat, shadowing, listen_write, minimal_pairs, sentence_stress — **expo-speech-recognition on-device** (não Azure)
- Gating por **conclusão** (completion-based, estilo Duolingo — sem trava por threshold que prende o aluno); Grammar 70% / Speaking 60%
- Redo de tópico não retrocede o ponteiro

### Practice with Charlotte (tabs por nível — `LEVEL_CONFIG`)
| Modo | Novice | Inter | Advanced |
|---|---|---|---|
| Grammar chat | ✅ PT-BR | ✅ EN+suporte PT | ✅ EN |
| Pronunciation (Azure) | — | ✅ | ✅ |
| Free Chat | — | ✅ | ✅ |
| Live Voice (WebRTC OpenAI Realtime) | — | — | ✅ (`liveEnabled`) |

- Modos liberados por nível (sem lock por XP); Charlotte adapta via system prompt
- Live Voice: sessão de áudio nativa (`CharlotteAudioSession`, sem InCallManager) + pool de uso mensal

### Guided Chat & Role-play (conversas guiadas)
- Judge da Charlotte com salvaguardas: USER-ASKS 3-check, STRUCTURE REQUIREMENT, NEXT PENDING obj, anti-steal, SEQUENTIAL SIMILAR OBJECTIVES, exemplos pass/fail como ground truth
- Scaffold gradiente por nível (Novice label + exemplo; Inter de-emphasized; Advanced escondido)
- **Synthetic Student** (harness em `apps/web/scripts/synthetic-student`) como regressão — Novice 99% / Inter 99% / Advanced 95%

### Promoção & Formatura
- Vídeos animados da Charlotte de beca (expo-video, Supabase Storage CDN):
  - Novice→Inter (tassel roxo), Inter→Advanced (teal), Formatura final (cordão de honra dourado)
- Render unificado (contentFit=contain, confetti premium por trás, SFX em paralelo, flag seen via SecureStore)

### Voz / Áudio
- TTS: ElevenLabs (Rachel) para L&S; OpenAI gpt-4o-mini-tts "coral" para role-play/promoção
- `CharlotteAudioSession` (módulo nativo Expo) para AVAudioSession/WebRTC — InCallManager **banido**
- Fix de roteamento com cabo USB no início da call
- AirPods mic hint (aviso quando fone Bluetooth degrada o reconhecimento)

### UX / Polish
- `react-native-keyboard-controller` em todas as telas com input (mata o CTA-drift do Android)
- Links Privacidade/Termos in-app (expo-web-browser)
- SafeAreaView com cor do header por tela

---

## 🚧 Pendente

### Ativo (ciclo de validação atual)
- [ ] **Teste de expiração de assinatura** (Passo 3): observar EXPIRATION real do sandbox → paywall
- [ ] **Reverter contas de teste** ao estado original (ver memória `test_account_db_overrides`)
- [ ] **Smoke test do build 112** no TestFlight (Live Voice/áudio, promoções, Sentry capturando)

### Backlog P2 (pós-launch — não bloqueia)
- **Pronúncia** (`pronunciation_improvements`): "Ouvir você" (replay da própria gravação), sugestão de retry no Android, calibração de thresholds, redesign game-like (correct/close/error) na trilha
- **SR system** (`sr_system_plan`): Add Word, My Vocabulary, SM-2
- **Karaoke** (`karaoke_realtime_plan`): pintar palavras em tempo real
- **Feedback loop personalizado**: armazenar erros por categoria e gerar exercícios focados nas fraquezas
- Offline graceful degradation (OfflineBanner remount)
- Live Voice: echo aggressive (revisitar se aparecer)

### Lançamento — Submissão às lojas
- [ ] **iOS (App Store Connect)**: screenshots (6.7"/6.5"), metadados (nome, subtítulo, descrição, keywords), classificação etária, notas para o revisor (login, trial, IA, microfone), export compliance
- [ ] **Android**: build de produção (app-bundle) + Google Play Console (track interno → produção), data safety form, classificação IARC, target SDK 34+, keystore
- ✅ **Política de Privacidade + Termos** publicados (charlotte.hubacademybr.com/privacidade, /termos) e linkados no app
- [ ] Screenshots/preview em múltiplos tamanhos de tela

### Pendência TTS
- **33 slides do Advanced C2** sem áudio (quota ElevenLabs). App exibe texto sem narração — não quebra.
  - Ao fazer upgrade: `npm run generate-tts` (pula os já existentes), commit `public/tts/`, push.

---

## Decisões técnicas

| Decisão | Escolha | Motivo |
|---|---|---|
| Framework | Expo SDK 54 | Velocidade de dev, OTA updates |
| Navegação | expo-router (Stack + Tabs) | new_layout oficial (6 tabs) |
| Backend | Next.js (Vercel) | APIs do apps/web |
| DB | Supabase (Postgres + Auth + Realtime) | BaaS completo |
| Monetização | **RevenueCat** (entitlement `Premium`) | Gestão cross-platform + webhooks |
| Pronúncia (Practice) | Azure Speech Assessment | Feedback fonema a fonema |
| Pronúncia (trilha L&S) | expo-speech-recognition (on-device) | Sem custo, offline-friendly |
| Live Voice | WebRTC direto → OpenAI Realtime | Arquitetura mais barata (só HTTP POSTs, zero signaling) |
| Sessão de áudio | `CharlotteAudioSession` (módulo nativo) | InCallManager banido (quebrava com cabo USB) |
| Grammar/guided chat | GPT-4o-mini + judge com salvaguardas | Geração dinâmica + correção confiável |
| TTS | ElevenLabs (Rachel) + OpenAI gpt-4o-mini-tts (coral) | PT-BR nativo / voz de role-play |
| Curriculum | v2 compilado MD→JSON | Fonte única, versionável |
| Crash reporting | Sentry (@sentry/react-native) | Captura crashes nativos silenciosos |
| Build/deploy | EAS (autoIncrement, appVersionSource remote) | Push no main → CI/EAS; nunca `eas build`/`eas update` manual |

---

## Convenções de projeto (não regredir)
- **Idioma por nível:** Novice = PT-BR; Inter/Advanced = English (toda a UI e output). Zero PT no JSON de Inter/Advanced.
- **Sem emojis** em arquivos do projeto — usar SVG icons ou símbolos de texto.
- **Português impecável** (acentos e cedilha sempre).
- **Nunca** rodar `eas build`/`eas update` manual de worktree — push no `main` e deixar CI/EAS dispararem.
- **Nunca** commitar `apps/mobile/google-services.json`.
