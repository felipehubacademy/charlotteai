-- Suporte: FAQ editável no /admin + análise das conversas com IA.
-- Também liga RLS nas tabelas do suporte (só o servidor, com service role, acessa).

-- FAQ que a IA do suporte consulta. Editável no /admin (aba FAQ).
CREATE TABLE IF NOT EXISTS public.support_faq (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section     text NOT NULL DEFAULT 'Geral',
  question    text NOT NULL,
  answer      text NOT NULL,
  sort        int  NOT NULL DEFAULT 100,
  is_active   boolean NOT NULL DEFAULT true,
  source      text NOT NULL DEFAULT 'manual',          -- seed | manual | suggestion
  updated_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_faq_order ON public.support_faq (section, sort);

-- Uma análise por conversa (refeita se a conversa recebe mensagens novas).
CREATE TABLE IF NOT EXISTS public.support_insights (
  conversation_id  uuid PRIMARY KEY REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  analyzed_at      timestamptz NOT NULL DEFAULT now(),
  messages_count   int NOT NULL DEFAULT 0,
  category         text,        -- conta | assinatura | duvida_uso | bug | conteudo | sugestao | elogio | outro
  topic            text,        -- assunto curto e normalizado ("não encontra o XP")
  screen           text,        -- tela do app envolvida (inicio, live_voice, practice...)
  sentiment        text,        -- positivo | neutro | negativo
  resolution       text,        -- ia | humano | sem_resposta | em_aberto
  summary          text,
  faq_gap          boolean NOT NULL DEFAULT false,
  faq_question     text,
  faq_answer       text,
  faq_status       text,        -- pending | approved | dismissed (null se não há lacuna)
  ux_issue         text,
  feature_request  text,
  model            text
);
CREATE INDEX IF NOT EXISTS idx_support_insights_at ON public.support_insights (analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_insights_faq ON public.support_insights (faq_status) WHERE faq_status = 'pending';

ALTER TABLE public.support_agents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_faq           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_insights      ENABLE ROW LEVEL SECURITY;
