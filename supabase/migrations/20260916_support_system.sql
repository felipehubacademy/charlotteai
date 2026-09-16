-- Sistema de suporte automatizado (agente LLM + escalonamento humano).
-- Tabelas server-only (schema public, acessadas via service role em API/cron).

-- Atendentes humanos cadastrados (pra distribuir escalonamentos)
CREATE TABLE IF NOT EXISTS public.support_agents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text,
  whatsapp    text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Conversas de suporte (uma por thread de email / por telefone no WhatsApp)
CREATE TABLE IF NOT EXISTS public.support_conversations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel           text NOT NULL,                 -- 'email' | 'whatsapp'
  external_id       text NOT NULL,                 -- thread id (email) / telefone (wpp)
  user_id           text,                          -- charlotte_users.id, se identificado
  contact           text,                          -- email/telefone do contato
  subject           text,
  status            text NOT NULL DEFAULT 'open',  -- open | auto_resolved | escalated | closed
  assigned_agent_id uuid REFERENCES public.support_agents(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  last_message_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, external_id)
);

-- Mensagens (entrada do usuario e saida do agente/humano)
CREATE TABLE IF NOT EXISTS public.support_messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  direction        text NOT NULL,                  -- 'in' | 'out'
  author           text NOT NULL,                  -- 'user' | 'agent' | 'human'
  body             text NOT NULL,
  intent           text,
  auto_sent        boolean NOT NULL DEFAULT false,
  graph_message_id text,                            -- id da msg no Graph (dedupe email)
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_conv_status ON public.support_conversations (status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_msg_conv ON public.support_messages (conversation_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_support_msg_graphid ON public.support_messages (graph_message_id) WHERE graph_message_id IS NOT NULL;
