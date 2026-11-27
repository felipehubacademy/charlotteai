-- Suporte: entrega das respostas por e-mail.
-- Quando a resposta de um atendente não sai (erro no envio) ou sai e volta depois (aviso de não
-- entrega da Microsoft ou devolução avisada pelo serviço reserva), a mensagem fica marcada aqui,
-- a gestão recebe um alerta (uma vez por falha) e o /admin mostra "Não entregue" com o motivo.
-- Só as respostas por e-mail enviadas pelo /admin são acompanhadas; nas demais tudo fica nulo.

ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS delivery_status      text;        -- sent | failed | bounced | sending
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS delivery_error       text;        -- motivo da falha ou da devolução
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS delivery_failed_at   timestamptz; -- quando falhou ou voltou
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS delivery_sent_at     timestamptz; -- último envio que saiu
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS delivery_alerted_at  timestamptz; -- alerta da falha atual já enviado (trava de repetição)
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS delivery_to          text;        -- destinatário do e-mail
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS delivery_provider    text;        -- graph | resend (por onde saiu)
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS delivery_provider_id text;        -- id do e-mail no serviço reserva

DO $$ BEGIN
  ALTER TABLE public.support_messages ADD CONSTRAINT support_messages_delivery_status_chk
    CHECK (delivery_status IS NULL OR delivery_status IN ('sent', 'failed', 'bounced', 'sending'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Lista do /admin: conversas com resposta não entregue.
CREATE INDEX IF NOT EXISTS idx_support_msg_undelivered
  ON public.support_messages (conversation_id) WHERE delivery_status IN ('failed', 'bounced', 'sending');
-- Varredura dos avisos de não entrega: respostas que saíram nos últimos dias.
CREATE INDEX IF NOT EXISTS idx_support_msg_delivery_sent
  ON public.support_messages (delivery_sent_at) WHERE delivery_status = 'sent';
-- Webhook do serviço reserva: acha a mensagem pelo id do e-mail.
CREATE INDEX IF NOT EXISTS idx_support_msg_provider_id
  ON public.support_messages (delivery_provider_id) WHERE delivery_provider_id IS NOT NULL;

-- Avisos de não entrega da Microsoft já usados: cada aviso marca no máximo uma resposta, para sempre.
-- Os avisos são relidos a cada varredura; sem isto, depois que a resposta mais nova vira "Não entregue"
-- (e sai da lista acompanhada), o mesmo aviso marcaria uma resposta mais antiga ao mesmo destinatário.
-- Tabela à parte (e não uma coluna na mensagem) porque um reenvio que volta de novo traz outro aviso,
-- e o primeiro tem de continuar registrado.
CREATE TABLE IF NOT EXISTS public.support_bounce_notices (
  ref         text PRIMARY KEY,                                                           -- internetMessageId do aviso (ou caixa:id no Graph)
  message_id  uuid NOT NULL REFERENCES public.support_messages(id) ON DELETE CASCADE,     -- resposta ligada ao aviso
  received_at timestamptz,                                                                -- quando o aviso chegou
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_bounce_notices ENABLE ROW LEVEL SECURITY;
